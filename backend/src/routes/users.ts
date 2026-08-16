import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getUserById } from '../services/authService';

const router = Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    return 'dev-only-' + crypto.randomBytes(32).toString('hex');
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// JWKS cache — fetched once from WorkOS, refreshed after 1 hour
// ---------------------------------------------------------------------------
interface JwksKey {
  kid: string;
  n: string;
  e: string;
  alg: string;
  kty: string;
  use: string;
}

let jwksCache: { keys: JwksKey[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getWorkOSJwks(): Promise<JwksKey[]> {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) throw new Error('WORKOS_CLIENT_ID env var not set');

  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }

  // WorkOS JWKS endpoint — uses the client-id to resolve the environment
  const jwksUrl = `https://api.workos.com/sso/jwks/${clientId}`;
  const resp = await axios.get<{ keys: JwksKey[] }>(jwksUrl, { timeout: 5000 });
  jwksCache = { keys: resp.data.keys, fetchedAt: Date.now() };
  return jwksCache.keys;
}

function buildPublicKey(n: string, e: string): string {
  // Build an RSA public key from JWK n/e components
  const keyObject = crypto.createPublicKey({
    key: { kty: 'RSA', n, e },
    format: 'jwk',
  });
  return keyObject.export({ type: 'spki', format: 'pem' }) as string;
}

async function verifyWorkOSToken(token: string): Promise<jwt.JwtPayload> {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded.payload !== 'object') {
    throw new Error('Invalid WorkOS token structure');
  }

  const { kid } = decoded.header;
  const keys = await getWorkOSJwks();
  const key = kid ? keys.find((k) => k.kid === kid) : keys[0];
  if (!key) throw new Error('No matching JWKS key found');

  const publicKey = buildPublicKey(key.n, key.e);

  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
  }) as jwt.JwtPayload;
}

// ---------------------------------------------------------------------------
// POST /api/users/workos-session
//
// Called by the frontend after WorkOS completes authentication.
// Verifies the WorkOS access token, provisions the user in the DB if new,
// and issues a FeraSetu HttpOnly session cookie.
// ---------------------------------------------------------------------------
router.post('/workos-session', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing WorkOS access token' });
    return;
  }

  const workosToken = authHeader.substring(7);

  let payload: jwt.JwtPayload;
  try {
    payload = await verifyWorkOSToken(workosToken);
  } catch (err: any) {
    console.error('[workos-session] Token verification failed:', err.message);
    res.status(401).json({ error: 'WorkOS token verification failed' });
    return;
  }

  // WorkOS token sub is the WorkOS user ID (e.g. "user_01...")
  const workosUserId = payload.sub;
  const email = (payload.email as string) || '';
  const firstName = (payload.first_name as string) || '';
  const lastName = (payload.last_name as string) || '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0] || 'Shopkeeper';

  if (!workosUserId) {
    res.status(401).json({ error: 'WorkOS token missing sub claim' });
    return;
  }

  try {
    const db = getDatabase();

    // Try to find existing user by workos_user_id first, then fall back to email
    let user = db.prepare('SELECT * FROM users WHERE workos_user_id = ?').get(workosUserId) as any;

    if (!user && email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      // Backfill workos_user_id on existing email-based account
      if (user && !user.workos_user_id) {
        db.prepare('UPDATE users SET workos_user_id = ? WHERE id = ?').run(workosUserId, user.id);
      }
    }

    if (!user) {
      // Provision new user
      const userId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10); // 10-year beta access

      // Generate a unique subdomain
      let subdomain = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      const existingSub = db.prepare('SELECT id FROM users WHERE subdomain = ?').get(subdomain);
      if (existingSub) subdomain = `${subdomain}-${Math.random().toString(36).substring(2, 6)}`;

      db.prepare(`
        INSERT INTO users (
          id, workos_user_id, email, password_hash, name, is_verified,
          plan, plan_expires_at, subdomain,
          ai_credits_balance, ai_credits_monthly_limit, ai_credits_reset_at
        ) VALUES (?, ?, ?, ?, ?, 1, 'beta', ?, ?, 20, 20, datetime('now', '+30 days'))
      `).run(userId, workosUserId, email, '', name, expiresAt.toISOString(), subdomain);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (!user) throw new Error('Failed to provision user after WorkOS sign-in');
      console.log(`✅ [workos-session] Provisioned new user: ${email} (${userId})`);
    }

    // Issue FeraSetu HttpOnly session cookie
    const feraToken = jwt.sign(
      { id: user.id, email: user.email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('access_token', feraToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    // Return safe user profile (no password_hash)
    const { password_hash: _ph, workos_user_id: _wid, ...safeUser } = user;
    res.json({
      needs_init: false,
      user: {
        ...safeUser,
        is_verified: Boolean(user.is_verified),
      },
    });
  } catch (err: any) {
    console.error('[workos-session] DB error:', err);
    res.status(500).json({ error: 'Failed to establish session' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/me
// Returns the authenticated FeraSetu user profile (uses the session cookie)
// ---------------------------------------------------------------------------
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const user = getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ needs_init: false, user });
});

// ---------------------------------------------------------------------------
// PUT /api/users/me
// Update user profile fields
// ---------------------------------------------------------------------------
router.put('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const ALLOWED: string[] = [
      'name', 'email', 'phone', 'business_name', 'preferred_language',
      'subdomain', 'custom_domain',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in req.body) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length > 0) {
      const fields = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values, req.user!.id);
    }

    const updated = getUserById(req.user!.id);
    res.json({ needs_init: false, user: updated });
  } catch (err: any) {
    console.error('[users/me PUT] error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { findNextAvailableStorefront, generateCanonicalStorefront } from '../utils/canonicalHostname';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    return 'dev-only-secret-ferasetu-2026';
  }
  return secret;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  business_name?: string;
  plan: 'free' | 'premium' | 'trial' | 'beta' | 'basic' | 'standard' | 'business' | 'pro' | 'starter';
  preferred_language: string;
  subdomain?: string;
  hostname?: string;
  city?: string;
  district?: string;
  state?: string;
  custom_domain?: string;
  plan_expires_at?: string;
  ai_credits_balance?: number;
  ai_credits_monthly_limit?: number;
  ai_credits_used_month?: number;
  ai_credits_reset_at?: string;
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
  market?: string;
  trial_started_at?: string;
  trial_ends_at?: string;
  cancel_at_period_end?: number;
  created_at: string;
}

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessName?: string;
  preferredLanguage?: string;
  market?: string;
  city?: string;
  district?: string;
  state?: string;
}): Promise<{ user: User; token: string }> {
  const db = getDatabase();

  // Check if user exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (existingUser) {
    throw Object.assign(new Error('A user with this email already exists'), { status: 400 });
  }

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Generate canonical, collision-safe storefront URL and hostname
  const storefront = await findNextAvailableStorefront(
    {
      shopName: data.businessName || data.name,
      city: data.city,
      district: data.district,
      state: data.state,
    },
    (subdomain: string) => {
      const existing = db.prepare('SELECT id FROM users WHERE subdomain = ? OR hostname = ?').get(subdomain, `${subdomain}.ferasetu.com`);
      return !!existing;
    }
  );
  const subdomain = storefront.subdomain;
  const hostname = storefront.hostname;

  // Determine market & trial dates
  const market = data.market || (data.phone?.startsWith('+1') ? 'US' : 'IN');
  const now = new Date();
  const trialStartedAt = now.toISOString();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // Set initial plan expiration
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 10);
  const expiresAtStr = expiresAt.toISOString();

  try {
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, phone, business_name, preferred_language, subdomain,
        hostname, city, district, state,
        plan, plan_expires_at, ai_credits_balance, ai_credits_monthly_limit, ai_credits_reset_at,
        market, trial_started_at, trial_ends_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'beta', ?, 20, 20, datetime('now', '+30 days'), ?, ?, ?)
    `).run(
      userId,
      data.email,
      passwordHash,
      data.name,
      data.phone || null,
      data.businessName || null,
      data.preferredLanguage || 'en',
      subdomain,
      hostname,
      data.city || null,
      data.district || null,
      data.state || null,
      expiresAtStr,
      market,
      trialStartedAt,
      trialEndsAt
    );
  } catch (err: any) {
    console.error('Database INSERT error:', err);
    throw new Error(`Failed to create user: ${err.message}`);
  }

  const user = getUserById(userId);
  if (!user) {
    throw new Error('Failed to retrieve user after registration');
  }

  const token = jwt.sign(
    { id: userId, email: data.email, plan: user.plan, businessName: data.businessName || data.name },
    getJwtSecret(),
    { expiresIn: '30d' } as jwt.SignOptions
  );

  return { user, token };
}

export async function loginUser(emailOrUsername: string, password: string): Promise<{ user: User; token: string }> {
  const db = getDatabase();

  console.log(`🔐 Attempting login for: ${emailOrUsername}`);

  // Search by email OR name OR subdomain OR hostname
  const user = db.prepare(`
    SELECT * FROM users 
    WHERE email = ? OR name = ? OR subdomain = ? OR hostname = ?
  `).get(emailOrUsername, emailOrUsername, emailOrUsername, emailOrUsername) as (User & { password_hash?: string | null }) | undefined;

  if (!user) {
    console.warn(`❌ User not found: ${emailOrUsername}`);
    throw Object.assign(new Error('Invalid email/username or password'), { status: 401 });
  }

  if (!user.password_hash) {
    console.warn(`❌ No password set for user (likely social login): ${user.email}`);
    throw Object.assign(
      new Error('This account was created with Google. Please use Google sign-in.'),
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    console.warn(`❌ Invalid password for user: ${emailOrUsername}`);
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  console.log(`✅ Login successful: ${user.email} (Plan: ${user.plan})`);
  const safeUser = getUserById(user.id);
  if (!safeUser) throw new Error('Failed to retrieve user profile');

  const token = jwt.sign(
    { id: user.id, email: user.email, plan: user.plan, businessName: user.business_name || user.name },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return { user: safeUser, token };
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, getJwtSecret()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getUserById(userId: string): User | null {
  const db = getDatabase();
  const user = db.prepare(`
    SELECT id, email, name, phone, business_name, plan, preferred_language, subdomain, hostname, city, district, state, custom_domain,
           plan_expires_at, ai_credits_balance, ai_credits_monthly_limit, ai_credits_used_month, ai_credits_reset_at,
           storage_used_bytes, storage_limit_bytes, market, trial_started_at, trial_ends_at, cancel_at_period_end, created_at
    FROM users WHERE id = ?
  `).get(userId) as (User & Record<string, any>) | undefined;

  if (!user) return null;

  // Ensure hostname is populated for backward compatibility with existing shops
  if (!user.hostname && user.subdomain) {
    user.hostname = `${user.subdomain}.ferasetu.com`;
  }

  // Auto-backfill missing trial timestamps deterministically based on user.created_at
  if (!user.trial_ends_at && user.created_at) {
    const signupTime = new Date(user.created_at).getTime();
    const trialStartedAt = user.trial_started_at || new Date(signupTime).toISOString();
    const trialEndsAt = new Date(signupTime + 14 * 24 * 60 * 60 * 1000).toISOString();
    try {
      db.prepare('UPDATE users SET trial_started_at = ?, trial_ends_at = ? WHERE id = ?')
        .run(trialStartedAt, trialEndsAt, user.id);
    } catch {
      // Ignored if update fails
    }
    user.trial_started_at = trialStartedAt;
    user.trial_ends_at = trialEndsAt;
  }
  if (!user.market) {
    user.market = user.phone?.startsWith('+1') ? 'US' : 'IN';
  }

  return user;
}

export async function updateUserPlan(userId: string, plan: 'trial' | 'beta' | 'basic' | 'standard' | 'pro'): Promise<void> {
  const db = getDatabase();
  db.prepare('UPDATE users SET plan = ?, updated_at = datetime(\'now\') WHERE id = ?').run(plan, userId);
}

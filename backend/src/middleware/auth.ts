import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';
import { createRequire } from 'module';
import { resolve } from 'path';

const requireModule = createRequire(resolve(__dirname, '..', '..', 'package.json'));
const dns = requireModule('dns').promises;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    plan: string;
    businessName?: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Read token from HttpOnly cookie first, fall back to Authorization header for backward compatibility
  const token = req.cookies?.access_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const userPayload = decoded as { id: string; email: string; plan: string; businessName?: string };
  
  // Check database for block status and plan expiration
  const { getDatabase } = require('../models/database');
  const db = getDatabase();
  const user = db.prepare('SELECT id, email, is_blocked, plan, plan_expires_at FROM users WHERE id = ?').get(userPayload.id) as any;
  
  if (!user) {
    console.warn(`⚠️ Auth: User ${userPayload.id} not found in DB`);
    res.status(401).json({ error: 'User not found' });
    return;
  }

  if (user.is_blocked) {
    console.warn(`🚫 Auth: Blocked user attempted access: ${user.email}`);
    res.status(403).json({ error: 'Account blocked', message: 'Your account has been blocked by administrators.' });
    return;
  }

  // Check Subscription Expiration (for trial users)
  if ((user.plan === 'trial' || user.plan === 'beta') && user.plan_expires_at) {
    const expiresAt = new Date(user.plan_expires_at);
    if (expiresAt < new Date()) {
      console.warn(`⏳ Auth: Trial expired for user: ${user.email}`);
      res.status(403).json({ 
        error: 'Trial expired', 
        expired: true,
        message: 'Your 7-day trial has ended. Please upgrade to a paid plan to continue using FeraSetu.',
        upgradeUrl: '/upgrade'
      });
      return;
    }
  }

  // Update req.user with latest data from DB (in case plan changed)
  req.user = {
    ...userPayload,
    plan: user.plan
  };
  next();
}

/**
 * Middleware to check if a shopkeeper's public website should be active.
 * Used in public website routes.
 */
export async function validatePublicShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { shopName } = req.params;
  const { getDatabase } = require('../models/database');
  const db = getDatabase();

  const user = db.prepare('SELECT plan, plan_expires_at, is_blocked FROM users WHERE subdomain = ?').get(shopName) as any;

  if (!user) {
    next(); // Let the route handle 404
    return;
  }

  // Subdomain takeover prevention: verify DNS still points to platform
  const baseDomain = (process.env.BASE_DOMAIN || 'fera-search.tech').toLowerCase();
  const host = (req.get('host') || '').toLowerCase();
  
  if (host && host !== baseDomain && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    try {
      const cnames = await dns.resolveCname(host);
      const isValidPlatform = cnames.some((c: string) => c.includes('ferasetu') || c.includes('ferasetu.pages.dev') || c.includes(baseDomain));
      if (!isValidPlatform) {
        console.warn(`Subdomain takeover attempt detected: ${host} (CNAMEs: ${cnames.join(', ')})`);
        res.status(404).send('Shop not found');
        return;
      }
    } catch (dnsErr) {
      // DNS resolution failed - might be temporary, allow but log
      console.warn(`DNS check failed for ${host}:`, dnsErr);
    }
  }

  if (user.is_blocked) {
    res.status(403).send('This store is currently unavailable.');
    return;
  }

  if ((user.plan === 'trial' || user.plan === 'beta') && user.plan_expires_at) {
    const expiresAt = new Date(user.plan_expires_at);
    if (expiresAt < new Date()) {
      res.status(402).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Store Temporarily Unavailable</h1>
          <p>The trial period for this store has ended.</p>
          <p>If you are the owner, please log in to your FeraSetu dashboard to upgrade your plan.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color: #FF6B35; font-weight: bold;">Login to Dashboard</a>
        </div>
      `);
      return;
    }
  }

  next();
}

export function requirePremium(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const plan = req.user?.plan;
  if (plan === 'trial' || plan === 'free' || plan === 'beta') {
    res.status(403).json({
      error: 'Upgrade required',
      upgradeUrl: '/upgrade',
      message: 'This feature is only available on paid plans. Upgrade to unlock advanced features!'
    });
    return;
  }
  next();
}

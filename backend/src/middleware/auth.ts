import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    plan: string;
    businessName?: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);
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
export function validatePublicShop(req: Request, res: Response, next: NextFunction): void {
  const { shopName } = req.params;
  const { getDatabase } = require('../models/database');
  const db = getDatabase();

  const user = db.prepare('SELECT plan, plan_expires_at, is_blocked FROM users WHERE subdomain = ?').get(shopName) as any;

  if (!user) {
    next(); // Let the route handle 404
    return;
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

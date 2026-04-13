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

  req.user = decoded as { id: string; email: string; plan: string; businessName?: string };
  next();
}

export function requirePremium(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.user?.plan !== 'premium') {
    res.status(403).json({
      error: 'Premium plan required',
      upgradeUrl: '/pricing',
      message: 'This feature is only available on the Premium plan. Upgrade to unlock unlimited features!'
    });
    return;
  }
  next();
}

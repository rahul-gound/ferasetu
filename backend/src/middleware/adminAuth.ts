import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@fera.ai';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
  };
}

export const adminOnly = (req: AdminRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, email: string };
    
    // Strict Admin Check
    if (decoded.email !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      return;
    }

    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

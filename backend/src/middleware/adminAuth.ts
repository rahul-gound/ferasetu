import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@fera.ai';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // bcrypt hash

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
  };
}

export const adminOnly = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!JWT_SECRET) {
    res.status(500).json({ error: 'Admin authentication is not configured' });
    return;
  }

  if (!ADMIN_PASSWORD_HASH) {
    res.status(500).json({ error: 'Admin password not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, email: string, role?: string };
    
    // Strict Admin Check
    if (decoded.email !== ADMIN_EMAIL || decoded.role !== 'admin') {
      res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      return;
    }

    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Admin login helper - to be used in admin routes
export async function verifyAdminCredentials(email: string, password: string): Promise<{ id: string; email: string; role: string } | null> {
  if (email !== ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
    return null;
  }
  
  const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    return null;
  }
  
  return { id: 'admin-root', email: ADMIN_EMAIL, role: 'admin' };
}

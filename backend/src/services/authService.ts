import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  business_name?: string;
  plan: 'free' | 'premium';
  preferred_language: string;
  subdomain?: string;
  custom_domain?: string;
  created_at: string;
}

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessName?: string;
  preferredLanguage?: string;
}): Promise<{ user: User; token: string }> {
  const db = getDatabase();

  // Check if user exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const userId = uuidv4();
  const subdomain = generateSubdomain(data.businessName || data.name);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, phone, business_name, preferred_language, subdomain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    data.email,
    passwordHash,
    data.name,
    data.phone || null,
    data.businessName || null,
    data.preferredLanguage || 'en',
    subdomain
  );

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User & { password_hash: string };
  const { password_hash: _ph, ...safeUser } = user;

  const token = jwt.sign(
    { id: userId, email: data.email, plan: 'free', businessName: data.businessName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return { user: safeUser as User, token };
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as (User & { password_hash: string }) | undefined;

  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const { password_hash: _ph, ...safeUser } = user;

  const token = jwt.sign(
    { id: user.id, email: user.email, plan: user.plan, businessName: user.business_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return { user: safeUser as User, token };
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getUserById(userId: string): User | null {
  const db = getDatabase();
  const user = db.prepare('SELECT id, email, name, phone, business_name, plan, preferred_language, subdomain, custom_domain, created_at FROM users WHERE id = ?').get(userId) as User | undefined;
  return user || null;
}

export async function updateUserPlan(userId: string, plan: 'free' | 'premium'): Promise<void> {
  const db = getDatabase();
  db.prepare('UPDATE users SET plan = ?, updated_at = datetime(\'now\') WHERE id = ?').run(plan, userId);
}

function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(/g, '-')  // Replace ( with -
    .replace(/\)/g, '')   // Remove )
    .replace(/[^a-z0-9]/g, '-') // Replace other non-alphanumeric with -
    .replace(/-+/g, '-')  // Remove double dashes
    .replace(/^-|-$/g, '') // Trim dashes from ends
    .substring(0, 60);
}

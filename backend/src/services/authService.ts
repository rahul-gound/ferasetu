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
  plan: 'free' | 'premium' | 'trial' | 'beta' | 'basic' | 'standard' | 'pro';
  preferred_language: string;
  subdomain?: string;
  custom_domain?: string;
  plan_expires_at?: string;
  ai_credits_balance?: number;
  ai_credits_monthly_limit?: number;
  ai_credits_used_month?: number;
  ai_credits_reset_at?: string;
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
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
  
  let subdomain = generateSubdomain(data.businessName || data.name);
  
  // Ensure subdomain uniqueness
  const existingSubdomain = db.prepare('SELECT id FROM users WHERE subdomain = ?').get(subdomain);
  if (existingSubdomain) {
    subdomain = `${subdomain}-${Math.random().toString(36).substring(2, 6)}`;
  }

  // Set initial plan expiration (10 years for Beta Plan)
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 10);
  const expiresAtStr = expiresAt.toISOString();

  try {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, phone, business_name, preferred_language, subdomain, plan, plan_expires_at, ai_credits_balance, ai_credits_monthly_limit, ai_credits_reset_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'beta', ?, 20, 20, datetime('now', '+30 days'))
    `).run(
      userId,
      data.email,
      passwordHash,
      data.name,
      data.phone || null,
      data.businessName || null,
      data.preferredLanguage || 'en',
      subdomain,
      expiresAtStr
    );
  } catch (err: any) {
    console.error('Database INSERT error:', err);
    throw new Error(`Failed to create user: ${err.message}`);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    throw new Error('Failed to retrieve user after registration');
  }

  const { password_hash: _ph, ...safeUser } = user;

  const token = jwt.sign(
    { id: userId, email: data.email, plan: 'beta', businessName: data.businessName || data.name },
    JWT_SECRET,
    { expiresIn: '30d' } as jwt.SignOptions
  );

  return { user: safeUser as User, token };
}

export async function loginUser(emailOrUsername: string, password: string): Promise<{ user: User; token: string }> {
  const db = getDatabase();

  console.log(`🔐 Attempting login for: ${emailOrUsername}`);

  // Search by email OR name OR subdomain
  const user = db.prepare(`
    SELECT * FROM users 
    WHERE email = ? OR name = ? OR subdomain = ?
  `).get(emailOrUsername, emailOrUsername, emailOrUsername) as (User & { password_hash?: string | null }) | undefined;

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
  const { password_hash: _ph, ...safeUser } = user;

  const token = jwt.sign(
    { id: user.id, email: user.email, plan: user.plan, businessName: user.business_name || user.name },
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
  const user = db.prepare(`
    SELECT id, email, name, phone, business_name, plan, preferred_language, subdomain, custom_domain,
           plan_expires_at, ai_credits_balance, ai_credits_monthly_limit, ai_credits_used_month, ai_credits_reset_at,
           storage_used_bytes, storage_limit_bytes, created_at
    FROM users WHERE id = ?
  `).get(userId) as User | undefined;
  return user || null;
}

export async function updateUserPlan(userId: string, plan: 'trial' | 'beta' | 'basic' | 'standard' | 'pro'): Promise<void> {
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

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';

// Use separate encryption key for SMTP passwords
const ENCRYPTION_KEY = process.env.SMTP_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SMTP_ENCRYPTION_KEY must be set in production environment');
  }
  console.warn('⚠️ SMTP_ENCRYPTION_KEY not set, using dev fallback');
}
const ALGORITHM = 'aes-256-gcm';

// Sanitize email headers to prevent header injection
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, '').trim();
}

function getKey(): Buffer {
  const keySource = ENCRYPTION_KEY || 'dev-only-' + crypto.randomBytes(32).toString('hex');
  return crypto.createHash('sha256').update(keySource).digest();
}

export function encryptPassword(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptPassword(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted password format');
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface SmtpSettingsRow {
  id: string;
  user_id: string;
  provider: string;
  host: string | null;
  port: number;
  username: string | null;
  password_encrypted: string | null;
  sender_name: string | null;
  sender_email: string | null;
  reply_to_email: string | null;
  ssl_enabled: number;
  tls_enabled: number;
  otp_enabled: number;
  otp_length: number;
  otp_expiry_minutes: number;
  otp_resend_cooldown: number;
  otp_max_attempts: number;
  otp_subject: string | null;
  otp_body_template: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SmtpSettingsPublic {
  id: string;
  provider: string;
  host: string | null;
  port: number;
  username: string | null;
  sender_name: string | null;
  sender_email: string | null;
  reply_to_email: string | null;
  ssl_enabled: boolean;
  tls_enabled: boolean;
  otp_enabled: boolean;
  otp_length: number;
  otp_expiry_minutes: number;
  otp_resend_cooldown: number;
  otp_max_attempts: number;
  otp_subject: string | null;
  otp_body_template: string | null;
  is_active: boolean;
  has_password: boolean;
}

const PROVIDER_DEFAULTS: Record<string, { host: string; port: number; ssl: boolean; tls: boolean }> = {
  gmail:     { host: 'smtp.gmail.com',          port: 587, ssl: false, tls: true },
  sendgrid:  { host: 'smtp.sendgrid.net',        port: 587, ssl: false, tls: true },
  mailgun:   { host: 'smtp.mailgun.org',         port: 587, ssl: false, tls: true },
  ses:       { host: 'email-smtp.us-east-1.amazonaws.com', port: 587, ssl: false, tls: true },
  custom:    { host: '',                          port: 587, ssl: false, tls: true },
};

export function getProviderDefaults(provider: string) {
  return PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.custom;
}

export function toPublicSettings(row: SmtpSettingsRow): SmtpSettingsPublic {
  return {
    id: row.id,
    provider: row.provider,
    host: row.host,
    port: row.port,
    username: row.username,
    sender_name: row.sender_name,
    sender_email: row.sender_email,
    reply_to_email: row.reply_to_email,
    ssl_enabled: row.ssl_enabled === 1,
    tls_enabled: row.tls_enabled === 1,
    otp_enabled: row.otp_enabled === 1,
    otp_length: row.otp_length,
    otp_expiry_minutes: row.otp_expiry_minutes,
    otp_resend_cooldown: row.otp_resend_cooldown,
    otp_max_attempts: row.otp_max_attempts,
    otp_subject: row.otp_subject,
    otp_body_template: row.otp_body_template,
    is_active: row.is_active === 1,
    has_password: !!row.password_encrypted,
  };
}

export function getSmtpSettings(userId: string): SmtpSettingsPublic | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM smtp_settings WHERE user_id = ?').get(userId) as SmtpSettingsRow | undefined;
  if (!row) return null;
  return toPublicSettings(row);
}

export function saveSmtpSettings(userId: string, data: {
  provider?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  sender_name?: string;
  sender_email?: string;
  reply_to_email?: string;
  ssl_enabled?: boolean;
  tls_enabled?: boolean;
  otp_enabled?: boolean;
  otp_length?: number;
  otp_expiry_minutes?: number;
  otp_resend_cooldown?: number;
  otp_max_attempts?: number;
  otp_subject?: string;
  otp_body_template?: string;
  is_active?: boolean;
}): SmtpSettingsPublic {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM smtp_settings WHERE user_id = ?').get(userId) as { id: string } | undefined;

  const defaults = getProviderDefaults(data.provider || 'custom');

  const fields: Record<string, unknown> = {
    provider: data.provider ?? 'custom',
    host: data.host ?? defaults.host,
    port: data.port ?? defaults.port,
    username: data.username ?? null,
    sender_name: data.sender_name ?? null,
    sender_email: data.sender_email ?? null,
    reply_to_email: data.reply_to_email ?? null,
    ssl_enabled: data.ssl_enabled !== undefined ? (data.ssl_enabled ? 1 : 0) : (defaults.ssl ? 1 : 0),
    tls_enabled: data.tls_enabled !== undefined ? (data.tls_enabled ? 1 : 0) : (defaults.tls ? 1 : 0),
    otp_enabled: data.otp_enabled !== undefined ? (data.otp_enabled ? 1 : 0) : 1,
    otp_length: data.otp_length ?? 6,
    otp_expiry_minutes: data.otp_expiry_minutes ?? 10,
    otp_resend_cooldown: data.otp_resend_cooldown ?? 60,
    otp_max_attempts: data.otp_max_attempts ?? 5,
    otp_subject: data.otp_subject ?? 'Verify your email • FeraSetu',
    otp_body_template: data.otp_body_template ?? null,
    is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 0,
    updated_at: new Date().toISOString(),
  };

  if (data.password) {
    fields.password_encrypted = encryptPassword(data.password);
  }

  if (existing) {
    const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = Object.values(fields);
    db.prepare(`UPDATE smtp_settings SET ${setClauses} WHERE user_id = ?`).run(...values, userId);
  } else {
    const id = uuidv4();
    const columns = ['id', 'user_id', ...Object.keys(fields)];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [id, userId, ...Object.values(fields)];
    db.prepare(`INSERT INTO smtp_settings (${columns.join(', ')}) VALUES (${placeholders})`).run(...values);
  }

  return getSmtpSettings(userId)!;
}

export async function sendTestEmail(userId: string, recipientEmail: string): Promise<{ success: boolean; message: string }> {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM smtp_settings WHERE user_id = ?').get(userId) as SmtpSettingsRow | undefined;

  if (!row || !row.host || !row.sender_email) {
    return { success: false, message: 'SMTP settings not configured. Please save your settings first.' };
  }

  if (!row.password_encrypted) {
    return { success: false, message: 'SMTP password not set. Please save your password first.' };
  }

  const password = decryptPassword(row.password_encrypted);

  const transportConfig = {
    host: row.host,
    port: row.port,
    secure: row.ssl_enabled === 1,
    auth: row.username ? { user: row.username, pass: password } : undefined,
    requireTLS: row.tls_enabled === 1 && row.ssl_enabled !== 1,
  };

  const transporter = nodemailer.createTransport(transportConfig);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #0052FF; margin: 0; font-size: 28px; font-weight: 900;">FeraSetu</h1>
      </div>
      <div style="background: #fff; border: 1px solid #f1f5f9; border-radius: 24px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="font-size: 22px; font-weight: 800; color: #1e293b; margin-top: 0;">SMTP Test Email ✅</h2>
        <p style="font-size: 16px; color: #475569;">This is a test email from FeraSetu to verify your SMTP configuration is working correctly.</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="font-size: 14px; color: #166534; margin: 0; font-weight: 600;">If you received this email, your SMTP settings are configured correctly!</p>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">Provider: ${row.provider} | Host: ${row.host}:${row.port}</p>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
        <p>© ${new Date().getFullYear()} FeraSetu — Your Shop's Digital Bridge</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${sanitizeHeader(row.sender_name || 'FeraSetu')}" <${sanitizeHeader(row.sender_email)}>`,
      to: recipientEmail,
      subject: 'FeraSetu SMTP Test Email',
      html,
      replyTo: row.reply_to_email ? sanitizeHeader(row.reply_to_email) : undefined,
    });

    return { success: true, message: `Test email sent successfully to ${recipientEmail}` };
  } catch (error: any) {
    console.error('SMTP test email failed:', error.message);
    return { success: false, message: `Failed to send test email: ${error.message}` };
  }
}

export async function sendOtpViaCustomSmtp(
  userId: string,
  recipientEmail: string,
  otp: string,
  expiryMinutes: number = 10
): Promise<{ success: boolean; message: string }> {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM smtp_settings WHERE user_id = ? AND is_active = 1').get(userId) as SmtpSettingsRow | undefined;

  if (!row || !row.host || !row.sender_email || !row.password_encrypted) {
    return { success: false, message: 'Custom SMTP not configured or not active' };
  }

  const password = decryptPassword(row.password_encrypted);
  const subject = row.otp_subject || `Verify your email • FeraSetu`;

  let bodyTemplate = row.otp_body_template;
  if (!bodyTemplate) {
    bodyTemplate = `Hello {{name}},\n\nYour verification code is:\n\n{{otp}}\n\nThis code expires in {{expiry}} minutes.\n\nIf you didn't create an account, ignore this email.\n\n— Team FeraSetu`;
  }

  const body = bodyTemplate
    .replace(/\{\{name\}\}/g, recipientEmail.split('@')[0])
    .replace(/\{\{otp\}\}/g, otp)
    .replace(/\{\{email\}\}/g, recipientEmail)
    .replace(/\{\{expiry\}\}/g, String(expiryMinutes))
    .replace(/\{\{app_name\}\}/g, 'FeraSetu');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #0052FF; margin: 0; font-size: 28px; font-weight: 900;">FeraSetu</h1>
      </div>
      <div style="background: #fff; border: 1px solid #f1f5f9; border-radius: 24px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="font-size: 24px; font-weight: 800; color: #1e293b; margin-top: 0;">Verify your account 🔐</h2>
        <p style="font-size: 16px; color: #475569;">Welcome to FeraSetu. Use the code below to complete your registration.</p>
        <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center; margin: 32px 0; border: 2px solid #e2e8f0;">
          <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #1e293b; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #94a3b8; text-align: center;">This code will expire in ${expiryMinutes} minutes. If you didn't request this, please ignore this email.</p>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
        <p>© ${new Date().getFullYear()} FeraSetu — Your Shop's Digital Bridge</p>
      </div>
    </div>
  `;

  const transportConfig = {
    host: row.host,
    port: row.port,
    secure: row.ssl_enabled === 1,
    auth: row.username ? { user: row.username, pass: password } : undefined,
    requireTLS: row.tls_enabled === 1 && row.ssl_enabled !== 1,
  };

  const transporter = nodemailer.createTransport(transportConfig);

  try {
    await transporter.sendMail({
      from: `"${sanitizeHeader(row.sender_name || 'FeraSetu')}" <${sanitizeHeader(row.sender_email)}>`,
      to: recipientEmail,
      subject,
      html,
      replyTo: row.reply_to_email ? sanitizeHeader(row.reply_to_email) : undefined,
    });

    return { success: true, message: 'OTP email sent via custom SMTP' };
  } catch (error: any) {
    console.error('Custom SMTP OTP send failed:', error.message);
    return { success: false, message: `Failed to send OTP: ${error.message}` };
  }
}

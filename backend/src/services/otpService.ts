import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../models/database';
import { v4 as uuidv4 } from 'uuid';

export interface OTPSettings {
  otp_length: number;
  otp_expiry_minutes: number;
  otp_resend_cooldown: number;
  otp_max_attempts: number;
}

export const DEFAULT_OTP_SETTINGS: OTPSettings = {
  otp_length: 6,
  otp_expiry_minutes: 10,
  otp_resend_cooldown: 60,
  otp_max_attempts: 5,
};

export class OTPService {
  static generateOTP(length: number = 6): string {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return crypto.randomInt(min, max + 1).toString().padStart(length, '0');
  }

  static async hashOTP(otp: string): Promise<string> {
    return bcrypt.hash(otp, 12);
  }

  static async verifyOTPHash(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash);
  }

  static async createOTP(email: string, settings: OTPSettings = DEFAULT_OTP_SETTINGS): Promise<{ otp: string; error?: string }> {
    const db = getDatabase();
    
    // Check for cooldown
    const lastOTP = db.prepare('SELECT created_at FROM otp_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1').get(email) as any;
    
    if (lastOTP) {
      const lastTime = new Date(lastOTP.created_at).getTime();
      const now = new Date().getTime();
      const diff = (now - lastTime) / 1000;
      
      if (diff < settings.otp_resend_cooldown) {
        return { otp: '', error: `Please wait ${Math.ceil(settings.otp_resend_cooldown - diff)} seconds before resending.` };
      }
    }

    const otp = this.generateOTP(settings.otp_length);
    const hash = await this.hashOTP(otp);
    const expiresAt = new Date(Date.now() + settings.otp_expiry_minutes * 60000).toISOString();

    // Clear old codes for this email
    db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);

    // Save new code
    db.prepare(`
      INSERT INTO otp_codes (id, email, otp_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), email, hash, expiresAt);

    return { otp };
  }

  static async verifyOTP(email: string, otp: string, settings: OTPSettings = DEFAULT_OTP_SETTINGS): Promise<{ success: boolean; message: string }> {
    const db = getDatabase();
    const record = db.prepare('SELECT * FROM otp_codes WHERE email = ?').get(email) as any;

    if (!record) return { success: false, message: 'OTP expired or not found. Please request a new one.' };

    if (new Date(record.expires_at) < new Date()) {
      db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
      return { success: false, message: 'OTP has expired.' };
    }

    if (record.attempts >= settings.otp_max_attempts) {
      db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
      return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    const valid = await this.verifyOTPHash(otp, record.otp_hash);
    if (!valid) {
      db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ?').run(email);
      return { success: false, message: `Invalid OTP. ${settings.otp_max_attempts - (record.attempts + 1)} attempts remaining.` };
    }

    // Success - delete the code
    db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
    return { success: true, message: 'OTP verified successfully.' };
  }
}
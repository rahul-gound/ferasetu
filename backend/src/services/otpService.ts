import crypto from 'crypto';
import { getDatabase } from '../models/database';
import { v4 as uuidv4 } from 'uuid';

export class OTPService {
  private static OTP_EXPIRY_MINUTES = 10;
  private static RESEND_COOLDOWN_SECONDS = 30;
  private static MAX_ATTEMPTS = 3;

  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  static async createOTP(email: string): Promise<{ otp: string; error?: string }> {
    const db = getDatabase();
    
    // Check for cooldown
    const lastOTP = db.prepare('SELECT created_at FROM otp_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1').get(email) as any;
    
    if (lastOTP) {
      const lastTime = new Date(lastOTP.created_at).getTime();
      const now = new Date().getTime();
      const diff = (now - lastTime) / 1000;
      
      if (diff < this.RESEND_COOLDOWN_SECONDS) {
        return { otp: '', error: `Please wait ${Math.ceil(this.RESEND_COOLDOWN_SECONDS - diff)} seconds before resending.` };
      }
    }

    const otp = this.generateOTP();
    const hash = this.hashOTP(otp);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60000).toISOString();

    // Clear old codes for this email
    db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);

    // Save new code
    db.prepare(`
      INSERT INTO otp_codes (id, email, otp_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), email, hash, expiresAt);

    return { otp };
  }

  static async verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const db = getDatabase();
    const record = db.prepare('SELECT * FROM otp_codes WHERE email = ?').get(email) as any;

    if (!record) return { success: false, message: 'OTP expired or not found. Please request a new one.' };

    if (new Date(record.expires_at) < new Date()) {
      db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
      return { success: false, message: 'OTP has expired.' };
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
      return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    const hash = this.hashOTP(otp);
    if (hash !== record.otp_hash) {
      db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ?').run(email);
      return { success: false, message: `Invalid OTP. ${this.MAX_ATTEMPTS - (record.attempts + 1)} attempts remaining.` };
    }

    // Success - delete the code
    db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
    return { success: true, message: 'OTP verified successfully.' };
  }
}

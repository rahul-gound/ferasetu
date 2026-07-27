import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { registerUser, loginUser, getUserById } from '../services/authService';
import { sendOnboardingEmail, sendOTPEmail } from '../services/mailService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { OTPService } from '../services/otpService';
import { getSmtpSettings, sendOtpViaCustomSmtp } from '../services/smtpService';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

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

// Rate limiter for OTP sending (by IP for unauthenticated)
const otpRateLimiter = createRateLimiter(5, 15);

// Rate limiter for OTP sending (by user ID for authenticated)
const otpRateLimiterAuth = createRateLimiter(5, 15, (req: any) => req.user?.id || req.ip);

/**
 * PHASE 0: VERIFY OTP ONLY (no user creation - for frontend OTP step)
 */
router.post('/verify-otp',
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 4, max: 8 }).isNumeric().withMessage('Valid 4-8 digit OTP is required'),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, otp } = req.body;

    try {
      const verifyResult = await OTPService.verifyOTP(email, otp);
      if (!verifyResult.success) {
        res.status(400).json({ success: false, error: verifyResult.message });
        return;
      }
      res.status(200).json({ success: true, message: 'OTP verified successfully.' });
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      res.status(500).json({ error: 'Failed to verify OTP.' });
    }
  }
);

/**
 * PHASE 1: PRE-REGISTRATION (OTP SENDING)
 */
router.post('/send-otp',
  otpRateLimiter,
  body('email').isEmail().normalizeEmail(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email } = req.body;

    try {
      const { otp, error } = await OTPService.createOTP(email);
      if (error) {
        res.status(429).json({ error });
        return;
      }

      await sendOTPEmail(email, otp);
      res.status(200).json({ success: true, message: 'OTP sent to your email.' });
    } catch (err: any) {
      console.error('Send OTP error:', err);
      res.status(500).json({ error: 'Failed to send OTP. Please try again later.' });
    }
  }
);

/**
 * PHASE 1b: SEND VERIFICATION EMAIL USING CUSTOM SMTP
 * Uses shop owner's configured SMTP settings to send OTP
 */
router.post('/send-verification-email',
  otpRateLimiter,
  body('email').isEmail().normalizeEmail(),
  body('shop_id').optional().isString(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, shop_id } = req.body;

    try {
      let smtpSettings = null;
      
      // If shop_id provided, get that shop's SMTP settings
      if (shop_id) {
        smtpSettings = getSmtpSettings(shop_id);
      }

      // Use custom OTP settings if available
      const otpSettings = {
        otp_length: smtpSettings?.otp_length || 6,
        otp_expiry_minutes: smtpSettings?.otp_expiry_minutes || 10,
        otp_resend_cooldown: smtpSettings?.otp_resend_cooldown || 60,
        otp_max_attempts: smtpSettings?.otp_max_attempts || 5,
      };

      // Create OTP with custom settings
      const { otp, error } = await OTPService.createOTP(email, otpSettings);
      if (error) {
        res.status(429).json({ error });
        return;
      }

      // Send email using custom SMTP if configured, otherwise use default mail service
      let result;
      if (smtpSettings && smtpSettings.is_active && smtpSettings.host && smtpSettings.sender_email && smtpSettings.has_password) {
        result = await sendOtpViaCustomSmtp(shop_id!, email, otp, otpSettings.otp_expiry_minutes);
      } else {
        await sendOTPEmail(email, otp);
        result = { success: true, message: 'OTP sent via default mail service.' };
      }

      if (result.success) {
        res.status(200).json({ success: true, message: 'Verification email sent.' });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (err: any) {
      console.error('Send verification email error:', err);
      res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
    }
  }
);

/**
 * PHASE 2: REGISTRATION (WITH OTP)
 */
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('otp').isLength({ min: 4, max: 8 }).isNumeric().withMessage('Valid 4-8 digit OTP is required'),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, otp, name, password, businessName } = req.body;

    try {
      const db = getDatabase();
      
      // 1. Verify OTP
      const verifyResult = await OTPService.verifyOTP(email, otp);
      if (!verifyResult.success) {
        res.status(400).json({ error: verifyResult.message });
        return;
      }

      // 2. Register User
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already registered.' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      const betaEndsAt = new Date();
      betaEndsAt.setFullYear(betaEndsAt.getFullYear() + 10);

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, business_name, is_verified, plan, plan_expires_at, ai_credits_balance, ai_credits_monthly_limit, ai_credits_reset_at)
        VALUES (?, ?, ?, ?, ?, 1, 'beta', ?, 20, 20, datetime('now', '+30 days'))
      `).run(userId, email, hashedPassword, name, businessName || name, betaEndsAt.toISOString());

      // 3. Send Onboarding Welcome Email
      sendOnboardingEmail(email, name).catch(err => console.error('Welcome email failed:', err.message));

      // 4. Generate Token
      const token = jwt.sign(
        { id: userId, email, plan: 'beta' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Set JWT in HttpOnly cookie
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('access_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
      
      // Return user data without token
      res.status(201).json({
        success: true,
        user: { id: userId, email, name, plan: 'beta', ai_credits_balance: 20, ai_credits_monthly_limit: 20, ai_credits_used_month: 0, plan_expires_at: betaEndsAt.toISOString() }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Failed to complete registration.' });
    }
  }
);

/**
 * PHASE 3: LOGIN & PROFILE
 */
router.post('/login',
  body('email').trim().notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await loginUser(req.body.email, req.body.password);
      
      // Set JWT in HttpOnly cookie
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('access_token', result.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
      
      // Return user data without token
      const { token: _, ...userData } = result;
      res.json({ user: userData });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const user = getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const { business_name, preferredLanguage, phone } = req.body;
    
    const updates: Record<string, unknown> = {};
    if (business_name) updates.business_name = business_name;
    if (preferredLanguage) updates.preferred_language = preferredLanguage;
    if (phone) updates.phone = phone;

    const updateFields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const updateValues = Object.values(updates);

    if (updateFields) {
      db.prepare(`UPDATE users SET ${updateFields} WHERE id = ?`).run(...updateValues, req.user!.id);
    }

    const updated = getUserById(req.user!.id);
    res.json(updated);
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/languages', (_req: Request, res: Response): void => {
  const { SUPPORTED_LANGUAGES } = require('../services/sarvamAI');
  res.json(SUPPORTED_LANGUAGES);
});

// Public platform stats for landing page
router.get('/public/platform-stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    
    const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
    const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any)?.c || 0;
    const totalProducts = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any)?.c || 0;
    const totalRevenue = (db.prepare("SELECT SUM(total) as s FROM orders WHERE payment_status = 'paid'").get() as any)?.s || 0;
    const subscriptionRevenue = (db.prepare("SELECT SUM(amount) as s FROM transactions WHERE status = 'completed'").get() as any)?.s || 0;
    
    // Active users (30 days)
    const activeUsers = (db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM analytics_events WHERE created_at > datetime('now', '-30 days')").get() as any)?.c || 0;
    
    // Cities with shops
    const citiesCount = (db.prepare("SELECT COUNT(DISTINCT city) as c FROM users WHERE city IS NOT NULL AND city != ''").get() as any)?.c || 0;
    
    // Languages supported
    const languagesCount = 22; // Based on SUPPORTED_LANGUAGES
    
    // Uptime calculation (based on server start)
    const uptime = process.uptime();
    const uptimePercentage = Math.min(99.9, 99.0 + (uptime / 86400) * 0.5); // Rough calculation

    res.json({
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue: totalRevenue + subscriptionRevenue,
      activeUsers,
      citiesCount,
      languagesCount,
      uptime: uptimePercentage.toFixed(1)
    });
  } catch (err: any) {
    console.error('Platform stats error:', err);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

export default router;

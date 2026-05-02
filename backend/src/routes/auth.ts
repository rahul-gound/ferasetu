import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { registerUser, loginUser, getUserById } from '../services/authService';
import { sendOnboardingEmail, sendOTPEmail } from '../services/mailService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { OTPService } from '../services/otpService';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod';

// Rate limiter for OTP sending
const otpRateLimiter = createRateLimiter(5, 15);

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
 * PHASE 2: REGISTRATION (WITH OTP)
 */
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP is required'),
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

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, business_name, is_verified)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(userId, email, hashedPassword, name, businessName || name);

      // 3. Send Onboarding Welcome Email
      sendOnboardingEmail(email, name).catch(err => console.error('Welcome email failed:', err.message));

      // 4. Generate Token
      const token = jwt.sign(
        { id: userId, email, plan: 'free' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        token,
        user: { id: userId, email, name, plan: 'free' }
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
      res.json(result);
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

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

export default router;

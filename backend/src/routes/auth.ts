import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { registerUser, loginUser, getUserById } from '../services/authService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await registerUser(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// Login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
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
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// Get current user
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const user = getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

// Get supported languages
router.get('/languages', (_req: Request, res: Response): void => {
  const { SUPPORTED_LANGUAGES } = require('../services/sarvamAI');
  res.json(SUPPORTED_LANGUAGES);
});

export default router;

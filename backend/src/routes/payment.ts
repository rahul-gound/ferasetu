import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';

const router = Router();
router.use(authenticate);

/**
 * @route   POST /api/payment/initialize
 * @desc    Activate a plan during development without payment provider
 * @access  Private
 */
router.post('/initialize',
  body('plan').isIn(['basic', 'standard', 'pro', 'premium']).withMessage('Invalid plan selected'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be positive'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { plan, amount } = req.body;
    const db = getDatabase();
    const userId = req.user!.id;

    try {
      const transactionId = uuidv4();
      db.prepare(`
        INSERT INTO transactions (id, user_id, provider_order_id, amount, plan, status, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(transactionId, userId, `dev_${transactionId}`, amount, plan, 'completed', JSON.stringify({ provider: 'development' }));

      db.prepare("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE id = ?").run(plan, userId);

      res.status(201).json({ success: true, id: transactionId, plan, message: `Plan activated: ${plan}` });
    } catch (error: any) {
      console.error('Failed to initialize payment:', error);
      res.status(500).json({ error: error.message || 'Failed to initialize payment' });
    }
  }
);

/**
 * @route   POST /api/payment/verify
 * @desc    No-op verification retained for development compatibility
 * @access  Private
 */
router.post('/verify',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const db = getDatabase();
    const userId = req.user!.id;

    try {
      const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(userId) as { plan?: string } | undefined;
      
      res.json({ success: true, message: `Plan active: ${user?.plan || 'free'}` });
    } catch (error: any) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: error.message || 'Error during payment verification' });
    }
  }
);

/**
 * @route   GET /api/payment/history
 * @desc    Get user's transaction history
 * @access  Private
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const userId = req.user!.id;

  try {
    const history = db.prepare(`
      SELECT * FROM transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

export default router;

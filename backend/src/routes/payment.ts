import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';

const router = Router();
router.use(authenticate);

const PLAN_CONFIG: Record<string, { amount: number; monthlyCredits: number; trialDays?: number }> = {
  trial: { amount: 0, monthlyCredits: 20, trialDays: 7 },
  basic: { amount: 299, monthlyCredits: 100 },
  standard: { amount: 699, monthlyCredits: 500 },
  pro: { amount: 1499, monthlyCredits: 2000 },
  premium: { amount: 699, monthlyCredits: 500 }
};

const CREDIT_PACKS: Record<string, { credits: number; amount: number; label: string }> = {
  small: { credits: 250, amount: 149, label: '250 AI credits' },
  growth: { credits: 1000, amount: 499, label: '1,000 AI credits' },
  scale: { credits: 3000, amount: 1299, label: '3,000 AI credits' }
};

const EXTRA_STORAGE_PRICE_PER_GB = 20;

/**
 * @route   POST /api/payment/initialize
 * @desc    Activate a plan during development without payment provider
 * @access  Private
 */
router.post('/initialize',
  body('plan').isIn(['basic', 'standard', 'pro']).withMessage('Invalid plan selected'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be positive'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { plan } = req.body;
    const requestedAmount = Number(req.body.amount);
    const db = getDatabase();
    const userId = req.user!.id;

    try {
      const transactionId = uuidv4();
      const planConfig = PLAN_CONFIG[plan] || PLAN_CONFIG.basic;
      if (requestedAmount !== planConfig.amount) {
        res.status(400).json({ error: 'Invalid amount for selected plan' });
        return;
      }

      db.prepare(`
        INSERT INTO transactions (id, user_id, provider_order_id, amount, plan, status, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(transactionId, userId, `dev_${transactionId}`, requestedAmount, plan, 'completed', JSON.stringify({ provider: 'development' }));

      db.prepare(`
        UPDATE users
        SET plan = ?, ai_credits_balance = ai_credits_balance + ?, ai_credits_monthly_limit = ?, ai_credits_used_month = 0,
            ai_credits_reset_at = datetime('now', '+30 days'), updated_at = datetime('now')
        WHERE id = ?
      `).run(plan, planConfig.monthlyCredits, planConfig.monthlyCredits, userId);

      res.status(201).json({ success: true, id: transactionId, plan, message: `Plan activated: ${plan}` });
    } catch (error: any) {
      console.error('Failed to initialize payment:', error);
      res.status(500).json({ error: error.message || 'Failed to initialize payment' });
    }
  }
);

router.get('/ai-credits', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const userId = req.user!.id;

  const user = db.prepare(`
    SELECT plan, ai_credits_balance, ai_credits_monthly_limit, ai_credits_used_month, ai_credits_reset_at, plan_expires_at
    FROM users WHERE id = ?
  `).get(userId) as any;

  const purchases = db.prepare(`
    SELECT credits, amount, usage_scope, status, created_at
    FROM ai_credit_purchases
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(userId);

  const usage = db.prepare(`
    SELECT usage_type, COUNT(*) as calls, SUM(credits_used) as credits_used, SUM(prompt_tokens + completion_tokens) as tokens
    FROM ai_usage_logs
    WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
    GROUP BY usage_type
  `).all(userId);

  res.json({ credits: user, packs: CREDIT_PACKS, purchases, usage });
});

router.post('/storage/purchase',
  body('gb').isInt({ min: 1, max: 100 }).withMessage('Storage must be between 1GB and 100GB'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const gb = parseInt(req.body.gb, 10);
    const amount = gb * EXTRA_STORAGE_PRICE_PER_GB;
    const bytes = gb * 1024 * 1024 * 1024;
    const db = getDatabase();
    const userId = req.user!.id;
    const purchaseId = uuidv4();

    try {
      db.prepare(`
        INSERT INTO storage_purchases (id, user_id, gb_added, amount, status)
        VALUES (?, ?, ?, ?, 'completed')
      `).run(purchaseId, userId, gb, amount);

      db.prepare(`
        INSERT INTO transactions (id, user_id, provider_order_id, amount, plan, status, metadata)
        VALUES (?, ?, ?, ?, ?, 'completed', ?)
      `).run(uuidv4(), userId, `storage_${purchaseId}`, amount, req.user!.plan || 'basic', JSON.stringify({ type: 'extra_storage', gb }));

      db.prepare("UPDATE users SET storage_limit_bytes = storage_limit_bytes + ?, updated_at = datetime('now') WHERE id = ?")
        .run(bytes, userId);

      const storage = db.prepare('SELECT storage_used_bytes, storage_limit_bytes FROM users WHERE id = ?').get(userId) as any;
      res.status(201).json({ success: true, purchaseId, gb, amount, storage });
    } catch (error: any) {
      console.error('Storage purchase failed:', error);
      res.status(500).json({ error: error.message || 'Failed to purchase storage' });
    }
  }
);

router.post('/ai-credits/purchase',
  body('pack').isIn(Object.keys(CREDIT_PACKS)).withMessage('Invalid credit pack'),
  body('usage_scope').optional().isIn(['shared', 'website_ai', 'customer_assistant']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const pack = CREDIT_PACKS[req.body.pack];
    const usageScope = req.body.usage_scope || 'shared';
    const db = getDatabase();
    const userId = req.user!.id;
    const purchaseId = uuidv4();

    try {
      db.prepare(`
        INSERT INTO ai_credit_purchases (id, user_id, credits, amount, usage_scope, status)
        VALUES (?, ?, ?, ?, ?, 'completed')
      `).run(purchaseId, userId, pack.credits, pack.amount, usageScope);

      db.prepare(`
        INSERT INTO transactions (id, user_id, provider_order_id, amount, plan, status, metadata)
        VALUES (?, ?, ?, ?, ?, 'completed', ?)
      `).run(uuidv4(), userId, `credits_${purchaseId}`, pack.amount, req.user!.plan || 'basic', JSON.stringify({ type: 'ai_credits', credits: pack.credits, usage_scope: usageScope }));

      db.prepare("UPDATE users SET ai_credits_balance = ai_credits_balance + ?, updated_at = datetime('now') WHERE id = ?")
        .run(pack.credits, userId);

      const balance = db.prepare('SELECT ai_credits_balance FROM users WHERE id = ?').get(userId) as any;
      res.status(201).json({ success: true, purchaseId, pack, usage_scope: usageScope, ai_credits_balance: balance?.ai_credits_balance || 0 });
    } catch (error: any) {
      console.error('AI credit purchase failed:', error);
      res.status(500).json({ error: error.message || 'Failed to purchase AI credits' });
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

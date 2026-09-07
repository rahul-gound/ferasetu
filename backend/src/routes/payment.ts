import { Router, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';
import { BETA_MODE, isBetaFreePlan, getEffectivePlanAmount } from '../config/beta';

const router = Router();
router.use(authenticate);

const PLAN_CONFIG: Record<string, { amount: number; monthlyCredits: number; trialDays?: number }> = {
  free: { amount: 0, monthlyCredits: 20 },
  beta: { amount: 0, monthlyCredits: 20, trialDays: 3650 },
  trial: { amount: 0, monthlyCredits: 20, trialDays: 7 },
  business: { amount: 399, monthlyCredits: 200 },
  growth: { amount: 399, monthlyCredits: 200 },
  basic: { amount: 299, monthlyCredits: 100 },
  standard: { amount: 699, monthlyCredits: 500 },
  pro: { amount: 999, monthlyCredits: 1000 },
  premium: { amount: 999, monthlyCredits: 1000 }
};

const CREDIT_PACKS: Record<string, { credits: number; amount: number; label: string }> = {
  small: { credits: 250, amount: 149, label: '250 AI credits' },
  growth: { credits: 1000, amount: 499, label: '1,000 AI credits' },
  scale: { credits: 3000, amount: 1299, label: '3,000 AI credits' }
};

const EXTRA_STORAGE_PRICE_PER_GB = 20;

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

function isPaidPlan(planId: string): boolean {
  return (PLAN_CONFIG[planId]?.amount ?? 0) > 0 && !isBetaFreePlan(planId);
}

async function createRazorpayOrder(amountInRupees: number, receiptId: string): Promise<{ id: string }> {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await axios.post(
    `${RAZORPAY_API_BASE}/orders`,
    {
      amount: Math.round(amountInRupees * 100),
      currency: 'INR',
      receipt: receiptId,
    },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * @route   POST /api/payment/initialize
 * @desc    Activate a free plan directly; create a Razorpay order for paid plans
 * @access  Private
 */
router.post('/initialize',
  body('plan').isIn(['free', 'beta', 'trial', 'business', 'growth', 'basic', 'standard', 'pro', 'premium']).withMessage('Invalid plan selected'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be zero or positive'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { plan } = req.body;
    const requestedAmount = Number(req.body.amount);
    const billingCycle = req.body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const db = getDatabase();
    const userId = req.user!.id;

    try {
      const transactionId = uuidv4();
      const planConfig = PLAN_CONFIG[plan] || PLAN_CONFIG.basic;
      const effectiveAmount = getEffectivePlanAmount(plan, planConfig.amount);
      const billingMultiplier = billingCycle === 'yearly' ? 10 : 1;
      const expectedAmount = effectiveAmount * billingMultiplier;
      if (requestedAmount !== expectedAmount) {
        res.status(400).json({ error: 'Invalid amount for selected plan' });
        return;
      }

      // Free plans bypass Razorpay entirely and are activated directly.
      if (!isPaidPlan(plan)) {
        db.prepare(`
          INSERT INTO transactions (id, user_id, provider_order_id, amount, plan, status, metadata)
          VALUES (?, ?, ?, ?, ?, 'completed', ?)
        `).run(
          transactionId,
          userId,
          `dev_${transactionId}`,
          0,
          plan,
          'completed',
          JSON.stringify({
            provider: 'development',
            betaFreePlan: isBetaFreePlan(plan),
            betaMode: BETA_MODE
          })
        );

        db.prepare(`
          UPDATE users
          SET plan = ?, ai_credits_balance = ai_credits_balance + ?, ai_credits_monthly_limit = ?, ai_credits_used_month = 0,
              ai_credits_reset_at = datetime('now', '+30 days'), updated_at = datetime('now')
          WHERE id = ?
        `).run(plan, planConfig.monthlyCredits, planConfig.monthlyCredits, userId);

        res.status(201).json({
          success: true,
          requiresPayment: false,
          id: transactionId,
          plan,
          amount: 0,
          betaFreePlan: isBetaFreePlan(plan),
          message: `Plan activated for free: ${plan}`
        });
        return;
      }

      // Paid plans require a Razorpay order before activation in production.
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || RAZORPAY_KEY_ID.includes('your_key_id') || process.env.NODE_ENV === 'test') {
        db.prepare(`
          INSERT INTO transactions (id, user_id, provider_order_id, amount, plan, status, metadata)
          VALUES (?, ?, ?, ?, ?, 'completed', ?)
        `).run(
          transactionId,
          userId,
          `dev_${transactionId}`,
          expectedAmount,
          plan,
          JSON.stringify({
            provider: 'test_dev',
            billingCycle
          })
        );

        db.prepare(`
          UPDATE users
          SET plan = ?, ai_credits_balance = ai_credits_balance + ?, ai_credits_monthly_limit = ?, ai_credits_used_month = 0,
              ai_credits_reset_at = datetime('now', '+30 days'), updated_at = datetime('now')
          WHERE id = ?
        `).run(plan, planConfig.monthlyCredits, planConfig.monthlyCredits, userId);

        res.status(201).json({
          success: true,
          requiresPayment: false,
          id: transactionId,
          plan,
          amount: expectedAmount,
          message: `Plan activated: ${plan}`
        });
        return;
      }

      const razorpayOrder = await createRazorpayOrder(expectedAmount, transactionId);

      db.prepare(`
        INSERT INTO transactions (id, user_id, provider_order_id, amount, plan, status, metadata)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        transactionId,
        userId,
        razorpayOrder.id,
        expectedAmount,
        plan,
        JSON.stringify({
          provider: 'razorpay',
          razorpay_order_id: razorpayOrder.id,
          billingCycle
        })
      );

      res.status(201).json({
        success: true,
        requiresPayment: true,
        id: transactionId,
        plan,
        amount: expectedAmount,
        currency: 'INR',
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: RAZORPAY_KEY_ID,
        message: `Razorpay order created for plan: ${plan}`
      });
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
 * @desc    Verify Razorpay payment signature and activate the paid plan
 * @access  Private
 */
router.post('/verify', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // If called without Razorpay transaction payload, treat as an active plan confirmation check
    if (!req.body.razorpay_order_id && !req.body.transaction_id) {
      res.status(200).json({
        success: true,
        plan: req.user!.plan,
        message: `Active plan confirmed: ${req.user!.plan}`
      });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transaction_id } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !transaction_id) {
      res.status(400).json({ error: 'Missing required Razorpay verification fields' });
      return;
    }
    const db = getDatabase();
    const userId = req.user!.id;

    try {
      const transaction = db.prepare(`
        SELECT * FROM transactions
        WHERE id = ? AND user_id = ?
      `).get(transaction_id, userId) as any;

      if (!transaction || transaction.status !== 'pending') {
        res.status(400).json({ error: 'Invalid or already processed transaction' });
        return;
      }

      if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        res.status(400).json({ error: 'Invalid payment signature' });
        return;
      }

      const planConfig = PLAN_CONFIG[transaction.plan] || PLAN_CONFIG.basic;

      db.prepare(`
        UPDATE transactions
        SET status = 'completed', metadata = ?
        WHERE id = ?
      `).run(
        JSON.stringify({
          provider: 'razorpay',
          razorpay_order_id,
          razorpay_payment_id,
        }),
        transaction.id
      );

      db.prepare(`
        UPDATE users
        SET plan = ?, ai_credits_balance = ai_credits_balance + ?, ai_credits_monthly_limit = ?, ai_credits_used_month = 0,
            ai_credits_reset_at = datetime('now', '+30 days'), updated_at = datetime('now')
        WHERE id = ?
      `).run(transaction.plan, planConfig.monthlyCredits, planConfig.monthlyCredits, userId);

      res.json({ success: true, plan: transaction.plan, message: `Plan activated: ${transaction.plan}` });
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

/**
 * @route   POST /api/payment/cancel-subscription
 * @desc    Stop future renewal while retaining access until plan_expires_at
 * @access  Private
 */
router.post('/cancel-subscription', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const userId = req.user!.id;

  try {
    const user = db.prepare('SELECT id, plan, plan_expires_at FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    db.prepare(`
      UPDATE users
      SET cancel_at_period_end = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(userId);

    res.json({
      success: true,
      cancel_at_period_end: true,
      plan_expires_at: user.plan_expires_at,
      message: 'Subscription renewal cancelled. Access continues until the end of the billing period.',
    });
  } catch (error: any) {
    console.error('Cancel subscription failed:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * @route   POST /api/payment/resume-subscription
 * @desc    Resume automatic renewal for a cancelled subscription
 * @access  Private
 */
router.post('/resume-subscription', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const userId = req.user!.id;

  try {
    db.prepare(`
      UPDATE users
      SET cancel_at_period_end = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(userId);

    const user = db.prepare('SELECT id, plan, plan_expires_at, cancel_at_period_end FROM users WHERE id = ?').get(userId) as any;

    res.json({
      success: true,
      cancel_at_period_end: false,
      plan_expires_at: user.plan_expires_at,
      message: 'Subscription renewal resumed.',
    });
  } catch (error: any) {
    console.error('Resume subscription failed:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

export default router;

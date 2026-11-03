import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';

const router = Router();
router.use(authenticate);

function safeFloat(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Generate human-friendly, high-entropy gift card code (FERA-XXXX-XXXX-XXXX)
function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0, O, 1, I
  let code = 'FERA-';
  // 32-character alphabet: a byte mask gives each symbol equal probability.
  const bytes = randomBytes(12);
  for (let block = 0; block < 3; block++) {
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(bytes[block * 4 + i] & 31);
    }
    if (block < 2) code += '-';
  }
  return code;
}

/**
 * GET /api/gift-cards
 * Retrieves all gift card products and issued gift cards for the tenant
 */
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const userId = req.user!.id;

    // 1. Get gift card products from products table
    let giftCardProducts: any[] = [];
    try {
      const allProducts = db.prepare('SELECT * FROM products WHERE user_id = ?').all(userId) as any[];
      giftCardProducts = allProducts.filter(p => {
        if (p.category === 'Gift Cards' || p.category === 'Gift Card') return true;
        try {
          const meta = p.metadata ? JSON.parse(p.metadata) : null;
          return meta?.is_gift_card === true;
        } catch {
          return false;
        }
      });
    } catch (e) {
      console.warn('Error reading gift card products:', e);
    }

    // 2. Get issued individual gift cards
    let issuedGiftCards: any[] = [];
    try {
      issuedGiftCards = db.prepare('SELECT * FROM gift_cards WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    } catch {
      issuedGiftCards = [];
    }

    // 3. Calculate financial obligation summary
    const totalIssuedValue = issuedGiftCards.reduce((acc, gc) => acc + (Number(gc.initial_value) || 0), 0);
    const outstandingBalance = issuedGiftCards.reduce((acc, gc) => acc + (Number(gc.balance) || 0), 0);
    const totalRedeemedValue = Math.max(0, totalIssuedValue - outstandingBalance);

    res.json({
      success: true,
      products: giftCardProducts,
      issued_cards: issuedGiftCards,
      stats: {
        total_products: giftCardProducts.length,
        total_issued_cards: issuedGiftCards.length,
        total_issued_value: totalIssuedValue,
        outstanding_balance_obligation: outstandingBalance,
        total_redeemed_value: totalRedeemedValue,
        currency: 'INR',
      }
    });
  } catch (error: any) {
    console.error('Error fetching gift cards:', error);
    res.status(500).json({ error: 'Failed to retrieve gift cards' });
  }
});

/**
 * POST /api/gift-cards/product
 * Creates a sellable digital gift card product in the merchant catalogue
 */
router.post(
  '/product',
  body('title').trim().notEmpty().withMessage('Gift card title is required'),
  body('denominations').isArray({ min: 1 }).withMessage('At least one denomination is required'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        title,
        description,
        denominations,
        currency = 'INR',
        cross_currency_redemption = false,
        image_url,
        sales_channels = ['online_store', 'whatsapp_shop'],
        tags = ['Gift Card', 'Digital'],
        product_type = 'Digital Gift Card',
        collection = 'Gift Cards',
        seo_title,
        seo_description,
        is_active = true,
      } = req.body;

      // Validate denominations (array of positive numbers)
      const validDenominations = denominations
        .map((d: any) => safeFloat(d))
        .filter((d: number | null): d is number => d !== null && d > 0);

      if (validDenominations.length === 0) {
        res.status(400).json({ error: 'At least one valid positive denomination (e.g. 500, 1000) is required' });
        return;
      }

      const db = getDatabase();
      const userId = req.user!.id;

      // Verify tenant plan limits
      const userPlan = (req.user?.plan || 'free').toLowerCase().trim();
      const PLAN_LIMITS: Record<string, number> = {
        free: 25,
        beta: 25,
        trial: 25,
        basic: 500,
        starter: 500,
        standard: 500,
        growth: 500,
        business: 500,
        pro: Infinity,
        premium: Infinity,
        scale: Infinity,
        enterprise: Infinity,
      };
      const limit = PLAN_LIMITS[userPlan] ?? 25;

      if (limit !== Infinity) {
        const countRow = db.prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?').get(userId) as { count?: number } | undefined;
        const count = countRow?.count || 0;
        if (count >= limit) {
          res.status(403).json({
            error: `${userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} plan allows up to ${limit} products. Upgrade your plan for more.`,
            code: 'PRODUCT_LIMIT_REACHED',
            limit,
            current: count,
            plan: userPlan,
            upgradeRequired: true,
          });
          return;
        }
      }

      const productId = uuidv4();
      const defaultPrice = validDenominations[0];

      const metadata = JSON.stringify({
        is_gift_card: true,
        currency,
        cross_currency_redemption: Boolean(cross_currency_redemption),
        denominations: validDenominations,
        sales_channels: Array.isArray(sales_channels) ? sales_channels : ['online_store'],
        tags: Array.isArray(tags) ? tags : [],
        product_type: product_type || 'Digital Gift Card',
        collection: collection || 'Gift Cards',
        seo: {
          title: seo_title || title,
          description: seo_description || description || '',
        },
        fulfilment: {
          delivery_type: 'digital_email',
          auto_issue_on_paid: true,
        },
      });

      const effectiveImageUrl = image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80';

      db.prepare(`
        INSERT INTO products (
          id, user_id, name, description, cost_price, price, sale_price,
          category, stock_quantity, image_url, is_active, metadata, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, datetime('now'), datetime('now')
        )
      `).run(
        productId,
        userId,
        title.trim(),
        description ? String(description).trim() : 'Digital Gift Card redeemable at checkout.',
        null,
        defaultPrice,
        null,
        'Gift Cards',
        9999, // Digital shopping value has unconstrained digital stock
        effectiveImageUrl,
        is_active ? 1 : 0,
        metadata
      );

      const createdProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

      res.status(201).json({
        success: true,
        message: 'Digital gift card product created successfully in your store catalog',
        product: createdProduct,
      });
    } catch (error: any) {
      console.error('Gift card product creation error:', error);
      res.status(500).json({ error: error.message || 'Failed to create gift card product' });
    }
  }
);

/**
 * POST /api/gift-cards/issue
 * Manually issues an individual gift card code directly (for customer support, loyalty reward, or offline sale)
 */
router.post(
  '/issue',
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        amount,
        currency = 'INR',
        recipient_email,
        recipient_name,
        note,
        expires_in_months,
      } = req.body;

      const initialValue = parseFloat(amount);
      const userId = req.user!.id;

      let expiresAt: string | null = null;
      if (expires_in_months && Number(expires_in_months) > 0) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + Number(expires_in_months));
        expiresAt = expiryDate.toISOString();
      }

      const db = getDatabase();
      const insertCard = db.prepare(`
        INSERT INTO gift_cards (
          id, user_id, code, initial_value, balance, currency,
          recipient_email, recipient_name, note, status, expires_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 'active', ?, datetime('now'), datetime('now')
        )
      `);

      // The unique index is the final authority; retry the exceptionally rare collision.
      let cardId = '';
      let code = '';
      let inserted = false;
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        cardId = uuidv4();
        code = generateGiftCardCode();
        try {
          insertCard.run(
            cardId,
            userId,
            code,
            initialValue,
            initialValue,
            currency,
            recipient_email ? String(recipient_email).trim() : null,
            recipient_name ? String(recipient_name).trim() : null,
            note ? String(note).trim() : null,
            expiresAt
          );
          inserted = true;
        } catch (insertError: any) {
          if (insertError?.code !== 'SQLITE_CONSTRAINT_UNIQUE' || attempt === 4) throw insertError;
        }
      }

      const issuedCard = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(cardId);

      res.status(201).json({
        success: true,
        message: 'Gift card issued successfully with unique redemption code',
        card: issuedCard,
      });
    } catch (error: any) {
      console.error('Error issuing individual gift card:', error);
      res.status(500).json({ error: error.message || 'Failed to issue gift card' });
    }
  }
);

/**
 * POST /api/gift-cards/simulate
 * Interactive checkout calculator demonstrating partial redemption & split payments
 */
router.post('/simulate', (req: AuthenticatedRequest, res: Response): void => {
  const { gift_card_balance = 1000, order_total = 700 } = req.body;
  const parsedBalance = safeFloat(gift_card_balance);
  const parsedTotal = safeFloat(order_total);
  if (parsedBalance === null || parsedBalance < 0 || parsedTotal === null || parsedTotal < 0) {
    res.status(400).json({ error: 'Gift card balance and order total must be valid non-negative amounts' });
    return;
  }
  const balance = parsedBalance;
  const total = parsedTotal;

  const appliedFromGiftCard = Math.min(balance, total);
  const remainingGiftCardBalance = Math.max(0, balance - appliedFromGiftCard);
  const remainingOrderToPay = Math.max(0, total - appliedFromGiftCard);

  res.json({
    success: true,
    simulation: {
      initial_card_balance: balance,
      order_total: total,
      applied_from_gift_card: appliedFromGiftCard,
      remaining_gift_card_balance: remainingGiftCardBalance,
      remaining_order_to_pay: remainingOrderToPay,
      currency: 'INR',
      explanation:
        total <= balance
          ? `The ₹${appliedFromGiftCard.toLocaleString('en-IN')} order is fully covered by the gift card. Remaining ₹${remainingGiftCardBalance.toLocaleString('en-IN')} stays on the card for a future purchase.`
          : `The ₹${appliedFromGiftCard.toLocaleString('en-IN')} gift card covers part of the order. The customer pays the remaining ₹${remainingOrderToPay.toLocaleString('en-IN')} using UPI, Card, or Cash on Delivery.`
    }
  });
});

export default router;

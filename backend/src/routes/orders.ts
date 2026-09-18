import { Router, Response, Request } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';
import { toMinorUnits, fromMinorUnits, addMinor, subMinor, formatMinor } from '../utils/money';
import { generateInvoicePdf, InvoicePdfData } from '../services/pdfService';
import { recordFinancialAudit } from '../services/auditService';
import {
  getOrderFinancialSummary,
  processRefund,
  getRefundsForOrder,
} from '../services/refundService';
import {
  createCreditNote,
  getCreditNotesForOrder,
  getCreditNotePdfBuffer,
} from '../services/creditNoteService';
import {
  sendInvoiceEmail,
  sendOrderCancellationEmail,
  sendRefundEmail,
} from '../services/mailService';

const router = Router();

function getTrackingHmacSecret(): string {
  return process.env.JWT_SECRET || 'ferasetu-order-tracking-secret-2026';
}

export function generateOrderTrackingToken(orderId: string, phone: string): string {
  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
  return crypto.createHmac('sha256', getTrackingHmacSecret())
    .update(`${orderId}:${cleanPhone}`)
    .digest('hex');
}

export function verifyOrderTrackingToken(orderId: string, phone: string, token: string): boolean {
  if (!orderId || !phone || !token) return false;
  const expected = generateOrderTrackingToken(orderId, phone);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. PUBLIC: Create order (called by shop visitors at checkout)
// ---------------------------------------------------------------------------
router.post('/create',
  body('customerName').notEmpty(),
  body('customerPhone').notEmpty(),
  body('deliveryType').isIn(['pickup', 'delivery']),
  body('shopId').notEmpty(),
  body('items').isArray({ min: 1 }),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      customerName, customerEmail, customerPhone, deliveryAddress,
      deliveryType, shopId, items, paymentMethod = 'offline'
    } = req.body;

    const db = getDatabase();

    // Resolve store market and currency
    const user = db.prepare('SELECT id, market FROM users WHERE id = ?').get(shopId) as any;
    const currency = user?.market === 'US' ? 'USD' : (user?.market === 'EU' ? 'EUR' : 'INR');

    // Calculate subtotal in minor units
    let subtotalMinor = 0;
    const resolvedItems = [];
    const deliveryCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const paymentOtp = Math.floor(100000 + Math.random() * 900000).toString();

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ? AND is_active = 1')
        .get(item.productId, shopId) as any;
      if (!product) continue;

      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const price = product.sale_price || product.price || 0;
      const unitPriceMinor = toMinorUnits(price, currency);
      const itemTotalMinor = unitPriceMinor * quantity;
      subtotalMinor = addMinor(subtotalMinor, itemTotalMinor);

      resolvedItems.push({
        productId: product.id,
        name: product.name,
        price,
        unitPriceMinor,
        quantity,
        total: fromMinorUnits(itemTotalMinor, currency),
        totalMinor: itemTotalMinor,
      });

      // Update stock safely
      if (product.stock_quantity > 0) {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?')
          .run(quantity, product.id);
      }
    }

    const deliveryFeeDecimal = deliveryType === 'delivery' ? 30 : 0;
    const deliveryFeeMinor = toMinorUnits(deliveryFeeDecimal, currency);
    const totalMinor = addMinor(subtotalMinor, deliveryFeeMinor);
    const totalDecimal = fromMinorUnits(totalMinor, currency);
    const subtotalDecimal = fromMinorUnits(subtotalMinor, currency);

    const isPaidOnline = paymentMethod === 'online';
    const amountPaidMinor = isPaidOnline ? totalMinor : 0;
    const orderId = uuidv4();

    db.prepare(`
      INSERT INTO orders (
        id, user_id, customer_name, customer_email, customer_phone, delivery_address,
        delivery_type, items, subtotal, delivery_fee, total, currency,
        subtotal_minor, delivery_fee_minor, total_minor, amount_paid_minor,
        refundable_amount_minor, refunded_amount_minor, notes, payment_status,
        payment_method, cancellation_status, return_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'none', 'none')
    `).run(
      orderId, shopId, customerName, customerEmail || null, customerPhone,
      deliveryAddress || null, deliveryType, JSON.stringify(resolvedItems),
      subtotalDecimal, deliveryFeeDecimal, totalDecimal, currency,
      subtotalMinor, deliveryFeeMinor, totalMinor, amountPaidMinor,
      amountPaidMinor, `Code: ${deliveryCode} | OTP: ${paymentOtp}`,
      isPaidOnline ? 'paid' : 'unpaid', paymentMethod
    );

    // Generate authoritative immutable Invoice
    const invoiceId = `inv_${uuidv4()}`;
    const invoiceNumber = `FS-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    db.prepare(`
      INSERT INTO invoices (
        id, order_id, user_id, invoice_number, items, subtotal, tax, total,
        currency, subtotal_minor, shipping_minor, tax_minor, total_minor,
        amount_paid_minor, balance_due_minor, payment_method, status, issued_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'issued', datetime('now'))
    `).run(
      invoiceId, orderId, shopId, invoiceNumber, JSON.stringify(resolvedItems),
      subtotalDecimal, totalDecimal, currency, subtotalMinor, deliveryFeeMinor,
      totalMinor, amountPaidMinor, isPaidOnline ? 0 : totalMinor, paymentMethod
    );

    // Append-only audit trail
    recordFinancialAudit({
      userId: shopId,
      orderId,
      invoiceId,
      eventType: 'invoice_issued',
      actorType: 'customer',
      currency,
      amountMinor: totalMinor,
      metadata: { invoiceNumber, paymentMethod, customerPhone },
    });

    const trackingToken = generateOrderTrackingToken(orderId, customerPhone);

    res.status(201).json({
      success: true,
      order: {
        id: orderId,
        total: totalDecimal,
        totalMinor,
        currency,
        deliveryCode,
        paymentOtp,
        invoiceNumber,
        trackingToken,
      },
      invoiceNumber,
    });
  }
);

// ---------------------------------------------------------------------------
// 2. PUBLIC: Track orders by phone (returns secure possession tokens)
// ---------------------------------------------------------------------------
router.get('/public/track', async (req: Request, res: Response): Promise<void> => {
  const { phone, shopId } = req.query;
  if (!phone || !shopId) {
    res.status(400).json({ error: 'Phone and shopId are required' });
    return;
  }

  try {
    const db = getDatabase();
    const orders = db.prepare(`
      SELECT o.id, o.customer_name, o.customer_phone, o.customer_email, o.total, o.currency,
             o.total_minor, o.status, o.payment_status, o.payment_method, o.delivery_type,
             o.notes, o.created_at, o.cancellation_status, o.cancellation_reason,
             o.cancelled_at, o.cancelled_by, o.refunded_amount_minor, o.return_status,
             i.invoice_number
      FROM orders o
      LEFT JOIN invoices i ON i.order_id = o.id
      WHERE o.customer_phone = ? AND o.user_id = ?
      ORDER BY o.created_at DESC
    `).all(phone, shopId) as any[];

    const enriched = (orders || []).map(o => {
      const trackingToken = generateOrderTrackingToken(o.id, o.customer_phone);
      // Fetch latest refund if cancelled or refunding
      let latestRefund = null;
      if (o.cancellation_status !== 'none' || (o.refunded_amount_minor && o.refunded_amount_minor > 0)) {
        latestRefund = db.prepare(`
          SELECT id, refund_number, amount_minor, currency, refund_method, is_manual, status, created_at, completed_at
          FROM refunds
          WHERE order_id = ?
          ORDER BY created_at DESC LIMIT 1
        `).get(o.id);
      }

      return {
        ...o,
        tracking_token: trackingToken,
        latest_refund: latestRefund,
      };
    });

    res.json({ orders: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. PUBLIC SECURE: Download Invoice PDF (requires cryptographic tracking token)
// ---------------------------------------------------------------------------
router.get('/public/:id/invoice/pdf', async (req: Request, res: Response): Promise<void> => {
  const orderId = req.params.id;
  const token = (req.query.token as string) || '';

  const db = getDatabase();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Cryptographic authorization check (possession validation)
  if (!verifyOrderTrackingToken(orderId, order.customer_phone, token)) {
    res.status(403).json({ error: 'Unauthorized: Invalid or expired tracking token' });
    return;
  }

  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId) as any;
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const merchant = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id) as any;
    const shop = db.prepare('SELECT * FROM shops WHERE organization_id = ? OR id = ?').get(merchant?.id, merchant?.id) as any;
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

    const currency = order.currency || invoice.currency || 'INR';
    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoice_number,
      orderId: order.id,
      issuedAt: invoice.issued_at || invoice.created_at,
      currency,
      merchant: {
        name: shop?.name || merchant?.business_name || merchant?.name || 'FeraSetu Store',
        businessName: merchant?.business_name || shop?.name,
        address: [merchant?.city, merchant?.state].filter(Boolean).join(', ') || undefined,
        city: merchant?.city,
        state: merchant?.state,
        phone: merchant?.phone,
        email: merchant?.email,
        gstin: merchant?.gstin || undefined,
      },
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email,
        deliveryAddress: order.delivery_address,
        deliveryType: order.delivery_type,
      },
      items: (items || []).map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        unitPriceMinor: it.unitPriceMinor || toMinorUnits(it.price, currency),
        totalMinor: it.totalMinor || toMinorUnits(it.total, currency),
      })),
      subtotalMinor: invoice.subtotal_minor || toMinorUnits(invoice.subtotal, currency),
      deliveryFeeMinor: invoice.shipping_minor || toMinorUnits(order.delivery_fee, currency),
      taxMinor: invoice.tax_minor || 0,
      totalMinor: invoice.total_minor || toMinorUnits(invoice.total, currency),
      amountPaidMinor: invoice.amount_paid_minor || (order.payment_status === 'paid' ? invoice.total_minor : 0),
      balanceDueMinor: invoice.balance_due_minor || (order.payment_status === 'paid' ? 0 : invoice.total_minor),
      paymentMethod: order.payment_method || invoice.payment_method,
      paymentStatus: order.payment_status,
      orderStatus: order.status,
      notes: order.notes,
    };

    const pdfBuffer = generateInvoicePdf(pdfData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('PDF invoice generation failed:', err);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
});

// ---------------------------------------------------------------------------
// 4. PUBLIC SECURE: Request Order Cancellation (requires cryptographic token)
// ---------------------------------------------------------------------------
router.post('/public/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  const orderId = req.params.id;
  const { token, reason } = req.body;

  const db = getDatabase();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (!verifyOrderTrackingToken(orderId, order.customer_phone, token)) {
    res.status(403).json({ error: 'Unauthorized: Invalid tracking token' });
    return;
  }

  // Validate state machine eligibility
  if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
    res.status(400).json({
      error: `Orders with status '${order.status}' cannot be cancelled. If delivered, please request a return.`
    });
    return;
  }

  const cancelReason = (typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Customer requested cancellation';

  db.prepare(`
    UPDATE orders SET
      status = 'cancelled',
      cancellation_status = 'cancelled',
      cancellation_reason = ?,
      cancelled_at = datetime('now'),
      cancelled_by = 'customer',
      updated_at = datetime('now')
    WHERE id = ?
  `).run(cancelReason, orderId);

  recordFinancialAudit({
    userId: order.user_id,
    orderId,
    eventType: 'order_cancelled',
    actorType: 'customer',
    metadata: { reason: cancelReason, customerPhone: order.customer_phone },
  });

  // Check if refund is applicable
  const fin = getOrderFinancialSummary(orderId, order.user_id);
  const isRefundable = fin.remainingRefundableMinor > 0;

  res.json({
    success: true,
    message: 'Order has been cancelled successfully.',
    order: {
      id: orderId,
      status: 'cancelled',
      cancellation_status: 'cancelled',
      is_unpaid_cod: fin.isUnpaidCod,
      remaining_refundable_minor: fin.remainingRefundableMinor,
      is_refundable: isRefundable,
    },
  });
});

// ===========================================================================
// AUTHENTICATED MERCHANT ROUTES (Strict tenant isolation via req.user.id)
// ===========================================================================
router.use(authenticate);

// ---------------------------------------------------------------------------
// 5. Merchant Create Order
// ---------------------------------------------------------------------------
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const userId = req.user!.id;
  const {
    customer_name, customerName,
    customer_phone, customerPhone,
    delivery_address, deliveryAddress,
    delivery_type, deliveryType = 'delivery',
    items = [],
    status = 'pending',
    notes,
    payment_status = 'unpaid',
    payment_method = 'offline',
    currency = 'INR'
  } = req.body;

  const finalCustomerName = customer_name || customerName || 'Guest';
  const finalCustomerPhone = customer_phone || customerPhone || null;
  const finalDeliveryAddress = delivery_address || deliveryAddress || null;
  const finalDeliveryType = delivery_type || deliveryType || 'delivery';

  let calculatedSubtotalMinor = 0;
  const resolvedItems = [];

  for (const it of (Array.isArray(items) ? items : [])) {
    const productId = it.product_id || it.productId || it.id;
    const quantity = Math.max(1, parseInt(it.quantity || it.qty || 1));
    let price = Number(it.price) || 0;

    if (productId) {
      const prod = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(productId, userId) as any;
      if (prod) {
        price = prod.sale_price || prod.price || price;
      }
    }

    const unitPriceMinor = toMinorUnits(price, currency);
    const lineTotalMinor = unitPriceMinor * quantity;
    calculatedSubtotalMinor = addMinor(calculatedSubtotalMinor, lineTotalMinor);

    resolvedItems.push({
      product_id: productId,
      productId: productId,
      name: it.name || 'Product',
      price,
      unitPriceMinor,
      quantity,
      total: fromMinorUnits(lineTotalMinor, currency),
      totalMinor: lineTotalMinor,
    });
  }

  const deliveryFeeMinor = finalDeliveryType === 'delivery' ? toMinorUnits(30, currency) : 0;
  const totalMinor = addMinor(calculatedSubtotalMinor, deliveryFeeMinor);
  const totalDecimal = fromMinorUnits(totalMinor, currency);
  const subtotalDecimal = fromMinorUnits(calculatedSubtotalMinor, currency);
  const deliveryFeeDecimal = fromMinorUnits(deliveryFeeMinor, currency);

  const isPaid = payment_status === 'paid';
  const amountPaidMinor = isPaid ? totalMinor : 0;
  const orderId = uuidv4();
  const deliveryCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const trackingToken = generateOrderTrackingToken(orderId, finalCustomerPhone || '');

  db.prepare(`
    INSERT INTO orders (
      id, user_id, customer_name, customer_phone, delivery_address, delivery_type,
      items, subtotal, delivery_fee, total, currency, subtotal_minor, delivery_fee_minor,
      total_minor, amount_paid_minor, refundable_amount_minor, refunded_amount_minor,
      status, notes, payment_status, payment_method, cancellation_status, return_status,
      delivery_code, tracking_token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'none', 'none', ?, ?)
  `).run(
    orderId, userId, finalCustomerName, finalCustomerPhone, finalDeliveryAddress, finalDeliveryType,
    JSON.stringify(resolvedItems), subtotalDecimal, deliveryFeeDecimal, totalDecimal, currency,
    calculatedSubtotalMinor, deliveryFeeMinor, totalMinor, amountPaidMinor, amountPaidMinor,
    status, notes || null, payment_status, payment_method, deliveryCode, trackingToken
  );

  // Generate immutable invoice
  const invoiceId = `inv_${uuidv4()}`;
  const invoiceNumber = `FS-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    INSERT INTO invoices (
      id, order_id, user_id, invoice_number, items, subtotal, tax, total,
      currency, subtotal_minor, shipping_minor, tax_minor, total_minor,
      amount_paid_minor, balance_due_minor, payment_method, status, issued_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'issued', datetime('now'))
  `).run(
    invoiceId, orderId, userId, invoiceNumber, JSON.stringify(resolvedItems),
    subtotalDecimal, totalDecimal, currency, calculatedSubtotalMinor, deliveryFeeMinor,
    totalMinor, amountPaidMinor, isPaid ? 0 : totalMinor, payment_method
  );

  recordFinancialAudit({
    userId,
    orderId,
    invoiceId,
    eventType: 'invoice_issued',
    actorType: 'merchant',
    actorId: userId,
    currency,
    amountMinor: totalMinor,
    metadata: { invoiceNumber },
  });

  res.status(201).json({
    id: orderId,
    user_id: userId,
    customer_name: finalCustomerName,
    items: resolvedItems,
    total: totalDecimal,
    total_minor: totalMinor,
    currency,
    status,
    payment_status,
    delivery_code: deliveryCode,
    tracking_token: trackingToken,
    invoice_number: invoiceNumber,
  });
});

// ---------------------------------------------------------------------------
// 6. Get All Orders for Merchant
// ---------------------------------------------------------------------------
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const { status, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 50, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT o.*, i.invoice_number
    FROM orders o
    LEFT JOIN invoices i ON i.order_id = o.id
    WHERE o.user_id = ?
  `;
  const params: unknown[] = [req.user!.id];

  if (status && status !== 'all') {
    query += ' AND o.status = ?';
    params.push(status);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const orders = db.prepare(query).all(...params) as any[];
  const total = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(req.user!.id) as any).count;

  res.json({
    orders: orders.map(o => ({
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// ---------------------------------------------------------------------------
// 7. Update Order Status
// ---------------------------------------------------------------------------
router.patch('/:id/status',
  body('status').isIn(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { status } = req.body;
    const db = getDatabase();

    db.prepare(`
      UPDATE orders SET status = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(status, req.params.id, req.user!.id);

    res.json({ success: true, status });
  }
);

// ---------------------------------------------------------------------------
// 8. Verify OTP / Order Delivery Handshake (MANDATORY CORRECTION #1: MUST NOT set payment_status = paid)
// ---------------------------------------------------------------------------
router.post('/:id/verify-otp', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { otp, code } = req.body;
  const db = getDatabase();
  const userId = req.user!.id;

  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const inputVal = String(otp || code || '').trim().toUpperCase();
    const actualDeliveryCode = (order.delivery_code || '').trim().toUpperCase();
    const actualOtp = (order.notes || '').match(/OTP:\s*([0-9]+)/i)?.[1];
    const actualCode = (order.notes || '').match(/Code:\s*([A-Z0-9]+)/i)?.[1];

    const isValid = Boolean(
      inputVal && (
        inputVal === actualDeliveryCode ||
        inputVal === actualOtp ||
        inputVal === actualCode
      )
    );

    if (!isValid) {
      res.status(400).json({ error: 'Invalid delivery code / OTP' });
      return;
    }

    // Mark order delivered and record verification actor + timestamp
    // CRITICAL: MUST NOT modify payment_status or invoice status!
    db.prepare(`
      UPDATE orders SET
        status = 'delivered',
        verified_at = datetime('now'),
        verified_by_user_id = ?,
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(userId, order.id, userId);

    recordFinancialAudit({
      userId,
      orderId: order.id,
      eventType: 'delivery_otp_verified',
      actorType: 'merchant',
      actorId: userId,
      metadata: { verifiedAt: new Date().toISOString() },
    });

    res.json({
      success: true,
      message: 'Delivery verified successfully. Order marked as delivered.',
      order: {
        id: order.id,
        status: 'delivered',
        verified_at: new Date().toISOString(),
        payment_status: order.payment_status, // Remains untouched
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 9. Merchant Manual Payment Update (Explicit COD payment recording)
// ---------------------------------------------------------------------------
router.patch('/:id/payment', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { payment_status } = req.body;
  const db = getDatabase();
  const userId = req.user!.id;

  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const isPaid = payment_status === 'paid';
    const amountPaidMinor = isPaid ? (order.total_minor || toMinorUnits(order.total, order.currency)) : 0;
    const refundableMinor = isPaid ? Math.max(0, subMinor(amountPaidMinor, order.refunded_amount_minor || 0)) : 0;

    db.prepare(`
      UPDATE orders SET
        payment_status = ?,
        amount_paid_minor = ?,
        refundable_amount_minor = ?,
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(payment_status, amountPaidMinor, refundableMinor, order.id, userId);

    res.json({ success: true, payment_status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 10. Get After-Sales Financial Summary & History
// ---------------------------------------------------------------------------
router.get('/:id/after-sales', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const summary = getOrderFinancialSummary(req.params.id, req.user!.id);
    const refunds = getRefundsForOrder(req.params.id, req.user!.id);
    const creditNotes = getCreditNotesForOrder(req.params.id, req.user!.id);

    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
    const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(req.params.id);

    res.json({
      financials: summary,
      summary,
      refunds,
      creditNotes,
      order: {
        ...order,
        items: typeof order?.items === 'string' ? JSON.parse(order.items) : order?.items,
      },
      invoice,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 11. Merchant Cancel Order
// ---------------------------------------------------------------------------
router.post('/:id/cancel', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reason } = req.body;
  const db = getDatabase();
  const userId = req.user!.id;

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const cancelReason = (typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Merchant cancelled order';

  db.prepare(`
    UPDATE orders SET
      status = 'cancelled',
      cancellation_status = 'cancelled',
      cancellation_reason = ?,
      cancelled_at = datetime('now'),
      cancelled_by = 'merchant',
      updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(cancelReason, order.id, userId);

  recordFinancialAudit({
    userId,
    orderId: order.id,
    eventType: 'order_cancelled',
    actorType: 'merchant',
    actorId: userId,
    metadata: { reason: cancelReason },
  });

  const fin = getOrderFinancialSummary(order.id, userId);

  // Notify customer
  if (order.customer_email) {
    sendOrderCancellationEmail(order.customer_email, {
      orderId: order.id,
      storeName: 'Store',
      reason: cancelReason,
      isRefundable: fin.remainingRefundableMinor > 0,
    });
  }

  res.json({
    success: true,
    message: 'Order cancelled.',
    financials: fin,
  });
});

// ---------------------------------------------------------------------------
// 12. Merchant Process Refund (Online Gateway or Manual COD)
// ---------------------------------------------------------------------------
router.post('/:id/refund', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    amountMinor, amount_minor,
    reason,
    refundMethod = 'original_payment_method', refund_method,
    method,
    isManual = false, is_manual,
    manualReference, manual_reference, manual_method,
    idempotencyKey
  } = req.body;

  const finalAmountMinor = Number(amount_minor ?? amountMinor);
  const finalMethod = (method === 'manual_cod' || isManual || is_manual) ? 'manual_offline' : (refund_method || refundMethod);
  const finalIsManual = Boolean(method === 'manual_cod' || isManual || is_manual);
  const finalReference = manual_reference || manualReference || (manual_method ? `${manual_method}: Direct` : undefined);

  try {
    const refund = await processRefund({
      orderId: req.params.id,
      userId: req.user!.id,
      amountMinor: finalAmountMinor,
      reason: String(reason || 'Merchant requested refund'),
      refundMethod: finalMethod,
      isManual: finalIsManual,
      manualReference: finalReference,
      idempotencyKey,
      actorType: 'merchant',
      actorId: req.user!.id,
    });

    const fin = getOrderFinancialSummary(req.params.id, req.user!.id);

    // Notify customer
    if (refund.customer_email) {
      sendRefundEmail(refund.customer_email, {
        refundNumber: refund.refund_number,
        orderId: refund.order_id,
        amountFormatted: formatMinor(refund.amount_minor, refund.currency),
        method: refund.refund_method,
        isCompleted: refund.status === 'completed',
      });
    }

    res.status(201).json({
      success: true,
      message: refund.status === 'completed' ? 'Refund recorded successfully.' : 'Refund initiated and is processing.',
      refund,
      financials: fin,
      balances: {
        total_minor: fin.totalMinor,
        amount_paid_minor: fin.amountPaidMinor,
        refunded_amount_minor: fin.refundedAmountMinor,
        remaining_refundable_minor: fin.remainingRefundableMinor,
        is_unpaid_cod: fin.isUnpaidCod,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 13. Merchant Issue Credit Note
// ---------------------------------------------------------------------------
router.post('/:id/credit-notes', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { items, taxAdjustmentMinor = 0, tax_adjustment_minor, reason } = req.body;

  try {
    const creditNote = createCreditNote({
      orderId: req.params.id,
      userId: req.user!.id,
      items: Array.isArray(items) ? items : [],
      taxAdjustmentMinor: Number(tax_adjustment_minor ?? taxAdjustmentMinor),
      reason: String(reason || 'Return / Adjustment'),
      actorType: 'merchant',
      actorId: req.user!.id,
    });

    res.status(201).json({
      success: true,
      creditNote,
      credit_note: creditNote,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 14. Download Credit Note PDF
// ---------------------------------------------------------------------------
router.get('/:id/credit-notes/:creditNoteId/pdf', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pdfBuffer = getCreditNotePdfBuffer(req.params.creditNoteId, req.user!.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="credit-note-${req.params.creditNoteId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 15. Download Invoice PDF (Merchant)
// ---------------------------------------------------------------------------
router.get('/:id/invoice/pdf', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const userId = req.user!.id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  try {
    const merchant = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    const shop = db.prepare('SELECT * FROM shops WHERE organization_id = ? OR id = ?').get(userId, userId) as any;
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const currency = order.currency || invoice.currency || 'INR';

    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoice_number,
      orderId: order.id,
      issuedAt: invoice.issued_at || invoice.created_at,
      currency,
      merchant: {
        name: shop?.name || merchant?.business_name || merchant?.name || 'FeraSetu Store',
        businessName: merchant?.business_name || shop?.name,
        address: [merchant?.city, merchant?.state].filter(Boolean).join(', ') || undefined,
        city: merchant?.city,
        state: merchant?.state,
        phone: merchant?.phone,
        email: merchant?.email,
        gstin: merchant?.gstin || undefined,
      },
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email,
        deliveryAddress: order.delivery_address,
        deliveryType: order.delivery_type,
      },
      items: (items || []).map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        unitPriceMinor: it.unitPriceMinor || toMinorUnits(it.price, currency),
        totalMinor: it.totalMinor || toMinorUnits(it.total, currency),
      })),
      subtotalMinor: invoice.subtotal_minor || toMinorUnits(invoice.subtotal, currency),
      deliveryFeeMinor: invoice.shipping_minor || toMinorUnits(order.delivery_fee, currency),
      taxMinor: invoice.tax_minor || 0,
      totalMinor: invoice.total_minor || toMinorUnits(invoice.total, currency),
      amountPaidMinor: invoice.amount_paid_minor || (order.payment_status === 'paid' ? invoice.total_minor : 0),
      balanceDueMinor: invoice.balance_due_minor || (order.payment_status === 'paid' ? 0 : invoice.total_minor),
      paymentMethod: order.payment_method || invoice.payment_method,
      paymentStatus: order.payment_status,
      orderStatus: order.status,
      notes: order.notes,
    };

    const pdfBuffer = generateInvoicePdf(pdfData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ---------------------------------------------------------------------------
// 16. Send Invoice to Customer via Email
// ---------------------------------------------------------------------------
router.post('/:id/invoice/send', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const userId = req.user!.id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const targetEmail = req.body.email || order.customer_email;
  if (!targetEmail) {
    res.status(400).json({ error: 'Customer email address is required' });
    return;
  }

  const merchant = db.prepare('SELECT business_name, name FROM users WHERE id = ?').get(userId) as any;
  const currency = order.currency || invoice.currency || 'INR';

  await sendInvoiceEmail(targetEmail, {
    invoiceNumber: invoice.invoice_number,
    storeName: merchant?.business_name || merchant?.name || 'Store',
    totalFormatted: formatMinor(invoice.total_minor || toMinorUnits(invoice.total, currency), currency),
    orderId: order.id,
  });

  res.json({ success: true, message: `Invoice sent to ${targetEmail}` });
});

// ---------------------------------------------------------------------------
// 17. Get Order Detail
// ---------------------------------------------------------------------------
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(order.id);
  const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

  res.json({
    id: order.id,
    ...order,
    items: parsedItems,
    order: {
      ...order,
      items: parsedItems,
    },
    invoice: invoice ? {
      ...invoice,
      items: typeof (invoice as any).items === 'string' ? JSON.parse((invoice as any).items as string) : (invoice as any).items,
    } : null,
  });
});

export default router;

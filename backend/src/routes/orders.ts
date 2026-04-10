import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';

const router = Router();
router.use(authenticate);

// Get all orders
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const { status, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 100);
  const offset = (pageNum - 1) * limitNum;

  let query = 'SELECT * FROM orders WHERE user_id = ?';
  const params: unknown[] = [req.user!.id];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  const total = (db.prepare(query.replace('SELECT *', 'SELECT COUNT(*)')).get(...params) as { 'COUNT(*)': number })['COUNT(*)'];
  const orders = db.prepare(`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limitNum, offset);

  res.json({ orders, total, page: pageNum, limit: limitNum });
});

// Get single order
router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(order);
});

// Create order (public-facing - no auth required for customers)
router.post('/create',
  body('customerName').trim().notEmpty(),
  body('customerPhone').notEmpty(),
  body('items').isArray({ min: 1 }),
  body('deliveryType').isIn(['pickup', 'walking', 'bicycle', 'delivery']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const db = getDatabase();
    const {
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      deliveryType,
      items,
      notes
    } = req.body;

    // Calculate totals
    let subtotal = 0;
    const resolvedItems: Array<Record<string, unknown>> = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ? AND is_active = 1').get(item.productId, req.user!.id) as Record<string, unknown> | undefined;
      if (!product) continue;

      const quantity = parseInt(item.quantity) || 1;
      const price = (product.sale_price || product.price) as number;
      const itemTotal = price * quantity;
      subtotal += itemTotal;

      resolvedItems.push({
        productId: product.id,
        name: product.name,
        price,
        quantity,
        total: itemTotal
      });

      // Update stock
      if ((product.stock_quantity as number) > 0) {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(quantity, product.id);
      }
    }

    const deliveryFee = deliveryType === 'delivery' ? 30 : 0;
    const total = subtotal + deliveryFee;

    const orderId = uuidv4();
    db.prepare(`
      INSERT INTO orders (id, user_id, customer_name, customer_email, customer_phone, delivery_address, delivery_type, items, subtotal, delivery_fee, total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId, req.user!.id, customerName, customerEmail || null,
      customerPhone, deliveryAddress || null, deliveryType,
      JSON.stringify(resolvedItems), subtotal, deliveryFee, total, notes || null
    );

    // Generate invoice
    const invoiceId = uuidv4();
    const invoiceNumber = `INV-${Date.now()}`;
    db.prepare(`
      INSERT INTO invoices (id, order_id, user_id, invoice_number, items, subtotal, tax, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoiceId, orderId, req.user!.id, invoiceNumber, JSON.stringify(resolvedItems), subtotal, 0, total);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    res.status(201).json({ order, invoiceNumber });
  }
);

// Update order status
router.patch('/:id/status',
  body('status').isIn(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']),
  (req: AuthenticatedRequest, res: Response): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const db = getDatabase();
    const result = db.prepare(
      "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
    ).run(req.body.status, req.params.id, req.user!.id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({ success: true, status: req.body.status });
  }
);

// Get invoice for order
router.get('/:id/invoice', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  res.json(invoice);
});

export default router;

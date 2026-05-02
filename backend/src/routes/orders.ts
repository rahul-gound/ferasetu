import { Router, Response, Request } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';

const router = Router();

// Public: Create order (called by shop visitors)
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
    
    // Calculate total and generate codes
    let subtotal = 0;
    const resolvedItems = [];
    const deliveryCode = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    const paymentOtp = Math.floor(100000 + Math.random() * 900000).toString();

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ? AND is_active = 1').get(item.productId, shopId) as any;
      if (!product) continue;

      const quantity = parseInt(item.quantity) || 1;
      const price = product.sale_price || product.price;
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
      if (product.stock_quantity > 0) {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(quantity, product.id);
      }
    }

    const deliveryFee = deliveryType === 'delivery' ? 30 : 0;
    const total = subtotal + deliveryFee;
    const orderId = uuidv4();

    db.prepare(`
      INSERT INTO orders (id, user_id, customer_name, customer_email, customer_phone, delivery_address, delivery_type, items, subtotal, delivery_fee, total, notes, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId, shopId, customerName, customerEmail || null,
      customerPhone, deliveryAddress || null, deliveryType,
      JSON.stringify(resolvedItems), subtotal, deliveryFee, total, 
      `Code: ${deliveryCode} | OTP: ${paymentOtp}`,
      paymentMethod === 'online' ? 'paid' : 'unpaid'
    );

    // Generate invoice
    const invoiceId = uuidv4();
    const invoiceNumber = `INV-${Date.now()}`;
    db.prepare(`
      INSERT INTO invoices (id, order_id, user_id, invoice_number, items, subtotal, tax, total, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId, orderId, shopId, invoiceNumber, JSON.stringify(resolvedItems), subtotal, 0, total,
      paymentMethod === 'online' ? 'paid' : 'unpaid'
    );

    res.status(201).json({ 
      success: true,
      order: { id: orderId, total, deliveryCode, paymentOtp }, 
      invoiceNumber 
    });
  }
);

// Public: Track orders by phone
router.get('/public/track', async (req: Request, res: Response): Promise<void> => {
  const { phone, shopId } = req.query;
  if (!phone || !shopId) {
    res.status(400).json({ error: 'Phone and shopId are required' });
    return;
  }

  try {
    const db = getDatabase();
    const orders = db.prepare(`
      SELECT id, customer_name, total, status, delivery_type, notes, created_at
      FROM orders 
      WHERE customer_phone = ? AND user_id = ?
      ORDER BY created_at DESC
    `).all(phone, shopId);

    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const orders = db.prepare(query).all(...params);
  const total = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(req.user!.id) as any).count;

  res.json({
    orders: orders.map((o: any) => ({
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

// Update order status
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

    db.prepare('UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
      .run(status, req.params.id, req.user!.id);

    res.json({ success: true });
  }
);

// Verify OTP and mark as paid
router.post('/:id/verify-otp', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { otp } = req.body;
  const db = getDatabase();

  try {
    const order = db.prepare('SELECT notes FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const actualOtp = order.notes.match(/OTP: ([0-9]+)/)?.[1];
    if (otp === actualOtp) {
      db.prepare("UPDATE orders SET payment_status = 'paid', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
      db.prepare("UPDATE invoices SET status = 'paid' WHERE order_id = ?").run(req.params.id);
      res.json({ success: true, message: 'OTP verified and payment confirmed' });
    } else {
      res.status(400).json({ error: 'Invalid OTP' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update payment status manually
router.patch('/:id/payment', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { payment_status } = req.body;
  const db = getDatabase();

  try {
    db.prepare('UPDATE orders SET payment_status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
      .run(payment_status, req.params.id, req.user!.id);
    db.prepare('UPDATE invoices SET status = ? WHERE order_id = ?').run(payment_status, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get order detail
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(order.id);

  res.json({
    order: {
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
    },
    invoice: invoice ? {
      ...invoice,
      items: typeof (invoice as any).items === 'string' ? JSON.parse((invoice as any).items as string) : (invoice as any).items,
    } : null,
  });
});

export default router;

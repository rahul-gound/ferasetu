import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';

const router = Router();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password: string, saltHex: string): string {
  return crypto.pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), 100000, 32, 'sha256').toString('hex');
}

function resolveStorefrontOrgId(req: Request): string | null {
  const headerOrgId = req.headers['x-organization-id'] as string;
  if (headerOrgId) return headerOrgId;

  const db = getDatabase();
  const headerSlug = req.headers['x-shop-slug'] as string;
  if (headerSlug) {
    const org = db.prepare('SELECT id FROM organizations WHERE LOWER(store_slug) = ? OR LOWER(id) = ?').get(headerSlug.toLowerCase(), headerSlug.toLowerCase()) as any;
    if (org?.id) return org.id;
    const user = db.prepare('SELECT id FROM users WHERE LOWER(subdomain) = ?').get(headerSlug.toLowerCase()) as any;
    if (user?.id) return user.id;
  }

  const queryShop = (req.query.shop || req.query.store || req.query.org || req.query.shopId || req.headers['x-shop-id'] || req.body?.shopId) as string;
  if (queryShop) {
    const org = db.prepare('SELECT id FROM organizations WHERE LOWER(store_slug) = ? OR LOWER(id) = ?').get(queryShop.toLowerCase(), queryShop.toLowerCase()) as any;
    if (org?.id) return org.id;
    const user = db.prepare('SELECT id FROM users WHERE LOWER(subdomain) = ? OR LOWER(id) = ?').get(queryShop.toLowerCase(), queryShop.toLowerCase()) as any;
    if (user?.id) return user.id;
  }

  const host = (req.get('host') || '').toLowerCase();
  const baseDomains = ['ferasetu.com', 'fera-search.tech'];
  const matchingBase = baseDomains.find(domain => host.endsWith('.' + domain));
  if (matchingBase) {
    const subdomain = host.replace('.' + matchingBase, '').toLowerCase();
    const org = db.prepare('SELECT id FROM organizations WHERE LOWER(store_slug) = ?').get(subdomain) as any;
    if (org?.id) return org.id;
    const user = db.prepare('SELECT id FROM users WHERE LOWER(subdomain) = ?').get(subdomain) as any;
    if (user?.id) return user.id;
  }

  return null;
}

function getAuthenticatedCustomer(req: Request, orgId: string): any {
  const rawToken = req.cookies?.fs_customer_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();
  const db = getDatabase();

  const session = db.prepare(`
    SELECT cs.id, cs.customer_id, cs.organization_id, c.email, c.name, c.phone, c.address, c.created_at
    FROM customer_sessions cs
    JOIN customers c ON c.id = cs.customer_id
    WHERE cs.token_hash = ? AND cs.organization_id = ? AND cs.expires_at > ?
    LIMIT 1
  `).get(tokenHash, orgId, now);

  return session || null;
}

function createSession(res: Response, customerId: string, orgId: string, isSecure: boolean): string {
  const db = getDatabase();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const sessionId = `cs_${uuidv4()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO customer_sessions (id, customer_id, organization_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, customerId, orgId, tokenHash, expiresAt, now.toISOString());

  res.cookie('fs_customer_session', rawToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: isSecure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return rawToken;
}

// POST /api/storefront/customer/register
router.post('/register', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: 'Storefront context required' });
    return;
  }

  const { email, password, name = '', phone = '' } = req.body;
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPass = typeof password === 'string' ? password : '';

  if (!cleanEmail || !cleanEmail.includes('@')) {
    res.status(422).json({ error: 'Valid email is required' });
    return;
  }
  if (!cleanPass || cleanPass.length < 8) {
    res.status(422).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id, password_hash FROM customers WHERE organization_id = ? AND LOWER(email) = ?').get(orgId, cleanEmail) as any;

  if (existing && existing.password_hash) {
    res.status(409).json({ error: 'An account with this email already exists for this store. Please log in.' });
    return;
  }

  const saltHex = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(cleanPass, saltHex);
  const now = new Date().toISOString();

  let customerId: string;
  if (existing) {
    customerId = existing.id;
    db.prepare(`
      UPDATE customers SET password_hash = ?, password_salt = ?, name = COALESCE(NULLIF(?, ''), name), phone = COALESCE(NULLIF(?, ''), phone), updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).run(passwordHash, saltHex, name, phone, now, customerId, orgId);
  } else {
    customerId = `cust_${uuidv4()}`;
    db.prepare(`
      INSERT INTO customers (id, organization_id, email, password_hash, password_salt, name, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customerId, orgId, cleanEmail, passwordHash, saltHex, name, phone, now, now);
  }

  const rawToken = createSession(res, customerId, orgId, req.secure);
  res.status(201).json({
    success: true,
    token: rawToken,
    customer: { id: customerId, email: cleanEmail, name, phone, organization_id: orgId },
  });
});

// POST /api/storefront/customer/login
router.post('/login', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: 'Storefront context required' });
    return;
  }

  const { email, password } = req.body;
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPass = typeof password === 'string' ? password : '';

  if (!cleanEmail || !cleanPass) {
    res.status(422).json({ error: 'Email and password are required' });
    return;
  }

  const db = getDatabase();
  const cust = db.prepare(`
    SELECT id, email, password_hash, password_salt, name, phone
    FROM customers
    WHERE organization_id = ? AND LOWER(email) = ?
  `).get(orgId, cleanEmail) as any;

  if (!cust || !cust.password_hash || !cust.password_salt) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const testHash = hashPassword(cleanPass, cust.password_salt);
  if (testHash !== cust.password_hash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const rawToken = createSession(res, cust.id, orgId, req.secure);
  res.json({
    success: true,
    token: rawToken,
    customer: { id: cust.id, email: cust.email, name: cust.name, phone: cust.phone, organization_id: orgId },
  });
});

// POST /api/storefront/customer/logout
router.post('/logout', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  const rawToken = req.cookies?.fs_customer_session;
  if (rawToken && orgId) {
    const db = getDatabase();
    const tokenHash = hashToken(rawToken);
    db.prepare('DELETE FROM customer_sessions WHERE token_hash = ? AND organization_id = ?').run(tokenHash, orgId);
  }
  res.clearCookie('fs_customer_session', { path: '/' });
  res.json({ success: true });
});

// GET /api/storefront/customer/me
router.get('/me', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: 'Storefront context required' });
    return;
  }

  const session = getAuthenticatedCustomer(req, orgId);
  if (!session) {
    res.status(401).json({ authenticated: false, customer: null });
    return;
  }

  res.json({
    authenticated: true,
    customer: {
      id: session.customer_id,
      email: session.email,
      name: session.name,
      phone: session.phone,
      address: session.address,
      created_at: session.created_at,
      organization_id: session.organization_id,
    },
  });
});

// POST /api/storefront/customer/forgot-password
router.post('/forgot-password', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: 'Storefront context required' });
    return;
  }

  const { email } = req.body;
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!cleanEmail) {
    res.status(422).json({ error: 'Email is required' });
    return;
  }

  const db = getDatabase();
  const cust = db.prepare('SELECT id FROM customers WHERE organization_id = ? AND LOWER(email) = ?').get(orgId, cleanEmail) as any;
  let resetToken: string | null = null;

  if (cust) {
    resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO customer_password_resets (id, customer_id, organization_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`cpr_${uuidv4()}`, cust.id, orgId, tokenHash, expiresAt);
  }

  const isDevOrTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  res.json({
    success: true,
    message: 'If an account matches this email, password reset instructions have been sent.',
    ...(resetToken && isDevOrTest ? { resetToken } : {}),
  });
});

// POST /api/storefront/customer/reset-password
router.post('/reset-password', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: 'Storefront context required' });
    return;
  }

  const { token, newPassword, password, new_password } = req.body;
  const cleanToken = typeof token === 'string' ? token.trim() : '';
  const cleanPass = typeof newPassword === 'string'
    ? newPassword
    : (typeof new_password === 'string'
      ? new_password
      : (typeof password === 'string' ? password : ''));

  if (!cleanToken) {
    res.status(422).json({ error: 'Reset token is required' });
    return;
  }
  if (!cleanPass || cleanPass.length < 8) {
    res.status(422).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const db = getDatabase();
  const tokenHash = hashToken(cleanToken);
  const now = new Date().toISOString();

  const resetRow = db.prepare(`
    SELECT id, customer_id, expires_at, used_at
    FROM customer_password_resets
    WHERE token_hash = ? AND organization_id = ? AND used_at IS NULL AND expires_at > ?
  `).get(tokenHash, orgId, now) as any;

  if (!resetRow) {
    res.status(400).json({ error: 'Invalid or expired password reset token' });
    return;
  }

  db.prepare('UPDATE customer_password_resets SET used_at = ? WHERE id = ?').run(now, resetRow.id);

  const saltHex = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(cleanPass, saltHex);

  db.prepare(`
    UPDATE customers SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ? AND organization_id = ?
  `).run(passwordHash, saltHex, now, resetRow.customer_id, orgId);

  db.prepare('DELETE FROM customer_sessions WHERE customer_id = ? AND organization_id = ?').run(resetRow.customer_id, orgId);

  res.json({ success: true, message: 'Password updated successfully. Please log in with your new password.' });
});

// GET /api/storefront/customer/orders (Strict IDOR protection)
router.get('/orders', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: 'Storefront context required' });
    return;
  }

  const session = getAuthenticatedCustomer(req, orgId);
  if (!session) {
    res.status(401).json({ error: 'Authentication required to view orders' });
    return;
  }

  const db = getDatabase();
  const orders = db.prepare(`
    SELECT o.id, o.total, o.currency, o.subtotal, o.delivery_fee, o.total_minor, o.subtotal_minor,
           o.status, o.payment_status, o.payment_method, o.items, o.delivery_address, o.delivery_type,
           o.cancellation_status, o.cancellation_reason, o.cancelled_at, o.return_status,
           o.refunded_amount_minor, o.tracking_token, o.created_at, i.invoice_number
    FROM orders o
    LEFT JOIN invoices i ON i.order_id = o.id
    WHERE o.customer_id = ? AND (o.organization_id = ? OR o.user_id = ?)
    ORDER BY o.created_at DESC
  `).all(session.customer_id, orgId, orgId) as any[];

  const parsedOrders = (orders || []).map(o => {
    let items = [];
    try {
      items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
    } catch {}
    return { ...o, items };
  });

  res.json({ orders: parsedOrders });
});

// GET /api/storefront/customer/orders/:orderId (Strict IDOR protection)
router.get('/orders/:orderId', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: 'Storefront context required' });
    return;
  }

  const session = getAuthenticatedCustomer(req, orgId);
  if (!session) {
    res.status(401).json({ error: 'Authentication required to view order' });
    return;
  }

  const db = getDatabase();
  const order = db.prepare(`
    SELECT o.id, o.total, o.currency, o.subtotal, o.delivery_fee, o.total_minor, o.subtotal_minor,
           o.status, o.payment_status, o.payment_method, o.items, o.delivery_address, o.delivery_type,
           o.cancellation_status, o.cancellation_reason, o.cancelled_at, o.return_status,
           o.refunded_amount_minor, o.tracking_token, o.created_at, i.invoice_number
    FROM orders o
    LEFT JOIN invoices i ON i.order_id = o.id
    WHERE o.id = ? AND o.customer_id = ? AND (o.organization_id = ? OR o.user_id = ?)
  `).get(req.params.orderId, session.customer_id, orgId, orgId) as any;

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  let items = [];
  try {
    items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
  } catch {}

  // Fetch credit notes and refunds for this customer order
  const refunds = db.prepare(`
    SELECT id, refund_number, amount_minor, currency, reason, refund_method, is_manual, status, created_at, completed_at
    FROM refunds WHERE order_id = ? ORDER BY created_at DESC
  `).all(order.id);

  const creditNotes = db.prepare(`
    SELECT id, credit_note_number, total_credit_minor, currency, reason, status, issued_at
    FROM credit_notes WHERE order_id = ? ORDER BY created_at DESC
  `).all(order.id);

  res.json({
    order: {
      ...order,
      items,
      refunds,
      creditNotes,
    }
  });
});

// POST /api/storefront/customer/orders/:orderId/cancel
router.post('/orders/:orderId/cancel', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: 'Storefront context required' });
    return;
  }

  const session = getAuthenticatedCustomer(req, orgId);
  if (!session) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const db = getDatabase();
  const order = db.prepare(`
    SELECT * FROM orders
    WHERE id = ? AND customer_id = ? AND (organization_id = ? OR user_id = ?)
  `).get(req.params.orderId, session.customer_id, orgId, orgId) as any;

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
    res.status(400).json({
      error: `Orders with status '${order.status}' cannot be cancelled. If delivered, please request a return.`
    });
    return;
  }

  const reason = (typeof req.body.reason === 'string' && req.body.reason.trim())
    ? req.body.reason.trim()
    : 'Customer requested cancellation';

  db.prepare(`
    UPDATE orders SET
      status = 'cancelled',
      cancellation_status = 'cancelled',
      cancellation_reason = ?,
      cancelled_at = datetime('now'),
      cancelled_by = 'customer',
      updated_at = datetime('now')
    WHERE id = ?
  `).run(reason, order.id);

  res.json({
    success: true,
    message: 'Order has been cancelled.',
    order: {
      id: order.id,
      status: 'cancelled',
      cancellation_status: 'cancelled',
    }
  });
});

// POST /api/storefront/customer/orders/:orderId/return
router.post('/orders/:orderId/return', (req: Request, res: Response): void => {
  const orgId = resolveStorefrontOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: 'Storefront context required' });
    return;
  }

  const session = getAuthenticatedCustomer(req, orgId);
  if (!session) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const db = getDatabase();
  const order = db.prepare(`
    SELECT * FROM orders
    WHERE id = ? AND customer_id = ? AND (organization_id = ? OR user_id = ?)
  `).get(req.params.orderId, session.customer_id, orgId, orgId) as any;

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Return policy validation: order must be fulfilled/delivered
  if (order.status !== 'delivered' && order.status !== 'completed') {
    res.status(400).json({ error: 'Returns can only be requested for delivered orders.' });
    return;
  }

  const { items = [], reason = 'Item defective or not as described' } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Please specify at least one item to return.' });
    return;
  }

  // Validate quantities against purchased order items
  const orderItems: any[] = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
  let totalReturnMinor = 0;
  const processedReturnItems = [];

  for (const retItem of items) {
    const orig = orderItems.find(it => (it.productId || it.product_id) === (retItem.productId || retItem.product_id) || it.name === retItem.name);
    if (!orig) {
      res.status(400).json({ error: `Item '${retItem.name || 'Unknown'}' is not part of this order.` });
      return;
    }

    const retQty = Math.max(1, parseInt(retItem.quantity) || 1);
    if (retQty > (orig.quantity || 1)) {
      res.status(400).json({ error: `Cannot return ${retQty} of '${orig.name}'. You only purchased ${orig.quantity}.` });
      return;
    }

    const unitPriceMinor = orig.unitPriceMinor || Math.round((Number(orig.price) || 0) * 100);
    const lineTotalMinor = unitPriceMinor * retQty;
    totalReturnMinor += lineTotalMinor;

    processedReturnItems.push({
      productId: orig.productId || orig.product_id,
      name: orig.name,
      quantity: retQty,
      unitPriceMinor,
      totalMinor: lineTotalMinor,
      reason: retItem.reason || reason,
    });
  }

  const returnId = `ret_${uuidv4()}`;
  const returnNumber = `FS-RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    INSERT INTO order_returns (
      id, return_number, order_id, user_id, organization_id, shop_id,
      customer_id, items, total_return_minor, currency, return_reason,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', datetime('now'), datetime('now'))
  `).run(
    returnId, returnNumber, order.id, order.user_id, order.organization_id || null,
    order.shop_id || null, session.customer_id, JSON.stringify(processedReturnItems),
    totalReturnMinor, order.currency || 'INR', String(reason)
  );

  db.prepare(`
    UPDATE orders SET return_status = 'requested', updated_at = datetime('now') WHERE id = ?
  `).run(order.id);

  res.status(201).json({
    success: true,
    message: 'Return request submitted. The store merchant will review it shortly.',
    returnRequest: {
      id: returnId,
      returnNumber,
      status: 'requested',
      items: processedReturnItems,
      totalReturnMinor,
    }
  });
});

export default router;


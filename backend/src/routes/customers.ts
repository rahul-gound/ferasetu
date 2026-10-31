import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/customers — Fetch merchant's customers with login status & order metrics
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const db = getDatabase();

  try {
    // 1. Get registered customers from `customers` table
    const registeredCustomers = db.prepare(`
      SELECT c.id, c.name, c.email, c.phone, c.address, c.created_at, c.updated_at,
             CASE WHEN c.password_hash IS NOT NULL AND c.password_hash != '' THEN 1 ELSE 0 END as has_account
      FROM customers c
      WHERE c.organization_id = ? OR c.organization_id IN (
        SELECT id FROM organizations WHERE id = ?
      )
      ORDER BY c.created_at DESC
    `).all(userId, userId) as any[];

    // 2. Get customer order metrics from `orders` table
    const orderMetrics = db.prepare(`
      SELECT customer_phone, customer_email, customer_name,
             COUNT(id) as total_orders,
             SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) as total_spent,
             MAX(created_at) as last_order_date
      FROM orders
      WHERE user_id = ? OR organization_id = ?
      GROUP BY COALESCE(NULLIF(customer_phone, ''), customer_email, customer_name)
    `).all(userId, userId) as any[];

    // 3. Get customer last login from `customer_sessions`
    const lastLogins = db.prepare(`
      SELECT customer_id, MAX(created_at) as last_login_at
      FROM customer_sessions
      WHERE organization_id = ?
      GROUP BY customer_id
    `).all(userId) as any[];

    const loginMap = new Map<string, string>();
    for (const log of lastLogins) {
      if (log.customer_id) loginMap.set(log.customer_id, log.last_login_at);
    }

    const metricsByPhone = new Map<string, any>();
    const metricsByEmail = new Map<string, any>();

    for (const met of orderMetrics) {
      if (met.customer_phone) metricsByPhone.set(met.customer_phone.replace(/\D/g, ''), met);
      if (met.customer_email) metricsByEmail.set(met.customer_email.toLowerCase(), met);
    }

    const processedCustomerIds = new Set<string>();
    const mergedList: any[] = [];

    // Merge registered customers
    for (const reg of registeredCustomers) {
      processedCustomerIds.add(reg.id);
      const cleanPhone = reg.phone ? reg.phone.replace(/\D/g, '') : '';
      const cleanEmail = reg.email ? reg.email.toLowerCase() : '';

      const matchedMetric = (cleanPhone && metricsByPhone.get(cleanPhone)) || (cleanEmail && metricsByEmail.get(cleanEmail));

      mergedList.push({
        id: reg.id,
        name: reg.name || 'Store Customer',
        email: reg.email,
        phone: reg.phone || '',
        address: reg.address || '',
        account_type: reg.has_account ? 'registered' : 'lead',
        has_password: Boolean(reg.has_account),
        total_orders: matchedMetric ? Number(matchedMetric.total_orders || 0) : 0,
        total_spent: matchedMetric ? Math.round(Number(matchedMetric.total_spent || 0)) : 0,
        last_order_at: matchedMetric?.last_order_date || null,
        last_login_at: loginMap.get(reg.id) || null,
        created_at: reg.created_at,
        source: 'storefront_signup',
      });
    }

    // Also include guest ordering customers who haven't registered an account yet
    for (const ord of orderMetrics) {
      const cleanEmail = ord.customer_email ? ord.customer_email.toLowerCase() : '';
      const cleanPhone = ord.customer_phone ? ord.customer_phone.replace(/\D/g, '') : '';

      const alreadyIncluded = mergedList.some(c =>
        (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail) ||
        (cleanPhone && c.phone && c.phone.replace(/\D/g, '') === cleanPhone)
      );

      if (!alreadyIncluded && (ord.customer_name || ord.customer_phone || ord.customer_email)) {
        mergedList.push({
          id: `guest_${uuidv4().substring(0, 8)}`,
          name: ord.customer_name || 'Guest Shopper',
          email: ord.customer_email || '',
          phone: ord.customer_phone || '',
          address: '',
          account_type: 'guest_buyer',
          has_password: false,
          total_orders: Number(ord.total_orders || 0),
          total_spent: Math.round(Number(ord.total_spent || 0)),
          last_order_at: ord.last_order_date,
          last_login_at: null,
          created_at: ord.last_order_date,
          source: 'order_checkout',
        });
      }
    }

    // Sort by most recently active (last_login or last_order or created_at)
    mergedList.sort((a, b) => {
      const timeA = new Date(a.last_login_at || a.last_order_at || a.created_at).getTime();
      const timeB = new Date(b.last_login_at || b.last_order_at || b.created_at).getTime();
      return timeB - timeA;
    });

    const totalCustomers = mergedList.length;
    const registeredCount = mergedList.filter(c => c.account_type === 'registered').length;
    const repeatBuyers = mergedList.filter(c => c.total_orders > 1).length;
    const totalRevenue = mergedList.reduce((sum, c) => sum + (c.total_spent || 0), 0);

    res.json({
      success: true,
      stats: {
        total_customers: totalCustomers,
        registered_accounts: registeredCount,
        repeat_buyers: repeatBuyers,
        total_revenue: totalRevenue,
      },
      customers: mergedList,
    });
  } catch (err: any) {
    console.error('Failed to query customers:', err);
    res.status(500).json({ error: 'Failed to retrieve customers', details: err.message });
  }
});

// POST /api/customers — Manually add a customer to merchant's shop
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { name, email, phone, address, notes } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(422).json({ error: 'Customer name is required' });
    return;
  }

  const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : `${(phone || 'cust').replace(/\D/g, '')}@offline.ferasetu.local`;
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

  const db = getDatabase();
  const customerId = `cust_${uuidv4()}`;
  const now = new Date().toISOString();

  try {
    const existing = db.prepare('SELECT id FROM customers WHERE organization_id = ? AND LOWER(email) = ?').get(userId, cleanEmail) as any;
    if (existing) {
      res.status(409).json({ error: 'A customer with this email already exists' });
      return;
    }

    db.prepare(`
      INSERT INTO customers (id, organization_id, name, email, phone, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customerId, userId, name.trim(), cleanEmail, cleanPhone, address || '', now, now);

    res.status(201).json({
      success: true,
      customer: {
        id: customerId,
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        address: address || '',
        account_type: 'registered',
        created_at: now,
      }
    });
  } catch (err: any) {
    console.error('Failed to create customer:', err);
    res.status(500).json({ error: 'Failed to add customer', details: err.message });
  }
});

// GET /api/customers/:id — Detailed customer orders and timeline
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const customerId = req.params.id;
  const db = getDatabase();

  try {
    const customer = db.prepare(`
      SELECT id, name, email, phone, address, created_at, updated_at,
             CASE WHEN password_hash IS NOT NULL AND password_hash != '' THEN 1 ELSE 0 END as has_account
      FROM customers
      WHERE id = ? AND (organization_id = ? OR organization_id IN (SELECT id FROM organizations WHERE id = ?))
    `).get(customerId, userId, userId) as any;

    let orders: any[] = [];
    if (customer) {
      orders = db.prepare(`
        SELECT id, total, status, payment_status, payment_method, delivery_address, items, created_at
        FROM orders
        WHERE (user_id = ? OR organization_id = ?) AND (customer_id = ? OR customer_phone = ? OR customer_email = ?)
        ORDER BY created_at DESC
      `).all(userId, userId, customer.id, customer.phone, customer.email) as any[];
    }

    const parsedOrders = orders.map(o => {
      let items = [];
      try {
        items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
      } catch {}
      return { ...o, items };
    });

    res.json({
      success: true,
      customer: customer || null,
      orders: parsedOrders,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch customer detail', details: err.message });
  }
});

export default router;

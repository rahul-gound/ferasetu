import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import os from 'os';
import { getDatabase } from '../models/database';
import { adminOnly, AdminRequest } from '../middleware/adminAuth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'fallback-dev-secret-do-not-use-in-dev');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@fera.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const VALID_PLANS = new Set(['free', 'trial', 'basic', 'standard', 'pro', 'premium']);

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin login attempts. Try again later.' }
});

function writeAuditLog(req: AdminRequest, action: string, targetType?: string, targetId?: string, metadata: Record<string, unknown> = {}) {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO admin_audit_logs (id, admin_email, action, target_type, target_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.admin?.email || ADMIN_EMAIL, action, targetType || null, targetId || null, JSON.stringify(metadata));
  } catch (err) {
    console.warn('Admin audit log failed:', err);
  }
}

// Admin Login (Public)
router.post('/login', adminLoginLimiter, (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!JWT_SECRET || !ADMIN_PASSWORD) {
    res.status(500).json({ error: 'Admin login is not configured' });
    return;
  }

  if (username === 'admin' && password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { id: 'admin-root', email: ADMIN_EMAIL, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});

// Use adminOnly middleware for all following routes
router.use(adminOnly);

router.get('/me', (req: AdminRequest, res: Response) => {
  res.json({ admin: req.admin });
});

// --- USER MANAGEMENT ---

// List users with pagination and search
router.get('/users', (req: Request, res: Response) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string || '';
  const offset = (page - 1) * limit;

  const searchQuery = search ? `WHERE email LIKE ? OR business_name LIKE ? OR name LIKE ?` : '';
  const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

  const users = db.prepare(`
    SELECT id, email, name, business_name, plan, is_blocked, is_verified, created_at,
    (SELECT COUNT(*) FROM products WHERE user_id = users.id) as product_count,
    (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count
    FROM users
    ${searchQuery}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM users ${searchQuery}`).get(...params) as any;

  res.json({ users, total: total.count, page, limit });
});

// Update user status (block/unblock)
router.patch('/users/:id/status', (req: AdminRequest, res: Response) => {
  const { is_blocked } = req.body;
  const db = getDatabase();
  db.prepare('UPDATE users SET is_blocked = ?, updated_at = datetime(\'now\') WHERE id = ?').run(is_blocked ? 1 : 0, req.params.id);
  writeAuditLog(req, is_blocked ? 'user.block' : 'user.unblock', 'user', req.params.id);
  res.json({ success: true, is_blocked });
});

// Delete User (Hard Delete)
router.delete('/users/:id', (req: AdminRequest, res: Response) => {
  const db = getDatabase();
  const userId = req.params.id;
  console.log(`[ADMIN] Attempting to delete user: ${userId}`);

  try {
    // Check if user exists first
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    console.log(`[ADMIN] User found in DB before delete:`, user);

    // Note: ON DELETE CASCADE in schema handles related products, orders, etc.
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    console.log(`[ADMIN] Delete result:`, result);
    
    // Some SQLite drivers might not return changes correctly, so we check if the user is still there
    const userAfter = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    
    if (result.changes === 0 && userAfter) {
      console.error(`[ADMIN] User still exists after delete attempt. ID: ${userId}`);
      res.status(404).json({ error: 'User not found or deletion failed' });
      return;
    }

    writeAuditLog(req, 'user.delete', 'user', userId);
    res.json({ success: true, message: 'User and all related data deleted permanently' });
  } catch (err: any) {
    console.error(`❌ Admin: Failed to delete user ${userId}:`, err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Impersonate User (Generate token for a user)
router.post('/users/:id/impersonate', (req: AdminRequest, res: Response) => {
  const db = getDatabase();
  const user = db.prepare('SELECT id, email, name, plan, business_name FROM users WHERE id = ?').get(req.params.id) as any;
  
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, plan: user.plan, businessName: user.business_name || user.name, impersonated: true },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  writeAuditLog(req, 'user.impersonate', 'user', req.params.id, { email: user.email });
  res.json({ token, user });
});

// --- PLATFORM DASHBOARD ---

router.get('/dashboard-stats', async (req: Request, res: Response) => {
  const db = getDatabase();
  const { verifyMailService } = require('../services/mailService');
  
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
  const premiumUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE plan != 'free'").get() as any)?.c || 0;
  const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any)?.c || 0;
  const totalProducts = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any)?.c || 0;
  
  // Basic Revenue Calculation
  const revenue = (db.prepare("SELECT SUM(total) as s FROM orders WHERE payment_status = 'paid'").get() as any)?.s || 0;
  const subscriptionRevenue = (db.prepare("SELECT SUM(amount) as s FROM transactions WHERE status = 'completed'").get() as any)?.s || 0;

  // Active Users (30 days)
  const activeUsers = (db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM analytics_events WHERE created_at > datetime('now', '-30 days')").get() as any)?.c || 0;
  const revenueChart = db.prepare(`
    SELECT DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders
    FROM orders
    WHERE payment_status = 'paid' AND created_at >= datetime('now', '-7 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all();

  // SMTP Check
  let smtpStatus = 'error';
  try { smtpStatus = await verifyMailService() ? 'operational' : 'error'; } catch(e) {}

  res.json({
    stats: {
      totalUsers,
      premiumUsers,
      totalOrders,
      totalProducts,
      totalRevenue: revenue + subscriptionRevenue,
      activeUsers,
      conversionRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(2) : 0
    },
    health: {
      smtp: smtpStatus,
      database: 'operational',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      system: {
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
        platform: os.platform()
      }
    },
    revenueChart
  });
});

// --- SHOPS MANAGEMENT ---

router.get('/shops', (req: Request, res: Response) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const shops = db.prepare(`
    SELECT w.*, u.email as owner_email, u.name as owner_name,
    (SELECT COUNT(*) FROM products WHERE user_id = u.id) as product_count
    FROM websites w
    JOIN users u ON w.user_id = u.id
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM websites').get() as any;

  res.json({ shops, total: total.count, page, limit });
});

// --- GLOBAL ORDERS MONITOR ---

router.get('/orders', (req: Request, res: Response) => {
  const db = getDatabase();
  const status = req.query.status as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  let query = `
    SELECT o.*, u.business_name as shop_name, u.email as user_email
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ' WHERE o.status = ? ';
    params.push(status);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ? ';
  
  const orders = db.prepare(query).all(...params, limit, offset);
  
  const totalQuery = status && status !== 'all' 
    ? 'SELECT COUNT(*) as count FROM orders WHERE status = ?' 
    : 'SELECT COUNT(*) as count FROM orders';
  const totalParams = status && status !== 'all' ? [status] : [];
  const total = db.prepare(totalQuery).get(...totalParams) as any;

  res.json({ orders, total: total.count, page, limit });
});

// --- SUPPORT TICKETS ---

router.get('/tickets', (req: Request, res: Response) => {
  const db = getDatabase();
  const status = req.query.status as string || 'open';
  
  const tickets = db.prepare(`
    SELECT t.*, u.email, u.name as user_name 
    FROM tickets t 
    JOIN users u ON t.user_id = u.id 
    WHERE t.status = ?
    ORDER BY t.updated_at DESC
  `).all(status);

  res.json({ tickets });
});

router.get('/tickets/:id/replies', (req: Request, res: Response) => {
  const db = getDatabase();
  const replies = db.prepare(`
    SELECT * FROM ticket_replies 
    WHERE ticket_id = ? 
    ORDER BY created_at ASC
  `).all(req.params.id);

  res.json({ replies });
});

router.post('/tickets/:id/reply', (req: Request, res: Response) => {
  const { content } = req.body;
  const db = getDatabase();
  
  db.prepare(`
    INSERT INTO ticket_replies (id, ticket_id, sender_role, content)
    VALUES (?, ?, 'admin', ?)
  `).run(uuidv4(), req.params.id, content);

  db.prepare('UPDATE tickets SET status = \'in_progress\', updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);

  res.json({ success: true });
});

router.patch('/tickets/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  const db = getDatabase();
  db.prepare('UPDATE tickets SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// --- USER PLAN UPDATE ---

router.patch('/users/:id/plan', (req: AdminRequest, res: Response) => {
  const { plan } = req.body;
  if (!VALID_PLANS.has(plan)) {
    res.status(400).json({ error: 'Invalid plan' });
    return;
  }

  const db = getDatabase();
  db.prepare('UPDATE users SET plan = ?, updated_at = datetime(\'now\') WHERE id = ?').run(plan, req.params.id);
  writeAuditLog(req, 'user.plan_update', 'user', req.params.id, { plan });
  res.json({ success: true, plan });
});

// --- ANNOUNCEMENTS ---

router.post('/announcements', (req: AdminRequest, res: Response) => {
  const { title, content, target_plan, expires_at } = req.body;
  const db = getDatabase();
  
  db.prepare(`
    INSERT INTO announcements (id, title, content, target_plan, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), title, content, target_plan || 'all', expires_at || null);

  writeAuditLog(req, 'announcement.create', 'announcement', undefined, { title, target_plan: target_plan || 'all' });
  res.json({ success: true });
});

// --- FEATURE FLAGS ---

router.get('/feature-flags', (req: Request, res: Response) => {
  const db = getDatabase();
  const flags = db.prepare('SELECT * FROM feature_flags').all();
  res.json({ flags });
});

router.post('/feature-flags', (req: AdminRequest, res: Response) => {
  const { flag_key, description, is_enabled, rules_json } = req.body;
  const db = getDatabase();
  
  db.prepare(`
    INSERT INTO feature_flags (id, flag_key, description, is_enabled, rules_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(flag_key) DO UPDATE SET
    description = excluded.description,
    is_enabled = excluded.is_enabled,
    rules_json = excluded.rules_json,
    updated_at = datetime('now')
  `).run(uuidv4(), flag_key, description, is_enabled ? 1 : 0, JSON.stringify(rules_json || {}));

  writeAuditLog(req, 'feature_flag.upsert', 'feature_flag', flag_key, { is_enabled: !!is_enabled });
  res.json({ success: true });
});

// --- AI MONITOR ---

router.get('/ai-usage', (req: Request, res: Response) => {
  const db = getDatabase();
  const logs = db.prepare(`
    SELECT l.*, u.email, u.business_name, u.ai_credits_balance
    FROM ai_usage_logs l 
    JOIN users u ON l.user_id = u.id 
    ORDER BY l.created_at DESC 
    LIMIT 100
  `).all();
  
  const stats = db.prepare('SELECT model, COUNT(*) as count, SUM(cost) as total_cost, SUM(credits_used) as credits_used FROM ai_usage_logs GROUP BY model').all();
  const byUsageType = db.prepare(`
    SELECT usage_type, COUNT(*) as calls, SUM(credits_used) as credits_used, SUM(prompt_tokens + completion_tokens) as tokens
    FROM ai_usage_logs
    GROUP BY usage_type
  `).all();
  const byShop = db.prepare(`
    SELECT u.id, u.email, u.business_name, u.ai_credits_balance, COUNT(l.id) as calls, SUM(l.credits_used) as credits_used
    FROM users u
    LEFT JOIN ai_usage_logs l ON l.user_id = u.id
    GROUP BY u.id, u.email, u.business_name, u.ai_credits_balance
    HAVING calls > 0
    ORDER BY credits_used DESC
    LIMIT 50
  `).all();

  res.json({ logs, stats, byUsageType, byShop });
});

export default router;

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import os from 'os';
import { getDatabase } from '../models/database';
import { adminOnly, AdminRequest, verifyAdminCredentials } from '../middleware/adminAuth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'fallback-dev-secret-do-not-use-in-dev');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@fera.ai';
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
router.post('/login', adminLoginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { username, password, totp } = req.body;

  if (!JWT_SECRET) {
    res.status(500).json({ error: 'Admin authentication is not configured' });
    return;
  }

  // Verify admin credentials
  const isValid = await verifyAdminCredentials(username, password);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }

  // Check MFA if TOTP is configured
  const adminTotpSecret = process.env.ADMIN_TOTP_SECRET;
  if (adminTotpSecret) {
    if (!totp) {
      res.status(401).json({ error: 'MFA required', requireMFA: true });
      return;
    }
    
    // Verify TOTP
    const { verify } = require('otplib');
    const isValidTotp = verify({ token: totp, secret: adminTotpSecret });
    if (!isValidTotp) {
      res.status(401).json({ error: 'Invalid MFA code' });
      return;
    }
  }

  const token = jwt.sign(
    { id: 'admin-root', email: ADMIN_EMAIL, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ success: true, token });
});

// Public error intake endpoint (called by frontend ErrorBoundary & errorTelemetry)
router.post('/error-logs', (req: Request, res: Response): void => {
  try {
    const db = getDatabase();
    const {
      error_message, error_name, stack, component_stack, url, user_agent, network_log,
      user_id, user_email, user_name, plan_tier, is_paid, store_slug, metadata
    } = req.body;
    const id = (req.body.id as string) || `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const netLogStr = typeof network_log === 'object' ? JSON.stringify(network_log) : (network_log || null);
    const metaStr = typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || null);

    let finalUserId = user_id || null;
    let finalEmail = user_email || null;
    let finalName = user_name || null;
    let finalPlan = plan_tier || 'free';
    let finalIsPaid = is_paid !== undefined ? (is_paid ? 1 : 0) : (finalPlan && finalPlan !== 'free' && finalPlan !== 'trial' ? 1 : 0);
    let finalStore = store_slug || null;

    if (finalUserId || finalEmail) {
      try {
        let userRow: any = null;
        if (finalUserId) {
          userRow = db.prepare('SELECT id, email, name, plan, organization_id FROM users WHERE id = ?').get(finalUserId);
        }
        if (!userRow && finalEmail) {
          userRow = db.prepare('SELECT id, email, name, plan, organization_id FROM users WHERE email = ?').get(finalEmail);
        }
        if (userRow) {
          if (!finalUserId) finalUserId = userRow.id;
          if (!finalEmail) finalEmail = userRow.email;
          if (!finalName && userRow.name) finalName = userRow.name;
          if (userRow.plan) {
            finalPlan = userRow.plan;
            finalIsPaid = (finalPlan !== 'free' && finalPlan !== 'trial') ? 1 : 0;
          }
          if (!finalStore && userRow.organization_id) {
            const orgRow: any = db.prepare('SELECT store_slug FROM organizations WHERE id = ?').get(userRow.organization_id);
            if (orgRow?.store_slug) finalStore = orgRow.store_slug;
          }
        }
      } catch {
        // ignore enrichment error
      }
    }

    try {
      db.prepare(`
        INSERT INTO error_logs (
          id, error_message, error_name, stack, component_stack, url, user_agent, network_log,
          user_id, user_email, user_name, plan_tier, is_paid, store_slug, metadata,
          status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))
      `).run(
        id, error_message || 'Unknown render error', error_name || 'Error', stack || null,
        component_stack || null, url || null, user_agent || null, netLogStr,
        finalUserId, finalEmail, finalName, finalPlan, finalIsPaid, finalStore, metaStr
      );
    } catch {
      // Fallback for tables created prior to migration without the new columns
      db.prepare(`
        INSERT INTO error_logs (id, error_message, error_name, stack, component_stack, url, user_agent, network_log, user_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))
      `).run(id, error_message || 'Unknown render error', error_name || 'Error', stack || null, component_stack || null, url || null, user_agent || null, netLogStr, finalUserId);
    }

    res.status(201).json({
      success: true,
      ticket_id: id,
      user_id: finalUserId,
      user_email: finalEmail,
      plan_tier: finalPlan,
      is_paid: Boolean(finalIsPaid),
      message: 'Ticket created with user specifications for FeraSetu team'
    });
  } catch (err: any) {
    console.error('Error logs intake failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Use adminOnly middleware for all following routes
router.use(adminOnly);

// --- ERROR LOGS TICKET MANAGEMENT ---
router.get('/error-logs', (req: AdminRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const { status } = req.query;
    let query = 'SELECT * FROM error_logs';
    const params: any[] = [];
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT 100';
    const logs = db.prepare(query).all(...params);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/error-logs/:id/resolve', (req: AdminRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const adminEmail = req.admin?.email || ADMIN_EMAIL;
    db.prepare(`
      UPDATE error_logs SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now')
      WHERE id = ?
    `).run(adminEmail, id);
    writeAuditLog(req, 'RESOLVE_ERROR_LOG', 'error_logs', id);
    res.json({ success: true, id, status: 'resolved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/error-logs/:id', (req: AdminRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    db.prepare('DELETE FROM error_logs WHERE id = ?').run(id);
    writeAuditLog(req, 'DELETE_ERROR_LOG', 'error_logs', id);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
    SELECT id, email, name, business_name, plan, is_blocked, is_verified, plan_expires_at, created_at,
    (SELECT COUNT(*) FROM products WHERE user_id = users.id) as product_count,
    (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count
    FROM users
    ${searchQuery}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  // Enrich with subscription status
  for (const user of (users as any[])) {
    try {
      const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id) as any;
      if (sub) {
        user.subscription_status = sub.status || 'free';
        user.subscription_expires_at = sub.current_period_end || user.plan_expires_at || null;
        user.subscription_plan = sub.plan || user.plan || 'free';
        user.payment_provider = sub.payment_provider || null;
      } else {
        user.subscription_status = (user.plan && user.plan !== 'free') ? 'active' : 'free';
        user.subscription_expires_at = user.plan_expires_at || null;
        user.subscription_plan = user.plan || 'free';
      }
    } catch {
      user.subscription_status = (user.plan && user.plan !== 'free') ? 'active' : 'free';
      user.subscription_expires_at = user.plan_expires_at || null;
      user.subscription_plan = user.plan || 'free';
    }
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM users ${searchQuery}`).get(...params) as any;

  res.json({ users, total: total.count, page, limit });
});

// Update user subscription & plan
router.patch('/users/:id/subscription', (req: AdminRequest, res: Response) => {
  const { plan, status, expires_at } = req.body;
  const db = getDatabase();
  const userId = req.params.id;
  const targetPlan = plan || 'free';
  const targetStatus = status || (targetPlan === 'free' ? 'free' : 'active');
  const targetExpiresAt = expires_at || null;

  db.prepare(`
    UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = datetime('now') WHERE id = ?
  `).run(targetPlan, targetExpiresAt, userId);

  try {
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan, status, current_period_end, updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        plan = excluded.plan,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        updated_at = datetime('now')
    `).run(uuidv4(), userId, targetPlan, targetStatus, targetExpiresAt);
  } catch (subErr) {
    console.warn('Could not update subscriptions table in SQLite:', subErr);
  }

  writeAuditLog(req, 'user.update_subscription', 'user', userId, { plan: targetPlan, status: targetStatus, expires_at: targetExpiresAt });
  res.json({ success: true, plan: targetPlan, status: targetStatus, expires_at: targetExpiresAt });
});

// List shops / websites
router.get('/shops', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const totalRow = db.prepare('SELECT COUNT(*) as total FROM users').get() as any;
    const total = totalRow?.total || 0;

    let shopsList: any[] = [];
    try {
      shopsList = db.prepare(`
        SELECT 
          COALESCE(w.id, 'shop_' || u.id) as id,
          COALESCE(u.business_name, w.name, u.name, 'My Shop') as shop_name,
          COALESCE(u.subdomain, 'store') as subdomain,
          COALESCE(u.custom_domain, CASE WHEN u.subdomain IS NOT NULL THEN u.subdomain || '.ferasetu.com' ELSE 'store.ferasetu.com' END) as hostname,
          u.name as owner_name,
          u.email as owner_email,
          COALESCE(w.created_at, u.created_at) as created_at,
          (SELECT COUNT(*) FROM products p WHERE p.user_id = u.id) as product_count,
          w.template,
          w.is_published
        FROM users u
        LEFT JOIN websites w ON w.user_id = u.id
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    } catch {
      shopsList = db.prepare(`
        SELECT 
          'shop_' || id as id,
          COALESCE(business_name, name, 'My Shop') as shop_name,
          COALESCE(subdomain, 'store') as subdomain,
          COALESCE(custom_domain, CASE WHEN subdomain IS NOT NULL THEN subdomain || '.ferasetu.com' ELSE 'store.ferasetu.com' END) as hostname,
          name as owner_name,
          email as owner_email,
          created_at,
          0 as product_count
        FROM users
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    }

    res.json({ shops: shopsList || [], total, page, limit });
  } catch (err: any) {
    console.error('Error fetching admin shops:', err);
    res.status(500).json({ error: err.message });
  }
});

// List merchant feedback & surveys
router.get('/feedback', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    let total = 0;
    try {
      const countRow = db.prepare('SELECT COUNT(*) as total FROM survey_submissions').get() as any;
      total = countRow?.total || 0;
    } catch {}

    let feedbackList: any[] = [];
    try {
      feedbackList = db.prepare(`
        SELECT 
          s.id,
          s.user_id,
          COALESCE(u.name, 'Shopkeeper') as user_name,
          COALESCE(u.email, s.contact, 'No email') as user_email,
          COALESCE(u.business_name, 'Shop') as business_name,
          u.phone as user_phone,
          s.answers_json,
          s.feedback,
          s.contact,
          s.ai_summary_json,
          s.created_at
        FROM survey_submissions s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    } catch {
      feedbackList = [];
    }

    res.json({ feedback: feedbackList || [], total, page, limit });
  } catch (err: any) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ error: err.message });
  }
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
    { 
      id: user.id, 
      email: user.email, 
      plan: user.plan, 
      businessName: user.business_name || user.name, 
      impersonated: true,
      impersonator: req.admin?.id,
      impersonated_at: Date.now()
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  writeAuditLog(req, 'user.impersonate', 'user', req.params.id, { email: user.email, impersonator: req.admin?.id });
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

// Tenant feature flag overrides
interface FeatureFlag {
  flag_key: string;
  is_enabled: number;
  description?: string;
  rules_json?: string;
  updated_at?: string;
}

interface TenantFeatureFlagOverride {
  flag_key: string;
  is_enabled: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

router.get('/feature-flags/tenant/:userId', (req: AdminRequest, res: Response) => {
  const db = getDatabase();
  const { userId } = req.params;
  
  const overrides = db.prepare('SELECT * FROM tenant_feature_flags WHERE tenant_id = ?').all(userId) as TenantFeatureFlagOverride[];
  const globalFlags = db.prepare('SELECT * FROM feature_flags').all() as FeatureFlag[];
  
  // Merge global flags with tenant overrides
  const mergedFlags = globalFlags.map(flag => {
    const override = overrides.find(o => o.flag_key === flag.flag_key);
    return {
      ...flag,
      is_enabled: override ? !!override.is_enabled : !!flag.is_enabled,
      overridden: !!override,
    };
  });
  
  res.json({ flags: mergedFlags, overrides });
});

router.post('/feature-flags/tenant/:userId', (req: AdminRequest, res: Response) => {
  const { flag_key, is_enabled } = req.body;
  const { userId } = req.params;
  const db = getDatabase();
  
  if (is_enabled === undefined || is_enabled === null) {
    res.status(400).json({ error: 'is_enabled is required' });
    return;
  }
  
  db.prepare(`
    INSERT INTO tenant_feature_flags (id, tenant_id, flag_key, is_enabled)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(tenant_id, flag_key) DO UPDATE SET
    is_enabled = excluded.is_enabled,
    updated_at = datetime('now')
  `).run(uuidv4(), userId, flag_key, is_enabled ? 1 : 0);
  
  writeAuditLog(req, 'feature_flag.tenant_override', 'feature_flag', flag_key, { userId, is_enabled: !!is_enabled });
  res.json({ success: true });
});

router.delete('/feature-flags/tenant/:userId/:flagKey', (req: AdminRequest, res: Response) => {
  const { userId, flagKey } = req.params;
  const db = getDatabase();
  
  db.prepare('DELETE FROM tenant_feature_flags WHERE tenant_id = ? AND flag_key = ?').run(userId, flagKey);
  
  writeAuditLog(req, 'feature_flag.tenant_override_remove', 'feature_flag', flagKey, { userId });
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

// --- MEETINGS MANAGEMENT ---

router.get('/meetings', (req: Request, res: Response) => {
  const db = getDatabase();
  const meetings = db.prepare(`
    SELECT m.*, u.email as partner_email, u.business_name 
    FROM meetings m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.meeting_date ASC
  `).all();
  res.json({ meetings });
});

router.patch('/meetings/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  const db = getDatabase();
  db.prepare('UPDATE meetings SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

export default router;

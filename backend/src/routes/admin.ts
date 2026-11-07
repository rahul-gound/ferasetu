import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import os from 'os';
import { getDatabase } from '../models/database';
import { adminOnly, AdminRequest, verifyAdminCredentials } from '../middleware/adminAuth';

const router = Router();
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    return 'dev-only-' + (process.env.DEV_JWT_SECRET || 'dev-secret-ferasetu-2026');
  }
  return secret;
}
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

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
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
    secret,
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

router.delete('/error-logs', (req: AdminRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const status = req.query.status as string;
    if (status && status !== 'all') {
      db.prepare('DELETE FROM error_logs WHERE status = ?').run(status);
    } else {
      db.prepare('DELETE FROM error_logs').run();
    }
    writeAuditLog(req, 'CLEAR_ALL_ERROR_LOGS', 'error_logs', status || 'all');
    res.json({ success: true });
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
    COALESCE(ai_credits_balance, 0) as ai_credits_balance,
    COALESCE(ai_credits_monthly_limit, 20) as ai_credits_monthly_limit,
    COALESCE(ai_credits_used_month, 0) as ai_credits_used_month,
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
    getJwtSecret(),
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

// --- PLATFORM PRODUCT & PRIVACY TELEMETRY ---

function getPlatformAnalyticsFromDb(db: any, days: number = 30) {
  const windowDays = Math.max(1, Math.min(90, days));

  let totalVisitors = 0;
  let totalIps = 0;
  let totalSessions = 0;
  let totalPageViews = 0;

  try {
    const overall = db.prepare(`
      SELECT 
        COUNT(DISTINCT visitor_id) as total_unique_visitors,
        COUNT(DISTINCT session_id) as total_unique_sessions,
        COUNT(DISTINCT CASE WHEN ip_address IS NOT NULL AND ip_address != '' THEN ip_address END) as total_unique_ips,
        COUNT(CASE WHEN event_name = 'page_view' OR event_type = 'page_view' THEN 1 END) as total_page_views,
        COUNT(*) as total_events
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `).get(windowDays) as any;

    totalVisitors = overall?.total_unique_visitors || 0;
    totalIps = overall?.total_unique_ips || 0;
    totalSessions = overall?.total_unique_sessions || 0;
    totalPageViews = overall?.total_page_views || 0;
  } catch (e: any) {
    console.warn("Analytics overall query note:", e?.message);
  }

  // If visitor_id is empty/null, fallback to unique sessions or unique IPs
  if (totalVisitors === 0 && (totalSessions > 0 || totalIps > 0)) {
    totalVisitors = Math.max(totalSessions, totalIps);
  }

  // Event counts by event_name
  const eventMap: Record<string, { count: number; visitors: number; sessions: number }> = {};
  try {
    const statsRows = db.prepare(`
      SELECT 
        COALESCE(event_name, event_type, 'page_view') as event_name,
        COUNT(*) as count,
        COUNT(DISTINCT visitor_id) as visitors,
        COUNT(DISTINCT session_id) as sessions
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY COALESCE(event_name, event_type, 'page_view')
    `).all(windowDays) as any[];

    for (const r of statsRows) {
      eventMap[r.event_name] = {
        count: r.count,
        visitors: r.visitors || r.count,
        sessions: r.sessions || r.count,
      };
    }
  } catch {}

  const landingVisitors = totalVisitors || eventMap['page_view']?.visitors || 0;
  const featuresEngaged = eventMap['section_view']?.visitors || 0;
  const pricingViews = eventMap['pricing_view']?.visitors || 0;
  const pricingSelects = eventMap['pricing_plan_select']?.visitors || 0;
  const ctaClicks = eventMap['cta_click']?.visitors || 0;
  const signupStarts = eventMap['signup_start']?.visitors || 0;
  const signupCompletes = eventMap['signup_complete']?.visitors || 0;
  const trialStarts = eventMap['trial_start']?.visitors || 0;

  const funnel = {
    landing_visitors: landingVisitors,
    features_engaged: featuresEngaged,
    pricing_views: pricingViews,
    pricing_selects: pricingSelects,
    cta_clicks: ctaClicks,
    signup_starts: signupStarts,
    signup_completes: signupCompletes,
    trial_starts: trialStarts,
    rates: {
      landing_to_cta: landingVisitors > 0 ? Number(((ctaClicks / landingVisitors) * 100).toFixed(1)) : 0,
      pricing_to_signup: pricingViews > 0 ? Number(((signupStarts / pricingViews) * 100).toFixed(1)) : 0,
      signup_completion: signupStarts > 0 ? Number(((signupCompletes / signupStarts) * 100).toFixed(1)) : 0,
      overall_conversion: landingVisitors > 0 ? Number(((trialStarts / landingVisitors) * 100).toFixed(2)) : 0,
    }
  };

  // Device distribution
  const devices: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
  try {
    const devRows = db.prepare(`
      SELECT COALESCE(device_category, 'desktop') as dev, COUNT(*) as cnt
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY COALESCE(device_category, 'desktop')
    `).all(windowDays) as any[];
    for (const d of devRows) {
      devices[d.dev] = d.cnt;
    }
  } catch {}

  // Geo distribution
  let geo: Array<{ country: string; count: number }> = [];
  try {
    const geoRows = db.prepare(`
      SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY COALESCE(country, 'Unknown')
      ORDER BY count DESC LIMIT 10
    `).all(windowDays) as any[];
    geo = geoRows;
  } catch {}

  // Top Visitor IP Addresses Telemetry
  let topIps: any[] = [];
  try {
    topIps = db.prepare(`
      SELECT 
        COALESCE(ip_address, '127.0.0.1') as ip,
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_name = 'page_view' OR event_type = 'page_view' THEN 1 END) as page_views,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT visitor_id) as visitors,
        MAX(country) as country,
        MAX(device_category) as device_category,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
        AND ip_address IS NOT NULL AND ip_address != ''
      GROUP BY ip_address
      ORDER BY total_events DESC
      LIMIT 25
    `).all(windowDays);
  } catch (e: any) {
    console.warn("Could not query top visitor IPs in SQLite:", e?.message);
  }

  // Recent Visitors Log with IP, path, country, device, timestamp
  let recentVisitors: any[] = [];
  try {
    const visitorRows = db.prepare(`
      SELECT 
        id, visitor_id, session_id,
        COALESCE(ip_address, '127.0.0.1') as ip,
        COALESCE(event_name, event_type, 'page_view') as event_name,
        COALESCE(country, 'Unknown') as country,
        COALESCE(device_category, 'desktop') as device_category,
        properties, event_data, created_at
      FROM analytics_events
      ORDER BY created_at DESC
      LIMIT 50
    `).all() as any[];

    recentVisitors = visitorRows.map(r => {
      let props: any = {};
      try { props = JSON.parse(r.properties || r.event_data || '{}'); } catch {}
      return {
        id: r.id,
        visitor_id: r.visitor_id || 'anonymous',
        session_id: r.session_id,
        ip: r.ip || '127.0.0.1',
        event_name: r.event_name,
        path: props.path || props.title || props.city || '/',
        country: r.country || 'Unknown',
        device_category: r.device_category || 'desktop',
        created_at: r.created_at
      };
    });
  } catch (e: any) {
    console.warn("Could not query recent visitors in SQLite:", e?.message);
  }

  // Safe client runtime errors
  let recentErrors: any[] = [];
  try {
    const errorRows = db.prepare(`
      SELECT error_name, error_message, url, created_at
      FROM error_logs
      ORDER BY created_at DESC LIMIT 15
    `).all() as any[];
    recentErrors = errorRows.map(e => ({
      error_name: e.error_name || 'GenericError',
      error_type: 'client_runtime',
      status_code: null,
      path: e.url || '/',
      created_at: e.created_at
    }));
  } catch {}

  return {
    windowDays,
    summary: {
      totalVisitors,
      totalIps,
      totalSessions,
      totalPageViews,
      totalCtas: ctaClicks,
      totalSignups: signupCompletes,
      totalTrials: trialStarts
    },
    funnel,
    devices,
    geo,
    topIps,
    recentVisitors,
    dailyTrend: [],
    recentErrors
  };
}

router.get('/analytics', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const days = Math.max(1, Math.min(90, parseInt(req.query.days as string || '30', 10)));
    const analytics = getPlatformAnalyticsFromDb(db, days);
    res.json({ success: true, analytics });
  } catch (err: any) {
    console.error('Error fetching admin analytics:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch platform analytics' });
  }
});

router.post('/analytics/prune', (req: AdminRequest, res: Response) => {
  try {
    const db = getDatabase();
    const retentionDays = parseInt(req.body.retention_days || '30', 10);
    const result = db.prepare(`
      DELETE FROM analytics_events
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `).run(retentionDays);
    writeAuditLog(req, 'analytics.prune', 'analytics', undefined, { retentionDays, deletedRows: result.changes });
    res.json({ success: true, retentionDays, deletedRows: result.changes || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to prune analytics' });
  }
});

router.post('/analytics/aggregate', (req: AdminRequest, res: Response) => {
  const targetDate = new Date().toISOString().slice(0, 10);
  writeAuditLog(req, 'analytics.aggregate', 'analytics', undefined, { targetDate });
  res.json({ success: true, targetDate, aggregatedRecords: 0 });
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

router.get('/announcements', (req: Request, res: Response) => {
  const db = getDatabase();
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC').all();
  res.json({ announcements });
});

router.post('/announcements', (req: AdminRequest, res: Response) => {
  const {
    title,
    content,
    category = 'feature',
    badge_label = 'New Feature',
    action_url,
    action_label,
    target_plan = 'all',
    is_pinned = 0,
    expires_at,
  } = req.body;
  const db = getDatabase();
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO announcements (id, title, content, category, badge_label, action_url, action_label, target_plan, is_pinned, is_active, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
  `).run(id, title, content, category, badge_label, action_url || null, action_label || null, target_plan || 'all', is_pinned ? 1 : 0, expires_at || null);

  writeAuditLog(req, 'announcement.create', 'announcement', id, { title, category, target_plan: target_plan || 'all' });
  res.json({ success: true, id });
});

router.delete('/announcements/:id', (req: AdminRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  writeAuditLog(req, 'announcement.delete', 'announcement', req.params.id);
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

// --- AI MONITOR & CREDIT MANAGEMENT ---

const getAiCreditsUsageData = (req: Request) => {
  const db = getDatabase();
  const search = (req.query.search as string || '').trim();

  // 1. Overall Platform Aggregates
  let totalUsageRow: any = { total_calls: 0, total_credits_used: 0, total_tokens: 0 };
  let monthUsageRow: any = { month_calls: 0, month_credits_used: 0 };
  let todayUsageRow: any = { today_calls: 0, today_credits_used: 0 };
  let balancesRow: any = { total_merchants: 0, total_balance_remaining: 0, depleted_merchants: 0, low_balance_merchants: 0 };
  let purchasesRow: any = { total_credits_purchased: 0, total_revenue: 0, purchase_count: 0 };
  let activeShopkeepersCount = 0;

  try {
    totalUsageRow = db.prepare(`
      SELECT 
        COUNT(*) as total_calls, 
        COALESCE(SUM(credits_used), 0) as total_credits_used,
        COALESCE(SUM(prompt_tokens + completion_tokens), 0) as total_tokens
      FROM ai_usage_logs
    `).get() || totalUsageRow;
  } catch {}

  try {
    monthUsageRow = db.prepare(`
      SELECT 
        COUNT(*) as month_calls, 
        COALESCE(SUM(credits_used), 0) as month_credits_used
      FROM ai_usage_logs
      WHERE created_at >= datetime('now', '-30 days')
    `).get() || monthUsageRow;
  } catch {}

  try {
    todayUsageRow = db.prepare(`
      SELECT 
        COUNT(*) as today_calls, 
        COALESCE(SUM(credits_used), 0) as today_credits_used
      FROM ai_usage_logs
      WHERE created_at >= datetime('now', 'start of day')
    `).get() || todayUsageRow;
  } catch {}

  try {
    balancesRow = db.prepare(`
      SELECT 
        COUNT(*) as total_merchants,
        COALESCE(SUM(ai_credits_balance), 0) as total_balance_remaining,
        COUNT(CASE WHEN ai_credits_balance <= 0 THEN 1 END) as depleted_merchants,
        COUNT(CASE WHEN ai_credits_balance > 0 AND ai_credits_balance <= 10 THEN 1 END) as low_balance_merchants
      FROM users
    `).get() || balancesRow;
  } catch {}

  try {
    purchasesRow = db.prepare(`
      SELECT 
        COALESCE(SUM(credits), 0) as total_credits_purchased,
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as purchase_count
      FROM ai_credit_purchases
      WHERE status = 'completed'
    `).get() || purchasesRow;
  } catch {}

  try {
    activeShopkeepersCount = (db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM ai_usage_logs
    `).get() as any)?.count || 0;
  } catch {}

  // 2. Per-Shopkeeper Usage & Balance Breakdown
  let shopkeeperQuery = `
    SELECT 
      u.id, 
      u.name, 
      u.email, 
      COALESCE(u.business_name, u.name, 'Shop') as business_name, 
      u.phone,
      u.subdomain, 
      u.plan, 
      COALESCE(u.ai_credits_balance, 0) as ai_credits_balance,
      COALESCE(u.ai_credits_monthly_limit, 20) as ai_credits_monthly_limit,
      COALESCE(u.ai_credits_used_month, 0) as ai_credits_used_month,
      u.ai_credits_reset_at,
      u.created_at as joined_at,
      COALESCE(COUNT(l.id), 0) as total_calls,
      COALESCE(SUM(l.credits_used), 0) as total_credits_used,
      COALESCE(SUM(CASE WHEN l.created_at >= datetime('now', '-30 days') THEN l.credits_used ELSE 0 END), 0) as last_30d_credits_used,
      MAX(l.created_at) as last_ai_activity
    FROM users u
    LEFT JOIN ai_usage_logs l ON l.user_id = u.id
  `;
  const shopkeeperParams: any[] = [];
  if (search) {
    shopkeeperQuery += ` WHERE (u.name LIKE ? OR u.email LIKE ? OR u.business_name LIKE ? OR u.subdomain LIKE ? OR u.phone LIKE ?) `;
    shopkeeperParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  shopkeeperQuery += `
    GROUP BY u.id, u.name, u.email, u.business_name, u.phone, u.subdomain, u.plan, u.ai_credits_balance, u.ai_credits_monthly_limit, u.ai_credits_used_month, u.ai_credits_reset_at, u.created_at
    ORDER BY total_credits_used DESC, u.ai_credits_balance ASC
  `;
  let shopkeepers: any[] = [];
  try {
    shopkeepers = db.prepare(shopkeeperQuery).all(...shopkeeperParams);
  } catch {}

  // 3. Breakdown by AI Capability / Usage Type
  let byUsageType: any[] = [];
  try {
    byUsageType = db.prepare(`
      SELECT usage_type, COUNT(*) as calls, SUM(credits_used) as credits_used, SUM(prompt_tokens + completion_tokens) as tokens
      FROM ai_usage_logs
      GROUP BY usage_type
      ORDER BY credits_used DESC
    `).all();
  } catch {}

  // 4. Breakdown by Model
  let stats: any[] = [];
  try {
    stats = db.prepare(`
      SELECT model, COUNT(*) as count, SUM(cost) as total_cost, SUM(credits_used) as credits_used
      FROM ai_usage_logs
      GROUP BY model
      ORDER BY count DESC
    `).all();
  } catch {}

  // 5. Daily Trend (last 14 days)
  let dailyTrend: any[] = [];
  try {
    dailyTrend = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as calls,
        SUM(credits_used) as credits_used,
        COUNT(DISTINCT user_id) as active_shopkeepers
      FROM ai_usage_logs
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();
  } catch {}

  // 6. Recent Logs
  let logs: any[] = [];
  try {
    logs = db.prepare(`
      SELECT l.*, u.email, u.name as user_name, COALESCE(u.business_name, u.name, 'Shop') as business_name, u.subdomain, u.ai_credits_balance
      FROM ai_usage_logs l 
      LEFT JOIN users u ON l.user_id = u.id 
      ORDER BY l.created_at DESC 
      LIMIT 100
    `).all();
  } catch {}

  // 7. Recent Purchases
  let recentPurchases: any[] = [];
  try {
    recentPurchases = db.prepare(`
      SELECT p.*, u.email, u.name as user_name, COALESCE(u.business_name, u.name, 'Shop') as business_name
      FROM ai_credit_purchases p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `).all();
  } catch {}

  const summary = {
    totalCreditsUsed: totalUsageRow.total_credits_used || 0,
    totalCalls: totalUsageRow.total_calls || 0,
    totalTokens: totalUsageRow.total_tokens || 0,
    monthCreditsUsed: monthUsageRow.month_credits_used || 0,
    monthCalls: monthUsageRow.month_calls || 0,
    todayCreditsUsed: todayUsageRow.today_credits_used || 0,
    todayCalls: todayUsageRow.today_calls || 0,
    totalBalanceRemaining: balancesRow.total_balance_remaining || 0,
    totalMerchants: balancesRow.total_merchants || 0,
    activeShopkeepersCount,
    depletedMerchants: balancesRow.depleted_merchants || 0,
    lowBalanceMerchants: balancesRow.low_balance_merchants || 0,
    totalCreditsPurchased: purchasesRow.total_credits_purchased || 0,
    totalPurchaseRevenue: purchasesRow.total_revenue || 0,
    purchaseCount: purchasesRow.purchase_count || 0
  };

  const byShop = shopkeepers.filter(s => s.total_calls > 0 || s.total_credits_used > 0);

  return {
    summary,
    shopkeepers,
    byShop,
    byUsageType,
    stats,
    byModel: stats,
    dailyTrend,
    logs,
    recentPurchases
  };
};

router.get('/ai-usage', (req: Request, res: Response) => {
  try {
    const data = getAiCreditsUsageData(req);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching admin ai usage:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch AI usage stats' });
  }
});

router.get('/ai-credits', (req: Request, res: Response) => {
  try {
    const data = getAiCreditsUsageData(req);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching admin ai credits:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch AI credit stats' });
  }
});

router.post('/users/:id/ai-credits', (req: AdminRequest, res: Response): void => {
  const { credits, mode = 'add', reason = '' } = req.body;
  const db = getDatabase();
  const userId = req.params.id;

  const parsedCredits = parseInt(credits, 10);
  if (isNaN(parsedCredits)) {
    res.status(400).json({ error: 'Valid integer credits amount is required' });
    return;
  }

  const user = db.prepare('SELECT id, name, email, business_name, ai_credits_balance FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    res.status(404).json({ error: 'Shopkeeper not found' });
    return;
  }

  const prevBalance = user.ai_credits_balance || 0;
  let newBalance = prevBalance;

  if (mode === 'add') {
    if (parsedCredits === 0) {
      res.status(400).json({ error: 'Credits to add must be non-zero' });
      return;
    }
    newBalance = Math.max(0, prevBalance + parsedCredits);
  } else if (mode === 'set') {
    if (parsedCredits < 0) {
      res.status(400).json({ error: 'Credits balance cannot be negative' });
      return;
    }
    newBalance = parsedCredits;
  } else {
    res.status(400).json({ error: "Invalid mode. Must be 'add' or 'set'" });
    return;
  }

  db.prepare(`
    UPDATE users 
    SET ai_credits_balance = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newBalance, userId);

  writeAuditLog(req, 'user.ai_credits_adjust', 'user', userId, {
    mode,
    credits: parsedCredits,
    previous_balance: prevBalance,
    new_balance: newBalance,
    reason: reason || 'Admin manual credit adjustment'
  });

  res.json({
    success: true,
    user_id: userId,
    mode,
    previous_balance: prevBalance,
    new_balance: newBalance,
    credits_adjusted: newBalance - prevBalance,
    message: `Updated AI credit balance for ${user.business_name || user.name} to ${newBalance}`
  });
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

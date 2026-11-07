import { verifyPassword, signAdminJwt, requireAdminAuth, timingSafeEqual } from "../utils/auth.js";
import { logAdminAction } from "../utils/audit.js";
import { provisionNewShard } from "../sharding/provisioner.js";
import { SHARD_STATUS, VALID_MARKETS } from "../sharding/config.js";
import { EmailService } from "../services/emailService.js";
import { getPlatformAnalytics, runDailyAggregation, pruneRawEvents } from "../analytics/aggregation.js";
import { handleQARoutes } from "./qaRoutes.js";

// Rate limiting in-memory store for local/isolate brute force protection
const loginAttempts = new Map();

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Allowed origins for CORS validation (exact match + preview/subdomains)
const ALLOWED_ORIGINS = [
  "https://ferasetu.com",
  "https://www.ferasetu.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Allow any subdomain of ferasetu.com or fera-search.tech
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return host.endsWith(".ferasetu.com") || host.endsWith(".fera-search.tech");
  } catch {
    return false;
  }
}

function getCorsHeaders(request) {
  const origin = request ? request.headers?.get("Origin") : null;
  const allowedOrigin = isOriginAllowed(origin) ? origin : "https://ferasetu.com";
  const reqHeaders = request ? request.headers?.get("Access-Control-Request-Headers") : null;
  const baseHeaders = "Content-Type, Authorization, X-Requested-With, Accept, X-Organization-Id, X-Shop-Slug, X-Shop-Id, X-Store-Slug, X-Customer-Session, X-Forwarded-Host, X-User-Id, Cache-Control, Pragma";
  const allowedHeaders = reqHeaders ? `${baseHeaders}, ${reqHeaders}` : baseHeaders;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": allowedHeaders,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status = 200, request = null) {
  const corsHeaders = getCorsHeaders(request);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Robots-Tag": "noindex, nofollow",
      ...corsHeaders
    }
  });
}

async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new HttpError("Content-Type must be application/json", 415);
  }
  try {
    return await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

export async function handleAdminRoutes(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const rawPath = url.pathname;
  let path = rawPath.replace(/\/+$/, "") || "/";
  if (!path.startsWith("/api/")) {
    path = "/api" + path;
  }

  const json = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Robots-Tag": "noindex, nofollow",
        ...getCorsHeaders(request)
      }
    });
  };

  // Handle CORS Preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request)
    });
  }

  try {
    // 1. Admin Login (Unprotected - accepts /admin/login or /api/admin/login)
    if ((path === "/api/admin/login" || rawPath === "/admin/login") && method === "POST") {
      const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
      const now = Date.now();
      
      // Basic rate limiting
      const attempts = loginAttempts.get(clientIp) || { count: 0, last: now };
      if (now - attempts.last < 60000 && attempts.count >= 10) {
        throw new HttpError("Too many login attempts. Try again later.", 429);
      }
      if (now - attempts.last >= 60000) {
        attempts.count = 0;
      }
      
      const body = await readJsonBody(request);
      if (!body.username || !body.password) {
        throw new HttpError("Username and password are required", 400);
      }

      const expectedUser = (env.ADMIN_USERNAME || env.ADMIN_EMAIL || "").trim().toLowerCase();
      const inputUser = String(body.username).trim().toLowerCase();

      const isProd = env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production' || env.APP_ENV === 'production';
      const expectedHash = env.ADMIN_PASSWORD_HASH || "";
      const plainPassword = !isProd ? (env.ADMIN_PASSWORD || "") : "";

      if (isProd && !expectedHash) {
        throw new HttpError("ADMIN_PASSWORD_HASH must be configured in production environment", 500);
      }
      if ((!expectedHash && !plainPassword) || !expectedUser) {
        throw new HttpError("Admin authentication is not configured on this server", 500);
      }

      // Timing-safe or constant-time comparison for username
      const matchesUsername = inputUser === expectedUser ||
        (env.ADMIN_EMAIL && inputUser === env.ADMIN_EMAIL.trim().toLowerCase()) ||
        (env.ADMIN_USERNAME && inputUser === env.ADMIN_USERNAME.trim().toLowerCase());

      if (!matchesUsername) {
        attempts.count++;
        attempts.last = now;
        loginAttempts.set(clientIp, attempts);
        throw new HttpError("Invalid credentials", 401);
      }

      // Verify password
      let isValid = false;

      if (expectedHash) {
        try {
          isValid = await verifyPassword(body.password, expectedHash);
        } catch {
          isValid = false;
        }
      }
      if (!isValid && plainPassword) {
        try {
          const enc = new TextEncoder();
          const p1 = enc.encode(body.password);
          const p2 = enc.encode(plainPassword);
          isValid = timingSafeEqual(p1, p2);
        } catch {
          isValid = false;
        }
      }

      if (!isValid) {
        attempts.count++;
        attempts.last = now;
        loginAttempts.set(clientIp, attempts);
        throw new HttpError("Invalid credentials", 401);
      }

      // Reset attempts on success
      loginAttempts.delete(clientIp);

      const jwtSecret = env.ADMIN_JWT_SECRET || (!isProd ? env.JWT_SECRET : "");
      if (!jwtSecret) {
        throw new HttpError("ADMIN_JWT_SECRET must be configured on this server", 500);
      }
      const token = await signAdminJwt(body.username, jwtSecret);
      
      try {
        await logAdminAction(env, body.username, "ADMIN_LOGIN", "system", clientIp);
      } catch (logErr) {
        console.warn("Failed to write admin login audit log:", logErr?.message || logErr);
      }
      
      return json({ success: true, token });
    }

    // Unauthenticated Synthetic QA Sandbox endpoints (for safe failure testing)
    if (path.startsWith("/api/qa/synthetic")) {
      return handleQARoutes(request, env, path, method, null);
    }

    // 2. Authorization Layer for all other routes
    let adminPayload;
    try {
      adminPayload = await requireAdminAuth(request, env);
    } catch (authErr) {
      if (authErr.message.includes("Forbidden") || authErr.message.includes("Insufficient permissions")) {
        throw new HttpError(authErr.message, 403);
      }
      throw new HttpError(authErr.message, 401);
    }

    const adminEmail = adminPayload.email || adminPayload.sub;

    // 3. Protected Admin Routes

    // QA & Diagnostics Control Plane
    if (path.startsWith("/api/admin/qa")) {
      return handleQARoutes(request, env, path, method, adminEmail);
    }

    // VERIFY TOKEN
    if (path === "/api/admin/verify" && method === "GET") {
      return json({ 
        success: true, 
        authorized: true,
        user: { 
          id: adminPayload.sub,
          email: adminPayload.email || adminPayload.sub,
          role: "ADMIN",
          method: adminPayload.method || "WORKOS"
        } 
      });
    }
    
    // DASHBOARD STATS
    if (path === "/api/admin/dashboard-stats" && method === "GET") {
      const usersCount = (await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count")) || 0;
      const ordersCount = (await env.DB.prepare("SELECT COUNT(*) as count FROM orders").first("count")) || 0;
      const productsCount = (await env.DB.prepare("SELECT COUNT(*) as count FROM products").first("count")) || 0;
      const revenueRow = await env.DB.prepare("SELECT SUM(total) as rev FROM orders WHERE status != 'cancelled'").first();
      const totalRevenue = revenueRow?.rev || 0;
      const conversionRate = ordersCount > 0 ? Number(((ordersCount / Math.max(1, usersCount)) * 100).toFixed(1)) : 0;

      // 7-day revenue chart
      const revenueChart = [];
      const now = new Date();

      const startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      try {
        const { results } = await env.DB.prepare(`
          SELECT SUBSTR(created_at, 1, 10) as date, SUM(total) as rev, COUNT(*) as cnt
          FROM orders
          WHERE status != 'cancelled'
            AND created_at >= ?
            AND created_at < ?
          GROUP BY SUBSTR(created_at, 1, 10)
        `).bind(startDate, endDate).all();

        const resultsByDate = (results || []).reduce((acc, row) => {
          acc[row.date] = row;
          return acc;
        }, {});

        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const ymd = d.toISOString().slice(0, 10);
          const dayRow = resultsByDate[ymd];

          revenueChart.push({
            date: ymd,
            revenue: dayRow?.rev || 0,
            orders: dayRow?.cnt || 0
          });
        }
      } catch (err) {
        console.warn("Could not fetch 7-day revenue chart:", err);
        // Fallback to empty chart
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const ymd = d.toISOString().slice(0, 10);
          revenueChart.push({ date: ymd, revenue: 0, orders: 0 });
        }
      }

      return json({
        users: usersCount,
        orders: ordersCount,
        products: productsCount,
        revenue: totalRevenue,
        system: { platform: "Cloudflare Workers", status: "operational" },
        stats: {
          totalRevenue,
          totalUsers: usersCount,
          activeUsers: usersCount,
          totalOrders: ordersCount,
          totalProducts: productsCount,
          conversionRate,
          premiumUsers: 0
        },
        revenueChart,
        health: {
          status: "operational",
          database: "operational",
          smtp: "operational",
          ai: "operational"
        }
      });
    }

    // PLATFORM PRODUCT ANALYTICS
    if (path === "/api/admin/analytics" && method === "GET") {
      const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get("days") || "30", 10)));
      const analyticsData = await getPlatformAnalytics(env, days);
      return json({ success: true, analytics: analyticsData });
    }

    // TRIGGER RETENTION PRUNING
    if (path === "/api/admin/analytics/prune" && method === "POST") {
      const body = await readJsonBody(request);
      const retentionDays = parseInt(body.retention_days || "30", 10);
      const pruneResult = await pruneRawEvents(env, retentionDays);
      await logAdminAction(env, adminEmail, "prune_raw_analytics", `Pruned raw events older than ${retentionDays} days`);
      return json({ success: true, ...pruneResult });
    }

    // TRIGGER DAILY AGGREGATION
    if (path === "/api/admin/analytics/aggregate" && method === "POST") {
      const body = await readJsonBody(request);
      const aggResult = await runDailyAggregation(env, body.date);
      await logAdminAction(env, adminEmail, "run_analytics_aggregation", `Aggregated metrics for date ${aggResult.targetDate}`);
      return json({ success: true, ...aggResult });
    }

    // USERS LIST
    if (path === "/api/admin/users" && method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
      const offset = (page - 1) * limit;
      const search = (url.searchParams.get("search") || "").trim();

      let query = `
        SELECT
          u.id, u.email, u.name, u.plan, u.plan_expires_at, u.created_at, u.is_blocked,
          COALESCE(u.ai_credits_balance, 0) as ai_credits_balance,
          COALESCE(u.ai_credits_monthly_limit, 20) as ai_credits_monthly_limit,
          COALESCE(u.ai_credits_used_month, 0) as ai_credits_used_month,
          (SELECT COUNT(*) FROM websites w WHERE w.user_id = u.id) as shopsCount,
          (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as ordersCount,
          (SELECT COUNT(*) FROM products p WHERE p.user_id = u.id) as productsCount,
          s.status as sub_status,
          s.current_period_end as sub_end,
          s.plan as sub_plan,
          s.payment_provider as sub_provider
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
      `;
      let countQuery = "SELECT COUNT(*) as total FROM users";
      const params = [];
      const countParams = [];

      if (search) {
        query += " WHERE u.email LIKE ? OR u.name LIKE ?";
        countQuery += " WHERE email LIKE ? OR name LIKE ?";
        params.push(`%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`);
      }

      query += " ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      let total = 0;
      try {
        const totalRow = await (countParams.length > 0 
          ? env.DB.prepare(countQuery).bind(...countParams).first()
          : env.DB.prepare(countQuery).first());
        total = totalRow?.total || 0;
      } catch (err) {
        console.warn("Could not count total users:", err);
      }

      const { results } = await env.DB.prepare(query).bind(...params).all();
      
      const formattedResults = (results || []).map(row => {
        const user = {
          id: row.id,
          email: row.email,
          name: row.name,
          plan: row.plan,
          created_at: row.created_at,
          is_blocked: row.is_blocked,
          shopsCount: row.shopsCount || 0,
          ordersCount: row.ordersCount || 0,
          productsCount: row.productsCount || 0,
          subscription_status: 'free',
          subscription_expires_at: row.plan_expires_at || null,
          subscription_plan: row.plan || 'free',
          payment_provider: null
        };

        if (row.sub_status) {
          user.subscription_status = row.sub_status;
          user.subscription_expires_at = row.sub_end || user.subscription_expires_at;
          user.subscription_plan = row.sub_plan || user.subscription_plan;
          user.payment_provider = row.sub_provider;
        } else if (user.plan && user.plan !== 'free') {
          user.subscription_status = 'active';
        }

        return user;
      });
      
      return json({ users: formattedResults, total, page, limit });
    }

    // USER STATUS (Block/Unblock)
    const userStatusMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (userStatusMatch && method === "PATCH") {
      const userId = userStatusMatch[1];
      const body = await readJsonBody(request);
      
      if (typeof body.is_blocked !== 'boolean') {
        throw new HttpError("is_blocked boolean is required", 400);
      }

      await env.DB.prepare("UPDATE users SET is_blocked = ? WHERE id = ?").bind(body.is_blocked ? 1 : 0, userId).run();
      await logAdminAction(env, adminEmail, body.is_blocked ? "BLOCK_USER" : "UNBLOCK_USER", "users", userId);
      
      return json({ success: true });
    }

    // USER PLAN & SUBSCRIPTION
    const userSubMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/subscription$/);
    if (userSubMatch && method === "PATCH") {
      const userId = userSubMatch[1];
      const body = await readJsonBody(request);
      const plan = body.plan || 'free';
      const status = body.status || (plan === 'free' ? 'free' : 'active');
      const expiresAt = body.expires_at || null;
      const now = new Date().toISOString();

      await env.DB.prepare(
        "UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = ? WHERE id = ?"
      ).bind(plan, expiresAt, now, userId).run();

      try {
        await env.DB.prepare(`
          INSERT INTO subscriptions (id, user_id, plan, status, current_period_end, updated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            plan = excluded.plan,
            status = excluded.status,
            current_period_end = excluded.current_period_end,
            updated_at = excluded.updated_at
        `).bind(crypto.randomUUID(), userId, plan, status, expiresAt, now, now).run();
      } catch (subErr) {
        console.warn("Could not upsert subscriptions table:", subErr);
      }

      await logAdminAction(env, adminEmail, "UPDATE_USER_SUBSCRIPTION", "users", userId, { plan, status, expiresAt });
      return json({ success: true, plan, status, expires_at: expiresAt });
    }

    // USER PLAN (Legacy / Shortcut)
    const userPlanMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/plan$/);
    if (userPlanMatch && method === "PATCH") {
      const userId = userPlanMatch[1];
      const body = await readJsonBody(request);
      
      if (!body.plan) throw new HttpError("plan is required", 400);

      await env.DB.prepare("UPDATE users SET plan = ? WHERE id = ?").bind(body.plan, userId).run();
      try {
        const now = new Date().toISOString();
        const status = body.plan === 'free' ? 'free' : 'active';
        await env.DB.prepare(`
          INSERT INTO subscriptions (id, user_id, plan, status, updated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            plan = excluded.plan,
            status = excluded.status,
            updated_at = excluded.updated_at
        `).bind(crypto.randomUUID(), userId, body.plan, status, now, now).run();
      } catch {}

      await logAdminAction(env, adminEmail, "UPDATE_USER_PLAN", "users", userId, { plan: body.plan });
      
      return json({ success: true });
    }

    // DELETE USER
    const userDeleteMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (userDeleteMatch && method === "DELETE") {
      const userId = userDeleteMatch[1];
      
      await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
      await logAdminAction(env, adminEmail, "DELETE_USER", "users", userId);
      
      return json({ success: true });
    }

    // SHOPS (Websites & Stores)
    if (path === "/api/admin/shops" && method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
      const offset = (page - 1) * limit;

      let total = 0;
      try {
        const totalRow = await env.DB.prepare(
          "SELECT COUNT(*) as total FROM users"
        ).first();
        total = totalRow?.total || 0;
      } catch (err) {
        console.warn("Could not count shops:", err);
      }

      let shopsList = [];
      try {
        const { results } = await env.DB.prepare(`
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
        `).bind(limit, offset).all();
        shopsList = results || [];
      } catch (shopErr) {
        console.warn("Could not query shops with websites join:", shopErr);
        try {
          const { results } = await env.DB.prepare(`
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
          `).bind(limit, offset).all();
          shopsList = results || [];
        } catch (fbErr) {
          console.error("Shops fallback query error:", fbErr);
        }
      }

      return json({ shops: shopsList, total, page, limit });
    }

    // ORDERS
    if (path === "/api/admin/orders" && method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
      const offset = (page - 1) * limit;
      const status = url.searchParams.get("status");

      let query = `
        SELECT o.*,
               COALESCE(org.name, u.business_name, u.name, 'Store') as shop_name,
               u.email as user_email
        FROM orders o
        LEFT JOIN organizations org ON o.organization_id = org.id
        LEFT JOIN users u ON o.user_id = u.id
      `;
      let countQuery = "SELECT COUNT(*) as total FROM orders o";
      const params = [];
      const countParams = [];

      if (status && status !== 'all') {
        query += " WHERE o.status = ?";
        countQuery += " WHERE o.status = ?";
        params.push(status);
        countParams.push(status);
      }

      query += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      let total = 0;
      try {
        const totalRow = await (countParams.length > 0 
          ? env.DB.prepare(countQuery).bind(...countParams).first()
          : env.DB.prepare(countQuery).first());
        total = totalRow?.total || 0;
      } catch (err) {
        console.warn("Could not count orders:", err);
      }

      const { results } = await env.DB.prepare(query).bind(...params).all();
      return json({ orders: results || [], total, page, limit });
    }

    // TICKETS
    if (path === "/api/admin/tickets" && method === "GET") {
      const { results } = await env.DB.prepare(`
        SELECT t.*, u.email as user_email, u.name as user_name 
        FROM tickets t 
        JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC
      `).all();
      return json({ tickets: results });
    }

    // TICKET REPLIES GET
    const ticketRepliesMatch = path.match(/^\/api\/admin\/tickets\/([^/]+)\/replies$/);
    if (ticketRepliesMatch && method === "GET") {
      const ticketId = ticketRepliesMatch[1];
      const { results } = await env.DB.prepare("SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC").bind(ticketId).all();
      return json({ replies: results });
    }

    // TICKET REPLY POST
    const ticketReplyMatch = path.match(/^\/api\/admin\/tickets\/([^/]+)\/reply$/);
    if (ticketReplyMatch && method === "POST") {
      const ticketId = ticketReplyMatch[1];
      const body = await readJsonBody(request);
      if (!body.content) throw new HttpError("content is required", 400);

      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO ticket_replies (id, ticket_id, sender_role, content, created_at) VALUES (?, ?, 'admin', ?, ?)")
        .bind(id, ticketId, body.content, new Date().toISOString())
        .run();
        
      await logAdminAction(env, adminEmail, "REPLY_TICKET", "tickets", ticketId);
      return json({ success: true });
    }
    
    // TICKET PATCH STATUS
    const ticketPatchMatch = path.match(/^\/api\/admin\/tickets\/([^/]+)$/);
    if (ticketPatchMatch && method === "PATCH") {
      const ticketId = ticketPatchMatch[1];
      const body = await readJsonBody(request);
      if (!body.status) throw new HttpError("status is required", 400);

      await env.DB.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?")
        .bind(body.status, new Date().toISOString(), ticketId)
        .run();
        
      await logAdminAction(env, adminEmail, "UPDATE_TICKET_STATUS", "tickets", ticketId, { status: body.status });
      return json({ success: true });
    }

    // FEATURE FLAGS
    if (path === "/api/admin/feature-flags" && method === "GET") {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS feature_flags (
            id TEXT PRIMARY KEY,
            flag_key TEXT UNIQUE NOT NULL,
            description TEXT,
            is_enabled INTEGER NOT NULL DEFAULT 0,
            rules_json TEXT,
            updated_at TEXT NOT NULL
          )
        `).run();
        const { results } = await env.DB.prepare("SELECT * FROM feature_flags ORDER BY updated_at DESC").all();
        return json({ flags: results || [], featureFlags: results || [] });
      } catch (err) {
        console.warn("Could not read feature_flags:", err);
        return json({ flags: [], featureFlags: [] });
      }
    }
    
    if (path === "/api/admin/feature-flags" && method === "POST") {
      const body = await readJsonBody(request);
      if (!body.flag_key) throw new HttpError("flag_key is required", 400);
      
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS feature_flags (
            id TEXT PRIMARY KEY,
            flag_key TEXT UNIQUE NOT NULL,
            description TEXT,
            is_enabled INTEGER NOT NULL DEFAULT 0,
            rules_json TEXT,
            updated_at TEXT NOT NULL
          )
        `).run();

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(`
          INSERT INTO feature_flags (id, flag_key, description, is_enabled, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(flag_key) DO UPDATE SET
            is_enabled = excluded.is_enabled,
            description = COALESCE(excluded.description, feature_flags.description),
            updated_at = excluded.updated_at
        `).bind(id, String(body.flag_key).trim(), body.description || "", body.is_enabled ? 1 : 0, now).run();
          
        await logAdminAction(env, adminEmail, "UPSERT_FEATURE_FLAG", "feature_flags", body.flag_key);
        return json({ success: true, flag_key: body.flag_key, is_enabled: Boolean(body.is_enabled) });
      } catch (err) {
        console.error("Failed to save feature flag:", err);
        throw new HttpError("Failed to save feature flag: " + (err.message || err), 500);
      }
    }

    // AI USAGE & CREDITS MONITOR
    if ((path === "/api/admin/ai-usage" || path === "/api/admin/ai-credits") && method === "GET") {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS ai_usage_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            model TEXT,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            cost REAL DEFAULT 0,
            credits_used INTEGER DEFAULT 0,
            usage_type TEXT,
            created_at TEXT NOT NULL
          )
        `).run();

        const search = (url.searchParams.get("search") || "").trim().toLowerCase();

        // 1. Overall Aggregates
        let totalUsageRow = { total_calls: 0, total_credits_used: 0, total_tokens: 0 };
        try {
          const row = await env.DB.prepare(`
            SELECT 
              COUNT(*) as total_calls, 
              COALESCE(SUM(credits_used), 0) as total_credits_used,
              COALESCE(SUM(prompt_tokens + completion_tokens), 0) as total_tokens
            FROM ai_usage_logs
          `).first();
          if (row) totalUsageRow = row;
        } catch {}

        let monthUsageRow = { month_calls: 0, month_credits_used: 0 };
        try {
          const row = await env.DB.prepare(`
            SELECT 
              COUNT(*) as month_calls, 
              COALESCE(SUM(credits_used), 0) as month_credits_used
            FROM ai_usage_logs
            WHERE created_at >= datetime('now', '-30 days')
          `).first();
          if (row) monthUsageRow = row;
        } catch {}

        let todayUsageRow = { today_calls: 0, today_credits_used: 0 };
        try {
          const row = await env.DB.prepare(`
            SELECT 
              COUNT(*) as today_calls, 
              COALESCE(SUM(credits_used), 0) as today_credits_used
            FROM ai_usage_logs
            WHERE created_at >= datetime('now', 'start of day')
          `).first();
          if (row) todayUsageRow = row;
        } catch {}

        let balancesRow = { total_merchants: 0, total_balance_remaining: 0, depleted_merchants: 0, low_balance_merchants: 0 };
        try {
          const row = await env.DB.prepare(`
            SELECT 
              COUNT(*) as total_merchants,
              COALESCE(SUM(ai_credits_balance), 0) as total_balance_remaining,
              COUNT(CASE WHEN ai_credits_balance <= 0 THEN 1 END) as depleted_merchants,
              COUNT(CASE WHEN ai_credits_balance > 0 AND ai_credits_balance <= 10 THEN 1 END) as low_balance_merchants
            FROM users
          `).first();
          if (row) balancesRow = row;
        } catch {}

        let purchasesRow = { total_credits_purchased: 0, total_revenue: 0, purchase_count: 0 };
        try {
          const row = await env.DB.prepare(`
            SELECT 
              COALESCE(SUM(credits), 0) as total_credits_purchased,
              COALESCE(SUM(amount), 0) as total_revenue,
              COUNT(*) as purchase_count
            FROM ai_credit_purchases
            WHERE status = 'completed'
          `).first();
          if (row) purchasesRow = row;
        } catch {}

        let activeShopkeepersCount = 0;
        try {
          const row = await env.DB.prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM ai_usage_logs").first();
          activeShopkeepersCount = row?.cnt || 0;
        } catch {}

        // 2. Per-Shopkeeper breakdown
        let shopkeepers = [];
        try {
          let sql = `
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
          if (search) {
            sql += ` WHERE (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.business_name) LIKE ? OR LOWER(u.subdomain) LIKE ?) `;
            sql += ` GROUP BY u.id, u.name, u.email, u.business_name, u.phone, u.subdomain, u.plan, u.ai_credits_balance, u.ai_credits_monthly_limit, u.ai_credits_used_month, u.ai_credits_reset_at, u.created_at ORDER BY total_credits_used DESC, u.ai_credits_balance ASC`;
            const sParam = `%${search}%`;
            const { results } = await env.DB.prepare(sql).bind(sParam, sParam, sParam, sParam).all();
            shopkeepers = results || [];
          } else {
            sql += ` GROUP BY u.id, u.name, u.email, u.business_name, u.phone, u.subdomain, u.plan, u.ai_credits_balance, u.ai_credits_monthly_limit, u.ai_credits_used_month, u.ai_credits_reset_at, u.created_at ORDER BY total_credits_used DESC, u.ai_credits_balance ASC`;
            const { results } = await env.DB.prepare(sql).all();
            shopkeepers = results || [];
          }
        } catch (skErr) {
          console.warn("Could not query shopkeepers for AI usage:", skErr);
        }

        // 3. Breakdown by Capability / Usage Type
        let byUsageType = [];
        try {
          const { results } = await env.DB.prepare(`
            SELECT usage_type, COUNT(*) as calls, SUM(credits_used) as credits_used, SUM(prompt_tokens + completion_tokens) as tokens
            FROM ai_usage_logs
            GROUP BY usage_type
            ORDER BY credits_used DESC
          `).all();
          byUsageType = results || [];
        } catch {}

        // 4. Breakdown by Model
        let stats = [];
        try {
          const { results } = await env.DB.prepare(`
            SELECT model, COUNT(*) as count, SUM(cost) as total_cost, SUM(credits_used) as credits_used
            FROM ai_usage_logs
            GROUP BY model
            ORDER BY count DESC
          `).all();
          stats = results || [];
        } catch {}

        // 5. Daily Trend (last 14 days)
        let dailyTrend = [];
        try {
          const { results } = await env.DB.prepare(`
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
          dailyTrend = results || [];
        } catch {}

        // 6. Recent Logs
        let logs = [];
        try {
          const { results } = await env.DB.prepare(`
            SELECT l.*, u.name as user_name, u.email, COALESCE(u.business_name, u.name, 'Shop') as business_name, u.subdomain, u.ai_credits_balance
            FROM ai_usage_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC LIMIT 100
          `).all();
          logs = results || [];
        } catch {
          const { results } = await env.DB.prepare("SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 100").all();
          logs = results || [];
        }

        // 7. Recent Purchases
        let recentPurchases = [];
        try {
          const { results } = await env.DB.prepare(`
            SELECT p.*, u.email, u.name as user_name, COALESCE(u.business_name, u.name, 'Shop') as business_name
            FROM ai_credit_purchases p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC LIMIT 50
          `).all();
          recentPurchases = results || [];
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

        return json({
          summary,
          shopkeepers,
          byShop,
          byUsageType,
          stats,
          byModel: stats,
          dailyTrend,
          logs,
          usage: logs,
          recentPurchases
        });
      } catch (err) {
        console.warn("Could not query ai_usage_logs:", err);
        return json({
          summary: { totalCreditsUsed: 0, totalCalls: 0, monthCreditsUsed: 0, totalBalanceRemaining: 0, activeShopkeepersCount: 0 },
          shopkeepers: [],
          byShop: [],
          byUsageType: [],
          stats: [],
          byModel: [],
          dailyTrend: [],
          logs: [],
          usage: [],
          recentPurchases: []
        });
      }
    }

    // AI CREDITS ADJUSTMENT POST /api/admin/users/:id/ai-credits
    const userAiCreditsMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/ai-credits$/);
    if (userAiCreditsMatch && method === "POST") {
      const targetUserId = userAiCreditsMatch[1];
      const body = await readJsonBody(request);
      const parsedCredits = parseInt(body.credits, 10);
      const mode = body.mode || "add";
      const reason = body.reason || "Admin manual credit adjustment";

      if (isNaN(parsedCredits)) {
        throw new HttpError("Valid integer credits amount is required", 400);
      }

      const user = await env.DB.prepare("SELECT id, name, email, business_name, ai_credits_balance FROM users WHERE id = ?").bind(targetUserId).first();
      if (!user) {
        throw new HttpError("Shopkeeper not found", 404);
      }

      const prevBalance = user.ai_credits_balance || 0;
      let newBalance = prevBalance;

      if (mode === "add") {
        if (parsedCredits === 0) throw new HttpError("Credits to add must be non-zero", 400);
        newBalance = Math.max(0, prevBalance + parsedCredits);
      } else if (mode === "set") {
        if (parsedCredits < 0) throw new HttpError("Credits balance cannot be negative", 400);
        newBalance = parsedCredits;
      } else {
        throw new HttpError("Invalid mode. Must be 'add' or 'set'", 400);
      }

      const now = new Date().toISOString();
      await env.DB.prepare("UPDATE users SET ai_credits_balance = ?, updated_at = ? WHERE id = ?")
        .bind(newBalance, now, targetUserId)
        .run();

      await logAdminAction(env, adminEmail, "user.ai_credits_adjust", "users", targetUserId, {
        mode,
        credits: parsedCredits,
        previous_balance: prevBalance,
        new_balance: newBalance,
        reason
      });

      return json({
        success: true,
        user_id: targetUserId,
        mode,
        previous_balance: prevBalance,
        new_balance: newBalance,
        credits_adjusted: newBalance - prevBalance,
        message: `Updated AI credit balance for ${user.business_name || user.name} to ${newBalance}`
      });
    }

    // MERCHANT FEEDBACK & SURVEYS
    if (path === "/api/admin/feedback" && method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10));
      const offset = (page - 1) * limit;

      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS survey_submissions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            answers_json TEXT,
            feedback TEXT,
            contact TEXT,
            ai_summary_json TEXT,
            created_at TEXT NOT NULL
          )
        `).run();

        let total = 0;
        try {
          const countRow = await env.DB.prepare("SELECT COUNT(*) as total FROM survey_submissions").first();
          total = countRow?.total || 0;
        } catch {}

        let feedbackList = [];
        try {
          const { results } = await env.DB.prepare(`
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
          `).bind(limit, offset).all();
          feedbackList = results || [];
        } catch {
          const { results } = await env.DB.prepare(`
            SELECT * FROM survey_submissions ORDER BY created_at DESC LIMIT ? OFFSET ?
          `).bind(limit, offset).all();
          feedbackList = results || [];
        }

        return json({ feedback: feedbackList, total, page, limit });
      } catch (err) {
        console.warn("Could not load feedback:", err);
        return json({ feedback: [], total: 0, page, limit });
      }
    }

    // MEETINGS
    if (path === "/api/admin/meetings" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM meetings ORDER BY created_at DESC").all();
      return json({ meetings: results || [] });
    }

    const meetingPatchMatch = path.match(/^\/api\/admin\/meetings\/([^/]+)$/);
    if (meetingPatchMatch && method === "PATCH") {
      const meetingId = meetingPatchMatch[1];
      const body = await readJsonBody(request);
      if (!body.status) throw new HttpError("status is required", 400);

      await env.DB.prepare("UPDATE meetings SET status = ? WHERE id = ?")
        .bind(body.status, meetingId)
        .run();
        
      await logAdminAction(env, adminEmail, "UPDATE_MEETING_STATUS", "meetings", meetingId, { status: body.status });
      return json({ success: true });
    }

    // SHARDS & HORIZONTAL PARTITIONING
    if (path === "/api/admin/shards" && method === "GET") {
      const { results } = await env.DB.prepare(`
        SELECT id, shard_key, market, d1_database_id, d1_database_name, r2_bucket_name,
               status, shop_count, d1_used_bytes, d1_size_checked_at, r2_used_bytes,
               created_at, updated_at
        FROM shards
        ORDER BY market ASC, shard_key ASC
      `).all();
      return json({ shards: results || [] });
    }

    if (path === "/api/admin/shards/provision" && method === "POST") {
      const body = await readJsonBody(request);
      const market = (body.market || "IN").toUpperCase().trim();
      if (!VALID_MARKETS.includes(market)) {
        throw new HttpError(`Invalid market: ${market}. Must be one of: ${VALID_MARKETS.join(", ")}`, 400);
      }

      const newShard = await provisionNewShard(market, env);
      await logAdminAction(env, adminEmail, "PROVISION_SHARD", "shards", newShard.id, {
        shard_key: newShard.shard_key,
        market: newShard.market,
      });
      return json({ success: true, shard: newShard }, 201);
    }

    const shardPatchMatch = path.match(/^\/api\/admin\/shards\/([^/]+)\/status$/);
    if (shardPatchMatch && method === "PATCH") {
      const shardId = shardPatchMatch[1];
      const body = await readJsonBody(request);
      if (!body.status) throw new HttpError("status is required", 400);

      const validStatuses = Object.values(SHARD_STATUS);
      if (!validStatuses.includes(body.status)) {
        throw new HttpError(`Invalid status '${body.status}'. Valid statuses: ${validStatuses.join(", ")}`, 400);
      }

      const nowIso = new Date().toISOString();
      await env.DB.prepare("UPDATE shards SET status = ?, updated_at = ? WHERE id = ?")
        .bind(body.status, nowIso, shardId)
        .run();

      await logAdminAction(env, adminEmail, "UPDATE_SHARD_STATUS", "shards", shardId, { status: body.status });
      return json({ success: true, shard_id: shardId, status: body.status });
    }

    // -------------------------------------------------------------------------
    // ERROR LOGS TICKET SYSTEM
    // -------------------------------------------------------------------------
    if (path === "/api/admin/error-logs" && method === "GET") {
      const statusParam = url.searchParams.get("status");
      let query = "SELECT * FROM error_logs";
      const params = [];
      if (statusParam && statusParam !== "all") {
        query += " WHERE status = ?";
        params.push(statusParam);
      }
      query += " ORDER BY created_at DESC LIMIT 100";
      try {
        const stmt = params.length > 0 ? env.DB.prepare(query).bind(...params) : env.DB.prepare(query);
        const res = await stmt.all();
        return json({ logs: res.results || [] });
      } catch (err) {
        console.warn("Error logs table query notice:", err?.message || err);
        return json({ logs: [] });
      }
    }

    const errResolveMatch = path.match(/^\/api\/admin\/error-logs\/([^/]+)\/resolve$/);
    if (errResolveMatch && method === "PATCH") {
      const logId = errResolveMatch[1];
      const nowIso = new Date().toISOString();
      await env.DB.prepare(
        "UPDATE error_logs SET status = 'resolved', resolved_by = ?, resolved_at = ? WHERE id = ?"
      ).bind(adminEmail, nowIso, logId).run();
      await logAdminAction(env, adminEmail, "RESOLVE_ERROR_LOG", "error_logs", logId);
      return json({ success: true, id: logId, status: "resolved", resolved_at: nowIso });
    }

    if (path === "/api/admin/error-logs" && method === "DELETE") {
      const status = url.searchParams.get("status");
      if (status && status !== "all") {
        await env.DB.prepare("DELETE FROM error_logs WHERE status = ?").bind(status).run();
      } else {
        await env.DB.prepare("DELETE FROM error_logs").run();
      }
      await logAdminAction(env, adminEmail, "CLEAR_ALL_ERROR_LOGS", "error_logs", status || "all");
      return json({ success: true });
    }

    const errDeleteMatch = path.match(/^\/api\/admin\/error-logs\/([^/]+)$/);
    if (errDeleteMatch && method === "DELETE") {
      const logId = errDeleteMatch[1];
      await env.DB.prepare("DELETE FROM error_logs WHERE id = ?").bind(logId).run();
      await logAdminAction(env, adminEmail, "DELETE_ERROR_LOG", "error_logs", logId);
      return json({ success: true, id: logId });
    }

    // -------------------------------------------------------------------------
    // EMAIL OPERATIONS DASHBOARD (Internal Admin Only)
    // -------------------------------------------------------------------------
    if (path === "/api/admin/email-operations" && method === "GET") {
      let platformDomain = null;
      let platformIdentities = [];
      let domainStats = { total: 0, verified: 0, pending: 0, failed: 0 };
      let verificationFailures = [];
      let eventsStats = { sent: 0, delivered: 0, bounced: 0, complaints: 0, failed: 0 };
      let recentFailures = [];

      try {
        platformDomain = await env.DB.prepare(
          "SELECT * FROM email_domains WHERE domain_type = 'PLATFORM'"
        ).first();

        const pIdents = await env.DB.prepare(
          "SELECT * FROM email_identities WHERE identity_type = 'PLATFORM'"
        ).all();
        platformIdentities = pIdents.results || [];

        const dStats = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN verification_status = 'VERIFIED' THEN 1 ELSE 0 END) as verified,
            SUM(CASE WHEN verification_status = 'PENDING' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN verification_status = 'FAILED' THEN 1 ELSE 0 END) as failed
          FROM email_domains
          WHERE domain_type = 'CUSTOM'
        `).first();

        if (dStats) {
          domainStats = {
            total: Number(dStats.total || 0),
            verified: Number(dStats.verified || 0),
            pending: Number(dStats.pending || 0),
            failed: Number(dStats.failed || 0)
          };
        }

        const failures = await env.DB.prepare(`
          SELECT id, organization_id, domain, verification_status, dkim_status, spf_status, dmarc_status, last_checked_at
          FROM email_domains
          WHERE domain_type = 'CUSTOM' AND verification_status != 'VERIFIED'
          ORDER BY updated_at DESC
          LIMIT 20
        `).all();
        verificationFailures = failures.results || [];

        const evStats = await env.DB.prepare(`
          SELECT 
            SUM(CASE WHEN event_type = 'SENT' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN event_type = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN event_type = 'BOUNCED' THEN 1 ELSE 0 END) as bounced,
            SUM(CASE WHEN event_type = 'COMPLAINT' THEN 1 ELSE 0 END) as complaints,
            SUM(CASE WHEN event_type = 'FAILED' THEN 1 ELSE 0 END) as failed
          FROM email_events
        `).first();

        if (evStats) {
          eventsStats = {
            sent: Number(evStats.sent || 0),
            delivered: Number(evStats.delivered || 0),
            bounced: Number(evStats.bounced || 0),
            complaints: Number(evStats.complaints || 0),
            failed: Number(evStats.failed || 0)
          };
        }

        const recentFails = await env.DB.prepare(`
          SELECT ee.*, em.subject, em.provider
          FROM email_events ee
          JOIN email_messages em ON ee.message_id = em.id
          WHERE ee.event_type IN ('FAILED', 'BOUNCED')
          ORDER BY ee.timestamp DESC
          LIMIT 20
        `).all();
        recentFailures = recentFails.results || [];
      } catch (err) {
        console.warn("Email operations query warning:", err?.message || err);
      }

      const totalAttempted = eventsStats.sent + eventsStats.delivered + eventsStats.failed + eventsStats.bounced;
      const bounceRate = totalAttempted > 0 ? ((eventsStats.bounced / totalAttempted) * 100).toFixed(2) : '0.00';

      return json({
        platformHealth: {
          status: platformDomain?.verification_status === 'VERIFIED' ? 'HEALTHY' : 'DEGRADED',
          domain: platformDomain?.domain || 'ferasetu.com',
          senders: platformIdentities.map(i => ({ email: i.email_address, name: i.display_name, status: i.status })),
          dkimSelector: platformDomain?.dkim_selector || 'fs1'
        },
        domainStats,
        verificationFailures,
        metrics: {
          ...eventsStats,
          bounceRate: `${bounceRate}%`,
          queueStatus: 'ACTIVE'
        },
        recentFailures
      });
    }

    // -------------------------------------------------------------------------
    // SEND OFFICIAL PLATFORM EMAIL (Internal Admin Only)
    // -------------------------------------------------------------------------
    if (path === "/api/admin/email/send-platform" && method === "POST") {
      const body = await readJsonBody(request);
      const to = String(body.to || '').trim();
      if (!to || !to.includes('@')) {
        throw new HttpError("Valid recipient email (to) is required", 422);
      }

      const from = body.from ? String(body.from).trim() : 'no-reply@ferasetu.com';
      const result = await EmailService.send(env, {
        organizationId: null, // Platform tenant
        from,
        to,
        subject: body.subject || 'Official Platform Notification • FeraSetu',
        html: body.html || `<p>${String(body.text || '')}</p>`,
        text: body.text || '',
        replyTo: body.replyTo || 'support@ferasetu.com',
        priority: body.priority || 'HIGH',
        idempotencyKey: body.idempotencyKey || null
      });

      await logAdminAction(env, adminEmail, "SEND_PLATFORM_EMAIL", "email_messages", result.messageId);

      return json({ success: true, message: "Platform email dispatched", result });
    }

    // Fallback for missing admin route
    return json({ error: "Admin route not found" }, 404);

  } catch (err) {
    if (err instanceof HttpError) {
      return json({ error: err.message }, err.status);
    }
    console.error("Admin route error:", err && err.stack ? err.stack : err);
    return json({ error: "Internal Server Error" }, 500);
  }
}

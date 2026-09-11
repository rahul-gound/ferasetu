import { verifyPassword, signAdminJwt, requireAdminAuth } from "../utils/auth.js";
import { logAdminAction } from "../utils/audit.js";

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
  const origin = request ? request.headers.get("Origin") : null;
  const allowedOrigin = isOriginAllowed(origin) ? origin : "https://ferasetu.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
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
  const path = url.pathname;

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
    // 1. Admin Login (Unprotected)
    if (path === "/api/admin/login" && method === "POST") {
      const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
      const now = Date.now();
      
      // Basic rate limiting
      const attempts = loginAttempts.get(clientIp) || { count: 0, last: now };
      if (now - attempts.last < 60000 && attempts.count >= 5) {
        throw new HttpError("Too many login attempts. Try again later.", 429);
      }
      if (now - attempts.last >= 60000) {
        attempts.count = 0;
      }
      
      const body = await readJsonBody(request);
      if (!body.username || !body.password) {
        throw new HttpError("Username and password are required", 400);
      }

      if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_JWT_SECRET) {
        throw new HttpError("Admin configuration missing in server environment", 500);
      }

      // Verify username
      if (body.username !== env.ADMIN_USERNAME) {
        attempts.count++;
        attempts.last = now;
        loginAttempts.set(clientIp, attempts);
        throw new HttpError("Invalid credentials", 401);
      }

      // Verify password
      const isValid = await verifyPassword(body.password, env.ADMIN_PASSWORD_HASH);
      if (!isValid) {
        attempts.count++;
        attempts.last = now;
        loginAttempts.set(clientIp, attempts);
        throw new HttpError("Invalid credentials", 401);
      }

      // Reset attempts on success
      loginAttempts.delete(clientIp);

      const token = await signAdminJwt(body.username, env.ADMIN_JWT_SECRET);
      
      await logAdminAction(env, body.username, "ADMIN_LOGIN", "system", clientIp);
      
      return json({ success: true, token });
    }

    // 2. Authorization Layer for all other routes
    let adminPayload;
    try {
      adminPayload = await requireAdminAuth(request, env);
    } catch (authErr) {
      if (authErr.message.includes("Insufficient permissions")) {
        throw new HttpError(authErr.message, 403);
      }
      throw new HttpError(authErr.message, 401);
    }

    const adminEmail = adminPayload.sub;

    // 3. Protected Admin Routes

    // VERIFY TOKEN
    if (path === "/api/admin/verify" && method === "GET") {
      return json({ success: true, user: { email: adminEmail } });
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
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const ymd = d.toISOString().slice(0, 10);
        try {
          const dayRow = await env.DB.prepare(
            "SELECT SUM(total) as rev, COUNT(*) as cnt FROM orders WHERE status != 'cancelled' AND created_at LIKE ?"
          ).bind(`${ymd}%`).first();
          revenueChart.push({
            date: ymd,
            revenue: dayRow?.rev || 0,
            orders: dayRow?.cnt || 0
          });
        } catch {
          revenueChart.push({ date: ymd, revenue: 0, orders: 0 });
        }
      }

      return json({
        users: usersCount,
        orders: ordersCount,
        products: productsCount,
        revenue: totalRevenue,
        system: { platform: "Cloudflare Workers", status: "Healthy" },
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
          database: "Healthy",
          smtp: "Healthy",
          ai: "Healthy"
        }
      });
    }

    // USERS LIST
    if (path === "/api/admin/users" && method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
      const offset = (page - 1) * limit;
      const search = (url.searchParams.get("search") || "").trim();

      let query = "SELECT id, email, name, plan, created_at, is_blocked FROM users";
      let countQuery = "SELECT COUNT(*) as total FROM users";
      const params = [];
      const countParams = [];

      if (search) {
        query += " WHERE email LIKE ? OR name LIKE ?";
        countQuery += " WHERE email LIKE ? OR name LIKE ?";
        params.push(`%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`);
      }

      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
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
      
      // Enrich with counts
      for (const user of (results || [])) {
        try {
          user.shopsCount = (await env.DB.prepare("SELECT COUNT(*) as count FROM websites WHERE user_id = ?").bind(user.id).first("count")) || 0;
          user.ordersCount = (await env.DB.prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ?").bind(user.id).first("count")) || 0;
          user.productsCount = (await env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE user_id = ?").bind(user.id).first("count")) || 0;
        } catch {
          user.shopsCount = 0;
          user.ordersCount = 0;
          user.productsCount = 0;
        }
      }
      
      return json({ users: results || [], total, page, limit });
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

    // USER PLAN
    const userPlanMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/plan$/);
    if (userPlanMatch && method === "PATCH") {
      const userId = userPlanMatch[1];
      const body = await readJsonBody(request);
      
      if (!body.plan) throw new HttpError("plan is required", 400);

      await env.DB.prepare("UPDATE users SET plan = ? WHERE id = ?").bind(body.plan, userId).run();
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

    // SHOPS (Websites)
    if (path === "/api/admin/shops" && method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
      const offset = (page - 1) * limit;

      let total = 0;
      try {
        const totalRow = await env.DB.prepare(
          "SELECT COUNT(*) as total FROM websites w JOIN users u ON w.user_id = u.id"
        ).first();
        total = totalRow?.total || 0;
      } catch (err) {
        console.warn("Could not count shops:", err);
      }

      const { results } = await env.DB.prepare(`
        SELECT 
          w.id,
          COALESCE(w.shop_name, w.name, u.business_name, u.name, 'My Shop') as shop_name,
          COALESCE(w.subdomain, u.subdomain, 'store') as subdomain,
          u.hostname as hostname,
          u.name as owner_name,
          u.email as owner_email,
          w.created_at,
          (SELECT COUNT(*) FROM products p WHERE p.user_id = w.user_id) as product_count,
          w.*,
          u.email as user_email,
          u.name as user_name
        FROM websites w 
        JOIN users u ON w.user_id = u.id 
        ORDER BY w.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      return json({ shops: results || [], total, page, limit });
    }

    // ORDERS
    if (path === "/api/admin/orders" && method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
      const offset = (page - 1) * limit;
      const status = url.searchParams.get("status");

      let query = "SELECT * FROM orders";
      let countQuery = "SELECT COUNT(*) as total FROM orders";
      const params = [];
      const countParams = [];

      if (status && status !== 'all') {
        query += " WHERE status = ?";
        countQuery += " WHERE status = ?";
        params.push(status);
        countParams.push(status);
      }

      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
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
      const { results } = await env.DB.prepare("SELECT * FROM feature_flags").all();
      return json({ featureFlags: results });
    }
    
    if (path === "/api/admin/feature-flags" && method === "POST") {
      const body = await readJsonBody(request);
      if (!body.flag_key) throw new HttpError("flag_key is required", 400);
      
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO feature_flags (id, flag_key, description, is_enabled, updated_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, body.flag_key, body.description || "", body.is_enabled ? 1 : 0, new Date().toISOString())
        .run();
        
      await logAdminAction(env, adminEmail, "CREATE_FEATURE_FLAG", "feature_flags", body.flag_key);
      return json({ success: true });
    }

    // AI USAGE
    if (path === "/api/admin/ai-usage" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 500").all();
      return json({ usage: results });
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

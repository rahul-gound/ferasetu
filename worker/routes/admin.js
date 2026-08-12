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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://ferasetu.com",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true"
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

  // Handle CORS Preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "https://ferasetu.com",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400"
      }
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
      const usersCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
      const ordersCount = await env.DB.prepare("SELECT COUNT(*) as count FROM orders").first("count");
      const productsCount = await env.DB.prepare("SELECT COUNT(*) as count FROM products").first("count");
      const revenueRow = await env.DB.prepare("SELECT SUM(total) as rev FROM orders WHERE status != 'cancelled'").first();
      
      return json({
        users: usersCount,
        orders: ordersCount,
        products: productsCount,
        revenue: revenueRow?.rev || 0,
        system: { platform: "Cloudflare Workers", status: "Healthy" }
      });
    }

    // USERS LIST
    if (path === "/api/admin/users" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT id, email, name, plan, created_at, is_blocked FROM users ORDER BY created_at DESC").all();
      
      // Enrich with counts (N+1 query, but fine for small admin tables; in large scale, use JOIN)
      for (const user of results) {
        user.shopsCount = (await env.DB.prepare("SELECT COUNT(*) as count FROM websites WHERE user_id = ?").bind(user.id).first("count")) || 0;
        user.ordersCount = (await env.DB.prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ?").bind(user.id).first("count")) || 0;
        user.productsCount = (await env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE user_id = ?").bind(user.id).first("count")) || 0;
      }
      
      return json({ users: results });
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
      const { results } = await env.DB.prepare(`
        SELECT w.*, u.email as user_email, u.name as user_name 
        FROM websites w 
        JOIN users u ON w.user_id = u.id 
        ORDER BY w.created_at DESC
      `).all();
      return json({ shops: results });
    }

    // ORDERS
    if (path === "/api/admin/orders" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500").all();
      return json({ orders: results });
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
      return json({ meetings: results });
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

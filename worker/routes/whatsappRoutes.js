/**
 * FeraSetu WhatsApp Assistant Route Handlers
 * Authenticated REST endpoints for connection pairing, status, settings,
 * customer conversations, pending orders, and internal connector webhooks.
 */

import { requireOrgContext, HttpError, getCorsHeaders } from '../index.js';
import { WhatsAppService } from '../services/whatsappService.js';

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

function json(data, status = 200, headers = {}, request = null) {
  const corsHeaders = getCorsHeaders(request);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
      ...corsHeaders,
      ...headers
    }
  });
}

function parseLimit(value) {
  const parsed = Number.parseInt(value || "50", 10);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 50;
}

/**
 * Main dispatch handler for /api/whatsapp/* routes.
 */
export async function handleWhatsAppRoutes(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
  }

  const url = new URL(request.url);
  const method = request.method;
  const rawPath = url.pathname;
  const path = rawPath.replace(/\/+$/, "") || "/";

  const service = new WhatsAppService(env);

  // 1. Internal Webhook receiver from persistent connector (service-to-service auth)
  if (path === "/api/whatsapp/webhook" && method === "POST") {
    const internalSecret = env.WHATSAPP_INTERNAL_SECRET;
    if (!internalSecret) {
      throw new HttpError("WhatsApp webhook secret is not configured", 503);
    }
    const authHeader = request.headers.get("x-fera-internal-secret") || request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (authHeader !== internalSecret) {
      throw new HttpError("Unauthorized internal webhook call", 401);
    }

    const payload = await readJsonBody(request);
    await service.handleConnectorWebhook(payload);
    return json({ success: true, processed: true }, 200, {}, request);
  }

  // 2. All other routes require merchant organization authentication context
  const auth = await requireOrgContext(request, env);
  const orgId = auth.orgId;
  const userId = auth.userId;

  // GET /api/whatsapp/status
  if (path === "/api/whatsapp/status" && method === "GET") {
    const status = await service.getSessionStatus(orgId, userId);
    return json(status, 200, {}, request);
  }

  // POST /api/whatsapp/connect
  if (path === "/api/whatsapp/connect" && method === "POST") {
    const body = await readJsonBody(request).catch(() => ({}));
    if (body.disclosureAcknowledged !== true) {
      throw new HttpError("Acknowledge the WhatsApp connection disclosure before pairing", 400);
    }
    await service.recordAuditLog(orgId, 'disclosure_accepted', {
      userId,
      timestamp: new Date().toISOString()
    });

    const conn = await service.requestConnection(orgId, userId, body);
    return json(conn, 200, {}, request);
  }

  // GET /api/whatsapp/qr
  if (path === "/api/whatsapp/qr" && method === "GET") {
    const status = await service.getSessionStatus(orgId, userId);
    return json({
      status: status.status,
      qr_code_raw: status.qr_code_raw,
      qr_expires_at: status.qr_expires_at
    }, 200, {}, request);
  }

  // POST /api/whatsapp/disconnect
  if (path === "/api/whatsapp/disconnect" && method === "POST") {
    const res = await service.disconnect(orgId, userId);
    return json(res, 200, {}, request);
  }

  // PATCH /api/whatsapp/settings
  if (path === "/api/whatsapp/settings" && method === "PATCH") {
    const body = await readJsonBody(request);
    const updated = await service.updateSettings(orgId, userId, body);
    return json(updated, 200, {}, request);
  }

  // GET /api/whatsapp/conversations
  if (path === "/api/whatsapp/conversations" && method === "GET") {
    const limit = parseLimit(url.searchParams.get("limit"));
    const conversations = await service.listConversations(orgId, limit);
    return json({ conversations }, 200, {}, request);
  }

  // GET /api/whatsapp/conversations/:id/messages
  if (path.startsWith("/api/whatsapp/conversations/") && path.endsWith("/messages") && method === "GET") {
    const parts = path.split("/");
    const conversationId = parts[parts.length - 2];
    const limit = parseLimit(url.searchParams.get("limit"));
    const messages = await service.getConversationMessages(orgId, conversationId, limit);
    return json({ messages }, 200, {}, request);
  }

  // POST /api/whatsapp/conversations/:id/handover
  if (path.startsWith("/api/whatsapp/conversations/") && path.endsWith("/handover") && method === "POST") {
    const parts = path.split("/");
    const conversationId = parts[parts.length - 2];
    const body = await readJsonBody(request);
    const res = await service.setConversationHandover(orgId, conversationId, body);
    return json(res, 200, {}, request);
  }

  // GET /api/whatsapp/orders
  if (path === "/api/whatsapp/orders" && method === "GET") {
    const limit = parseLimit(url.searchParams.get("limit"));
    const orders = await service.listOrderRequests(orgId, limit);
    return json({ orders }, 200, {}, request);
  }

  // PATCH /api/whatsapp/orders/:id/status
  if (path.startsWith("/api/whatsapp/orders/") && path.endsWith("/status") && method === "PATCH") {
    const parts = path.split("/");
    const orderRequestId = parts[parts.length - 2];
    const body = await readJsonBody(request);
    if (!['confirmed', 'rejected', 'cancelled'].includes(body.status)) {
      throw new HttpError("Order status must be confirmed, rejected, or cancelled", 400);
    }
    const res = await service.updateOrderRequestStatus(orgId, orderRequestId, body.status);
    return json(res, 200, {}, request);
  }

  throw new HttpError(`Unknown WhatsApp endpoint: ${method} ${path}`, 404);
}

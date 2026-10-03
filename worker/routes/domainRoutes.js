/**
 * FeraSetu Domain Management REST API Routes
 * worker/routes/domainRoutes.js
 * =============================================================================
 * Handles:
 * - GET / POST  /api/domains/search
 * - GET / POST  /api/domains/pricing
 * - GET         /api/domains
 * - POST        /api/domains/purchase/initiate
 * - POST        /api/domains/purchase/verify
 * - POST        /api/domains/connect
 * - POST        /api/domains/:id/verify
 * - DELETE      /api/domains/:id
 * =============================================================================
 */

import { requireOrgContext, HttpError } from '../index.js';
import { DomainService, createDomainService } from '../services/domainService.js';

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Robots-Tag": "noindex, nofollow",
      ...headers
    }
  });
}

export async function handleDomainRoutes(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const rawPath = url.pathname;
  let path = rawPath.replace(/\/+$/, "") || "/";
  if (!path.startsWith("/api/")) {
    path = "/api" + path;
  }

  const domainService = createDomainService(env);

  // 1. Domain Search (Public / Authenticated)
  if (path === "/api/domains/search") {
    let query = "";
    if (method === "GET") {
      query = url.searchParams.get("q") || url.searchParams.get("query") || "";
    } else if (method === "POST") {
      const body = await readJson(request);
      query = body.query || body.q || "";
    } else {
      throw new HttpError("Method not allowed", 405);
    }

    if (!query || typeof query !== "string" || !query.trim()) {
      throw new HttpError("Query string is required for domain search", 400);
    }

    try {
      const results = await domainService.search(query);
      return json({ results }, 200);
    } catch (err) {
      throw new HttpError(err.message, 400);
    }
  }

  // 2. Authoritative Pricing (Public / Authenticated)
  if (path === "/api/domains/pricing") {
    let domain = "";
    if (method === "GET") {
      domain = url.searchParams.get("domain") || "";
    } else if (method === "POST") {
      const body = await readJson(request);
      domain = body.domain || "";
    } else {
      throw new HttpError("Method not allowed", 405);
    }

    if (!domain) {
      throw new HttpError("Domain name is required", 400);
    }

    try {
      const pricing = await domainService.getPricing(domain);
      return json({ ...pricing, pricing }, 200);
    } catch (err) {
      throw new HttpError(err.message, 400);
    }
  }

  // All remaining routes require authenticated merchant context
  const ctx = await requireOrgContext(request, env, 'staff');
  const orgId = ctx.organizationId;
  const db = env.DB;
  const user = ctx.user || { id: orgId, email: 'merchant@ferasetu.com' };

  // 3. GET /api/domains - List domains for organization
  if (path === "/api/domains" && method === "GET") {
    const domains = await domainService.listDomains(orgId, db);
    return json({ domains }, 200);
  }

  // 4. POST /api/domains/purchase/initiate
  if (path === "/api/domains/purchase/initiate" && method === "POST") {
    const body = await readJson(request);
    const domain = String(body.domain || '').trim();
    const years = Number(body.years) || 1;
    const clientAmount = body.clientAmount !== undefined 
      ? Number(body.clientAmount) 
      : (body.amount !== undefined ? Number(body.amount) : undefined);

    if (!domain) {
      throw new HttpError("Domain name is required", 400);
    }

    try {
      const order = await domainService.initiatePurchase({
        organizationId: orgId,
        domain,
        years,
        clientAmount,
        db,
        user,
        customerDetails: { email: user?.email, phone: user?.phone }
      });
      return json({ success: true, order, ...order }, 201);
    } catch (err) {
      const status = err.status || (err.message.includes("Price tampering") ? 400 : 422);
      throw new HttpError(err.message, status);
    }
  }

  // 5. POST /api/domains/purchase/verify
  if (path === "/api/domains/purchase/verify" && method === "POST") {
    const body = await readJson(request);
    const orderId = String(body.orderId || '').trim();
    const domain = String(body.domain || '').trim();
    const cashfreeStatus = body.cashfreeStatus ? String(body.cashfreeStatus).trim() : undefined;

    if (!orderId || !domain) {
      throw new HttpError("orderId and domain are required", 400);
    }

    try {
      const result = await domainService.verifyPurchase({
        organizationId: orgId,
        orderId,
        domain,
        db,
        cashfreeStatus
      });
      return json(result, 200);
    } catch (err) {
      throw new HttpError(err.message, err.status || 400);
    }
  }

  // 6. POST /api/domains/connect - Connect external domain
  if (path === "/api/domains/connect" && method === "POST") {
    const body = await readJson(request);
    const domain = String(body.domain || '').trim();
    if (!domain) {
      throw new HttpError("Domain name is required", 400);
    }

    try {
      const result = await domainService.connectExternalDomain(orgId, domain, db);
      return json(result, 201);
    } catch (err) {
      throw new HttpError(err.message, err.status || 400);
    }
  }

  // 7. POST /api/domains/:id/verify
  const verifyMatch = path.match(/^\/api\/domains\/([^/]+)\/verify$/);
  if (verifyMatch && method === "POST") {
    const domainId = verifyMatch[1];
    try {
      const result = await domainService.verifyDomain(orgId, domainId, db);
      return json(result, 200);
    } catch (err) {
      throw new HttpError(err.message, err.status || 400);
    }
  }

  // 8. DELETE /api/domains/:id
  const deleteMatch = path.match(/^\/api\/domains\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const domainId = deleteMatch[1];
    try {
      const result = await domainService.disconnectDomain(orgId, domainId, db);
      return json(result, 200);
    } catch (err) {
      throw new HttpError(err.message, err.status || 404);
    }
  }

  // 9. GET /api/domains/:id - Get specific domain details & DNS records
  if (deleteMatch && method === "GET") {
    const domainId = deleteMatch[1];
    const domainRow = await db.prepare(
      "SELECT * FROM email_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, orgId).first();

    if (!domainRow) {
      throw new HttpError("Domain not found or unauthorized", 404);
    }

    const { generateDnsInstructions } = await import('../services/dnsVerification.js');
    const instructions = generateDnsInstructions(domainRow.domain, domainRow.verification_token_hash, domainRow.dkim_selector);
    return json({ domain: domainRow, dnsInstructions: instructions, instructions }, 200);
  }

  throw new HttpError("Endpoint not found", 404);
}

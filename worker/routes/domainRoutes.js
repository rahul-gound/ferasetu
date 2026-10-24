/**
 * FeraSetu Domain Management REST API Routes
 * worker/routes/domainRoutes.js
 * =============================================================================
 * Handles:
 * - GET         /api/domains/config             (Feature flags & ingress targets)
 * - GET         /api/domains/ingress/verify      (Reverse-proxy On-Demand TLS admission webhook)
 * - GET / POST  /api/domains/search             (Spaceship live bulk availability)
 * - GET / POST  /api/domains/pricing            (Spaceship authoritative pricing)
 * - GET         /api/domains                    (List organization domains)
 * - POST        /api/domains/purchase/initiate  (Spaceship checkout order creation)
 * - POST        /api/domains/purchase/verify    (Spaceship registration confirmation)
 * - POST        /api/domains/connect            (Connect external domain)
 * - POST        /api/domains/:id/verify         (DoH DNS ownership verification)
 * - POST        /api/domains/:id/verify-dns     (DoH DNS ownership verification)
 * - POST        /api/domains/:id/verify-tls     (HTTPS readiness & TLS probe)
 * - POST        /api/domains/:id/auto-dns       (Auto-apply Spaceship DNS records)
 * - GET         /api/domains/:id                (Get domain details & instructions)
 * - DELETE      /api/domains/:id                (Disconnect domain with audit logging)
 * =============================================================================
 */

import { requireOrgContext, HttpError } from '../index.js';
import { DomainService, createDomainService } from '../services/domainService.js';
import { verifyIngressAuthorization, INGRESS_HOSTNAME_TARGET, generateStorefrontDnsInstructions } from '../services/domainIngressService.js';

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

  // 0. Public Ingress Admission Webhook for TLS Reverse Proxies (Caddy On-Demand TLS 'ask' / Envoy)
  // GET /api/domains/ingress/verify?domain=sweetshop.com
  if (path === "/api/domains/ingress/verify" && method === "GET") {
    const domainToVerify = url.searchParams.get("domain") || "";
    const authResult = await verifyIngressAuthorization(env.DB, domainToVerify);
    if (authResult.allowed) {
      return new Response("Allowed", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response(authResult.reason || "Forbidden", { status: 403, headers: { "Content-Type": "text/plain" } });
  }

  // 0b. Public Domain System Configuration & Feature Flags
  // GET /api/domains/config
  if (path === "/api/domains/config" && method === "GET") {
    return json({
      provider: "SPACESHIP",
      checkoutEnabled: domainService.getCheckoutProvider().isCheckoutEnabled(),
      ingressTarget: INGRESS_HOSTNAME_TARGET,
      directCustomerCheckoutMessage: "Spaceship-hosted checkout directs payments straight to Spaceship. Awaiting commercial partner activation.",
      requiresCloudflareForSaas: false,
    }, 200);
  }

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

  // All remaining routes require authenticated merchant staff context
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
    const registrantContact = body.registrantContact || { email: user?.email, name: user?.name };

    if (!domain) {
      throw new HttpError("Domain name is required", 400);
    }

    try {
      const order = await domainService.initiatePurchase({
        organizationId: orgId,
        shopId: user?.shop_id || user?.id,
        domain,
        years,
        registrantContact,
        db,
        user
      });
      return json({ success: true, order, ...order }, 201);
    } catch (err) {
      const status = err.status || 422;
      throw new HttpError(err.message, status);
    }
  }

  // 5. POST /api/domains/purchase/verify
  if (path === "/api/domains/purchase/verify" && method === "POST") {
    const body = await readJson(request);
    const orderId = String(body.orderId || '').trim();
    const domain = String(body.domain || '').trim();

    if (!domain) {
      throw new HttpError("domain is required", 400);
    }

    try {
      const result = await domainService.verifyPurchase({
        organizationId: orgId,
        orderId,
        domain,
        db
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
      const result = await domainService.connectExternalDomain(orgId, domain, db, user?.shop_id || user?.id);
      return json(result, 201);
    } catch (err) {
      throw new HttpError(err.message, err.status || 400);
    }
  }

  // 7. POST /api/domains/:id/verify or /api/domains/:id/verify-dns
  const verifyMatch = path.match(/^\/api\/domains\/([^/]+)\/(?:verify|verify-dns)$/);
  if (verifyMatch && method === "POST") {
    const domainId = verifyMatch[1];
    try {
      const result = await domainService.verifyDomainDns(orgId, domainId, db);
      return json(result, 200);
    } catch (err) {
      throw new HttpError(err.message, err.status || 400);
    }
  }

  // 8. POST /api/domains/:id/verify-tls
  const verifyTlsMatch = path.match(/^\/api\/domains\/([^/]+)\/verify-tls$/);
  if (verifyTlsMatch && method === "POST") {
    const domainId = verifyTlsMatch[1];
    try {
      const result = await DomainService.verifyDomainTls(db, orgId, domainId);
      return json(result, 200);
    } catch (err) {
      throw new HttpError(err.message, err.status || 400);
    }
  }

  // 9. POST /api/domains/:id/auto-dns
  const autoDnsMatch = path.match(/^\/api\/domains\/([^/]+)\/auto-dns$/);
  if (autoDnsMatch && method === "POST") {
    const domainId = autoDnsMatch[1];
    try {
      const result = await domainService.autoConfigureSpaceshipDns(orgId, domainId, db);
      return json(result, 200);
    } catch (err) {
      throw new HttpError(err.message, err.status || 400);
    }
  }

  // 10. DELETE /api/domains/:id
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

  // 11. GET /api/domains/:id - Get specific domain details & DNS records
  if (deleteMatch && method === "GET") {
    const domainId = deleteMatch[1];

    // Check custom_storefront_domains
    const csdRow = await db.prepare(
      "SELECT * FROM custom_storefront_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, orgId).first();

    if (csdRow) {
      const instructions = generateStorefrontDnsInstructions(csdRow.domain, csdRow.ownership_token);
      return json({
        domain: csdRow,
        dnsInstructions: instructions,
        instructions
      }, 200);
    }

    // Check email_domains
    const emailRow = await db.prepare(
      "SELECT * FROM email_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, orgId).first();

    if (emailRow) {
      const instructions = generateStorefrontDnsInstructions(emailRow.domain, emailRow.verification_token_hash || 'token');
      return json({
        domain: emailRow,
        dnsInstructions: instructions,
        instructions
      }, 200);
    }

    throw new HttpError("Domain not found or unauthorized", 404);
  }

  throw new HttpError("Endpoint not found", 404);
}

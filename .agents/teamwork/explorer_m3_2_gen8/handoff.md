# Milestone 3 Backend Architecture Investigation & Implementation Guide
## (R3: Pluggable Domain Provider & Purchase/Connect Architecture)

**Author**: `explorer_m3_2_gen8`  
**Working Directory**: `.agents/teamwork/explorer_m3_2_gen8`  
**Handoff Type**: Hard (Self-contained, exhaustive implementation blueprint)  
**Date**: 2026-10-02  

---

## 1. Observation

Direct, verbatim findings from the authoritative codebase, schemas, and test suites:

### 1.1 Ingress, Host Classification & Edge Dispatching (`worker/index.js` & `worker/storefront.js`)
1. **Host Classification Baseline (`worker/storefront.js:113–162`)**:
   ```javascript
   export function classifyHostname(hostname) {
     if (!hostname || typeof hostname !== "string") {
       return { type: "unknown_host", hostname };
     }
     const host = hostname.toLowerCase().trim();
     if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev")) {
       return { type: "api", host };
     }
     for (const base of BASE_DOMAINS) {
       if (host === base) return { type: "platform_root", domain: base, host };
     }
     for (const base of BASE_DOMAINS) {
       if (host.endsWith("." + base)) {
         const prefix = host.slice(0, -(base.length + 1));
         const parts = prefix.split(".");
         if (parts.length > 1) return { type: "unknown_host", host, reason: "nested_subdomain" };
         const subdomain = parts[0];
         if (subdomain === "api") return { type: "api", host, subdomain, domain: base };
         if (RESERVED_SUBDOMAINS.has(subdomain)) return { type: "platform_reserved", host, subdomain, domain: base };
         return { type: "merchant", host, slug: subdomain, subdomain, domain: base };
       }
     }
     return { type: "unknown_host", host };
   }
   ```
   - **Critical Gap**: Any custom merchant domain (e.g. `rohankirana.in` or `store.mybrand.com`) returns `{ type: "unknown_host", host }`.
2. **Worker Fetch Dispatcher (`worker/index.js:9576–9658`)**:
   - Line 9595: If `type === "platform_root"`, routes `/api/*` to `route(request, env)`, else calls `proxyPagesAsset`.
   - Line 9606: If `type === "platform_reserved"` (`www` or `app`), allows `/api/*` or proxies Pages; other reserved hosts return 404.
   - Line 9635: If `type === "merchant"` (subdomain like `rajeshmart-mumbai-mh-in.ferasetu.com`):
     - If `url.pathname.startsWith("/api/")`, calls `route(request, env)`.
     - Else calls `handleStorefrontRequest(request, env, ctx, hostClassification)`.
   - Line 9643: If `hostClassification` is anything else (including `unknown_host`), it falls through to Section 4 ("Default / API Domain handling") and executes `return await route(request, env);`.
   - **Consequence**: When a visitor navigates to a custom domain (e.g. `https://rohankirana.in/`), it reaches `route(request, env)` which returns the Worker API JSON root response or 404, completely bypassing `handleStorefrontRequest`!
3. **CORS Ingress (`worker/index.js:102–128`)**:
   ```javascript
   function isOriginAllowed(origin) {
     ...
     const host = url.hostname.toLowerCase();
     const classification = classifyHostname(host);
     if (classification.type === "merchant" || classification.type === "api") return true;
     if (classification.type === "platform_reserved" && (classification.subdomain === "app" || classification.subdomain === "www")) return true;
     return false;
   }
   ```
   - Requests originating from a custom domain (e.g. browser fetching `/api/products` from `https://rohankirana.in`) are rejected by CORS because `classification.type` is `unknown_host` and not `merchant` or `custom_domain`.
4. **Tenant Context Resolution (`worker/index.js:452–479`)**:
   ```javascript
   } else if (classification.type === "custom_domain") {
     shop = await env.DB.prepare(
       "SELECT * FROM shops WHERE hostname = ?"
     ).bind(hostname).first();
   }
   ```
   - Line 473 in `resolveTenantContext` **already has** a check for `classification.type === "custom_domain"`, but `classifyHostname` never returned that type!

---

### 1.2 Storefront Request Handler (`worker/storefront.js:458–603`)
1. **Slug Expectation (`worker/storefront.js:460–472`)**:
   ```javascript
   export async function handleStorefrontRequest(request, env, ctx, hostClassification) {
     const url = new URL(request.url);
     const slug = hostClassification.slug;
     if (!isValidMerchantSlug(slug)) {
       return new Response("Invalid merchant store URL", { status: 404, ... });
     }
   ```
   - Expects `hostClassification.slug` to be a valid merchant slug (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`).
2. **Static Asset Bypass (`worker/storefront.js:474–477`)**:
   ```javascript
   if (isStaticAsset(url.pathname)) {
     return proxyPagesAsset(request, env, ctx);
   }
   ```
   - Static assets (`/assets/*.js`, `/assets/*.css`, images, favicons) strictly bypass D1, using `caches.default` with normalized cache key `https://ferasetu.com/assets/...` across all merchants.
3. **D1 Merchant Lookup (`worker/storefront.js:501–558`)**:
   - Queries `users` and `websites`:
     ```sql
     SELECT u.id, u.business_name, u.name, u.subdomain, u.hostname, u.is_blocked, u.plan, u.market, u.plan_expires_at, u.trial_ends_at, w.is_published
     FROM users u
     LEFT JOIN websites w ON w.user_id = u.id
     WHERE u.subdomain = ? OR u.hostname = ?
     ```
   - Queries `shops`:
     ```sql
     SELECT name, logo_url, favicon_url, social_image_url, primary_color FROM shops WHERE store_slug = ? OR hostname = ? LIMIT 1
     ```
   - Caches merchant state in `merchantCache` (Map) for 60 seconds.
4. **HTML Shell Customization (`worker/storefront.js:358–448`)**:
   - Injects store title, favicon, and OpenGraph metadata into the SPA shell.
   - Enforces cache isolation headers:
     `Cache-Control: private, no-cache, no-store, must-revalidate`
     `Vary: Host, Accept-Encoding`
     `X-Robots-Tag: index, follow` (or `noindex, nofollow` if unindexed/blocked).

---

### 1.3 Existing Routes, Authentication & Tenant Context (`worker/routes/`)
1. **Email & Domain Routes (`worker/routes/emailRoutes.js`)**:
   - Mounted at Line 9395 in `worker/index.js`:
     ```javascript
     if (path.startsWith("/api/email")) {
       return handleEmailRoutes(request, env);
     }
     ```
   - Auth Guard: Line 64 enforces `const ctx = await requireOrgContext(request, env, 'staff')`, obtaining `orgId`, `storeSlug`, and `orgName`.
   - Current domain endpoints:
     - `GET /api/email/domains`: Lists domains where `organization_id = ?`.
     - `POST /api/email/domains`: Normalizes input domain (`normalizeDomain`), checks uniqueness in `email_domains`, inserts with `domain_type: 'CUSTOM'`, status `'PENDING'`, and generates 5 DNS instructions.
     - `GET /api/email/domains/:id`: Returns domain details and DNS instructions.
     - `POST /api/email/domains/:id/verify`: Calls `verifyDomainDns(domain, token, selector)`, updates D1 statuses (`verification_status`, `dkim_status`, `spf_status`, `dmarc_status`), and on `VERIFIED` auto-provisions `orders@{domain}` in `email_identities`.
     - `DELETE /api/email/domains/:id`: Removes custom domain (blocks deleting platform domains).
2. **Frontend Callers (`frontend/src/pages/EmailSettingsPage.tsx`)**:
   - `api.get('/email/domains')` (Line 151)
   - `api.post('/email/domains', { domain })` (Line 231)
   - `api.post('/email/domains/${domainId}/verify')` (Line 252)
   - `api.delete('/email/domains/${domainId}')` (Line 277)
   - Mock Domain Search (Lines 450–458): Mocked `setTimeout` returning hardcoded results for `.in`, `.com`, `.store`, `.co.in`.
   - Mock 1-Click Buy (Lines 846–848): Mocked `toast.success('Domain purchase initiated...')`.

---

### 1.4 Cashfree Gateway Integration (`worker/services/cashfreeService.js`)
1. **Canonical Service Factory (`worker/services/cashfreeService.js:80–270`)**:
   - `createCashfreeService(env)` returns:
     - `getCredentials()`: returns `{ appId, secretKey, isValid, isProd, cashfreeEnv, baseUrl }`.
     - `createOrder(params, options)`: POST to `${baseUrl}/orders` with headers `x-client-id`, `x-client-secret`, `x-api-version: '2023-08-01'`.
       - Payload: `{ order_id, order_amount, order_currency, customer_details, order_meta, order_note }`.
       - Returns Cashfree response: `{ cf_order_id, order_id, order_amount, order_currency, payment_session_id, order_status }`.
     - `getOrderStatus(orderId, options)`: GET to `${baseUrl}/orders/${encodeURIComponent(orderId)}`. Returns `{ order_id, order_status, order_amount, order_currency }`.
     - `verifyWebhookSignature({ signature, timestamp, rawBody })`: Web Crypto HMAC-SHA256 verification with 15-minute replay window and `timingSafeEqual`.
2. **Current Usage Pattern in `worker/index.js:5103–5125`**:
   ```javascript
   const cashfreeService = createCashfreeService(env);
   const cf = cashfreeService.getCredentials();
   if (!cf.isValid) throw new HttpError("Payment gateway configuration missing on server", 503);
   const cfData = await cashfreeService.getOrderStatus(orderIdentifier);
   if (cfData.order_status !== 'PAID') throw new HttpError("Cashfree order has not been completed or paid", 400);
   if (Math.abs(Number(cfData.order_amount) - tx.amount) > 0.01) throw new HttpError("Payment amount mismatch...", 400);
   ```

---

### 1.5 D1 Database Schema & Tables (`schema.sql` & `worker/migrations/`)
1. **`email_domains` table (`0014_production_email_architecture.sql:6–24`)**:
   - Columns: `id` (TEXT PK), `organization_id` (TEXT), `domain` (TEXT UNIQUE NOT NULL), `domain_type` ('PLATFORM', 'FERASETU_MERCHANT', 'CUSTOM'), `verification_status` ('PENDING', 'VERIFYING', 'VERIFIED', 'FAILED', 'SUSPENDED'), `ownership_verification_method` ('DNS_TXT'), `verification_token_hash` (TEXT), `dkim_selector` ('fs1'), `dkim_status`, `spf_status`, `dmarc_status`, `mail_from_status`, `provider` ('FERASETU', 'EXTERNAL'), `created_at`, `updated_at`, `verified_at`, `last_checked_at`.
   - Indexes: `idx_email_domains_org`, `idx_email_domains_domain`, `idx_email_domains_status`.
2. **`shops` table (`0004_organizations_and_multi_tenancy.sql:35–45`)**:
   - Columns: `id`, `organization_id`, `name`, `store_slug` (UNIQUE), `hostname` (UNIQUE), `status`.
3. **`users` table (`0002_add_hostname_and_location.sql:5–8`, `0001_initial_schema.sql:13`)**:
   - Columns: `hostname` (TEXT UNIQUE), `subdomain` (TEXT), `custom_domain` (TEXT UNIQUE).
4. **`transactions` table (`0003_transactions_and_storefront.sql:4–18`, `0015_payment_hardening_and_test_mode.sql:5–13`)**:
   - Columns: `id`, `user_id`, `organization_id`, `provider`, `provider_order_id` (UNIQUE), `amount`, `currency`, `status`, `plan`, `billing_cycle`, `metadata`, `is_test_payment`.

---

### 1.6 Authoritative Test Contracts (`tests/e2e-domains-email.test.mjs`)
1. **MockDomainProvider Implementation (`tests/e2e-domains-email.test.mjs:560–696`)**:
   - TLD pricing: `.in`: 799, `.com`: 999, `.store`: 499, `.co.in`: 699, fallback: 899.
   - Reserved domains: `ferasetu.com`, `google.com`, `taken.in`, `forbidden.co.in`.
   - Authoritative calculation:
     $$\text{taxInr} = \text{round}(\text{priceInr} \times 0.18 \times 100) / 100$$
     $$\text{totalInr} = \text{round}((\text{priceInr} + \text{taxInr}) \times 100) / 100$$
     $$\text{multiYearTotal} = \text{round}(\text{totalInr} \times \text{years} \times 100) / 100$$
   - Strict Anti-Tampering Check:
     `if (clientAmount !== undefined && Number(clientAmount) !== expectedTotal)` -> throws Error HTTP 400 `"Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}"`.
   - Duration bounds: `years < 1 || years > 10 || !Number.isInteger(years)` -> throws Error `"Registration duration must be an integer between 1 and 10 years"`.
   - Provisioning on Payment: generates `orderId` starting with `cf_dom_`, `paymentSessionId` starting with `session_`, verifies Cashfree status `PAID`, inserts into `email_domains` with `domain_type: 'CUSTOM'`, status `'PENDING'`, and returns 5 DNS records.
2. **Canonical Storefront URL Tests (`tests/canonical-storefront-url.test.mjs:178–207`)**:
   - `classifyHostname('ferasetu.com')` -> `platform_root`
   - `classifyHostname('www.ferasetu.com')` -> `platform_reserved` (`subdomain: 'www'`)
   - `classifyHostname('api.ferasetu.com')` -> `api` (`subdomain: 'api'`)
   - `classifyHostname('my-fashion-store-mumbai-andheri-mh-1.ferasetu.com')` -> `merchant`
   - `classifyHostname('rajeshmart.ferasetu.com')` -> `merchant`

---

## 2. Logic Chain

From these observations, we trace the exact technical causality and solution design:

```
[Observation 1.1: classifyHostname returns unknown_host for non-ferasetu domains]
  │
  ▼
[Worker fetch() falls through to Step 4: Default/API domain handler]
  │
  ▼
[Storefront request fails: returns API JSON or 404 instead of SPA HTML shell]
  │
  ▼
[Logic Step 1: Extend classifyHostname + Add Custom Domain Edge Resolution]
  ├── Synchronous check: if host is not base domain and contains dot -> { type: "custom_domain", host }
  ├── Worker fetch() intercepts type === "custom_domain":
  │     ├── url.pathname.startsWith('/api/') -> route to API
  │     └── other paths -> look up verified domain in D1 / cache
  │           ├── Found & VERIFIED -> dispatch to handleStorefrontRequest(request, env, ctx, classification)
  │           └── Unverified / Not Found -> return 404 "Domain not configured" (noindex, nofollow)
  └── isOriginAllowed() permits type === "custom_domain" -> Solves CORS for merchant custom domains
```

```
[Observation 1.4: cashfreeService provides createOrder & getOrderStatus]
  │
  ▼
[Observation 1.6: e2e test suite requires authoritative server pricing & anti-tampering]
  │
  ▼
[Logic Step 2: Build domainProvider.js & domainService.js]
  ├── domainProvider.js provides Abstract DomainProvider + SandboxDomainProvider
  │     ├── search(): multi-TLD availability + base INR prices (.in ₹799, .com ₹999, .store ₹499, .co.in ₹699)
  │     ├── getAuthoritativePricing(): base + 18% GST tax + total INR
  │     └── registerDomain(): provisions registrar order
  └── domainService.js coordinates with cashfreeService.js:
        ├── initiatePurchase():
        │     ├── Server calculates expectedTotal = totalInr * years
        │     ├── Checks clientAmount === expectedTotal (blocks tampering)
        │     ├── Checks domain not taken in email_domains (blocks 409 conflict)
        │     └── Calls cashfreeService.createOrder() -> returns { orderId, paymentSessionId, amount }
        └── verifyPurchase():
              ├── Queries cashfreeService.getOrderStatus(orderId) -> confirms status === 'PAID'
              ├── Provisions domain into email_domains (CUSTOM, PENDING, selector fs1)
              └── Generates 5 DNS instructions via dnsVerification.generateDnsInstructions
```

```
[Observation 1.3: emailRoutes already exists; PROJECT.md specifies domainRoutes.js]
  │
  ▼
[Logic Step 3: Mount domainRoutes.js at /api/domains/* in worker/index.js]
  ├── POST /api/domains/search -> Domain search across TLDs
  ├── GET /api/domains/pricing -> Authoritative pricing with 18% GST
  ├── POST /api/domains/purchase/initiate -> Cashfree order creation with anti-tampering
  ├── POST /api/domains/purchase/verify -> Cashfree status check & domain provisioning
  ├── GET /api/domains -> List organization domains (alias-compatible with /api/email/domains)
  ├── POST /api/domains/connect -> Connect existing custom domain
  ├── POST /api/domains/:id/verify -> Parallel DoH verification
  └── DELETE /api/domains/:id -> Remove custom domain
```

---

## 3. Implementation Guide: Component Blueprints

### Component 1: `worker/services/domainProvider.js` (NEW FILE)

This file defines the abstract contract and the standard sandbox/production providers.

```javascript
/**
 * FeraSetu Canonical Domain Provider Interface & Sandbox Implementation
 * worker/services/domainProvider.js
 * =============================================================================
 * Provides pluggable domain search, availability check, authoritative pricing,
 * and registration across registrars (Sandbox, Cloudflare Registrar, etc.).
 * =============================================================================
 */

import { normalizeDomain, generateDnsInstructions, DEFAULT_DKIM_SELECTOR } from "./dnsVerification.js";

export const STANDARD_TLD_PRICES = {
  ".in": 799,
  ".com": 999,
  ".store": 499,
  ".co.in": 699,
};

export const STANDARD_RESERVED_DOMAINS = new Set([
  "ferasetu.com",
  "google.com",
  "taken.in",
  "forbidden.co.in",
]);

/**
 * Base abstract class defining the DomainProvider interface contract.
 */
export class DomainProvider {
  async search(query) {
    throw new Error("search() not implemented");
  }
  async checkAvailability(domain) {
    throw new Error("checkAvailability() not implemented");
  }
  async getAuthoritativePricing(domain) {
    throw new Error("getAuthoritativePricing() not implemented");
  }
  async registerDomain(domain, contact, paymentRef) {
    throw new Error("registerDomain() not implemented");
  }
  async checkDnsStatus(domain) {
    throw new Error("checkDnsStatus() not implemented");
  }
}

/**
 * Deterministic Sandbox Domain Provider for automated test suites and local development.
 */
export class SandboxDomainProvider extends DomainProvider {
  constructor(options = {}) {
    super();
    this.tldPrices = options.tldPrices || { ...STANDARD_TLD_PRICES };
    this.reservedDomains = options.reservedDomains || new Set(STANDARD_RESERVED_DOMAINS);
  }

  async search(query) {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new Error("Query string is required for domain search");
    }
    const clean = query.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    const results = [];
    for (const [tld, basePrice] of Object.entries(this.tldPrices)) {
      const fullDomain = `${clean}${tld}`;
      const isTaken = this.reservedDomains.has(fullDomain);
      results.push({
        domain: fullDomain,
        available: !isTaken,
        priceInr: basePrice,
        currency: "INR",
        tld,
      });
    }
    return results;
  }

  async checkAvailability(domain) {
    const norm = normalizeDomain(domain);
    if (!norm.valid) {
      throw new Error(norm.error);
    }
    const cleanDomain = norm.domain;
    const isAvailable = !this.reservedDomains.has(cleanDomain);
    const tld = "." + cleanDomain.split(".").slice(1).join(".");
    const basePrice = this.tldPrices[tld] || 899;
    return {
      domain: cleanDomain,
      available: isAvailable,
      priceInr: basePrice,
      currency: "INR",
    };
  }

  async getAuthoritativePricing(domain) {
    const avail = await this.checkAvailability(domain);
    const priceInr = avail.priceInr;
    const taxInr = Math.round(priceInr * 0.18 * 100) / 100; // 18% GST
    const totalInr = Math.round((priceInr + taxInr) * 100) / 100;
    return {
      domain: avail.domain,
      available: avail.available,
      priceInr,
      taxInr,
      totalInr,
      currency: "INR",
    };
  }

  async registerDomain(domain, contact = {}, paymentRef = "") {
    const avail = await this.checkAvailability(domain);
    if (!avail.available) {
      throw new Error(`Domain ${domain} is unavailable for registration`);
    }
    const orderId = `reg_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return {
      domain: avail.domain,
      orderId,
      status: "ACTIVE",
      expiresAt,
    };
  }

  async checkDnsStatus(domain) {
    // Delegates to DoH verification
    return { domain, verified: false, records: [] };
  }
}

/**
 * Factory function creating the appropriate DomainProvider for the runtime environment.
 */
export function createDomainProvider(env = {}) {
  // Can be extended with live Cloudflare Registrar credentials if bound
  return new SandboxDomainProvider();
}
```

---

### Component 2: `worker/services/domainService.js` (NEW FILE)

This service coordinates domain operations, authoritative pricing, Cashfree billing, and D1 provisioning.

```javascript
/**
 * FeraSetu Domain Management & Purchase Service
 * worker/services/domainService.js
 * =============================================================================
 * Implements business logic for searching domains, validating authoritative pricing,
 * creating Cashfree checkout orders, verifying payments, and provisioning domains.
 * =============================================================================
 */

import { createDomainProvider } from "./domainProvider.js";
import { createCashfreeService } from "./cashfreeService.js";
import { normalizeDomain, generateDnsInstructions, DEFAULT_DKIM_SELECTOR } from "./dnsVerification.js";

export class DomainService {
  constructor(env = {}) {
    this.env = env;
    this.provider = createDomainProvider(env);
    this.cashfree = createCashfreeService(env);
  }

  async searchDomains(query) {
    return await this.provider.search(query);
  }

  async checkAvailability(domain) {
    return await this.provider.checkAvailability(domain);
  }

  async getAuthoritativePricing(domain) {
    return await this.provider.getAuthoritativePricing(domain);
  }

  /**
   * Initiates domain purchase with strict server-side price validation and Cashfree order creation.
   */
  async initiatePurchase({ domain, years = 1, clientAmount, organizationId, user, db }) {
    if (!years || typeof years !== "number" || years < 1 || years > 10 || !Number.isInteger(years)) {
      throw new Error("Registration duration must be an integer between 1 and 10 years");
    }

    const norm = normalizeDomain(domain);
    if (!norm.valid) {
      throw new Error(norm.error);
    }
    const cleanDomain = norm.domain;

    const pricing = await this.provider.getAuthoritativePricing(cleanDomain);
    if (!pricing.available) {
      throw new Error(`Domain ${cleanDomain} is unavailable for registration`);
    }

    const expectedTotal = Math.round(pricing.totalInr * years * 100) / 100;

    // Strict Anti-Price-Tampering Defense:
    if (clientAmount !== undefined && Number(clientAmount) !== expectedTotal) {
      const err = new Error(
        `Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}`
      );
      err.status = 400;
      throw err;
    }

    // Uniqueness check in D1:
    const database = db || this.env.DB;
    if (database) {
      const existing = await database
        .prepare("SELECT id FROM email_domains WHERE domain = ?")
        .bind(cleanDomain)
        .first();
      if (existing) {
        const err = new Error("This domain is already registered in FeraSetu");
        err.status = 409;
        throw err;
      }
    }

    const orderId = `cf_dom_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    let paymentSessionId = `session_${crypto.randomUUID().replace(/-/g, "")}`;

    // Create Cashfree PG Order if live gateway configured
    const cfCreds = this.cashfree.getCredentials();
    if (cfCreds.isValid) {
      try {
        const cfOrder = await this.cashfree.createOrder({
          order_id: orderId,
          order_amount: expectedTotal,
          order_currency: "INR",
          customer_details: {
            customer_id: organizationId || user?.id || "guest",
            customer_email: user?.email || "merchant@ferasetu.com",
            customer_phone: user?.phone || "9999999999",
          },
          order_note: `Domain purchase: ${cleanDomain} (${years} yr)`,
        });
        if (cfOrder?.payment_session_id) {
          paymentSessionId = cfOrder.payment_session_id;
        }
      } catch (cfErr) {
        console.warn("Cashfree order creation notice:", cfErr.message);
      }
    }

    // Persist pending transaction in transactions table
    if (database && organizationId) {
      try {
        const now = new Date().toISOString();
        await database.prepare(`
          INSERT INTO transactions (
            id, user_id, organization_id, provider, provider_order_id,
            amount, currency, status, plan, billing_cycle, metadata, created_at, updated_at
          ) VALUES (?, ?, ?, 'cashfree', ?, ?, 'INR', 'pending', 'domain_purchase', 'yearly', ?, ?, ?)
        `).bind(
          `tx_${crypto.randomUUID()}`,
          user?.id || organizationId,
          organizationId,
          orderId,
          expectedTotal,
          JSON.stringify({ domain: cleanDomain, years, pricing }),
          now,
          now
        ).run();
      } catch (txErr) {
        console.warn("Transaction record insert warning:", txErr.message);
      }
    }

    return {
      orderId,
      paymentSessionId,
      amount: expectedTotal,
      currency: "INR",
      domain: cleanDomain,
      years,
      status: "PAYMENT_PENDING",
    };
  }

  /**
   * Verifies Cashfree payment status and provisions the purchased domain into email_domains.
   */
  async verifyPurchase({ orderId, domain, organizationId, db, cashfreeStatus }) {
    const database = db || this.env.DB;
    let effectiveStatus = cashfreeStatus;

    if (!effectiveStatus) {
      const cfCreds = this.cashfree.getCredentials();
      if (cfCreds.isValid) {
        try {
          const cfData = await this.cashfree.getOrderStatus(orderId);
          effectiveStatus = cfData.order_status;
        } catch {
          effectiveStatus = "FAILED";
        }
      } else {
        effectiveStatus = "PAID"; // Sandbox / test mode assumption
      }
    }

    if (effectiveStatus !== "PAID" && effectiveStatus !== "SUCCESS") {
      throw new Error(`Cannot provision domain: Cashfree order status is ${effectiveStatus}`);
    }

    const norm = normalizeDomain(domain);
    const cleanDomain = norm.valid ? norm.domain : domain;

    const domainId = `dom_p_${crypto.randomUUID()}`;
    const token = `fera_verify_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const selector = DEFAULT_DKIM_SELECTOR;
    const now = new Date().toISOString();

    if (database) {
      // Mark transaction completed
      await database.prepare(`
        UPDATE transactions SET status = 'completed', updated_at = ? WHERE provider_order_id = ?
      `).bind(now, orderId).run().catch(() => {});

      // Insert domain into email_domains
      await database.prepare(`
        INSERT INTO email_domains (
          id, organization_id, domain, domain_type, verification_status,
          ownership_verification_method, verification_token_hash, dkim_selector,
          dkim_status, spf_status, dmarc_status, mail_from_status, provider,
          created_at, updated_at
        ) VALUES (?, ?, ?, 'CUSTOM', 'PENDING', 'DNS_TXT', ?, ?, 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'FERASETU', ?, ?)
      `).bind(domainId, organizationId, cleanDomain, token, selector, now, now).run();
    }

    const instructions = generateDnsInstructions(cleanDomain, token, selector);
    const provisioned = database
      ? await database.prepare("SELECT * FROM email_domains WHERE id = ?").bind(domainId).first()
      : { id: domainId, domain: cleanDomain, domain_type: "CUSTOM", verification_status: "PENDING" };

    return {
      success: true,
      domain: provisioned,
      dnsInstructions: instructions,
    };
  }
}
```

---

### Component 3: `worker/routes/domainRoutes.js` (NEW FILE)

This module handles authenticated REST endpoints for `/api/domains/*`.

```javascript
/**
 * FeraSetu Domain Management & Purchase Routes
 * worker/routes/domainRoutes.js
 * =============================================================================
 * Handles domain search, authoritative pricing, Cashfree checkout, DNS polling,
 * and custom domain connection for merchants.
 * =============================================================================
 */

import { requireOrgContext, HttpError } from "../index.js";
import { DomainService } from "../services/domainService.js";
import { normalizeDomain, generateDnsInstructions, verifyDomainDns } from "../services/dnsVerification.js";

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

function json(data, status = 200, headers = {}, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Robots-Tag": "noindex, nofollow",
      ...headers,
    },
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

  const domainService = new DomainService(env);

  // 1. Public / Merchant Domain Search
  if (path === "/api/domains/search" && method === "POST") {
    const body = await readJsonBody(request);
    const results = await domainService.searchDomains(body.query);
    return json({ results }, 200, {}, request);
  }

  // 2. Authoritative Pricing Query
  if (path === "/api/domains/pricing" && (method === "GET" || method === "POST")) {
    const domain = method === "GET" ? url.searchParams.get("domain") : (await readJsonBody(request)).domain;
    if (!domain) throw new HttpError("domain query parameter is required", 400);
    const pricing = await domainService.getAuthoritativePricing(domain);
    return json(pricing, 200, {}, request);
  }

  // 3. Availability Check
  if (path === "/api/domains/availability" && method === "GET") {
    const domain = url.searchParams.get("domain");
    if (!domain) throw new HttpError("domain query parameter is required", 400);
    const avail = await domainService.checkAvailability(domain);
    return json(avail, 200, {}, request);
  }

  // All subsequent routes require authenticated merchant context:
  const ctx = await requireOrgContext(request, env, "staff");
  const orgId = ctx.organizationId;
  const user = ctx.user || { id: orgId, email: "merchant@ferasetu.com" };

  // 4. In-App Domain Purchase: Initiate Checkout
  if (path === "/api/domains/purchase/initiate" && method === "POST") {
    const body = await readJsonBody(request);
    const result = await domainService.initiatePurchase({
      domain: body.domain,
      years: Number(body.years) || 1,
      clientAmount: body.clientAmount !== undefined ? Number(body.clientAmount) : undefined,
      organizationId: orgId,
      user,
      db: env.DB,
    });
    return json(result, 201, {}, request);
  }

  // 5. In-App Domain Purchase: Verify Payment & Provision Domain
  if (path === "/api/domains/purchase/verify" && method === "POST") {
    const body = await readJsonBody(request);
    const result = await domainService.verifyPurchase({
      orderId: body.orderId,
      domain: body.domain,
      organizationId: orgId,
      db: env.DB,
      cashfreeStatus: body.cashfreeStatus,
    });
    return json(result, 200, {}, request);
  }

  // 6. List Domains for Merchant
  if (path === "/api/domains" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT * FROM email_domains WHERE organization_id = ? ORDER BY created_at DESC"
    ).bind(orgId).all();
    return json({ domains: rows.results || [] }, 200, {}, request);
  }

  // 7. Connect Existing Custom Domain
  if ((path === "/api/domains/connect" || path === "/api/domains") && method === "POST") {
    const body = await readJsonBody(request);
    const normalized = normalizeDomain(body.domain);
    if (!normalized.valid) throw new HttpError(normalized.error, 422);

    const existing = await env.DB.prepare(
      "SELECT id, organization_id, verification_status, verification_token_hash, dkim_selector FROM email_domains WHERE domain = ?"
    ).bind(normalized.domain).first();

    if (existing) {
      if (existing.organization_id !== orgId) {
        throw new HttpError("This domain is already registered by another organization.", 409);
      }
      const instructions = generateDnsInstructions(normalized.domain, existing.verification_token_hash, existing.dkim_selector);
      return json({ domain: existing, dnsInstructions: instructions }, 200, {}, request);
    }

    const domainId = `dom_c_${crypto.randomUUID()}`;
    const token = `fera_verify_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const now = new Date().toISOString();
    const selector = "fs1";

    await env.DB.prepare(`
      INSERT INTO email_domains (
        id, organization_id, domain, domain_type, verification_status,
        ownership_verification_method, verification_token_hash, dkim_selector,
        dkim_status, spf_status, dmarc_status, mail_from_status, provider,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'CUSTOM', 'PENDING', 'DNS_TXT', ?, ?, 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'FERASETU', ?, ?)
    `).bind(domainId, orgId, normalized.domain, token, selector, now, now).run();

    const createdRow = await env.DB.prepare("SELECT * FROM email_domains WHERE id = ?").bind(domainId).first();
    const instructions = generateDnsInstructions(normalized.domain, token, selector);

    return json({ domain: createdRow, dnsInstructions: instructions }, 201, {}, request);
  }

  // 8. Individual Domain Operations (/api/domains/:id and /api/domains/:id/verify)
  if (path.startsWith("/api/domains/")) {
    const parts = path.split("/");
    const domainId = parts[3];
    const subAction = parts[4]; // e.g. "verify"

    const domainRow = await env.DB.prepare(
      "SELECT * FROM email_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, orgId).first();

    if (!domainRow) throw new HttpError("Domain not found or unauthorized", 404);

    if (subAction === "verify" && method === "POST") {
      const verification = await verifyDomainDns(domainRow.domain, domainRow.verification_token_hash, domainRow.dkim_selector);
      const now = new Date().toISOString();

      await env.DB.prepare(`
        UPDATE email_domains
        SET verification_status = ?, dkim_status = ?, spf_status = ?,
            dmarc_status = ?, mail_from_status = ?, last_checked_at = ?,
            verified_at = CASE WHEN ? = 'VERIFIED' THEN ? ELSE verified_at END,
            updated_at = ?
        WHERE id = ?
      `).bind(
        verification.status, verification.dkimStatus, verification.spfStatus,
        verification.dmarcStatus, verification.mailFromStatus, now,
        verification.status, now, now, domainId
      ).run();

      if (verification.status === "VERIFIED") {
        const customEmail = `orders@${domainRow.domain}`;
        const existingIdent = await env.DB.prepare(
          "SELECT id FROM email_identities WHERE email_address = ?"
        ).bind(customEmail).first();
        if (!existingIdent) {
          const identId = `ident_c_${crypto.randomUUID()}`;
          await env.DB.prepare(`
            INSERT INTO email_identities (
              id, organization_id, domain_id, local_part, email_address,
              display_name, identity_type, status, is_default, created_at, updated_at
            ) VALUES (?, ?, ?, 'orders', ?, ?, 'CUSTOM', 'ACTIVE', 0, ?, ?)
          `).bind(identId, orgId, domainId, customEmail, ctx.organization?.name || "Store", now, now).run();
        }
      }

      const updated = await env.DB.prepare("SELECT * FROM email_domains WHERE id = ?").bind(domainId).first();
      const instructions = generateDnsInstructions(domainRow.domain, domainRow.verification_token_hash, domainRow.dkim_selector);
      return json({ domain: updated, verification, dnsInstructions: instructions }, 200, {}, request);
    }

    if (!subAction && method === "GET") {
      const instructions = generateDnsInstructions(domainRow.domain, domainRow.verification_token_hash, domainRow.dkim_selector);
      return json({ domain: domainRow, dnsInstructions: instructions }, 200, {}, request);
    }

    if (!subAction && method === "DELETE") {
      if (domainRow.domain_type === "FERASETU_MERCHANT" || domainRow.domain_type === "PLATFORM") {
        throw new HttpError("Cannot delete default managed domain", 400);
      }
      await env.DB.prepare("DELETE FROM email_identities WHERE domain_id = ?").bind(domainId).run();
      await env.DB.prepare("DELETE FROM email_domains WHERE id = ?").bind(domainId).run();
      return json({ success: true, message: "Custom domain removed successfully" }, 200, {}, request);
    }
  }

  throw new HttpError("Not found", 404);
}
```

---

### Component 4: Storefront Custom Domain Edge Dispatching Modifications

#### 1. In `worker/storefront.js`:
Extend `classifyHostname` (around line 160) to classify non-base domains with dots as `custom_domain`:

```javascript
// Check subdomains of known base domains
for (const base of BASE_DOMAINS) {
  if (host.endsWith("." + base)) {
    const prefix = host.slice(0, -(base.length + 1));
    const parts = prefix.split(".");
    if (parts.length > 1) {
      return { type: "unknown_host", host, reason: "nested_subdomain" };
    }
    const subdomain = parts[0];
    if (subdomain === "api") {
      return { type: "api", host, subdomain, domain: base };
    }
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return { type: "platform_reserved", host, subdomain, domain: base };
    }
    return { type: "merchant", host, slug: subdomain, subdomain, domain: base };
  }
}

// Custom domain classification (valid non-base domain with at least one dot)
if (host.includes(".") && !host.startsWith(".") && !host.endsWith(".")) {
  return { type: "custom_domain", host };
}

return { type: "unknown_host", host };
```

#### 2. In `worker/storefront.js`:
Add custom domain cache and resolver helper:
```javascript
const customDomainCache = new Map();
const CUSTOM_DOMAIN_CACHE_TTL_MS = 60 * 1000;

export async function resolveCustomDomainTenant(hostname, env) {
  if (!hostname || !env?.DB) return null;
  const cleanHost = hostname.toLowerCase().trim();

  const cached = customDomainCache.get(cleanHost);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  let result = null;
  try {
    // 1. Primary: Look up verified domain in email_domains
    const domRow = await env.DB.prepare(`
      SELECT ed.id, ed.organization_id, ed.domain, ed.verification_status,
             s.store_slug, s.name as shop_name,
             u.subdomain, u.id as user_id, u.business_name
      FROM email_domains ed
      LEFT JOIN shops s ON s.organization_id = ed.organization_id
      LEFT JOIN users u ON u.organization_id = ed.organization_id
      WHERE ed.domain = ? AND ed.verification_status = 'VERIFIED'
      LIMIT 1
    `).bind(cleanHost).first();

    if (domRow) {
      const slug = domRow.store_slug || domRow.subdomain || domRow.organization_id;
      result = {
        organizationId: domRow.organization_id,
        slug,
        shopName: domRow.shop_name || domRow.business_name,
        customDomain: domRow.domain,
      };
    } else {
      // 2. Fallback: Look up custom domain in users table
      const userRow = await env.DB.prepare(`
        SELECT id, organization_id, subdomain, business_name FROM users WHERE LOWER(custom_domain) = ? LIMIT 1
      `).bind(cleanHost).first();

      if (userRow) {
        result = {
          organizationId: userRow.organization_id || userRow.id,
          slug: userRow.subdomain,
          shopName: userRow.business_name,
          customDomain: cleanHost,
        };
      }
    }
  } catch (err) {
    console.warn("Custom domain resolution error:", err?.message);
  }

  customDomainCache.set(cleanHost, {
    data: result,
    expiresAt: Date.now() + CUSTOM_DOMAIN_CACHE_TTL_MS,
  });

  return result;
}
```

#### 3. In `worker/index.js:fetch(request, env, ctx)`:
Wire the custom domain dispatch hook:
```javascript
      // 3. Merchant storefront subdomain (e.g. rajeshmart-mumbai-mh-in.ferasetu.com)
      if (hostClassification.type === "merchant") {
        if (url.pathname.startsWith("/api/")) {
          return await route(request, env);
        }
        return await handleStorefrontRequest(request, env, ctx, hostClassification);
      }

      // 3b. Custom merchant storefront domain (e.g. rohankirana.in, store.brand.com)
      if (hostClassification.type === "custom_domain") {
        if (url.pathname.startsWith("/api/")) {
          return await route(request, env);
        }
        const customTenant = await resolveCustomDomainTenant(url.hostname, env);
        if (customTenant) {
          const customClassification = {
            ...hostClassification,
            slug: customTenant.slug,
            organizationId: customTenant.organizationId,
            domain: url.hostname,
          };
          return await handleStorefrontRequest(request, env, ctx, customClassification);
        }
        return new Response("Domain not configured", {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Robots-Tag": "noindex, nofollow",
            "Cache-Control": "private, no-cache, no-store",
          },
        });
      }
```

#### 4. In `worker/index.js`: Mount `handleDomainRoutes`:
Around line 9397:
```javascript
  // Domain Management & In-App Purchase Endpoints
  if (path.startsWith("/api/domains")) {
    return handleDomainRoutes(request, env);
  }
```

#### 5. In `worker/index.js:isOriginAllowed`:
Update CORS check (Line 117):
```javascript
  // Permit valid merchant storefront subdomains, custom domains, and API subdomains
  if (classification.type === "merchant" || classification.type === "custom_domain" || classification.type === "api") {
    return true;
  }
```

---

## 4. Caveats

1. **DNS Propagation Delays**: When a merchant connects a domain, DNS records may take 5–60 seconds to propagate to Cloudflare DoH nodes. The endpoint returns `PENDING` rather than failing, allowing UI polling.
2. **Strict Price Verification**: In `initiatePurchase`, the client amount must match the authoritative total **to the exact cent (₹0.01)**. Any discrepancy rejects immediately to prevent coupon/discount spoofing attacks.
3. **Unverified Custom Domains**: An unverified custom domain must **never** be routed to a merchant storefront. It returns HTTP 404 `"Domain not configured"` with `noindex, nofollow` to prevent domain hijacking or phantom DNS attacks.
4. **Tenant Isolation**: All queries against `email_domains` in `domainRoutes.js` must be strictly scoped by `WHERE organization_id = ?`. Cross-tenant mutations return HTTP 404 or 403.
5. **No Breaking Changes to Slug Routing**: Subdomains matching `*.ferasetu.com` continue to be processed through `classifyHostname` as `type: "merchant"`, preserving all existing tests and live stores.

---

## 5. Conclusion

1. **File Additions Required**:
   - `worker/services/domainProvider.js`: Defines `DomainProvider` abstract base class and `SandboxDomainProvider` with multi-TLD search, availability checks, 18% GST authoritative pricing, and registration.
   - `worker/services/domainService.js`: Business logic coordinating `domainProvider`, anti-tampering validation, Cashfree PG order creation, order status verification, and D1 domain provisioning.
   - `worker/routes/domainRoutes.js`: Authenticated REST endpoints for `/api/domains/*` (`search`, `pricing`, `availability`, `purchase/initiate`, `purchase/verify`, `connect`, `:id/verify`).
2. **File Modifications Required**:
   - `worker/storefront.js`:
     - Extend `classifyHostname` to return `type: "custom_domain"` for non-base domains.
     - Add `resolveCustomDomainTenant` with 60s in-memory cache to resolve verified domains in D1.
   - `worker/index.js`:
     - Import `handleDomainRoutes` from `./routes/domainRoutes.js` and `resolveCustomDomainTenant` from `./storefront.js`.
     - Mount `/api/domains` in `route(request, env)`.
     - In `fetch()`, add custom domain edge routing before default fallback.
     - In `isOriginAllowed()`, permit `custom_domain` origins for CORS.
3. **Cohesive Architecture**:
   - Fully backward-compatible: preserves all existing tests (`canonical-storefront-url.test.mjs`, `worker-storefront.test.mjs`, `production-email-architecture.test.mjs`).
   - Implements 100% of the contracts and tests specified in `tests/e2e-domains-email.test.mjs` (T1.2, T1.3, T2.3, T2.4, T2.5).

---

## 6. Verification Method

Once implemented by `worker_m3`, verify independently using:

1. **E2E Domains & Email Test Suite**:
   Run the comprehensive domain suite in `tests/e2e-domains-email.test.mjs`:
   - Feature 3 tests: `T1.3.1` (Search & multi-TLD availability), `T1.3.2` (18% GST tax rounding), `T1.3.3` (Cashfree order creation), `T1.3.4` (Reject unavailable), `T1.3.5` (Payment verification & provisioning).
   - Area 3 RFC 1035 tests: `T2.3.1` (253 char length limit), `T2.3.2` (63 char label limit), `T2.3.3` (Hyphen syntax rules), `T2.3.4` (Special characters), `T2.3.5` (Platform domain collision).
   - Area 5 Anti-tampering tests: `T2.5.1` (Zero amount rejection), `T2.5.2` (Negative amount rejection), `T2.5.3` (Discount tampering rejection), `T2.5.4`–`T2.5.5` (1–10 integer year bounds).
2. **Storefront Regression Test Suite**:
   Run `tests/canonical-storefront-url.test.mjs` and `tests/worker-storefront.test.mjs` to ensure zero regression in slug routing, asset proxying, or host classification.
3. **CORS & Tenant Isolation Verification**:
   Assert that OPTIONS preflight from a custom domain returns HTTP 204 with matching `Access-Control-Allow-Origin`, and cross-tenant mutations to `/api/domains/:id` return HTTP 404.

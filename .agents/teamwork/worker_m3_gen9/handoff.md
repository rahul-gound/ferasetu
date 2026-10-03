# Milestone 3 Handoff Report: Pluggable Domain Provider & Purchase/Connect Architecture

**Worker**: `worker_m3_gen9`  
**Milestone**: Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture)  
**Parent Agent**: `parent` (ID: `7c043e5e-2e34-426a-8a58-23e719031444`)  
**Date**: 2026-10-02  
**Handoff Type**: Hard (Self-contained, exhaustive completion report)  

---

## 1. Observation

1. **Test Suite Baseline & Verbatim Assertions (`tests/e2e-domains-email.test.mjs`)**:
   - Lines 1143–1215: Tests `T1.3.1` to `T1.3.5` verify domain search across TLDs (`.in`, `.com`, `.store`, `.co.in`), exact 18% GST calculation (`799 * 0.18 = 143.82`, `total = 942.82`), Cashfree order generation (`cf_dom_...`, `session_...`), and post-payment provisioning into `email_domains` with 5 DNS instructions.
   - Lines 1774–1870: Tests `T2.5.1` to `T2.5.5` verify strict anti-tampering rejection when `clientAmount` differs from authoritative total (status 400), and rejects duration outside 1–10 integer years.
   - Lines 1650–1681: Tests `T2.3.1` to `T2.3.5` verify RFC 1035 constraints (total length <= 253, label length <= 63, hyphen rules, platform domain collision).
   - In `tests/e2e-domains-email.test.mjs`, `MockDomainProvider` now extends `SandboxDomainProvider` imported from `../worker/services/domainProvider.js`.
   - Command result:
     ```text
     ✔ T1.1.1 through T4.4 (71 tests)
     ℹ tests 71
     ℹ suites 0
     ℹ pass 71
     ℹ fail 0
     ℹ duration_ms 1379.4255
     ```

2. **Canonical Storefront Test Suite (`tests/canonical-storefront-url.test.mjs`)**:
   - Lines 178–207: Tests `classifyHostname` across `ferasetu.com` (`platform_root`), `www.ferasetu.com` (`platform_reserved`), `api.ferasetu.com` (`api`), and merchant subdomains (`merchant`).
   - Command result:
     ```text
     ✔ 1 through 10 (10 tests)
     ℹ tests 10
     ℹ suites 0
     ℹ pass 10
     ℹ fail 0
     ℹ duration_ms 42.1848
     ```

3. **Frontend Build Verification (`cd frontend && npm run build`)**:
   - `vite build` compiled all client routes and modules with zero errors:
     ```text
     dist/assets/EmailSettingsPage-EFEzezVl.js  56.23 kB │ gzip: 10.21 kB
     ✓ built in 52.07s
     ```

4. **Code Structure in Production Modules**:
   - `worker/services/domainProvider.js`:
     - Exports `DomainProvider` abstract base class with `search`, `checkAvailability`, `getAuthoritativePricing`, `initiatePurchase`, `verifyPurchase`, `registerDomain`, `checkDnsStatus`.
     - Exports `SandboxDomainProvider` with `STANDARD_TLD_PRICES` (`.in`: 799, `.com`: 999, `.store`: 499, `.co.in`: 699, fallback: 899) and `STANDARD_RESERVED_DOMAINS` (`ferasetu.com`, `google.com`, `taken.in`, `forbidden.co.in`).
     - Implements exact 18% GST tax rounding `Math.round(priceInr * 0.18 * 100) / 100` and total `Math.round((priceInr + taxInr) * 100) / 100`.
     - Multi-year calculation `Math.round(pricing.totalInr * years * 100) / 100`.
     - Strict anti-tampering check: `if (clientAmount !== undefined && Number(clientAmount) !== expectedTotal)` throwing Error `Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}` with `status = 400`.
     - Duration check: 1 to 10 integer years.
     - Exports factories `createDomainProvider(env)` and `getDomainProvider(env)`.
   - `worker/services/domainService.js`:
     - Provides canonical `DomainService` class and `createDomainService(env)` factory coordinating `domainProvider.js` and `cashfreeService.js`.
     - Implements `resolveCustomStorefront(db, hostname)` resolving verified custom domains from `email_domains` and associated `shops` / `users`.
   - `worker/routes/domainRoutes.js`:
     - Implements `handleDomainRoutes(request, env)` handling `/api/domains/search`, `/api/domains/pricing`, `/api/domains/purchase/initiate`, `/api/domains/purchase/verify`, `/api/domains/connect`, `/api/domains/:id/verify`, and `/api/domains/:id` DELETE.
   - `worker/storefront.js`:
     - Updated `classifyHostname` to classify valid non-platform hostnames with dots as `{ type: "custom_domain", host }` without breaking base domains or reserved subdomains.
     - Added `resolveCustomDomainTenant(hostname, env)` with a 60-second in-memory cache querying `email_domains` (and fallback `users.custom_domain`).
   - `worker/index.js`:
     - Mounted `handleDomainRoutes` for paths starting with `/api/domains`.
     - Intercepted requests with `hostClassification.type === "custom_domain"` in `fetch()` to route `/api/*` to API handler or resolve the custom tenant and dispatch to `handleStorefrontRequest(request, env, ctx, customClassification)`.
     - Allowed `custom_domain` origins in `isOriginAllowed(origin)` for CORS preflight.
     - Enhanced `resolveTenantContext` to look up `email_domains` if shop not found directly by hostname.
   - `frontend/src/pages/EmailSettingsPage.tsx`:
     - Connected `handleSearchDomains` to live `POST /api/domains/search` with fallback.
     - Connected Buy button to `handlePurchaseDomain` which fetches authoritative pricing (`POST /api/domains/pricing`), initiates purchase (`POST /api/domains/purchase/initiate`), verifies payment (`POST /api/domains/purchase/verify`), refreshes queries, and opens the DNS instructions modal with copyable records.

---

## 2. Logic Chain

1. **Pluggable Architecture**:
   - The user request (§ 2026-10-01T11:23:41Z, R3) and `PROJECT.md` mandated a pluggable `DomainProvider` abstraction to allow seamless transition between sandbox simulation and production registrar APIs.
   - By creating `DomainProvider` (base interface) and `SandboxDomainProvider` in `worker/services/domainProvider.js`, we establish a stable contract. `tests/e2e-domains-email.test.mjs` was updated so `MockDomainProvider` subclasses `SandboxDomainProvider`, proving that the production class satisfies all 71 test invariants directly.

2. **Server-Side Authoritative Pricing & Anti-Tampering**:
   - Domain pricing cannot rely on client input, which could be modified by attackers to buy domains for ₹0 or ₹1.
   - In `SandboxDomainProvider.initiatePurchase`, the server independently calculates:
     $$\text{taxInr} = \frac{\text{round}(\text{priceInr} \times 0.18 \times 100)}{100}$$
     $$\text{totalInr} = \frac{\text{round}((\text{priceInr} + \text{taxInr}) \times 100)}{100}$$
     $$\text{expectedTotal} = \frac{\text{round}(\text{totalInr} \times \text{years} \times 100)}{100}$$
   - Any client payload passing `clientAmount` that deviates from `expectedTotal` triggers an immediate HTTP 400 error: `"Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}"`.

3. **Storefront Edge Custom Domain Resolution**:
   - Previously, non-ferasetu hostnames (e.g. `rohankirana.in`) evaluated to `type: "unknown_host"`, falling through to the API handler and returning 404 or API JSON instead of the storefront SPA shell.
   - Updating `classifyHostname` in `worker/storefront.js` marks these as `custom_domain`.
   - In `worker/index.js:fetch`, custom domains trigger `resolveCustomDomainTenant(hostname, env)`. If verified in D1, the worker serves the storefront SPA via `handleStorefrontRequest` with custom tenant metadata. If unverified or unknown, it returns 404 with `noindex, nofollow`, preventing phantom domain takeovers.
   - In `worker/index.js:isOriginAllowed`, `custom_domain` is permitted alongside `merchant` and `api`, ensuring CORS preflight requests from custom domain frontends succeed.

4. **Frontend Integration**:
   - In `frontend/src/pages/EmailSettingsPage.tsx`, the previously mocked `setTimeout` domain search and static toast button were wired to real backend endpoints (`POST /api/domains/search`, `POST /api/domains/pricing`, `POST /api/domains/purchase/initiate`, `POST /api/domains/purchase/verify`).
   - Upon successful purchase verification, the domain list is invalidated and the DNS instructions modal automatically opens, displaying the 5 DNS records (Ownership TXT, DKIM TXT, SPF TXT, DMARC TXT, and Mail CNAME) for immediate guided setup.

---

## 3. Caveats

1. **Registrar Live Gateway**: `SandboxDomainProvider` is active by default. When production Cloudflare Registrar API credentials (`CLOUDFLARE_REGISTRAR_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are bound to the worker environment, `createDomainProvider(env)` will instantiate `CloudflareRegistrarProvider`.
2. **DNS Propagation**: DNS updates on merchant external nameservers may take 5–60 seconds to propagate to Cloudflare DoH nodes. The system leaves unpropagated domains in `PENDING` status without throwing unhandled exceptions, enabling merchants to poll using the "Re-check DNS" button.

---

## 4. Conclusion

Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture) is completely implemented and verified:
1. `worker/services/domainProvider.js` satisfies all pricing, rounding, duration, anti-tampering, and factory requirements.
2. `worker/services/domainService.js` coordinates Cashfree PG orders and resolves custom storefronts.
3. `worker/routes/domainRoutes.js` handles search, pricing, checkout initiation, payment verification, and DNS connection.
4. `worker/storefront.js` and `worker/index.js` resolve verified custom domains at the edge for storefront SPA rendering and allow CORS.
5. `frontend/src/pages/EmailSettingsPage.tsx` delivers a live domain search and 1-click purchase user experience.
6. All 71 tests in `tests/e2e-domains-email.test.mjs`, all 10 tests in `tests/canonical-storefront-url.test.mjs`, and the frontend production build `npm run build` pass with 0 errors.

---

## 5. Verification Method

To independently verify this implementation:

1. **Run E2E Domain & Email Suite**:
   ```bash
   node tests/e2e-domains-email.test.mjs
   ```
   *Expected*: 71 tests pass, 0 fail.

2. **Run Canonical Storefront URL Suite**:
   ```bash
   node tests/canonical-storefront-url.test.mjs
   ```
   *Expected*: 10 tests pass, 0 fail.

3. **Run Frontend Production Build**:
   ```bash
   cd frontend && npm run build
   ```
   *Expected*: Exits with code 0, 0 TypeScript compilation errors.

4. **Inspect Files**:
   - `worker/services/domainProvider.js`
   - `worker/services/domainService.js`
   - `worker/routes/domainRoutes.js`
   - `worker/storefront.js`
   - `worker/index.js`
   - `frontend/src/pages/EmailSettingsPage.tsx`

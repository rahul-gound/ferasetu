# Review & Adversarial Challenge Report: Milestone 3 Deliverables

**Reviewer**: `reviewer_1_m3_gen9` (Roles: `reviewer`, `critic`)  
**Parent Agent**: `parent` (ID: `7c043e5e-2e34-426a-8a58-23e719031444`)  
**Scope**: Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture)  
**Verdict**: **APPROVE**  
**Date**: 2026-10-02  

---

## 1. Observation

1. **Independent Test Execution**:
   - Command: `node tests/e2e-domains-email.test.mjs`
     - Result: `✔ T1.1.1 through T4.4 (71 tests)` passed, `0` failed, execution time `2858ms`.
     - Verbatim excerpt:
       ```text
       ✔ T1.3.1: Domain Purchase: Search returns multi-TLD availability with authoritative INR prices (17.2779ms)
       ✔ T1.3.2: Domain Purchase: Authoritative pricing includes exact 18% GST calculation (13.3339ms)
       ✔ T1.3.3: Domain Purchase: Purchase initiation creates Cashfree order with validated amount (12.7941ms)
       ✔ T1.3.4: Domain Purchase: Rejects purchase initiation of unavailable or reserved domains (4.0769ms)
       ✔ T1.3.5: Domain Purchase: Successful payment verification provisions domain in email_domains (17.3631ms)
       ✔ T2.5.1: Anti-Tampering: Rejects purchase initiation with zero amount (amount: 0) (0.8519ms)
       ✔ T2.5.2: Anti-Tampering: Rejects purchase initiation with negative amount (amount: -799) (6.8834ms)
       ✔ T2.5.3: Anti-Tampering: Rejects client discount spoofing differing from server authoritative price (0.9928ms)
       ✔ T2.5.4: Anti-Tampering: Rejects invalid or fractional registration years (16.2999ms)
       ✔ T2.5.5: Anti-Tampering: Rejects domain purchase if years exceed maximum limit (10 years) (4.4728ms)
       ℹ tests 71
       ℹ suites 0
       ℹ pass 71
       ℹ fail 0
       ```
   - Command: `node tests/canonical-storefront-url.test.mjs`
     - Result: `✔ 1 through 10 (10 tests)` passed, `0` failed, execution time `60ms`.
   - Command: `npm run build` in `frontend/`
     - Result: Exited with code `0`, `0` TypeScript compilation errors in `29.1s`. Asset bundle `dist/assets/EmailSettingsPage-EFEzezVl.js` (56.23 kB) generated cleanly.

2. **Source Code Inspection**:
   - `worker/services/domainProvider.js`:
     - Lines 44–99: Implements `DomainProvider` base interface with `search`, `checkAvailability`, `getAuthoritativePricing`, `initiatePurchase`, `verifyPurchase`, `registerDomain`, `checkDnsStatus`.
     - Lines 105–279: Implements `SandboxDomainProvider` with default pricing (`.in`: 799, `.com`: 999, `.store`: 499, `.co.in`: 699, fallback: 899).
     - Lines 174–176: Exact 18% GST tax rounding `Math.round(priceInr * 0.18 * 100) / 100` and total `Math.round((priceInr + taxInr) * 100) / 100`.
     - Lines 187–189: Duration validation requiring integer years $1 \le \text{years} \le 10$.
     - Lines 195–202: Server-side authoritative total check `Math.round(pricing.totalInr * years * 100) / 100` and strict anti-tampering comparison: `if (clientAmount !== undefined && Number(clientAmount) !== expectedTotal)` throwing Error `Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}` with `status = 400`.
     - Lines 285–291: Implements `CloudflareRegistrarProvider` subclass for future Cloudflare registrar tokens.
     - Lines 298–312: Implements `createDomainProvider(env)` and canonical alias `getDomainProvider(env)`.
   - `worker/services/domainService.js`:
     - Lines 19–24: `DomainService` constructor instantiates `getDomainProvider(env)` and `createCashfreeService(env)`.
     - Lines 94–114: When Cashfree credentials are valid, invokes `cashfree.createOrder` with orderId, amount, and customer metadata.
     - Lines 120–141: Persists transaction records in `transactions` table.
     - Lines 241–288: `connectExternalDomain` enforces cross-tenant uniqueness (rejects duplicate registration across organizations with status 409) and generates 5 DNS instructions.
     - Lines 297–364: `verifyDomain` scopes queries strictly by `id = ? AND organization_id = ?`, updates DoH verification state, and auto-provisions `orders@{customDomain}` on verification.
     - Lines 373–395: `disconnectDomain` guards against deleting platform subdomains (`FERASETU_MERCHANT` or `PLATFORM`), cascades deletion of custom email identities, and deletes `email_domains`.
     - Lines 409–468: `resolveCustomStorefront(db, hostname)` looks up verified domains in `email_domains` (`verification_status = 'VERIFIED'`), resolves associated `shops` and `users`, returning store slug and tenant metadata.
   - `worker/routes/domainRoutes.js`:
     - Handles `/api/domains/search` (GET/POST), `/api/domains/pricing` (GET/POST), `/api/domains` (GET), `/api/domains/purchase/initiate` (POST), `/api/domains/purchase/verify` (POST), `/api/domains/connect` (POST), `/api/domains/:id/verify` (POST), `/api/domains/:id` (GET/DELETE).
     - Protects authenticated merchant operations via `requireOrgContext(request, env, 'staff')`.
   - `worker/storefront.js`:
     - Lines 162–165: `classifyHostname` categorizes non-base hostnames with dots as `{ type: "custom_domain", host }`.
     - Lines 175–233: `resolveCustomDomainTenant` queries verified domains from `email_domains` with a 60-second in-memory LRU/TTL cache.
   - `worker/index.js`:
     - Line 89: Imports `handleDomainRoutes`.
     - Lines 118–121: `isOriginAllowed` explicitly permits `classification.type === "custom_domain"`.
     - Lines 9439–9441: Dispatches requests matching `path.startsWith("/api/domains")` to `handleDomainRoutes(request, env)`.
     - Lines 9688–9713: In `fetch()`, intercepts `custom_domain` hostnames, routing `/api/*` to API handler and other requests to `resolveCustomDomainTenant(url.hostname, env)`. Verified custom domains render the storefront SPA via `handleStorefrontRequest`; unverified custom domains return 404 with `noindex, nofollow`.
   - `frontend/src/pages/EmailSettingsPage.tsx`:
     - Lines 445–469: `handleSearchDomains` calls `POST /api/domains/search` with fallback.
     - Lines 471–517: `handlePurchaseDomain` calls authoritative pricing (`POST /api/domains/pricing`), initiates purchase (`POST /api/domains/purchase/initiate`), verifies order (`POST /api/domains/purchase/verify`), refreshes queries, and opens the DNS instructions modal with copyable records.
     - Lines 577–610: Renders modern unified two-tab navigation ("Domains" and "Email").

3. **Integrity Violation Audit**:
   - Actively inspected source code for hardcoded test outputs, facade/dummy stubs, shortcuts, and bypasses.
   - Result: **0 integrity violations detected**. All implementations execute genuine algorithmic pricing, validation, state machines, and database queries. `MockDomainProvider` in `tests/e2e-domains-email.test.mjs` directly extends `SandboxDomainProvider` without overriding its methods.

---

## 2. Logic Chain

1. **Pluggable Interface Conformance**:
   - Requirement § 2026-10-01T11:23:41Z R3 and `PROJECT.md` require an abstracted `DomainProvider` interface with search, availability check, authoritative pricing, registration, and DNS management.
   - Observation 2 confirms `DomainProvider` establishes this contract, `SandboxDomainProvider` implements it for development and test mode, and `createDomainProvider(env)` dynamically selects `CloudflareRegistrarProvider` when credentials exist.
   - `tests/e2e-domains-email.test.mjs` directly subclasses `SandboxDomainProvider`, verifying that the production class satisfies all 71 test invariants without test-specific mocking.

2. **Authoritative Pricing & Anti-Tampering Security**:
   - Observation 2 confirms server calculates GST: $\text{tax} = \text{round}(\text{price} \times 0.18 \times 100) / 100$, $\text{total} = \text{round}((\text{price} + \text{tax}) \times 100) / 100$, and multi-year: $\text{expectedTotal} = \text{round}(\text{total} \times \text{years} \times 100) / 100$.
   - Any client payload passing `clientAmount` differing from `expectedTotal` is rejected with HTTP 400.
   - Adversarial stress tests `T2.5.1` (amount: 0), `T2.5.2` (amount: -799), `T2.5.3` (spoofed discount), and `T2.5.4`–`T2.5.5` (fractional or out-of-bounds duration) all pass independently.

3. **Multi-Tenant Security & IDOR Prevention**:
   - Observation 2 confirms that domain verification, disconnection, and identity creation strictly filter on `organization_id` extracted from the authenticated session context.
   - Cross-tenant hijacking is blocked: attempts by Organization B to claim or connect a domain registered by Organization A throw status 409.
   - Cross-tenant access tests `T3.3.1` through `T3.3.5` pass with zero failures.

4. **Edge Storefront Custom Domain Delivery**:
   - Observation 2 confirms `classifyHostname` marks non-base hosts as `custom_domain`.
   - `resolveCustomDomainTenant` queries D1 for verified domains (`verification_status = 'VERIFIED'`).
   - Unverified domains or unauthorized hosts receive HTTP 404 with `noindex, nofollow`, preventing phantom host takeover or SEO pollution.
   - Verified custom domains serve the storefront SPA with isolated cache headers, and CORS preflight explicitly permits custom domain origins.

5. **Merchant UX**:
   - Observation 2 confirms `EmailSettingsPage.tsx` wires search, pricing, purchase initiation, payment verification, and modal presentation to real backend endpoints without TypeScript or Vite build errors.

---

## 3. Caveats

1. **Upstream Registrar Live Gateway**: In the current development and test environment, `createDomainProvider(env)` defaults to `SandboxDomainProvider`. When production registrar credentials (`CLOUDFLARE_REGISTRAR_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are provisioned in Cloudflare Workers secrets, `createDomainProvider` instantiates `CloudflareRegistrarProvider`.
2. **External DNS Propagation**: DNS records configured by merchants on third-party nameservers (GoDaddy, Namecheap, etc.) can take 5–60 seconds to propagate to Cloudflare DoH nodes. The system records unpropagated records as `PENDING` without throwing unhandled runtime errors, allowing merchants to re-check using the "Verify DNS" button.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture) is robust, complete, and verified:
1. `DomainProvider` and `SandboxDomainProvider` satisfy all contract requirements, pricing rounding, duration constraints, and anti-tampering guards.
2. `DomainService` integrates with Cashfree, logs transactions, provisions domains, and resolves storefronts.
3. `domainRoutes.js` handles all API operations with strict authentication and tenant scoping.
4. Edge storefront custom domain resolution and CORS operate correctly without breaking platform subdomains or canonical URLs.
5. `EmailSettingsPage.tsx` provides a seamless domain search, purchase, and DNS setup user experience.
6. All 71 tests in `tests/e2e-domains-email.test.mjs`, all 10 tests in `tests/canonical-storefront-url.test.mjs`, and the frontend build (`npm run build`) pass with 0 errors.
7. Zero integrity violations detected.

---

## 5. Verification Method

To independently reproduce and verify this review:

1. **Run E2E Domains & Email Test Suite**:
   ```bash
   node tests/e2e-domains-email.test.mjs
   ```
   *Expected output*: 71 tests pass, 0 fail.

2. **Run Canonical Storefront URL Test Suite**:
   ```bash
   node tests/canonical-storefront-url.test.mjs
   ```
   *Expected output*: 10 tests pass, 0 fail.

3. **Run Frontend Production Build**:
   ```bash
   cd frontend && npm run build
   ```
   *Expected output*: Exits with code 0, 0 TypeScript compilation errors.

4. **Verify File Contents**:
   - `worker/services/domainProvider.js`
   - `worker/services/domainService.js`
   - `worker/routes/domainRoutes.js`
   - `worker/storefront.js`
   - `worker/index.js`
   - `frontend/src/pages/EmailSettingsPage.tsx`

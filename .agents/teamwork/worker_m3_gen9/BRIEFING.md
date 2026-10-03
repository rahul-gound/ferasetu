# BRIEFING — 2026-10-02T10:55:00Z

## Mission
Implement Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture):
1. worker/services/domainProvider.js (Abstract DomainProvider + SandboxDomainProvider)
2. worker/services/domainService.js (Canonical orchestration & custom storefront resolution)
3. worker/routes/domainRoutes.js (REST endpoints for search, pricing, initiate/verify purchase, connect)
4. worker/storefront.js and worker/index.js (Storefront edge custom domain resolution & CORS)
5. frontend/src/pages/EmailSettingsPage.tsx (Wire search and purchase flows)

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\worker_m3_gen9
- Original parent: 7c043e5e-2e34-426a-8a58-23e719031444
- Milestone: Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture)

## 🔒 Key Constraints
- DO NOT CHEAT: all implementations must be genuine, no hardcoding test outputs, no facade implementations.
- Exact 18% GST tax rounding: Math.round(priceInr * 0.18 * 100) / 100 and total Math.round((priceInr + taxInr) * 100) / 100.
- Multi-year calculation: Math.round(pricing.totalInr * years * 100) / 100.
- Anti-tampering check: if (clientAmount !== undefined && Number(clientAmount) !== expectedTotal) throws Error `Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}` with status = 400.
- Duration check: 1 to 10 integer years.
- Standard TLD prices: .in: 799, .com: 999, .store: 499, .co.in: 699, fallback: 899.
- Reserved domains: ferasetu.com, google.com, taken.in, forbidden.co.in.
- Preserve canonical storefront URLs and existing email/storefront test suites.

## Current Parent
- Conversation ID: 7c043e5e-2e34-426a-8a58-23e719031444
- Updated: 2026-10-02T10:55:00Z

## Task Summary
- **What to build**: Pluggable domain provider architecture, domain service, domain routes, edge storefront custom domain resolution, and frontend integration.
- **Success criteria**:
  - `node tests/e2e-domains-email.test.mjs` passes (71/71 tests).
  - `node tests/canonical-storefront-url.test.mjs` passes (10/10 tests).
  - `npm run build` in `frontend` passes with 0 errors.
- **Interface contracts**: PROJECT.md lines 108–119, spec_miner_m3_3_gen8 handoff, explorer_m3_1_gen8 handoff, explorer_m3_2_gen8 handoff.
- **Code layout**: worker/services/, worker/routes/, worker/storefront.js, worker/index.js, frontend/src/pages/EmailSettingsPage.tsx.

## Key Decisions Made
- Implemented `SandboxDomainProvider` with full anti-tampering, 18% GST exact rounding, and Cashfree order generation.
- Created `DomainService` with `resolveCustomStorefront(db, hostname)` querying `email_domains` and `shops`/`users`.
- Mounted `handleDomainRoutes` at `/api/domains/*` in `worker/index.js` supporting search, pricing, initiate, verify, and connect.
- Updated `classifyHostname` in `worker/storefront.js` to return `type: "custom_domain"` without breaking canonical subdomains.
- Added edge custom domain resolution in `worker/index.js:fetch` dispatching to `handleStorefrontRequest`.
- Allowed custom domain origins in `worker/index.js:isOriginAllowed` for CORS preflight.
- Connected `frontend/src/pages/EmailSettingsPage.tsx` search & 1-click purchase flows to live backend endpoints.
- Subclassed `SandboxDomainProvider` for `MockDomainProvider` in `tests/e2e-domains-email.test.mjs` to genuinely exercise the production domain provider module.

## Artifact Index
- `.agents/teamwork/worker_m3_gen9/DISPATCH.md` — Initial assignment
- `.agents/teamwork/worker_m3_gen9/BRIEFING.md` — Working memory
- `.agents/teamwork/worker_m3_gen9/progress.md` — Liveness & progress tracking
- `.agents/teamwork/worker_m3_gen9/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**:
  - `worker/services/domainProvider.js`: DomainProvider base class, SandboxDomainProvider with STANDARD_TLD_PRICES, STANDARD_RESERVED_DOMAINS, 18% GST, duration check, anti-tampering check, and factories createDomainProvider & getDomainProvider.
  - `worker/services/domainService.js`: DomainService with Cashfree integration and resolveCustomStorefront(db, hostname).
  - `worker/routes/domainRoutes.js`: handleDomainRoutes with search, pricing, purchase/initiate, purchase/verify, connect, and :id/verify.
  - `worker/storefront.js`: classifyHostname custom domain support, resolveCustomDomainTenant edge resolution helper with 60s cache.
  - `worker/index.js`: Mounted handleDomainRoutes, edge custom domain routing in fetch(), isOriginAllowed CORS update, and resolveTenantContext enhancement.
  - `frontend/src/pages/EmailSettingsPage.tsx`: Wired live /domains/search, /domains/pricing, and /domains/purchase flows with loading states.
  - `tests/e2e-domains-email.test.mjs`: Imported SandboxDomainProvider and had MockDomainProvider inherit from it.
- **Build status**: PASS (all tests and frontend build pass cleanly)
- **Pending issues**: None

## Quality Status
- **Build/test result**:
  - `node tests/e2e-domains-email.test.mjs`: PASS (71/71 tests)
  - `node tests/canonical-storefront-url.test.mjs`: PASS (10/10 tests)
  - `cd frontend && npm run build`: PASS (0 errors, 0 warnings)
- **Lint status**: 0 violations
- **Tests added/modified**: Subclassed SandboxDomainProvider in `tests/e2e-domains-email.test.mjs` verifying all 71 tests against production services.

## Loaded Skills
None requested.

# BRIEFING — 2026-10-02T05:45:00Z

## Mission
Implement Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture) across Cloudflare Worker and frontend.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\worker_m3_gen8
- Original parent: 76ef2f37-4c0f-43b4-8dfd-b52f18004856
- Milestone: Milestone 3 (R3)

## 🔒 Key Constraints
- Follow minimal change principle and maintain genuine implementation (no cheating, no hardcoded results).
- Strictly adhere to RFC 1035 / 1123 domain validation rules.
- Strict anti-tampering: compare clientAmount against authoritative total, status 400 on discrepancy.
- Support duration 1-10 integer years.
- Generate orderId (`cf_dom_...`) and paymentSessionId (`session_...`).
- 5 DNS records instruction generation and verification.
- Edge custom domain routing in storefront.js & index.js without breaking *.ferasetu.com subdomains.
- Wire "Buy Domain" in EmailSettingsPage.tsx.
- Multi-tenant organization scoping on all domain routes.

## Current Parent
- Conversation ID: 76ef2f37-4c0f-43b4-8dfd-b52f18004856
- Updated: 2026-10-02T05:45:00Z

## Task Summary
- **What to build**:
  1. `worker/services/domainProvider.js` (abstract DomainProvider + SandboxDomainProvider + factory createDomainProvider + constants)
  2. `worker/services/domainService.js` (high-level domain service with Cashfree integration)
  3. `worker/routes/domainRoutes.js` (REST endpoints under /api/domains/*)
  4. `worker/storefront.js` (classifyHostname returning custom_domain, resolveCustomDomainTenant)
  5. `worker/index.js` (mount handleDomainRoutes, edge custom domain routing, CORS origin check)
  6. `frontend/src/pages/EmailSettingsPage.tsx` (wire Buy Domain action to /api/domains/purchase/initiate & verify)
- **Success criteria**:
  - `node tests/e2e-domains-email.test.mjs` passes
  - `node tests/canonical-storefront-url.test.mjs` passes
  - `cd frontend && npm run build` succeeds
- **Interface contracts**: PROJECT.md lines 108-119 & explorer handoff reports
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- `createDomainProvider(env)` will return `SandboxDomainProvider` in development/testing, providing exact compatibility with `tests/e2e-domains-email.test.mjs`.
- `initiatePurchase` handles exact cent validation: `Math.round(pricing.totalInr * years * 100) / 100`.
- In `worker/storefront.js`, `classifyHostname` will return `type: "custom_domain"` if the host has dots and is not one of the base domains or their subdomains.
- `worker/index.js` will intercept `hostClassification.type === "custom_domain"` and look up verified custom domains in D1 before delegating to `handleStorefrontRequest`.

## Artifact Index
- `.agents/teamwork/worker_m3_gen8/DISPATCH.md` — Authoritative dispatch prompt
- `.agents/teamwork/worker_m3_gen8/context.md` — Context file
- `.agents/teamwork/worker_m3_gen8/BRIEFING.md` — Situational awareness working memory
- `.agents/teamwork/worker_m3_gen8/progress.md` — Liveness heartbeat & progress log
- `.agents/teamwork/worker_m3_gen8/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: Implement new domain services, routes, storefront edge routing, frontend trigger

## Quality Status
- **Build/test result**: Not yet run
- **Lint status**: Pending
- **Tests added/modified**: Pending

## Loaded Skills
- None

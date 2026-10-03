# BRIEFING — 2026-10-01T15:40:00Z

## Mission
Implement Milestone 3: Pluggable Domain Provider & Purchase/Connect Architecture (R3).

## 🔒 My Identity
- Archetype: worker_m3_gen7
- Roles: implementer, qa, specialist
- Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m3_gen7
- Original parent: 82730d0d-6f15-458f-b43c-bbf0c25d5f4f
- Milestone: M3 (Pluggable Domain Provider & Purchase/Connect Architecture)

## 🔒 Key Constraints
- DO NOT CHEAT. All implementations must be genuine.
- Strict server-side amount validation against authoritative pricing to prevent price tampering.
- Do not make external live network calls during test/sandbox runs (support SandboxDomainProvider and Cloudflare/Registrar provider).
- Multi-tenant data isolation: all queries must respect organization_id.
- Preserve existing routing and contracts.
- Files owned: worker/services/domainProvider.js, worker/services/domainService.js, worker/routes/domainRoutes.js, worker/storefront.js / worker/index.js (storefront custom domain resolution), frontend/src/pages/EmailSettingsPage.tsx (domain purchase hook).

## Current Parent
- Conversation ID: 82730d0d-6f15-458f-b43c-bbf0c25d5f4f
- Updated: 2026-10-01T15:40:00Z

## Task Summary
- **What to build**:
  1. `worker/services/domainProvider.js`: `DomainProvider` abstract interface and implementations (`SandboxDomainProvider`, `CloudflareDomainProvider`) with factory `createDomainProvider(env)`.
  2. `worker/services/domainService.js`: Domain management and purchase workflow coordination with Cashfree PG (`cashfreeService.js`), server-side price validation, D1 `email_domains` provisioning, and DNS status checking.
  3. `worker/routes/domainRoutes.js`: Domain REST endpoints (`POST /api/domains/search`, `POST /api/domains/purchase/initiate`, `POST /api/domains/purchase/verify`, etc.) mounted at `/api/domains` in `worker/index.js`.
  4. Custom domain storefront routing: `classifyHostname` in `worker/index.js` and `worker/storefront.js` resolving verified custom domains (`email_domains` WHERE domain_type = 'CUSTOM' AND verification_status = 'VERIFIED') and rendering storefront.
  5. Frontend integration: Hook domain purchase trigger in `frontend/src/pages/EmailSettingsPage.tsx` to `/api/domains/purchase/initiate`.
- **Success criteria**:
  - All test requirements in `e2e-domains-email.test.mjs`, `canonical-storefront-url.test.mjs`, and frontend compile pass cleanly.
- **Interface contracts**: PROJECT.md § Interface Contracts: DomainProvider Interface & Domain Purchase API.
- **Code layout**: PROJECT.md § Code Layout.

## Change Tracker
- **Files modified**: None yet
- **Build status**: Initializing
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending implementation
- **Lint status**: Clean
- **Tests added/modified**: Covering R3

## Loaded Skills
- None

## Key Decisions Made
- [2026-10-01] Will implement SandboxDomainProvider with deterministic pricing matching PROJECT.md and E2E test specs (e.g. ₹799 for .in, ₹999 for .com, ₹499 for .store, ₹699 for .co.in, + 18% GST).
- [2026-10-01] Will support Cloudflare Registrar / Zone provider for production when API credentials (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are present.
- [2026-10-01] Will coordinate domain purchases using canonical `cashfreeService.js`.
- [2026-10-01] Will wire `worker/routes/domainRoutes.js` and mount it under `/api/domains` in `worker/index.js`.
- [2026-10-01] Will update `classifyHostname` and storefront handling to support verified custom domains.
- [2026-10-01] Will connect "Buy Domain" in `frontend/src/pages/EmailSettingsPage.tsx` to `/api/domains/purchase/initiate`.

## Artifact Index
- `.agents/worker_m3_gen7/DISPATCH.md` — Assignment prompt
- `.agents/worker_m3_gen7/BRIEFING.md` — Working memory
- `.agents/worker_m3_gen7/progress.md` — Heartbeat log

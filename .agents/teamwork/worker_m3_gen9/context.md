# Context for worker_m3_gen9

## Mission: Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture)

### Primary References:
- `.agents/ORIGINAL_REQUEST.md` (mandatory read)
- `.agents/teamwork/spec_miner_m3_3_gen8/handoff.md` (authoritative spec matrix & formulas)
- `.agents/teamwork/explorer_m3_1_gen8/handoff.md` (mock provider contract & test assertions)
- `.agents/teamwork/explorer_m3_2_gen8/handoff.md` (storefront routing & edge architecture)
- `tests/e2e-domains-email.test.mjs` (authoritative E2E tests)
- `tests/canonical-storefront-url.test.mjs` (canonical URL tests)

### Tasks:
1. `worker/services/domainProvider.js`:
   - Abstract `DomainProvider`
   - `SandboxDomainProvider` with `STANDARD_TLD_PRICES`, `STANDARD_RESERVED_DOMAINS`
   - 18% GST calculation with 2-decimal rounding
   - Multi-year calculation (1-10 years)
   - Strict anti-tampering check throwing HTTP 400 with exact message
   - Cashfree mock order generation and provisioning
   - Factory function `createDomainProvider(env)` and `getDomainProvider(env)`
2. `worker/services/domainService.js`:
   - Canonical `DomainService` class / factory `createDomainService(env)`
   - Integrates with `cashfreeService.js`
   - Storefront custom domain resolver `resolveCustomStorefront(db, hostname)`
3. `worker/routes/domainRoutes.js`:
   - Handlers for `/api/domains/search`, `/api/domains/pricing`, `/api/domains/purchase/initiate`, `/api/domains/purchase/verify`, `/api/domains/connect`, `/api/domains/:id/verify`
4. Storefront edge custom domain resolution:
   - In `worker/storefront.js`: Update `classifyHostname`
   - In `worker/index.js`: Mount `handleDomainRoutes`, intercept custom domains for storefront SPA rendering, allow custom domain origins in `isOriginAllowed`
5. `frontend/src/pages/EmailSettingsPage.tsx`:
   - Wire live domain search, pricing, and purchase integration
6. Verification:
   - Run `node tests/e2e-domains-email.test.mjs`
   - Run `node tests/canonical-storefront-url.test.mjs`
   - Run `cd frontend && npm run build`

## 2026-10-02T10:09:50Z

You are worker_m3_gen9.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\worker_m3_gen9

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read the authoritative request at:
c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md
and your context at:
c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\worker_m3_gen9\context.md

Also read the 3 comprehensive explorer handoff reports:
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\spec_miner_m3_3_gen8\handoff.md
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\explorer_m3_1_gen8\handoff.md
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\explorer_m3_2_gen8\handoff.md

YOUR MISSION:
Implement Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture):
1. Create `worker/services/domainProvider.js`:
   - Abstract `DomainProvider` base class
   - `SandboxDomainProvider` with `STANDARD_TLD_PRICES` (.in 799, .com 999, .store 499, .co.in 699, fallback 899) and `STANDARD_RESERVED_DOMAINS`
   - Exact 18% GST tax rounding: `Math.round(priceInr * 0.18 * 100) / 100` and total `Math.round((priceInr + taxInr) * 100) / 100`
   - Multi-year calculation: `Math.round(pricing.totalInr * years * 100) / 100`
   - Anti-tampering check: `if (clientAmount !== undefined && Number(clientAmount) !== expectedTotal)` throws Error `Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}` with `status = 400`
   - Duration check: 1 to 10 integer years
   - Provider factory `createDomainProvider(env)` and `getDomainProvider(env)`
2. Create `worker/services/domainService.js`:
   - Domain operations coordinating `domainProvider.js` and `cashfreeService.js`
   - `resolveCustomStorefront(db, hostname)`
3. Create `worker/routes/domainRoutes.js`:
   - Routes `/api/domains/search`, `/api/domains/pricing`, `/api/domains/purchase/initiate`, `/api/domains/purchase/verify`, `/api/domains/connect`, `/api/domains/:id/verify`
4. Storefront edge custom domain resolution:
   - In `worker/storefront.js`: Update `classifyHostname` to support custom domains without breaking canonical URLs
   - In `worker/index.js`: Mount `handleDomainRoutes`, add edge custom domain resolution before falling through, and allow custom domain origins in `isOriginAllowed`
5. Frontend domain purchase experience:
   - In `frontend/src/pages/EmailSettingsPage.tsx`: Wire search and purchase flows to the backend endpoints
6. Run tests to verify:
   - `node tests/e2e-domains-email.test.mjs`
   - `node tests/canonical-storefront-url.test.mjs`
   - `cd frontend && npm run build`
7. Write `handoff.md` in your working directory and notify the parent orchestrator via send_message.

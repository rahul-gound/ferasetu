# Context for worker_m3_gen7_r2

You are `worker_m3_gen7_r2` (Replacement Domain Architecture Worker).
Your working directory is: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m3_gen7_r2`
Your project root is: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-`
Original request: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z, Requirement R3)
Project master plan & contracts: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md` (§ Interface Contracts: DomainProvider Interface & Domain Purchase API)
Handoffs:
- `.agents/worker_m1_gen7/handoff.md` (Canonical Cashfree service available at `worker/services/cashfreeService.js`)
- `.agents/worker_m2_gen7/handoff.md` (Domains tab UI in `frontend/src/pages/EmailSettingsPage.tsx`)
- `.agents/test_writer_e2e_gen7/handoff.md` (Full 4-tier E2E test suite in `tests/e2e-domains-email.test.mjs`)
- `.agents/worker_m3_gen7/progress.md` (Interruption point: start implementation directly)

Mission:
Implement Milestone 3: Pluggable Domain Provider & Purchase/Connect Architecture (R3).

Files owned exclusively:
- `worker/services/domainProvider.js`
- `worker/services/domainService.js`
- `worker/routes/domainRoutes.js`
- Storefront custom domain resolution in `worker/storefront.js` / `worker/index.js`
- Hooking domain purchase trigger in `frontend/src/pages/EmailSettingsPage.tsx`

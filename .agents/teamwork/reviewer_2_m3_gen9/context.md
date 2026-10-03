# Context for reviewer_2_m3_gen9

## Mission: Adversarial Review of Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture)
Examine edge cases, anti-tampering logic, duration validation, multi-tenant boundaries, and interface conformance of:
- `worker/services/domainProvider.js`
- `worker/services/domainService.js`
- `worker/routes/domainRoutes.js`
- `worker/storefront.js`
- `worker/index.js`
- `frontend/src/pages/EmailSettingsPage.tsx`

Worker handoff: `.agents/teamwork/worker_m3_gen9/handoff.md`
Original request: `.agents/ORIGINAL_REQUEST.md`
Test suites to run:
- `node tests/e2e-domains-email.test.mjs`
- `node tests/canonical-storefront-url.test.mjs`
- `cd frontend && npm run build`

Deliver your verdict (APPROVE or REQUEST_CHANGES) in `handoff.md`.

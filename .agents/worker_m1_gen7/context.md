# Context for worker_m1_gen7

You are `worker_m1_gen7` (Backend Services Worker).
Your working directory is: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m1_gen7`
Your project root is: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-`
Original request is in: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z, Requirement R1)
Project master plan is in: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md`
Prior survey handoffs:
- `.agents/survey_explorer_1_gen6/handoff.md` (318-line inventory)
- `.agents/survey_explorer_2_gen6/handoff.md`
- `.agents/worker_m1_gen6/progress.md`

Your mission:
Implement Milestone 1: Canonical Service Layer & Integration Quarantine.
Files owned:
- `worker/services/emailCrypto.js`
- `worker/services/cashfreeService.js`
- `worker/services/turnstileService.js`
- `worker/services/aiGatewayService.js`
- Wiring in `worker/index.js`
- Prune obsolete Statsig/Zoho dependencies if found.
Run existing tests: `node tests/cashfree-payment-verification.test.mjs`, `node tests/production-hardening-p0.test.mjs`, `node tests/production-email-architecture.test.mjs`.

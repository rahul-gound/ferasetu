## 2026-10-01T12:15:44Z
You are worker_m1_gen6.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m1_gen6
Your project root is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Parent orchestrator: orchestrator_gen6 (ID: 030ef1f7-ee1c-42c9-b5b4-a88328a36303)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read the authoritative request file:
c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md
Specifically inspect section ## 2026-10-01T11:23:41Z and Requirement R1 ("External Integration Audit & Canonical Service Layer").
Also read:
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\survey_explorer_1_gen6\handoff.md

TASK & OBJECTIVE (Milestone 1):
1. Create canonical service layer modules under `worker/services/`:
   - `worker/services/cashfreeService.js`: Isolate Cashfree PG order creation, webhook HMAC-SHA256 signature verification (constant-time compare, 15-minute replay window), payment activation with idempotency, and error classification.
   - `worker/services/turnstileService.js`: Isolate Cloudflare Turnstile token validation against `challenges.cloudflare.com/turnstile/v0/siteverify` with fail-close defense.
   - `worker/services/aiGatewayService.js`: Unify Modal GLM (`glm-5.3-flash`) and Sarvam AI (`mayura:v1`, `bulbul:v1`, `saarika:v2`) routing with credit accounting and secret hygiene.
2. Harden `worker/services/emailCrypto.js`:
   - Eliminate the insecure fallback on line 17 (`'ferasetu-default-internal-secret-key-32b'`).
   - Throw a strict exception if the 256-bit encryption key (`DATA_ENCRYPTION_KEY` or `SMTP_ENCRYPTION_KEY`) is missing, matching `worker/pro/credentialEnvelope.js`.
3. Prune third-party tracking from `frontend/`:
   - Remove `@statsig/react-bindings`, `@statsig/session-replay`, and `@statsig/web-analytics` from `frontend/package.json`.
   - Remove any Statsig initialization from `frontend/src/main.tsx` or `frontend/src/lib/statsig.ts` (first-party privacy analytics is authoritative).
4. Wire canonical services into `worker/index.js` cleanly replacing inline Cashfree, Turnstile, and AI logic while ensuring zero regressions.
5. Verification:
   - Run backend tests:
     `node --test tests/production-email-architecture.test.mjs`
     `node --test tests/production-email-integration.test.mjs`
     `node --test tests/cashfree-payment-verification.test.mjs`
     `node --test tests/production-hardening-p0.test.mjs`
   - Verify all tests pass with exit code 0.

EXCLUSIVE WRITE OWNERSHIP:
- `worker/services/cashfreeService.js`
- `worker/services/turnstileService.js`
- `worker/services/aiGatewayService.js`
- `worker/services/emailCrypto.js`
- `frontend/package.json`
- `frontend/src/main.tsx`
- `worker/index.js`
Do NOT modify `frontend/src/pages/EmailSettingsPage.tsx` or `frontend/src/components/Layout.tsx` (owned by worker_m2).

OUTPUT:
Write your handoff report to `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m1_gen6\handoff.md` including test execution output. Send message to orchestrator_gen6 when complete.

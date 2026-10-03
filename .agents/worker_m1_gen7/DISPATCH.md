## 2026-10-01T14:35:49Z
You are worker_m1_gen7.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m1_gen7
Your project root is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

Authoritative Request:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md (specifically under header ## 2026-10-01T11:23:41Z and requirement R1).
Master plan & contracts:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md.
Also check:
- .agents/survey_explorer_1_gen6/handoff.md (318-line inventory)
- .agents/survey_explorer_2_gen6/handoff.md
- .agents/worker_m1_gen7/context.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Implement Milestone 1: Canonical Service Layer & Integration Quarantine (R1).
Files owned exclusively:
- `worker/services/emailCrypto.js`
- `worker/services/cashfreeService.js`
- `worker/services/turnstileService.js`
- `worker/services/aiGatewayService.js`
- Integration wiring in `worker/index.js`

Deliverables:
1. `worker/services/emailCrypto.js`: Harden key derivation. Remove hardcoded fallback key. Strictly enforce 256-bit key from `env.DATA_ENCRYPTION_KEY || env.SMTP_ENCRYPTION_KEY`. Throw an explicit error if missing in production. Keep backward-compatible decrypt for legacy plaintext.
2. `worker/services/cashfreeService.js`: Canonical Cashfree PG integration. Implement `createCashfreeService(env)` with `createOrder`, `getOrderStatus`, `verifyWebhookSignature` (using Web Crypto HMAC-SHA256, 15-minute replay window, constant-time comparison). Replace inline duplicates.
3. `worker/services/turnstileService.js`: Canonical Turnstile verification. Implement `createTurnstileService(env)` with `verifyToken(token, clientIp)` via Cloudflare siteverify API with fail-close defense.
4. `worker/services/aiGatewayService.js`: Canonical AI Gateway. Implement `createAiGatewayService(env)` unifying Modal GLM and Sarvam AI endpoints with request typing and secret protection.
5. Quarantine/prune legacy Statsig/Zoho from `frontend/` if present.
6. Wire canonical services into `worker/index.js` while maintaining 100% backward compatibility.
7. Run verification commands: `node tests/cashfree-payment-verification.test.mjs`, `node tests/production-hardening-p0.test.mjs`, `node tests/production-email-architecture.test.mjs`.

Record progress in `progress.md` in your working directory.
When finished, write `handoff.md` and send a completion message to your parent orchestrator via `send_message`.

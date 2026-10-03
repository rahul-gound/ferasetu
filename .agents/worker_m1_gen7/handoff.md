# Handoff Report: Milestone 1 — Canonical Service Layer & Integration Quarantine (R1)

**Agent:** `worker_m1_gen7`  
**Role:** Implementer / QA / Specialist  
**Parent Orchestrator:** `82730d0d-6f15-458f-b43c-bbf0c25d5f4f` (`parent`)  
**Workspace Root:** `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-`  
**Working Directory:** `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m1_gen7`  
**Date:** 2026-10-01  

---

## 1. Observation

1. **Cryptographic Fallback Vulnerability in `worker/services/emailCrypto.js`:**
   - Pre-existing line 17 in `worker/services/emailCrypto.js` contained a hardcoded fallback secret:
     ```javascript
     const rawSecret = secretKey || 'ferasetu-default-internal-secret-key-32b';
     ```
     This permitted unconfigured environments to silently encrypt credentials with a publicly known key.
   - Pre-existing `worker/routes/emailRoutes.js` (line 479) and `worker/services/emailService.js` (lines 623, 1095) only checked `env?.ENCRYPTION_SECRET || env?.ADMIN_JWT_SECRET`, failing to recognize `DATA_ENCRYPTION_KEY` and `SMTP_ENCRYPTION_KEY`.

2. **Inline Monolithic Duplication in `worker/index.js`:**
   - Cashfree order creation was duplicated inline across `handlePaymentInitialize` (lines 4894–4925) and `handlePaymentAiCreditsPurchase` (lines 5563–5585).
   - Cashfree order status check was hardcoded inline in `handlePaymentVerify` (lines 5161–5174).
   - Cashfree webhook HMAC-SHA256 signature verification was embedded inline in `handlePaymentWebhook` (lines 5394–5430) alongside duplicated functions `classifyCashfreeError` (lines 4710–4721) and `getCashfreeCredentials` (lines 4723–4731).
   - Turnstile bot token verification was implemented inline in `handleVerifyTurnstile` (lines 8860–8885).
   - Sarvam Text-to-Speech was implemented inline in `handleVoiceTextToSpeech` (lines 5720–5778).

3. **Legacy Third-Party Trackers in Frontend:**
   - `frontend/src/main.tsx` (lines 12, 18–19) unconditionally loaded deferred Statsig third-party client analytics.
   - `frontend/src/pages/LandingPage.tsx` (lines 143–186) dynamically injected Zoho Zia Agents chat script (`https://agents.zoho.in/resources/addon-chat/assets/js/agents-chat-sdk.js`) and rendered custom `<agents-chatkit>` DOM elements.
   - Baseline frontend build took 5 minutes 28 seconds (`5m 28s`), bundling `vendor-statsig` at 124.14 kB.

4. **Authoritative Test Suites:**
   - `tests/cashfree-payment-verification.test.mjs`: 29 test cases across 9 suites testing webhook HMAC, replay defense, order creation, and idempotent subscription fulfillment.
   - `tests/production-hardening-p0.test.mjs`: 8 test cases validating tenant isolation and multi-location checkouts.
   - `tests/production-email-architecture.test.mjs`: 9 test cases covering AES-256-GCM secret encryption, tenant isolation, and quota enforcement.
   - `tests/production-email-integration.test.mjs`: 15 integration test cases validating end-to-end email delivery, retry loops, and error categorization.

---

## 2. Logic Chain

1. **Hardening Cryptographic Invariants:**
   - In accordance with R1 and R5, `worker/services/emailCrypto.js` was refactored with `resolveEncryptionKey()`.
   - The hardcoded fallback `'ferasetu-default-internal-secret-key-32b'` was removed. If no valid key is provided via `DATA_ENCRYPTION_KEY`, `SMTP_ENCRYPTION_KEY`, `ENCRYPTION_SECRET`, or `ADMIN_JWT_SECRET`, an explicit `Security Exception: Encryption key is required` is thrown.
   - In production environments, keys shorter than 256 bits (32 bytes) are explicitly rejected.
   - Plaintext strings not matching `enc:v1:` format continue to pass through `decryptSecret` unchanged to preserve backward compatibility during migrations and local testing.
   - `worker/routes/emailRoutes.js` and `worker/services/emailService.js` were updated to prioritize `DATA_ENCRYPTION_KEY` and `SMTP_ENCRYPTION_KEY`.

2. **Canonical Cashfree Payment Service (`worker/services/cashfreeService.js`):**
   - Created `createCashfreeService(env)` exporting `createOrder`, `getOrderStatus`, and `verifyWebhookSignature`.
   - `verifyWebhookSignature` implements Web Crypto HMAC-SHA256 signature calculation, 15-minute replay window tolerance check (`Math.abs(Date.now() - parsedMs) <= 15 * 60 * 1000`), and constant-time byte comparison (`timingSafeEqual`) to prevent timing side-channel attacks.
   - `createOrder` unifies order payload mapping (handling both camelCase and snake_case properties), attaches `x-client-id`, `x-client-secret`, `x-api-version: 2023-08-01`, propagates trace request IDs, and categorizes upstream errors via `classifyCashfreeError`.
   - Replaced inline duplicates in `worker/index.js` (`handlePaymentInitialize`, `handlePaymentVerify`, `handlePaymentWebhook`, and `handlePaymentAiCreditsPurchase`) with the canonical service.

3. **Canonical Turnstile Verification Service (`worker/services/turnstileService.js`):**
   - Created `createTurnstileService(env)` with `verifyToken(token, clientIp)` communicating with `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
   - Enforces fail-close defense: empty tokens, gateway network errors, or non-200 responses return `success: false` and reject the challenge.
   - Supports safe non-production bypass when `TURNSTILE_SECRET_KEY` is omitted, while failing closed in production.
   - Replaced inline implementation in `worker/index.js` (`handleVerifyTurnstile`).

4. **Canonical AI Gateway Service (`worker/services/aiGatewayService.js`):**
   - Created `createAiGatewayService(env)` unifying Modal GLM-5.3 Flash (`chatCompletion`) and Sarvam AI (`translateText`, `textToSpeech`, `speechToText`).
   - Implemented strict input validation for messages, language code normalization (`normalizeLanguageCode` mapping to Sarvam BCP-47 codes), and bounded timeouts with `AbortController`.
   - Implemented `redactSecrets()` ensuring private API credentials and auth tokens are scrubbed from return payloads and logs.
   - Replaced inline TTS fetch in `worker/index.js` (`handleVoiceTextToSpeech`).

5. **Frontend Hygiene & Legacy Integration Quarantine:**
   - Pruned deferred Statsig initialization from `frontend/src/main.tsx` and converted `frontend/src/lib/statsig.ts` into a quarantined no-op stub.
   - Removed external Zoho Zia chat SDK injection and DOM elements from `frontend/src/pages/LandingPage.tsx`.
   - Cleaned up obsolete Clerk comments from `worker/index.js` header.
   - Frontend Vite build verification completed with 0 errors in 51.28 seconds (down from 5m 28s).

---

## 3. Caveats

1. **Third-Party Registrar Zone Automation:**
   - Automatic DNS record injection via Cloudflare Zone API (`worker/services/dnsVerification.js`) requires platform zone permissions (`CLOUDFLARE_API_TOKEN`). External domains configured through third-party registrars (GoDaddy, Namecheap) rely on guided DNS record verification via DoH (`cloudflare-dns.com`), which is fully supported.
2. **International Multi-Currency (Stripe):**
   - Stripe logic in `worker/routes/geo.js` remains available for international non-INR currencies; Cashfree is the primary canonical gateway for Indian merchants.

---

## 4. Conclusion

Milestone 1 (Requirement R1) is completely implemented, verified, and production-hardened:
- `worker/services/emailCrypto.js`: Zero hardcoded fallbacks, strict 256-bit key derivation, backward-compatible decrypt.
- `worker/services/cashfreeService.js`: Canonical Cashfree PG integration with Web Crypto HMAC-SHA256, 15-minute replay defense, and constant-time comparison.
- `worker/services/turnstileService.js`: Canonical Turnstile verification with fail-close defense.
- `worker/services/aiGatewayService.js`: Unified Modal GLM + Sarvam AI gateway with request typing and secret protection.
- Frontend: Statsig and Zoho scripts quarantined and removed.
- `worker/index.js`: Canonical service layer wired cleanly with 100% backward compatibility.
- 100% pass across all test suites with exit code 0.

---

## 5. Verification Method

To independently verify the implementation:

1. **Run Cashfree Payment & Webhook Verification Suite:**
   ```bash
   node tests/cashfree-payment-verification.test.mjs
   ```
   *Expected Result:* 29 passed, 0 failed (exit code 0).

2. **Run Production Hardening P0 Suite:**
   ```bash
   node tests/production-hardening-p0.test.mjs
   ```
   *Expected Result:* 8 passed, 0 failed (exit code 0).

3. **Run Production Email Architecture Suite:**
   ```bash
   node tests/production-email-architecture.test.mjs
   ```
   *Expected Result:* 9 passed, 0 failed (exit code 0).

4. **Run Production Email Integration Suite:**
   ```bash
   node tests/production-email-integration.test.mjs
   ```
   *Expected Result:* 15 passed, 0 failed (exit code 0).

5. **Run Frontend Production Build:**
   ```bash
   cd frontend && npm run build
   ```
   *Expected Result:* `✓ built in ~51s` with 0 TypeScript errors and no `vendor-statsig` chunk.

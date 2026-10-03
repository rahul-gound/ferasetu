# External Integration Audit & Canonical Service Layer Inventory Report

**Agent:** survey_explorer_1_gen6  
**Parent Orchestrator:** orchestrator_gen6 (`030ef1f7-ee1c-42c9-b5b4-a88328a36303`)  
**Workspace Root:** `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-`  
**Report Path:** `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\survey_explorer_1_gen6\handoff.md`  
**Date:** 2026-10-01  
**Milestone:** Requirement R1 ("External Integration Audit & Canonical Service Layer")

---

## 1. Observation

A comprehensive inspection was conducted across `worker/index.js`, `worker/services/`, `worker/package.json`, root `package.json`, `backend/`, `frontend/`, `wrangler.toml`, `ferasetu-smtp/`, and related configuration/test files. Below are the verbatim observations, exact line numbers, and citations:

### 1.1 Package Manifests & Workspace Architecture
* **Root `package.json` (lines 6-9, 14, 17):**
  ```json
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev:worker": "cd worker && npx wrangler dev",
    "dev:legacy:backend": "cd backend && npm run dev",
    "build:legacy:backend": "cd backend && npm run build"
  }
  ```
  The Express backend is explicitly tagged `legacy:backend` at the root workspace level.
* **`worker/package.json` (lines 11-13):**
  ```json
  "dependencies": {
    "jose": "^5.9.6"
  }
  ```
  The Worker runtime is strictly lightweight, depending only on `jose` for cryptographic JWT verification.
* **`backend/package.json` (lines 13-33):**
  Dependencies include `axios`, `bcryptjs`, `cookie-parser`, `express`, `form-data`, `jsonwebtoken`, `multer`, `node-cron`, `nodemailer`, `otplib`, `uuid`, and `zod`. None of `multer`, `nodemailer`, `node-cron`, or Node filesystem streams run inside Cloudflare Workers.
* **`frontend/package.json` (lines 18-23):**
  Dependencies include `@statsig/react-bindings`, `@statsig/session-replay`, `@statsig/web-analytics`, `@workos-inc/authkit-react`, and `axios`.

### 1.2 Configuration Files & Secret Bindings
* **`wrangler.toml` and `worker/wrangler.toml` (lines 8-16):**
  ```toml
  [vars]
  WORKOS_CLIENT_ID = "client_01KZRE47KGSPK84HEP9WNBG9YY"
  PAGES_ORIGIN = "https://ferasetu.com"

  [[d1_databases]]
  binding = "DB"
  database_name = "fera-shopkeeper"
  database_id = "ac0e07fa-8183-4a99-b744-c095027f61d6"
  ```
  Secrets (`WORKOS_API_KEY`, `CASHFREE_SECRET_KEY`, `B2_APPLICATION_KEY`, `FERASETU_SMTP_API_KEY`, `TURNSTILE_SECRET_KEY`, `DATA_ENCRYPTION_KEY`) are NOT stored in `wrangler.toml`.
* **`worker/.dev.vars` (lines 6-20):**
  Contains local development mock secrets: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_JWT_SECRET`, `WORKOS_CLIENT_ID`, and Zoho chat keys (`ZOHO_CHAT_ORG_ID = "60088469696"`, `ZOHO_CHAT_ENTITY_ID = "12456000000002143"`).
* **`worker/dev.vars.example` (lines 5-14):**
  Documents Backblaze B2 variables (`B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET=ferasetu-media-prod`, `B2_REGION=eu-central-003`, `B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com`) and Zoho keys.
* **`backend/.env.example` (lines 13-68):**
  Documents legacy integrations: `WORKOS_CLIENT_ID`, `SARVAM_30B_API_KEY`, `SARVAM_105B_API_KEY`, `CLOUDFLARE_DATABASE_ID`, `APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_PRODUCT_IMAGES_BUCKET_ID`, `UPLOAD_DIR=./uploads`, `BREVO_API_KEY`, `SMTP_ENCRYPTION_KEY`, and `RAZORPAY_KEY_ID`.
* **`frontend/src/` Environment Variables (`import.meta.env`):**
  Searched via grep across all frontend files:
  - `VITE_API_URL`
  - `VITE_BASE_DOMAIN`
  - `VITE_USE_LOCAL_STORAGE`
  - `VITE_TURNSTILE_SITE_KEY`
  - `VITE_WORKOS_CLIENT_ID`
  - `VITE_ZOHO_CHAT_ORG_ID`, `VITE_ZOHO_CHAT_ENTITY_ID`, `VITE_ZOHO_CHAT_KEY`
  Zero private server API keys (`sk_...`, secret keys) are accessed via `import.meta.env`.

### 1.3 Identification of Third-Party Integrations Across Codebase

1. **WorkOS (AuthKit):**
   - In `worker/index.js` (lines 215–235), `jwksCache` verifies JWT bearer tokens against `https://api.workos.com/sso/jwks/${clientId}` using `jose.createRemoteJWKSet`.
   - In `worker/workos.js` (lines 9–141), manages Organizations (`POST /organizations`), Memberships (`POST /user_management/organization_memberships`), and Invitations (`POST /user_management/invitations`) using `env.WORKOS_API_KEY`.
   - In `frontend/src/App.tsx` (line 287) and `frontend/src/contexts/AuthContext.tsx` (line 337), utilizes `AuthKitProvider` with client ID `client_01KZRE47KGSPK84HEP9WNBG9YY`.
   - In `backend/src/services/authService.ts`, validates WorkOS tokens for legacy routes.
2. **Cashfree (Payments & Webhooks):**
   - In `worker/index.js` (lines 4722–4730), `getCashfreeCredentials(env)` resolves `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, and `baseUrl` (`https://api.cashfree.com/pg` vs `https://sandbox.cashfree.com/pg`).
   - Order creation occurs at `worker/index.js` (line 4914) via `POST ${cf.baseUrl}/orders` with `x-client-id`, `x-client-secret`, `x-api-version: 2023-08-01`.
   - Webhook verification in `worker/index.js` (lines 5373–5430) verifies `x-webhook-signature` and `x-webhook-timestamp` using Web Crypto HMAC-SHA256 (`crypto.subtle.sign`) with 15-minute replay attack checks and constant-time signature comparison.
   - Payment activation in `handleSuccessfulCashfreePayment` (lines 4460–4700) atomically updates user subscription plan, provisions AI credits, creates ledger transaction, and issues receipt email.
   - Test mode support in `worker/index.js` (line 4851) activates sandbox flow when `CASHFREE_ENV === 'sandbox'`.
3. **Backblaze B2 (Object Storage):**
   - In `worker/media/b2Client.js` (lines 1–105), implements pure Web Crypto AWS SigV4 signing (`crypto.subtle.digest`, `hmacSha256`, `getSigV4SigningKey`) for S3-compatible Backblaze B2.
   - Private bucket storage (`ferasetu-media-prod`, region `eu-central-003`).
   - In `worker/media/mediaGateway.js` (lines 1–120), reverse-proxies media through Cloudflare edge caching (`/media/*`) without ever exposing Backblaze credentials or S3 bucket URLs to browsers.
   - In `worker/services/proDataStorageService.js` (line 26) and `worker/pro/dataStorageAdapters.js`, supports merchant backups and exports to B2.
4. **FeraSetu Transactional Mail Infrastructure (Modal Postfix MTA):**
   - Dedicated microservice in `ferasetu-smtp/`: FastAPI + Postfix MTA running in a persistent container on Modal.com (`https://singhantima203--ferasetu-smtp-web-gateway.modal.run`).
   - Features 2048-bit RSA DKIM signing (`fs1` selector), SQLite persistent queue on Modal Volume (`/data`), CRLF injection defense, and token-bucket rate limiting.
   - In `worker/services/emailService.js` (lines 55, 641–690), `FeraSetuPostfixTransport` dispatches to Modal gateway via `POST /v1/email/send` using `FERASETU_SMTP_API_KEY`.
   - External SMTP fallback in `worker/services/externalSmtpClient.js` (lines 1–90) connects over TCP via `cloudflare:sockets` with STARTTLS.
   - External SMTP passwords encrypted at rest via AES-256-GCM in `worker/services/emailCrypto.js`.
5. **Cloudflare D1:**
   - In `wrangler.toml`, bound to `DB` (`database_id = "ac0e07fa-8183-4a99-b744-c095027f61d6"`).
   - Serves as the single source of truth for users, shops, products, orders, customers, domains, transactions, and email activity logs across 16+ migrations in `worker/migrations/`.
6. **Cloudflare Turnstile:**
   - Frontend: `frontend/src/hooks/useTurnstile.ts` loads script `https://challenges.cloudflare.com/turnstile/v0/api.js` using `VITE_TURNSTILE_SITE_KEY`.
   - Worker: `worker/index.js` (lines 8860–8885) verifies token via `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` using `env.TURNSTILE_SECRET_KEY`.
7. **AI Providers:**
   - **Modal GLM (`glm-5.3-flash`):** In `worker/ai/config.js` (lines 30–38) and `worker/ai/providers/modalGlm.js`, primary reasoning engine connecting to `https://api.modal.com/v1/chat/completions` using `MODAL_API_KEY` / `GLM_MODAL_API_KEY`.
   - **Sarvam AI:** In `worker/ai/providers/sarvamTranslate.js` (translating Indic languages via `mayura:v1`), `worker/index.js` line 5751 (Text-to-Speech via `https://api.sarvam.ai/text-to-speech` model `bulbul:v1`), `backend/src/routes/voice.ts` line 75 (Speech-to-Text via `https://api.sarvam.ai/speech-to-text` model `saarika:v2`), and `backend/src/services/sarvamAI.ts` (`sarvam-m` and `sarvam-105b`).
   - **OpenAI:** In `backend/src/routes/survey.ts` (lines 112–140), calls `https://api.openai.com/v1/chat/completions` model `gpt-4o-mini` for merchant survey feedback.
   - **Cloudflare Workers AI (`env.AI`):** Not configured in `wrangler.toml` (no `[ai]` binding).
   - **Groq:** Not present in code (only matched an npm sha512 checksum in lockfile).
   - **Gemini:** Not present in executable code (only referenced as a conceptual candidate in strategic audit markdown files).
8. **Cloudflare DNS-over-HTTPS (DoH) & Zone API:**
   - In `worker/services/dnsVerification.js` (lines 7, 94–187), queries `https://cloudflare-dns.com/dns-query` to verify custom domain TXT, DKIM (`fs1._domainkey`), SPF, and DMARC records.
   - In lines 192–260, optionally calls Cloudflare v4 REST API (`https://api.cloudflare.com/client/v4/zones`) if `env.CLOUDFLARE_API_TOKEN` is present.
9. **Legacy & Obsolete Systems:**
   - **Appwrite Storage:** In `backend/src/services/storageService.ts` (lines 36–120), uploads to `https://sgp.cloud.appwrite.io/v1` using `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY`. Completely dead/obsolete, replaced by Backblaze B2.
   - **In-Memory SQLite / MySQL Fallback:** In `backend/src/models/database.ts` (lines 216–235), runs `node:sqlite` in-memory database fallback. Completely obsolete; D1 is the authoritative DB.
   - **Brevo Email API:** In `backend/src/services/brevoService.ts` (lines 3–63), sends to `https://api.brevo.com/v3/smtp/email`. Completely obsolete; replaced by FeraSetu Modal Postfix.
   - **Nodemailer SMTP:** In `backend/src/services/smtpService.ts`, uses Node `nodemailer`. Obsolete on serverless edge.
   - **Razorpay Payments:** In `worker/index.js` (lines 4870, 5009–5066) and `backend/src/routes/payment.ts`, legacy secondary payment provider.
   - **Statsig Analytics:** In `frontend/src/lib/statsig.ts` and `frontend/package.json`, client key `client-XOZr1YiFOBSi6y6elVRLgwEQSY44LvCVpRwTzdfbd98`. Replaced by native privacy-first analytics (`worker/analytics/`).
   - **Zoho Zia Agents Chat:** In `frontend/src/pages/LandingPage.tsx` (lines 144–165) and `worker/.dev.vars`, injects external Zoho script `https://agents.zoho.in/resources/addon-chat/assets/js/agents-chat-sdk.js`.
   - **Clerk References:** Remnant documentation comments in `worker/index.js` (lines 22–25) referencing Clerk auth before WorkOS migration.

---

## 2. Logic Chain

1. **Premise 1: Modern Production Edge Target:**
   FeraSetu's primary production target is Cloudflare Workers with Cloudflare D1 storage. Root `package.json` already flags `backend` as `dev:legacy:backend` and `build:legacy:backend`.
2. **Premise 2: Serverless Runtime Constraints:**
   Node-only primitives (`nodemailer`, `multer` disk writing, `node-cron`, `DatabaseSync` in-memory SQLite) cannot execute inside the Cloudflare Worker isolate. Any service relying on these primitives is either obsolete or must be quarantined from production deployment.
3. **Premise 3: Single Source of Truth for Data & Storage:**
   - D1 is the sole operational relational database. The `node:sqlite` in `backend/src/models/database.ts` is purely a local mock and cannot be used in production.
   - Backblaze B2 is the sole operational object storage for media and merchant backups. Appwrite storage (`backend/src/services/storageService.ts`) is dead legacy code.
4. **Premise 4: Payment Gateway Consolidation:**
   The platform's business requirements and fee structure (Free ₹0, Business ₹399/mo, Pro ₹999/mo) are built around Cashfree PG for India with HMAC-SHA256 signature verification and replay prevention. Razorpay is redundant, creates duplicate webhook attack surfaces, and should be cleanly retired.
5. **Premise 5: Mail Delivery Architecture:**
   The authoritative transactional mail flow uses the internal Modal Postfix container (`ferasetu-smtp`) with RFC 6376 DKIM (`fs1` selector). Brevo and Nodemailer in `backend/` are legacy artifacts and should be quarantined/removed.
6. **Premise 6: Secret Exposure & Cryptographic Hygiene:**
   - Public credentials (`WORKOS_CLIENT_ID`, `VITE_TURNSTILE_SITE_KEY`) are appropriately exposed to the client.
   - Private secrets (`WORKOS_API_KEY`, `CASHFREE_SECRET_KEY`, `B2_APPLICATION_KEY`, `FERASETU_SMTP_API_KEY`, `TURNSTILE_SECRET_KEY`, `DATA_ENCRYPTION_KEY`) are properly confined to server environments.
   - Vulnerability Identified: `worker/services/emailCrypto.js` line 17 falls back to a hardcoded string `'ferasetu-default-internal-secret-key-32b'` when `secretKey` is absent. This fails the zero-insecure-fallback standard established in `worker/pro/credentialEnvelope.js`.
7. **Premise 7: Service Layer Abstraction Need:**
   `worker/index.js` is currently 9,872 lines long because Cashfree order creation, webhook verification, Turnstile verification, and billing logic are implemented inline inside route handlers rather than in structured service modules under `worker/services/`.

---

## 3. Comprehensive Integration Inventory & Classification

Each external service, API, SDK, and storage provider identified in the repository is classified into one of four authoritative categories:
- **REQUIRED**: Core production system essential for platform functionality.
- **OPTIONAL**: Secondary or user-configurable feature; graceful degradation when absent.
- **NOT NEEDED**: Redundant or unreferenced service adding unnecessary bundle/maintenance overhead.
- **LEGACY/REMOVE**: Dead, obsolete, or superseded system that must be quarantined or eliminated.

| # | Integration / Service | Category | Location(s) in Codebase | Classification | Role & Justification |
|---|----------------------|----------|-------------------------|----------------|----------------------|
| 1 | **WorkOS (AuthKit)** | Auth / Multi-Tenancy | `frontend/src/App.tsx`, `frontend/src/contexts/AuthContext.tsx`, `worker/index.js`, `worker/workos.js`, `worker/middleware/proAuth.js` | **REQUIRED** | Primary authentication, SSO JWKS verification, and merchant organization/membership hierarchy. |
| 2 | **Cashfree Payments** | Billing / Subscriptions | `worker/index.js` (lines 4460–5500), `backend/src/routes/payment.ts`, `backend/src/services/refundService.ts` | **REQUIRED** | Authoritative payment gateway for Indian merchants (subscriptions, credits, domain checkout) with HMAC-SHA256 webhooks. |
| 3 | **Backblaze B2** | Object Storage | `worker/media/b2Client.js`, `worker/media/mediaGateway.js`, `worker/media/mediaService.js`, `worker/services/proDataStorageService.js` | **REQUIRED** | S3-compatible media asset storage, product images, backups, and exports via Web Crypto SigV4. |
| 4 | **FeraSetu Mail (Modal Postfix MTA)** | Transactional Email | `ferasetu-smtp/`, `worker/services/emailService.js` (`FeraSetuPostfixTransport`), `backend/src/services/workerEmailClient.ts` | **REQUIRED** | Internal high-trust transactional mail engine with 2048-bit RSA DKIM (`fs1` selector) and no third-party relay dependency. |
| 5 | **Cloudflare D1** | Edge Relational DB | `wrangler.toml`, `worker/wrangler.toml`, `worker/schema.sql`, `worker/index.js`, `worker/migrations/` | **REQUIRED** | Single source of truth for all application data, multi-tenant state, transactions, and audit records. |
| 6 | **Cloudflare Turnstile** | Bot Defense / Security | `frontend/src/hooks/useTurnstile.ts`, `worker/index.js` (`/api/auth/verify-turnstile`) | **REQUIRED** | Non-intrusive CAPTCHA defending login, registration, and payment endpoints against automated attacks. |
| 7 | **Modal GLM AI (`glm-5.3-flash`)** | AI Reasoning | `worker/ai/config.js`, `worker/ai/providers/modalGlm.js`, `worker/ai/router.js` | **REQUIRED** | Primary fast reasoning LLM provider for the FeraSetu AI Merchant Assistant and store optimization actions. |
| 8 | **Sarvam AI (Translate / TTS / STT)** | Indic AI & Voice | `worker/ai/providers/sarvamTranslate.js`, `worker/index.js` (TTS), `backend/src/services/sarvamAI.ts`, `backend/src/routes/voice.ts` | **REQUIRED** | Essential for Indian languages translation (`mayura:v1`), TTS (`bulbul:v1`), and STT (`saarika:v2`). |
| 9 | **Cloudflare DoH (`cloudflare-dns.com`)** | DNS Verification | `worker/services/dnsVerification.js` (lines 7, 94–187) | **REQUIRED** | Authoritative DNS-over-HTTPS queries for verifying merchant custom domain TXT, DKIM, SPF, and DMARC. |
| 10 | **External SMTP (`cloudflare:sockets`)** | Custom Email Relay | `worker/services/externalSmtpClient.js`, `worker/services/emailCrypto.js` | **OPTIONAL** | Advanced merchant feature allowing custom SMTP configuration (Gmail, SendGrid) over TCP sockets. |
| 11 | **Cloudflare Zone API v4** | DNS Automation | `worker/services/dnsVerification.js` (lines 192–260) | **OPTIONAL** | Optional automated DNS record creation for domains registered or hosted in the platform's Cloudflare account. |
| 12 | **Stripe Payments** | International Billing | `worker/routes/geo.js`, `backend/src/routes/payment.ts` | **OPTIONAL** | Reserved for non-India (USD/EUR) transactions if enabled; not needed for domestic Indian Kirana operations. |
| 13 | **Cloudflare Workers AI (`env.AI`)** | Edge LLM Inference | `worker/ai/config.js` | **OPTIONAL** | Future zero-latency fallback at the edge; currently unpopulated in `wrangler.toml`. |
| 14 | **OpenAI (`gpt-4o-mini`)** | Survey AI | `backend/src/routes/survey.ts` (lines 112–140) | **OPTIONAL** | Currently used only in backend survey analysis; can be replaced by Modal GLM. |
| 15 | **Zoho Zia Agents Chat SDK** | CRM / Marketing Widget | `frontend/src/pages/LandingPage.tsx` (lines 144–165), `worker/.dev.vars` | **NOT NEEDED** | External chat script with hardcoded credentials; adds page weight without autonomous store functionality. |
| 16 | **Razorpay Payments** | Legacy Payment Gateway | `worker/index.js` (lines 4870, 5009–5066), `backend/src/routes/payment.ts` | **LEGACY/REMOVE** | Deprecated in favor of Cashfree. Adds dead code, duplicate webhook surface, and credential sprawl. |
| 17 | **Appwrite Storage** | Legacy Object Storage | `backend/src/services/storageService.ts`, `backend/.env.example` | **LEGACY/REMOVE** | Superseded by Backblaze B2 S3 storage in Cloudflare Worker. |
| 18 | **Brevo (Sendinblue) Email** | Legacy Email Relay | `backend/src/services/brevoService.ts`, `backend/.env.example` | **LEGACY/REMOVE** | Superseded by FeraSetu Modal Postfix transactional email engine. |
| 19 | **Nodemailer (Local Node SMTP)**| Legacy Email Transport | `backend/src/services/smtpService.ts`, `backend/package.json` | **LEGACY/REMOVE** | Incompatible with Cloudflare Workers serverless edge runtime. |
| 20 | **In-Memory SQLite / MySQL Fallback**| Legacy Database Mock | `backend/src/models/database.ts` | **LEGACY/REMOVE** | In-memory mock incompatible with production. Cloudflare D1 is the sole source of truth. |
| 21 | **Statsig Analytics & Session Replay**| Third-Party Analytics | `frontend/src/lib/statsig.ts`, `frontend/package.json`, `frontend/vite.config.ts` | **LEGACY/REMOVE** | Redundant third-party client tracker; superseded by native first-party privacy-first analytics (`worker/analytics/`). |
| 22 | **Clerk Authentication References** | Obsolete Auth Comments | `worker/index.js` (lines 22–25) | **LEGACY/REMOVE** | Remnant comments referring to Clerk; fully migrated to WorkOS AuthKit. |

---

## 4. Credential & Secret Management Audit

### 4.1 Secret Exposure & Client Leakage Analysis
1. **Frontend Safety (PASS):**
   - No server secrets (`WORKOS_API_KEY`, `CASHFREE_SECRET_KEY`, `B2_APPLICATION_KEY`, `FERASETU_SMTP_API_KEY`, `TURNSTILE_SECRET_KEY`) are present in `frontend/src/` or exposed via Vite environment variables.
   - Exposed frontend variables are restricted to safe public identifiers: `VITE_WORKOS_CLIENT_ID`, `VITE_TURNSTILE_SITE_KEY`, `VITE_BASE_DOMAIN`, and `VITE_API_URL`.
2. **Wrangler Configuration (PASS with Recommendation):**
   - `wrangler.toml` and `worker/wrangler.toml` do NOT contain secret values.
   - Recommendation: Explicitly document all production secrets required for `npx wrangler secret put`:
     - `WORKOS_API_KEY`
     - `CASHFREE_APP_ID`
     - `CASHFREE_SECRET_KEY`
     - `B2_APPLICATION_KEY_ID`
     - `B2_APPLICATION_KEY`
     - `FERASETU_SMTP_API_KEY`
     - `TURNSTILE_SECRET_KEY`
     - `DATA_ENCRYPTION_KEY`
     - `SMTP_ENCRYPTION_KEY`
     - `MODAL_API_KEY`
     - `SARVAM_API_KEY`
3. **Cryptographic Secret Fallback Vulnerability (ACTION REQUIRED):**
   - In `worker/services/emailCrypto.js` line 17:
     ```javascript
     const rawSecret = secretKey || 'ferasetu-default-internal-secret-key-32b';
     ```
     If `SMTP_ENCRYPTION_KEY` or `env.DATA_ENCRYPTION_KEY` is undefined, it defaults to a known hardcoded string.
   - Fix: Upgrade `emailCrypto.js` to match `worker/pro/credentialEnvelope.js` (line 39), which strictly throws an exception if the dedicated 256-bit encryption key is missing.

---

## 5. Canonical Service Layer & Quarantine Recommendations

### 5.1 Proposed Canonical Service Layer (`worker/services/`)

To fulfill Requirement R1, the monolithic route handlers in `worker/index.js` must be factored into isolated, typed service modules:

```
worker/services/
├── cashfreeService.js          # [NEW] Canonical Cashfree PG, Webhook HMAC, Replay & Idempotency
├── domainService.js            # [NEW] Abstract DomainProvider (search, price, register, DNS)
├── emailService.js             # [EXISTING - ENHANCE] Unified Email Engine (Postfix + Sockets)
├── emailCrypto.js              # [EXISTING - HARDEN] AES-256-GCM without insecure fallback
├── externalSmtpClient.js       # [EXISTING] RFC 5321/5322 cloudflare:sockets client
├── dnsVerification.js          # [EXISTING] Cloudflare DoH & Zone API verification
├── turnstileService.js         # [NEW] Turnstile verification and fail-close security
├── aiGatewayService.js         # [NEW] Unified LLM/TTS/Translation gateway (Modal + Sarvam)
├── proDataStorageService.js    # [EXISTING] Pro Studio data source isolation
└── proPlatformService.js       # [EXISTING] Pro Studio platform lifecycle
```

#### Detailed Specification of Missing Canonical Modules:
1. **`worker/services/cashfreeService.js`:**
   - Methods: `createPaymentOrder({ plan, amount, user, billingCycle, env })`, `verifyWebhookSignature({ signature, timestamp, rawBody, secretKey })`, `verifyPaymentStatus({ orderId, env })`, `processPaymentSuccess({ env, orderId, paymentId, amount, tx, source })`.
   - Isolates all Cashfree API calls (`/pg/orders`), eliminates inline fetch calls in `worker/index.js`, and centralizes retry/error classification (`classifyCashfreeError`).
2. **`worker/services/domainService.js` (DomainProvider Abstraction for R3):**
   - Interface: `DomainProvider` with methods `searchDomain(query)`, `checkAvailability(domain)`, `getAuthoritativePricing(domain, tld)`, `registerDomain(domain, contact, paymentRef)`, `checkDnsStatus(domain)`, `handleProviderWebhook(payload)`.
   - Providers: `CloudflareRegistrarProvider` or mock sandbox provider with strictly server-validated pricing to prevent client price tampering.
3. **`worker/services/turnstileService.js`:**
   - Methods: `verifyTurnstileToken({ token, remoteIp, secretKey })`.
   - Centralizes validation logic, error code sanitization, and automated bypass when secret key is unset in offline development.
4. **`worker/services/aiGatewayService.js`:**
   - Methods: `completeChat({ messages, market, language, user, env })`, `translateText({ text, targetLang, env })`, `textToSpeech({ text, language, env })`.
   - Coordinates Modal GLM and Sarvam AI, deduplicates credit accounting (`deductAiCredits`), and provides structured logging without prompt leakages.

### 5.2 Quarantine & Cleanup Plan for Legacy / Dead Systems

1. **Quarantine `backend/`:**
   - Mark `backend/` as deprecated and strictly non-production. Ensure CI/CD deployment pipelines only deploy `worker/` (via `npx wrangler deploy`) and `frontend/` (via Cloudflare Pages), never exposing the Express backend to live merchant traffic.
   - Deprecate dead endpoints in `backend/src/services/storageService.ts` (Appwrite) and `backend/src/services/brevoService.ts` (Brevo).
2. **Frontend Bundle Hygiene:**
   - Remove or quarantine `@statsig/react-bindings`, `@statsig/session-replay`, and `@statsig/web-analytics` from `frontend/package.json` and remove the deferred loader call from `frontend/src/main.tsx`. First-party analytics is fully handled by `worker/analytics/`.
   - Remove the Zoho Zia chat widget script injection and hardcoded IDs from `frontend/src/pages/LandingPage.tsx`.
3. **Worker Code Sanitation:**
   - Remove legacy Clerk comment headers from `worker/index.js` (lines 22–25).
   - Deprecate the secondary Razorpay order creation block in `worker/index.js` (lines 5009–5066) in favor of the canonical Cashfree workflow.
   - Patch `worker/services/emailCrypto.js` line 17 to throw an explicit error if `DATA_ENCRYPTION_KEY` / `SMTP_ENCRYPTION_KEY` is missing, mirroring `credentialEnvelope.js`.

---

## 6. Caveats

1. **Stripe Multi-Currency International Gating:**
   Stripe is implemented in `worker/routes/geo.js` and `backend/src/routes/payment.ts` for international currencies (USD/EUR). For the primary domestic market (India, ₹ INR), Cashfree is the sole active and supported gateway. Stripe should remain quarantined or optional behind geographic feature gating.
2. **Cloudflare Zone API Automation Dependency:**
   Automated DNS provisioning via `worker/services/dnsVerification.js` requires the merchant domain's zone to be hosted under the platform's Cloudflare account with a valid `CLOUDFLARE_API_TOKEN`. For third-party registrars (GoDaddy, Namecheap), the guided manual DNS verification instructions (TXT/CNAME/SPF/DKIM/DMARC) remain the authoritative mechanism.
3. **No Codebase Modifications:**
   In accordance with the explorer archetype and read-only investigation mandate, no source code files were modified. All proposals are documented as actionable engineering deliverables.

---

## 7. Conclusion

FeraSetu's production backend is anchored by Cloudflare Workers, Cloudflare D1, WorkOS AuthKit, Cashfree PG, Backblaze B2 S3 storage, and an in-container Modal Postfix transactional email engine. All client-exposed parameters are safe public identifiers with zero server secret leakage.

However, three primary architectural debts require resolution under Milestone 1 (R1):
1. **Service Monolith in `worker/index.js`:** Cashfree billing, webhooks, Turnstile, and AI logic are embedded inline rather than abstracted into canonical modules in `worker/services/`.
2. **Cryptographic Fallback:** `worker/services/emailCrypto.js` contains a static fallback key that must be hardened to match `worker/pro/credentialEnvelope.js`.
3. **Legacy Dead Code:** `backend/` (Appwrite, Brevo, Nodemailer, SQLite in-memory), frontend Statsig analytics, and Zoho chat scripts are obsolete and should be formally quarantined.

---

## 8. Verification Method

To independently reproduce and verify this investigation:

1. **Verify Package & Dependency Isolation:**
   ```powershell
   # Inspect root workspaces and scripts
   Get-Content -Path package.json | Select-String -Pattern "workspaces", "legacy"
   # Verify worker dependencies (only jose)
   Get-Content -Path worker/package.json
   ```
2. **Verify Environment Configuration & Bindings:**
   ```powershell
   # Inspect wrangler.toml D1 bindings and vars
   Get-Content -Path wrangler.toml
   # Inspect worker dev.vars template
   Get-Content -Path worker/dev.vars.example
   ```
3. **Verify Existing Comprehensive Test Suites:**
   Execute the authoritative test suites covering Cashfree verification, B2 media, email architecture, and WorkOS multi-tenancy:
   ```powershell
   node --test tests/cashfree-payment-verification.test.mjs
   node --test tests/b2-cdn-media.test.mjs
   node --test tests/production-email-architecture.test.mjs
   node --test tests/workos-multi-tenant-organizations.test.mjs
   node --test tests/production-hardening-p0.test.mjs
   ```
4. **Inspect Source File Lines Cited:**
   - WorkOS JWT JWKS verification: `worker/index.js` lines 215–235
   - Cashfree Webhook HMAC validation: `worker/index.js` lines 5373–5430
   - Backblaze B2 SigV4 Web Crypto: `worker/media/b2Client.js` lines 1–105
   - Modal Postfix Dispatch: `worker/services/emailService.js` lines 641–690
   - Hardcoded Email Crypto Fallback: `worker/services/emailCrypto.js` line 17
   - In-memory SQLite Mock: `backend/src/models/database.ts` lines 216–235
   - Legacy Appwrite Storage: `backend/src/services/storageService.ts` lines 36–120
   - Legacy Brevo API: `backend/src/services/brevoService.ts` lines 3–63
   - Statsig Client Key: `frontend/src/lib/statsig.ts` line 61

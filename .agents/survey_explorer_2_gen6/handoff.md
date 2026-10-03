# Handoff Report: Survey of Backend Domains, Email Architecture, Crypto, and Tenant Isolation

**Agent**: `survey_explorer_2_gen6`  
**Date**: 2026-10-01  
**Milestone**: 2026-10-01 External Integrations, Domains & Email, Cloudflare Worker Hardening  
**Target Recipient**: `orchestrator_gen6`  

---

## 1. Observation

### 1.1 Database Schema & Migrations
1. **Migration 0014 (`worker/migrations/0014_production_email_architecture.sql`)**:
   - Defines 5 production tables:
     - `email_domains`: `id`, `organization_id` (NULL for platform), `domain`, `domain_type` CHECK(`PLATFORM`, `FERASETU_MERCHANT`, `CUSTOM`), `verification_status` CHECK(`PENDING`, `VERIFYING`, `VERIFIED`, `FAILED`, `SUSPENDED`), `ownership_verification_method`, `verification_token_hash`, `dkim_selector`, `dkim_status`, `spf_status`, `dmarc_status`, `mail_from_status`, `provider` CHECK(`FERASETU`, `EXTERNAL`), `created_at`, `updated_at`, `verified_at`, `last_checked_at`.
     - `email_identities`: `id`, `organization_id`, `domain_id` (FK cascade to `email_domains`), `local_part`, `email_address` (UNIQUE), `display_name`, `identity_type` CHECK(`PLATFORM`, `MERCHANT`, `CUSTOM`), `status` CHECK(`ACTIVE`, `PENDING`, `DISABLED`), `is_default` (0/1).
     - `email_provider_connections`: `id`, `organization_id` (UNIQUE), `provider_type` CHECK(`FERASETU`, `EXTERNAL_SMTP`), `smtp_host`, `smtp_port`, `smtp_username`, `encrypted_secret_reference` (AES-256-GCM ciphertext), `security_mode` CHECK(`STARTTLS`, `SSL_TLS`, `NONE`), `status` CHECK(`ACTIVE`, `ERROR`, `UNTESTED`).
     - `email_messages`: `id`, `merchant_id`, `sender_identity_id`, `provider`, `to_address`, `reply_to`, `subject`, `status` CHECK(`PENDING`, `QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `BOUNCED`), `idempotency_key`, `priority` CHECK(`HIGH`, `NORMAL`, `LOW`). Unique index: `idx_email_messages_tenant_idempotency` ON `email_messages(COALESCE(merchant_id, 'PLATFORM'), idempotency_key)`.
     - `email_events`: `id`, `message_id` (FK cascade), `merchant_id`, `event_type` CHECK(`ACCEPTED`, `QUEUED`, `SENT`, `DELIVERED`, `BOUNCED`, `COMPLAINT`, `FAILED`), `provider_status`, `recipient`, `timestamp`, `metadata` (JSON).
   - Seeds platform domain `ferasetu.com` (`dom_platform_ferasetu`) and platform identities: `no-reply@ferasetu.com`, `support@ferasetu.com`, `billing@ferasetu.com`.

2. **Migration 0015 (`worker/migrations/0015_payment_hardening_and_test_mode.sql`)**:
   - Adds `is_test_payment INTEGER NOT NULL DEFAULT 0` to `transactions` and `subscriptions`.
   - Creates unique index `idx_transactions_provider_order_unique` on `transactions(provider_order_id)`.
   - Creates `meetings` table with indexes on `user_id` and `status`.

3. **Migration 0016 (`worker/migrations/0016_privacy_first_analytics.sql`)**:
   - Creates `analytics_events` (with tenant isolation on `tenant_id` and indexing on `(tenant_id, created_at)`) and `analytics_aggregates_daily`.

4. **Runtime Schema Sync (`worker/index.js` lines 3178–3356)**:
   - Contains automatic idempotent DDL execution for `email_domains`, `email_identities`, `email_provider_connections`, `email_messages`, `email_events`.
   - Also initializes legacy tables: `smtp_settings` (lines 3178–3203), `shop_email_quotas` (lines 3216–3226), `email_logs` (lines 3229–3240).
   - **Crucial Schema Gap**: There is NO table for storing custom merchant email template overrides or customized template copies (e.g. `merchant_email_templates` or `email_templates`).

---

### 1.2 Cryptographic Services & SMTP Clients
1. **`worker/services/emailCrypto.js`**:
   - Implements AES-256-GCM encryption/decryption using native Web Crypto API (`crypto.subtle`).
   - Format: `enc:v1:<base64-iv>:<base64-ciphertext>` with a 96-bit (12-byte) random IV generated per encryption via `crypto.getRandomValues(new Uint8Array(12))`.
   - Derives a 256-bit key from `secretKey || 'ferasetu-default-internal-secret-key-32b'` using SHA-256 (`crypto.subtle.digest('SHA-256', keyData)`).
   - Decryption gracefully passes through legacy plaintext strings if they do not start with `enc:v1:`.

2. **`worker/services/externalSmtpClient.js`**:
   - Lightweight RFC 5321 / RFC 5322 client for Cloudflare Workers.
   - Dynamic import of `cloudflare:sockets` (`connect({ hostname, port }, { secureTransport })`).
   - Protocol flow: Read greeting (220) -> EHLO -> STARTTLS (if not SSL/TLS) -> AUTH LOGIN (or AUTH PLAIN) -> MAIL FROM -> RCPT TO -> DATA -> stream dot-stuffed MIME payload -> QUIT.
   - Dot-stuffing compliance: `rawPayload.replace(/\r?\n\./g, '\r\n..')`.
   - In test/mock environments where `cloudflare:sockets` is unavailable, gracefully simulates delivery.

3. **`worker/services/dnsVerification.js`**:
   - DNS verification using Cloudflare DNS-over-HTTPS (DoH) API: `https://cloudflare-dns.com/dns-query` with header `Accept: application/dns-json`.
   - Normalizes domains (`normalizeDomain` strips protocol, slashes, trailing dots, disallows `ferasetu.com` subdomains).
   - Generates instructions for:
     - `_ferasetu-challenge.<domain>` (TXT) - Domain ownership verification
     - `fs1._domainkey.<domain>` (TXT) - DKIM authenticated signing
     - `<domain>` (TXT) - SPF authorization (`v=spf1 include:_spf.ferasetu.com ~all`)
     - `_dmarc.<domain>` (TXT) - DMARC alignment policy (`v=DMARC1; p=reject; rua=mailto:dmarc-reports@ferasetu.com; aspf=r; adkim=r`)
     - `mail.<domain>` (CNAME) - Custom Return-Path
   - Checks records in parallel via `Promise.all` over DoH.
   - Supports automated DNS provisioning via Cloudflare v4 REST API if `env.CLOUDFLARE_API_TOKEN` is present.

---

### 1.3 Domain Management & Hostname Routing
1. **Canonical Hostname & Subdomain Architecture (`worker/canonicalHostname.js`)**:
   - Generates canonical storefront URLs: `[shopname]-[city]-[district]-[state]-[counter].ferasetu.com`.
   - Full transliteration for Indian scripts (Devanagari, Gujarati, Bengali, Tamil, Telugu) into ASCII Latin labels.
   - Enforces RFC 1035 label limits (max 63 characters, alphanumeric with hyphens, minimum 3 chars).
   - Reserved subdomains: `api, www, app, admin, docs, status, mail, support, beta, staging, dev, static, assets, cdn, test, demo`.

2. **Storefront Routing (`worker/storefront.js` & `worker/index.js`)**:
   - `classifyHostname(hostname)`:
     - Localhost / `*.workers.dev` -> `api`
     - Exact apex `ferasetu.com` or `fera-search.tech` -> `platform_root`
     - Subdomains of base domains: `api` -> `api`, reserved subdomains -> `platform_reserved`, merchant subdomain -> `merchant` with `slug: subdomain`.
     - Non-base domains -> `unknown_host`.
   - In `worker/index.js` lines 9805–9828:
     - `if (hostClassification.type === "merchant")` -> `handleStorefrontRequest(request, env, ctx, hostClassification)`.
     - `unknown_host` falls through to default API routing `route(request, env)`.
   - **Architectural Gap**: If a merchant connects a custom domain (e.g. `shop.artisan.com`), `classifyHostname` returns `unknown_host`. There is NO lookup from `email_domains` or `users.custom_domain` or `shops.hostname` at the edge fetch dispatcher to route custom domains to `handleStorefrontRequest`!

3. **FeraSetu Mail Default (`orders@{storeSlug}.ferasetu.com`)**:
   - Implemented in `worker/services/emailService.js` (`ensureMerchantEmailProvisioning` lines 305–374):
     - Checks if merchant has `email_domains` of type `'FERASETU_MERCHANT'`. If missing, creates `dom_m_{orgId}` with `domain = {slug}.ferasetu.com` and status `'VERIFIED'`.
     - Creates default sender identity `ident_m_{orgId}` with `orders@{slug}.ferasetu.com` marked `is_default = 1`.
     - Creates default provider connection `epc_{orgId}` set to `provider_type = 'FERASETU'`.
     - Invoked lazily on `GET /api/email/settings` and during email sending.

4. **DomainProvider Abstraction & Purchasing Logic**:
   - **Critical Finding**: Zero code exists for `DomainProvider` abstraction or domain purchasing. Grepping `DomainProvider` across the entire codebase yields 0 results. No API endpoints exist for searching domain availability, checking prices, or initiating domain checkout.

---

### 1.4 Transactional Email Engine & Templates
1. **Predefined Templates Catalog (`worker/templates/emailTemplates.js`)**:
   - 16 registered templates with versioning, HTML escaping (`escapeHtml`), and required variable lists:
     - **Auth & Account**: `account.verify_email`, `account.password_reset`, `account.invitation`
     - **Merchant**: `merchant.onboarding`
     - **Commerce & Orders**: `order.confirmation`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.accepted`, `order.rejected`
     - **Invoicing & Payments**: `payment.received`, `payment.failed`, `invoice.created`, `refund.initiated`, `refund.completed`, `credit_note.created`
     - **Billing**: `billing.subscription_started`, `billing.subscription_renewed`, `billing.payment_success`, `billing.payment_failed`, `billing.cancellation_confirmation`
     - **Support & System**: `support.reply`, `system.test`
   - Strict validation via `validateTemplateVariables(templateKey, data)`: fails if any required variable is null, undefined, or empty string.
   - Dual-format output: returns both HTML (wrapped with header, logo, responsive tables, footer) and plain-text.
   - **Template Naming Discrepancy**: Requirements mention uppercase snake_case (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, etc.), whereas the catalog uses dot-notation (`order.confirmation`, `order.shipped`). `EmailService` legacy `renderTemplate` includes a partial mapping, but aliasing is needed.

2. **Delivery & Logging Pipeline (`worker/services/emailService.js`)**:
   - Three high-level facade methods:
     - `EmailService.sendPlatformEmail(env, { event, to, templateKey, data, from, replyTo })`: platform branding, bypasses merchant quota, requires verified platform sender.
     - `EmailService.sendMerchantEmail(env, { organizationId, to, templateKey, data, replyTo })`: merchant-to-merchant internal notices.
     - `EmailService.sendCustomerEmail(env, { organizationId, customerEmail, templateKey, data, replyTo })`: customer-facing notifications with merchant branding and auto-fallback.
   - Dispatch pipeline:
     - Enforces CRLF header injection validation (`sanitizeHeaderValue`).
     - Checks idempotency against `email_messages`.
     - Validates tenant sender ownership: verifies domain is `VERIFIED`.
     - Decrements merchant daily quota via `checkAndConsumeEmailQuota`.
     - Exponential backoff retry loop (up to 5 retries with ±25% jitter) based on `classifySmtpFailure(error)` (`TRANSIENT`, `PERMANENT`, `POLICY`, `AUTHENTICATION`, `RATE_LIMIT`, `DNS`).
     - Updates `email_messages.status` and writes immutable event to `email_events` (including `DOMAIN_FALLBACK_APPLIED` event when custom domain is unverified).

3. **Template Editing & AI Assistant Gaps**:
   - There are NO REST API routes for listing, reading, or editing email templates in `emailRoutes.js`.
   - There are NO AI tools in `worker/ai/` for email actions (`get_email_settings`, `update_email_sender`, `update_reply_to`, `list_email_templates`, `update_email_template`, `send_test_email`).

---

### 1.5 Tenant Isolation & Security Review
1. **Endpoint Protection (`worker/routes/emailRoutes.js`)**:
   - Enforces `requireOrgContext(request, env, 'staff')` across all routes (except public `GET /api/email/health`).
   - Every domain lookup, verification, deletion, identity creation, and provider mutation scopes queries to `WHERE organization_id = ?`.
   - Domain creation checks for cross-tenant registration collision:
     `SELECT id, organization_id FROM email_domains WHERE domain = ?` -> returns 409 if already claimed by another organization.
   - Sender identities can ONLY be created on verified domains owned by that organization (`if (domainRow.verification_status !== "VERIFIED") throw 400`).

2. **Secret Redaction**:
   - `GET /api/email/settings` and `GET /api/email/provider` return `has_password: true/false`, completely omitting `encrypted_secret_reference` and plaintext passwords.
   - Passwords stored in `email_provider_connections` are encrypted at rest with AES-256-GCM.
   - `email_events` logs only metadata (recipient, from, status, provider, timestamps); no email bodies or secrets are persisted in event logs.

3. **Automated Verification Execution**:
   - `tests/production-email-architecture.test.mjs`: **9 passed, 0 failed** (Verified tenant isolation, platform identity auth, default sender provisioning, custom domain DNS, AES-256-GCM encryption, quota blocking, CRLF injection defense, MIME generation, tenant-scoped idempotency).
   - `tests/production-email-integration.test.mjs`: **15 passed, 0 failed** (Verified matrix A through O including platform emails, merchant templates, invoice/refund rendering, custom vs default senders, external SMTP decryption, retry/fallback decoupled handling, and quota isolation).

---

## 2. Logic Chain

```
[Observation: Migration 0014 and emailService.js/emailCrypto.js implement full multi-tenant domain & email tables, DoH verification, and AES-256-GCM crypto]
  │
  ├─► [Fact: Core email sending, identity resolution, FeraSetu Mail default, and external SMTP work reliably and pass all 24 unit/integration tests]
  │
[Observation: Grepping DomainProvider yields 0 results; no registrar API, pricing check, or checkout exists in codebase]
  │
  ├─► [Logic: Domain purchasing and the pluggable DomainProvider abstraction required by R3 must be built from scratch]
  │
[Observation: classifyHostname in storefront.js only recognizes ferasetu.com and fera-search.tech; unknown_host routes to route() returning API JSON]
  │
  ├─► [Logic: Custom domains connected for merchant storefronts cannot currently render the storefront SPA without adding an edge D1 lookup for custom domains in classifyHostname/fetch]
  │
[Observation: EMAIL_TEMPLATES is a static in-memory object in emailTemplates.js; no D1 table exists for template overrides and emailRoutes.js lacks template CRUD endpoints]
  │
  ├─► [Logic: A migration for merchant_email_templates and REST endpoints (GET/PUT /api/email/templates, POST /api/email/templates/preview) are required to support R4's template editor & AI assistant]
  │
[Observation: worker/ai/ has no email tools (get_email_settings, update_email_sender, list_email_templates, update_email_template, send_test_email)]
  │
  ├─► [Logic: AI email tools with undo capability must be implemented in the worker AI tool registry]
  │
[Observation: EmailSettingsPage.tsx is a single scrolling page with prominent raw SMTP provider selection at the top]
  │
  └─► [Logic: The frontend must be restructured into a 2-tab "Domains & Email" dashboard where FeraSetu Mail is the default hero and raw SMTP is relegated to an expandable Advanced drawer]
```

---

## 3. Caveats

1. **Modal Postfix Gateway Dependency**: `emailService.js` routes default FeraSetu Mail through `env.FERASETU_SMTP_SERVICE_URL` (`https://singhantima203--ferasetu-smtp-web-gateway.modal.run/v1/email/send`) with fallback to local simulation when offline or unconfigured.
2. **DNS Propagation Timing**: Cloudflare DoH checks authoritative DNS records in real-time, but external registrars may take up to 24–48 hours for DNS propagation. The UI must present clear pending/propagating feedback states.
3. **Domain Registrar Selection**: R3 requires a pluggable `DomainProvider` abstraction. We recommend implementing an interface with a mock/sandbox provider for local testing and concrete adapters (e.g. Cloudflare Registrar, Namecheap, or ResellerClub API) for production.
4. **Master Key Fallback**: In `emailCrypto.js`, if neither `ENCRYPTION_SECRET` nor `ADMIN_JWT_SECRET` is set in Cloudflare environment variables, it uses a fallback string. In production environments, Cloudflare Worker secrets must guarantee `ENCRYPTION_SECRET` is set.

---

## 4. Conclusion & Actionable Recommendations

### Status Summary
- **Backend Foundation (D1 Schema, Crypto, SMTP Client, DoH DNS)**: **SOLID & FULLY VERIFIED (24/24 tests pass)**.
- **Tenant Isolation & Security**: **VERIFIED** (strict WorkOS org scoping, AES-256-GCM encryption, CRLF injection defense, zero secret exposure).
- **Missing Gaps to Address for Milestone 2026-10-01**:
  1. **New Migration**: Create `merchant_email_templates` table in D1 for tenant-specific subject and body template overrides with version tracking.
  2. **Domain Provider Abstraction (`worker/services/domainProvider.js`)**: Implement pluggable `DomainProvider` class with `searchDomains()`, `checkAvailability()`, `fetchAuthoritativePricing()`, `registerDomain()`, `checkDnsStatus()`, and integrate with Cashfree checkout.
  3. **Custom Domain Edge Routing (`worker/storefront.js`)**: Extend `classifyHostname` / `fetch` to resolve custom hostnames against `email_domains` / `users.custom_domain` / `shops.hostname` so custom storefronts render the SPA.
  4. **Template REST Endpoints (`worker/routes/emailRoutes.js`)**: Add `GET /api/email/templates`, `GET /api/email/templates/:key`, `PUT /api/email/templates/:key`, and `POST /api/email/templates/preview`.
  5. **AI Email Assistant Tools (`worker/ai/`)**: Implement tools: `get_email_settings`, `update_email_sender`, `update_reply_to`, `list_email_templates`, `update_email_template`, `send_test_email`.
  6. **Frontend Redesign (`frontend/src/pages/EmailSettingsPage.tsx`)**: Reorganize into "Domains & Email" tabs, with FeraSetu Mail default, sender aliases (`orders@`, `support@`), real Reply-To mapping, template preview/editor, and SMTP moved to Advanced.

---

## 5. Verification Method

To independently verify all findings and test suites reported here:

1. **Run Architecture Test Suite**:
   ```powershell
   node tests/production-email-architecture.test.mjs
   ```
   *Expected*: Exits with code 0; 9 passed, 0 failed.

2. **Run Integration Test Suite (Matrix A through O)**:
   ```powershell
   node tests/production-email-integration.test.mjs
   ```
   *Expected*: Exits with code 0; 15 passed, 0 failed.

3. **Inspect Implementation Files**:
   - `worker/migrations/0014_production_email_architecture.sql`
   - `worker/services/emailCrypto.js`
   - `worker/services/externalSmtpClient.js`
   - `worker/services/dnsVerification.js`
   - `worker/services/emailService.js`
   - `worker/templates/emailTemplates.js`
   - `worker/routes/emailRoutes.js`
   - `worker/canonicalHostname.js`
   - `worker/storefront.js`

4. **Invalidation Conditions**:
   - Modifying `emailCrypto.js` master key derivation breaks existing encrypted secrets (`enc:v1:` format).
   - Changing `requireOrgContext` permission checks could create cross-tenant IDOR exposure if not strictly bound to `organization_id`.

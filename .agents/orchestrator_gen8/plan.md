# Orchestrator Gen 8 Execution Plan

## Objectives
Complete the remaining work from `ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z) and pass all 71 tests in `tests/e2e-domains-email.test.mjs`.

## Detailed Steps

### Step 1: Initialize Orchestrator Gen 8 Infrastructure
- Start heartbeat cron (`*/10 * * * *`).
- Track subagents and iterations in `BRIEFING.md` and `progress.md`.

### Step 2: Milestone 3 (R3) — Pluggable Domain Provider & Purchase/Connect Architecture
- Dispatch `worker_m3_gen8` to implement:
  - `worker/services/domainProvider.js`: `DomainProvider` abstract class/interface, `SandboxDomainProvider`, `CloudflareDomainProvider`, factory `createDomainProvider(env)`.
  - `worker/services/domainService.js`: Search, availability, authoritative pricing (+18% GST), Cashfree order initiation and status verification, D1 provisioning.
  - `worker/routes/domainRoutes.js`: `/api/domains/search`, `/api/domains/purchase/initiate`, `/api/domains/purchase/verify`, mount under `/api/domains` in `worker/index.js`.
  - Custom storefront routing: `worker/storefront.js` / `worker/index.js` `classifyHostname` resolving verified custom domains (`email_domains` WHERE domain_type = 'CUSTOM' AND verification_status = 'VERIFIED').
  - Ensure frontend "Buy Domain" in `EmailSettingsPage.tsx` integrates properly.
- Run tests: relevant Tier 1/2/3 tests in `tests/e2e-domains-email.test.mjs` and storefront tests.

### Step 3: Milestone 4 (R4) — Transactional Email Engine, Templates & AI Assistant
- Dispatch `worker_m4_gen8` to implement:
  - D1 Migration `migrations/0017_merchant_email_templates.sql` (schema for template overrides, snapshots/history, delivery logs).
  - Transactional template engine: `ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`. `{{variable}}` interpolation, sanitization, missing variable enforcement, custom merchant overrides, live preview, test send.
  - 6 AI Email Assistant tools: `get_email_settings`, `update_email_sender`, `update_reply_to`, `list_email_templates`, `update_email_template`, `send_test_email`. Includes snapshot history & undo capability.
  - Immutable delivery activity logging in `email_events` with secret redaction and chronological query endpoint `/api/email/events`.
- Run tests: template & AI tests in `tests/e2e-domains-email.test.mjs`.

### Step 4: Milestone 5 (R5) — Security, Tenant Isolation & Production Hardening
- Review and verify:
  - Cross-tenant boundaries (Tenant A cannot see/alter Tenant B domains, templates, identities, logs).
  - CRLF injection rejection in Subject, display names, reply-to, and recipient addresses.
  - Authoritative price validation preventing zero/negative/tampered domain purchases.
  - External SMTP secrets encrypted at rest via AES-256-GCM with plaintext redacted in client APIs.

### Step 5: Milestone 6 — Dual-Track Final Verification & Victory Claim
- Execute full 71-test E2E suite (`node --test tests/e2e-domains-email.test.mjs`).
- Dispatch Challenger and Forensic Auditor.
- Once 100% passing and Clean audit verified, claim victory to Sentinel.

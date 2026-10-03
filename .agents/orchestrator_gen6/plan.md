# Execution Plan — orchestrator_gen6

## Objectives
Deliver all requirements from `.agents/ORIGINAL_REQUEST.md` (2026-10-01T11:23:41Z):
- R1. External Integration Audit & Canonical Service Layer
- R2. Merchant Domains & Email Dashboard Experience
- R3. Pluggable Domain Provider & Purchase/Connect Architecture
- R4. Transactional Email Engine, Templates & AI Assistant
- R5. Security, Tenant Isolation & Production Hardening

## Milestone Plan
1. **Milestone 0: Survey & Integration Inventory**
   - Survey external APIs, SDKs, webhooks, storage across repository.
   - Survey existing Cloudflare Worker email/domain services, D1 migrations (`0014`, `0015`, `0016`), crypto, test suites.
   - Survey frontend routes (`EmailSettingsPage`, store settings, domain management) and design tokens.
   - Aggregate into `PROJECT.md` Feature Inventory & Canonical Architecture.

2. **Milestone 1: Canonical Service Layer & Integration Cleanup (R1)**
   - Formalize core server-side integrations (WorkOS, Cashfree, Backblaze B2, FeraSetu SMTP/Email, Turnstile, AI).
   - Quarantine or eliminate obsolete/dead systems (legacy Appwrite, MySQL/SQLite fallbacks).
   - Strict secret isolation and idempotency.

3. **Milestone 2: Merchant Domains & Email Dashboard Experience (R2)**
   - Unified "Domains & Email" dashboard adhering to FeraSetu design tokens (blue `#0052FF`, white, orange, clean typography).
   - Domains tab: Active domains, badges, connection states, actions (Connect, Buy, Manage, DNS setup).
   - Email tab: Default active FeraSetu Mail (`orders@{store-slug}.ferasetu.com`) without raw SMTP setup. Expandable advanced SMTP.
   - Sender identities (`orders@`, `support@`, `billing@`) & merchant Reply-To routing.

4. **Milestone 3: Pluggable Domain Provider & Purchase/Connect Architecture (R3)**
   - Abstracted `DomainProvider` interface (search, availability, authoritative pricing, register, check DNS, webhooks).
   - Cashfree payment verification with server-side price validation to prevent tampering.
   - Guided DNS verification (TXT/CNAME/SPF/DKIM/DMARC) with copy buttons, error guidance, re-check polling.

5. **Milestone 4: Transactional Email Engine, Templates & AI Assistant (R4)**
   - Centralized transactional email engine with templates (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`).
   - Variable registry (`{{variable}}`) with strict validation and HTML sanitization.
   - Live sample preview & test send functionality.
   - AI Email Assistant tools (`get_email_settings`, `update_email_sender`, `update_reply_to`, `list_email_templates`, `update_email_template`, `send_test_email`) with history and undo.
   - Immutable delivery activity table.

6. **Milestone 5: Security, Tenant Isolation & Production Hardening (R5)**
   - Strict tenant isolation (`auth user -> org membership -> resource verification`).
   - Zero secrets leaked into browser payloads, logs, or AI context.
   - Prevention of IDOR, SSRF, email header injection, and sender address spoofing.

7. **Milestone 6: Dual-Track Verification & Victory Audit**
   - Reviewer, Challenger, and Forensic Auditor verification.
   - Complete test suite execution (`npm test` in backend/tests, `npm run build` in frontend, security regression tests).
   - Final report and victory verification.

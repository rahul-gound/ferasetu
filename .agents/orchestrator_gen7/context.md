# Context for Orchestrator Gen 7

## Mission
Lead the end-to-end execution of the user request from `.agents/ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z):
- **R1. External Integration Audit & Canonical Service Layer** (Quarantine legacy Appwrite/Brevo/Razorpay/uploads; formalize WorkOS, Cashfree, B2, FeraSetu Mail/SMTP, Turnstile, AI).
- **R2. Merchant Domains & Email Dashboard Experience** (Unified "Domains & Email" dashboard: blue `#0052FF`, white, orange; Domains tab + Email tab with default active FeraSetu Mail `orders@{store-slug}.ferasetu.com`; omit raw SMTP from top navigation; real Reply-To mapping to merchant account/store email).
- **R3. Pluggable Domain Provider & Purchase/Connect Architecture** (Abstracted `DomainProvider` interface; Cashfree payment verification with server-side price validation; guided DNS verification with TXT/CNAME/SPF/DKIM/DMARC).
- **R4. Transactional Email Engine, Templates & AI Assistant** (Centralized transactional email engine with templates `ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`; strict `{{variable}}` interpolation & HTML sanitization; template editor with live sample preview & test send; AI Email Assistant tools with history & undo; immutable delivery activity log).
- **R5. Security, Tenant Isolation & Production Hardening** (Strict tenant isolation across domain/email/template/webhook endpoints; zero secrets leaked; prevent IDOR, SSRF, header injection, sender spoofing).

## State Inherited from Gen 6
- **Milestone 0 Completed**:
  - `survey_explorer_1_gen6/handoff.md` contains the full 318-line integration inventory report.
  - `survey_explorer_2_gen6/` and `survey_spec_miner_3_gen6/` contain architectural specs for worker email services, D1 schema, and frontend UI.
- **Implementation & Tests in Gen 6**:
  - `worker_m1_gen6/`, `worker_m2_gen6/`, and `test_writer_e2e_gen6/` were in progress when gen6 experienced quota exhaustion.
  - Inspect any changes already written to `worker/`, `frontend/`, `tests/`.
  - Pick up seamlessly and dispatch fresh workers to drive all milestones to completion.

## Constraints & Workflow
- Maintain `plan.md`, `progress.md`, and `BRIEFING.md` in `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\orchestrator_gen7`.
- Update `progress.md` regularly to avoid sentinel timeout.
- Ensure all test suites pass (`npm test`, frontend build, and security tests).
- When complete, report completion so Sentinel can run the independent Victory Audit.

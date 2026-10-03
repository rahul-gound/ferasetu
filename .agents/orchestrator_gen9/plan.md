# Execution Plan — orchestrator_gen9

## Objective
Deliver Milestone 3 (Domain Architecture), Milestone 4 (Transactional Email & AI), Milestone 5 (Security Hardening), Milestone 6 (E2E Verification & Victory Claim).

## Milestone Breakdown
### Milestone 3 (R3): Pluggable Domain Provider & Purchase/Connect Architecture
- `worker/services/domainProvider.js`: Base `DomainProvider`, `SandboxDomainProvider`, `createDomainProvider(env)` with standard TLD rates, 18% GST rounding, 1–10 year rules, anti-tampering guards.
- `worker/services/domainService.js`: Domain search, availability, Cashfree checkout, D1 `email_domains` provisioning.
- `worker/routes/domainRoutes.js`: `/api/domains/search`, `/api/domains/pricing`, `/api/domains/purchase/initiate`, `/api/domains/purchase/verify`, `/api/domains/connect`.
- `worker/storefront.js` & `worker/index.js`: Custom domain resolution and storefront routing.
- `frontend/src/pages/EmailSettingsPage.tsx`: Live domain purchase integration with Cashfree SDK.
- Verification Gate: Reviewers, Challengers, Forensic Auditor.

### Milestone 4 (R4): Transactional Email Engine, Templates & AI Assistant
- D1 Migration `migrations/0017_merchant_email_templates.sql`.
- Transactional template engine with live preview & test send.
- 6 AI Email Assistant tools with version history & undo.
- Immutable delivery activity logging.
- Verification Gate: Reviewers, Challengers, Forensic Auditor.

### Milestone 5 (R5): Security, Tenant Isolation & Production Hardening
- Multi-tenant isolation verification and security hardening.
- Verification Gate: Reviewers, Challengers, Forensic Auditor.

### Milestone 6: Dual-Track Verification & Victory Claim
- Execute full 71-test E2E suite (`node --test tests/e2e-domains-email.test.mjs`).
- Execute all regression test suites.
- Submit victory claim to Sentinel for independent Victory Audit.

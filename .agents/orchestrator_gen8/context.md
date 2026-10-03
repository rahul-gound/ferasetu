# Context for Orchestrator Gen 8

## Mission
Lead the completion of the user request from `.agents/ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z):
- **R1. External Integration Audit & Canonical Service Layer** [COMPLETED]
- **R2. Merchant Domains & Email Dashboard Experience** [COMPLETED]
- **R3. Pluggable Domain Provider & Purchase/Connect Architecture** [PENDING - NEXT]
- **R4. Transactional Email Engine, Templates & AI Assistant** [PENDING - NEXT]
- **R5. Security, Tenant Isolation & Production Hardening** [PENDING]

## Status of Completed Milestones
1. **Milestone 0 (Survey & Inventory)**: Finished and documented in `.agents/survey_explorer_1_gen6/handoff.md` and `PROJECT.md`.
2. **Milestone 1 (Canonical Service Layer R1)**: Finished. `worker/services/cashfreeService.js`, `turnstileService.js`, `aiGatewayService.js` built, `emailCrypto.js` hardened. All tests pass (cashfree 29/29, hardening-p0 8/8, email-arch 9/9, email-integration 15/15).
3. **Milestone 2 (Domains & Email UI R2)**: Finished. `frontend/src/pages/EmailSettingsPage.tsx` redesigned with 2 tabs, default FeraSetu Mail hero, Reply-To routing, alias manager, advanced SMTP drawer, `Layout.tsx` navigation updated. All 28 frontend tests pass, 0 TS compilation errors.
4. **E2E Testing Track**: Finished. 71 tests in `tests/e2e-domains-email.test.mjs`, `TEST_READY.md` published in workspace root.

## Immediate Action Required for Gen 8
Dispatch specialists to implement and verify:
- **Milestone 3 (R3)**:
  - `worker/services/domainProvider.js` (abstract `DomainProvider` interface with `search`, `checkAvailability`, `getAuthoritativePricing`, `registerDomain`, `checkDnsStatus`, supporting sandbox & production).
  - `worker/services/domainService.js` & `worker/routes/domainRoutes.js` (server-side price validation via `cashfreeService.js`, order verification, D1 provisioning).
  - Storefront custom domain routing in `worker/storefront.js`.
- **Milestone 4 (R4)**:
  - D1 Migration `0017_merchant_email_templates.sql`.
  - Centralized transactional email template engine (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`) with `{{variable}}` interpolation, sanitization, live preview & test send.
  - 6 AI Email Assistant tools with change history & undo.
  - Delivery activity logging.
- **Milestone 5 (R5)**: Multi-tenant isolation verification and security hardening.
- **Milestone 6**: Dual-track verification and final test pass (`node --test tests/e2e-domains-email.test.mjs`).

When ready, claim victory so Sentinel can run the independent Victory Audit.
Working Directory: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\orchestrator_gen8`

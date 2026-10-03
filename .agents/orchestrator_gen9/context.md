# Context for Orchestrator Gen 9

## Mission
Lead the completion of the user request from `.agents/ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z):
- **R1. External Integration Audit & Canonical Service Layer** [COMPLETED]
- **R2. Merchant Domains & Email Dashboard Experience** [COMPLETED]
- **R3. Pluggable Domain Provider & Purchase/Connect Architecture** [PENDING - BLUEPRINTS READY]
- **R4. Transactional Email Engine, Templates & AI Assistant** [PENDING - NEXT]
- **R5. Security, Tenant Isolation & Production Hardening** [PENDING]

## Status of Completed Deliverables
1. **Milestone 0**: Full 318-line integration inventory report in `.agents/survey_explorer_1_gen6/handoff.md`.
2. **Milestone 1**: Canonical service layer in `worker/services/` (`cashfreeService.js`, `turnstileService.js`, `aiGatewayService.js`, hardened `emailCrypto.js`). 100% backend test suites pass.
3. **Milestone 2**: Redesigned two-tab Domains & Email dashboard in `frontend/src/pages/EmailSettingsPage.tsx` and sidebar navigation in `Layout.tsx`. 28/28 frontend tests pass, 0 TS errors.
4. **E2E Testing Track**: 71 discrete test cases delivered in `tests/e2e-domains-email.test.mjs` with `TEST_READY.md` published.
5. **Milestone 3 Exploration**: 3 complete handoff reports delivered under `.agents/teamwork/`:
   - `spec_miner_m3_3_gen8/handoff.md` (420 lines: RFC 1035 limits, 18% GST formula, anti-tampering bounds, 5-record DNS verification).
   - `explorer_m3_1_gen8/handoff.md` (625 lines: exact test assertions and mock provider contracts).
   - `explorer_m3_2_gen8/handoff.md` (backend architecture and storefront custom domain resolution).

## Immediate Objective for Gen 9
Dispatch workers directly to complete:
- **Milestone 3 (R3)**:
  - `worker/services/domainProvider.js`: Base `DomainProvider`, `SandboxDomainProvider`, `createDomainProvider(env)` with standard TLD rates, 18% GST rounding, 1–10 year rules, anti-tampering guards.
  - `worker/services/domainService.js`: Domain search, availability, Cashfree checkout, D1 `email_domains` provisioning.
  - `worker/routes/domainRoutes.js`: `/api/domains/search`, `/api/domains/pricing`, `/api/domains/purchase/initiate`, `/api/domains/purchase/verify`, `/api/domains/connect`.
  - `worker/storefront.js` & `worker/index.js`: Custom domain resolution and storefront routing.
  - `frontend/src/pages/EmailSettingsPage.tsx`: Live domain purchase integration with Cashfree SDK.
- **Milestone 4 (R4)**:
  - D1 Migration `migrations/0017_merchant_email_templates.sql`.
  - Transactional template engine with live preview & test send.
  - 6 AI Email Assistant tools with version history & undo.
  - Immutable delivery activity logging.
- **Milestone 5 (R5)**: Multi-tenant isolation verification and security hardening.
- **Milestone 6**: Dual-track verification and complete 71-test E2E pass (`node --test tests/e2e-domains-email.test.mjs`).

When ready, claim victory so Sentinel can run the independent Victory Audit.
Working Directory: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\orchestrator_gen9`

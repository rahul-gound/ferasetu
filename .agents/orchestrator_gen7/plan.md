# Execution Plan — orchestrator_gen7

## Objectives
Deliver complete implementation of R1-R5 per `ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z) and `PROJECT.md`:
1. **Milestone 0: Integration Survey & Inventory** (Completed in Gen 6)
2. **E2E Testing Track**: Build `tests/e2e-domains-email.test.mjs` (Tiers 1-4) & publish `TEST_READY.md`.
3. **Milestone 1 (R1)**: Canonical Service Layer (`worker/services/cashfreeService.js`, `turnstileService.js`, `aiGatewayService.js`, `emailCrypto.js` hardening, frontend Statsig pruning).
4. **Milestone 2 (R2)**: Domains & Email Dashboard Experience (`frontend/src/pages/EmailSettingsPage.tsx` tabbed redesign, FeraSetu Mail default, sender aliases, Reply-To routing, advanced SMTP drawer, `Layout.tsx` update).
5. **Milestone 3 (R3)**: Pluggable Domain Provider & Purchase/Connect (`worker/services/domainProvider.js`, `domainService.js`, Cashfree domain checkout, guided DNS verification with DoH, custom domain storefront routing in `classifyHostname`).
6. **Milestone 4 (R4)**: Transactional Email Engine, Templates & AI Assistant (Migration 0017 `merchant_email_templates`, template engine with live preview & test send, 6 AI email tools with undo, delivery activity log).
7. **Milestone 5 (R5)**: Security, Tenant Isolation & Production Hardening (Multi-tenant resource guard, zero secret leakage, CRLF header injection block, sender address spoofing defense).
8. **Milestone 6**: Dual-Track Verification & Victory Claim (100% test pass across all suites, frontend build pass, adversarial coverage verification, forensic integrity audit, final victory claim to Sentinel).

## Work Stream Dependencies
- Parallel Stream 1: E2E Testing Track
- Parallel Stream 2: Milestone 1 (Backend Canonical Services)
- Parallel Stream 3: Milestone 2 (Frontend Dashboard UI)
- Sequence after M1/M2: Milestone 3 & Milestone 4
- Sequence after M3/M4: Milestone 5
- Sequence after M5: Milestone 6 (E2E Verification & Victory Audit)

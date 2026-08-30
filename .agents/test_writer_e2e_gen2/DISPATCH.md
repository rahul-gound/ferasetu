# Dispatch: E2E Testing Track (Test Writer)

## Context & Objectives
You are the dedicated E2E Test Writer for FeraSetu.
Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\test_writer_e2e_gen2
Project root: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Original request: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md
Master architecture: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md

## Scope & Instructions
Design and build a comprehensive, requirement-driven, opaque-box E2E test suite covering Tiers 1-4 for the FeraSetu 3-Tier SaaS model:
- **Tier 1 (Feature Coverage >=5 per feature)**:
  - Canonical 3-Tier plans (Free ₹0, Business ₹399, Pro ₹999)
  - Plan limit definitions & legacy plan normalization
  - Express & Worker product creation limit enforcement
  - Payment initialization & subscription activation endpoints
  - Analytics event ingestion endpoint (`POST /api/analytics/events`)
- **Tier 2 (Boundary & Corner Cases >=5 per feature)**:
  - Exact 25th product allowed on Free, 26th blocked with 403 `PRODUCT_LIMIT_REACHED`
  - Business tier 500 limit boundary
  - Pro tier unlimited products
  - Invalid / mismatched payment amount rejection
  - Unsupported / legacy plan alias normalization edge cases
- **Tier 3 (Cross-Feature Combinations)**:
  - Plan upgrade from Free -> Business dynamically expands product limit
  - A/B pricing variant parameters correctly validated in checkout
  - Analytics telemetry recording lifecycle events across signup, product addition, pricing view, upgrade, and cancellation
- **Tier 4 (Real-World Application Scenarios >=5)**:
  - Complete retail store lifecycle: Sign up -> configure store -> add products -> hit Free limit -> upgrade to Business -> add more products -> check analytics -> manage subscription in settings.

## Execution Requirements
1. Implement test suite under `backend/src/__tests__/e2e-saas-tiers.test.ts` or standalone runnable test scripts using Jest / Node.
2. Ensure tests can run reliably via `npm test` or a dedicated test runner command.
3. Once created and verified, generate `TEST_INFRA.md` and `TEST_READY.md` at project root (`c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\`).
4. Write `handoff.md` in your working directory and notify the parent orchestrator via `send_message`.

# Orchestrator Execution Plan — FeraSetu 3-Tier SaaS & Positioning

## Objective
Deliver full production-ready implementation of FeraSetu 3-tier SaaS pricing model, limit enforcement, subscription UX, value-based landing page copy, lifecycle telemetry, and test suite.

## Execution Tracks & Sequence

### Track 1: Independent E2E Test Suite (Dual Track)
- **Subagent**: `teamwork_preview_test_writer`
- **Scope**: Create opaque-box test suites in `tests/e2e/` (Tiers 1-4) covering:
  - Tier 1: Feature tests (plans, prices, limits, payment, auth, analytics)
  - Tier 2: Boundary & corner cases (product limit = 25, 26th blocked, unlimited tier, invalid payload)
  - Tier 3: Cross-feature combinations (upgrade flow + limit update, A/B variant price propagation)
  - Tier 4: Real-world retail store lifecycle scenarios
- **Deliverable**: `TEST_INFRA.md` & `TEST_READY.md`

### Track 2: Implementation Track

#### Milestone 1 (M1): Centralized Configuration & Shared Types
- **Subagent**: `teamwork_preview_worker`
- **Scope**:
  - `config/plans.ts` & `frontend/src/config/plans.ts`: Canonical Free (₹0), Business (₹399), Pro (₹999).
  - Normalization helpers (`normalizePlanId`), limit queries (`getPlanLimits`), feature gating (`canUseFeature`).
  - A/B pricing variant support (₹299, ₹399, ₹499 for Business).
  - `@ferasetu/shared-types`: align `UserPlan` and `PlanEntitlement`.

#### Milestone 4 (M4): Landing Page Copy & Positioning (Parallel with M1)
- **Subagent**: `teamwork_preview_worker`
- **Scope**:
  - `frontend/src/pages/LandingPage.tsx`: Value-based Indian merchant copy ($100 Startup framing).
  - Trust badges, 3-step solution, zero commissions, WhatsApp order clarity.
  - Live 3-tier pricing preview.

#### Milestone 2 (M2): Backend & Worker Plan Limit Enforcements & Subscription APIs
- **Subagent**: `teamwork_preview_worker` (depends on M1)
- **Scope**:
  - `backend/src/routes/products.ts` & `worker/index.js`: Enforce 25/500/unlimited product limits with 403 `PRODUCT_LIMIT_REACHED`.
  - `backend/src/routes/payment.ts`: Support Business (₹399) & Pro (₹999), annual pricing, A/B variant price validation, transaction recording.
  - `backend/src/routes/analytics.ts`: Ingestion endpoint `POST /api/analytics/events`.
  - `backend/src/middleware/auth.ts`: Ensure free users never expire, normalize plan tiers.

#### Milestone 3 (M3): Frontend Pricing Page, Store Settings & Contextual Upgrade Modals
- **Subagent**: `teamwork_preview_worker` (depends on M1)
- **Scope**:
  - `frontend/src/pages/PricingPage.tsx` & `src/components/pricing/PricingCard.tsx`: 3 transparent cards, Business highlighted as "Most Popular", 4–7 outcome bullets.
  - `src/components/Layout.tsx` & `PlanBadge.tsx`: Dynamic active plan badge, direct upgrade CTA.
  - `src/pages/SettingsPage.tsx` / Subscription management tab: Active plan badge, usage meter, renewal info, cancel/downgrade flow.
  - `src/components/ui/UpgradePrompt.tsx` & `src/pages/ProductsPage.tsx`: Contextual limit banners & modals.

#### Milestone 5 (M5): Business Lifecycle Analytics Instrumentation
- **Subagent**: `teamwork_preview_worker` (depends on M1, M2)
- **Scope**:
  - `frontend/src/utils/analytics.ts`: Typed telemetry dispatcher for 12 lifecycle events across Acquisition, Activation, Monetization, Retention.
  - Instrument events across signup, store setup, product creation, pricing view, upgrade clicks, checkout, and cancellation.

#### Milestone 6 (M6): Verification, Tier 5 Adversarial Hardening & Forensic Integrity Audit
- **Subagents**: `teamwork_preview_challenger`, `teamwork_preview_reviewer`, `teamwork_preview_auditor`
- **Scope**:
  - 100% pass of E2E test suite (Tiers 1-4).
  - Tier 5 adversarial gap analysis and edge-case testing.
  - Zero-tolerance forensic integrity audit (no dummy implementations, no hardcoded cheating).

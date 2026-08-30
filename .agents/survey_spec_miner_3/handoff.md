# Handoff Report — Specification Mining for Shared Architecture, Analytics Lifecycle, A/B Pricing & Build Setup

**Author Agent**: `survey_spec_miner_3`  
**Date**: 2026-08-30  
**Handoff Type**: Hard (Task Complete)  
**Destination Report**: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\survey_spec_miner_3\survey_spec_report.md`

---

## 1. Observation

Direct observations from codebase inspection:

1. **Shared Configuration & Packages**:
   - `packages/shared-types/package.json` defines `@ferasetu/shared-types`, but is NOT included in root `package.json` workspaces (`"workspaces": ["frontend", "backend"]`).
   - `packages/shared-types/src/index.ts:34` defines `UserPlan = 'free' | 'starter' | 'business' | 'beta'`.
   - `packages/shared-types/src/index.ts:430-485` defines `PLAN_ENTITLEMENTS` with limits for `free`, `starter`, `business`, and `beta`.
   - `frontend/src/config/plans.ts:31` defines `PlanId = 'free' | 'growth' | 'pro'`.
   - `frontend/src/config/plans.ts:64-68` defines `PLAN_PRICES = { free: 0, growth: 299, pro: 799 }`.
   - `worker/index.js:106-117` defines hardcoded `PLAN_PRODUCT_LIMITS = { free: 25, beta: 25, trial: 25, basic: 500, growth: 500, standard: 500, pro: Infinity, premium: Infinity, scale: Infinity, business: Infinity }`.
   - `backend/src/routes/payment.ts:11-18` defines hardcoded `PLAN_CONFIG` with `basic: 299, standard: 699, pro: 1499` and validates `body('plan').isIn(['basic', 'standard', 'pro'])` (line 34) and rejects price mismatch `if (requestedAmount !== effectiveAmount)` (line 52).

2. **Telemetry & Analytics Tracking**:
   - `frontend/src/App.tsx:210-221` initializes `@statsig/react-bindings` with client key `client-XOZr1YiFOBSi6y6elVRLgwEQSY44LvCVpRwTzdfbd98` and hardcoded `{ userID: 'a-user' }`.
   - No centralized analytics wrapper or event dispatching library currently exists in `frontend/src/utils/` or `frontend/src/services/`.
   - `backend/src/routes/admin.ts:23` implements `writeAuditLog` for admin actions, but no dedicated SaaS funnel event ingestion endpoint exists.

3. **Experimentation & Feature Flags**:
   - `backend/src/routes/admin.ts:380-463` implements CRUD endpoints for `feature_flags` and `tenant_feature_flags` tables.
   - `backend/src/models/database.ts:430-445, 711-725` defines tables `feature_flags` and `tenant_feature_flags` in both SQLite and MySQL schemas.
   - There is currently no active A/B pricing variant allocator module in `frontend/src/config/plans.ts`.

4. **Contextual Upgrade UI & Gating**:
   - `frontend/src/components/ui/UpgradePrompt.tsx` provides `inline`, `banner`, and `gate` variants.
   - `frontend/src/pages/ProductsPage.tsx:116, 217-227` uses `hasReachedProductLimit` and mounts `UpgradePrompt` when product limit is reached.
   - `AIAssistantPage.tsx`, `AnalyticsPage.tsx`, and `DashboardPage.tsx` do not currently embed `UpgradePrompt`.

5. **Build Setup & Test Scripts**:
   - Root `package.json` contains scripts: `build`, `build:backend`, `build:frontend`, `dev`, `install:all`.
   - `backend/package.json` contains `build: tsc`, `test: jest`.
   - `frontend/package.json` contains `build: vite build`, `lint: eslint .`.

---

## 2. Logic Chain

1. **Discrepancy in Tier Naming & Pricing**:
   - `ORIGINAL_REQUEST.md` mandates 3 canonical tiers: **Free (₹0/mo)**, **Business (₹399/mo - Most Popular)**, and **Pro (₹999/mo - Anchor)**.
   - Frontend currently uses `growth` (₹299) and `pro` (₹799); Worker recognizes `growth` and `basic`; Backend recognizes `basic` (₹299), `standard` (₹699), and `pro` (₹1499); `shared-types` defines `free`, `starter`, `business`, `beta`.
   - **Inference**: A single unified plan schema with canonical IDs (`free`, `business`, `pro`) and a backwards-compatible `LEGACY_PLAN_MAP` must be synchronized across `config/plans.ts`, `@ferasetu/shared-types`, `worker/index.js`, and `backend/src/routes/payment.ts`.

2. **Price Testing / A/B Variant Requirement**:
   - To support price experimentation (e.g. ₹299 vs ₹399 vs ₹499 for Business), the frontend pricing engine must dynamically compute prices based on active variant (query param -> Statsig -> deterministic device/user hash).
   - Backend `payment.ts` strict equality check `requestedAmount !== effectiveAmount` will reject variant payments unless updated to accept permitted variant price ranges.

3. **Lifecycle Telemetry Requirement**:
   - All 12 key lifecycle events across Acquisition (`signup_started`, `signup_completed`), Activation (`store_created`, `first_product_added`, `first_order_received`, `first_ai_action`), Monetization (`pricing_viewed`, `upgrade_clicked`, `checkout_started`, `subscription_created`), and Retention/Churn (`subscription_renewed`, `subscription_cancelled`) require a strongly-typed helper in `frontend/src/utils/analytics.ts` that dispatches through Statsig with consistent payload metadata (including active `variant` and `user_id`).

---

## 3. Caveats

- **Payment Provider**: Backend currently uses development simulation for payments (`provider: 'development'`). When real Razorpay/UPI gateway is added, server-side webhook handling for `subscription_renewed` and `subscription_cancelled` will hook into the same event taxonomy.
- **Statsig Online Availability**: In environments where Statsig network calls are blocked by ad-blockers, telemetry gracefully falls back to local storage logging or console debugging without breaking application runtime.

---

## 4. Conclusion

All requirements for Task R1–R5 have been probed and mapped:
1. Canonical 3-tier structure defined: Free (₹0), Business (₹399/mo - Most Popular), Pro (₹999/mo - Anchor).
2. Centralized configuration design in `config/plans.ts` and `@ferasetu/shared-types` ready for synchronization across frontend, backend, and worker.
3. 12 SaaS lifecycle events fully mapped with triggers and payload schemas.
4. Deterministic A/B pricing experimentation design established with multi-tier price support.
5. All test commands and build tooling documented.

---

## 5. Verification Method

To verify these specifications:
1. **Inspect Shared Types & Plans**:
   - Check `packages/shared-types/src/index.ts` lines 34 and 430–485.
   - Check `frontend/src/config/plans.ts` lines 30–135.
2. **Inspect Backend Payment Validation**:
   - Check `backend/src/routes/payment.ts` lines 11–18 and 33–94.
3. **Inspect Worker Limits**:
   - Check `worker/index.js` lines 106–122 and 330–353.
4. **Inspect Statsig Setup**:
   - Check `frontend/src/App.tsx` lines 210–221.
5. **Run Typechecks & Tests**:
   - Backend: `npm test` in `backend/`
   - Frontend: `npm run build` in `frontend/`

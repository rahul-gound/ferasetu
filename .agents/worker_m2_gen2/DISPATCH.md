# Dispatch: Milestone 2 (M2) Worker — Backend & Worker Plan Limit Enforcement & Subscription APIs

## Context & Objectives
You are the dedicated Worker for Milestone 2 (Backend & Worker Limits, Payment, and Analytics Ingestion).
Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m2_gen2
Project root: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Original request: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md
Master architecture: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Scope of Ownership (Exclusive Write Ownership)
- `backend/src/routes/products.ts`
- `backend/src/routes/payment.ts`
- `backend/src/routes/analytics.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/models/database.ts`
- `backend/src/routes/admin.ts`
- `worker/index.js`
- `worker/routes/admin.js`

## Key Deliverables & Requirements
1. **Express & Worker Product Limit Enforcement**:
   - `backend/src/routes/products.ts`: In `POST /api/products`, count existing products for the user. If `count >= limit`, return 403 Forbidden with `{ success: false, error: "PRODUCT_LIMIT_REACHED", limit, current: count, plan: req.user.plan, upgradeRequired: true }`. Limits: Free = 25, Business = 500, Pro = Infinity.
   - `worker/index.js`: Synchronize `PLAN_PRODUCT_LIMITS = { free: 25, beta: 25, trial: 25, business: 500, growth: 500, basic: 500, standard: 500, pro: Infinity, premium: Infinity, scale: Infinity }`. Default new user signup plan to `"free"`.
2. **Subscription & Payment Routes (`backend/src/routes/payment.ts`)**:
   - Update `PLAN_CONFIG` to Free (₹0), Business (₹399/mo, ₹3,990/yr), Pro (₹999/mo, ₹9,990/yr).
   - Support A/B variant prices for Business (299, 399, 499, 2990, 3990, 4990) and Pro (799, 999, 1299, 7990, 9990, 12990).
   - In `POST /api/payment/initialize` and `/api/payment/verify`: create transaction record in `transactions` table, update `users.plan`, allocate monthly AI credits (Business: 200, Pro: 1000), set `plan_expires_at` (30 days or 365 days).
   - Support `POST /api/payment/cancel` or subscription cancellation updating status.
3. **Backend Analytics Ingestion (`backend/src/routes/analytics.ts`)**:
   - Add `POST /api/analytics/events` (and alias `POST /api/analytics/track`) to record events into `analytics_events` (`id, user_id, event_type, event_data, created_at`).
   - Return `{ success: true, logged: true }`.
4. **Auth & Database Alignment**:
   - `backend/src/middleware/auth.ts`: Use `normalizePlanId`. Free tier users never expire. `requirePremium` allows `business` and `pro`.
   - `backend/src/models/database.ts`: Default `users.plan` column to `'free'` instead of `'beta'`.
5. **Verification**:
   - Run `npm test` in `backend/` and ensure all test suites pass (including `backend/src/__tests__/e2e-saas-tiers.test.ts`).
   - Run `tsc --noEmit` in `backend/`.
   - Write `handoff.md` in your working directory and notify parent.

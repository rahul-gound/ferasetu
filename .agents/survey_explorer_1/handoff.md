# Handoff Report: Backend & Worker 3-Tier SaaS Positioning & Infrastructure Survey

**Agent**: `survey_explorer_1` (Explorer Subagent)  
**Milestone**: Survey & Architecture Audit  
**Target Date**: 2026-08-30  
**Full Report**: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\survey_explorer_1\survey_backend_report.md`

---

## 1. Observation

Direct code and file observations across the codebase:

1. **Plan ID & Pricing Fragmentations**:
   - `backend/src/routes/payment.ts` lines 11–18:
     ```ts
     const PLAN_CONFIG: Record<string, { amount: number; monthlyCredits: number; trialDays?: number }> = {
       beta: { amount: 0, monthlyCredits: 20, trialDays: 3650 },
       trial: { amount: 0, monthlyCredits: 20, trialDays: 7 },
       basic: { amount: 299, monthlyCredits: 100 },
       standard: { amount: 699, monthlyCredits: 500 },
       pro: { amount: 1499, monthlyCredits: 2000 },
       premium: { amount: 699, monthlyCredits: 500 }
     };
     ```
   - `backend/src/routes/admin.ts` line 13:
     ```ts
     const VALID_PLANS = new Set(['free', 'trial', 'basic', 'standard', 'pro', 'premium']);
     ```
   - `packages/shared-types/src/index.ts` lines 34 & 430–485:
     ```ts
     export type UserPlan = 'free' | 'starter' | 'business' | 'beta';
     // Limits: free: maxProducts 10, starter: 100, business: 5000, beta: 100
     ```
   - `frontend/src/config/plans.ts` lines 31, 64–68, 84–112:
     ```ts
     export type PlanId = 'free' | 'growth' | 'pro';
     // Prices: free: 0, growth: 299, pro: 799
     // Limits: free: 25, growth: 500, pro: Infinity
     ```
   - `worker/index.js` lines 106–117:
     ```js
     const PLAN_PRODUCT_LIMITS = {
       free: 25, beta: 25, trial: 25, basic: 500, growth: 500, standard: 500, pro: Infinity, premium: Infinity, scale: Infinity, business: Infinity,
     };
     ```

2. **Product Limit Enforcement**:
   - `backend/src/routes/products.ts` lines 94–114:
     ```ts
     const planLimits: Record<string, number> = {
       'trial': parseInt(process.env.FREE_TIER_MAX_PRODUCTS || '50'),
       'beta': parseInt(process.env.FREE_TIER_MAX_PRODUCTS || '50'),
       'basic': 100,
       'standard': 1000,
       'pro': Infinity
     };
     ```
     Returns 403 when `count >= limit`.
   - `worker/index.js` lines 334–353:
     ```js
     const userRow = await env.DB.prepare("SELECT plan FROM users WHERE id = ?").bind(me.$id).first();
     const userPlan = userRow?.plan ?? "free";
     const productLimit = getPlanProductLimit(userPlan);
     ```
     Returns 403 `{ limit, current, plan, code: "PRODUCT_LIMIT_REACHED" }`.

3. **Database Schema & Plan Storage**:
   - `backend/src/models/database.ts` lines 248, 540:
     `plan VARCHAR(32) NOT NULL DEFAULT 'beta'`, `plan_expires_at DATETIME`, `ai_credits_balance INT NOT NULL DEFAULT 20`, `ai_credits_monthly_limit INT NOT NULL DEFAULT 20`, `storage_limit_bytes BIGINT NOT NULL DEFAULT 52428800`.
   - `transactions` table records all payment/plan changes with `id, user_id, provider_order_id, amount, plan, status, metadata`.
   - `worker/migrations/0001_initial_schema.sql` lines 10–20 defines D1 schema with `plan TEXT NOT NULL DEFAULT 'free'`.

4. **Payment & Razorpay State**:
   - `backend/src/routes/payment.ts`: Only `/initialize` (simulated dev transaction), `/verify` (no-op), `/ai-credits`, `/storage/purchase`, `/ai-credits/purchase`, and `/history` exist.
   - `backend/package.json` contains no `razorpay` dependency. Environment variables `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` exist in `.env.example`.

5. **Analytics Ingestion**:
   - `backend/src/models/database.ts` lines 458–466: `analytics_events` table exists (`id, user_id, event_type, event_data, created_at`).
   - Ripgrep confirmed 0 occurrences of `INSERT INTO analytics_events` across the entire codebase.
   - `backend/src/routes/analytics.ts` has only `GET /dashboard`, `GET /sales`, and `GET /predict`. No `POST /api/analytics/events` exists.

---

## 2. Logic Chain

1. **Premise**: The business model requires a transparent 3-tier SaaS structure:
   - **Free (₹0/mo)**: Acquisition tier with core essentials (25 products, 20 AI credits/mo, 50MB storage).
   - **Business (₹399/mo)**: Main growth tier (500 products, 200 AI credits/mo, 1GB storage, custom branding).
   - **Pro (₹999/mo)**: Anchor tier (Unlimited products, 1,000 AI credits/mo, 5GB storage, advanced AI forecasting).
2. **Finding 1**: Multiple competing naming schemes (`beta/trial/basic/standard/pro` in backend vs. `free/starter/business/beta` in shared-types vs. `free/growth/pro` in frontend) create mismatches where an upgrade to "growth" or "business" in the UI sends mismatched amounts/names to the backend.
3. **Finding 2**: Product limit checks in Express backend enforce 50/100/1000 instead of 25/500/Infinity, while Worker enforces 25/500/Infinity. Both need to import from a single centralized configuration module (`config/plans.ts` / shared package).
4. **Finding 3**: User registration defaults to `'beta'` with a 10-year expiration in backend `auth.ts`, causing trial expiration logic in `auth.ts` (`if (user.plan === 'trial' || user.plan === 'beta')`) to treat free accounts as temporary trials. The default must be `'free'` with perpetual access to Free tier essentials.
5. **Finding 4**: Gating for premium features (`requirePremium` in `backend/src/middleware/auth.ts`) currently blocks `'trial'`, `'free'`, `'beta'`. It should allow `'business'` and `'pro'`.
6. **Finding 5**: Active user metrics in Admin and Public stats rely on `analytics_events` count, which is permanently 0 until an ingestion endpoint (`POST /api/analytics/events`) and client-side tracking are added.

---

## 3. Caveats

- **Razorpay Production Readiness**: Real live Razorpay order creation and webhook signature validation requires installing the `razorpay` SDK or native crypto HMAC verification. In development, the `/api/payment/initialize` simulation safely updates user tier and writes transaction logs without incurring gateway fees.
- **Dual Database Environment**: Changes to Express schemas (`models/database.ts`) operate on MySQL/SQLite, while Cloudflare Worker operates on D1. Both must stay aligned in table structure and default values.
- **Legacy User Migration**: Existing accounts with plan names like `'basic'`, `'growth'`, `'standard'`, or `'beta'` must be safely mapped to `'business'` or `'free'` via a normalization helper to avoid breaking existing users.

---

## 4. Conclusion

The backend and worker are structured and functional, but require configuration consolidation and endpoint additions:
1. **Centralize Plans**: Define canonical `free`, `business` (₹399), and `pro` (₹999) in `config/plans.ts` (replicated in `shared-types`, `backend`, and `worker`).
2. **Server-Side Limits**: Update `backend/src/routes/products.ts` and `worker/index.js` to use `getPlanLimits(plan).products` (Free: 25, Business: 500, Pro: Infinity).
3. **Payment API Alignment**: Update `backend/src/routes/payment.ts` to accept `business` (₹399/mo or ₹3,990/yr) and `pro` (₹999/mo or ₹9,990/yr), handling dev activation and Razorpay integration.
4. **Analytics API Ingestion**: Add `POST /api/analytics/events` in `backend/src/routes/analytics.ts` to record lifecycle events (`signup_started`, `store_created`, `first_product_added`, `pricing_viewed`, `upgrade_clicked`, `checkout_started`).
5. **Auth & Trial Cleanup**: Set default plan to `'free'`, permit perpetual Free tier usage, and update `requirePremium` to gate only advanced AI/analytics features.

---

## 5. Verification Method

To independently verify all findings and test subsequent implementations:

1. **View Audit Files**:
   - `view_file` on `backend/src/routes/payment.ts` (lines 11–18) to verify existing hardcoded plan pricing.
   - `view_file` on `backend/src/routes/products.ts` (lines 94–114) to verify backend product limit checks.
   - `view_file` on `worker/index.js` (lines 106–121, 331–353) to verify worker limit checks.
   - `view_file` on `backend/src/models/database.ts` (lines 458–466) to verify `analytics_events` schema.

2. **Automated Verification Commands**:
   - Backend Typecheck & Test:
     ```powershell
     cd c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\backend
     npm test
     ```
   - Frontend Build & Typecheck:
     ```powershell
     cd c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\frontend
     npm run build
     ```

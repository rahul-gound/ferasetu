# FeraSetu Backend & Worker Survey Report: 3-Tier SaaS Positioning & Infrastructure

**Surveyor**: Teamwork Explorer (`survey_explorer_1`)  
**Date**: 2026-08-30  
**Target Scope**: Express Backend (`backend/`), Cloudflare Worker (`worker/`), Database Schemas & Migrations, Authentication, Plan & Limit Enforcement, Payment/Razorpay Flows, Analytics Infrastructure, and Shared Types (`packages/shared-types/`).

---

## 1. Executive Summary

A comprehensive architectural and code-level audit was conducted across the backend systems of FeraSetu to evaluate readiness for the 3-tier SaaS pricing model (**Free ₹0/mo**, **Business ₹399/mo**, **Pro ₹999/mo**), server-side product limit checks, subscription state handling, and monetization/analytics infrastructure.

### Core Discoveries & Critical Gaps:
1. **Plan ID & Pricing Fragmentations Across Layers**:
   - **Database / Express Backend**: Uses legacy plans `beta`, `trial`, `basic` (₹299), `standard` (₹699), `pro` (₹1499), `premium` (₹699). Default newly created user plan is `beta`.
   - **Worker Edge API**: Uses hardcoded `PLAN_PRODUCT_LIMITS` mapping `free: 25`, `beta: 25`, `trial: 25`, `basic: 500`, `growth: 500`, `standard: 500`, `pro: Infinity`, `premium: Infinity`, `business: Infinity`.
   - **Shared Types (`packages/shared-types/src/index.ts`)**: Defines `UserPlan = 'free' | 'starter' | 'business' | 'beta'` and `PLAN_ENTITLEMENTS` with divergent limits (Free: 10 products, Starter: 100 products, Business: 5000 products).
   - **Frontend (`frontend/src/config/plans.ts`)**: Defines `PlanId = 'free' | 'growth' | 'pro'` with outdated prices (`growth`: ₹299/mo, `pro`: ₹799/mo).
   - **Target Required**: Canonical 3-tier structure:
     - `free`: ₹0/mo (Acquisition tier, 25 products, 20 AI credits/mo, 50MB storage, standard branding)
     - `business`: ₹399/mo (Most Popular growth tier, 500 products, 200 AI credits/mo, 1GB storage, custom branding, full AI)
     - `pro`: ₹999/mo (Anchor tier, Unlimited products, 1,000 AI credits/mo, 5GB storage, priority support, advanced AI)

2. **Server-Side Limit Enforcement Discrepancies**:
   - `backend/src/routes/products.ts` (Express) enforces limits using a local `planLimits` dictionary (`trial/beta`: 50, `basic`: 100, `standard`: 1000, `pro`: Infinity).
   - `worker/index.js` (Worker) enforces limits using `getPlanProductLimit(userPlan)` (Free/Beta/Trial: 25, Basic/Growth/Standard: 500, Pro/Business/Scale: Infinity).
   - The limit values and tier names do not match between Express backend, Worker edge API, shared types, and frontend configuration.

3. **Payment & Subscription State Handling**:
   - Currently, user plan state is stored directly in the `users` table (`plan`, `plan_expires_at`, `ai_credits_balance`, `ai_credits_monthly_limit`, `ai_credits_used_month`, `ai_credits_reset_at`, `storage_used_bytes`, `storage_limit_bytes`).
   - `POST /api/payment/initialize` in Express handles simulated plan activations in dev mode, writing a transaction record (`transactions` table) and updating user plan columns.
   - Razorpay integration is currently stubbed (environment variables exist in `.env.example`, but no active SDK/verification logic in `payment.ts`).
   - Subscription renewal/expiration checks exist in `backend/src/middleware/auth.ts` for trial/beta plans, but lack standard recurring billing status tracking (`active`, `past_due`, `cancelled`).

4. **Analytics & Business Metrics Tracking**:
   - The `analytics_events` table exists in both MySQL and SQLite database schemas (`id, user_id, event_type, event_data, created_at`).
   - However, there is **zero ingestion endpoint** (e.g. `POST /api/analytics/events` or `POST /api/analytics/track`) in Express or Worker API.
   - Key admin and auth queries (such as active user counts) query `analytics_events`, which currently returns 0 because no events are ever inserted.

---

## 2. Architecture Comparison: Express Backend vs. Cloudflare Worker Edge API

FeraSetu employs a dual-backend architecture designed for serverless edge speed on storefronts and full Node.js capability for background services:

| Component | Express Backend (`backend/`) | Cloudflare Worker Edge API (`worker/`) |
|---|---|---|
| **Runtime & Host** | Node.js (TypeScript) on Oracle Cloud VM / VPS | Cloudflare Workers (V8 Isolate / ES Modules) |
| **Database** | MySQL (Production via `sync-mysql`) / SQLite (Dev via `node:sqlite DatabaseSync`) | Cloudflare D1 (Edge SQLite binding `DB`) |
| **Schema Management** | `backend/src/models/database.ts` (Auto-creates tables on boot via raw SQL) | `worker/migrations/` (0001 initial, 0002 admin) + `schema.sql` |
| **Authentication** | JWT stored in HttpOnly cookie `access_token` with fallback to Bearer header; WorkOS JWKS session verification | WorkOS / Clerk JWT verified via Web Crypto API (`jose.jwtVerify` + remote JWKS) |
| **Key Endpoints** | `/api/auth`, `/api/products`, `/api/orders`, `/api/payment`, `/api/ai`, `/api/analytics`, `/api/website`, `/api/voice`, `/api/tickets`, `/api/settings`, `/api/users`, `/api/admin` | `/api/users/me`, `/api/products`, `/api/orders`, `/api/meetings`, `/api/v1/ai/chat`, `/api/pricing/founding-offer`, `/api/admin/*` |
| **File Storage** | Local filesystem (`uploads/`) with path traversal check | Not supported on worker (relies on URLs) |
| **AI Integration** | Sarvam AI (`services/sarvamAI.ts`) with direct HTTP client (30B and 105B models) | Sarvam AI Router (`ai/router.ts`) + CEO Orchestrator (`ai/skills/orchestrator.ts`) |

---

## 3. Database Schemas & Plan State Storage

### 3.1 `users` Table Schema

The `users` table is the central source of truth for merchant subscription status across MySQL, SQLite, and Cloudflare D1:

```sql
CREATE TABLE IF NOT EXISTS users (
  id                        VARCHAR(64) PRIMARY KEY,
  workos_user_id            VARCHAR(120) UNIQUE,
  email                     VARCHAR(255) UNIQUE NOT NULL,
  password_hash             VARCHAR(255) NOT NULL DEFAULT '',
  name                      VARCHAR(255) NOT NULL,
  phone                     VARCHAR(40),
  business_name             VARCHAR(255),
  logo_url                  TEXT,
  plan                      VARCHAR(32) NOT NULL DEFAULT 'free',      -- Currently defaults to 'beta' in DB
  plan_expires_at           DATETIME / TEXT,
  preferred_language        VARCHAR(16) NOT NULL DEFAULT 'en',
  subdomain                 VARCHAR(120) UNIQUE,
  custom_domain             VARCHAR(255) UNIQUE,
  is_blocked                TINYINT / INTEGER NOT NULL DEFAULT 0,
  is_verified               TINYINT / INTEGER NOT NULL DEFAULT 0,
  ai_credits_balance        INT NOT NULL DEFAULT 20,
  ai_credits_monthly_limit  INT NOT NULL DEFAULT 20,
  ai_credits_used_month     INT NOT NULL DEFAULT 0,
  ai_credits_reset_at       DATETIME / TEXT,
  storage_used_bytes        BIGINT NOT NULL DEFAULT 0,
  storage_limit_bytes       BIGINT NOT NULL DEFAULT 52428800,         -- 50 MB default
  created_at                DATETIME / TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME / TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Subscription & Payment Related Tables

1. **`transactions` Table**:
   - Columns: `id`, `user_id`, `provider_order_id`, `provider_payment_id`, `amount`, `currency` (default `'INR'`), `status` (`pending`, `completed`, `failed`), `plan`, `metadata`, `created_at`, `updated_at`.
   - Used for recording plan upgrades and add-on purchases (AI credit packs, extra storage).
2. **`ai_credit_purchases` Table**:
   - Columns: `id`, `user_id`, `credits`, `amount`, `usage_scope`, `status`, `created_at`.
3. **`storage_purchases` Table**:
   - Columns: `id`, `user_id`, `gb_added`, `amount`, `status`, `created_at`.
4. **`ai_usage_logs` Table**:
   - Columns: `id`, `user_id`, `model`, `prompt_tokens`, `completion_tokens`, `cost`, `credits_used`, `usage_type`, `created_at`.
5. **`analytics_events` Table**:
   - Columns: `id`, `user_id`, `event_type`, `event_data` (JSON text), `created_at`.

---

## 4. Detailed Audit of Plan & Quota Enforcement

### 4.1 Product Catalog Limits

| Implementation | Location | Current Logic | Issues |
|---|---|---|---|
| **Express Backend** | `backend/src/routes/products.ts` (lines 94-114) | `const planLimits = { trial: 50, beta: 50, basic: 100, standard: 1000, pro: Infinity };` | Hardcoded inside route handler; uses obsolete plan keys (`basic`, `standard`); limit is 50 for trial/beta instead of 25 for Free. |
| **Worker Edge API** | `worker/index.js` (lines 106-121, 331-353) | `PLAN_PRODUCT_LIMITS = { free: 25, beta: 25, basic: 500, growth: 500, standard: 500, pro: Infinity, ... }` | Hardcoded in `index.js`; returns 403 `PRODUCT_LIMIT_REACHED`. Uses `growth` instead of `business`. |
| **Shared Types** | `packages/shared-types/src/index.ts` (lines 430-485) | `free: 10, starter: 100, business: 5000, beta: 100` | Out of sync with both Worker (25/500/unlimited) and Express. |
| **Frontend UI** | `frontend/src/config/plans.ts` (lines 84-112) | `free: 25, growth: 500, pro: Infinity` | Matches Worker, but uses `growth` name instead of `business`. |

### 4.2 AI Usage & Credit Limits

| Component | Implementation | Enforcement Details |
|---|---|---|
| **Express Backend** | `backend/src/routes/ai.ts` (`chargeAiCredits`) | - Deducts credits based on operation: `shopkeeper_assistant`: 1, `website_ai`: 3, `customer_assistant`: 2.<br>- Auto-renews monthly allowance if `ai_credits_reset_at <= Date.now()`.<br>- Throws `402 Payment Required` if balance < needed.<br>- Restores credits if AI invocation fails. |
| **Worker Edge API** | `worker/index.js` (`handleV1AIChat`) | - Checks `ai_credits_balance <= 0`, throws 402 `HttpError('AI credits exhausted...', 402)`.<br>- Best-effort credit deduction (`UPDATE users SET ai_credits_balance = ai_credits_balance - 1`). |
| **AI Feature Gating** | `backend/src/routes/analytics.ts` (`requirePremium`) | - AI Sales Prediction (`/api/analytics/predict`) blocked for `trial`, `free`, `beta`. |

### 4.3 Public Storefront Gating & Trial Expiry

- **Middleware**: `validatePublicShop` in `backend/src/middleware/auth.ts`:
  ```ts
  if ((user.plan === 'trial' || user.plan === 'beta') && user.plan_expires_at) {
    const expiresAt = new Date(user.plan_expires_at);
    if (expiresAt < new Date()) {
      res.status(402).send(`... Store Temporarily Unavailable ... Upgrade your plan ...`);
      return;
    }
  }
  ```
- **Auth Guard**: `authenticate` middleware in `backend/src/middleware/auth.ts`:
  - Rejects API access with 403 `Trial expired` if `plan_expires_at < new Date()`.
  - **Issue**: A user on the Free plan should have **indefinite access** to core essentials rather than being blocked as an expired trial.

---

## 5. Payment & Subscription Implementation Status

### 5.1 Current Flow (`/api/payment/initialize`)
1. Client POSTs `{ plan: 'basic', amount: 299, billing: 'monthly' }`.
2. Backend validates amount against `PLAN_CONFIG` and `getEffectivePlanAmount` in `config/beta.ts`.
3. If beta mode is active or dev mode, updates `users.plan = plan`, adds monthly credits, resets credit renewal timer (`now + 30 days`), and inserts a completed record in `transactions`.
4. Returns `success: true`.

### 5.2 Razorpay Integration Readiness
- **Dependencies**: Razorpay package (`razorpay`) is **not installed** in `backend/package.json`.
- **Configuration**: Keys `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are documented in `backend/.env.example`.
- **Webhooks**: Signature verification (`crypto.createHmac('sha256', secret).update(body).digest('hex')`) is not yet implemented.
- **Immediate Requirement for 3-Tier SaaS**:
  - Implement real / simulated subscription initiation endpoint supporting standard Razorpay Orders / Subscriptions or instant dev activation.
  - Support monthly vs. annual pricing (Business ₹399/mo or ₹3,990/yr; Pro ₹999/mo or ₹9,990/yr).

---

## 6. Centralized Plan Infrastructure Specifications

To eliminate hardcoded values and divergence across all tiers, all plan limits and metadata must be unified in a single source of truth (`config/plans.ts` / shared package):

### Canonical 3-Tier Plan Definitions

```typescript
export type PlanId = 'free' | 'business' | 'pro';

export interface PlanPricing {
  monthly: number;        // INR per month
  yearly: number;         // INR per year (10 months cost)
  yearlyPerMonth: number; // Effective monthly cost
}

export interface PlanLimits {
  products: number;             // Free: 25, Business: 500, Pro: Infinity
  aiCreditsPerMonth: number;    // Free: 20, Business: 200, Pro: 1000
  storageBytes: number;         // Free: 50MB, Business: 1GB, Pro: 5GB
  customDomain: boolean;        // Free: false, Business: true (or coming soon), Pro: true
  advancedAnalytics: boolean;   // Free: false, Business: true, Pro: true
  staffAccounts: number;        // Free: 1, Business: 2, Pro: 5
  removeBranding: boolean;      // Free: false, Business: true, Pro: true
  prioritySupport: boolean;     // Free: false, Business: true, Pro: true
}

export const CANONICAL_PLANS: Record<PlanId, {
  id: PlanId;
  displayName: string;
  tagline: string;
  outcome: string;
  price: PlanPricing;
  limits: PlanLimits;
  highlighted?: boolean;
}> = {
  free: {
    id: 'free',
    displayName: 'Free',
    tagline: 'Start your online store with zero risk.',
    outcome: 'Put your shop online, share your catalog, and receive direct WhatsApp and online orders.',
    price: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
    limits: {
      products: 25,
      aiCreditsPerMonth: 20,
      storageBytes: 50 * 1024 * 1024,
      customDomain: false,
      advancedAnalytics: false,
      staffAccounts: 1,
      removeBranding: false,
      prioritySupport: false,
    },
  },
  business: {
    id: 'business',
    displayName: 'Business',
    tagline: 'Run and grow your retail business efficiently.',
    outcome: 'Expand your catalog, track profits, automate stock alerts, and use your AI assistant daily.',
    price: { monthly: 399, yearly: 3990, yearlyPerMonth: 332 },
    limits: {
      products: 500,
      aiCreditsPerMonth: 200,
      storageBytes: 1 * 1024 * 1024 * 1024,
      customDomain: true,
      advancedAnalytics: true,
      staffAccounts: 2,
      removeBranding: true,
      prioritySupport: true,
    },
    highlighted: true,
  },
  pro: {
    id: 'pro',
    displayName: 'Pro',
    tagline: 'Complete power and scale for serious merchants.',
    outcome: 'Unlimited catalog capacity, advanced predictive AI forecasting, multiple staff, and top priority support.',
    price: { monthly: 999, yearly: 9990, yearlyPerMonth: 832 },
    limits: {
      products: Infinity,
      aiCreditsPerMonth: 1000,
      storageBytes: 5 * 1024 * 1024 * 1024,
      customDomain: true,
      advancedAnalytics: true,
      staffAccounts: 5,
      removeBranding: true,
      prioritySupport: true,
    },
  },
};
```

### Legacy Plan Normalization Map
```typescript
export const LEGACY_PLAN_MAP: Record<string, PlanId> = {
  free: 'free',
  beta: 'free',
  trial: 'free',
  basic: 'business',
  starter: 'business',
  growth: 'business',
  standard: 'business',
  business: 'business',
  pro: 'pro',
  premium: 'pro',
  scale: 'pro',
};
```

---

## 7. Action Plan & Exact Files Requiring Modification/Creation

| File Path | Component | Proposed Modification / Creation |
|---|---|---|
| `packages/shared-types/src/index.ts` | Shared Types | Update `UserPlan = 'free' \| 'business' \| 'pro'`, modernize `PLAN_ENTITLEMENTS` with Free (25), Business (500), Pro (Infinity). |
| `backend/src/config/plans.ts` *(New or Updated)* | Backend Config | Centralize canonical plan pricing, limits, entitlements, and normalization helpers. |
| `backend/src/models/database.ts` | Backend Database | Set default `plan` column value to `'free'` instead of `'beta'`. Ensure `analytics_events` and `transactions` tables are indexed and ready. |
| `backend/src/middleware/auth.ts` | Backend Middleware | Normalize plan IDs using `normalizePlanId`. Update `requirePremium` to allow `business` and `pro`. Ensure Free users never expire. |
| `backend/src/routes/products.ts` | Backend Products API | Replace hardcoded `planLimits` with `getPlanLimits(req.user.plan).products`. Return standard structured 403 `PRODUCT_LIMIT_REACHED` error with current count, limit, and target upgrade plan. |
| `backend/src/routes/payment.ts` | Backend Payment API | Update `PLAN_CONFIG` to Free (₹0), Business (₹399), Pro (₹999). Add annual billing support. Support Razorpay order creation and verification / dev activation. |
| `backend/src/routes/analytics.ts` | Backend Analytics API | Add `POST /api/analytics/events` (and `POST /api/analytics/track`) route to record SaaS lifecycle events (`signup_started`, `store_created`, `first_product_added`, `pricing_viewed`, `upgrade_clicked`, `checkout_started`, etc.) into `analytics_events`. |
| `backend/src/routes/admin.ts` | Backend Admin API | Update `VALID_PLANS` to `new Set(['free', 'business', 'pro'])` and handle legacy plan migration gracefully. |
| `worker/index.js` | Cloudflare Worker API | Synchronize `PLAN_PRODUCT_LIMITS` (Free: 25, Business: 500, Pro: Infinity). Align default profile creation to `plan: "free"`. |
| `worker/routes/admin.js` | Worker Admin API | Align valid plan updates with new 3-tier canonical schema. |
| `frontend/src/config/plans.ts` | Frontend Config | Align pricing to Free (₹0), Business (₹399/mo, ₹3,990/yr), Pro (₹999/mo, ₹9,990/yr) with outcome-driven benefits. |

---

## 8. Verification Strategy

1. **Type Checking & Build**:
   - `npm run build` in `frontend/` (Zero TypeScript errors)
   - `tsc --noEmit` in `backend/`
2. **Automated Unit Tests**:
   - `npm test` in `backend/` (All existing tests pass + new test suites for plan limits, pricing calculation, and analytics ingestion)
3. **API Integration Verification**:
   - Product limit verification: verify adding the 26th product on a Free plan returns HTTP 403 with `PRODUCT_LIMIT_REACHED`.
   - Upgrade flow verification: verify upgrading from Free to Business updates `user.plan` to `business` and increases product limit to 500.
   - Analytics verification: verify `POST /api/analytics/events` successfully writes to `analytics_events` and admin active user count reflects recent events.

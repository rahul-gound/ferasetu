# Specification Mining Report: Shared Architecture, Analytics Lifecycle, A/B Pricing & Build Setup

**Agent**: `survey_spec_miner_3`  
**Date**: 2026-08-30  
**Target Project**: FeraSetu (Shopkeeper Web Platform)  
**Corpus / Workspace**: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-`

---

## 1. Executive Summary

This specification mining report covers:
1. **Shared Configuration & Package Architecture**: Analysis of `@ferasetu/shared-types`, `config/plans.ts`, frontend, Express backend, and Cloudflare Worker type & configuration sharing.
2. **SaaS Lifecycle Analytics & Telemetry**: Full lifecycle event mapping across Acquisition (`signup_started`, `signup_completed`), Activation (`store_created`, `first_product_added`, `first_order_received`, `first_ai_action`), Monetization (`pricing_viewed`, `upgrade_clicked`, `checkout_started`, `subscription_created`), and Retention & Churn (`subscription_renewed`, `subscription_cancelled`).
3. **Experimentation & A/B Pricing Variant Support**: Architecture for price testing (₹299 vs ₹399 vs ₹499 for Business; ₹799 vs ₹999 vs ₹1499 for Pro), fallback bucketing, Statsig integration, and telemetry tagging.
4. **Build Setup & Test Harnesses**: Package workspaces, TypeScript compilation, Jest test suites, ESLint, and edge worker scripts.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Shared Types | `@ferasetu/shared-types` Package | Monorepo shared type definitions for AI orchestration, tools, entitlements, and errors | TypeScript interfaces (`AIRequest`, `UserPlan`, `PlanEntitlement`, etc.) | `.d.ts` types | N/A (compile-time) | `packages/shared-types/src/index.ts` |
| 2 | Plan Config | Frontend Plan Configuration | Single source of truth for UI plan definitions, limits, and legacy normalization | `planId` string (e.g. `'beta'`, `'basic'`, `'growth'`) | `PlanDefinition`, `PlanLimits`, `PlanPrice` | Defaults to `'free'` plan if unrecognized | `frontend/src/config/plans.ts` |
| 3 | Plan Limits | Worker Server-Side Product Limit Enforcement | Server-side enforcement of product creation limits in Cloudflare D1 worker | `POST /api/products` with product payload + auth token | 201 JSON created product | 403 `PRODUCT_LIMIT_REACHED` with current & limit counts | `worker/index.js:330-353` |
| 4 | Plan Limits | Backend Plan Gating & Verification | Express middleware checking user tier & trial expiration before granting access | `req.user.plan`, `req.user.plan_expires_at` | Passes to route handler | 403 / 402 with upgrade prompt message | `backend/src/middleware/auth.ts:135-143` |
| 5 | Monetization | Payment Initialization Route | Dev/live plan activation creating transaction record and updating user credits & plan | `POST /api/payment/initialize` with `plan`, `amount`, `billing` | 201 `{ success: true, id, plan, amount }` | 400 if plan invalid or amount does not match `PLAN_CONFIG` | `backend/src/routes/payment.ts:33-94` |
| 6 | Monetization | AI Credits Purchase & Storage Purchase | Extra AI credit pack and storage purchase routes with transaction logging | `POST /api/payment/ai-credits/purchase`, `POST /api/payment/storage/purchase` | 201 `{ success: true, purchaseId, balance }` | 400 on invalid pack or storage GB range | `backend/src/routes/payment.ts:123-198` |
| 7 | Monetization | Founding Offer Edge API | Edge route returning slots remaining and offer status for early shopkeepers | `GET /api/pricing/founding-offer` | JSON `{ enabled, totalSlots, claimedSlots, slotsRemaining, offerPlan, offerMonths }` | 500 on D1 query failure | `worker/index.js:868-900` |
| 8 | Telemetry | Statsig Web Analytics & Session Replay | Statsig React provider initialized at frontend root for feature flags and replay | Statsig Client Key, `userID`, plugins | Active Statsig context & auto-capture | Silently falls back if network unreachable | `frontend/src/App.tsx:210-221` |
| 9 | Telemetry | SaaS Lifecycle Event Tracking Contract | Standardized client/server event dispatcher for Acquisition, Activation, Monetization, Retention | Event Name + Payload Object (`user_id`, `variant`, `metadata`) | Logged to Statsig / backend event pipeline | Graceful failure without breaking user interaction | `ORIGINAL_REQUEST.md` & `frontend/src/App.tsx` |
| 10 | Experimentation | A/B Pricing Variant Engine | Deterministic variant allocator for testing pricing tiers (₹299 vs ₹399 vs ₹499) | `userId` / `deviceId` / query parameter `?pricing_variant=` | Active variant config (`prices`, `variantId`) | Defaults to control/standard variant (₹399) | `ORIGINAL_REQUEST.md` & `frontend/src/config/plans.ts` |
| 11 | Experimentation | Backend Feature Flags & Tenant Overrides | Database-backed feature flags and tenant-level overrides with admin audit logging | `flag_key`, `tenant_id`, `is_enabled`, `rules_json` | Flag status JSON | 400 on missing parameters | `backend/src/routes/admin.ts:380-463` |
| 12 | UI Gating | Contextual Upgrade Prompt Component | Reusable inline/banner/modal UI nudge for tier limit thresholds and premium features | `reason`, `benefit`, `targetPlan`, `currentPlan`, `variant` | Rendered banner / inline callout | None (renders null if already on top plan) | `frontend/src/components/ui/UpgradePrompt.tsx` |
| 13 | Pricing UI | 3-Tier Conversion-Optimized Pricing Cards | Transparent card UI with "Most Popular" highlight, monthly/annual toggle, and outcomes | `PLANS` array, `billingCycle`, `isCurrentPlan`, `onSelect` | Responsive pricing grid | None | `frontend/src/components/pricing/PricingCard.tsx` |
| 14 | Pricing UI | Side-by-Side Feature Comparison Table | Comprehensive matrix comparing Free vs Business vs Pro capabilities | `COMPARISON_ROWS` configuration | Categorized responsive HTML table | None | `frontend/src/components/pricing/FeatureComparison.tsx` |
| 15 | Pricing UI | Value & ROI Calculator | Interactive widget calculating monthly revenue gain vs plan cost | `monthlyPlanCost`, orders per day slider | Computed estimated monthly profit & ROI | None | `frontend/src/components/pricing/ValueCalculator.tsx` |

---

## 3. Edge Cases & Observed Behaviors

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Plan Normalization | Unrecognized plan string (e.g. `'custom_enterprise'`, `undefined`, `null`) | `normalizePlanId` safely returns `'free'`, preventing UI crashes. |
| 2 | Legacy Plan Mapping | Legacy string `'beta'` or `'trial'` | Normalizes to `'free'` on frontend, while backend checks expiration date `plan_expires_at`. |
| 3 | Product Limit Boundary | Free merchant creating 25th product | Creation succeeds (count becomes 25). |
| 4 | Product Limit Exceeded | Free merchant attempting to create 26th product | Worker throws 403 `PRODUCT_LIMIT_REACHED` with payload `{ limit: 25, current: 25, plan: 'free' }`. Frontend `ProductsPage` shows toast error and upgrade banner. |
| 5 | Unlimited Plan Boundary | Pro merchant on `products: Infinity` | Server-side limit check skips count query (`if (productLimit !== Infinity)`) and inserts product immediately. |
| 6 | Payment Amount Mismatch | Frontend sends A/B variant price (e.g. ₹399) to backend expecting legacy ₹299 | Backend `payment.ts` rejects with 400 `"Invalid amount for selected plan"`. (Requires variant-aware validator). |
| 7 | Offline / Blocked Statsig | Ad blocker blocks Statsig CDN or network fails | `useClientAsyncInit` resolves or times out; app continues to render with fallback default values. |
| 8 | Unauthenticated Pricing Navigation | Anonymous visitor clicks "Get Business" | Navigates to `/register?plan=business` preserving plan intent in query string. |
| 9 | Authenticated Same-Plan Click | Merchant on Business clicks "Get Business" | Action is no-op, button shows "Current Plan". |
| 10 | Annual Billing Toggle | User toggles to "Annual" | Price displays effective monthly rate (₹249/mo or ₹332/mo) and badge highlights "Save 2 months". |

---

## 4. Deep-Dive Architectural Findings

### 4.1. Shared Configuration & Type Unification
- **Current Monorepo Layout**:
  - `packages/shared-types`: `@ferasetu/shared-types`
  - `frontend`: Vite + React 19 + TypeScript
  - `backend`: Node + Express + TypeScript
  - `worker`: Cloudflare Worker (ES Modules)
- **Discrepancies Found**:
  1. `UserPlan` type in `packages/shared-types/src/index.ts` is `'free' | 'starter' | 'business' | 'beta'`, whereas `frontend/src/config/plans.ts` uses `'free' | 'growth' | 'pro'`.
  2. The canonical 3 tiers requested in `ORIGINAL_REQUEST.md` are:
     - **Free (₹0/mo)**
     - **Business (₹399/mo - Most Popular)**
     - **Pro (₹999/mo - Anchor)**
  3. Worker has hardcoded `PLAN_PRODUCT_LIMITS = { free: 25, basic: 500, growth: 500, pro: Infinity }`.
  4. Backend has hardcoded `PLAN_CONFIG` with `basic: 299, standard: 699, pro: 1499`.
- **Target Specification**:
  - Centralize canonical tier definition in `config/plans.ts` (and shared types) with explicit schema:
    ```ts
    export type CanonicalPlanId = 'free' | 'business' | 'pro';
    
    export interface PlanTierConfig {
      id: CanonicalPlanId;
      displayName: string;
      tagline: string;
      outcome: string;
      pricing: {
        standard: { monthly: number; yearly: number; yearlyPerMonth: number };
        variants?: Record<string, { monthly: number; yearly: number; yearlyPerMonth: number }>;
      };
      limits: {
        products: number;
        aiCreditsPerMonth: number;
        storageBytes: number;
        customDomain: boolean;
        advancedAnalytics: boolean;
        staffAccounts: number;
        removeBranding: boolean;
      };
    }
    ```

---

### 4.2. SaaS Lifecycle Telemetry & Event Logging Contract

The platform requires a centralized analytics client (`frontend/src/utils/analytics.ts` or `frontend/src/services/analytics.ts`) that dispatches to Statsig and optionally records to backend telemetry.

#### SaaS Event Taxonomy:

1. **Acquisition**:
   - `signup_started`:
     - Trigger: Click on "Start Free", "Launch Store", or navigation to `/register`.
     - Payload: `{ source: string, cta_location: string, language: string, pricing_variant?: string, timestamp: string }`
   - `signup_completed`:
     - Trigger: Successful account creation / WorkOS verification callback.
     - Payload: `{ user_id: string, email: string, auth_provider: string, plan: string, language: string }`

2. **Activation**:
   - `store_created`:
     - Trigger: Merchant completes initial onboarding / sets shop subdomain.
     - Payload: `{ user_id: string, subdomain: string, template: string, business_name: string }`
   - `first_product_added`:
     - Trigger: Merchant successfully saves their first product (`product_count === 1`).
     - Payload: `{ user_id: string, product_id: string, category: string, price: number }`
   - `first_order_received`:
     - Trigger: Merchant receives their first customer order in dashboard or storefront.
     - Payload: `{ user_id: string, order_id: string, total: number, delivery_type: string }`
   - `first_ai_action`:
     - Trigger: Merchant executes first prompt, product description generation, or translation.
     - Payload: `{ user_id: string, skill: string, language: string, token_count?: number }`

3. **Monetization**:
   - `pricing_viewed`:
     - Trigger: Viewing `/pricing` or opening `/upgrade`.
     - Payload: `{ user_id?: string, billing_cycle: 'monthly' | 'yearly', variant: string, current_plan?: string }`
   - `upgrade_clicked`:
     - Trigger: Clicking any "Upgrade" / "Get Plan" button from pricing cards or contextual triggers.
     - Payload: `{ user_id: string, from_plan: string, target_plan: string, trigger_source: string, variant: string }`
   - `checkout_started`:
     - Trigger: Initiating plan payment (`/api/payment/initialize`).
     - Payload: `{ user_id: string, plan: string, amount: number, billing_cycle: string, variant: string }`
   - `subscription_created`:
     - Trigger: Payment confirmation and user plan upgrade in database.
     - Payload: `{ user_id: string, plan: string, amount: number, transaction_id: string, variant: string }`

4. **Retention & Churn**:
   - `subscription_renewed`:
     - Trigger: Monthly or annual recurring billing success.
     - Payload: `{ user_id: string, plan: string, renewal_number: number, amount: number }`
   - `subscription_cancelled`:
     - Trigger: Merchant downgrades to free or cancels recurring subscription.
     - Payload: `{ user_id: string, previous_plan: string, reason?: string, lifetime_days: number }`

---

### 4.3. Experimentation & A/B Pricing Variant Engine

- **Goal**: Enable rapid testing of price points without code deployment.
- **Variant Definitions**:
  - `standard` (Control): Business ₹399/mo (₹3,990/yr), Pro ₹999/mo (₹9,990/yr).
  - `variant_299`: Business ₹299/mo (₹2,990/yr), Pro ₹799/mo (₹7,990/yr).
  - `variant_499`: Business ₹499/mo (₹4,990/yr), Pro ₹1,299/mo (₹12,990/yr).
- **Allocation Hierarchy**:
  1. URL Override (`?pricing_variant=variant_299`): Allows immediate testing and QA.
  2. Statsig Dynamic Experiment (`getExperiment('pricing_tier_experiment')`): Centralized remote flag allocation.
  3. Stable Client-Side Hash: Fallback hashing of anonymous visitor ID or user ID ensuring zero flicker and deterministic stickiness.
- **Backend Acceptance**:
  - `POST /api/payment/initialize` must accept valid variant prices:
    ```ts
    const ALLOWED_PRICES: Record<string, number[]> = {
      business: [299, 399, 499, 2990, 3990, 4990],
      pro: [799, 999, 1299, 1499, 7990, 9990, 12990, 14990],
      free: [0],
    };
    ```

---

### 4.4. Build Setup & Verification Matrix

- **Root**: `package.json` with npm workspaces (`frontend`, `backend`).
- **Backend Build & Test**:
  - Build: `tsc` (outputs to `backend/dist`)
  - Test: `jest` with `ts-jest`
  - Current test suites: `src/__tests__/seo-noindex.test.ts`, `src/config/beta.test.ts`, `src/services/surveyAssistant.test.ts`.
- **Frontend Build & Lint**:
  - Build: `vite build` (outputs to `frontend/dist`)
  - Lint: `eslint .`
- **Worker**:
  - ES modules with `wrangler.toml` targeting Cloudflare D1.

---

## 5. Implementation Recommendations for Subsequent Phases

1. **Unify Plans Configuration**:
   - Update `frontend/src/config/plans.ts` to canonical Free (₹0), Business (₹399 - Most Popular), Pro (₹999 - Anchor).
   - Sync `packages/shared-types/src/index.ts` `UserPlan` and `PLAN_ENTITLEMENTS`.
   - Update `worker/index.js` and `backend/src/routes/payment.ts` to recognize the unified canonical tiers and prices.
2. **Implement Analytics Helper (`frontend/src/utils/analytics.ts`)**:
   - Wrap Statsig `logEvent` with strongly-typed event signatures for all 12 SaaS lifecycle events.
   - Sync Statsig user identity on WorkOS login in `AuthContext.tsx`.
3. **Connect Contextual Upgrade Triggers**:
   - Ensure `UpgradePrompt` is integrated in `ProductsPage.tsx`, `AnalyticsPage.tsx`, `FeraAIPage.tsx`, and `DashboardPage.tsx`.
4. **Update Payment Validation in Backend**:
   - Support variant price points and canonical tier names (`business`, `pro`, `free`) in `backend/src/routes/payment.ts`.

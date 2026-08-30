# Project: FeraSetu SaaS 3-Tier Model, Contextual Gating & Value Positioning

## Architecture
FeraSetu is an all-in-one e-commerce and AI business platform for Indian shopkeepers consisting of:
1. **Frontend (React 19 + TypeScript + Vite + Tailwind CSS)**: Merchant dashboard, product management, orders, AI assistants, store settings, pricing page, and landing pages.
2. **Backend (Express + TypeScript + SQLite/MySQL)**: REST API for authentication, merchant data, catalog, orders, payments, admin dashboard, feature flags, and analytics ingestion.
3. **Cloudflare Worker (JavaScript Edge / D1)**: Edge API for high-performance serverless endpoints, product catalog limit checks, and store operations.
4. **Shared Configuration & Packages (`config/plans.ts` & `@ferasetu/shared-types`)**: Canonical plan definitions (Free ₹0, Business ₹399/mo, Pro ₹999/mo), feature entitlements, legacy plan normalization, and A/B pricing experiment allocation.
5. **Analytics & Experimentation Engine**: Privacy-respecting lifecycle telemetry (Acquisition, Activation, Monetization, Retention/Churn) instrumented via Statsig and local database ingestion.

```
┌────────────────────────────────────────────────────────┐
│                   Merchant / Browser                   │
│   (Landing, Pricing, Dashboard, Settings, Upgrades)    │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
       ┌───────▼────────┐         ┌───────▼────────┐
       │ Express API    │         │ Cloudflare D1  │
       │ (Auth, Payment,│         │ (Edge Worker,  │
       │  Analytics)    │         │  Catalog)      │
       └───────┬────────┘         └───────┬────────┘
               │                          │
               └──────────┬───────────────┘
                          │
            ┌─────────────▼──────────────┐
            │   Centralized Plan Config   │
            │   - Free: ₹0/mo            │
            │   - Business: ₹399/mo      │
            │   - Pro: ₹999/mo           │
            │   - Legacy Aliases         │
            │   - A/B Variant Engine     │
            └────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Canonical 3-Tier Definition | Define Free (₹0), Business (₹399/mo), Pro (₹999/mo) with limits in `config/plans.ts` & shared types | M1 | ORIGINAL_REQUEST §R2, §R4 |
| 2 | Legacy Plan Normalization | Helper mapping `basic`, `standard`, `growth`, `beta`, `starter` to canonical tiers | M1 | ORIGINAL_REQUEST §R4 |
| 3 | A/B Pricing Experiment Engine | Support URL override, Statsig, and deterministic hash variant allocation (e.g. ₹299 vs ₹399 vs ₹499) | M1 | ORIGINAL_REQUEST §R4 |
| 4 | Backend Limit Enforcement | Enforce product limits (Free: 25, Business: 500, Pro: Infinity) and AI credits in `backend/src/routes/products.ts` | M2 | ORIGINAL_REQUEST §R3, §R4 |
| 5 | Worker Edge Limit Enforcement | Enforce product limits and tier capabilities in `worker/index.js` | M2 | ORIGINAL_REQUEST §R3, §R4 |
| 6 | Payment & Subscription APIs | Update `backend/src/routes/payment.ts` for Business/Pro plans, dev simulation & upgrade/downgrade | M2 | ORIGINAL_REQUEST §R2, §R3 |
| 7 | Backend Analytics Ingestion | Add `POST /api/analytics/events` in `backend/src/routes/analytics.ts` to write to `analytics_events` | M2 | ORIGINAL_REQUEST §R5 |
| 8 | Conversion Pricing Page | 3 transparent cards, Business as "Most Popular", 4–7 merchant outcome bullets, no technical jargon | M3 | ORIGINAL_REQUEST §R2 |
| 9 | Contextual Upgrade UI | Non-intrusive upgrade prompts/modals on reaching catalog/AI limits without blocking existing store ops | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Store Settings Subscription UX | Merchant subscription tab showing active plan badge, usage meter, renewal info, cancel/downgrade | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Dynamic Plan Badges & Sidebar | Update `Layout.tsx` and `PlanBadge.tsx` to reflect active `user.plan` dynamically | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Landing Page Outcome Copy | Refine hero & sections around WHO (Indian retailers), PROBLEM (order chaos), SOLUTION (store + AI) | M4 | ORIGINAL_REQUEST §R1, §R6 |
| 13 | $100 Startup Value Optimization | Clear CTAs ("Start Free" & "See Pricing"), zero commissions, low overhead messaging | M4 | ORIGINAL_REQUEST §R6 |
| 14 | Lifecycle Analytics Client | Implement typed `analytics.ts` dispatcher for Acquisition, Activation, Monetization, Retention | M5 | ORIGINAL_REQUEST §R5 |
| 15 | Lifecycle Event Instrumentation | Dispatch 12 lifecycle events across registration, onboarding, catalog, pricing, checkout, upgrade | M5 | ORIGINAL_REQUEST §R5 |
| 16 | E2E Opaque-Box Test Suite | Comprehensive 4-Tier test suite testing limits, pricing, subscription, analytics, and store ops | E2E Track / M6 | Acceptance Criteria |
| 17 | Adversarial Hardening & Audit | Tier 5 white-box coverage hardening + zero-tolerance forensic integrity audit | M6 | Quality Standards |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven opaque-box test suite (Tiers 1-4) & `TEST_READY.md` | none | IN_PROGRESS |
| M1 | Centralized Plans & Config | `config/plans.ts`, `@ferasetu/shared-types`, A/B variant logic | none | PLANNED |
| M2 | Backend & Worker Enforcement | Express API limits, payment routes, Worker limits, analytics ingestion endpoint | M1 | PLANNED |
| M3 | Frontend Pricing & Subscription UX | Pricing page, store settings subscription tab, dynamic badges, contextual upgrade modals | M1 | PLANNED |
| M4 | Landing Page Copy & Positioning | Value-based Indian merchant outcomes, hero copy, $100 Startup framing | none | PLANNED |
| M5 | Lifecycle Analytics Instrumentation | 12 SaaS lifecycle events instrumented across frontend flows | M1, M2 | PLANNED |
| M6 | Final Verification & Audit | 100% E2E test pass (Tiers 1-4), Tier 5 adversarial hardening, forensic audit | E2E, M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### `config/plans.ts` ↔ Frontend & Backend
- Canonical Plan IDs: `'free' | 'business' | 'pro'`
- Monthly Prices: `free: 0`, `business: 399`, `pro: 999`
- Annual Prices: `free: 0`, `business: 3990`, `pro: 9990`
- Product Limits: `free: 25`, `business: 500`, `pro: Infinity`
- AI Credit Limits: `free: 20`, `business: 200`, `pro: 1000`
- Normalization Helper: `normalizePlanId(plan: string): PlanId` (maps `basic`, `standard`, `growth`, `beta`, `starter` appropriately)
- Limit Checking Helper: `getPlanLimits(plan: string): PlanLimits`

### Backend & Worker ↔ Client Limits API
- `POST /api/products` (Express & Worker):
  - If `count >= limit`: HTTP 403 `{ success: false, error: "PRODUCT_LIMIT_REACHED", limit: number, current: number, plan: string, upgradeRequired: boolean }`
- `POST /api/payment/initialize`:
  - Body: `{ plan: 'business' | 'pro', billingCycle?: 'monthly' | 'yearly', variant?: string, price?: number }`
  - Response: `{ success: true, orderId: string, amount: number, keyId: string, status: "created" }`
- `POST /api/analytics/events`:
  - Body: `{ event_type: string, event_data: Record<string, any>, user_id?: string }`
  - Response: `{ success: true, logged: boolean }`

### Analytics Telemetry Contract
- `trackEvent(event: LifecycleEventName, properties: Record<string, any>)`
- Events:
  - Acquisition: `signup_started`, `signup_completed`
  - Activation: `store_created`, `first_product_added`, `first_order_received`, `first_ai_action`
  - Monetization: `pricing_viewed`, `upgrade_clicked`, `checkout_started`, `subscription_created`
  - Retention/Churn: `subscription_renewed`, `subscription_cancelled`

## Code Layout
- `config/plans.ts` & `frontend/src/config/plans.ts` — Centralized plans & limits configuration
- `packages/shared-types/src/index.ts` — Shared TypeScript type definitions
- `backend/src/routes/payment.ts` — Subscription & payment processing
- `backend/src/routes/products.ts` — Express product limit checking
- `backend/src/routes/analytics.ts` — Analytics ingestion & query endpoints
- `backend/src/middleware/auth.ts` — Plan entitlement middleware
- `worker/index.js` — Cloudflare Edge API and D1 catalog limit checking
- `frontend/src/pages/PricingPage.tsx` — 3-tier conversion pricing page
- `frontend/src/pages/UpgradePage.tsx` — Upgrade modal & checkout flow
- `frontend/src/pages/LandingPage.tsx` — Outcome-focused landing page
- `frontend/src/pages/SettingsPage.tsx` / `SubscriptionSettings.tsx` — Store settings subscription management
- `frontend/src/components/Layout.tsx` — Dynamic sidebar with active plan badge
- `frontend/src/components/ui/PlanBadge.tsx` — Plan status badge component
- `frontend/src/components/ui/UpgradePrompt.tsx` — Contextual upgrade prompt
- `frontend/src/utils/analytics.ts` — Centralized SaaS lifecycle telemetry dispatcher

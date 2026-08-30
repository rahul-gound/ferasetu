# Dispatch: Milestone 3 (M3) Worker — Frontend Pricing Page, Store Settings, Plan Badges & Contextual Upgrade Modals

## Context & Objectives
You are the dedicated Worker for Milestone 3 (Frontend Pricing, Store Settings Subscription Tab, Plan Badges & Contextual Upgrades).
Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m3_gen2
Project root: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Original request: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md
Master architecture: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Scope of Ownership (Exclusive Write Ownership)
- `frontend/src/pages/PricingPage.tsx`
- `frontend/src/pages/UpgradePage.tsx`
- `frontend/src/pages/SettingsPage.tsx` / `frontend/src/pages/SubscriptionSettings.tsx`
- `frontend/src/components/pricing/PricingCard.tsx`
- `frontend/src/components/pricing/FeatureComparison.tsx`
- `frontend/src/components/pricing/ValueCalculator.tsx`
- `frontend/src/components/pricing/PricingFAQ.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/ui/PlanBadge.tsx`
- `frontend/src/components/ui/UpgradePrompt.tsx`
- `frontend/src/pages/AnalyticsPage.tsx`
- `frontend/src/pages/ProductsPage.tsx`
- `frontend/src/services/api.ts`

## Key Deliverables & Requirements
1. **Conversion Pricing Page (`frontend/src/pages/PricingPage.tsx`)**:
   - Exactly 3 transparent cards: Free (₹0), Business (₹399/mo - visually highlighted as "Most Popular" / "Recommended"), Pro (₹999/mo).
   - Monthly / Annual toggle ("Save 2 months").
   - 4-7 customer-outcome bullets per plan, zero technical jargon.
   - Clean integration of `ValueCalculator.tsx` and `PricingFAQ.tsx` (all prices aligned to ₹399 Business / ₹999 Pro / ₹0 Free).
2. **Store Settings Subscription Management Tab**:
   - Add/enhance Subscription management tab in Settings (accessible via `/settings` or `/settings/subscription`):
     - Displays merchant's active plan badge (`PlanBadge.tsx`), renewal/expiry date, and status ("Active").
     - Usage meters: Product count vs plan limit (e.g. 18 / 25 on Free), AI credits used vs monthly quota (e.g. 12 / 20).
     - Action buttons: "Upgrade / Change Plan" (navigates to `/upgrade`).
     - Downgrade / Cancel flow: Straightforward modal explaining that store remains live, data is preserved, and current plan access continues until the end of the billing cycle.
3. **Dynamic Sidebar & Plan Badges (`Layout.tsx`, `PlanBadge.tsx`)**:
   - Update sidebar upgrade box: display actual active `user.plan` with dynamic badge.
   - If user is on Free: show clear "Upgrade to Business (₹399/mo)" CTA linking to `/upgrade`.
   - If user is on Business: show "Business Plan" active badge with "Manage Plan" link to `/settings`.
   - If user is on Pro: show "Pro Plan" active badge with "Manage Plan" link.
4. **Contextual Upgrade Triggers (`ProductsPage.tsx`, `AnalyticsPage.tsx`, `UpgradePrompt.tsx`)**:
   - `ProductsPage.tsx`: Show non-intrusive warning banner when near limit (e.g. >= 20 products on Free), and modal guard preventing adding the 26th product with 1-click CTA to explore Business tier. Existing products must remain active and editable without blocking store operations.
   - `AnalyticsPage.tsx`: Use `canUseFeature(user?.plan, 'advancedAnalytics')`. Free users see core revenue/order metrics, while AI predictive forecast displays preview card with upgrade CTA.
5. **In-App Upgrade Page (`UpgradePage.tsx`) & Mock API (`api.ts`)**:
   - `UpgradePage.tsx` displays canonical Free / Business (₹399) / Pro (₹999) cards and triggers `/api/payment/initialize`.
   - `services/api.ts` mock payment updates `user.plan` to `business` or `pro`.
6. **Verification**:
   - Run `npm run build` in `frontend/` and confirm 0 TypeScript/build errors.
   - Write `handoff.md` in your working directory and notify parent.

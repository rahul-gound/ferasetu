# Dispatch for worker_m1 (Milestone 1)

Target: Implement Centralized Plan Configuration & Shared Plans Infrastructure
Work directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m1
ORIGINAL_REQUEST: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md
PROJECT_DOC: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md
SPEC_REPORT: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\survey_spec_miner_3\survey_spec_report.md

Files Owned:
- `config/plans.ts` (root config)
- `frontend/src/config/plans.ts`
- `packages/shared-types/src/index.ts`
- `packages/shared-types/package.json`

Requirements:
1. Define canonical 3 tiers in `config/plans.ts` and `frontend/src/config/plans.ts`:
   - `free`: ₹0/mo, ₹0/yr. Limits: 25 products, 20 AI credits/mo, 50MB storage.
   - `business` (Most Popular): ₹399/mo, ₹3990/yr. Limits: 500 products, 200 AI credits/mo, 1GB storage, custom branding, analytics.
   - `pro` (Anchor): ₹999/mo, ₹9990/yr. Limits: Infinity products, 1000 AI credits/mo, 5GB storage, priority support, advanced AI forecasting.
2. Synchronize `packages/shared-types/src/index.ts` with `UserPlan = 'free' | 'business' | 'pro'` and update `PLAN_ENTITLEMENTS`.
3. Provide `LEGACY_PLAN_MAP` and `normalizePlanId(plan)` to smoothly map legacy aliases:
   - `basic`, `standard`, `growth` -> `business`
   - `pro`, `premium`, `scale` -> `pro`
   - `trial`, `beta`, `starter` -> `free`
4. Provide helper functions `getPlanLimits(plan)`, `canUseFeature(plan, featureKey)`, `isWithinLimit(plan, limitKey, currentCount)`.
5. Implement A/B pricing experiment engine in `config/plans.ts` supporting:
   - URL override `?price_variant=A|B|C` or `?pricing_experiment=`
   - Statsig experiment allocation fallback
   - Deterministic device/user hash allocation fallback (e.g. ₹299 vs ₹399 vs ₹499 for Business; ₹799 vs ₹999 vs ₹1499 for Pro)
   - Export helper `getEffectivePlanPrice(planId, billingCycle, variant)` and `getAvailableVariants()`.
6. Run build/typecheck to verify 0 errors.
7. Deliver a structured handoff.md upon completion.

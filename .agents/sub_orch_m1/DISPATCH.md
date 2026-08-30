# Dispatch for sub_orch_m1 (Milestone 1: Centralized Configuration & Plans)

Role: Sub-Orchestrator for Milestone 1
Scope: Centralized Plan Definitions & Experimentation Infrastructure
Working Directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\sub_orch_m1
Parent Conversation ID: fdef6b7f-6c3e-4938-960a-2e71cd82d617
Master Project Doc: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md
Original Request: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md

Mission:
1. Implement canonical 3-tier configuration in `config/plans.ts` and `frontend/src/config/plans.ts`:
   - Free (₹0/mo, ₹0/yr): 25 products, 20 AI credits, 50MB storage.
   - Business (₹399/mo, ₹3990/yr - Most Popular): 500 products, 200 AI credits, 1GB storage, custom branding, analytics.
   - Pro (₹999/mo, ₹9990/yr - Anchor): Unlimited products (Infinity), 1000 AI credits, 5GB storage, advanced AI forecasting.
2. Synchronize `@ferasetu/shared-types` in `packages/shared-types/src/index.ts` with canonical `UserPlan = 'free' | 'business' | 'pro'`.
3. Provide robust legacy plan mapping helper (`normalizePlanId`) and limit helpers (`getPlanLimits`, `canUseFeature`).
4. Build A/B pricing experiment engine supporting URL overrides (`?price_variant=`), Statsig integration, and deterministic hash variant allocation (e.g. ₹299 vs ₹399 vs ₹499 for Business; ₹799 vs ₹999 vs ₹1499 for Pro).
5. Run Explorer -> Worker -> Reviewer -> Challenger -> Auditor iteration loop.
6. Verify unit tests and builds pass with 0 errors.
7. Deliver completed milestone handoff to parent.

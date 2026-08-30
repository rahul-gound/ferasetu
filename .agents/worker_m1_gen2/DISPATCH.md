# Dispatch: Milestone 1 (M1) Worker — Centralized Plans & Config

## Context & Objectives
You are the dedicated Worker for Milestone 1 (Centralized Plans & Shared Types).
Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m1_gen2
Project root: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Original request: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md
Master architecture: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Scope of Ownership (Exclusive Write Ownership)
- `config/plans.ts` (Root shared plans configuration)
- `frontend/src/config/plans.ts` (Frontend plans configuration)
- `packages/shared-types/src/index.ts` (Shared types package)

## Key Deliverables & Requirements
1. **Canonical 3-Tier Plan Definitions**:
   - `free`: ₹0/mo, ₹0/yr. Limits: 25 products, 20 AI credits/mo, 50MB storage, 1 staff account. Tagline: "Start your online store with zero risk." Outcome: "Put your shop online, share your catalog, and receive direct WhatsApp and online orders."
   - `business`: ₹399/mo, ₹3,990/yr (₹332/mo effective). Highlighted as Most Popular. Limits: 500 products, 200 AI credits/mo, 1GB storage, custom domain, advanced analytics, 2 staff accounts, remove branding, priority support. Tagline: "Run and grow your retail business efficiently." Outcome: "Expand your catalog, track profits, automate stock alerts, and use your AI assistant daily."
   - `pro`: ₹999/mo, ₹9,990/yr (₹832/mo effective). Limits: Unlimited products (`Infinity`), 1000 AI credits/mo, 5GB storage, custom domain, advanced analytics, 5 staff accounts, remove branding, priority support. Tagline: "Complete power and scale for serious merchants." Outcome: "Unlimited catalog capacity, advanced predictive AI forecasting, multiple staff, and top priority support."
2. **Helpers & Utilities**:
   - `normalizePlanId(plan: string): PlanId` (maps `beta`, `trial`, `free` -> `free`; `basic`, `standard`, `growth`, `starter`, `business` -> `business`; `pro`, `premium`, `scale`, `enterprise` -> `pro`).
   - `getPlanLimits(plan: string): PlanLimits`
   - `getPlanPricing(plan: string, billing: 'monthly' | 'yearly', variant?: string): PlanPrice`
   - `canUseFeature(plan: string, feature: keyof PlanLimits): boolean`
   - `getBusinessPlanPrice(variant?: string): PlanPrice` (A/B testing support for `variant_299`, `variant_499`, `control_399`).
3. **Shared Types (`packages/shared-types/src/index.ts`)**:
   - Update `UserPlan = 'free' | 'business' | 'pro' | 'beta'`
   - Modernize `PLAN_ENTITLEMENTS` with Free (25), Business (500), Pro (Infinity)
4. **Verification**:
   - Run type checks / builds to verify 0 TypeScript errors.
   - Write `handoff.md` with file changes and verification proof.
   - Notify parent orchestrator via `send_message`.

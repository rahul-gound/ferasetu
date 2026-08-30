# Master Execution Plan: FeraSetu SaaS & Value-Based Positioning

## Objective
Satisfy all requirements in `ORIGINAL_REQUEST.md` (R1-R6) for FeraSetu:
- 3-tier SaaS pricing (Free ₹0, Business ₹399/mo, Pro ₹999/mo)
- Centralized config in `config/plans.ts`
- Worker API & Express backend gating & subscription lifecycle
- Conversion-optimized pricing page & merchant store settings
- Contextual upgrade triggers without blocking existing workflows
- Value-based landing page copy tailored for Indian shopkeepers
- Full lifecycle analytics event tracking (Acquisition, Activation, Monetization, Retention)
- Dual-track opaque-box E2E testing and adversarial hardening

## Plan Steps
1. **Phase 0: Architectural Survey & Requirements Extraction**
   - Survey 1: Backend, worker, DB schemas, subscription routes, and plan limit gating.
   - Survey 2: Frontend components, pricing page, settings, upgrade modals, landing page copy.
   - Survey 3: Analytics tracking, configuration sharing patterns, experimentation infrastructure.
   - Deliverable: Merged findings into root `PROJECT.md` with Feature Inventory and Architecture.

2. **Phase 1: Dual Track Launch**
   - Track A (E2E Testing Track): Spawn `teamwork_preview_spec_miner` / `e2e_orch` to design E2E test infra and generate Tier 1-4 tests (`TEST_INFRA.md` -> `TEST_READY.md`).
   - Track B (Implementation Track):
     - Milestone 1: Centralized Configuration & Shared Plans Infrastructure (`config/plans.ts`, types, A/B experiments).
     - Milestone 2: Worker & Backend Gating, Rate Limits, and Subscription Management.
     - Milestone 3: Frontend Pricing Page, Store Settings, Plan Badges & Upgrade Modals.
     - Milestone 4: Landing Page Copy, Positioning & $100 Startup Value Proposition.
     - Milestone 5: Analytics Event Tracking across all lifecycle stages.

3. **Phase 2: Integration & Final E2E Milestone**
   - Phase 2A: Verify 100% E2E test suite pass across Tiers 1-4.
   - Phase 2B: White-box adversarial testing and gap coverage (Tier 5) with Challengers & Reviewers.
   - Phase 2C: Full Forensic Integrity Audit.

4. **Phase 3: Synthesis & Final Reporting**
   - Consolidate all reports, verify build/tests pass with 0 errors, write handoff.md, report back to caller.

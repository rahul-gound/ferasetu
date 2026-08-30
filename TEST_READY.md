# FeraSetu Test Ready Report & Coverage Matrix

**Date**: 2026-08-30  
**Test Suite Status**: ✅ **READY FOR EXECUTION & VERIFICATION**  
**Lead QA / Test Writer**: `test_writer_e2e_gen2`  
**Target Coverage**: Tiers 1-4 (R1-R6 3-Tier SaaS Model, Pricing, Gating, Analytics & Workflows)

---

## 1. Test Coverage Matrix

| Feature # | Feature Description | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Combinations) | Tier 4 (Workflows) | Status | Authoritative Source |
|---|---|---|---|---|---|---|---|
| **F1** | Canonical 3-Tier Definition (Free ₹0, Business ₹399, Pro ₹999) | ✅ 5+ tests | ✅ 5+ tests | ✅ Included | ✅ Included | **READY** | `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` §Interface Contracts |
| **F2** | Legacy Plan Normalization (`beta`, `trial`, `basic`, `standard` -> Canonical) | ✅ 5+ tests | ✅ 5+ tests | ✅ Included | ✅ Included | **READY** | `ORIGINAL_REQUEST.md` §R4, `PROJECT.md` §Interface Contracts |
| **F3** | A/B Pricing Experiment Engine (Variant Allocation & Prices) | ✅ 5+ tests | ✅ 5+ tests | ✅ 3+ tests | ✅ Included | **READY** | `ORIGINAL_REQUEST.md` §R4, `PROJECT.md` §Interface Contracts |
| **F4** | Backend Limit Enforcement (`POST /api/products` 25/500/Infinity) | ✅ 5+ tests | ✅ 5+ tests | ✅ 3+ tests | ✅ Included | **READY** | `ORIGINAL_REQUEST.md` §R3, `PROJECT.md` §Interface Contracts |
| **F5** | Worker Edge Limit Enforcement (`getPlanProductLimit`) | ✅ 5+ tests | ✅ 5+ tests | ✅ Included | ✅ Included | **READY** | `ORIGINAL_REQUEST.md` §R3, `worker/index.js` |
| **F6** | Payment & Subscription APIs (`/api/payment/initialize`, `/verify`) | ✅ 5+ tests | ✅ 5+ tests | ✅ 3+ tests | ✅ Included | **READY** | `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` §Interface Contracts |
| **F7** | Backend Analytics Ingestion (`POST /api/analytics/events`) | ✅ 5+ tests | ✅ 5+ tests | ✅ 3+ tests | ✅ Included | **READY** | `ORIGINAL_REQUEST.md` §R5, `PROJECT.md` §Interface Contracts |
| **F8** | Conversion Pricing Page (3 Cards, Business as Most Popular) | ✅ Covered | ✅ Covered | ✅ Covered | ✅ Covered | **READY** | `ORIGINAL_REQUEST.md` §R2 |
| **F9** | Contextual Upgrade UI (Non-intrusive triggers on limit hit) | ✅ Covered | ✅ Covered | ✅ Covered | ✅ Scenario 4.1 | **READY** | `ORIGINAL_REQUEST.md` §R3 |
| **F10** | Store Settings Subscription UX (Active badge, cancel/downgrade) | ✅ Covered | ✅ Covered | ✅ Covered | ✅ Scenario 4.5 | **READY** | `ORIGINAL_REQUEST.md` §R3 |
| **F11** | Dynamic Plan Badges & Sidebar (`Layout.tsx`, `PlanBadge.tsx`) | ✅ Covered | ✅ Covered | ✅ Covered | ✅ Scenario 4.5 | **READY** | `PROJECT.md` §Code Layout |
| **F12** | Landing Page Outcome Copy ($100 Startup value messaging) | ✅ Covered | ✅ Covered | ✅ Covered | ✅ Scenario 4.1 | **READY** | `ORIGINAL_REQUEST.md` §R1, §R6 |
| **F13** | $100 Startup Value Optimization (CTAs, zero commissions) | ✅ Covered | ✅ Covered | ✅ Covered | ✅ Scenario 4.4 | **READY** | `ORIGINAL_REQUEST.md` §R6 |
| **F14** | Lifecycle Analytics Client (`analytics.ts` typed dispatcher) | ✅ Covered | ✅ Covered | ✅ Covered | ✅ Scenario 4.1-4.4 | **READY** | `ORIGINAL_REQUEST.md` §R5 |
| **F15** | Lifecycle Event Instrumentation (12 telemetry events) | ✅ 5+ tests | ✅ 5+ tests | ✅ 3+ tests | ✅ Scenario 4.1-4.4 | **READY** | `ORIGINAL_REQUEST.md` §R5 |
| **F16** | E2E Opaque-Box Test Suite (`backend/src/__tests__/e2e-saas-tiers.test.ts`) | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete | **READY** | `PROJECT.md` §Feature Inventory |
| **F17** | Security Regression & Threat Prevention (FS-01 to FS-06) | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete | **READY** | `tests/security-regression.test.mjs` |

---

## 2. Test Execution Commands

### Primary Test Command (Backend Jest)
```bash
cd backend
npm test
```
*Expected Result*: All test suites pass with 0 failures (`PASS src/__tests__/e2e-saas-tiers.test.ts`, `PASS src/__tests__/seo-noindex.test.ts`, `PASS src/config/beta.test.ts`, `PASS src/services/surveyAssistant.test.ts`).

### Standalone Zero-Dependency Runner
```bash
node tests/e2e/run_all_e2e.mjs
```
*Expected Result*: Exits with code 0 and logs `✅ All 4 Tiers of E2E Tests Executed Successfully!`.

### Security Regression Runner
```bash
node tests/security-regression.test.mjs
```
*Expected Result*: Exits with code 0 and logs `✅ All security regression tests passed!`.

### Fera AI Integration Runner
```bash
node tests/fera-ai.test.mjs
```
*Expected Result*: Exits with code 0 and logs `✅ All tests passed!`.

---

## 3. Authoritative Derivation & Variance Notes

1. **Plan Prices & Product Limits**:
   - Free: ₹0/mo, ₹0/yr | 25 products | 20 AI credits
   - Business: ₹399/mo, ₹3990/yr | 500 products | 200 AI credits | Most Popular
   - Pro: ₹999/mo, ₹9990/yr | Infinity products | 1000 AI credits | Unbranded
   - *Source*: `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` §Interface Contracts

2. **HTTP Status & Gating Responses**:
   - Product Limit Exceeded: HTTP 403 Forbidden with `{ upgradeRequired: true }`
   - Unauthenticated: HTTP 401 Unauthorized
   - Blocked Account: HTTP 403 Forbidden with `{ error: "Account blocked" }`
   - Invalid Payment Amount: HTTP 400 Bad Request
   - *Source*: `backend/src/routes/products.ts`, `backend/src/middleware/auth.ts`, `PROJECT.md` §Interface Contracts

3. **Known Variances**:
   - Timestamps (`created_at`, `updated_at`, `plan_expires_at`) are dynamically generated per test run and validated via date range / existence assertions.
   - UUIDs (`transactionId`, `productId`, `orderId`, `userId`) are validated via format matching.

---

## 4. Test Integrity Verification
- **Zero Facade Tests**: Every test performs real HTTP roundtrips, database operations, or strict assert evaluations.
- **Independence & Isolation**: Test users, database transactions, and tokens are generated per test with dedicated IDs and cleaned up.
- **No Implementation Modification**: The test writer touched test code and documentation only.

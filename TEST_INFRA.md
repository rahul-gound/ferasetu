# FeraSetu Test Infrastructure & E2E Testing Framework

## Overview
FeraSetu incorporates a comprehensive, multi-tiered testing infrastructure designed to enforce strict SaaS subscription limits, conversion pricing integrity, lifecycle telemetry, and seamless retail operations for Indian small merchants.

```
┌──────────────────────────────────────────────────────────────────┐
│                   FeraSetu Test Infrastructure                   │
├──────────────────────────────────────────────────────────────────┤
│  Tier 1: Canonical Feature Coverage                              │
│  - Free (₹0), Business (₹399/mo), Pro (₹999/mo) Limits & Specs   │
│  - Legacy Plan Normalization & Alias Mapping                     │
│  - Express & Worker Catalog Enforcement                          │
│  - Payment Initialization & Verification APIs                    │
│  - Lifecycle Analytics Ingestion                                 │
├──────────────────────────────────────────────────────────────────┤
│  Tier 2: Boundary & Corner Cases                                 │
│  - Exact 25th product allowed / 26th blocked on Free             │
│  - Exact 500th product allowed / 501st blocked on Business       │
│  - Pro Unlimited Catalog (Infinity)                              │
│  - Negative / Mismatched Price Rejection                         │
│  - A/B Variant Price Boundary Validation                         │
├──────────────────────────────────────────────────────────────────┤
│  Tier 3: Cross-Feature Combinations                              │
│  - Free -> Business Upgrade Expands Limit Dynamically            │
│  - A/B Pricing Variant Propagation to Payment & Telemetry        │
│  - 7-Stage SaaS Funnel Event Sequencing                          │
│  - Subscription Cancellation & Data Preservation                 │
├──────────────────────────────────────────────────────────────────┤
│  Tier 4: Real-World Retail Workflows                             │
│  - Ramesh Kirana (Grocery Onboarding & Upgrade)                  │
│  - Priya Fashion (Luxury Boutique Scaling to Pro)                │
│  - Sharma Electronics (Order Processing & Sales Analytics)       │
│  - Gujarat Handicrafts (Annual Subscription & 2 Mo Free Savings) │
│  - Store Settings Subscription Management & Downgrade            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Test Suites Inventory

| Suite | File Path | Runner | Purpose |
|---|---|---|---|
| **E2E SaaS 3-Tier Suite** | `backend/src/__tests__/e2e-saas-tiers.test.ts` | Jest / ts-jest | Full Tiers 1-4 opaque-box integration tests for SaaS model |
| **Standalone E2E Runner** | `tests/e2e/run_all_e2e.mjs` | Native Node.js | Fast, zero-dependency CI/CD test runner for Tiers 1-4 |
| **SEO & Crawler Headers** | `backend/src/__tests__/seo-noindex.test.ts` | Jest | Verifies `X-Robots-Tag: noindex, nofollow` across all routes |
| **Beta Pricing Config** | `backend/src/config/beta.test.ts` | Jest | Verifies beta mode price overrides & base restorations |
| **Survey Assistant Fallback** | `backend/src/services/surveyAssistant.test.ts` | Jest | Verifies conversational survey summary & fallback AI logic |
| **Security Regressions** | `tests/security-regression.test.mjs` | Native Node.js | Verifies FS-01 to FS-06 fixes (IDOR, total manipulation, OTP) |
| **Fera AI Orchestrator** | `tests/fera-ai.test.mjs` | Native Node.js | Verifies AI credit deduction, intent classifier & prompt security |

---

## How to Execute Tests

### 1. Run Complete Backend Jest Test Suites
```bash
cd backend
npm test
```

### 2. Run Dedicated E2E SaaS 3-Tier Jest Test Suite
```bash
cd backend
npx jest src/__tests__/e2e-saas-tiers.test.ts --runInBand --detectOpenHandles
```

### 3. Run Standalone Node E2E Runner
```bash
node tests/e2e/run_all_e2e.mjs
```

### 4. Run Security Regression Test Suite
```bash
node tests/security-regression.test.mjs
```

### 5. Run Fera AI Integration Test Suite
```bash
node tests/fera-ai.test.mjs
```

---

## Database Isolation & Environment Setup

- **Database Engine**: In automated test runs, SQLite WAL mode is utilized (`node:sqlite` DatabaseSync or isolated file).
- **JWT Authentication**: Tests dynamically sign and verify standard JWT tokens with mock or test secrets (`JWT_SECRET`).
- **Network Isolation**: Tests use loopback servers (`127.0.0.1:0`) with ephemeral port allocation to prevent port collision in concurrent CI/CD runs.
- **Data Cleanup**: Each test suite tears down its HTTP listener and cleans up ephemeral database records upon completion.

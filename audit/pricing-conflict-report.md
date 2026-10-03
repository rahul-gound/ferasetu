# FeraSetu Pricing Security Audit & Configuration Conflict Report

**Audit Date**: September 26, 2026  
**Auditor**: Investigation Worker (FeraSetu Security & Architecture)  
**Scope**: Entire repository (`worker/`, `backend/`, `frontend/`, `docs/`)  
**Core Objective**: Identify all conflicting plan dictionaries, expose the ₹1 pricing tampering vulnerability, test regional currency resolution, and specify canonical server-authoritative pricing rules.

---

## 1. Executive Summary

A comprehensive repository search for pricing constants (`₹1`, `amount: 1`, `399`, `999`, `3990`, `9990`, `INR`, `USD`, `EUR`, `Cashfree`, `Stripe`, `Razorpay`, plan IDs, and billing intervals) revealed **critical security vulnerabilities and conflicting tier dictionaries**:

1. **The ₹1 Pricing Exploit**:
   - In production Cloudflare Worker code ([`worker/index.js#L3934-L3938`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L3934-L3938)), all Indian plans are hardcoded to `{ monthly: 1, yearly: 1 }`.
   - In [`worker/index.js#L4726-L4728`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4726-L4728), a client-side whitelist explicitly accepts `body.amount` values of `1`:
     ```javascript
     else if (market === 'IN' && [1, 399, 999, 3990, 9990].includes(Number(body.amount))) {
       effectiveAmount = Number(body.amount);
     }
     ```
   - In frontend configs ([`frontend/src/config/plans.ts#L67-L88`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/config/plans.ts#L67-L88) and [`frontend/src/config/pricing.ts#L44-L51`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/config/pricing.ts#L44-L51)), prices are also configured as `1`.
   - **Result**: Any user can upgrade to the **Pro Plan** (advertised at ₹999/mo or ₹9,990/yr) for **₹1**.

2. **Divergent Plan Definitions Across 5 Files**:
   - `worker/index.js`: Business = ₹1, Pro = ₹1, Starter = ₹1, Growth = ₹1, Scale = ₹1.
   - `worker/routes/geo.js`: Business = ₹399/mo (₹3,990/yr), Pro = ₹999/mo (₹9,990/yr).
   - `backend/src/config/pricing.ts`: Business = ₹399/mo (₹3,990/yr), Pro = ₹999/mo (₹9,990/yr).
   - `backend/src/routes/payment.ts`: Starter = ₹299, Basic = ₹299, Business = ₹399, Standard = ₹699, Pro = ₹999.
   - `frontend/src/config/plans.ts`: Comments specify ₹399/₹999, but code implements ₹1.

3. **Regional Resolution Flaw for UK / Great Britain**:
   - `EU_COUNTRY_CODES` does not include `"GB"`.
   - `resolvePricingRegion("GB")` resolves to `"OTHER"`.
   - In `worker/index.js#L4615`, any region not in `['IN', 'US', 'EU']` falls back to `'IN'`.
   - **Result**: UK merchants are treated as Indian merchants, charged in INR, and routed to Cashfree with ₹1 plans.

---

## 2. Conflicting Plan Definitions Matrix

| File Path & Line Numbers | Context / Object | Plans Defined | Currency | Monthly Amounts | Annual Amounts | Intended Role |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| [`worker/index.js#L3927-L3940`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L3927-L3940) | `MARKET_PRICING.IN.plans` | free, starter, business, growth, pro, scale | **INR** | free: 0, starter: **1**, business: **1**, growth: **1**, pro: **1**, scale: **1** | free: 0, starter: **1**, business: **1**, growth: **1**, pro: **1**, scale: **1** | **Active Worker Billing (Corrupted)** |
| [`worker/routes/geo.js#L14-L45`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/routes/geo.js#L14-L45) | `REGIONAL_CONFIGS.IN.plans` | free, business, pro | **INR** | free: 0, business: **399**, pro: **999** | free: 0, business: **3990**, pro: **9990** | Worker Geo API (Canonical) |
| [`frontend/src/config/pricing.ts#L34-L52`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/config/pricing.ts#L34-L52) | `MARKET_CONFIGS.IN.plans` | free, starter, growth, business, pro, scale | **INR** | free: 0, starter: **1**, growth: **1**, business: **1**, pro: **1**, scale: **1** | free: 0, starter: **1**, growth: **1**, business: **1**, pro: **1**, scale: **1** | Frontend Market Config (Corrupted) |
| [`frontend/src/config/plans.ts#L67-L88`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/config/plans.ts#L67-L88) | `PLAN_PRICES` | free, starter, business, pro | **INR** | free: 0, starter: **1**, business: **1**, pro: **1** | free: 0, starter: **1**, business: **1**, pro: **1** | Frontend Plan Prices (Corrupted) |
| [`frontend/src/config/plans.ts#L94-L110`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/config/plans.ts#L94-L110) | `BUSINESS_PRICE_VARIANTS` | variant_299, control_399, variant_499 | **INR** | v299: **1**, c399: **1**, v499: **1** | v299: **1**, c399: **1**, v499: **1** | Frontend A/B Engine (Corrupted) |
| [`backend/src/config/pricing.ts#L42-L73`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/config/pricing.ts#L42-L73) | `REGIONAL_CONFIGS.IN.plans` | free, business, pro | **INR** | free: 0, business: **399**, pro: **999** | free: 0, business: **3990**, pro: **9990** | Backend Regional Config (Canonical) |
| [`backend/src/routes/payment.ts#L22-L33`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/payment.ts#L22-L33) | `PLAN_CONFIG` | free, beta, trial, starter, business, growth, basic, standard, pro, premium | **INR** | starter: **299**, business: **399**, basic: **299**, standard: **699**, pro: **999** | (Calculated via 10x multiplier) | Express Route Config (Legacy Clutter) |
| [`frontend/src/pages/PricingPage.tsx#L90`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/pages/PricingPage.tsx#L90) | Public Marketing Copy | free, business, pro | **INR** | free: 0, business: **399**, pro: **999** | business: **3990**, pro: **9990** | UI Display & SEO Description |

---

## 3. Deep-Dive: The ₹1 Vulnerability

### 3.1 Root Cause Analysis
During development and gateway sandbox integration, test transactions were simplified to ₹1. However:
1. The test values were hardcoded into core dictionary constants in `worker/index.js`, `frontend/src/config/pricing.ts`, and `frontend/src/config/plans.ts`.
2. A permissive whitelist was introduced in `worker/index.js` to accept amounts directly from `req.body`.

### 3.2 Client Tampering Flow (How a Client Gets Pro for ₹1)
1. Merchant on frontend chooses "Pro" Plan (annual: ₹9,990).
2. Malicious user or interceptor sends an HTTP POST to `/api/payment/initialize`:
   ```json
   {
     "plan": "pro",
     "billingCycle": "yearly",
     "amount": 1
   }
   ```
3. Worker executes [`worker/index.js#L4716-L4731`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4716-L4731):
   - `expectedAmount = MARKET_PRICING.IN.plans.pro.yearly;` -> Evaluates to `1`!
   - Even if `expectedAmount` were `9990`, the subsequent check executes:
     ```javascript
     else if (market === 'IN' && [1, 399, 999, 3990, 9990].includes(Number(body.amount))) {
       effectiveAmount = Number(body.amount);
     }
     ```
   - Since `body.amount` is `1`, it is in `[1, 399, 999, 3990, 9990]`, so `effectiveAmount` is set to `1`.
4. Worker creates Cashfree order for `order_amount: 1`:
   - Calls Cashfree PG `POST https://api.cashfree.com/pg/orders` with `order_amount: 1`.
   - Records transaction in D1 with `amount: 1`.
5. Merchant pays ₹1 via UPI or Card on Cashfree.
6. Cashfree returns `order_status: "PAID"`, `order_amount: 1`.
7. Worker verifies payment in `handlePaymentVerify`:
   - Checks `cfData.order_amount == tx.amount` (1 == 1 -> PASS).
8. Plan transitions to `pro` for 365 days.

**Impact**: Immediate revenue loss; merchants can purchase annual enterprise-grade Pro subscriptions for ₹1.

---

## 4. Regional Price Resolution Audit: India, US, UK, and EU

### 4.1 Resolution Matrix by Country & Region

| Country / Region | Detected Region | Currency | Resolved Gateway | Monthly Starter | Monthly Business / Growth | Monthly Pro | Yearly Multiplier | Status / Defect |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **India (`IN`)** | `IN` | **INR (₹)** | **Cashfree** | N/A (Free tier) | ₹399 (Corrupted to ₹1 in Worker) | ₹999 (Corrupted to ₹1 in Worker) | 10x (2 months free) | **Critical Bug**: Resolves to ₹1 in Worker/Frontend |
| **United States (`US`)** | `US` | **USD ($)** | **Stripe** | $19 | $39 | $79 | 10x | **Broken**: Stripe session is fake string; Worker routes to Razorpay |
| **European Union (`EU`)** | `EU` | **EUR (€)** | **Stripe** | €19 | €39 | €79 | 10x | **Broken**: Stripe unbuilt; Worker routes to Razorpay |
| **United Kingdom (`GB`)** | `OTHER` -> `IN` | **INR (₹)** | **Cashfree** | N/A | ₹1 | ₹1 | N/A | **Critical Bug**: UK not in `EU_COUNTRY_CODES`; worker converts to India/INR |

### 4.2 The UK / Great Britain Misrouting Bug
In [`worker/routes/geo.js#L8-L11`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/routes/geo.js#L8-L11) and [`backend/src/config/pricing.ts#L11-L14`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/config/pricing.ts#L11-L14):
```javascript
export const EU_COUNTRY_CODES = [
  "FR", "DE", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI",
  "GR", "LU", "CY", "MT", "SK", "SI", "EE", "LV", "LT"
];
```
1. `"GB"` (United Kingdom) is omitted.
2. In `resolvePricingRegion("GB")`, it falls through to `"OTHER"`.
3. In `worker/index.js#L4615`:
   ```javascript
   const market = ['IN', 'US', 'EU'].includes(userMarket) ? userMarket : 'IN';
   ```
   Since `"OTHER"` is not in `['IN', 'US', 'EU']`, it converts `market = 'IN'`.
4. As a result, British merchants visiting from London see Indian Rupee plans and are charged via Cashfree in INR instead of GBP/USD.

---

## 5. Security Requirements for Canonical Pricing

To permanently eliminate pricing vulnerabilities, the platform must enforce the following rules:

1. **Rule 1: Server-Authoritative Price Calculation**:
   - The server must **never** read or trust `req.body.amount`.
   - The billing amount must be computed purely from `(targetPlan, billingCycle, market)`.
   - If `req.body.amount` is provided by the client, the server must either:
     a) Ignore it and use server-computed price, OR
     b) Reject the request with HTTP 400 if `req.body.amount !== expectedAmount`.

2. **Rule 2: Single Source of Truth**:
   - Delete all duplicated plan dictionaries.
   - For Cloudflare Worker, `worker/routes/geo.js` or a dedicated `worker/config/pricing.js` must be the sole canonical pricing import for both `handleGeoRoute` and `handlePaymentInitialize`.

3. **Rule 3: Canonical India SaaS Pricing**:
   - **Free Plan**: ₹0 / month (0 / year).
   - **Business Plan**: ₹399 / month (₹3,990 / year).
   - **Pro Plan**: ₹999 / month (₹9,990 / year).
   - All legacy tier names (`starter`, `basic`, `growth`, `standard`, `premium`, `scale`) must be normalized:
     - `starter`, `basic`, `growth`, `standard` -> `business`
     - `premium`, `scale`, `enterprise` -> `pro`

---

## 6. Exact File & Line Remediation Directives

### 6.1 `worker/index.js`
- **Lines 3927-3940**: Replace `MARKET_PRICING.IN.plans` with:
  ```javascript
  plans: {
    free: { monthly: 0, yearly: 0 },
    business: { monthly: 399, yearly: 3990 },
    pro: { monthly: 999, yearly: 9990 },
  }
  ```
- **Lines 4723-4731**: Delete the `body.amount` whitelist:
  ```javascript
  // REMOVE:
  else if (market === 'IN' && [1, 399, 999, 3990, 9990].includes(Number(body.amount))) {
    effectiveAmount = Number(body.amount);
  }
  // REPLACE WITH:
  const expectedAmount = tierPricing[billingCycle];
  if (body.amount !== undefined && Math.abs(Number(body.amount) - expectedAmount) > 0.01) {
    throw new HttpError(`Invalid amount for plan ${targetPlan}. Expected ${expectedAmount}, received ${body.amount}`, 400);
  }
  const effectiveAmount = expectedAmount;
  ```

### 6.2 `frontend/src/config/pricing.ts`
- **Lines 44-51**: Correct `MARKET_CONFIGS.IN.plans`:
  ```typescript
  plans: {
    free: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
    business: { monthly: 399, yearly: 3990, yearlyPerMonth: 332.5 },
    pro: { monthly: 999, yearly: 9990, yearlyPerMonth: 832.5 },
  }
  ```

### 6.3 `frontend/src/config/plans.ts`
- **Lines 67-88**: Correct `PLAN_PRICES`:
  ```typescript
  export const PLAN_PRICES: Record<PlanId, PlanPrice> = {
    free: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
    starter: { monthly: 299, yearly: 2990, yearlyPerMonth: 249 },
    business: { monthly: 399, yearly: 3990, yearlyPerMonth: 332 },
    pro: { monthly: 999, yearly: 9990, yearlyPerMonth: 832 },
  };
  ```

### 6.4 `backend/src/routes/payment.ts`
- **Lines 22-33**: Align `PLAN_CONFIG` so `starter` and `business` have consistent, non-overlapping pricing with the rest of the application.

---

## 7. Verification Test Commands to Run

To verify that the pricing fixes work and price tampering is prevented:

```bash
# 1. Run Cashfree payment verification and security regression tests
node tests/cashfree-payment-verification.test.mjs

# 2. Run Worker geo and pricing resilience tests
node tests/worker-geo-and-resilience.test.mjs

# 3. Run production hardening P0 test suite
node tests/production-hardening-p0.test.mjs

# 4. Run frontend Cashfree SDK integration test
cd frontend && npm test tests/cashfree.test.ts
```

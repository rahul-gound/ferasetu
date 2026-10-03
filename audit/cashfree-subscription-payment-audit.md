# FeraSetu Payment Architecture Audit: Cashfree Subscription Billing & Storefront Commerce

**Audit Date**: September 26, 2026  
**Target Platform**: FeraSetu (Cloudflare Worker API + Node.js Express Backend + React Vite Frontend)  
**Primary Focus**: Cashfree Merchant Subscription Billing (Flow A) & Storefront Customer Payments (Flow B)  
**Security Baseline**: Single server-authoritative pricing, RBI Payment Aggregator compliance, strict idempotency, fail-closed gateway integration.

---

## 1. Executive Summary & Architecture Overview

FeraSetu is an e-commerce platform designed for small independent retailers and kirana stores in India, with international tier support (US, EU, International). A fundamental architectural correction was issued: **FeraSetu subscription/plan payments are intended to use Cashfree, NOT Stripe.**

This forensic audit re-examines the entire payment surface and strictly delineates two isolated payment domains:

- **FLOW A (FeraSetu Subscription Billing)**: A merchant pays FeraSetu a SaaS subscription fee for a Starter, Business, or Pro plan.
- **FLOW B (Storefront Customer Payments)**: A consumer/shopper purchases grocery or retail items from an individual merchant's storefront.

### High-Level Findings

1. **FLOW A (Cashfree Subscriptions) is functional for one-time order payments, but NOT recurring subscriptions**:
   - FeraSetu integrates **Cashfree Payment Gateway Orders API (`/pg/orders`)**, NOT **Cashfree Subscriptions API (`/sub/v1/`)**.
   - Merchants pay for 30 days (monthly) or 365 days (yearly) via standard one-time Cashfree PG sessions. There are **no e-mandates, no UPI Autopay registrations, and no automated recurring renewal debits**.
   - Gateway credentials, session tokens, return URL handling, webhook signature verification (HMAC-SHA256 via Web Crypto API), and plan activation state transitions are fully implemented and cryptographically sound.

2. **Severe Pricing Vulnerability (The ₹1 Exploit)**:
   - In production worker code ([`worker/index.js`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L3934-L3938)), all Indian plans (`starter`, `business`, `growth`, `pro`, `scale`) are hardcoded to `{ monthly: 1, yearly: 1 }`.
   - In [`worker/index.js#L4726-L4728`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4726-L4728), the server explicitly whitelist-accepts `amount: 1` sent from the client:
     ```javascript
     else if (market === 'IN' && [1, 399, 999, 3990, 9990].includes(Number(body.amount))) {
       effectiveAmount = Number(body.amount);
     }
     ```
   - This allows any merchant to acquire the Pro Plan (canonical ₹999/month or ₹9,990/year) for **₹1**.

3. **FLOW B (Storefront Customer Payments) is Completely Unbuilt for Online Processing**:
   - Shoppers **cannot pay merchants online**.
   - Frontends ([`CartDrawer.tsx`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/storefront/components/CartDrawer.tsx#L498-L503) and [`ProductGridSection.tsx`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/components/shop/sections/ProductGridSection.tsx#L199)) only present **Cash on Delivery / UPI on Delivery** (`paymentMethod: 'offline'`).
   - If a client forcefully submits `paymentMethod: 'online'` to the API ([`backend/src/routes/orders.ts#L201-L220`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/orders.ts#L201-L220) and [`worker/index.js#L6896-L6908`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L6896-L6908)), both backends instantly mark the order `payment_status = 'paid'` and `status = 'confirmed'` **without contacting any gateway, without processing any charge, and without collecting any funds**.
   - FeraSetu lacks merchant onboarding, merchant payment credentials, automated settlement, platform commissions, customer online card processing, and gateway split routing.

4. **Stripe Status**:
   - Stripe is **completely unused, unbuilt legacy stub code**.
   - No Stripe npm SDK is installed in either backend.
   - The Express backend generates fake sessions (`cs_sess_${transactionId}`), and the Worker routes non-INR payments to Razorpay instead of Stripe.
   - Stripe can and should be safely retired in favor of Cashfree/Razorpay.

---

## 2. Gateway Separation: Flow A vs Flow B

| Dimension | Flow A: FeraSetu Subscription Billing | Flow B: Storefront Customer Checkout |
| :--- | :--- | :--- |
| **Payer** | Merchant / Shopkeeper | Storefront Customer / Shopper |
| **Payee** | FeraSetu Inc. / Platform | Individual Merchant / Shop Owner |
| **Gateway Required** | Cashfree PG / Subscriptions | Cashfree Split / Marketplace OR Direct UPI |
| **Current Gateway** | Cashfree PG Orders API (`/pg/orders`) | None (Manual COD / Offline UPI only) |
| **Funds Destination** | FeraSetu Corporate Bank Account | Merchant Personal/Business Bank Account |
| **RBI Escrow Risk** | None (Direct SaaS software sale) | **EXTREME CRITICAL RISK** if platform escrows shopper funds without RBI PA/PG license |
| **Settlement Model** | T+1/T+2 directly to FeraSetu | Direct merchant settlement or automated gateway split required |
| **Online Gateway Code**| Present and functional | **Missing (Spoofed 200 OK marked as paid)** |

---

## 3. Forensic Inspection: Flow A (Cashfree SaaS Subscriptions)

### 3.1 All Cashfree SDK Imports
- **Backend (`backend/package.json`)**: No Cashfree SDK dependency installed (`cashfree-pg` is absent). API requests are made using native `axios.post` / `axios.get` in [`backend/src/routes/payment.ts#L67-L112`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/payment.ts#L67-L112).
- **Worker (`worker/package.json`)**: No SDK installed. REST API requests use native Cloudflare `fetch()` in [`worker/index.js#L4758-L4822`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4758-L4822).
- **Frontend (`frontend/package.json`)**: No npm SDK (`@cashfreepayments/cashfree-js` is absent). Instead, the official v3 script is dynamically injected via DOM:
  - File: [`frontend/src/pages/UpgradePage.tsx#L30-L40`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/pages/UpgradePage.tsx#L30-L40)
  - CDN Source: `https://sdk.cashfree.com/js/v3/cashfree.js`
  - Utility Validation: [`frontend/src/utils/cashfree.ts#L1-L68`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/utils/cashfree.ts#L1-L68) (`validateCashfreePaymentResponse`, `getCashfreeMode`, `CashfreeConfigurationError`).

### 3.2 Cashfree Order-Creation Code
- **Worker**:
  - File: [`worker/index.js#L4758-L4782`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4758-L4782)
  - Endpoint: `POST ${cfBaseUrl}/orders`
  - Headers: `x-client-id`, `x-client-secret`, `x-api-version: 2023-08-01`, `Content-Type: application/json`
  - Body:
    ```javascript
    {
      order_id: transactionId,
      order_amount: effectiveAmount,
      order_currency: marketConfig.currency, // 'INR'
      customer_details: {
        customer_id: me.$id.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50),
        customer_email: user?.email || 'merchant@ferasetu.com',
        customer_phone: user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '9999999999',
      },
      order_meta: {
        return_url: `${requestOrigin}/upgrade?order_id=${transactionId}`,
        notify_url: `${requestOrigin}/api/payment/webhook`,
      },
      order_note: `FeraSetu ${targetPlan} plan (${billingCycle})`,
    }
    ```
- **Express Backend**:
  - File: [`backend/src/routes/payment.ts#L58-L93`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/payment.ts#L58-L93) (`createCashfreeOrder`).
- **Status**: Real, fully functional API call to Cashfree Payment Gateway v2023-08-01.

### 3.3 Payment-Session & Token-Generation Code
- Cashfree PG Orders API returns a JSON object containing `payment_session_id`.
- Worker validates session existence:
  - File: [`worker/index.js#L4816-L4822`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4816-L4822)
  - Fails closed: Throws `HttpError("Cashfree order created without valid payment session", 502)` if `payment_session_id` is missing or blank.
- Frontend validates session and environment before loading checkout:
  - File: [`frontend/src/utils/cashfree.ts#L48-L67`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/utils/cashfree.ts#L48-L67)
  - Throws `CashfreeConfigurationError` if `paymentSessionId` or `cashfreeEnv` are invalid.
- Frontend invokes Cashfree checkout:
  - File: [`frontend/src/pages/UpgradePage.tsx#L138-L142`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/pages/UpgradePage.tsx#L138-L142)
  - `const cashfree = window.Cashfree({ mode }); cashfree.checkout({ paymentSessionId, redirectTarget: '_self' });`
- **Status**: Real and secure.

### 3.4 Cashfree Return URL Handling
- **Order Initialization Setup**:
  - In [`worker/index.js#L4777`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4777), `order_meta.return_url` is dynamically constructed from `requestOrigin`:
    `${requestOrigin}/upgrade?order_id=${transactionId}`
- **Frontend Return Interceptor**:
  - File: [`frontend/src/pages/UpgradePage.tsx#L68-L104`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/pages/UpgradePage.tsx#L68-L104)
  - `useEffect` inspects URL query params on page load for `?order_id=`.
  - When detected, invokes `api.post('/payment/verify', { cashfree_order_id: orderId, order_id: orderId, transaction_id: orderId })`.
  - Upon successful verification, calls `refreshSubscription()`, `updateUser({ plan: verifyRes.data.plan })`, wipes query params via `window.history.replaceState`, and navigates to `/dashboard`.
- **Status**: Real, tested, and working.

### 3.5 Cashfree Webhook Handling
- **Worker**:
  - File: [`worker/index.js#L5252-L5363`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L5252-L5363) (`handlePaymentWebhook`)
  - Route: [`worker/index.js#L9159-L9161`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L9159-L9161) (`POST /api/payment/webhook`)
  - Parses raw body, inspects `x-webhook-signature` and `x-webhook-timestamp`.
  - Replay protection: Rejects requests with clock skew > 15 minutes.
  - Extracts `order_id` and `payment_status` ('SUCCESS' or 'PAID').
  - Validates amount against transaction record.
  - Dispatches `handleSuccessfulCashfreePayment(paymentContext)`.
- **Express Backend**:
  - File: [`backend/src/routes/payment.ts#L344-L512`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/payment.ts#L344-L512) (`POST /webhook`)
  - Supports both payment webhook events and Cashfree refund webhooks (`REFUND_STATUS_WEBHOOK`).
- **Status**: Real.

### 3.6 Cashfree Signature Verification
- **Worker Implementation**:
  - File: [`worker/index.js#L5273-L5309`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L5273-L5309)
  - Algorithm: HMAC-SHA256 implemented using standard Cloudflare Workers Web Crypto API (`crypto.subtle.importKey` and `crypto.subtle.sign`).
  - Signed String: `${timestamp}${rawBody}` signed with `CASHFREE_SECRET_KEY`.
  - Comparison: Timing-safe byte-by-byte XOR comparison against decoded base64 signature.
- **Express Backend Implementation**:
  - File: [`backend/src/routes/payment.ts#L145-L167`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/payment.ts#L145-L167) (`verifyCashfreeWebhookSignature`)
  - Node.js `crypto.createHmac('sha256', secretKey).update(`${timestamp}${rawBody}`).digest('base64')` compared via `crypto.timingSafeEqual`.
- **Order Verification (Return URL Path)**:
  - Because browser redirects cannot provide an untampered webhook signature, the server verifies the payment directly with Cashfree:
  - Worker: [`worker/index.js#L5024-L5047`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L5024-L5047) performs `GET ${cfBaseUrl}/orders/${orderIdentifier}`.
  - Asserts `cfData.order_status === 'PAID'`, `cfData.order_amount === tx.amount`, and `cfData.order_currency === tx.currency`.
- **Status**: Real and secure.

### 3.7 Cashfree Subscription or Recurring-Payment Implementation
- **CRITICAL FINDING: INCOMPLETE ARCHITECTURE**:
  - Cashfree offers two distinct products:
    1. **Cashfree Payment Gateway (PG)**: One-time payments (`api.cashfree.com/pg/orders`).
    2. **Cashfree Subscriptions**: Recurring billing, e-Mandates, UPI Autopay, card recurring tokens (`api.cashfree.com/sub/v1/`).
  - FeraSetu is currently using **Cashfree Payment Gateway (PG)** for subscriptions.
  - The merchant pays for a single billing period (30 days or 365 days).
  - There is **no recurring mandate setup**, **no UPI Autopay consent**, and **no automated debit scheduled**.
  - When `current_period_end` arrives, the plan will simply expire unless the merchant returns to the app and performs another manual payment.
- **Status**: Incomplete / Pseudo-Subscription.

### 3.8 Cashfree Plan IDs and Amount Mapping
- FeraSetu does **not** register plan IDs with Cashfree Subscriptions.
- In order creation, `order_amount` is calculated in code.
- **Current Amount Corruption**:
  - In `worker/index.js`: Plans map to ₹1.
  - In `backend/src/config/pricing.ts`: Business is ₹399, Pro is ₹999.
  - In `backend/src/routes/payment.ts`: Starter is ₹299, Standard is ₹699, Pro is ₹999.
- **Status**: Incomplete and conflicting.

### 3.9 Monthly and Annual Billing Logic
- **Multiplier**: Annual billing provides 2 months free (10x monthly rate for 12 months access).
- **Period Calculation**:
  - Worker: [`worker/index.js#L4487-L4488`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4487-L4488)
    `const planDays = tx.billing_cycle === 'yearly' ? 365 : 30;`
    `const periodEnd = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();`
- **Status**: Functional period math, but corrupted by ₹1 price resolution.

### 3.10 Trial Logic
- **India**: `permanentFreePlan: true`, `trialDays: 0`. Indian merchants enjoy permanent free tier access (up to 10 products).
- **US / EU**: `permanentFreePlan: false`, `trialDays: 14`.
  - 14-day free trial on Starter, Business, and Pro.
  - Immutability enforced in [`worker/index.js#L4160-L4174`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4160-L4174): `trial_used` is set to `1` upon trial start and can never be reset to `0`. Re-attempting a trial returns HTTP 403 `TRIAL_ALREADY_CONSUMED`.
- **Status**: Real and verified by test suite.

### 3.11 Upgrade and Downgrade Logic
- **Upgrade**: Immediate. When Cashfree payment is confirmed, `transitionSubscription` transitions plan with `event: 'PAYMENT_CONFIRMED'`. AI credits are topped up immediately and limits updated.
- **Downgrade**: End-of-period. When cancelled, access continues until `current_period_end`.
- **Status**: Real.

### 3.12 Cancellation and Renewal Logic
- Endpoint: `POST /api/payment/cancel-subscription` ([`worker/index.js#L5709-L5722`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L5709-L5722))
  - Sets `cancel_at_period_end = 1`.
- Endpoint: `POST /api/payment/resume-subscription` ([`worker/index.js#L5724-L5736`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L5724-L5736))
  - Sets `cancel_at_period_end = 0`.
- Automated recurring renewal: **Missing** (due to one-time PG order model).
- **Status**: Cancellation state machine is real; auto-debit renewal is missing.

### 3.13 Payment-Failure Handling
- If Cashfree order status is `FAILED` or `USER_DROPPED`, [`worker/index.js#L5038-L5040`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L5038-L5040) rejects verification with HTTP 400.
- State machine records `event: 'PAYMENT_FAILED'` and triggers notification email (`billing.payment_failed`).
- **Status**: Real.

### 3.14 Refund Handling
- Subscription refunds for FeraSetu plans:
  - Express backend has webhook reconciliation in [`backend/src/routes/payment.ts#L373-L390`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/payment.ts#L373-L390).
  - Worker lacks subscription refund webhook handling.
- **Status**: Incomplete in Worker.

### 3.15 Environment Variables
- `CASHFREE_APP_ID` (or `CASHFREE_CLIENT_ID`): Required.
- `CASHFREE_SECRET_KEY` (or `CASHFREE_CLIENT_SECRET`): Required.
- `CASHFREE_ENV`: `'production'` (uses `https://api.cashfree.com/pg`) or `'sandbox'` (uses `https://sandbox.cashfree.com/pg`).
- Fail-Closed Behavior: In [`worker/index.js#L4588-L4597`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4588-L4597), dummy credentials (`your_app_id`) cause `isValid = false` and reject checkout with HTTP 503.
- **Status**: Real.

### 3.16 Database Subscription-Status Updates
- Authoritative table: `subscriptions` (Cloudflare D1, migration `0009_authoritative_subscriptions.sql`).
- Synchronously mirrors state to `users` and `organizations` tables via [`healCompatibilityMirrors()`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L3971-L4017).
- Transaction ledger: `transactions` table tracks `provider: 'cashfree'`, `provider_order_id`, `amount`, `status: 'completed'`.
- **Status**: Real.

### 3.17 Idempotency Handling
- Duplicate webhooks or duplicate verification requests check existing transaction status and return `{ already_processed: true }`.
- Credit purchases check `credit_transactions.reference_id` to prevent duplicate AI credit grants.
- Migration `0015_payment_hardening_and_test_mode.sql` enforces `CREATE UNIQUE INDEX idx_transactions_provider_order_unique ON transactions (provider_order_id)`.
- **Status**: Real and robust.

---

## 4. End-to-End 8-Step Execution Path Trace

| Step | Action Description | File Path & Lines | Function Name | Status | Test Result |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **1** | Merchant clicks "Upgrade" on UI | [`frontend/src/pages/UpgradePage.tsx#L106-L111`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/pages/UpgradePage.tsx#L106-L111) | `handleSelectPlan` | **Real** | Passed. UI responds and sets loading state. |
| **2** | Frontend sends initialization request | [`frontend/src/pages/UpgradePage.tsx#L112-L117`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/pages/UpgradePage.tsx#L112-L117) | `api.post('/payment/initialize')` | **Vulnerable** | Sends client-calculated `amount`. |
| **3** | Worker creates Cashfree order/session | [`worker/index.js#L4758-L4843`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4758-L4843) | `handlePaymentInitialize` | **Corrupted** | Real API call, but charges ₹1 due to pricing bug. |
| **4** | Merchant completes Cashfree payment | [`frontend/src/pages/UpgradePage.tsx#L138-L142`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/pages/UpgradePage.tsx#L138-L142) | `cashfree.checkout()` | **Real** | Cashfree hosted SDK modal opens successfully. |
| **5** | Cashfree redirects and sends webhook | [`worker/index.js#L4777-L4778`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4777-L4778) | Cashfree Gateway Core | **Real** | Returns to `?order_id=` and POSTs to `/api/payment/webhook`. |
| **6** | Backend/Worker verifies payment | [`worker/index.js#L5024-L5047`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L5024-L5047) | `handlePaymentVerify` | **Real** | Validates `order_status === 'PAID'` directly with Cashfree. |
| **7** | Subscription is activated | [`worker/index.js#L4491-L4508`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4491-L4508) | `transitionSubscription` | **Real** | `subscriptions.status = 'active'`, `plan = targetPlan`. |
| **8** | Plan limits become available | [`worker/index.js#L4512-L4520`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4512-L4520) & [`plans.ts#L420`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/config/plans.ts#L420) | `healCompatibilityMirrors` / `getPlanLimits` | **Real** | AI credits credited, limits unlocked immediately. |

---

## 5. Forensic Inspection: Flow B (Storefront Customer Payments)

### 5.1 Can Shoppers Pay Merchants Online?
**No. Online customer payments do not exist anywhere on FeraSetu.**

#### Concrete Evidence from the Codebase:
1. **Frontend Storefront UI**:
   - In [`frontend/src/storefront/components/CartDrawer.tsx#L498-L503`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/storefront/components/CartDrawer.tsx#L498-L503), the payment method UI is hardcoded:
     ```tsx
     <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 flex items-center justify-between">
       <span>Cash on Delivery / UPI on Delivery</span>
       <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Safe &amp; Verified</span>
     </div>
     ```
   - In [`frontend/src/components/shop/sections/ProductGridSection.tsx#L199`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/components/shop/sections/ProductGridSection.tsx#L199), the checkout form state initializes with `paymentMethod: 'offline'` and provides no alternative.
2. **Backend / Worker Order Processing**:
   - In [`worker/index.js#L6896`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L6896) and [`#L6908`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L6908):
     ```javascript
     status: paymentMethod === 'online' ? 'confirmed' : 'pending',
     payment_status: paymentMethod === 'online' ? 'paid' : 'unpaid',
     ```
   - In [`backend/src/routes/orders.ts#L201-L220`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/orders.ts#L201-L220):
     ```typescript
     const isPaidOnline = paymentMethod === 'online';
     const amountPaidMinor = isPaidOnline ? totalMinor : 0;
     ...
     isPaidOnline ? 'paid' : 'unpaid', paymentMethod
     ```
   - If an HTTP request is made with `{ paymentMethod: "online" }`, the backend does not generate a payment session, does not call Cashfree or any other gateway, and simply marks the order as **PAID** and **CONFIRMED** for free.

### 5.2 Architectural Requirement: Why Cashfree PG Does Not Solve Flow B
If FeraSetu connects its Flow A Cashfree PG account to customer checkout, all shopper payments will settle into **FeraSetu's corporate bank account**. This introduces:
1. **RBI Violation**: Under Reserve Bank of India (RBI) Payment Aggregator / Payment Gateway guidelines, non-licensed entities cannot hold merchant funds in escrow.
2. **Tax & Compliance Exposure**: Platform would be taxed on the gross merchandise value (GMV) of all merchants.
3. **Operational Overhead**: Manual bank payouts to hundreds of retailers.

### 5.3 What Settlement Architecture Does FeraSetu Need?
To support Flow B, FeraSetu must implement one of three compliant models:

1. **Option 1: Cashfree Split / Marketplace (Recommended)**
   - Allows FeraSetu to onboard merchants as Cashfree Vendors via the Cashfree Vendor API.
   - Customers pay via Cashfree Checkout.
   - Cashfree automatically splits the payout: 100% of order value goes directly to the merchant's bank account, while platform fees (0% for FeraSetu) settle to FeraSetu.
   - Payouts and bank account verifications are managed authoritatively by Cashfree.
2. **Option 2: Direct Merchant UPI QR (Zero Escrow, Simplest for India)**
   - Merchant provides their personal/business UPI VPA (e.g. `patelstores@okaxis`) in Store Settings.
   - Storefront checkout generates a dynamic UPI Intent link and QR code (`upi://pay?pa=...&pn=...&am=...&tn=...`).
   - Customer pays directly into merchant's bank account. Customer enters UPI UTR / Transaction ID for merchant verification.
3. **Option 3: Stripe Connect (For US/EU only)**
   - For international merchants, Stripe Connect Custom/Express accounts are required to settle USD/EUR.

### 5.4 Feature Support Matrix for Flow B

| Flow B Feature | Current Status | Technical Evidence & Gap |
| :--- | :---: | :--- |
| **Merchant Onboarding / KYC** | ❌ Not Supported | No database tables or endpoints for PAN, GSTIN, bank account, or IFSC verification. |
| **Merchant Payment Credentials**| ❌ Not Supported | Merchants cannot store their own gateway keys or UPI VPAs in settings. |
| **Direct Merchant Settlement** | ❌ Not Supported | Zero settlement rails exist. |
| **Platform Commission Engine** | ❌ Not Supported | Code has no commission calculation; platform advertises 0% commission. |
| **Automated Refunds** | ❌ Not Supported | Refunds in [`OrdersPage.tsx#L963`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/pages/OrdersPage.tsx#L963) are manual DB status updates: *"Transfer funds separately via your UPI app or bank account"*. |
| **Chargeback Disputes** | ❌ Not Supported | No webhook listener or dispute management system. |
| **Customer Online Card Payment**| ❌ Not Supported | No gateway integration exists on storefront checkout. |
| **UPI Online Intent Payment** | ❌ Not Supported | Only offline "UPI on Delivery" supported. |
| **Cash on Delivery (COD)** | ✅ Fully Supported | Supported with delivery security code & 6-digit payment OTP hash verification. |
| **Multi-currency Checkout** | ❌ Not Supported | Storefront worker order creation hardcodes currency to `'INR'` ([`worker/index.js#L6907`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L6907)). |

---

## 6. Stripe Audit: Active, Legacy, or Unused?

**Verdict: Stripe is 100% UNUSED DEAD / MOCK CODE.**

### Forensic Proof:
1. **Zero SDK Imports**: Neither `package.json` in root, backend, nor worker contains `stripe` or `@stripe/stripe-js`.
2. **Dummy Session Generation**:
   - In [`backend/src/routes/payment.ts#L846-L862`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/payment.ts#L846-L862):
     ```typescript
     const stripeSessionId = `cs_sess_${transactionId}`;
     res.status(201).json({
       success: true,
       requiresPayment: true,
       gateway: 'stripe',
       stripeSessionId,
     });
     ```
     It invents a fake string starting with `cs_sess_` instead of calling `stripe.checkout.sessions.create()`.
3. **Broken Frontend Handoff**:
   - In [`frontend/src/pages/UpgradePage.tsx#L160-L167`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/pages/UpgradePage.tsx#L160-L167), the client expects `res.data.stripeUrl`. Because the backend returns `stripeSessionId` and no URL, the frontend displays an error toast: *"Stripe checkout session URL was not provided."*
4. **Worker Non-Implementation**:
   - In [`worker/index.js#L4872-L4900`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4872-L4900), if currency is not INR, the worker bypasses Stripe entirely and attempts Razorpay order creation.
5. **Recommendation**: Stripe is dead code. Mark it for safe removal without touching Cashfree or Razorpay.

---

## 7. Immediate P0 Action Items & Remediation Plan

1. **P0: Fix the ₹1 Pricing Vulnerability**:
   - In [`worker/index.js#L3927-L3940`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L3927-L3940), replace all `1` values with canonical pricing (`business: { monthly: 399, yearly: 3990 }`, `pro: { monthly: 999, yearly: 9990 }`).
   - In [`worker/index.js#L4726-L4728`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L4726-L4728), delete the whitelist that accepts client-provided amounts. Enforce `effectiveAmount = expectedAmount` server-side unconditionally.
   - In [`frontend/src/config/plans.ts#L67-L88`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/config/plans.ts#L67-L88) and [`frontend/src/config/pricing.ts#L44-L51`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/frontend/src/config/pricing.ts#L44-L51), eliminate ₹1 definitions.
2. **P0: Patch Fake Online Payment in Flow B**:
   - In [`worker/index.js#L6896`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/worker/index.js#L6896) and [`backend/src/routes/orders.ts#L201-L220`](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/backend/src/routes/orders.ts#L201-L220), throw an HTTP 400 error if `paymentMethod === 'online'` until a real gateway split or merchant UPI rail is built.
3. **P0: Fix UK/GB Market Resolution**:
   - Add `"GB"` to `EU_COUNTRY_CODES` or create a dedicated `"UK"` region with GBP currency so UK merchants do not fall back to India/INR.
4. **P1: Implement Cashfree Subscriptions (Recurring Mandates)**:
   - Transition subscription billing from Cashfree PG (`/pg/orders`) to Cashfree Subscriptions (`/sub/v1/plans` and `/sub/v1/subscriptions`) with UPI Autopay / e-Mandate support.

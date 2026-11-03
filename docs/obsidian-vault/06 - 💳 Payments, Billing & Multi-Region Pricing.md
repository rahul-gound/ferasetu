# 💳 Payments, Billing & Multi-Region Pricing

> **Subsystem Completion:** `97%`  
> **Status:** 🟢 Production Ready  
> **Primary Path:** `config/plans.ts`, `worker/index.js`, `frontend/src/config/pricing.ts`, `frontend/src/pages/UpgradePage.tsx`, `frontend/src/pages/AICreditsPage.tsx`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Dual-Track Payment Architecture

FeraSetu strictly separates **platform subscription billing** from **merchant storefront transactions**:

1. **Platform SaaS & AI Credits (Merchant → FeraSetu):**
   - India (`IN`): **Razorpay** (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) for recurring SaaS plan upgrades and AI credit pack top-ups.
   - International (`UK`, `US`, `EU`, `GLOBAL`): **Stripe Checkout** (`STRIPE_SECRET_KEY`) with 14-day free trials.
2. **Storefront Commerce (End Customer → Merchant):**
   - **0% Platform Commission Direct Rails:** Customers pay shopkeepers directly via **Direct UPI QR**, **Cash on Delivery (COD)**, or **Store Pickup**.
   - Merchants can also connect their own external providers (Stripe, custom merchant UPI) directly with 0% middleman deduction.

---

## 2. 3-Tier Canonical SaaS Model

| Tier | India Price | Global Price | Product Limit | AI Credits | Core Entitlements |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Free** | **₹0** | **$0** | 25 products | 20 / mo | Digital storefront, order management, basic analytics |
| **Business** | **₹399/mo** | **$9.99/mo** | 500 products | 200 / mo | WhatsApp alerts, priority support, full sales analytics, CSV export |
| **Pro** | **₹999/mo** | **$24.99/mo** | **Unlimited** | 1,000 / mo | White-label, custom domain + SSL, Visual Studio AST builder |

---

## 3. Platform Billing Gateway Matrix

| Gateway | Scope | Supported Regions | Currency | Integration Files & Environment |
| :--- | :--- | :--- | :--- | :--- |
| **Razorpay** | Platform Subscriptions & AI Credits | India (`IN`) | INR (₹) | `worker/index.js`, `frontend/src/pages/UpgradePage.tsx`, `frontend/src/pages/AICreditsPage.tsx`<br>`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `VITE_RAZORPAY_KEY_ID` |
| **Stripe** | Platform Subscriptions | Global (`US`, `EU`, `UK`, `GLOBAL`) | USD ($), EUR (€), GBP (£) | `worker/index.js`, `frontend/src/pages/UpgradePage.tsx`<br>`STRIPE_SECRET_KEY` |
| **Direct UPI / COD** | Merchant Storefront Orders | India & Global | Local currency | `worker/storefront.js`, `frontend/src/pages/StorefrontPage.tsx`<br>0% Commission Direct Settlement |

---

## 4. AI Credit Top-Up Packs & Micro-Billing
Shopkeepers who exceed their subscription tier quota can purchase credit packs anytime via Razorpay without changing their recurring monthly plan:

| Pack Label | Credits | Price (INR) | Effective Unit Rate | Target Merchant Use-Case |
| :--- | :---: | :---: | :---: | :--- |
| **Small Pack** | 250 credits | ₹149 | ~₹0.59 / credit | Kirana quick boosts & catalog copy generation |
| **Growth Pack** | 1,000 credits | ₹499 | ~₹0.49 / credit | Multi-language AI Storefront concierges |
| **Scale Pack** | 3,000 credits | ₹1,299 | ~₹0.43 / credit | High-volume busy retail shops with active AI chat |

### Endpoints & Data Contracts:
- `POST /api/payment/initialize`: Creates Razorpay order for subscription plans. Returns `{ gateway: 'razorpay', razorpayOrderId, razorpayKeyId, amount, currency }`.
- `POST /api/payment/ai-credits/purchase`: Creates Razorpay order for AI credit packs.
- `POST /api/payment/verify`: Verifies Razorpay Web Crypto HMAC-SHA256 signature (`razorpay_order_id|razorpay_payment_id`) and immediately fulfills entitlement/credits idempotently.
- `GET /api/payment/ai-credits`: Returns live credit balance, daily usage breakdown, and transaction logs.
- `POST /api/payment/ai-credits/limits`: Configures safety caps (`ferasetu_ai_limit`, `website_ai_limit`).

---

## 5. Environment Variables & Secret Configuration

### Cloudflare Worker (`worker/.dev.vars` / Production Secrets)
```env
# Razorpay Credentials (FeraSetu SaaS subscriptions & AI credits)
RAZORPAY_KEY_ID = "rzp_test_..."
RAZORPAY_KEY_SECRET = "..."

# Stripe Secret (International Global Subscriptions)
STRIPE_SECRET_KEY = "sk_live_..."

# Authentication & Admin
WORKOS_CLIENT_ID = "client_..."
ADMIN_USER_IDS = "user_..."
ADMIN_JWT_SECRET = "..."

# Fera AI Gateway
FERA_AI_ENDPOINT = "https://ai.fera-search.tech/v1"
FERA_AI_API_KEY = "..."
FERA_AI_MODEL = "glm-5.3-flash"
```

### Cloudflare Pages (`frontend/.env` / Pages Variables)
```env
# Backend API Endpoint
VITE_API_URL=https://ferasetu.singhantima203.workers.dev/api

# WorkOS AuthKit
VITE_WORKOS_CLIENT_ID=client_01KZRE47KGSPK84HEP9WNBG9YY

# Razorpay Checkout (Public Key)
VITE_RAZORPAY_KEY_ID=rzp_test_TYLj9VFWO6SBml

# Analytics & Verification
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://eu.i.posthog.com
VITE_TURNSTILE_SITE_KEY=...
```

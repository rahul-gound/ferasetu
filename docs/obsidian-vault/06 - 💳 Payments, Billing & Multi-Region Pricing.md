# 💳 Payments, Billing & Multi-Region Pricing

> **Subsystem Completion:** `96%`  
> **Status:** 🟢 Production Ready  
> **Primary Path:** `config/plans.ts`, `backend/src/routes/payment.ts`, `backend/src/config/pricing.ts`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. 3-Tier Canonical SaaS Model

| Tier | India Price | Global Price | Product Limit | AI Credits | Core Entitlements |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Free** | **₹0** | **$0** | 25 products | 20 / mo | Digital storefront, order management, basic analytics |
| **Business** | **₹399/mo** | **$9.99/mo** | 500 products | 200 / mo | WhatsApp alerts, priority support, full sales analytics, CSV export |
| **Pro** | **₹999/mo** | **$24.99/mo** | **Unlimited** | 1,000 / mo | White-label, custom domain + SSL, Visual Studio AST builder |

## 2. Payment Gateway Matrix

| Gateway | Supported Regions | Currency | Integration File |
| :--- | :--- | :--- | :--- |
| **Cashfree** | India (`IN`) | INR (₹) | `backend/src/services/cashfree.ts` |
| **Razorpay** | India (`IN`) | INR (₹) | `backend/src/services/razorpay.ts` |
| **Stripe** | Global (US, EU, SEA, MEA) | USD ($), EUR (€) | `backend/src/services/stripe.ts` |

## 3. Webhook Handling & Idempotency
- Incoming payment webhooks are verified via cryptographic signature matching.
- Duplicate event IDs are dropped via a transactional SQLite/MySQL replay protection table (`payment_events`).

## 4. AI Credit Top-Up Packs & Micro-Billing
Shopkeepers who exceed their subscription tier quota can purchase credit packs anytime without changing their recurring monthly SaaS plan:

| Pack Label | Credits | Price (INR) | Effective Unit Rate | Target Merchant Use-Case |
| :--- | :---: | :---: | :---: | :--- |
| **Small Pack** | 250 credits | ₹149 | ~₹0.59 / credit | Kirana quick boosts & catalog copy generation |
| **Growth Pack** | 1,000 credits | ₹499 | ~₹0.49 / credit | Multi-language AI Storefront concierges |
| **Scale Pack** | 3,000 credits | ₹1,299 | ~₹0.43 / credit | High-volume busy retail shops with active AI chat |

### Endpoints & Data Contracts:
- `GET /api/payment/ai-credits`: Returns current `credits`, active safety `limits` (`ferasetu_ai_limit`, `website_ai_limit`, `ferasetu_ai_enabled`, `website_ai_enabled`), `dailyUsage` series for interactive SVG graph telemetry, `recentLogs`, `usage` grouped by product capability, and `purchases`.
- `POST /api/payment/ai-credits/limits`: Persists merchant-defined monthly credit spend caps and feature pause toggles. Accepts `{ ferasetu_ai_limit, website_ai_limit, ferasetu_ai_enabled, website_ai_enabled }`.
- `POST /api/payment/ai-credits/purchase`: Creates a Cashfree payment session or falls back to an instant simulated sandbox credit top-up when Cashfree keys are test mock stubs or `simulate: true` is provided.

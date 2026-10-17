# 💳 Payments, Billing & Multi-Region Pricing

> **Subsystem Completion:** `95%`  
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

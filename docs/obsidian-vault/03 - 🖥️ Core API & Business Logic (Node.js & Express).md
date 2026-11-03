# 🖥️ Core API & Business Logic (Node.js & Express)

> **Subsystem Completion:** `94%`  
> **Status:** 🟢 Production Ready  
> **Primary Path:** `backend/`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Architectural Scope
The Core API coordinates complex business logic, transactional persistence, authentication, payment verification, automated email dispatch, and admin operations.

## 2. Source Layout & Route Index

| Route File | Base Endpoint | Handled Operations |
| :--- | :--- | :--- |
| `backend/src/routes/auth.ts` | `/api/auth` | Merchant signup, Appwrite session sync, JWT signing |
| `backend/src/routes/orders.ts` | `/api/orders` | Order creation with client IP capture, status transitions, stock depletion, irreversible cancellation lock, invoice voiding & customer notification |
| `backend/src/routes/website.ts` | `/api/website` | Website configuration, SEO visibility settings (`GET/PUT/POST /settings`), Google & Bing indexing toggles, meta tags, and storefront maintenance controls |
| `backend/src/routes/products.ts` | `/api/products` | CRUD products, images, categories, variant pricing |
| `backend/src/routes/payment.ts` | `/api/payment` | Cashfree/Razorpay sessions, idempotency, webhook validation |
| `backend/src/routes/ai.ts` | `/api/ai` | Prompt dispatch to Sarvam AI, catalog copy generation |
| `backend/src/routes/tickets.ts` | `/api/tickets` | Merchant support tickets, resolution lifecycle |
| `backend/src/routes/branding.ts` | `/api/branding` | Store logo, theme colors, favicon, white-label settings |
| `backend/src/routes/analytics.ts` | `/api/analytics` | Store telemetry & footfall radar: different customer count, total visits, most frequent visitor (with IP/device), today's highest value order (with IP), and customer login counts |
| `backend/src/routes/announcements.ts` | `/api/announcements` | FeraSetu new updates, features changelog, official merchant notices, and broadcast messages |
| `backend/src/routes/customers.ts` | `/api/customers` | Merchant customer roster, registered accounts & logins aggregation, order history, lifetime value & direct messaging shortcuts |
| `backend/src/routes/giftCards.ts` | `/api/gift-cards` | Digital gift card products creation (`POST /product`), direct code issuance (`POST /issue`), partial redemption simulator (`POST /simulate`), and store obligation accounting |
| `backend/src/routes/admin.ts` | `/api/admin` | Platform CEO command center, partner lifecycle, system health, and AI credit monitoring & adjustments (`/ai-credits`, `/users/:id/ai-credits`) |

## 3. Middleware Pipeline
1. `backend/src/middleware/auth.ts`: Validates Appwrite JWT and injects `req.user`.
2. `backend/src/middleware/rateLimiter.ts`: Prevents abusive credential stuffing and request bursts.
3. `backend/src/middleware/errorHandler.ts`: Unified error formatter ensuring no raw stack traces leak to client.

## 4. Gift Card Review Update — 2026-11-02

- Gift card codes now use cryptographic randomness with collision retries; local mode validates amounts and scopes issued cards by user.
- The simulator preserves valid zero values and rejects invalid or negative inputs.
- **Still required before launch:** real redemption and refund ledger operations; the current simulator does not redeem or mutate card balances.
- Verification is pending; automated checks have not been run after this update.

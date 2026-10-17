# 🖥️ Core API & Business Logic (Node.js & Express)

> **Subsystem Completion:** `90%`  
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
| `backend/src/routes/orders.ts` | `/api/orders` | Order creation, status transitions, stock depletion |
| `backend/src/routes/products.ts` | `/api/products` | CRUD products, images, categories, variant pricing |
| `backend/src/routes/payment.ts` | `/api/payment` | Cashfree/Razorpay sessions, idempotency, webhook validation |
| `backend/src/routes/ai.ts` | `/api/ai` | Prompt dispatch to Sarvam AI, catalog copy generation |
| `backend/src/routes/tickets.ts` | `/api/tickets` | Merchant support tickets, resolution lifecycle |
| `backend/src/routes/branding.ts` | `/api/branding` | Store logo, theme colors, favicon, white-label settings |
| `backend/src/routes/analytics.ts` | `/api/analytics` | Privacy-preserving aggregated merchant sales metrics |

## 3. Middleware Pipeline
1. `backend/src/middleware/auth.ts`: Validates Appwrite JWT and injects `req.user`.
2. `backend/src/middleware/rateLimiter.ts`: Prevents abusive credential stuffing and request bursts.
3. `backend/src/middleware/errorHandler.ts`: Unified error formatter ensuring no raw stack traces leak to client.

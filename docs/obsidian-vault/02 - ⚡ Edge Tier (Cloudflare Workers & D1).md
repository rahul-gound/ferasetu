# ⚡ Edge Tier (Cloudflare Workers & D1)

> **Subsystem Completion:** `94%`  
> **Status:** 🟢 Production Ready  
> **Primary Path:** `worker/`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Architectural Role
The Edge Tier sits in front of all buyer-facing traffic and selected shopkeeper operations. Running on Cloudflare's global edge network, it delivers sub-50ms TTFB across India and 48 international zones without hitting origin servers.

## 2. Key Modules & Entrypoints

| Module | File Location | Purpose |
| :--- | :--- | :--- |
| **Edge Gateway** | `worker/index.js` | Top-level request routing, domain resolution, security headers |
| **Order Cancellation & After-Sales** | `worker/index.js` | Edge order cancellation, customer cancellation, refund issuing, credit notes |
| **Wrangler Config** | `worker/wrangler.toml` | D1 database bindings, environment vars, worker routes |
| **Catalog Engine** | `worker/catalog/` | High-speed cached product querying & stock checking |
| **Subdomain & DNS** | `worker/routes/domainRoutes.js` | Custom domain verification and routing |
| **AST Builder Runtime** | `worker/templates/` | Low-latency server-rendered dynamic storefront components |
| **Builder Service** | `worker/services/builderService.js` | Draft persistence, versioning, rollback, connection vault & SSRF proxy |
| **Storefront CSP** | `worker/storefront.js` | Strict Content Security Policy headers & verification hashes |
| **Email & SMTP Router** | `worker/routes/emailRoutes.js` | Multi-tenant sender identities, external SMTP sockets, transactional delivery |
| **AI Edge Interceptor** | `worker/ai/` | Edge pre-filtering of AI prompts before calling Sarvam API |

## 3. Order Cancellation & After-Sales Edge Contracts
- **`POST /api/orders/:id/cancel`**:
  - Merchant staff authorization via `requireOrgContext(request, env, 'staff')`.
  - Irreversible status check: Rejects already-cancelled orders with `400 Bad Request`.
  - Sets `status = 'cancelled'`, `cancellation_status = 'cancelled'`, `cancellation_reason`, `cancelled_at`, `cancelled_by = 'merchant'`.
  - Automatically updates invoices in D1: `UPDATE invoices SET status = 'voided' WHERE order_id = ?`.
  - Automatically restores inventory stock for tracked catalog products.
  - Automatically dispatches customer transactional cancellation email (`order.cancelled` template).
- **`POST /api/orders/public/:id/cancel`**:
  - Storefront customer cancellation verified via `customerPhone` or `customerEmail`.
- **Status Locking (`PATCH /api/orders/:id/status`)**:
  - Prevents modifying any order that has `status === 'cancelled'` (`400 Bad Request: Order is cancelled and cannot be changed to another status`).
- **Invoice Lockdown (`GET /api/orders/:id/invoice`)**:
  - Cancelled orders return `400 Bad Request: Invoices are not available for cancelled orders`.
- **Revenue Invariant (`GET /api/analytics/dashboard`)**:
  - Cancelled orders are strictly filtered out (`status !== 'cancelled'`) from `totalRevenue`, `totalOrders`, `totalCustomers`, and trend day charts.

## 4. Merchant Lifecycle & Transactional Email Contracts
- **New User Welcome Email (`account.welcome`)**:
  - Automatically dispatched from `noreply@ferasetu.com` on store creation (`createOrganizationHandler`) and profile creation (`updateProfile`).
  - Warm human copy with zero AI buzzwords, emphasizing 0% platform commission, direct customer list ownership, and WhatsApp store address.
  - Idempotency key: `welcome_${email}` prevents duplicate dispatches.
- **First Order Congratulatory Email (`merchant.first_order`)**:
  - Automatically triggered upon inserting the first order (`COUNT(*) === 1` in `createOrder` and `handlePublicCreateOrder`).
  - Reassures the shopkeeper: 0% platform commission (₹0 deducted), displays customer name and total amount, links to packing workflow.
  - Idempotency key: `first_order_congrats_${organizationId}_${orderId}`.
- **Modal Postfix Gateway Hardening (`ferasetu-smtp/`)**:
  - Fixed `sqlite3.OperationalError: no such column: priority` by splitting table initialization: `PRAGMA table_info` adds `priority`, `scope`, and `tenant_id` columns via `ALTER TABLE` **before** compound indexes are applied.
- **CORS & Resilience (`/api/email/test`)**:
  - Capped interactive retries to 1 with an 8-second subrequest timeout to prevent edge wall-clock timeout.
  - Returns safe structured JSON `{ success: false, error: ... }` with full CORS headers (`Access-Control-Allow-Origin: https://ferasetu.com`) on network or gateway issues.

## 5. Data Flow & Edge Caching
- **D1 SQLite Database:** Distributed read replicas worldwide. Write queries execute against the primary D1 node.
- **Cache API:** Frequently accessed store catalogs are cached at Cloudflare edge PoPs with automatic invalidation on product update events.
- **Security & Rate Limiting:** JWT validation and IP burst throttling occur at the edge layer before requests can reach Express origin servers.

# ⚡ Edge Tier (Cloudflare Workers & D1)

> **Subsystem Completion:** `92%`  
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
| **Wrangler Config** | `worker/wrangler.toml` | D1 database bindings, environment vars, worker routes |
| **Catalog Engine** | `worker/catalog/` | High-speed cached product querying & stock checking |
| **Subdomain & DNS** | `worker/routes/domainRoutes.js` | Custom domain verification and routing |
| **AST Builder Runtime** | `worker/templates/` | Low-latency server-rendered dynamic storefront components |
| **Builder Service** | `worker/services/builderService.js` | Draft persistence, versioning, rollback, connection vault & SSRF proxy |
| **Storefront CSP** | `worker/storefront.js` | Strict Content Security Policy headers & verification hashes |
| **AI Edge Interceptor** | `worker/ai/` | Edge pre-filtering of AI prompts before calling Sarvam API |


## 3. Data Flow & Edge Caching
- **D1 SQLite Database:** Distributed read replicas worldwide. Write queries execute against the primary D1 node.
- **Cache API:** Frequently accessed store catalogs are cached at Cloudflare edge PoPs with automatic invalidation on product update events.
- **Security & Rate Limiting:** JWT validation and IP burst throttling occur at the edge layer before requests can reach Express origin servers.

# 🌐 Subdomains, Custom Domains & DNS

> **Subsystem Completion:** `94%`  
> **Status:** 🟢 Production Ready (No Cloudflare for SaaS Architecture)  
> **Primary Path:** `worker/routes/domainRoutes.js`, `worker/services/spaceshipClient.js`, `worker/services/domainIngressService.js`, `worker/services/spaceshipCheckoutAdapter.js`, `worker/storefront.js`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Architectural Model (Strictly Without Cloudflare for SaaS)

FeraSetu routes storefront traffic without Cloudflare for SaaS, without Cloudflare Custom Hostnames, and without delegating merchant DNS to Cloudflare.

- **Domain Registrar:** Spaceship (via official Public API `POST /api/v1/domains/available`).
- **Merchant DNS:** Hosted on Spaceship DNS. Merchants keep full control of their domain and mail routing.
- **Application Hosting:** Cloudflare Workers + D1 database (`custom_storefront_domains`).
- **Storefront Routing:** Native FeraSetu React 19 SPA served through Worker gateway with merchant context injected.
- **TLS Termination:** Dedicated Ingress Proxy (Caddy with On-Demand TLS or Envoy) fronting the Worker. It terminates Let's Encrypt/ZeroSSL certificates and queries FeraSetu's admission webhook before issuing or renewing certificates.
- **Address Bar:** 100% domain preservation. The customer sees `https://sweetshop.com` throughout their session with zero redirects to `shopname.ferasetu.com`.

---

## 2. Ingress & TLS Architecture

```
[Merchant Browser: https://sweetshop.com]
          │
          ▼ (DNS: CNAME or ALIAS/A -> ingress.ferasetu.com)
[TLS Ingress Proxy (Caddy / Envoy)]
    │
    ├── 1. On-Demand TLS Ask Webhook
    │      GET https://api.ferasetu.com/api/domains/ingress/verify?domain=sweetshop.com
    │      ◄── Returns 200 OK if domain is ACTIVE and VERIFIED in D1
    │
    ├── 2. Issues/Caches Let's Encrypt / ZeroSSL TLS Certificate
    │
    └── 3. Reverse Proxies Request to Cloudflare Worker
           Host: ingress.ferasetu.com
           X-Forwarded-Host: sweetshop.com
           X-FeraSetu-Proxy-Secret: <SECRET>
                 │
                 ▼
[Cloudflare Worker Gateway (worker/storefront.js)]
    │
    ├── Identifies Host as 'sweetshop.com'
    ├── Queries D1: custom_storefront_domains
    ├── Injects Storefront Metadata & In-Memory Cache
    └── Serves React Storefront HTML Shell (0% Commission)
```

---

## 3. Spaceship API Client & Safety Guarantees

### A. Live Availability & Normalization (`worker/services/spaceshipClient.js`)
- **Punycode / IDNA:** Full internationalized domain support (e.g. `दुकान.com` ➔ `xn--11b5c3a2b.com`).
- **Debounced Caching:** In-memory TTL cache (60 seconds) prevents API abuse.
- **Rate-Limit Backoff:** Strict adherence to 429 response handling and `Retry-After`.
- **Zero Hallucinated Pricing:** Returns exact quoted price and currency (`USD`).

### B. Safe DNS Automation
- When applying storefront CNAME and challenge TXT records to Spaceship DNS, `applyStorefrontDnsRecords` **strictly preserves** existing MX, SPF, DKIM, DMARC, and custom mail records.

### C. Direct Customer Checkout Guard (`worker/services/spaceshipCheckoutAdapter.js`)
- Spaceship API endpoint `POST /api/v1/domains/{domain}` is an account-billed registration endpoint (charges the API owner's balance), NOT a customer checkout link.
- Spaceship SellerHub checkout links are only valid for listed marketplace inventory, not arbitrary unregistered domains.
- Therefore, the direct customer checkout feature is guarded by `ENABLE_SPACESHIP_CHECKOUT = false` (default), returning `QUOTED_PENDING_PROVIDER`.
- Merchants are guided with transparent instructions to complete registration at Spaceship at 0% markup and auto-connect to FeraSetu without fake checkout promises.

---

## 4. Database Schema (`0020_custom_storefront_domains.sql`)

### `custom_storefront_domains`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT PK | UUID |
| `organization_id` | TEXT NOT NULL | Multi-tenant isolation |
| `domain` | TEXT UNIQUE | Fully-qualified domain (e.g., `shop.com` or `www.shop.com`) |
| `apex_domain` | TEXT NOT NULL | Apex domain for root record grouping |
| `dns_provider` | TEXT | Default `'spaceship'` |
| `ownership_token` | TEXT | Random challenge token for TXT verification |
| `dns_status` | TEXT | `pending`, `verified`, `failed` |
| `tls_status` | TEXT | `pending`, `issuing`, `active`, `failed` |
| `status` | TEXT | `pending`, `active`, `suspended`, `disconnected` |
| `dns_target` | TEXT | CNAME target (`ingress.ferasetu.com`) |

### `domain_orders`
Stores durable checkout intents, currency, quoted price, period years, and checkout status.

### `domain_audit_logs`
Immutable audit log recording connection, DNS verification, TLS issuance, and disconnection events with operator context.

---

## 5. Security & Tenant Protection
- **No Domain Hijacking:** Domains are validated against existing records; cross-tenant claims are rejected with HTTP 409.
- **Strict Verification State Machine:** Zero fake status badges. Domains only transition to `verified` and `active` upon passing authoritative DoH checks and live TLS handshake probes.
- **Fail-Closed Storefront Resolution:** Unverified or suspended custom domains are refused routing, preventing DNS cache poisoning.

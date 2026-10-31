# 🌐 Subdomains, Custom Domains & DNS

> **Subsystem Completion:** `96%`  
> **Status:** 🟢 Production Ready (Domain Connect & 1-Click DNS Automation)  
> **Primary Path:** `worker/routes/domainRoutes.js`, `worker/services/domainConnectService.js`, `worker/services/spaceshipClient.js`, `worker/services/domainIngressService.js`, `frontend/src/pages/EmailSettingsPage.tsx`  
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

---

## 6. 1-Click DNS Automation & Domain Connect Protocol (`worker/services/domainConnectService.js`)

Merchants are never expected to know what CNAME, A records, or TTL mean. FeraSetu provides a 1-button automated setup:

1. **Automatic Provider Detection (`detectDomainDnsProvider`)**:
   - Queries authoritative DoH for `NS` records on the apex domain and `_domainconnect.<domain>` discovery.
   - Detects GoDaddy (`domaincontrol.com`), Namecheap (`registrar-servers.com`), Cloudflare (`ns.cloudflare.com`), Spaceship (`spaceship.com`), Hostinger (`hostinger.com`), IONOS (`ui-dns.com`), Google / Squarespace (`squarespacedns.com`), Bluehost, Porkbun, BigRock, AWS Route 53, etc.
   - Validates whether the registrar has active DNS delegated (`hasDns: true`).

2. **Official Domain Connect Protocol (domainconnect.org v2)**:
   - For GoDaddy, Namecheap, IONOS, WordPress.com: constructs the official synchronous UX authorization link (`urlSyncUX`) with template variables (`ferasetu_target`, `ferasetu_token`, `redirect_uri`).
   - Serves the official Domain Connect service template manifest:
     `GET /v2/domainTemplates/providers/ferasetu.com/services/storefront`

3. **Background Verification Radar (`EmailSettingsPage.tsx`)**:
   - When the shopkeeper confirms at their registrar dashboard, FeraSetu's background verification radar automatically polls DNS records every 4 seconds.
   - Window focus listeners immediately trigger DoH checks when the user switches back, turning green with zero manual refresh required.
   - Fallback collapsible section available for manual IT entry (Hick's Law).

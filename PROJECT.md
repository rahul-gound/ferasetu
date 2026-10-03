# Project: FeraSetu Domains & Email Architecture, External Integrations & Cloudflare Worker Hardening

## Architecture
FeraSetu is an all-in-one e-commerce platform and AI business suite for Indian merchants and shopkeepers. The production architecture is composed of:
1. **Frontend (React 19 + TypeScript + Vite + Tailwind CSS)**: Merchant admin, unified "Domains & Email" dashboard, template editor with live preview, AI assistant action cards, store settings, and responsive storefronts.
2. **Cloudflare Worker Edge API (`worker/`)**: High-performance serverless edge handling routing, multi-tenant WorkOS authentication, Cashfree billing, domain resolution, email services, and AI orchestration.
3. **Cloudflare D1 (`DB`)**: Edge relational database serving as the single source of truth across 17+ migrations (`email_domains`, `email_identities`, `email_provider_connections`, `email_messages`, `email_events`, `merchant_email_templates`, `transactions`, `subscriptions`, etc.).
4. **FeraSetu Transactional Mail Infrastructure**:
   - Primary: Modal Postfix MTA container (`ferasetu-smtp/`) with 2048-bit RSA DKIM (`fs1` selector), persistent queue, and token-bucket rate limiting.
   - Secondary / Advanced: External SMTP over Cloudflare TCP sockets (`cloudflare:sockets`) with AES-256-GCM encrypted credentials.
   - DNS Verification: Parallel Cloudflare DNS-over-HTTPS (DoH) engine verifying TXT challenge, DKIM, SPF, DMARC, and CNAME records.
5. **Canonical Service Layer (`worker/services/`)**:
   - `cashfreeService.js`: Cashfree PG, Webhook HMAC-SHA256, replay protection, idempotency.
   - `domainProvider.js` & `domainService.js`: Abstract `DomainProvider` interface, search, availability, authoritative pricing, registration, and DNS status.
   - `emailService.js`: Unified dispatch facade, template rendering, quota accounting, retry loop, and delivery logging.
   - `emailCrypto.js`: AES-256-GCM encryption/decryption with strict zero-fallback secret hygiene.
   - `turnstileService.js`: Cloudflare Turnstile bot verification and fail-close defense.
   - `aiGatewayService.js`: Unified Modal GLM (`glm-5.3-flash`) and Sarvam AI (`mayura:v1`, `bulbul:v1`, `saarika:v2`) gateway.
6. **Object Storage**: S3-compatible Backblaze B2 (`ferasetu-media-prod`) via pure Web Crypto AWS SigV4 edge reverse-proxy.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Merchant / Customer Browser                     │
│    (Domains & Email Dashboard, Storefront SPA, Template Live Preview)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (API / Storefront)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Cloudflare Worker Runtime                          │
│                                                                        │
│   ├── classifyHostname & Storefront Custom Domain Edge Dispatcher      │
│   ├── WorkOS AuthKit JWT Verification (jose) & Tenant Org Guard        │
│   │                                                                    │
│   ├── Canonical Service Layer (worker/services/):                      │
│   │   ├── cashfreeService.js   (Orders, HMAC Webhooks, Replay Defense) │
│   │   ├── domainProvider.js    (Search, Price, Register, DNS Status)   │
│   │   ├── emailService.js      (Postfix Gateway, Sockets, Logging)     │
│   │   ├── emailCrypto.js       (AES-256-GCM Strict Key Envelope)       │
│   │   ├── dnsVerification.js   (Cloudflare DoH DKIM/SPF/DMARC)         │
│   │   ├── turnstileService.js  (Bot Protection)                        │
│   │   └── aiGatewayService.js  (Modal GLM + Sarvam AI Engine)          │
│   │                                                                    │
│   └── AI Assistant Email Tools (worker/ai/):                           │
│       ├── get_email_settings, update_email_sender, update_reply_to     │
│       └── list_email_templates, update_email_template, send_test_email │
└──────┬──────────────────────┬──────────────────────┬───────────────────┘
       │ D1 SQL               │ SigV4 HTTPS          │ REST / SMTP
       ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────────────────┐
│ Cloudflare   │       │ Backblaze B2 │       │ External Services:       │
│ D1 Database  │       │ Object Store │       │ - Modal Postfix MTA      │
│ (Multi-Tenant│       │ (Private S3  │       │ - Cashfree PG Webhook    │
│  Relational) │       │  Media/Export│       │ - WorkOS AuthKit API     │
└──────────────┘       └──────────────┘       │ - Cloudflare DoH         │
                                              └──────────────────────────┘
```

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Comprehensive Integration Inventory | Classify all 22 repo integrations into REQUIRED, OPTIONAL, NOT NEEDED, LEGACY/REMOVE | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Legacy Quarantine & Pruning | Quarantine Express backend, prune Statsig & Zoho chat scripts, formalize serverless boundary | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Canonical Cashfree Service | Factor out inline Cashfree logic into `worker/services/cashfreeService.js` with HMAC and replay check | M1 | ORIGINAL_REQUEST §R1, §R3 |
| 4 | Canonical Turnstile Service | Centralize Turnstile validation into `worker/services/turnstileService.js` with fail-close logic | M1 | ORIGINAL_REQUEST §R1, §R5 |
| 5 | Canonical AI Gateway Service | Unify Modal GLM and Sarvam AI in `worker/services/aiGatewayService.js` | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Crypto Zero-Insecure-Fallback Hardening | Remove hardcoded fallback key in `worker/services/emailCrypto.js`, strictly enforcing 256-bit key | M1 | ORIGINAL_REQUEST §R1, §R5 |
| 7 | Two-Tab "Domains & Email" Dashboard | Redesign `EmailSettingsPage.tsx` into "Domains" and "Email" tabs using FeraSetu design tokens | M2 | ORIGINAL_REQUEST §R2 |
| 8 | FeraSetu Mail Default Experience | Hero card for active `orders@{store-slug}.ferasetu.com` with zero manual SMTP setup required | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Sender Aliases Manager | UI and backend for managing official aliases (`orders@`, `support@`, `billing@`, custom) | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Merchant Verified Reply-To Routing | Configure merchant reply-to destination while preserving DKIM/SPF alignment on sender | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Expandable Advanced SMTP Drawer | Relegate raw SMTP configuration to collapsed accordion with AES-256-GCM encrypted persistence | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Abstract `DomainProvider` Interface | Pluggable interface for search, availability, authoritative pricing, registration, and DNS | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Domain Search & Pricing API | Endpoints for searching domain availability and fetching authoritative INR pricing | M3 | ORIGINAL_REQUEST §R3 |
| 14 | In-App Domain Purchase via Cashfree | Server-validated checkout preventing client price tampering | M3 | ORIGINAL_REQUEST §R3 |
| 15 | Guided DNS Verification Flow | 5-record DNS display (TXT challenge, DKIM, SPF, DMARC, CNAME) with 1-click copy & DoH polling | M3 | ORIGINAL_REQUEST §R3 |
| 16 | Storefront Custom Domain Routing | Extend `classifyHostname` to resolve verified custom domains in D1 and render storefront SPA | M3 | ORIGINAL_REQUEST §R3 |
| 17 | D1 Merchant Email Templates Schema | Migration `0017_merchant_email_templates.sql` for custom template overrides and versions | M4 | ORIGINAL_REQUEST §R4 |
| 18 | Commerce Template Catalog & Variable Engine | Registered templates (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, etc.) with strict `{{variable}}` XSS sanitization | M4 | ORIGINAL_REQUEST §R4 |
| 19 | Merchant Template Editor & Live Preview | Real-time preview pane with realistic mock data and visual desktop/mobile switcher | M4 | ORIGINAL_REQUEST §R4 |
| 20 | Test Email Dispatch Action | Dedicated modal and API endpoint to send sample transactional emails to merchant | M4 | ORIGINAL_REQUEST §R4 |
| 21 | AI Email Assistant Tools | 6 structured tools (`get_email_settings`, `update_email_sender`, `update_reply_to`, etc.) with history and undo | M4 | ORIGINAL_REQUEST §R4 |
| 22 | Delivery Activity Audit Log | Immutable audit table rendering recent delivery events without leaking email body PII | M4 | ORIGINAL_REQUEST §R4 |
| 23 | Multi-Tenant Scoping & Resource Guard | Strict `organization_id` checks rejecting cross-tenant mutations, IDOR, or spoofing | M5 | ORIGINAL_REQUEST §R5 |
| 24 | Secret Redaction & Hygiene | Zero secrets present in API responses, logs, or AI prompt contexts | M5 | ORIGINAL_REQUEST §R5 |
| 25 | Header Injection & Spoofing Defense | Strict CRLF blocking in email headers and validation preventing unverified domain sender claims | M5 | ORIGINAL_REQUEST §R5 |
| 26 | Automated E2E Verification Suites | Comprehensive test suites across domains, email delivery, Cashfree HMAC, templates, and security | E2E Track / M6 | Acceptance Criteria |
| 27 | Adversarial Hardening & Final Victory Audit | White-box stress testing, coverage verification, and zero-tolerance forensic integrity audit | M6 | Quality Standards |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Independent requirement-driven test suite & `TEST_READY.md` covering Tiers 1-4 | none | IN_PROGRESS |
| M1 | Canonical Service Layer & Integration Quarantine (R1) | Build `cashfreeService.js`, `turnstileService.js`, `aiGatewayService.js`, harden `emailCrypto.js`, document integration inventory | none | PLANNED |
| M2 | Merchant Domains & Email Dashboard Experience (R2) | Two-tab UI in `EmailSettingsPage.tsx`, FeraSetu Mail default hero, sender aliases, Reply-To routing, advanced SMTP accordion | none | PLANNED |
| M3 | Pluggable Domain Provider & Purchase Architecture (R3) | `DomainProvider` abstraction, domain search & authoritative pricing, Cashfree domain checkout, guided DNS copy, custom storefront routing | M1 | PLANNED |
| M4 | Transactional Email Engine, Templates & AI Assistant (R4) | Migration 0017, template catalog & variable engine, template editor with live preview, AI email tools with undo, delivery audit log | M1, M2 | PLANNED |
| M5 | Security, Tenant Isolation & Production Hardening (R5) | Multi-tenant auth scoping, secret leak prevention, CRLF header injection defense, sender spoofing block | M1, M3, M4 | PLANNED |
| M6 | Final Verification & Victory Audit | 100% E2E test pass (Tiers 1-4), Tier 5 adversarial coverage hardening, Forensic Auditor verification | E2E, M1, M2, M3, M4, M5 | PLANNED |

---

## Interface Contracts

### `DomainProvider` Interface (`worker/services/domainProvider.js`)
- `search(query: string): Promise<Array<{ domain: string, available: boolean, priceInr: number, currency: 'INR', tld: string }>>`
- `checkAvailability(domain: string): Promise<{ domain: string, available: boolean, priceInr: number, currency: 'INR' }>`
- `getAuthoritativePricing(domain: string): Promise<{ domain: string, priceInr: number, taxInr: number, totalInr: number, currency: 'INR' }>`
- `registerDomain(domain: string, contact: DomainContact, paymentRef: string): Promise<{ domain: string, orderId: string, status: 'PENDING' | 'ACTIVE', expiresAt: string }>`
- `checkDnsStatus(domain: string): Promise<{ domain: string, verified: boolean, records: DnsRecordStatus[] }>`

### Domain Purchase API
- `POST /api/domains/search`: Body `{ query: string }` -> Response `{ results: DomainResult[] }`
- `POST /api/domains/purchase/initiate`: Body `{ domain: string, years: number }` -> Validates server price -> Creates Cashfree order -> Response `{ orderId, paymentSessionId, amount }`
- `POST /api/domains/purchase/verify`: Body `{ orderId: string }` -> Verifies Cashfree order status -> Provisions domain in `email_domains`

### Template Engine & API Contract
- `GET /api/email/templates`: Returns list of available templates with variables and override status
- `GET /api/email/templates/:key`: Returns template details (system default + merchant override if present)
- `PUT /api/email/templates/:key`: Body `{ subject: string, contentHtml: string }` -> Saves to `merchant_email_templates`
- `POST /api/email/templates/preview`: Body `{ templateKey: string, subject?: string, contentHtml?: string, sampleData?: object }` -> Returns `{ renderedSubject: string, renderedHtml: string }`
- `POST /api/email/test`: Body `{ to: string, templateKey?: string, sampleData?: object }` -> Dispatches test email

### AI Email Assistant Tools Contract (`worker/ai/`)
1. `get_email_settings`: Read-only. Returns active provider, domains, sender aliases, Reply-To, and delivery quota.
2. `update_email_sender`: Modifies default sender alias or display name.
3. `update_reply_to`: Modifies merchant Reply-To email address with syntax validation.
4. `list_email_templates`: Returns template catalog with descriptions and available variables.
5. `update_email_template`: Modifies subject or HTML body with strict variable validation and snapshot history.
6. `send_test_email`: Sends sample email to merchant's verified address.
- All mutating actions record previous state snapshot in `ai_action_history` for 1-click undo.

### Tenant Isolation & Security Contract
- Every query to `email_domains`, `email_identities`, `email_provider_connections`, `email_messages`, `email_events`, `merchant_email_templates` must include `WHERE organization_id = ?`.
- Cross-tenant access attempts return HTTP 403 or 404.
- Outbound emails reject sender identities whose domain `verification_status !== 'VERIFIED'`.

---

## Code Layout
- `worker/services/cashfreeService.js` — Canonical Cashfree payments & HMAC webhooks
- `worker/services/domainProvider.js` — Pluggable DomainProvider interface and sandbox/Cloudflare provider
- `worker/services/domainService.js` — Domain business logic and Cashfree purchase coordination
- `worker/services/emailService.js` — Production email dispatch, quota, and logging pipeline
- `worker/services/emailCrypto.js` — Hardened AES-256-GCM cryptographic envelope
- `worker/services/dnsVerification.js` — Cloudflare DoH parallel record verification
- `worker/services/turnstileService.js` — Turnstile bot verification service
- `worker/services/aiGatewayService.js` — Modal GLM and Sarvam AI gateway
- `worker/templates/emailTemplates.js` — Core template definitions, HTML layout, and variable registry
- `worker/migrations/0017_merchant_email_templates.sql` — D1 migration for custom merchant template overrides
- `worker/routes/emailRoutes.js` — Production email & template REST endpoints
- `worker/ai/emailAssistantTools.js` — Structured AI tools for email and domain management
- `frontend/src/pages/EmailSettingsPage.tsx` — Unified "Domains & Email" dashboard (Domains + Email tabs)
- `frontend/src/components/Layout.tsx` — Sidebar navigation with "Domains & Email"
- `tests/` — Test suites (`production-email-architecture.test.mjs`, `production-email-integration.test.mjs`, `cashfree-payment-verification.test.mjs`, etc.)

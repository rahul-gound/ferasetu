# FeraSetu (फेरासेतु)

> **AI-Powered E-Commerce & Edge Commerce Operating System for Global Shopkeepers & Independent Retailers**

FeraSetu bridges the digital divide for local shopkeepers, kirana merchants, and independent businesses across India and global markets. It transforms offline, catalog, and WhatsApp-based commerce into an enterprise-grade digital storefront, complete with an Indic-first conversational AI manager, edge-accelerated performance, multi-language localization, GST-compliant invoicing, and low-code visual website building—requiring zero technical or coding knowledge.

---

## Table of Contents

1. [What FeraSetu Does](#what-ferasetu-does)
2. [High-Level Architecture](#high-level-architecture)
3. [Canonical 3-Tier SaaS Model & Multi-Region Pricing](#canonical-3-tier-saas-model--multi-region-pricing)
4. [Global Localization System (48 Targets)](#global-localization-system-48-targets)
5. [Fera AI & Indic Voice Intelligence](#fera-ai--indic-voice-intelligence)
6. [Fera Pro Visual Studio & Site Builder](#fera-pro-visual-studio--site-builder)
7. [Orders, Invoicing & GST Financial Compliance](#orders-invoicing--gst-financial-compliance)
8. [Customer Storefront Experience](#customer-storefront-experience)
9. [Email & Custom Domain Deliverability Infrastructure](#email--custom-domain-deliverability-infrastructure)
10. [Programmatic SEO & Marketing Engine](#programmatic-seo--marketing-engine)
11. [Administrator Operations Suite](#administrator-operations-suite)
12. [Security, Governance & Resilience](#security-governance--resilience)
13. [Technology Stack](#technology-stack)
14. [Repository Structure](#repository-structure)
15. [Getting Started & Local Development](#getting-started--local-development)
16. [Verification & Testing Infrastructure](#verification--testing-infrastructure)
17. [License](#license)

---

## What FeraSetu Does

- **Guided Store Creation**: Walks non-technical merchants step-by-step from raw business information to an active, shareable online store.
- **Zero Commission Commerce**: Unlike traditional aggregators that charge 15–30% per order, FeraSetu operates on a flat, transparent SaaS model with 0% platform commission on store sales.
- **Embedded Fera AI Business Manager**: A single unified AI copilot powered by Sarvam AI that handles inventory queries, catalog descriptions, marketing campaigns, and business performance summaries via natural text and voice.
- **Edge-First Speed**: Powered by Cloudflare Workers and Cloudflare D1 distributed SQLite for sub-50ms storefront responses worldwide.
- **Omnichannel Ordering**: Seamless support for local pickup, doorstep delivery, WhatsApp order automation, and self-serve customer order tracking.
- **GST & Tax Compliance**: Automatic generation of Indian GST tax invoices with HSN/SAC codes, CGST/SGST/IGST breakdown, credit notes, and downloadable vector PDF receipts.

---

## High-Level Architecture

FeraSetu uses a resilient **Dual-Backend Architecture**:

1. **Edge API (Cloudflare Workers + D1)**: Handles edge routing, storefront product catalogs, limit checks, custom subdomain resolution, and buyer-facing endpoints with near-zero latency.
2. **Core API (Node.js + Express + TypeScript)**: Handles business logic, merchant authentication, order processing lifecycle, payment gateways, GST invoicing, Sarvam AI coordination, transactional emails, and admin operations.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             BUYER / MERCHANT CLIENT                              │
│         React 19 SPA (Cloudflare Pages) • Vite 8 • Tailwind CSS • Three.js       │
└───────────────────────┬──────────────────────────────────┬───────────────────────┘
                        │                                  │
         Edge Requests  │                                  │  Core API & Auth
     (Catalog / Stores) │                                  │  (Payments / Orders / AI)
                        ▼                                  ▼
       ┌─────────────────────────────────┐       ┌──────────────────────────────────┐
       │   CLOUDFLARE WORKER (Edge API)  │       │      NODE.JS / EXPRESS CORE      │
       │   - Subdomain / Custom Domains  │       │   - AuthKit & Appwrite Auth      │
       │   - Edge Limit Enforcement      │       │   - Cashfree / Razorpay / Stripe │
       │   - Pro Studio AST Engine       │       │   - GST Invoicing & PDF Service  │
       │   - Sandboxed Runtime (Fera SDK)│       │   - Sarvam AI & Speech Router    │
       └────────────────┬────────────────┘       │   - Admin & Ticketing Services   │
                        │                        └────────────────┬─────────────────┘
                        ▼                                         │
       ┌─────────────────────────────────┐                        ▼
       │     CLOUDFLARE D1 (Edge SQL)    │       ┌──────────────────────────────────┐
       │   - Multi-Tenant Sharded SQL    │       │        DATABASE & STORAGE        │
       │   - Automated Daily Snapshots   │       │   - MySQL (Prod) / SQLite (Dev)  │
       │   - Low-latency Global Replicas │       │   - Appwrite Cloud / CDN Media   │
       └─────────────────────────────────┘       └────────────────┬─────────────────┘
                                                                  │
                                                                  ▼
                                                 ┌──────────────────────────────────┐
                                                 │   EMAIL & MESSAGING SERVICES     │
                                                 │   - Brevo Transactional API      │
                                                 │   - Self-Hosted ferasetu-smtp    │
                                                 │     (Postfix, DKIM, CF DNS)      │
                                                 └──────────────────────────────────┘
```

---

## Canonical 3-Tier SaaS Model & Multi-Region Pricing

The platform implements a centralized, authoritative plan and entitlement system (`config/plans.ts` and `backend/src/config/pricing.ts`).

### Canonical Domestic Pricing (India — INR ₹)

| Tier | Monthly | Annual (2 Mos Free) | Catalog Limit | AI Credits | Core Entitlements |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Free** | **₹0** | **₹0** | 25 products | 20 / mo | Online storefront, order management, basic analytics, community support |
| **Business** *(Most Popular)* | **₹399** | **₹3,990** *(₹332/mo)* | 500 products | 200 / mo | Custom WhatsApp alerts, priority support, full sales analytics, CSV export |
| **Pro** | **₹999** | **₹9,990** *(₹832/mo)* | **Unlimited** | 1,000 / mo | Unbranded white-label store, custom domain + SSL, Fera Pro Visual Studio, multi-page builder |

### Multi-Region Geo-Pricing

FeraSetu serves localized pricing and payment gateways depending on visitor geography:
- **India (`IN`)**: INR (`₹`), permanent Free tier, Cashfree & Razorpay payment gateways.
- **United States (`US`)**: USD (`$`), 14-day free trial, Stripe gateway:
  - *Starter*: $19/mo | *Business*: $39/mo | *Pro*: $79/mo | *Scale*: $179/mo
- **European Union (`EU`)**: EUR (`€`), 14-day free trial, Stripe gateway:
  - *Starter*: €19/mo | *Business*: €39/mo | *Pro*: €79/mo | *Scale*: €179/mo

### Commercial Features
- **A/B Pricing Experiment Engine**: Deterministic variant allocation supporting dynamic testing (e.g., ₹299 vs. ₹399 vs. ₹499 for Business).
- **Legacy Tier Normalization**: Automatically maps legacy plan names (`beta`, `trial`, `starter`, `basic`, `standard`, `growth`, `scale`) to canonical tiers.
- **Contextual Gating**: Non-intrusive modal alerts when limits are approached; hard limits enforce HTTP 403 with `{ upgradeRequired: true }` without disrupting current operations.
- **Top-Up Credit Packs**: Small (250 credits / ₹149), Growth (1,000 credits / ₹499), Scale (3,000 credits / ₹1,299). Extra storage available at ₹20/GB.

---

## Global Localization System (48 Targets)

FeraSetu features a 48-target localization engine designed for non-technical users (`docs/LOCALIZATION_SYSTEM.md` and `frontend/src/i18n/config.ts`):

1. **Canonical Source**: US English (`en`).
2. **Colloquial Blend**: Hinglish (`hi-latn`) — Romanized Hindi with everyday English loan words.
3. **All 22 Scheduled Indian Languages** (Constitution Eighth Schedule):
   - Assamese (`as`), Bengali (`bn`), Bodo (`brx`), Dogri (`doi`), Gujarati (`gu`), Hindi (`hi`), Kannada (`kn`), Kashmiri (`ks` - RTL), Konkani (`gom`), Maithili (`mai`), Malayalam (`ml`), Manipuri (`mni`), Marathi (`mr`), Nepali (`ne`), Odia (`or`), Punjabi (`pa`), Sanskrit (`sa`), Santali (`sat`), Sindhi (`sd` - RTL), Tamil (`ta`), Telugu (`te`), Urdu (`ur` - RTL).
4. **All 24 Official European Union (EU) Languages**:
   - Bulgarian, Croatian, Czech, Danish, Dutch, English (EU), Estonian, Finnish, French, German, Greek, Hungarian, Irish, Italian, Latvian, Lithuanian, Maltese, Polish, Portuguese, Romanian, Slovak, Slovenian, Spanish, Swedish.

### Technical Implementation
- **Dynamic ESM Chunk Loading**: Regional dictionaries are code-split into independent bundles (`import('./hi.ts')`). Switching languages loads only the required dictionary chunk.
- **Bidirectional Script Support**: Automatic document direction toggle (`ltr` vs. `rtl`) and script-aware font switching for Urdu, Kashmiri, and Sindhi.
- **Privacy-First Geolocation Suggestion**: Derives country from Cloudflare edge headers (`CF-IPCountry`, `CF-Region`) and displays an unobtrusive suggestion banner without triggering invasive browser GPS prompts.

---

## Fera AI & Indic Voice Intelligence

Fera AI is an embedded operational co-pilot built specifically for retail merchants (`docs/FERASETU_AI.md`):

- **Sarvam AI Multi-Model Routing**:
  - **Sarvam-30B**: Instant chat, inventory inquiries, colloquial Hinglish/regional understanding, conversational operations.
  - **Sarvam-105B**: Long-range reasoning, complex website configuration synthesis, automated predictive analytics.
  - **Saarika:v2 Speech-to-Text**: High-accuracy voice transcription for 11+ Indic languages (`hi-IN`, `bn-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `ta-IN`, `te-IN`, `gu-IN`, etc.).
  - **Sarvam Text-to-Speech (TTS)**: Natural voice feedback in regional dialects.
  - **Sarvam Translate**: Multi-way translation between English and Indian regional languages.
- **Human-in-the-Loop Safeguards**: High-risk or state-modifying actions (adding inventory, changing prices, sending customer broadcast updates) render interactive approval cards before execution. Read-only queries run automatically.
- **Contextual Shop Snapshot Injection**: Compresses shop inventory, sales volume, and open orders into structured context blocks with strict customer PII masking.
- **Quota Accounting**: Transparent credit consumption (Chat: 1 credit; Website AI: 3 credits; Customer Assistant: 2 credits) with monthly resets and top-up support.

---

## Fera Pro Visual Studio & Site Builder

For merchants wanting custom-branded online storefronts, Fera Pro provides a visual low-code/no-code development studio (`frontend/src/pages/ProStudioPage.tsx` and `worker/pro/`):

- **Visual Drag-and-Drop Editor**: Real-time layout customization, typography, color schemes, banners, and smart component blocks.
- **AST Parser & React AST Converter**: Converts visual representations into standard React code and vice versa (`pageAstConverter.js`, `reactAstParser.js`).
- **Project Import/Export & Diff Engine**: Full site export and import via ZIP archives, with intelligent version diffing (`projectDiffEngine.js`, `projectZipParser.js`).
- **Sandboxed Fera Functions Runtime**: Secure execution layer (`worker/sandbox/feraRuntime.js`) with AST tokenization preventing dangerous primitives (`eval`, prototype pollution, constructor traversal, infinite loops) and limiting execution steps.
- **Custom Data Sources & Snapshots**: Connect custom external APIs and manage point-in-time site snapshots with 1-click restore (`BACKUP_RESTORE_PROCEDURE.md`).

---

## Orders, Invoicing & GST Financial Compliance

A complete commercial back-office tailored to Indian trade practices (`backend/src/routes/orders.ts` and `backend/src/services/pdfService.ts`):

- **Order Fulfillment Workflows**: Supports doorstep delivery, local in-store pickup, order progress tracking (Received → Processing → Shipped → Delivered → Cancelled).
- **GST-Compliant Tax Invoices**:
  - Pure vector PDF engine generating crisp, standalone invoices without external headless browser overhead.
  - Line-item breakdown with HSN/SAC codes, CGST, SGST, IGST calculation, reverse charge flags, and merchant GSTIN display.
  - Automatic Credit Note generation (`creditNoteService.ts`) and audit logging for refunds (`refundService.ts`).
- **Deterministic Minor-Unit Arithmetic**: Stores and calculates all monetary figures in integer minor units (paise / cents) to completely eliminate floating-point rounding discrepancies.
- **Secure Public Order Tracking**: HMAC-SHA256 authenticated tracking tokens allow customers to track orders and download PDF invoices securely without needing to create an account.

---

## Customer Storefront Experience

FeraSetu provides a dedicated buyer experience for each shopkeeper:

- **Subdomain & Custom Domain Routing**: Stores are accessible at `<slug>.ferasetu.com`, `<slug>.fera-search.tech`, or merchant custom domains.
- **Customer Authentication Portal**: Optional buyer accounts (`/api/storefront/customer`) with PBKDF2 password hashing (100,000 iterations), SHA-256 session token hashing, order histories, and fast re-ordering.
- **Interactive Product Catalog**: Dynamic category filtering, search, image galleries, stock status badges, and cart management.

---

## Email & Custom Domain Deliverability Infrastructure

High-deliverability email infrastructure supporting transactional notices and merchant-branded emails:

- **Brevo API (Primary Outbound)**: High-reputation transactional delivery for OTPs, onboarding messages, order receipts, and invoices over REST API.
- **Self-Hosted `ferasetu-smtp` Engine**:
  - Full-featured Python SMTP delivery subsystem in `ferasetu-smtp/`.
  - Automated Cloudflare DNS management for DKIM, SPF, and DMARC record provisioning (`cloudflare_dns.py`).
  - Cryptographic RSA-SHA256 DKIM signing (`dkim_signer.py`).
  - Persistent queue manager with exponential backoff and domain throttle policies (`queue_manager.py`).
  - IP and domain reputation tracking (`reputation.py`).
  - Serverless execution support via Modal (`modal_app.py`).
- **Merchant Custom Email Domains**: Automated DNS record validation (`dnsVerification.js`) allowing merchants to send receipts from their own domain (e.g., `orders@sharmakirana.in`).

---

## Programmatic SEO & Marketing Engine

Built to capture organic merchant intent across India:

- **Targeted SEO Landing Pages**:
  - `/online-dukaan-banaye` (Online Dukaan Banaye)
  - `/kirana-store-online` (Kirana Store Online)
  - `/free-online-store` (Free Online Store India)
  - `/shopify-alternative-india` (Shopify Alternative India)
- **Dynamic XML Sitemap**: Automatic sitemap generation at `/sitemap.xml` indexing all localized routes and public landing pages.
- **Dynamic Commission Calculator**: Live comparison demonstrating financial savings with FeraSetu's 0% platform fee compared to marketplace aggregator commissions.
- **Interactive 3D Hero Visual**: Three.js and React Three Fiber interactive scene (`HeroScene.tsx`) on the main landing page.

---

## Administrator Operations Suite

Comprehensive back-office tools for platform operators accessible at `/admin/*`:

- **Admin Authentication**: Hardened PBKDF2 password verification with JWT session tokens and dedicated rate limiting (max 5 attempts/minute).
- **Management Portals**:
  - **Overview Dashboard**: High-level platform GMV, user acquisition, and system metrics.
  - **Users & Shops**: Merchant lifecycle management, tier overrides, shop status audits.
  - **Orders & Financials**: Platform-wide transaction auditing and dispute reviews.
  - **Support Tickets & Feedback**: In-app ticketing system with merchant survey analysis (`surveyAssistant.ts`).
  - **System Health & Logs**: Real-time error log inspection (`AdminErrorLogsPage.tsx`) and edge database status.

---

## Security, Governance & Resilience

FeraSetu adheres to strict defensive security standards documented in `SECURITY_AUDIT.md`:

- **Strict Tenant Isolation**: All database queries are cryptographically bound to the authenticated `user_id` or `organization_id`.
- **Injection Prevention**: 100% of SQL queries across Express and Worker D1 use parameterized prepared statements.
- **Dual Authentication Hardening**:
  - WorkOS AuthKit JWTs validated cryptographically via remote JWKS.
  - Internal customer and merchant passwords hashed via bcrypt (cost 10) or PBKDF2 (100,000 iterations).
  - OTP codes hashed before storage; plain text OTPs never stored in database columns or logs.
- **CSRF & Browser Defenses**:
  - Double-submit CSRF cookie protection for state-changing requests.
  - Production Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and restrictive Permissions-Policy headers.
  - Hostile URL protocol sanitizer neutralizes `javascript:`, `data:`, `vbscript:`, and cross-site script injections.
- **Disaster Recovery**: Automated Cloudflare D1 snapshots with point-in-time recovery runbooks documented in `BACKUP_RESTORE_PROCEDURE.md`.

---

## Technology Stack

### Frontend Client
- **Framework**: React 19 (`19.2.4`), Vite 8 (`8.2.2`), TypeScript (`5.3+`)
- **Styling & UI**: Tailwind CSS (`3.4+`), Framer Motion (`11.15+`), Lucide React
- **3D Graphics**: Three.js (`0.180+`), React Three Fiber (`@react-three/fiber`), Drei
- **State & Data**: Zustand (`4.5.5`), TanStack React Query (`5.97+`), React Router v7
- **Telemetry & Auth**: Statsig Web Analytics & Session Replay, WorkOS AuthKit React SDK

### Edge API & Worker Network
- **Runtime**: Cloudflare Workers (Edge V8)
- **Database**: Cloudflare D1 (Distributed edge SQLite with multi-tenant sharding)
- **Deployment**: Cloudflare Wrangler CLI (`wrangler.toml`)
- **Sandbox Engine**: Fera Runtime AST execution environment

### Backend Core
- **Server**: Node.js 20+, Express.js, TypeScript
- **Databases**: SQLite (Local Dev / Fallback), MySQL2 (Production), Appwrite Cloud
- **Security**: Helmet, CORS, Cookie-Parser, CSRF double-submit, Express-Rate-Limit, Zod
- **Finance & PDF**: Pure vector PDF generator (`pdfService.ts`), Money minor-units engine
- **Email**: Brevo REST API, Nodemailer, custom Python `ferasetu-smtp` service

### AI & Speech Services
- **LLM Engine**: Sarvam AI (Sarvam-30B, Sarvam-105B) & Modal GLM
- **Voice / Speech**: Saarika:v2 (Speech-to-Text) & Sarvam TTS (Text-to-Speech)
- **Language**: Sarvam Indic Translation API

---

## Repository Structure

```text
fera-shopkeeper/
├── backend/                  # Node.js + Express Core API
│   ├── src/
│   │   ├── config/           # Regional pricing and feature flags
│   │   ├── middleware/       # Auth, CSRF, rate limiters, error handling
│   │   ├── models/           # D1 & MySQL/SQLite database abstraction
│   │   ├── routes/           # Core API route handlers (orders, payment, AI, admin)
│   │   ├── services/         # Sarvam AI, PDF invoice generator, Brevo mailer
│   │   └── utils/            # Money minor-units, tracking HMACs
│   └── tests/                # Jest API, health, and database tests
├── frontend/                 # React 19 Merchant & Storefront Web App
│   ├── src/
│   │   ├── components/       # UI library, 3D scenes, layout, Pro editor panels
│   │   ├── contexts/         # Auth, Language (i18n), and Market contexts
│   │   ├── dictionaries/     # Regional language translation bundles
│   │   ├── i18n/             # 48-target language configurations and loaders
│   │   ├── pages/            # Merchant dashboard, Pro Studio, SEO landing pages
│   │   └── services/         # Axios API client & offline local database
│   └── tests/                # Client route stress and localization tests
├── worker/                   # Cloudflare Worker Edge API
│   ├── ai/                   # Edge AI orchestrator and geo-strategies
│   ├── catalog/              # SKU registry and price resolvers
│   ├── pro/                  # Pro visual studio AST converter and zip parser
│   ├── routes/               # Worker admin, email, geo, and Pro routes
│   ├── sandbox/              # Fera SDK and sandboxed runtime
│   ├── services/             # Pro platform and storage services
│   ├── sharding/             # Multi-tenant D1 database sharding
│   ├── templates/            # Email and storefront starter templates
│   ├── index.js              # Edge worker entry point
│   └── schema.sql            # D1 database schema
├── ferasetu-smtp/            # Dedicated Python SMTP & DKIM Delivery Engine
│   ├── cloudflare_dns.py     # Automated Cloudflare DNS DKIM/SPF provisioning
│   ├── dkim_signer.py        # Cryptographic DKIM email signing
│   ├── queue_manager.py      # Resilient outbound email queue
│   ├── reputation.py         # Domain & IP deliverability reputation monitor
│   └── modal_app.py          # Modal serverless deployment
├── config/                   # Canonical plans and feature entitlements
├── packages/                 # Shared TypeScript packages (@ferasetu/shared-types)
├── docs/                     # Technical specifications and architectural guides
├── scripts/                  # Database migration and utility scripts
├── tests/                    # End-to-end and security regression suites
├── wrangler.toml             # Root Cloudflare Wrangler configuration
└── package.json              # Monorepo root package definition
```

---

## Getting Started & Local Development

### Prerequisites

- **Node.js**: `20.x` or newer
- **npm**: `10.x` or newer
- **Cloudflare Wrangler** (optional, for edge testing): `npm install -g wrangler`
- **Python 3.10+** (optional, if testing `ferasetu-smtp`)

### Clone and Install Dependencies

```bash
git clone https://github.com/rahul-gound/ferasetu.git
cd ferasetu
npm run install:all
```

### Environment Configuration

Copy the example environment files and populate required keys:

```bash
# Frontend configuration
cp frontend/.env.example frontend/.env.local

# Backend configuration
cp backend/.env.example backend/.env
```

Key environment variables:
- `FRONTEND_URL`: `http://localhost:5173`
- `PORT`: `3001` (backend dev)
- `SARVAM_30B_API_KEY`: API key for Sarvam AI models
- `BREVO_API_KEY`: Brevo transactional email key
- `WORKOS_CLIENT_ID` / `WORKOS_API_KEY`: WorkOS credentials
- `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`: Cashfree payment credentials

### Run Development Servers

Run frontend and backend simultaneously:

```bash
# Start frontend (Vite on http://localhost:5173)
npm run dev:frontend

# Start backend (Express on http://localhost:3001)
npm run dev:backend
```

To run the Cloudflare Worker locally with local D1:

```bash
npx wrangler dev
```

### Production Build

```bash
# Build both frontend and backend
npm run build

# Build only frontend
npm run build:frontend

# Build only backend
npm run build:backend
```

---

## Verification & Testing Infrastructure

FeraSetu maintains a comprehensive automated testing suite across unit, integration, edge, and security layers (**352+ passing tests**):

### Test Execution Commands

```bash
# 1. Backend Jest Suite (143 tests passing)
cd backend && npm test

# 2. Security Regression Suite (118 tests passing)
node tests/security-regression.test.mjs

# 3. Pro Platform Master Suite (38 tests passing)
node tests/run-all-pro-tests.mjs

# 4. Fera AI Integration Suite (32 tests passing)
node tests/fera-ai.test.mjs

# 5. E2E 4-Tier SaaS Verification Suite (21 tests passing)
node tests/e2e/run_all_e2e.mjs
```

### Verified Status Matrix

| Test Suite | Scope | Tests | Status |
| :--- | :--- | :---: | :---: |
| **Backend Jest** | API routes, health, D1 edge abstraction, auth, orders, survey | 143 / 143 | ✅ PASS |
| **Security Regression** | IDOR fixes, CSRF, JWT validation, SQLi/XSS filters, rate limits | 118 / 118 | ✅ PASS |
| **Pro Platform** | Billing gates, sandbox security, capabilities, AST multi-page | 38 / 38 | ✅ PASS |
| **Fera AI Suite** | Intent classification, credit deduction, shop context, injection defense | 32 / 32 | ✅ PASS |
| **E2E 4-Tier SaaS** | R1–R6 pricing, boundaries, lifecycle telemetry, retailer workflows | 21 / 21 | ✅ PASS |
| **Frontend Production Build** | Vite 8 + Rolldown compilation, chunking, 48 language bundles | — | ✅ PASS (2m 11s) |

---

## License

This project is licensed under the [MIT License](LICENSE).

# FeraSetu 

> **AI-Powered E-Commerce shopify alternative **

FeraSetu bridge the shopkeeper store to internet by making website . it is very simple , transparent nd easy for begginer not like shopify or other which is good but hard and complex . our vision is to make simplicity .

---
for the help see the docs folder 
---

## What FeraSetu Does

- **Guided Store Creation**: help non-technical user to make the website .
- **Zero Commission Commerce**: Unlike traditional aggregators that charge 15–30% per order, FeraSetu work on a fixed pricing SaaS model with 0% platform commission on store order.
- **Embedded Fera AI Business Manager**: A AI copilot powered by Sarvam and chatgpt and anthropic . it can handles inventory queries, catalog descriptions, marketing campaigns, and business performance summaries via natural text and voice.
- **Edge-First Speed**: Powered by Cloudflare Workers and Cloudflare D1 distributed SQLite for sub-50ms storefront responses worldwide.
- **Omnichannel Ordering**: Seamless support for local pickup, doorstep delivery, WhatsApp order automation, and self-serve customer order tracking by using our supported delivery partner or use own delivery .
- **Invoice**: it generate invoice for the customers and send to their email.

---



---

## Canonical 3-Tier SaaS Model & Multi-Region Pricing

The platform implements a centralized, authoritative plan and entitlement system (`config/plans.ts` and `backend/src/config/pricing.ts`).

### Canonical Domestic Pricing (India — INR ₹)
see : ferasetu.com/pricing 
### Multi-Region Geo-Pricing

FeraSetu uses local pricing and payment gateways depending on visitor geography and country :
- **India (`IN`)**: INR (`₹`), permanent Free tier, Cashfree & Razorpay payment gateways.
- **United States (`US`)**: USD (`$`), 14-day free trial, Stripe gateway or user own gateways:
  - *Starter*: $19/mo | *Business*: $39/mo | *Pro*: $79/mo | *Scale*: $179/mo
- **European Union (`EU`)**: EUR (`€`), 14-day free trial, Stripe gateway or user own gateway :
  - *Starter*: €19/mo | *Business*: €39/mo | *Pro*: €79/mo | *Scale*: €179/mo

### Commercial Features
**legacy Tier Normalization**: Automatically maps legacy plan names ( `trial`, `starter`, `basic`, `standard`, `growth`, `scale`) to canonical tiers.
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
- **Bidirectional Script Support**: Automatic document direction toggle (`ltr` vs. `rtl`) and script-aware font switching for Urdu, Kashmiri, and Sindhi.
- **Privacy-First Geolocation Suggestion**: finds country from Cloudflare edge headers (`CF-IPCountry`, `CF-Region`) and displays and change the pricing and currency .

---

## Fera AI & Indic Voice Intelligence

Fera AI is an co-pilot built specifically build for retail merchants (`docs/FERASETU_AI.md`):

Transparent credit consumption (Chat: 1 credit; Website AI: 3 credits; Customer Assistant: 2 credits) with monthly resets and top-up support.

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

production ready email infrastructure supporting transactional emails and merchant-branded emails:

- **7smtp (Primary Outbound)**: High-reputation transactional delivery for OTPs, onboarding messages, order receipts, and invoices over REST API.
- **Self-Hosted `ferasetu-smtp` Engine**:
  - Full-featured Python SMTP delivery subsystem in `ferasetu-smtp/`.
  - Automated Cloudflare DNS management for DKIM, SPF, and DMARC record provisioning (`cloudflare_dns.py`).
  - Cryptographic RSA-SHA256 DKIM signing (`dkim_signer.py`).
  - Persistent queue manager with exponential backoff and domain throttle policies (`queue_manager.py`).
  - IP and domain reputation tracking (`reputation.py`).
  - Serverless execution support via Modal (`modal_app.py`).
- **Merchant Custom Email Domains**: Automated DNS record validation (`dnsVerification.js`) allowing merchants to send receipts from their own domain (e.g., `orders@sharmakirana.in`).

---

for comparison visit the following links :
- 
  - `ferasetu.com/online-dukaan-banaye` 
  - `ferasetu.com/kirana-store-online` 
  - `ferasetu.com/free-online-store` 
  - `ferasetu.com/shopify-alternative-india` 
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
- **LLM Engine**: sarvam ai & other model
- **Voice / Speech**: eleven labs 
- **Language**: Sarvam Indic Translation API

---



---

## Getting Started & Local Development

### Prerequisites

- **Node.js**: `20.x` or newer
- **npm**: `10.x` or newer
- **Cloudflare Wrangler** (optional, for edge testing): `npm install -g wrangler`
- **Python 3.10+** (optional, if testing `ferasetu-smtp`)


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
- `7smtp_api`: to send the smtp emaill key
- `WORKOS_CLIENT_ID` and `WORKOS_API_KEY`: WorkOS credentials for login 
- `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`: Cashfree payment credentials for pament 

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

## how to run it 

to run it you have :

###frontend 

```bash
cd ferasetu/frontend
npm run dev  ```

###backend

```bash
cd ferasetu/backend
npm run de
```

### Required for self hosted 

workos auth 
ai api ( ai.ferasetu.com)


##where i used Ai

i used ai to code and fix bug but i do research and find bugs and try to add new features and see how to increase ui 



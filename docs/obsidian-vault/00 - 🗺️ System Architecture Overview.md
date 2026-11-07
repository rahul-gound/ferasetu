\# 🗺️ FeraSetu (फेरासेतु) — Core System Architecture Overview

> **Version:** 1.0.0-PROD  
> **Target Audience:** The Global Shopkeeper (48+ regions, Indic-first, 0% platform commission)  
> **Last Synchronized:** 2026-11-07  
> **Quick Links:** [[01 - 📊 Progress & Completion Matrix]] | [[02 - ⚡ Edge Tier (Cloudflare Workers & D1)]] | [[03 - 🖥️ Core API & Business Logic (Node.js & Express)]] | [[04 - 🎨 Frontend & Design System (React 19 & Tailwind)]] | [[05 - 🤖 Fera AI & Sarvam Intelligence]] | [[06 - 💳 Payments, Billing & Multi-Region Pricing]] | [[07 - 🧾 GST Invoicing & Accounting]] | [[08 - 🌐 Subdomains, Custom Domains & DNS]] | [[09 - 🧪 QA, Testing & Control Plane]] | [[10 - 🗄️ Database Schemas & Data Flow]] | [[11 - 💬 WhatsApp Assistant Architecture]] | [[12 - 🏆 Antigravity Rewards & Credits]] | [[feature that wil added soon]]

---

## 1. High-Level Dual-Engine Topology

FeraSetu is partitioned into a high-concurrency **Edge Gateway** and an authoritative **Core API**:

```mermaid
graph TD
    Client[Storefront & Shopkeeper Web App] -->|Edge Traffic (<50ms)| Edge[Cloudflare Worker Gateway]
    Client -->|Core Business & Admin| Core[Node.js / Express Core API]

    subgraph Edge Tier
        Edge --> D1[(Cloudflare D1 Distributed SQLite)]
        Edge --> B2[Backblaze B2 Media CDN]
        Edge --> EdgeAuth[Edge JWT & Rate Limiting]
    end

    subgraph Core Tier
        Core --> AuthKit[AuthKit & Appwrite Auth]
        Core --> Sarvam[Sarvam AI Indic LLM Engine]
        Core --> Cashfree[Cashfree & Razorpay Gateways]
        Core --> GSTEngine[GST Invoicing & PDF Service]
        Core --> SMTP[Self-Hosted ferasetu-smtp / Brevo]
    end
```

---

## 2. Core Subsystems & Responsibilities

| Subsystem | Primary Path | Technologies | Responsibility | Note Link |
| :--- | :--- | :--- | :--- | :--- |
| **Progress Matrix** | `docs/obsidian-vault/` | Obsidian Dashboard | Subsystem completion % & live milestone tracking | [[01 - 📊 Progress & Completion Matrix]] |
| **Edge Gateway** | `/worker` | Cloudflare Workers, D1 | Subdomain routing, catalog caching, AST builder runtime | [[02 - ⚡ Edge Tier (Cloudflare Workers & D1)]] |
| **Core API** | `/backend` | Node.js, Express, TS | Auth, orders lifecycle, payments, GST, admin endpoints | [[03 - 🖥️ Core API & Business Logic (Node.js & Express)]] |
| **Frontend SPA** | `/frontend` | React 19, Vite 8, Tailwind | Shopkeeper dashboard, Fera Pro Studio, store builder | [[04 - 🎨 Frontend & Design System (React 19 & Tailwind)]] |
| **Fera AI Engine** | `/worker/ai`, `/backend/src/routes/ai.ts` | Sarvam AI, Whisper | Multilingual voice copilot, catalog copy, store intelligence | [[05 - 🤖 Fera AI & Sarvam Intelligence]] |
| **Billing & Plans** | `/config/plans.ts`, `/backend/src/config/pricing.ts` | Cashfree, Razorpay, Stripe | 3-tier SaaS pricing (Free, Business, Pro), multi-currency | [[06 - 💳 Payments, Billing & Multi-Region Pricing]] |
| **GST Invoicing** | `/backend/src/services/` | PDFKit, Tax Engine | B2B/B2C GST compliance, HSN codes, CGST/SGST/IGST | [[07 - 🧾 GST Invoicing & Accounting]] |
| **Domain Engine** | `/worker/routes/domainRoutes.js` | Cloudflare Custom Hostnames | Wildcard subdomains (`*.ferasetu.com`), custom domains | [[08 - 🌐 Subdomains, Custom Domains & DNS]] |
| **QA Control Plane** | `/tests`, `/packages/qa-engine` | Node Test Runner | 38+ automated adversarial and integration test suites | [[09 - 🧪 QA, Testing & Control Plane]] |
| **Database & State** | `/worker/migrations`, `/backend/src/models` | D1 SQLite, MySQL | Multi-tenant schema, catalog indices, order logs | [[10 - 🗄️ Database Schemas & Data Flow]] |

---

## 3. Token-Saving Navigation Pattern for Agents

1. **Before grepping the repository**, consult this index and the linked subsystem note.
2. Read the note's **Contract & Entrypoints** section to target exact source lines.
3. Update the note whenever source code contracts, endpoints, or schemas are modified.
4. Report progress based on [[01 - 📊 Progress & Completion Matrix]].

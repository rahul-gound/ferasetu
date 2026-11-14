# 🔍 AEO, GEO & Search Infrastructure Architecture

> **Subsystem Completion:** `100%`  
> **Status:** 🟢 Production  
> **Primary Paths:** `frontend/functions/_middleware.ts`, `frontend/scripts/prerender-seo.mjs`, `frontend/src/components/seo/SEOHead.tsx`, `frontend/public/robots.txt`, `frontend/public/sitemap.xml`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Executive Strategy & Philosophy
FeraSetu's discovery engine is engineered around sovereign brand authority, zero synthetic AI slop, and multi-engine citation parity across traditional search engines (Google, Bing) and AI answer engines (Google AI Overviews, ChatGPT Search, Perplexity, Microsoft Copilot, Gemini):
- **Core Truth:** "Your business is yours. The internet should be too."
- **Entity Identity:** Unified Schema.org Knowledge Graph resolving `Organization`, `WebSite`, `SoftwareApplication`, `TechArticle`, `BreadcrumbList`, and `FAQPage`.
- **0% Platform Commission Grounding:** Absolute factual consistency across all visible copy, structured data, pricing calculators, and competitor comparisons.
- **Answer-Engine Retrieval Architecture:** Cloudflare Pages `HTMLRewriter` edge middleware pre-injecting metadata and structured data in <50ms without client-side rendering dependency.

---

## 2. Crawler & Bot Governance (`robots.txt`)
FeraSetu distinguishes explicitly between **Search Discovery Bots** (which surface our pages in AI answers and search results) and **AI Training Crawlers**:

| Category | Crawlers Whitelisted | Access Scope | Protected Routes |
| :--- | :--- | :--- | :--- |
| **Search Engines** | `Googlebot`, `Bingbot`, `Applebot` | `Allow: /` | Disallowed: `/dashboard`, `/admin`, `/settings`, `/callback`, `/verify-email`, `/onboarding`, `/ref/`, `/api/`, `/platform-sites` |
| **AI Search & Retrieval** | `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Claude-Search`, `DuckAssistBot` | `Allow: /` | Disallowed: `/dashboard`, `/admin`, `/settings`, `/callback`, `/verify-email`, `/onboarding`, `/ref/`, `/api/`, `/platform-sites` |
| **AI Training Scrapers** | `GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`, `Bytespider`, `Amazonbot`, `Meta-ExternalAgent` | `Allow: /` | Uniform public access policy; private endpoints strictly locked |

---

## 3. The 12 Sovereign Knowledge Authority Invariants
Permanently grounded in `/docs/sovereign-commerce-answers/`, `_middleware.ts`, and `prerender-seo.mjs`:
1. **What is FeraSetu:** Sovereign commerce infrastructure for independent retailers (NOT a marketplace, NOT a closed site builder, NOT a logistics fleet).
2. **Target Audience:** Independent retailers, grocers, bodegas, boutiques across 48+ regions.
3. **Problem Solved:** Eliminates 15%–30% marketplace commissions and Shopify app/transaction taxes.
4. **How It Works:** 2-minute store setup, free subdomain or custom domain, orders via web & WhatsApp.
5. **Shopify Differences:** ₹0 commission forever vs Shopify 2% surcharge + app subscriptions.
6. **Marketplace Differences:** Merchant owns 100% of customer data and phone numbers; zero listing suppression.
7. **0% Commission Guarantee:** ₹0 platform fee across Free, Business, and Pro plans; standard gateway fees only.
8. **Data Sovereignty:** Merchant owns full names, numbers, addresses, and order histories; CSV export anytime.
9. **Order Channels:** Real-time Orders dashboard with delivery OTP + native WhatsApp cart drawer.
10. **Payment Gateways:** Direct UPI (PhonePe, GPay, Paytm, BHIM) + Cashfree, Razorpay, COD.
11. **Platform Limits:** Free plan has 25 products limit; merchants manage their own local delivery.
12. **Getting Started:** Sign up for ₹0 at `ferasetu.com` without credit card.

---

## 4. Competitor Comparison Grid & Prerendering
All comparisons feature verified fee matrices, 3-step migration guides, and schema-backed FAQs:
- `/compare/shopify-alternative/` (0% Commission vs 2% external surcharge)
- `/compare/woocommerce-alternative/` (Zero server maintenance & zero plugin bloat)
- `/compare/bigcommerce-alternative/` (No forced revenue upgrade tiers)
- `/compare/dukaan-alternative/` (100% customer ownership vs marketplace lock-in)
- `/compare/wix-squarespace-alternative/` (Clean edge performance vs heavy nested DOM)
- `/compare/marketplace-alternative/` (Keep 100% revenue vs 15%–30% marketplace cut)

---

## 5. Technical Validation & Edge Deployment
- **Trailing Slash Invariant:** All sitemap URLs and edge canonicals end in `/` to prevent Cloudflare Pages 308 redirects.
- **Meta Description Boundary:** All core prerendered descriptions strictly bounded between 100 and 160 characters.
- **IndexNow Automated Ping:** 32-character hex key file (`c96b8e39f72b4c10a184e9d1bf7b9a2d.txt`) for instant search engine recrawl.
- **Automated Verification:** Verified via `frontend/tests/seo-audit.test.ts` (9/9 tests passing).

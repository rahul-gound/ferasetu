# FeraSetu Global Regional Pricing Strategy & Economic Model

**Author:** Senior Product Auditor, Full-Stack Engineer, SaaS Pricing Strategist & International Ecommerce Expert  
**Date:** September 2026  
**Document Target:** `/audit/regional-pricing-recommendation.md`

---

## 1. Executive Summary & Core Principle

FeraSetu's transition from an India-centric Kirana platform to a global commerce platform serving **India, the United States, the United Kingdom, the European Union, Canada, Australia, and Rest of World (RoW)** requires an authoritative, unified pricing architecture.

### The Fatal Flaw in Naive SaaS Pricing
Charging international merchants more purely because a country has a higher GDP per capita fails in commerce SaaS. Instead, pricing must be derived from:
1. **Local Competitor Reference Anchors**:
   - Shopify Starter ($5/mo), Shopify Basic ($39/mo or $29/mo billed annually), Shopify Advanced ($399/mo).
   - WooCommerce hosting (SiteGround $2.99–$7.99/mo + essential plugins $20–$50/mo).
   - BigCommerce Essentials ($39/mo), Wix eCommerce ($29/mo), Squarespace Business ($23/mo).
   - Dukaan (India ₹999–₹2,999/mo).
2. **Local Payment Gateway Intermediary Costs**:
   - **India**: UPI interchange is 0% (government subsidized), RuPay debit is 0%, standard credit cards are 1.8–2.0% via Cashfree/Razorpay.
   - **US**: Stripe domestic cards are 2.9% + $0.30; ACH direct debit is 0.8% (capped at $5.00).
   - **EU/UK**: Interchange Fee Regulation (IFR) caps domestic consumer debit at 0.2% and credit at 0.3%, but Stripe charges a blended 1.5% + €0.25 (standard EU cards) and 2.5% + €0.25 (UK cards post-Brexit).
   - **International/Cross-border**: 1.5% cross-border surcharge + 1% currency conversion fee on Stripe.
3. **Statutory Tax Compliance Overhead**:
   - **India**: 18% GST (CGST 9% + SGST 9% for intra-state, IGST 18% for inter-state), HSN/SAC codes, e-Invoicing thresholds.
   - **US**: Economic nexus rules (*South Dakota v. Wayfair*), 50 different state sales tax jurisdictions with 12,000+ local tax districts. Requires automated rooftop calculation (Stripe Tax).
   - **EU**: Council Directive 2006/112/EC, One-Stop Shop (OSS) VAT regime, standard VAT rates from 17% (Luxembourg) to 27% (Hungary), strict B2B reverse-charge VIES validation.
   - **UK**: Standard 20% VAT, post-Brexit HMRC registration for sellers importing goods under £135.
   - **Canada**: GST (5%), combined HST (13–15% in Ontario, NB, NL, NS, PEI), PST (6–7% in BC, SK, MB), and QST (9.975% in Quebec).
   - **Australia**: Standard 10% GST on all low-value imported goods and domestic digital sales.
4. **Customer Support & SLA Cost Structure**:
   - Indian Kirana merchants expect synchronous WhatsApp messaging and voice assistance in regional languages.
   - US/EU/UK merchants expect asynchronous email ticket SLAs (under 4 hours), self-service documentation, and SOC2/GDPR compliance disclosures.
5. **Consumer Protection & Refund Regulations**:
   - **EU Directive 2011/83/EU**: Mandates a 14-day statutory right of withdrawal ("cooling-off" period) with zero penalty.
   - **UK Consumer Rights Act 2015**: Guarantees 30-day refund for faulty digital services.
   - **US FTC Regulations**: Permit strict "no refund after free trial" policies if recurring terms are conspicuously disclosed prior to signup (Restore Online Shoppers' Confidence Act - ROSCA).

---

## 2. Pricing Philosophy Recommendation

### Should FeraSetu use dynamic FX conversion or fixed regional prices?
**Recommendation: Country-Specific Fixed Regional Price Bands with Currency-Native Charm Pricing.**

*Why dynamic FX conversion fails:*
- Real-time exchange rates cause customer invoices to fluctuate monthly (e.g. ₹399 becoming $4.78 one month and $4.85 the next), inducing billing anxiety, payment failures, and increased chargebacks.
- Merchants expect clean, memorable price points: **$19, $39, $79** in the US; **€19, €39, €79** in the EU; **£15, £35, £69** in the UK; **₹399, ₹999** in India.
- Dynamic conversion forces foreign transaction fees (1–3%) from the customer's credit card issuer onto the buyer.

### Recommended Tier Structure (3 Canonical Tiers Globally)
To eliminate the confusing 8 legacy tiers (`basic`, `starter`, `standard`, `growth`, `scale`, `business`, `pro`, `premium`), FeraSetu must standardize across all markets on 3 tiers:
1. **Starter** (Acquisition & Micro-Merchant Tier)
2. **Business** (Growth & Core Revenue Engine - "Most Popular")
3. **Pro** (High-Volume, Multi-Staff & Advanced API Tier)

---

## 3. Global Regional Pricing Matrix

| Region | Currency | Starter (Monthly / Annual/mo) | Business (Monthly / Annual/mo) | Pro (Monthly / Annual/mo) | Trial Policy | Annual Discount | Included Gateway Gate | Tax Treatment |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **India (IN)** | INR (₹) | **₹0** (Free Entry) | **₹399** / ₹332 (₹3,990/yr) | **₹999** / ₹832 (₹9,990/yr) | Permanent Free Entry | 2 Months Free (~17%) | UPI, RuPay, Indian Cards, NetBanking, COD via Cashfree/Razorpay | 18% GST (Exclusive for B2B with input credit, inclusive for retail display) |
| **United States (US)** | USD ($) | **$19** / $15 ($180/yr) | **$39** / $32 ($384/yr) | **$79** / $65 ($780/yr) | 14-Day Free Trial (Card required) | ~20% Annual Savings | Stripe Checkout (Visa, MC, Amex, Discover, Apple Pay, Google Pay) | Tax Exclusive (Rooftop US Sales Tax calculated via Stripe Tax at checkout) |
| **United Kingdom (GB)** | GBP (£) | **£15** / £12 (£144/yr) | **£32** / £26 (£312/yr) | **£65** / £52 (£624/yr) | 14-Day Free Trial (Card required) | ~20% Annual Savings | Stripe Checkout (UK Cards, Apple Pay, Google Pay, BACS Direct Debit) | Tax Inclusive (20% UK VAT clearly itemized on VAT receipt) |
| **European Union (EU)** | EUR (€) | **€19** / €15 (€180/yr) | **€39** / €32 (€384/yr) | **€79** / €65 (€780/yr) | 14-Day Free Trial (Card required) | ~20% Annual Savings | Stripe Checkout (SEPA Direct Debit, iDEAL, Bancontact, Sofort, Cards) | Tax Inclusive for B2C (Country-specific VAT via OSS); Reverse Charge for validated B2B |
| **Canada (CA)** | CAD ($) | **$25** / $20 ($240/yr) | **$49** / $40 ($480/yr) | **$99** / $80 ($960/yr) | 14-Day Free Trial (Card required) | ~20% Annual Savings | Stripe Checkout (Interac, Cards, Apple Pay, Google Pay) | Tax Exclusive (Province-specific GST/HST/PST calculated at checkout) |
| **Australia (AU)** | AUD ($) | **$29** / $24 ($288/yr) | **$59** / $48 ($576/yr) | **$119** / $96 ($1,152/yr) | 14-Day Free Trial (Card required) | ~20% Annual Savings | Stripe Checkout (Cards, Apple Pay, Google Pay, BECS Direct Debit) | Tax Inclusive (10% Australian GST clearly itemized on tax invoice) |
| **Rest of World (RoW)** | USD ($) | **$19** / $15 ($180/yr) | **$39** / $32 ($384/yr) | **$79** / $65 ($780/yr) | 14-Day Free Trial (Card required) | ~20% Annual Savings | Stripe Global Gateway (Available local payment methods) | Country-dependent (Handled via Stripe Tax or tax-exclusive export) |

---

## 4. Feature Differentiation Across Plans

| Capability | Starter Tier | Business Tier (Most Popular) | Pro Tier |
|---|:---:|:---:|:---:|
| **Product Catalog Limit** | 50 Products | 1,000 Products | Unlimited Products |
| **Monthly AI Credits** | 50 Credits/mo | 300 Credits/mo | 1,500 Credits/mo |
| **Platform Transaction Fee** | 0% | 0% | 0% |
| **Staff Member Accounts** | 1 (Owner only) | 3 Staff Seats | 10 Staff Seats (Granular roles) |
| **Custom Domain Support** | ❌ (subdomain only) | ✅ (1 Custom Domain + SSL) | ✅ (3 Custom Domains + SSL) |
| **Media Storage Quota** | 500 MB | 5 GB | 25 GB |
| **Customer Payment Gateway** | Offline/COD only | Stripe Connect / Cashfree PG | Stripe Connect / Cashfree / PayPal |
| **Shipping Carrier Rates** | Fixed manual fees | Shiprocket / Shippo live rates | Automated label generation & dispatch |
| **Tax Calculation Engine** | Manual tax entry | Automated GST / Sales Tax / VAT | Stripe Tax automated compliance |
| **Multilingual AI Assistant** | 22 Indian languages | 22 Indic + Global English/Spanish | All languages + custom prompt tuning |
| **Product Feeds (Google/Meta)** | ❌ | ✅ Google Shopping XML | ✅ Google Shopping, Meta, TikTok XML |
| **Customer Accounts & Order History** | Basic session | Full profile & saved addresses | Full profile + B2B invoice history |
| **Support SLA** | Community / Asynchronous | 24-Hour Email / WhatsApp | 4-Hour Priority Ticket & Dedicated Rep |

---

## 5. Implementation Roadmap for Pricing Migration

1. **Delete all hardcoded pricing tables** in `worker/index.js:3919`, `backend/src/config/pricing.ts`, `backend/src/routes/payment.ts:22`, and `frontend/src/config/pricing.ts:241`.
2. **Standardize on a single source of truth**: `config/plans.ts` (shared across frontend, backend Express, and Cloudflare Worker via npm workspace symlink or monorepo package).
3. **Purge the ₹1 test leak**: Restore Business = ₹399 and Pro = ₹999; remove `1` from allowed amounts whitelist in `worker/index.js:4734`.
4. **Stripe Product & Price Synchronization**:
   - Create 12 Stripe Prices in Stripe Dashboard (3 tiers × 2 frequencies [monthly/yearly] × 2 currencies [USD/EUR]).
   - Store Stripe Price IDs in `config/plans.ts` mapped to `(market, tier, billingCycle)`.
5. **Enforce Server-Side Plan Entitlements**:
   - When a user downgrades or their subscription expires, gracefully demote capabilities (e.g. disable custom domain routing, restrict product creation past limit) without corrupting existing catalog data.

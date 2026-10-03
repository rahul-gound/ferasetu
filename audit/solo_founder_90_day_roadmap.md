# FeraSetu Solo Founder 90-Day Execution Roadmap

**Role:** Solo CEO / Full-Stack Engineer  
**Toolkit:** Antigravity AI Agent + ChatGPT-4o / Claude 3.5 Sonnet  
**Target:** Transform FeraSetu into a battle-tested global ecommerce platform serving India, the United States, and Europe.  
**North Star Principle:** *Reliable checkout, real payments, and data integrity over cosmetic features.*

---

## Roadmap Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   DAYS 1–15     │ ──► │    DAYS 16–30    │ ──► │    DAYS 31–60    │ ──► │    DAYS 61–90    │
│  Fix Checkout,  │     │ Storefront Pay,  │     │ Multi-Currency,  │     │ Marketing, SEO,  │
│ Pricing & Stripe│     │ Taxes & Variants │     │ Shipping & Feeds │     │ Scale & Growth   │
└─────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## SPRINT 1: Days 1–15 — Critical Financial Plumbing & Stripe Checkout

### Task 1.1: Fix Real Stripe Checkout Session Integration
- **User Problem**: International merchants (US, EU, UK) cannot upgrade to paid plans because `POST /api/payment/initialize` generates a dummy `cs_sess_` mock ID instead of initiating a real Stripe session, crashing with *"Stripe checkout session URL was not provided"*.
- **Implementation Location**:
  - `backend/package.json` (add `"stripe": "^17.5.0"`)
  - `backend/src/routes/payment.ts:845-865`
  - `worker/index.js:4755-4860`
  - `frontend/src/pages/UpgradePage.tsx:160-167`
- **Dependencies**: Stripe Account API Secret Key & Webhook Secret (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
- **Test Plan**:
  1. Trigger upgrade from US IP / market selection.
  2. Verify HTTP 201 returns valid Stripe Hosted Checkout URL (`https://checkout.stripe.com/c/pay/cs_live_...`).
  3. Complete payment on Stripe sandbox with test card `4242...`.
  4. Verify redirect to `/upgrade?order_id=...` and verify endpoint updates D1 transaction to `completed` and plan to `business`.
- **Definition of Done**: 100% automated end-to-end Stripe payment roundtrip with webhook reconciliation and zero mocked session IDs.
- **Business Metric**: International upgrade conversion rate (0% -> >12%).

### Task 1.2: Purge the ₹1 Plan Discrepancy & Consolidate Pricing Engine
- **User Problem**: Paid plans in India are hardcoded to ₹1 in `worker/index.js` and `frontend/src/config/plans.ts`, causing revenue leakage and massive discrepancies across 5 different pricing files.
- **Implementation Location**:
  - `worker/index.js:3919-3932` (change `1` to `399` and `999`)
  - `worker/index.js:4734-4735` (remove `1` from allowed amounts whitelist)
  - `frontend/src/config/plans.ts:73-88` (restore ₹399 and ₹999)
  - `frontend/src/config/pricing.ts:45-51`
  - `backend/src/services/sarvamAI.ts:69-74` (update system prompt to 3-tier model)
- **Dependencies**: Centralized `config/plans.ts`.
- **Test Plan**:
  1. Initialize Cashfree order for Business plan -> verify amount is exactly ₹399.
  2. Attempt tampering with `amount: 1` -> verify HTTP 400 rejection with `Invalid amount for selected plan`.
- **Definition of Done**: Exactly one canonical plan configuration across the entire stack with zero ₹1 artifacts.
- **Business Metric**: Merchant ARPU (₹1 -> ₹399).

### Task 1.3: Shopper Storefront Online Payment Gateway Integration
- **User Problem**: Shoppers visiting a merchant's store can only order via Offline/COD; there is no online payment gateway on checkout for shoppers to pay the merchant!
- **Implementation Location**:
  - `frontend/src/storefront/components/CartDrawer.tsx:495-505` (add Online Payment radio option)
  - `frontend/src/storefront/runtime/StorefrontProvider.tsx:385-420`
  - `worker/index.js:6629-6930`
  - `backend/src/routes/orders.ts:150-250`
- **Dependencies**: Cashfree / Razorpay / Stripe merchant onboarding credentials.
- **Test Plan**:
  1. Select "Online Payment" in checkout drawer.
  2. Trigger `POST /api/orders/create` with `paymentMethod: 'online'`.
  3. Verify gateway checkout window opens, payment succeeds, and order transitions to `confirmed` with `payment_status: 'paid'`.
- **Definition of Done**: Shoppers can seamlessly pay via UPI/Card at checkout; merchant receives funds.
- **Business Metric**: Storefront checkout conversion rate (+35% lift over COD-only).

### Task 1.4: Fix Test Mock Destructuring in Customer Auth & Hardening Suites
- **User Problem**: `tests/customer-storefront-auth.test.mjs` and `tests/production-hardening-p0.test.mjs` fail due to mock SQL parameter array off-by-one shifting (`customer_email` was inserted without updating mock index unpacking).
- **Implementation Location**:
  - `tests/customer-storefront-auth.test.mjs:468-472`
  - `tests/production-hardening-p0.test.mjs:287-300`
- **Dependencies**: None.
- **Test Plan**: Run `node tests/customer-storefront-auth.test.mjs` and `node tests/production-hardening-p0.test.mjs`.
- **Definition of Done**: Both test suites pass 100% cleanly (0 failed tests).
- **Business Metric**: CI/CD build green; zero regression debt.

---

## SPRINT 2: Days 16–30 — Storefront Variants, Taxes & GST Invoicing

### Task 2.1: Storefront Variant Selection Parity & Legacy Template Sync
- **User Problem**: While `ProductDetailModal.tsx` supports options and variants, legacy template components (`ProductGridSection.tsx`) add simple products without variant selection, and Express `backend/src/routes/orders.ts` lacks the variant snapshot resolution present in the Cloudflare Worker.
- **Implementation Location**:
  - `frontend/src/components/shop/sections/ProductGridSection.tsx:180-245`
  - `backend/src/routes/orders.ts:180-225`
- **Dependencies**: `0008_commerce_foundation_p1.sql` schema.
- **Test Plan**:
  1. Create product with "Size" (S, M, L) and "Color" (Red, Blue) in merchant dashboard.
  2. Visit storefront across all template types.
  3. Verify size/color selector displays, price updates dynamically, and order captures `variant_id` in `order_items`.
- **Definition of Done**: 100% of storefront themes render variant selectors and record variant inventory deductions.
- **Business Metric**: Apparel and footwear merchant onboarding activation (+50%).

### Task 2.2: Automated Indian GST Calculation & Itemized PDF Invoice Generator
- **User Problem**: `tax` is hardcoded to `0` in both Express and Cloudflare Worker. Invoices fail statutory Indian GST compliance (missing CGST/SGST/IGST split and merchant GSTIN).
- **Implementation Location**:
  - `backend/src/models/database.ts` (add `gstin` column to `users` and `shops`)
  - `backend/src/routes/orders.ts:220-250`
  - `worker/index.js:6935-6960`
  - `backend/src/services/pdfService.ts:310-380`
  - `frontend/src/components/shop/InvoiceModal.tsx:80-140`
- **Dependencies**: PDFKit or headless SVG generator.
- **Test Plan**:
  1. Set merchant GSTIN in settings (`27ABCDE1234F1Z5`, Maharashtra).
  2. Place intra-state order (delivery in MH) -> verify 9% CGST + 9% SGST itemized on PDF.
  3. Place inter-state order (delivery in DL) -> verify 18% IGST itemized on PDF.
- **Definition of Done**: Statutory compliant GST tax invoice PDF auto-generated on checkout.
- **Business Metric**: Kirana merchant retention and compliance score (100% legal compliance).

### Task 2.3: Stripe Tax Integration for US & European Markets
- **User Problem**: No sales tax (US) or VAT (EU/UK) is calculated for international orders, exposing merchants to massive tax liabilities.
- **Implementation Location**:
  - `worker/index.js:4650-4750`
  - `backend/src/routes/payment.ts:850-890`
- **Dependencies**: Stripe Tax enabled on Stripe Account.
- **Test Plan**:
  1. Trigger checkout from California address -> verify state + local sales tax calculated.
  2. Trigger checkout from Germany -> verify 19% German MwSt applied.
- **Definition of Done**: Real-time rooftop sales tax and destination VAT calculation via Stripe Tax API.
- **Business Metric**: Zero cross-border tax liability for merchants.

---

## SPRINT 3: Days 31–60 — Multi-Currency, Shipping Carriers & Marketing Feeds

### Task 3.1: Multi-Currency Storefront Engine & Dynamic FX Switcher
- **User Problem**: Shoppers outside India see prices formatted in INR with ₹ symbol; checkout fails for international buyers.
- **Implementation Location**:
  - `frontend/src/storefront/components/StorefrontHeader.tsx` (add Currency Dropdown)
  - `frontend/src/storefront/runtime/StorefrontProvider.tsx`
  - `worker/index.js:6750-6800`
- **Dependencies**: European Central Bank / OpenExchangeRates free daily FX feed cached in Cloudflare Workers KV.
- **Test Plan**:
  1. Switch currency selector from USD to EUR.
  2. Verify all product catalog prices update with psychological charm rounding (.95 / .99).
  3. Checkout in EUR; verify credit card charged in EUR.
- **Definition of Done**: Real-time multi-currency price switching and checkout across USD, EUR, GBP, CAD, AUD, and INR.
- **Business Metric**: International shopper conversion rate (+40%).

### Task 3.2: Automated Shipping Carrier Rates & Label Generation
- **User Problem**: Shipping fee is hardcoded to a flat constant (₹30 or 3000 minor units). Merchants lose money on heavy packages or distant shipments.
- **Implementation Location**:
  - `backend/src/services/shippingService.ts` (new)
  - `backend/src/routes/orders.ts:190-210`
  - `worker/index.js:6830-6835`
- **Dependencies**: Shiprocket API (India) & Shippo API (US/EU).
- **Test Plan**:
  1. Enter delivery postal code in checkout drawer.
  2. Query shipping API -> return real-time standard and express courier rates.
  3. Upon order confirmation in dashboard, click "Generate Label" -> download carrier PDF label with tracking barcode.
- **Definition of Done**: Live carrier rate quotes at checkout and 1-click printable shipping labels.
- **Business Metric**: Merchant fulfillment time reduced from 25 min to 2 min per order.

### Task 3.3: Dynamic Google Shopping & Meta Catalog Product Feeds
- **User Problem**: Merchants cannot run Google Shopping Ads, Instagram Shop, or Facebook Dynamic Product Ads because FeraSetu does not provide product catalog feeds.
- **Implementation Location**:
  - `worker/index.js` (add `/feeds/:storeSlug/google-shopping.xml` and `/feeds/:storeSlug/facebook-catalog.csv`)
  - `backend/src/routes/sitemap.ts`
- **Dependencies**: Storefront product catalog database.
- **Test Plan**:
  1. Fetch `https://[store].ferasetu.com/feeds/google-shopping.xml`.
  2. Validate XML against Google Merchant Center RSS 2.0 schema.
  3. Validate Facebook CSV against Meta Catalog Feed specification.
- **Definition of Done**: Auto-updating XML/CSV feeds containing all active products with prices, images, availability, and currency.
- **Business Metric**: Merchant GMV driven by Google Shopping & Meta Ads (+60%).

---

## SPRINT 4: Days 61–90 — Coupons, Abandoned Carts, SEO & Growth Engine

### Task 4.1: Coupon & Promotional Discount Engine
- **User Problem**: Merchants cannot run marketing promotions, flash sales, or influencer discounts because FeraSetu lacks a discount code system.
- **Implementation Location**:
  - `worker/migrations/0017_discounts_and_promotions.sql` (new)
  - `worker/index.js:6780-6810`
  - `frontend/src/storefront/components/CartDrawer.tsx:350-380` (add Coupon input)
- **Dependencies**: D1 migration.
- **Test Plan**:
  1. Create coupon `WELCOME10` (10% off) with min order ₹500 in admin dashboard.
  2. Apply code in cart drawer -> verify subtotal reduces and discount is recorded in `orders.discount`.
  3. Attempt reusing single-use code -> verify error message.
- **Definition of Done**: Robust coupon engine supporting percentage, fixed amount, and free shipping discounts.
- **Business Metric**: Merchant marketing campaign ROI.

### Task 4.2: Automated Abandoned Cart Recovery Sequences
- **User Problem**: 70% of shoppers abandon carts after entering contact information; merchants have no way to recover lost sales.
- **Implementation Location**:
  - `worker/index.js` (capture incomplete checkout sessions in `checkouts` table)
  - `backend/src/services/cronService.ts`
  - `worker/services/emailService.js` (Brevo abandoned cart template)
- **Dependencies**: Brevo transactional email credentials.
- **Test Plan**:
  1. Enter email and address in checkout drawer, then close tab.
  2. After 2 hours, scheduled cron identifies abandoned checkout.
  3. Verify recovery email dispatched with 1-click cart restoration link.
- **Definition of Done**: Automated recovery email sequence triggered 2 hours and 24 hours after abandonment.
- **Business Metric**: Recovered GMV (10–15% cart recovery rate).

### Task 4.3: Per-Product Canonical SEO Routes & Structured Data
- **User Problem**: Storefront products render inside a single page modal without unique URLs; Google cannot index individual product pages.
- **Implementation Location**:
  - `frontend/src/App.tsx` (add `/shop/:shopName/p/:productSlug` route)
  - `frontend/src/pages/ProductDetailPage.tsx` (new standalone page)
  - `frontend/src/components/SEO.tsx` (full Schema.org/Product JSON-LD)
  - `worker/index.js:9450-9510` (include product URLs in `sitemap.xml`)
- **Dependencies**: TanStack React Query.
- **Test Plan**:
  1. Navigate to `/shop/artisancrafts/p/handcrafted-brass-diya`.
  2. Inspect HTML source -> verify dynamic `<title>`, `<meta name="description">`, Open Graph tags, and Schema.org JSON-LD.
  3. Test URL in Google Rich Results Test -> verify Product rich snippet passes.
- **Definition of Done**: Every product has an indexable, search-engine-optimized canonical landing page.
- **Business Metric**: Organic Google Search impressions and traffic (+150%).

# Frontend Architecture, SaaS 3-Tier Pricing & Positioning Audit Report

**Date**: 2026-08-30  
**Author**: `survey_explorer_2` (Teamwork Explorer Agent)  
**Target Repository**: `frontend/` (FeraSetu Web Platform)  
**Objective**: Comprehensive investigation of frontend architecture, pricing structure, store settings & subscription UI, upgrade triggers, and landing page copy to guide transition to a 3-tier SaaS model (Free ₹0, Business ₹399/mo, Pro ₹999/mo), value-based merchant positioning, and centralized experimentation infrastructure.

---

## 1. Executive Summary

FeraSetu's frontend is a modern React 19 SPA built with Vite, TypeScript, Tailwind CSS, TanStack Query v5, Framer Motion, and WorkOS AuthKit. The application supports dual runtime modes: a Cloudflare Worker edge backend backed by Cloudflare D1 / KV, and an in-browser local storage mock database for offline preview.

### Core Findings & Gaps Identified:
1. **Pricing Inconsistency**: Current configuration (`src/config/plans.ts`) specifies `Free (₹0)`, `Growth (₹299/mo)`, and `Pro (₹799/mo)`. This deviates from the target 3-tier structure: **Free (₹0/mo)**, **Business (₹399/mo - Most Popular)**, and **Pro (₹999/mo - Anchor)**. In addition, legacy plan strings (`basic`, `standard`, `premium`, `growth`, `business`, `scale`) are inconsistently checked in components (e.g. `AnalyticsPage.tsx` checks `user.plan === 'premium' || user.plan === 'pro'`).
2. **Pricing Page & Card UI**: Cards display 12+ verbose features rather than 4–7 crisp, customer outcome-oriented bullets. Hardcoded numbers exists in `ValueCalculator.tsx` (hardcoded ₹299), `PricingFAQ.tsx`, and `UpgradePage.tsx`.
3. **Missing Store Subscription Management UI**: There is no dedicated Subscription/Plan settings tab. In `src/components/Layout.tsx`, the sidebar upgrade box has a hardcoded static "Pro / Unlimited Access" badge with an unlinked button that does not navigate to `/upgrade`.
4. **Contextual Upgrade Triggers**: `ProductsPage.tsx` successfully uses `UpgradePrompt` for product limits, but `AnalyticsPage.tsx` uses raw string comparisons, and other high-value surfaces (e.g., Fera AI assistant, order exports, website builder custom branding) lack smooth, non-intrusive upgrade pathways.
5. **Landing Page Copy Positioning**: Current copy is overly technical and generic ("independent digital commerce", "marketplaces control"). It needs refinement to $100 Startup value-based positioning tailored for Indian shopkeepers: *"Build your online store, accept more orders, and manage your business from one place"*.
6. **Analytics & SaaS Lifecycle Tracking**: Statsig SDK is initialized in `App.tsx` with auto-capture and session replay, but custom domain lifecycle events (`signup_started`, `store_created`, `first_product_added`, `pricing_viewed`, `upgrade_clicked`, `checkout_started`, `subscription_created`, `subscription_cancelled`) are not instrumented.

---

## 2. Frontend Architecture & Technology Stack Map

```
frontend/
├── src/
│   ├── components/
│   │   ├── admin/           # Admin layout & route protection
│   │   ├── pricing/         # PricingCard, FeatureComparison, ValueCalculator, PricingFAQ, FoundingOfferBanner
│   │   ├── public/          # PublicNavbar, PublicFooter, PublicLayout
│   │   ├── shop/            # Public merchant storefront components (TemplateRenderer, Sections)
│   │   ├── ui/              # PlanBadge, UpgradePrompt, OnboardingProgress
│   │   ├── FeedbackWidget.tsx, LanguageSelector.tsx, Layout.tsx, SEO.tsx, WebsiteAIBuilder.tsx
│   ├── config/
│   │   ├── plans.ts         # Single Source of Truth for frontend plans & limits
│   │   └── beta.ts          # Legacy backward compatibility bridge
│   ├── contexts/
│   │   ├── AuthContext.tsx  # WorkOS AuthKit + D1 User Profile synchronization
│   │   └── LanguageContext.tsx # 22+ Indian languages i18n provider
│   ├── i18n/                # Language dictionaries (en, hi, mr, gu, etc.)
│   ├── pages/               # 34 React pages (Landing, Pricing, Dashboard, Products, Orders, etc.)
│   ├── services/
│   │   └── api.ts           # Axios client with fallback local DB simulation (1,178 lines)
│   ├── types/               # TypeScript interfaces for templates, products, etc.
│   ├── App.tsx              # Root routing, Code-splitting (React.lazy), Statsig & AuthKit providers
│   └── main.tsx             # DOM entrypoint
```

### Key Dependencies (`package.json`):
- **Core Framework**: React `19.2.4`, React DOM `19.2.4`, Vite `8.0.4`, TypeScript `5.3.3`
- **Routing**: `react-router-dom` `7.14.0`
- **State & Data Fetching**: `@tanstack/react-query` `5.97.0`, `zustand` `4.5.5`
- **Auth**: `@workos-inc/authkit-react` `0.16.1`
- **Analytics & Flags**: `@statsig/react-bindings` `3.33.3`, `@statsig/web-analytics` `3.33.3`, `@statsig/session-replay` `3.33.3`
- **UI & Animation**: `framer-motion` `11.15.0`, `lucide-react` `1.8.0`, `tailwindcss` `3.4.19`, `recharts` `3.8.1`, `react-hot-toast` `2.6.0`

---

## 3. Detailed Page-by-Page Audit & Findings

| Page / Component | File Path | Current Functionality & Role | Gaps & Required Upgrades |
|---|---|---|---|
| **Landing Page** | `src/pages/LandingPage.tsx` | Main marketing landing page with hero, problem breakdown, 3-step solution, feature grid, testimonial, pricing preview, and CTA. | Hero copy is feature-heavy. Pricing preview renders outdated plan names (`Growth`) and prices (`₹299`). Needs customer-outcome copy and live pricing tied to centralized config. |
| **Pricing Page** | `src/pages/PricingPage.tsx` | Public pricing page with hero, trust badges, billing toggle (monthly/annual), 3 cards, founding offer banner, outcome grid, comparison table, value calculator, and FAQ. | Shows `Free`, `Growth (₹299)`, `Pro (₹799)`. Needs transition to `Free (₹0)`, `Business (₹399 - Most Popular)`, `Pro (₹999 - Anchor)`. FAQ and ValueCalculator have hardcoded ₹299 references. |
| **Pricing Card** | `src/components/pricing/PricingCard.tsx` | Card renderer with "Most Popular" ribbon, pricing switch, outcome callout, feature list with Check/X, CTA button. | Accent styles hardcoded to `growth` and `pro`. Needs update for `business` tier highlighting, 4–7 focused feature bullets, and clean comparison. |
| **Feature Comparison** | `src/components/pricing/FeatureComparison.tsx` | Full comparison table comparing Store, Operations, Analytics, Fera AI, Support, and Team features. | Column header hardcoded to `Growth` and `₹299`. Table categories must reflect new tier capabilities cleanly. |
| **Value Calculator** | `src/components/pricing/ValueCalculator.tsx` | Interactive ROI calculator with orders/week & average order value sliders. | Hardcoded to calculate `monthlyPlanCost` against Growth (₹299). Needs to support dynamic A/B test pricing and Business tier (₹399). |
| **Founding Offer Banner** | `src/components/pricing/FoundingOfferBanner.tsx` | Banner for early shopkeeper cohorts with slot count fetched from API. | Works well with backend toggle, but `offerPlan` defaults to `growth` instead of `business`. |
| **Upgrade Page** | `src/pages/UpgradePage.tsx` | In-app upgrade page for authenticated merchants. Shows current plan badge, comparison, and triggers `/payment/initialize`. | Calls `/payment/initialize` with `plan.id`. Handles beta free activation and placeholder payment flow. Needs Business tier styling and clear checkout metadata. |
| **Store Layout & Sidebar** | `src/components/Layout.tsx` | Main merchant shell with navigation, search, notifications, language switcher, user profile, and sidebar upgrade widget. | **Critical Gap**: Sidebar upgrade widget is static hardcoded text ("Pro / Unlimited Access") with unlinked button. Must display actual `user.plan` via `PlanBadge` or dynamic upgrade CTA linking to `/upgrade`. |
| **Dashboard** | `src/pages/DashboardPage.tsx` | Merchant command center with greeting, sales stats, revenue area chart, top products, order status donut, Fera AI widget, and AI credits meter. | Uses `getPlanLimits(user?.plan)`. Lacks proactive contextual limit warnings (e.g. when approaching 25 products or monthly AI quota). |
| **Products Page** | `src/pages/ProductsPage.tsx` | Catalog management, adding/editing products, cost price / margin calculator, stock alerts. | Properly uses `hasReachedProductLimit` and `UpgradePrompt` (inline & banner). Needs limits updated for Business (full catalog/500+) and Free (25). |
| **Orders Page** | `src/pages/OrdersPage.tsx` | Order table with status filter tabs, customer details modal, OTP delivery handshake, and printable invoice generator. | High-value retention surface. Invoices and order exports could highlight merchant branding tier features. |
| **Analytics Page** | `src/pages/AnalyticsPage.tsx` | Revenue throughput, order volume, category breakdown, and AI Predictive Intelligence. | **Bug**: Gating checks `user?.plan === 'premium' || user?.plan === 'pro' || user?.plan === 'standard'` directly instead of using `canUseFeature(user?.plan, 'advancedAnalytics')`. |
| **AI Assistant / Fera AI** | `src/pages/AIAssistantPage.tsx` & `src/pages/FeraAIPage.tsx` | Conversational copilots for website building, product copywriting, sales advice, and quick actions. | Ties into `user.ai_credits_balance`. Needs contextual upgrade triggers when credits deplete, linking to `UpgradePage` or `AICreditsPage`. |
| **AI Credits Page** | `src/pages/AICreditsPage.tsx` | Buy extra AI credit packs (₹149, ₹499, ₹1299) for heavy AI users. | Clean credit pack checkout. Complements monthly subscription quotas without blocking store operations. |
| **Email Settings** | `src/pages/EmailSettingsPage.tsx` | Custom SMTP server configuration for OTP emails, provider defaults (Gmail, SendGrid, SES), test email sender. | Currently the only settings page under `/settings/*`. |
| **Website Builder** | `src/pages/WebsiteBuilderPage.tsx` | Visual store editor with section configurator (Hero, Navbar, Banner, Product Grid, Contact, Footer) and AI generator. | Could display "Remove FeraSetu Branding" toggle gated on Pro plan. |

---

## 4. Audit of Current Pricing Model vs. Target 3-Tier SaaS Structure

### Plan Comparison Matrix:

| Dimension | Current Config (`config/plans.ts`) | Target Required 3-Tier Model | Gap & Required Change |
|---|---|---|---|
| **Tier 1 (Acquisition)** | **Free (₹0/mo)**<br>Tagline: *Shuruwaat karo, bina kisi risk ke.*<br>Limits: 25 products, 20 AI credits/mo, standard branding. | **Free (₹0/mo)**<br>Outcome: *Launch your store and start taking orders with zero risk.*<br>Limits: 25 products, 20 AI credits/mo, standard branding, 1 staff account. | Retain Free tier. Refine feature bullets from 12 down to 4–5 customer-outcome points. |
| **Tier 2 (Growth / Main)** | **Growth (₹299/mo, ₹2990/yr)**<br>Tagline: *Apne business ko seriously chalao.*<br>Limits: 500 products, 200 AI credits/mo, advanced analytics. | **Business (₹399/mo, ₹3990/yr - Most Popular)**<br>Outcome: *Grow your sales, automate order processing, and look 100% professional.*<br>Limits: 500 products, 200 AI credits/mo, full analytics & profit tracking, WhatsApp automation, professional invoices, priority support. | Rename canonical tier ID from `growth` to `business`. Update pricing from ₹299 to **₹399/mo** (₹3,990/yr). Update `LEGACY_PLAN_MAP` so `growth`, `starter`, `basic`, `standard` alias to `business`. |
| **Tier 3 (Anchor / Scale)** | **Pro (₹799/mo, ₹7990/yr)**<br>Tagline: *Scale karo, grow karo.*<br>Limits: Unlimited products, 1000 AI credits/mo. | **Pro (₹999/mo, ₹9990/yr - Anchor)**<br>Outcome: *Scale your retail operations with unlimited products, advanced AI forecasting, and dedicated priority assistance.*<br>Limits: Unlimited products, 1,000 AI credits/mo, advanced AI analysis/forecasting, white-label branding, priority support, multi-staff ready. | Update pricing from ₹799 to **₹999/mo** (₹9,990/yr). Streamline feature list to 5–7 high-impact enterprise/power retailer capabilities. |

### Legacy Plan ID Mapping Strategy:
In `frontend/src/config/plans.ts`:
```ts
export type PlanId = 'free' | 'business' | 'pro';

export const LEGACY_PLAN_MAP: Record<string, PlanId> = {
  // Free aliases
  free: 'free',
  beta: 'free',
  trial: 'free',
  
  // Business aliases
  business: 'business',
  growth: 'business',
  basic: 'business',
  starter: 'business',
  standard: 'business',
  
  // Pro aliases
  pro: 'pro',
  premium: 'pro',
  scale: 'pro',
  enterprise: 'pro',
};
```

---

## 5. Subscription UX & Store Settings Architecture

### Current Problem:
1. When merchants click "Settings", only `/settings/email` exists. There is no place for a merchant to view their active plan, renewal date, usage gauges, or manage their subscription.
2. In `Layout.tsx`, the sidebar displays a static mock card with hardcoded Pro plan details.

### Recommended Implementation:
1. **Dynamic Sidebar Plan Widget (`src/components/Layout.tsx`)**:
   - Replace the static card with dynamic values from `user.plan`:
   - If user is on `free`: Show "Free Plan" with a high-visibility "Upgrade to Business (₹399)" CTA linking to `/upgrade`.
   - If user is on `business`: Show "Business Plan" with "Active" badge and "Manage / Upgrade to Pro" link.
   - If user is on `pro`: Show "Pro Plan" with "Active" badge.
2. **Dedicated Store & Subscription Settings View**:
   - Add `/settings` or `/settings/subscription` route (or a tabbed Settings view with General, Subscription, and Email).
   - **Subscription Tab**:
     - Current Plan Badge & Tier details.
     - Usage Gauges: Products used (`products.length` / `limit`), AI credits used (`ai_credits_used_month` / `monthly_limit`), Storage used.
     - Renewal / Expiry Date (`plan_expires_at`).
     - Actions: "Change Plan" (navigates to `/upgrade`), "Cancel Subscription / Downgrade to Free" with modal confirming data remains intact and access continues until end of billing cycle.

---

## 6. Contextual Upgrade Triggers & Limit Gating Blueprint

To ensure a smooth user experience following $100 Startup principles (zero dark patterns, non-intrusive value nudges):

1. **Catalog Limit (Products Page)**:
   - **Near Limit (>= 80% of limit)**: Inline non-blocking banner: *"You've used 21 of 25 product slots. Upgrade to Business for 500 products."*
   - **At Limit (100%)**: Sticky alert banner + modal guard preventing the 26th product add with CTA: *"Explore Business — ₹399/mo"*. Existing products remain active and editable.
2. **AI Forecast & Predictive Analytics (Analytics Page)**:
   - Use `canUseFeature(user?.plan, 'advancedAnalytics')`.
   - On Free plan: Analytics dashboard displays core metrics (Revenue, Orders, AOV). The AI Forecasting card displays a preview banner: *"Unlock Predictive Run-rate & Restock Intelligence with Business / Pro"*.
3. **White-Label & Custom Branding (Website Builder / Store Settings)**:
   - Gated on Pro tier.
   - "Remove 'Powered by FeraSetu' badge" toggle displays inline badge: *"Available on Pro (₹999/mo)"*.
4. **Order Volume & Invoicing**:
   - Free plan gets standard order management and basic invoices.
   - Professional PDF invoice customizer displays a 1-click preview with upgrade link to Business.

---

## 7. Landing Page & Value-Based Positioning for Indian Shopkeepers

### Copy Transition Matrix:

| Section | Current Feature-Centric Copy | Upgraded Value-Based Copy ($100 Startup / Merchant Focus) |
|---|---|---|
| **Hero Badge** | `INDEPENDENT DIGITAL COMMERCE` | `FOR INDIAN SHOPKEEPERS & LOCAL RETAILERS` |
| **Hero Title** | *Your business deserves a better way to sell online.* | *Apni dukaan ko online le jao. Orders badhao, business sambhalo — ek hi jagah se.*<br>*(Build your online store, accept more orders, and manage your business from one place.)* |
| **Hero Subtitle** | *Stop giving away your profits to marketplaces and losing track of orders on WhatsApp. Launch your own independent store, own your customers, and grow your business on your terms.* | *No technical knowledge required. Get your own store link, take orders directly on WhatsApp with UPI payments, and let Fera AI help you manage inventory and restock smoothly.* |
| **Hero CTAs** | `Start Free Today` / `See how it works` | `Start Free (₹0)` (Primary) / `See Pricing Plans` (Secondary) |
| **Trust Badges** | `No credit card required` · `Setup in 5 minutes` | `₹0 to start · No credit card required` · `Ready in 5 minutes` · `100% Data in India` |
| **Problem 1** | *The WhatsApp Chaos — Orders lost in endless chats.* | *Lost WhatsApp Orders — No more digging through 50 chat threads to find who ordered what.* |
| **Problem 2** | *Marketplace Control — Aggregators take massive commissions.* | *Zero Commission — Stop paying 15–30% of your hard-earned revenue to aggregators.* |
| **Problem 3** | *Digital Confusion — Building a website requires agencies and code.* | *No Developers Needed — Add products from your phone, share your link, and start selling today.* |
| **Pricing Preview** | Lists Free, Growth ₹299, Pro ₹799 | Lists **Free (₹0)**, **Business (₹399/mo - Recommended)**, **Pro (₹999/mo)** with 4 essential outcomes per card. |

---

## 8. Centralized Pricing & Experimentation Infrastructure

### Plan Configuration Design (`src/config/plans.ts`):
```ts
export type PlanId = 'free' | 'business' | 'pro';

export interface PlanPrice {
  monthly: number;
  yearly: number;
  yearlyPerMonth: number;
}

export interface PlanLimits {
  products: number;
  aiCreditsPerMonth: number;
  storageBytes: number;
  customDomain: boolean;
  advancedAnalytics: boolean;
  staffAccounts: number;
  removeBranding: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  displayName: string;
  tagline: string;
  outcome: string;
  price: PlanPrice;
  limits: PlanLimits;
  features: { label: string; included: boolean; note?: string }[];
  highlighted?: boolean;
  ctaText: string;
  ctaHref: string;
}
```

### Controlled A/B Pricing Variant Infrastructure:
To support testing price points for the Business tier (e.g. ₹299 vs ₹399 vs ₹499):
```ts
export function getBusinessPlanPrice(variant: 'control_399' | 'variant_299' | 'variant_499' = 'control_399'): PlanPrice {
  switch (variant) {
    case 'variant_299':
      return { monthly: 299, yearly: 2990, yearlyPerMonth: 249 };
    case 'variant_499':
      return { monthly: 499, yearly: 4990, yearlyPerMonth: 415 };
    case 'control_399':
    default:
      return { monthly: 399, yearly: 3990, yearlyPerMonth: 332 };
  }
}
```

### Core Business Metrics Tracking Blueprint:
Create `src/utils/analytics.ts` instrumenting the 12 SaaS lifecycle events:

```ts
import statsig from 'statsig-js';

export type SaaSAnalyticsEvent =
  // Acquisition
  | 'signup_started'
  | 'signup_completed'
  // Activation
  | 'store_created'
  | 'first_product_added'
  | 'first_order_received'
  | 'first_ai_action'
  // Monetization
  | 'pricing_viewed'
  | 'upgrade_clicked'
  | 'checkout_started'
  | 'subscription_created'
  // Retention & Churn
  | 'subscription_renewed'
  | 'subscription_cancelled';

export function trackEvent(eventName: SaaSAnalyticsEvent, metadata: Record<string, any> = {}) {
  try {
    if (typeof window !== 'undefined') {
      // 1. Statsig logEvent
      (window as any).statsig?.logEvent?.(eventName, null, metadata);
      
      // 2. Custom dispatch event for in-app listeners
      window.dispatchEvent(new CustomEvent('fera-analytics-event', { detail: { eventName, metadata } }));
    }
  } catch (err) {
    console.debug('[Analytics] Failed to track event:', eventName, err);
  }
}
```

---

## 9. Implementation Roadmap & Concrete Proposals

### Phase 1: Configuration & Centralization
1. Update `src/config/plans.ts`:
   - Rename canonical tier `growth` -> `business`.
   - Update prices: Free (₹0), Business (₹399/mo, ₹3,990/yr), Pro (₹999/mo, ₹9,990/yr).
   - Update `LEGACY_PLAN_MAP` to cleanly map `growth`, `basic`, `standard` -> `business`.
   - Streamline features to 4–7 customer-outcome bullets per plan.
   - Add pricing variant helper for experimentation.

### Phase 2: Pricing Page & Landing Page Updates
1. `src/pages/PricingPage.tsx` & `src/components/pricing/PricingCard.tsx`:
   - Update styling and visual highlight on `business` card.
   - Remove hardcoded ₹299 strings in `ValueCalculator.tsx` and `PricingFAQ.tsx`.
2. `src/pages/LandingPage.tsx`:
   - Update hero and section messaging with value-based Indian merchant positioning.
   - Update pricing preview grid to render Free / Business ₹399 / Pro ₹999.
3. `src/i18n/en.ts` & language files:
   - Update translation keys for `plan.business.name`, `plan.feature.*`, and hero value propositions.

### Phase 3: In-App Upgrade System & Settings UX
1. `src/components/Layout.tsx`:
   - Connect sidebar upgrade box dynamically to `user.plan`.
   - Link upgrade button to `/upgrade`.
2. `src/pages/UpgradePage.tsx`:
   - Update tier cards and checkout payload for Business (₹399) and Pro (₹999).
3. Contextual Gating Cleanups:
   - `src/pages/AnalyticsPage.tsx`: Replace raw plan string checks with `canUseFeature(user?.plan, 'advancedAnalytics')`.
   - `src/components/ui/PlanBadge.tsx`: Update style mapping for `business` tier (⚡ / #FF6B35).
   - `src/services/api.ts`: Update mock payment initializer to recognize `business` tier and validate expected amounts.

### Phase 4: Lifecycle Analytics Instrumentation
1. Create `src/utils/analytics.ts`.
2. Instrument:
   - `PricingPage.tsx` -> `trackEvent('pricing_viewed')`
   - `PricingCard.tsx` / `UpgradePrompt.tsx` -> `trackEvent('upgrade_clicked', { targetPlan, source })`
   - `UpgradePage.tsx` -> `trackEvent('checkout_started', { plan, billing })` and `trackEvent('subscription_created', { plan })`
   - `ProductsPage.tsx` -> `trackEvent('first_product_added')` on first product.

---

## 10. Conclusion

The frontend codebase is well-structured, modular, and ready for the 3-tier SaaS upgrade. The changes required are localized to config modules, pricing UI components, copy strings, and contextual trigger points. Following this plan will establish a cohesive pricing foundation, value-focused customer messaging, and solid monetization infrastructure without degrading any existing merchant workflows.

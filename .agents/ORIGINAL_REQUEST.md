# Original User Request

## 2026-08-30T06:12:08Z

Audit and upgrade FeraSetu's product positioning, 3-tier SaaS pricing model (Free ₹0, Business ₹399/mo, Pro ₹999/mo), value-based upgrade prompts, centralized experimentation infrastructure, and business metrics tracking following $100 Startup principles while preserving all working core features.

Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Integrity mode: development

## Requirements

### R1. Comprehensive Audit & Value-Based Positioning
Inspect the entire codebase (frontend, backend, Cloudflare worker, database schema, and pricing/plan configs) and transition product messaging from technical feature dumping to customer outcome-oriented copy tailored for Indian shopkeepers ("Build your online store, accept more orders, and manage your business from one place").

### R2. 3-Tier Pricing & Conversion-Optimized Pricing Page
Consolidate customer-facing plans into exactly 3 clear tiers:
- **Free (₹0/mo)**: Acquisition funnel with core essentials (limited catalog, basic AI, standard branding).
- **Business (₹399/mo - Most Popular)**: Main growth tier with full catalog, custom branding, full AI assistant, order dashboard, and business automation.
- **Pro (₹999/mo - Anchor)**: Serious retailer tier with high/unlimited catalog, advanced AI, priority support, and multi-staff/analytics.
Redesign the pricing page UI around "Which plan is right for you?" with clean cards, clear monthly pricing, 4–7 essential features, and zero dark patterns.

### R3. Contextual Upgrade System & Subscription UX
Implement logical, non-intrusive in-app upgrade triggers (e.g. reaching product catalog limits, accessing advanced AI forecasting, or high order volume). Design recurring value UX (plan badges, subscription status, renewal info, and clean cancellation/downgrade behavior).

### R4. Centralized Pricing & Experimentation Infrastructure
Centralize all plan definitions and feature limits in a single configuration module (`config/plans.ts`) across frontend and worker/backend to eliminate hardcoded values. Build infrastructure to support controlled pricing A/B variants (e.g. ₹299 vs ₹399 vs ₹499) and track monetization events.

### R5. Core Business Metrics Tracking
Instrument or refine privacy-respecting analytics events across the full SaaS lifecycle:
- Acquisition (`signup_started`, `signup_completed`)
- Activation (`store_created`, `first_product_added`, `first_order_received`, `first_ai_action`)
- Monetization (`pricing_viewed`, `upgrade_clicked`, `checkout_started`, `subscription_created`)
- Retention & Churn (`subscription_renewed`, `subscription_cancelled`)

### R6. Landing Page Copy & $100 Startup Optimization
Refine landing page hero and value props to communicate WHO (Indian small retailers), PROBLEM (fragmented order & inventory handling), SOLUTION (all-in-one store + orders + AI), and clear CTAs ("Start Free" & "See Pricing") with low operational overhead and serverless edge cost efficiency.

## Acceptance Criteria

### Pricing & Architecture
- [ ] Centralized configuration in `config/plans.ts` (and shared types) cleanly defines Free (₹0), Business (₹399), and Pro (₹999) with explicit limits and capabilities.
- [ ] Worker API and Express backend enforce product limits and feature gating based on centralized tier definitions.
- [ ] Pricing page renders exactly 3 transparent cards with Business visually highlighted as "Most Popular" and no technical jargon.

### User Experience & Gating
- [ ] Contextual upgrade triggers appear smoothly when a user reaches tier limits (e.g., adding 26th product on Free plan) without blocking existing store operations.
- [ ] Subscription status, current plan badge, and straightforward downgrade/cancel flows are accessible in store settings.
- [ ] Landing page messaging emphasizes clear merchant outcomes without unsupported or exaggerated revenue guarantees.

### Analytics & Verification
- [ ] Analytics events for acquisition, activation, monetization, and retention fire reliably with proper payload metadata.
- [ ] All existing test suites and typechecks pass (`npm test` in backend, `npm run build` in frontend, 0 TypeScript errors).
- [ ] No existing store, order, authentication, or AI functionality is broken or degraded.

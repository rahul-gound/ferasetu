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

## 2026-09-05T09:37:41Z

Use a very large team of agents.
Perform a comprehensive audit, automated verification, performance speedup, UI consistency fix, and defensive security review across every page and route in FeraSetu.

Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Integrity mode: development

## Requirements

### R1. Multi-Page & Route Functional Verification
Audit and test every public, SEO, authenticated merchant, and admin route:
- Public: `/`, `/pricing`, `/terms`, `/privacy`, `/login`, `/register`, `/online-dukaan-banaye`, `/free-online-store`, `/shopify-alternative-india`, `/kirana-store-online`
- Merchant: `/dashboard`, `/products`, `/orders`, `/analytics`, `/fera-ai`, `/ai-assistant`, `/ai-credits`, `/website-builder`, `/settings/email`, `/survey-feedback`, `/refer-earn`, `/upgrade`, `/support`, `/get-started`
- Verify that every route loads without JavaScript exceptions, uncaught runtime errors, or broken component lifecycle states in both empty and populated database scenarios.

### R2. Frontend Speed & Bundle Performance Optimization
Inspect Vite build chunks, package dependencies, dynamic imports, and component re-render loops:
- Optimize code splitting and lazy loading so initial route transitions are near-instant.
- Eliminate redundant re-fetching, unnecessary query re-renders, and heavy unmemoized calculations in charts and tables.
- Verify asset loading and icon bundle sizes.

### R3. UI Consistency & Visual Polish
Ensure visual harmony and responsive polish across all screens:
- Verify typography, spacing, active navigation pill styling, card borders, and color contrasts.
- Ensure consistent empty states, error fallbacks, and mobile responsiveness across desktop, tablet, and mobile viewports.

### R4. Defensive Security & Route Access Hardening
Review and harden authentication, authorization, and endpoint protection:
- Ensure protected merchant and admin routes strictly enforce authentication and redirect unauthenticated users without exposing sensitive merchant state.
- Audit API requests for proper token attachment, CORS origin headers, input sanitization against XSS, and proper error response masking.

## Acceptance Criteria

### Build & Compilation Integrity
- [ ] `npm run build` in `frontend/` succeeds with 0 TypeScript compilation errors and 0 syntax warnings.
- [ ] All code-split chunk references and lazy routes resolve without net::ERR_FAILED or 404 chunk errors.

### Route & Component Quality
- [ ] Navigating through all merchant routes (`/dashboard`, `/products`, `/orders`, `/analytics`, `/fera-ai`, `/ai-assistant`, `/ai-credits`, `/website-builder`, `/settings/email`, `/refer-earn`, `/upgrade`, `/support`) produces zero console errors.
- [ ] All interactive buttons, modals, dropdowns, and download triggers have valid click handlers and state feedback.

### Performance
- [ ] Initial bundle and code-split chunks comply with Vite performance budgets.
- [ ] Dashboard charts render smoothly without perceptible UI hitching or layout shifts.

### Defensive Security
- [ ] Unauthenticated access to `/dashboard`, `/orders`, `/products`, `/refer-earn`, and `/settings/*` is intercepted and cleanly redirected to `/login`.
- [ ] User input fields across store setup, product creation, and assistant queries properly sanitize inputs.

## 2026-10-01T11:23:41Z

Audit FeraSetu's external integrations, implement a merchant-friendly Domains & Email system (with automatic FeraSetu mail default, custom domain connection, domain purchasing via provider abstraction, transactional templates, and AI email assistant), and harden security and tenant isolation across Cloudflare Workers and D1.

Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Integrity mode: development

## Requirements

### R1. External Integration Audit & Canonical Service Layer
Produce a factual inventory of all external services, APIs, SDKs, webhooks, and storage providers across the repository. Quarantining or removing legacy/dead systems (such as legacy Appwrite, MySQL/SQLite fallbacks, obsolete analytics/payments), and formalize the core server-side integrations (WorkOS, Cashfree, Backblaze B2, FeraSetu SMTP/Email, Turnstile, and AI) into structured, typed, tenant-isolated worker service modules with strict secret protection and idempotency.

### R2. Merchant Domains & Email Dashboard Experience
Replace the complex SMTP configuration UX with a modern, high-trust "Domains & Email" dashboard area adhering to FeraSetu's design language (blue + white + orange, low-radius, clean typography):
- **Domains Tab**: Display active domains (FeraSetu subdomain, custom domains, purchased domains), status badges, connection states (Store / Email), and actions (Connect domain, Buy domain, Manage, DNS setup).
- **Email Tab**: Default active state using FeraSetu Mail (`orders@{store-slug}.ferasetu.com`) with zero SMTP configuration required by normal merchants. Technical SMTP settings must be relegated to an expandable Advanced section.
- **Sender Identity & Real Reply-To**: Configure sender aliases (`orders@`, `support@`, `billing@`, etc.) and map customer replies to the merchant's verified account or store email.

### R3. Pluggable Domain Provider & Purchase/Connect Architecture
Implement an abstracted `DomainProvider` interface with methods for searching domains, checking availability, fetching authoritative pricing, registering domains, checking DNS/status, and handling provider webhooks. Integrate domain purchasing with FeraSetu's established Cashfree billing architecture, strictly validating amounts on the server to prevent price tampering. Implement guided DNS verification (TXT/CNAME/SPF/DKIM/DMARC) for externally connected domains with copy buttons, error guidance, and re-check actions.

### R4. Transactional Email Engine, Templates & AI Assistant
Deliver a centralized transactional email engine supporting predefined and custom templates (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`):
- **Variable Registry**: Implement strict `{{variable}}` interpolation with HTML sanitization to prevent XSS and injection attacks.
- **Template Editor & Preview**: Provide a merchant-friendly editor with real-time preview (using realistic sample data) and a working "Send test email" function using the configured provider.
- **AI Email Assistant**: Provide structured AI tool actions (`get_email_settings`, `update_email_sender`, `update_reply_to`, `list_email_templates`, `update_email_template`, `send_test_email`) with change history and undo support, requiring explicit user confirmation for destructive or provider changes.
- **Delivery Activity**: Render an immutable delivery log showing recipient, template, sender, provider, timestamp, and status.

### R5. Security, Tenant Isolation & Production Hardening
Enforce strict tenant isolation across all domain, email, template, and webhook endpoints (`authenticated user -> organization membership -> resource verification`). Ensure no secrets (SMTP passwords, B2 application keys, Cashfree secrets, AI keys) leak into browser responses, logs, or AI context. Prevent IDOR, SSRF during DNS verification, email header injection, and sender address spoofing.

## Verification Resources
- Existing test suites: `tests/production-email-architecture.test.mjs`, `tests/production-email-integration.test.mjs`, `tests/cashfree-payment-verification.test.mjs`, `tests/production-hardening-p0.test.mjs`.
- Existing schema & migrations: `worker/schema.sql`, `worker/migrations/0014_production_email_architecture.sql`, `worker/migrations/0015_payment_hardening_and_test_mode.sql`, `worker/migrations/0016_privacy_first_analytics.sql`.
- Email service & crypto implementations: `worker/services/emailService.js`, `worker/services/emailCrypto.js`, `worker/services/externalSmtpClient.js`.

## Acceptance Criteria

### Integration Inventory & Clean Architecture
- [ ] Comprehensive inventory report generated classifying all repo integrations as REQUIRED, OPTIONAL, NOT NEEDED, or LEGACY/REMOVE.
- [ ] All external API credentials isolated server-side; zero secrets present in frontend bundles, client payloads, or logs.
- [ ] Cashfree webhook verification enforced with HMAC signature validation, idempotency key checks, and verified state transitions.

### Domains & Email UI/UX
- [ ] Navigation presents unified "Domains & Email" page with "Domains" and "Email" tabs; raw "SMTP" is omitted from primary navigation.
- [ ] Fresh merchant accounts automatically show active FeraSetu Mail with their canonical store slug without configuration.
- [ ] Reply-To email accurately defaults to the merchant's real account/store email, routing replies while preserving DKIM/SPF alignment.
- [ ] Custom domain flow provides copyable DNS records (TXT ownership, DKIM, SPF, DMARC) with live verification polling and error states.
- [ ] Domain search queries real availability and pricing through `DomainProvider` abstraction without client-side spoofing.

### Transactional Email Service & Templates
- [ ] Transactional engine successfully dispatches test and event-driven emails through the underlying FeraSetu mail gateway.
- [ ] Template engine validates registered `{{variable}}` tags, rejects unknown variables, and sanitizes output against HTML/script injection.
- [ ] Template editor includes live sample preview and a functional test send to the merchant's verified address.
- [ ] AI email tools allow safe modifications of subjects, bodies, and aliases with version history and undo capability, while disallowing unconfirmed provider flips.
- [ ] Recent delivery activity table renders live delivery statuses without exposing sensitive email body payloads.

### Multi-Tenant Isolation & Verification Tests
- [ ] Automated tests verify cross-tenant access rejection (Tenant A cannot view, mutate, or send emails from Tenant B's domains or templates).
- [ ] Automated tests verify that sender spoofing is blocked for unverified custom domains.
- [ ] Unit and integration test suites pass for email delivery, template rendering, DNS verification, and domain checkout validation.
- [ ] TypeScript type-checking and lint checks pass without errors across worker and frontend codebases.

# Handoff Report — survey_explorer_2

## 1. Observation
- **Frontend Architecture**: React 19 SPA with Vite, TypeScript, Tailwind CSS, TanStack Query v5, Framer Motion, WorkOS AuthKit (`@workos-inc/authkit-react`), and Statsig SDK (`@statsig/react-bindings`).
- **Routing & Pages (`src/App.tsx`)**:
  - Public routes: `LandingPage`, `PricingPage`, `LoginPage`, `RegisterPage`, SEO pages (`OnlineDukaanBanaye`, `FreeOnlineStore`, `ShopifyAlternativeIndia`, `KiranaStoreOnline`), `TermsPage`, `PrivacyPage`.
  - Merchant protected routes: `DashboardPage`, `ProductsPage`, `OrdersPage`, `AnalyticsPage`, `AIAssistantPage`, `FeraAIPage`, `AICreditsPage`, `WebsiteBuilderPage`, `EmailSettingsPage`, `UpgradePage`, `SupportPage`.
  - Admin routes: `AdminLogin`, `AdminDashboardPage`, `AdminUsersPage`, `AdminShopsPage`, `AdminOrdersPage`, etc.
- **Pricing & Tier Implementation (`src/config/plans.ts`)**:
  - Current configuration uses `free` (₹0), `growth` (₹299/mo, ₹2990/yr), `pro` (₹799/mo, ₹7990/yr).
  - Target requirement is 3 tiers: Free (₹0/mo), Business (₹399/mo - Most Popular), Pro (₹999/mo - Anchor).
  - Legacy map aliases `basic` & `standard` to `growth`, `business` & `scale` to `pro`.
  - Feature lists have 12 items per card with mixed technical phrasing.
- **Pricing Page & Components**:
  - `src/pages/PricingPage.tsx`, `src/components/pricing/PricingCard.tsx`, `src/components/pricing/FeatureComparison.tsx`, `src/components/pricing/ValueCalculator.tsx`, `src/components/pricing/PricingFAQ.tsx`, `src/components/pricing/FoundingOfferBanner.tsx`.
  - `ValueCalculator.tsx` lines 15-17 and `PricingFAQ.tsx` lines 24, 28 contain hardcoded references to Growth at ₹299/mo.
- **Store Settings & Subscription UX**:
  - Under `/settings/*`, only `EmailSettingsPage.tsx` (`/settings/email`) exists. There is no dedicated store settings or subscription management view showing active plan, renewal info, or downgrade options.
  - In `src/components/Layout.tsx` lines 88-98, the sidebar upgrade box displays static text `"Pro / Unlimited Access"` with an unlinked button that does not navigate to `/upgrade` or inspect `user.plan`.
- **Gating & Contextual Upgrade Triggers**:
  - `src/pages/ProductsPage.tsx` correctly checks `hasReachedProductLimit` and displays `UpgradePrompt` (inline & banner).
  - `src/pages/AnalyticsPage.tsx` lines 106 & 274 directly check raw plan strings `user?.plan === 'premium' || user?.plan === 'pro' || user?.plan === 'standard'` instead of helper `canUseFeature(user?.plan, 'advancedAnalytics')`.
  - `src/components/ui/PlanBadge.tsx` supports `free`, `growth`, `pro` styles.
- **Landing Page Copy (`src/pages/LandingPage.tsx`)**:
  - Current hero and section messaging focus on generic SaaS descriptions ("independent digital commerce", "marketplaces control").
  - Pricing preview grid displays outdated ₹299 and ₹799 prices.
- **Analytics Event Tracking**:
  - Statsig SDK is initialized in `src/App.tsx`, but domain lifecycle events (`signup_started`, `store_created`, `first_product_added`, `pricing_viewed`, `upgrade_clicked`, `checkout_started`, `subscription_created`, etc.) are not instrumented.

## 2. Logic Chain
1. **From Tier Requirements to Config Updates**: The target 3-tier SaaS structure requires updating `src/config/plans.ts` so that `PlanId` is `'free' | 'business' | 'pro'`, with prices `0`, `399`, and `999`. The `LEGACY_PLAN_MAP` must map legacy identifiers (`basic`, `starter`, `standard`, `growth`) to `business`, and (`pro`, `premium`, `scale`, `business`) properly to `pro`.
2. **From Card Clutter to Outcome Positioning**: Replacing 12 technical bullet points with 4–7 customer outcome-focused bullets reduces decision friction for Indian shopkeepers while maintaining full transparency.
3. **From Static UI to Dynamic Subscription UX**: Making the sidebar in `Layout.tsx` reflect `user.plan` and routing upgrade clicks to `/upgrade` ensures merchants always know their active plan and how to expand catalog or AI limits.
4. **From Hardcoded Checks to Centralized Helper**: Replacing raw strings in `AnalyticsPage.tsx` with `canUseFeature(user?.plan, 'advancedAnalytics')` prevents subtle entitlement bugs across legacy user accounts.
5. **From Generic Copy to $100 Startup Merchant Outcomes**: Adjusting landing page copy to "Build your online store, accept more orders, and manage your business from one place" and addressing WhatsApp chaos, zero commission, and instant setup delivers clear product-market fit for Indian retailers.

## 3. Caveats
- Backend Worker edge code (`worker/index.js`) and Express server (`backend/`) also maintain plan product limits (`PLAN_PRODUCT_LIMITS`) and founding offer configs. Synchronizing `frontend/src/config/plans.ts` with `worker/index.js` and `backend/` must be coordinated across agents.
- Multi-language dictionary files (`frontend/src/i18n/*.ts`) contain localized plan strings that should be updated to align with the new tier names and value copy.
- Real payment gateway integration (Razorpay / Cashfree) is mocked locally via `services/api.ts` and `/payment/initialize` payload validation.

## 4. Conclusion
The frontend is in a healthy state with clean component separation, making the transition to the 3-tier SaaS model (Free ₹0, Business ₹399, Pro ₹999), value-based merchant copy, and contextual upgrade triggers straightforward and low-risk. Detailed file-by-file recommendations and code blueprints are compiled in `survey_frontend_report.md`.

## 5. Verification Method
- **Report Location**: Check `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\survey_explorer_2\survey_frontend_report.md`.
- **Static Inspection**:
  - `frontend/src/config/plans.ts`
  - `frontend/src/pages/PricingPage.tsx`
  - `frontend/src/pages/LandingPage.tsx`
  - `frontend/src/pages/UpgradePage.tsx`
  - `frontend/src/components/Layout.tsx`
- **Frontend Build Verification**: Run `npm run build` in `frontend/` to ensure zero TypeScript or bundling errors.

# 🎨 Frontend & Design System (React 19 & Tailwind)

> **Subsystem Completion:** `95%`  
> **Status:** 🟢 Production  
> **Primary Path:** `frontend/`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Shopkeeper Human UI Philosophy
Aligned with the **FeraSetu Human UI/UX & Global Shopkeeper Rule** (`GEMINI.md`):
- **Hick's Law:** 1–2 primary decisions per screen.
- **Fitts's Law:** 48x48px touch targets in bottom thumb zones.
- **Jakob's Law:** Familiar mental models (WhatsApp checkout, UPI buttons).
- **No Heavy 3D Bloat:** Zero Three.js or canvas shaders on transaction pages.
- **Uniform Icons:** `lucide-react` with `size={18}` / `size={20}` and `strokeWidth={1.75}`.
- **High Contrast:** High readability under outdoor sunlight (`text-slate-900`/`text-slate-700`).

## 2. Key Modules & Pages

| Module | Location | Purpose |
| :--- | :--- | :--- |
| **Root Shell** | `frontend/src/App.tsx` | Route definitions, AuthGuard, LanguageProvider |
| **Store Builder** | `frontend/src/builder/`, `frontend/src/pages/WebsiteBuilderPage.tsx` | Mobile-responsive visual AST site builder with segmented Editor/Preview controls, generous breathing room (Fitts's Law touch targets >=48px), calm palette suggestions, and edge-to-edge mobile live storefront preview |
| **Storefront** | `frontend/src/storefront/` | Buyer-facing responsive product catalog & cart |
| **Storefront AI Concierge** | `frontend/src/storefront/sections/AiAssistantSection.tsx` | Customer-facing interactive AI shopping assistant in template renderer with suggestion pills, simulated chat, and prominent 1-click "Remove from Section" action |
| **AI Credits Command Center** | `frontend/src/pages/AICreditsPage.tsx` | Professional merchant AI telemetry with interactive SVG usage trend charts, 7d/14d/30d filter pills, hover tooltips, dual spend limit controls (FeraSetu Copilot vs Website AI), quick preset chips, credit pack purchases with Cashfree & sandbox simulation, and full audit trail |
| **Language Context** | `frontend/src/contexts/LanguageContext.tsx` | 48-region dynamic Indic dictionary switcher |
| **Auth & Session** | `frontend/src/contexts/AuthContext.tsx`, `frontend/src/services/authBridge.ts` | WorkOS AuthKit persistent refresh token & 401 retry recovery |
| **Orders Dashboard**| `frontend/src/pages/OrdersPage.tsx` | Order status tracking, CSV exports, + Add Order WhatsApp link generation |
| **Add Order Modal** | `frontend/src/components/orders/AddOrderModal.tsx` | Merchant order assembly, 1-click WhatsApp storefront checkout link, direct cash order recorder |
| **First Order Celebration Modal** | `frontend/src/pages/DashboardPage.tsx` | High-craft congratulatory milestone popup modal when merchant receives first order, celebrating 0% platform commission with 48px touch targets & 1-click order fulfillment link |
| **Cancel Confirmation Modal** | `frontend/src/components/orders/CancelConfirmationModal.tsx` | Irreversible warning modal with 'Back' and 'Proceed' options when store owner marks order as cancelled |
| **Shared Storefront Cart** | `frontend/src/storefront/runtime/StorefrontProvider.tsx`, `frontend/src/storefront/components/CartDrawer.tsx` | Preloaded cart from merchant link (`?cart=...`), customer banner, seamless item addition and checkout on official store domain |
| **Landing Page & Resilient Scroll** | `frontend/src/pages/LandingPage.tsx`, `frontend/src/components/public/PublicSmoothScroll.tsx`, `frontend/src/components/marketing/StorefrontShowcase.tsx`, `frontend/src/components/marketing/CompleteCircuit.tsx` | Hardware-accelerated native smooth scroll controller (0% Lenis event hijacking/freezing), cross-browser Android/Win11/Brave/Helium touch support, and responsive narrative stepper |
| **Fera AI Studio** | `frontend/src/pages/FeraAIPage.tsx` | Conversational manager & voice input UI |
| **Customers & Signups** | `frontend/src/pages/CustomersPage.tsx` | Dedicated shopkeeper customer roster tracking registered store accounts, logins, guest buyers, order counts, lifetime spend, and 1-click WhatsApp messaging |
| **Store Builder & Drag-and-Drop** | `frontend/src/builder/`, `frontend/src/pages/WebsiteBuilderPage.tsx`, `frontend/src/builder/panels/DesignPanel.tsx` | Visual store canvas with drag-and-drop & 1-click arrow reordering, straight line / divider drawing (`DividerSection.tsx`), image showcase banners (`ImageBannerSection.tsx`), and non-tech component logic configuration (WhatsApp, Cart, Sign In, Track Order) |
| **Conversational AI Store Creator** | `frontend/src/components/WebsiteAIBuilder.tsx` | Interactive step-by-step assistant that clarifies merchant fulfillment doubts, generates monogram brand logos, applies curated sector photos, and configures color palettes |
| **Merchant Shell & Navbar** | `frontend/src/components/Layout.tsx` | Improved navbar with Live Storefront quick pill, 1-click URL copy, Ctrl+K shortcut, Customers nav badge, and FeraSetu Updates Center |
| **Updates & Announcements Center** | `frontend/src/components/notifications/FeraSetuUpdatesCenter.tsx`, `frontend/src/components/Layout.tsx` | Merchant bell notification center showcasing FeraSetu new features, platform updates, and official team messages with unread badge counter and full detail reading dialog |
| **Product & Privacy Telemetry** | `frontend/src/pages/AdminDashboardPage.tsx` | First-party visitor telemetry showing real connecting IP addresses with 1-click copy, live visitor radar, search filter, top visitor IPs, and total unique site visitors count |
| **UI Primitives (shadcn/ui & React Bits)** | `frontend/src/components/ui/` (`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `BentoGrid.tsx`, `SpotlightCard.tsx`, `SplitText.tsx`) | Calm, trustworthy primitives with generous whitespace (`p-6` to `p-10`), Fitts's Law 48px touch targets, zero card-in-card clutter, and tactile <400ms press feedback |

## 3. UI Stack & Animation Standards
- **Component Foundations:** `shadcn/ui` + `class-variance-authority` + `clsx` + `tailwind-merge` (`cn()`) with path alias `@/components/ui/*`.
- **Motion & Smoothness:** Native hardware-accelerated compositor scrolling (`touch-action: pan-y pinch-zoom`, passive listeners, zero Lenis bloat/freezing), resilient across Android 11, Windows 11, Helium, and Brave browsers.
- **Scroll & Gallery Safety:** Un-hijacked vertical scrolling with zero scroll-jacking pins; touch-pan-x horizontal showcase with direct step controls.
- **Micro-Interactions:** `SpotlightCard` (pointer-following glow) and `SplitText` from React Bits with instant reduced-motion and coarse-pointer fallbacks.
- **Calm Trust Design:** OpenDesign / Superdesign principles emphasizing generous whitespace, breathing room, and clear hierarchy so merchants feel safe and trust FeraSetu with their livelihood.



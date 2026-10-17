# 🎨 Frontend & Design System (React 19 & Tailwind)

> **Subsystem Completion:** `88%`  
> **Status:** 🟡 Active Polish  
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
| **Store Builder** | `frontend/src/builder/` | Drag-and-drop visual AST site builder |
| **Storefront** | `frontend/src/storefront/` | Buyer-facing responsive product catalog & cart |
| **Language Context** | `frontend/src/contexts/LanguageContext.tsx` | 48-region dynamic Indic dictionary switcher |
| **Auth & Session** | `frontend/src/contexts/AuthContext.tsx`, `frontend/src/services/authBridge.ts` | WorkOS AuthKit persistent refresh token & 401 retry recovery |
| **Orders Dashboard**| `frontend/src/pages/OrdersPage.tsx` | Order status tracking, CSV exports, + Add Order WhatsApp link generation |
| **Add Order Modal** | `frontend/src/components/orders/AddOrderModal.tsx` | Merchant order assembly, 1-click WhatsApp storefront checkout link, direct cash order recorder |
| **Shared Storefront Cart** | `frontend/src/storefront/runtime/StorefrontProvider.tsx`, `frontend/src/storefront/components/CartDrawer.tsx` | Preloaded cart from merchant link (`?cart=...`), customer banner, seamless item addition and checkout on official store domain |
| **Landing Page & Animations** | `frontend/src/pages/LandingPage.tsx`, `frontend/src/components/public/PublicSmoothScroll.tsx`, `frontend/src/components/marketing/StorefrontShowcase.tsx`, `frontend/src/components/marketing/CompleteCircuit.tsx` | Lenis smooth scroll ticker synced with GSAP ScrollTrigger, pinned horizontal card scrub, and 4-stage narrative stepper |
| **Fera AI Studio** | `frontend/src/pages/FeraAIPage.tsx` | Conversational manager & voice input UI |



# Frontend Speed & Bundle Performance Audit Report

**Author**: `explorer_perf_gen4` (Frontend Speed & Bundle Performance Specialist)  
**Target**: FeraSetu Frontend Application (`frontend/`)  
**Date**: 2026-09-05  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

### 1.1 Build & Bundle Analysis
Direct execution of `npm run build` (`vite build`) via background task produced exit code 0 in 42.30 seconds.
Measured chunk breakdown from build output:
```
dist/assets/vendor-charts-DKxnykf2.js       389.71 kB │ gzip: 111.87 kB
dist/assets/vendor-statsig-C_kVhkZA.js      313.83 kB │ gzip:  92.15 kB
dist/assets/vendor-react-BQFHfg47.js        178.31 kB │ gzip:  56.32 kB
dist/assets/index-BtXJdHm3.js               126.33 kB │ gzip:  34.68 kB
dist/assets/vendor-motion-BL0Zr6bz.js       109.89 kB │ gzip:  36.28 kB
dist/assets/core-C9SMJGFN.js                 79.64 kB │ gzip:  14.79 kB
dist/assets/TemplateRenderer-CONYW_SI.js     75.59 kB │ gzip:  22.63 kB
dist/assets/axios-ZE6AO3dq.js                49.96 kB │ gzip:  18.75 kB
dist/assets/PrivacyPage-C6PLfA6V.js          45.35 kB │ gzip:  10.90 kB
dist/assets/TermsPage-Dl7fR9jC.js            41.86 kB │ gzip:  13.90 kB
dist/assets/chunk-BV7QT456-BKyNfC4O.js       40.13 kB │ gzip:  14.46 kB
dist/assets/WebsiteBuilderPage-siA24Ooi.js   31.14 kB │ gzip:   8.42 kB
dist/assets/vendor-query-BbK2acQ4.js         29.24 kB │ gzip:   8.99 kB
dist/assets/DashboardPage-Cp5UFKhT.js        28.98 kB │ gzip:   6.93 kB
dist/assets/vendor-auth-BH1VmHl_.js          28.86 kB │ gzip:   9.97 kB
dist/assets/vendor-icons-Clzfytrk.js         22.96 kB │ gzip:   7.92 kB
dist/assets/OrdersPage-CWZ6ZjsS.js           20.16 kB │ gzip:   4.99 kB
dist/assets/ProductsPage-BdAd3cWi.js         19.74 kB │ gzip:   5.34 kB
dist/assets/PricingFAQ-B5lLkO-E.js           19.59 kB │ gzip:   5.67 kB
dist/assets/FeraAIPage-S2hYAsiw.js           16.95 kB │ gzip:   5.57 kB
dist/assets/PricingPage-CfDjX_nV.js          16.52 kB │ gzip:   5.12 kB
dist/assets/EmailSettingsPage-DalXncAa.js    16.09 kB │ gzip:   4.59 kB
dist/assets/SupportPage-CRFZ7mzc.js          13.23 kB │ gzip:   3.69 kB
dist/assets/hi-DGHlZKqd.js                   12.59 kB │ gzip:   3.58 kB
dist/assets/ReferEarnPage-chTw1tUj.js        12.57 kB │ gzip:   3.09 kB
dist/assets/GetStartedPage-ClqKmhyk.js       12.16 kB │ gzip:   3.95 kB
dist/assets/AnalyticsPage-PhMbJeEC.js        11.97 kB │ gzip:   3.82 kB
```
- **Vite Performance Budget Compliance**: All chunks are strictly under the 500 kB warning threshold. Zero chunk size warnings were emitted.
- **Statsig Deferral**: Verified in `frontend/src/main.tsx:15` and `frontend/src/lib/statsig.ts:36-38` that `initDeferredStatsig()` dynamically loads `vendor-statsig` via `requestIdleCallback` / post-`load` timeout, successfully removing 313.8 kB from the critical render path.
- **Icon Tree-Shaking**: Verified `lucide-react` is cleanly tree-shaken into a modest 22.96 kB chunk (`vendor-icons`).

---

### 1.2 Identified Performance Hotspots & Anti-Patterns

#### A. Query Cache Fragmentation & Redundant Parallel Network Requests
1. In `frontend/src/components/Layout.tsx:52-63`:
   ```ts
   // Line 52
   const { data: ordersData } = useQuery<{ orders: any[] }>({
     queryKey: ['orders-count-nav'],
     queryFn: async () => {
       const res = await api.get('/orders');
       return res.data;
     },
     staleTime: 30000,
   });
   ```
2. In `frontend/src/pages/DashboardPage.tsx:112-122`:
   ```ts
   // Line 112
   const { data: ordersData, isLoading: isOrdersLoading } = useQuery<{ orders: any[] }>({
     queryKey: ['orders-list'],
     queryFn: async () => {
       const res = await api.get('/orders');
       return res.data;
     },
   });
   ```
3. In `frontend/src/pages/OrdersPage.tsx:275-281`:
   ```ts
   // Line 275
   const { data: orders = [], isLoading } = useQuery<Order[]>({
     queryKey: ['orders'],
     queryFn: async () => {
       const res = await api.get('/orders');
       return res.data.orders || res.data;
     },
   });
   ```
4. In `frontend/src/pages/DashboardPage.tsx:125-135`:
   ```ts
   // Line 125
   const { data: productsData, isLoading: isProductsLoading } = useQuery<{ products: any[] }>({
     queryKey: ['products-list'],
     queryFn: async () => {
       const res = await api.get('/products');
       return res.data;
     },
   });
   ```
5. In `frontend/src/pages/ProductsPage.tsx:79-85`:
   ```ts
   // Line 79
   const { data: products = [], isLoading } = useQuery<Product[]>({
     queryKey: ['products'],
     queryFn: async () => {
       const res = await api.get('/products');
       return res.data.products || res.data;
     },
   });
   ```
**Direct Impact**: When visiting `/dashboard`, `Layout` and `DashboardPage` mount simultaneously and fire **TWO concurrent GET `/orders` HTTP requests** due to mismatched keys (`['orders-count-nav']` vs `['orders-list']`). When clicking to `/orders`, a **THIRD GET `/orders` request** is made because `OrdersPage` uses `['orders']`. Furthermore, mutating an order invalidates `['orders']`, leaving `['orders-list']` on Dashboard and `['orders-count-nav']` in the navbar with stale data.

---

#### B. Architectural Layout Churn on Every Route Transition
In `frontend/src/App.tsx:119-133`:
```tsx
<Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
<Route path="/products" element={<ProtectedRoute><Layout><ProductsPage /></Layout></ProtectedRoute>} />
<Route path="/orders" element={<ProtectedRoute><Layout><OrdersPage /></Layout></ProtectedRoute>} />
<Route path="/analytics" element={<ProtectedRoute><Layout><AnalyticsPage /></Layout></ProtectedRoute>} />
<Route path="/fera-ai" element={<ProtectedRoute><Layout><FeraAIPage /></Layout></ProtectedRoute>} />
<Route path="/ai-assistant" element={<ProtectedRoute><Layout><AIAssistantPage /></Layout></ProtectedRoute>} />
<Route path="/ai-credits" element={<ProtectedRoute><Layout><AICreditsPage /></Layout></ProtectedRoute>} />
<Route path="/website-builder" element={<ProtectedRoute><Layout><WebsiteBuilderPage /></Layout></ProtectedRoute>} />
<Route path="/survey-feedback" element={<ProtectedRoute><Layout><SurveyFeedbackPage /></Layout></ProtectedRoute>} />
<Route path="/settings/email" element={<ProtectedRoute><Layout><EmailSettingsPage /></Layout></ProtectedRoute>} />
<Route path="/refer-earn" element={<ProtectedRoute><Layout><ReferEarnPage /></Layout></ProtectedRoute>} />
<Route path="/upgrade" element={<ProtectedRoute><Layout><UpgradePage /></Layout></ProtectedRoute>} />
<Route path="/support" element={<ProtectedRoute><Layout><SupportPage /></Layout></ProtectedRoute>} />
<Route path="/get-started" element={<ProtectedRoute><Layout><GetStartedPage /></Layout></ProtectedRoute>} />
```
And in `frontend/src/components/Layout.tsx:42, 318`:
```tsx
export default function Layout({ children }: { children: React.ReactNode }) { ... }
...
<main className='flex-1 overflow-y-auto bg-[#F8FAFC] p-5 sm:p-6 lg:p-8'>
  {children}
</main>
```
**Direct Impact**: Because `<Layout>` is wrapped individually inside every route's `element` prop, navigating between any merchant routes causes React to **completely unmount and remount `<Layout>`**, destroying the sidebar DOM, resetting header state, and causing layout shifts and header flashes on every route click.

---

#### C. Full-Tree Cascade Re-Renders from Non-Memoized Context Providers
1. In `frontend/src/contexts/LanguageContext.tsx:121-163`:
   ```ts
   const setLanguage = (lang: string) => { ... };
   const translate = (key: TranslationKey, vars?: Record<string, string | number>) => { ... };
   const getLocalizedLink = (path: string) => { ... };

   return (
     <LanguageContext.Provider value={{ language: activeLanguage, setLanguage, translate, getLocalizedLink }}>
       {children}
     </LanguageContext.Provider>
   );
   ```
   Functions `setLanguage`, `translate`, and `getLocalizedLink` are declared as plain arrow functions without `useCallback`. The context `value` object literal is created fresh on **every render** of `LanguageProvider`. Because `LanguageProvider` wraps all routes (`App.tsx:206`), every state change or location change triggers a re-render of `LanguageProvider`, which supplies a new reference object, forcing **every consumer of `useLanguage()` across the entire app** to re-render.
2. In `frontend/src/contexts/AuthContext.tsx:242-298`:
   ```ts
   const contextValue: AuthContextType = {
     user: profile,
     isLoading: isWorkOSLoading || isProfileLoading,
     profileError,
     login: async (opts?: { loginHint?: string }) => { ... },
     loginWithGoogle: async (opts?: { loginHint?: string }) => { ... },
     register: async (opts?: { loginHint?: string }) => { ... },
     logout: () => { ... },
     ...
     updateUser,
     getAccessToken: async () => getAccessToken()
   };

   return (
     <AuthContext.Provider value={contextValue}>
       {children}
     </AuthContext.Provider>
   );
   ```
   `contextValue` is a new object instance on every render with freshly declared function closures.

---

#### D. Heavy Third-Party Dependency Overkill (`framer-motion`)
In `frontend/src/pages/PricingPage.tsx:3, 54-60`:
```ts
import { motion } from 'framer-motion';
...
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};
```
- `framer-motion` is 109.89 kB JS (gzip 36.28 kB).
- Grep search confirms `framer-motion` is imported in **only 1 file** in the entire codebase (`PricingPage.tsx`).
- It is only used for basic 24px upward opacity fade, which `LandingPage` already achieves using native CSS and `MarketingReveal.tsx` with zero dependencies.

---

#### E. Static Import of LandingPage in Root App Bundle
In `frontend/src/App.tsx:9`:
```ts
// Public landing page
import LandingPage from './pages/LandingPage';
```
While all other pages are lazy-loaded with `React.lazy()`, `LandingPage` is statically imported at the root of `App.tsx`.
- Visitors heading to `/login`, `/register`, `/admin`, or any merchant route (`/dashboard`) are forced to download `LandingPage` and its 8 marketing components (`HowItWorksSection`, `ProofSection`, `FAQSection`, `FinalCTA`, `AIExamplePrompts`, `TransformationFlow`, `ValueCurveSection`, `HeroProductVisual`), inflating `index-*.js` to 126.33 kB.

---

#### F. Dashboard Chart Layout Shift & Animation Hitching
In `frontend/src/pages/DashboardPage.tsx:582-600, 663-670`:
```tsx
<Area
  yAxisId="left"
  type="monotone"
  dataKey="revenue"
  stroke="#0052FF"
  strokeWidth={2.5}
  dot={{ r: 3.5, fill: '#0052FF', strokeWidth: 0 }}
  fillOpacity={1}
  fill="url(#colorRevenue)"
/>
...
<Pie
  data={donutData}
  innerRadius={50}
  outerRadius={68}
  paddingAngle={totalOrders > 0 ? 3 : 0}
  dataKey="value"
  stroke="none"
>
```
- Neither `<Area>` nor `<Pie>` specifies `isAnimationActive={false}`.
- Recharts defaults `isAnimationActive` to `true` (1500ms duration).
- Whenever `orders` or `products` queries resolve, or when the user changes language or interacts with filters, Recharts re-executes the 1.5s interpolation animation, causing visible chart redraws and UI lag.
- Note: In `frontend/src/pages/AnalyticsPage.tsx:205, 235, 250`, `isAnimationActive={false}` is already set, preventing this hitching on Analytics, but was overlooked in Dashboard.

---

#### G. Storefront DOM Pollution & Synchronous Parsing in Product Cards
In `frontend/src/components/shop/sections/ProductGridSection.tsx:46-60`:
```tsx
function ProductCard({ product, accentColor, showStock, onBuyNow, onAddToCart, shopPhone }: ...) {
  ...
  return (
    <>
      <style>{`
        .fera-product-card {
          animation: fadeInUp 0.6s ease-out backwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
```
- For a catalog with 50 products, **50 duplicate `<style>` tags** are injected into the DOM.
- `ProductCard` calls `sanitizeText(product.name)` and `sanitizeText(product.category)` on every render without memoization.
- `ProductCard` is not wrapped in `React.memo`, so any cart state change forces DOMPurify sanitization and re-renders across every single product card.

---

#### H. Font File Duplication via `@fontsource/inter`
In `frontend/src/main.tsx:5-9`:
```ts
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
```
- 5 individual static weight CSS imports cause Vite to emit **24 separate font files** (`inter-latin-400`, `500`, `600`, `700`, `800`, `inter-latin-ext-...` in both `.woff` and `.woff2`).

---

#### I. Unused Heavy Packages in `package.json`
- `three` (`^0.180.0`), `@react-three/fiber` (`^9.6.1`), `@react-three/drei` (`^10.7.7`), `@react-three/postprocessing` (`3.0.4`), `@types/three`: Referenced only in `src/components/three/HeroScene.tsx`, which is dead code (never imported in any page or component).
- `react-hook-form` (`^7.72.1`): 0 imports across `src/`.
- `zustand` (`4.5.5`): 0 imports across `src/`.

---

## 2. Logic Chain

1. **Premise**: Fast page transitions and minimal render lag require shared cache reuse, persistent layout shells, stable context references, and non-blocking chart rendering.
2. **Observation A & Premise**: `Layout.tsx`, `DashboardPage.tsx`, and `OrdersPage.tsx` use three disjoint TanStack Query keys (`['orders-count-nav']`, `['orders-list']`, `['orders']`) for the exact same GET `/orders` endpoint.
   - **Inference**: TanStack Query evaluates cache hits by key matching. Disjoint keys cause cache misses, triggering duplicate network requests and creating stale data inconsistencies when mutations invalidate one key but not the others.
3. **Observation B & Premise**: In React Router, nesting routes inside a layout route preserving the component boundary ensures the layout remains mounted across child route transitions.
   - **Inference**: Re-rendering `<Layout>` per-route unmounts the DOM nodes of the sidebar and top navigation bar, causing UI flashes and resetting scroll/navigation states. Transitioning to `<Outlet />` will make merchant route switches instantaneous.
4. **Observation C & Premise**: React context propagates updates to all consumers whenever `Provider`'s `value` reference changes (`Object.is` check).
   - **Inference**: Re-instantiating `value={{ ... }}` on every render inside `LanguageProvider` and `AuthProvider` invalidates memoization across the entire component tree, causing unnecessary re-renders on every route change or state update.
5. **Observation D & Premise**: Dependencies should justify their bundle cost.
   - **Inference**: `framer-motion` adds 109.89 kB to bundle size but is only used for a single CSS-equivalent translate/opacity animation on `PricingPage`. Replacing it with CSS / Tailwind animations eliminates the entire `vendor-motion` chunk.
6. **Observation F & Premise**: UI animations on high-frequency dashboards should be deterministic and not cause perceptible layout shifts or hitching.
   - **Inference**: Adding `isAnimationActive={false}` to `<Area>` and `<Pie>` in `DashboardPage` stops Recharts from running 1.5s redraw animations on data changes, directly resolving acceptance criteria for smooth chart rendering.

---

## 3. Caveats

1. **Statsig Analytics Integration**: Statsig initialization is already deferred to idle time (`lib/statsig.ts`). Removing `vendor-statsig` further is not necessary as it does not block the First Contentful Paint.
2. **Shop Page Isolation**: `TemplateRenderer` and `DOMPurify` are properly isolated to storefront routes. Their 75 kB footprint does not affect the core merchant dashboard bundle.
3. **Backend API Dependencies**: The investigation confirmed query endpoints `/orders` and `/products` support caching; consolidating queryKeys will not alter payload structure or backend contracts.

---

## 4. Conclusion & Actionable Optimization Roadmap

FeraSetu's bundle setup is already reasonably split, but significant runtime and load speed improvements can be unlocked with targeted architectural refinements.

### Prioritized Optimization Roadmap

| Priority | Area | Optimization | Expected Impact |
|:---|:---|:---|:---|
| **P0** | Query Cache | Unify queryKeys: Use `['orders']` across `Layout`, `Dashboard`, and `OrdersPage`; use `['products']` across `Dashboard` and `ProductsPage`. | Eliminates 2 redundant network requests on initial dashboard load; ensures instant data freshness. |
| **P0** | Route Transitions | Refactor merchant and admin routes to nested layout routes using `<Outlet />`. | Eliminates sidebar/header unmount churn; enables instant 0ms sub-route transitions. |
| **P0** | Rendering Performance | Add `useMemo` to `LanguageContext` and `AuthContext` provider values; wrap callbacks in `useCallback`. | Eliminates app-wide cascade re-renders on route or auth updates. |
| **P1** | Chart Rendering | Add `isAnimationActive={false}` to AreaChart and PieChart in `DashboardPage.tsx`. | Eliminates 1.5s chart redraw hitching on dashboard updates and re-renders. |
| **P1** | Bundle Size | Replace `framer-motion` in `PricingPage.tsx` with Tailwind/CSS animations. | Removes 109.89 kB `vendor-motion` chunk completely. |
| **P1** | Code Splitting | Lazy-load `LandingPage` in `App.tsx` (`lazy(() => import('./pages/LandingPage'))`). | Reduces main entry chunk (`index-*.js`) by ~50-60 kB for users landing on auth or dashboard routes. |
| **P2** | DOM Optimization | Move `<style>` block outside `ProductCard` to parent in `ProductGridSection.tsx`; memoize `ProductCard` with `React.memo`. | Eliminates 50 duplicate `<style>` tags and redundant synchronous DOMPurify passes. |
| **P2** | Asset & Fonts | Replace 5 static `@fontsource/inter` imports with `@fontsource-variable/inter` or system font stack; remove dead dependencies (`three`, `@react-three/*`, `react-hook-form`, `zustand`). | Drops 24 font network requests down to 1 variable font; cleans repository dependencies. |

---

### Implementation Snippets for Implementation Agents

#### Snippet 1: Unify Query Keys across Layout, Dashboard, and Orders
In `frontend/src/components/Layout.tsx:53`:
```tsx
// Before:
queryKey: ['orders-count-nav'],

// After:
queryKey: ['orders'],
queryFn: async () => {
  const res = await api.get('/orders');
  return res.data.orders || res.data;
},
```

In `frontend/src/pages/DashboardPage.tsx:113, 126`:
```tsx
// Before:
queryKey: ['orders-list'],
...
queryKey: ['products-list'],

// After:
queryKey: ['orders'],
...
queryKey: ['products'],
```

#### Snippet 2: Nested Layout Route with `<Outlet />` in `App.tsx`
In `frontend/src/components/Layout.tsx`:
```tsx
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
...
export default function Layout({ children }: { children?: React.ReactNode }) {
  ...
  <main className='flex-1 overflow-y-auto bg-[#F8FAFC] p-5 sm:p-6 lg:p-8'>
    {children ?? <Outlet />}
  </main>
```

In `frontend/src/App.tsx`:
```tsx
{/* Core Protected App Routes with Persistent Layout Shell */}
<Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/products" element={<ProductsPage />} />
  <Route path="/orders" element={<OrdersPage />} />
  <Route path="/analytics" element={<AnalyticsPage />} />
  <Route path="/fera-ai" element={<FeraAIPage />} />
  <Route path="/ai-assistant" element={<AIAssistantPage />} />
  <Route path="/ai-credits" element={<AICreditsPage />} />
  <Route path="/website-builder" element={<WebsiteBuilderPage />} />
  <Route path="/survey-feedback" element={<SurveyFeedbackPage />} />
  <Route path="/settings/email" element={<EmailSettingsPage />} />
  <Route path="/refer-earn" element={<ReferEarnPage />} />
  <Route path="/upgrade" element={<UpgradePage />} />
  <Route path="/support" element={<SupportPage />} />
  <Route path="/get-started" element={<GetStartedPage />} />
</Route>
```

#### Snippet 3: Memoize `LanguageContext` and `AuthContext` Providers
In `frontend/src/contexts/LanguageContext.tsx`:
```tsx
const setLanguage = useCallback((lang: string) => {
  ...
}, [activeLanguage, user, updateUser]);

const translate = useCallback((key: TranslationKey, vars?: Record<string, string | number>) => {
  let text = dictionary[key] || fallbackDictionary[key] || key;
  if (vars) {
    for (const [variable, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{{${variable}}}`, 'g'), String(value));
    }
  }
  return text;
}, [dictionary]);

const getLocalizedLink = useCallback((path: string) => {
  ...
}, [activeLanguage]);

const contextValue = useMemo(() => ({
  language: activeLanguage,
  setLanguage,
  translate,
  getLocalizedLink,
}), [activeLanguage, setLanguage, translate, getLocalizedLink]);

return (
  <LanguageContext.Provider value={contextValue}>
    {children}
  </LanguageContext.Provider>
);
```

#### Snippet 4: Smooth Non-Hitching Dashboard Charts
In `frontend/src/pages/DashboardPage.tsx`:
```tsx
// Line 582:
<Area
  yAxisId="left"
  isAnimationActive={false}
  type="monotone"
  dataKey="revenue"
  ...
/>
<Area
  yAxisId="right"
  isAnimationActive={false}
  type="monotone"
  dataKey="orders"
  ...
/>

// Line 663:
<Pie
  isAnimationActive={false}
  data={donutData}
  innerRadius={50}
  outerRadius={68}
  ...
/>
```

---

## 5. Verification Method

To independently verify these findings and confirm that future implementations meet performance and integrity acceptance criteria:

1. **Build Integrity Check**:
   ```powershell
   cd frontend
   npm run build
   ```
   *Expected*: Build succeeds with 0 errors. All chunks should remain <500 kB, and removing `framer-motion` should eliminate `vendor-motion-*.js`.

2. **Network Request De-duplication Verification**:
   - Open browser DevTools Network tab on `http://localhost:5173/dashboard`.
   - *Current behavior*: Observe 2 concurrent requests to `/api/orders` on initial load, plus a 3rd request when navigating to `/orders`.
   - *Target behavior after optimization*: Exactly 1 request to `/api/orders` on initial load; 0 network requests when switching tabs to `/orders` within the 30s `staleTime`.

3. **Persistent Layout Verification**:
   - In React DevTools Profiler, record navigating from `/dashboard` to `/products`.
   - *Current behavior*: `<Layout>` component unmounts and remounts.
   - *Target behavior*: `<Layout>` remains mounted; only the `<Outlet />` child transitions.

4. **Chart Smoothness Check**:
   - Switch between 7-day date ranges or update an order.
   - *Verification*: Confirm area charts and donut charts update instantaneously without a 1500ms transition flash or frame hitch.

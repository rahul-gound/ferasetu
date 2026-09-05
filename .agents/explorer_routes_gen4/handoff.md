# Route & Component Functional Audit Report — FeraSetu

**Auditor**: `explorer_routes_gen4` (Route & Component Functional Auditor)  
**Date**: 2026-09-05  
**Target Scope**: Every public, SEO, authenticated merchant, and admin route in FeraSetu  
**Integrity Mode**: Read-only Audit & Vulnerability Assessment  

---

## Executive Summary

A comprehensive functional and architectural audit of every route and page component across the FeraSetu web application was conducted. The investigation spanned router configuration (`frontend/src/App.tsx`), context providers (`AuthContext.tsx`, `LanguageContext.tsx`), navigation shells (`Layout.tsx`, `PublicNavbar.tsx`, `AdminLayout.tsx`), and all 36 page components in `frontend/src/pages/`.

While core merchant features (dashboard KPI computations, catalog mutations, invoice generation, and template configuration) are feature-rich and resilient to empty database states, several **critical blockers, lifecycle instabilities, and dead interactive controls** were identified:

1. **Infinite Redirect Loop (P0)**: If `user.is_verified` is false, `ProtectedRoute` redirects to `/verify-email`, which immediately executes `navigate('/dashboard')`, causing an unrecoverable browser freeze.
2. **Permanent Hang on `/callback` (P0)**: Authentication failures or cancellations leave the user frozen indefinitely on a spinner with no fallback or error state.
3. **Total Absence of Error Boundaries (P0)**: There is zero React Error Boundary in the application; any rendering defect unmounts the entire app to a blank screen.
4. **Complete Functional Failure of `/support` (P1)**: `SupportPage.tsx` bypasses the shared API client and queries raw axios with `localStorage.getItem('fera_token')` (which is always null), throwing 401 Unauthorized on every load.
5. **Runtime TypeErrors in Admin Pages (P1)**: `AdminMeetingsPage.tsx` and `AdminOrdersPage.tsx` call string operations (`.toLowerCase()`, `.slice()`) on un-guarded null/undefined database fields, crashing the view.
6. **Dead Interactive Controls (P2)**: Notification bells in both Merchant and Admin topbars, search input, and dashboard date selectors have no click/submit handlers wired.
7. **React 18 Concurrent Double-Mutate Bug (P2)**: `FeraAIPage.tsx` triggers `sendMutation.mutate()` inside `setMessages(prev => ...)`, causing double credit deduction in development/concurrent modes.

---

## 1. Route Registration & Mapping Matrix

| Route Path | Mapped Component | Protection Level | Status | Notes / Issues Identified |
|---|---|---|---|---|
| `/` | `LandingPage.tsx` | Public | **Functional** | Renders AIDA sections, zero-commission outcome copy, pricing previews. |
| `/pricing` | `PricingPage.tsx` | Public | **Functional** | Renders 3-tier SaaS pricing (Free ₹0, Business ₹399, Pro ₹999), feature comparison, value calculator. |
| `/terms` | `TermsPage.tsx` | Public | **Minor Issue** | Line 946 links to `getLocalizedLink('/support')`, which is not in `PUBLIC_ROUTES` or `/:lang`. |
| `/privacy` | `PrivacyPage.tsx` | Public | **Functional** | Full DPDP Act compliant legal terms with section navigation. |
| `/login` | `LoginPage.tsx` | Public / Redirect | **Functional** | Auto-redirects to WorkOS AuthKit; `login` instance in `useEffect` re-triggers on AuthProvider state change. |
| `/register` | `RegisterPage.tsx` | Public / Redirect | **Functional** | Auto-redirects to WorkOS AuthKit sign-up. |
| `/online-dukaan-banaye` | `OnlineDukaanBanaye.tsx` | Public / SEO | **Minor Issue** | Primary CTAs use raw `<a href="/register">` instead of client-side `<Link>`. |
| `/free-online-store` | `FreeOnlineStore.tsx` | Public / SEO | **Data Drift** | Raw `<a>` tags; mentions "₹299/mo" and "19 products" (conflicts with 3-tier plan specs). |
| `/shopify-alternative-india` | `ShopifyAlternativeIndia.tsx` | Public / SEO | **Minor Issue** | Raw `<a>` tags; comparison table is functional. |
| `/kirana-store-online` | `KiranaStoreOnline.tsx` | Public / SEO | **Minor Issue** | Raw `<a>` tags. |
| `/:lang/*` | Various | Public Localized | **Partial** | Missing `support` route in localized subroutes. |
| `/callback` | `AuthCallbackPage.tsx` | Public / Auth | **Critical (P0)** | Permanent spinner hang if auth fails or user is null. |
| `/verify-email` | `VerifyEmailPage.tsx` | Protected | **Critical (P0)** | Infinite redirect loop if `user.is_verified === false`. |
| `/dashboard` | `DashboardPage.tsx` | Protected (Merchant) | **Functional** | Handles empty database gracefully; date dropdowns have no click handlers. |
| `/products` | `ProductsPage.tsx` | Protected (Merchant) | **Functional** | Shimmer loading, 5MB file upload limit, active toggle, profit margin, tier gating. |
| `/orders` | `OrdersPage.tsx` | Protected (Merchant) | **Functional** | Status tabs, invoice modal with printable view, OTP confirmation. |
| `/analytics` | `AnalyticsPage.tsx` | Protected (Merchant) | **Minor Issue** | Fallbacks for empty orders; line 326 refers to legacy "Standard or Pro" instead of "Business or Pro". |
| `/fera-ai` | `FeraAIPage.tsx` | Protected (Merchant) | **Functional (Bug)** | Line 489 triggers mutation side-effect inside `setMessages` state updater. |
| `/ai-assistant` | `AIAssistantPage.tsx` | Protected (Merchant) | **Functional** | Uses `window.location.href` for navigation; hardcoded 4s simulated delay on `<think>`. |
| `/ai-credits` | `AICreditsPage.tsx` | Protected (Merchant) | **Functional** | Real-time balance, credit packs purchase, usage breakdown. |
| `/website-builder` | `WebsiteBuilderPage.tsx` | Protected (Merchant) | **Functional** | Live preview, section editor, AI website generation, deployment toggle. |
| `/settings/email` | `EmailSettingsPage.tsx` | Protected (Merchant) | **Functional** | SMTP configuration, test email dispatch, beforeunload warning. |
| `/survey-feedback` | `SurveyFeedbackPage.tsx` | Protected (Merchant) | **Functional** | AI survey assistant, question flow, submission history. |
| `/refer-earn` | `ReferEarnPage.tsx` | Protected (Merchant) | **Functional** | Referral link generation, copy to clipboard, WhatsApp share. |
| `/upgrade` | `UpgradePage.tsx` | Protected (Merchant) | **Functional** | Monthly/annual billing toggle, payment initialization, plan upgrade. |
| `/support` | `SupportPage.tsx` | Protected (Merchant) | **Broken (P1)** | Sends `Authorization: Bearer null` via raw axios, causing 401 error on load. |
| `/get-started` | `GetStartedPage.tsx` | Protected (Merchant) | **Functional** | Multi-step onboarding question flow. |
| `/shop/:shopName` | `ShopPage.tsx` | Storefront | **Functional (Bug)** | Hardcoded `http://localhost:5000/api`; infinite spinner if `shopName` is falsy. |
| `/admin` | `AdminLogin.tsx` | Admin Public | **Functional** | Admin login form saving `admin_token`. |
| `/admin/dashboard` | `AdminDashboardPage.tsx` | Admin Protected | **Minor Issue** | Formats `data?.stats?.totalRevenue` as `₹undefined` if null/empty. |
| `/admin/users` | `AdminUsersPage.tsx` | Admin Protected | **Broken Impersonate** | Impersonation stores `token` and `user` instead of `fera_user`. |
| `/admin/shops` | `AdminShopsPage.tsx` | Admin Protected | **Functional** | Lists published storefronts and product counts. |
| `/admin/meetings` | `AdminMeetingsPage.tsx` | Admin Protected | **Crash (P1)** | `m.customer_name.toLowerCase()` throws `TypeError` on null names. |
| `/admin/orders` | `AdminOrdersPage.tsx` | Admin Protected | **Crash (P1)** | `order.id.slice(0, 8)` throws `TypeError` if `order.id` is null/undefined. |
| `/admin/tickets` | `AdminTicketsPage.tsx` | Admin Protected | **Functional** | Resolves tickets and sends replies. |
| `/admin/system` | `AdminSystemPage.tsx` | Admin Protected | **Functional** | System health, feature flags, AI usage monitor. |

---

## 2. Detailed Findings & Root-Cause Analysis

### Finding 1: Infinite Redirect Loop between `/verify-email` and `ProtectedRoute`
- **Severity**: **P0 (Critical Blocker)**
- **Observed Files**:
  - `frontend/src/App.tsx:83-86`
  - `frontend/src/pages/VerifyEmailPage.tsx:7-11`
- **Verbatim Code**:
  ```tsx
  // frontend/src/App.tsx lines 83-86:
  const isVerifyPage = window.location.pathname === '/verify-email';
  if (!user.is_verified && !isVerifyPage) {
    return <Navigate to="/verify-email" replace />;
  }

  // frontend/src/pages/VerifyEmailPage.tsx lines 7-11:
  useEffect(() => {
    // WorkOS AuthKit handles verification natively in its hosted flow.
    // This route is deprecated.
    navigate('/dashboard');
  }, [navigate]);
  ```
- **Mechanism**:
  1. A user whose `is_verified` flag is `false` attempts to access any protected route (e.g. `/dashboard`).
  2. `ProtectedRoute` intercepts the request because `!user.is_verified && !isVerifyPage` is true, redirecting them to `/verify-email`.
  3. The `/verify-email` route renders `VerifyEmailPage` (also wrapped in `ProtectedRoute`, where `isVerifyPage` is true).
  4. `VerifyEmailPage`'s `useEffect` runs on mount and executes `navigate('/dashboard')`.
  5. The browser navigates back to `/dashboard`, where `ProtectedRoute` again redirects to `/verify-email`.
  6. This creates an unconstrained loop of client-side redirects, consuming 100% CPU and crashing the browser tab.
- **Remediation**:
  Since WorkOS AuthKit manages verification natively, either:
  1. Deprecate the verification check in `ProtectedRoute`: `// if (!user.is_verified) ...`
  2. Or if verification is required, render a dedicated full-screen verification prompt with a "Resend Email" button on `/verify-email` instead of immediately redirecting to `/dashboard`.

---

### Finding 2: Permanent Hang on `/callback` Without Fallback / Error Recovery
- **Severity**: **P0 (Critical Failure)**
- **Observed File**: `frontend/src/pages/AuthCallbackPage.tsx:10-14`
- **Verbatim Code**:
  ```tsx
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);
  ```
- **Mechanism**:
  If the WorkOS callback fails, the user cancels the authentication flow, or the backend token exchange fails, `isLoading` becomes `false` while `user` remains `null`. The condition `!isLoading && user` is never met. The component contains no timeout, no error display, and no redirection to `/login`. The merchant is permanently stuck looking at:
  ```
  [Spinner]
  Opening your shop...
  Finalizing your secure session
  ```
- **Remediation**:
  Add an `else` branch or timeout fallback:
  ```tsx
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        toast.error('Authentication failed. Please sign in again.');
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);
  ```

---

### Finding 3: Total Absence of React Error Boundaries
- **Severity**: **P0 (Architectural Vulnerability)**
- **Observed Files**: `frontend/src/App.tsx`, `frontend/src/main.tsx`
- **Mechanism**:
  Grep search for `ErrorBoundary` or `componentDidCatch` across `frontend/src` returned **0 results**.
  When any component throws during rendering (such as SVG coordinate calculation failures in Recharts, malformed JSON in `localStorage`, or undefined field accesses in admin/storefront components), React 19 unmounts the entire component tree. The user sees an unresponsive blank screen without an error message or a "Refresh" button.
- **Remediation**:
  Create an `ErrorBoundary.tsx` component and wrap `<AppContent />` in `App.tsx` as well as major route segments (`<Layout>`, `<AdminLayout>`).

---

### Finding 4: Authentication Token Breakdown on `/support`
- **Severity**: **P1 (High)**
- **Observed File**: `frontend/src/pages/SupportPage.tsx:19-27, 64-66, 82-84`
- **Verbatim Code**:
  ```tsx
  const API = import.meta.env.VITE_API_URL || '/api';
  ...
  const token = localStorage.getItem('fera_token');

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.tickets);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };
  ```
- **Mechanism**:
  FeraSetu manages authentication tokens via WorkOS AuthKit and `frontend/src/services/authBridge.ts` via `setWorkOSTokenGetter`. The application never stores a token in `localStorage.getItem('fera_token')`.
  `SupportPage.tsx` imports raw `axios` rather than `api` from `../services/api`. Consequently:
  1. `token` is evaluated as `null`.
  2. The request sends header `Authorization: Bearer null`.
  3. The backend returns 401 Unauthorized.
  4. The merchant sees an immediate toast error: `"Failed to load tickets"`. Ticket creation (`handleCreateTicket`) and replies (`handleSendReply`) similarly fail with 401.
- **Remediation**:
  Refactor `SupportPage.tsx` to use the shared client `api` from `../services/api` (`api.get('/tickets')`, `api.post('/tickets')`), which automatically injects valid WorkOS Bearer tokens and supports local mock fallback.

---

### Finding 5: Uncaught Runtime TypeErrors on Null Data in Admin Pages
- **Severity**: **P1 (High)**
- **Observed Files**:
  - `frontend/src/pages/AdminMeetingsPage.tsx:63-67`
  - `frontend/src/pages/AdminOrdersPage.tsx:80, 91`
- **Verbatim Code**:
  ```tsx
  // AdminMeetingsPage.tsx lines 63-67:
  const filteredMeetings = meetings.filter(m => 
    m.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    m.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.customer_email.toLowerCase().includes(search.toLowerCase())
  );

  // AdminOrdersPage.tsx line 80:
  <div className="font-black text-slate-900">#{order.id.slice(0, 8)}</div>
  ```
- **Mechanism**:
  - In `AdminMeetingsPage.tsx`, `m.customer_name` and `m.customer_email` lack optional chaining (`?.`). If any meeting record has a null or undefined customer name or email, `.toLowerCase()` throws an unhandled `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`, crashing the entire page.
  - In `AdminOrdersPage.tsx`, `order.id` is not coerced to string and lacks a null-guard before `.slice(0, 8)`. If `order.id` is missing or numeric, `order.id.slice` throws an unhandled `TypeError`.
  - In `AdminDashboardPage.tsx:59`, `data?.stats?.totalRevenue?.toLocaleString()` yields `₹undefined` when totalRevenue is null or zero.
- **Remediation**:
  Add defensive optional chaining and null coalescing:
  ```tsx
  m.customer_name?.toLowerCase()?.includes(search.toLowerCase()) ||
  m.customer_email?.toLowerCase()?.includes(search.toLowerCase())
  ```
  and `String(order.id || '').slice(0, 8)`.

---

### Finding 6: Infinite Loading Freeze in `ShopPage.tsx` When Shop Name is Unset
- **Severity**: **P1 (High)**
- **Observed File**: `frontend/src/pages/ShopPage.tsx:42-60`
- **Verbatim Code**:
  ```tsx
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopName) return;
    axios.get<PublicShopData>(`${API}/website/public/${shopName}`)
      .then(res => { setData(res.data); })
      .catch(err => { ... })
      .finally(() => setLoading(false));
  }, [shopName]);
  ```
- **Mechanism**:
  `loading` is initialized to `true`. If `shopName` cannot be determined from params or hostname (e.g. invalid subdomain or direct access without shop parameter), the `useEffect` returns immediately at line 47. Because `setLoading(false)` is only inside `.finally()` of the axios promise, `loading` remains `true` forever, trapping the user on the "Loading store…" spinner.
- **Remediation**:
  ```tsx
  useEffect(() => {
    if (!shopName) {
      setLoading(false);
      setError('Shop name not provided');
      return;
    }
    ...
  }, [shopName]);
  ```

---

### Finding 7: Side-Effect in React State Updater in `FeraAIPage.tsx`
- **Severity**: **P2 (Medium)**
- **Observed File**: `frontend/src/pages/FeraAIPage.tsx:482-491`
- **Verbatim Code**:
  ```tsx
  setMessages(prev => {
    const updatedMessages = [...prev, userMsg];
    const history = updatedMessages
      .filter(m => m.id !== 'fera-welcome')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));
    sendMutation.mutate({ message: trimmed, conversationHistory: history });
    return updatedMessages;
  });
  ```
- **Mechanism**:
  Invoking `sendMutation.mutate()` inside `setMessages(prev => ...)` violates React's pure function rule for state updaters. In React 19 / 18 Strict Mode and concurrent rendering, updater functions can be executed twice by React, triggering two parallel POST requests to `/v1/ai/chat` or `/ai/chat`, consuming 2 AI credits per message and corrupting chat history.
- **Remediation**:
  Compute `history` from current `messages` state outside `setMessages`, call `setMessages([...messages, userMsg])`, and invoke `sendMutation.mutate(...)` as a separate statement.

---

### Finding 8: Broken Admin Impersonation Mode
- **Severity**: **P2 (Medium)**
- **Observed File**: `frontend/src/pages/AdminUsersPage.tsx:73-76`
- **Verbatim Code**:
  ```tsx
  // Store user token and redirect to dashboard
  localStorage.setItem('token', res.data.token);
  localStorage.setItem('user', JSON.stringify(res.data.user));
  toast.success(`Entering impersonation mode: ${res.data.user.name}`);
  window.open('/dashboard', '_blank');
  ```
- **Mechanism**:
  `AuthContext.tsx` stores and reads user profile from `localStorage.getItem('fera_user')`, NOT `'user'`, and expects WorkOS session or bridge tokens. Writing `'token'` and `'user'` does nothing to authorize the merchant session. When `/dashboard` opens in a new tab, `ProtectedRoute` checks `useAuth().user`, finds no valid session, and redirects to `/login`.
- **Remediation**:
  Store to `'fera_user'` and configure an impersonation bridge in `AuthContext`:
  ```tsx
  localStorage.setItem('fera_user', JSON.stringify(res.data.user));
  localStorage.setItem('fera_impersonate_token', res.data.token);
  ```

---

### Finding 9: Dead Interactive Elements Across Merchant & Admin Headers
- **Severity**: **P2 (Medium)**
- **Observed Locations**:
  - `frontend/src/components/Layout.tsx:244-254`: Notification Bell has badge with pending orders count, but zero `onClick` handler.
  - `frontend/src/components/Layout.tsx:224-231`: Topbar search input has no `onChange`, `value`, or submit handler.
  - `frontend/src/components/Layout.tsx:163-178`: Sidebar store card has `ChevronDown` but no interactive dropdown.
  - `frontend/src/pages/DashboardPage.tsx:403-407, 542-544`: Calendar date pill (`{dateRangeText} <ChevronDown />`) and Sales Overview range (`Last 7 Days <ChevronDown />`) have `cursor-pointer` but zero `onClick` handlers.
  - `frontend/src/pages/AdminDashboardPage.tsx:99-102`: `<select>` element for chart range has no `value` or `onChange` handler.
  - `frontend/src/components/admin/AdminLayout.tsx:123-126`: Topbar notification bell has zero `onClick` handler.
- **Remediation**:
  Wire all notification bells to navigate to `/orders` (or `/admin/orders`), wire the search input to a filter or search modal, wire date selectors to state, or remove misleading interactive styles (`cursor-pointer`, `ChevronDown`) if static.

---

### Finding 10: Inconsistent Hard Links in SEO Pages and Localized Routing
- **Severity**: **P2 (Medium)**
- **Observed Locations**:
  - `frontend/src/pages/OnlineDukaanBanaye.tsx:70, 170`: `<a href="/register">`
  - `frontend/src/pages/FreeOnlineStore.tsx:70`: `<a href="/register">`
  - `frontend/src/pages/ShopifyAlternativeIndia.tsx:70`: `<a href="/register">`
  - `frontend/src/pages/KiranaStoreOnline.tsx:70`: `<a href="/register">`
  - `frontend/src/pages/TermsPage.tsx:946`: `<Link to={getLocalizedLink('/support')}>`
  - `frontend/src/i18n/config.ts:37-48`: `PUBLIC_ROUTES`
- **Mechanism**:
  - Plain `<a>` tags cause cold full-page document requests, destroying the active React context, reloading all assets, and causing jarring page flashes.
  - `TermsPage.tsx` links to `getLocalizedLink('/support')`, but `/support` is not registered in `PUBLIC_ROUTES` or in `/:lang` route block. Navigating to `/support` from public terms redirects unauthenticated users to `/login`.
- **Remediation**:
  Convert all `<a href="/register">` tags in SEO pages to `<Link to="/register">` or `button onClick={() => register()}`. Add a public contact/support section or route for unauthenticated visitors.

---

### Finding 11: Orphaned Dead Code in Repository
- **Severity**: **P3 (Low / Hygiene)**
- **Observed File**: `frontend/src/pages/AdminDashboard.tsx` (23,554 bytes)
- **Mechanism**:
  `frontend/src/App.tsx:39` imports `AdminDashboardPage.tsx` (`const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));`).
  `AdminDashboard.tsx` is an obsolete monolithic admin dashboard that is never imported, never compiled into router chunks, and sits as dead technical debt.
- **Remediation**:
  Remove `frontend/src/pages/AdminDashboard.tsx` to prevent developer confusion and bundle clutter.

---

## 3. Five-Component Formal Handoff Report

### 1. Observation
- **Route Definitions (`App.tsx:114-190`)**:
  All 10 public/SEO routes and 14 merchant routes are registered with lazy loading and code splitting.
- **Email Verification Loop (`App.tsx:83-86`, `VerifyEmailPage.tsx:7-11`)**:
  `ProtectedRoute` enforces `if (!user.is_verified && !isVerifyPage) return <Navigate to="/verify-email" replace />;`.
  `VerifyEmailPage.tsx` mounts and calls `navigate('/dashboard')`. This directly forms an infinite loop when `user.is_verified === false`.
- **Callback Deadlock (`AuthCallbackPage.tsx:10-14`)**:
  `useEffect` solely triggers `if (!isLoading && user) navigate('/dashboard')`. No handler exists for `!isLoading && !user`.
- **Support Route Failure (`SupportPage.tsx:19, 25, 65, 83`)**:
  Calls `axios.get(`${API}/tickets`, { headers: { Authorization: `Bearer ${localStorage.getItem('fera_token')}` } })`. `localStorage.getItem('fera_token')` returns `null`.
- **Null Reference Crashes (`AdminMeetingsPage.tsx:64`, `AdminOrdersPage.tsx:80`)**:
  Calls `m.customer_name.toLowerCase()` without `?.` and `order.id.slice(0, 8)` without checking `order.id`.
- **Error Boundaries**:
  Grep for `ErrorBoundary` in `frontend/src` yielded 0 matches.

### 2. Logic Chain
1. *From App.tsx line 84 & VerifyEmailPage.tsx line 10*: Any unverified user navigating to `/dashboard` is redirected to `/verify-email`. The page mounts, executes `navigate('/dashboard')`, which is intercepted by `ProtectedRoute`, creating a continuous cycle of React navigation events that freezes the JavaScript event loop.
2. *From SupportPage.tsx line 19 & AuthContext.tsx line 74*: Auth tokens are provided by WorkOS via `getWorkOSToken()` in `authBridge.ts` and consumed by `remoteApi` interceptors. `SupportPage.tsx` relies on a non-existent `fera_token` key in `localStorage` and bypasses the `api` client, causing every ticket API call to fail with HTTP 401 Unauthorized.
3. *From AdminMeetingsPage.tsx line 64*: If a meeting booking in D1/SQLite has a null customer name, executing `.toLowerCase()` on undefined throws a fatal `TypeError`. In the absence of an `ErrorBoundary`, React unmounts the root component tree.
4. *From FeraAIPage.tsx line 489*: React 18/19 invokes functional state updaters twice in strict mode. Invoking a TanStack mutation side-effect (`sendMutation.mutate()`) within `setMessages(prev => ...)` results in duplicate POST requests and double credit consumption.

### 3. Caveats
- Backend API implementation details for `/admin/*` were verified via frontend client code and types; actual backend responses depend on Cloudflare Worker / Express server deployment.
- Mobile viewport checks were conducted via CSS stylesheet and Tailwind breakpoint inspection (`md:hidden`, `lg:flex`).
- Statsig telemetry initialization in `main.tsx` is deferred via `initDeferredStatsig()`, which prevents blocking initial route hydration.

### 4. Conclusion
FeraSetu's routing architecture is well-structured with code splitting, clean route definitions, and responsive merchant layouts. However, before release, **3 critical blockers (P0)** must be patched:
1. Break the `/verify-email` infinite redirect loop.
2. Add error and timeout handling to `/callback`.
3. Wrap the application in a top-level React `ErrorBoundary`.

Additionally, **3 high-priority bugs (P1)** must be resolved:
1. Convert `SupportPage.tsx` to use the shared `api` client.
2. Add defensive optional chaining (`?.`) in `AdminMeetingsPage.tsx` and `AdminOrdersPage.tsx`.
3. Guard `ShopPage.tsx` against undefined shop names.

### 5. Verification Method
1. **Verify `/verify-email` Loop Fix**:
   - Set `user.is_verified = false` in `localStorage.getItem('fera_user')`.
   - Navigate to `/dashboard`. Verify no infinite redirect loop occurs and a clean verification notice is displayed.
2. **Verify `/callback` Error Handling**:
   - Navigate to `/callback` with unauthenticated state.
   - Verify that after 3 seconds or when `isLoading` resolves to false without a user, it notifies the user and redirects to `/login`.
3. **Verify `/support` Ticket Fetching**:
   - Log into merchant workspace and navigate to `/support`.
   - Verify network request is dispatched to `/api/tickets` with a valid `Authorization: Bearer <token>` and no 401 error toast appears.
4. **Verify Null Resilience in Admin**:
   - Inject meeting object `{ id: '1', customer_name: null, customer_email: null }` into `AdminMeetingsPage`.
   - Verify page renders without crashing.
5. **Verify Build**:
   - Run `npm run build` in `frontend/` to confirm 0 TypeScript errors and clean chunk output.

---

## 4. Prioritized Fix Implementation Guide for Engineers

### Fix 1: `frontend/src/App.tsx` & `frontend/src/pages/VerifyEmailPage.tsx`
Replace the deprecated redirect in `VerifyEmailPage.tsx`:
```tsx
// frontend/src/pages/VerifyEmailPage.tsx
import { Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';

export default function VerifyEmailPage() {
  return (
    <>
      <SEO title="Verify Your Email • FeraSetu" noindex />
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060818] px-4 text-center">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
            <Mail size={28} />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Verify your email address</h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Please check your inbox to confirm your account. Once verified, you can access your merchant workspace.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            <span>Check verification status</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </>
  );
}
```

### Fix 2: `frontend/src/pages/AuthCallbackPage.tsx`
Add error fallback and timeout redirect:
```tsx
// frontend/src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else if (timedOut) {
        toast.error('Sign in timed out or was cancelled. Please try again.');
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, timedOut, navigate]);

  return (
    <>
      <SEO title="Opening your shop • FeraSetu" noindex />
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060818] px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <span
            className="h-10 w-10 animate-spin rounded-full border-3 border-blue-500 border-t-transparent"
            role="status"
            aria-label="Opening your shop..."
          />
          <p className="text-base font-semibold text-slate-200">
            Opening your shop...
          </p>
          <p className="text-xs text-slate-500">
            Finalizing your secure session
          </p>
        </div>
      </div>
    </>
  );
}
```

### Fix 3: `frontend/src/pages/SupportPage.tsx`
Switch to shared `api` client:
```tsx
// Replace lines 2, 6, 19, 24-26 with:
import api from '../services/api';

// In fetchTickets:
const res = await api.get('/tickets');
setTickets(res.data.tickets || []);

// In fetchReplies:
const res = await api.get(`/tickets/${ticketId}/replies`);
setReplies(res.data.replies || []);

// In handleCreateTicket:
await api.post('/tickets', formData);

// In handleSendReply:
await api.post(`/tickets/${selectedTicket.id}/replies`, { content: replyText });
```

### Fix 4: `frontend/src/pages/AdminMeetingsPage.tsx`
Guard search filter:
```tsx
const filteredMeetings = meetings.filter(m => 
  (m.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
  (m.business_name || '').toLowerCase().includes(search.toLowerCase()) ||
  (m.customer_email || '').toLowerCase().includes(search.toLowerCase())
);
```

### Fix 5: `frontend/src/pages/FeraAIPage.tsx`
Separate side-effect from state updater:
```tsx
const sendMessage = useCallback(
  (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    const history = updatedMessages
      .filter(m => m.id !== 'fera-welcome')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    sendMutation.mutate({ message: trimmed, conversationHistory: history });
    setInput('');
    setActiveCategory(null);
  },
  [messages, sendMutation],
);
```

---
*Report generated and validated by explorer_routes_gen4.*

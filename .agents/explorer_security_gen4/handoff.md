# Comprehensive Defensive Security & Route Access Hardening Audit Report

**Target System**: FeraSetu (All-in-one Online Store, WhatsApp Commerce, and AI Assistant for Indian Shopkeepers)  
**Auditor**: explorer_security_gen4 (Defensive Security & Route Access Hardening Specialist)  
**Date**: 2026-09-05  
**Working Directory**: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\explorer_security_gen4`  

---

## 1. Observation

### 1.1 Protected Route Enforcement & Auth State Leakage

1. **Route Guard Structure in `frontend/src/App.tsx`**:
   - Lines 119–133 wrap all merchant routes (`/dashboard`, `/products`, `/orders`, `/analytics`, `/fera-ai`, `/ai-assistant`, `/ai-credits`, `/website-builder`, `/survey-feedback`, `/settings/email`, `/refer-earn`, `/upgrade`, `/support`, `/get-started`) with `<ProtectedRoute><Layout><Component /></Layout></ProtectedRoute>`.
   - Lines 163–178 wrap admin subroutes (`/admin/dashboard`, `/admin/users`, `/admin/shops`, `/admin/meetings`, `/admin/orders`, `/admin/tickets`, `/admin/system`) with `<AdminProtectedRoute>`.
   - Lines 181–185 wrap `/verify-email` with `<ProtectedRoute>`.
   - Lines 70–89 in `frontend/src/App.tsx`:
     ```tsx
     function ProtectedRoute({ children }: { children: React.ReactNode }) {
       const { user, isLoading } = useAuth();
       if (isLoading) return (
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
           <div style={{ textAlign: 'center' }}>
             <div style={{ width: 40, height: 40, border: '3px solid #FF6B35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
             <p style={{ color: '#64748B' }}>Loading FeraSetu...</p>
           </div>
         </div>
       );

       if (!user) return <Navigate to="/login" replace />;

       const isVerifyPage = window.location.pathname === '/verify-email';
       if (!user.is_verified && !isVerifyPage) {
         return <Navigate to="/verify-email" replace />;
       }

       return <>{children}</>;
     }
     ```
   - **Result**: While `isLoading` is true, the spinner is returned. The protected merchant `children` are **never** mounted or evaluated before authentication is determined. When `!user`, it redirects directly to `/login`.

2. **Admin Route Guard in `frontend/src/components/admin/AdminProtectedRoute.tsx`**:
   - Lines 8–41:
     ```tsx
     export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
       const [verified, setVerified] = useState<boolean | null>(null);
       const token = localStorage.getItem('admin_token');
       
       useEffect(() => {
         if (!token) {
           setVerified(false);
           return;
         }

         // Verify token with the backend — client-side JWT parsing is not enough.
         axios.get(`${API}/admin/verify`, {
           headers: { Authorization: `Bearer ${token}` },
         })
           .then(() => setVerified(true))
           .catch(() => {
             localStorage.removeItem('admin_token');
             setVerified(false);
           });
       }, [token]);

       if (verified === null) {
         return (
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
             <div style={{ width: 40, height: 40, border: '3px solid #FF6B35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
           </div>
         );
       }

       if (!verified) {
         return <Navigate to="/admin" replace />;
       }
        
       return <>{children}</>;
     }
     ```
   - **Result**: `verified` initializes to `null` (rendering spinner). Only if backend verification `/admin/verify` returns HTTP 200 does `verified` become `true`. If absent or invalid, it redirects to `/admin`. Protected admin views are not rendered prematurely.

3. **Client Storage & Auth State Persistence**:
   - In `frontend/src/contexts/AuthContext.tsx`:
     - Line 53–60:
       ```tsx
       const [profile, setProfile] = useState<User | null>(() => {
         try {
           const saved = localStorage.getItem('fera_user');
           return saved ? JSON.parse(saved) : null;
         } catch {
           return null;
         }
       });
       const [isProfileLoading, setIsProfileLoading] = useState(true);
       ```
     - Lines 209–217:
       ```tsx
       useEffect(() => {
         if (profile) {
           try {
             localStorage.setItem('fera_user', JSON.stringify(profile));
           } catch (e) {
             console.error('Failed to persist profile:', e);
           }
         }
       }, [profile]);
       ```
     - Line 84–98 (`setUnauthorizedHandler` on 401 API failure):
       ```tsx
       useEffect(() => {
         setUnauthorizedHandler(({ status, url, error }) => {
           if (url.includes('/users/me')) return;
           const detail = error instanceof Error ? error.message : 'Unauthorized';
           const label = 'Authenticated API request';
           setProfileError(`${label} failed (${status} ${url}): ${detail}`);
           setProfile(null);
           setIsProfileLoading(false);
           if (import.meta.env.DEV) {
             console.error(`Authenticated API returned ${status} for ${url}`, error);
           }
         });
         return () => setUnauthorizedHandler(null);
       }, []);
       ```
     - **Observed Defect**: When `setProfile(null)` is called on a 401 API failure, `if (profile)` in line 210 evaluates to false. `localStorage.removeItem('fera_user')` is **never executed** in `setUnauthorizedHandler`. Consequently, the stale `fera_user` persists in client `localStorage`. On page refresh, line 55 temporarily hydrates `profile` with the old user data until the asynchronous WorkOS session check completes.
     - **Admin Token**: `AdminLogin.tsx` line 21 executes `localStorage.setItem('admin_token', res.data.token)`. Storing long-lived admin JWT credentials in browser `localStorage` exposes them to potential exfiltration via XSS.

---

### 1.2 API Communication & Authorization Interceptors

1. **Axios Client Interceptors in `frontend/src/services/api.ts`**:
   - Lines 1168–1179:
     ```typescript
     remoteApi.interceptors.request.use(async (config) => {
       if (config.headers.Authorization) {
         return config;
       }
       const token = await getWorkOSToken();
       if (token) {
         config.headers.Authorization = `Bearer ${token}`;
       }
       return config;
     }, (error) => {
       return Promise.reject(error);
     });
     ```
   - Lines 1182–1194:
     ```typescript
     remoteApi.interceptors.response.use(
       (response) => response,
       (error) => {
         if (error.response?.status === 401) {
           notifyUnauthorized({
             url: error.config?.url ?? '',
             status: 401,
             error,
           });
         }
         return Promise.reject(error);
       }
     );
     ```
   - **Observed Defect**: The response interceptor exclusively checks `status === 401`. Responses with `status === 403` (Forbidden — e.g. blocked user, account expired, insufficient permissions) are **completely ignored** by `notifyUnauthorized`, leaving the user stranded without graceful redirection.

2. **Bypasses of Centralized API Client (`api.ts`)**:
   - **`frontend/src/pages/SupportPage.tsx`**:
     - Line 19: `const token = localStorage.getItem('fera_token');`
     - Lines 24–26: `const res = await axios.get(`${API}/tickets`, { headers: { Authorization: `Bearer ${token}` } });`
     - Lines 37–39: `const res = await axios.get(`${API}/tickets/${ticketId}/replies`, { headers: { Authorization: `Bearer ${token}` } });`
     - Lines 64–66: `await axios.post(`${API}/tickets`, formData, { headers: { Authorization: `Bearer ${token}` } });`
     - Lines 82–84: `await axios.post(`${API}/tickets/${selectedTicket.id}/replies`, { content: replyText }, { headers: { Authorization: `Bearer ${token}` } });`
     - **Observed Defect**: `fera_token` is a legacy key from Clerk/custom JWT and is never set by the WorkOS AuthKit integration (`AuthContext.tsx`). Thus `token` evaluates to `null`, resulting in HTTP requests sent with header `Authorization: Bearer null`. Furthermore, because raw `axios` is called directly, 401 responses do not invoke `notifyUnauthorized`.
   - **Admin Pages** (`AdminDashboardPage.tsx`, `AdminUsersPage.tsx`, `AdminShopsPage.tsx`, `AdminMeetingsPage.tsx`, `AdminOrdersPage.tsx`, `AdminTicketsPage.tsx`, `AdminSystemPage.tsx`):
     - All admin pages make direct raw `axios` calls with `{ headers: { Authorization: `Bearer ${token}` } }`.
     - None of these pages register or use a response interceptor for 401/403. When an admin's JWT expires (24-hour limit in `worker/utils/auth.js` line 68), API requests fail with 401, triggering `toast.error('Failed to load...')` while leaving the admin on the page with stale or empty data rather than clearing `admin_token` and redirecting to `/admin`.
   - **`AdminUsersPage.tsx` Impersonation Defect**:
     - Lines 73–76:
       ```typescript
       localStorage.setItem('token', res.data.token);
       localStorage.setItem('user', JSON.stringify(res.data.user));
       toast.success(`Entering impersonation mode: ${res.data.user.name}`);
       window.open('/dashboard', '_blank');
       ```
     - **Observed Defect**: Writes to keys `'token'` and `'user'`, whereas `useAuth()` only reads from WorkOS SDK and `'fera_user'`. The newly opened tab immediately redirects to `/login` because `useAuth()` does not recognize these keys.

3. **Backend & Worker CORS Configuration**:
   - **Cloudflare Worker (`worker/index.js` lines 38–70)**:
     ```javascript
     const ALLOWED_ORIGINS = [
       "https://ferasetu.com",
       "https://www.ferasetu.com",
       "http://localhost:5173",
       "http://127.0.0.1:5173"
     ];
     function isOriginAllowed(origin) {
       if (!origin) return false;
       if (ALLOWED_ORIGINS.includes(origin)) return true;
       try {
         const url = new URL(origin);
         const host = url.hostname;
         return host.endsWith(".ferasetu.com") || host.endsWith(".fera-search.tech");
       } catch {
         return false;
       }
     }
     ```
     - Response headers set: `Access-Control-Allow-Origin: <allowedOrigin>`, `Access-Control-Allow-Credentials: true`.
     - Non-allowed origins fall back to `https://ferasetu.com`, preventing unauthorized third-party cross-origin credentialed reads.
   - **Worker Admin Routes (`worker/routes/admin.js` lines 20 & 50)**:
     - Hardcodes `"Access-Control-Allow-Origin": "https://ferasetu.com"`.
     - **Observed Defect**: Admin requests initiated from local development (`http://localhost:5173`) or preview domains will be blocked by browser CORS preflights because `localhost:5173` is not allowed on admin endpoints.
   - **Express Backend (`backend/src/index.ts` lines 101–113)**:
     - Origin validator dynamically checks `ALLOWED_ORIGINS` and `origin.endsWith('.fera-search.tech')`.
     - Invalid origins trigger `callback(new Error('Not allowed by CORS'))`.

4. **Error Handling & Information Leakage**:
   - **Express Backend (`backend/src/middleware/errorHandler.ts` lines 9–22)**:
     - Status 500 errors are masked to `'Internal server error'`. Stack traces are logged server-side and excluded from client JSON response.
   - **Cloudflare Worker (`worker/index.js` lines 1030–1036)**:
     - Unexpected runtime exceptions are caught by top-level `catch (err)` and masked to `'Internal server error'` (HTTP 500).
   - **Worker Information Exposures**:
     - `worker/index.js` line 171:
       ```javascript
       throw new HttpError(`Unauthorized: Invalid session signature or expired token (${err.message})`, 401);
       ```
       Directly exposes internal Jose cryptographic verification failure messages (`err.message`) to clients.
     - `worker/index.js` line 777:
       ```javascript
       throw new HttpError(`AI service error (${response.status}).`, 503, errBody);
       ```
       Directly forwards upstream third-party AI provider raw error responses (`details: errBody`) to the client.

5. **FS-06 Unpatched Financial Manipulation in `worker/index.js`**:
   - Lines 428–436:
     ```javascript
     // total: use provided value if valid, else sum item.price * item.qty.
     let total = Number(body.total);
     if (!Number.isFinite(total) || total < 0) {
       total = items.reduce((sum, it) => {
         const p = Number(it?.price) || 0;
         const q = Number(it?.qty ?? it?.quantity) || 0;
         return sum + p * q;
       }, 0);
     }
     ```
   - **Observed Defect**: `worker/index.js` still contains the unpatched logic from FS-06. If a client transmits `body.total = 1`, `Number.isFinite(1)` is true and `1 >= 0`, so `total` is set to ₹1 regardless of the catalog value of the items. Authoritative product prices in D1 are never referenced during order total calculation.

6. **Worker vs Express API Feature Disparity**:
   - In `frontend/.env`, the system is configured with `VITE_API_URL=https://ferasetu.singhantima203.workers.dev/api` and `VITE_USE_LOCAL_STORAGE=false`.
   - The Cloudflare Worker routing table (`worker/index.js` lines 900–1003) only implements:
     `GET /api/health`, `GET/PUT /api/users/me`, `GET/POST /api/products`, `GET/POST /api/orders`, `GET /api/analytics/dashboard`, `GET/POST/PATCH /api/meetings`, `POST /api/v1/ai/chat`, `GET /api/pricing/founding-offer`, and `/api/admin/*`.
   - The following critical endpoints called by the frontend are **missing from the Worker**:
     - `PUT /api/products/:id` (Product edit in `ProductsPage.tsx:180`) → Returns 404
     - `DELETE /api/products/:id` (Product delete in `ProductsPage.tsx:101`) → Returns 404
     - `POST /api/orders/create` (Public shop customer checkout in `ProductGridSection.tsx:248`) → Returns 404
     - `GET /api/orders/public/track` (Public order tracking in `TrackOrderModal.tsx:25`) → Returns 404
     - `GET /api/website/public/:shopName` (Public storefront loading in `ShopPage.tsx:48`) → Returns 404
     - `GET/PUT /api/settings/smtp` (Email settings in `EmailSettingsPage.tsx:230, 284`) → Returns 404
     - `GET/POST /api/tickets` (Support ticketing in `SupportPage.tsx:24, 64`) → Returns 404

---

### 1.3 Input Sanitization & XSS Defense

1. **HTML Injection & DOM Manipulation**:
   - Zero occurrences of `dangerouslySetInnerHTML` or `.innerHTML` exist across the entire `frontend/src` codebase.
   - All text interpolations in user views use React JSX data bindings (`{text}`), ensuring automatic HTML entity escaping by React.

2. **Template Sanitization via DOMPurify**:
   - All shop template sections import and execute `isomorphic-dompurify`:
     - `BannerSection.tsx` line 9: `DOMPurify.sanitize(input, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'a'], ... })`
     - `ContactSection.tsx` line 9: `DOMPurify.sanitize(input, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br', 'p'], ... })`
     - `FooterSection.tsx` line 20: `DOMPurify.sanitize(input, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br', 'p', 'a'], ... })`
     - `HeroSection.tsx` line 10: `DOMPurify.sanitize(input, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br'], ... })`
     - `ProductGridSection.tsx` line 25: `DOMPurify.sanitize(input, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br', 'p'], ... })`

3. **Broken URL Sanitization in `frontend/src/components/shop/sections/FooterSection.tsx`**:
   - Lines 4–13:
     ```typescript
     function sanitizeUrl(input: string): string {
       const sanitized = DOMPurify.sanitize(input, {
         ALLOWED_TAGS: ['a'],
         ALLOWED_ATTR: ['href', 'target', 'rel'],
         ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/,
       });
       // Extract href from sanitized result
       const match = sanitized.match(/href="([^"]+)"/);
       return match ? match[1] : '#';
     }
     ```
   - **Observed Defect**: The function attempts to extract `href="([^"]+)"` from the sanitized string. However, merchant social links provided via settings are plain URLs (e.g. `https://instagram.com/mykirana`). Because no `<a href="...">` markup is present in the raw input, `match` is always `null`, forcing all valid social media links to render as `'#'`.

4. **AI Assistant Prompt & Response Handling**:
   - `worker/index.js` line 797 enforces an input ceiling: `if (!message || message.length > 4000) throw new HttpError('message is required and must be under 4000 characters', 422);`.
   - `frontend/src/pages/AIAssistantPage.tsx` lines 26–35 (`formatContent`) and `frontend/src/pages/FeraAIPage.tsx` lines 145–168 (`formatMessage`) strip `<think>` tags and parse markdown formatting (`**bold**`) into native React elements (`<strong key={j}>{part}</strong>`), avoiding any HTML injection vulnerabilities in model responses.

5. **Auth Callback Resilience in `frontend/src/pages/AuthCallbackPage.tsx`**:
   - Lines 10–14:
     ```tsx
     useEffect(() => {
       if (!isLoading && user) {
         navigate('/dashboard', { replace: true });
       }
     }, [user, isLoading, navigate]);
     ```
   - **Observed Defect**: If WorkOS fails authentication (e.g. invalid state, cancelled login, expired code), `isLoading` becomes false while `user` remains null. The page has no fallback or timeout; it hangs indefinitely on the loading screen without user feedback or redirection to `/login`.

---

## 2. Logic Chain

```
[Observation 1.1.1 & 1.1.2: isLoading starts true; ProtectedRoute & AdminProtectedRoute render spinners before checking user/verified]
    ──> [Inference 1]: Unauthenticated visitors cannot observe protected merchant or admin DOM nodes during initial page loads.
    ──> [Conclusion 1]: Route access gates prevent visual state leakage and immediate access without credentials.

[Observation 1.1.3: setUnauthorizedHandler sets profile to null on 401 but does not invoke localStorage.removeItem('fera_user')]
    ──> [Inference 2]: Stale merchant profile remains in browser storage following session invalidation.
    ──> [Inference 3]: Any XSS vulnerability allows persistent extraction of merchant PII from localStorage.
    ──> [Conclusion 2]: Auth state synchronization has client-side persistence vulnerabilities.

[Observation 1.2.1: remoteApi.interceptors.response only checks error.response?.status === 401; ignores 403]
    ──> [Inference 4]: 403 Forbidden responses (blocked accounts, tier access denied, plan expirations) fail silently.
    ──> [Conclusion 3]: Authorization rejection states are not handled gracefully by the HTTP client.

[Observation 1.2.2: SupportPage uses raw axios with localStorage.getItem('fera_token') which is null]
    ──> [Inference 5]: All support ticket requests transmit 'Authorization: Bearer null'.
    ──> [Conclusion 4]: Merchant support ticketing is non-functional under WorkOS AuthKit.

[Observation 1.2.5: worker/index.js lines 429-436 accepts body.total if finite and non-negative]
    ──> [Inference 6]: An attacker can submit an order with items worth ₹50,000 but pass body.total = 1.
    ──> [Inference 7]: Worker inserts order with total = 1 into D1 without verifying product prices.
    ──> [Conclusion 5]: High-severity financial calculation vulnerability (FS-06) remains active in Cloudflare Worker.

[Observation 1.2.6: Cloudflare Worker lacks routes for PUT/DELETE products, orders/create, orders/public/track, website/public, tickets, smtp]
    ──> [Inference 8]: Public customers cannot place orders or track them when VITE_API_URL targets the Worker.
    ──> [Inference 9]: Merchants cannot edit/delete products or configure SMTP email on the Worker backend.
    ──> [Conclusion 6]: Architecture divergence exists between Express backend and Cloudflare Worker endpoints.

[Observation 1.3.3: FooterSection sanitizeUrl expects href="..." regex from plain URL string]
    ──> [Inference 10]: All merchant social links fail regex match and resolve to '#'.
    ──> [Conclusion 7]: Defensive URL sanitization regex contains a functional defect.
```

---

## 3. Caveats

1. **Read-Only Scope**: This investigation was conducted purely via static code analysis, runtime build verification (`npm run build`), and synthetic unit test verification (`tests/security-regression.test.mjs`). No live modifications to source code were performed.
2. **Third-Party Providers**: WorkOS AuthKit authentication flows, Sarvam AI endpoints, and Cloudflare remote D1 production databases were evaluated based on codebase configuration and contract specifications, rather than live network penetration testing against external production servers.
3. **Dual Backend Operational State**: The codebase maintains both an Express server (`backend/`) and a Cloudflare Worker (`worker/`). The findings detail vulnerabilities in both environments, noting that `frontend/.env` is currently configured to target the Cloudflare Worker (`https://ferasetu.singhantima203.workers.dev/api`).

---

## 4. Conclusion & Hardening Roadmap

### 4.1 Executive Summary
FeraSetu's client-side route guards effectively prevent unauthenticated state leaks, and React's rendering pipeline combined with `isomorphic-dompurify` prevents XSS injection across storefront and AI views. However, critical vulnerabilities exist in order pricing calculation, session persistence on 401/403, and architectural route parity between the frontend and the Cloudflare Worker.

---

### 4.2 Hardening Priority Matrix

| Priority | Identifier | Category | Severity | Target File & Lines | Summary of Finding & Remediation |
|---|---|---|---|---|---|
| **P0** | SEC-P0-01 | Financial Logic | **CRITICAL** | `worker/index.js:428-437` | **Client-Supplied Order Total Manipulation (FS-06)**: Recompute order total strictly from authoritative D1 product database prices; never accept client `body.total`. |
| **P0** | SEC-P0-02 | Auth Failure | **HIGH** | `frontend/src/pages/SupportPage.tsx:19-85` | **Broken Bearer Token & Raw Axios Calls**: Replace raw `axios` and nonexistent `fera_token` with centralized `api` client (`import api from '../services/api'`). |
| **P1** | SEC-P1-01 | Session Mgmt | **HIGH** | `frontend/src/services/api.ts:1182-1194` & `AuthContext.tsx:84-101` | **Missing 403 Handling & Incomplete 401 Cleanup**: Intercept both 401 and 403; execute `localStorage.removeItem('fera_user')` inside `notifyUnauthorized` to prevent stale profile hydration. |
| **P1** | SEC-P1-02 | Route Parity | **HIGH** | `worker/index.js:930-1003` | **Missing Core Worker Endpoints**: Implement `PUT/DELETE /api/products/:id`, `POST /api/orders/create` (public), `GET /api/orders/public/track`, and `GET /api/website/public/:shopName` in Worker. |
| **P1** | SEC-P1-03 | Admin Auth | **HIGH** | `frontend/src/pages/Admin*.tsx` | **Admin Session Expiry Redirection**: Wrap admin HTTP requests with an Axios interceptor that removes `admin_token` and navigates to `/admin` upon 401/403. |
| **P2** | SEC-P2-01 | CORS Isolation | **MEDIUM** | `worker/routes/admin.js:20, 50` | **Hardcoded Admin CORS Origin**: Dynamically permit `ALLOWED_ORIGINS` (including `localhost:5173` for development) instead of rigid `https://ferasetu.com` string. |
| **P2** | SEC-P2-02 | Info Leakage | **MEDIUM** | `worker/index.js:171, 777` | **Internal Error & AI Payload Leakage**: Mask internal Jose JWT verification errors and third-party AI JSON stack details before responding to clients. |
| **P2** | SEC-P2-03 | Token Storage | **MEDIUM** | `frontend/src/pages/AdminLogin.tsx:21` | **Admin JWT in localStorage**: Migrate admin authentication token from browser `localStorage` to an HttpOnly, Secure, SameSite=Strict cookie. |
| **P3** | SEC-P3-01 | UX / Sanitization | **LOW** | `frontend/src/components/shop/sections/FooterSection.tsx:4-13` | **Broken URL Regex in sanitizeUrl**: Update `sanitizeUrl` to validate raw URLs against protocol regex (`/^(?:https?|mailto|tel):/i`) rather than searching for `<a href="...">` markup. |
| **P3** | SEC-P3-02 | Auth UX | **LOW** | `frontend/src/pages/AuthCallbackPage.tsx:10-15` | **Infinite Spinner on Failed Callback**: Add error query param detection and a 10-second fallback redirect to `/login` with an alert message. |

---

### 4.3 Concrete Code Hardening Snippets

#### Remediation 1: Fix Client-Supplied Order Total in `worker/index.js` (P0)
```javascript
// BEFORE (Vulnerable lines 428-436 in worker/index.js):
let total = Number(body.total);
if (!Number.isFinite(total) || total < 0) {
  total = items.reduce((sum, it) => {
    const p = Number(it?.price) || 0;
    const q = Number(it?.qty ?? it?.quantity) || 0;
    return sum + p * q;
  }, 0);
}

// AFTER (Hardened server-authoritative recalculation):
let calculatedTotal = 0;
const resolvedItems = [];

for (const it of items) {
  const productId = it.productId || it.product_id || it.id;
  const quantity = Math.max(1, Math.trunc(Number(it.qty ?? it.quantity ?? 1)));
  
  // Query authoritative price from D1 database
  const productRow = await env.DB.prepare(
    "SELECT id, name, price, sale_price FROM products WHERE id = ? AND user_id = ?"
  ).bind(productId, me.$id).first();

  if (!productRow) {
    throw new HttpError(`Product not found or unavailable: ${productId}`, 400);
  }

  const effectivePrice = Number.isFinite(Number(productRow.sale_price)) && Number(productRow.sale_price) > 0
    ? Number(productRow.sale_price)
    : Number(productRow.price);

  calculatedTotal += effectivePrice * quantity;
  resolvedItems.push({
    productId: productRow.id,
    name: productRow.name,
    price: effectivePrice,
    quantity,
    total: effectivePrice * quantity,
  });
}
const total = Math.round(calculatedTotal * 100) / 100;
```

#### Remediation 2: Unify SupportPage with `api.ts` (P0)
```typescript
// In frontend/src/pages/SupportPage.tsx:
// BEFORE:
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || '/api';
const token = localStorage.getItem('fera_token');
const res = await axios.get(`${API}/tickets`, { headers: { Authorization: `Bearer ${token}` } });

// AFTER:
import api from '../services/api';
const res = await api.get('/tickets');
```

#### Remediation 3: Handle 401 & 403 in `api.ts` & Clean Storage in `AuthContext.tsx` (P1)
```typescript
// In frontend/src/services/api.ts:
remoteApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      notifyUnauthorized({
        url: error.config?.url ?? '',
        status,
        error,
      });
    }
    return Promise.reject(error);
  }
);

// In frontend/src/contexts/AuthContext.tsx:
setUnauthorizedHandler(({ status, url, error }) => {
  if (url.includes('/users/me')) return;
  const detail = error instanceof Error ? error.message : 'Unauthorized';
  setProfileError(`Session expired or access denied (${status}): ${detail}`);
  setProfile(null);
  localStorage.removeItem('fera_user'); // Explicitly evict stale storage
  setIsProfileLoading(false);
});
```

#### Remediation 4: Fix URL Sanitization in `FooterSection.tsx` (P3)
```typescript
// In frontend/src/components/shop/sections/FooterSection.tsx:
// BEFORE:
function sanitizeUrl(input: string): string {
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/,
  });
  const match = sanitized.match(/href="([^"]+)"/);
  return match ? match[1] : '#';
}

// AFTER:
function sanitizeUrl(input: string): string {
  if (!input || typeof input !== 'string') return '#';
  const trimmed = input.trim();
  const SAFE_PROTOCOL_REGEX = /^(?:https?|mailto|tel):/i;
  if (!SAFE_PROTOCOL_REGEX.test(trimmed)) {
    return '#';
  }
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
```

---

## 5. Verification Method

### 5.1 Automated Test Execution

1. **Frontend Production Build Verification**:
   - Command: `npm run build` inside `frontend/`
   - Target: Vite bundle compilation and TypeScript checks.
   - Verified Output: Exited with code `0`. 0 compilation errors, 0 broken code-split chunk references.

2. **Security Regression Test Suite**:
   - Command: `node tests/security-regression.test.mjs`
   - Target: Confirms 60 unit assertions covering IDOR, AI credit usage, OTP storage, auth headers, admin JWT validation, price validation, product limits, CORS origins, and SQLi/XSS filters.
   - Output: 60 passed, 0 failed.

### 5.2 Manual Route & Guard Inspection Steps

1. **Unauthenticated Redirect Verification**:
   - Open browser incognito window.
   - Direct-navigate to `http://localhost:5173/dashboard`.
   - Verify that `<PageLoader>` appears immediately without rendering sidebar or dashboard cards, followed by instant transition to `/login`.
   - Repeat for `/products`, `/orders`, `/analytics`, `/fera-ai`, `/settings/email`, `/refer-earn`, and `/admin/dashboard`.

2. **CORS Origin Validation**:
   - Execute curl request with hostile origin:
     ```bash
     curl -i -X OPTIONS https://ferasetu.singhantima203.workers.dev/api/products \
       -H "Origin: https://malicious-attacker.com" \
       -H "Access-Control-Request-Method: GET"
     ```
   - Verify `Access-Control-Allow-Origin` returns `https://ferasetu.com` (not reflection of attacker domain).

3. **Invalidation Conditions**:
   - If WorkOS AuthKit is configured to store access tokens in `localStorage` instead of memory/cookie, token interception risks must be re-evaluated.
   - If the Express backend is decommissioned in favor of a 100% Cloudflare Worker architecture, all missing routes identified in Observation 1.2.6 must be deployed to the Worker before removing the Express server.

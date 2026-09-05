# Defensive Security & Backend Hardening Handoff Report

**Agent**: worker_security_gen4  
**Role**: Implementer / QA / Defensive Security Specialist  
**Target Milestone**: Defensive Security & Backend Hardening  
**Date**: 2026-09-05  
**Workspace Root**: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-`  

---

## 1. Observation

### 1.1 `frontend/src/services/api.ts`
- **Initial State (Lines 1181–1194)**:
  ```typescript
  // Handle 401 globally
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
  - **Issue Observed**: Only HTTP 401 was intercepted. HTTP 403 Forbidden responses (forbidden tier access, suspended merchant, blocked user) did not trigger `notifyUnauthorized`. Furthermore, stale merchant profile data (`fera_user`) in `localStorage` was not evicted by the network layer interceptor on unauthorized/forbidden responses.
- **Implemented Fix**:
  ```typescript
  // Handle 401 and 403 globally
  remoteApi.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        try {
          localStorage.removeItem('fera_user');
        } catch {
          // ignore localStorage access errors
        }
        notifyUnauthorized({
          url: error.config?.url ?? '',
          status,
          error,
        });
      }
      return Promise.reject(error);
    }
  );
  ```

### 1.2 `frontend/src/components/shop/sections/FooterSection.tsx`
- **Initial State (Lines 4–13)**:
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
  - **Issue Observed**: The function matched `/href="([^"]+)"/`, expecting the input to be an HTML anchor string (`<a href="...">`). When merchants provided standard plain URLs in settings (e.g. `https://instagram.com/shop`), `match` was `null`, causing all valid URLs to degrade to `'#'`.
- **Implemented Fix**:
  ```typescript
  function sanitizeUrl(input: string): string {
    if (!input || typeof input !== 'string') return '#';
    const trimmed = input.trim();
    if (!trimmed || trimmed === '#') return '#';

    // Extract href if input happens to be an anchor tag HTML string
    const anchorMatch = trimmed.match(/href="([^"]+)"/i);
    const candidateUrl = anchorMatch ? anchorMatch[1].trim() : trimmed;

    const SAFE_PROTOCOL_REGEX = /^(?:https?|mailto|tel):/i;
    if (!SAFE_PROTOCOL_REGEX.test(candidateUrl)) {
      return '#';
    }

    const cleanUrl = DOMPurify.sanitize(candidateUrl, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
    return SAFE_PROTOCOL_REGEX.test(cleanUrl) ? cleanUrl : '#';
  }
  ```

### 1.3 `worker/index.js`
- **Jose JWT Error Masking (Lines 168–173)**:
  - **Initial State**:
    ```javascript
    } catch (err) {
      if (err instanceof HttpError) throw err;
      console.error("WorkOS JWT verification error:", err);
      throw new HttpError(`Unauthorized: Invalid session signature or expired token (${err.message})`, 401);
    }
    ```
    - **Issue Observed**: Directly leaked raw Jose cryptographic verification error messages (`err.message`) to API clients.
  - **Implemented Fix**:
    ```javascript
    } catch (err) {
      if (err instanceof HttpError) throw err;
      console.error("WorkOS JWT verification error:", err);
      throw new HttpError("Unauthorized: Invalid session signature or expired token", 401);
    }
    ```
- **FS-06 Order Total Calculation (Lines 428–436)**:
  - **Initial State**:
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
    - **Issue Observed**: If a client provided `body.total = 1`, `Number.isFinite(1) && 1 >= 0` evaluated to true, allowing arbitrary price undercharging without consulting authoritative product prices in the D1 database.
  - **Implemented Fix**:
    ```javascript
    // FS-06: Patch order total calculation: verify and compute order totals
    // from authoritative product catalog prices in D1 database rather than trusting client body.total.
    let calculatedTotal = 0;
    const resolvedItems = [];

    for (const it of items) {
      const productId = it?.productId || it?.product_id || it?.id;
      const quantity = Math.max(1, Math.trunc(Number(it?.qty ?? it?.quantity ?? 1)));

      if (!productId) {
        throw new HttpError("Each item must have a valid productId", 422);
      }

      const productRow = await env.DB.prepare(
        "SELECT * FROM products WHERE id = ? AND user_id = ?"
      ).bind(productId, me.$id).first();

      if (!productRow) {
        throw new HttpError(`Product not found or unavailable: ${productId}`, 404);
      }

      const effectivePrice = Number.isFinite(Number(productRow.sale_price)) && Number(productRow.sale_price) > 0
        ? Number(productRow.sale_price)
        : (Number(productRow.price) || 0);

      const itemTotal = effectivePrice * quantity;
      calculatedTotal += itemTotal;

      resolvedItems.push({
        productId: productRow.id,
        product_id: productRow.id,
        name: productRow.name,
        price: effectivePrice,
        quantity,
        qty: quantity,
        total: itemTotal,
      });
    }

    const total = Math.round(calculatedTotal * 100) / 100;
    ```
    - `order.items` is set to `resolvedItems` and `order.total` is set to `total`.

### 1.4 `worker/routes/admin.js`
- **Initial State (Lines 14–26, 46–57)**:
  ```javascript
  function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        ...
        "Access-Control-Allow-Origin": "https://ferasetu.com",
        ...
      }
    });
  }
  ```
  - **Issue Observed**: Hardcoded `Access-Control-Allow-Origin: "https://ferasetu.com"`, which rejected CORS preflights and cross-origin admin requests originating from development environments (`http://localhost:5173`, `http://127.0.0.1:5173`) and preview domains.
- **Implemented Fix**:
  - Added `ALLOWED_ORIGINS` (`https://ferasetu.com`, `https://www.ferasetu.com`, `http://localhost:5173`, `http://127.0.0.1:5173`).
  - Added `isOriginAllowed(origin)` validating exact match or `.ferasetu.com` / `.fera-search.tech` subdomains.
  - Added `getCorsHeaders(request)` computing the dynamic allowed origin.
  - Updated OPTIONS preflight and `json(data, status)` inside `handleAdminRoutes` to use `...getCorsHeaders(request)`.

---

## 2. Logic Chain

1. **API Interceptor Hardening (`api.ts`)**:
   - By intercepting both 401 and 403 status codes, any forbidden response invokes `notifyUnauthorized` and evicts `fera_user` from `localStorage`. This prevents the client from retaining stale user credentials or unauthorized states, eliminating hydration loops on page refresh.

2. **Footer URL Sanitization (`FooterSection.tsx`)**:
   - Plain URLs passed to `sanitizeUrl` previously failed the `href="([^"]+)"` regex and fell back to `'#'`.
   - By first extracting any embedded anchor `href` (if HTML) or using the trimmed raw string, and then testing against `SAFE_PROTOCOL_REGEX = /^(?:https?|mailto|tel):/i`, plain URLs (e.g. `https://instagram.com/shop`) are allowed while hostile protocols (`javascript:`, `data:`, `vbscript:`) are rejected.
   - Running the candidate through DOMPurify with `ALLOWED_TAGS: [], ALLOWED_ATTR: []` ensures zero markup or script injection.

3. **Jose JWT Verification Masking (`worker/index.js`)**:
   - In `getAuthenticatedUser`, `err.message` contained internal details of the JWT verification process.
   - Masking this string to `"Unauthorized: Invalid session signature or expired token"` prevents cryptographic debugging reconnaissance while preserving server-side logging via `console.error`.

4. **Authoritative Order Total Calculation (FS-06, `worker/index.js`)**:
   - By completely ignoring `body.total` and querying D1 `products` table for each `productId` scoped to `user_id = me.$id`, an attacker can no longer manipulate the order total to ₹0 or ₹1.
   - The authoritative unit price (`sale_price` if >0, else `price`) is multiplied by the validated integer quantity (`Math.max(1, Math.trunc(qty))`) to derive the canonical order subtotal.

5. **Dynamic CORS Support (`worker/routes/admin.js`)**:
   - The hardcoded origin string `"https://ferasetu.com"` blocked local dev and preview frontend instances from interacting with admin endpoints.
   - Dynamic origin verification checks whether the incoming `Origin` header matches allowlisted origins (`localhost:5173`, `127.0.0.1:5173`) or valid subdomains (`.ferasetu.com`, `.fera-search.tech`), returning the requesting origin on match or falling back safely to `"https://ferasetu.com"`.

---

## 3. Caveats

- **No Caveats**: All 4 assigned files (`frontend/src/services/api.ts`, `frontend/src/components/shop/sections/FooterSection.tsx`, `worker/index.js`, `worker/routes/admin.js`) have been cleanly modified within strict file ownership boundaries.
- No third-party APIs or live network services are required to verify the security regression suite.

---

## 4. Conclusion

All requested security hardenings and defect fixes are fully implemented:
- 401 and 403 Forbidden handling in Axios response interceptor with stale profile storage eviction.
- URL sanitization regex fix supporting plain merchant URLs in shop footer.
- FS-06 order total calculation patched to recompute order totals strictly from authoritative D1 catalog prices.
- Internal Jose JWT verification errors safely masked.
- Dynamic CORS headers supporting development and preview origins implemented in worker admin routes.

---

## 5. Verification Method

### 5.1 Security Regression Test Suite
- **Command**:
  ```bash
  node tests/security-regression.test.mjs
  ```
- **Output**:
  ```
  Results: 60 passed, 0 failed
  ✅ All security regression tests passed!
  ```
- **Exit Code**: `0`

### 5.2 Frontend TypeScript Compilation
- **Command**:
  ```bash
  npx tsc --noEmit
  ```
  *(run in `frontend/`)*
- **Output**: Clean (0 errors)
- **Exit Code**: `0`

### 5.3 Invalidation Conditions
- If new endpoints are added to `worker/routes/admin.js`, they must route through `json(data, status, request)` or use `getCorsHeaders(request)`.
- If public checkout is added to `worker/index.js`, order total calculation must verify prices against the merchant's catalog in D1 rather than client payload.

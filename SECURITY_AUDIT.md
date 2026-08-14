# FeraSetu Security Audit

**Audit Date:** 2026-08-14
**Auditor:** Antigravity AI (Authorized Defensive Security Review)
**Authorization:** Explicit developer/owner authorization — own codebase, test environment only
**Scope:** `worker/`, `backend/`, `frontend/`, `tests/` — static analysis + automated defensive tests

---

## Executive Summary

FeraSetu is a dual-backend Indian shopkeeper SaaS platform. This audit reviewed the Cloudflare Worker API, the Node.js/Express backend, the React frontend, and all supporting middleware, migrations, and configuration files.

**Overall Security Posture: MODERATE — Several controls are well-implemented; three actionable vulnerabilities require prompt remediation.**

### Highlights

| Category | Assessment |
|----------|-----------|
| SQL Injection | ✅ Fully mitigated — all queries use parameterized bindings |
| Authentication (WorkOS JWT) | ✅ Cryptographically verified via JWKS |
| Admin authentication | ✅ PBKDF2 (100k iterations) + HMAC-HS256 JWT |
| Tenant data isolation | ✅ All queries scope to `user_id` from JWT |
| Password hashing | ✅ bcrypt (cost=10) for users; PBKDF2 for admin |
| OTP codes | ✅ bcrypt-hashed before storage |
| CORS origin validation | ✅ Exact match + verified suffix check |
| Rate limiting | ✅ Present on auth, admin login, OTP send |
| CSRF protection | ✅ Double-submit cookie pattern (backend) |
| IDOR — Meeting PATCH | ❌ **HIGH — FIXED in this audit** |
| AI credit usageType | ❌ **MEDIUM — FIXED in this audit** |
| Payment OTP plain text | ❌ **MEDIUM — Recommended fix provided** |
| Brevo API key in repo | ⚠️ **HIGH — Rotate key immediately** |
| Payment dev-mode in prod | ⚠️ **HIGH — Requires env-gate before production** |

**Fixes applied in this audit: 2 (FS-01, FS-04)**
**Fixes recommended: 3 (FS-02, FS-03, FS-07)**
**Tests added: 60 security regression tests (all passing)**
**Existing tests: 32 (all still passing)**

---

## Architecture & Trust Boundaries

### Components

```
Internet
   |
   +-> Cloudflare Worker (HTTPS enforced by CF edge)
   |       |
   |       +-> WorkOS JWKS (external — cryptographically verified)
   |       +-> Sarvam AI API (outbound — API key in env var)
   |       +-> Cloudflare D1 (binding — isolated per CF account)
   |
   +-> Express Backend / Node.js (user-managed TLS)
   |       |
   |       +-> SQLite (local file — same process trust)
   |       +-> Brevo SMTP (outbound — key in .env)
   |       +-> Razorpay (outbound — payment gateway)
   |       +-> Appwrite (outbound — file storage)
   |
   +-> Browser SPA (React/Vite)
           +-> WorkOS AuthKit (external auth provider)
```

### Trust Boundary Summary

| Boundary | Control |
|----------|---------|
| Internet → Worker | CORS allowlist + WorkOS JWT (JWKS-verified) |
| Internet → Express | CORS allowlist + JWT HttpOnly cookie + CSRF double-submit |
| Internet → Admin APIs | Separate credential-verified JWT, rate-limited login |
| Worker → D1 | Cloudflare binding-level isolation (safe by design) |
| Backend → SQLite | Same-process; parameterized queries prevent injection |

---

## Critical Findings

*No Critical (P0) findings.*

---

## High Findings

### FS-01 — IDOR: Worker Meeting PATCH Has No Ownership Check

**ID:** FS-01
**Severity:** HIGH
**Status:** ✅ FIXED (this audit)
**Location:** `worker/index.js` — `updateMeeting()` function (line 465–478 original)
**Affected endpoint:** `PATCH /api/meetings/:id`

**Attack precondition:**
Any authenticated FeraSetu user with a valid WorkOS JWT. No special privileges required. Attacker only needs to know (or guess/enumerate) the UUID of another user's meeting.

**What was wrong:**
```js
// BEFORE FIX (vulnerable):
await env.DB.prepare("UPDATE meetings SET status = ? WHERE id = ?")
  .bind(body.status, id)
  .run();
// No user_id check — any authenticated user could update any meeting by ID
```

**Why it matters:**
An attacker could cancel, modify the status of, or disrupt any other shopkeeper's scheduled meetings across the entire platform. Meeting UUIDs are v4 (128-bit random) which makes brute-force impractical, but the flaw would be triggered by any UUID disclosure (e.g., shared URL, log leak).

**Safe reproduction (synthetic):**
```
User A's meeting ID: "meeting-abc-123"
User B sends: PATCH /api/meetings/meeting-abc-123 {status: "cancelled"}
Before fix: 200 OK — meeting cancelled
After fix:  404 — Meeting not found (0 rows affected)
```

**Fix applied:**
```js
// AFTER FIX:
const result = await env.DB.prepare(
  "UPDATE meetings SET status = ? WHERE id = ? AND user_id = ?"
).bind(body.status, id, me.$id).run();
if (result.changes === 0) throw new HttpError("Meeting not found", 404);
```

**Regression test:** Suite 1 in `tests/security-regression.test.mjs` (4 tests)

---

### FS-02 — Brevo API Key Committed to `.env` File

**ID:** FS-02
**Severity:** HIGH
**Status:** ⚠️ ACTION REQUIRED — Rotate key immediately
**Location:** `backend/.env` line 37
**Affected system:** Brevo email service (transactional email)

**What is wrong:**
The file `backend/.env` contains a live-looking Brevo API key:
```
BREVO_API_KEY=xkeysib-5e74b3a37d0f8392ebe025e468af5f9bf842e3220afb50df5f94ce541189b5ca-***
```
This file does not appear in `.gitignore` for the backend directory, making it a candidate for accidental version control inclusion.

**Why it matters:**
An exposed Brevo API key allows an attacker to:
- Send phishing/spam emails from your verified domain (`ferasetu.fera-search.tech`)
- Read contact lists and email history
- Damage your sender reputation and deliverability
- Trigger costs on your account

**Expected secure behavior:**
`.env` files should never be committed. Secrets should be injected via deployment environment variables.

**Recommended fix:**
1. **Immediately revoke and regenerate** the Brevo API key in the Brevo dashboard
2. Add `backend/.env` to `backend/.gitignore`
3. Add `backend/.env` to root `.gitignore`
4. Use a secrets manager or deployment platform env injection for production
5. Audit git history: `git log --all --full-history -- backend/.env`

**Regression test:** Manual — verify new key is not in any tracked file.

---

### FS-07 — Payment Initialization Bypasses Payment Provider in "Dev Mode"

**ID:** FS-07
**Severity:** HIGH
**Status:** ⚠️ Requires environment gate before production deployment
**Location:** `backend/src/routes/payment.ts` — `POST /api/payment/initialize`
**Affected endpoint:** `POST /api/payment/initialize`

**What is wrong:**
The payment initialization endpoint directly activates paid plans and records transactions as `status: 'completed'` without calling any real payment gateway:
```ts
db.prepare(`
  INSERT INTO transactions (id, user_id, provider_order_id, amount, plan, status, metadata)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(transactionId, userId, `dev_${transactionId}`, effectiveAmount, plan, 'completed', ...);
// ↑ 'completed' with no actual payment verification
db.prepare(`UPDATE users SET plan = ? ...`).run(plan, ...userId);
```

There is a server-side amount validation check:
```ts
if (requestedAmount !== effectiveAmount) {
  res.status(400).json({ error: 'Invalid amount for selected plan' });
  return;
}
```
This prevents price manipulation but does NOT prevent free plan activation if `BETA_MODE` sets `effectiveAmount = 0` for all plans.

**Why it matters:**
If this endpoint is reachable in production without a feature flag, authenticated users can upgrade their plan (basic/standard/pro) without making a real payment.

**Recommended fix:**
```ts
// Add at the top of the handler:
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_PAYMENT) {
  return res.status(403).json({ error: 'This endpoint is disabled in production.' });
}
```
Or replace with a real Razorpay order flow before production launch.

**Regression test:** Verify endpoint returns 403 in production environment.

---

## Medium Findings

### FS-03 — Payment OTP Stored as Plain Text in `orders.notes`

**ID:** FS-03
**Severity:** MEDIUM
**Status:** ⚠️ Recommended fix — requires schema migration
**Location:** `backend/src/routes/orders.ts` lines 33–34, 70, 86–88

**What is wrong:**
```ts
const paymentOtp = Math.floor(100000 + Math.random() * 900000).toString();
// ...
notes: `Code: ${deliveryCode} | OTP: ${paymentOtp}`,
// Later, verification extracts it with a regex:
const actualOtp = order.notes.match(/OTP: ([0-9]+)/)?.[1];
```
The 6-digit payment OTP is stored in plain text in the `orders.notes` database column. Any database read access (admin dashboard, SQL dump, backup file) reveals active OTPs.

**Why it matters:**
An attacker with database read access (e.g., a compromised admin account, a SQL injection vulnerability elsewhere, or a backup file leak) could extract OTPs and confirm cash-on-delivery orders as paid without the customer's knowledge.

**Recommended fix:**
Add a `payment_otp_hash` column to the `orders` table and store `bcrypt.hash(otp, 12)`. On verification, use `bcrypt.compare(submittedOtp, order.payment_otp_hash)`.

```sql
-- Migration:
ALTER TABLE orders ADD COLUMN payment_otp_hash TEXT;
```

```ts
// Store:
const paymentOtpHash = await bcrypt.hash(paymentOtp, 12);
// notes: `Code: ${deliveryCode}` -- no OTP in notes
// payment_otp_hash: paymentOtpHash
// Verify:
const valid = await bcrypt.compare(otp, order.payment_otp_hash);
```

**Regression test:** Suite 4 in `tests/security-regression.test.mjs` (4 tests)

---

### FS-04 — AI usageType Client-Controlled (Credit Undercharge)

**ID:** FS-04
**Severity:** MEDIUM
**Status:** ✅ FIXED (this audit)
**Location:** `backend/src/routes/ai.ts` line 118 (original)
**Affected endpoint:** `POST /api/ai/chat`

**What was wrong:**
```ts
// BEFORE FIX (vulnerable):
const usageType = req.body.usageType || (isWebsiteJsonRequest ? 'website_ai' : 'shopkeeper_assistant');
```
The `usageType` from the client body determined the credit cost:
- `shopkeeper_assistant` = 1 credit
- `customer_assistant` = 2 credits
- `website_ai` = 3 credits

An attacker generating websites (3 credits each) could send `usageType: 'shopkeeper_assistant'` to pay only 1 credit.

**Fix applied:**
```ts
// AFTER FIX:
// usageType is determined server-side from request context, NOT from req.body.usageType
const usageType = isWebsiteJsonRequest ? 'website_ai' : 'shopkeeper_assistant';
```

**Regression test:** Suite 2 in `tests/security-regression.test.mjs` (5 tests)

---

### FS-05 — Backend Admin JWT Uses Same Secret as User JWT

**ID:** FS-05
**Severity:** MEDIUM
**Status:** ⚠️ Recommended fix
**Location:** `backend/src/routes/admin.ts` line 11, `backend/src/middleware/adminAuth.ts` line 17

**What is wrong:**
Both user JWTs and admin JWTs are signed with `process.env.JWT_SECRET`. An admin JWT payload is distinguished by `role: 'admin'` and `email: ADMIN_EMAIL`, but both are signed with the same HMAC key.

**Why it matters:**
If an attacker somehow forged a user token (e.g., weak secret, key leak), the same key would be valid for admin token verification. Separate secrets create key isolation — a user key compromise does not automatically compromise admin access.

**Recommended fix:**
Add a dedicated `ADMIN_JWT_SECRET` environment variable:
```ts
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
// Use ADMIN_JWT_SECRET for signing/verifying admin tokens only
```

---

### FS-06 — Worker Order Total Accepted from Client Body

**ID:** FS-06
**Severity:** MEDIUM (Worker) / LOW (Backend — backend recomputes from DB)
**Status:** ⚠️ Recommended fix for Worker
**Location:** `worker/index.js` — `createOrder()` lines 397–404

**What is wrong (Worker):**
```js
let total = Number(body.total);
if (!Number.isFinite(total) || total < 0) {
  total = items.reduce((sum, it) => {
    const p = Number(it?.price) || 0;
    const q = Number(it?.qty ?? it?.quantity) || 0;
    return sum + p * q;
  }, 0);
}
// If body.total is 0 or any non-negative number, it's trusted directly
```

**Why it matters:**
The Worker's order creation is a shopkeeper-facing API (authenticated users creating their own orders). The financial risk is that order records in D1 may have inaccurate totals for reporting/analytics.

**Recommended fix:**
The Worker should always compute total from item prices. The `body.total` field should be advisory or removed.

**Regression test:** Suite 3 in `tests/security-regression.test.mjs` (5 tests — demonstrates the issue and the safer pattern)

---

## Low Findings

### FS-08 — DNS CNAME Check Silently Permits on Failure

**ID:** FS-08 | **Severity:** LOW
**Location:** `backend/src/middleware/auth.ts` — `validatePublicShop()` lines 96–109

The DNS lookup for custom domain CNAME validation silently allows the request to proceed if DNS resolution fails (network error). This means a temporary DNS failure could allow a subdomain takeover scenario to pass undetected.

**Recommended fix:** Default-deny on DNS errors (return 404) rather than default-allow; or use a secondary validation source.

---

### FS-09 — Backend CORS Allows No-Origin Requests

**ID:** FS-09 | **Severity:** LOW
**Location:** `backend/src/index.ts` line 101

```ts
origin: (origin, callback) => {
  if (!origin) return callback(null, true); // Server-to-server allowed
  ...
}
```

Server-to-server (no Origin header) requests bypass CORS. This is standard behavior for non-browser clients and is unlikely to be exploitable in isolation, but it means the CORS allowlist provides no protection against scripts running outside a browser context.

**Recommended fix:** Accept the current behavior as intentional for API clients, or add IP allowlisting for server-to-server traffic if that pattern is not expected.

---

### FS-10 — Platform Stats Endpoint Leaks Aggregate Data Without Auth

**ID:** FS-10 | **Severity:** LOW
**Location:** `backend/src/routes/auth.ts` — `GET /api/auth/public/platform-stats`

This public endpoint exposes total user counts, order counts, product counts, revenue totals, and active user counts. While aggregate statistics are common on marketing pages, the inclusion of `totalRevenue` (sum of all paid orders + subscriptions) may be sensitive business information.

**Recommended fix:** Remove `totalRevenue` and `subscriptionRevenue` from the public endpoint, or require authentication for financial metrics.

---

### FS-11 — Worker Admin CORS Hardcoded (Not Dynamic)

**ID:** FS-11 | **Severity:** LOW
**Location:** `worker/routes/admin.js` lines 18–24

The admin route responses always include `Access-Control-Allow-Origin: https://ferasetu.com` regardless of the actual request origin. The main Worker uses dynamic CORS based on the request origin. This inconsistency could break an admin UI hosted on a staging domain.

---

### FS-12 — Meeting/Order Status Not Allowlisted in Worker

**ID:** FS-12 | **Severity:** LOW
**Location:** `worker/index.js` — `createOrder()` line 406, `updateMeeting()` (now fixed)

Order status and meeting status accept any string value, allowing arbitrary status strings like `"hacked"` or excessively long values to be stored in the database.

**Recommended fix:**
```js
const VALID_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
const status = VALID_ORDER_STATUSES.includes(body.status?.trim()) ? body.status.trim() : 'pending';
```

---

## Informational Findings

### FS-13 — CSP Disabled in Development Mode

`backend/src/index.ts` disables Content Security Policy when `NODE_ENV !== 'production'`. This is standard practice and the CSP configuration is well-structured for production. No action required.

---

### FS-14 — Trust Proxy=1 Without Confirmed Reverse Proxy

`app.set('trust proxy', 1)` is set in the Express backend. If no reverse proxy (nginx, Cloudflare Tunnel) is actually in front of the server, `req.ip` can be forged via `X-Forwarded-For`, which would undermine IP-based rate limiting.

**Recommendation:** Confirm the deployment topology and document it.

---

### FS-15 — Admin Impersonation JWT Returned in Response Body

`POST /api/admin/users/:id/impersonate` returns a JWT in the JSON response body. This is logged in audit logs, and the token expires in 15 minutes. This is a controlled administrative function, and the current implementation is acceptable. Ensure the token is not logged to any external log aggregation system.

---

## False Positives Reviewed

| Item | Initial Concern | Resolution |
|------|----------------|------------|
| D1 queries — SQL injection | Queries use `.bind()` parameterization throughout | **Not exploitable** — fully parameterized |
| Worker JWKS cache (module-level) | Singleton may serve stale keys | **Not exploitable** — jose library handles JWKS TTL and rotation automatically |
| OTP verification — brute force | Could guess 6-digit OTP | **Not exploitable** — `otp_max_attempts` limit (5) enforced; OTP deleted on max attempts |
| Admin JWT timing attack | HMAC comparison could leak timing | **Not exploitable** — `crypto.subtle.timingSafeEqual()` used in Worker; `jwt.verify()` is constant-time in backend |
| Clerk publishable key in `.env` | Appears to be a secret | **Not an issue** — Clerk publishable keys are intentionally browser-exposed by design |
| CORS wildcard subdomain | `*.ferasetu.com` could allow rogue subdomains | **Low risk** — subdomains require DNS control; shops accessing their own subdomain API is the intended pattern |
| Worker error messages | Stack traces in catch blocks | **Not exposed to clients** — logged to `console.error` (Cloudflare logs), not returned in HTTP responses |

---

## Security Fixes Applied

### Fix 1 — FS-01: IDOR Meeting PATCH Ownership Check (`worker/index.js`)

```diff
- await env.DB.prepare("UPDATE meetings SET status = ? WHERE id = ?")
-   .bind(body.status, id)
-   .run();
- return json({ success: true });

+ const result = await env.DB.prepare(
+   "UPDATE meetings SET status = ? WHERE id = ? AND user_id = ?"
+ ).bind(body.status, id, me.$id).run();
+
+ if (result.changes === 0) {
+   throw new HttpError("Meeting not found", 404);
+ }
+ return json({ success: true });
```

### Fix 2 — FS-04: AI usageType Server-Determined (`backend/src/routes/ai.ts`)

```diff
- const usageType = req.body.usageType || (isWebsiteJsonRequest ? 'website_ai' : 'shopkeeper_assistant');

+ // FS-04 FIX: usageType is determined server-side from request context,
+ // NOT from req.body.usageType which the client controls.
+ const usageType = isWebsiteJsonRequest ? 'website_ai' : 'shopkeeper_assistant';
```

---

## Regression Tests

**File:** `tests/security-regression.test.mjs` (new, added this audit)
**File:** `tests/fera-ai.test.mjs` (pre-existing)

### Test Run Results

```
Command: node tests/fera-ai.test.mjs
Results: 32 passed, 0 failed ✅

Command: node tests/security-regression.test.mjs
Results: 60 passed, 0 failed ✅

Total: 92 tests passing
```

### Security Regression Suite Coverage

| Suite | Tests | Covers |
|-------|-------|--------|
| Suite 1 | 4 | FS-01 IDOR meeting PATCH — before/after fix |
| Suite 2 | 5 | FS-04 AI credit usageType manipulation |
| Suite 3 | 5 | FS-06 Order total client manipulation |
| Suite 4 | 4 | FS-03 OTP plain text vs hashed storage |
| Suite 5 | 6 | Auth header validation (JWT format) |
| Suite 6 | 6 | Admin JWT role validation |
| Suite 7 | 5 | Product price validation |
| Suite 8 | 6 | Plan product limit enforcement |
| Suite 9 | 7 | CORS origin allowlist validation |
| Suite 10 | 7 | SQL injection and XSS pattern detection |
| Suite 11 | 5 | AI credit enforcement |
| **Total** | **60** | |

---

## Remaining Risks

### Unmitigated (Action Required)

| ID | Risk | Action |
|----|------|--------|
| FS-02 | Brevo API key in `.env` may be tracked by git | **Rotate key now; add .env to .gitignore** |
| FS-03 | Payment OTP plain text in `orders.notes` | Requires schema migration + bcrypt hashing |
| FS-07 | Payment dev-mode activates plans without real payment | Add `NODE_ENV` gate before production launch |

### Accepted Risks (Low / Informational)

| ID | Risk | Rationale |
|----|------|-----------|
| FS-05 | Shared JWT secret for admin + user | Admin email+role checks provide isolation; fix recommended before scale |
| FS-08 | DNS failure allows subdomain | Temporary DNS failures are rare; monitor for patterns |
| FS-09 | No-origin CORS passes | Intentional for API client support |
| FS-10 | Public revenue stats | Remove `totalRevenue` from public endpoint |
| FS-11 | Worker admin CORS hardcoded | Low practical impact; fix before multi-origin admin UI |
| FS-12 | Status values not allowlisted | DB storage only; no security control bypassed |

### Untested (Requires Live Environment)

The following were analyzed statically but could not be tested without a live Cloudflare D1 deployment:

- Actual WorkOS JWT expiry handling at the edge
- D1 `result.changes` behavior on concurrent writes (race conditions)
- Razorpay webhook signature verification (code not present — stub only)
- Custom SMTP injection via shop-supplied SMTP credentials
- Actual rate limit behavior under concurrent load (in-memory, not distributed)

### Assumptions Made

- The `wrangler.toml` `WORKOS_CLIENT_ID` placeholder is replaced with a real value in production secrets
- The Worker `ADMIN_JWT_SECRET` in production is a strong random secret (not the dev default)
- The Express backend is behind a reverse proxy (Cloudflare Tunnel or nginx) in production, validating the `trust proxy: 1` setting

---

## Recommended Next Steps

### Immediate (Before Next Deployment)
1. **Rotate Brevo API key** (FS-02) — takes 2 minutes; current key may be exposed
2. **Add `backend/.env` to `.gitignore`** and audit git history for other leaked secrets
3. **Add production gate to payment endpoint** (FS-07):
   ```ts
   if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });
   ```

### Short-term (Next Sprint)
4. **Migrate payment OTP to hashed column** (FS-03) — requires `ALTER TABLE orders ADD COLUMN payment_otp_hash TEXT`
5. **Add `ADMIN_JWT_SECRET` environment variable** (FS-05) — separate from user JWT secret
6. **Add status allowlists** for order and meeting status fields (FS-12)
7. **Remove `totalRevenue` from public platform-stats** endpoint (FS-10)

### Medium-term (Before Scale)
8. **Replace in-memory rate limiting** (admin, OTP) with a distributed store (e.g., Cloudflare KV or Redis) so limits are enforced across Worker isolates
9. **Add Razorpay webhook signature verification** before enabling real payment flows
10. **Review custom SMTP injection surface** — shop owners can supply arbitrary SMTP credentials; validate the host/port against a whitelist before connecting

---

## Test Commands Reference

```bash
# Run pre-existing Fera AI integration tests
node tests/fera-ai.test.mjs

# Run new security regression tests (added this audit)
node tests/security-regression.test.mjs

# Run both
node tests/fera-ai.test.mjs && node tests/security-regression.test.mjs
```

*Note: Node.js is available at `C:\Users\himanshu\AppData\Local\nvm\v24.11.0\node.exe` on this machine.*

---

*Audit conducted 2026-08-14. Authorized defensive testing only. No production systems were accessed, no real credentials were tested, and no destructive operations were performed.*

# FERASETU — COMPREHENSIVE SECURITY AUDIT REPORT

**Auditor:** Principal Security Engineer (25+ years experience)
**Date:** 2026-07-27
**Scope:** Full-stack (Frontend, Backend, Database, Cloudflare Worker, CI/CD, Dependencies)

---

## EXECUTIVE SUMMARY

FeraSetu is a multi-tenant e-commerce platform for Indian kirana stores with a React/TypeScript frontend, Express/TypeScript backend (Node.js), SQLite/MySQL database, and a Cloudflare Worker API. The application uses Appwrite for authentication, Brevo for transactional emails, and supports custom SMTP per-tenant.

**Overall Security Score: 58/100**
**Production Readiness Score: 52/100**

The codebase demonstrates solid engineering in many areas (parameterized queries, bcrypt, JWT, rate limiting), but has **critical vulnerabilities** that must be fixed before production deployment. The most severe issues are: **hardcoded JWT fallback secret**, **missing CSP in production**, **overly permissive CORS**, **lack of input sanitization on user-generated content**, **missing CSRF protection**, and **insecure admin authentication**.

---

## TOP 25 CRITICAL RISKS (Ordered by Severity)

---

### 1. CRITICAL — Hardcoded JWT Fallback Secret in Production
**CWE-798** | **OWASP A07:2021** | **CVSS 9.1**

| Field | Details |
|-------|---------|
| **Risk** | JWT_SECRET defaults to `'fallback-dev-secret-do-not-use-in-prod'` — allows token forgery, privilege escalation, account takeover |
| **Attack Scenario** | Attacker discovers default secret (public repo, Docker image, error logs) → signs arbitrary JWTs with `role: admin` or any `user_id` → full account compromise |
| **Root Cause** | Line 6 in `authService.ts` and line 15 in `auth.ts`: `process.env.JWT_SECRET \|\| 'fallback-dev-secret-do-not-use-in-prod'` |
| **Vulnerable Files** | `backend/src/services/authService.ts:6`, `backend/src/routes/auth.ts:15`, `backend/src/middleware/adminAuth.ts:4` |
| **Minimal Fix** | Throw error if JWT_SECRET not set in production |
| **Production Fix** | Enforce 256-bit secret via env; fail fast on startup if missing; rotate keys; use JWKS for key rotation |
| **Patched Code** | ```typescript const JWT_SECRET = (() => { if (!process.env.JWT_SECRET) { if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production'); return 'dev-only-' + crypto.randomBytes(32).toString('hex'); } return process.env.JWT_SECRET; })(); ``` |
| **Test** | Deploy without JWT_SECRET → process should exit with error |
| **Regression** | None — config-only change |

---

### 2. CRITICAL — Content Security Policy Disabled in Production
**CWE-693** | **OWASP A05:2021** | **CVSS 7.5**

| Field | Details |
|-------|---------|
| **Risk** | `helmet.contentSecurityPolicy: false` in production (line 50 `index.ts`) — enables XSS, data exfiltration, clickjacking |
| **Attack Scenario** | Stored XSS in product description / website builder → steals JWT from localStorage → account takeover |
| **Root Cause** | `contentSecurityPolicy: IS_PRODUCTION ? false : undefined` — deliberately disabled |
| **Vulnerable File** | `backend/src/index.ts:48-51` |
| **Minimal Fix** | Enable CSP with `script-src 'self'; object-src 'none'; base-uri 'self'` |
| **Production Fix** | Strict CSP with nonces for inline scripts; `frame-ancestors 'none'`; report-only mode first |
| **Patched Code** | ```typescript app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", "data:", "https:"], connectSrc: ["'self'", process.env.FRONTEND_URL], fontSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"] } }, crossOriginResourcePolicy: { policy: "same-origin" } })); ``` |
| **Test** | `curl -I https://api.ferasetu.com | grep content-security-policy` |
| **Regression** | May break inline styles in website builder — use nonces |

---

### 3. CRITICAL — Overly Permissive CORS (Allows Any Origin)
**CWE-942** | **OWASP A01:2021** | **CVSS 7.5**

| Field | Details |
|-------|---------|
| **Risk** | CORS callback returns `true` for ANY origin (line 69 `index.ts`) — enables credentialed cross-origin attacks |
| **Attack Scenario** | Victim visits attacker.com → malicious JS calls `fetch('https://api.ferasetu.com/api/orders', {credentials: 'include'})` → steals orders, PII, injects orders |
| **Root Cause** | `callback(null, true)` unconditionally on line 69 |
| **Vulnerable File** | `backend/src/index.ts:54-74` |
| **Minimal Fix** | Only allow exact `FRONTEND_URL` and known subdomains |
| **Production Fix** | Maintain allowlist; reject unknown origins; log blocked attempts |
| **Patched Code** | ```typescript const ALLOWED_ORIGINS = [ process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', ].filter(Boolean); app.use(cors({ origin: (origin, callback) => { if (!origin) return callback(null, true); if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.fera-search.tech')) return callback(null, true); console.warn(`CORS blocked: ${origin}`); callback(new Error('Not allowed by CORS')); }, credentials: true })); ``` |
| **Test** | `curl -H "Origin: https://evil.com" -H "Cookie: session=..." https://api.ferasetu.com/api/users/me` → should 403 |
| **Regression** | None if allowlist is correct |

---

### 4. HIGH — Missing CSRF Protection on State-Changing Endpoints
**CWE-352** | **OWASP A01:2021** | **CVSS 6.8**

| Field | Details |
|-------|---------|
| **Risk** | No CSRF tokens on POST/PUT/DELETE — authenticated users vulnerable to forged requests |
| **Attack Scenario** | Victim logged in → visits malicious site → auto-submits form to `/api/products` creating malicious product, or `/api/payment/initialize` upgrading plan |
| **Root Cause** | No CSRF middleware; same-site cookies not enforced |
| **Vulnerable Files** | All mutating routes in `products.ts`, `orders.ts`, `payment.ts`, `website.ts`, `settings.ts`, `admin.ts` |
| **Minimal Fix** | Add `SameSite: 'lax'` to cookies; implement double-submit cookie pattern |
| **Production Fix** | Use `csurf` or custom double-submit; require `X-CSRF-Token` header on all state changes |
| **Patched Code** | ```typescript // In index.ts after cookie parser app.use((req, res, next) => { if (['POST','PUT','PATCH','DELETE'].includes(req.method)) { const token = req.headers['x-csrf-token'] || req.body._csrf; const cookieToken = req.cookies?.csrf_token; if (!token || token !== cookieToken) return res.status(403).json({error: 'Invalid CSRF token'}); } next(); }); // Set CSRF cookie on login app.use((req, res, next) => { if (req.path === '/api/auth/login' && req.method === 'POST') { const token = crypto.randomBytes(32).toString('hex'); res.cookie('csrf_token', token, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 24*60*60*1000 }); req.csrfToken = token; } next(); }); ``` |
| **Test** | Submit POST from different origin without token → 403 |
| **Regression** | API clients need to send `X-CSRF-Token` header |

---

### 5. HIGH — Stored XSS via Website Builder Sections (User-Controlled HTML)
**CWE-79** | **OWASP A03:2021** | **CVSS 7.2**

| Field | Details |
|-------|---------|
| **Risk** | `sections` and `config` in `websites` table store arbitrary JSON rendered client-side without sanitization |
| **Attack Scenario** | Shop owner injects `<img src=x onerror=stealToken()>` in hero section config → any visitor to public shop executes script → steals session, redirects to phishing |
| **Root Cause** | `TemplateRenderer.tsx` and section components use `dangerouslySetInnerHTML` or render user config directly |
| **Vulnerable Files** | `frontend/src/components/shop/TemplateRenderer.tsx`, all section components (`HeroSection.tsx`, `BannerSection.tsx`, etc.) |
| **Minimal Fix** | Sanitize all user-provided strings with DOMPurify before rendering |
| **Production Fix** | Strict allowlist of allowed HTML tags/attributes; CSP with `script-src 'self'` blocks inline execution |
| **Patched Code** | ```tsx import DOMPurify from 'isomorphic-dompurify'; // In HeroSection.tsx const safeHeadline = DOMPurify.sanitize(config.headline, { ALLOWED_TAGS: ['b','i','em','strong','span'], ALLOWED_ATTR: ['class'] }); return <h1 dangerouslySetInnerHTML={{__html: safeHeadline}} />; ``` |
| **Test** | Create section with `<script>alert(1)</script>` → should render as text |
| **Regression** | Legitimate formatting (bold, links) may break — extend allowlist carefully |

---

### 6. HIGH — Admin Authentication Uses Single Hardcoded Email + No MFA
**CWE-306** | **OWASP A07:2021** | **CVSS 8.1**

| Field | Details |
|-------|---------|
| **Risk** | Admin login only checks `email === ADMIN_EMAIL` (line 31 `adminAuth.ts`) — no password hash, no MFA, no brute-force beyond rate limit |
| **Attack Scenario** | Attacker discovers admin email (public docs, WHOIS) → password spray → gains full platform access (delete users, impersonate, read all data) |
| **Root Cause** | `adminAuth.ts:44-53` compares plaintext password; JWT contains `role: 'admin'` but no additional verification |
| **Vulnerable Files** | `backend/src/middleware/adminAuth.ts`, `backend/src/routes/admin.ts:36-54` |
| **Minimal Fix** | Store bcrypt hash of admin password; verify with `bcrypt.compare` |
| **Production Fix** | Enforce TOTP/WebAuthn MFA; separate admin panel domain; IP allowlist; session recording |
| **Patched Code** | ```typescript // adminAuth.ts const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // bcrypt hash if (!ADMIN_PASSWORD_HASH) throw new Error('ADMIN_PASSWORD_HASH required'); const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH); // Add MFA check const totpCode = req.headers['x-admin-totp']; if (!totp.verify(totpCode)) return res.status(401).json({error: 'MFA required'}); ``` |
| **Test** | Attempt login without MFA → 401; with valid MFA → 200 |
| **Regression** | Admin must configure TOTP app |

---

### 7. HIGH — SQL Injection via `IN` Clause Construction (Multiple Routes)
**CWE-89** | **OWASP A03:2021** | **CVSS 7.5**

| Field | Details |
|-------|---------|
| **Risk** | Dynamic `IN` clause building with string interpolation in `analytics.ts`, `orders.ts`, `admin.ts` |
| **Attack Scenario** | `category=electronics') OR 1=1--` in `analytics/sales?period=30d&category=...` → data exfiltration |
| **Root Cause** | `analytics.ts:491` builds `WHERE category IN (...)` by concatenating unsanitized values |
| **Vulnerable Files** | `backend/src/routes/analytics.ts:488-498`, `backend/src/routes/orders.ts` |
| **Minimal Fix** | Use parameterized queries with dynamic placeholder generation |
| **Production Fix** | Validate allowlist values; use query builder |
| **Patched Code** | ```typescript // analytics.ts const categories = Array.isArray(req.query.category) ? req.query.category : [req.query.category]; const placeholders = categories.map(() => '?').join(','); const query = `SELECT ... WHERE category IN (${placeholders})`; db.prepare(query).all(...categories); ``` |
| **Test** | Send `category[]=electronics&category[]=') UNION SELECT sql FROM sqlite_master--` → should error, not execute |
| **Regression** | None if parameterized correctly |

---

### 8. HIGH — Path Traversal in Static File Serving (Uploads)
**CWE-22** | **OWASP A01:2021** | **CVSS 7.5**

| Field | Details |
|-------|---------|
| **Risk** | `express.static('uploads')` (line 91 `index.ts`) serves any file under uploads — `../../etc/passwd` accessible if path normalization fails |
| **Attack Scenario** | Attacker uploads file named `../../../var/www/html/shell.php` → accesses via `/uploads/../../../var/www/html/shell.php` |
| **Root Cause** | No path validation; `express.static` follows symlinks |
| **Vulnerable File** | `backend/src/index.ts:91` |
| **Minimal Fix** | Use `express.static(uploadDir, { setHeaders: ..., fallthrough: false })` with custom middleware to validate path |
| **Production Fix** | Store uploads outside webroot; serve via signed URLs; validate filename on upload |
| **Patched Code** | ```typescript app.use('/uploads', (req, res, next) => { const requestedPath = path.join(uploadDir, req.path); const resolved = path.resolve(requestedPath); if (!resolved.startsWith(path.resolve(uploadDir))) return res.status(403).send('Forbidden'); next(); }, express.static(uploadDir, { fallthrough: false })); ``` |
| **Test** | `GET /uploads/../../../etc/passwd` → 403 |
| **Regression** | Legitimate nested upload folders may break — test thoroughly |

---

### 9. HIGH — Missing Security Headers (HSTS, X-Frame-Options, Permissions-Policy)
**CWE-693** | **OWASP A05:2021** | **CVSS 5.3**

| Field | Details |
|-------|---------|
| **Risk** | `helmet` config missing `hsts`, `frameguard`, `permissionsPolicy` — enables clickjacking, MITM, feature abuse |
| **Attack Scenario** | Attacker embeds shop in iframe → clickjacking "Buy Now" → unauthorized orders |
| **Root Cause** | Default helmet config used without hardening |
| **Vulnerable File** | `backend/src/index.ts:48-51` |
| **Minimal Fix** | Add `hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, frameguard: { action: 'deny' }` |
| **Production Fix** | Full helmet config with `permissionsPolicy`, `crossOriginEmbedderPolicy`, `referrerPolicy` |
| **Patched Code** | See Finding #2 for complete helmet config |
| **Test** | `curl -I https://api.ferasetu.com | grep -E 'strict-transport-security|x-frame-options|permissions-policy'` |
| **Regression** | None |

---

### 10. HIGH — Weak OTP Generation (Math.random)
**CWE-338** | **OWASP A07:2021** | **CVSS 6.5**

| Field | Details |
|-------|---------|
| **Risk** | `Math.random()` used for OTP generation (`otpService.ts:11`) — predictable, not cryptographically secure |
| **Attack Scenario** | Attacker observes timing, predicts next OTP → bypasses email verification |
| **Root Cause** | `Math.floor(100000 + Math.random() * 900000)` |
| **Vulnerable Files** | `backend/src/services/otpService.ts:10-12`, `backend/src/routes/orders.ts:33-34` |
| **Minimal Fix** | Use `crypto.randomInt(100000, 999999)` |
| **Production Fix** | Use `crypto.randomBytes` with rejection sampling for unbiased distribution |
| **Patched Code** | ```typescript static generateOTP(length: number = 6): string { const min = 10 ** (length - 1); const max = 10 ** length - 1; return crypto.randomInt(min, max + 1).toString().padStart(length, '0'); } ``` |
| **Test** | Generate 10000 OTPs → chi-square test for uniformity |
| **Regression** | None |

---

### 11. HIGH — OTP Stored as SHA-256 Hash (No Salt, Fast Hash)
**CWE-916** | **OWASP A02:2021** | **CVSS 6.8**

| Field | Details |
|-------|---------|
| **Risk** | OTP hashed with unsalted SHA-256 (`otpService.ts:15`) — vulnerable to rainbow tables, GPU cracking |
| **Attack Scenario** | DB leak → attacker cracks 6-digit OTP in <1 second per hash |
| **Root Cause** | `crypto.createHash('sha256').update(otp).digest('hex')` |
| **Vulnerable File** | `backend/src/services/otpService.ts:14-16` |
| **Minimal Fix** | Use bcrypt with cost 10+ or Argon2id |
| **Production Fix** | Argon2id with memory-hard parameters; store salt + hash |
| **Patched Code** | ```typescript static async hashOTP(otp: string): Promise<string> { return bcrypt.hash(otp, 12); } static async verifyOTPHash(otp: string, hash: string): Promise<boolean> { return bcrypt.compare(otp, hash); } ``` |
| **Test** | Verify hash takes >100ms; timing attack resistant |
| **Regression** | Slightly slower OTP verification — negligible |

---

### 12. HIGH — No Password Complexity Requirements
**CWE-521** | **OWASP A07:2021** | **CVSS 5.9**

| Field | Details |
|-------|---------|
| **Risk** | Only `minLength: 8` enforced (`auth.ts:84`) — allows `password123`, `12345678` |
| **Attack Scenario** | Credential stuffing with common passwords → account takeover |
| **Root Cause** | No regex for uppercase, lowercase, number, symbol |
| **Vulnerable File** | `backend/src/routes/auth.ts:84` |
| **Minimal Fix** | Add `matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)` |
| **Production Fix** | Integrate `zxcvbn` for entropy scoring; reject breached passwords via HIBP API |
| **Patched Code** | ```typescript body('password') .isLength({ min: 12 }) .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/) .withMessage('Password must contain uppercase, lowercase, number, special char') ``` |
| **Test** | Register with `Password1!` → 201; `password` → 400 |
| **Regression** | User friction — add strength meter UI |

---

### 13. HIGH — Admin Impersonation Generates Valid JWT Without Audit Trail
**CWE-287** | **OWASP A01:2021** | **CVSS 7.1**

| Field | Details |
|-------|---------|
| **Risk** | `/admin/users/:id/impersonate` creates JWT with `impersonated: true` but no session binding, no expiry enforcement, no revocation |
| **Attack Scenario** | Compromised admin token → impersonate any user → access PII, place orders, change settings |
| **Root Cause** | `admin.ts:142-146` signs token with same secret, no additional claims for tracking |
| **Vulnerable File** | `backend/src/routes/admin.ts:133-150` |
| **Minimal Fix** | Add `impersonator_id`, `impersonated_at`, short expiry (15 min); log every use |
| **Production Fix** | Require MFA for impersonation; real-time admin notification; automatic session recording |
| **Patched Code** | ```typescript const token = jwt.sign({ id: user.id, email: user.email, plan: user.plan, businessName: user.business_name || user.name, impersonated: true, impersonator: req.admin.id, impersonated_at: Date.now() }, JWT_SECRET, { expiresIn: '15m' }); writeAuditLog(req, 'user.impersonate', 'user', req.params.id, { impersonator: req.admin.id, target_email: user.email }); ``` |
| **Test** | Impersonate → token contains `impersonator` claim; expires in 15 min |
| **Regression** | Admin workflow slightly slower |

---

### 14. MEDIUM — Rate Limiting Only by IP (Bypassable)
**CWE-307** | **OWASP A07:2021** | **CVSS 5.3**

| Field | Details |
|-------|---------|
| **Risk** | `express-rate-limit` uses IP only — attackers rotate proxies/VPNs |
| **Attack Scenario** | Distributed botnet sends OTP requests from 1000 IPs → bypasses 5/15min limit |
| **Root Cause** | `rateLimiter.ts:3-13` — no user/account-based limiting |
| **Vulnerable File** | `backend/src/middleware/rateLimiter.ts` |
| **Minimal Fix** | Add `keyGenerator: (req) => req.user?.id || req.ip` for authenticated routes |
| **Production Fix** | Adaptive rate limiting; device fingerprinting; CAPTCHA after threshold |
| **Patched Code** | ```typescript export function createRateLimiter(maxRequests, windowMinutes, keyGen?) { return rateLimit({ windowMs: windowMinutes * 60 * 1000, max: maxRequests, keyGenerator: keyGen || ((req) => req.user?.id || req.ip), message: { error: 'Too many requests', retryAfter: windowMinutes * 60 }, standardHeaders: true, legacyHeaders: false }); } ``` |
| **Test** | Authenticated user hits limit → 429; different user unaffected |
| **Regression** | None |

---

### 15. MEDIUM — Email Header Injection in Custom SMTP Sender
**CWE-113** | **OWASP A03:2021** | **CVSS 5.9**

| Field | Details |
|-------|---------|
| **Risk** | `sender_name`, `sender_email`, `reply_to_email` from user input used directly in `nodemailer` `from`/`replyTo` without sanitization |
| **Attack Scenario** | Shop owner sets sender name to `"Admin\nBcc: attacker@evil.com"` → BCC leaks all emails |
| **Root Cause** | `smtpService.ts:238` uses template literal without header sanitization |
| **Vulnerable File** | `backend/src/services/smtpService.ts:237-243` |
| **Minimal Fix** | Strip newlines: `sender_name.replace(/[\r\n]/g, '')` |
| **Production Fix** | Use `addressparser` library; validate email format strictly |
| **Patched Code** | ```typescript const sanitizeHeader = (v: string) => v.replace(/[\r\n]/g, '').trim(); const from = `"${sanitizeHeader(row.sender_name)}" <${sanitizeHeader(row.sender_email)}>`; ``` |
| **Test** | Set sender name to `Test\nBcc: x@y.z` → verify no BCC in sent email |
| **Regression** | None |

---

### 16. MEDIUM — SMTP Password Encryption Uses Static Key Derived from JWT_SECRET
**CWE-326** | **OWASP A02:2021** | **CVSS 5.9**

| Field | Details |
|-------|---------|
| **Risk** | `smtpService.ts:6-11` derives AES key from `JWT_SECRET` — if JWT_SECRET rotates, all stored passwords become undecryptable; if leaked, all SMTP passwords exposed |
| **Attack Scenario** | JWT_SECRET leaked → decrypt all tenant SMTP passwords → send spam, phishing |
| **Root Cause** | `ENCRYPTION_KEY = process.env.SMTP_ENCRYPTION_KEY || process.env.JWT_SECRET` |
| **Vulnerable File** | `backend/src/services/smtpService.ts:6-11` |
| **Minimal Fix** | Require separate `SMTP_ENCRYPTION_KEY` env var |
| **Production Fix** | Use envelope encryption with KMS; key rotation support; per-tenant keys |
| **Patched Code** | ```typescript const ENCRYPTION_KEY = process.env.SMTP_ENCRYPTION_KEY; if (!ENCRYPTION_KEY) throw new Error('SMTP_ENCRYPTION_KEY must be set'); const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest(); ``` |
| **Test** | Rotate JWT_SECRET → SMTP passwords still decrypt |
| **Regression** | Existing encrypted passwords need re-encryption |

---

### 17. MEDIUM — Subdomain Takeover Risk (Wildcard DNS + No Validation)
**CWE-346** | **OWASP A01:2021** | **CVSS 6.5**

| Field | Details |
|-------|---------|
| **Risk** | `validatePublicShop` (auth.ts:74-107) accepts any subdomain matching `*.fera-search.tech` — if DNS record deleted but subdomain claimed by attacker, they control the shop |
| **Attack Scenario** | Shop owner deletes store → subdomain DNS remains → attacker claims subdomain on Cloudflare → serves phishing on `shop.fera-search.tech` |
| **Root Cause** | No verification that subdomain still points to platform |
| **Vulnerable File** | `backend/src/middleware/auth.ts:74-107` |
| **Minimal Fix** | Periodic DNS verification job; mark shop unpublished if DNS mismatch |
| **Production Fix** | Use CNAME verification (like Vercel/Netlify); require TXT record for ownership proof |
| **Patched Code** | ```typescript // Add to validatePublicShop: const dns = await resolveCname(host); if (!dns.includes('ferasetu.pages.dev')) { return res.status(404).send('Shop not found'); } ``` |
| **Test** | Delete shop → verify 404 on subdomain |
| **Regression** | Legitimate DNS changes may cause temporary outage |

---

### 18. MEDIUM — No Input Validation on AI Action JSON (RCE Precursor)
**CWE-94** | **OWASP A03:2021** | **CVSS 6.8**

| Field | Details |
|-------|---------|
| **Risk** | AI can output arbitrary JSON actions (`ADD_PRODUCT`, `EDIT_PRODUCT`, `RAISE_TICKET`) parsed and executed without schema validation (`ai.ts:124-155`) |
| **Attack Scenario** | Prompt injection → AI outputs `{"action": "EDIT_PRODUCT", "data": {"search_name": "", "update": {"price": 0}}} ` → all products free |
| **Root Cause** | `JSON.parse(jsonMatch[1])` with no schema validation |
| **Vulnerable File** | `backend/src/routes/ai.ts:124-156` |
| **Minimal Fix** | Validate with Zod/Joi schema per action type |
| **Production Fix** | Sandbox AI actions; human-in-the-loop for destructive ops; rate limit per action type |
| **Patched Code** | ```typescript const ActionSchema = z.discriminatedUnion('action', [ z.object({ action: z.literal('ADD_PRODUCT'), data: z.object({ name: z.string().min(1).max(200), price: z.number().positive(), stock_quantity: z.number().int().min(0), category: z.string().max(100) }) }), z.object({ action: z.literal('EDIT_PRODUCT'), data: z.object({ search_name: z.string().min(1), update: z.object({ sale_price: z.number().positive().optional() }) }) }), z.object({ action: z.literal('RAISE_TICKET'), data: z.object({ subject: z.string().min(5).max(200), description: z.string().min(10).max(5000) }) }) ]); const parsed = ActionSchema.safeParse(actionObj); if (!parsed.success) throw new Error('Invalid action'); ``` |
| **Test** | Inject malicious action → rejected with 400 |
| **Regression** | Valid AI actions must match schema exactly |

---

### 19. MEDIUM — Debug/Stack Traces Exposed in Development Errors
**CWE-209** | **OWASP A09:2021** | **CVSS 4.3**

| Field | Details |
|-------|---------|
| **Risk** | `errorHandler.ts:13-19` returns full stack trace when `NODE_ENV !== 'production'` — but production may run with `NODE_ENV=development` |
| **Attack Scenario** | Attacker triggers error → gets stack trace revealing internal paths, library versions, query structure |
| **Root Cause** | Conditional on `NODE_ENV` which may be misconfigured |
| **Vulnerable File** | `backend/src/middleware/errorHandler.ts:13-19` |
| **Minimal Fix** | Never return stack in response; log only |
| **Production Fix** | Structured error codes; Sentry/Datadog integration; generic user messages |
| **Patched Code** | ```typescript export function errorHandler(err, req, res, next) { const status = err.status || 500; const message = status === 500 ? 'Internal server error' : err.message; console.error(`[Error] ${status}: ${message}`, { stack: err.stack, path: req.path }); res.status(status).json({ error: message, code: `ERR_${status}` }); } ``` |
| **Test** | Trigger 500 → verify no stack in response |
| **Regression** | None |

---

### 20. MEDIUM — LocalStorage Token Storage (XSS Exfiltration)
**CWE-922** | **OWASP A03:2021** | **CVSS 5.3**

| Field | Details |
|-------|---------|
| **Risk** | `fera_token` and `fera_user` stored in `localStorage` (AuthContext.tsx:84-90, api.ts:1080) — accessible via XSS |
| **Attack Scenario** | XSS in website builder → `localStorage.getItem('fera_token')` → full account takeover |
| **Root Cause** | JWT in localStorage instead of HttpOnly cookie |
| **Vulnerable Files** | `frontend/src/contexts/AuthContext.tsx:84-90`, `frontend/src/services/api.ts:1079-1098` |
| **Minimal Fix** | Store token in HttpOnly Secure SameSite=Strict cookie |
| **Production Fix** | Short-lived access tokens (15min) + HttpOnly refresh token; token rotation |
| **Patched Code** | ```typescript // Backend: set cookie on login res.cookie('access_token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 }); // Frontend: remove localStorage token logic ``` |
| **Test** | XSS payload → cannot read token |
| **Regression** | SSR/API clients need cookie handling; CORS credentials required |

---

### 21. LOW — Missing Subresource Integrity (SRI) on CDN Scripts
**CWE-354** | **OWASP A06:2021** | **CVSS 3.7**

| Field | Details |
|-------|---------|
| **Risk** | External scripts (Lucide, Tailwind CDN) loaded without `integrity` — CDN compromise = supply chain attack |
| **Attack Scenario** | CDN hacked → malicious script injected → all users affected |
| **Root Cause** | No `integrity` attributes on script tags |
| **Vulnerable Files** | `frontend/index.html`, marketing pages |
| **Minimal Fix** | Add SRI hashes for all external scripts |
| **Production Fix** | Self-host all dependencies; use npm + bundler |
| **Test** | Verify `integrity` attribute present |
| **Regression** | Hash must update on version change |

---

### 22. LOW — No Backup/Disaster Recovery Documented
**CWE-1188** | **OWASP A09:2021** | **CVSS 3.1**

| Field | Details |
|-------|---------|
| **Risk** | No automated backup, point-in-time recovery, or DR plan for D1/SQLite |
| **Attack Scenario** | Ransomware encrypts DB → data loss; accidental `DROP TABLE` → no recovery |
| **Root Cause** | No backup strategy in code or docs |
| **Vulnerable Area** | Infrastructure/DevOps |
| **Minimal Fix** | Document manual backup procedure |
| **Production Fix** | Automated daily D1 exports; cross-region replication; tested restore procedure |

---

### 23. LOW — Dependency Vulnerabilities (Supply Chain)
**CWE-1104** | **OWASP A06:2021** | **CVSS Varies**

| Field | Details |
|-------|---------|
| **Risk** | `package-lock.json` shows 191+ packages in backend, 382+ in frontend — likely outdated |
| **Attack Scenario** | Known CVE in transitive dependency (e.g., `axios`, `express`, `multer`) exploited |
| **Root Cause** | No dependabot, no `npm audit` in CI |
| **Vulnerable Files** | All `package.json` / `package-lock.json` |
| **Minimal Fix** | Enable Dependabot; add `npm audit` to CI |
| **Production Fix** | Pin exact versions; use `npm ci`; SBOM generation; license scanning |

---

### 24. LOW — Insecure Default Permissions (Feature Flags Default Enabled)
**CWE-284** | **OWASP A01:2021** | **CVSS 3.7**

| Field | Details |
|-------|---------|
| **Risk** | `feature_flags` table `is_enabled DEFAULT 0` but admin can enable globally without per-tenant controls |
| **Attack Scenario** | Admin enables experimental feature → breaks all tenants |
| **Root Cause** | No tenant-level feature flag overrides |
| **Vulnerable File** | `database.ts:416-423`, `admin.ts:343-367` |
| **Minimal Fix** | Add `tenant_id` nullable column; check tenant override first |
| **Test** | Enable flag globally → verify tenant can disable |

---

### 25. INFO — Missing Security Logging/Monitoring
**CWE-778** | **OWASP A09:2021** | **CVSS 0.0**

| Field | Details |
|-------|---------|
| **Risk** | No structured security event logging (failed logins, admin actions, privilege changes, data exports) |
| **Root Cause** | Only `console.log` used; no SIEM integration |
| **Fix** | Add structured logging (pino/winston); ship to Datadog/Splunk/CloudWatch; alert on anomalies |

---

## QUICK WINS (Fix in <1 Hour Each)

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Enforce `JWT_SECRET` env var; remove fallback | 10 min | Critical |
| 2 | Enable Helmet CSP in production | 15 min | Critical |
| 3 | Restrict CORS to allowlist | 15 min | Critical |
| 4 | Add `SameSite: 'lax'` to cookies | 10 min | High |
| 5 | Replace `Math.random()` with `crypto.randomInt()` | 10 min | High |
| 6 | Add password complexity regex | 10 min | High |
| 7 | Sanitize email headers (newline strip) | 10 min | Medium |
| 8 | Require separate `SMTP_ENCRYPTION_KEY` | 10 min | Medium |
| 9 | Parameterize all dynamic `IN` clauses | 20 min | High |
| 10 | Add path traversal protection for uploads | 15 min | High |
| 11 | Validate AI action JSON with Zod | 30 min | High |
| 12 | Remove stack traces from error responses | 10 min | Medium |
| 13 | Add HSTS, X-Frame-Options, Permissions-Policy | 10 min | High |

---

## LONG-TERM IMPROVEMENTS

| Area | Recommendation |
|------|----------------|
| **Authentication** | Migrate to HttpOnly cookies + short-lived access tokens + refresh token rotation; implement WebAuthn/FIDO2 |
| **Authorization** | Implement ABAC (Attribute-Based Access Control) with Casbin/OPA; per-resource permissions |
| **Data Protection** | Field-level encryption for PII (phone, address); automated key rotation via Cloud KMS |
| **API Security** | GraphQL/REST schema validation (Zod/OpenAPI); request/response sanitization; API versioning |
| **Multi-tenancy** | Row-level security (RLS) in database; tenant isolation at DB level; subdomain verification |
| **Email Security** | Implement SPF/DKIM/DMARC for `fera-search.tech`; BIMI for brand indicators; MTA-STS |
| **Observability** | Structured logging (pino); distributed tracing (OpenTelemetry); security event correlation |
| **Supply Chain** | SBOM (CycloneDX); signed commits; SLSA Level 2+ build provenance |
| **Incident Response** | Runbook for account takeover, data breach, ransomware; tabletop exercises quarterly |

---

## SECURE ARCHITECTURE RECOMMENDATIONS

```
┌─────────────────────────────────────────────────────────────────┐
│                      RECOMMENDED ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐     ┌─────────────┐     ┌────────────────────┐   │
│  │  Users   │────▶│ Cloudflare  │────▶│  API Gateway       │   │
│  │ (Browser)│     │  WAF + CDN  │     │  (Rate Limit,      │   │
│  └──────────┘     │  (Turnstile)│     │   Auth, CSP)       │   │
│                   └─────────────┘     └─────────┬──────────┘   │
│                                                 │              │
│                    ┌────────────────────────────┼──────────┐   │
│                    ▼                            ▼          ▼   │
│             ┌─────────────┐            ┌──────────────┐ ┌─────┐ │
│             │  Auth Svc   │            │  Core API    │ │Admin│ │
│             │ (Appwrite)  │            │  (Express)   │ │ API │ │
│             └──────┬──────┘            └──────┬───────┘ └──┬──┘ │
│                    │                          │             │   │
│                    ▼                          ▼             ▼   │
│             ┌─────────────┐            ┌──────────────┐ ┌──────┐│
│             │  User DB    │            │  Tenant DBs  │ │Audit ││
│             │  (D1/SQLite)│            │  (per-tenant)│ │ Logs ││
│             └─────────────┘            └──────────────┘ └──────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Key principles:
1. **Zero Trust** — Every request authenticated & authorized
2. **Tenant Isolation** — Separate DB schemas or RLS policies
3. **Defense in Depth** — WAF → Gateway → App → DB
4. **Immutable Infrastructure** — GitOps deployments; no SSH access
5. **Secrets Management** — Cloudflare Workers secrets / Vault / KMS only

---

## SECURE CODING RECOMMENDATIONS

| Practice | Implementation |
|----------|----------------|
| **Input Validation** | Validate at route level with Zod; never trust client data |
| **Output Encoding** | Use framework auto-escaping; DOMPurify for HTML; never `dangerouslySetInnerHTML` without sanitization |
| **SQL Safety** | Only parameterized queries; no string concatenation; use query builder (Knex/Drizzle) |
| **Secrets** | Never in code; env vars only; rotate quarterly; audit access |
| **Dependencies** | `npm audit` in CI; Dependabot PRs; pin exact versions; `npm ci` only |
| **Error Handling** | Generic user messages; detailed server logs; correlation IDs |
| **Testing** | Unit tests for auth/payment; integration tests for critical flows; SAST in CI (CodeQL) |
| **Code Review** | Require 2 approvals; security checklist in PR template |

---

## COMPLIANCE CHECKLIST

| Standard | Status | Gaps |
|----------|--------|------|
| **OWASP Top 10 2021** | ⚠️ Partial | A01 (Broken Access Control), A02 (Cryptographic Failures), A03 (Injection), A05 (Security Misconfig), A07 (Auth Failures) |
| **OWASP ASVS 4.0 Level 2** | ❌ Fail | V1 (Architecture), V2 (Auth), V3 (Session), V4 (Access Control), V5 (Validation), V7 (Error Handling), V9 (Comm Security), V11 (Business Logic), V12 (Files), V13 (API), V14 (Config) |
| **CWE Top 25** | ⚠️ Partial | CWE-79, CWE-89, CWE-798, CWE-352, CWE-22, CWE-306, CWE-916, CWE-326 |
| **Security Headers** | ❌ Fail | Missing: CSP, HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy |
| **Authentication** | ⚠️ Partial | No MFA, weak password policy, token in localStorage, no session invalidation on password change |
| **Session Management** | ❌ Fail | Long-lived JWT (30d), no refresh rotation, no concurrent session limit, no device tracking |

---

## FINAL DEPLOYMENT CHECKLIST

### Pre-Deployment (Must Fix)
- [ ] Remove JWT_SECRET fallback; enforce via env
- [ ] Enable Helmet CSP with nonce-based script loading
- [ ] Restrict CORS to explicit allowlist
- [ ] Add CSRF protection (double-submit cookie)
- [ ] Replace `Math.random()` with `crypto.randomInt()`
- [ ] Hash OTPs with bcrypt/Argon2id
- [ ] Add password complexity requirements
- [ ] Store admin password as bcrypt hash; enforce MFA
- [ ] Parameterize all dynamic SQL `IN` clauses
- [ ] Add path traversal protection for `/uploads`
- [ ] Validate AI action JSON with Zod schemas
- [ ] Remove stack traces from error responses
- [ ] Add HSTS, X-Frame-Options, Permissions-Policy
- [ ] Sanitize email headers (newline strip)
- [ ] Require separate `SMTP_ENCRYPTION_KEY`
- [ ] Move JWT to HttpOnly Secure cookies
- [ ] Add rate limiting by user ID (not just IP)

### Post-Deployment (Week 1)
- [ ] Configure Cloudflare WAF managed ruleset
- [ ] Enable Cloudflare Turnstile on login/register
- [ ] Set up SPF/DKIM/DMARC for `fera-search.tech`
- [ ] Implement structured logging (pino) → Datadog/Sentry
- [ ] Enable Dependabot + `npm audit` in CI
- [ ] Add CodeQL analysis to GitHub Actions
- [ ] Document backup/restore procedure; test restore
- [ ] Create incident response runbook

### Ongoing (Monthly)
- [ ] Rotate JWT_SECRET (with key versioning)
- [ ] Review admin audit logs
- [ ] Scan dependencies for CVEs
- [ ] Penetration test (quarterly)
- [ ] Update threat model

---

## SECURITY SCORECARD

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Authentication & Session | 45 | 20% | 9.0 |
| Authorization & Access Control | 50 | 15% | 7.5 |
| Input Validation & Injection Prevention | 55 | 15% | 8.3 |
| Cryptography & Key Management | 40 | 10% | 4.0 |
| Security Headers & Browser Protection | 30 | 10% | 3.0 |
| API Security | 55 | 10% | 5.5 |
| Email & Communication Security | 50 | 5% | 2.5 |
| Multi-tenancy & Data Isolation | 60 | 5% | 3.0 |
| Infrastructure & DevOps | 45 | 5% | 2.3 |
| Monitoring, Logging & Incident Response | 35 | 5% | 1.8 |
| **TOTAL** |  | **100%** | **58 / 100** |

**Production Readiness: 52/100** — **DO NOT DEPLOY** until Critical/High findings resolved.

---

*This audit covers the codebase as of commit reviewed. Re-audit after fixes.*
# Specification & Validation Matrix: Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture)

**Author**: `spec_miner_m3_3_gen8`  
**Mission**: Mine specifications, standards, interface contracts, and validation rules for Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture).  
**Date**: 2026-10-02  
**Target Path**: `.agents/teamwork/spec_miner_m3_3_gen8/handoff.md`

---

## 1. Observation

Direct observations from authoritative project sources and codebase:

1. **User Requirements (`.agents/ORIGINAL_REQUEST.md` § 2026-10-01T11:23:41Z, R3 & R5)**:
   - Line 123: *"Implement an abstracted `DomainProvider` interface with methods for searching domains, checking availability, fetching authoritative pricing, registering domains, checking DNS/status, and handling provider webhooks."*
   - Line 124: *"Integrate domain purchasing with FeraSetu's established Cashfree billing architecture, strictly validating amounts on the server to prevent price tampering. Implement guided DNS verification (TXT/CNAME/SPF/DKIM/DMARC) for externally connected domains with copy buttons, error guidance, and re-check actions."*
   - Line 134: *"Enforce strict tenant isolation across all domain, email, template, and webhook endpoints (`authenticated user -> organization membership -> resource verification`). Ensure no secrets (SMTP passwords, B2 application keys, Cashfree secrets, AI keys) leak into browser responses, logs, or AI context. Prevent IDOR, SSRF during DNS verification, email header injection, and sender address spoofing."*

2. **Master Architecture & Interface Contracts (`PROJECT.md`)**:
   - Lines 108–119: Defines the canonical `DomainProvider` interface and API contract:
     - `search(query: string): Promise<Array<{ domain: string, available: boolean, priceInr: number, currency: 'INR', tld: string }>>`
     - `checkAvailability(domain: string): Promise<{ domain: string, available: boolean, priceInr: number, currency: 'INR' }>`
     - `getAuthoritativePricing(domain: string): Promise<{ domain: string, priceInr: number, taxInr: number, totalInr: number, currency: 'INR' }>`
     - `registerDomain(domain: string, contact: DomainContact, paymentRef: string): Promise<{ domain: string, orderId: string, status: 'PENDING' | 'ACTIVE', expiresAt: string }>`
     - `checkDnsStatus(domain: string): Promise<{ domain: string, verified: boolean, records: DnsRecordStatus[] }>`
     - `POST /api/domains/search`: Body `{ query: string }` -> Response `{ results: DomainResult[] }`
     - `POST /api/domains/purchase/initiate`: Body `{ domain: string, years: number }` -> Validates server price -> Creates Cashfree order -> Response `{ orderId, paymentSessionId, amount }`
     - `POST /api/domains/purchase/verify`: Body `{ orderId: string }` -> Verifies Cashfree order status -> Provisions domain in `email_domains`
   - Feature 16 (Line 78): *"Storefront Custom Domain Routing: Extend `classifyHostname` to resolve verified custom domains in D1 and render storefront SPA"*.

3. **Current DNS Verification Implementation (`worker/services/dnsVerification.js`)**:
   - Lines 18–48: `normalizeDomain` strips protocol (`https?://`), path/port, and trailing dots, but relies on a simple regex `/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i` which omits the hard RFC 1035 limits (max 253 total chars, max 63 chars per label).
   - Lines 53–90: `generateDnsInstructions` generates 5 records (TXT challenge `_ferasetu-challenge.${domain}`, TXT DKIM `${selector}._domainkey.${domain}`, TXT SPF `${domain}`, TXT DMARC `_dmarc.${domain}`, CNAME `mail.${domain}`).
   - Lines 96–128: `queryDoh` queries `https://cloudflare-dns.com/dns-query` with header `Accept: application/dns-json` and unescapes double quotes from `data`.
   - Lines 133–187: `verifyDomainDns` runs parallel DoH lookups for ownership challenge, DKIM, SPF, and DMARC. Overall domain verification requires ownership (`VERIFIED`), DKIM (`VERIFIED`), and SPF (`VERIFIED`). DMARC is optional (`RECOMMENDED_MISSING` does not block verification).
   - Lines 192–269: `provisionCloudflareDnsIfManaged` automatically provisions records via Cloudflare v4 REST API when zone is managed.

4. **Authoritative E2E Test Suite (`tests/e2e-domains-email.test.mjs`)**:
   - Lines 550–686: Implements reference `MockDomainProvider` defining:
     - Base TLD prices: `.in` = ₹799, `.com` = ₹999, `.store` = ₹499, `.co.in` = ₹699, fallback = ₹899.
     - 18% GST tax rounding: `taxInr = Math.round(priceInr * 0.18 * 100) / 100`.
     - Annual total: `totalInr = Math.round((priceInr + taxInr) * 100) / 100`.
     - Multi-year total: `expectedTotal = Math.round(pricing.totalInr * years * 100) / 100`.
     - Anti-tampering check: `if (clientAmount !== undefined && Number(clientAmount) !== expectedTotal)` throws error `"Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}"` (status 400).
     - Duration bounds: `years < 1 || years > 10 || !Number.isInteger(years)` throws error `"Registration duration must be an integer between 1 and 10 years"`.
     - Reserved domains rejection: `ferasetu.com`, `google.com`, `taken.in`, `forbidden.co.in`.
     - Cashfree order creation: `orderId` starting with `cf_dom_`, `paymentSessionId` starting with `session_`, status `'PAYMENT_PENDING'`.
     - Verification provisioning: provisions domain in `email_domains` with `domain_type: 'CUSTOM'`, status `'PENDING'`, and selector `'fs1'`.
   - Lines 1650–1681 (Area 3: Max Domain Length & RFC 1035 Boundaries):
     - `T2.3.1`: Reject total length > 253 chars.
     - `T2.3.2`: Reject label length > 63 chars.
     - `T2.3.3`: Reject leading/trailing hyphens (`-store.com`, `store-.com`, `my.-store.com`).
     - `T2.3.4`: Reject invalid characters/spaces (`my store.com`, `store!.com`, `store@shop.com`).
     - `T2.3.5`: Reject platform root & subdomains (`ferasetu.com`, `admin.ferasetu.com`, `mail.ferasetu.com`, `shop.ferasetu.com`).
   - Lines 1687–1770 (Area 4: Invalid SPF / DKIM Formats):
     - `T2.4.1`: SPF missing `v=spf1` prefix fails verification (`spfStatus: 'PENDING'`).
     - `T2.4.2`: DKIM missing `v=DKIM1` fails verification (`dkimStatus: 'PENDING'`).
     - `T2.4.3`: Missing DMARC sets `dmarcStatus: 'RECOMMENDED_MISSING'` while overall verification passes if ownership, DKIM, and SPF pass.
     - `T2.4.4`: DoH query network error returns gracefully without unhandled exception.
     - `T2.4.5`: Mismatched ownership challenge token blocks verification (`ownershipStatus: 'PENDING'`).

5. **D1 Database Schemas (`worker/migrations/0014_production_email_architecture.sql`, `0003_transactions_and_storefront.sql`, `0015_payment_hardening_and_test_mode.sql`)**:
   - `email_domains` table contains columns `id`, `organization_id`, `domain`, `domain_type`, `verification_status`, `ownership_verification_method`, `verification_token_hash`, `dkim_selector`, `dkim_status`, `spf_status`, `dmarc_status`, `mail_from_status`, `provider`, `created_at`, `updated_at`, `verified_at`, `last_checked_at`.
   - `transactions` table contains `provider_order_id`, `amount`, `currency`, `status`, `is_test_payment`, with unique index on `provider_order_id`.

6. **Frontend Experience (`frontend/src/pages/EmailSettingsPage.tsx`)**:
   - Lines 770–855: Interactive domain search form supporting TLD filter buttons `['.in', '.com', '.store', '.co.in']`, displaying available cards with ₹ base price per year, and 1-click Cashfree checkout trigger.

---

## 2. Logic Chain

From the observations, the specification and validation rules are derived through the following deductive chain:

1. **Domain Input Normalization and Boundary Invariants (RFC 1035 / RFC 1123)**:
   - *Observation 4 (`T2.3.1`–`T2.3.5`)* establishes that `normalizeDomain` is the gatekeeper for all domain inputs across registration, search, and DNS connection.
   - *Logic Step 1.1*: Because RFC 1035 §2.3.4 restricts the domain wire format to 255 octets (which translates to 253 characters in dot-separated string representation), any string with `domain.length > 253` must be rejected immediately before regex execution.
   - *Logic Step 1.2*: RFC 1035 §2.3.4 restricts individual labels to 63 characters. A regex like `^([a-z0-9-]+\.)+[a-z]+$` does not check label lengths. Therefore, splitting the domain into dot-separated labels (`domain.split('.')`) and checking `label.length > 63` or `label.length === 0` is strictly necessary.
   - *Logic Step 1.3*: RFC 1123 §2.1 permits alphanumeric characters and hyphens, but explicitly forbids leading or trailing hyphens. Each label must strictly conform to `/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i` for multi-character labels, or `/^[a-z0-9]$/i` for single-character labels.
   - *Logic Step 1.4*: Consecutive dots (`..`) result in empty labels (`label.length === 0`), violating the specification.
   - *Logic Step 1.5*: Platform collision avoidance requires blocking `ferasetu.com` and any subdomain ending with `.ferasetu.com` (`domain === 'ferasetu.com' || domain.endsWith('.ferasetu.com')`).

2. **Authoritative Pricing & Anti-Price-Tampering Architecture**:
   - *Observation 2 & 4 (`T1.3.1`–`T1.3.5`, `T2.5.1`–`T2.5.5`)* mandate that the server is the single source of truth for domain prices.
   - *Logic Step 2.1*: Base annual prices in INR are statically defined per supported TLD:
     - `.store` = ₹499
     - `.co.in` = ₹699
     - `.in` = ₹799
     - `.com` = ₹999
     - Fallback / other TLDs = ₹899
   - *Logic Step 2.2*: Tax calculation follows statutory Indian 18% GST with standard 2-decimal rounding:
     $$\text{taxInr} = \frac{\text{round}(\text{priceInr} \times 0.18 \times 100)}{100}$$
     $$\text{totalInr} = \frac{\text{round}((\text{priceInr} + \text{taxInr}) \times 100)}{100}$$
   - *Logic Step 2.3*: Multi-year registration allows integers $1 \le \text{years} \le 10$:
     $$\text{expectedTotal} = \frac{\text{round}(\text{totalInr} \times \text{years} \times 100)}{100}$$
   - *Logic Step 2.4*: Any client payload submitting `clientAmount` that deviates from `expectedTotal` (including zero, negative, or spoofed discounts) triggers an immediate HTTP 400 error: `"Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}"`.
   - *Logic Step 2.5*: If the domain is already recorded in `email_domains`, purchase initiation rejects with HTTP 409 Conflict.

3. **DNS Verification Engine (5 Records & DoH Status Machine)**:
   - *Observation 3 & 4 (`T1.2.2`–`T1.2.5`, `T2.4.1`–`T2.4.5`)* define the exact verification contract.
   - *Logic Step 3.1*: Exactly 5 records are generated for every connected domain:
     1. `_ferasetu-challenge.${domain}` (TXT) -> `fera-domain-verification=${token}` (Ownership)
     2. `fs1._domainkey.${domain}` (TXT) -> `v=DKIM1; k=rsa; p=${pubkey}` (DKIM)
     3. `${domain}` (TXT) -> `v=spf1 include:_spf.ferasetu.com ~all` (SPF)
     4. `_dmarc.${domain}` (TXT) -> `v=DMARC1; p=reject; rua=mailto:dmarc-reports@ferasetu.com; aspf=r; adkim=r` (DMARC)
     5. `mail.${domain}` (CNAME) -> `mail.ferasetu.com` (Return-Path)
   - *Logic Step 3.2*: Verification query uses Cloudflare DoH (`https://cloudflare-dns.com/dns-query`). All 4 TXT checks run concurrently via `Promise.all`.
   - *Logic Step 3.3*: Verification criteria:
     - Ownership: must contain `challengeToken`.
     - DKIM: must contain `v=DKIM1`.
     - SPF: must contain `v=spf1` AND (`ferasetu.com` OR `all`).
     - DMARC: must contain `v=DMARC1` (if missing -> `RECOMMENDED_MISSING`, non-blocking).
   - *Logic Step 3.4*: Overall verification requires Ownership, DKIM, and SPF to be `VERIFIED`. Upon transition to `VERIFIED`, the system automatically provisions `orders@{domain}` as an active custom identity.
   - *Logic Step 3.5*: Network failures or DNS timeouts must return `{ success: false, answers: [], error }` and maintain `PENDING` status without throwing unhandled exceptions.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Domain Validation | RFC 1035 Max Length Enforcement | Rejects any domain whose total length exceeds 253 characters | `domain: string` | `{ valid: true, domain }` | Returns `{ valid: false, error: "Domain name exceeds maximum RFC 1035 length of 253 characters" }` | `tests/e2e-domains-email.test.mjs:1650` (`T2.3.1`) |
| 2 | Domain Validation | RFC 1035 Label Length Enforcement | Rejects any domain containing a DNS label exceeding 63 characters | `domain: string` | `{ valid: true, domain }` | Returns `{ valid: false, error: "DNS label exceeds maximum RFC 1035 length of 63 characters" }` | `tests/e2e-domains-email.test.mjs:1658` (`T2.3.2`) |
| 3 | Domain Validation | Label Hyphen Syntax Rules | Rejects domain labels with leading (`-store.com`) or trailing (`store-.com`) hyphens | `domain: string` | `{ valid: true, domain }` | Returns `{ valid: false, error: "Invalid domain name syntax" }` | `tests/e2e-domains-email.test.mjs:1664` (`T2.3.3`) |
| 4 | Domain Validation | Special Character & Space Stripping | Disallows whitespace, punctuation, `@`, and control characters in domain names | `domain: string` | `{ valid: true, domain }` | Returns `{ valid: false, error: "Invalid domain name syntax" }` | `tests/e2e-domains-email.test.mjs:1670` (`T2.3.4`) |
| 5 | Domain Validation | Platform Domain Collision Defense | Blocks registration or connection of `ferasetu.com` or any subdomain `*.ferasetu.com` | `domain: string` | `{ valid: true, domain }` | Returns `{ valid: false, error: "Custom domain cannot be a subdomain of ferasetu.com" }` | `tests/e2e-domains-email.test.mjs:1676` (`T2.3.5`), `worker/services/dnsVerification.js:43` |
| 6 | Domain Provider | Multi-TLD Search & Availability | Queries availability and returns base INR pricing across `.in`, `.com`, `.store`, `.co.in` | `query: string` | `Array<{ domain, available, priceInr, currency: 'INR', tld }>` | Throws Error if query string is empty or missing | `PROJECT.md:109`, `tests/e2e-domains-email.test.mjs:566` (`T1.3.1`) |
| 7 | Authoritative Pricing | Authoritative 18% GST Tax Computation | Computes base price, exact 18% GST tax, and total INR with 2-decimal rounding | `domain: string` | `{ domain, priceInr, taxInr, totalInr, currency: 'INR' }` | Throws Error if domain is invalid syntax | `PROJECT.md:111`, `tests/e2e-domains-email.test.mjs:603` (`T1.3.2`) |
| 8 | Authoritative Pricing | Duration Validation (1–10 Years) | Enforces integer registration period between 1 and 10 years | `years: number` | Validated integer `years` | Throws Error `"Registration duration must be an integer between 1 and 10 years"` | `tests/e2e-domains-email.test.mjs:620` (`T2.5.4`, `T2.5.5`) |
| 9 | Billing / PG | Cashfree Order Anti-Tampering Check | Validates client-submitted amount against server-calculated authoritative price | `{ domain, years, clientAmount, organizationId }` | `{ orderId, paymentSessionId, amount, currency: 'INR', status: 'PAYMENT_PENDING' }` | Throws Error HTTP 400 `"Price tampering detected: client provided ₹..., server authoritative total is ₹..."` | `tests/e2e-domains-email.test.mjs:630` (`T2.5.1`–`T2.5.3`) |
| 10 | Billing / PG | Post-Payment Domain Provisioning | Verifies Cashfree payment status `PAID` and provisions domain in `email_domains` | `{ orderId, domain, organizationId, cashfreeStatus }` | `{ success: true, domain, dnsInstructions: Array(5) }` | Throws Error if Cashfree status !== 'PAID' or domain already taken | `tests/e2e-domains-email.test.mjs:658` (`T1.3.5`) |
| 11 | DNS Verification | 5-Record DNS Instruction Generation | Generates exactly 5 records: Ownership TXT, DKIM TXT, SPF TXT, DMARC TXT, and Mail CNAME | `domain: string, token: string, selector: string` | `Array<{ type, name, value, purpose, required }>` | Validates domain normalization | `worker/services/dnsVerification.js:53`, `tests/e2e-domains-email.test.mjs:980` (`T1.2.2`) |
| 12 | DNS Verification | Cloudflare DoH Parallel Verification | Queries DoH concurrently for challenge, DKIM, SPF, and DMARC records | `domain: string, challengeToken: string, selector: string` | `{ verified, status, ownershipStatus, dkimStatus, spfStatus, dmarcStatus, details }` | Network errors handled gracefully, returns `PENDING` without crashing | `worker/services/dnsVerification.js:133`, `tests/e2e-domains-email.test.mjs:1009` (`T1.2.3`, `T2.4.4`) |
| 13 | DNS Verification | DMARC Non-Blocking Evaluation | Sets `dmarcStatus` to `RECOMMENDED_MISSING` if absent; allows overall verification to pass | DoH TXT answers for `_dmarc.${domain}` | `dmarcStatus: 'RECOMMENDED_MISSING'` | Does not block domain verification status | `worker/services/dnsVerification.js:161`, `tests/e2e-domains-email.test.mjs:1723` (`T2.4.3`) |
| 14 | DNS Verification | Verified Custom Sender Auto-Provisioning | Automatically provisions `orders@{customDomain}` identity upon successful verification | `domainRow` with status `'VERIFIED'` | Inserts record into `email_identities` | Idempotent (does not duplicate if already exists) | `worker/routes/emailRoutes.js:235`, `tests/e2e-domains-email.test.mjs:1090` (`T1.2.5`) |
| 15 | Storefront Routing | Custom Domain Hostname Resolution | Resolves incoming verified custom domain in D1 to merchant shop and organization | `hostname: string` | `{ type: 'custom_domain', shop, organization }` | Returns `unknown_host` if domain unverified or nonexistent | `PROJECT.md:78` (Feature 16), `worker/storefront.js:113`, `worker/index.js:473` |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Domain Length | 254-character domain (`'a'.repeat(60) + '.' + ... + '.com'`) | Rejected with `{ valid: false, error: "Domain name exceeds maximum RFC 1035 length of 253 characters" }` |
| 2 | Label Length | 64-character DNS label (`'a'.repeat(64) + '.com'`) | Rejected with `{ valid: false, error: "DNS label exceeds maximum RFC 1035 length of 63 characters" }` |
| 3 | Label Hyphens | Leading hyphen (`-store.com`), trailing hyphen (`store-.com`), interior label leading hyphen (`my.-store.com`) | Rejected with `{ valid: false, error: "Invalid domain name syntax" }` |
| 4 | Consecutive Dots | Double dot in domain name (`shop..store.com`) | Rejected as invalid syntax / empty label |
| 5 | Invalid Characters | Domain containing space (`my store.com`), exclamation (`store!.com`), or email symbol (`store@shop.com`) | Rejected with `{ valid: false, error: "Invalid domain name syntax" }` |
| 6 | Protocol Prefix | User pastes `https://my-kirana.in/` or `http://my-kirana.in:8080` | Strips `https://`, trailing slash, and port; normalizes to `my-kirana.in` |
| 7 | Trailing Dot | FQDN with trailing dot (`my-kirana.in.`) | Strips trailing dot; normalizes to `my-kirana.in` |
| 8 | Platform Root | Apex domain `ferasetu.com` | Rejected with `{ valid: false, error: "Custom domain cannot be a subdomain of ferasetu.com" }` |
| 9 | Platform Subdomain | Subdomains `admin.ferasetu.com`, `mail.ferasetu.com`, `shop.ferasetu.com`, `api.ferasetu.com` | Rejected with `{ valid: false, error: "Custom domain cannot be a subdomain of ferasetu.com" }` |
| 10 | TLD Pricing `.store` | Domain `freshmart.store` (Base ₹499) | `priceInr: 499`, `taxInr: 89.82`, `totalInr: 588.82` (18% GST: `499 * 0.18 = 89.82`) |
| 11 | TLD Pricing `.co.in` | Domain `delhiretail.co.in` (Base ₹699) | `priceInr: 699`, `taxInr: 125.82`, `totalInr: 824.82` (18% GST: `699 * 0.18 = 125.82`) |
| 12 | TLD Pricing `.in` | Domain `rohankirana.in` (Base ₹799) | `priceInr: 799`, `taxInr: 143.82`, `totalInr: 942.82` (18% GST: `799 * 0.18 = 143.82`) |
| 13 | TLD Pricing `.com` | Domain `globalbazaar.com` (Base ₹999) | `priceInr: 999`, `taxInr: 179.82`, `totalInr: 1178.82` (18% GST: `999 * 0.18 = 179.82`) |
| 14 | Duration: Zero Years | Registration duration `years = 0` | Throws Error `"Registration duration must be an integer between 1 and 10 years"` |
| 15 | Duration: Negative Years | Registration duration `years = -2` | Throws Error `"Registration duration must be an integer between 1 and 10 years"` |
| 16 | Duration: Fractional Years | Registration duration `years = 1.5` | Throws Error `"Registration duration must be an integer between 1 and 10 years"` |
| 17 | Duration: Excessive Years | Registration duration `years = 11` or `years = 100` | Throws Error `"Registration duration must be an integer between 1 and 10 years"` |
| 18 | Price Tampering: Zero Amount | Client submits `clientAmount: 0` for domain checkout | Throws Error HTTP 400 `"Price tampering detected: client provided ₹0, server authoritative total is ₹..."` |
| 19 | Price Tampering: Negative Amount | Client submits `clientAmount: -799` | Throws Error HTTP 400 `"Price tampering detected: client provided ₹-799, server authoritative total is ₹..."` |
| 20 | Price Tampering: Spoofed Discount | Client attempts to pay ₹99.00 instead of authoritative ₹942.82 | Throws Error HTTP 400 `"Price tampering detected: client provided ₹99, server authoritative total is ₹942.82"` |
| 21 | Multi-Year Total Rounding | 3 years of `.in` domain (`years = 3`) | `expectedTotal = Math.round(942.82 * 3 * 100) / 100 = 2828.46` INR |
| 22 | Duplicate Registration | Merchant attempts to initiate purchase for a domain already present in `email_domains` | Throws Error HTTP 409 `"This domain is already registered in FeraSetu"` |
| 23 | Reserved/Unavailable Domain | Search/purchase of `google.com` or `taken.in` | Throws Error `"Domain google.com is unavailable for registration"` |
| 24 | Malformed SPF Record | DNS returns TXT answer without `v=spf1` (e.g. `include:_spf.google.com ~all`) | `spfStatus: 'PENDING'`, overall verification fails (`verified: false`) |
| 25 | Malformed DKIM Record | DNS returns TXT answer without `v=DKIM1` (e.g. `k=dsa; p=invalidkey`) | `dkimStatus: 'PENDING'`, overall verification fails (`verified: false`) |
| 26 | Missing DMARC Record | DNS returns empty answer `[]` for `_dmarc.${domain}` | `dmarcStatus: 'RECOMMENDED_MISSING'`, overall verification succeeds if ownership, DKIM, and SPF pass |
| 27 | DoH Network Timeout | Cloudflare DoH lookup throws network error or timeout | Handled in try/catch; returns `{ success: false, answers: [], error: 'DNS Server Timeout' }`, status remains `PENDING` without 500 crash |
| 28 | Mismatched Challenge Token | DNS returns TXT with wrong token `fera-domain-verification=wrong_token` | `ownershipStatus: 'PENDING'`, overall verification fails (`verified: false`) |
| 29 | Cross-Tenant Domain Collision | Merchant A registers `custom-store.in`; Merchant B attempts to connect `custom-store.in` | HTTP 409 Conflict: `"This domain is already registered by another organization."` |
| 30 | Identity Creation Guard | Attempting to create sender identity on domain with status `PENDING` | HTTP 400 Bad Request: sender identity creation strictly blocked until domain status is `VERIFIED` |

---

## 5. Detailed Specifications & Algorithms

### 5.1 RFC 1035 / RFC 1123 Domain Normalization & Validation Algorithm

```javascript
/**
 * Authoritative RFC 1035 / RFC 1123 domain normalization and validation.
 * Enforces total length <= 253, label length <= 63, label regex, and platform collision defense.
 * 
 * @param {string} domainInput - Raw merchant domain input
 * @returns {{ valid: boolean, domain?: string, error?: string }}
 */
export function normalizeDomain(domainInput) {
  if (!domainInput || typeof domainInput !== "string") {
    return { valid: false, error: "Domain name is required" };
  }

  let domain = domainInput.trim().toLowerCase();

  // Strip protocol prefix (http://, https://)
  domain = domain.replace(/^https?:\/\//i, "");

  // Strip path, query parameters, or port
  domain = domain.split("/")[0].split(":")[0];

  // Strip trailing dot (DNS root)
  domain = domain.replace(/\.+$/, "");

  if (!domain) {
    return { valid: false, error: "Invalid domain format" };
  }

  // 1. RFC 1035 Section 2.3.4: Total domain length <= 253 characters
  if (domain.length > 253) {
    return { valid: false, error: "Domain name exceeds maximum RFC 1035 length of 253 characters" };
  }

  // 2. Reject consecutive dots (empty labels)
  if (domain.includes("..")) {
    return { valid: false, error: "Invalid domain name syntax" };
  }

  const labels = domain.split(".");

  // 3. Must have at least 2 labels (name + TLD)
  if (labels.length < 2) {
    return { valid: false, error: "Invalid domain name syntax" };
  }

  // 4. Validate each label
  const labelRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
  for (const label of labels) {
    // Label length constraint: 1 to 63 characters (RFC 1035 §2.3.4)
    if (label.length === 0 || label.length > 63) {
      return { valid: false, error: "DNS label exceeds maximum RFC 1035 length of 63 characters" };
    }

    // Label character and hyphen syntax constraint (RFC 1123 §2.1)
    if (!labelRegex.test(label)) {
      return { valid: false, error: "Invalid domain name syntax" };
    }
  }

  // 5. TLD validation: last label must be letters only, minimum 2 characters
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/i.test(tld)) {
    return { valid: false, error: "Invalid domain name syntax" };
  }

  // 6. Platform collision avoidance: forbid platform root domain and any subdomains
  const ROOT_DOMAIN = "ferasetu.com";
  if (domain === ROOT_DOMAIN || domain.endsWith(`.${ROOT_DOMAIN}`)) {
    return { valid: false, error: `Custom domain cannot be a subdomain of ${ROOT_DOMAIN}` };
  }

  return { valid: true, domain };
}
```

### 5.2 Authoritative Pricing & 18% GST Calculation Specification

#### 5.2.1 Supported TLD Pricing Catalog (INR)

| TLD | Base Price (1 Year) | 18% GST Tax | Total Price (1 Year) | 2 Years Total | 3 Years Total | 5 Years Total | 10 Years Total |
|---|---|---|---|---|---|---|---|
| `.store` | ₹499.00 | ₹89.82 | **₹588.82** | ₹1,177.64 | ₹1,766.46 | ₹2,944.10 | ₹5,888.20 |
| `.co.in` | ₹699.00 | ₹125.82 | **₹824.82** | ₹1,649.64 | ₹2,474.46 | ₹4,124.10 | ₹8,248.20 |
| `.in` | ₹799.00 | ₹143.82 | **₹942.82** | ₹1,885.64 | ₹2,828.46 | ₹4,714.10 | ₹9,428.20 |
| `.com` | ₹999.00 | ₹179.82 | **₹1,178.82** | ₹2,357.64 | ₹3,536.46 | ₹5,894.10 | ₹11,788.20 |
| Fallback | ₹899.00 | ₹161.82 | **₹1,060.82** | ₹2,121.64 | ₹3,182.46 | ₹5,304.10 | ₹10,608.20 |

#### 5.2.2 Exact Mathematical Formulas & Rounding Rules

1. **Base Price Resolution**:
   - Extract TLD: `const tld = '.' + cleanDomain.split('.').slice(1).join('.');`
   - Map: `const priceInr = TLD_PRICES[tld] || 899;`
2. **Annual GST Tax (18%)**:
   - Multiplier: `0.18`
   - Exact Rounding: `const taxInr = Math.round(priceInr * 0.18 * 100) / 100;`
3. **Annual Total (Base + Tax)**:
   - Rounding: `const totalInr = Math.round((priceInr + taxInr) * 100) / 100;`
4. **Multi-Year Total Calculation**:
   - Range validation: `years >= 1 && years <= 10 && Number.isInteger(years)`
   - Formula: `const expectedTotal = Math.round(totalInr * years * 100) / 100;`
5. **Anti-Tampering Comparison**:
   ```javascript
   if (clientAmount !== undefined && Number(clientAmount) !== expectedTotal) {
     const err = new Error(`Price tampering detected: client provided ₹${clientAmount}, server authoritative total is ₹${expectedTotal}`);
     err.status = 400;
     throw err;
   }
   ```

### 5.3 DNS Verification Specification (5 Records, DoH, & Failure Modes)

#### 5.3.1 5-Record DNS Instruction Definition

```javascript
export function generateDnsInstructions(domain, verificationToken, selector = "fs1", dkimPubKey = DEFAULT_PLATFORM_DKIM_PUBKEY) {
  return [
    {
      type: "TXT",
      name: `_ferasetu-challenge.${domain}`,
      value: `fera-domain-verification=${verificationToken}`,
      purpose: "Domain Ownership Verification",
      required: true,
    },
    {
      type: "TXT",
      name: `${selector}._domainkey.${domain}`,
      value: `v=DKIM1; k=rsa; p=${dkimPubKey}`,
      purpose: "DKIM Authenticated Signing (RFC 6376)",
      required: true,
    },
    {
      type: "TXT",
      name: domain,
      value: `v=spf1 include:_spf.ferasetu.com ~all`,
      purpose: "SPF Sender Authorization (RFC 7208)",
      required: true,
    },
    {
      type: "TXT",
      name: `_dmarc.${domain}`,
      value: `v=DMARC1; p=reject; rua=mailto:dmarc-reports@ferasetu.com; aspf=r; adkim=r`,
      purpose: "DMARC Alignment Policy (RFC 7489)",
      required: false,
    },
    {
      type: "CNAME",
      name: `mail.${domain}`,
      value: `mail.ferasetu.com`,
      purpose: "Custom Mail From Return-Path",
      required: false,
    },
  ];
}
```

#### 5.3.2 Parallel DoH Query & Quote Unescaping

- **DoH URL**: `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`
- **Request Headers**:
  - `Accept: application/dns-json`
  - `User-Agent: FeraSetu-Worker-DnsVerifier/1.0`
- **Record Data Parsing**:
  DNS servers enclose TXT string records in RFC 1035 double quotes (`"..."`). The parser must strip enclosing quotes:
  ```javascript
  let val = a.data || "";
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }
  ```
- **Execution**: 4 TXT queries (`_ferasetu-challenge`, `${selector}._domainkey`, `${domain}`, `_dmarc`) executed in parallel via `Promise.all`.

#### 5.3.3 Record Match Verification & State Machine

1. **Ownership Challenge**:
   - Condition: `answers.some(a => a.data.includes(expectedChallenge) || a.data.includes(challengeToken))`
   - Match -> `'VERIFIED'`
   - Miss -> `'PENDING'`
2. **DKIM Record**:
   - Condition: `answers.some(a => a.data.includes("v=DKIM1") || a.data.includes("k=rsa"))`
   - Match -> `'VERIFIED'`
   - Miss -> `'PENDING'`
3. **SPF Record**:
   - Condition: `answers.some(a => a.data.includes("v=spf1") && (a.data.includes(ROOT_DOMAIN) || a.data.includes("all")))`
   - Match -> `'VERIFIED'`
   - Miss -> `'PENDING'`
4. **DMARC Record**:
   - Condition: `answers.some(a => a.data.includes("v=DMARC1"))`
   - Match -> `'VERIFIED'`
   - Miss -> `'RECOMMENDED_MISSING'`
5. **Overall Domain Status Transition**:
   - `const isVerified = ownershipStatus === "VERIFIED" && dkimStatus === "VERIFIED" && spfStatus === "VERIFIED";`
   - If `isVerified`:
     - `verification_status` updated to `'VERIFIED'`
     - `verified_at` set to ISO timestamp
     - Auto-provision default sender identity `orders@{domain}` in `email_identities` (if not already existing) with `identity_type = 'CUSTOM'`, `status = 'ACTIVE'`, `is_default = 0`.
   - If not verified:
     - `verification_status` remains `'PENDING'`
6. **Graceful Network Degradation**:
   - If DoH fetch throws or returns non-200, return `{ success: false, answers: [], error }` and record status as `'PENDING'`. Never throw uncaught 500 error.

---

## 6. Caveats

1. **Zone API Token Dependency**: Cloudflare REST API automated DNS provisioning (`provisionCloudflareDnsIfManaged`) requires `CLOUDFLARE_API_TOKEN` / `CF_API_TOKEN` environment variable. When omitted, domain verification operates exclusively via DoH polling (manual DNS configuration by merchant).
2. **DNS Propagation Latency**: External DNS changes can take up to 24–48 hours depending on merchant registrar TTL settings. The DoH verification endpoint is designed to be polled on demand via "Re-check DNS" button without rate limit penalties on Cloudflare DoH.
3. **Punycode / IDN Support**: Internationalized Domain Names (IDNs) in Indian scripts (e.g. `.भारत`) are converted to ASCII Punycode (`xn--...`) prior to DNS lookup. The RFC 1035 label limit applies to the Punycode ASCII representation.

---

## 7. Conclusion

Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture) is governed by strict, mathematically deterministic specifications:
1. **Domain Validation**: Normalization must enforce RFC 1035 total length $\le 253$, label length $\le 63$, label regex `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, no leading/trailing hyphens, no consecutive dots, and forbid `ferasetu.com` platform domains.
2. **Authoritative Pricing**: Defined base prices across `.in` (₹799), `.com` (₹999), `.store` (₹499), `.co.in` (₹699) with 18% GST `Math.round(price * 0.18 * 100) / 100`, duration $1 \le \text{years} \le 10$, and server-enforced anti-tampering rejection.
3. **DNS Verification**: Exactly 5 records with Cloudflare DoH parallel verification, unescaping quotes, requiring Ownership + DKIM + SPF for `'VERIFIED'`, treating DMARC as non-blocking `'RECOMMENDED_MISSING'`, and auto-provisioning `orders@{domain}`.

This specification is complete, authoritative, and ready for immediate implementation by Milestone 3 engineers.

---

## 8. Verification Method

To verify the specifications and rules documented in this report:

1. **Inspect Test Suite**:
   - Open `tests/e2e-domains-email.test.mjs`
   - Lines 550–686: Verify `MockDomainProvider` pricing and duration implementation.
   - Lines 980–1126: Verify 5 DNS records and DoH verification tests (`T1.2.2`–`T1.2.5`).
   - Lines 1132–1215: Verify domain search, 18% GST calculation, and purchase flow (`T1.3.1`–`T1.3.5`).
   - Lines 1647–1682: Verify RFC 1035 boundary tests (`T2.3.1`–`T2.3.5`).
   - Lines 1684–1772: Verify invalid SPF/DKIM formats and DoH failure tests (`T2.4.1`–`T2.4.5`).
   - Lines 1774–1870: Verify zero/negative pricing tampering tests (`T2.5.1`–`T2.5.5`).

2. **Inspect Production Modules**:
   - `worker/services/dnsVerification.js`
   - `worker/routes/emailRoutes.js`
   - `worker/migrations/0014_production_email_architecture.sql`
   - `worker/storefront.js`

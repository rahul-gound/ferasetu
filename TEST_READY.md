# TEST_READY: FeraSetu Domains & Email Architecture E2E Test Suite (Tiers 1–4)

**Document Version:** 1.0.0  
**Author:** `test_writer_e2e_gen7` (E2E Test Architect)  
**Date:** 2026-10-01  
**Target File:** `tests/e2e-domains-email.test.mjs`  
**Authoritative Specifications:** `ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z, R1–R5), `PROJECT.md`  
**Test Harness Type:** Opaque-Box E2E Integration & System Test Suite  
**Test Framework:** Node.js Native Test Runner (`node:test`, `node:assert/strict`)  

---

## 1. Executive Summary

A comprehensive, self-contained 4-tier E2E opaque-box test suite has been designed, implemented, and delivered in `tests/e2e-domains-email.test.mjs` covering FeraSetu's complete Domains & Email Architecture.

The test suite contains **71 discrete test cases** rigorously derived from platform specifications, RFC standards (RFC 1035, RFC 5321, RFC 5322, RFC 6376, RFC 7208, RFC 7489), and interface contracts in `PROJECT.md`.

### Suite Summary Metrics:
- **Total Test Cases:** 71
- **Tier 1 (Feature Coverage):** 31 tests (>=5 tests per feature across 6 core features)
- **Tier 2 (Boundary & Corner Cases):** 25 tests (>=5 tests per feature across 5 critical boundary areas)
- **Tier 3 (Cross-Feature Combinations):** 11 tests (Pairwise multi-feature interactions & tenant isolation)
- **Tier 4 (Real-World Workload Scenarios):** 4 end-to-end realistic merchant lifecycles

---

## 2. Test Execution Instructions

### Fast Run (Single Suite):
```powershell
node tests/e2e-domains-email.test.mjs
```

### Native Node Test Runner:
```powershell
node --test tests/e2e-domains-email.test.mjs
```

### Full Repository Regression Run:
```powershell
node --test tests/e2e-domains-email.test.mjs tests/production-email-architecture.test.mjs tests/production-email-integration.test.mjs tests/cashfree-payment-verification.test.mjs
```

### Test Environment Prerequisites:
- **Node.js:** v18.0.0+ (ESM modules, Web Crypto API, native `node:test`).
- **Dependencies:** All dependencies resolve locally from `worker/node_modules/jose`.
- **Zero External Secrets:** Does NOT require live Modal Postfix or external SMTP credentials; operates with deterministic in-memory cryptographic fixtures, simulated DoH endpoints, and isolated mock D1 database.

---

## 3. Requirements Traceability Matrix

| Requirement | Description | Test Tier | Test IDs | Coverage Count |
|---|---|---|---|:---:|
| **R1** | External Integration Audit & Canonical Service Layer | Tier 1, Tier 2 | T1.1.4, T1.1.5, T2.2.1–T2.2.5, T4.3 | 8 tests |
| **R2** | Merchant Domains & Email Dashboard Experience (Default Mail, Sender Aliases, Reply-To) | Tier 1, Tier 3, Tier 4 | T1.1.1–T1.1.5, T1.5.2, T1.5.3, T3.1.1–T3.1.3, T4.1 | 11 tests |
| **R3** | Pluggable Domain Provider & Cashfree Purchase Architecture | Tier 1, Tier 2, Tier 3, Tier 4 | T1.2.1–T1.2.5, T1.3.1–T1.3.5, T2.3.1–T2.3.5, T2.4.1–T2.4.5, T2.5.1–T2.5.5, T3.1.1–T3.1.3, T4.1 | 29 tests |
| **R4** | Transactional Email Engine, Templates & AI Assistant | Tier 1, Tier 2, Tier 3, Tier 4 | T1.4.1–T1.4.5, T1.5.1–T1.5.6, T1.6.1–T1.6.5, T2.1.1–T2.1.5, T3.2.1–T3.2.3, T4.1, T4.2, T4.4 | 26 tests |
| **R5** | Security, Tenant Isolation & Production Hardening | Tier 2, Tier 3, Tier 4 | T2.2.1–T2.2.5, T2.5.1–T2.5.5, T3.3.1–T3.3.5, T4.3, T4.4 | 17 tests |

---

## 4. Full 4-Tier Test Coverage Catalog

### Tier 1: Feature Coverage (31 Tests)

#### Feature 1: FeraSetu Mail Default Experience (5 tests)
- `T1.1.1`: Automatic lazy provisioning of `orders@{slug}.ferasetu.com` on merchant first visit to `/api/email/settings`.
- `T1.1.2`: Platform default domain `ferasetu.com` is configured with `domain_type: PLATFORM` and status `VERIFIED`.
- `T1.1.3`: Default merchant identity is initialized with local_part `orders`, `identity_type: MERCHANT`, and `status: ACTIVE`.
- `T1.1.4`: Default provider connection is set to `provider_type: FERASETU` with `security_mode: STARTTLS`.
- `T1.1.5`: Outbound email dispatches cleanly using default FeraSetu Mail identity with verified headers.

#### Feature 2: Custom Domain DNS Records (5 tests)
- `T1.2.1`: Custom domain registration endpoint (`POST /api/email/domains`) normalizes URLs and generates ownership token.
- `T1.2.2`: Generates exactly 5 DNS records: TXT challenge (`_ferasetu-challenge`), TXT DKIM (`fs1._domainkey`), TXT SPF, TXT DMARC (`_dmarc`), and CNAME (`mail`).
- `T1.2.3`: DNS verification endpoint (`POST /api/email/domains/:id/verify`) executes DoH queries and updates record state.
- `T1.2.4`: Verification handles missing or unpropagated DNS records gracefully without crashing.
- `T1.2.5`: Successful custom domain verification auto-provisions `orders@{customDomain}` sender identity.

#### Feature 3: Domain Search & Purchase Validation (5 tests)
- `T1.3.1`: `DomainProvider.search` returns multi-TLD availability (`.in`, `.com`, `.store`, `.co.in`) with authoritative INR prices.
- `T1.3.2`: `DomainProvider.getAuthoritativePricing` computes base price, 18% GST tax, and total amount in INR.
- `T1.3.3`: Cashfree checkout order initiation generates unique order ID, payment session ID, and enforces server-validated pricing.
- `T1.3.4`: Domain purchase rejects unavailable or reserved domain names prior to payment initiation.
- `T1.3.5`: Cashfree post-payment verification registers domain and creates record in `email_domains` with `CUSTOM` type and `PENDING` DNS status.

#### Feature 4: Transactional Templates Interpolation & Sanitization (5 tests)
- `T1.4.1`: Template registry contains all 6 core commerce templates (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`) and required variable schemas.
- `T1.4.2`: Strict `{{variable}}` interpolation correctly renders order ID, customer name, amounts, and dates in subject and body.
- `T1.4.3`: Template sanitization escapes malicious HTML and script payloads (`<script>`, `onerror=`, `javascript:`) preventing XSS.
- `T1.4.4`: Missing required variables validation rejects rendering and throws descriptive validation error.
- `T1.4.5`: Template engine supports custom merchant overrides for subject and body with fallback to system defaults.

#### Feature 5: AI Email Tools (6 tests)
- `T1.5.1`: `get_email_settings` tool retrieves active provider, active domains, default sender alias, reply-to, and daily quota.
- `T1.5.2`: `update_email_sender` tool modifies sender alias display name and default identity on verified domains.
- `T1.5.3`: `update_reply_to` tool validates email syntax and updates merchant customer reply routing.
- `T1.5.4`: `list_email_templates` tool lists registered transactional templates, descriptions, and allowed variable tags.
- `T1.5.5`: `update_email_template` tool updates template subject/body with variable schema validation, snapshot history, and 1-click undo.
- `T1.5.6`: `send_test_email` tool validates recipient address and requires explicit confirmation for sensitive test dispatch.

#### Feature 6: Delivery Activity Log (5 tests)
- `T1.6.1`: `POST /api/email/send` records immutable delivery events in `email_events` with timestamp, recipient, provider, and status.
- `T1.6.2`: `GET /api/email/events` returns chronological delivery events strictly scoped to authenticated organization.
- `T1.6.3`: Delivery audit log redacts email bodies and secrets, storing only delivery metadata and recipient.
- `T1.6.4`: Delivery log tracks status transitions (`ACCEPTED`, `QUEUED`, `SENT`, `DELIVERED`, `FAILED`).
- `T1.6.5`: Unverified custom domain fallback records `DOMAIN_FALLBACK_APPLIED` event in audit trail.

---

### Tier 2: Boundary & Corner Cases (25 Tests)

#### Area 1: Empty / Malformed Variables (5 tests)
- `T2.1.1`: Null or undefined variable values in template data are caught by schema validation.
- `T2.1.2`: Empty string or whitespace-only values for required variables are rejected.
- `T2.1.3`: Nested object or array injection into scalar string placeholders is safely escaped.
- `T2.1.4`: Multilingual unicode characters (Hindi Devanagari, emoji, symbols) render intact without encoding corruption.
- `T2.1.5`: Extra unregistered template variables are ignored or rejected without breaking rendering.

#### Area 2: CRLF Header Injection (5 tests)
- `T2.2.1`: Email Subject containing `\r\nBcc: evil@attacker.com` is intercepted and rejected with header injection error.
- `T2.2.2`: Display name containing CRLF sequences (`Kirana Store\r\nSender: forged@ferasetu.com`) is sanitized or rejected.
- `T2.2.3`: `replyTo` header containing CRLF characters is rejected before MIME compilation.
- `T2.2.4`: Obfuscated URL-encoded CRLF (`%0d%0a`, `%0D%0A`) in recipient addresses is rejected.
- `T2.2.5`: Custom headers containing embedded newline characters are stripped or rejected.

#### Area 3: Max Domain Length & RFC 1035 Boundaries (5 tests)
- `T2.3.1`: Total domain length exceeding RFC 1035 limit (253 characters) is rejected with 422 error.
- `T2.3.2`: Individual DNS label exceeding RFC 1035 limit (63 characters) is rejected.
- `T2.3.3`: Domain labels with leading or trailing hyphens (`-myshop-.com`) are rejected.
- `T2.3.4`: Domain containing invalid characters (spaces, exclamation marks, control codes) is rejected.
- `T2.3.5`: Platform domain spoofing (`ferasetu.com`, `admin.ferasetu.com`, `mail.ferasetu.com`) is rejected as custom domain.

#### Area 4: Invalid SPF / DKIM Formats (5 tests)
- `T2.4.1`: Malformed SPF record without `v=spf1` prefix is marked as FAILED in verification.
- `T2.4.2`: Malformed DKIM record with invalid RSA public key base64 or missing selector is marked as FAILED.
- `T2.4.3`: Malformed DMARC record without `v=DMARC1` or invalid `p=` policy is marked as FAILED.
- `T2.4.4`: DNS DoH timeout or NXDOMAIN response is handled gracefully without unhandled promise rejection.
- `T2.4.5`: Mismatched ownership challenge token prevents domain verification.

#### Area 5: Zero / Negative Pricing Tampering (5 tests)
- `T2.5.1`: Domain purchase initiation with zero amount (`amount: 0`) is rejected by server pricing validator.
- `T2.5.2`: Domain purchase initiation with negative amount (`amount: -799`) is rejected with 400 error.
- `T2.5.3`: Client discount tampering attempting to purchase a domain below server authoritative price is rejected.
- `T2.5.4`: Fractional or non-integer registration years (0 years, 1.5 years) are rejected.
- `T2.5.5`: Registration duration exceeding maximum limit (11+ years) is rejected.

---

### Tier 3: Cross-Feature Combinations (11 Tests)

#### Combination 1: Domain Purchase + DNS Verification + Sender Identity (3 tests)
- `T3.1.1`: Domain purchase flow -> domain provisioned as PENDING -> DoH verification passes -> auto-creates `orders@{domain}` identity.
- `T3.1.2`: Attempting to create sender identity on purchased domain BEFORE DNS verification succeeds is blocked with 400.
- `T3.1.3`: DNS verification status revocation immediately prevents outbound email dispatch from custom sender identity.

#### Combination 2: Template Edit + AI Assistant Update + Test Dispatch (3 tests)
- `T3.2.1`: Custom template created -> AI Assistant updates subject -> merchant confirms -> test dispatch uses AI-updated template.
- `T3.2.2`: AI Assistant attempts invalid variable modification -> schema validation blocks change -> template remains intact.
- `T3.2.3`: AI Assistant modifies template -> merchant executes 1-click undo -> previous state restored -> test send verifies rollback.

#### Combination 3: Tenant Isolation Cross-Tenant Checks (5 tests)
- `T3.3.1`: Tenant A cannot access, verify, or delete Tenant B's registered custom domains (HTTP 404/403).
- `T3.3.2`: Tenant A cannot dispatch emails using Tenant B's verified sender identity or domain (spoofing blocked).
- `T3.3.3`: Tenant A cannot view or modify Tenant B's custom email templates.
- `T3.3.4`: Tenant A cannot read Tenant B's delivery activity logs.
- `T3.3.5`: Tenant B cannot register or purchase a custom domain already registered by Tenant A (HTTP 409 collision).

---

### Tier 4: Real-World Workload Scenarios (4 Scenarios)

#### Scenario 4.1: Complete Merchant Lifecycle
- **Merchant:** Pune Bazaar (`org_4`, plan `pro`).
- **Flow:**
  1. Onboarding with zero configuration: FeraSetu Mail `orders@kirana-pune-4.ferasetu.com` active.
  2. Searches domain `punebazaar.in` -> authoritative price ₹799 + 18% GST (₹942.82) validated.
  3. Cashfree payment succeeds -> domain provisioned in `email_domains` in PENDING state.
  4. 5 DNS records configured -> DoH verification passes -> domain transitions to VERIFIED.
  5. `orders@punebazaar.in` created and configured as default sender.
  6. AI Assistant customizes `ORDER_CONFIRMATION` template in Marathi/English.
  7. Outbound test email dispatched using verified custom domain.
  8. Delivery log inspects and confirms immutable event audit entry.

#### Scenario 4.2: High-Volume Daily Quota Exhaustion & Recovery
- **Merchant:** General Delhi (`org_2`, plan `free`, daily limit 100).
- **Flow:**
  1. 100 emails sent today.
  2. 101st email send rejected with `Daily email quota exhausted`.
  3. Extra quota purchased (500 balance credited).
  4. Dispatch immediately succeeds without server restart.

#### Scenario 4.3: External SMTP Relay Encryption & Zero Secret Exposure
- **Merchant:** Kirana Mumbai (`org_1`).
- **Flow:**
  1. Configures external SMTP relay (`smtp.sendgrid.net`).
  2. Stored credential encrypted at rest via AES-256-GCM (`enc:v1:` format).
  3. Client API `GET /api/email/settings` returns `has_password: true`, redacting plaintext password.
  4. Decryption roundtrip verifies exact password retrieval for background socket dispatch.

#### Scenario 4.4: Destructive Action Protection & Operational Continuity
- **Merchant:** Kirana Mumbai (`org_1`).
- **Flow:**
  1. Destructive deletion of default managed FeraSetu domain is blocked with HTTP 400.
  2. Destructive deletion of default sender identity is blocked with HTTP 400.
  3. Core email dispatching continues without disruption, guaranteeing operational continuity.

---

## 5. Test Integrity Declaration

In accordance with platform testing standards:
1. **Zero Facade Tests:** Every test sets up authentic payloads, invokes cryptographic operations or route handlers, and asserts real behavioral invariants.
2. **Opaque-Box Philosophy:** Tests interact through public API contracts, HTTP request/response envelopes, and documented service interfaces without private property tampering.
3. **Progressive Testability:** The suite is fully executable and self-contained; when workers complete subsequent milestones (M1–M5), the test suite automatically verifies live service modules without test refactoring.
4. **Adversarial Hardening:** Includes explicit attack vectors for CRLF header injection, XSS template exploitation, IDOR tenant crossing, and Cashfree price tampering.

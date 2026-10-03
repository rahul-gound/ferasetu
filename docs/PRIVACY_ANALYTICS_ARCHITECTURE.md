# FeraSetu — Privacy-First Analytics & Consent Architecture

> **Philosophy**: *"Measure behavior, don't manufacture identities."*

---

## 1. Executive Summary & Core Principles

FeraSetu's production analytics and consent engine provides conversion and product behavior telemetry without compromising customer trust or violating global privacy regulations (GDPR, CCPA, CPRA, India DPDP Act).

### Non-Negotiable Guarantees:
1. **First-Party by Default**: All analytics traffic routes directly through FeraSetu's Cloudflare Worker (`/api/analytics/events`) and stores data in encrypted Cloudflare D1 SQL storage.
2. **Zero Cross-Site Tracking**: No persistent third-party cookies, fingerprinting algorithms (canvas/WebGL/audio), or cross-domain identifier syndication.
3. **Strict Data Minimization**: Geographic resolution stops at coarse country and region codes (`IN`, `US`, `GB`). IP addresses, cities, zip codes, and precise coordinates are immediately discarded at the edge.
4. **Authoritative Server-Side Tenant Isolation**: Tenant identity (`tenant_id`, `organization_id`) is resolved authoritatively on the server via verified JWT authentication or verified storefront subdomain mapping. Client-supplied tenant IDs are **never** trusted blindly, completely preventing IDOR and telemetry poisoning.
5. **No Invasive Tracking or Session Replay**: No keystroke logging, form field recording, or screen capture session replay plugins.
6. **Strict Sanitization**: Telemetry payloads are stripped of credentials, auth tokens, passwords, credit card numbers, emails, phone numbers, and sensitive URL query parameters before persistence.

---

## 2. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client ["Client Browser / Storefront"]
        A[User Action / Navigation] --> B{Consent Manager}
        B -- "Consent Revoked / Unset" --> C[Drop Analytics Events]
        B -- "Essential Only" --> C
        B -- "Analytics Consent Granted" --> D[First-Party Analytics Tracker]
        D --> E[Local Redaction & Coarsening]
        E --> F[In-Memory Dispatch Queue]
        F -- "POST /api/analytics/events (Batch / Beacon)" --> G[Cloudflare Edge Worker]
    end

    subgraph Edge ["Cloudflare Worker Security Edge"]
        G --> H[Rate Limiter (120 req/min/IP)]
        H --> I[Payload Size Guard (<= 64KB)]
        I --> J[Authoritative Tenant Resolver]
        J --> K[Taxonomy & PII Sanitizer]
        K --> L[Batch D1 Prepared Statements]
    end

    subgraph Storage ["Cloudflare D1 Storage"]
        L --> M[(analytics_events Raw Table)]
        N[Cloudflare Cron Worker] -- "Daily Midnight UTC" --> O[runDailyAggregation]
        O --> P[(analytics_aggregates_daily Table)]
        N -- "Automated Retention Pruner" --> Q[pruneRawEvents (30-day window)]
        Q --> M
    end

    subgraph Admin ["Super Admin Portal"]
        R[Admin User] --> S[GET /api/admin/analytics]
        S --> T[Funnel & Behavioral Aggregates UI]
    end
```

---

## 3. Consent Management Model

### Categories
| Category | Purpose | Default State | User Revocable |
| :--- | :--- | :--- | :--- |
| **`essential`** | Security, anti-fraud, session continuity, cart preservation | **`true`** | No (strictly required) |
| **`analytics`** | Aggregated first-party page views, funnel metrics, error rates | **`false`** | Yes |
| **`marketing`** | Attribution campaigns, promotional banners | **`false`** | Yes |

### Consent Lifecycle & Auto-Eviction
1. **Initial Visit**: Consent banner appears. No non-essential cookies or identifiers are written.
2. **Accept All**: Sets `essential: true`, `analytics: true`, `marketing: true`. Emits cryptographically random UUIDv4 `visitor_id` and ephemeral 30-minute rolling `session_id`.
3. **Reject Non-Essential**: Sets `analytics: false`, `marketing: false`.
4. **Revocation / Rejection**: When consent is updated to reject `analytics`:
   - `clearAnalyticsStorage()` immediately evicts `fera_visitor_id`, `fera_session_id`, and `fera_session_last_active` from `localStorage` and `sessionStorage`.
   - All pending events in the dispatch queue are immediately purged without sending.
5. **Policy Versioning**: Consent is versioned (currently `2026-10-01`). If the policy version increments, the consent modal re-prompts visitors automatically.

---

## 4. Event Taxonomy & Data Minimization

Only explicit, allowlisted events conform to the schema. Any unrecognized event name or oversized payload is rejected.

### Approved Event Whitelist (`schema_version = 1`)
* **`page_view`**: Navigation to public or merchant portal routes.
* **`session_start`**: Beginning of a browsing session.
* **`section_view`**: Viewport intersection of key page sections (Hero, Features, Pricing, Proof).
* **`cta_click`**: Interaction with prominent action triggers (e.g., "Start Free Trial", "Claim Shop").
* **`pricing_view`**: Visitor rendered the pricing selection table.
* **`pricing_plan_select`**: User chose a tier (Free, Starter, Pro, Business).
* **`signup_start`**: User engaged with registration or WorkOS auth flow.
* **`trial_start`**: Merchant began a plan trial.
* **`shop_visit`**: Public customer visited a merchant storefront.
* **`product_view`**: Customer inspected a product card or details drawer.
* **`cart_add`**: Item added to cart (`product_id`, `item_count`).
* **`checkout_start`**: Customer initiated order flow (`item_count`).
* **`order_complete`**: Transaction finalized (`item_count`, `payment_method`, `total_amount` coarsened to whole currency units). **`order_id` is strictly forbidden and rejected to prevent shadow order databases.**
* **`error`**: Sanitized client-side runtime exception (`error_name`, `error_type`, `status_code`, `path`).
* **`page_exit`**: Page unload or visibility change (dispatched via `navigator.sendBeacon`).

### Forbidden Keys & Property Redaction
Any event property matching the following patterns (case-insensitive) is automatically scrubbed and replaced with `[REDACTED]`:
* Order & Transaction IDs: `order_id`, `order` (Prevents tracking business order keys in analytics)
* Identity & Tenant Forgery: `tenant_id`, `organization_id`, `user_id`, `ip`, `ip_address`
* Credentials & Secrets: `password`, `token`, `secret`, `authorization`, `cookie`, `jwt`, `api_key`, `access_token`
* Financials: `card`, `cvv`, `pan`, `account_number`, `routing_number`, `pin`
* PII: `email`, `phone`, `mobile`, `ssn`, `aadhaar`, `national_id`, `birthdate`, `address`
* Invasive inputs: `keystroke`, `input_value`, `screen_recording`, `dom_snapshot`

### URL Query Sanitization
All incoming URLs, paths, and referrers have tracking parameters and auth tokens stripped:
`token`, `access_token`, `refresh_token`, `auth`, `authorization`, `code`, `session`, `jwt`, `key`, `secret`, `api_key`, `apikey`, `password`, `pwd`, `email`, `phone`, `sig`, `signature`, `user_id`, `order_id`, `fbclid`, `gclid`.

---

## 5. Database Schema & Retention Policy

### Raw Telemetry Table: `analytics_events`
Stores ephemeral raw events for rolling 30 days:
```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  organization_id TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'platform',
  visitor_id TEXT,
  session_id TEXT,
  event_name TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  properties TEXT,
  country TEXT,
  device_category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Daily Aggregates Table: `analytics_aggregates_daily`
Stores permanent, non-identifying aggregated metrics:
```sql
CREATE TABLE IF NOT EXISTS analytics_aggregates_daily (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  metric_name TEXT NOT NULL,
  dimension TEXT NOT NULL DEFAULT 'all',
  count INTEGER NOT NULL DEFAULT 0,
  value REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Automated Maintenance & Pruning
- **Scheduled Trigger**: Cloudflare Cron worker runs midnight UTC (`0 0 * * *`).
- **Aggregation**: Executes `runDailyAggregation(env.DB)` to summarize past 24 hours of events into `analytics_aggregates_daily`.
- **Retention Pruning**: Executes `pruneRawEvents(env.DB, 30)` to permanently delete raw rows older than 30 days.

---

## 6. Tenant Isolation & Security Controls

1. **Server-Side Authoritative Resolution**:
   - Authenticated requests resolve `tenant_id` from verified WorkOS JWT claims (`user.organizationId` or `user.$id`).
   - Storefront requests resolve `tenant_id` by matching the Host header against the database of validated merchant subdomains / custom domains.
   - Platform marketing and public routes resolve to `platform`.
   - **Any client attempt to supply or spoof `organization_id` or `tenant_id` is discarded.**
2. **Abuse Mitigation**:
   - **Rate Limiting**: Sliding window rate limits client IPs to 120 events / minute.
   - **Payload Limits**: Max body size is 64KB; max batch size is 20 events.
   - **Safe Error Telemetry**: Errors logged via `errorTelemetry.ts` automatically redact stack trace file paths and query parameters, and scrub tokens/PII.

---

## 7. Developer Rules & Best Practices

> [!CAUTION]
> **DEVELOPER RULE #1**:
> **Never add an analytics event containing PII, credentials, payment data, secrets, or arbitrary user input without explicit security/privacy review.**

### Mandatory Guidelines for Engineers:
* Always use `trackEvent()` from `src/lib/analytics/tracker.ts`.
* Never bypass the consent context.
* Never send free-form user input (such as search queries, customer support messages, or text input values) in event `properties`.
* Never record raw URLs containing search query parameters without passing them through `sanitizeUrlOrPath()`.
* If a new feature requires custom telemetry, add the event name to `ALLOWED_EVENT_NAMES` in `worker/analytics/taxonomy.js` after privacy architecture review.

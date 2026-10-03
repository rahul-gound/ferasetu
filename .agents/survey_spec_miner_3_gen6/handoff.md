# Handoff Report: Specification Mining for Domains & Email Dashboard, AI Tools, and Verification Test Suites

**Author**: `survey_spec_miner_3_gen6`  
**Working Directory**: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\survey_spec_miner_3_gen6`  
**Parent Orchestrator**: `orchestrator_gen6` (`030ef1f7-ee1c-42c9-b5b4-a88328a36303`)  
**Timestamp**: 2026-10-01T12:20:00Z  
**Authoritative References**: `ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z, Requirements R2, R3, R4, Verification Resources), `PROJECT.md`.

---

## 1. Observation

Direct code and file observations across the repository:

1. **Frontend Navigation & Routing**:
   - `frontend/src/components/Layout.tsx` (lines 121–126):
     ```tsx
     {
       groupLabel: 'SETTINGS',
       items: [
         { path: '/settings/email', icon: <Mail size={17} />, label: 'Email Settings' },
       ],
     }
     ```
   - `frontend/src/App.tsx` (line 43 & 181):
     ```tsx
     const EmailSettingsPage = lazy(() => import('./pages/EmailSettingsPage'));
     ...
     <Route path="/settings/email" element={<EmailSettingsPage />} />
     ```
   - `frontend/tests/route-stress.test.ts` (lines 42 & 49):
     Verifies that `/settings/email` exists in `App.tsx`. Any navigation change must keep `/settings/email` working to prevent breaking existing route stress tests.

2. **Current `EmailSettingsPage.tsx` Architecture**:
   - Total lines: 883 (`frontend/src/pages/EmailSettingsPage.tsx`).
   - **No Tab Navigation**: The page is currently a single-page view with top-to-bottom sections:
     - Section 1 (lines 287–380): "Delivery Infrastructure Provider" selector cards ("FeraSetu Email" vs "My own SMTP").
     - Section 2 (lines 382–476): "Sender Identity" (shows FeraSetu Domain `orders@{ferasetuDomain}` vs Custom Domain `orders@{customDomain}`).
     - Section 3 (lines 480–594): "External SMTP Configuration Form" (only shown when `activeProvider === 'EXTERNAL_SMTP'`).
     - Section 4 (lines 596–651): "Recent Delivery Activity" table.
   - **Missing Capabilities**:
     - No **Domains Tab** vs **Email Tab** layout.
     - No **Domain Search / Domain Purchasing** (via `DomainProvider` + Cashfree).
     - No **Dual Connection State** (Storefront connected vs Email connected).
     - No **Template Catalog / Editor** (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`).
     - No **Live Template Preview** with mock sample data.
     - No **AI Email Assistant Tools** interface or execution card.
     - No **Configurable Merchant Reply-To routing** input with verification state.
     - Sender aliases are not configurable beyond a single `orders@` address.

3. **Design Tokens & System**:
   - `frontend/tailwind.config.js`:
     `primary: "#0052FF"`, `secondary: "#4D7CFF"`.
   - `frontend/src/index.css` (lines 5–25):
     `--primary: #0052FF`, `--secondary: #4D7CFF`, `--surface: #FFFFFF`, `--border: #E2E8F0`, `--text: #0F172A`, `--text-muted: #64748B`, `--radius: 16px`.
   - Accent Orange: `#FF6B35` / `#FF6B00` (used throughout buttons, spinners, and badges).
   - Typography: `Inter`, system-ui, sans-serif, with low-radius corners (`rounded-lg`, `rounded-xl`, `rounded-2xl`).

4. **Worker Production Email Endpoints**:
   - `worker/index.js` (lines 9565–9578):
     ```javascript
     // Production Email Architecture Endpoints
     if (path.startsWith("/api/email")) {
       return handleEmailRoutes(request, env);
     }
     // Legacy SMTP Settings (raw)
     if (path === "/api/settings/smtp") { ... }
     ```
   - `worker/routes/emailRoutes.js` (616 lines):
     Provides:
     - `GET /api/email/settings`: returns `activeProvider`, `defaultIdentity`, `ferasetuDomain`, `customDomain`, `externalConnection`, `quota`.
     - `GET /api/email/domains` & `POST /api/email/domains`: domain registration and DNS instructions.
     - `POST /api/email/domains/:id/verify`: triggers DoH DNS verification.
     - `DELETE /api/email/domains/:id`: removes custom domain.
     - `GET /api/email/identities` & `POST /api/email/identities`: sender identities.
     - `PATCH /api/email/identities/:id`: set default or display name.
     - `DELETE /api/email/identities/:id`: remove identity.
     - `GET /api/email/provider`, `POST /api/email/provider/ferasetu`, `POST /api/email/provider/external`, `DELETE /api/email/provider/external`.
     - `POST /api/email/send`: unified internal dispatch.
     - `POST /api/email/test`: test transactional dispatch.
     - `GET /api/email/events`: audit log of recent deliveries.

5. **Templates & Variable Engine**:
   - `worker/templates/emailTemplates.js` (791 lines):
     - In-memory `EMAIL_TEMPLATES` registry with 17 template keys.
     - Variable validation function: `validateTemplateVariables(templateKey, data)`.
     - HTML Layout wrapper: `wrapHtmlLayout({ title, brandName, brandColor, logoUrl, storeUrl, supportEmail, contentHtml, isPlatform })`.
     - Sanitization: `escapeHtml()` prevents XSS injection.

6. **AI Assistant Architecture**:
   - `frontend/src/pages/FeraSetuAIPage.tsx` (lines 580–640):
     - Uses `api.post('/v1/ai/chat')`.
     - Data model includes: `content`, `model`, `skillsUsed`, `hasProposedActions`, `proposedActions: ProposedAction[]`.
     - Proposed actions support `riskLevel` (`read_only` | `reversible_write` | `sensitive`), `preview`, `requiresApproval`, and Confirm/Cancel buttons.
   - `worker/index.js` (lines 2794–2795):
     - Currently hardcodes `hasProposedActions: false`, `proposedActions: []`.
   - `worker/ai/proBuilderActions.js`:
     - Pattern for translating natural language into atomic, structured operations with risk ratings and parameters.

7. **Test Suites Inventory**:
   - Test Runner in Root: `node --test` (via `package.json`: `"test": "node --test tests/*.test.mjs"`).
   - Test Runner in Frontend: `node --experimental-loader ./tests/ts-extension-loader.mjs --experimental-strip-types --test tests/*.test.ts` (via `frontend/package.json`).
   - Test Files Inspected:
     - `tests/production-email-architecture.test.mjs` (763 lines, 9 test suites)
     - `tests/production-email-integration.test.mjs` (813 lines, 15 scenarios A-O)
     - `tests/cashfree-payment-verification.test.mjs` (1253 lines, 9 suites)
     - `tests/production-hardening-p0.test.mjs` (673 lines, 8 specifications)
     - `frontend/tests/auth-loop.test.ts` (90 lines)
     - `frontend/tests/cashfree.test.ts` (85 lines)
     - `frontend/tests/localization.test.ts` (109 lines)
     - `frontend/tests/route-stress.test.ts` (174 lines)

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Navigation | Unified "Domains & Email" Page | Replaces raw "Email Settings" with a two-tab dashboard ("Domains" & "Email") while maintaining route `/settings/email` and aliasing `/settings/domains` | URL route, tab query param (`?tab=domains` or `?tab=email`) | Rendered high-trust UI shell | Fallback to Email tab if tab param invalid | `Layout.tsx`, `App.tsx`, `route-stress.test.ts`, `ORIGINAL_REQUEST.md` §R2 |
| 2 | Domains UX | Active Domains List | Displays all registered domains: FeraSetu managed subdomain, custom external domains, and purchased domains | Organization ID from auth context | Domain cards with badges, verification status, and connection states | Shows loading skeleton or empty state | `EmailSettingsPage.tsx`, `emailRoutes.js` |
| 3 | Domains UX | Storefront & Email Connection Badges | Visual indicator showing dual connection state: Storefront (Connected / Pending) and Email (DKIM/SPF Verified / Pending) | Domain record properties | Dual status pills (Emerald / Amber / Slate) | Defaults to pending if unverified | `ORIGINAL_REQUEST.md` §R2 |
| 4 | Domains UX | Connect Custom Domain Drawer/Modal | Merchant inputs existing domain, receives 5 DNS records (TXT challenge, TXT DKIM, TXT SPF, TXT DMARC, CNAME mail) with 1-click copy buttons | `{ domain: string }` | Domain record + DNS instructions list | 422 if invalid syntax, 409 if already claimed | `EmailSettingsPage.tsx`, `emailRoutes.js`, `dnsVerification.js` |
| 5 | Domains UX | Live DNS Re-check Action | Merchant triggers on-demand DNS propagation check via Cloudflare DoH | Domain ID | Updated verification status for ownership, DKIM, SPF, DMARC | Toast alert if DNS still propagating | `EmailSettingsPage.tsx`, `dnsVerification.js` |
| 6 | Domains UX | Domain Search & Real Availability | Search domain availability through `DomainProvider` abstraction | Query string (e.g. `myshop.in`) | Availability status, authoritative pricing in INR, currency | 400 for invalid query or provider timeout | `ORIGINAL_REQUEST.md` §R3 |
| 7 | Domains UX | In-App Domain Purchase via Cashfree | Purchase domain directly using Cashfree checkout with server-side price validation | `{ domain: string, years: number }` | Cashfree payment session ID, order ID | 400 if price mismatch or domain unavailable | `ORIGINAL_REQUEST.md` §R3, `cashfree-payment-verification.test.mjs` |
| 8 | Email UX | Zero-Config FeraSetu Mail Default | Merchant accounts immediately get `orders@{store-slug}.ferasetu.com` with zero SMTP configuration | Store slug and organization context | Active default identity and verified domain | Auto-provisions on first visit if missing | `emailRoutes.js` (`ensureMerchantEmailProvisioning`), `ORIGINAL_REQUEST.md` §R2 |
| 9 | Email UX | Sender Aliases Manager | Configure official aliases (`orders@`, `support@`, `billing@`, custom local parts) with default selector | `{ local_part: string, display_name: string }` | Created `email_identities` record | 422 for invalid local-part syntax, 409 if duplicate | `emailRoutes.js` (`/api/email/identities`) |
| 10 | Email UX | Merchant Verified Reply-To Routing | Maps customer email replies directly to merchant's verified inbox while keeping outbound From DKIM/SPF aligned | `{ reply_to_email: string }` | Updated Reply-To config with verification state | 422 for invalid email address | `ORIGINAL_REQUEST.md` §R2, `emailService.js` |
| 11 | Email UX | Expandable Advanced SMTP Relay | Collapsed accordion for external SMTP providers (Gmail, SES, SendGrid, Brevo) with AES-256-GCM encryption | `{ smtp_host, smtp_port, smtp_username, smtp_password, security_mode }` | Saved connection reference with encrypted password | Handshake test failure rejects save with 400 | `EmailSettingsPage.tsx`, `emailRoutes.js`, `externalSmtpClient.js` |
| 12 | Templates | Transactional Template Catalog | Predefined templates for 6 core commerce events (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`) | Template key | Registered schema, required variables, default subject and body | 404 for unknown template key | `worker/templates/emailTemplates.js`, `ORIGINAL_REQUEST.md` §R4 |
| 13 | Templates | Variable Registry & Strict Sanitization | `{{variable}}` interpolation engine enforcing allowed variable schema and escaping HTML against XSS | Template key + data payload | Rendered subject, HTML, plain text | Rejects with 422 if required variables missing | `emailTemplates.js` (`validateTemplateVariables`, `escapeHtml`) |
| 14 | Templates | Merchant Template Editor | UI to customize email subject and content per template with variable tags | `{ templateKey, subject, contentHtml, contentText }` | Updated template record with version number | Rejects invalid variable tags | `ORIGINAL_REQUEST.md` §R4 |
| 15 | Templates | Real-Time Live Preview Pane | Dynamic preview pane rendering template HTML with realistic sample data and desktop/mobile switch | Current template draft + mock data | Rendered sanitized HTML iframe/container | Displays fallback if syntax error | `ORIGINAL_REQUEST.md` §R4 |
| 16 | Templates | "Send Test Email" Action | Dispatches live sample transactional email to merchant's address via configured provider | `{ to: string, templateKey?: string }` | Dispatched message result and delivery event | 422 for invalid recipient, 500 on gateway error | `EmailSettingsPage.tsx`, `emailRoutes.js` (`/api/email/test`) |
| 17 | AI Assistant | `get_email_settings` Tool | AI assistant inspects current active provider, domains, sender aliases, Reply-To, and quota | None (tenant context) | Formatted email settings summary | 401 if unauthenticated | `ORIGINAL_REQUEST.md` §R4 |
| 18 | AI Assistant | `update_email_sender` Tool | AI assistant updates default sender alias or display name | `{ identityId?, localPart?, displayName? }` | Updated identity summary | Rejects unverified domain alias | `ORIGINAL_REQUEST.md` §R4 |
| 19 | AI Assistant | `update_reply_to` Tool | AI assistant updates merchant Reply-To address | `{ replyToEmail: string }` | Confirmation of new Reply-To destination | 422 if invalid email format | `ORIGINAL_REQUEST.md` §R4 |
| 20 | AI Assistant | `list_email_templates` Tool | AI assistant lists registered transactional templates and their variables | None | Template keys, subjects, and editable fields | None | `ORIGINAL_REQUEST.md` §R4 |
| 21 | AI Assistant | `update_email_template` Tool | AI assistant modifies subject or body of a template with version tracking | `{ templateKey, subject?, contentHtml? }` | Updated template diff and version | Rejects unauthorized variables | `ORIGINAL_REQUEST.md` §R4 |
| 22 | AI Assistant | `send_test_email` Tool | AI assistant triggers test email dispatch to merchant | `{ to: string, templateKey?: string }` | Dispatch confirmation and message ID | Requires user confirmation | `ORIGINAL_REQUEST.md` §R4 |
| 23 | AI Assistant | Action Approval Cards & Undo | Structured cards for sensitive actions (provider switch, sender change) requiring explicit Confirm/Cancel and snapshot undo | Action ID, confirmation flag | Executed action or rollback to previous snapshot | 400 if history snapshot not found | `FeraSetuAIPage.tsx`, `proBuilderActions.js`, `ORIGINAL_REQUEST.md` §R4 |
| 24 | Delivery Logs | Delivery Activity Audit Table | Renders immutable log: recipient, template, sender, provider, timestamp, status | None (tenant context) | Table of last 50 events without leaking email body PII | Empty state when no emails dispatched | `EmailSettingsPage.tsx`, `emailRoutes.js` (`/api/email/events`) |
| 25 | Verification | Multi-Tenant Cross-Access Block | Prevents Tenant A from viewing, modifying, or sending emails from Tenant B's domains or templates | Request tokens with different `org_id` | HTTP 403 / 404 forbidden | Blocks cross-tenant mutation | `production-email-architecture.test.mjs`, `production-email-integration.test.mjs` |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Domain Normalization | `  https://WWW.My-Shop.COM/store/path?ref=123/  ` | Sanitizes cleanly to `my-shop.com`, strips protocol, path, query, and trailing slash (`normalizeDomain` in `dnsVerification.js`). |
| 2 | Platform Domain Spoofing | Attempt to register `ferasetu.com` or `shop.ferasetu.com` as custom domain | Rejects immediately with error: `Custom domain cannot be a subdomain of ferasetu.com`. |
| 3 | Domain Already Claimed | Tenant B attempts to connect `example.com` already registered by Tenant A | Rejects with HTTP 409: `This domain is already registered by another organization.` |
| 4 | Sender Identity on Unverified Domain | Merchant tries to create `support@custom.com` before DNS verification succeeds | Rejects with HTTP 400: `Cannot create sender identity for unverified domain.` |
| 5 | Default Identity Deletion | Merchant attempts to delete the identity marked `is_default = 1` | Rejects with HTTP 400: `Cannot delete default sender identity. Set another default first.` |
| 6 | Deleting Managed Domain | Merchant calls `DELETE /api/email/domains/:id` on `FERASETU_MERCHANT` domain | Rejects with HTTP 400: `Cannot delete default managed domain.` |
| 7 | CRLF Header Injection | Subject contains `Order Notice\r\nBcc: evil@hacker.com` | `EmailService.sanitizeHeaderValue` detects `\r` or `\n` and throws error `Header injection detected`. |
| 8 | Cross-Tenant Sender Spoofing | Tenant A sends email specifying `from: orders@tenant-b.ferasetu.com` | Rejects with HTTP 403/400: `No authorized email identity found for this sender address in your organization.` |
| 9 | Quota Exhaustion | Merchant on Free plan sends 101st email when daily limit is 100 | Rejects with error `Daily email quota exhausted. Upgrade your plan or purchase extra email quota.` |
| 10 | Platform vs Merchant Quota | System sends platform email (`account.verify_email` OTP) | Platform emails use `organizationId = null`, decrement zero merchant quotas, and are isolated from tenant limits. |
| 11 | Duplicate Event (Idempotency) | Same `idempotencyKey` submitted twice for same tenant | Second dispatch detects existing key, skips re-sending via SMTP gateway, and returns `{ success: true, duplicate: true, messageId }`. |
| 12 | Same Idempotency Key Across Different Tenants | Tenant A and Tenant B both send order confirmation with key `order_txn_1001` | Handled independently without collision because unique index in D1 is compound `(COALESCE(merchant_id, 'PLATFORM'), idempotency_key)`. |
| 13 | Temporary SMTP Server Error (5xx) | SMTP relay returns HTTP 500 / 503 | `EmailService` catches error, records message status as `FAILED` in `email_messages`, and returns `{ success: false, status: 'FAILED' }` without crashing the Worker. |
| 14 | Unreachable Domain (422) | SMTP relay returns 422 for non-existent domain | Status recorded as `FAILED`, and event recorded in `email_events` with provider error code. |
| 15 | External SMTP Secret Redaction | Client calls `GET /api/email/settings` or `GET /api/email/provider` | Server returns `has_password: true`, but never includes plaintext password or encrypted secret reference. |
| 16 | AI Assistant High-Risk Action | Merchant asks AI to "Switch to my own SMTP" or "Delete custom domain" | AI generates proposed action with `riskLevel: 'sensitive'` and `requiresApproval: true`, triggering confirmation card with diff before executing. |
| 17 | Unknown Template Variables | Client passes `{{unregistered_variable}}` in custom template | Template engine validates against variable whitelist and throws `MISSING_TEMPLATE_VARIABLES` or `UNKNOWN_VARIABLE`. |
| 18 | HTML / Script Injection in Template Data | Customer name is `<script>alert('xss')</script>John` | Render engine passes all variables through `escapeHtml()`, rendering `&lt;script&gt;alert('xss')&lt;/script&gt;John`. |

---

## 4. UI/UX Specification: "Domains & Email" Dashboard

### 4.1 Navigation & Route Architecture
- **Sidebar Navigation** (`frontend/src/components/Layout.tsx`):
  - Rename item in `SETTINGS` group:
    - Path: `/settings/email` (maintain exact path for test suite compatibility).
    - Label: `"Domains & Email"` (replaces raw `"Email Settings"`).
    - Icon: `<Globe size={17} />` or `<Mail size={17} />`.
- **Route Aliases** (`frontend/src/App.tsx`):
  - Primary Route: `<Route path="/settings/email" element={<EmailSettingsPage />} />`
  - Alias Route: `<Route path="/settings/domains" element={<Navigate to="/settings/email?tab=domains" replace />} />`
  - Alias Route: `<Route path="/domains-email" element={<Navigate to="/settings/email" replace />} />`
- **Tab State**:
  - Controlled by search param `?tab=domains` or `?tab=email`.
  - Default tab: `domains` if navigating from domain links, `email` if navigating from email alerts, or defaulting to `domains`.

### 4.2 Design Tokens & Styling
- Primary Brand Blue: `#0052FF`
- Secondary / Hover Blue: `#0042CC` / `#4D7CFF`
- Accent Orange: `#FF6B35` / `#FF6B00`
- Backgrounds: `#FFFFFF` (cards), `#FAFAFA` (page body), `#F8FAFC` (table headers / secondary panels)
- Borders: `#E2E8F0` / `#CBD5E1`
- Typography: `Inter`, system-ui, sans-serif
- Radius: `rounded-xl` (12px) for inputs/buttons, `rounded-2xl` (16px) for cards/modals
- Shadows: `shadow-sm` for cards, `shadow-xl` for modals

### 4.3 Layout Shell
- **Header**:
  - Title: "Domains & Email" with subtitle "Manage your storefront web addresses, branded email delivery, and customer communications."
  - Action Button: "Send Test Email" (triggers test modal).
- **Quota & Delivery Health Banner**:
  - Three-column summary:
    1. Delivery Status: Pulsing green dot, "Active & Protected".
    2. Daily Quota: Sent today vs Daily plan limit (e.g. 14 / 500 emails).
    3. Active Provider: "FeraSetu Mail (High Deliverability)".
- **Tabs Component**:
  - `[ Domains ]` (with active domain count badge)
  - `[ Email ]` (with default sender pill)

---

### 4.4 Tab 1: Domains Tab Specification

1. **Active Domains List**:
   - Card/Row 1: **FeraSetu Subdomain** (`{store-slug}.ferasetu.com`):
     - Badges: `Platform Default` (Blue), `Verified` (Green).
     - Dual Connection Indicators:
       - Storefront: `Connected` (Green check).
       - Email: `Active (orders@{store-slug}.ferasetu.com)` (Green check).
     - Action: "View Live Store" link.
   - Card/Row 2..N: **Custom Domains** (e.g. `yourstore.in`):
     - Badges: `Custom Domain`, Verification Status (`VERIFIED`, `PENDING`, `FAILED`).
     - Dual Connection Indicators:
       - Storefront: `Connected` or `DNS Pending`.
       - Email: `DKIM / SPF Verified` or `DNS Pending`.
     - Actions:
       - "Manage DNS & Instructions" (opens DNS modal).
       - "Check DNS Again" (polls DoH API).
       - "Remove" (destructive delete with confirmation).
   - Card/Row 3: **Purchased Domains** (via Provider):
     - Badge: `FeraSetu Managed DNS` (Automated via Cloudflare v4 API).

2. **Top Action Buttons**:
   - **"Connect Existing Domain"**:
     - Opens Connect Modal.
     - Input field for domain name (`example.com`).
     - Submitting registers domain and immediately displays 5 DNS records:
       1. `TXT _ferasetu-challenge.<domain>` = `fera-domain-verification=<token>`
       2. `TXT fs1._domainkey.<domain>` = `v=DKIM1; k=rsa; p=<pubkey>`
       3. `TXT <domain>` = `v=spf1 include:_spf.ferasetu.com ~all`
       4. `TXT _dmarc.<domain>` = `v=DMARC1; p=reject; rua=mailto:dmarc-reports@ferasetu.com; aspf=r; adkim=r`
       5. `CNAME mail.<domain>` = `mail.ferasetu.com`
     - Each record has Type, Name, Value, and a one-click Copy button with visual checkmark feedback.
     - "Check Again" button with spinning loader to verify DNS propagation.
   - **"Buy New Domain"**:
     - Search input: merchant types keyword (e.g. `rohankirana`).
     - Real-time search query to `DomainProvider` showing `.in`, `.com`, `.store`, `.co.in`.
     - Authoritative price display in INR (e.g. `₹799/yr`).
     - Clicking "Buy Now" triggers Cashfree checkout order with verified amount on backend.

---

### 4.5 Tab 2: Email Tab Specification

1. **FeraSetu Mail Card (Default & Recommended)**:
   - Primary card with `#0052FF` border and "Recommended" badge.
   - Address: `orders@{store-slug}.ferasetu.com`.
   - Explanatory copy: "Automatic SPF, DKIM, and DMARC alignment. Zero configuration required."
   - Status: Active pill.

2. **Sender Identity & Aliases**:
   - List of active identities:
     - `orders@{domain}` (Default for order confirmation & fulfillment notices).
     - `support@{domain}` (Customer tickets & support replies).
     - `billing@{domain}` (Invoices & tax receipts).
   - "+ Add Alias" button to create new local-part (`sales@`, `care@`, `hello@`).
   - "Set as Default" button for selecting the primary sender.

3. **Merchant Verified Reply-To Routing**:
   - Card: "Customer Reply-To Address".
   - Explains the deliverability model: outbound emails come from authenticated domain (`orders@{store-slug}.ferasetu.com`), but when a customer hits "Reply", replies route to the merchant's real email (`merchant@gmail.com`).
   - Input for `reply_to_email`.
   - Verification status badge (`Verified` / `Pending Verification`).
   - "Send Verification Code" / "Save Reply-To" button.

4. **Transactional Template Catalog & Live Preview**:
   - Grid or tabs for 6 transactional templates:
     1. `Order Confirmation` (`ORDER_CONFIRMATION`)
     2. `Order Shipped` (`ORDER_SHIPPED`)
     3. `Order Delivered` (`ORDER_DELIVERED`)
     4. `Payment Failed` (`PAYMENT_FAILED`)
     5. `Tax Invoice` (`INVOICE`)
     6. `Refund Issued` (`REFUND_ISSUED`)
   - **Template Editor**:
     - Subject editor with variable pills (`{{order_id}}`, `{{customer_name}}`, `{{total}}`).
     - Body editor with live interpolation preview.
     - "Reset to FeraSetu Default" action.
   - **Live Preview Pane**:
     - Split pane: Code/Editor on left, Live rendered email on right.
     - Toggle: Desktop View vs Mobile View.
     - Uses realistic mock data (e.g. ₹1,499.00 total, Priya Sharma, Mumbai).
     - "Send Test Email to My Inbox" button directly in preview header.

5. **AI Email Assistant Bar / Drawer**:
   - Floating assistant button or side panel: "Ask FeraSetu AI to manage email & templates".
   - Pre-built prompt chips:
     - *"Make my order confirmation warmer and add a WhatsApp support note"*
     - *"Change customer replies to go to my support email"*
     - *"Show me email delivery status for today"*
     - *"Test my shipping notification email"*
   - Executes structured AI tools with visual action cards and undo capability.

6. **Recent Delivery Activity Table**:
   - Table showing recent outgoing transactional emails:
     - Columns: Event / Status, Recipient, Template, Sender Address, Provider, Timestamp.
     - Status badges: Green `DELIVERED`, Blue `SENT`, Red `FAILED` (with error snippet tooltip).
     - Pagination or "Load more" button.

7. **Advanced SMTP Relay (Expandable Accordion)**:
   - Placed at the bottom of the Email tab.
   - Collapsed by default: "Advanced Settings: Use Custom SMTP Server".
   - Helper text: "For advanced users who prefer using their own Amazon SES, SendGrid, Brevo, or Gmail relay."
   - Expanding opens form: Host, Port (587/465), Security Mode (STARTTLS/SSL_TLS), Username, Password.
   - Password encrypted via AES-256-GCM. Test connection executes before save.

---

## 5. AI Email Assistant Specification

### 5.1 Structured Tool Schema Definition

```typescript
// 1. get_email_settings
interface GetEmailSettingsTool {
  name: 'get_email_settings';
  description: 'Retrieve current merchant email provider, domains, sender identities, reply-to address, and quota';
  parameters: { type: 'object'; properties: {} };
  riskLevel: 'read_only';
  requiresConfirmation: false;
}

// 2. update_email_sender
interface UpdateEmailSenderTool {
  name: 'update_email_sender';
  description: 'Update display name or default status of a sender identity';
  parameters: {
    type: 'object';
    properties: {
      identityId: { type: 'string', description: 'ID of the email identity to update' },
      displayName: { type: 'string', description: 'New sender display name' },
      isDefault: { type: 'boolean', description: 'Whether to make this identity the default sender' },
    };
    required: ['identityId'];
  };
  riskLevel: 'reversible_write';
  requiresConfirmation: false;
}

// 3. update_reply_to
interface UpdateReplyToTool {
  name: 'update_reply_to';
  description: 'Update the merchant reply-to email address where customer responses are routed';
  parameters: {
    type: 'object';
    properties: {
      replyToEmail: { type: 'string', description: 'Valid email address for customer replies' },
    };
    required: ['replyToEmail'];
  };
  riskLevel: 'reversible_write';
  requiresConfirmation: false;
}

// 4. list_email_templates
interface ListEmailTemplatesTool {
  name: 'list_email_templates';
  description: 'List all available transactional email templates and their allowed variables';
  parameters: { type: 'object'; properties: {} };
  riskLevel: 'read_only';
  requiresConfirmation: false;
}

// 5. update_email_template
interface UpdateEmailTemplateTool {
  name: 'update_email_template';
  description: 'Update subject line or HTML content of a transactional email template';
  parameters: {
    type: 'object';
    properties: {
      templateKey: {
        type: 'string',
        enum: ['ORDER_CONFIRMATION', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'PAYMENT_FAILED', 'INVOICE', 'REFUND_ISSUED'],
        description: 'Template identifier',
      },
      subject: { type: 'string', description: 'New email subject line with optional {{variables}}' },
      contentHtml: { type: 'string', description: 'New email body HTML content' },
    };
    required: ['templateKey'];
  };
  riskLevel: 'reversible_write';
  requiresConfirmation: false;
}

// 6. send_test_email
interface SendTestEmailTool {
  name: 'send_test_email';
  description: 'Send a live test transactional email to a specified recipient';
  parameters: {
    type: 'object';
    properties: {
      to: { type: 'string', description: 'Recipient email address for the test send' },
      templateKey: { type: 'string', description: 'Optional template key to test' },
    };
    required: ['to'];
  };
  riskLevel: 'sensitive';
  requiresConfirmation: true;
}
```

### 5.2 Destructive Action Guardrails & Undo Architecture
- **Sensitive Operations**:
  - Switching provider between `FERASETU` and `EXTERNAL_SMTP`.
  - Deleting custom domains.
  - Sending external test emails.
- **Action Approval Flow**:
  1. AI model generates proposed action: `{ toolName, riskLevel: 'sensitive', preview: 'Switch email provider to External SMTP (smtp.sendgrid.net)', requiresApproval: true }`.
  2. UI displays dedicated confirmation card with "Confirm" and "Cancel" buttons (`#approve-action-${id}`, `#reject-action-${id}`).
  3. Action executes only upon explicit merchant confirmation click.
- **Version History & 1-Click Undo**:
  - Every update to templates or settings creates a record in `email_config_history` containing `{ id, organization_id, action_type, before_state, after_state, created_at }`.
  - AI Assistant exposes `undo_last_action` tool: restores `before_state` atomically and confirms rollback to the merchant.

---

## 6. Repository Test Suites Catalog & Health

### 6.1 Test Suites Overview

| Test Suite Path | Runner | Primary Scope | Test Count / Suites | Key Assertions |
|---|---|---|---|---|
| `tests/production-email-architecture.test.mjs` | `node --test` | Core architecture, multi-tenant isolation, DNS state machine, AES-256-GCM encryption, quotas | 9 suites | Verifies platform vs merchant isolation, zero-config provisioning, CRLF injection rejection, cross-tenant spoofing block |
| `tests/production-email-integration.test.mjs` | `node --test` | End-to-end integration scenarios A through O | 15 scenarios | Verifies template rendering, 5xx server error decoupling, 422 rejected recipient logging, quota separation |
| `tests/cashfree-payment-verification.test.mjs` | `node --test` | Cashfree payment flow, plan entitlements, AI credit purchase, subscription state machine | 9 suites | Verifies fail-closed sandbox/production mode, purchase idempotency, trial immutability |
| `tests/production-hardening-p0.test.mjs` | `node --test` | Inventory deduction, 21-column tax invoices, dynamic branding, India market free plan | 8 specifications | Verifies stock deduction on checkout, invoice number scoping `INV-STORE-XXXX`, dynamic logo URLs |
| `frontend/tests/auth-loop.test.ts` | Node + JSDOM | Auth redirect safety, 401 handling, login/register explicit triggers | 3 tests | Verifies no infinite redirect loops, explicit login triggers |
| `frontend/tests/cashfree.test.ts` | Node + Loader | Cashfree mode validation and response parser | 7 tests | Verifies fail-closed behavior on missing or invalid environment |
| `frontend/tests/localization.test.ts` | Node + Loader | 48 languages (22 Indian scheduled + 24 EU + Hinglish + US English) | 9 tests | Verifies language dictionaries, currency formatting, number localization |
| `frontend/tests/route-stress.test.ts` | Node + Loader | Route definitions, nested Layout shell, SPA transitions, mobile layout | 4 tests | Verifies all public and merchant routes (including `/settings/email`), 0 raw anchor tags |

### 6.2 Test Execution Notes
- **Test Runner**: Node's built-in test runner (`node --test`) is the authoritative runner for root tests (`tests/*.test.mjs`).
- **Frontend Runner**: Uses Node with custom loaders: `node --experimental-loader ./tests/ts-extension-loader.mjs --experimental-strip-types --test tests/*.test.ts`.
- **Compatibility Requirement**: Any navigation or route updates in `App.tsx` or `Layout.tsx` MUST preserve existing route strings (specifically `/settings/email`) so that `frontend/tests/route-stress.test.ts` continues to pass.

---

## 7. Logic Chain

1. **Premise 1**: Requirement R2 in `ORIGINAL_REQUEST.md` demands replacing the complex raw SMTP configuration with a unified, high-trust "Domains & Email" dashboard area with two distinct tabs: "Domains" and "Email".
2. **Observation 1**: `frontend/src/pages/EmailSettingsPage.tsx` currently has no tabs, puts technical SMTP selection front-and-center, and lacks domain purchasing and template management.
3. **Observation 2**: `frontend/src/components/Layout.tsx` labels the link as "Email Settings", and `frontend/tests/route-stress.test.ts` checks that `/settings/email` exists.
4. **Inference 1**: Upgrading `Layout.tsx` to label the link "Domains & Email" while preserving `/settings/email` (and adding aliases `/settings/domains` and `/domains-email`) satisfies Requirement R2 without breaking any existing test assertions.
5. **Premise 2**: Requirement R4 requires predefined and custom templates (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`) with `{{variable}}` interpolation, HTML sanitization, live preview, and AI assistant tools (`get_email_settings`, `update_email_sender`, `update_reply_to`, `list_email_templates`, `update_email_template`, `send_test_email`).
6. **Observation 3**: `worker/templates/emailTemplates.js` already contains the template keys, variable validation, and layout engine, but lacks a frontend editor UI, live preview iframe, and backend REST endpoints for custom template persistence and AI assistant tool dispatch.
7. **Inference 2**: Implementing the Template Editor in `EmailSettingsPage.tsx` with live preview and binding it to backend routes, along with AI tool definitions in `worker/ai/`, fulfills Requirement R4 cleanly and securely.
8. **Premise 3**: Test suites `production-email-architecture.test.mjs`, `production-email-integration.test.mjs`, `cashfree-payment-verification.test.mjs`, and `production-hardening-p0.test.mjs` test the authoritative backend contracts.
9. **Inference 3**: All new UI components and AI tools must adhere strictly to these established database models (`email_domains`, `email_identities`, `email_provider_connections`, `email_messages`, `email_events`) to maintain 100% test compatibility.

---

## 8. Caveats

- **Cloudflare Zone API Keys**: DNS auto-provisioning for purchased domains requires valid `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` environment variables. When missing in local development, the code gracefully logs a notice and falls back to manual DNS instructions.
- **Cashfree Domain Purchasing Integration**: Domain pricing queries must be validated strictly on the backend against the `DomainProvider` to prevent client-side amount tampering.
- **Read-Only Scope**: This survey was conducted in strict read-only mode without modifying repository source code.

---

## 9. Conclusion

The specification mining is complete:
1. **Frontend UI/UX**: Detailed design specifications are documented for replacing the raw SMTP configuration with the high-trust "Domains & Email" dashboard (Domains Tab + Email Tab), adhering to FeraSetu design tokens (blue `#0052FF`, white, orange `#FF6B35`, low-radius, `Inter` typography).
2. **AI Email Assistant**: Full interface specifications are defined for the 6 structured tools, action approval cards, sensitive action guardrails, and version history undo.
3. **Template Editor & Preview**: Specifications are defined for the 6 core commercial templates, variable validation, live sample preview, and test dispatch.
4. **Verification Test Suites**: All existing test suites, runners, assertions, and compatibility constraints are cataloged.

---

## 10. Verification Method

To verify these findings and validate the specifications:
1. **Inspect Route Stress Test**:
   - File: `frontend/tests/route-stress.test.ts`
   - Command: `cd frontend && node --experimental-loader ./tests/ts-extension-loader.mjs --experimental-strip-types --test tests/route-stress.test.ts`
   - Confirms line 42 checks `/settings/email`.
2. **Inspect Existing Email Architecture & Integration Tests**:
   - Files: `tests/production-email-architecture.test.mjs`, `tests/production-email-integration.test.mjs`
   - Command: `node --test tests/production-email-architecture.test.mjs tests/production-email-integration.test.mjs`
   - Confirms all 24 email architecture and integration assertions pass.
3. **Inspect Cashfree & Hardening Tests**:
   - Files: `tests/cashfree-payment-verification.test.mjs`, `tests/production-hardening-p0.test.mjs`
   - Command: `node --test tests/cashfree-payment-verification.test.mjs tests/production-hardening-p0.test.mjs`
   - Confirms payment idempotency and P0 hardening requirements.

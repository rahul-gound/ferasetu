# Original User Request

## 2026-10-01T11:23:41Z

Audit FeraSetu's external integrations, implement a merchant-friendly Domains & Email system (with automatic FeraSetu mail default, custom domain connection, domain purchasing via provider abstraction, transactional templates, and AI email assistant), and harden security and tenant isolation across Cloudflare Workers and D1.

Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Integrity mode: development

## Requirements

### R1. External Integration Audit & Canonical Service Layer
Produce a factual inventory of all external services, APIs, SDKs, webhooks, and storage providers across the repository. Quarantining or removing legacy/dead systems (such as legacy Appwrite, MySQL/SQLite fallbacks, obsolete analytics/payments), and formalize the core server-side integrations (WorkOS, Cashfree, Backblaze B2, FeraSetu SMTP/Email, Turnstile, and AI) into structured, typed, tenant-isolated worker service modules with strict secret protection and idempotency.

### R2. Merchant Domains & Email Dashboard Experience
Replace the complex SMTP configuration UX with a modern, high-trust "Domains & Email" dashboard area adhering to FeraSetu's design language (blue + white + orange, low-radius, clean typography):
- **Domains Tab**: Display active domains (FeraSetu subdomain, custom domains, purchased domains), status badges, connection states (Store / Email), and actions (Connect domain, Buy domain, Manage, DNS setup).
- **Email Tab**: Default active state using FeraSetu Mail (`orders@{store-slug}.ferasetu.com`) with zero SMTP configuration required by normal merchants. Technical SMTP settings must be relegated to an expandable Advanced section.
- **Sender Identity & Real Reply-To**: Configure sender aliases (`orders@`, `support@`, `billing@`, etc.) and map customer replies to the merchant's verified account or store email.

### R3. Pluggable Domain Provider & Purchase/Connect Architecture
Implement an abstracted `DomainProvider` interface with methods for searching domains, checking availability, fetching authoritative pricing, registering domains, checking DNS/status, and handling provider webhooks. Integrate domain purchasing with FeraSetu's established Cashfree billing architecture, strictly validating amounts on the server to prevent price tampering. Implement guided DNS verification (TXT/CNAME/SPF/DKIM/DMARC) for externally connected domains with copy buttons, error guidance, and re-check actions.

### R4. Transactional Email Engine, Templates & AI Assistant
Deliver a centralized transactional email engine supporting predefined and custom templates (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`):
- **Variable Registry**: Implement strict `{{variable}}` interpolation with HTML sanitization to prevent XSS and injection attacks.
- **Template Editor & Preview**: Provide a merchant-friendly editor with real-time preview (using realistic sample data) and a working "Send test email" function using the configured provider.
- **AI Email Assistant**: Provide structured AI tool actions (`get_email_settings`, `update_email_sender`, `update_reply_to`, `list_email_templates`, `update_email_template`, `send_test_email`) with change history and undo support, requiring explicit user confirmation for destructive or provider changes.
- **Delivery Activity**: Render an immutable delivery log showing recipient, template, sender, provider, timestamp, and status.

### R5. Security, Tenant Isolation & Production Hardening
Enforce strict tenant isolation across all domain, email, template, and webhook endpoints (`authenticated user -> organization membership -> resource verification`). Ensure no secrets (SMTP passwords, B2 application keys, Cashfree secrets, AI keys) leak into browser responses, logs, or AI context. Prevent IDOR, SSRF during DNS verification, email header injection, and sender address spoofing.

## Verification Resources
- Existing test suites: `tests/production-email-architecture.test.mjs`, `tests/production-email-integration.test.mjs`, `tests/cashfree-payment-verification.test.mjs`, `tests/production-hardening-p0.test.mjs`.
- Existing schema & migrations: `worker/schema.sql`, `worker/migrations/0014_production_email_architecture.sql`, `worker/migrations/0015_payment_hardening_and_test_mode.sql`, `worker/migrations/0016_privacy_first_analytics.sql`.
- Email service & crypto implementations: `worker/services/emailService.js`, `worker/services/emailCrypto.js`, `worker/services/externalSmtpClient.js`.

## Acceptance Criteria

### Integration Inventory & Clean Architecture
- [ ] Comprehensive inventory report generated classifying all repo integrations as REQUIRED, OPTIONAL, NOT NEEDED, or LEGACY/REMOVE.
- [ ] All external API credentials isolated server-side; zero secrets present in frontend bundles, client payloads, or logs.
- [ ] Cashfree webhook verification enforced with HMAC signature validation, idempotency key checks, and verified state transitions.

### Domains & Email UI/UX
- [ ] Navigation presents unified "Domains & Email" page with "Domains" and "Email" tabs; raw "SMTP" is omitted from primary navigation.
- [ ] Fresh merchant accounts automatically show active FeraSetu Mail with their canonical store slug without configuration.
- [ ] Reply-To email accurately defaults to the merchant's real account/store email, routing replies while preserving DKIM/SPF alignment.
- [ ] Custom domain flow provides copyable DNS records (TXT ownership, DKIM, SPF, DMARC) with live verification polling and error states.
- [ ] Domain search queries real availability and pricing through `DomainProvider` abstraction without client-side spoofing.

### Transactional Email Service & Templates
- [ ] Transactional engine successfully dispatches test and event-driven emails through the underlying FeraSetu mail gateway.
- [ ] Template engine validates registered `{{variable}}` tags, rejects unknown variables, and sanitizes output against HTML/script injection.
- [ ] Template editor includes live sample preview and a functional test send to the merchant's verified address.
- [ ] AI email tools allow safe modifications of subjects, bodies, and aliases with version history and undo capability, while disallowing unconfirmed provider flips.
- [ ] Recent delivery activity table renders live delivery statuses without exposing sensitive email body payloads.

### Multi-Tenant Isolation & Verification Tests
- [ ] Automated tests verify cross-tenant access rejection (Tenant A cannot view, mutate, or send emails from Tenant B's domains or templates).
- [ ] Automated tests verify that sender spoofing is blocked for unverified custom domains.
- [ ] Unit and integration test suites pass for email delivery, template rendering, DNS verification, and domain checkout validation.
- [ ] TypeScript type-checking and lint checks pass without errors across worker and frontend codebases.

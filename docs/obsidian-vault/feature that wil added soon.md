# 🚀 feature that wil added soon

> **Document Status:** 🟡 Planned & In-Flight Roadmap  
> **Subsystem:** Merchant Communications & Storefront Infrastructure  
> **Parent Note:** [[00 - 🗺️ System Architecture Overview]] | **Progress Matrix:** [[01 - 📊 Progress & Completion Matrix]]  
> **Target User:** The Global Shopkeeper (independent retailers, grocers, bodegas, boutiques across 48+ regions)  
> **Core Value Proposition:** Direct customer relationships, 0% platform commission, zero jargon, bulletproof deliverability.

---

## 1. Executive Summary & Upcoming Feature Index

This document outlines high-priority features scheduled for production rollout across the FeraSetu platform, focusing on merchant communications, email branding, and transactional sovereignty.

| Upcoming Feature | Target Subsystem | Primary Code Paths | Status | Priority |
| :--- | :--- | :--- | :---: | :---: |
| **Branded Email Header & FeraSetu Email Logo** | Frontend & Worker Email Client | `frontend/public/logo-official.png`, `worker/templates/email/` | 🟡 Ready for Design System Sync | **High** |
| **Shopkeeper SMTP Email Integration** | Core API & Worker Email Service | `backend/src/routes/settings.ts`, `ferasetu-smtp/`, `backend/src/models/database.ts` | 🟢 Backend Ready / UI Syncing | **High** |
| **1-Click OAuth2 SMTP Connect** | Frontend & Core API Auth | `frontend/src/pages/EmailSettingsPage.tsx`, `backend/src/routes/auth.ts` | ⚪ Spec / Roadmap | **Medium** |
| **Multi-Channel Fallback (Email ➔ WhatsApp)** | Edge Worker & Notifications | `worker/routes/notificationRoutes.js`, `worker/services/whatsapp.js` | ⚪ Spec / Roadmap | **Medium** |

---

## 2. FeraSetu Email Logo Asset & Branding Specification

### A. Official Email Logo Asset
To maintain visual consistency and instant brand recognition across customer inboxes (order receipts, OTP verifications, payment confirmations, dispatch alerts), FeraSetu employs a standardized horizontal logo asset:

![[ferasetu-email-logo.png]]

*Alternative markdown relative link:*  
`![FeraSetu Email Logo](assets/ferasetu-email-logo.png)`

#### Asset Specifications
- **Source Asset:** `frontend/public/logo-official.png` (mirror in vault: `assets/ferasetu-email-logo.png`)
- **Native Dimensions:** 297 × 128 px
- **Email Render Width:** 140px – 180px width (retina 2x resolution for ultra-sharp rendering on iPhone Mail, Gmail Android, and Outlook desktop)
- **Primary Brand Color:** Fera Blue (`#0052FF`), deep slate text (`#152238`), clean transparent background
- **Dark Mode Safeguard:** Built with high-contrast glyph borders ensuring crisp visibility against both pure white (`#FFFFFF`) and dark gray/black (`#1E1E1E`) email client backgrounds.

### B. Standardized Email Header Component Pattern
Transactional email templates must use this table-based layout to guarantee 100% cross-client rendering fidelity:

```html
<!-- FeraSetu Production Email Header Component -->
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <tr>
    <td style="padding: 24px 32px; border-bottom: 1px solid #E5EAF1; text-align: left;">
      <a href="https://ferasetu.com" target="_blank" style="text-decoration: none; display: inline-block;">
        <img 
          src="https://ferasetu.com/logo-official.png" 
          alt="FeraSetu" 
          width="148" 
          height="auto" 
          style="display: block; border: 0; outline: none; text-decoration: none; max-width: 148px; height: auto;" 
        />
      </a>
    </td>
  </tr>
</table>
```

---

## 3. Shopkeeper SMTP Email Feature

### A. Vision & Shopkeeper Value Proposition
For independent shopkeepers, customer trust is built on personal connection and familiarity. When a customer orders groceries, clothing, or electronics:
1. **Brand Authenticity:** The customer should see emails originating from their local store (e.g., `orders@sharmagrocery.in` or `hello@cornerboutique.com`), not an anonymous platform address.
2. **Zero Commission & Direct Relationship:** Unlike monopolistic marketplaces that hide customer email addresses, FeraSetu empowers shopkeepers with direct customer communication.
3. **Dual Delivery Flexibility:**
   - **Mode 1 (Custom SMTP):** The shopkeeper connects their existing email provider (Google Workspace / Gmail, SendGrid, Amazon SES, Mailgun, or private SMTP server).
   - **Mode 2 (FeraSetu Managed SMTP):** Shopkeepers without their own mail server utilize FeraSetu's high-reputation, dedicated Postfix MTA cluster deployed on Modal (`ferasetu-smtp`) with automatic DKIM/SPF/DMARC signing (`noreply@<merchant-slug>.ferasetu.com`).

---

### B. High-Level Delivery Architecture

```
                    ┌─────────────────────────────────────────────────────┐
                    │ Shopkeeper Web App (EmailSettingsPage.tsx)          │
                    └──────────────────────────┬──────────────────────────┘
                                               │
                                 HTTPS (PUT /api/settings/smtp)
                                               ▼
                    ┌─────────────────────────────────────────────────────┐
                    │ Express Core API (backend/src/routes/settings.ts)   │
                    │  - AES-256 Encryption for SMTP Passwords            │
                    │  - Rate-Limited Live Test Dispatcher                │
                    └──────────────────────────┬──────────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        │                                             │
      [Provider == 'custom' / 'gmail']             [Provider == 'ferasetu']
                        │                                             │
                        ▼                                             ▼
          ┌──────────────────────────┐                  ┌──────────────────────────┐
          │ Shopkeeper's Custom SMTP │                  │ Worker Email Gateway &   │
          │ (Gmail, SendGrid, SES)   │                  │ ferasetu-smtp (Modal)    │
          │  - Direct TLS/SSL        │                  │  - Postfix MTA loopback  │
          │  - Custom Sender Name    │                  │  - 2048-bit RSA DKIM     │
          └─────────────┬────────────┘                  └─────────────┬────────────┘
                        │                                             │
                        └──────────────────────┬──────────────────────┘
                                               │
                                               ▼
                                  Customer Inbox (Gmail/Apple)
```

---

### C. Database Model: `smtp_settings`
Located in `backend/src/models/database.ts`:

```sql
CREATE TABLE IF NOT EXISTS smtp_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'custom',   -- 'custom', 'gmail', 'sendgrid', 'mailgun', 'ses'
  host TEXT,                                 -- e.g. smtp.gmail.com
  port INTEGER NOT NULL DEFAULT 587,         -- 587 (TLS), 465 (SSL), or 25
  username TEXT,                             -- SMTP login username / email
  password_encrypted TEXT,                   -- AES-256 encrypted authentication credential
  sender_name TEXT,                          -- Display name (e.g. "Sharma General Store")
  sender_email TEXT,                         -- From: address (e.g. orders@sharma.in)
  reply_to_email TEXT,                       -- Reply-To header for customer queries
  ssl_enabled INTEGER NOT NULL DEFAULT 0,    -- Implicit SSL (port 465)
  tls_enabled INTEGER NOT NULL DEFAULT 1,    -- STARTTLS (port 587)
  otp_enabled INTEGER NOT NULL DEFAULT 1,    -- Whether to route OTP verification emails
  otp_length INTEGER NOT NULL DEFAULT 6,     -- 4 to 8 digits
  otp_expiry_minutes INTEGER NOT NULL DEFAULT 10,
  otp_resend_cooldown INTEGER NOT NULL DEFAULT 60,
  otp_max_attempts INTEGER NOT NULL DEFAULT 5,
  otp_subject TEXT DEFAULT 'Verify your email • FeraSetu',
  otp_body_template TEXT,                    -- Merchant-customized HTML/Markdown body
  is_active INTEGER NOT NULL DEFAULT 0,      -- Active status flag
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### D. Production Security & Deliverability Invariants

1. **Zero Credential Exposure:** SMTP passwords are encrypted using server-side AES-256 before storage in SQLite/D1. The API never returns raw passwords; it exposes only a boolean `has_password: true/false`.
2. **CRLF Header Injection Defense:** All incoming email fields (`sender_name`, `sender_email`, `subject`) are scrubbed for `\r` and `\n` to prevent mail injection exploits.
3. **Anti-Spam & Bounce Cutoff (0.3% Rule):** In alignment with Google and Yahoo merchant postmaster guidelines, if a shopkeeper's custom SMTP or managed domain generates >0.3% spam complaints or excessive hard bounces, outbound transactional queuing is suspended with an alert in the dashboard.
4. **Token-Bucket Rate Limiting:** Test email triggers (`POST /api/settings/smtp/test`) and OTP verification triggers (`POST /api/auth/send-verification-email`) are guarded by rate limiters (maximum 5 tests per 15 minutes per user) to protect merchant mailboxes from runaway loops.
5. **No Open Relays:** Both the in-container Postfix daemon (`ferasetu-smtp`) and external connectors bind strictly to authenticated submission ports.

---

### E. Frontend Management Experience (`EmailSettingsPage.tsx`)

Shopkeepers manage their email settings through a human-centric interface:
- **Provider Selector:** Pre-configured presets for **Google Workspace / Gmail**, **SendGrid**, **Amazon SES**, **Mailgun**, and **Custom SMTP**. Selecting a provider automatically fills recommended hosts (`smtp.gmail.com`), ports (`587`), and encryption modes.
- **Connection Test Sandbox:** A dedicated "Send Test Email" tool that verifies credentials in real time and sends a verification payload before saving settings.
- **OTP & Notification Customizer:** Controls for OTP code length (4–8 digits), cooldown timers (30–120s), and custom sender names so Kirana customers feel confident.
- **DNS Health Badges:** Shows live SPF, DKIM, and DMARC status for verified custom domains.

---

## 4. Implementation & Verification Checklist

- [x] SQLite schema for `smtp_settings` with foreign key cascade (`backend/src/models/database.ts`)
- [x] Backend CRUD endpoints: `GET /api/settings/smtp`, `PUT /api/settings/smtp`, `GET /api/settings/smtp/provider-defaults`
- [x] Test email dispatching service with rate limiting (`POST /api/settings/smtp/test`)
- [x] Postfix MTA cluster container with loopback submission on Modal (`ferasetu-smtp/`)
- [x] Official email logo asset placed in vault (`assets/ferasetu-email-logo.png`)
- [ ] Visual email template previewer inside `EmailSettingsPage.tsx`
- [ ] 1-Click Google Workspace App Password generator guide
- [ ] Automated DNS propagation poller for custom merchant domains
- [ ] Multi-channel fallback: automatic SMS/WhatsApp notification if an email fails delivery after 3 retries

---

## 5. Architectural Cross-References

- 🗺️ [[00 - 🗺️ System Architecture Overview]] — Dual-engine architecture and subsystem boundaries.
- 📊 [[01 - 📊 Progress & Completion Matrix]] — Current milestone completion percentages.
- 🖥️ [[03 - 🖥️ Core API & Business Logic (Node.js & Express)]] — Backend authentication and email service hooks.
- 🎨 [[04 - 🎨 Frontend & Design System (React 19 & Tailwind)]] — UI components and human design principles.
- 🌐 [[08 - 🌐 Subdomains, Custom Domains & DNS]] — Spaceship DNS and custom storefront routing.

# 💬 11 - WhatsApp Assistant Architecture

> **Document Status:** 🟡 Implementation updated; verification pending  
> **Subsystem:** Merchant Customer Communications & WhatsApp Web Automation  
> **Parent Note:** [[00 - 🗺️ System Architecture Overview]] | **Progress Matrix:** [[01 - 📊 Progress & Completion Matrix]]  
> **Target User:** The Global Shopkeeper (independent retailers, grocers, bodegas, boutiques)  
> **Core Value Proposition:** 0% commission, direct merchant-customer relationships, conversational AI grounded in live catalog, automated order requests without technical complexity.

---

## 1. Subsystem Architecture Overview

The FeraSetu WhatsApp Assistant enables non-technical shopkeepers to connect a dedicated shop WhatsApp phone number via standard **WhatsApp → Linked Devices** QR code pairing. Once linked, customer inquiries are received, parsed, and answered by FeraSetu AI grounded strictly in the merchant's live D1 product catalog, while order requests are captured as pending confirmation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Merchant Browser (SPA)                          │
│   /whatsapp-assistant (Introduction -> Disclosure -> QR -> Control)    │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │ HTTPS (WorkOS JWT / Org Guard)
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Cloudflare Worker Edge API                           │
│   ├── routes/whatsappRoutes.js (Status, QR proxy, Settings, Messages)  │
│   ├── requireOrgContext (Strict tenant isolation by organization_id)   │
│   └── services/whatsappService.js (D1 Relational State & Audits)       │
└────────┬───────────────────────────────────────────────┬───────────────┘
         │ D1 Relational SQL                             │ HMAC-SHA256 Webhook
         ▼                                               ▼
┌───────────────────────────────┐       ┌────────────────────────────────┐
│  Cloudflare D1 Database       │       │ Persistent Node.js Connector   │
│  - whatsapp_sessions          │◄─────►│ (packages/whatsapp-service)    │
│  - whatsapp_conversations     │       │ - Baileys WASocket Engine      │
│  - whatsapp_messages          │       │ - AES-256-GCM Session Storage  │
│  - whatsapp_order_requests    │       │ - Jitter & Outbound Rate Limit │
│  - whatsapp_audit_logs        │       │ - Mock Simulator Test Pipeline │
└───────────────────────────────┘       └────────────────────────────────┘
```

---

## 2. Key Modules & Entrypoints

| Module | Location | Purpose |
| :--- | :--- | :--- |
| **Frontend Page** | `frontend/src/pages/WhatsAppAssistantPage.tsx` | 4-stage UI (Introduction, Mandatory Disclosure, QR Wizard, Connected Control Center with live metrics & order triage). |
| **Frontend Route** | `frontend/src/App.tsx` | Registered at `/whatsapp-assistant` and `/dashboard/whatsapp-assistant`. |
| **Sidebar Entry** | `frontend/src/components/Layout.tsx` | Visible in `ENGAGE` navigation group with `MessageSquare` icon. |
| **Worker Routes** | `worker/routes/whatsappRoutes.js` | Authenticated endpoints for status, connect, disconnect, settings, conversations, and internal webhooks. |
| **Worker Service** | `worker/services/whatsappService.js` | D1 persistence, phone number masking (`+91 98765 •••••`), catalog sync, and shopkeeper dashboard notifications. |
| **D1 Migration** | `worker/migrations/0021_whatsapp_assistant.sql` | Relational tables for sessions, conversations, messages, order requests, and audit logs. |
| **Persistent Connector** | `packages/whatsapp-service/` | Node.js service running `@whiskeysockets/baileys` with AES-256-GCM session key encryption at rest. |
| **AI Grounding Engine** | `packages/whatsapp-service/src/aiProcessor.js` | Catalog-grounded query answering, anti-hallucination guardrails, pending order capture, and human handover. |
| **Outbound Queue** | `packages/whatsapp-service/src/outboundQueue.js` | 1.2s - 2.8s human typing jitter, rate limiting, and circuit breaker. |
| **Test Suite** | `tests/whatsapp-assistant.test.mjs` | 19 automated integration tests covering multi-tenancy, cryptography, catalog grounding, and webhook security. |

---

## 3. Human UI/UX & Compliance Invariants

1. **Pre-Pairing Disclosure:** Merchants are explicitly informed that this is an unofficial WhatsApp Web connection, advised to use a separate shop number, and must check two mandatory acknowledgments before any QR code is generated.
2. **Zero Hallucinated Prices or Stock:** AI strictly answers from the merchant's live catalog. If an item is out of stock, it is honestly reported. If a price is queried, exact figures in store currency (₹ or $) are quoted.
3. **Pending Confirmation Order Flow:** Order requests are never confirmed automatically or dispatched without merchant confirmation; they are saved with status `pending_confirmation` and trigger instant dashboard notifications.
4. **Instant Emergency Disconnect:** One-click disconnect terminates the active socket, wipes credentials from storage, and guides the merchant on unlinking from phone settings.
5. **Customer Handover:** Inquiries indicating complaints, damaged goods, or direct requests for human owners flag `requires_attention = true` and allow the merchant to pause AI for that conversation.

---

## 4. Verification Status

- **Unit & Integration Suite:** `tests/whatsapp-assistant.test.mjs` (19/19 tests passing).
- **TypeScript Typecheck:** `frontend/` passes with 0 errors (`npx tsc --noEmit`).
- **Database Migrations:** Applied in sequence (`0021_whatsapp_assistant.sql`).

## 5. Review Update — 2026-11-02

- Removed the built-in webhook secret fallback. The webhook now fails closed when its secret is not configured.
- The Worker now requires and audits the disclosure acknowledgement before starting pairing.
- Removed the fake QR fallback. A missing or unhealthy connector now returns an error instead of claiming a phone is paired.
- Connector disconnect and settings changes now require a successful connector response before the dashboard reports the change.
- Added bounded list limits, order-status validation, and retrieval of the latest messages in chronological display order.
- Verification is pending; the test suite has not been rerun after these changes.

## 2026-10-01T21:07:24Z
You are worker_m4_gen7.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m4_gen7
Your project root is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

Authoritative Request:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md (specifically under header ## 2026-10-01T11:23:41Z and requirement R4).
Master plan & contracts:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md (specifically § Interface Contracts: Template Engine & API Contract, AI Email Assistant Tools Contract).
Also check:
- .agents/worker_m1_gen7/handoff.md
- .agents/worker_m2_gen7/handoff.md
- .agents/test_writer_e2e_gen7/handoff.md
- .agents/worker_m4_gen7/context.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Implement Milestone 4: Transactional Email Engine, Templates & AI Assistant (R4).

Files owned exclusively:
- `worker/migrations/0017_merchant_email_templates.sql`
- `worker/templates/emailTemplates.js`
- `worker/routes/emailRoutes.js`
- `worker/ai/emailAssistantTools.js`

Deliverables:
1. `worker/migrations/0017_merchant_email_templates.sql`: D1 migration for custom merchant template overrides (`id`, `merchant_id`, `template_key`, `subject_override`, `html_override`, `created_at`, `updated_at`). Include table creation in idempotent table init in `worker/index.js` if applicable.
2. `worker/templates/emailTemplates.js`: Ensure core templates (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`) are fully registered, with strict `{{variable}}` interpolation, unknown variable rejection, HTML sanitization against XSS, and sample mock data definitions for preview.
3. `worker/routes/emailRoutes.js`: Add template endpoints:
   - `GET /api/email/templates`: Returns list of available templates with variables and override status
   - `GET /api/email/templates/:key`: Returns template details (system default + merchant override if present)
   - `PUT /api/email/templates/:key`: Saves override to `merchant_email_templates`
   - `POST /api/email/templates/preview`: Renders live HTML with sample data
   - Update `POST /api/email/test` to support `templateKey` and `sampleData`.
4. `worker/ai/emailAssistantTools.js`: Implement 6 structured AI tools:
   - `get_email_settings`
   - `update_email_sender`
   - `update_reply_to`
   - `list_email_templates`
   - `update_email_template`
   - `send_test_email`
   Include snapshot history and undo support (`undo_email_action`). Require explicit confirmation for destructive changes or provider switches.
   Wire into `/v1/ai/chat` in `worker/index.js`.
5. Delivery Activity: Ensure all dispatches record immutable delivery events in `email_events` and render accurately without leaking email body PII.
6. Run tests: `node tests/e2e-domains-email.test.mjs`, `node tests/production-email-architecture.test.mjs`, `node tests/production-email-integration.test.mjs`.

Record progress in `progress.md` in your working directory.
When finished, write `handoff.md` and send a completion message to your parent orchestrator via `send_message`.

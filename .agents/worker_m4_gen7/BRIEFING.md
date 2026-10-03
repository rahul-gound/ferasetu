# BRIEFING — 2026-10-01T21:09:00Z

## Mission
Implement Milestone 4: Transactional Email Engine, Templates & AI Assistant (R4).

## 🔒 My Identity
- Archetype: worker_m4_gen7
- Roles: implementer, qa, specialist
- Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m4_gen7
- Original parent: 82730d0d-6f15-458f-b43c-bbf0c25d5f4f
- Milestone: M4 (Transactional Email Engine, Templates & AI Assistant)

## 🔒 Key Constraints
- DO NOT CHEAT: No hardcoded test results, fake facades, or circumventing implementations.
- Minimal change principle: Only touch assigned files and dependencies directly required.
- Files owned exclusively:
  - worker/migrations/0017_merchant_email_templates.sql
  - worker/templates/emailTemplates.js
  - worker/routes/emailRoutes.js
  - worker/ai/emailAssistantTools.js
  - Hooking template editor preview & AI actions where applicable.
- All outbound emails reject unverified sender identities and unknown variables in templates.
- Strict tenant isolation: every query on merchant_email_templates, email_domains, etc. scoped by organization_id.
- Snapshot history and undo support for AI actions in ai_action_history.
- Explicit confirmation required for destructive actions or provider switches.
- Delivery events logged immutably in email_events without leaking email body PII.

## Current Parent
- Conversation ID: 82730d0d-6f15-458f-b43c-bbf0c25d5f4f
- Updated: 2026-10-01T21:09:00Z

## Task Summary
- **What to build**:
  1. Migration `0017_merchant_email_templates.sql` and table creation in `worker/index.js` idempotent schema setup.
  2. Template engine in `worker/templates/emailTemplates.js` for 6 core templates (`ORDER_CONFIRMATION`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `PAYMENT_FAILED`, `INVOICE`, `REFUND_ISSUED`) with strict variable interpolation, validation, XSS sanitization, sample mock data.
  3. Template endpoints in `worker/routes/emailRoutes.js` (`GET /api/email/templates`, `GET /api/email/templates/:key`, `PUT /api/email/templates/:key`, `POST /api/email/templates/preview`, update `POST /api/email/test` for templateKey + sampleData).
  4. 6 AI Email Assistant tools with snapshot history and undo support in `worker/ai/emailAssistantTools.js` and wired into `/v1/ai/chat` in `worker/index.js`.
  5. Delivery activity logging verification and test execution.
- **Success criteria**:
  - `node tests/e2e-domains-email.test.mjs` passes.
  - `node tests/production-email-architecture.test.mjs` passes.
  - `node tests/production-email-integration.test.mjs` passes.
- **Interface contracts**: `PROJECT.md` (§ Template Engine & API Contract, AI Email Assistant Tools Contract).

## Key Decisions Made
- [TBD]

## Artifact Index
- `.agents/worker_m4_gen7/DISPATCH.md` — Assignment from orchestrator
- `.agents/worker_m4_gen7/BRIEFING.md` — Situational awareness
- `.agents/worker_m4_gen7/progress.md` — Liveness & progress tracker

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: Implement deliverables 1 to 5

## Quality Status
- **Build/test result**: Not yet executed
- **Lint status**: Clean
- **Tests added/modified**: None yet

## Loaded Skills
- None

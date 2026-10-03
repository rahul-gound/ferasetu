## 2026-10-01T14:35:57Z
You are worker_m2_gen7.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m2_gen7
Your project root is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

Authoritative Request:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md (specifically under header ## 2026-10-01T11:23:41Z and requirement R2).
Master plan & contracts:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md.
Also check:
- .agents/survey_spec_miner_3_gen6/handoff.md
- .agents/worker_m2_gen7/context.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Implement Milestone 2: Merchant Domains & Email Dashboard Experience (R2).
Files owned exclusively:
- `frontend/src/pages/EmailSettingsPage.tsx`
- `frontend/src/components/Layout.tsx`

Deliverables:
1. Redesign `frontend/src/pages/EmailSettingsPage.tsx` into a modern, high-trust two-tab dashboard:
   - Tab 1: "Domains":
     * FeraSetu subdomain display with status badge.
     * Custom domains list with connection status (Storefront / Email).
     * Action buttons: "Connect Domain", "Buy Domain", "DNS Setup", "Verify DNS".
     * Modal/Drawer for Guided DNS verification (TXT ownership, DKIM fs1, SPF, DMARC, CNAME mail) with 1-click copy and verification instructions.
     * Domain search / buy interface hook-ready for M3.
   - Tab 2: "Email":
     * Hero card: Default active FeraSetu Mail (`orders@{store-slug}.ferasetu.com`) - ready out of the box with zero SMTP configuration.
     * Sender Identity & Aliases manager (`orders@`, `support@`, `billing@`, custom alias).
     * Configurable Merchant Reply-To email address with status badge (defaults to merchant account/store email, routing customer replies while maintaining SPF/DKIM alignment).
     * Delivery Quota progress bar / usage display.
     * Expandable "Advanced SMTP Settings" accordion: Relegates raw custom SMTP to an expandable drawer with AES-256-GCM encrypted persistence.
     * Recent Delivery Activity table showing recipient, template, sender, status, timestamp without PII body leak.
2. Update `frontend/src/components/Layout.tsx`: Label sidebar item "Domains & Email" pointing to `/settings/email`.
3. Adhere to FeraSetu design tokens: Blue `#0052FF`, white surfaces, orange `#FF6B35` accents, low radius, clean typography.
4. Run `npm run build` in `frontend/` to verify 0 TypeScript compilation errors and clean build output.

Record progress in `progress.md` in your working directory.
When finished, write `handoff.md` and send a completion message to your parent orchestrator via `send_message`.

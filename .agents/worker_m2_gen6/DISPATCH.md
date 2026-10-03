## 2026-10-01T12:15:45Z
You are worker_m2_gen6.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m2_gen6
Your project root is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Parent orchestrator: orchestrator_gen6 (ID: 030ef1f7-ee1c-42c9-b5b4-a88328a36303)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read the authoritative request file:
c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md
Specifically inspect section ## 2026-10-01T11:23:41Z and Requirement R2 ("Merchant Domains & Email Dashboard Experience").
Also read:
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\survey_spec_miner_3_gen6\handoff.md

TASK & OBJECTIVE (Milestone 2):
1. Redesign `frontend/src/pages/EmailSettingsPage.tsx` into a high-trust, production-ready "Domains & Email" dashboard:
   - Apply FeraSetu design tokens: brand blue `#0052FF`, white cards, orange accents `#FF6B35`, low-radius (`rounded-xl`, `rounded-2xl`), clean typography.
   - Header with status banner: Active & Protected indicator, daily quota counter, active provider name.
   - Two Tabs: `[ Domains ]` and `[ Email ]`, driven by query parameter `?tab=domains` or `?tab=email`.
   - **Domains Tab**:
     - Display active domains: FeraSetu managed subdomain (`{store-slug}.ferasetu.com`), custom domains, and purchased domains.
     - Dual connection badges for each domain: Storefront (Connected / DNS Pending) and Email (DKIM/SPF Verified / DNS Pending).
     - "Connect Existing Domain" button opening a modal with input and displaying the 5 DNS records (TXT challenge, TXT DKIM `fs1`, TXT SPF, TXT DMARC, CNAME mail) with 1-click copy buttons and checkmark feedback, plus "Check Again" DoH verification trigger.
     - "Buy New Domain" action button and domain search entry point.
     - "Remove Domain" action with confirmation.
   - **Email Tab**:
     - Default Hero Card: FeraSetu Mail (`orders@{store-slug}.ferasetu.com`) active by default with zero SMTP configuration required.
     - Sender Aliases Manager: official aliases (`orders@`, `support@`, `billing@`, custom) with active default selector and display name editor.
     - Verified Reply-To Routing: configure merchant reply destination (`reply_to_email`), explaining that outbound DKIM/SPF alignment is preserved.
     - Relegate raw SMTP configuration to an expandable Advanced Accordion ("Advanced SMTP Relay") with AES-256-GCM encryption notice and credential fields.
     - Recent Delivery Activity Table: recipient, template, sender, provider, timestamp, status.
2. In `frontend/src/components/Layout.tsx`:
   - Update sidebar item in `SETTINGS`: change label to `"Domains & Email"`, keeping path `/settings/email`.
3. In `frontend/src/App.tsx`:
   - Keep `/settings/email` route intact.
   - Add alias routes: `/settings/domains` and `/domains-email` redirecting to `/settings/email`.
4. Verification:
   - Run in `frontend/`:
     `npm test`
     `npx tsc --noEmit`
     `npm run build`
   - Verify 0 TypeScript compilation errors, 0 warnings, clean production bundle.

EXCLUSIVE WRITE OWNERSHIP:
- `frontend/src/pages/EmailSettingsPage.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/App.tsx`
Do NOT modify backend or worker files.

OUTPUT:
Write your handoff report to `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m2_gen6\handoff.md` with build and test outputs. Send message to orchestrator_gen6 when complete.

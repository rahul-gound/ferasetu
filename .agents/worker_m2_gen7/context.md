# Context for worker_m2_gen7

You are `worker_m2_gen7` (Frontend Dashboard Worker).
Your working directory is: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m2_gen7`
Your project root is: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-`
Original request is in: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md` (§ 2026-10-01T11:23:41Z, Requirement R2)
Project master plan is in: `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md`
Prior survey handoffs:
- `.agents/survey_spec_miner_3_gen6/handoff.md`
- `.agents/worker_m2_gen6/progress.md`

Your mission:
Implement Milestone 2: Merchant Domains & Email Dashboard Experience.
Files owned:
- `frontend/src/pages/EmailSettingsPage.tsx`
- `frontend/src/components/Layout.tsx`
Deliver:
- Two-tab layout: "Domains" tab and "Email" tab.
- Domains tab: Active FeraSetu subdomain, Custom domains, connection status badges (Storefront / Email), Connect Domain action, Buy Domain action, DNS setup modal with copy buttons.
- Email tab: Hero card for active default FeraSetu Mail `orders@{store-slug}.ferasetu.com` (zero setup needed), Sender Aliases manager, Merchant Reply-To configuration with verified routing, expandable Advanced SMTP drawer.
- Navigation in `Layout.tsx`: Updated label "Domains & Email" pointing to `/settings/email`.
- Build verification: Run `npm run build` in `frontend/` to confirm 0 TypeScript errors and clean build.

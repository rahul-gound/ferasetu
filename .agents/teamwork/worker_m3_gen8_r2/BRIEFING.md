# BRIEFING — 2026-10-02T09:05:00Z

## Mission
Implement Milestone 3: Pluggable Domain Provider & Purchase/Connect Architecture (R3).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\worker_m3_gen8_r2
- Original parent: 76ef2f37-4c0f-43b4-8dfd-b52f18004856
- Milestone: Milestone 3 (R3)

## 🔒 Key Constraints
- Genuine implementation only, no cheating or facades.
- Strict price anti-tampering: compare clientAmount against Math.round(pricing.totalInr * years * 100) / 100, throwing 400 with exact message `Price tampering detected: client provided ₹..., server authoritative total is ₹...`.
- Duration validation: integer 1 <= years <= 10.
- All 7 domain endpoints mounted under /api/domains/*.
- Storefront custom domain routing in worker/storefront.js and worker/index.js.
- Clean build: `cd frontend && npm run build`.
- Passing tests: `node tests/e2e-domains-email.test.mjs`, `node tests/canonical-storefront-url.test.mjs`.

## Current Parent
- Conversation ID: 76ef2f37-4c0f-43b4-8dfd-b52f18004856
- Updated: 2026-10-02T09:05:00Z

## Task Summary
- **What to build**: Pluggable Domain Provider (`domainProvider.js`), Domain Service layer (`domainService.js`), Domain API routes (`domainRoutes.js`), Storefront custom domain classification and routing in `worker/storefront.js` and `worker/index.js`, and wire Buy Domain in `frontend/src/pages/EmailSettingsPage.tsx`.
- **Success criteria**: All e2e domain and email tests pass, canonical storefront url tests pass, frontend build passes.
- **Interface contracts**: PROJECT.md, Explorer handoffs 1, 2, 3.
- **Code layout**: worker/services/, worker/routes/, worker/, frontend/src/pages/.

## Key Decisions Made
- Follow the exact specification from the 3 explorer reports and `tests/e2e-domains-email.test.mjs`.

## Artifact Index
- context.md — Context and guidance
- DISPATCH.md — Dispatch prompt
- progress.md — Liveness and step tracker
- handoff.md — Final handoff report

## Change Tracker
- **Files modified**: [TBD]
- **Build status**: [TBD]
- **Pending issues**: [None]

## Quality Status
- **Build/test result**: [TBD]
- **Lint status**: [TBD]
- **Tests added/modified**: [TBD]

## Loaded Skills
- None

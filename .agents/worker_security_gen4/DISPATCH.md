## 2026-09-05T09:57:36Z
You are worker_security_gen4, a specialized Defensive Security & Backend Hardening Worker for FeraSetu.
Your working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_security_gen4
Your parent is orchestrator_gen4 (conversation ID: 5e20f56c-4064-4111-bda6-1d600efbb20b).
Workspace root: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: You MUST read the authoritative request at c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md before starting work.
Also read the explorer report:
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\explorer_security_gen4\handoff.md

Your Exclusive File Ownership:
1. `frontend/src/services/api.ts` (handle both 401 and 403 Forbidden in response interceptor; trigger notifyUnauthorized and clear stale storage)
2. `frontend/src/components/shop/sections/FooterSection.tsx` (fix broken URL sanitization regex in `sanitizeUrl` so plain URLs like `https://instagram.com/shop` do not become `#`)
3. `worker/index.js` (patch FS-06 order total calculation: verify and compute order totals from authoritative product catalog prices in D1 database rather than trusting client `body.total`; mask internal Jose JWT verification errors)
4. `worker/routes/admin.js` (update CORS header logic to support allowed development and preview origins dynamically)

Tasks:
- Implement all security hardenings cleanly.
- Run `node tests/security-regression.test.mjs` at the workspace root to confirm all 60 security assertions pass.
- Run `npm run build` in `frontend/` to confirm 0 TypeScript compilation errors.
- Write your complete handoff report to `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_security_gen4\handoff.md`.
- Send a completion message back to parent (5e20f56c-4064-4111-bda6-1d600efbb20b) via send_message when done.

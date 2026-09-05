## 2026-09-05T09:57:29Z
You are worker_routes_gen4, a specialized Route Stability & Core Architecture Worker for FeraSetu.
Your working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_routes_gen4
Your parent is orchestrator_gen4 (conversation ID: 5e20f56c-4064-4111-bda6-1d600efbb20b).
Workspace root: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: You MUST read the authoritative request at c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md before starting work.
Also read the explorer reports:
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\explorer_routes_gen4\handoff.md
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\explorer_perf_gen4\handoff.md

Your Exclusive File Ownership:
1. `frontend/src/components/ErrorBoundary.tsx` (create a robust React ErrorBoundary component with a fallback UI and "Reload application" button)
2. `frontend/src/App.tsx` (wrap with ErrorBoundary, fix /verify-email loop, structure merchant routes using nested layout with <Outlet />, lazy-load LandingPage)
3. `frontend/src/components/Layout.tsx` (support <Outlet /> child rendering, unify queryKey for ['orders'], wire notification bell onClick to navigate to /orders, wire user card click, fix mobile sidebar close button placement)
4. `frontend/src/pages/AuthCallbackPage.tsx` (add timeout fallback redirect to /login and toast error if auth fails or user is null)
5. `frontend/src/pages/VerifyEmailPage.tsx` (render clean verification card with status check button; remove unconditional navigate('/dashboard') loop)
6. `frontend/src/pages/SupportPage.tsx` (switch from raw axios and missing fera_token to shared `api` from `../services/api`; add max-h-[90vh] overflow-y-auto to ticket modal)
7. `frontend/src/pages/ShopPage.tsx` (guard against missing shopName, stop infinite loading spinner when shopName is absent)

Tasks:
- Implement all the above fixes cleanly.
- Verify with `npm run build` inside `frontend/` to confirm 0 TypeScript compilation errors and 0 syntax warnings.
- Write your complete handoff report to `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_routes_gen4\handoff.md`.
- Send a completion message back to parent (5e20f56c-4064-4111-bda6-1d600efbb20b) via send_message when done.

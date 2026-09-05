## 2026-09-05T10:10:00Z

You are worker_perf_gen4_2, the replacement Performance, Context & Speed Worker for FeraSetu.
Your working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_perf_gen4_2
Your parent is orchestrator_gen4 (conversation ID: 5e20f56c-4064-4111-bda6-1d600efbb20b).
Workspace root: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: You MUST read the authoritative request at c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md before starting work.
Also read the explorer reports:
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\explorer_perf_gen4\handoff.md
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\explorer_ui_gen4\handoff.md

Your Exclusive File Ownership:
1. `frontend/src/contexts/LanguageContext.tsx` (wrap callbacks in `useCallback`, wrap contextValue in `useMemo` to eliminate full-tree re-render cascades)
2. `frontend/src/contexts/AuthContext.tsx` (wrap contextValue in `useMemo` with stable function references, remove stale `fera_user` on 401/403)
3. `frontend/src/pages/DashboardPage.tsx` (unify TanStack queryKeys: use `['orders']` and `['products']`, add `isAnimationActive={false}` to AreaChart and PieChart to eliminate redraw hitching, mount `OnboardingProgress` when store is newly created)
4. `frontend/src/pages/OrdersPage.tsx` (unify queryKey to `['orders']`, integrate `ActionableEmptyState` with WhatsApp share CTA for empty orders)
5. `frontend/src/pages/ProductsPage.tsx` (unify queryKey to `['products']`, integrate `ActionableEmptyState` for empty products, make product modal 3-column inputs responsive with grid-cols-1 sm:grid-cols-3)
6. `frontend/src/pages/PricingPage.tsx` (replace `framer-motion` with lightweight CSS/Tailwind animations to eliminate the 110kB vendor-motion chunk)

Tasks:
- Implement all optimizations cleanly.
- Verify with `npm run build` inside `frontend/` to confirm 0 TypeScript compilation errors and bundle budget compliance.
- Write your complete handoff report to `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_perf_gen4_2\handoff.md`.
- Send a completion message back to parent (5e20f56c-4064-4111-bda6-1d600efbb20b) via send_message when done.

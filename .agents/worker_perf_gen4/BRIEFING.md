# BRIEFING — 2026-09-05T09:58:00Z

## Mission
Implement frontend performance, context memoization, query key unification, empty states, and bundle optimizations across the 6 exclusively owned files in FeraSetu.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_perf_gen4
- Original parent: 5e20f56c-4064-4111-bda6-1d600efbb20b
- Milestone: gen4-performance-optimization

## 🔒 Key Constraints
- Exclusive file ownership:
  1. `frontend/src/contexts/LanguageContext.tsx`
  2. `frontend/src/contexts/AuthContext.tsx`
  3. `frontend/src/pages/DashboardPage.tsx`
  4. `frontend/src/pages/OrdersPage.tsx`
  5. `frontend/src/pages/ProductsPage.tsx`
  6. `frontend/src/pages/PricingPage.tsx`
- Do NOT cheat, mock, hardcode, or create facade implementations.
- Zero TypeScript compilation errors on `npm run build`.
- Maintain bundle budget compliance and eliminate vendor-motion.

## Current Parent
- Conversation ID: 5e20f56c-4064-4111-bda6-1d600efbb20b
- Updated: not yet

## Task Summary
- **What to build**:
  1. `LanguageContext.tsx`: wrap `setLanguage`, `translate`, `getLocalizedLink` in `useCallback`; wrap `contextValue` in `useMemo`.
  2. `AuthContext.tsx`: wrap `contextValue` in `useMemo` with stable function references; remove stale `fera_user` on 401/403.
  3. `DashboardPage.tsx`: unify TanStack queryKeys (`['orders']`, `['products']`), set `isAnimationActive={false}` on AreaChart and PieChart, mount `OnboardingProgress` when store is newly created.
  4. `OrdersPage.tsx`: unify queryKey to `['orders']`, integrate `ActionableEmptyState` with WhatsApp share CTA for empty orders.
  5. `ProductsPage.tsx`: unify queryKey to `['products']`, integrate `ActionableEmptyState` for empty products, make modal 3-column inputs responsive (`grid-cols-1 sm:grid-cols-3`).
  6. `PricingPage.tsx`: replace `framer-motion` with lightweight CSS/Tailwind animations to eliminate the 110kB `vendor-motion` chunk.
- **Success criteria**:
  - All 6 files cleanly modified per specifications.
  - `npm run build` in `frontend/` succeeds with 0 errors.
  - `vendor-motion` chunk eliminated from Vite build output.
  - All existing functionality and contracts intact.
- **Interface contracts**: `frontend/src/`
- **Code layout**: React + Vite + TypeScript frontend

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending verification
- **Lint status**: Clean
- **Tests added/modified**: Verified build output and bundle size

## Loaded Skills
- Source: modern-web-guidance
- Core methodology: Best practices for responsive CSS/Tailwind, React memoization, eliminating bundle overhead.

## Key Decisions Made
- Proceeding file by file systematically:
  1. `LanguageContext.tsx`
  2. `AuthContext.tsx`
  3. `DashboardPage.tsx`
  4. `OrdersPage.tsx`
  5. `ProductsPage.tsx`
  6. `PricingPage.tsx`
  Followed by `npm run build` verification.

## Artifact Index
- `.agents/worker_perf_gen4/BRIEFING.md` — persistent memory
- `.agents/worker_perf_gen4/progress.md` — heartbeat and progress tracker
- `.agents/worker_perf_gen4/handoff.md` — final handoff report

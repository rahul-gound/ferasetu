# Orchestrator Plan — Generation 5

## Objective
Drive FeraSetu through final implementation of Phase 2 UI Consistency & Responsive Polish, execute Phase 3 Multi-Agent Verification & Gating (Reviewers, Challengers, Forensic Auditor), and deliver the final comprehensive project completion report to Sentinel.

## Phase Breakdown

### Phase 2 Completion: UI Consistency & Visual Polish Worker
- Target Worker: `worker_ui_gen5` (`teamwork_preview_worker`)
- Scope:
  1. `frontend/src/pages/EmailSettingsPage.tsx`: Standardize all invalid Tailwind classes (`bg-surface`, `border-border`, `text-text`, etc.) to standard Tailwind tokens (`bg-white`, `border-slate-200`, `text-slate-900`, `text-slate-500`, etc.).
  2. `frontend/src/pages/GetStartedPage.tsx`: Fix mobile grid layout to ensure responsive 1-column layout on mobile / 2-column on desktop (`grid grid-cols-1 md:grid-cols-2`).
  3. `frontend/src/pages/FeraAIPage.tsx`: Resolve WCAG AA contrast violations (update text colors to `#94A3B8`), adjust layout height to fit cleanly inside `Layout.tsx` without double-scroll, and clean up message dispatch state update.
  4. `frontend/src/pages/AnalyticsPage.tsx`: Align chart color tokens to primary `#0052FF`, add `ActionableEmptyState` fallback when zero data is present.
  5. `frontend/src/pages/AdminMeetingsPage.tsx`: Add defensive optional chaining on customer search terms (`m.customer_name?.toLowerCase()`, `m.customer_email?.toLowerCase()`).
  6. `frontend/src/pages/AdminOrdersPage.tsx`: Add defensive null-guard and string coercion on order ID slicing (`String(order.id || '').slice(0, 8)`).
  7. SEO Landing Pages (`OnlineDukaanBanaye.tsx`, `FreeOnlineStore.tsx`, `ShopifyAlternativeIndia.tsx`, `KiranaStoreOnline.tsx`): Replace raw `<a href="/register">` tags with `<Link to="/register">` for seamless SPA navigation.
- Verification Criterion: Worker must execute `npm run build` in `frontend/` and report 0 TypeScript compilation errors and 0 syntax warnings.

### Phase 3: Comprehensive Verification & Gating
- Gating Pattern:
  - 2 Independent Reviewers (`teamwork_preview_reviewer`):
    - `reviewer_1_gen5`: Inspect route stability, bundle health, lazy routes, and UI styling compliance. Run `npm run build` in `frontend/`.
    - `reviewer_2_gen5`: Inspect defensive security, authentication guards, API token handling, input sanitization, and regression test suites. Run `node tests/security-regression.test.mjs`.
  - 2 Challengers (`teamwork_preview_challenger`):
    - `challenger_1_gen5`: Empirical stress-testing of public & SEO routes, mock store transitions, navigation, and visual token consistency.
    - `challenger_2_gen5`: Adversarial route security testing (unauthenticated redirect checks, parameter tampering, XSS injection attempts).
  - 1 Forensic Auditor (`teamwork_preview_auditor`):
    - Static analysis and execution verification against hardcoded outputs, mock facades, and cheating shortcuts.
- Gate Evaluation in `GATE_STATUS.md`:
  - Strict AND: All Reviewers APPROVE, All Challengers PASS, Auditor CLEAN.

### Phase 4: Final Synthesis & Sentinel Reporting
- Synthesize all findings and verification reports.
- Compile production readiness documentation and update project state.
- Write final handoff and notify Sentinel (`e545af24-7c5f-4212-a8df-5657db452715`).

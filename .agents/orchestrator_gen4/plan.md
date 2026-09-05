# Execution Plan: Comprehensive Multi-Page Audit, Verification, Performance, UI Polish, and Security Hardening

## Overview
As Project Orchestrator (Generation 4), orchestrate a large specialized multi-agent team to audit, optimize, fix, and defensively secure every route in FeraSetu across public, SEO, authenticated merchant, and admin flows.

## Sub-Team Architecture & Phases

### Phase 1: Parallel Investigation & Baseline Audit (Large Team Dispatch)
Spawn specialized exploration agents in parallel:
1. **Explorer 1: Route & Component Functional Auditor (`teamwork_preview_explorer`)**
   - Focus: R1 (Multi-Page & Route Functional Verification).
   - Scope: Audit all 10 public/SEO routes and 14 merchant routes.
   - Tasks: Inspect routing configuration (`App.tsx` or router setup), route definitions, component lifecycle states, empty/populated database scenarios, missing component imports, runtime error boundaries.
2. **Explorer 2: Frontend Speed & Bundle Performance Specialist (`teamwork_preview_explorer`)**
   - Focus: R2 (Frontend Speed & Bundle Performance Optimization).
   - Scope: Vite build chunks, rollup options, lazy loading, vendor chunking, re-render triggers, unmemoized calculations in charts/tables, bundle size analysis.
3. **Explorer 3: UI Consistency & Visual Polish Specialist (`teamwork_preview_explorer`)**
   - Focus: R3 (UI Consistency & Visual Polish).
   - Scope: Typography, spacing, active navigation pill styling, card borders, color contrast, responsive breakpoints (mobile, tablet, desktop), empty state and error fallback aesthetics.
4. **Explorer 4: Defensive Security & Route Hardening Specialist (`teamwork_preview_explorer`)**
   - Focus: R4 (Defensive Security & Route Access Hardening).
   - Scope: Authentication guards on protected merchant and admin routes, unauthenticated redirects to `/login`, client-side token attachment in API calls, CORS headers, input sanitization against XSS in store setup, product creation, and assistant queries, error response masking.

### Phase 2: Implementation & Fix Workers (Parallel Execution)
Based on Phase 1 findings, spawn specialized Workers:
- **Worker 1 (Route Stability & Runtime Fixes)**: Fix broken route lifecycles, missing error boundaries, and unhandled empty states.
- **Worker 2 (Performance & Code-Splitting)**: Implement route lazy-loading, manual chunking in `vite.config.ts`, query caching/memoization.
- **Worker 3 (UI Consistency & Visual Polish)**: Standardize navigation active pills, card borders, typography, empty states, and responsive styling.
- **Worker 4 (Defensive Security & Input Sanitization)**: Harden route protection guards, sanitize inputs, secure API requests.

### Phase 3: Comprehensive Verification, Stress Testing & Forensic Audit
1. **Reviewer 1 & 2 (`teamwork_preview_reviewer`)**:
   - Verify code quality, build success (`npm run build`), zero TS errors, zero syntax warnings, route accessibility.
2. **Challenger 1 & 2 (`teamwork_preview_challenger`)**:
   - Stress test route navigation, mock unauthenticated visits, verify redirection to `/login`, test input injection vectors (XSS).
3. **Forensic Auditor (`teamwork_preview_auditor`)**:
   - Zero-tolerance integrity audit: verify genuine implementation without hardcoded or mock workarounds.

### Phase 4: Gate Evaluation & Handoff
- Evaluate `GATE_STATUS.md`.
- Verify all acceptance criteria are met:
  - `npm run build` in `frontend/` succeeds with 0 TypeScript compilation errors and 0 syntax warnings.
  - All code-split chunk references and lazy routes resolve cleanly.
  - Navigating through all merchant routes produces zero console errors.
  - All interactive triggers have valid click handlers and state feedback.
  - Bundle complies with performance budgets.
  - Unauthenticated access to protected routes cleanly redirects to `/login`.
  - User input fields properly sanitize inputs.
- Synthesize findings, update `progress.md`, and report final completion.

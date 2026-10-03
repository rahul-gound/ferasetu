# Context for auditor_m3_gen9

## Mission: Forensic Integrity Audit of Milestone 3 Deliverables
Independently verify code integrity and detect cheating/dummy implementations:
1. Verify `worker/services/domainProvider.js`: genuine implementation, no hardcoded responses, genuine calculations.
2. Verify `worker/services/domainService.js`: genuine service orchestration and database operations.
3. Verify `worker/routes/domainRoutes.js`: genuine route definitions and parameter validations.
4. Verify `worker/storefront.js` and `worker/index.js`: genuine edge routing.
5. Verify `frontend/src/pages/EmailSettingsPage.tsx`: genuine UI integration.
6. Check git diff / modified files for fake stubs, bypasses, or mocked shortcuts.
7. Run test suites and verify execution:
   - `node tests/e2e-domains-email.test.mjs`
   - `node tests/canonical-storefront-url.test.mjs`

Deliver binary verdict: `CLEAN` or `INTEGRITY VIOLATION` in `handoff.md`.

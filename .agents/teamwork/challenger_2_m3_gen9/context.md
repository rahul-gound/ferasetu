# Context for challenger_2_m3_gen9

## Mission: Empirical Verification of Milestone 3 Storefront Edge Resolution & API Routes
Empirically verify:
1. `worker/storefront.js` and `worker/index.js`:
   - `classifyHostname` across root, subdomains, and custom domains
   - Custom domain tenant resolution and 404 behavior for unknown domains
   - CORS origin verification for custom domains
2. `worker/routes/domainRoutes.js`:
   - Route mounting and handling
3. Test suites:
   - Run `node tests/canonical-storefront-url.test.mjs`
   - Run `node tests/e2e-domains-email.test.mjs`

Write empirical results and verdict (APPROVE or CHALLENGE) in `handoff.md`.

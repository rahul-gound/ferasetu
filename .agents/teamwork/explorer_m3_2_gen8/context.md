# Context for explorer_m3_2_gen8

## Mission
Investigate the existing worker backend code for Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture).
Focus on:
- `worker/index.js`: Request dispatching, `classifyHostname`, route mounting.
- `worker/storefront.js`: How storefront requests are served, how custom domain routing should resolve custom domains in D1 and dispatch to storefront.
- `worker/routes/`: Existing domain and email routes, how authentication/multi-tenant context is passed.
- `worker/services/cashfreeService.js`: How Cashfree order creation and verification work.
- `schema.sql` and `migrations/`: D1 tables (`email_domains`, `email_identities`, etc.) and columns.

Output your findings, file paths, integration points, and concrete implementation patterns in `.agents/teamwork/explorer_m3_2_gen8/handoff.md`.

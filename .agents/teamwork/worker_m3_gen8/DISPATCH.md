## 2026-10-02T05:41:53Z
You are worker_m3_gen8.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\worker_m3_gen8
Your project root is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

Authoritative Request:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md (specifically under header ## 2026-10-01T11:23:41Z and requirement R3).
Master plan & contracts:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md.
Also read your context: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\worker_m3_gen8\context.md.

Read the 3 Explorer Handoff Reports for complete implementation blueprints:
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\explorer_m3_1_gen8\handoff.md
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\explorer_m3_2_gen8\handoff.md
- c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\spec_miner_m3_3_gen8\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Implement Milestone 3: Pluggable Domain Provider & Purchase/Connect Architecture (R3).

Files Owned Exclusively:
- `worker/services/domainProvider.js` (NEW)
- `worker/services/domainService.js` (NEW)
- `worker/routes/domainRoutes.js` (NEW)
- `worker/storefront.js`
- `worker/index.js`
- `frontend/src/pages/EmailSettingsPage.tsx` (wire purchase action)

Requirements:
1. `worker/services/domainProvider.js`:
   - `DomainProvider` base class and `SandboxDomainProvider` class with factory `createDomainProvider(env)`.
   - `search(query)`: returns `.in`, `.com`, `.store`, `.co.in` with availability and prices.
   - `checkAvailability(domain)`: normalizes domain and returns availability.
   - `getAuthoritativePricing(domain)`: computes base price, 18% GST tax (`Math.round(priceInr * 0.18 * 100) / 100`), total (`Math.round((priceInr + taxInr) * 100) / 100`).
   - `initiatePurchase({ domain, years = 1, clientAmount, organizationId, db })`: validates duration (1-10 integer years), validates price against anti-tampering (exact cent comparison), checks existing domain collision (HTTP 409), generates orderId (`cf_dom_...`) and paymentSessionId (`session_...`).
   - `verifyPurchase({ orderId, domain, organizationId, db, cashfreeStatus = 'PAID' })`: validates payment status, provisions domain in `email_domains` with `CUSTOM` type, `PENDING` status, selector `fs1`, and returns 5 DNS instructions.
   - Also export `STANDARD_TLD_PRICES`, `STANDARD_RESERVED_DOMAINS`.
2. `worker/services/domainService.js`:
   - Service layer integrating `domainProvider.js` with `cashfreeService.js`.
   - Methods: `searchDomains`, `getPricing`, `checkDomainAvailability`, `initiateDomainPurchase`, `verifyDomainPurchase`, `getDomainDnsInstructions`.
3. `worker/routes/domainRoutes.js`:
   - Expose endpoints:
     - `POST /api/domains/search`
     - `POST /api/domains/pricing`
     - `POST /api/domains/purchase/initiate`
     - `POST /api/domains/purchase/verify`
     - `POST /api/domains/connect`
     - `POST /api/domains/:id/verify`
     - `DELETE /api/domains/:id`
   - Handle WorkOS authentication and multi-tenant organization scoping.
4. `worker/index.js` & `worker/storefront.js`:
   - In `worker/storefront.js`, update `classifyHostname` to return `type: "custom_domain"` for non-base domains with dots.
   - In `worker/index.js`, mount `handleDomainRoutes` under `/api/domains/*`.
   - In `worker/index.js`, intercept `hostClassification.type === "custom_domain"`, query D1 `email_domains` for verified custom domain, and dispatch to `handleStorefrontRequest`.
   - Update CORS origin checker to permit custom domains.
5. Wire "Buy Domain" in `frontend/src/pages/EmailSettingsPage.tsx`:
   - Ensure clicking "Buy Domain" calls `/api/domains/purchase/initiate` and initiates Cashfree checkout.
6. Run Verification Commands:
   - `node tests/e2e-domains-email.test.mjs`
   - `node tests/canonical-storefront-url.test.mjs`
   - `cd frontend && npm run build`

Document all changes, files touched, and test results in:
`c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\worker_m3_gen8\handoff.md`
Update `progress.md` as you work. When finished, send a message to parent.

## 2026-10-02T03:30:47Z
You are worker_m3_gen7_r2.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m3_gen7_r2
Your project root is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

Authoritative Request:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md (specifically under header ## 2026-10-01T11:23:41Z and requirement R3).
Master plan & contracts:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md (specifically § Interface Contracts: DomainProvider Interface & Domain Purchase API).
Also check:
- .agents/worker_m1_gen7/handoff.md (Canonical Cashfree service available at `worker/services/cashfreeService.js`)
- .agents/worker_m2_gen7/handoff.md (Domains tab UI in `frontend/src/pages/EmailSettingsPage.tsx`)
- .agents/test_writer_e2e_gen7/handoff.md (E2E test suite in `tests/e2e-domains-email.test.mjs`)
- .agents/worker_m3_gen7_r2/context.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Implement Milestone 3: Pluggable Domain Provider & Purchase/Connect Architecture (R3).

Files owned exclusively:
- `worker/services/domainProvider.js`
- `worker/services/domainService.js`
- `worker/routes/domainRoutes.js`
- Storefront custom domain resolution in `worker/storefront.js` / `worker/index.js`
- Hooking domain purchase trigger in `frontend/src/pages/EmailSettingsPage.tsx`

Deliverables:
1. `worker/services/domainProvider.js`: Abstract `DomainProvider` interface with factory `createDomainProvider(env)`. Implement methods:
   - `search(query: string): Promise<Array<{ domain: string, available: boolean, priceInr: number, currency: 'INR', tld: string }>>`
   - `checkAvailability(domain: string): Promise<{ domain: string, available: boolean, priceInr: number, currency: 'INR' }>`
   - `getAuthoritativePricing(domain: string): Promise<{ domain: string, priceInr: number, taxInr: number, totalInr: number, currency: 'INR' }>`
   - `registerDomain(domain: string, contact: DomainContact, paymentRef: string): Promise<{ domain: string, orderId: string, status: 'PENDING' | 'ACTIVE', expiresAt: string }>`
   - `checkDnsStatus(domain: string): Promise<{ domain: string, verified: boolean, records: DnsRecordStatus[] }>`
   Include SandboxDomainProvider (for deterministic tests) and Cloudflare/Registrar provider.
2. `worker/services/domainService.js`: Business logic coordinating search, pricing, Cashfree order creation via `cashfreeService.js` (strictly validating amounts server-side to prevent price tampering), order status verification, and domain provisioning in D1 `email_domains`.
3. `worker/routes/domainRoutes.js`: Wire domain REST API:
   - `POST /api/domains/search`: Body `{ query: string }`
   - `POST /api/domains/purchase/initiate`: Body `{ domain: string, years?: number }` -> server price validation -> creates Cashfree order -> returns `{ orderId, paymentSessionId, amount }`
   - `POST /api/domains/purchase/verify`: Body `{ orderId: string }` -> verifies Cashfree order -> provisions domain
   Mount under `/api/domains` in `worker/index.js`.
4. Custom domain storefront routing: In `worker/storefront.js` and `worker/index.js` `classifyHostname`, resolve verified custom domains (`email_domains` WHERE domain_type = 'CUSTOM' AND verification_status = 'VERIFIED') and route requests to `handleStorefrontRequest`.
5. Frontend wiring: Ensure "Buy Domain" in `frontend/src/pages/EmailSettingsPage.tsx` integrates smoothly with `/api/domains/purchase/initiate`.
6. Run tests: `node tests/e2e-domains-email.test.mjs`, `node tests/canonical-storefront-url.test.mjs`, and frontend `npm run build`.

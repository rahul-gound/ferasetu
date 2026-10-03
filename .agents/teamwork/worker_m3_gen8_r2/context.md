# Context for worker_m3_gen8_r2

## Mission
Implement Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture).
Resuming work after predecessor `worker_m3_gen8` was interrupted by quota exhaustion.

## Inputs & Architectural Guidance
Synthesized from 3 Explorer reports:
1. `.agents/teamwork/explorer_m3_1_gen8/handoff.md`:
   - Exact method signatures, prices, and error strings required by `tests/e2e-domains-email.test.mjs`.
   - Strict price anti-tampering: compare `clientAmount` against `expectedTotal = Math.round(pricing.totalInr * years * 100) / 100`. If mismatch, throw status 400 with message `Price tampering detected: client provided ₹..., server authoritative total is ₹...`.
   - Duration check: integer `1 <= years <= 10`.
   - Return shapes for search, pricing, initiatePurchase, verifyPurchase.
2. `.agents/teamwork/explorer_m3_2_gen8/handoff.md`:
   - Storefront custom domain edge routing in `worker/storefront.js` (`classifyHostname` returns `type: "custom_domain"`) and `worker/index.js` (`resolveCustomDomainTenant` resolving verified custom domains in D1 and dispatching to `handleStorefrontRequest`).
   - Mounting `handleDomainRoutes` in `worker/index.js` under `/api/domains/*`.
3. `.agents/teamwork/spec_miner_m3_3_gen8/handoff.md`:
   - RFC 1035 / 1123 domain validation rules (total length <= 253, label length <= 63, hyphen rules, reserved/platform domains).
   - 5 DNS records generation and DoH verification.

## Owned Files
- `worker/services/domainProvider.js` (NEW)
- `worker/services/domainService.js` (NEW)
- `worker/routes/domainRoutes.js` (NEW)
- `worker/storefront.js`
- `worker/index.js`
- `frontend/src/pages/EmailSettingsPage.tsx` (domain purchase trigger hookup)

## Verification Commands
- `node tests/e2e-domains-email.test.mjs`
- `node tests/canonical-storefront-url.test.mjs`
- `cd frontend && npm run build`

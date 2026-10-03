## 2026-10-02T11:07:19Z

Resolve the 3 findings from Reviewer 2 & Challenger 2:
1. [CRITICAL] In `worker/index.js`, harden `isOriginAllowed` and `getCorsHeaders`:
   - Never allow arbitrary `custom_domain` origins blindly (prevent reflecting `https://evil-phishing-attacker.com`).
   - A custom domain origin is allowed ONLY IF it is a verified custom domain (e.g. check `isVerifiedCustomDomain(host)` via in-memory verified cache or lookup) or matches same-host.
   - For unverified / unknown external origins, `isOriginAllowed` must return `false`, falling back to `https://ferasetu.com`.
2. [MAJOR] In `worker/index.js:resolveStorefrontOrgId`:
   - Add handling for `hostInfo.type === "custom_domain"` and `refHostInfo.type === "custom_domain"` by resolving the custom domain tenant via `resolveCustomDomainTenant`.
   - Ensure storefront customer API endpoints (like `/api/storefront/customer/me` and `/api/storefront/cart`) on custom domains resolve their organization ID without throwing HTTP 400.
3. [MINOR] In `worker/storefront.js:199` and `worker/services/domainService.js:434`:
   - Sanitize fallback `organization_id` by replacing underscores with hyphens: `(domRow.organization_id || '').replace(/_/g, '-')` so it passes `isValidMerchantSlug`.

VERIFICATION:
Run and ensure 100% pass:
- `node tests/e2e-domains-email.test.mjs`
- `node tests/canonical-storefront-url.test.mjs`
- `node tests/challenger-edge-dispatch.test.mjs`
- `cd frontend && npm run build`

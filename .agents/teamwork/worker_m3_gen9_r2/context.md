# Context for worker_m3_gen9_r2 (Iteration 2: Milestone 3 Remediation)

## Mission: Resolve Reviewer 2 & Challenger 2 Findings for Milestone 3

### Core Task:
Fix the 3 findings reported in `.agents/teamwork/reviewer_2_m3_gen9/handoff.md` and `tests/challenger-edge-dispatch.test.mjs`:

1. **[CRITICAL] Harden `isOriginAllowed` in `worker/index.js`**:
   - Do NOT allow arbitrary `classification.type === "custom_domain"` blindly in `isOriginAllowed`.
   - Any external domain with a dot (e.g. `https://evil-phishing-attacker.com`) must return `false` in `isOriginAllowed` and fallback to `https://ferasetu.com`.
   - A custom domain origin is allowed ONLY IF it is a verified custom domain (e.g. check in `resolveCustomDomainTenant` or verified in D1/merchant cache) or same-host.
   - Note: In `isOriginAllowed(origin, request, env)`, if `env` is available, verify the custom domain, or maintain an in-memory set of verified custom domains from `resolveCustomDomainTenant`. If the origin is unverified, `isOriginAllowed` must return `false`!
   - In `getCorsHeaders(request, env)`: pass `env` to `isOriginAllowed(origin, request, env)`.

2. **[MAJOR] Support `custom_domain` in `resolveStorefrontOrgId` in `worker/index.js`**:
   - In `resolveStorefrontOrgId`, handle `hostInfo.type === "custom_domain"`:
     ```javascript
     if (hostInfo.type === "custom_domain") {
       const customTenant = await resolveCustomDomainTenant(url.hostname, env);
       if (customTenant?.organizationId) return customTenant.organizationId;
     }
     ```
   - Also add the check for `refHostInfo.type === "custom_domain"` when inspecting `Referer`.

3. **[MINOR] Sanitize fallback storeSlug in `resolveCustomDomainTenant`**:
   - In `worker/storefront.js:199` and `worker/services/domainService.js:434`, sanitize `organization_id` fallback by replacing underscores with hyphens:
     `const slug = domRow.store_slug || domRow.subdomain || (domRow.organization_id || '').replace(/_/g, '-');`
   - Ensure it passes `isValidMerchantSlug(slug)`.

### Verification:
Run:
- `node tests/e2e-domains-email.test.mjs`
- `node tests/canonical-storefront-url.test.mjs`
- `node tests/challenger-edge-dispatch.test.mjs` (ensure Section 4 tests now pass: attacker origin rejected, storefront customer context resolved!)
- `cd frontend && npm run build`

Deliver your completion report in `.agents/teamwork/worker_m3_gen9_r2/handoff.md`.

## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-04 - Optimize getPublicShop product loading
**Learning:** `getPublicShop` was experiencing an N+1 query problem due to executing `SELECT` queries for `product_options` and `product_variants` sequentially within a loop for each product.
**Action:** Used bulk `IN (...)` queries in chunks of 100 to load `product_options` and `product_variants` efficiently, then mapped them back to the respective products in memory, significantly reducing D1 query count.

## 2026-10-04 - CodeQL configuration
**Learning:** CodeQL Action does not have permission to access the CodeQL Action API endpoints because code scanning is not enabled for this repository.
**Action:** Set `upload: never` in `github/codeql-action/analyze` to avoid 'Resource not accessible by integration' errors.

## 2026-10-04 - CI workflow fixes
**Learning:** CI failures occurred due to mismatched package-lock.json with npm ci, trufflehog `--fail` argument duplication, Dependabot fetch-metadata running on non-dependabot PRs, and CodeQL v3 deprecation and missing permissions for upload. Also CodeQL language matrix should be combined.
**Action:** Changed `npm ci` to `npm install`, removed `--fail` from trufflehog `extra_args`, added `if:` condition to Dependabot job, bumped CodeQL actions to v4, set `upload: never`, and changed CodeQL matrix from `[javascript, typescript]` to `[javascript-typescript]`.

## 2026-10-04 - Node version update
**Learning:** `actions/setup-node@v4` on Node.js 20 is deprecated in GitHub Actions, and `npm ci` was failing on Node.js 20 due to `camera-controls` requiring Node.js 22+.
**Action:** Updated `node-version` to `22` in `.github/workflows/security.yml` to resolve deprecation warnings and package requirements.

## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-04 - Optimize getPublicShop product queries to resolve N+1 bottleneck
**Learning:** Fetching `product_options` and `product_variants` sequentially inside a loop over products in `getPublicShop` created an N+1 queries bottleneck. Cloudflare D1 imposes limits on the number of bound parameters.
**Action:** Use chunked `IN (...)` bulk queries (maximum 100 parameters) and map the results in-memory instead of executing sequential queries within a loop, to avoid D1 limits and resolve N+1 bottlenecks.

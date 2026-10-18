## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-04 - Resolve N+1 query bottleneck in getPublicShop storefront metadata
**Learning:** The public storefront API in Cloudflare Workers had a severe N+1 latency bottleneck where it fetched `product_options` and `product_variants` individually for each product in a loop.
**Action:** Use chunked `IN (...)` batch lookups (handling D1's 100-parameter limit) instead of sequentially executing `env.DB.prepare()` in a loop, reducing queries dramatically.

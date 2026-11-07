## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-19 - Fix N+1 product queries in getPublicShop
**Learning:** In Cloudflare Workers, fetching options and variants for products in a `for` loop executing separate queries per product creates severe N+1 bottlenecks.
**Action:** Group these reads using chunked `IN (...)` bulk queries (max 100 parameters due to D1 limits) and map the results in-memory.

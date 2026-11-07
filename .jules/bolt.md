## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-04 - Optimize getPublicShop product N+1 queries
**Learning:** `getPublicShop` was iterating over products and fetching `product_options` and `product_variants` individually. In environments like Cloudflare Workers interfacing with D1, minimizing database round-trips is critical.
**Action:** Use chunked `IN (...)` queries (100 parameters at a time) to fetch child relationships for collections and group them in-memory instead of making multiple queries per item.

## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-04 - Optimize /api/website/public/:shopName N+1 bottlenecks
**Learning:** The `getPublicShop` function inside `worker/index.js` exhibited a massive N+1 query problem, doing 2x queries sequentially per product. We fixed it by using batched `IN (...)` statements and fetching all `product_options` and `product_variants` efficiently.
**Action:** Always fetch related entities in bulk using D1's `IN (...)` queries combined with mapping results via Javascript instead of nesting `await env.DB.prepare` calls within a loop over multiple rows.

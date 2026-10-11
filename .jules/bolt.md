## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-11 - Optimize order_items inserts
**Learning:** When inserting multiple order items, sequentially calling `.run()` causes an N+1 queries bottleneck which impacts Cloudflare Worker latency heavily.
**Action:** Group aggregate database queries using `env.DB.batch()` directly to minimize D1 database hits.

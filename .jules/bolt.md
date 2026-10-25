## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-25 - Prevent N+1 queries when fetching products in D1
**Learning:** Querying `product_options` and `product_variants` sequentially in a `for (const p of products)` loop causes a severe N+1 latency bottleneck in Cloudflare Workers because each iteration waits on network I/O to the D1 database.
**Action:** Extract product IDs, chunk them into groups of 100 to respect D1 parameter limits, and perform bulk queries using `IN (...)`, then assemble the relationships in-memory.

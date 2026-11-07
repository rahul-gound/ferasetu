## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-16 - Resolve N+1 query bottleneck for product options and variants in storefront
**Learning:** Sequential `.all()` queries for associated rows inside a loop like `for (const p of products)` creates a significant N+1 bottleneck against the D1 database in Cloudflare Workers.
**Action:** Replace looped `DB.prepare` queries with chunked `IN (...)` queries limiting to chunks of 100 parameters to avoid D1 limits, mapping the results back to parent entities in memory.

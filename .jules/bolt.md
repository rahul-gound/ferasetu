## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-15 - Optimize /api/website/public/:shopName N+1 bottlenecks
**Learning:** The Cloudflare Worker public shop endpoint `/api/website/public/:shopName` had an N+1 queries bottleneck. By using batched queries with chunked `IN (...)` clauses instead of iterating and making multiple queries in a for-loop per product, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group related entity lookups (e.g., product options) using chunked `IN (...)` bulk queries and map the results in-memory instead of executing sequential queries within a loop whenever fetching nested list data in Cloudflare Workers.

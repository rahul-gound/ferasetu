## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-03 - Optimize /api/admin/dashboard-stats N+1 bottlenecks
**Learning:** Sequential D1 query execution creates substantial wait time bottlenecks. Grouping multiple unrelated aggregate statements (like global counts and time-series rollups) in a single request array via `env.DB.batch()` eliminates latency from sequential network roundtrips.
**Action:** Combine multiple disconnected D1 database requests into a single `env.DB.batch()` call to drastically reduce Worker latency.

## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-11-03 - Optimize /api/admin/dashboard-stats N+1 query loop
**Learning:** The 7-day revenue chart generation in Cloudflare Workers had an N+1 queries bottleneck, executing 7 sequential SELECT queries inside a loop.
**Action:** Replace date-based loops with a single bulk query using `GROUP BY substr(created_at, 1, 10)` when aggregating timeseries data in D1/SQLite.

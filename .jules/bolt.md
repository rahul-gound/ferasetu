## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-08 - Optimize /api/admin/dashboard-stats N+1 bottleneck
**Learning:** The /api/admin/dashboard-stats endpoint built a 7-day revenue chart by running 7 sequential D1 queries in a for-loop. This N+1 bottleneck delayed the dashboard load. Fetching the data with a single query using a GROUP BY date approach completely eliminates the loop overhead.
**Action:** When aggregating time-series data for charts or reports, always retrieve the entire date range in a single query grouped by a time slice (e.g. SUBSTR(created_at, 1, 10) for daily) rather than querying each slice individually.

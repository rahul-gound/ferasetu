## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-12 - Optimize proPlatformService getSiteQuotas N+1 bottlenecks
**Learning:** The `getSiteQuotas` function made 4 sequential unbatched requests to Cloudflare D1 to count rows across different tables. Each `env.DB.prepare().first()` call triggered a separate roundtrip.
**Action:** Use `env.DB.batch()` to combine multiple unrelated aggregate queries (like counts on different tables) into a single request array when fetching data in Cloudflare Workers to eliminate N+1 latency.

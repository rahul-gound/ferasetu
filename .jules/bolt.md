## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-11-09 - Optimize bulk discount code generation D1 insertions
**Learning:** Bulk generation of unique discount codes performed sequential D1 `.run()` queries, resulting in severe N+1 latency bottlenecks.
**Action:** Use `env.DB.batch()` with chunks (e.g. 50 items) for bulk inserts instead of iterating sequential `.run()` calls. When expecting unique constraint collisions, fall back to sequential `.run()` loop in the `catch` block to isolate failing rows, as a single error in `.batch()` rolls back the entire chunk. Always check `typeof env.DB.batch === 'function'` for test mock support.

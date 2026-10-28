## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-28 - Optimize D1 queries with batching in admin dashboard
**Learning:** The `/api/admin/dashboard-stats` route performs multiple unrelated queries sequentially (users count, orders count, product count, total revenue, and 7 loop iterations for daily revenue). Running these sequentially introduces severe latency due to N+1 network roundtrips to the Cloudflare D1 database.
**Action:** Use `env.DB.batch(stmts)` to group unrelated aggregate queries and loop-generated queries into a single execution, significantly reducing latency and network roundtrips. Ensure a fallback is present for environments that don't support it (e.g. testing).

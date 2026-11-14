## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-26 - Optimize /api/admin/dashboard-stats N+1 bottlenecks
**Learning:** Sequential D1 queries in Cloudflare Workers can cause massive latency, even outside of loops. The admin dashboard stats endpoint was executing 4 count/sum queries and a loop of 7 daily revenue queries sequentially, resulting in 11 roundtrips.
**Action:** Use `env.DB.batch()` to combine multiple unrelated D1 queries (like row counts on different tables and daily sums) into a single request array when fetching data, eliminating N+1 latency roundtrips entirely. Always implement an `stmt.all()` loop fallback for local testing mocks that lack `.batch`.
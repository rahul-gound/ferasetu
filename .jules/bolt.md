## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-24 - Optimize historical order items backfill N+1 bottlenecks
**Learning:** Bulk insertions looping over `db.prepare().run()` cause severe N+1 latency bottlenecks when inserting historical order items during backfill.
**Action:** Map items to an array of prepared statements and execute them using `env.DB.batch()` in manageable chunks rather than sequential `.run()` calls in a loop.

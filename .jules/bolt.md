## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-09 - Optimize worker/pro/backupEngine.js D1 inserts N+1 bottleneck
**Learning:** Persisting backup items sequentially with a `for...of` loop and individual `env.DB.prepare(...).run()` calls triggered an extreme N+1 queries bottleneck because Cloudflare D1 incurs heavy overhead on individual operations.
**Action:** When inserting large sets of items in Cloudflare Workers to D1, accumulate the prepared statements and use `env.DB.batch()` in manageable chunks (e.g., 50 items) to minimize round-trips and drastically speed up execution.

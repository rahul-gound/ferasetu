## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2024-05-19 - Optimize analytics JSON parsing overhead
**Learning:** Repetitive `JSON.parse()` on identical JSON arrays in loops (like analytics over thousands of identical orders) severely bottlenecks Node.js/V8 CPU.
**Action:** Use `GROUP BY [json_column]` with `COUNT(*) as count` directly in D1 SQL queries for aggregates, which groups duplicate JSON structures at the database layer. This drastically minimizes data transfer and CPU-intensive parsing in the application layer.

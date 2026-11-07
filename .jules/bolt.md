## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-06 - Optimize storefront product variants and options N+1 query
**Learning:** The initial page load for storefronts in `worker/index.js` `getPublicShop` suffered an N+1 queries issue fetching product variants and options one-by-one for each product. By batching them using `IN (...)` and chunking to 100 to avoid D1 limits, we eliminate hundreds of potential database hits.
**Action:** When querying related models for a list of items, aggregate them upfront using chunked batched `IN` queries instead of doing `for (const x of items)` queries to prevent N+1 issues and reduce latency in Cloudflare Workers.

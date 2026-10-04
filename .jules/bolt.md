## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-04 - Optimize /api/website/public/:shopName N+1 bottlenecks
**Learning:** The Cloudflare Worker public storefront API `getPublicShop` endpoint suffered from an N+1 querying bottleneck when fetching product options and variants. Iterating over all products in a shop and making sequential queries significantly degrades performance.
**Action:** Replace iterative D1 database queries with bulk `IN (...)` queries chunked into sizes of 100 to respect SQLite limits when fetching child entities (options and variants) for a list of products.

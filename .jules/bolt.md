## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-10-04 - Optimize getPublicShop product loading
**Learning:** `getPublicShop` was experiencing an N+1 query problem due to executing `SELECT` queries for `product_options` and `product_variants` sequentially within a loop for each product.
**Action:** Used bulk `IN (...)` queries in chunks of 100 to load `product_options` and `product_variants` efficiently, then mapped them back to the respective products in memory, significantly reducing D1 query count.

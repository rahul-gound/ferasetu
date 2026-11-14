## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.

## 2026-11-04 - Optimize getPublicShop product options & variants N+1 bottleneck
**Learning:** The public shop endpoint `getPublicShop` had a severe N+1 queries bottleneck by querying `product_options` and `product_variants` in a for-loop for every product. Cloudflare D1 roundtrips add significant latency.
**Action:** Replace the loop with chunked bulk queries (up to 100 per chunk to respect D1 limits) using `IN (...)`, then group and attach them in-memory to the products.

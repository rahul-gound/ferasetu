## 2026-10-03 - Optimize /api/admin/users N+1 bottlenecks
**Learning:** The Cloudflare Worker admin dashboard /api/admin/users had an N+1 queries bottleneck. By using a single LEFT JOIN with subqueries instead of iterating and making multiple queries in a for-loop per user, we avoid doing multiple hits on the D1 database which are very costly.
**Action:** Group aggregate database queries using JOINs and subqueries directly in SQL whenever fetching list data in Cloudflare Workers.
## 2026-10-14 - Optimize /api/shop storefront N+1 product queries
**Learning:** The public storefront product-fetching logic in Cloudflare Workers had a severe N+1 query vulnerability when fetching `product_options` and `product_variants`. Making sequential D1 database queries in a loop for each product leads to significant latency, especially as the number of products scales.
**Action:** Always group related product data queries into chunked `IN (...)` bulk queries (respecting D1's 100 parameter limit) to fetch options and variants in a scalable manner, minimizing D1 API roundtrips.

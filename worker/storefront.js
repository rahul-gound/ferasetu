// FeraSetu — Merchant Storefront Gateway & Edge Proxy Module
// ==============================================================
// Handles merchant subdomains, edge asset proxying from Cloudflare Pages,
// host classification, SEO indexing guardrails, and page entitlement evaluation.

export const BASE_DOMAINS = ["ferasetu.com", "fera-search.tech"];

export const DEFAULT_PAGES_ORIGIN = "https://ferasetu.com";

export const RESERVED_SUBDOMAINS = new Set([
  "api",
  "www",
  "app",
  "admin",
  "docs",
  "status",
  "mail",
  "support",
  "beta",
  "staging",
  "dev",
  "static",
  "assets",
  "cdn",
  "test",
  "demo",
]);

export const STOREFRONT_SYSTEM_PAGES = new Set([
  "/",
  "/about",
  "/contact",
  "/faq",
  "/products",
  "/orders",
  "/cart",
  "/checkout",
  "/terms",
  "/privacy",
]);

// Plan entitlement defaults (extensible for regional configurations: IN, EU, US)
export const PLAN_PAGE_ENTITLEMENTS = {
  free: { maxCustomPages: 1, allowedSystemPages: true },
  trial: { maxCustomPages: 1, allowedSystemPages: true },
  growth: { maxCustomPages: 5, allowedSystemPages: true },
  pro: { maxCustomPages: 25, allowedSystemPages: true },
  enterprise: { maxCustomPages: Infinity, allowedSystemPages: true },
};

// In-memory module-level cache for the SPA HTML shell (index.html)
let cachedSpaHtml = null;
let cachedSpaHtmlTime = 0;
const SPA_HTML_TTL_MS = 60 * 1000; // 60 seconds (prevents stale builds on merchant subdomains)

export function clearSpaHtmlCache() {
  cachedSpaHtml = null;
  cachedSpaHtmlTime = 0;
}

// In-memory module-level cache for merchant storefront eligibility (TTL: 60s)
const merchantCache = new Map();
const MERCHANT_CACHE_TTL_MS = 60 * 1000;

export function clearMerchantCache() {
  merchantCache.clear();
}

export function getCachedMerchant(slug) {
  const cached = merchantCache.get(slug);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }
  return null;
}

export function setCachedMerchant(slug, data) {
  if (merchantCache.size > 10000) {
    const firstKey = merchantCache.keys().next().value;
    merchantCache.delete(firstKey);
  }
  merchantCache.set(slug, {
    data,
    expiresAt: Date.now() + MERCHANT_CACHE_TTL_MS,
  });
}

/**
 * Classify incoming hostname into platform root, API, reserved, merchant, or unknown.
 */
export function classifyHostname(hostname) {
  if (!hostname || typeof hostname !== "string") {
    return { type: "unknown_host", hostname };
  }

  const host = hostname.toLowerCase().trim();

  // Local development / Worker dev domains
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".workers.dev")
  ) {
    return { type: "api", host };
  }

  // Exact apex/root matches
  for (const base of BASE_DOMAINS) {
    if (host === base) {
      return { type: "platform_root", domain: base, host };
    }
  }

  // Check subdomains of known base domains
  for (const base of BASE_DOMAINS) {
    if (host.endsWith("." + base)) {
      const prefix = host.slice(0, -(base.length + 1));
      const parts = prefix.split(".");

      // Multi-level subdomains (e.g. a.b.ferasetu.com) are disallowed
      if (parts.length > 1) {
        return { type: "unknown_host", host, reason: "nested_subdomain" };
      }

      const subdomain = parts[0];

      if (subdomain === "api") {
        return { type: "api", host, subdomain, domain: base };
      }

      if (RESERVED_SUBDOMAINS.has(subdomain)) {
        return { type: "platform_reserved", host, subdomain, domain: base };
      }

      return { type: "merchant", host, slug: subdomain, subdomain, domain: base };
    }
  }

  return { type: "unknown_host", host };
}

/**
 * Validates merchant slug format:
 * - 3 to 63 lowercase alphanumeric characters with single hyphens
 * - Cannot start or end with a hyphen
 */
export function isValidMerchantSlug(slug) {
  if (!slug || typeof slug !== "string") return false;
  const lower = slug.toLowerCase();
  if (lower.length < 3 || lower.length > 63) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lower);
}

/**
 * Detects whether the request path targets a static asset.
 */
export function isStaticAsset(pathname) {
  if (!pathname || typeof pathname !== "string") return false;
  const lower = pathname.toLowerCase();
  return (
    lower.startsWith("/assets/") ||
    lower === "/favicon.ico" ||
    lower === "/site.webmanifest" ||
    lower === "/robots.txt" ||
    lower === "/og-default.png" ||
    lower === "/logo-official.png" ||
    lower === "/logo.png" ||
    lower === "/logo.webp" ||
    /\.(?:js|css|json|map|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico)$/i.test(
      lower
    )
  );
}

/**
 * Evaluates whether a requested storefront page is accessible under merchant plan entitlements.
 * Ready for future market-specific (IN, EU, US) and tier-specific entitlement enforcement.
 */
export function evaluatePageAccess({ pathname, merchant, market = "IN" }) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (STOREFRONT_SYSTEM_PAGES.has(normalizedPath)) {
    return { allowed: true, type: "system", page: normalizedPath, market };
  }

  const plan = (merchant?.plan || "free").toLowerCase();
  const entitlement =
    PLAN_PAGE_ENTITLEMENTS[plan] || PLAN_PAGE_ENTITLEMENTS.free;

  // NOTE: Paid page limits are not enforced yet, as per architecture requirements.
  return {
    allowed: true,
    type: "custom",
    page: normalizedPath,
    entitlement,
    market,
  };
}

/**
 * Determines whether a merchant storefront should be indexed by search engines.
 * Prevents thin/empty/private/blocked stores from polluting search indexes.
 */
export function isStoreEligibleForIndexing(merchant, productCount = 0) {
  if (!merchant) return false;
  if (merchant.is_blocked) return false;
  if (!merchant.is_published) return false;
  if (typeof productCount === "number" && productCount <= 0) return false;
  return true;
}

/**
 * Proxies static assets from the Cloudflare Pages origin with Cloudflare Edge Cache.
 * Cross-tenant normalized cache keys ensure that fingerprinted assets (/assets/*.js, etc.)
 * are cached once at the Cloudflare edge POP and shared across all merchant storefronts.
 */
export async function proxyPagesAsset(request, env, ctx) {
  const url = new URL(request.url);
  const pagesOrigin = (env?.PAGES_ORIGIN || DEFAULT_PAGES_ORIGIN).replace(
    /\/+$/,
    ""
  );
  const pagesHost = new URL(pagesOrigin).host;

  // Normalized cross-tenant cache key: https://ferasetu.com/assets/...
  // This allows all merchant subdomains (e.g. shop1, shop2) to share the exact same edge cache!
  const normalizedUrl = new URL(url.pathname + url.search, pagesOrigin);
  const cacheKey = new Request(normalizedUrl.toString(), { method: "GET" });

  const cache =
    typeof caches !== "undefined" && caches.default ? caches.default : null;

  if (cache && request.method === "GET") {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (cacheErr) {
      console.warn("Edge cache read warning:", cacheErr);
    }
  }

  const targetUrl = normalizedUrl;
  const headers = new Headers(request.headers);
  headers.set("Host", pagesHost);

  try {
    let response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      cf: {
        cacheEverything: true,
        cacheTtl: url.pathname.startsWith("/assets/") ? 31536000 : 86400,
      },
      signal: AbortSignal.timeout(5000),
    });

    // If a document route returned 404 from Pages, fallback to root / for SPA routing
    if (!response.ok && response.status === 404 && !isStaticAsset(url.pathname)) {
      const spaUrl = new URL("/", pagesOrigin);
      response = await fetch(spaUrl.toString(), {
        method: "GET",
        headers,
        redirect: "follow",
        cf: { cacheEverything: false, cacheTtl: 60 },
        signal: AbortSignal.timeout(5000),
      });
    }

    // Guard against upstream origin errors (such as 530 / Error 1016)
    if (!response.ok && response.status >= 500) {
      console.warn(`Static asset origin returned status ${response.status} for ${url.pathname}`);
      return new Response("Asset temporarily unavailable", {
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "SAMEORIGIN");
    responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Static fingerprinted assets get long-lived immutable caching; HTML gets revalidation
    if (url.pathname.startsWith("/assets/")) {
      responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (isStaticAsset(url.pathname)) {
      responseHeaders.set("Cache-Control", "public, max-age=86400");
    } else {
      responseHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
    }

    const clientResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

    // Store in Cloudflare Edge Cache for GET 200 responses
    if (cache && request.method === "GET" && response.status === 200) {
      const toCache = clientResponse.clone();
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(cache.put(cacheKey, toCache));
      } else {
        await cache.put(cacheKey, toCache).catch(() => {});
      }
    }

    return clientResponse;
  } catch (err) {
    console.error("Failed to proxy asset from Pages:", err);
    return new Response("Asset not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}

/**
 * Fetches the SPA HTML shell (index.html) from Pages with in-memory caching and serves it with host-isolated cache controls.
 */
export async function serveStorefrontSpa(request, env, { isEligibleForIndexing, merchantSlug, merchant }) {
  const pagesOrigin = (env?.PAGES_ORIGIN || DEFAULT_PAGES_ORIGIN).replace(
    /\/+$/,
    ""
  );
  const pagesHost = new URL(pagesOrigin).host;
  // Cloudflare Pages serves the root SPA document at "/" (HTTP 200).
  // Requesting "/index.html" returns HTTP 308 Permanent Redirect, which would bypass response.ok caching.
  const targetUrl = new URL("/", pagesOrigin);

  const fallbackHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>FeraSetu Storefront</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;

  let htmlBody = "";
  let status = 200;

  // Check in-memory fresh cache (avoids repeated origin subrequests on every HTML page load)
  if (cachedSpaHtml && Date.now() - cachedSpaHtmlTime < SPA_HTML_TTL_MS) {
    htmlBody = cachedSpaHtml;
  } else {
    const headers = new Headers(request.headers);
    headers.set("Host", pagesHost);

    try {
      const response = await fetch(targetUrl.toString(), {
        method: "GET",
        headers,
        redirect: "follow",
        cf: {
          cacheEverything: false,
          cacheTtl: 60,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok || response.status === 200) {
        let text = await response.text();
        // Strip Cloudflare Pages Analytics snippet on merchant subdomains to avoid harmless but noisy CORS/404 beacon console errors
        text = text.replace(/<!-- Cloudflare Pages Analytics -->[\s\S]*?<\/script>/gi, "");
        htmlBody = text;
        cachedSpaHtml = htmlBody;
        cachedSpaHtmlTime = Date.now();
      } else {
        // If origin returned an error (e.g. 530 Error 1016), do NOT leak it to the user.
        console.warn(`Pages origin returned status ${response.status} when fetching storefront SPA HTML`);
        htmlBody = cachedSpaHtml || fallbackHtml;
      }
    } catch (err) {
      console.warn("Origin fetch error for storefront SPA HTML, using fallback shell:", err);
      htmlBody = cachedSpaHtml || fallbackHtml;
    }
  }

  let customizedHtml = htmlBody;
  if (merchant) {
    const storeTitle = merchant.business_name || merchant.name || merchantSlug;
    customizedHtml = customizedHtml.replace(/<title>.*?<\/title>/gi, `<title>${storeTitle}</title>`);
    customizedHtml = customizedHtml.replace(/<meta property="og:title" content=".*?" \/>/gi, `<meta property="og:title" content="${storeTitle}" />`);
    customizedHtml = customizedHtml.replace(/<meta property="og:site_name" content=".*?" \/>/gi, `<meta property="og:site_name" content="${storeTitle}" />`);
    if (merchant.favicon_url) {
      customizedHtml = customizedHtml.replace(/<link rel="icon"[^>]*>/gi, `<link rel="icon" href="${merchant.favicon_url}" />`);
    }
    if (merchant.logo_url || merchant.social_image_url) {
      const img = merchant.social_image_url || merchant.logo_url;
      customizedHtml = customizedHtml.replace(/https:\/\/ferasetu\.com\/logo-official\.png/g, img);
    } else {
      customizedHtml = customizedHtml.replace(/https:\/\/ferasetu\.com\/logo-official\.png/g, '');
    }
  }

  const responseHeaders = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    // CRITICAL: Cache isolation between merchants. Prevents HTML cross-contamination.
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Vary": "Host, Accept-Encoding",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Robots-Tag": isEligibleForIndexing ? "index, follow" : "noindex, nofollow",
  });

  return new Response(customizedHtml, {
    status,
    headers: responseHeaders,
  });
}

/**
 * Handles incoming merchant storefront requests:
 * 1. Validates slug
 * 2. Routes static assets immediately to Pages asset proxy (ZERO D1 queries)
 * 3. Evaluates page route access
 * 4. Checks merchant indexing eligibility in D1 (cached for 60s)
 * 5. Serves the SPA shell with host-safe isolation headers
 */
export async function handleStorefrontRequest(request, env, ctx, hostClassification) {
  const url = new URL(request.url);
  const slug = hostClassification.slug;

  // 1. Slug format validation
  if (!isValidMerchantSlug(slug)) {
    return new Response("Invalid merchant store URL", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  }

  // 2. Static asset requests (JS, CSS, images, etc.) — strictly bypass D1
  if (isStaticAsset(url.pathname)) {
    return proxyPagesAsset(request, env, ctx);
  }

  // 3. Page route access evaluation (future page-builder hook)
  const pageEval = evaluatePageAccess({ pathname: url.pathname, market: "IN" });
  if (!pageEval.allowed) {
    return new Response("Page not accessible", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  // 4. Query merchant status in D1 if available (with 60-second in-memory cache)
  let merchant = null;
  let productCount = 0;

  const cachedData = getCachedMerchant(slug);
  if (cachedData) {
    merchant = cachedData.merchant;
    productCount = cachedData.productCount;
  } else if (env?.DB) {
    try {
      const fullHost = `${slug}.${hostClassification.domain || "ferasetu.com"}`;
      let user = null;
      try {
        user = await env.DB.prepare(
          `SELECT u.id, u.business_name, u.name, u.subdomain, u.hostname, u.is_blocked, u.plan,
                  u.market, u.plan_expires_at, u.trial_ends_at,
                  w.is_published
           FROM users u
           LEFT JOIN websites w ON w.user_id = u.id
           WHERE u.subdomain = ? OR u.hostname = ?`
        )
          .bind(slug, fullHost)
          .first();
      } catch (colErr) {
        console.warn("Primary storefront merchant lookup failed, retrying with core columns:", colErr?.message || colErr);
        try {
          user = await env.DB.prepare(
            `SELECT u.id, u.business_name, u.name, u.subdomain, u.hostname, u.plan,
                    u.market,
                    w.is_published
             FROM users u
             LEFT JOIN websites w ON w.user_id = u.id
             WHERE u.subdomain = ? OR u.hostname = ?`
          )
            .bind(slug, fullHost)
            .first();
          if (user) {
            user.is_blocked = 0;
          }
        } catch (colFallbackErr) {
          console.warn("Fallback storefront merchant lookup also failed:", colFallbackErr?.message || colFallbackErr);
        }
      }

      if (user) {
        merchant = user;
        try {
          const shopRow = await env.DB.prepare(
            "SELECT name, logo_url, favicon_url, social_image_url, primary_color FROM shops WHERE store_slug = ? OR hostname = ? LIMIT 1"
          ).bind(slug, fullHost).first();
          if (shopRow) {
            merchant.logo_url = shopRow.logo_url;
            merchant.favicon_url = shopRow.favicon_url;
            merchant.social_image_url = shopRow.social_image_url;
            merchant.name = shopRow.name || merchant.name;
          }
        } catch {}

        const countRow = await env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM products WHERE user_id = ?"
        )
          .bind(user.id)
          .first();

        productCount = countRow?.cnt || 0;
      }

      setCachedMerchant(slug, { merchant, productCount });
    } catch (dbErr) {
      console.error("D1 lookup error during storefront routing:", dbErr);
    }
  }

  if (merchant) {
    if (merchant.is_blocked) {
      return new Response("This store is currently unavailable.", {
        status: 403,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow",
          "Cache-Control": "private, no-cache, no-store",
        },
      });
    }

    if ((merchant.plan === 'trial' || merchant.plan === 'beta') && merchant.market !== 'IN') {
      const expiry = merchant.plan_expires_at || merchant.trial_ends_at;
      if (expiry && new Date(expiry).getTime() < Date.now()) {
        return new Response(
          `<!doctype html><html><head><meta charset="UTF-8"><title>Store Temporarily Unavailable</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>Store Temporarily Unavailable</h1><p>The trial period for this store has ended.</p><p>If you are the owner, please log in to your FeraSetu dashboard to upgrade your plan.</p><a href="https://ferasetu.com/login" style="color:#FF6B35;font-weight:bold;">Login to Dashboard</a></body></html>`,
          {
            status: 402,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "X-Robots-Tag": "noindex, nofollow",
              "Cache-Control": "private, no-cache, no-store",
            },
          }
        );
      }
    }
  }

  // 5. Determine indexing eligibility
  const isEligible = isStoreEligibleForIndexing(merchant, productCount);

  // 6. Serve SPA shell
  return serveStorefrontSpa(request, env, {
    isEligibleForIndexing: isEligible,
    merchantSlug: slug,
    merchant,
  });
}

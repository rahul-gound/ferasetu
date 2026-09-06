// FeraSetu — Merchant Storefront Gateway & Edge Proxy Module
// ==============================================================
// Handles merchant subdomains, edge asset proxying from Cloudflare Pages,
// host classification, SEO indexing guardrails, and page entitlement evaluation.

export const BASE_DOMAINS = ["ferasetu.com", "fera-search.tech"];

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

      return { type: "merchant", host, slug: subdomain, domain: base };
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
 * Proxies static assets from the Cloudflare Pages origin.
 */
export async function proxyPagesAsset(request, env) {
  const url = new URL(request.url);
  const pagesOrigin = (env?.PAGES_ORIGIN || "https://ferasetu.pages.dev").replace(
    /\/+$/,
    ""
  );
  const pagesHost = new URL(pagesOrigin).host;
  const targetUrl = new URL(url.pathname + url.search, pagesOrigin);

  const headers = new Headers(request.headers);
  headers.set("Host", pagesHost);

  try {
    let response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(5000),
    });

    // If a document route returned 404 from Pages, fallback to /index.html for SPA routing
    if (!response.ok && response.status === 404 && !isStaticAsset(url.pathname)) {
      const spaUrl = new URL("/index.html", pagesOrigin);
      response = await fetch(spaUrl.toString(), {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5000),
      });
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "SAMEORIGIN");
    responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
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
 * Fetches the SPA HTML shell (index.html) from Pages and serves it with host-isolated cache controls.
 */
export async function serveStorefrontSpa(request, env, { isEligibleForIndexing, merchantSlug }) {
  const pagesOrigin = (env?.PAGES_ORIGIN || "https://ferasetu.pages.dev").replace(
    /\/+$/,
    ""
  );
  const pagesHost = new URL(pagesOrigin).host;
  const targetUrl = new URL("/index.html", pagesOrigin);

  const headers = new Headers(request.headers);
  headers.set("Host", pagesHost);

  let htmlBody = "";
  let status = 200;

  try {
    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      htmlBody = await response.text();
    } else {
      status = response.status;
      htmlBody = await response.text();
    }
  } catch (err) {
    // Fallback HTML shell if Pages origin is temporarily unreachable or mocked in test environment
    htmlBody = `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>FeraSetu Storefront</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;
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

  return new Response(htmlBody, {
    status,
    headers: responseHeaders,
  });
}

/**
 * Handles incoming merchant storefront requests:
 * 1. Validates slug
 * 2. Routes static assets to Pages asset proxy
 * 3. Evaluates page route access
 * 4. Checks merchant indexing eligibility in D1
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

  // 2. Static asset requests (JS, CSS, images, etc.)
  if (isStaticAsset(url.pathname)) {
    return proxyPagesAsset(request, env);
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

  // 4. Query merchant status in D1 if available
  let merchant = null;
  let productCount = 0;

  if (env?.DB) {
    try {
      const user = await env.DB.prepare(
        `SELECT u.id, u.business_name, u.name, u.subdomain, u.is_blocked, u.plan,
                w.is_published
         FROM users u
         LEFT JOIN websites w ON w.user_id = u.id
         WHERE u.subdomain = ?`
      )
        .bind(slug)
        .first();

      if (user) {
        merchant = user;

        if (user.is_blocked) {
          return new Response("This store is currently unavailable.", {
            status: 403,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "X-Robots-Tag": "noindex, nofollow",
              "Cache-Control": "private, no-cache, no-store",
            },
          });
        }

        const countRow = await env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM products WHERE user_id = ?"
        )
          .bind(user.id)
          .first();

        productCount = countRow?.cnt || 0;
      }
    } catch (dbErr) {
      console.error("D1 lookup error during storefront routing:", dbErr);
    }
  }

  // 5. Determine indexing eligibility
  const isEligible = isStoreEligibleForIndexing(merchant, productCount);

  // 6. Serve SPA shell
  return serveStorefrontSpa(request, env, {
    isEligibleForIndexing: isEligible,
    merchantSlug: slug,
  });
}

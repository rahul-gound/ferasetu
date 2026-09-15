/**
 * FeraSetu Media Gateway & Edge CDN Proxy
 *
 * Serves media from private Backblaze B2 bucket behind Worker Custom Domain:
 * https://cdn.ferasetu.com/<media-path>
 *
 * Pipeline:
 * 1. Path validation & traversal prevention.
 * 2. Public vs private media classification (deny-by-default).
 * 3. Strict authentication & shop ownership authorization for private media.
 * 4. Cloudflare edge cache lookup (caches.default) ONLY for public media.
 * 5. Authenticated AWS SigV4 streaming from private B2 on cache miss.
 * 6. Cloudflare edge cache storage for successful 200 public responses.
 * 7. Never manually sets CF-Cache-Status (uses X-FeraSetu-Cache for diagnostics).
 * 8. Never exposes B2 credentials, raw signatures, or B2 URLs.
 */

import { B2Client, normalizeObjectKey } from './b2Client.js';
import { requireOrgContext } from '../index.js';

// Public media categories accessible on storefront without login
const PUBLIC_CATEGORIES = new Set(['products', 'logos', 'banners', 'theme']);

// Private categories requiring strict shopkeeper authentication
const PRIVATE_CATEGORIES = new Set(['invoices', 'customers', 'exports', 'documents']);

// Known media extensions and their MIME types
const MIME_TYPES = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  pdf: 'application/pdf',
};

/**
 * Infers MIME type from extension if missing or generic.
 */
function inferContentType(key, existingType) {
  if (existingType && existingType !== 'application/octet-stream' && existingType !== 'binary/octet-stream') {
    return existingType;
  }
  const ext = key.split('.').pop()?.toLowerCase();
  return MIME_TYPES[ext] || existingType || 'application/octet-stream';
}

/**
 * Emits structured JSON log for media requests without leaking secrets.
 */
export function logMediaEvent(event, data = {}) {
  const payload = {
    type: 'MEDIA_EVENT',
    event,
    timestamp: new Date().toISOString(),
    request_id: data.request_id || null,
    shop_id: data.shop_id || null,
    object_key: data.object_key || null,
    cache_status: data.cache_status || null,
    status: data.status || null,
    duration_ms: data.duration_ms !== undefined ? Math.round(data.duration_ms) : null,
  };
  if (data.error) {
    payload.error = String(data.error);
  }
  console.log(JSON.stringify(payload));
}

// Strict allowlist for root-level public fixtures
const ROOT_PUBLIC_ASSETS = new Set([
  'ferasetu-new-web.png',
]);

/**
 * Validates requested media path and prevents traversal.
 * Expected format: shops/<shop_id>/<category>/<file_name> or nested shops/<shop_id>/<category>/<subpath>/<file_name>
 */
export function parseAndValidateMediaKey(pathname) {
  if (!pathname || typeof pathname !== 'string') {
    return { valid: false, reason: 'empty_path' };
  }

  // Check for path traversal and dangerous characters
  if (
    pathname.includes('..') ||
    pathname.includes('\\') ||
    pathname.includes('//') ||
    pathname.includes('\0') ||
    /%2e/i.test(pathname) ||
    /%2f/i.test(pathname) ||
    /%5c/i.test(pathname)
  ) {
    return { valid: false, reason: 'path_traversal' };
  }

  // Normalize: remove leading/trailing slashes and optional /cdn prefix
  let clean = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (clean.startsWith('cdn/')) {
    clean = clean.slice('cdn/'.length);
  }

  if (!clean) {
    return { valid: false, reason: 'empty_path' };
  }

  // Strict allowlist for exact root-level fixtures (e.g. ferasetu-new-web.png)
  if (ROOT_PUBLIC_ASSETS.has(clean)) {
    return {
      valid: true,
      objectKey: clean,
      shopId: null,
      category: 'products',
      filename: clean,
      isPublic: true,
      isPrivate: false,
      isVersioned: false,
    };
  }

  // Key must match: shops/<shop_id>/<category>/<remaining...>
  const parts = clean.split('/');
  if (parts.length < 4 || parts[0] !== 'shops') {
    return { valid: false, reason: 'invalid_format' };
  }

  const shopId = parts[1];
  const category = parts[2].toLowerCase();
  const remainingSegments = parts.slice(3);

  // Validate characters in shopId and category
  if (!/^[a-zA-Z0-9_-]+$/.test(shopId)) {
    return { valid: false, reason: 'invalid_shop_id' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(category)) {
    return { valid: false, reason: 'invalid_category' };
  }

  // Validate each subsegment individually
  for (const seg of remainingSegments) {
    if (!seg || seg === '.' || seg === '..') {
      return { valid: false, reason: 'path_traversal' };
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(seg)) {
      return { valid: false, reason: 'invalid_filename' };
    }
  }

  const filename = remainingSegments[remainingSegments.length - 1];
  const isPublic = PUBLIC_CATEGORIES.has(category);
  const isPrivate = !isPublic; // Deny by default: any unlisted category is private

  // Check if filename is versioned (e.g. -v1.webp, -v1726000000.jpg, or contains uuid-v)
  const isVersioned = /-v[0-9]+/i.test(filename) || /[0-9a-f]{8}-[0-9a-f]{4}/i.test(filename);

  return {
    valid: true,
    objectKey: clean,
    shopId,
    category,
    filename,
    isPublic,
    isPrivate,
    isVersioned,
  };
}

/**
 * Instantiates B2Client from Worker environment.
 */
export function getB2ClientFromEnv(env) {
  const endpoint = env.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com';
  const bucketName = env.B2_BUCKET || env.B2_BUCKET_NAME || env.MEDIA_BUCKET_NAME || 'ferasetu-media-prod';
  const applicationKeyId = env.B2_APPLICATION_KEY_ID || env.B2_KEY_ID || '';
  const applicationKey = env.B2_APPLICATION_KEY || env.B2_APP_KEY || env.B2_SECRET_KEY || '';
  const region = env.B2_REGION || 'eu-central-003';

  return new B2Client({
    endpoint,
    bucketName,
    applicationKeyId,
    applicationKey,
    region,
    fetcher: env.B2_FETCHER || fetch,
  });
}

/**
 * Handles incoming CDN requests for https://cdn.ferasetu.com/<media-path>
 */
export async function handleMediaCdnRequest(request, env, ctx) {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);

  // 1. Only allow GET and HEAD methods on CDN gateway
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, HEAD',
      },
    });
  }

  // 2. Validate and parse path
  const parsed = parseAndValidateMediaKey(url.pathname);
  if (!parsed.valid) {
    logMediaEvent('invalid_path', {
      request_id: requestId,
      status: 400,
      object_key: url.pathname,
      error: parsed.reason,
      duration_ms: performance.now() - startTime,
    });
    return new Response(JSON.stringify({ error: 'Invalid media key format', reason: parsed.reason }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const { objectKey, shopId, isPublic, isPrivate, isVersioned } = parsed;

  // 3. SEPARATION: Private vs Public Media
  // Private media MUST authenticate and authorize BEFORE any cache lookup!
  if (isPrivate) {
    let authContext = null;
    try {
      // Authenticate via existing requireOrgContext
      authContext = await requireOrgContext(request, env, 'staff');
    } catch (authErr) {
      logMediaEvent('private_media_unauthorized', {
        request_id: requestId,
        shop_id: shopId,
        object_key: objectKey,
        status: 401,
        duration_ms: performance.now() - startTime,
      });
      return new Response(JSON.stringify({ error: 'Unauthorized: Authentication required for private media' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // Verify shop ownership: Shop A cannot access invoices of Shop B
    const authenticatedShopId = authContext.organization?.id || authContext.organizationId;
    if (authenticatedShopId !== shopId && authContext.user?.role !== 'platform_admin') {
      logMediaEvent('private_media_cross_tenant_denied', {
        request_id: requestId,
        shop_id: shopId,
        object_key: objectKey,
        status: 403,
        error: `Authenticated shop ${authenticatedShopId} denied access to ${shopId}`,
        duration_ms: performance.now() - startTime,
      });
      return new Response(JSON.stringify({ error: 'Forbidden: Access denied to foreign shop private resource' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // Authenticated & Authorized: fetch directly from B2, NEVER cache in public edge cache
    const b2Client = getB2ClientFromEnv(env);
    if (!b2Client.isConfigured && !env._mockB2Store && !env._mockR2Store) {
      logMediaEvent('b2_not_configured', {
        request_id: requestId,
        status: 500,
        object_key: objectKey,
        duration_ms: performance.now() - startTime,
      });
      return new Response(JSON.stringify({ error: 'Storage backend configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const b2Res = await b2Client.getObject(objectKey, {
        range: request.headers.get('range'),
        ifNoneMatch: request.headers.get('if-none-match'),
      });

      if (b2Res.status === 404) {
        return new Response(JSON.stringify({ error: 'Private media object not found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, no-store',
          },
        });
      }

      if (!b2Res.ok && b2Res.status !== 304 && b2Res.status !== 206) {
        logMediaEvent('b2_fetch_error', {
          request_id: requestId,
          status: 502,
          b2_status: b2Res.status,
          object_key: objectKey,
          duration_ms: performance.now() - startTime,
        });
        return new Response(JSON.stringify({ error: 'Upstream storage service error' }), {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, no-store',
          },
        });
      }

      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', inferContentType(objectKey, b2Res.headers.get('content-type')));
      responseHeaders.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      responseHeaders.set('X-Content-Type-Options', 'nosniff');
      responseHeaders.set('X-FeraSetu-Cache', 'BYPASS');

      if (b2Res.headers.get('content-length')) responseHeaders.set('Content-Length', b2Res.headers.get('content-length'));
      if (b2Res.headers.get('etag')) responseHeaders.set('ETag', b2Res.headers.get('etag'));
      if (b2Res.headers.get('last-modified')) responseHeaders.set('Last-Modified', b2Res.headers.get('last-modified'));
      if (b2Res.headers.get('accept-ranges')) responseHeaders.set('Accept-Ranges', b2Res.headers.get('accept-ranges'));
      if (b2Res.headers.get('content-range')) responseHeaders.set('Content-Range', b2Res.headers.get('content-range'));

      return new Response(request.method === 'HEAD' ? null : b2Res.body, {
        status: b2Res.status,
        headers: responseHeaders,
      });
    } catch (fetchErr) {
      logMediaEvent('b2_fetch_exception', {
        request_id: requestId,
        status: 502,
        object_key: objectKey,
        error: fetchErr.message,
        duration_ms: performance.now() - startTime,
      });
      return new Response(JSON.stringify({ error: 'Failed to retrieve private media' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 4. PUBLIC MEDIA PIPELINE
  // Deterministic canonical cache key (stripping query strings to avoid cache fragmentation)
  const canonicalUrl = `https://cdn.ferasetu.com/${objectKey}`;
  const cacheKey = new Request(canonicalUrl, { method: 'GET' });

  const cache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;
  const isRangeRequest = !!request.headers.get('range');

  // Check Cloudflare Edge Cache for normal GET requests (bypassed for Range requests to avoid caching partial 206)
  if (cache && request.method === 'GET' && !isRangeRequest) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        logMediaEvent('cache_hit', {
          request_id: requestId,
          shop_id: shopId,
          object_key: objectKey,
          cache_status: 'HIT',
          status: cached.status,
          duration_ms: performance.now() - startTime,
        });

        const cachedHeaders = new Headers(cached.headers);
        cachedHeaders.set('X-FeraSetu-Cache', 'HIT');
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers: cachedHeaders,
        });
      }
    } catch (cacheErr) {
      console.warn('[mediaGateway] Edge cache read error:', cacheErr);
    }
  }

  // 5. Cache MISS: Fetch from Private B2
  const b2Client = getB2ClientFromEnv(env);
  if (!b2Client.isConfigured && !env._mockB2Store && !env._mockR2Store) {
    logMediaEvent('b2_not_configured', {
      request_id: requestId,
      status: 500,
      object_key: objectKey,
      duration_ms: performance.now() - startTime,
    });
    return new Response(JSON.stringify({ error: 'Storage backend configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const b2Res = await b2Client.getObject(objectKey, {
      range: request.headers.get('range'),
      ifNoneMatch: request.headers.get('if-none-match'),
    });

    if (b2Res.status === 404) {
      logMediaEvent('object_not_found', {
        request_id: requestId,
        shop_id: shopId,
        object_key: objectKey,
        cache_status: 'MISS',
        status: 404,
        duration_ms: performance.now() - startTime,
      });
      return new Response(JSON.stringify({ error: 'Media object not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60', // Brief negative caching for 404
          'X-Content-Type-Options': 'nosniff',
          'X-FeraSetu-Cache': 'MISS',
        },
      });
    }

    if (b2Res.status === 304) {
      return new Response(null, {
        status: 304,
        headers: {
          'ETag': b2Res.headers.get('etag') || '',
          'Last-Modified': b2Res.headers.get('last-modified') || '',
          'Cache-Control': isVersioned
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=86400, stale-while-revalidate=3600',
        },
      });
    }

    if (!b2Res.ok && b2Res.status !== 206) {
      logMediaEvent('b2_fetch_error', {
        request_id: requestId,
        status: 502,
        b2_status: b2Res.status,
        object_key: objectKey,
        duration_ms: performance.now() - startTime,
      });
      return new Response(JSON.stringify({ error: 'Origin media storage unavailable' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // 6. Build response with proper caching headers
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', inferContentType(objectKey, b2Res.headers.get('content-type')));
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-FeraSetu-Cache', 'MISS');

    // Immutable 1-year caching ONLY for genuinely versioned assets; 1 day for non-versioned
    if (isVersioned) {
      responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      responseHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    }

    if (b2Res.headers.get('content-length')) responseHeaders.set('Content-Length', b2Res.headers.get('content-length'));
    if (b2Res.headers.get('etag')) responseHeaders.set('ETag', b2Res.headers.get('etag'));
    if (b2Res.headers.get('last-modified')) responseHeaders.set('Last-Modified', b2Res.headers.get('last-modified'));
    if (b2Res.headers.get('accept-ranges')) responseHeaders.set('Accept-Ranges', b2Res.headers.get('accept-ranges'));
    if (b2Res.headers.get('content-range')) responseHeaders.set('Content-Range', b2Res.headers.get('content-range'));

    const clientResponse = new Response(request.method === 'HEAD' ? null : b2Res.body, {
      status: b2Res.status,
      headers: responseHeaders,
    });

    // 7. Store full 200 GET responses in Cloudflare Edge Cache
    if (cache && request.method === 'GET' && b2Res.status === 200 && !isRangeRequest) {
      const toCache = clientResponse.clone();
      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(cache.put(cacheKey, toCache).catch(err => console.warn('Cache put error:', err)));
      } else {
        await cache.put(cacheKey, toCache).catch(err => console.warn('Cache put error:', err));
      }
    }

    logMediaEvent('cache_miss', {
      request_id: requestId,
      shop_id: shopId,
      object_key: objectKey,
      cache_status: 'MISS',
      status: clientResponse.status,
      duration_ms: performance.now() - startTime,
    });

    return clientResponse;
  } catch (err) {
    logMediaEvent('b2_fetch_exception', {
      request_id: requestId,
      status: 502,
      object_key: objectKey,
      error: err.message,
      duration_ms: performance.now() - startTime,
    });
    return new Response(JSON.stringify({ error: 'Origin media storage unavailable' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}

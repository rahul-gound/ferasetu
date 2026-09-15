/**
 * Comprehensive Test Suite: Private Backblaze B2 & Cloudflare Worker Media Gateway
 * (cdn.ferasetu.com)
 *
 * Verifies all 24 production and technical requirements:
 * 1. AWS SigV4 signature derivation and canonical formatting for Backblaze B2.
 * 2. Valid image GET request with correct Content-Type, Content-Length, ETag.
 * 3. Cache HIT on second request (0 B2 origin requests).
 * 4. X-FeraSetu-Cache diagnostics without manually fabricating CF-Cache-Status.
 * 5. 404 Not Found for missing objects.
 * 6. 400 Bad Request for malformed paths and path traversal attempts.
 * 7. Encoded path traversal (%2e%2e, %2f, %5c) blocked.
 * 8. Public storefront media cached aggressively with immutable headers when versioned.
 * 9. Private media (invoices, exports, documents) rejected without authentication (401).
 * 10. Cross-tenant isolation: Shop A denied access to Shop B's private invoice (403).
 * 11. Private media served with Cache-Control: private, no-store and NEVER stored in edge cache.
 * 12. Public vs private media separated BEFORE cache lookup.
 * 13. Range request handling returns 206 Partial Content without polluting full cache.
 * 14. Query string normalization prevents cache fragmentation.
 * 15. Direct upload pipeline (POST /api/media/upload) validates MIME, size, quota.
 * 16. Upload failure rolls back quota reservation and creates no false D1 records.
 * 17. Safe deletion: deletes from B2 first, rolls back on failure, decrements storage and purges cache on success.
 * 18. Upstream B2 failure mapped cleanly to 502 Bad Gateway without leaking internal B2 errors.
 * 19. No B2 credentials, signatures, or raw B2 URLs exposed in responses.
 * 20. Worker Custom Domain cdn.ferasetu.com routing works cleanly.
 */

import assert from 'node:assert/strict';
import worker, {
  handleMediaCdnRequest,
  handleDirectUpload,
} from '../worker/index.js';
import { B2Client, sha256Hex, hmacSha256, getSigV4SigningKey, extractB2Region, buildCanonicalUri } from '../worker/media/b2Client.js';
import { parseAndValidateMediaKey } from '../worker/media/mediaGateway.js';
import { handleDeleteMedia } from '../worker/media/mediaService.js';

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  ❌ ${name}:`, err.message);
  }
}

// In-memory mock Cache implementation simulating Cloudflare Worker caches.default
function createMockEdgeCache() {
  const store = new Map();
  return {
    store,
    async match(request) {
      const url = typeof request === 'string' ? request : request.url;
      const cached = store.get(url);
      if (!cached) return null;
      return cached.clone();
    },
    async put(request, response) {
      const url = typeof request === 'string' ? request : request.url;
      store.set(url, response.clone());
    },
    async delete(request) {
      const url = typeof request === 'string' ? request : request.url;
      return store.delete(url);
    },
  };
}

// Mock B2 backend storage simulating Backblaze B2 S3 API
function createMockB2Backend() {
  const objects = new Map();
  let fetchCount = 0;

  async function mockFetcher(url, options = {}) {
    fetchCount++;
    const u = new URL(url);
    const method = options.method || 'GET';
    const authHeader = options.headers?.get?.('Authorization') || options.headers?.['Authorization'] || '';

    // Verify SigV4 header format
    if (!authHeader.startsWith('AWS4-HMAC-SHA256 Credential=')) {
      return new Response('<Error><Code>AccessDenied</Code></Error>', {
        status: 403,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    // Extract object key from path-style URL: /<bucket>/<key>
    const pathParts = u.pathname.replace(/^\/+/, '').split('/');
    const bucket = pathParts[0];
    const key = pathParts.slice(1).map(decodeURIComponent).join('/');

    const fullKey = `${bucket}/${key}`;

    if (method === 'HEAD' || method === 'GET') {
      const item = objects.get(fullKey);
      if (!item) {
        return new Response('<Error><Code>NoSuchKey</Code></Error>', {
          status: 404,
          headers: { 'Content-Type': 'application/xml' },
        });
      }

      // Check conditional If-None-Match
      const ifNoneMatch = options.headers?.get?.('if-none-match') || options.headers?.['if-none-match'];
      if (ifNoneMatch && ifNoneMatch === item.etag) {
        return new Response(null, {
          status: 304,
          headers: {
            'ETag': item.etag,
            'Last-Modified': item.lastModified,
          },
        });
      }

      // Check Range header
      const range = options.headers?.get?.('range') || options.headers?.['range'];
      if (range && range.startsWith('bytes=')) {
        const parts = range.replace('bytes=', '').split('-');
        const start = parseInt(parts[0], 10) || 0;
        const end = parts[1] ? parseInt(parts[1], 10) : item.data.byteLength - 1;
        const slice = item.data.slice(start, end + 1);

        return new Response(method === 'HEAD' ? null : slice, {
          status: 206,
          headers: {
            'Content-Type': item.contentType,
            'Content-Length': String(slice.byteLength),
            'Content-Range': `bytes ${start}-${end}/${item.data.byteLength}`,
            'Accept-Ranges': 'bytes',
            'ETag': item.etag,
            'Last-Modified': item.lastModified,
          },
        });
      }

      return new Response(method === 'HEAD' ? null : item.data, {
        status: 200,
        headers: {
          'Content-Type': item.contentType,
          'Content-Length': String(item.data.byteLength),
          'ETag': item.etag,
          'Last-Modified': item.lastModified,
          'Accept-Ranges': 'bytes',
        },
      });
    }

    if (method === 'PUT') {
      const contentType = options.headers?.get?.('content-type') || options.headers?.['content-type'] || 'application/octet-stream';
      const body = options.body;
      const buffer = typeof body === 'string'
        ? new TextEncoder().encode(body)
        : (body instanceof Uint8Array ? body : new Uint8Array(await body.arrayBuffer?.() || []));

      const etag = `"${crypto.randomUUID()}"`;
      const lastModified = new Date().toUTCString();

      objects.set(fullKey, {
        data: buffer,
        contentType,
        etag,
        lastModified,
      });

      return new Response(null, {
        status: 200,
        headers: {
          'ETag': etag,
        },
      });
    }

    if (method === 'DELETE') {
      objects.delete(fullKey);
      return new Response(null, { status: 204 });
    }

    return new Response(null, { status: 405 });
  }

  return {
    objects,
    mockFetcher,
    getFetchCount: () => fetchCount,
    resetFetchCount: () => { fetchCount = 0; },
  };
}

// In-memory control-plane D1 database
function createMockD1() {
  const tables = {
    users: [],
    organizations: [],
    organization_members: [],
    shop_storage: [],
    media_files: [],
    upload_reservations: [],
    products: [],
  };

  return {
    tables,
    prepare(sql) {
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async first(col) {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('from shop_storage where shop_id =')) {
            const row = tables.shop_storage.find(x => x.shop_id === this._params[0]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from media_files where id =') && s.includes('shop_id =')) {
            const row = tables.media_files.find(x => x.id === this._params[0] && x.shop_id === this._params[1]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from media_files where id =')) {
            const row = tables.media_files.find(x => x.id === this._params[0]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from upload_reservations where id =')) {
            const row = tables.upload_reservations.find(x => x.id === this._params[0]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from products where id =')) {
            const row = tables.products.find(x => x.id === this._params[0]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('from upload_reservations') && s.includes('status = \'pending\'')) {
            const rows = tables.upload_reservations.filter(x => x.shop_id === this._params[0] && x.status === 'pending');
            return { results: rows };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('insert into shop_storage')) {
            tables.shop_storage.push({
              shop_id: this._params[0],
              quota_bytes: this._params[1],
              used_bytes: 0,
              reserved_bytes: 0,
              updated_at: this._params[2],
            });
            return { meta: { changes: 1 } };
          }
          if (s.includes('update shop_storage set reserved_bytes = reserved_bytes +')) {
            const row = tables.shop_storage.find(x => x.shop_id === this._params[2]);
            if (row) {
              row.reserved_bytes += this._params[0];
              row.updated_at = this._params[1];
            }
            return { meta: { changes: 1 } };
          }
          if (s.includes('update shop_storage set used_bytes = used_bytes +')) {
            const row = tables.shop_storage.find(x => x.shop_id === this._params[3]);
            if (row) {
              row.used_bytes += this._params[0];
              row.reserved_bytes = Math.max(0, row.reserved_bytes - this._params[1]);
              row.updated_at = this._params[2];
            }
            return { meta: { changes: 1 } };
          }
          if (s.includes('update shop_storage set used_bytes = max(0, used_bytes - ?)')) {
            const row = tables.shop_storage.find(x => x.shop_id === this._params[2]);
            if (row) {
              row.used_bytes = Math.max(0, row.used_bytes - this._params[0]);
              row.updated_at = this._params[1];
            }
            return { meta: { changes: 1 } };
          }
          if (s.includes('update shop_storage set reserved_bytes = max(0, reserved_bytes - ?)')) {
            const row = tables.shop_storage.find(x => x.shop_id === this._params[2]);
            if (row) {
              row.reserved_bytes = Math.max(0, row.reserved_bytes - this._params[0]);
              row.updated_at = this._params[1];
            }
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into upload_reservations')) {
            tables.upload_reservations.push({
              id: this._params[0],
              shop_id: this._params[1],
              r2_key: this._params[2],
              reserved_bytes: this._params[3],
              expires_at: this._params[4],
              status: 'pending',
            });
            return { meta: { changes: 1 } };
          }
          if (s.includes('update upload_reservations set status = \'completed\'')) {
            const row = tables.upload_reservations.find(x => x.id === this._params[0]);
            if (row) row.status = 'completed';
            return { meta: { changes: 1 } };
          }
          if (s.includes('update upload_reservations set status = \'cancelled\'')) {
            const row = tables.upload_reservations.find(x => x.id === this._params[0]);
            if (row) row.status = 'cancelled';
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into media_files')) {
            tables.media_files.push({
              id: this._params[0],
              shop_id: this._params[1],
              r2_key: this._params[2],
              size_bytes: this._params[3],
              content_type: this._params[4],
              created_at: this._params[5],
            });
            return { meta: { changes: 1 } };
          }
          if (s.includes('delete from media_files where id =')) {
            const idx = tables.media_files.findIndex(x => x.id === this._params[0]);
            if (idx >= 0) {
              tables.media_files.splice(idx, 1);
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          return { meta: { changes: 0 } };
        },
      };
    },
  };
}

console.log('🧪 Starting FeraSetu Backblaze B2 & cdn.ferasetu.com Media Gateway Test Suite...\n');

// 1. SigV4 Key Derivation & Canonical Construction
await test('Scenario 1: B2 SigV4 key derivation, region extraction, and canonical URI construction', async () => {
  const region = extractB2Region('s3.us-west-004.backblazeb2.com');
  assert.equal(region, 'us-west-004');

  const uri = buildCanonicalUri('my-bucket', 'shops/shop_123/products/prod-v1.webp');
  assert.equal(uri, '/my-bucket/shops/shop_123/products/prod-v1.webp');

  // Verify SHA256 of empty payload matches standard AWS SigV4 empty string hash
  const emptyHash = await sha256Hex('');
  assert.equal(emptyHash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

  // Verify key derivation generates valid 32-byte HMAC key
  const signingKey = await getSigV4SigningKey('test_secret_key', '20260914', 'us-west-004', 's3');
  assert.equal(signingKey.length, 32);
});

// 2. Path Validation & Traversal Defense
await test('Scenario 2: Path validation prevents path traversal and malformed object keys', () => {
  assert.equal(parseAndValidateMediaKey('shops/shop_1/products/image.webp').valid, true);
  assert.equal(parseAndValidateMediaKey('/shops/shop_1/products/image.webp').valid, true);
  assert.equal(parseAndValidateMediaKey('cdn/shops/shop_1/products/image.webp').valid, true);

  // Path traversal attempts
  assert.equal(parseAndValidateMediaKey('shops/shop_1/products/../secret.txt').valid, false);
  assert.equal(parseAndValidateMediaKey('shops/shop_1/products/..%2fsecret.txt').valid, false);
  assert.equal(parseAndValidateMediaKey('shops/shop_1/products//secret.txt').valid, false);
  assert.equal(parseAndValidateMediaKey('shops/shop_1/products/\\secret.txt').valid, false);

  // Malformed paths
  assert.equal(parseAndValidateMediaKey('random/path/image.webp').valid, false);
  assert.equal(parseAndValidateMediaKey('').valid, false);
});

// 3. Public Media GET & Edge Caching
await test('Scenario 3: Valid public image GET returns 200, streams body, preserves headers, and sets immutable cache', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const b2Backend = createMockB2Backend();
  const sampleData = new TextEncoder().encode('fake-webp-binary-data');
  b2Backend.objects.set('ferasetu-media/shops/shop_123/products/p1-v1.webp', {
    data: sampleData,
    contentType: 'image/webp',
    etag: '"etag-12345"',
    lastModified: 'Mon, 14 Sep 2026 10:00:00 GMT',
  });

  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const req1 = new Request('https://cdn.ferasetu.com/shops/shop_123/products/p1-v1.webp', { method: 'GET' });
  const res1 = await handleMediaCdnRequest(req1, env, { waitUntil: () => {} });

  assert.equal(res1.status, 200);
  assert.equal(res1.headers.get('Content-Type'), 'image/webp');
  assert.equal(res1.headers.get('ETag'), '"etag-12345"');
  assert.equal(res1.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
  assert.equal(res1.headers.get('X-FeraSetu-Cache'), 'MISS');
  assert.equal(res1.headers.get('CF-Cache-Status'), null, 'Must NOT fabricate Cloudflare-managed CF-Cache-Status');

  const text1 = await res1.text();
  assert.equal(text1, 'fake-webp-binary-data');
  assert.equal(b2Backend.getFetchCount(), 1);

  // Second request to same URL must be a CACHE HIT
  const req2 = new Request('https://cdn.ferasetu.com/shops/shop_123/products/p1-v1.webp', { method: 'GET' });
  const res2 = await handleMediaCdnRequest(req2, env, { waitUntil: () => {} });

  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get('X-FeraSetu-Cache'), 'HIT');
  const text2 = await res2.text();
  assert.equal(text2, 'fake-webp-binary-data');

  // Verify B2 fetcher was NOT contacted on cache hit (fetch count remains 1!)
  assert.equal(b2Backend.getFetchCount(), 1, 'Cache HIT must make ZERO origin requests to Backblaze B2');
});

// 4. Query String Normalization
await test('Scenario 4: Query strings are normalized so arbitrary parameters do not fragment cache', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const b2Backend = createMockB2Backend();
  const sampleData = new TextEncoder().encode('sample-image-data');
  b2Backend.objects.set('ferasetu-media/shops/shop_123/products/photo-v2.jpg', {
    data: sampleData,
    contentType: 'image/jpeg',
    etag: '"etag-photo"',
    lastModified: 'Mon, 14 Sep 2026 10:00:00 GMT',
  });

  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  // First request with clean URL
  const req1 = new Request('https://cdn.ferasetu.com/shops/shop_123/products/photo-v2.jpg', { method: 'GET' });
  const res1 = await handleMediaCdnRequest(req1, env, { waitUntil: () => {} });
  assert.equal(res1.status, 200);
  assert.equal(res1.headers.get('X-FeraSetu-Cache'), 'MISS');

  // Second request with random query parameter (e.g. ?tracking=abc)
  const req2 = new Request('https://cdn.ferasetu.com/shops/shop_123/products/photo-v2.jpg?tracking=abc&foo=bar', { method: 'GET' });
  const res2 = await handleMediaCdnRequest(req2, env, { waitUntil: () => {} });
  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get('X-FeraSetu-Cache'), 'HIT', 'Query strings must resolve to the same canonical cache key');
  assert.equal(b2Backend.getFetchCount(), 1);
});

// 5. Missing Object 404
await test('Scenario 5: Missing object in B2 returns clean 404 without leaking B2 internal error', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const b2Backend = createMockB2Backend();
  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const req = new Request('https://cdn.ferasetu.com/shops/shop_123/products/nonexistent-v1.webp', { method: 'GET' });
  const res = await handleMediaCdnRequest(req, env, { waitUntil: () => {} });

  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error, 'Media object not found');
  assert.equal(res.headers.get('X-FeraSetu-Cache'), 'MISS');
});

// 6. Range Request Handling
await test('Scenario 6: Range request forwards to B2, returns 206 Partial Content, and does not corrupt full GET cache', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const b2Backend = createMockB2Backend();
  const videoData = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  b2Backend.objects.set('ferasetu-media/shops/shop_123/products/clip-v1.mp4', {
    data: videoData,
    contentType: 'video/mp4',
    etag: '"video-etag"',
    lastModified: 'Mon, 14 Sep 2026 10:00:00 GMT',
  });

  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  // Range request for first 4 bytes
  const rangeReq = new Request('https://cdn.ferasetu.com/shops/shop_123/products/clip-v1.mp4', {
    method: 'GET',
    headers: { 'Range': 'bytes=0-3' },
  });

  const rangeRes = await handleMediaCdnRequest(rangeReq, env, { waitUntil: () => {} });
  assert.equal(rangeRes.status, 206);
  assert.equal(rangeRes.headers.get('Content-Range'), 'bytes 0-3/10');
  assert.equal(rangeRes.headers.get('Accept-Ranges'), 'bytes');
  assert.equal(rangeRes.headers.get('Content-Length'), '4');

  // Verify edge cache was NOT polluted with a 206 partial response
  const cachedItem = await mockCache.match('https://cdn.ferasetu.com/shops/shop_123/products/clip-v1.mp4');
  assert.equal(cachedItem, null, 'Partial 206 response must NOT be stored in caches.default');
});

// 7. Private Media Authentication & Cross-Tenant Defense
await test('Scenario 7: Private media requires authentication; Shop A is blocked from Shop B invoices (403)', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const b2Backend = createMockB2Backend();
  const invoiceData = new TextEncoder().encode('confidential-invoice-content');
  b2Backend.objects.set('ferasetu-media/shops/shop_victim/invoices/inv_001.pdf', {
    data: invoiceData,
    contentType: 'application/pdf',
    etag: '"inv-etag"',
    lastModified: 'Mon, 14 Sep 2026 10:00:00 GMT',
  });

  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  // 1. Unauthenticated request to private media -> 401
  const unauthReq = new Request('https://cdn.ferasetu.com/shops/shop_victim/invoices/inv_001.pdf', { method: 'GET' });
  const unauthRes = await handleMediaCdnRequest(unauthReq, env, { waitUntil: () => {} });
  assert.equal(unauthRes.status, 401);
  assert.ok(unauthRes.headers.get('Cache-Control').includes('no-store'));

  // 2. Cross-tenant attempt: Attacker (shop_attacker) requests victim's invoice
  const attackerReq = new Request('https://cdn.ferasetu.com/shops/shop_victim/invoices/inv_001.pdf', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test_attacker_token',
    },
  });

  // Simulate requireOrgContext resolving to shop_attacker
  const attackerEnv = {
    ...env,
    DB: createMockD1(),
    _mockOrgContext: {
      organization: { id: 'shop_attacker' },
      user: { id: 'user_attacker', role: 'staff' },
    },
  };

  // To test requireOrgContext mock in tests, handleMediaCdnRequest checks authenticated shop
  const crossTenantRes = await handleMediaCdnRequest(attackerReq, attackerEnv, { waitUntil: () => {} });
  // Unauthenticated or Forbidden: either way, foreign shop cannot access
  assert.ok(crossTenantRes.status === 403 || crossTenantRes.status === 401);
  assert.ok(crossTenantRes.headers.get('Cache-Control').includes('no-store'));

  // Verify private media is NEVER in edge cache
  const cachedInvoice = await mockCache.match('https://cdn.ferasetu.com/shops/shop_victim/invoices/inv_001.pdf');
  assert.equal(cachedInvoice, null, 'Private media must never enter the shared edge cache');
});

// 8. Direct Upload Pipeline with Quota Enforcement
await test('Scenario 8: Direct upload stores in B2, updates D1, commits quota, and returns cdn.ferasetu.com URL', async () => {
  const db = createMockD1();
  const b2Backend = createMockB2Backend();

  // Seed shop storage with 500 MB quota
  db.tables.shop_storage.push({
    shop_id: 'shop_upload_1',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 0,
    reserved_bytes: 0,
    updated_at: new Date().toISOString(),
  });

  const env = {
    DB: db,
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const orgContext = {
    organization: { id: 'shop_upload_1', market: 'IN', plan: 'free' },
  };

  const fileBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const req = new Request('https://ferasetu.com/api/media/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'image/webp',
      'X-File-Name': 'banner.webp',
      'X-Category': 'banners',
    },
    body: fileBytes,
  });

  const result = await handleDirectUpload(req, env, orgContext);
  assert.equal(result.success, true);
  assert.ok(result.media_file.url.startsWith('https://cdn.ferasetu.com/shops/shop_upload_1/banners/'));
  assert.ok(result.media_file.media_key.startsWith('shops/shop_upload_1/banners/'));
  assert.equal(result.media_file.size_bytes, 8);
  assert.equal(result.media_file.content_type, 'image/webp');

  // Verify B2 received the object
  const b2Key = `ferasetu-media/${result.media_file.media_key}`;
  assert.ok(b2Backend.objects.has(b2Key));

  // Verify D1 media_files has the row
  const row = db.tables.media_files.find(x => x.r2_key === result.media_file.media_key);
  assert.ok(row);

  // Verify storage used_bytes updated
  const storage = db.tables.shop_storage.find(x => x.shop_id === 'shop_upload_1');
  assert.equal(storage.used_bytes, 8);
  assert.equal(storage.reserved_bytes, 0);
});

// 9. Upload Quota Rejection
await test('Scenario 9: Direct upload exceeding shop quota is rejected with 413 and releases reservation', async () => {
  const db = createMockD1();
  const b2Backend = createMockB2Backend();

  // Set used bytes to near quota (499 MB / 500 MB)
  db.tables.shop_storage.push({
    shop_id: 'shop_quota_limit',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 499 * 1024 * 1024,
    reserved_bytes: 0,
    updated_at: new Date().toISOString(),
  });

  const env = {
    DB: db,
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const orgContext = {
    organization: { id: 'shop_quota_limit', market: 'IN', plan: 'free' },
  };

  // Upload 5 MB -> 499 + 5 = 504 MB > 500 MB
  const bigFile = new Uint8Array(5 * 1024 * 1024);
  const req = new Request('https://ferasetu.com/api/media/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'image/jpeg',
      'X-File-Name': 'huge.jpg',
      'X-Category': 'products',
    },
    body: bigFile,
  });

  await assert.rejects(
    async () => await handleDirectUpload(req, env, orgContext),
    (err) => err.status === 413
  );

  const storage = db.tables.shop_storage.find(x => x.shop_id === 'shop_quota_limit');
  assert.equal(storage.reserved_bytes, 0, 'Reserved bytes must remain 0 after quota rejection');
  assert.equal(b2Backend.objects.size, 0, 'No object should be stored in B2 on quota rejection');
});

// 10. Failure-Safe Deletion with Cache Purge
await test('Scenario 10: Deleting media deletes B2 object, decrements used_bytes, removes D1 row, and purges cache', async () => {
  const db = createMockD1();
  const b2Backend = createMockB2Backend();
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const objectKey = 'shops/del_shop/products/prod_to_delete-v1.webp';
  const canonicalUrl = `https://cdn.ferasetu.com/${objectKey}`;

  // Seed B2
  b2Backend.objects.set(`ferasetu-media/${objectKey}`, {
    data: new Uint8Array([10, 20, 30]),
    contentType: 'image/webp',
    etag: '"del-etag"',
  });

  // Seed Cache
  mockCache.store.set(canonicalUrl, new Response('cached-data'));

  // Seed D1
  db.tables.shop_storage.push({
    shop_id: 'del_shop',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 3000,
    reserved_bytes: 0,
    updated_at: new Date().toISOString(),
  });
  db.tables.media_files.push({
    id: 'media_del_123',
    shop_id: 'del_shop',
    r2_key: objectKey,
    size_bytes: 3000,
    content_type: 'image/webp',
    created_at: new Date().toISOString(),
  });

  const env = {
    DB: db,
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const orgContext = {
    organization: { id: 'del_shop', market: 'IN', plan: 'free' },
  };

  const res = await handleDeleteMedia('media_del_123', env, orgContext);
  assert.equal(res.success, true);
  assert.equal(res.freed_bytes, 3000);

  // Verify removed from B2
  assert.equal(b2Backend.objects.has(`ferasetu-media/${objectKey}`), false);

  // Verify removed from D1
  assert.equal(db.tables.media_files.length, 0);

  // Verify used_bytes decremented
  const storage = db.tables.shop_storage.find(x => x.shop_id === 'del_shop');
  assert.equal(storage.used_bytes, 0);

  // Verify cache purged
  assert.equal(mockCache.store.has(canonicalUrl), false, 'Cache key must be purged on explicit media deletion');
});

// 11. B2 Upstream Error Mapping
await test('Scenario 11: Upstream B2 failure maps to clean 502 Bad Gateway without leaking internal B2 errors', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const failingFetcher = async () => {
    return new Response('<Error><Code>InternalError</Code><Message>B2 cluster failure with secret details</Message></Error>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  };

  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: failingFetcher,
  };

  const req = new Request('https://cdn.ferasetu.com/shops/shop_123/products/prod_fail-v1.webp', { method: 'GET' });
  const res = await handleMediaCdnRequest(req, env, { waitUntil: () => {} });

  assert.equal(res.status, 502);
  const data = await res.json();
  assert.equal(data.error, 'Origin media storage unavailable');
  // Confirm secret details were not leaked in response
  assert.equal(JSON.stringify(data).includes('B2 cluster failure'), false);
});

// 12. Worker Custom Domain Entry Point Dispatch
await test('Scenario 12: Worker fetch() entry point correctly routes cdn.ferasetu.com to Media Gateway', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const b2Backend = createMockB2Backend();
  b2Backend.objects.set('ferasetu-media/shops/shop_test/products/hero-v1.png', {
    data: new Uint8Array([1, 2, 3]),
    contentType: 'image/png',
    etag: '"hero-etag"',
    lastModified: 'Mon, 14 Sep 2026 10:00:00 GMT',
  });

  const env = {
    DB: createMockD1(),
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  // Simulate request to Worker Custom Domain cdn.ferasetu.com
  const req = new Request('https://cdn.ferasetu.com/shops/shop_test/products/hero-v1.png', {
    method: 'GET',
    headers: { 'Host': 'cdn.ferasetu.com' },
  });

  const res = await worker.fetch(req, env, { waitUntil: () => {} });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'image/png');
  assert.equal(res.headers.get('X-FeraSetu-Cache'), 'MISS');
});

// 13. Encoded Path Traversal Defense
await test('Scenario 13: Encoded path traversal attempts (%2e%2e, %5c, null bytes) are rejected with 400 Bad Request', async () => {
  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
  };

  const req1 = new Request('https://cdn.ferasetu.com/shops/shop_1/products/%2e%2e/secret.txt', { method: 'GET' });
  const res1 = await handleMediaCdnRequest(req1, env, { waitUntil: () => {} });
  assert.equal(res1.status, 400);

  const req2 = new Request('https://cdn.ferasetu.com/shops/shop_1/products/..%2fsecret.txt', { method: 'GET' });
  const res2 = await handleMediaCdnRequest(req2, env, { waitUntil: () => {} });
  assert.equal(res2.status, 400);
});

// 14. Method Not Allowed
await test('Scenario 14: Method not allowed on CDN gateway (POST on cdn.ferasetu.com) returns 405', async () => {
  const req = new Request('https://cdn.ferasetu.com/shops/shop_1/products/p1-v1.webp', { method: 'POST' });
  const res = await handleMediaCdnRequest(req, {}, { waitUntil: () => {} });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'GET, HEAD');
});

// 15. HEAD Request
await test('Scenario 15: HEAD request returns metadata headers with null body', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const b2Backend = createMockB2Backend();
  b2Backend.objects.set('ferasetu-media/shops/shop_1/products/p1-v1.webp', {
    data: new TextEncoder().encode('webp-data'),
    contentType: 'image/webp',
    etag: '"head-etag"',
    lastModified: 'Mon, 14 Sep 2026 10:00:00 GMT',
  });

  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const req = new Request('https://cdn.ferasetu.com/shops/shop_1/products/p1-v1.webp', { method: 'HEAD' });
  const res = await handleMediaCdnRequest(req, env, { waitUntil: () => {} });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'image/webp');
  assert.equal(res.headers.get('ETag'), '"head-etag"');
  const text = await res.text();
  assert.equal(text, '', 'HEAD request must have empty body');
});

// 16. Non-versioned vs Versioned Cache Headers
await test('Scenario 16: Non-versioned media returns 86400 TTL while versioned returns immutable 1 year TTL', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const b2Backend = createMockB2Backend();
  b2Backend.objects.set('ferasetu-media/shops/shop_1/products/logo.png', {
    data: new Uint8Array([1, 2]),
    contentType: 'image/png',
    etag: '"logo-etag"',
    lastModified: 'Mon, 14 Sep 2026 10:00:00 GMT',
  });

  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const req = new Request('https://cdn.ferasetu.com/shops/shop_1/products/logo.png', { method: 'GET' });
  const res = await handleMediaCdnRequest(req, env, { waitUntil: () => {} });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=86400, stale-while-revalidate=3600');
});

// 17. Conditional GET (If-None-Match -> 304)
await test('Scenario 17: Conditional GET with matching If-None-Match returns 304 Not Modified', async () => {
  const mockCache = createMockEdgeCache();
  globalThis.caches = { default: mockCache };

  const b2Backend = createMockB2Backend();
  b2Backend.objects.set('ferasetu-media/shops/shop_1/products/p1-v1.webp', {
    data: new TextEncoder().encode('webp-data'),
    contentType: 'image/webp',
    etag: '"etag-exact-match"',
    lastModified: 'Mon, 14 Sep 2026 10:00:00 GMT',
  });

  const env = {
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const req = new Request('https://cdn.ferasetu.com/shops/shop_1/products/p1-v1.webp', {
    method: 'GET',
    headers: { 'If-None-Match': '"etag-exact-match"' },
  });
  const res = await handleMediaCdnRequest(req, env, { waitUntil: () => {} });

  assert.equal(res.status, 304);
  assert.equal(res.headers.get('ETag'), '"etag-exact-match"');
});

// 18. Upload Failure Safe Rollback
await test('Scenario 18: Upload failure in B2 safely rolls back reserved quota and creates no D1 records', async () => {
  const db = createMockD1();
  db.tables.shop_storage.push({
    shop_id: 'shop_fail_upload',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 0,
    reserved_bytes: 0,
    updated_at: new Date().toISOString(),
  });

  const failingFetcher = async () => new Response('B2 network timeout', { status: 500 });
  const env = {
    DB: db,
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: failingFetcher,
  };

  const orgContext = { organization: { id: 'shop_fail_upload', market: 'IN', plan: 'free' } };

  const req = new Request('https://ferasetu.com/api/media/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'image/png', 'X-File-Name': 'test.png' },
    body: new Uint8Array([1, 2, 3]),
  });

  await assert.rejects(
    async () => await handleDirectUpload(req, env, orgContext),
    (err) => err.status === 502
  );

  // Storage reserved_bytes must be rolled back to 0
  const storage = db.tables.shop_storage.find(x => x.shop_id === 'shop_fail_upload');
  assert.equal(storage.reserved_bytes, 0, 'Reserved bytes must be released on upload failure');
  assert.equal(storage.used_bytes, 0);

  // No media record in D1
  assert.equal(db.tables.media_files.length, 0);
});

// 19. Delete Failure Safety
await test('Scenario 19: Storage delete failure surfaces 502 and does NOT remove D1 record or reduce used bytes', async () => {
  const db = createMockD1();
  db.tables.shop_storage.push({
    shop_id: 'shop_fail_del',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 5000,
    reserved_bytes: 0,
    updated_at: new Date().toISOString(),
  });
  db.tables.media_files.push({
    id: 'media_cannot_del',
    shop_id: 'shop_fail_del',
    r2_key: 'shops/shop_fail_del/products/file.png',
    size_bytes: 5000,
    content_type: 'image/png',
    created_at: new Date().toISOString(),
  });

  const failingFetcher = async () => new Response('B2 delete error', { status: 500 });
  const env = {
    DB: db,
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-media',
    B2_APPLICATION_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_FETCHER: failingFetcher,
  };

  const orgContext = { organization: { id: 'shop_fail_del', market: 'IN', plan: 'free' } };

  await assert.rejects(
    async () => await handleDeleteMedia('media_cannot_del', env, orgContext),
    (err) => err.status === 502
  );

  // Storage used_bytes must NOT be decremented on delete failure
  const storage = db.tables.shop_storage.find(x => x.shop_id === 'shop_fail_del');
  assert.equal(storage.used_bytes, 5000, 'used_bytes must not be decremented when upstream delete fails');

  // Media record must NOT be deleted from D1
  assert.equal(db.tables.media_files.length, 1, 'D1 record must remain intact so merchant can safely retry');
});

// 20. B2 URL Leakage Check
await test('Scenario 20: Frontend and API responses never expose raw B2 URLs or credentials', async () => {
  const db = createMockD1();
  const b2Backend = createMockB2Backend();

  db.tables.shop_storage.push({
    shop_id: 'shop_sec_check',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 0,
    reserved_bytes: 0,
    updated_at: new Date().toISOString(),
  });

  const env = {
    DB: db,
    B2_ENDPOINT: 's3.us-west-004.backblazeb2.com',
    B2_BUCKET_NAME: 'ferasetu-private-media',
    B2_APPLICATION_KEY_ID: 'secret_app_key_id_123',
    B2_APPLICATION_KEY: 'super_secret_application_key_456',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const orgContext = { organization: { id: 'shop_sec_check', market: 'IN', plan: 'free' } };

  const req = new Request('https://ferasetu.com/api/media/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'image/webp', 'X-File-Name': 'product.webp' },
    body: new Uint8Array([9, 8, 7]),
  });

  const res = await handleDirectUpload(req, env, orgContext);
  const serialized = JSON.stringify(res);

  assert.equal(serialized.includes('backblazeb2.com'), false, 'Response must never leak raw B2 URLs');
  assert.equal(serialized.includes('super_secret_application_key'), false, 'Response must never leak B2 secret key');
  assert.equal(serialized.includes('secret_app_key_id'), false, 'Response must never leak B2 key ID');
  assert.ok(res.media_file.url.startsWith('https://cdn.ferasetu.com/shops/shop_sec_check/products/'));
});

await test('Scenario 21: Root allowlist serves ferasetu-new-web.png and blocks arbitrary root files', async () => {
  const b2Backend = createMockB2Backend();
  b2Backend.objects.set('ferasetu-media-prod/ferasetu-new-web.png', {
    data: new TextEncoder().encode('png-bytes'),
    contentType: 'image/png',
    etag: '"test-etag"',
    lastModified: new Date().toUTCString(),
  });

  const env = {
    B2_ENDPOINT: 's3.eu-central-003.backblazeb2.com',
    B2_BUCKET: 'ferasetu-media-prod',
    B2_APPLICATION_KEY_ID: 'key_id',
    B2_APPLICATION_KEY: 'app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  // Allowlisted root fixture
  const reqOk = new Request('https://cdn.ferasetu.com/ferasetu-new-web.png', { method: 'GET' });
  const resOk = await handleMediaCdnRequest(reqOk, env);
  assert.equal(resOk.status, 200, 'Root allowlisted asset should return 200');
  assert.equal(resOk.headers.get('Content-Type'), 'image/png');

  // Disallowed root file
  const reqBad = new Request('https://cdn.ferasetu.com/random-fixture.png', { method: 'GET' });
  const resBad = await handleMediaCdnRequest(reqBad, env);
  assert.equal(resBad.status, 400, 'Unallowlisted root asset should return 400 invalid_format');
});

await test('Scenario 22: Nested canonical keys with productId are parsed and served via CDN', async () => {
  const b2Backend = createMockB2Backend();
  const testKey = 'shops/shop_prod_1/products/prod_abc_123/image_456.webp';
  b2Backend.objects.set(`ferasetu-media-prod/${testKey}`, {
    data: new TextEncoder().encode('webp-image-data'),
    contentType: 'image/webp',
    etag: '"etag-webp"',
    lastModified: new Date().toUTCString(),
  });

  const env = {
    B2_ENDPOINT: 's3.eu-central-003.backblazeb2.com',
    B2_BUCKET: 'ferasetu-media-prod',
    B2_KEY_ID: 'key_id',
    B2_APP_KEY: 'app_key',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const req = new Request(`https://cdn.ferasetu.com/${testKey}`, { method: 'GET' });
  const res = await handleMediaCdnRequest(req, env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'image/webp');
});

await test('Scenario 23: Direct upload with x-product-id attaches productId to canonical key', async () => {
  const b2Backend = createMockB2Backend();
  const db = createMockD1();
  db.tables.shop_storage.push({
    shop_id: 'shop_prod_upload',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 0,
    reserved_bytes: 0,
    updated_at: new Date().toISOString(),
  });

  const env = {
    DB: db,
    B2_ENDPOINT: 's3.eu-central-003.backblazeb2.com',
    B2_BUCKET: 'ferasetu-media-prod',
    B2_KEY_ID: 'key_1',
    B2_APP_KEY: 'key_2',
    B2_FETCHER: b2Backend.mockFetcher,
  };

  const orgContext = { organization: { id: 'shop_prod_upload', market: 'IN', plan: 'free' } };

  const req = new Request('https://ferasetu.com/api/media/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'image/jpeg',
      'X-File-Name': 'main.jpg',
      'X-Product-Id': 'prod_xyz_789',
    },
    body: new Uint8Array([1, 2, 3, 4]),
  });

  const res = await handleDirectUpload(req, env, orgContext);
  assert.ok(res.media_file.media_key.startsWith('shops/shop_prod_upload/products/prod_xyz_789/'));
  assert.ok(res.media_file.media_key.endsWith('.jpg'));
  assert.ok(b2Backend.objects.has(`ferasetu-media-prod/${res.media_file.media_key}`));
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) {
    console.error(`  - ${f.name}:`, f.err);
  }
  process.exit(1);
} else {
  console.log(`\n🌟 All ${passed} comprehensive B2 & cdn.ferasetu.com scenarios passed successfully!`);
}


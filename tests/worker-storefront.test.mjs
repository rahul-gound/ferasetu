/**
 * FeraSetu — Cloudflare Worker Storefront & Gateway Tests
 *
 * Run with: node tests/worker-storefront.test.mjs
 *
 * Tests all 13 required scenarios:
 * 1. ferasetu.com (platform root)
 * 2. www.ferasetu.com (reserved www subdomain)
 * 3. api.ferasetu.com (API subdomain)
 * 4. rajeshmart-mumbai-mh-in.ferasetu.com (valid merchant)
 * 5. rajeshmart-andheri-mumbai-mh-in-2.ferasetu.com (valid merchant with numbers)
 * 6. unknown merchant hostname
 * 7. reserved hostname (e.g. admin, mail, docs)
 * 8. API request from merchant origin (CORS)
 * 9. frontend JS/CSS asset request from merchant origin
 * 10. client-side storefront route (SPA fallback)
 * 11. invalid merchant slug
 * 12. inactive/private merchant
 * 13. cache isolation between two merchants
 */

import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import {
  classifyHostname,
  isValidMerchantSlug,
  isStaticAsset,
  evaluatePageAccess,
  isStoreEligibleForIndexing,
  DEFAULT_PAGES_ORIGIN,
  clearSpaHtmlCache,
  clearMerchantCache,
  BASE_DOMAINS,
  RESERVED_SUBDOMAINS
} from '../worker/storefront.js';

let passed = 0;
let failed = 0;
const failures = [];

// Mock Cloudflare Edge Cache (caches.default) for test runner
const mockCacheStore = new Map();
globalThis.caches = {
  default: {
    async match(request) {
      const key = typeof request === 'string' ? request : request.url;
      return mockCacheStore.get(key) || null;
    },
    async put(request, response) {
      const key = typeof request === 'string' ? request : request.url;
      mockCacheStore.set(key, response);
    }
  }
};

// Mock global fetch for Pages origin to run offline deterministically
const originalFetch = globalThis.fetch;
globalThis.fetch = async (urlOrReq, init) => {
  const urlStr = typeof urlOrReq === 'string' ? urlOrReq : urlOrReq.url;
  const url = new URL(urlStr);
  
  if (url.hostname === 'ferasetu.com' || url.hostname === 'ferasetu.pages.dev') {
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
      return new Response('console.log("asset");', {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=31536000, immutable',
        }
      });
    }
    return new Response('<!doctype html><html><head><title>FeraSetu</title></head><body><div id="root"></div></body></html>', {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      }
    });
  }
  return originalFetch(urlOrReq, init);
};

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

// Mock D1 Database
function createMockDb(users = [], websites = [], products = []) {
  const db = {
    queryCount: 0,
    prepare(sql) {
      db.queryCount++;
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async first(col) {
          const lowerSql = sql.toLowerCase();
          if (lowerSql.includes('from users')) {
            const [param1, param2] = this._params;
            const user = users.find(u =>
              (u.subdomain && u.subdomain.toLowerCase() === (param1 || '').toLowerCase()) ||
              (u.custom_domain && u.custom_domain.toLowerCase() === (param2 || param1 || '').toLowerCase())
            );
            if (!user) return null;
            const site = websites.find(w => w.user_id === user.id);
            const joined = { ...user, is_published: site ? site.is_published : 0 };
            return col ? joined[col] : joined;
          }
          if (lowerSql.includes('from websites')) {
            const [userId] = this._params;
            const site = websites.find(w => w.user_id === userId && w.is_published === 1);
            if (!site) return null;
            return col ? site[col] : site;
          }
          if (lowerSql.includes('select count(*)')) {
            const [userId] = this._params;
            const count = products.filter(p => p.user_id === userId).length;
            return { cnt: count };
          }
          return null;
        },
        async all() {
          const lowerSql = sql.toLowerCase();
          if (lowerSql.includes('from products')) {
            const [userId] = this._params;
            const userProducts = products.filter(p => p.user_id === userId);
            return { results: userProducts };
          }
          return { results: [] };
        },
        async run() {
          return { changes: 1 };
        }
      };
    }
  };
  return db;
}

console.log('\n🏪 Suite: Hostname Classification & Slug Validation');

await test('1. ferasetu.com classified as platform_root', () => {
  const result = classifyHostname('ferasetu.com');
  assert.equal(result.type, 'platform_root');
  assert.equal(result.domain, 'ferasetu.com');
});

await test('2. www.ferasetu.com classified as platform_reserved (www)', () => {
  const result = classifyHostname('www.ferasetu.com');
  assert.equal(result.type, 'platform_reserved');
  assert.equal(result.subdomain, 'www');
});

await test('3. api.ferasetu.com classified as api', () => {
  const result = classifyHostname('api.ferasetu.com');
  assert.equal(result.type, 'api');
});

await test('workers.dev subdomain classified as api', () => {
  const result = classifyHostname('ferasetu.singhantima203.workers.dev');
  assert.equal(result.type, 'api');
});

await test('4. rajeshmart-mumbai-mh-in.ferasetu.com classified as merchant', () => {
  const result = classifyHostname('rajeshmart-mumbai-mh-in.ferasetu.com');
  assert.equal(result.type, 'merchant');
  assert.equal(result.slug, 'rajeshmart-mumbai-mh-in');
});

await test('5. rajeshmart-andheri-mumbai-mh-in-2.ferasetu.com classified as merchant', () => {
  const result = classifyHostname('rajeshmart-andheri-mumbai-mh-in-2.ferasetu.com');
  assert.equal(result.type, 'merchant');
  assert.equal(result.slug, 'rajeshmart-andheri-mumbai-mh-in-2');
});

await test('7. reserved hostnames (admin, mail, docs, status, support) classified as platform_reserved', () => {
  const reservedList = ['admin', 'mail', 'docs', 'status', 'support', 'app', 'beta'];
  for (const sub of reservedList) {
    const result = classifyHostname(`${sub}.ferasetu.com`);
    assert.equal(result.type, 'platform_reserved');
    assert.equal(result.subdomain, sub);
  }
});

await test('11. slug format validation (valid vs invalid)', () => {
  assert.equal(isValidMerchantSlug('rajeshmart-mumbai-mh-in'), true);
  assert.equal(isValidMerchantSlug('rajeshmart-andheri-mumbai-mh-in-2'), true);
  assert.equal(isValidMerchantSlug('ab'), false); // too short
  assert.equal(isValidMerchantSlug('-invalid'), false); // starts with hyphen
  assert.equal(isValidMerchantSlug('invalid-'), false); // ends with hyphen
  assert.equal(isValidMerchantSlug('invalid_store'), false); // underscore
  assert.equal(isValidMerchantSlug('invalid..store'), false); // dots
  assert.equal(isValidMerchantSlug('<script>'), false); // xss
});

console.log('\n🌐 Suite: Worker Ingress, Routing & Edge Gateway');

const mockUsers = [
  {
    id: 'user-rajesh-1',
    name: 'Rajesh Sharma',
    business_name: 'Rajesh Mart Mumbai',
    subdomain: 'rajeshmart-mumbai-mh-in',
    is_blocked: 0,
    plan: 'growth'
  },
  {
    id: 'user-blocked-1',
    name: 'Blocked User',
    business_name: 'Suspended Store',
    subdomain: 'blocked-store-in',
    is_blocked: 1,
    plan: 'free'
  },
  {
    id: 'user-unpublished-1',
    name: 'Unpublished User',
    business_name: 'Draft Store',
    subdomain: 'draft-store-in',
    is_blocked: 0,
    plan: 'free'
  }
];

const mockWebsites = [
  {
    id: 'site-rajesh-1',
    user_id: 'user-rajesh-1',
    name: 'Rajesh Mart Mumbai',
    template: 'modern',
    config: JSON.stringify({ themeColor: '#FF6B35' }),
    sections: JSON.stringify(['hero', 'featured_products']),
    is_published: 1
  }
];

const mockProducts = [
  {
    id: 'prod-1',
    user_id: 'user-rajesh-1',
    name: 'Basmati Rice 5kg',
    price: 450,
    created_at: new Date().toISOString()
  }
];

const mockEnv = {
  DB: createMockDb(mockUsers, mockWebsites, mockProducts),
  PAGES_ORIGIN: 'https://ferasetu.com'
};

await test('1. ferasetu.com root request proxies to Pages without taking over', async () => {
  const req = new Request('https://ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/html'));
});

await test('1b. ferasetu.com API request routes to Worker API', async () => {
  const req = new Request('https://ferasetu.com/api/health');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
});

await test('2. www.ferasetu.com proxies to Pages for main platform traffic', async () => {
  const req = new Request('https://www.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/html'));
});

await test('3. api.ferasetu.com routes directly to API handler', async () => {
  const req = new Request('https://api.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.service, 'FeraSetu Worker API');
});

await test('4. rajeshmart-mumbai-mh-in.ferasetu.com serves React SPA storefront', async () => {
  const req = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/html'));
  assert.equal(res.headers.get('x-robots-tag'), 'index, follow'); // Eligible for indexing
});

await test('5. rajeshmart-andheri-mumbai-mh-in-2.ferasetu.com serves React SPA storefront', async () => {
  const req = new Request('https://rajeshmart-andheri-mumbai-mh-in-2.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/html'));
});

await test('6. unknown merchant hostname serves SPA with noindex, nofollow guardrail', async () => {
  const req = new Request('https://unknown-shop-xyz-in.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  // Non-existent shop receives noindex to prevent indexing empty/phantom stores
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
});

await test('7. reserved hostname (admin.ferasetu.com) returns 404 Reserved platform subdomain', async () => {
  const req = new Request('https://admin.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 404);
  const text = await res.text();
  assert.ok(text.includes('Reserved platform subdomain'));
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
});

await test('8. API request from merchant origin: OPTIONS preflight succeeds with CORS', async () => {
  const req = new Request('https://api.ferasetu.com/api/products', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://rajeshmart-mumbai-mh-in.ferasetu.com',
      'Access-Control-Request-Method': 'GET',
    }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://rajeshmart-mumbai-mh-in.ferasetu.com');
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
});

await test('8c. OPTIONS preflight for /orders/create allows x-organization-id and x-shop-slug from merchant origin', async () => {
  const req = new Request('https://ferasetu.singhantima203.workers.dev/orders/create', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://sharma-virar-palghar-mh-1.ferasetu.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-organization-id,x-shop-slug'
    }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://sharma-virar-palghar-mh-1.ferasetu.com');
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  const allowHeaders = (res.headers.get('access-control-allow-headers') || '').toLowerCase();
  assert.ok(allowHeaders.includes('x-organization-id'), 'Must allow x-organization-id header');
  assert.ok(allowHeaders.includes('x-shop-slug'), 'Must allow x-shop-slug header');
});

await test('8b. Public shop API (/api/website/public/:shopName) on Worker', async () => {
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/website/public/rajeshmart-mumbai-mh-in', {
    headers: {
      'Origin': 'https://rajeshmart-mumbai-mh-in.ferasetu.com'
    }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://rajeshmart-mumbai-mh-in.ferasetu.com');
  const data = await res.json();
  assert.equal(data.shop.name, 'Rajesh Mart Mumbai');
  assert.equal(data.shop.subdomain, 'rajeshmart-mumbai-mh-in');
  assert.equal(data.products.length, 1);
  assert.equal(data.products[0].name, 'Basmati Rice 5kg');
});

await test('9. frontend JS/CSS asset request from merchant origin is proxied', async () => {
  const req = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/assets/index-D7x912a.js');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
});

await test('10. client-side storefront route (/orders, /about) serves SPA index.html', async () => {
  const req = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/about');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/html'));
});

await test('11. invalid merchant slug returns 404 with noindex', async () => {
  const req = new Request('https://invalid_store_with_underscore.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
});

await test('12. inactive/blocked merchant returns 403 Forbidden', async () => {
  const req = new Request('https://blocked-store-in.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
});

await test('12b. unpublished merchant store receives noindex, nofollow', async () => {
  const req = new Request('https://draft-store-in.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
});

await test('13. cache isolation between two merchants', async () => {
  const req1 = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/');
  const res1 = await worker.fetch(req1, mockEnv);
  
  const req2 = new Request('https://rajeshmart-andheri-mumbai-mh-in-2.ferasetu.com/');
  const res2 = await worker.fetch(req2, mockEnv);

  // Both must have private, no-store Cache-Control and Vary: Host
  const cc1 = res1.headers.get('cache-control');
  const cc2 = res2.headers.get('cache-control');
  const vary1 = res1.headers.get('vary');
  const vary2 = res2.headers.get('vary');

  assert.ok(cc1?.includes('private') && cc1?.includes('no-store'));
  assert.ok(cc2?.includes('private') && cc2?.includes('no-store'));
  assert.ok(vary1?.includes('Host'));
  assert.ok(vary2?.includes('Host'));
});

await test('14. static asset edge caching with caches.default (cross-tenant shared cache)', async () => {
  mockCacheStore.clear();
  // Request asset from tenant 1
  const req1 = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/assets/index-DCmqvoKc.js');
  const res1 = await worker.fetch(req1, mockEnv);
  assert.equal(res1.status, 200);
  assert.equal(res1.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  
  // Verify cached under normalized origin URL https://ferasetu.com/assets/index-DCmqvoKc.js
  const normalizedKey = 'https://ferasetu.com/assets/index-DCmqvoKc.js';
  assert.ok(mockCacheStore.has(normalizedKey), 'Asset must be cached under normalized key');

  // Request asset from tenant 2 (should retrieve from edge cache)
  const req2 = new Request('https://rajeshmart-andheri-mumbai-mh-in-2.ferasetu.com/assets/index-DCmqvoKc.js');
  const res2 = await worker.fetch(req2, mockEnv);
  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

await test('15. static asset requests strictly bypass D1 database queries', async () => {
  const initialQueryCount = mockEnv.DB.queryCount;
  const req = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/assets/vendor-react-CKROFyGA.js');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.equal(mockEnv.DB.queryCount, initialQueryCount, 'Static asset requests must execute 0 D1 queries');
});

await test('16. in-memory SPA HTML shell caching avoids repetitive origin fetches', async () => {
  clearSpaHtmlCache();
  let originFetchCount = 0;
  const tempFetch = globalThis.fetch;
  globalThis.fetch = async (urlOrReq, init) => {
    const urlStr = typeof urlOrReq === 'string' ? urlOrReq : urlOrReq.url;
    if (urlStr.includes('/index.html') || urlStr.endsWith('.com/')) originFetchCount++;
    return tempFetch(urlOrReq, init);
  };

  try {
    const req1 = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/');
    const res1 = await worker.fetch(req1, mockEnv);
    assert.equal(res1.status, 200);
    assert.equal(originFetchCount, 1, 'Initial request fetches index.html from origin');

    const req2 = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/products');
    const res2 = await worker.fetch(req2, mockEnv);
    assert.equal(res2.status, 200);
    assert.equal(originFetchCount, 1, 'Subsequent navigation reuses in-memory cached SPA shell');
  } finally {
    globalThis.fetch = tempFetch;
  }
});

await test('17. resilience against origin DNS/530 error (never returns Error 1016 to user)', async () => {
  clearSpaHtmlCache();
  const tempFetch = globalThis.fetch;
  // Simulate origin returning HTTP 530 / Error 1016
  globalThis.fetch = async (urlOrReq, init) => {
    return new Response('<!DOCTYPE html><title>Origin DNS error | ferasetu.pages.dev | Cloudflare</title>', {
      status: 530,
      headers: { 'Content-Type': 'text/html' }
    });
  };

  try {
    const req = new Request('https://sharma-virar-palghar-mh-1.ferasetu.com/');
    const res = await worker.fetch(req, mockEnv);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(!body.includes('Origin DNS error'), 'Must not leak Error 1016 to user');
    assert.ok(body.includes('FeraSetu Storefront') || body.includes('root'), 'Must render fallback SPA shell');
  } finally {
    globalThis.fetch = tempFetch;
  }
});

await test('18. merchant metadata TTL caching prevents duplicate D1 queries during browsing', async () => {
  clearMerchantCache();
  const initialQueryCount = mockEnv.DB.queryCount;
  
  // Visit page 1
  const req1 = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/');
  await worker.fetch(req1, mockEnv);
  const queriesAfterFirst = mockEnv.DB.queryCount;
  assert.ok(queriesAfterFirst > initialQueryCount, 'First visit queries D1');

  // Visit page 2 (within 60s TTL)
  const req2 = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/about');
  await worker.fetch(req2, mockEnv);
  assert.equal(mockEnv.DB.queryCount, queriesAfterFirst, 'Subsequent page visit reuses cached merchant metadata');
});

console.log('\n📄 Suite: Extensible Page Entitlement Hook');

await test('Future page entitlement evaluation hook works across plans and markets', () => {
  const evalFree = evaluatePageAccess({ pathname: '/custom-promo', merchant: { plan: 'free' }, market: 'IN' });
  assert.equal(evalFree.allowed, true);
  assert.equal(evalFree.type, 'custom');
  assert.equal(evalFree.entitlement.maxCustomPages, 1);
  assert.equal(evalFree.market, 'IN');

  const evalPro = evaluatePageAccess({ pathname: '/summer-sale', merchant: { plan: 'pro' }, market: 'US' });
  assert.equal(evalPro.allowed, true);
  assert.equal(evalPro.entitlement.maxCustomPages, 25);
  assert.equal(evalPro.market, 'US');

  const evalSystem = evaluatePageAccess({ pathname: '/contact', merchant: { plan: 'free' }, market: 'EU' });
  assert.equal(evalSystem.allowed, true);
  assert.equal(evalSystem.type, 'system');
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All worker storefront gateway tests passed!\n');
}

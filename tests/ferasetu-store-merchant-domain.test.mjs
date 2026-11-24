// FeraSetu — Multi-Domain Storefront Verification Test Suite
// ==============================================================
// Verifies *.ferasetu.store merchant storefront support alongside *.ferasetu.com
// with strict tenant isolation, SEO canonical safety, and zero regression.

import assert from 'node:assert/strict';
import worker, {
  isOriginAllowed,
  getCorsHeaders,
  resolveStorefrontTenant,
} from '../worker/index.js';
import {
  classifyHostname,
  isValidMerchantSlug,
  isStaticAsset,
  BASE_DOMAINS,
  RESERVED_SUBDOMAINS,
  clearMerchantCache,
  clearSpaHtmlCache,
} from '../worker/storefront.js';
import {
  generateCanonicalStorefront,
  DEFAULT_BASE_DOMAIN,
} from '../worker/canonicalHostname.js';

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

// Mock Edge Cache
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

// Mock fetch for Cloudflare Pages origin
const originalFetch = globalThis.fetch;
globalThis.fetch = async (urlOrReq, init) => {
  const urlStr = typeof urlOrReq === 'string' ? urlOrReq : urlOrReq.url;
  const url = new URL(urlStr);

  if (url.hostname === 'ferasetu.com' || url.hostname === 'ferasetu.pages.dev') {
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
      return new Response('console.log("merchant asset");', {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=31536000, immutable',
        }
      });
    }
    return new Response(
      '<!doctype html><html><head><title>FeraSetu Store</title><link rel="canonical" href="https://ferasetu.com/" /><meta property="og:url" content="https://ferasetu.com/" /></head><body><div id="root"></div></body></html>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        }
      }
    );
  }
  return originalFetch(urlOrReq, init);
};

// Seed test merchant records
const mockMerchantUser = {
  id: 'user-merchant-nshopkeeper',
  email: 'nshopkeeper@ferasetu.store',
  name: 'NShopkeeper Organic Mart',
  business_name: 'NShopkeeper Groceries',
  plan: 'growth',
  subdomain: 'nshopkeeper',
  hostname: 'nshopkeeper.ferasetu.com',
  is_blocked: 0,
  logo_url: 'https://cdn.ferasetu.com/nshopkeeper-logo.png',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockMerchantWebsite = {
  id: 'site-nshopkeeper-1',
  user_id: 'user-merchant-nshopkeeper',
  organization_id: 'org-nshopkeeper',
  name: 'NShopkeeper Groceries',
  is_published: 1,
  config: JSON.stringify({ primaryColor: '#0052FF' }),
  sections: JSON.stringify(['hero', 'catalog'])
};

const mockMerchantProducts = [
  {
    id: 'prod-organic-wheat',
    user_id: 'user-merchant-nshopkeeper',
    organization_id: 'org-nshopkeeper',
    name: 'Organic Sharbati Wheat 10kg',
    price: 650,
    price_minor: 65000,
    currency: 'INR',
    stock: 50,
    is_active: 1,
    status: 'active',
    created_at: new Date().toISOString()
  }
];

function createMockMultiDomainDb() {
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
            const matches = this._params.some(p => {
              if (!p) return false;
              const clean = String(p).toLowerCase();
              return clean === 'nshopkeeper' ||
                     clean === 'nshopkeeper.ferasetu.store' ||
                     clean === 'nshopkeeper.ferasetu.com';
            });
            if (matches) {
              const res = { ...mockMerchantUser, is_published: 1 };
              return col ? res[col] : res;
            }
            return null;
          }

          if (lowerSql.includes('from shops')) {
            const matches = this._params.some(p => {
              if (!p) return false;
              const clean = String(p).toLowerCase();
              return clean === 'nshopkeeper' ||
                     clean === 'nshopkeeper.ferasetu.store' ||
                     clean === 'nshopkeeper.ferasetu.com';
            });
            if (matches) {
              return {
                id: 'shop-nshopkeeper',
                organization_id: 'org-nshopkeeper',
                name: 'NShopkeeper Groceries',
                store_slug: 'nshopkeeper',
                hostname: 'nshopkeeper.ferasetu.store',
                logo_url: 'https://cdn.ferasetu.com/nshopkeeper-logo.png'
              };
            }
            return null;
          }

          if (lowerSql.includes('from organizations')) {
            const matches = this._params.some(p => String(p).toLowerCase() === 'nshopkeeper' || String(p).toLowerCase() === 'org-nshopkeeper');
            if (matches) {
              return {
                id: 'org-nshopkeeper',
                name: 'NShopkeeper Groceries',
                store_slug: 'nshopkeeper'
              };
            }
            return null;
          }

          if (lowerSql.includes('from websites')) {
            return mockMerchantWebsite;
          }

          if (lowerSql.includes('count(*) as cnt from products')) {
            return { cnt: mockMerchantProducts.length };
          }

          if (lowerSql.includes('from custom_storefront_domains')) {
            const domain = this._params[0];
            if (domain === 'nshopkeeper.custombrand.in') {
              return {
                id: 'csd-1',
                organization_id: 'org-nshopkeeper',
                shop_id: 'shop-nshopkeeper',
                domain: 'nshopkeeper.custombrand.in',
                status: 'ACTIVE',
                dns_status: 'VERIFIED',
                store_slug: 'nshopkeeper',
                shop_name: 'NShopkeeper Groceries'
              };
            }
            return null;
          }

          return null;
        },
        async all() {
          const lowerSql = sql.toLowerCase();
          if (lowerSql.includes('from products')) {
            return { results: mockMerchantProducts };
          }
          return { results: [] };
        },
        async run() {
          return { success: true };
        }
      };
    }
  };
  return db;
}

const mockEnv = {
  DB: createMockMultiDomainDb(),
  PAGES_ORIGIN: 'https://ferasetu.com'
};

console.log('\n🏬 SUITE 1: Hostname Resolution & Classification');

await test('1. ferasetu.store root classified as platform_root', () => {
  const res = classifyHostname('ferasetu.store');
  assert.equal(res.type, 'platform_root');
  assert.equal(res.domain, 'ferasetu.store');
});

await test('2. merchant.ferasetu.store classified as merchant', () => {
  const res = classifyHostname('nshopkeeper.ferasetu.store');
  assert.equal(res.type, 'merchant');
  assert.equal(res.slug, 'nshopkeeper');
  assert.equal(res.subdomain, 'nshopkeeper');
  assert.equal(res.domain, 'ferasetu.store');
});

await test('3. merchant.ferasetu.com continues to be classified as merchant', () => {
  const res = classifyHostname('nshopkeeper.ferasetu.com');
  assert.equal(res.type, 'merchant');
  assert.equal(res.slug, 'nshopkeeper');
  assert.equal(res.domain, 'ferasetu.com');
});

await test('4. Reserved platform subdomains on ferasetu.store', () => {
  const reservedList = ['app', 'www', 'admin', 'mail', 'help', 'cdn', 'shops', 'status'];
  for (const name of reservedList) {
    const res = classifyHostname(`${name}.ferasetu.store`);
    assert.equal(res.type, 'platform_reserved', `${name}.ferasetu.store must be platform_reserved`);
  }
});

await test('5. api.ferasetu.store classified as api', () => {
  const res = classifyHostname('api.ferasetu.store');
  assert.equal(res.type, 'api');
  assert.equal(res.subdomain, 'api');
  assert.equal(res.domain, 'ferasetu.store');
});

await test('6. Strict suffix matching: evilferasetu.store is NOT a merchant', () => {
  const res = classifyHostname('evilferasetu.store');
  assert.notEqual(res.type, 'merchant', 'evilferasetu.store must NEVER be classified as merchant');
  assert.equal(res.type, 'custom_domain');
});

await test('7. Nested subdomains under ferasetu.store are rejected', () => {
  const res = classifyHostname('sub.nshopkeeper.ferasetu.store');
  assert.equal(res.type, 'unknown_host');
  assert.equal(res.reason, 'nested_subdomain');
});

console.log('\n🌐 SUITE 2: Edge Gateway Storefront Serving & SEO Canonical');

clearSpaHtmlCache();
clearMerchantCache();

await test('8. nshopkeeper.ferasetu.store serves SPA storefront with accurate SEO canonical', async () => {
  const req = new Request('https://nshopkeeper.ferasetu.store/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/html'));
  
  // Header SEO: eligible store receives index, follow
  assert.equal(res.headers.get('x-robots-tag'), 'index, follow');

  const html = await res.text();
  assert.ok(html.includes('<title>NShopkeeper Groceries</title>'), 'HTML title must reflect merchant store');
  // Canonical URL must strictly point to nshopkeeper.ferasetu.store/ and NOT ferasetu.com
  assert.ok(
    html.includes('<link rel="canonical" href="https://nshopkeeper.ferasetu.store/" />'),
    'Canonical link must point to incoming request host https://nshopkeeper.ferasetu.store/'
  );
  assert.ok(
    html.includes('<meta property="og:url" content="https://nshopkeeper.ferasetu.store/" />'),
    'Open Graph url must point to https://nshopkeeper.ferasetu.store/'
  );
});

await test('9. nshopkeeper.ferasetu.com serves same merchant with ferasetu.com canonical', async () => {
  const req = new Request('https://nshopkeeper.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(
    html.includes('<link rel="canonical" href="https://nshopkeeper.ferasetu.com/" />'),
    'Canonical link must point to https://nshopkeeper.ferasetu.com/'
  );
});

await test('10. Unknown merchant on ferasetu.store receives noindex, nofollow guardrail', async () => {
  const req = new Request('https://unknown-shop-999.ferasetu.store/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
});

await test('11. Invalid merchant slug on ferasetu.store returns 404', async () => {
  const req = new Request('https://invalid_store_slug.ferasetu.store/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
});

await test('12. Reserved platform hostname admin.ferasetu.store returns 404', async () => {
  const req = new Request('https://admin.ferasetu.store/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 404);
});

console.log('\n🔒 SUITE 3: Tenant Isolation, Security & CORS Validation');

await test('13. CORS allows origin from nshopkeeper.ferasetu.store', () => {
  assert.equal(isOriginAllowed('https://nshopkeeper.ferasetu.store'), true);
  assert.equal(isOriginAllowed('https://nshopkeeper.ferasetu.com'), true);
  assert.equal(isOriginAllowed('https://ferasetu.store'), true);
  assert.equal(isOriginAllowed('https://www.ferasetu.store'), true);
  // Malicious / untrusted origins rejected
  assert.equal(isOriginAllowed('https://evilferasetu.store'), false);
  assert.equal(isOriginAllowed('https://phishing.com'), false);
});

await test('14. Preflight OPTIONS on ferasetu.store returns correct Access-Control-Allow-Origin', async () => {
  const req = new Request('https://api.ferasetu.store/api/products', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://nshopkeeper.ferasetu.store',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, X-Organization-Id'
    }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://nshopkeeper.ferasetu.store');
  assert.ok(res.headers.get('access-control-allow-headers')?.includes('X-Organization-Id'));
});

await test('15. Storefront API /api/website/public/:shopName under ferasetu.store', async () => {
  const req = new Request('https://nshopkeeper.ferasetu.store/api/website/public/nshopkeeper');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.shop);
  assert.equal(data.shop.subdomain, 'nshopkeeper');
  assert.equal(data.shop.hostname, 'nshopkeeper.ferasetu.store');
  assert.ok(Array.isArray(data.products));
  assert.equal(data.products[0].name, 'Organic Sharbati Wheat 10kg');
});

await test('16. Public shop API with full domain parameter nshopkeeper.ferasetu.store', async () => {
  const req = new Request('https://ferasetu.com/api/website/public/nshopkeeper.ferasetu.store');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.shop);
  assert.equal(data.shop.subdomain, 'nshopkeeper');
  assert.equal(data.shop.hostname, 'nshopkeeper.ferasetu.store');
});

await test('17. Static asset requests strictly bypass D1 database queries on ferasetu.store', async () => {
  const initialQueryCount = mockEnv.DB.queryCount;
  const req = new Request('https://nshopkeeper.ferasetu.store/assets/storefront-app.js');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.equal(mockEnv.DB.queryCount, initialQueryCount, 'Static asset must trigger 0 D1 queries');
});

await test('18. Existing custom domain nshopkeeper.custombrand.in resolves to same tenant', async () => {
  const req = new Request('https://nshopkeeper.custombrand.in/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('<title>NShopkeeper Groceries</title>'));
  assert.ok(html.includes('<link rel="canonical" href="https://nshopkeeper.custombrand.in/" />'));
});

await test('19. Cross-tenant cache isolation between ferasetu.store merchants', async () => {
  const req1 = new Request('https://nshopkeeper.ferasetu.store/');
  const res1 = await worker.fetch(req1, mockEnv);

  const req2 = new Request('https://othermerchant.ferasetu.store/');
  const res2 = await worker.fetch(req2, mockEnv);

  const cc1 = res1.headers.get('cache-control');
  const cc2 = res2.headers.get('cache-control');
  const vary1 = res1.headers.get('vary');
  const vary2 = res2.headers.get('vary');

  assert.ok(cc1?.includes('private') && cc1?.includes('no-store'));
  assert.ok(cc2?.includes('private') && cc2?.includes('no-store'));
  assert.ok(vary1?.includes('Host'));
  assert.ok(vary2?.includes('Host'));
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}

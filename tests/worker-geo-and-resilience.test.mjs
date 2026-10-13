/**
 * Tests for /api/geo endpoint and schema resilience in public storefront API
 *
 * Run with: node tests/worker-geo-and-resilience.test.mjs
 */

import assert from 'node:assert/strict';
import worker, { _resetTablesInitialized } from '../worker/index.js';
import { handleGeoRoute, resolveSuggestedLanguage, resolvePricingRegion } from '../worker/routes/geo.js';

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

// ---------------------------------------------------------------------------
// 1. /api/geo Unit Tests
// ---------------------------------------------------------------------------
console.log('\n🌍 Suite: /api/geo Detection & Localization');

await test('1. Default unheadered request resolves to GLOBAL with Cashfree subscription and USD', async () => {
  const req = new Request('https://ferasetu.com/api/geo');
  const data = await handleGeoRoute(req, {});
  assert.equal(data.market, 'GLOBAL');
  assert.equal(data.currency, 'USD');
  assert.equal(data.symbol, '$');
  assert.equal(data.gateway, 'cashfree');
  assert.equal(data.subscriptionGateway, 'cashfree');
  assert.equal(data.permanentFreePlan, false);
  assert.ok(data.plans.starter);
  assert.ok(data.plans.growth);
  assert.ok(data.plans.pro);
});

await test('1b. Explicit IN country header resolves to India with Cashfree and INR', async () => {
  const req = new Request('https://ferasetu.com/api/geo', {
    headers: { 'cf-ipcountry': 'IN' }
  });
  const data = await handleGeoRoute(req, {});
  assert.equal(data.country, 'IN');
  assert.equal(data.market, 'IN');
  assert.equal(data.region, 'IN');
  assert.equal(data.currency, 'INR');
  assert.equal(data.symbol, '₹');
  assert.equal(data.gateway, 'cashfree');
  assert.equal(data.subscriptionGateway, 'cashfree');
  assert.equal(data.permanentFreePlan, true);
  assert.ok(data.plans.free);
  assert.ok(data.plans.business);
  assert.ok(data.plans.pro);
});

await test('1c. UK visitor (GB) resolves to UK market, GBP £, and Cashfree subscription gateway', async () => {
  const req = new Request('https://ferasetu.com/api/geo', {
    headers: { 'cf-ipcountry': 'GB' }
  });
  const data = await handleGeoRoute(req, {});
  assert.equal(data.country, 'GB');
  assert.equal(data.market, 'UK');
  assert.equal(data.region, 'UK');
  assert.equal(data.currency, 'GBP');
  assert.equal(data.symbol, '£');
  assert.equal(data.gateway, 'cashfree');
  assert.equal(data.subscriptionGateway, 'cashfree');
  assert.ok(data.supportedMerchantProviders.includes('stripe'));
  assert.equal(data.suggestedLanguage, 'en-gb');
});

await test('1d. Saved cookie preference overrides IP geolocation', async () => {
  const req = new Request('https://ferasetu.com/api/geo', {
    headers: {
      'cf-ipcountry': 'IN',
      'cookie': 'fera_market=UK; other=1'
    }
  });
  const data = await handleGeoRoute(req, {});
  assert.equal(data.market, 'UK');
  assert.equal(data.currency, 'GBP');
  assert.equal(data.symbol, '£');
});

await test('2. Indian state code (MH) maps to Marathi (mr)', async () => {
  const req = new Request('https://ferasetu.com/api/geo', {
    headers: {
      'cf-ipcountry': 'IN',
      'cf-region-code': 'MH',
      'cf-region': 'Maharashtra'
    }
  });
  const data = await handleGeoRoute(req, {});
  assert.equal(data.country, 'IN');
  assert.equal(data.subdivisionCode, 'MH');
  assert.equal(data.suggestedLanguage, 'mr');
});

await test('3. Indian state code (TN) maps to Tamil (ta)', async () => {
  const req = new Request('https://ferasetu.com/api/geo', {
    headers: {
      'cf-ipcountry': 'IN',
      'cf-region-code': 'TN'
    }
  });
  const data = await handleGeoRoute(req, {});
  assert.equal(data.suggestedLanguage, 'ta');
});

await test('4. Indian state code (WB) maps to Bengali (bn)', async () => {
  const req = new Request('https://ferasetu.com/api/geo', {
    headers: {
      'cf-ipcountry': 'IN',
      'cf-region-code': 'WB'
    }
  });
  const data = await handleGeoRoute(req, {});
  assert.equal(data.suggestedLanguage, 'bn');
});

await test('5. EU country (FR) maps to Europe region, EUR, Cashfree subscription, and French (fr)', async () => {
  const req = new Request('https://ferasetu.com/api/geo', {
    headers: {
      'cf-ipcountry': 'FR'
    }
  });
  const data = await handleGeoRoute(req, {});
  assert.equal(data.country, 'FR');
  assert.equal(data.region, 'EU');
  assert.equal(data.currency, 'EUR');
  assert.equal(data.symbol, '€');
  assert.equal(data.gateway, 'cashfree');
  assert.equal(data.subscriptionGateway, 'cashfree');
  assert.equal(data.permanentFreePlan, false);
  assert.equal(data.suggestedLanguage, 'fr');
});

await test('6. US country maps to US region, USD, Cashfree subscription, and English (en)', async () => {
  const req = new Request('https://ferasetu.com/api/geo', {
    headers: {
      'cf-ipcountry': 'US'
    }
  });
  const data = await handleGeoRoute(req, {});
  assert.equal(data.country, 'US');
  assert.equal(data.region, 'US');
  assert.equal(data.currency, 'USD');
  assert.equal(data.symbol, '$');
  assert.equal(data.gateway, 'cashfree');
  assert.equal(data.subscriptionGateway, 'cashfree');
  assert.equal(data.suggestedLanguage, 'en');
});

await test('7. GET /api/geo on Worker returns 200 JSON with CORS headers', async () => {
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/geo', {
    headers: {
      'Origin': 'https://sharma-virar-palghar-mh-1.ferasetu.com',
      'cf-ipcountry': 'IN',
      'cf-region-code': 'MH'
    }
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://sharma-virar-palghar-mh-1.ferasetu.com');
  const json = await res.json();
  assert.equal(json.country, 'IN');
  assert.equal(json.suggestedLanguage, 'mr');
});

await test('8. Direct GET /api/geo on merchant subdomain returns 200 without Pages takeover', async () => {
  const req = new Request('https://sharma-virar-palghar-mh-1.ferasetu.com/api/geo', {
    headers: {
      'Origin': 'https://sharma-virar-palghar-mh-1.ferasetu.com',
      'cf-ipcountry': 'IN',
      'cf-region-code': 'MH'
    }
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.country, 'IN');
  assert.equal(json.suggestedLanguage, 'mr');
});

await test('9. Root endpoint listing includes GET /api/geo', async () => {
  const req = new Request('https://ferasetu.singhantima203.workers.dev/');
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.endpoints.includes('GET  /api/geo'));
});

// ---------------------------------------------------------------------------
// 2. Schema Resilience Tests (simulating production D1 without is_blocked)
// ---------------------------------------------------------------------------
console.log('\n🛡️ Suite: D1 Schema Resilience & Fallback Handling');

function createResilientMockDb() {
  const mockUsers = [
    {
      id: 'usr_sharma_1',
      name: 'Sharma General Store',
      business_name: 'Sharma Kirana Virar',
      subdomain: 'sharma-virar-palghar-mh-1',
      hostname: 'sharma-virar-palghar-mh-1.ferasetu.com',
      // Note: is_blocked is intentionally absent here to simulate production D1!
      created_at: new Date().toISOString()
    }
  ];

  const mockProducts = [
    {
      id: 'prod_1',
      user_id: 'usr_sharma_1',
      name: 'Tata Salt 1kg',
      description: 'Vacuum evaporated iodized salt',
      price: 28,
      sale_price: 25,
      category: 'Grocery',
      stock_quantity: 50,
      is_active: 1,
      created_at: new Date().toISOString()
    }
  ];

  return {
    prepare(sql) {
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async first(col) {
          const lower = sql.toLowerCase();
          // Simulate SQLITE_ERROR when query includes is_blocked on an unmigrated table
          if (lower.includes('is_blocked')) {
            const err = new Error('D1_ERROR: no such column: is_blocked at offset 68: SQLITE_ERROR');
            throw err;
          }

          if (lower.includes('from users')) {
            const user = mockUsers.find(u =>
              this._params.some(p => p && (
                (u.subdomain && u.subdomain.toLowerCase() === p.toLowerCase()) ||
                (u.hostname && u.hostname.toLowerCase() === p.toLowerCase())
              ))
            );
            if (!user) return null;
            return col ? user[col] : { ...user };
          }

          if (lower.includes('from websites')) {
            // Simulate missing website record
            return null;
          }

          return null;
        },
        async all() {
          const lower = sql.toLowerCase();
          if (lower.includes('from products')) {
            const userId = this._params[0];
            return { results: mockProducts.filter(p => p.user_id === userId) };
          }
          return { results: [] };
        },
        async run() {
          return { success: true };
        }
      };
    }
  };
}

await test('10. getPublicShop survives missing is_blocked column without throwing 500', async () => {
  const mockDb = createResilientMockDb();
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/website/public/sharma-virar-palghar-mh-1', {
    headers: {
      'Origin': 'https://sharma-virar-palghar-mh-1.ferasetu.com'
    }
  });

  const res = await worker.fetch(req, { DB: mockDb });
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.shop.id, 'usr_sharma_1');
  assert.equal(json.shop.name, 'Sharma Kirana Virar');
  assert.equal(json.shop.subdomain, 'sharma-virar-palghar-mh-1');
  assert.equal(json.products.length, 1);
  assert.equal(json.products[0].name, 'Tata Salt 1kg');

  // Verify fallback published website object is synthesized
  assert.ok(json.website);
  assert.equal(json.website.is_published, 1);
  assert.equal(json.website.name, 'Sharma Kirana Virar');
});

await test('11. getPublicShop matches by full hostname as well', async () => {
  const mockDb = createResilientMockDb();
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/website/public/sharma-virar-palghar-mh-1.ferasetu.com', {
    headers: {
      'Origin': 'https://sharma-virar-palghar-mh-1.ferasetu.com'
    }
  });

  const res = await worker.fetch(req, { DB: mockDb });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.shop.subdomain, 'sharma-virar-palghar-mh-1');
});

await test('12. Unknown shop name returns 404 Shop not found', async () => {
  const mockDb = createResilientMockDb();
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/website/public/nonexistent-shop-slug-999');
  const res = await worker.fetch(req, { DB: mockDb });
  assert.equal(res.status, 404);
  const json = await res.json();
  assert.equal(json.error, 'Shop not found');
});

await test('13. GET /api/geo never touches DB even if env.DB is configured', async () => {
  let dbCalls = 0;
  const spyDb = {
    prepare() {
      dbCalls++;
      throw new Error('Database should not be accessed on /api/geo');
    },
    exec() {
      dbCalls++;
      throw new Error('Database should not be accessed on /api/geo');
    }
  };

  const req = new Request('https://api.ferasetu.com/api/geo', {
    headers: { 'cf-ipcountry': 'IN' }
  });
  const res = await worker.fetch(req, { DB: spyDb });
  assert.equal(res.status, 200);
  assert.equal(dbCalls, 0, 'Database was unexpectedly accessed during /api/geo');
  const json = await res.json();
  assert.equal(json.country, 'IN');
});

await test('14. GET /api/health never touches DB even if env.DB is configured', async () => {
  let dbCalls = 0;
  const spyDb = {
    prepare() {
      dbCalls++;
      throw new Error('Database should not be accessed on /api/health');
    },
    exec() {
      dbCalls++;
      throw new Error('Database should not be accessed on /api/health');
    }
  };

  const req = new Request('https://api.ferasetu.com/api/health');
  const res = await worker.fetch(req, { DB: spyDb });
  assert.equal(res.status, 200);
  assert.equal(dbCalls, 0, 'Database was unexpectedly accessed during /api/health');
});

await test('15. ensureTables fast-path executes only 1 verification query when DB is already migrated', async () => {
  _resetTablesInitialized();
  let checkCalls = 0;
  let totalCalls = 0;
  const spyDb = {
    prepare(sql) {
      totalCalls++;
      if (sql.includes('SELECT 1 FROM organizations')) {
        checkCalls++;
      }
      return {
        bind() { return this; },
        async first() {
          if (sql.includes('FROM organizations')) {
            return { 1: 1 };
          }
          return null;
        },
        async all() {
          return { results: [] };
        }
      };
    },
    async exec() {
      throw new Error('exec should not be called when organizations table exists');
    }
  };

  // Route to a DB-dependent endpoint
  const req = new Request('https://api.ferasetu.com/api/website/public/nonexistent-shop-test');
  await worker.fetch(req, { DB: spyDb });
  assert.equal(checkCalls, 1, `Expected exactly 1 verification query, but got ${checkCalls}`);
  assert.ok(totalCalls <= 5, `Expected <= 5 total queries including endpoint, got ${totalCalls}`);
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All geo and schema resilience tests passed!\n');
}

import assert from 'node:assert/strict';
import * as jose from '../worker/node_modules/jose/dist/node/esm/index.js';
import worker from '../worker/index.js';

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

// In-memory D1 mock
function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_test_1',
        email: 'merchant@test.com',
        name: 'Test Merchant',
        plan: 'free',
        market: 'IN',
        preferred_language: 'hi',
        ai_credits_balance: 20,
        ai_credits_monthly_limit: 20,
        ai_credits_used_month: 0,
        subdomain: 'test-store',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr_us_1',
        email: 'usmerchant@test.com',
        name: 'US Merchant',
        plan: 'free',
        market: 'US',
        preferred_language: 'en',
        ai_credits_balance: 20,
        ai_credits_monthly_limit: 20,
        ai_credits_used_month: 0,
        subdomain: 'us-store',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    products: [
      {
        id: 'prod_1',
        user_id: 'usr_test_1',
        name: 'Test Basmati Rice',
        description: 'Premium rice',
        price: 250,
        sale_price: null,
        category: 'Grocery',
        stock_quantity: 10,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    orders: [],
    transactions: [],
    websites: [
      {
        id: 'web_1',
        user_id: 'usr_test_1',
        name: 'Test Storefront',
        template: 'default',
        config: JSON.stringify({ primaryColor: '#2563EB' }),
        sections: JSON.stringify([]),
        is_published: 1,
        theme: JSON.stringify({ preset: 'clean-grocer' }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    tickets: [],
    ticket_replies: [],
    smtp_settings: []
  };

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
          const s = sql.toLowerCase();
          if (s.includes('from users where id =')) {
            const u = tables.users.find(x => x.id === this._params[0]);
            if (!u) return null;
            return col ? u[col] : { ...u };
          }
          if (s.includes('from users where email =')) {
            const u = tables.users.find(x => x.email === this._params[0]);
            if (!u) return null;
            return col ? u[col] : { ...u };
          }
          if (s.includes('from products where id =') || (s.includes('from products') && s.includes('where id ='))) {
            const p = tables.products.find(x => x.id === this._params[0]);
            if (!p) return null;
            return col ? p[col] : { ...p };
          }
          if (s.includes('from websites where user_id =') || s.includes('from websites where organization_id =') || (s.includes('from websites') && s.includes('user_id ='))) {
            const userId = this._params[this._params.length - 1];
            const orgId = this._params[0];
            const w = tables.websites.find(x => x.user_id === userId || x.user_id === orgId || x.organization_id === orgId || x.user_id === 'usr_test_1');
            if (!w) return null;
            return col ? w[col] : { ...w };
          }
          if (s.includes('from transactions where id =')) {
            const t = tables.transactions.find(x => x.id === this._params[0]);
            if (!t) return null;
            return col ? t[col] : { ...t };
          }
          if (s.includes('from orders where id =')) {
            const o = tables.orders.find(x => x.id === this._params[0]);
            if (!o) return null;
            return col ? o[col] : { ...o };
          }
          if (s.includes('count(*)')) {
            if (s.includes('from products')) {
              const count = tables.products.filter(x => x.user_id === this._params[0]).length;
              return { count };
            }
            if (s.includes('from orders')) {
              return { count: tables.orders.length };
            }
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase();
          if (s.includes('from products where user_id =') || s.includes('from products where organization_id =') || (s.includes('from products') && s.includes('order by'))) {
            const userId = this._params[this._params.length - 1];
            const orgId = this._params[0];
            const results = tables.products.filter(x => x.user_id === userId || x.user_id === orgId || x.organization_id === orgId);
            return { results };
          }
          if (s.includes('from orders where user_id =') || s.includes('from orders where organization_id =')) {
            const userId = this._params[this._params.length - 1];
            const orgId = this._params[0];
            const results = tables.orders.filter(x => x.user_id === userId || x.user_id === orgId || x.organization_id === orgId);
            return { results };
          }
          if (s.includes('from transactions where user_id =')) {
            const results = tables.transactions.filter(x => x.user_id === this._params[0]);
            return { results };
          }
          if (s.includes('from tickets where user_id =')) {
            const results = tables.tickets.filter(x => x.user_id === this._params[0]);
            return { results };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase();
          if (s.includes('insert into transactions')) {
            const [id, user_id, provider, provider_order_id, amount, currency, status, plan, billing_cycle, metadata, created_at, updated_at] = this._params;
            tables.transactions.push({ id, user_id, provider, provider_order_id, amount, currency, status, plan, billing_cycle, metadata, created_at, updated_at });
            return { success: true };
          }
          if (s.includes('update users set')) {
            const u = tables.users.find(x => x.id === this._params[this._params.length - 1] || x.id === 'usr_test_1');
            if (u) {
              if (s.includes('plan =')) u.plan = this._params[0];
            }
            return { success: true };
          }
          if (s.includes('update products set organization_id =')) {
            const orgId = this._params[0];
            const userId = this._params[1];
            tables.products.forEach(p => {
              if (p.user_id === userId) p.organization_id = orgId;
            });
            return { success: true };
          }
          if (s.includes('update products set')) {
            const prodId = this._params[this._params.length - 3] || this._params[this._params.length - 2];
            const p = tables.products.find(x => x.id === prodId || x.id === 'prod_1');
            if (p) {
              p.name = this._params[0];
            }
            return { success: true };
          }
          if (s.includes('delete from products where id =')) {
            const prodId = this._params[0];
            const idx = tables.products.findIndex(x => x.id === prodId);
            if (idx >= 0) tables.products.splice(idx, 1);
            return { success: true };
          }
          if (s.includes('insert into orders')) {
            const [id, user_id, customer_name, customer_phone, customer_address, items, total, delivery_type, status, payment_status, notes, created_at, updated_at] = this._params;
            tables.orders.push({ id, user_id, customer_name, customer_phone, customer_address, items, total, delivery_type, status, payment_status, notes, created_at, updated_at });
            return { success: true };
          }
          if (s.includes('update orders set')) {
            const orderId = this._params[this._params.length - 2];
            const o = tables.orders.find(x => x.id === orderId);
            if (o) {
              o.status = this._params[0];
            }
            return { success: true };
          }
          return { success: true };
        }
      };
    }
  };
}

// Generate an RSA Key pair for testing WorkOS JWT validation
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-key-1';

// Mock WorkOS JWKS global fetch
const originalFetch = globalThis.fetch;
globalThis.fetch = async (urlOrReq, init) => {
  const urlStr = (urlOrReq instanceof URL) ? urlOrReq.href : (typeof urlOrReq === 'string' ? urlOrReq : (urlOrReq && urlOrReq.url) ? urlOrReq.url : String(urlOrReq));
  if (urlStr.includes('api.workos.com/sso/jwks')) {
    return new Response(JSON.stringify({ keys: [jwk] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return originalFetch(urlOrReq, init);
};

async function createToken(sub, email) {
  return await new jose.SignJWT({ sub, email, name: 'Test User' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

const mockDb = createTestDb();
const mockEnv = {
  DB: mockDb,
  JWKS: jose.createLocalJWKSet({ keys: [jwk] }),
  WORKOS_CLIENT_ID: 'client_test_id',
  RAZORPAY_KEY_ID: '', // Unconfigured in test by default
  RAZORPAY_KEY_SECRET: '',
  ASSETS: {
    fetch: async () => new Response('assets', { status: 200 })
  }
};

console.log('\n💳 Suite: Payment Initialize, Verification & Authoritative Matrix');

await test('Payment initialize fails with 401 if unauthenticated', async () => {
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/payment/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'business', amount: 399 })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error);
});

await test('Payment initialize validates plan argument', async () => {
  const token = await createToken('usr_test_1', 'merchant@test.com');
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ plan: 'nonexistent_enterprise_tier' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Invalid plan'));
});

await test('Payment initialize activates Free plan directly for IN market (no payment required)', async () => {
  const token = await createToken('usr_test_1', 'merchant@test.com');
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ plan: 'free' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.requiresPayment, false);
  assert.equal(data.amount, 0);
  assert.equal(data.plan, 'free');
});

await test('Payment initialize activates 14-day trial for US market Free selection', async () => {
  const token = await createToken('usr_us_1', 'usmerchant@test.com');
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ plan: 'free' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.requiresPayment, false);
  assert.equal(data.isTrial, true);
});

await test('Payment initialize returns 503 if gateway credentials are missing for paid plan (no fake success)', async () => {
  const token = await createToken('usr_test_1', 'merchant@test.com');
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ plan: 'business', billingCycle: 'monthly' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.ok(data.error.includes('Payment gateway credentials'));
});

console.log('\n📦 Suite: Products CRUD & Management Endpoints');

await test('GET /api/products returns products for user', async () => {
  const token = await createToken('usr_test_1', 'merchant@test.com');
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/products', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.products.length, 1);
  assert.equal(data.products[0].name, 'Test Basmati Rice');
});

await test('GET /api/products/:id returns specific product', async () => {
  const token = await createToken('usr_test_1', 'merchant@test.com');
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/products/prod_1', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.id, 'prod_1');
});

await test('PUT /api/products/:id updates product', async () => {
  const token = await createToken('usr_test_1', 'merchant@test.com');
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/products/prod_1', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'Updated Organic Basmati Rice' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.name, 'Updated Organic Basmati Rice');
});

console.log('\n🛍️ Suite: Storefront Orders & Public Checkout');

await test('POST /api/orders/create allows public customer order placement', async () => {
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'usr_test_1',
      customer_name: 'Pooja Sharma',
      customer_phone: '+919876543210',
      items: [{ product_id: 'prod_1', product_name: 'Test Basmati Rice', quantity: 2, price: 250 }],
      total: 500,
      delivery_type: 'delivery'
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.order);
  assert.equal(data.order.total, 530);
});

console.log('\n🌐 Suite: Website Configuration & 404 API Routing');

await test('GET /api/website returns website settings', async () => {
  const token = await createToken('usr_test_1', 'merchant@test.com');
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/website', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.name, 'Test Storefront');
});

await test('GET /api/website/templates returns system storefront templates', async () => {
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/website/templates');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.templates));
  assert.ok(data.templates.length > 0);
});

await test('Unknown API endpoint returns JSON 404 with CORS headers', async () => {
  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/nonexistent-route-xyz', {
    headers: { Origin: 'https://ferasetu.com' }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.ok(res.headers.get('access-control-allow-origin'));
  const data = await res.json();
  assert.ok(data.error.includes('Not found'));
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All worker API contract tests passed!\n');
}

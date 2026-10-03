import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker, { getAuthoritativePrice, normalizePlan } from '../worker/index.js';
import * as jose from '../worker/node_modules/jose/dist/node/esm/index.js';

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

// In-memory test D1 database
function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_test_merchant',
        email: 'merchant@ferasetu.com',
        name: 'India Merchant',
        business_name: 'Kirana Express',
        plan: 'free',
        market: 'IN',
        phone: '+919876543210',
        ai_credits_balance: 20,
        ai_credits_monthly_limit: 20,
        ai_credits_used_month: 0,
        is_blocked: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr_starter_merchant',
        email: 'starter@ferasetu.com',
        name: 'Starter Merchant',
        business_name: 'Starter Store',
        plan: 'starter',
        market: 'IN',
        phone: '+919876543211',
        is_blocked: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr_other_merchant',
        email: 'other@ferasetu.com',
        name: 'Other Merchant',
        business_name: 'Other Store',
        plan: 'free',
        market: 'IN',
        phone: '+919876543212',
        is_blocked: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    organizations: [
      {
        id: 'org_test_merchant',
        workos_organization_id: 'org_test_merchant',
        name: 'Kirana Express Org',
        market: 'IN',
        plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'org_starter_merchant',
        workos_organization_id: 'org_starter_merchant',
        name: 'Starter Org',
        market: 'IN',
        plan: 'starter',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    organization_members: [
      {
        id: 'om_1',
        organization_id: 'org_test_merchant',
        user_id: 'usr_test_merchant',
        role: 'owner',
        created_at: new Date().toISOString()
      },
      {
        id: 'om_2',
        organization_id: 'org_starter_merchant',
        user_id: 'usr_starter_merchant',
        role: 'owner',
        created_at: new Date().toISOString()
      }
    ],
    products: [],
    orders: [
      {
        id: 'ord_merchant_1',
        organization_id: 'org_test_merchant',
        user_id: 'usr_test_merchant',
        customer_name: 'Rahul Sharma',
        customer_email: 'rahul.customer@example.com',
        customer_phone: '9876543210',
        items: JSON.stringify([{ id: 'p1', name: 'Item 1', qty: 1, price: 100 }]),
        total: 100,
        status: 'pending',
        payment_status: 'unpaid',
        created_at: new Date().toISOString()
      },
      {
        id: 'ord_other_1',
        organization_id: 'org_other_shop',
        user_id: 'usr_other_merchant',
        customer_name: 'Vikram Mehta',
        customer_email: 'vikram.private@example.com',
        customer_phone: '9876543211',
        items: JSON.stringify([{ id: 'p2', name: 'Item 2', qty: 1, price: 200 }]),
        total: 200,
        status: 'pending',
        payment_status: 'unpaid',
        created_at: new Date().toISOString()
      }
    ],
    transactions: [],
    subscriptions: [],
    credit_transactions: []
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
          if (s.includes('from products') && (s.includes('count') || s.includes('cnt'))) {
            const orgId = this._params[0];
            const userId = this._params[1] || orgId;
            const count = tables.products.filter(p => p.organization_id === orgId || p.user_id === userId).length;
            return col === 'count' || col === 'cnt' ? count : { count, cnt: count };
          }
          if (s.includes('count(*) as count from users') || s.includes('count(*) from users')) {
            const count = tables.users.length;
            return col === 'count' ? count : { count };
          }
          if (s.includes('count(*) as count from orders') || s.includes('count(*) from orders')) {
            const count = tables.orders.length;
            return col === 'count' ? count : { count };
          }
          if (s.includes('select sum(total) as rev from orders')) {
            const rev = tables.orders.reduce((sum, o) => sum + (o.total || 0), 0);
            return { rev };
          }
          if (s.includes('from users where id = ?')) {
            const uid = this._params[0];
            return tables.users.find(u => u.id === uid) || null;
          }
          if (s.includes('from organizations')) {
            const oid = this._params[0];
            return tables.organizations.find(o => o.id === oid || o.workos_organization_id === oid) || null;
          }
          if (s.includes('from organization_members')) {
            const p0 = this._params[0];
            const p1 = this._params[1];
            if (p1 !== undefined) {
              return tables.organization_members.find(m => (m.organization_id === p0 || m.organization_id === 'org_test_merchant') && m.user_id === p1) || null;
            }
            return tables.organization_members.find(m => m.user_id === p0 || m.organization_id === p0) || null;
          }
          if (s.includes('from subscriptions where user_id = ?')) {
            const uid = this._params[0];
            return tables.subscriptions.find(sub => sub.user_id === uid) || null;
          }
          if (s.includes('from subscriptions where id = ?')) {
            const sid = this._params[0];
            return tables.subscriptions.find(sub => sub.id === sid) || null;
          }
          if (s.includes('from transactions where')) {
            const id1 = this._params[0];
            const id2 = this._params[1];
            return tables.transactions.find(t => t.id === id1 || t.provider_order_id === id1 || t.id === id2 || t.provider_order_id === id2) || null;
          }
          if (s.includes('from orders where id = ?')) {
            const oid = this._params[0];
            const orgId = this._params[1];
            return tables.orders.find(o => o.id === oid && (orgId ? o.organization_id === orgId : true)) || null;
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('from orders')) {
            // Check if tenant scoped query
            if (s.includes('where organization_id = ?')) {
              const orgId = this._params[0];
              const results = tables.orders.filter(o => o.organization_id === orgId);
              return { results };
            }
            // Admin orders query with joins
            const results = tables.orders.map(o => {
              const org = tables.organizations.find(org => org.id === o.organization_id);
              const u = tables.users.find(u => u.id === o.user_id);
              return {
                ...o,
                shop_name: org?.name || u?.business_name || u?.name || 'Store',
                user_email: u?.email || ''
              };
            });
            return { results };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('insert into transactions')) {
            let tx;
            if (this._params.length === 12) {
              const [id, user_id, organization_id, provider_order_id, amount, currency, plan, billing_cycle, is_test_payment, metadata, created_at, updated_at] = this._params;
              tx = {
                id, user_id, organization_id, provider: 'cashfree', provider_order_id, amount, currency, status: 'pending', plan, billing_cycle,
                is_test_payment: Number(is_test_payment) || 0, metadata, created_at, updated_at
              };
            } else {
              const [id, user_id, organization_id, provider, provider_order_id, amount, currency, status, plan, billing_cycle, is_test_payment, metadata, created_at, updated_at] = this._params;
              tx = {
                id, user_id, organization_id, provider, provider_order_id, amount, currency, status, plan, billing_cycle,
                is_test_payment: Number(is_test_payment) || 0, metadata, created_at, updated_at
              };
            }
            tables.transactions.push(tx);
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('update transactions set status = \'completed\'')) {
            const txId = this._params[this._params.length - 1];
            const tx = tables.transactions.find(t => t.id === txId || t.provider_order_id === txId);
            if (tx) {
              const wasPending = tx.status === 'pending';
              tx.status = 'completed';
              tx.updated_at = new Date().toISOString();
              return { success: true, meta: { changes: wasPending ? 1 : 0 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
          if (s.includes('insert into subscriptions') || s.includes('insert or ignore into subscriptions')) {
            const [id, user_id, organization_id, plan, status, trial_used] = this._params;
            tables.subscriptions.push({ id, user_id, organization_id, plan, status, trial_used, is_test_payment: 0 });
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('update subscriptions')) {
            const userId = this._params[this._params.length - 1];
            let sub = tables.subscriptions.find(s => s.user_id === userId);
            if (!sub) {
              sub = { id: 'sub_' + Math.random(), user_id: userId };
              tables.subscriptions.push(sub);
            }
            sub.plan = this._params[1];
            sub.status = this._params[2];
            sub.is_test_payment = this._params[12] ?? 0;
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('update users')) {
            const userId = this._params[this._params.length - 1];
            const u = tables.users.find(u => u.id === userId);
            if (u && this._params[0] && typeof this._params[0] === 'string') {
              u.plan = this._params[0];
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into products')) {
            tables.products.push({ id: 'prod_' + Math.random(), ...this._params });
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 1 } };
        }
      };
    },
    async exec() {
      return { success: true };
    }
  };
}

// Generate RS256 key for testing authenticated worker routes
const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
const mockJWKS = jose.createLocalJWKSet({ keys: [{ ...jwk, kid: 'test-workos-key', alg: 'RS256', use: 'sig' }] });

async function createAuthToken(userId, role = 'owner', orgId = 'org_test_merchant') {
  return await new jose.SignJWT({ sub: userId, email: `${userId}@ferasetu.com`, role, org_id: orgId })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

// Outbound fetch interceptor for Cashfree
let lastCashfreeOrder = null;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const urlStr = String(url);
  if (urlStr.includes('cashfree.com/pg/orders')) {
    if (options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      lastCashfreeOrder = body;
      return new Response(JSON.stringify({
        cf_order_id: 'cf_ord_mock_' + Math.random().toString(36).slice(2),
        order_id: body.order_id,
        order_amount: body.order_amount,
        order_currency: body.order_currency || 'INR',
        payment_session_id: `session_cf_${body.order_id}`,
        order_status: 'ACTIVE',
        order_meta: body.order_meta
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (options.method === 'GET') {
      const parts = urlStr.split('/');
      const orderId = decodeURIComponent(parts[parts.length - 1]);
      return new Response(JSON.stringify({
        cf_order_id: 'cf_ord_mock_12345',
        order_id: orderId,
        order_amount: lastCashfreeOrder?.order_amount || 399,
        order_currency: 'INR',
        order_status: 'PAID'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }
  return originalFetch(url, options);
};

const mockSecret = 'test_cashfree_secret_key_123456789';
const db = createTestDb();

const mockEnv = {
  DB: db,
  CASHFREE_APP_ID: 'cf_app_test',
  CASHFREE_SECRET_KEY: mockSecret,
  CASHFREE_ENV: 'sandbox',
  ALLOW_TEST_PAYMENT: 'true',
  PUBLIC_APP_URL: 'https://ferasetu.com',
  PAYMENT_WEBHOOK_URL: 'https://ferasetu.com/api/payment/webhook',
  ADMIN_USERNAME: 'admin@ferasetu.com',
  ADMIN_PASSWORD: 'admin_test_secure_password_2026',
  ADMIN_JWT_SECRET: 'admin_test_jwt_secret_key_9999999999',
  JWT_SECRET: 'admin_test_jwt_secret_key_9999999999',
  JWKS: mockJWKS
};

function computeHmacSignature(timestamp, rawBody, secret) {
  const payload = `${timestamp}${rawBody}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('base64');
}

console.log('\n=== SUITE 1: Server-Authoritative Pricing & Anti-Tampering ===');

await test('normalizePlan preserves starter in India (does not map to business)', () => {
  assert.equal(normalizePlan('starter', 'IN'), 'starter');
  assert.equal(normalizePlan('basic', 'IN'), 'starter');
  assert.equal(normalizePlan('business', 'IN'), 'business');
  assert.equal(normalizePlan('growth', 'IN'), 'business');
  assert.equal(normalizePlan('pro', 'IN'), 'pro');
  assert.equal(normalizePlan('scale', 'IN'), 'pro');
});

await test('getAuthoritativePrice returns canonical India prices', () => {
  assert.equal(getAuthoritativePrice('IN', 'starter', 'monthly').amount, 199);
  assert.equal(getAuthoritativePrice('IN', 'starter', 'yearly').amount, 1990);
  assert.equal(getAuthoritativePrice('IN', 'business', 'monthly').amount, 399);
  assert.equal(getAuthoritativePrice('IN', 'business', 'yearly').amount, 3990);
  assert.equal(getAuthoritativePrice('IN', 'pro', 'monthly').amount, 999);
  assert.equal(getAuthoritativePrice('IN', 'pro', 'yearly').amount, 9990);
});

await test('POST /api/payment/initialize rejects Pro yearly with amount=1 (400 Bad Request)', async () => {
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'pro', billingCycle: 'yearly', amount: 1 })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Invalid amount for selected plan/i);
});

await test('POST /api/payment/initialize rejects Business monthly with amount=1 (400 Bad Request)', async () => {
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'business', billingCycle: 'monthly', amount: 1 })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Invalid amount for selected plan/i);
});

await test('POST /api/payment/initialize rejects Pro yearly with amount=399 (400 Bad Request)', async () => {
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'pro', billingCycle: 'yearly', amount: 399 })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Invalid amount for selected plan/i);
});

await test('POST /api/payment/initialize determines authoritative amount for Pro yearly (9990)', async () => {
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'pro', billingCycle: 'yearly' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.amount, 9990);
  assert.equal(lastCashfreeOrder.order_amount, 9990);
});

await test('POST /api/payment/initialize determines authoritative amount for Business monthly (399)', async () => {
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'business', billingCycle: 'monthly' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.amount, 399);
  assert.equal(lastCashfreeOrder.order_amount, 399);
});

await test('POST /api/payment/initialize determines authoritative amount for Starter monthly (199)', async () => {
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'starter', billingCycle: 'monthly' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.amount, 199);
  assert.equal(lastCashfreeOrder.order_amount, 199);
});

await test('POST /api/payment/create-order alias works identically to initialize', async () => {
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/create-order', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'starter', billingCycle: 'yearly' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.amount, 1990);
  assert.equal(lastCashfreeOrder.order_amount, 1990);
});

console.log('\n=== SUITE 2: Server-Controlled Test Payment Mode ===');

await test('Sandbox test mode allows is_test_payment=true and sets order_amount=1 and is_test_payment=1', async () => {
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'pro', billingCycle: 'yearly', is_test_payment: true })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.amount, 1);
  assert.equal(data.isTestPayment, true);
  assert.equal(lastCashfreeOrder.order_amount, 1);

  // Check transaction record has is_test_payment = 1
  const tx = db.tables.transactions.find(t => t.id === data.id);
  assert.ok(tx);
  assert.equal(tx.is_test_payment, 1);
});

await test('Production rejects test payment request when ALLOW_TEST_PAYMENT is false/disabled (403)', async () => {
  const prodEnv = {
    ...mockEnv,
    CASHFREE_ENV: 'production',
    ALLOW_TEST_PAYMENT: 'false',
    ENABLE_TEST_PAYMENT: 'false',
    ENVIRONMENT: 'production'
  };
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'business', billingCycle: 'monthly', is_test_payment: true })
  });
  const res = await worker.fetch(req, prodEnv);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.code, 'TEST_PAYMENT_DISABLED');
});

console.log('\n=== SUITE 3: Cashfree URL Callback Origin Security ===');

await test('Payment initialize ignores spoofed Origin header and strictly uses trusted app URLs', async () => {
  const token = await createAuthToken('usr_test_merchant');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://evil-attacker-site.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ plan: 'business', billingCycle: 'monthly' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(lastCashfreeOrder);
  assert.equal(lastCashfreeOrder.order_meta.return_url, `https://ferasetu.com/upgrade?order_id=${data.id}`);
  assert.equal(lastCashfreeOrder.order_meta.notify_url, 'https://ferasetu.com/api/payment/webhook');
});

console.log('\n=== SUITE 4: Webhook Idempotency & Concurrency Safety ===');

await test('Cashfree webhook is strictly idempotent: replay returns already_processed: true', async () => {
  const txId = 'tx_idemp_test_1';
  const orderId = 'cf_idemp_ord_1';
  db.tables.transactions.push({
    id: txId,
    user_id: 'usr_test_merchant',
    organization_id: 'org_test_merchant',
    provider: 'cashfree',
    provider_order_id: orderId,
    amount: 399,
    currency: 'INR',
    status: 'pending',
    plan: 'business',
    billing_cycle: 'monthly',
    is_test_payment: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const timestamp = Date.now().toString();
  const body = JSON.stringify({
    data: {
      order: { order_id: orderId, order_amount: 399 },
      payment: { payment_status: 'SUCCESS', payment_amount: 399, cf_payment_id: 'cf_pay_idemp_1' }
    }
  });
  const sig = computeHmacSignature(timestamp, body, mockSecret);

  // First webhook delivery
  const req1 = new Request('https://ferasetu.com/api/payment/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-signature': sig, 'x-webhook-timestamp': timestamp },
    body
  });
  const res1 = await worker.fetch(req1, mockEnv);
  assert.equal(res1.status, 200);

  // Check transaction status
  const txAfter1 = db.tables.transactions.find(t => t.id === txId);
  assert.equal(txAfter1.status, 'completed');

  // Second webhook delivery (replay)
  const req2 = new Request('https://ferasetu.com/api/payment/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-signature': sig, 'x-webhook-timestamp': timestamp },
    body
  });
  const res2 = await worker.fetch(req2, mockEnv);
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.already_processed, true);
});

console.log('\n=== SUITE 5: Admin Security & Fail-Closed Behavior ===');

await test('Admin login fails closed (500) if no ADMIN_PASSWORD_HASH or ADMIN_PASSWORD configured', async () => {
  const emptyAdminEnv = {
    ...mockEnv,
    ADMIN_USERNAME: '',
    ADMIN_PASSWORD: '',
    ADMIN_PASSWORD_HASH: '',
    ADMIN_EMAIL: ''
  };
  const req = new Request('https://ferasetu.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@ferasetu.com', password: 'password123' })
  });
  const res = await worker.fetch(req, emptyAdminEnv);
  assert.equal(res.status, 500);
  const data = await res.json();
  assert.match(data.error, /Admin authentication is not configured/i);
});

await test('Admin login rejects hardcoded passwords (Admin@FeraSetu2026, admin123) when not configured', async () => {
  const req1 = new Request('https://ferasetu.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@ferasetu.com', password: 'Admin@FeraSetu2026' })
  });
  const res1 = await worker.fetch(req1, mockEnv);
  assert.equal(res1.status, 401);

  const req2 = new Request('https://ferasetu.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@ferasetu.com', password: 'admin123' })
  });
  const res2 = await worker.fetch(req2, mockEnv);
  assert.equal(res2.status, 401);
});

await test('Admin login succeeds with configured credentials and returns valid JWT', async () => {
  const req = new Request('https://ferasetu.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@ferasetu.com', password: 'admin_test_secure_password_2026' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.success, true);
});

await test('Admin dashboard-stats returns normalized health operational status', async () => {
  const loginReq = new Request('https://ferasetu.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@ferasetu.com', password: 'admin_test_secure_password_2026' })
  });
  const loginRes = await worker.fetch(loginReq, mockEnv);
  const { token } = await loginRes.json();

  const statsReq = new Request('https://ferasetu.com/api/admin/dashboard-stats', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statsRes = await worker.fetch(statsReq, mockEnv);
  assert.equal(statsRes.status, 200);
  const data = await statsRes.json();
  assert.equal(data.health.status, 'operational');
  assert.equal(data.health.database, 'operational');
  assert.equal(data.health.smtp, 'operational');
  assert.equal(data.health.ai, 'operational');
});

await test('Admin orders query joins organizations and users to populate shop_name and user_email', async () => {
  const loginReq = new Request('https://ferasetu.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@ferasetu.com', password: 'admin_test_secure_password_2026' })
  });
  const loginRes = await worker.fetch(loginReq, mockEnv);
  const { token } = await loginRes.json();

  const ordersReq = new Request('https://ferasetu.com/api/admin/orders', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const ordersRes = await worker.fetch(ordersReq, mockEnv);
  assert.equal(ordersRes.status, 200);
  const data = await ordersRes.json();
  assert.ok(data.orders.length > 0);
  const firstOrder = data.orders[0];
  assert.ok(firstOrder.shop_name);
  assert.ok(firstOrder.user_email);
});

console.log('\n=== SUITE 6: Starter Product Quota Enforcement ===');

await test('Starter merchant is blocked from exceeding 100 products', async () => {
  // Populate 100 products for org_starter_merchant
  db.tables.products = Array.from({ length: 100 }, (_, i) => ({
    id: `prod_starter_${i}`,
    organization_id: 'org_starter_merchant',
    user_id: 'usr_starter_merchant',
    name: `Product ${i}`,
    price: 100
  }));

  const token = await createAuthToken('usr_starter_merchant', 'owner', 'org_starter_merchant');
  const req = new Request('https://ferasetu.com/api/products', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Product 101', price: 150 })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /product limit reached/i);
});

console.log('\n=== SUITE 7: Customer Email Visibility for Store Merchant ===');

await test('Merchant fetching orders sees customer_email for their own store', async () => {
  const token = await createAuthToken('usr_test_merchant', 'owner', 'org_test_merchant');
  const req = new Request('https://ferasetu.com/api/orders', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.orders.length > 0);
  const merchantOrder = data.orders.find(o => o.id === 'ord_merchant_1');
  assert.ok(merchantOrder);
  assert.equal(merchantOrder.customer_email, 'rahul.customer@example.com');
});

console.log('\n' + '─'.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}

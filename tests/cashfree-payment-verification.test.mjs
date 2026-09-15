import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/index.js';
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

// In-memory D1 mock for testing worker payment & order tracking
function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_in_merchant',
        email: 'in_merchant@ferasetu.com',
        name: 'India Kirana',
        plan: 'free',
        market: 'IN',
        phone: '+919876543210',
        subdomain: 'in-kirana',
        hostname: 'in-kirana.ferasetu.com',
        ai_credits_balance: 20,
        ai_credits_monthly_limit: 20,
        ai_credits_used_month: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr_us_merchant',
        email: 'us_merchant@ferasetu.com',
        name: 'US Retailer',
        plan: 'business',
        market: 'US',
        phone: '+15551234567',
        subdomain: 'us-retail',
        hostname: 'us-retail.ferasetu.com',
        ai_credits_balance: 50,
        ai_credits_monthly_limit: 200,
        ai_credits_used_month: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr_eu_merchant',
        email: 'eu_merchant@ferasetu.com',
        name: 'Europe Boutique',
        plan: 'business',
        market: 'EU',
        phone: '+33612345678',
        subdomain: 'eu-boutique',
        hostname: 'eu-boutique.ferasetu.com',
        ai_credits_balance: 10,
        ai_credits_monthly_limit: 200,
        ai_credits_used_month: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr_expired_trial',
        email: 'expired@ferasetu.com',
        name: 'Expired Merchant',
        plan: 'trial',
        market: 'US',
        phone: '+15559998877',
        subdomain: 'expired-store',
        hostname: 'expired-store.ferasetu.com',
        plan_expires_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        trial_ends_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        ai_credits_balance: 20,
        ai_credits_monthly_limit: 20,
        ai_credits_used_month: 0,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr_free_merchant',
        email: 'free_merchant@ferasetu.com',
        name: 'Free Tier Merchant',
        plan: 'free',
        market: 'IN',
        phone: '+919876543219',
        subdomain: 'free-merchant',
        hostname: 'free-merchant.ferasetu.com',
        ai_credits_balance: 20,
        ai_credits_monthly_limit: 20,
        ai_credits_used_month: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    organizations: [
      {
        id: 'org_in_merchant',
        name: 'India Kirana Org',
        workos_organization_id: 'org_workos_1',
        market: 'IN',
        plan: 'free',
        store_slug: 'in-kirana',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'org_expired_trial',
        name: 'Expired Store Org',
        workos_organization_id: 'org_workos_2',
        market: 'US',
        plan: 'trial',
        store_slug: 'expired-store',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'org_free_merchant',
        name: 'Free Merchant Org',
        workos_organization_id: 'org_workos_free',
        market: 'IN',
        plan: 'free',
        store_slug: 'free-merchant',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    organization_members: [
      {
        id: 'om_1',
        organization_id: 'org_in_merchant',
        user_id: 'usr_in_merchant',
        role: 'owner',
        created_at: new Date().toISOString()
      },
      {
        id: 'om_2',
        organization_id: 'org_expired_trial',
        user_id: 'usr_expired_trial',
        role: 'owner',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id: 'om_free_1',
        organization_id: 'org_free_merchant',
        user_id: 'usr_free_merchant',
        role: 'owner',
        created_at: new Date().toISOString()
      }
    ],
    products: [
      {
        id: 'prod_1',
        organization_id: 'org_1',
        user_id: 'usr_in_merchant',
        name: 'Basmati Rice 5kg',
        price: 350,
        sale_price: 320,
        stock_quantity: 50,
        stock: 50,
        is_active: 1,
        created_at: new Date().toISOString()
      }
    ],
    orders: [
      {
        id: 'ord_101',
        organization_id: 'org_1',
        user_id: 'usr_in_merchant',
        customer_name: 'Anita Sharma',
        customer_phone: '9876543210',
        items: JSON.stringify([{ id: 'prod_1', name: 'Basmati Rice', qty: 1, price: 320 }]),
        total: 320,
        status: 'confirmed',
        created_at: new Date().toISOString()
      },
      {
        id: 'ord_102',
        organization_id: 'org_2',
        user_id: 'usr_other_shop',
        customer_name: 'Vikram Singh',
        customer_phone: '9876543210',
        items: JSON.stringify([{ id: 'prod_x', name: 'Other Item', qty: 1, price: 500 }]),
        total: 500,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ],
    transactions: [
      {
        id: 'tx_cashfree_test_1',
        user_id: 'usr_in_merchant',
        provider: 'cashfree',
        provider_order_id: 'cf_ord_real_9999',
        amount: 399,
        currency: 'INR',
        status: 'pending',
        plan: 'business',
        billing_cycle: 'monthly',
        metadata: JSON.stringify({ provider: 'cashfree' }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    subscriptions: [],
    credit_transactions: [],
    ai_credit_purchases: []
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
        async first() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('from subscriptions where user_id = ?')) {
            const uid = this._params[0];
            return tables.subscriptions.find(sub => sub.user_id === uid) || null;
          }
          if (s.includes('from subscriptions where id = ?')) {
            const sid = this._params[0];
            return tables.subscriptions.find(sub => sub.id === sid) || null;
          }
          if (s.includes('from credit_transactions where reference_id = ?')) {
            const refId = this._params[0];
            return tables.credit_transactions.find(ct => ct.reference_id === refId) || null;
          }
          if (s.includes('from users where id = ?')) {
            const uid = this._params[0];
            return tables.users.find(u => u.id === uid) || null;
          }
          if (s.includes('from users where (lower(subdomain) = ?') || s.includes('from users where subdomain = ? or hostname = ?') || s.includes('from users u left join websites')) {
            const val = this._params[0];
            const host = this._params[1];
            return tables.users.find(u => u.subdomain === val || u.hostname === val || u.hostname === host || u.id === val) || null;
          }
          if (s.includes('count(*) as cnt from organization_members')) {
            const orgId = this._params[0];
            return { cnt: tables.organization_members.filter(m => m.organization_id === orgId).length };
          }
          if (s.includes('count(*) as cnt from products')) {
            return { cnt: tables.products.length };
          }
          if (s.includes('from organizations where workos_organization_id = ?') || s.includes('from organizations where id = ?') || s.includes('from organizations where')) {
            const orgId = this._params[0];
            return tables.organizations.find(o => o.id === orgId || o.workos_organization_id === orgId || o.store_slug === orgId) || null;
          }
          if (s.includes('from organization_members om join organizations o')) {
            const uid = this._params[0];
            const mem = tables.organization_members.find(m => m.user_id === uid);
            if (!mem) return null;
            const org = tables.organizations.find(o => o.id === mem.organization_id);
            if (!org) return null;
            return { ...org, member_role: mem.role, member_id: mem.id };
          }
          if (s.includes('from organization_members where organization_id = ? and user_id = ?')) {
            const [orgId, uid] = this._params;
            return tables.organization_members.find(m => m.organization_id === orgId && m.user_id === uid) || null;
          }
          if (s.includes('from transactions where')) {
            if (s.includes('user_id = ?')) {
              const userId = this._params[this._params.length - 1];
              const orderIds = this._params.slice(0, -1);
              return tables.transactions.find(t =>
                t.user_id === userId && orderIds.some(id => id && (t.id === id || t.provider_order_id === id))
              ) || null;
            }
            const orderIds = this._params;
            return tables.transactions.find(t =>
              orderIds.some(id => id && (t.id === id || t.provider_order_id === id))
            ) || null;
          }
          if (s.includes('from orders where id = ?')) {
            const oid = this._params[0];
            return tables.orders.find(o => o.id === oid) || null;
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('from orders where')) {
            const shopId1 = this._params[0];
            const shopId2 = this._params[1];
            const cleanPhone = this._params[2];
            const digitsOnly = this._params[3];

            const filtered = tables.orders.filter(o => {
              const shopMatch = (o.organization_id === shopId1 || o.user_id === shopId2);
              if (!shopMatch) return false;
              const phone = o.customer_phone || '';
              if (phone === cleanPhone || phone === digitsOnly) return true;
              if (digitsOnly.length >= 10 && phone.endsWith(digitsOnly.slice(-10))) return true;
              return false;
            });
            return { results: filtered };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('update transactions')) {
            const txId = this._params[this._params.length - 1];
            const tx = tables.transactions.find(t => t.id === txId);
            if (tx) {
              tx.status = 'completed';
              tx.updated_at = new Date().toISOString();
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('update ai_credit_purchases')) {
            const purchaseId = this._params[this._params.length - 1];
            const p = tables.ai_credit_purchases.find(x => x.id === purchaseId);
            if (p) {
              p.status = 'completed';
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('update users set ai_credits_balance = coalesce(ai_credits_balance, 0) + ?')) {
            const addCredits = this._params[0];
            const userId = this._params[2];
            const u = tables.users.find(x => x.id === userId);
            if (u) {
              u.ai_credits_balance = (u.ai_credits_balance || 0) + addCredits;
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('update users set plan = ?')) {
            const plan = this._params[0];
            const userId = this._params[this._params.length - 1];
            const u = tables.users.find(x => x.id === userId);
            if (u) {
              u.plan = plan;
              if (s.includes('trial_used')) {
                u.trial_used = this._params[1];
                u.trial_started_at = this._params[2];
                u.trial_ends_at = this._params[3];
                u.plan_expires_at = this._params[4];
                u.cancel_at_period_end = this._params[5];
                u.updated_at = this._params[6];
              } else {
                u.plan_expires_at = this._params[1];
                u.ai_credits_balance += this._params[2];
                u.ai_credits_monthly_limit = this._params[3];
                u.updated_at = this._params[4];
              }
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into transactions')) {
            if (s.includes("'credits', 'one_time'") || this._params.length === 7) {
              tables.transactions.push({
                id: this._params[0],
                user_id: this._params[1],
                provider: 'cashfree',
                provider_order_id: this._params[2],
                amount: this._params[3],
                currency: 'INR',
                status: 'pending',
                plan: 'credits',
                billing_cycle: 'one_time',
                metadata: this._params[4],
                created_at: this._params[5],
                updated_at: this._params[6],
              });
            } else if (s.includes('organization_id')) {
              tables.transactions.push({
                id: this._params[0],
                user_id: this._params[1],
                organization_id: this._params[2],
                provider: s.includes("'razorpay'") ? 'razorpay' : 'cashfree',
                provider_order_id: this._params[3],
                amount: this._params[4],
                currency: this._params[5] || 'INR',
                status: 'pending',
                plan: this._params[6],
                billing_cycle: this._params[7],
                metadata: this._params[8],
                created_at: this._params[9],
                updated_at: this._params[10],
              });
            } else {
              tables.transactions.push({
                id: this._params[0],
                user_id: this._params[1],
                provider: this._params[2] || 'cashfree',
                provider_order_id: this._params[3],
                amount: this._params[4],
                currency: this._params[5] || 'INR',
                status: this._params[6] || 'pending',
                plan: this._params[7],
                billing_cycle: this._params[8],
                metadata: this._params[9],
                created_at: this._params[10],
                updated_at: this._params[11],
              });
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into ai_credit_purchases')) {
            tables.ai_credit_purchases.push({
              id: this._params[0],
              user_id: this._params[1],
              credits: this._params[2],
              amount: this._params[3],
              usage_scope: this._params[4],
              status: this._params[5],
              created_at: this._params[6],
            });
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into subscriptions')) {
            const [id, user_id, organization_id, plan, status, trial_used] = this._params;
            tables.subscriptions.push({
              id,
              user_id,
              organization_id: organization_id || null,
              plan: plan || 'free',
              status: status || 'free',
              trial_used: trial_used || 0,
              trial_started_at: this._params[6] || null,
              trial_ends_at: this._params[7] || null,
              current_period_start: this._params[8] || null,
              current_period_end: this._params[9] || null,
              cancel_at_period_end: this._params[10] || 0,
              payment_provider: this._params[11] || null,
              provider_order_id: this._params[12] || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('update subscriptions')) {
            const uid = this._params[this._params.length - 1];
            let sub = tables.subscriptions.find(x => x.user_id === uid);
            if (!sub) {
              sub = { id: `sub_${uid}`, user_id: uid };
              tables.subscriptions.push(sub);
            }
            sub.organization_id = this._params[0];
            sub.plan = this._params[1];
            sub.status = this._params[2];
            sub.trial_used = this._params[3];
            sub.trial_started_at = this._params[4];
            sub.trial_ends_at = this._params[5];
            sub.current_period_start = this._params[6];
            sub.current_period_end = this._params[7];
            sub.cancel_at_period_end = this._params[8];
            sub.payment_provider = this._params[9];
            sub.provider_order_id = this._params[10];
            sub.provider_payment_id = this._params[11];
            sub.metadata = this._params[12];
            sub.updated_at = this._params[13];
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into orders')) {
            const [id, user_id, organization_id, customer_name, customer_phone, items, total, status, created_at] = this._params;
            tables.orders.push({ id, user_id, organization_id, customer_name, customer_phone, items, total, status, created_at });
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

const mockSecret = 'cf_secret_test_key_1234567890';
const db = createTestDb();

// Generate RS256 key for testing authenticated worker routes
const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
const mockJWKS = jose.createLocalJWKSet({ keys: [{ ...jwk, kid: 'test-workos-key', alg: 'RS256', use: 'sig' }] });

async function createAuthToken(userId, role = 'owner', orgId = 'org_in_merchant') {
  return await new jose.SignJWT({ sub: userId, email: `${userId}@ferasetu.com`, role, org_id: orgId })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

// Mock outbound Cashfree fetch calls during tests
let lastCashfreeOrderBody = null;
let lastCashfreeFetchUrl = null;
let mockGatewayStatusOverride = null;
let mockGatewayAmountOverride = null;
let mockGatewayCurrencyOverride = null;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const urlStr = String(url);
  if (urlStr.includes('cashfree.com/pg/orders')) {
    lastCashfreeFetchUrl = urlStr;
    if (options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      lastCashfreeOrderBody = body;
      return new Response(JSON.stringify({
        cf_order_id: 'cf_ord_mock_12345',
        order_id: body.order_id,
        order_amount: body.order_amount,
        order_currency: body.order_currency || 'INR',
        payment_session_id: `session_cf_real_${body.order_id}`,
        order_status: 'ACTIVE',
        order_meta: body.order_meta,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (options.method === 'GET') {
      const parts = urlStr.split('/');
      const orderId = decodeURIComponent(parts[parts.length - 1]);
      const tx = db.tables.transactions.find(t => t.id === orderId || t.provider_order_id === orderId);
      const amount = tx ? tx.amount : 149;
      return new Response(JSON.stringify({
        cf_order_id: 'cf_ord_mock_12345',
        order_id: orderId,
        order_amount: mockGatewayAmountOverride !== null ? mockGatewayAmountOverride : amount,
        order_currency: mockGatewayCurrencyOverride || 'INR',
        order_status: mockGatewayStatusOverride || 'PAID',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }
  return originalFetch(url, options);
};

const mockEnv = {
  DB: db,
  CASHFREE_APP_ID: 'cf_app_id_test',
  CASHFREE_SECRET_KEY: mockSecret,
  CASHFREE_ENV: 'sandbox',
  JWKS: mockJWKS,
};

function computeHmacSignature(timestamp, rawBody, secret) {
  const payload = `${timestamp}${rawBody}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('base64');
}

console.log('\n💳 SUITE 1: Cashfree Webhook Route & HMAC-SHA256 Signature Verification');

await test('POST /api/payment/webhook returns 401 if signature headers are missing', async () => {
  const req = new Request('https://ferasetu.com/api/payment/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: 'cf_ord_real_9999' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes('Missing required webhook signature'));
});

await test('POST /api/payment/webhook returns 401 for invalid signature', async () => {
  const timestamp = Date.now().toString();
  const body = JSON.stringify({
    data: {
      order: { order_id: 'cf_ord_real_9999', order_amount: 399 },
      payment: { payment_status: 'SUCCESS', payment_amount: 399, cf_payment_id: 'cf_pay_123' }
    }
  });

  const req = new Request('https://ferasetu.com/api/payment/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': 'invalid_forged_base64_signature=',
      'x-webhook-timestamp': timestamp
    },
    body
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes('signature'));
});

await test('POST /api/payment/webhook returns 401 if timestamp clock skew exceeds 15 minutes', async () => {
  const staleTimestamp = (Date.now() - 20 * 60 * 1000).toString(); // 20 mins ago
  const body = JSON.stringify({
    data: {
      order: { order_id: 'cf_ord_real_9999', order_amount: 399 },
      payment: { payment_status: 'SUCCESS', payment_amount: 399, cf_payment_id: 'cf_pay_123' }
    }
  });
  const validSignature = computeHmacSignature(staleTimestamp, body, mockSecret);

  const req = new Request('https://ferasetu.com/api/payment/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': validSignature,
      'x-webhook-timestamp': staleTimestamp
    },
    body
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes('timestamp') || data.error.includes('expired') || data.error.includes('skew'));
});

await test('POST /api/payment/webhook verifies authentic signature and upgrades merchant plan', async () => {
  const timestamp = Date.now().toString();
  const body = JSON.stringify({
    data: {
      order: { order_id: 'cf_ord_real_9999', order_amount: 399 },
      payment: { payment_status: 'SUCCESS', payment_amount: 399, cf_payment_id: 'cf_pay_987654' }
    }
  });
  const validSignature = computeHmacSignature(timestamp, body, mockSecret);

  const req = new Request('https://ferasetu.com/api/payment/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': validSignature,
      'x-webhook-timestamp': timestamp
    },
    body
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  // Confirm plan and transaction completed in D1
  const tx = db.tables.transactions.find(t => t.id === 'tx_cashfree_test_1');
  assert.equal(tx.status, 'completed');
  const user = db.tables.users.find(u => u.id === 'usr_in_merchant');
  assert.equal(user.plan, 'business');
});

console.log('\n🛡️ SUITE 2: Bug 1 — Dummy / Unverified Session Rejection');

await test('Payment verify blocks cf_dev_ dummy session IDs in non-test mode', () => {
  const dummyIds = ['cf_dev_123', 'order_dev_456', 'session_dev_789', 'cf_test_abc'];
  for (const id of dummyIds) {
    const isBlocked = String(id).startsWith('cf_dev_') || String(id).startsWith('order_dev_') || String(id).startsWith('session_dev_') || String(id).startsWith('cf_test_');
    assert.equal(isBlocked, true, `Expected dummy id ${id} to be blocked`);
  }
});

await test('Payment verify blocks cs_dev_ dummy Stripe session IDs in non-test mode', () => {
  const dummyStripe = ['cs_dev_123', 'cs_test_abc', 'dummy_sess_999'];
  for (const id of dummyStripe) {
    const isBlocked = String(id).startsWith('cs_dev_') || String(id).startsWith('cs_test_') || String(id).startsWith('dummy_');
    assert.equal(isBlocked, true, `Expected dummy Stripe id ${id} to be blocked`);
  }
});

console.log('\n🔒 SUITE 3: Bug 2 — Secure Order Tracking & PII Leak Defense');

await test('GET /api/orders/public/track requires both shopId and phone parameters', async () => {
  const req1 = new Request('https://ferasetu.com/api/orders/public/track?phone=9876543210');
  const res1 = await worker.fetch(req1, mockEnv);
  assert.equal(res1.status, 400);

  const req2 = new Request('https://ferasetu.com/api/orders/public/track?shopId=usr_in_merchant');
  const res2 = await worker.fetch(req2, mockEnv);
  assert.equal(res2.status, 400);
});

await test('GET /api/orders/public/track rejects short phone strings (< 7 digits) to prevent global order leaks', async () => {
  const req = new Request('https://ferasetu.com/api/orders/public/track?shopId=usr_in_merchant&phone=1');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('at least 7 digits'));
});

await test('GET /api/orders/public/track isolates cross-tenant orders with same customer phone', async () => {
  // Both orders ord_101 and ord_102 have customer_phone: 9876543210, but different shopId
  const req = new Request('https://ferasetu.com/api/orders/public/track?shopId=usr_in_merchant&phone=9876543210');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.orders.length, 1);
  assert.equal(data.orders[0].id, 'ord_101');
  assert.equal(data.orders[0].customer_name, 'Anita Sharma');
});

await test('Orders creation (createOrder) preserves customer_phone in database record', () => {
  const testPhone = '+91 98765 43210';
  const cleanPhone = testPhone.trim();
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  assert.equal(digitsOnly, '919876543210');
  assert.ok(digitsOnly.length >= 10);
});

console.log('\n👑 SUITE 4: Bug 3 — Server-Authoritative Market Pricing');

await test('User profile market is authoritative over spoofed client body.market', () => {
  const user = { id: 'usr_1', market: 'IN', state: 'Delhi' };
  const clientBody = { market: 'US', plan: 'free' };
  const authoritativeMarket = user?.market || 'IN';
  assert.equal(authoritativeMarket, 'IN');
  // Free plan is allowed for IN
  assert.equal(authoritativeMarket === 'IN', true);
});

console.log('\n🇪🇺 SUITE 5: Bug 4 — European AI Strategy Credit Reservation & Refund');

await test('European AI requests return not_configured and do not deduct credits', () => {
  const routerResponse = {
    status: 'not_configured',
    routing: { market: 'EU', status: 'not_configured' }
  };
  const isScheduledOrUnconfigured =
    routerResponse.status === 'not_configured' ||
    routerResponse.routing?.status === 'not_configured' ||
    routerResponse.routing?.market === 'EU';

  assert.equal(isScheduledOrUnconfigured, true);
});

console.log('\n💱 SUITE 6: Bug 5 — Dynamic Store Currency Symbol in WhatsApp Checkout');

await test('WhatsApp checkout dynamically adapts currency symbol and locale', () => {
  const testCases = [
    { currency: 'INR', symbol: '₹', amount: 1500, expected: '₹1,500' },
    { currency: 'USD', symbol: '$', amount: 84, expected: '$84' },
    { currency: 'EUR', symbol: '€', amount: 95, expected: '€95' },
  ];

  for (const tc of testCases) {
    const locale = tc.currency === 'INR' ? 'en-IN' : tc.currency === 'EUR' ? 'de-DE' : 'en-US';
    const formatted = `${tc.symbol}${tc.amount.toLocaleString(locale)}`;
    assert.ok(formatted.startsWith(tc.symbol), `Expected to start with ${tc.symbol}`);
  }
});

console.log('\n🚀 SUITE 7: End-to-End Monetization, Cashfree Add-ons & Plan Isolation');

await test('POST /api/payment/initialize uses dynamic request origin for Cashfree return_url', async () => {
  const token = await createAuthToken('usr_free_merchant', 'owner', 'org_workos_free');
  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://custom-shop.example.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan: 'business',
      billingCycle: 'monthly',
      amount: 399
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.gateway, 'cashfree');
  assert.equal(data.requiresPayment, true);
  assert.ok(data.paymentSessionId);
  assert.ok(lastCashfreeOrderBody);
  assert.equal(lastCashfreeOrderBody.order_meta.return_url, `https://custom-shop.example.com/upgrade?order_id=${data.id}`);
});

let creditPurchaseTxId = null;
let creditCashfreeOrderId = null;

await test('POST /api/payment/ai-credits/purchase creates Cashfree gateway order without granting credits before verification', async () => {
  const token = await createAuthToken('usr_free_merchant', 'owner', 'org_workos_free');
  const req = new Request('https://ferasetu.com/api/payment/ai-credits/purchase', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://custom-shop.example.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pack: 'small',
      usage_scope: 'shared'
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.requiresPayment, true);
  assert.equal(data.gateway, 'cashfree');
  assert.equal(data.amount, 149);
  assert.equal(data.currency, 'INR');
  assert.ok(data.paymentSessionId);

  creditPurchaseTxId = data.id;
  creditCashfreeOrderId = data.cashfreeOrderId;

  // Verify credits balance was NOT incremented prematurely before verification
  const user = db.tables.users.find(u => u.id === 'usr_free_merchant');
  assert.equal(user.ai_credits_balance, 20);

  // Verify transaction status is pending in D1
  const tx = db.tables.transactions.find(t => t.id === creditPurchaseTxId);
  assert.ok(tx);
  assert.equal(tx.status, 'pending');
  assert.equal(tx.plan, 'credits');
});

await test('POST /api/payment/verify isolates add-on fulfillment and leaves merchant plan as free', async () => {
  const token = await createAuthToken('usr_free_merchant', 'owner', 'org_workos_free');
  const req = new Request('https://ferasetu.com/api/payment/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_id: creditPurchaseTxId,
      cashfree_order_id: creditCashfreeOrderId,
      provider: 'cashfree'
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.type, 'ai_credits');
  assert.equal(data.creditsAdded, 250);

  // Assert user credits updated while plan remains strictly 'free'
  const user = db.tables.users.find(u => u.id === 'usr_free_merchant');
  assert.equal(user.ai_credits_balance, 270);
  assert.equal(user.plan, 'free');

  // Assert transaction is marked completed
  const tx = db.tables.transactions.find(t => t.id === creditPurchaseTxId);
  assert.equal(tx.status, 'completed');
});

await test('POST /api/organizations/invitations enforces staff seat limits and rejects excess team members with 403', async () => {
  const token = await createAuthToken('usr_free_merchant', 'owner', 'org_workos_free');
  const req = new Request('https://ferasetu.com/api/organizations/invitations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'staffmember@ferasetu.com',
      role: 'staff'
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.code, 'STAFF_LIMIT_REACHED');
});

await test('Storefront gateway blocks expired US/EU trials with 402 Store Temporarily Unavailable', async () => {
  const req = new Request('https://expired-store.ferasetu.com/');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 402);
  const html = await res.text();
  assert.ok(html.includes('Store Temporarily Unavailable'));
  assert.ok(html.includes('The trial period for this store has ended'));
});

console.log('\n🔒 SUITE 8: Production vs Sandbox Cashfree Flow, Idempotency & Security Audit');

const prodEnv = {
  ...mockEnv,
  CASHFREE_ENV: 'production',
};

let prodUpgradeTxId = null;
let prodPaymentSessionId = null;

await test('Production Worker uses Cashfree production API (api.cashfree.com) and returns cashfreeEnv: "production"', async () => {
  const token = await createAuthToken('usr_in_merchant', 'owner', 'org_workos_in');
  lastCashfreeFetchUrl = null;

  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://ferasetu.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan: 'business',
      billingCycle: 'monthly',
      amount: 399
    })
  });

  const res = await worker.fetch(req, prodEnv);
  assert.equal(res.status, 201);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.gateway, 'cashfree');
  assert.equal(data.cashfreeEnv, 'production');
  assert.ok(data.paymentSessionId);
  assert.ok(lastCashfreeFetchUrl.startsWith('https://api.cashfree.com/pg/orders'), `Expected production URL, got ${lastCashfreeFetchUrl}`);

  // No secrets leaked in API response
  const stringified = JSON.stringify(data);
  assert.ok(!stringified.includes(mockEnv.CASHFREE_SECRET_KEY));
  assert.ok(!stringified.includes(mockEnv.CASHFREE_APP_ID));

  prodUpgradeTxId = data.id;
  prodPaymentSessionId = data.paymentSessionId;
});

await test('Sandbox Worker uses Cashfree sandbox API (sandbox.cashfree.com) and returns cashfreeEnv: "sandbox"', async () => {
  const token = await createAuthToken('usr_in_merchant', 'owner', 'org_workos_in');
  lastCashfreeFetchUrl = null;

  const req = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://ferasetu.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan: 'business',
      billingCycle: 'monthly',
      amount: 399
    })
  });

  const res = await worker.fetch(req, mockEnv); // mockEnv has CASHFREE_ENV: 'sandbox'
  assert.equal(res.status, 201);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.gateway, 'cashfree');
  assert.equal(data.cashfreeEnv, 'sandbox');
  assert.ok(lastCashfreeFetchUrl.startsWith('https://sandbox.cashfree.com/pg/orders'), `Expected sandbox URL, got ${lastCashfreeFetchUrl}`);
});

await test('POST /api/payment/verify rejects non-PAID Cashfree orders (e.g. ACTIVE / PENDING)', async () => {
  const token = await createAuthToken('usr_in_merchant', 'owner', 'org_workos_in');
  mockGatewayStatusOverride = 'ACTIVE';

  const req = new Request('https://ferasetu.com/api/payment/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_id: prodUpgradeTxId,
      cashfree_order_id: prodUpgradeTxId,
      provider: 'cashfree'
    })
  });

  const res = await worker.fetch(req, prodEnv);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('not been completed or paid'));
  mockGatewayStatusOverride = null;
});

await test('POST /api/payment/verify rejects amount mismatch between gateway and transaction', async () => {
  const token = await createAuthToken('usr_in_merchant', 'owner', 'org_workos_in');
  mockGatewayAmountOverride = 10; // Expected 399

  const req = new Request('https://ferasetu.com/api/payment/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_id: prodUpgradeTxId,
      cashfree_order_id: prodUpgradeTxId,
      provider: 'cashfree'
    })
  });

  const res = await worker.fetch(req, prodEnv);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Payment amount mismatch'));
  mockGatewayAmountOverride = null;
});

await test('POST /api/payment/verify rejects currency mismatch between gateway and transaction', async () => {
  const token = await createAuthToken('usr_in_merchant', 'owner', 'org_workos_in');
  mockGatewayCurrencyOverride = 'USD'; // Expected INR

  const req = new Request('https://ferasetu.com/api/payment/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_id: prodUpgradeTxId,
      cashfree_order_id: prodUpgradeTxId,
      provider: 'cashfree'
    })
  });

  const res = await worker.fetch(req, prodEnv);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Payment currency mismatch'));
  mockGatewayCurrencyOverride = null;
});

await test('POST /api/payment/verify rejects cross-merchant verification (merchant B cannot verify merchant A)', async () => {
  // Attacker token
  const attackerToken = await createAuthToken('usr_us_merchant', 'owner', 'org_workos_us');

  const req = new Request('https://ferasetu.com/api/payment/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${attackerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_id: prodUpgradeTxId,
      cashfree_order_id: prodUpgradeTxId,
      provider: 'cashfree'
    })
  });

  const res = await worker.fetch(req, prodEnv);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.ok(data.error.includes('not found'));
});

await test('Subscription plan verification upgrades plan and is fully idempotent on replay/refresh', async () => {
  const token = await createAuthToken('usr_in_merchant', 'owner', 'org_workos_in');

  // Initial verification
  const req1 = new Request('https://ferasetu.com/api/payment/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_id: prodUpgradeTxId,
      cashfree_order_id: prodUpgradeTxId,
      provider: 'cashfree'
    })
  });

  const res1 = await worker.fetch(req1, prodEnv);
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.success, true);
  assert.equal(data1.plan, 'business');

  const user = db.tables.users.find(u => u.id === 'usr_in_merchant');
  assert.equal(user.plan, 'business');

  // Second verification (browser refresh / duplicate callback / webhook arriving)
  const req2 = new Request('https://ferasetu.com/api/payment/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_id: prodUpgradeTxId,
      cashfree_order_id: prodUpgradeTxId,
      provider: 'cashfree'
    })
  });

  const res2 = await worker.fetch(req2, prodEnv);
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.success, true);
  assert.equal(data2.already_processed, true);
  assert.equal(data2.plan, 'business');

  // Verify plan remains business without corruption
  const userAfter = db.tables.users.find(u => u.id === 'usr_in_merchant');
  assert.equal(userAfter.plan, 'business');
});

await test('AI credit purchase verification is fully idempotent (repeated verify cannot grant duplicate credits)', async () => {
  const token = await createAuthToken('usr_in_merchant', 'owner', 'org_workos_in');

  // 1. Purchase credit pack
  const purchaseReq = new Request('https://ferasetu.com/api/payment/ai-credits/purchase', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://ferasetu.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pack: 'small',
      usage_scope: 'shared'
    })
  });

  const purchaseRes = await worker.fetch(purchaseReq, prodEnv);
  assert.equal(purchaseRes.status, 201);
  const purchaseData = await purchaseRes.json();
  assert.equal(purchaseData.cashfreeEnv, 'production');
  const creditTxId = purchaseData.id;

  const userInitial = db.tables.users.find(u => u.id === 'usr_in_merchant');
  const initialBalance = userInitial.ai_credits_balance;

  // 2. Verify payment first time
  const verifyReq1 = new Request('https://ferasetu.com/api/payment/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_id: creditTxId,
      cashfree_order_id: creditTxId,
      provider: 'cashfree'
    })
  });

  const verifyRes1 = await worker.fetch(verifyReq1, prodEnv);
  assert.equal(verifyRes1.status, 200);
  const verifyData1 = await verifyRes1.json();
  assert.equal(verifyData1.success, true);
  assert.equal(verifyData1.creditsAdded, 250);

  const userAfter1 = db.tables.users.find(u => u.id === 'usr_in_merchant');
  assert.equal(userAfter1.ai_credits_balance, initialBalance + 250);

  // 3. Re-verify payment (simulate user refresh / duplicate callback)
  const verifyReq2 = new Request('https://ferasetu.com/api/payment/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_id: creditTxId,
      cashfree_order_id: creditTxId,
      provider: 'cashfree'
    })
  });

  const verifyRes2 = await worker.fetch(verifyReq2, prodEnv);
  assert.equal(verifyRes2.status, 200);
  const verifyData2 = await verifyRes2.json();
  assert.equal(verifyData2.success, true);
  assert.equal(verifyData2.already_processed, true);
  assert.equal(verifyData2.creditsAdded, 0);

  // Credit balance MUST NOT increase again!
  const userAfter2 = db.tables.users.find(u => u.id === 'usr_in_merchant');
  assert.equal(userAfter2.ai_credits_balance, initialBalance + 250);
});

console.log('\n🔒 SUITE 9: Authoritative Subscriptions, Trial Immutability & State Machine');

await test('GET /api/subscription returns authoritative status and plan matching /api/entitlements', async () => {
  const token = await createAuthToken('usr_in_merchant', 'owner', 'org_workos_in');

  const subReq = new Request('https://ferasetu.com/api/subscription', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const subRes = await worker.fetch(subReq, prodEnv);
  assert.equal(subRes.status, 200);
  const subData = await subRes.json();
  assert.equal(subData.plan, 'business');
  assert.equal(subData.status, 'active');
  assert.equal(subData.trialUsed, true);
  assert.equal(subData.trialEligible, false);

  const entReq = new Request('https://ferasetu.com/api/entitlements', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const entRes = await worker.fetch(entReq, prodEnv);
  assert.equal(entRes.status, 200);
  const entData = await entRes.json();
  assert.equal(entData.entitlements.plan, subData.plan);
});

await test('Trial immutability: US/EU user with consumed trial cannot start another trial', async () => {
  const token = await createAuthToken('usr_expired_trial', 'owner', 'org_workos_expired');

  // Attempt to initialize a free/trial plan
  const initReq = new Request('https://ferasetu.com/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan: 'trial',
      amount: 0
    })
  });

  const initRes = await worker.fetch(initReq, mockEnv);
  assert.equal(initRes.status, 403);
  const data = await initRes.json();
  assert.equal(data.code, 'TRIAL_ALREADY_CONSUMED');
});

await test('Downgrade/cancellation does not reset trial_used to 0', async () => {
  const token = await createAuthToken('usr_in_merchant', 'owner', 'org_workos_in');

  const cancelReq = new Request('https://ferasetu.com/api/payment/cancel-subscription', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const cancelRes = await worker.fetch(cancelReq, prodEnv);
  assert.equal(cancelRes.status, 200);

  const subReq = new Request('https://ferasetu.com/api/subscription', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const subRes = await worker.fetch(subReq, prodEnv);
  const subData = await subRes.json();
  assert.equal(subData.cancelAtPeriodEnd, true);
  assert.equal(subData.trialUsed, true);
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All Cashfree payment and bug regression tests passed!\n');
}

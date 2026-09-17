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

// Generate RSA key pair for WorkOS JWT auth validation
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-1';

async function createToken(sub, email, orgId = 'org_test_1', role = 'owner') {
  return await new jose.SignJWT({ sub, email, org_id: orgId, role })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-1' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

// Mock global fetch for Brevo and Cashfree HTTP calls
const originalFetch = globalThis.fetch;
globalThis.fetch = async (urlOrReq, init) => {
  const urlStr = (urlOrReq instanceof URL)
    ? urlOrReq.href
    : (typeof urlOrReq === 'string' ? urlOrReq : (urlOrReq && urlOrReq.url) ? urlOrReq.url : String(urlOrReq));

  if (urlStr.includes('api.brevo.com')) {
    return new Response(JSON.stringify({ messageId: 'msg_test_brevo_12345' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (urlStr.includes('cashfree.com/pg/orders')) {
    const body = init?.body ? JSON.parse(init.body) : {};
    return new Response(JSON.stringify({
      order_id: body.order_id || `cf_order_${Date.now()}`,
      order_amount: body.order_amount || 85,
      order_currency: 'INR',
      payment_session_id: `session_${Date.now()}`,
      order_status: 'ACTIVE'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return originalFetch(urlOrReq, init);
};

// In-memory test DB for order confirmation and email quotas
function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_merchant_1',
        email: 'merchant@store.com',
        name: 'Merchant Test',
        plan: 'growth', // Plan 2 (500/day)
        market: 'IN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    organizations: [
      {
        id: 'org_test_1',
        workos_organization_id: 'org_test_1',
        name: 'Test Store Org',
        market: 'IN',
        plan: 'growth',
        created_at: new Date().toISOString()
      }
    ],
    organization_members: [
      {
        id: 'om_1',
        organization_id: 'org_test_1',
        user_id: 'usr_merchant_1',
        role: 'owner',
        created_at: new Date().toISOString()
      }
    ],
    shops: [
      {
        id: 'shop_test_1',
        organization_id: 'org_test_1',
        name: 'Merchant Superstore',
        store_slug: 'merchantsuperstore',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ],
    products: [
      {
        id: 'prod_test_1',
        user_id: 'usr_merchant_1',
        organization_id: 'org_test_1',
        name: 'Organic Honey 500g',
        price: 450,
        stock_quantity: 50,
        stock: 50,
        is_active: 1,
        created_at: new Date().toISOString()
      }
    ],
    orders: [],
    shop_email_quotas: [],
    email_logs: [],
    subscriptions: [
      {
        id: 'sub_test_1',
        organization_id: 'org_test_1',
        user_id: 'usr_merchant_1',
        plan_id: 'growth',
        plan: 'growth',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ],
    transactions: [],
    websites: []
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
          const s = sql.toLowerCase();
          if (s.includes('from organization_members om') && s.includes('join organizations o')) {
            const userId = this._params[0];
            const om = tables.organization_members.find(x => x.user_id === userId);
            if (!om) return null;
            const o = tables.organizations.find(x => x.id === om.organization_id);
            if (!o) return null;
            return { ...o, member_role: om.role, member_id: om.id };
          }
          if (s.includes('from users where id =')) {
            const u = tables.users.find(x => x.id === this._params[0]);
            return u ? (col ? u[col] : { ...u }) : null;
          }
          if (s.includes('from organizations where id =') || s.includes('from organizations where workos_organization_id =')) {
            const org = tables.organizations.find(x => x.id === this._params[0] || x.workos_organization_id === this._params[0]);
            return org ? (col ? org[col] : { ...org }) : null;
          }
          if (s.includes('from organization_members where organization_id =') && s.includes('user_id =')) {
            const orgId = this._params[0];
            const userId = this._params[1];
            const om = tables.organization_members.find(x => x.organization_id === orgId && x.user_id === userId);
            return om ? (col ? om[col] : { ...om }) : null;
          }
          if (s.includes('from organization_members where user_id =')) {
            const om = tables.organization_members.find(x => x.user_id === this._params[0]);
            return om ? (col ? om[col] : { ...om }) : null;
          }
          if (s.includes('from shops where id =') || s.includes('from shops where organization_id =')) {
            const sh = tables.shops.find(x => x.id === this._params[0] || x.organization_id === this._params[0]);
            return sh ? (col ? sh[col] : { ...sh }) : null;
          }
          if (s.includes('from subscriptions where')) {
            const sub = tables.subscriptions.find(x => x.organization_id === this._params[0] || x.user_id === this._params[0]);
            return sub ? (col ? sub[col] : { ...sub }) : null;
          }
          if (s.includes('from shop_email_quotas where organization_id =')) {
            const q = tables.shop_email_quotas.find(x => x.organization_id === this._params[0]);
            return q ? (col ? q[col] : { ...q }) : null;
          }
          if (s.includes('from orders where idempotency_key =')) {
            const key = this._params[0];
            const o = tables.orders.find(x => x.idempotency_key === key);
            return o ? (col ? o[col] : { ...o }) : null;
          }
          if (s.includes('from orders where id =')) {
            const oId = this._params[0];
            const orgId = this._params[1];
            const o = tables.orders.find(x => x.id === oId && (!orgId || x.organization_id === orgId));
            return o ? (col ? o[col] : { ...o }) : null;
          }
          if (s.includes('from products where id =')) {
            const p = tables.products.find(x => x.id === this._params[0]);
            return p ? (col ? p[col] : { ...p }) : null;
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase();
          if (s.includes('from orders where')) {
            return { results: [...tables.orders] };
          }
          if (s.includes('from products where')) {
            return { results: [...tables.products] };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase();
          if (s.includes('insert into orders')) {
            tables.orders.push({
              id: this._params[0],
              user_id: this._params[1],
              organization_id: this._params[2],
              customer_name: this._params[3],
              customer_email: this._params[4],
              customer_phone: this._params[5],
              items: this._params[6],
              total: this._params[7],
              status: this._params[8],
              created_at: this._params[9],
              shop_id: this._params[10],
              customer_id: this._params[11],
              delivery_address: this._params[12],
              delivery_type: this._params[13],
              subtotal: this._params[14],
              delivery_fee: this._params[15],
              subtotal_minor: this._params[16],
              delivery_fee_minor: this._params[17],
              total_minor: this._params[18],
              currency: this._params[19],
              payment_status: this._params[20],
              invoice_number: this._params[21],
              delivery_code: this._params[22],
              delivery_code_hash: this._params[23],
              payment_otp_hash: this._params[24],
              payment_otp: null,
              otp_expires_at: this._params[25],
              otp_attempts: this._params[26] || 0,
              otp_used_at: this._params[27] || null,
              idempotency_key: this._params[28],
              email_sent: this._params[29],
              email_status: this._params[30],
              updated_at: this._params[31]
            });
            return { success: true, meta: { changes: 1 } };
          }

          if (s.includes('update orders set email_sent =')) {
            const [email_sent, email_status, oId] = this._params;
            const o = tables.orders.find(x => x.id === oId);
            if (o) {
              o.email_sent = email_sent;
              o.email_status = email_status;
              return { success: true, meta: { changes: 1 } };
            }
          }

          if (s.includes('insert into shop_email_quotas')) {
            const [id, org_id, user_id, daily_limit, last_reset_date, created_at, updated_at] = this._params;
            tables.shop_email_quotas.push({
              id,
              organization_id: org_id,
              user_id,
              daily_limit,
              emails_sent_today: 0,
              extra_quota_balance: 0,
              last_reset_date,
              created_at,
              updated_at
            });
            return { success: true, meta: { changes: 1 } };
          }

          if (s.includes('insert into email_logs')) {
            const id = this._params[0];
            const org_id = this._params[1];
            const order_id = this._params[2];
            const recipient = this._params[3];
            const status = s.includes("'failed_quota_exhausted'") ? 'failed_quota_exhausted' : (s.includes("'sent'") ? 'sent' : 'failed');
            tables.email_logs.push({
              id,
              organization_id: org_id,
              order_id,
              recipient,
              email_type: 'order_otp',
              status,
              created_at: this._params[4] || new Date().toISOString()
            });
            return { success: true, meta: { changes: 1 } };
          }

          if (s.includes('update shop_email_quotas') && s.includes('emails_sent_today = emails_sent_today + 1')) {
            const now = this._params[0];
            const org_id = this._params[1];
            const quota = tables.shop_email_quotas.find(x => x.organization_id === org_id);
            if (quota) {
              quota.emails_sent_today = (quota.emails_sent_today || 0) + 1;
              quota.updated_at = now;
              return { success: true, meta: { changes: 1 } };
            }
          }

          if (s.includes('update shop_email_quotas') && s.includes('extra_quota_balance = max(0, extra_quota_balance - 1)')) {
            const now = this._params[0];
            const org_id = this._params[1];
            const quota = tables.shop_email_quotas.find(x => x.organization_id === org_id);
            if (quota) {
              quota.extra_quota_balance = Math.max(0, (quota.extra_quota_balance || 0) - 1);
              quota.updated_at = now;
              return { success: true, meta: { changes: 1 } };
            }
          }

          if (s.includes('update shop_email_quotas') && s.includes('extra_quota_balance = extra_quota_balance +')) {
            const [amount, now, org_id] = this._params;
            const quota = tables.shop_email_quotas.find(x => x.organization_id === org_id);
            if (quota) {
              quota.extra_quota_balance = (quota.extra_quota_balance || 0) + Number(amount);
              quota.updated_at = now;
              return { success: true, meta: { changes: 1 } };
            }
          }

          if (s.includes('update orders set otp_attempts =')) {
            const [attempts, oId, orgId] = this._params;
            const order = tables.orders.find(x => x.id === oId && (!orgId || x.organization_id === orgId));
            if (order) {
              order.otp_attempts = attempts;
              return { success: true, meta: { changes: 1 } };
            }
          }

          if (s.includes('update orders set status =')) {
            const now = this._params.find(p => typeof p === 'string' && p.includes('T')) || new Date().toISOString();
            const oId = this._params.find(p => typeof p === 'string' && p.startsWith('ord_'));
            const orgId = this._params.find(p => typeof p === 'string' && p.startsWith('org_'));
            const order = tables.orders.find(x => x.id === oId && (!orgId || x.organization_id === orgId));
            if (order) {
              order.status = 'delivered';
              order.otp_used_at = now;
              order.updated_at = now;
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }

          if (s.includes('insert into transactions')) {
            return { success: true, meta: { changes: 1 } };
          }

          return { success: true, meta: { changes: 1 } };
        }
      };
    }
  };
}

function createMockEnv(db) {
  return {
    DB: db,
    JWKS: jose.createLocalJWKSet({ keys: [jwk] }),
    ENVIRONMENT: 'test',
    BASE_DOMAIN: 'ferasetu.com',
    CASHFREE_APP_ID: 'TEST_CF_APP_ID',
    CASHFREE_SECRET_KEY: 'TEST_CF_SECRET_KEY',
    BREVO_API_KEY: 'test-brevo-key'
  };
}

console.log('\n📦 Suite: Customer Order Confirmation Flow & Email Quotas\n');

// 1. Order Confirmation: Public order creation succeeds and NEVER leaks plaintext OTP in response
await test('1. Order Creation: Public order succeeds and zero plaintext OTP leakage in response', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);

  const req = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'shop_test_1',
      customerName: 'Aarav Sharma',
      customerEmail: 'aarav@customer.com',
      customerPhone: '+919876543210',
      deliveryAddress: '123 Marine Drive, Mumbai',
      deliveryType: 'delivery',
      paymentMethod: 'offline',
      items: [{ productId: 'prod_test_1', quantity: 2 }]
    })
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201, 'Order creation should return 201 Created');
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.order, 'Should return order object');
  assert.ok(data.order.id, 'Should have order ID');
  assert.ok(data.order.invoice || data.invoiceNumber, 'Should have invoice number');
  assert.ok(data.order.deliveryCode, 'Should have delivery security code');

  // CRITICAL: Plaintext OTP must NEVER be exposed in response
  assert.strictEqual(data.paymentOtp, undefined, 'data.paymentOtp must be undefined');
  assert.strictEqual(data.order.paymentOtp, undefined, 'data.order.paymentOtp must be undefined');
  assert.strictEqual(data.order.payment_otp, undefined, 'data.order.payment_otp must be undefined');
  assert.strictEqual(data.order.otp, undefined, 'data.order.otp must be undefined');
});

// 2. Order Confirmation: Database stores SHA-256 OTP hash, 15-min expiration, and zero plaintext
await test('2. Database Security: Stores SHA-256 hash, 15-min expiration, and zero plaintext', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);

  const req = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'shop_test_1',
      customerName: 'Pooja Hegde',
      customerEmail: 'pooja@customer.com',
      customerPhone: '+919876543211',
      deliveryAddress: '45 Bandra West, Mumbai',
      deliveryType: 'delivery',
      paymentMethod: 'offline',
      items: [{ productId: 'prod_test_1', quantity: 1 }]
    })
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);

  const orderInDb = db.tables.orders[0];
  assert.ok(orderInDb, 'Order must exist in database');
  assert.strictEqual(orderInDb.payment_otp, null, 'Plaintext payment_otp in DB must be null');
  assert.ok(orderInDb.payment_otp_hash, 'payment_otp_hash must exist');
  assert.equal(orderInDb.payment_otp_hash.length, 64, 'payment_otp_hash must be a 64-char SHA-256 hex string');
  assert.ok(orderInDb.otp_expires_at, 'otp_expires_at must be populated');

  const expiryTime = new Date(orderInDb.otp_expires_at).getTime();
  const now = Date.now();
  const diffMinutes = (expiryTime - now) / (60 * 1000);
  assert.ok(diffMinutes >= 14 && diffMinutes <= 16, 'OTP must expire in ~15 minutes');
});

// 3. Idempotency: Duplicate submissions with same Idempotency-Key return original order without duplicate DB rows
await test('3. Idempotency: Duplicate submit with Idempotency-Key returns existing order safely', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const idempotencyKey = `idem_${crypto.randomUUID()}`;

  const payload = JSON.stringify({
    shopId: 'shop_test_1',
    customerName: 'Rahul Patel',
    customerEmail: 'rahul@customer.com',
    customerPhone: '+919876543212',
    deliveryAddress: '78 MG Road, Pune',
    deliveryType: 'delivery',
    paymentMethod: 'offline',
    items: [{ productId: 'prod_test_1', quantity: 1 }]
  });

  // First request
  const res1 = await worker.fetch(new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: payload
  }), env);
  const data1 = await res1.json();

  assert.equal(res1.status, 201);
  assert.equal(db.tables.orders.length, 1);

  // Second duplicate request with exact same Idempotency-Key
  const res2 = await worker.fetch(new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: payload
  }), env);
  const data2 = await res2.json();

  assert.equal(res2.status, 200, 'Idempotent replay should return 200 OK');
  assert.equal(data2.order.id, data1.order.id, 'Must return identical order ID');
  assert.equal(data2.invoiceNumber, data1.invoiceNumber, 'Must return identical invoice');
  assert.equal(db.tables.orders.length, 1, 'Must NOT insert a second order row in DB');
});

// 4. OTP Verification: Rate limiting after 5 invalid attempts locks with 429
await test('4. OTP Verification: 5 invalid attempts locks verification with 429', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  // Insert a test order with known hash
  const rawOtp = '654321';
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawOtp));
  const otpHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const orderId = 'ord_test_rate_limit';
  db.tables.orders.push({
    id: orderId,
    organization_id: 'org_test_1',
    user_id: 'usr_merchant_1',
    customer_name: 'Vikram Seth',
    status: 'pending',
    payment_otp_hash: otpHash,
    otp_attempts: 0,
    otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  });

  // Attempt 1 to 4 should return 400 Invalid OTP
  for (let i = 1; i <= 4; i++) {
    const res = await worker.fetch(new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ otp: '000000' })
    }), env);
    assert.equal(res.status, 400, `Attempt ${i} should return 400`);
  }

  // Attempt 5 should return 429 (rate limit exceeded)
  const res5 = await worker.fetch(new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ otp: '000000' })
  }), env);
  assert.equal(res5.status, 429, '5th failed attempt must return 429');

  // Attempt 6 should still be locked at 429 even if correct OTP is provided
  const res6 = await worker.fetch(new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ otp: rawOtp })
  }), env);
  assert.equal(res6.status, 429, 'Locked order must return 429');
});

// 5. OTP Verification: Expiration check returns 400
await test('5. OTP Verification: Expired OTP returns 400', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  const rawOtp = '112233';
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawOtp));
  const otpHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const orderId = 'ord_test_expired';
  db.tables.orders.push({
    id: orderId,
    organization_id: 'org_test_1',
    user_id: 'usr_merchant_1',
    customer_name: 'Kavita Rao',
    status: 'pending',
    payment_otp_hash: otpHash,
    otp_attempts: 0,
    otp_expires_at: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute in the past!
    created_at: new Date().toISOString()
  });

  const res = await worker.fetch(new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ otp: rawOtp })
  }), env);
  assert.equal(res.status, 400);
  const errData = await res.json();
  assert.equal(errData.error, 'OTP has expired');
});

// 6. OTP Verification: Valid OTP marks order delivered, sets otp_used_at, and prevents replay (single-use)
await test('6. OTP Verification: Valid OTP marks delivered, sets otp_used_at, and enforces single-use', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  const rawOtp = '987654';
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawOtp));
  const otpHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const orderId = 'ord_test_success_and_replay';
  db.tables.orders.push({
    id: orderId,
    organization_id: 'org_test_1',
    user_id: 'usr_merchant_1',
    customer_name: 'Arjun Das',
    status: 'pending',
    payment_otp_hash: otpHash,
    otp_attempts: 0,
    otp_used_at: null,
    otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  });

  // Verify with correct OTP
  const res1 = await worker.fetch(new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ otp: rawOtp })
  }), env);
  assert.equal(res1.status, 200, 'Valid OTP should return 200');
  const data1 = await res1.json();
  assert.equal(data1.success, true);
  assert.equal(data1.order.status, 'delivered');

  const updatedOrder = db.tables.orders.find(x => x.id === orderId);
  assert.equal(updatedOrder.status, 'delivered');
  assert.ok(updatedOrder.otp_used_at, 'otp_used_at must be populated');

  // Second replay attempt with same OTP must fail with 400 single-use error
  const res2 = await worker.fetch(new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ otp: rawOtp })
  }), env);
  assert.equal(res2.status, 400);
  const errData2 = await res2.json();
  assert.equal(errData2.error, 'OTP has already been used');
});

// 7. Shopkeeper Plan Email Quotas: Enforced server-side per merchant subscription
await test('7. Email Quota: Tracks daily quota per plan (Growth plan: 500/day)', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  // Fetch current quota status
  const res = await worker.fetch(new Request('https://ferasetu.com/api/email-quota', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  }), env);

  assert.equal(res.status, 200);
  const quotaData = await res.json();
  assert.equal(quotaData.success, true);
  assert.equal(quotaData.plan, 'growth');
  assert.equal(quotaData.dailyLimit, 500, 'Growth plan daily limit must be 500');
  assert.equal(quotaData.usedToday, 0);
  assert.equal(quotaData.remainingDaily, 500);
  assert.equal(quotaData.extraQuota, 0);
});

// 8. Quota Exhaustion: Order succeeds gracefully with email_status = 'QUOTA_EXHAUSTED'
await test('8. Quota Exhaustion: Order still succeeds gracefully when email quota is exhausted', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);

  // Pre-seed quota row at daily limit (500/500) with 0 extra quota
  const today = new Date().toISOString().slice(0, 10);
  db.tables.shop_email_quotas.push({
    id: 'quota_exhausted_test',
    organization_id: 'org_test_1',
    user_id: 'usr_merchant_1',
    daily_limit: 500,
    emails_sent_today: 500,
    extra_quota_balance: 0,
    last_reset_date: today,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const req = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'shop_test_1',
      customerName: 'Sunita Mehra',
      customerEmail: 'sunita@customer.com',
      customerPhone: '+919876543219',
      deliveryAddress: '99 Jubilee Hills, Hyderabad',
      deliveryType: 'delivery',
      paymentMethod: 'offline',
      items: [{ productId: 'prod_test_1', quantity: 1 }]
    })
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201, 'Order creation must succeed even if email quota is exhausted');
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.order.id);
  assert.equal(data.order.email_status, 'QUOTA_EXHAUSTED', 'email_status should indicate quota exhausted');

  // Verify logged in email_logs
  const emailLog = db.tables.email_logs.find(x => x.order_id === data.order.id);
  assert.ok(emailLog, 'Email log entry must be created');
  assert.equal(emailLog.status, 'failed_quota_exhausted');
});

// 9. Extra Email Quota: Cashfree purchase initialization ($1 / 10,000 emails)
await test('9. Cashfree Add-on: POST /api/payment/email-quota/purchase initializes 10,000 emails pack', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  const res = await worker.fetch(new Request('https://ferasetu.com/api/payment/email-quota/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ packs: 1 })
  }), env);

  assert.ok(res.status === 200 || res.status === 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.amount, 85, '1 pack ($1) in INR should be ₹85');
  assert.equal(data.emailsAdded, 10000, '1 pack should grant 10,000 emails');
  assert.ok(data.order_id, 'Must return Cashfree order_id');
});

// 10. Extra Quota Usage: Orders draw from extra quota when daily quota is exhausted
await test('10. Extra Quota Usage: Exhausted daily quota seamlessly draws from purchased extra quota', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);

  // Daily quota is 500/500, but merchant has 10,000 extra quota
  const today = new Date().toISOString().slice(0, 10);
  db.tables.shop_email_quotas.push({
    id: 'quota_with_extra',
    organization_id: 'org_test_1',
    user_id: 'usr_merchant_1',
    daily_limit: 500,
    emails_sent_today: 500,
    extra_quota_balance: 10000,
    last_reset_date: today,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const req = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'shop_test_1',
      customerName: 'Anil Kapoor',
      customerEmail: 'anil@customer.com',
      customerPhone: '+919876543220',
      deliveryAddress: '22 Juhu Beach, Mumbai',
      deliveryType: 'delivery',
      paymentMethod: 'offline',
      items: [{ productId: 'prod_test_1', quantity: 1 }]
    })
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.order.email_status, 'SENT', 'Email should be sent using extra quota');

  // Verify extra quota was decremented
  const quota = db.tables.shop_email_quotas.find(x => x.organization_id === 'org_test_1');
  assert.equal(quota.extra_quota_balance, 9999, 'Extra quota balance should be decremented from 10000 to 9999');
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error('Failures:');
  for (const f of failures) {
    console.error(`- ${f.name}:`, f.err);
  }
  process.exit(1);
} else {
  console.log('✅ All Order Confirmation & Quota tests passed successfully!\n');
}

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
jwk.kid = 'test-workos-key-integrity';

async function createToken(sub, email, orgId = 'org_merchant_1', role = 'owner') {
  return await new jose.SignJWT({ sub, email, org_id: orgId, role })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-integrity' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_merchant_1',
        email: 'merchant1@store.com',
        name: 'Merchant One',
        business_name: 'Kirana Store 1',
        market: 'IN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr_merchant_2',
        email: 'merchant2@store.com',
        name: 'Merchant Two',
        business_name: 'Boutique Store 2',
        market: 'IN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    organizations: [
      {
        id: 'org_merchant_1',
        workos_organization_id: 'org_merchant_1',
        name: 'Kirana Store 1 Org',
        market: 'IN',
        store_slug: 'kiranastore1',
        created_at: new Date().toISOString()
      },
      {
        id: 'org_merchant_2',
        workos_organization_id: 'org_merchant_2',
        name: 'Boutique Store 2 Org',
        market: 'IN',
        store_slug: 'boutiquestore2',
        created_at: new Date().toISOString()
      }
    ],
    organization_members: [
      {
        id: 'om_1',
        organization_id: 'org_merchant_1',
        user_id: 'usr_merchant_1',
        role: 'owner',
        created_at: new Date().toISOString()
      },
      {
        id: 'om_2',
        organization_id: 'org_merchant_2',
        user_id: 'usr_merchant_2',
        role: 'owner',
        created_at: new Date().toISOString()
      }
    ],
    shops: [
      {
        id: 'shop_merchant_1',
        organization_id: 'org_merchant_1',
        name: 'Kirana Store 1',
        store_slug: 'kiranastore1',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 'shop_merchant_2',
        organization_id: 'org_merchant_2',
        name: 'Boutique Store 2',
        store_slug: 'boutiquestore2',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ],
    products: [
      {
        id: 'prod_honey_1',
        organization_id: 'org_merchant_1',
        user_id: 'usr_merchant_1',
        name: 'Organic Honey 500g',
        title: 'Organic Honey 500g',
        price: 1000,
        price_minor: 100000,
        stock: 5,
        stock_quantity: 5,
        is_active: 1,
        is_inventory_tracked: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    orders: [],
    merchant_webhooks: [],
    integration_requests: [],
    shop_email_quotas: [],
    email_logs: [],
    email_provider_connections: [],
    smtp_settings: [],
    discounts: [],
    discount_codes: [],
    discount_redemptions: []
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
          if (s.includes('from shops where id =') || s.includes('from shops where organization_id =')) {
            const sh = tables.shops.find(x => x.id === this._params[0] || x.organization_id === this._params[0]);
            return sh ? (col ? sh[col] : { ...sh }) : null;
          }
          if (s.includes('from products where id =')) {
            const pId = this._params[0];
            const orgId = this._params[1];
            const p = tables.products.find(x => x.id === pId && (!orgId || x.organization_id === orgId));
            return p ? (col ? p[col] : { ...p }) : null;
          }
          if (s.includes('from orders where id =')) {
            const oId = this._params[0];
            const orgId = this._params[1];
            const o = tables.orders.find(x => x.id === oId && (!orgId || x.organization_id === orgId));
            return o ? (col ? o[col] : { ...o }) : null;
          }
          if (s.includes('from merchant_webhooks where id =')) {
            const wId = this._params[0];
            const orgId = this._params[1];
            const w = tables.merchant_webhooks.find(x => x.id === wId && (!orgId || x.organization_id === orgId));
            return w ? (col ? w[col] : { ...w }) : null;
          }
          if (s.includes('count(*) as count from merchant_webhooks')) {
            const orgId = this._params[0];
            const count = tables.merchant_webhooks.filter(x => x.organization_id === orgId && x.is_active === 1).length;
            return { count };
          }
          if (s.includes('from email_provider_connections where organization_id =')) {
            const conn = tables.email_provider_connections.find(x => x.organization_id === this._params[0]);
            return conn ? (col ? conn[col] : { ...conn }) : null;
          }
          if (s.includes('from smtp_settings where')) {
            const smtp = tables.smtp_settings.find(x => x.organization_id === this._params[0] || x.user_id === this._params[1]);
            return smtp ? (col ? smtp[col] : { ...smtp }) : null;
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase();
          if (s.includes('from products where')) {
            const orgId = this._params[0];
            const prods = orgId ? tables.products.filter(p => p.organization_id === orgId) : tables.products;
            return { results: [...prods] };
          }
          if (s.includes('from orders where')) {
            const orgId = this._params[0];
            const ords = orgId ? tables.orders.filter(o => o.organization_id === orgId) : tables.orders;
            return { results: [...ords] };
          }
          if (s.includes('from merchant_webhooks where')) {
            const orgId = this._params[0];
            const whs = orgId ? tables.merchant_webhooks.filter(w => w.organization_id === orgId) : tables.merchant_webhooks;
            return { results: [...whs] };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase();

          // 1. Update product stock with atomic compare-and-swap
          if (s.includes('update products set') && s.includes('stock = max(0, stock - ?)')) {
            const [qty1, qty2, prodId, checkQty1, checkQty2] = this._params;
            const p = tables.products.find(x => x.id === prodId);
            if (p && (p.stock >= checkQty1 || p.stock_quantity >= checkQty2)) {
              p.stock = Math.max(0, p.stock - qty1);
              p.stock_quantity = Math.max(0, p.stock_quantity - qty2);
              p.updated_at = new Date().toISOString();
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } }; // Concurrency race lock!
          }

          // 2. Direct product updates (PUT/PATCH)
          if (s.includes('update products set')) {
            const setMatch = sql.match(/set\s+(.*?)\s+where/i);
            if (setMatch) {
              const setCols = setMatch[1].split(',').map(c => c.trim().split(/\s*=\s*/)[0].trim().toLowerCase());
              const pId = this._params[setCols.length];
              const p = tables.products.find(x => x.id === pId);
              if (p) {
                setCols.forEach((col, idx) => {
                  p[col] = this._params[idx];
                });
                p.updated_at = new Date().toISOString();
                return { success: true, meta: { changes: 1 } };
              }
            }
          }

          // 3. Insert order
          if (s.includes('insert into orders')) {
            const ord = {
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
              delivery_address: this._params[12],
              delivery_type: this._params[13],
              subtotal: this._params[14],
              delivery_fee: this._params[15],
              payment_status: this._params[20],
              invoice_number: this._params[21],
              delivery_code: this._params[22],
              delivery_code_hash: this._params[23],
              payment_otp_hash: this._params[24],
              otp_expires_at: this._params[25],
              otp_attempts: 0,
              otp_used_at: null
            };
            tables.orders.push(ord);
            return { success: true, meta: { changes: 1 } };
          }

          // 4. Update order status / verify OTP
          if (s.includes('update orders set status =')) {
            const now = this._params[0];
            const orderId = this._params[1];
            const orgId = this._params[2];
            const o = tables.orders.find(x => x.id === orderId && (!orgId || x.organization_id === orgId));
            if (o) {
              o.status = 'delivered';
              o.otp_used_at = now;
              o.updated_at = now;
              return { success: true, meta: { changes: 1 } };
            }
          }

          // 5. Insert webhook
          if (s.includes('insert into merchant_webhooks')) {
            tables.merchant_webhooks.push({
              id: this._params[0],
              organization_id: this._params[1],
              url: this._params[2],
              events: this._params[3],
              secret: this._params[4],
              is_active: 1,
              created_at: this._params[5],
              updated_at: this._params[6]
            });
            return { success: true, meta: { changes: 1 } };
          }

          // 6. Delete webhook
          if (s.includes('delete from merchant_webhooks')) {
            const [id, orgId] = this._params;
            const idx = tables.merchant_webhooks.findIndex(x => x.id === id && x.organization_id === orgId);
            if (idx >= 0) {
              tables.merchant_webhooks.splice(idx, 1);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }

          // 7. Insert integration request
          if (s.includes('insert into integration_requests')) {
            tables.integration_requests.push({
              id: this._params[0],
              organization_id: this._params[1],
              user_id: this._params[2],
              service_name: this._params[3],
              notes: this._params[4],
              status: 'pending',
              created_at: this._params[5]
            });
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
    CASHFREE_SECRET_KEY: 'TEST_CF_SECRET_KEY'
  };
}

console.log('\n🚀 Starting FeraSetu Production Functional Integrity & E2E QA Test Suite...\n');

// 1. One Source of Truth: Product Price Change updates Authoritative DB and Storefront
await test('1. One Source of Truth: Product price update persists authoritatively in DB', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant1@store.com');

  // Update product price from ₹1,000 to ₹1,200 via PUT /api/products/:id
  const putRes = await worker.fetch(new Request('https://ferasetu.com/api/products/prod_honey_1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ price: 1200, price_minor: 120000 })
  }), env);

  assert.equal(putRes.status, 200, 'Product update should return 200 OK');
  const putData = await putRes.json();
  assert.equal(putData.price, 1200, 'Response should reflect updated ₹1,200 price');

  const prodInDb = db.tables.products.find(p => p.id === 'prod_honey_1');
  assert.equal(prodInDb.price, 1200, 'Database price must be updated to 1200');
});

// 2. Inventory Reliability: Stock decrement via order purchase
await test('2. Inventory Reliability: Successful purchase decrements stock atomically', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);

  // Initial stock is 5. Buy 2 units.
  const req = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'shop_merchant_1',
      customerName: 'Priya Sharma',
      customerPhone: '+919876543201',
      deliveryType: 'delivery',
      paymentMethod: 'offline',
      items: [{ productId: 'prod_honey_1', quantity: 2 }]
    })
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201, 'Order creation should succeed');

  const prodInDb = db.tables.products.find(p => p.id === 'prod_honey_1');
  assert.equal(prodInDb.stock, 3, 'Stock must decrement from 5 to 3');
  assert.equal(prodInDb.stock_quantity, 3, 'stock_quantity must decrement from 5 to 3');
});

// 3. Inventory Concurrency: Out-of-Stock and Overselling Rejection
await test('3. Inventory Concurrency: Rejects purchase attempts when stock is insufficient', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);

  // Set stock to 1 unit
  const prod = db.tables.products.find(p => p.id === 'prod_honey_1');
  prod.stock = 1;
  prod.stock_quantity = 1;

  // Customer attempts to purchase 2 units
  const req = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'shop_merchant_1',
      customerName: 'Deepak Verma',
      customerPhone: '+919876543202',
      deliveryType: 'delivery',
      paymentMethod: 'offline',
      items: [{ productId: 'prod_honey_1', quantity: 2 }]
    })
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400, 'Must reject order exceeding available inventory with 400 Bad Request');
  const errData = await res.json();
  assert.ok(errData.error.includes('Insufficient stock'), 'Error message must clearly communicate insufficient stock');

  // Verify stock remained untouched at 1
  assert.equal(prod.stock, 1, 'Stock must not be decremented on rejected purchase');
});

// 4. Quick Stock Restock via PATCH/PUT: Authoritatively restores inventory
await test('4. Restocking: Merchant can add stock and restore inventory level', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant1@store.com');

  const res = await worker.fetch(new Request('https://ferasetu.com/api/products/prod_honey_1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ stock_quantity: 50, stock: 50 })
  }), env);

  assert.equal(res.status, 200, 'PATCH /api/products/:id should succeed');
  const prod = db.tables.products.find(p => p.id === 'prod_honey_1');
  assert.equal(prod.stock, 50);
  assert.equal(prod.stock_quantity, 50);
});

// 5. Complete Purchase Lifecycle & Delivery Handshake
await test('5. Order & Delivery Handshake: Complete purchase and single-use delivery verification', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant1@store.com');

  // Customer checkout
  const orderRes = await worker.fetch(new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'shop_merchant_1',
      customerName: 'Ananya Roy',
      customerPhone: '+919876543203',
      deliveryType: 'delivery',
      paymentMethod: 'offline',
      items: [{ productId: 'prod_honey_1', quantity: 1 }]
    })
  }), env);

  assert.equal(orderRes.status, 201);
  const orderData = await orderRes.json();
  const orderId = orderData.order.id;
  const deliveryCode = orderData.order.deliveryCode;
  assert.ok(deliveryCode, 'Order must issue delivery code');

  // Merchant verifies delivery code via POST /api/orders/:id/verify-otp
  const verifyRes = await worker.fetch(new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ delivery_code: deliveryCode })
  }), env);

  assert.equal(verifyRes.status, 200, 'Delivery verification must return 200 OK');
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.order.status, 'delivered');

  const orderInDb = db.tables.orders.find(o => o.id === orderId);
  assert.equal(orderInDb.status, 'delivered');
  assert.ok(orderInDb.otp_used_at, 'otp_used_at must be populated');

  // Single-use replay protection
  const replayRes = await worker.fetch(new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ delivery_code: deliveryCode })
  }), env);

  assert.equal(replayRes.status, 400, 'Replay attempt must be blocked with 400');
});

// 6. Dashboard & Analytics Consistency: Excludes cancelled/refunded from revenue
await test('6. Analytics Consistency: Revenue strictly excludes cancelled and refunded orders', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant1@store.com');

  // Add 1 active delivered order (₹1,000) and 1 cancelled order (₹500)
  db.tables.orders.push(
    {
      id: 'ord_active',
      organization_id: 'org_merchant_1',
      total: 1000,
      status: 'delivered',
      payment_status: 'paid',
      customer_name: 'Customer A',
      created_at: new Date().toISOString()
    },
    {
      id: 'ord_cancelled',
      organization_id: 'org_merchant_1',
      total: 500,
      status: 'cancelled',
      payment_status: 'cancelled',
      customer_name: 'Customer B',
      created_at: new Date().toISOString()
    }
  );

  const res = await worker.fetch(new Request('https://ferasetu.com/api/analytics/dashboard', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  }), env);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.stats.total_orders, 1, 'Total orders must exclude cancelled');
  assert.equal(data.stats.total_revenue, 1000, 'Total revenue must be ₹1,000, excluding the ₹500 cancelled order');
});

// 7. Integration Hub: GET /api/integrations returns verified subsystem statuses
await test('7. Integration Hub: Authoritative status check across real subsystems', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant1@store.com');

  const res = await worker.fetch(new Request('https://ferasetu.com/api/integrations', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  }), env);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.services), 'Must return list of services');

  const cashfree = data.services.find(s => s.id === 'cashfree-pg');
  assert.ok(cashfree);
  assert.equal(cashfree.status, 'connected', 'Cashfree should be connected when env credentials exist');

  const offline = data.services.find(s => s.id === 'offline-cod');
  assert.ok(offline);
  assert.equal(offline.status, 'connected', 'Direct COD/UPI must be connected as core feature');

  const shiprocket = data.services.find(s => s.id === 'shiprocket-logistics');
  assert.ok(shiprocket);
  assert.equal(shiprocket.status, 'ready', 'Shiprocket must show ready without fake connected status');
});

// 8. Integration Hub: POST /api/integrations/webhooks registers real HMAC-signed webhook
await test('8. Webhook Hub: Registers real webhook and returns HMAC signing secret', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant1@store.com');

  const postRes = await worker.fetch(new Request('https://ferasetu.com/api/integrations/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      url: 'https://webhook.store.com/orders',
      events: 'orders.created,orders.delivered'
    })
  }), env);

  assert.equal(postRes.status, 201);
  const data = await postRes.json();
  assert.equal(data.success, true);
  assert.ok(data.webhook.id.startsWith('wh_'));
  assert.ok(data.webhook.secret.startsWith('whsec_'), 'Secret must begin with whsec_ prefix');

  assert.equal(db.tables.merchant_webhooks.length, 1);
  assert.equal(db.tables.merchant_webhooks[0].url, 'https://webhook.store.com/orders');

  // Delete the webhook
  const delRes = await worker.fetch(new Request(`https://ferasetu.com/api/integrations/webhooks/${data.webhook.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  }), env);

  assert.equal(delRes.status, 200);
  assert.equal(db.tables.merchant_webhooks.length, 0, 'Webhook must be removed from DB');
});

// 9. Integration Hub: POST /api/integrations/request records merchant feature requests
await test('9. Integration Requests: Merchant can submit genuine integration requests', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_merchant_1', 'merchant1@store.com');

  const res = await worker.fetch(new Request('https://ferasetu.com/api/integrations/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      serviceName: 'Zoho Inventory Sync',
      notes: 'Need automated batch stock synchronization'
    })
  }), env);

  assert.equal(res.status, 201);
  assert.equal(db.tables.integration_requests.length, 1);
  assert.equal(db.tables.integration_requests[0].service_name, 'Zoho Inventory Sync');
});

// 10. Multi-Tenant Security Isolation: Merchant 2 cannot update or access Merchant 1's records
await test('10. Security & Tenant Isolation: Strict multi-tenant isolation prevents cross-store access', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const tokenMerchant2 = await createToken('usr_merchant_2', 'merchant2@store.com', 'org_merchant_2');

  // Merchant 2 attempts to mutate Merchant 1's product
  const crossUpdateRes = await worker.fetch(new Request('https://ferasetu.com/api/products/prod_honey_1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMerchant2}` },
    body: JSON.stringify({ price: 1 })
  }), env);

  assert.equal(crossUpdateRes.status, 404, 'Must return 404 Product not found when tenant does not own product');

  // Verify price in DB was not tampered with
  const prod = db.tables.products.find(p => p.id === 'prod_honey_1');
  assert.equal(prod.price, 1000, 'Merchant 1 product price must remain untouched');
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
  console.log('🎉 All Production Functional Integrity & E2E tests passed successfully!\n');
}

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

// Generate test JWT for merchant staff
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-order-cancel';

async function generateTestJwt(payload) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-order-cancel' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

// In-Memory D1 Mock for worker order cancellation testing
function createMockDb() {
  const tables = {
    users: [
      {
        id: 'usr_test_merchant',
        email: 'merchant@example.com',
        name: 'Test Merchant',
        plan: 'pro',
        organization_id: 'org_test_1',
        created_at: new Date().toISOString()
      }
    ],
    organizations: [
      {
        id: 'org_test_1',
        workos_organization_id: 'org_test_1',
        name: 'Test Shop',
        store_slug: 'testshop',
        plan: 'pro',
        created_at: new Date().toISOString()
      }
    ],
    organization_members: [
      {
        id: 'mem_1',
        organization_id: 'org_test_1',
        user_id: 'usr_test_merchant',
        role: 'owner',
        created_at: new Date().toISOString()
      }
    ],
    products: [
      {
        id: 'prod_1',
        organization_id: 'org_test_1',
        name: 'Organic Honey',
        price: 500,
        stock: 10,
        stock_quantity: 10,
        is_inventory_tracked: 1,
        is_active: 1,
        status: 'active'
      }
    ],
    orders: [
      {
        id: 'ord_active_1',
        organization_id: 'org_test_1',
        user_id: 'usr_test_merchant',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '9876543210',
        items: JSON.stringify([{ productId: 'prod_1', name: 'Organic Honey', quantity: 2, price: 500 }]),
        total: 1000,
        status: 'pending',
        payment_status: 'unpaid',
        invoice_number: 'INV-TEST-001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'ord_cancelled_1',
        organization_id: 'org_test_1',
        user_id: 'usr_test_merchant',
        customer_name: 'Jane Smith',
        customer_email: 'jane@example.com',
        customer_phone: '9876543211',
        items: JSON.stringify([{ productId: 'prod_1', name: 'Organic Honey', quantity: 1, price: 500 }]),
        total: 500,
        status: 'cancelled',
        cancellation_status: 'cancelled',
        cancellation_reason: 'Pre-existing cancellation',
        payment_status: 'unpaid',
        invoice_number: 'INV-TEST-002',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    invoices: [
      {
        id: 'inv_1',
        organization_id: 'org_test_1',
        order_id: 'ord_active_1',
        invoice_number: 'INV-TEST-001',
        total: 1000,
        status: 'issued',
        created_at: new Date().toISOString()
      },
      {
        id: 'inv_2',
        organization_id: 'org_test_1',
        order_id: 'ord_cancelled_1',
        invoice_number: 'INV-TEST-002',
        total: 500,
        status: 'voided',
        created_at: new Date().toISOString()
      }
    ]
  };

  return {
    tables,
    prepare(query) {
      const q = query.trim().replace(/\s+/g, ' ');
      const qLower = q.toLowerCase();
      let boundArgs = [];
      return {
        bind(...args) {
          boundArgs = args;
          return this;
        },
        async first() {
          if (qLower.includes('from users') && qLower.includes('where id =')) {
            return tables.users.find(u => u.id === boundArgs[0]) || null;
          }
          if (qLower.includes('from organization_members om') && qLower.includes('organizations o')) {
            const mem = tables.organization_members.find(m => m.user_id === boundArgs[0]);
            if (!mem) return null;
            const org = tables.organizations.find(o => o.id === mem.organization_id);
            if (!org) return null;
            return { ...org, member_role: mem.role, member_id: mem.id };
          }
          if (qLower.includes('from organization_members') && qLower.includes('organization_id = ?') && qLower.includes('user_id = ?')) {
            return tables.organization_members.find(m => m.organization_id === boundArgs[0] && m.user_id === boundArgs[1]) || null;
          }
          if (qLower.includes('from organization_members') && qLower.includes('where user_id = ?')) {
            return tables.organization_members.find(m => m.user_id === boundArgs[0]) || null;
          }
          if (qLower.includes('from organizations') && (qLower.includes('workos_organization_id = ?') || qLower.includes('id = ?'))) {
            return tables.organizations.find(o => o.workos_organization_id === boundArgs[0] || o.id === boundArgs[0]) || null;
          }
          if (qLower.includes('from orders') && qLower.includes('id = ?')) {
            const id = boundArgs.find(arg => typeof arg === 'string' && arg.startsWith('ord_')) || boundArgs[0];
            return tables.orders.find(o => o.id === id) || null;
          }
          if (qLower.includes('from invoices') && (qLower.includes('id = ?') || qLower.includes('order_id = ?') || qLower.includes('invoice_number = ?'))) {
            const idOrOrder = boundArgs.find(arg => typeof arg === 'string' && (arg.startsWith('ord_') || arg.startsWith('inv_') || arg.startsWith('INV-'))) || boundArgs[0];
            return tables.invoices.find(i => i.id === idOrOrder || i.order_id === idOrOrder || i.invoice_number === idOrOrder) || null;
          }
          return null;
        },
        async all() {
          if (qLower.includes('from orders')) {
            return { results: tables.orders };
          }
          if (qLower.includes('from products')) {
            return { results: tables.products };
          }
          if (qLower.includes('from invoices')) {
            return { results: tables.invoices.filter(i => i.status !== 'voided' && i.status !== 'cancelled') };
          }
          if (qLower.includes('from analytics_events')) {
            return { results: [] };
          }
          return { results: [] };
        },
        async run() {
          if (qLower.includes('update orders')) {
            if (qLower.includes("status = 'cancelled'") || qLower.includes('cancellation_status = ?') || qLower.includes("cancellation_status = 'cancelled'")) {
              const orderId = boundArgs.find(arg => typeof arg === 'string' && arg.startsWith('ord_')) || boundArgs[4] || boundArgs[2] || boundArgs[0];
              const ord = tables.orders.find(o => o.id === orderId);
              if (ord) {
                ord.status = 'cancelled';
                ord.cancellation_status = 'cancelled';
              }
              return { meta: { changes: 1 } };
            }
            if (qLower.includes('status = ?')) {
              const newStatus = boundArgs[0];
              const orderId = boundArgs.find(arg => typeof arg === 'string' && arg.startsWith('ord_')) || boundArgs[2];
              const ord = tables.orders.find(o => o.id === orderId);
              if (ord) {
                ord.status = newStatus;
              }
              return { meta: { changes: 1 } };
            }
          }
          if (qLower.includes('update invoices') && qLower.includes("status = 'voided'")) {
            const orderId = boundArgs.find(arg => typeof arg === 'string' && arg.startsWith('ord_')) || boundArgs[1] || boundArgs[0];
            const inv = tables.invoices.find(i => i.order_id === orderId || i.id === orderId);
            if (inv) inv.status = 'voided';
            return { meta: { changes: 1 } };
          }
          if (qLower.includes('update products')) {
            const prod = tables.products[0];
            if (prod) {
              prod.stock += Number(boundArgs[0] || 0);
              prod.stock_quantity += Number(boundArgs[1] || 0);
            }
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 1 } };
        }
      };
    }
  };
}

function createTestEnv(db) {
  return {
    DB: db,
    ENVIRONMENT: 'test',
    JWT_SECRET: 'test_jwt_secret_order_cancel',
    WORKOS_CLIENT_ID: 'client_test_id',
    WORKOS_API_KEY: 'sk_test_key',
    JWKS: jose.createLocalJWKSet({ keys: [jwk] }),
    PUBLIC_APP_URL: 'https://ferasetu.com',
    CACHE: {
      async get() { return null; },
      async put() { return; },
      async delete() { return; },
    }
  };
}

async function runTests() {
  console.log('--- Cloudflare Worker Order Cancellation & Invariant Tests ---');

  const merchantJwt = await generateTestJwt({
    sub: 'usr_test_merchant',
    org_id: 'org_test_1',
    role: 'owner',
    email: 'merchant@example.com'
  });

  await test('1. POST /api/orders/:id/cancel is routed and cancels an active order', async () => {
    const db = createMockDb();
    const env = createTestEnv(db);

    const req = new Request('https://ferasetu.singhantima203.workers.dev/api/orders/ord_active_1/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${merchantJwt}`,
      },
      body: JSON.stringify({ reason: 'Customer requested via phone call' })
    });

    const res = await worker.fetch(req, env);
    assert.notEqual(res.status, 405, 'Must NOT return 405 Method Not Allowed');
    assert.equal(res.status, 200, 'Must return 200 OK');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.order.status, 'cancelled');
    assert.equal(data.order.cancellation_status, 'cancelled');
  });

  await test('2. POST /api/orders/:id/cancel on already cancelled order returns 400 (Irreversible)', async () => {
    const db = createMockDb();
    const env = createTestEnv(db);

    const req = new Request('https://ferasetu.singhantima203.workers.dev/api/orders/ord_cancelled_1/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${merchantJwt}`,
      },
      body: JSON.stringify({ reason: 'Trying to cancel again' })
    });

    const res = await worker.fetch(req, env);
    assert.equal(res.status, 400, 'Must return 400 Bad Request');
    const data = await res.json();
    assert.ok(data.error.includes('already cancelled') || data.error.includes('irreversible'));
  });

  await test('3. PATCH /api/orders/:id/status on cancelled order returns 400 (Permanently locked)', async () => {
    const db = createMockDb();
    const env = createTestEnv(db);

    const req = new Request('https://ferasetu.singhantima203.workers.dev/api/orders/ord_cancelled_1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${merchantJwt}`,
      },
      body: JSON.stringify({ status: 'confirmed' })
    });

    const res = await worker.fetch(req, env);
    assert.equal(res.status, 400, 'Must return 400 Bad Request');
    const data = await res.json();
    assert.ok(data.error.includes('cancelled and cannot be changed'));
  });

  await test('4. GET /api/orders/:id/invoice on cancelled order returns 400 (No invoice for cancelled)', async () => {
    const db = createMockDb();
    const env = createTestEnv(db);

    const req = new Request('https://ferasetu.singhantima203.workers.dev/api/orders/ord_cancelled_1/invoice', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${merchantJwt}`,
      }
    });

    const res = await worker.fetch(req, env);
    assert.equal(res.status, 400, 'Must return 400 Bad Request');
    const data = await res.json();
    assert.ok(data.error.includes('Invoices are not available for cancelled orders'));
  });

  await test('5. GET /api/analytics/dashboard strictly excludes cancelled orders from revenue and counts', async () => {
    const db = createMockDb();
    const env = createTestEnv(db);

    const req = new Request('https://ferasetu.singhantima203.workers.dev/api/analytics/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${merchantJwt}`,
      }
    });

    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    const data = await res.json();
    // Active order total is 1000, cancelled order total is 500.
    // Total revenue must be exactly 1000 (not 1500), and total orders must be exactly 1 (not 2).
    assert.equal(data.stats.total_revenue, 1000, 'Revenue must exclude cancelled orders');
    assert.equal(data.stats.total_orders, 1, 'Total orders count must exclude cancelled orders');
    assert.equal(data.stats.total_customers, 1, 'Total customers count must exclude cancelled orders');
  });

  await test('6. POST /api/orders/public/:id/cancel is routed and cancels order for customer', async () => {
    const db = createMockDb();
    const env = createTestEnv(db);

    const req = new Request('https://ferasetu.singhantima203.workers.dev/api/orders/public/ord_active_1/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerPhone: '9876543210', reason: 'Customer changed mind' })
    });

    const res = await worker.fetch(req, env);
    assert.notEqual(res.status, 405, 'Public cancel must NOT return 405');
    assert.equal(res.status, 200, 'Public cancel must return 200 OK');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.order.status, 'cancelled');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

import assert from 'node:assert/strict';
import * as jose from '../worker/node_modules/jose/dist/node/esm/index.js';
import worker, {
  resolveAuthoritativeEntitlements,
  resolveStorefrontTenant
} from '../worker/index.js';

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

// In-memory multi-tenant D1 mock database for P0 hardening tests
function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_merchant_p0',
        email: 'merchant_p0@example.com',
        name: 'Merchant P0',
        plan: 'free',
        market: 'IN',
        ai_credits_balance: 20,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr_merchant_p0_b',
        email: 'merchant_p0_b@example.com',
        name: 'Merchant P0 B',
        plan: 'free',
        market: 'IN',
        ai_credits_balance: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    organizations: [
      {
        id: 'org_test_1',
        name: 'Test Store 1',
        workos_organization_id: 'workos_org_test_1',
        market: 'IN',
        plan: 'free',
        store_slug: 'teststore1',
        logo_url: 'https://cdn.ferasetu.com/store1-logo.png',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'org_test_2',
        name: 'Test Store 2',
        workos_organization_id: 'workos_org_test_2',
        market: 'IN',
        plan: 'free',
        store_slug: 'teststore2',
        logo_url: 'https://cdn.ferasetu.com/store2-logo.png',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    organization_members: [
      {
        id: 'om_test_1',
        organization_id: 'org_test_1',
        user_id: 'usr_merchant_p0',
        role: 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'om_test_2',
        organization_id: 'org_test_2',
        user_id: 'usr_merchant_p0_b',
        role: 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    shops: [
      {
        id: 'shop_test_1',
        organization_id: 'org_test_1',
        name: 'Test Store 1',
        store_slug: 'teststore1',
        hostname: 'teststore1.ferasetu.com',
        status: 'active',
        logo_url: 'https://cdn.ferasetu.com/store1-logo.png',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'shop_test_2',
        organization_id: 'org_test_2',
        name: 'Test Store 2',
        store_slug: 'teststore2',
        hostname: 'teststore2.ferasetu.com',
        status: 'active',
        logo_url: 'https://cdn.ferasetu.com/store2-logo.png',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    products: [
      {
        id: 'prod_catalog_1',
        user_id: 'usr_merchant_p0',
        organization_id: 'org_test_1',
        name: 'Organic Basmati Rice 5kg',
        price: 450,
        sale_price: 399,
        stock: 50,
        stock_quantity: 50,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    orders: [],
    customers: [],
    locations: [],
    inventory_locations: [],
    credit_purchases: [],
    credit_transactions: [],
    invoices: [],
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
        async first() {
          const s = sql.toLowerCase();
          if (s.includes('from users where id = ?')) {
            return tables.users.find(u => u.id === this._params[0]) || null;
          }
          if (s.includes('from organization_members') && s.includes('join organizations')) {
            const mem = tables.organization_members.find(m => m.user_id === this._params[0]);
            if (!mem) return null;
            const org = tables.organizations.find(o => o.id === mem.organization_id);
            if (!org) return null;
            return { ...org, member_role: mem.role, member_id: mem.id };
          }
          if (s.includes('from organizations where id = ? or store_slug = ?')) {
            return tables.organizations.find(o => o.id === this._params[0] || o.store_slug === this._params[1]) || null;
          }
          if (s.includes('from organizations where id = ?')) {
            return tables.organizations.find(o => o.id === this._params[0]) || null;
          }
          if (s.includes('from organizations where store_slug = ?')) {
            return tables.organizations.find(o => o.store_slug === this._params[0]) || null;
          }
          if (s.includes('from shops where id = ? or store_slug = ?')) {
            return tables.shops.find(sh => sh.id === this._params[0] || sh.store_slug === this._params[1]) || null;
          }
          if (s.includes('from shops where hostname = ? or store_slug = ?')) {
            return tables.shops.find(sh => sh.hostname === this._params[0] || sh.store_slug === this._params[1]) || null;
          }
          if (s.includes('from shops where organization_id = ?')) {
            return tables.shops.find(sh => sh.organization_id === this._params[0]) || null;
          }
          if (s.includes('from organization_members where organization_id = ? and user_id = ?')) {
            return tables.organization_members.find(m => m.organization_id === this._params[0] && m.user_id === this._params[1]) || null;
          }
          if (s.includes('from locations where id = ? and organization_id = ?')) {
            return tables.locations.find(l => l.id === this._params[0] && l.organization_id === this._params[1]) || null;
          }
          if (s.includes('from inventory_locations') && s.includes('organization_id = ?') && s.includes('product_id = ?')) {
            return tables.inventory_locations.find(il => il.organization_id === this._params[0] && il.product_id === this._params[1]) || null;
          }
          if (s.includes('from invoices where (id = ? or invoice_number = ?) and organization_id = ?')) {
            return tables.invoices.find(inv => (inv.id === this._params[0] || inv.invoice_number === this._params[1]) && inv.organization_id === this._params[2]) || null;
          }
          if (s.includes('from products where id = ?')) {
            return tables.products.find(p => p.id === this._params[0]) || null;
          }
          if (s.includes('from credit_purchases where')) {
            return tables.credit_purchases.find(cp => cp.id === this._params[0] || cp.gateway_order_id === this._params[0]) || null;
          }
          if (s.includes('from credit_transactions where reference_id = ?')) {
            return tables.credit_transactions.find(tx => tx.reference_id === this._params[0]) || null;
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase();
          if (s.includes('from orders where organization_id = ?')) {
            const orgId = this._params[0];
            return { results: tables.orders.filter(o => o.organization_id === orgId) };
          }
          if (s.includes('from locations where organization_id = ?')) {
            const orgId = this._params[0];
            return { results: tables.locations.filter(l => l.organization_id === orgId) };
          }
          if (s.includes('from inventory_locations') && s.includes('where il.organization_id = ?')) {
            const orgId = this._params[0];
            return { results: tables.inventory_locations.filter(il => il.organization_id === orgId) };
          }
          if (s.includes('from invoices where organization_id = ?')) {
            const orgId = this._params[0];
            return { results: tables.invoices.filter(inv => inv.organization_id === orgId) };
          }
          if (s.includes('from orders') && s.includes('customer_phone')) {
            const targetOrgOrShop = this._params[0];
            const cleanPhone = this._params[2];
            return {
              results: tables.orders.filter(o => 
                (o.organization_id === targetOrgOrShop || o.shop_id === targetOrgOrShop) &&
                o.customer_phone === cleanPhone
              )
            };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase();
          if (s.includes('insert into locations')) {
            const [
              id, organization_id, store_id, name, type, address, contact_name, phone,
              country, state, city, postal_code, timezone, is_active, created_at, updated_at
            ] = this._params;
            const newLoc = { id, organization_id, store_id, name, type, address, contact_name, phone, country, state, city, postal_code, timezone, is_active, created_at, updated_at };
            tables.locations.push(newLoc);
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into inventory_locations')) {
            const [
              id, organization_id, product_id, variant_id, location_id,
              available_quantity, reserved_quantity, incoming_quantity, reorder_threshold,
              created_at, updated_at
            ] = this._params;
            const existingIdx = tables.inventory_locations.findIndex(
              il => il.organization_id === organization_id && il.product_id === product_id && il.variant_id === variant_id && il.location_id === location_id
            );
            if (existingIdx >= 0) {
              tables.inventory_locations[existingIdx] = {
                ...tables.inventory_locations[existingIdx],
                available_quantity, reserved_quantity, incoming_quantity, reorder_threshold, updated_at
              };
            } else {
              tables.inventory_locations.push({
                id, organization_id, product_id, variant_id, location_id,
                available_quantity, reserved_quantity, incoming_quantity, reorder_threshold, created_at, updated_at
              });
            }
            return { meta: { changes: 1 } };
          }
          if (s.includes('update locations set')) {
            const id = this._params[this._params.length - 2];
            const orgId = this._params[this._params.length - 1];
            const loc = tables.locations.find(l => l.id === id && l.organization_id === orgId);
            if (loc) {
              loc.updated_at = new Date().toISOString();
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (s.includes('delete from locations where id = ? and organization_id = ?')) {
            const id = this._params[0];
            const orgId = this._params[1];
            const idx = tables.locations.findIndex(l => l.id === id && l.organization_id === orgId);
            if (idx >= 0) {
              tables.locations.splice(idx, 1);
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (s.includes('insert into orders')) {
            const [id, user_id, organization_id, customer_name, customer_phone, items, total, status, created_at] = this._params;
            const newOrder = {
              id, user_id, organization_id, customer_name, customer_phone, items, total, status, created_at,
              shop_id: this._params[9],
              customer_id: this._params[10],
              delivery_address: this._params[11],
              delivery_type: this._params[12],
              subtotal: this._params[13],
              delivery_fee: this._params[14],
              payment_status: this._params[15],
              invoice_number: this._params[16],
            };
            tables.orders.push(newOrder);
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into customers')) {
            const [id, organization_id, name, email, phone, address, created_at, updated_at] = this._params;
            tables.customers.push({ id, organization_id, name, email, phone, address, created_at, updated_at });
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into invoices')) {
            const [
              id, organization_id, shop_id, order_id, invoice_number,
              customer_id, customer_name, subtotal, shipping,
              total, amount_paid, balance_due,
              status, billing_address, shipping_address, issued_at, due_at, notes, created_at, updated_at
            ] = this._params;
            tables.invoices.push({
              id, organization_id, shop_id, order_id, invoice_number,
              customer_id, customer_name, subtotal, discount: 0, shipping,
              tax: 0, total, amount_paid, balance_due, currency: 'INR',
              status, billing_address, shipping_address, issued_at, due_at, notes, created_at, updated_at
            });
            return { meta: { changes: 1 } };
          }
          if (s.includes('update products set stock = stock - ?')) {
            const qty = this._params[0];
            const prodId = this._params[2];
            const prod = tables.products.find(p => p.id === prodId);
            if (prod && prod.stock >= qty) {
              prod.stock -= qty;
              prod.stock_quantity -= qty;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (s.includes('update invoices set status = ?')) {
            const status = this._params[0];
            const idOrNum = this._params[2];
            const orgId = this._params[4];
            const inv = tables.invoices.find(i => (i.id === idOrNum || i.invoice_number === idOrNum) && i.organization_id === orgId);
            if (inv) {
              inv.status = status;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (s.includes('update organizations set')) {
            const orgId = this._params[this._params.length - 1];
            const org = tables.organizations.find(o => o.id === orgId);
            if (org) {
              if (this._params[0]) org.logo_url = this._params[0];
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (s.includes('update shops set')) {
            const orgId = this._params[this._params.length - 1];
            const shop = tables.shops.find(s => s.organization_id === orgId);
            if (shop) {
              if (this._params[0]) shop.logo_url = this._params[0];
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          return { meta: { changes: 1 } };
        }
      };
    }
  };
}

// Generate valid 2048-bit RSA key for WorkOS JWT validation
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-p0';

async function generateTestJwt(payload) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-p0' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

function createTestEnv(db) {
  return {
    DB: db,
    WORKOS_CLIENT_ID: 'client_test_p0',
    WORKOS_API_KEY: 'sk_test_mock',
    JWKS: jose.createLocalJWKSet({ keys: [jwk] }),
    CASHFREE_APP_ID: 'CF_TEST_APP_ID',
    CASHFREE_SECRET_KEY: 'CF_TEST_SECRET_KEY'
  };
}

console.log('\n🧪 RUNNING P0 PRODUCTION HARDENING SPECIFICATION VERIFICATION\n');

// 1. Merchant order list is strictly organization_id scoped
await test('Correction 1 & 2: Merchant order list is strictly organization_id scoped', async () => {
  const db = createTestDb();
  const env = createTestEnv(db);

  db.tables.orders.push({
    id: 'ord_1',
    user_id: 'usr_merchant_p0',
    organization_id: 'org_test_1',
    customer_name: 'Customer 1',
    customer_phone: '9876543210',
    total: 399,
    status: 'pending',
    created_at: new Date().toISOString()
  });

  db.tables.orders.push({
    id: 'ord_2',
    user_id: 'usr_merchant_p0_b',
    organization_id: 'org_test_2',
    customer_name: 'Customer 2',
    customer_phone: '9876543210',
    total: 500,
    status: 'pending',
    created_at: new Date().toISOString()
  });

  const token = await generateTestJwt({ sub: 'usr_merchant_p0', email: 'merchant_p0@example.com' });
  const req = new Request('https://ferasetu.com/api/orders', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.orders.length, 1);
  assert.equal(data.orders[0].id, 'ord_1');
  assert.equal(data.orders[0].organization_id, 'org_test_1');
});

// 2. Customer identity separated from merchant identity
await test('Correction 3: Public checkout creates customer record, does not use merchant identity as order owner', async () => {
  const db = createTestDb();
  const env = createTestEnv(db);

  const checkoutReq = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Aarav Sharma',
      customerPhone: '9876543210',
      shopId: 'teststore1',
      items: [{ productId: 'prod_catalog_1', quantity: 2 }]
    })
  });

  const res = await worker.fetch(checkoutReq, env);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.order.id);
  assert.ok(data.invoiceNumber.startsWith('INV-TESTSTORE1-'));

  const createdOrder = db.tables.orders.find(o => o.id === data.order.id);
  assert.ok(createdOrder);
  assert.equal(createdOrder.organization_id, 'org_test_1');
  assert.ok(createdOrder.customer_id.startsWith('cust_'));
  assert.notEqual(createdOrder.customer_id, 'usr_merchant_p0');
  assert.equal(createdOrder.total, 399 * 2 + 30); // 798 + 30 delivery fee

  assert.equal(db.tables.customers.length, 1);
  assert.equal(db.tables.customers[0].name, 'Aarav Sharma');
  assert.equal(db.tables.customers[0].organization_id, 'org_test_1');
});

// 3. Deterministic Storefront Tenant Resolution
await test('Correction 4: resolveStorefrontTenant resolves hostname -> shop -> organization deterministically', async () => {
  const db = createTestDb();
  const env = createTestEnv(db);

  const req = new Request('https://teststore1.ferasetu.com/api/products');
  const tenant = await resolveStorefrontTenant(req, env, 'teststore1');
  assert.equal(tenant.organizationId, 'org_test_1');
  assert.equal(tenant.shopId, 'shop_test_1');
  assert.equal(tenant.organization.name, 'Test Store 1');
});

// 4. Locations API and validation
await test('Correction 11 & 19: Server validates location types and rejects invalid operational types', async () => {
  const db = createTestDb();
  const env = createTestEnv(db);
  const token = await generateTestJwt({ sub: 'usr_merchant_p0', email: 'merchant_p0@example.com' });

  const invalidReq = new Request('https://ferasetu.com/api/locations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'FeraSetu Central Hub',
      type: 'platform_warehouse'
    })
  });
  const invalidRes = await worker.fetch(invalidReq, env);
  assert.equal(invalidRes.status, 422);

  const validReq = new Request('https://ferasetu.com/api/locations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'South Mumbai Warehouse',
      type: 'warehouse',
      city: 'Mumbai',
      state: 'Maharashtra'
    })
  });
  const validRes = await worker.fetch(validReq, env);
  assert.equal(validRes.status, 201);
  const validData = await validRes.json();
  assert.equal(validData.success, true);
  assert.equal(validData.location.type, 'warehouse');
  assert.equal(validData.location.organization_id, 'org_test_1');
});

// 5. Multi-location Inventory & Atomic Decrement
await test('Correction 10 & 12: Atomic inventory decrements during checkout & multi-location upsert', async () => {
  const db = createTestDb();
  const env = createTestEnv(db);
  const token = await generateTestJwt({ sub: 'usr_merchant_p0', email: 'merchant_p0@example.com' });

  db.tables.locations.push({
    id: 'loc_store_1',
    organization_id: 'org_test_1',
    name: 'Main Store',
    type: 'store',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const invReq = new Request('https://ferasetu.com/api/inventory/locations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      product_id: 'prod_catalog_1',
      location_id: 'loc_store_1',
      variant_id: 'size_5kg',
      available_quantity: 30,
      reorder_threshold: 5
    })
  });
  const invRes = await worker.fetch(invReq, env);
  assert.equal(invRes.status, 200);

  assert.equal(db.tables.products[0].stock, 50);

  const checkoutReq = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Priya Patel',
      customerPhone: '9876543211',
      shopId: 'teststore1',
      items: [{ productId: 'prod_catalog_1', quantity: 3 }]
    })
  });
  const checkoutRes = await worker.fetch(checkoutReq, env);
  assert.equal(checkoutRes.status, 201);

  assert.equal(db.tables.products[0].stock, 47);
});

// 6. Comprehensive Invoices
await test('Correction 13, 14, 15: Checkout creates comprehensive 21-column invoice with store-scoped number', async () => {
  const db = createTestDb();
  const env = createTestEnv(db);

  const checkoutReq = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Rohan Gupta',
      customerPhone: '9876543212',
      shopId: 'teststore1',
      deliveryType: 'pickup',
      items: [{ productId: 'prod_catalog_1', quantity: 1 }]
    })
  });
  const checkoutRes = await worker.fetch(checkoutReq, env);
  assert.equal(checkoutRes.status, 201);

  assert.equal(db.tables.invoices.length, 1);
  const inv = db.tables.invoices[0];
  assert.equal(inv.organization_id, 'org_test_1');
  assert.equal(inv.customer_name, 'Rohan Gupta');
  assert.equal(inv.subtotal, 399);
  assert.equal(inv.total, 399);
  assert.equal(inv.currency, 'INR');
  assert.ok(inv.invoice_number.startsWith('INV-TESTSTORE1-'));
});

// 7. Merchant Branding
await test('Correction 16: Merchant branding is returned dynamically and can be updated', async () => {
  const db = createTestDb();
  const env = createTestEnv(db);
  const token = await generateTestJwt({ sub: 'usr_merchant_p0', email: 'merchant_p0@example.com' });

  const getReq = new Request('https://ferasetu.com/api/branding', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getRes = await worker.fetch(getReq, env);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.branding.organization_id, 'org_test_1');
  assert.equal(getData.branding.logo_url, 'https://cdn.ferasetu.com/store1-logo.png');

  const updateReq = new Request('https://ferasetu.com/api/branding', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      logo_url: 'https://cdn.ferasetu.com/updated-logo.png',
      primary_color: '#FF6B00'
    })
  });
  const updateRes = await worker.fetch(updateReq, env);
  assert.equal(updateRes.status, 200);

  const publicReq = new Request('https://ferasetu.com/api/website/public/teststore1');
  const publicRes = await worker.fetch(publicReq, env);
  assert.equal(publicRes.status, 200);
  const publicData = await publicRes.json();
  assert.equal(publicData.shop.name, 'Test Store 1');
  assert.equal(publicData.shop.logo_url, 'https://cdn.ferasetu.com/updated-logo.png');
  assert.equal(publicData.brand.logo_url, 'https://cdn.ferasetu.com/updated-logo.png');
});

// 8. India Market Entitlements
await test('Correction 17 & 18: India market resolved to free plan with zero trial synthesis', async () => {
  const entitlements = resolveAuthoritativeEntitlements(
    { market: 'IN', plan: 'trial' },
    { market: 'IN', plan: 'trial' }
  );

  assert.equal(entitlements.market, 'IN');
  assert.equal(entitlements.plan, 'free');
  assert.equal(entitlements.isTrial, false);
  assert.equal(entitlements.trial.eligible, false);
  assert.equal(entitlements.trial.active, false);
  assert.equal(entitlements.trial.endsAt, null);
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.error('Failed specifications:', failures);
  process.exit(1);
} else {
  console.log('🌟 All P0 Production Hardening Specifications Verified Successfully!\n');
}

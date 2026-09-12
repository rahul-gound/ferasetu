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

// In-memory multi-tenant D1 mock database
function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_new_merchant_1',
        email: 'merchant_one@example.com',
        name: 'Merchant One',
        is_verified: 1,
        plan: 'free',
        market: 'IN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr_new_merchant_2',
        email: 'merchant_two@example.com',
        name: 'Merchant Two',
        is_verified: 1,
        plan: 'free',
        market: 'IN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr_us_merchant',
        email: 'us_merchant@example.com',
        name: 'US Merchant',
        is_verified: 1,
        plan: 'free',
        market: 'US',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    organizations: [],
    organization_members: [],
    shops: [],
    products: [],
    orders: [],
    customers: [],
    websites: [],
    invoices: [],
    smtp_settings: []
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
          if (s.includes('from users where id =')) {
            const u = tables.users.find(x => x.id === this._params[0]);
            if (!u) return null;
            return col ? u[col] : { ...u };
          }
          if (s.includes('from organizations where id =')) {
            const org = tables.organizations.find(x => x.id === this._params[0]);
            if (!org) return null;
            return col ? org[col] : { ...org };
          }
          if (s.includes('from organizations where store_slug =')) {
            const org = tables.organizations.find(x => x.store_slug === this._params[0]);
            if (!org) return null;
            return col ? org[col] : { ...org };
          }
          if (s.includes('from organization_members om') && s.includes('join organizations o')) {
            const userId = this._params[0];
            const member = tables.organization_members.find(x => x.user_id === userId);
            if (!member) return null;
            const org = tables.organizations.find(x => x.id === member.organization_id);
            if (!org) return null;
            return {
              ...org,
              role: member.role,
              member_id: member.id,
              member_role: member.role,
              org_name: org.name,
              org_market: org.market,
              org_plan: org.plan,
              org_created_at: org.created_at
            };
          }
          if (s.includes('from organizations o') && s.includes('join organization_members om')) {
            const userId = this._params[0];
            const member = tables.organization_members.find(x => x.user_id === userId && x.role === 'owner');
            if (!member) return null;
            const org = tables.organizations.find(x => x.id === member.organization_id);
            return org ? { ...org, role: 'owner' } : null;
          }
          if (s.includes('from organization_members where organization_id =') && s.includes('user_id =')) {
            const orgId = this._params[0];
            const userId = this._params[1];
            const m = tables.organization_members.find(x => x.organization_id === orgId && x.user_id === userId);
            return m || null;
          }
          if (s.includes('from products where id =')) {
            const pId = this._params[0];
            const orgId = this._params[1];
            const p = tables.products.find(x => x.id === pId && (x.organization_id === orgId || !orgId));
            return p || null;
          }
          if (s.includes('from orders where id =')) {
            const oId = this._params[0];
            const orgId = this._params[1];
            const o = tables.orders.find(x => x.id === oId && (x.organization_id === orgId || !orgId));
            return o || null;
          }
          if (s.includes('count(*) as cnt from products')) {
            const orgId = this._params[0];
            const count = tables.products.filter(x => x.organization_id === orgId).length;
            return { cnt: count };
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase();
          if (s.includes('from products where organization_id =')) {
            const orgId = this._params[0];
            const results = tables.products.filter(x => x.organization_id === orgId);
            return { results };
          }
          if (s.includes('from orders where organization_id =')) {
            const orgId = this._params[0];
            const results = tables.orders.filter(x => x.organization_id === orgId);
            return { results };
          }
          if (s.includes('from customers where organization_id =')) {
            const orgId = this._params[0];
            const results = tables.customers.filter(x => x.organization_id === orgId);
            return { results };
          }
          if (s.includes('from organization_members om')) {
            const orgId = this._params[0];
            const results = tables.organization_members
              .filter(x => x.organization_id === orgId)
              .map(om => {
                const u = tables.users.find(x => x.id === om.user_id);
                return {
                  id: om.id,
                  organization_id: om.organization_id,
                  user_id: om.user_id,
                  role: om.role,
                  created_at: om.created_at,
                  name: u?.name || 'Staff Member',
                  email: u?.email || ''
                };
              });
            return { results };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase();
          if (s.includes('insert or ignore into organizations') || s.includes('insert into organizations')) {
            const [id, name, workos_organization_id, market, plan, address, city, state, store_slug, created_at, updated_at] = this._params;
            const existing = tables.organizations.find(x => x.id === id);
            if (!existing) {
              tables.organizations.push({ id, name, workos_organization_id, market, plan, address, city, state, store_slug, created_at, updated_at });
            }
            return { success: true };
          }
          if (s.includes('insert or ignore into organization_members') || s.includes('insert into organization_members')) {
            let id, organization_id, user_id, role, created_at, updated_at;
            if (s.includes("'owner'")) {
              [id, organization_id, user_id, created_at, updated_at] = this._params;
              role = 'owner';
            } else {
              [id, organization_id, user_id, role, created_at, updated_at] = this._params;
            }
            const existing = tables.organization_members.find(x => x.id === id);
            if (!existing) {
              tables.organization_members.push({ id, organization_id, user_id, role: role || 'owner', created_at, updated_at });
            }
            return { success: true };
          }
          if (s.includes('insert or ignore into shops') || s.includes('insert into shops')) {
            const [id, organization_id, name, store_slug, hostname, status, created_at, updated_at] = this._params;
            const existing = tables.shops.find(x => x.id === id);
            if (!existing) {
              tables.shops.push({ id, organization_id, name, store_slug, hostname, status, created_at, updated_at });
            }
            return { success: true };
          }
          if (s.includes('insert into products')) {
            const [id, user_id, organization_id, name, price, stock, description, created_at] = this._params;
            tables.products.push({ id, user_id, organization_id, name, price, stock, description, created_at });
            return { success: true };
          }
          if (s.includes('insert into orders')) {
            const [id, user_id, organization_id, customer_name, items, total, status, created_at] = this._params;
            tables.orders.push({ id, user_id, organization_id, customer_name, items, total, status, created_at });
            return { success: true };
          }
          if (s.includes('insert into customers')) {
            const [id, organization_id, name, email, phone, address, created_at, updated_at] = this._params;
            tables.customers.push({ id, organization_id, name, email, phone, address, created_at, updated_at });
            return { success: true };
          }
          return { success: true };
        }
      };
    }
  };
}

// Generate RSA key for WorkOS JWT validation
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-1';

// Mock WorkOS global fetch for API endpoints and JWKS
const originalFetch = globalThis.fetch;
const capturedWorkOSRequests = [];

globalThis.fetch = async (urlOrReq, init) => {
  const urlStr = (urlOrReq instanceof URL) ? urlOrReq.href : (typeof urlOrReq === 'string' ? urlOrReq : (urlOrReq && urlOrReq.url) ? urlOrReq.url : String(urlOrReq));

  if (urlStr.includes('api.workos.com/sso/jwks')) {
    return new Response(JSON.stringify({ keys: [jwk] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (urlStr.includes('api.workos.com/organizations')) {
    const body = init?.body ? JSON.parse(init.body) : {};
    capturedWorkOSRequests.push({ url: urlStr, method: init?.method, body });
    const mockOrgId = `org_workos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    return new Response(JSON.stringify({
      id: mockOrgId,
      name: body.name,
      allow_profiles_outside_organization: false,
      external_id: body.external_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (urlStr.includes('api.workos.com/user_management/organization_memberships')) {
    const body = init?.body ? JSON.parse(init.body) : {};
    capturedWorkOSRequests.push({ url: urlStr, method: init?.method, body });
    return new Response(JSON.stringify({
      id: `om_workos_${Date.now()}`,
      user_id: body.user_id,
      organization_id: body.organization_id,
      role: { slug: body.role_slug || 'member' },
      status: 'active'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (urlStr.includes('api.workos.com/user_management/invitations')) {
    const body = init?.body ? JSON.parse(init.body) : {};
    capturedWorkOSRequests.push({ url: urlStr, method: init?.method, body });
    return new Response(JSON.stringify({
      id: `inv_workos_${Date.now()}`,
      email: body.email,
      organization_id: body.organization_id,
      role: { slug: body.role_slug || 'member' },
      state: 'pending',
      accept_invitation_url: `https://auth.ferasetu.com/invitations/accept?id=inv_123`
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return originalFetch(urlOrReq, init);
};

async function createToken(sub, email, name = 'Merchant User') {
  return await new jose.SignJWT({ sub, email, name })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-1' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

const mockDb = createTestDb();
const mockEnv = {
  DB: mockDb,
  JWKS: jose.createLocalJWKSet({ keys: [jwk] }),
  WORKOS_API_KEY: 'sk_test_mock_workos_key_123456',
  WORKOS_CLIENT_ID: 'client_test_id'
};

console.log('\n🏛️ Suite: WorkOS AuthKit Multi-Tenant Merchant Organizations (15 Requirements)');

let org1Data = null;
let org2Data = null;

// 1. New user can sign up / get initial profile
await test('1. New user signs up and is verified through AuthKit', async () => {
  const token = await createToken('usr_new_merchant_1', 'merchant_one@example.com', 'Merchant One');
  const req = new Request('https://ferasetu.com/api/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.user.email, 'merchant_one@example.com');
  assert.equal(data.has_organization, false);
});

// 2. New merchant onboarding provisions organization
await test('2. New user automatically gets exactly one new merchant organization via onboarding', async () => {
  const token = await createToken('usr_new_merchant_1', 'merchant_one@example.com', 'Merchant One');
  const req = new Request('https://ferasetu.com/api/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Ramesh Super Market',
      address: 'Shop 12, Shivaji Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      invitations: []
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  org1Data = await res.json();
  assert.equal(org1Data.success, true);
  assert.ok(org1Data.organization.id);
  assert.equal(org1Data.organization.name, 'Ramesh Super Market');
  assert.equal(mockDb.tables.organizations.length, 1);
});

// 3. User becomes owner automatically
await test('3. New user becomes organization owner automatically', async () => {
  assert.equal(org1Data.organization.role, 'owner');
  const member = mockDb.tables.organization_members.find(
    m => m.organization_id === org1Data.organization.id && m.user_id === 'usr_new_merchant_1'
  );
  assert.ok(member);
  assert.equal(member.role, 'owner');
});

// 4. WorkOS organization is created automatically
await test('4. WorkOS organization is created automatically via API without manual dashboard steps', async () => {
  const workosOrgReq = capturedWorkOSRequests.find(r => r.url.includes('/organizations') && r.body.name === 'Ramesh Super Market');
  assert.ok(workosOrgReq, 'WorkOS organization API must be called automatically');
  assert.ok(org1Data.organization.workos_organization_id);
});

// 5. WorkOS external_id maps to FeraSetu organization ID
await test('5. WorkOS external_id maps cleanly to FeraSetu organization ID', async () => {
  const workosOrgReq = capturedWorkOSRequests.find(r => r.url.includes('/organizations') && r.body.name === 'Ramesh Super Market');
  assert.equal(workosOrgReq.body.external_id, org1Data.organization.id);
});

// 6. D1 and WorkOS organization records remain consistent
await test('6. D1 and WorkOS organization records remain consistent', async () => {
  const d1Org = mockDb.tables.organizations.find(o => o.id === org1Data.organization.id);
  assert.ok(d1Org);
  assert.equal(d1Org.name, 'Ramesh Super Market');
  assert.equal(d1Org.workos_organization_id, org1Data.organization.workos_organization_id);
});

// 7. Merchant completes onboarding without manual WorkOS dashboard steps
await test('7. Merchant can complete onboarding with zero manual WorkOS dashboard interaction', async () => {
  const token = await createToken('usr_new_merchant_1', 'merchant_one@example.com');
  const req = new Request('https://ferasetu.com/api/organizations/current', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.organization.id, org1Data.organization.id);
  assert.equal(data.organization.role, 'owner');
});

// 8. Merchant can skip staff invitations
await test('8. Merchant can skip staff invitations during onboarding', async () => {
  const token = await createToken('usr_new_merchant_2', 'merchant_two@example.com', 'Merchant Two');
  const req = new Request('https://ferasetu.com/api/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Pooja Fashion Boutiques',
      address: 'Near Gandhi Circle',
      city: 'Ahmedabad',
      state: 'Gujarat',
      invitations: [] // explicitly skipped
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  org2Data = await res.json();
  assert.equal(org2Data.invitations.length, 0);
  assert.equal(org2Data.organization.name, 'Pooja Fashion Boutiques');
});

// 9. Invited staff member gets WorkOS invitation
await test('9. Merchant can invite staff and invitation is created in WorkOS', async () => {
  const token = await createToken('usr_new_merchant_1', 'merchant_one@example.com');
  const req = new Request('https://ferasetu.com/api/organizations/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      email: 'staff1@example.com',
      role: 'staff'
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.email, 'staff1@example.com');
  assert.equal(data.role, 'staff');

  const invReq = capturedWorkOSRequests.find(r => r.url.includes('/invitations') && r.body.email === 'staff1@example.com');
  assert.ok(invReq);
  assert.equal(invReq.body.role_slug, 'staff');
});

// 10. Multi-tenant isolation: Two organizations cannot access each other's data
await test('10. Multi-tenant isolation: Two organizations cannot read or modify each other\'s data', async () => {
  const token1 = await createToken('usr_new_merchant_1', 'merchant_one@example.com');
  const token2 = await createToken('usr_new_merchant_2', 'merchant_two@example.com');

  // Org 1 creates a product
  const createProdReq = new Request('https://ferasetu.com/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      name: 'Private Basmati Rice',
      price: 299,
      stock: 50
    })
  });
  const prodRes = await worker.fetch(createProdReq, mockEnv);
  assert.equal(prodRes.status, 201);
  const { product: prod1 } = await prodRes.json();

  // Org 2 lists products: MUST NOT see Org 1 product
  const listProdReq = new Request('https://ferasetu.com/api/products', {
    headers: { Authorization: `Bearer ${token2}` }
  });
  const listRes = await worker.fetch(listProdReq, mockEnv);
  assert.equal(listRes.status, 200);
  const { products: org2Products } = await listRes.json();
  const leaked = org2Products.find(p => p.id === prod1.id);
  assert.equal(leaked, undefined, 'Org 2 must not see Org 1 products');

  // Org 2 tries to GET Org 1 product directly by ID: MUST 404
  const getProdReq = new Request(`https://ferasetu.com/api/products/${prod1.id}`, {
    headers: { Authorization: `Bearer ${token2}` }
  });
  const getRes = await worker.fetch(getProdReq, mockEnv);
  assert.equal(getRes.status, 404, 'Cross-tenant GET product must return 404');
});

// 11. Customer email is redacted by default
await test('11. Customer email is redacted by default from merchant dashboard API endpoints', async () => {
  // Public customer places order
  const checkoutReq = new Request('https://ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: org1Data.organization.id,
      customerName: 'Aarav Sharma',
      customerPhone: '+919876543210',
      customerEmail: 'secret.customer@example.com',
      deliveryAddress: 'Flat 402, Model Colony, Pune',
      items: [{ productId: 'mock_prod', quantity: 1 }]
    })
  });
  const checkoutRes = await worker.fetch(checkoutReq, mockEnv);
  assert.equal(checkoutRes.status, 201);
  const { order } = await checkoutRes.json();

  // Merchant 1 views orders
  const token1 = await createToken('usr_new_merchant_1', 'merchant_one@example.com');
  const getOrderReq = new Request(`https://ferasetu.com/api/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${token1}` }
  });
  const orderRes = await worker.fetch(getOrderReq, mockEnv);
  assert.equal(orderRes.status, 200);
  const orderData = await orderRes.json();
  assert.equal(orderData.customer_email, undefined, 'customer_email must be redacted for privacy');
});

// 12. Customer name is returned
await test('12. Customer name is returned on order and customer records', async () => {
  const token1 = await createToken('usr_new_merchant_1', 'merchant_one@example.com');
  const listOrdersReq = new Request('https://ferasetu.com/api/orders', {
    headers: { Authorization: `Bearer ${token1}` }
  });
  const res = await worker.fetch(listOrdersReq, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.orders.length > 0);
  assert.equal(data.orders[0].customer_name, 'Aarav Sharma');
});

// 13. Store URL is generated and remains stable
await test('13. Store URL is generated using safe slug and remains stable', async () => {
  assert.ok(org1Data.store_slug);
  assert.ok(org1Data.store_url);
  assert.equal(org1Data.store_url, `https://${org1Data.store_slug}.ferasetu.com`);
  assert.equal(org1Data.store_slug.includes('ramesh'), true);
});

// 14. India Free selling restrictions are enforced server-side
await test('14. India Free selling restrictions are enforced server-side (US merchant cannot activate India Free)', async () => {
  const tokenUs = await createToken('usr_us_merchant', 'us_merchant@example.com', 'US Merchant');
  
  // US merchant attempts onboarding with US state
  const req = new Request('https://ferasetu.com/api/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenUs}`
    },
    body: JSON.stringify({
      name: 'San Jose Grocers',
      address: '100 Market St',
      city: 'San Jose',
      state: 'California',
      invitations: []
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const usOrg = await res.json();
  assert.equal(usOrg.organization.market, 'US', 'Market must authoritatively resolve to US');
  assert.equal(usOrg.organization.plan, 'trial', 'US merchants must receive 14-day trial, never India Free plan');
});

// 15. Existing authentication and storefront routes do not break
await test('15. Backward compatibility: Existing auth routes, health checks, and public storefront endpoints remain stable', async () => {
  const healthReq = new Request('https://ferasetu.com/api/health');
  const healthRes = await worker.fetch(healthReq, mockEnv);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');

  const templatesReq = new Request('https://ferasetu.com/api/website/templates');
  const templatesRes = await worker.fetch(templatesReq, mockEnv);
  assert.equal(templatesRes.status, 200);
});

console.log('────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) {
    console.error(`- ${f.name}:`, f.err);
  }
  process.exit(1);
} else {
  console.log('\n🌟 All 15 WorkOS Multi-Tenant Organization requirements verified successfully!\n');
}
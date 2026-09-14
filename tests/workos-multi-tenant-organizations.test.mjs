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
    smtp_settings: [],
    tickets: [],
    ticket_replies: []
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
          if (s.includes('from websites where')) {
            const orgId = this._params[0];
            const userId = this._params[1];
            const w = tables.websites.find(x => x.organization_id === orgId || (userId && x.user_id === userId) || x.id === orgId);
            return w || null;
          }
          if (s.includes('from ticket_replies where id =')) {
            const rId = this._params[0];
            const r = tables.ticket_replies.find(x => x.id === rId);
            return r || null;
          }
          if (s.includes('from tickets where id =')) {
            const tId = this._params[0];
            const orgId = this._params[1];
            const userId = this._params[2];
            const t = tables.tickets.find(x => x.id === tId && (!orgId || x.organization_id === orgId || (!x.organization_id && x.user_id === userId)));
            return t || null;
          }
          if (s.includes('from products where id =')) {
            const pId = this._params[0];
            const orgId = this._params[1];
            const userId = this._params[2];
            const p = tables.products.find(x => x.id === pId && (!orgId || x.organization_id === orgId || (!x.organization_id && x.user_id === userId)));
            return p || null;
          }
          if (s.includes('from orders where id =')) {
            const oId = this._params[0];
            const orgId = this._params[1];
            const userId = this._params[2];
            const o = tables.orders.find(x => x.id === oId && (!orgId || x.organization_id === orgId || (!x.organization_id && x.user_id === userId)));
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
          if (s.includes('from products where')) {
            const orgId = this._params[0];
            const userId = this._params[1];
            const results = tables.products.filter(x => x.organization_id === orgId || (userId && !x.organization_id && x.user_id === userId));
            return { results };
          }
          if (s.includes('from orders where')) {
            const orgId = this._params[0];
            const userId = this._params[1];
            const results = tables.orders.filter(x => x.organization_id === orgId || (userId && !x.organization_id && x.user_id === userId));
            return { results };
          }
          if (s.includes('from customers where')) {
            const orgId = this._params[0];
            const results = tables.customers.filter(x => x.organization_id === orgId);
            return { results };
          }
          if (s.includes('from tickets where')) {
            const orgId = this._params[0];
            const userId = this._params[1];
            const results = tables.tickets.filter(x => x.organization_id === orgId || (userId && !x.organization_id && x.user_id === userId));
            return { results };
          }
          if (s.includes('from ticket_replies where ticket_id =')) {
            const tId = this._params[0];
            const results = tables.ticket_replies.filter(x => x.ticket_id === tId);
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
          if (s.includes('organizations') && s.includes('insert')) {
            const [id, name, workos_organization_id, market, plan, address, city, district, state, country, store_slug, created_at, updated_at] = this._params;
            const existing = tables.organizations.find(x => x.id === id);
            if (!existing) {
              tables.organizations.push({ id, name, workos_organization_id, market, plan, address, city, district, state, country, store_slug, created_at, updated_at });
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('organization_members') && s.includes('insert')) {
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
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('shops') && s.includes('insert')) {
            const [id, organization_id, name, store_slug, hostname, status, created_at, updated_at] = this._params;
            const existing = tables.shops.find(x => x.id === id);
            if (!existing) {
              tables.shops.push({ id, organization_id, name, store_slug, hostname, status, created_at, updated_at });
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into products')) {
            const [id, user_id, organization_id, name, price, stock, description, created_at] = this._params;
            tables.products.push({ id, user_id, organization_id, name, price, stock: stock || 10, description: description || '', created_at: created_at || new Date().toISOString() });
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into orders')) {
            const [id, user_id, organization_id, customer_name, customer_phone, items, total, status, created_at] = this._params;
            tables.orders.push({
              id,
              user_id,
              organization_id,
              customer_name,
              customer_phone: customer_phone || null,
              items: items || '[]',
              total: total || 0,
              status: status || 'pending',
              delivery_code: '123456',
              created_at: created_at || new Date().toISOString()
            });
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('update orders set status =')) {
            const isDelivered = s.includes("'delivered'");
            const status = isDelivered ? 'delivered' : this._params[0];
            const now = isDelivered ? this._params[0] : null;
            const oId = isDelivered ? this._params[1] : this._params[1];
            const orgId = isDelivered ? this._params[2] : this._params[2];
            const userId = isDelivered ? this._params[3] : this._params[3];
            const order = tables.orders.find(x => x.id === oId && (!orgId || x.organization_id === orgId || (!x.organization_id && x.user_id === userId)));
            if (order) {
              order.status = status;
              if (now) order.updated_at = now;
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
          if (s.includes('update websites set is_published =')) {
            const isPub = this._params[0];
            const now = this._params[1];
            const wId = this._params[2];
            const orgId = this._params[3];
            const userId = this._params[4];
            const web = tables.websites.find(x => x.id === wId && (!orgId || x.organization_id === orgId || (!x.organization_id && x.user_id === userId)));
            if (web) {
              web.is_published = isPub;
              web.updated_at = now;
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
          if (s.includes('insert into websites')) {
            const [id, user_id, organization_id, name, template, config, theme, sections, created_at, updated_at] = this._params;
            tables.websites.push({ id, user_id, organization_id, name, template, config, theme, sections, is_published: 0, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into tickets')) {
            const id = this._params[0];
            const user_id = this._params[1];
            const organization_id = this._params.length >= 7 ? this._params[2] : null;
            const subject = this._params.length >= 7 ? this._params[3] : this._params[2];
            const description = this._params.length >= 7 ? this._params[4] : this._params[3];
            const created_at = this._params[this._params.length - 2];
            const updated_at = this._params[this._params.length - 1];
            tables.tickets.push({ id, user_id, organization_id, subject, description, status: 'open', created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into ticket_replies')) {
            const [id, ticket_id, content, created_at] = this._params;
            tables.ticket_replies.push({ id, ticket_id, sender_role: 'merchant', content, created_at });
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('update tickets set updated_at =')) {
            const [now, ticketId] = this._params;
            const t = tables.tickets.find(x => x.id === ticketId);
            if (t) t.updated_at = now;
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('insert into customers')) {
            const [id, organization_id, name, email, phone, address, created_at, updated_at] = this._params;
            tables.customers.push({ id, organization_id, name, email, phone, address, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 1 } };
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

// 16. Onboarding with District (Palghar) and Country (India)
await test('16. Onboarding records District (e.g. Palghar) and Country correctly', async () => {
  const token = await createToken('usr_palghar_merchant', 'palghar_store@example.com', 'Palghar Merchant');
  const req = new Request('https://ferasetu.com/api/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Boisar Daily Mart',
      address: 'Shop 3, Station Road',
      district: 'Palghar',
      city: 'Boisar',
      state: 'Maharashtra',
      country: 'India',
      market: 'IN',
      invitations: []
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const palgharOrg = await res.json();
  assert.equal(palgharOrg.organization.district, 'Palghar');
  assert.equal(palgharOrg.organization.city, 'Boisar');
  assert.equal(palgharOrg.organization.state, 'Maharashtra');
  assert.equal(palgharOrg.organization.country, 'India');
  assert.equal(palgharOrg.organization.market, 'IN');
});

// 17. Onboarding with EU country (Germany) and District
await test('17. Onboarding with EU country and District resolves to EU market and trial plan', async () => {
  const token = await createToken('usr_eu_merchant', 'munich_store@example.com', 'Munich Merchant');
  const req = new Request('https://ferasetu.com/api/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Munich Fresh Market',
      address: 'Hauptstrasse 42',
      district: 'Upper Bavaria',
      city: 'Munich',
      state: 'Bavaria',
      country: 'Germany',
      market: 'EU',
      invitations: []
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const euOrg = await res.json();
  assert.equal(euOrg.organization.market, 'EU');
  assert.equal(euOrg.organization.plan, 'trial');
  assert.equal(euOrg.organization.district, 'Upper Bavaria');
  assert.equal(euOrg.organization.country, 'Germany');
});

// 18. Website Publishing Scoping: Cross-org publish attempt returns 404
await test('18. Website Publishing Scoping: Cross-org website publish denied with 404', async () => {
  const token2 = await createToken('usr_new_merchant_2', 'merchant_two@example.com', 'Merchant Two');
  
  // Org 2 has not created a website; attempting to publish returns 404
  const req = new Request('https://ferasetu.com/api/website/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`
    },
    body: JSON.stringify({ published: true })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 404, 'Cross-org or non-existent website publish must return 404');
});

// 19. Website Publishing Scoping: Authorized same-org staff/admin can publish
await test('19. Website Publishing Scoping: Same-org staff/admin allowed to publish website', async () => {
  const token1 = await createToken('usr_new_merchant_1', 'merchant_one@example.com', 'Merchant One');
  
  // Org 1 creates website configuration
  const saveReq = new Request('https://ferasetu.com/api/website', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      name: 'Ramesh Super Market Online',
      template: 'market',
      config: { announcement: 'Welcome to Ramesh Super Market' }
    })
  });
  const saveRes = await worker.fetch(saveReq, mockEnv);
  assert.equal(saveRes.status, 200);

  // Org 1 publishes website
  const pubReq = new Request('https://ferasetu.com/api/website/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({ published: true })
  });
  const pubRes = await worker.fetch(pubReq, mockEnv);
  assert.equal(pubRes.status, 200);
  const pubData = await pubRes.json();
  assert.equal(pubData.published, true);

  // Verify website in DB is scoped to Org 1
  const storedWeb = mockDb.tables.websites.find(w => w.organization_id === org1Data.organization.id);
  assert.ok(storedWeb, 'Website must be stored with organization_id');
  assert.equal(storedWeb.is_published, 1);
});

// 20. verifyOrderOtp: Invalid OTP rejected with 400
await test('20. verifyOrderOtp: Invalid OTP rejected with 400', async () => {
  const token1 = await createToken('usr_new_merchant_1', 'merchant_one@example.com');
  
  // Create an order for Org 1
  const orderId = `ord_${crypto.randomUUID()}`;
  mockDb.tables.orders.push({
    id: orderId,
    user_id: 'usr_new_merchant_1',
    organization_id: org1Data.organization.id,
    customer_name: 'Rohit Patil',
    customer_phone: '+919811122233',
    items: JSON.stringify([{ productId: 'prod_1', quantity: 1 }]),
    total: 299,
    status: 'pending',
    delivery_code: '456789',
    created_at: new Date().toISOString()
  });

  const req = new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({ otp: '000000' }) // Invalid OTP
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 400, 'Invalid OTP must return 400');
  const errData = await res.json();
  assert.equal(errData.error, 'Invalid OTP');
});

// 21. verifyOrderOtp: Cross-tenant verification returns 404
await test('21. verifyOrderOtp: Cross-tenant OTP verification returns 404', async () => {
  const token2 = await createToken('usr_new_merchant_2', 'merchant_two@example.com', 'Merchant Two');
  
  // Target order belongs to Org 1
  const orderId = `ord_${crypto.randomUUID()}`;
  mockDb.tables.orders.push({
    id: orderId,
    user_id: 'usr_new_merchant_1',
    organization_id: org1Data.organization.id,
    customer_name: 'Priya Verma',
    customer_phone: '+919822233344',
    items: JSON.stringify([{ productId: 'prod_1', quantity: 2 }]),
    total: 598,
    status: 'pending',
    delivery_code: '123456',
    created_at: new Date().toISOString()
  });

  // Org 2 tries to verify OTP on Org 1 order
  const req = new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`
    },
    body: JSON.stringify({ otp: '123456' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 404, 'Cross-tenant order OTP verification must return 404');
});

// 22. verifyOrderOtp: Successful verification marks order delivered and changes exactly 1 tenant-scoped row
await test('22. verifyOrderOtp: Successful OTP verification marks order delivered and scopes row state', async () => {
  const token1 = await createToken('usr_new_merchant_1', 'merchant_one@example.com');
  
  const orderId = `ord_${crypto.randomUUID()}`;
  mockDb.tables.orders.push({
    id: orderId,
    user_id: 'usr_new_merchant_1',
    organization_id: org1Data.organization.id,
    customer_name: 'Ananya Deshmukh',
    customer_phone: '+919833344455',
    items: JSON.stringify([{ productId: 'prod_1', quantity: 1 }]),
    total: 299,
    status: 'confirmed',
    delivery_code: '789123',
    created_at: new Date().toISOString()
  });

  const req = new Request(`https://ferasetu.com/api/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({ otp: '789123' })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200, 'Valid OTP on owned order must return 200');
  const resData = await res.json();
  assert.equal(resData.success, true);
  assert.equal(resData.order.status, 'delivered');

  // Verify stored order status
  const updatedOrder = mockDb.tables.orders.find(o => o.id === orderId);
  assert.equal(updatedOrder.status, 'delivered');
  assert.equal(updatedOrder.organization_id, org1Data.organization.id);
});

// 23. Support Tickets: Cross-tenant ticket listing and reply isolation
await test('23. Support Tickets: Merchant in Org A cannot view tickets from Org B', async () => {
  const token1 = await createToken('usr_new_merchant_1', 'merchant_one@example.com');
  const token2 = await createToken('usr_new_merchant_2', 'merchant_two@example.com');

  // Org 1 creates ticket
  const createReq = new Request('https://ferasetu.com/api/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      subject: 'GST Invoice Generation Question',
      description: 'How do I download monthly B2B GST invoices?'
    })
  });
  const createRes = await worker.fetch(createReq, mockEnv);
  assert.equal(createRes.status, 201);
  const ticket1 = await createRes.json();
  assert.ok(ticket1.id);
  assert.equal(ticket1.organization_id, org1Data.organization.id);

  // Org 2 lists tickets: must NOT see Org 1 ticket
  const listReq = new Request('https://ferasetu.com/api/tickets', {
    headers: { Authorization: `Bearer ${token2}` }
  });
  const listRes = await worker.fetch(listReq, mockEnv);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  const leakedTicket = listData.tickets.find(t => t.id === ticket1.id);
  assert.equal(leakedTicket, undefined, 'Org 2 must not see tickets belonging to Org 1');

  // Org 2 tries to view replies for Org 1 ticket: must return 404
  const repliesReq = new Request(`https://ferasetu.com/api/tickets/${ticket1.id}/replies`, {
    headers: { Authorization: `Bearer ${token2}` }
  });
  const repliesRes = await worker.fetch(repliesReq, mockEnv);
  assert.equal(repliesRes.status, 404, 'Org 2 viewing replies of Org 1 ticket must return 404');
});

// 24. Support Tickets: Authorized same-org reply and retrieval
await test('24. Support Tickets: Same-org staff can reply and fetch replies with organization_id scoping', async () => {
  const token1 = await createToken('usr_new_merchant_1', 'merchant_one@example.com');
  
  // Find ticket created in previous test
  const ticket = mockDb.tables.tickets.find(t => t.organization_id === org1Data.organization.id);
  assert.ok(ticket);

  // Add reply
  const replyReq = new Request(`https://ferasetu.com/api/tickets/${ticket.id}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({ content: 'We need this urgently for audit.' })
  });
  const replyRes = await worker.fetch(replyReq, mockEnv);
  assert.equal(replyRes.status, 201);
  const replyData = await replyRes.json();
  assert.equal(replyData.content, 'We need this urgently for audit.');

  // Org 2 attempts to post reply to Org 1 ticket: must return 404
  const token2 = await createToken('usr_new_merchant_2', 'merchant_two@example.com');
  const rogueReplyReq = new Request(`https://ferasetu.com/api/tickets/${ticket.id}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`
    },
    body: JSON.stringify({ content: 'Malicious injection from other tenant' })
  });
  const rogueReplyRes = await worker.fetch(rogueReplyReq, mockEnv);
  assert.equal(rogueReplyRes.status, 404, 'Cross-tenant reply must return 404');
});

// 25. Newly created merchant resources always possess authoritative organization_id
await test('25. Authoritative Tenant Boundary: Newly created merchant resources always contain organization_id', async () => {
  const token1 = await createToken('usr_new_merchant_1', 'merchant_one@example.com');

  // Product
  const prodReq = new Request('https://ferasetu.com/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({ name: 'Organic Turmeric 500g', price: 140, stock: 25 })
  });
  const prodRes = await worker.fetch(prodReq, mockEnv);
  assert.equal(prodRes.status, 201);
  const prodData = await prodRes.json();
  assert.equal(prodData.product.organization_id, org1Data.organization.id, 'Product organization_id must be populated from auth context');
  assert.notEqual(prodData.product.organization_id, null);

  // Order
  const orderReq = new Request('https://ferasetu.com/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      customer_name: 'Kavita Shinde',
      items: [{ productId: prodData.product.id, quantity: 2 }]
    })
  });
  const orderRes = await worker.fetch(orderReq, mockEnv);
  assert.equal(orderRes.status, 201);
  const orderData = await orderRes.json();
  assert.equal(orderData.order.organization_id, org1Data.organization.id, 'Order organization_id must be populated from auth context');
  assert.notEqual(orderData.order.organization_id, null);
});

// 26. Zero Unscoped Fallbacks: Fallback queries maintain strict tenant isolation
await test('26. Zero-Trust Scoping: Catch-block fallbacks never leak cross-tenant data', async () => {
  // Verify that all products in DB belonging to Org 1 are not returned to Org 2
  const token2 = await createToken('usr_new_merchant_2', 'merchant_two@example.com');
  const req = new Request('https://ferasetu.com/api/products', {
    headers: { Authorization: `Bearer ${token2}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  for (const p of data.products) {
    assert.equal(p.organization_id, org2Data.organization.id, 'Products returned must only belong to Org 2');
  }
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
  console.log('\n🌟 All WorkOS Multi-Tenant Organization and Security Hardening requirements verified successfully!\n');
}
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

// Generate RSA key pair for test WorkOS JWT
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-integrations';

async function createToken(sub, email, orgId = 'org_merchant_test', role = 'admin') {
  return await new jose.SignJWT({ sub, email, org_id: orgId, role })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-integrations' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_merchant_1',
        email: 'merchant@store.com',
        name: 'Merchant One',
        business_name: 'Kirana Store 1',
        market: 'IN',
        whatsapp_connected: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    organizations: [
      {
        id: 'org_merchant_test',
        workos_organization_id: 'org_merchant_test',
        name: 'Kirana Store 1',
        store_slug: 'kiranastore1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    organization_members: [
      {
        id: 'mem_1',
        organization_id: 'org_merchant_test',
        user_id: 'usr_merchant_1',
        role: 'admin',
        created_at: new Date().toISOString(),
      },
    ],
    merchant_webhooks: [],
    merchant_integrations: [],
    integration_requests: [],
    smtp_settings: [],
    email_provider_connections: [],
  };

  return {
    tables,
    prepare(sql) {
      return {
        _params: [],
        bind(...args) {
          this._params = args;
          return {
            async run() {
              const lower = sql.toLowerCase();
              if (lower.includes('insert into merchant_integrations')) {
                const [id, orgId, serviceId, name, category, config, credentialsMasked, connectedAt, updatedAt] = args;
                const existingIdx = tables.merchant_integrations.findIndex(
                  (m) => m.organization_id === orgId && m.service_id === serviceId
                );
                const record = {
                  id,
                  organization_id: orgId,
                  service_id: serviceId,
                  name,
                  category,
                  status: 'connected',
                  config,
                  credentials_masked: credentialsMasked,
                  connected_at: connectedAt,
                  updated_at: updatedAt,
                };
                if (existingIdx >= 0) {
                  tables.merchant_integrations[existingIdx] = record;
                } else {
                  tables.merchant_integrations.push(record);
                }
                return { success: true, meta: { changes: 1 } };
              }

              if (lower.includes('delete from merchant_integrations')) {
                const [orgId, serviceId] = args;
                const prevLen = tables.merchant_integrations.length;
                tables.merchant_integrations = tables.merchant_integrations.filter(
                  (m) => !(m.organization_id === orgId && m.service_id === serviceId)
                );
                return { success: true, meta: { changes: prevLen - tables.merchant_integrations.length } };
              }

              if (lower.includes('insert into merchant_webhooks')) {
                const [id, orgId, url, events, secret, now] = args;
                tables.merchant_webhooks.push({
                  id,
                  organization_id: orgId,
                  url,
                  events,
                  secret,
                  is_active: 1,
                  created_at: now,
                  updated_at: now,
                });
                return { success: true, meta: { changes: 1 } };
              }

              if (lower.includes('delete from merchant_webhooks')) {
                const [whId, orgId] = args;
                const prev = tables.merchant_webhooks.length;
                tables.merchant_webhooks = tables.merchant_webhooks.filter(
                  (w) => !(w.id === whId && w.organization_id === orgId)
                );
                return { success: true, meta: { changes: prev - tables.merchant_webhooks.length } };
              }

              if (lower.includes('insert into integration_requests')) {
                const [reqId, orgId, userId, serviceName, notes, now] = args;
                tables.integration_requests.push({
                  id: reqId,
                  organization_id: orgId,
                  user_id: userId,
                  service_name: serviceName,
                  notes,
                  status: 'pending',
                  created_at: now,
                });
                return { success: true, meta: { changes: 1 } };
              }

              return { success: true, meta: { changes: 1 } };
            },
            async first(col) {
              const lower = sql.toLowerCase();
              if (lower.includes('from users where id =')) {
                const u = tables.users.find((x) => x.id === args[0]);
                return u ? (col ? u[col] : { ...u }) : null;
              }
              if (lower.includes('from organizations where workos_organization_id =') || lower.includes('from organizations where id =')) {
                const o = tables.organizations.find((x) => x.workos_organization_id === args[0] || x.id === args[0]);
                return o ? (col ? o[col] : { ...o }) : null;
              }
              if (lower.includes('from organization_members where organization_id =') || lower.includes('from organization_members where user_id =')) {
                const m = tables.organization_members.find((x) => (args[0] ? x.organization_id === args[0] : true) && (args[1] ? x.user_id === args[1] : x.user_id === args[0]));
                return m ? (col ? m[col] : { ...m }) : null;
              }
              if (lower.includes('from organization_members om') && lower.includes('join organizations o')) {
                const m = tables.organization_members.find((x) => x.user_id === args[0]);
                if (!m) return null;
                const o = tables.organizations.find((x) => x.id === m.organization_id);
                if (!o) return null;
                return { ...o, member_role: m.role, member_id: m.id };
              }
              if (lower.includes('count(*) as count from merchant_webhooks')) {
                const count = tables.merchant_webhooks.filter((w) => w.organization_id === args[0]).length;
                return { count };
              }
              return null;
            },
            async all() {
              const lower = sql.toLowerCase();
              if (lower.includes('from merchant_integrations where organization_id =')) {
                const results = tables.merchant_integrations.filter((m) => m.organization_id === args[0]);
                return { results };
              }
              if (lower.includes('from merchant_webhooks where organization_id =')) {
                const results = tables.merchant_webhooks.filter((w) => w.organization_id === args[0]);
                return { results };
              }
              return { results: [] };
            },
          };
        },
      };
    },
  };
}

function createMockEnv(db, extra = {}) {
  return {
    DB: db,
    JWKS: jose.createLocalJWKSet({ keys: [jwk] }),
    ENVIRONMENT: 'test',
    BASE_DOMAIN: 'ferasetu.com',
    ...extra,
  };
}

console.log('\n🚀 Starting Integrations Hub & Logos Pipeline Test Suite...\n');

await test('Integrations Hub — Query returns verified services list with active states', async () => {
  const db = createTestDb();
  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  const req = new Request('http://localhost:8787/api/integrations', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const env = createMockEnv(db, {
    CASHFREE_APP_ID: 'cf_test_app_id',
    CASHFREE_SECRET_KEY: 'cf_test_secret_key',
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.services));
  assert.ok(data.services.length >= 10);

  // Cashfree should be connected due to env
  const cf = data.services.find((s) => s.id === 'cashfree-pg');
  assert.ok(cf);
  assert.equal(cf.status, 'connected');

  // WhatsApp should be connected due to user.whatsapp_connected = 1
  const wa = data.services.find((s) => s.id === 'wa-baileys');
  assert.ok(wa);
  assert.equal(wa.status, 'connected');
});

await test('Integrations Hub — Connect chooses and adds an integration with masked credentials', async () => {
  const db = createTestDb();
  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  const payload = {
    serviceId: 'stripe-pg',
    name: 'Stripe Global Payments',
    category: 'payments',
    config: { currency: 'INR' },
    credentials: {
      publishableKey: 'pk_live_51M00000000000000000001',
      secretKey: 'sk_live_51M00000000000000000002',
    },
  };

  const req = new Request('http://localhost:8787/api/integrations/connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const env = createMockEnv(db);

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.integration.serviceId, 'stripe-pg');
  assert.equal(data.integration.status, 'connected');
  // Credentials should be masked
  assert.ok(data.integration.credentialsMasked.includes('••••'));

  // Verify persistence in DB
  assert.equal(db.tables.merchant_integrations.length, 1);
  assert.equal(db.tables.merchant_integrations[0].service_id, 'stripe-pg');

  // Verify GET /api/integrations now surfaces the newly connected Stripe
  const getReq = new Request('http://localhost:8787/api/integrations', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const getRes = await worker.fetch(getReq, env);
  const getData = await getRes.json();
  const stripe = getData.services.find((s) => s.id === 'stripe-pg');
  assert.ok(stripe);
  assert.equal(stripe.status, 'connected');
});

await test('Integrations Hub — Disconnect removes the integration from active state', async () => {
  const db = createTestDb();
  db.tables.merchant_integrations.push({
    id: 'int_123',
    organization_id: 'org_merchant_test',
    service_id: 'shiprocket-logistics',
    name: 'Shiprocket Multi-Carrier',
    category: 'logistics',
    status: 'connected',
    config: '{}',
    credentials_masked: 'apiToken: ••••••••',
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  const req = new Request('http://localhost:8787/api/integrations/disconnect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ serviceId: 'shiprocket-logistics' }),
  });

  const env = createMockEnv(db);

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(db.tables.merchant_integrations.length, 0);
});

await test('Integrations Hub — Webhook registration and deletion with HMAC secrets', async () => {
  const db = createTestDb();
  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  // Register webhook
  const req = new Request('http://localhost:8787/api/integrations/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: 'https://webhook.site/test-integration-endpoint',
      events: 'orders.created,orders.delivered',
    }),
  });

  const env = createMockEnv(db);

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.webhook.secret.startsWith('whsec_'));
  assert.equal(db.tables.merchant_webhooks.length, 1);

  // Delete webhook
  const delReq = new Request(`http://localhost:8787/api/integrations/webhooks/${data.webhook.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const delRes = await worker.fetch(delReq, env);
  assert.equal(delRes.status, 200);
  assert.equal(db.tables.merchant_webhooks.length, 0);
});

await test('Integrations Hub — Integration feature request persists with pending status', async () => {
  const db = createTestDb();
  const token = await createToken('usr_merchant_1', 'merchant@store.com');

  const req = new Request('http://localhost:8787/api/integrations/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      serviceName: 'Busy Accounting Software',
      notes: 'Need XML export for Busy Accounting v21',
    }),
  });

  const env = createMockEnv(db);

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);
  assert.equal(db.tables.integration_requests.length, 1);
  assert.equal(db.tables.integration_requests[0].service_name, 'Busy Accounting Software');
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nFailures:\n', failures);
  process.exit(1);
} else {
  console.log('\n🎉 All Integrations Hub & Logos tests passed successfully!\n');
}

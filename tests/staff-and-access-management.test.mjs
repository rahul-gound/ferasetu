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
jwk.kid = 'test-workos-key-staff';

async function createToken(sub, email, orgId = 'org_merchant_test', role = 'admin') {
  return await new jose.SignJWT({ sub, email, org_id: orgId, role })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-staff' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_owner_1',
        email: 'owner@store.com',
        name: 'Suresh Patel',
        business_name: 'Patel Supermarket',
        market: 'IN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr_staff_2',
        email: 'cashier@store.com',
        name: 'Ramesh Yadav',
        business_name: 'Patel Supermarket',
        market: 'IN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    organizations: [
      {
        id: 'org_merchant_test',
        workos_organization_id: 'org_merchant_test',
        name: 'Patel Supermarket Org',
        store_slug: 'patelsupermarket',
        plan: 'business',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    organization_members: [
      {
        id: 'mem_owner',
        organization_id: 'org_merchant_test',
        user_id: 'usr_owner_1',
        role: 'owner',
        created_at: new Date().toISOString(),
      },
      {
        id: 'mem_staff_2',
        organization_id: 'org_merchant_test',
        user_id: 'usr_staff_2',
        role: 'staff',
        created_at: new Date().toISOString(),
      },
    ],
    organization_invitations: [],
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

              if (lower.includes('insert into organization_invitations')) {
                const [id, orgId, email, name, phone, role, station, status, invitedBy, now1, now2] = args;
                tables.organization_invitations.push({
                  id,
                  organization_id: orgId,
                  email,
                  name,
                  phone,
                  role,
                  station,
                  status,
                  invited_by: invitedBy,
                  created_at: now1,
                  updated_at: now2,
                });
                return { success: true, meta: { changes: 1 } };
              }

              if (lower.includes('delete from organization_invitations')) {
                const [invId, orgId] = args;
                const prev = tables.organization_invitations.length;
                tables.organization_invitations = tables.organization_invitations.filter(
                  (i) => !(i.id === invId && i.organization_id === orgId)
                );
                return { success: true, meta: { changes: prev - tables.organization_invitations.length } };
              }

              if (lower.includes('update organization_members')) {
                const [role, now, memId, orgId] = args;
                const member = tables.organization_members.find((m) => m.id === memId && m.organization_id === orgId);
                if (member) {
                  member.role = role;
                  member.updated_at = now;
                  return { success: true, meta: { changes: 1 } };
                }
                return { success: true, meta: { changes: 0 } };
              }

              if (lower.includes('delete from organization_members')) {
                const [memId, orgId] = args;
                const prev = tables.organization_members.length;
                tables.organization_members = tables.organization_members.filter(
                  (m) => !(m.id === memId && m.organization_id === orgId)
                );
                return { success: true, meta: { changes: prev - tables.organization_members.length } };
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
              if (lower.includes('count(*) as cnt from organization_members')) {
                const cnt = tables.organization_members.filter((m) => m.organization_id === args[0] && m.role !== 'owner').length;
                return { cnt };
              }
              if (lower.includes('from organization_members where id =') && lower.includes('and organization_id =')) {
                const m = tables.organization_members.find((x) => x.id === args[0] && x.organization_id === args[1]);
                return m ? (col ? m[col] : { ...m }) : null;
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
              return null;
            },
            async all() {
              const lower = sql.toLowerCase();
              if (lower.includes('from organization_members om')) {
                const results = tables.organization_members
                  .filter((m) => m.organization_id === args[0])
                  .map((m) => {
                    const u = tables.users.find((x) => x.id === m.user_id);
                    return {
                      id: m.id,
                      organization_id: m.organization_id,
                      user_id: m.user_id,
                      role: m.role,
                      created_at: m.created_at,
                      name: u?.name || 'Team Member',
                      email: u?.email || '',
                    };
                  });
                return { results };
              }
              if (lower.includes('from organization_invitations')) {
                const results = tables.organization_invitations.filter((i) => i.organization_id === args[0] && i.status === 'pending');
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

console.log('\n🚀 Starting Staff & Access Governance Test Suite...\n');

await test('Staff Management — GET /api/organizations/members returns owner and active staff', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_owner_1', 'owner@store.com', 'org_merchant_test', 'owner');

  const req = new Request('http://localhost:8787/api/organizations/members', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.members));
  assert.equal(data.members.length, 2);
  assert.equal(data.members[0].role, 'owner');
  assert.equal(data.members[0].name, 'Suresh Patel');
  assert.equal(data.members[1].role, 'staff');
  assert.equal(data.members[1].name, 'Ramesh Yadav');
});

await test('Staff Management — POST /api/organizations/invitations creates pending invitation', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_owner_1', 'owner@store.com', 'org_merchant_test', 'owner');

  const payload = {
    email: 'newcashier@store.com',
    name: 'Priya Sharma',
    phone: '+91 98765 43210',
    role: 'staff',
    station: 'Main Billing Counter',
  };

  const req = new Request('http://localhost:8787/api/organizations/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.email, 'newcashier@store.com');

  // Verify persistence in DB
  assert.equal(db.tables.organization_invitations.length, 1);
  assert.equal(db.tables.organization_invitations[0].name, 'Priya Sharma');
  assert.equal(db.tables.organization_invitations[0].station, 'Main Billing Counter');
});

await test('Staff Management — GET /api/organizations/invitations surfaces pending invites', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_owner_1', 'owner@store.com', 'org_merchant_test', 'owner');

  db.tables.organization_invitations.push({
    id: 'inv_test_1',
    organization_id: 'org_merchant_test',
    email: 'manager@store.com',
    name: 'Rajesh Kumar',
    phone: '+91 91234 56789',
    role: 'admin',
    station: 'Central Godown',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const req = new Request('http://localhost:8787/api/organizations/invitations', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.invitations));
  assert.equal(data.invitations.length, 1);
  assert.equal(data.invitations[0].name, 'Rajesh Kumar');
  assert.equal(data.invitations[0].station, 'Central Godown');
});

await test('Staff Management — DELETE /api/organizations/invitations/:id revokes pending invite', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_owner_1', 'owner@store.com', 'org_merchant_test', 'owner');

  db.tables.organization_invitations.push({
    id: 'inv_to_delete',
    organization_id: 'org_merchant_test',
    email: 'temp@store.com',
    name: 'Temporary Staff',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const req = new Request('http://localhost:8787/api/organizations/invitations/inv_to_delete', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  assert.equal(db.tables.organization_invitations.length, 0);
});

await test('Staff Management — PATCH & DELETE /api/organizations/members/:id updates role & removes member with owner protection', async () => {
  const db = createTestDb();
  const env = createMockEnv(db);
  const token = await createToken('usr_owner_1', 'owner@store.com', 'org_merchant_test', 'owner');

  // 1. Promote staff member to manager (admin)
  const patchReq = new Request('http://localhost:8787/api/organizations/members/mem_staff_2', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role: 'admin' }),
  });

  const patchRes = await worker.fetch(patchReq, env);
  assert.equal(patchRes.status, 200);
  const updatedMember = db.tables.organization_members.find((m) => m.id === 'mem_staff_2');
  assert.equal(updatedMember.role, 'admin');

  // 2. Owner modification guard: Attempting to downgrade owner must fail with 400
  const ownerPatchReq = new Request('http://localhost:8787/api/organizations/members/mem_owner', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role: 'staff' }),
  });
  const ownerPatchRes = await worker.fetch(ownerPatchReq, env);
  assert.equal(ownerPatchRes.status, 400);

  // 3. Remove staff member
  const delReq = new Request('http://localhost:8787/api/organizations/members/mem_staff_2', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const delRes = await worker.fetch(delReq, env);
  assert.equal(delRes.status, 200);
  assert.equal(db.tables.organization_members.length, 1);
  assert.equal(db.tables.organization_members[0].role, 'owner');

  // 4. Owner removal guard: Attempting to delete owner must fail with 400
  const ownerDelReq = new Request('http://localhost:8787/api/organizations/members/mem_owner', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const ownerDelRes = await worker.fetch(ownerDelReq, env);
  assert.equal(ownerDelRes.status, 400);
  assert.equal(db.tables.organization_members.length, 1);
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nFailures:\n', failures);
  process.exit(1);
} else {
  console.log('\n🎉 All Staff & Access Management tests passed successfully!\n');
}

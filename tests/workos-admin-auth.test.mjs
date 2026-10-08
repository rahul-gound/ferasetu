import assert from 'node:assert/strict';
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

// Generate a test RSA KeyPair to simulate WorkOS JWKS signatures
const keyPair = await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
  },
  true,
  ['sign', 'verify']
);

const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
publicJwk.kid = 'test-workos-key-1';
publicJwk.use = 'sig';
publicJwk.alg = 'RS256';

// Mock JWKS object conforming to jose.createLocalJWKSet
const localJWKS = jose.createLocalJWKSet({
  keys: [publicJwk]
});

// Helper to sign a mock WorkOS token
async function signWorkOSToken(claims) {
  return await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-1' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(keyPair.privateKey);
}

// Mock test database
function createMockDb() {
  return {
    prepare(query) {
      return {
        bind(...params) {
          return this;
        },
        async first(key) {
          if (query.includes('COUNT(*)')) return 10;
          if (query.includes('SUM(total)')) return { rev: 50000 };
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          return { success: true };
        }
      };
    }
  };
}

const mockEnv = {
  ENVIRONMENT: 'production',
  WORKOS_CLIENT_ID: 'client_test_workos',
  JWKS: localJWKS,
  DB: createMockDb(),
  ADMIN_USER_IDS: 'user_admin_01,user_admin_02',
  ADMIN_EMAILS: 'founder@ferasetu.com,chief@ferasetu.com',
  ADMIN_EMAIL: 'admin@ferasetu.com',
  ADMIN_JWT_SECRET: 'test-admin-secret-2026'
};

console.log('\n🔒 Suite: WorkOS Platform Admin Authentication & Authorization');

await test('Missing Authorization header returns 401 Unauthorized', async () => {
  const req = new Request('https://ferasetu.com/api/admin/verify', {
    method: 'GET'
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /Authorization header/i);
});

await test('Invalid / garbage Bearer token returns 401 Unauthorized', async () => {
  const req = new Request('https://ferasetu.com/api/admin/verify', {
    method: 'GET',
    headers: { Authorization: 'Bearer not-a-valid-jwt-token' }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 401);
});

await test('Valid WorkOS user who is NOT in admin allowlist is blocked with 403 Forbidden', async () => {
  const merchantToken = await signWorkOSToken({
    sub: 'user_merchant_999',
    email: 'normal.merchant@gmail.com',
    email_verified: true,
    name: 'Normal Merchant'
  });

  const req = new Request('https://ferasetu.com/api/admin/verify', {
    method: 'GET',
    headers: { Authorization: `Bearer ${merchantToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 403, 'Expected 403 Forbidden for non-allowlisted WorkOS user');
  const data = await res.json();
  assert.match(data.error, /not an authorized platform administrator/i);
});

await test('Merchant cannot bypass 403 by supplying X-Organization-Id header', async () => {
  const merchantToken = await signWorkOSToken({
    sub: 'user_merchant_999',
    email: 'normal.merchant@gmail.com',
    email_verified: true
  });

  const req = new Request('https://ferasetu.com/api/admin/dashboard-stats', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${merchantToken}`,
      'X-Organization-Id': 'org_super_admin'
    }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 403, 'X-Organization-Id must not elevate merchant to platform admin');
});

await test('Authorized WorkOS user matched by ADMIN_USER_IDS succeeds with 200 on /api/admin/verify', async () => {
  const adminToken = await signWorkOSToken({
    sub: 'user_admin_01',
    email: 'custom.alias@example.com',
    email_verified: false, // User ID match doesn't require email match
    name: 'Chief Admin'
  });

  const req = new Request('https://ferasetu.com/api/admin/verify', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.authorized, true);
  assert.equal(data.user.id, 'user_admin_01');
  assert.equal(data.user.role, 'ADMIN');
});

await test('Authorized WorkOS user matched by ADMIN_EMAILS succeeds with 200 when email_verified is true', async () => {
  const adminToken = await signWorkOSToken({
    sub: 'user_someone_random_id',
    email: 'founder@ferasetu.com',
    email_verified: true,
    name: 'Founder'
  });

  const req = new Request('https://ferasetu.com/api/admin/dashboard-stats', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.health);
  assert.equal(data.health.status, 'operational');
});

await test('In production, unverified email in ADMIN_EMAILS is rejected with 403', async () => {
  const unverifiedAdminToken = await signWorkOSToken({
    sub: 'user_unverified_attacker',
    email: 'founder@ferasetu.com',
    email_verified: false // Spoofed unverified email
  });

  const req = new Request('https://ferasetu.com/api/admin/verify', {
    method: 'GET',
    headers: { Authorization: `Bearer ${unverifiedAdminToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 403, 'Unverified email must fail authorization in production');
});

await test('Email matching is strictly case-insensitive', async () => {
  const upperCaseEmailToken = await signWorkOSToken({
    sub: 'user_case_test',
    email: 'FOUNDER@FERASETU.COM',
    email_verified: true
  });

  const req = new Request('https://ferasetu.com/api/admin/verify', {
    method: 'GET',
    headers: { Authorization: `Bearer ${upperCaseEmailToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}

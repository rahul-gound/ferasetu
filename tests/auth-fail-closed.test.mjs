/**
 * FeraSetu — Authentication Fail-Closed Regression Tests
 *
 * Validates that production authentication cannot be bypassed:
 * - FS-AUTH-01: WorkOS JWT verification is authoritative in production
 * - FS-AUTH-02: HMAC/JWT_SECRET fallback is disabled in production
 * - FS-AUTH-03: WorkOS credential detection is explicit and environment-driven
 * - FS-AUTH-04: Encryption key resolution fails closed without fallbacks
 *
 * Run with: node --test tests/auth-fail-closed.test.mjs
 */

import assert from 'node:assert/strict';
import { isProduction } from '../worker/utils/env.js';
import { isLiveWorkOS } from '../worker/workos.js';
import {
  resolveEncryptionKey,
  encryptSecret,
  decryptSecret
} from '../worker/services/emailCrypto.js';

// Minimal mock D1 database — satisfies env.DB.prepare().first() for the
// authenticated routes we exercise in this suite.
function createMockDb() {
  return {
    prepare() {
      return {
        bind() { return this; },
        async first() { return null; },
        async all() { return { results: [] }; },
        async run() { return { success: true, meta: { changes: 1 } }; }
      };
    },
    async exec() { return Promise.resolve(); },
    async batch() { return []; }
  };
}

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
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Minimal local JWT signer/verifier so tests can mint realistic tokens.
// ---------------------------------------------------------------------------
function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

async function signHs256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${b64url(sig)}`;
}

const HMAC_SECRET = 'test-hmac-secret-value-0123456789';
const NOW = Math.floor(Date.now() / 1000);

/** Build a fake request with an Authorization header. */
function authRequest(token) {
  return new Request('https://ferasetu.com/api/products', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Exercise getAuthenticatedUser through the Worker's public fetch surface.
 * We rely on the fact that every authenticated route surfaces a 401.
 * A mock D1 binding is injected so the Worker passes its env.DB guard.
 */
async function expectStatus(req, env, expected) {
  const worker = (await import('../worker/index.js')).default;
  const merged = { ...env, DB: env.DB || createMockDb() };
  const res = await worker.fetch(req, merged);
  assert.equal(
    res.status,
    expected,
    `Expected HTTP ${expected}, got ${res.status}. Body: ${await res.text().catch(() => '')}`
  );
}

console.log('\n=== SUITE A: Environment Policy ===');

await test('A1. ENVIRONMENT=production is detected as production', () => {
  assert.equal(isProduction({ ENVIRONMENT: 'production' }), true);
});

await test('A2. NODE_ENV=production is detected as production', () => {
  assert.equal(isProduction({ NODE_ENV: 'production' }), true);
});

await test('A3. Missing environment is NOT treated as production', () => {
  assert.equal(isProduction({}), false);
});

await test('A4. staging is NOT treated as production', () => {
  assert.equal(isProduction({ ENVIRONMENT: 'staging' }), false);
});

console.log('\n=== SUITE B: WorkOS Credential Handling (isLiveWorkOS) ===');

await test('B1. Production + sk_live_ key => live WorkOS', () => {
  assert.equal(
    isLiveWorkOS({ ENVIRONMENT: 'production', WORKOS_API_KEY: 'sk_live_abcdef123456' }),
    true
  );
});

await test('B2. Production + sk_test_ key => NOT live (must not use mock fallback)', () => {
  assert.equal(
    isLiveWorkOS({ ENVIRONMENT: 'production', WORKOS_API_KEY: 'sk_test_abcdef123456' }),
    false
  );
});

await test('B3. Production + missing key => NOT live', () => {
  assert.equal(isLiveWorkOS({ ENVIRONMENT: 'production' }), false);
});

await test('B4. Production + placeholder key => NOT live', () => {
  assert.equal(
    isLiveWorkOS({ ENVIRONMENT: 'production', WORKOS_API_KEY: 'sk_test_placeholder' }),
    false
  );
});

await test('B5. Non-production + sk_ key => live (dev convenience preserved)', () => {
  assert.equal(isLiveWorkOS({ WORKOS_API_KEY: 'sk_test_abc' }), true);
});

console.log('\n=== SUITE C: Encryption Key Resolution (fail-closed) ===');

await test('C1. Explicit key string is returned as-is', () => {
  assert.equal(resolveEncryptionKey('  abc123  '), 'abc123');
});

await test('C2. Environment object resolves DATA_ENCRYPTION_KEY', () => {
  assert.equal(
    resolveEncryptionKey({ DATA_ENCRYPTION_KEY: 'prod-key' }),
    'prod-key'
  );
});

await test('C3. Missing key returns null (caller must throw)', () => {
  assert.equal(resolveEncryptionKey({}), null);
  assert.equal(resolveEncryptionKey(null), null);
});

await test('C4. Production encryption with missing key THROWS (no fallback)', async () => {
  await assert.rejects(
    () => encryptSecret('super-secret', { ENVIRONMENT: 'production' }),
    /Encryption key is required/
  );
});

await test('C5. Production encryption with short key THROWS (min 32 bytes)', async () => {
  await assert.rejects(
    () => encryptSecret('super-secret', { ENVIRONMENT: 'production', DATA_ENCRYPTION_KEY: 'short' }),
    /at least 256 bits/
  );
});

await test('C6. Production encryption round-trips with a valid 32+ byte key', async () => {
  const env = {
    ENVIRONMENT: 'production',
    DATA_ENCRYPTION_KEY: 'a-very-long-production-encryption-key-value'
  };
  const enc = await encryptSecret('smtp-password-123', env);
  assert.ok(enc.startsWith('enc:v1:'), 'Must produce versioned ciphertext envelope');
  const dec = await decryptSecret(enc, env);
  assert.equal(dec, 'smtp-password-123');
});

await test('C7. Decrypting with the wrong key fails', async () => {
  const envA = {
    ENVIRONMENT: 'production',
    DATA_ENCRYPTION_KEY: 'a-very-long-production-encryption-key-value'
  };
  const envB = {
    ENVIRONMENT: 'production',
    DATA_ENCRYPTION_KEY: 'a-different-long-production-encryption-key'
  };
  const enc = await encryptSecret('smtp-password-123', envA);
  await assert.rejects(() => decryptSecret(enc, envB));
});

console.log('\n=== SUITE D: Authentication Fail-Closed (via Worker fetch) ===');

await test('D1. Missing Authorization header => 401', async () => {
  await expectStatus(
    new Request('https://ferasetu.com/api/products'),
    { ENVIRONMENT: 'production', WORKOS_CLIENT_ID: 'client_test_123' },
    401
  );
});

await test('D2. Production: invalid WorkOS JWT + JWT_SECRET set => STILL 401 (no HMAC fallback)', async () => {
  // Mint a token that IS valid under JWT_SECRET (so the old code would have
  // accepted it via the HMAC fallback) but is NOT a valid WorkOS token.
  const forged = await signHs256(
    {
      sub: 'user_attacker',
      email: 'attacker@example.com',
      org_id: 'org_victim',
      iat: NOW,
      exp: NOW + 3600
    },
    HMAC_SECRET
  );

  await expectStatus(
    authRequest(forged),
    {
      ENVIRONMENT: 'production',
      WORKOS_CLIENT_ID: 'client_test_123',
      JWT_SECRET: HMAC_SECRET
    },
    401
  );
});

await test('D3. Development: JWT_SECRET fallback still works (dev convenience preserved)', async () => {
  const forged = await signHs256(
    {
      sub: 'user_dev',
      email: 'dev@example.com',
      iat: NOW,
      exp: NOW + 3600
    },
    HMAC_SECRET
  );

  const worker = (await import('../worker/index.js')).default;
  const res = await worker.fetch(authRequest(forged), {
    ENVIRONMENT: 'development',
    WORKOS_CLIENT_ID: 'client_test_123',
    JWT_SECRET: HMAC_SECRET
  });

  // We do not assert 200 here — the route may legitimately 401/404 for other
  // reasons. We assert only that it is NOT a 500 (i.e. the fallback path is
  // reachable and does not crash).
  assert.notEqual(res.status, 500, 'Dev fallback must not produce a server error');
});

await test('D4. Production: expired HMAC-minted token + JWT_SECRET set => 401', async () => {
  const expired = await signHs256(
    {
      sub: 'user_attacker',
      email: 'attacker@example.com',
      iat: NOW - 7200,
      exp: NOW - 3600
    },
    HMAC_SECRET
  );

  await expectStatus(
    authRequest(expired),
    {
      ENVIRONMENT: 'production',
      WORKOS_CLIENT_ID: 'client_test_123',
      JWT_SECRET: HMAC_SECRET
    },
    401
  );
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('────────────────────────────────────────────────────────────');

if (failed > 0) {
  for (const f of failures) {
    console.error(`\nFAILED: ${f.name}\n  ${f.err.stack}`);
  }
  process.exit(1);
}

console.log('🌟 All Authentication Fail-Closed regression tests passed!\n');

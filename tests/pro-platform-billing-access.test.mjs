import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { requireProAccess, isProSubscription, normalizePlanTier, ProAccessError } from '../worker/middleware/proAuth.js';
import { createProMockD1 } from './pro-mock-d1.mjs';

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

console.log('\n--- 1. Testing Pro Authoritative Billing Access & Plan Gates ---');

await test('normalizePlanTier normalizes various plan names accurately', () => {
  assert.equal(normalizePlanTier('pro'), 'pro');
  assert.equal(normalizePlanTier('Pro'), 'pro');
  assert.equal(normalizePlanTier('premium'), 'pro');
  assert.equal(normalizePlanTier('enterprise'), 'pro');
  assert.equal(normalizePlanTier('business'), 'business');
  assert.equal(normalizePlanTier('standard'), 'business');
  assert.equal(normalizePlanTier('trial'), 'trial');
  assert.equal(normalizePlanTier('free'), 'free');
  assert.equal(normalizePlanTier(null), 'free');
  assert.equal(normalizePlanTier(undefined), 'free');
});

await test('isProSubscription grants access only for valid active or unexpired Pro subscriptions', () => {
  // Active Pro
  assert.equal(isProSubscription({ plan: 'pro', status: 'active', cancel_at_period_end: 0 }), true);
  
  // Free & Business plans rejected
  assert.equal(isProSubscription({ plan: 'free', status: 'active' }), false);
  assert.equal(isProSubscription({ plan: 'business', status: 'active' }), false);
  
  // Expired Pro rejected
  assert.equal(isProSubscription({ plan: 'pro', status: 'expired' }), false);
  assert.equal(isProSubscription({ plan: 'pro', status: 'cancelled' }), false);

  // Pro scheduled to cancel but still within billing period -> allowed
  assert.equal(isProSubscription({
    plan: 'pro',
    status: 'active',
    cancel_at_period_end: 1,
    current_period_end: new Date(Date.now() + 86400000).toISOString()
  }), true);

  // Pro scheduled to cancel and past billing period -> rejected
  assert.equal(isProSubscription({
    plan: 'pro',
    status: 'active',
    cancel_at_period_end: 1,
    current_period_end: new Date(Date.now() - 86400000).toISOString()
  }), false);

  // Active trial within date -> allowed
  assert.equal(isProSubscription({
    plan: 'pro',
    status: 'trial',
    trial_ends_at: new Date(Date.now() + 86400000).toISOString()
  }), true);

  // Expired trial -> rejected
  assert.equal(isProSubscription({
    plan: 'pro',
    status: 'trial',
    trial_ends_at: new Date(Date.now() - 86400000).toISOString()
  }), false);
});

await test('requireProAccess rejects unauthorized request without bearer token', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    headers: {}
  });

  await assert.rejects(
    async () => await requireProAccess(req, env),
    (err) => {
      assert.equal(err.status, 401);
      assert.equal(err.details.code, 'UNAUTHORIZED');
      return true;
    }
  );
});

await test('requireProAccess rejects Free plan user with 403 PRO_REQUIRED', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    headers: { Authorization: 'Bearer usr_free' }
  });

  await assert.rejects(
    async () => await requireProAccess(req, env),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'PRO_REQUIRED');
      assert.equal(err.details.current_plan, 'free');
      return true;
    }
  );
});

await test('requireProAccess rejects Business plan user with 403 PRO_REQUIRED', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    headers: { Authorization: 'Bearer usr_business' }
  });

  await assert.rejects(
    async () => await requireProAccess(req, env),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'PRO_REQUIRED');
      assert.equal(err.details.current_plan, 'business');
      return true;
    }
  );
});

await test('requireProAccess grants access to active Pro user with authoritative subscription', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    headers: { Authorization: 'Bearer usr_pro_active' }
  });

  const access = await requireProAccess(req, env);
  assert.ok(access);
  assert.equal(access.userId, 'usr_pro_active');
  assert.equal(access.subscription.plan, 'pro');
  assert.equal(access.subscription.status, 'active');
});

await test('requireProAccess rejects expired Pro subscription', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    headers: { Authorization: 'Bearer usr_pro_expired' }
  });

  await assert.rejects(
    async () => await requireProAccess(req, env),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'PRO_REQUIRED');
      return true;
    }
  );
});

await test('requireProAccess allows canceled Pro subscription before period end', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    headers: { Authorization: 'Bearer usr_pro_canceled_valid' }
  });

  const access = await requireProAccess(req, env);
  assert.ok(access);
  assert.equal(access.subscription.cancel_at_period_end, 1);
});

await test('requireProAccess rejects canceled Pro subscription past period end', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    headers: { Authorization: 'Bearer usr_pro_canceled_expired' }
  });

  await assert.rejects(
    async () => await requireProAccess(req, env),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'PRO_REQUIRED');
      return true;
    }
  );
});

await test('CRITICAL: Direct tampering of users.plan=pro without authoritative subscription row is REJECTED', async () => {
  const db = createProMockD1();
  // Tamper users table: set user plan to 'pro'
  const freeUser = db.tables.users.find(u => u.id === 'usr_free');
  freeUser.plan = 'pro';
  
  // But subscriptions table remains 'free'
  const env = { DB: db };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    headers: { Authorization: 'Bearer usr_free' }
  });

  await assert.rejects(
    async () => await requireProAccess(req, env),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'PRO_REQUIRED');
      assert.equal(err.details.current_plan, 'free');
      return true;
    }
  );
});

await test('End-to-End Worker route /api/pro/overview returns 403 PRO_REQUIRED for Free user', async () => {
  const db = createProMockD1();
  const env = { DB: db, JWT_SECRET: 'test_secret' };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    method: 'GET',
    headers: { Authorization: 'Bearer usr_free' }
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 403);
  const json = await res.json();
  assert.equal(json.code, 'PRO_REQUIRED');
  assert.ok(json.error.includes('Pro'));
});

await test('End-to-End Worker route /api/pro/overview returns 200 OK for Active Pro user', async () => {
  const db = createProMockD1();
  const env = { DB: db, JWT_SECRET: 'test_secret' };
  const req = new Request('https://api.ferasetu.com/api/pro/overview', {
    method: 'GET',
    headers: { Authorization: 'Bearer usr_pro_active' }
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.subscription);
  assert.equal(json.subscription.plan, 'pro');
  assert.ok(json.quotas);
  assert.ok(json.quotas.limits);
  assert.ok(json.quotas.usage);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}

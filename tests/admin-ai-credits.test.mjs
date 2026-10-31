/**
 * FeraSetu Admin AI Credits & Shopkeeper Usage Test Suite
 *
 * Verifies:
 * - Admin authorization security barrier (fails closed on unauthenticated calls)
 * - Platform-wide AI credit consumption aggregation (total credits used, month usage, balance remaining)
 * - Per-shopkeeper breakdown (which shopkeeper is using how much credit, calls, quota)
 * - AI usage by capability (Kirana Copilot, Website Builder AI, Customer Assistant)
 * - Admin credit adjustment / top-up endpoint (add/set credits, audit logging)
 *
 * Run with: node tests/admin-ai-credits.test.mjs
 */

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

// Generate an RSA KeyPair for test WorkOS admin signing
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
publicJwk.kid = 'test-workos-admin-key';
publicJwk.use = 'sig';
publicJwk.alg = 'RS256';

const localJWKS = jose.createLocalJWKSet({
  keys: [publicJwk]
});

async function signAdminToken(claims) {
  return await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-admin-key' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(keyPair.privateKey);
}

// Mock D1 Store for Admin AI Credits testing
function createMockD1Database() {
  const users = [
    {
      id: 'shop_01',
      name: 'Ramesh Sharma',
      email: 'ramesh@kirana.in',
      business_name: 'Sharma General Store',
      phone: '+919876543210',
      subdomain: 'sharma-kirana',
      plan: 'business',
      ai_credits_balance: 150,
      ai_credits_monthly_limit: 200,
      ai_credits_used_month: 50,
      created_at: '2026-09-01T10:00:00Z',
      is_blocked: 0
    },
    {
      id: 'shop_02',
      name: 'Priya Patel',
      email: 'priya@boutique.in',
      business_name: 'Priya Sarees',
      phone: '+919812345678',
      subdomain: 'priya-sarees',
      plan: 'starter',
      ai_credits_balance: 5,
      ai_credits_monthly_limit: 50,
      ai_credits_used_month: 45,
      created_at: '2026-09-15T12:00:00Z',
      is_blocked: 0
    },
    {
      id: 'shop_03',
      name: 'Anil Gupta',
      email: 'anil@gupta.in',
      business_name: 'Gupta Sweets',
      phone: '+919899887766',
      subdomain: 'gupta-sweets',
      plan: 'free',
      ai_credits_balance: 0,
      ai_credits_monthly_limit: 20,
      ai_credits_used_month: 20,
      created_at: '2026-10-01T08:00:00Z',
      is_blocked: 0
    }
  ];

  const usageLogs = [
    {
      id: 'log_01',
      user_id: 'shop_01',
      model: 'sarvam-2b',
      prompt_tokens: 120,
      completion_tokens: 80,
      cost: 0,
      credits_used: 1,
      usage_type: 'shopkeeper_assistant',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'log_02',
      user_id: 'shop_01',
      model: 'sarvam-2b',
      prompt_tokens: 300,
      completion_tokens: 500,
      cost: 0,
      credits_used: 3,
      usage_type: 'website_ai',
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'log_03',
      user_id: 'shop_02',
      model: 'bulbul:v1',
      prompt_tokens: 80,
      completion_tokens: 40,
      cost: 0,
      credits_used: 2,
      usage_type: 'customer_assistant',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  const creditPurchases = [
    {
      id: 'purchase_01',
      user_id: 'shop_01',
      credits: 250,
      amount: 149,
      usage_scope: 'shared',
      status: 'completed',
      created_at: '2026-10-20T14:00:00Z'
    }
  ];

  const auditLogs = [];

  return {
    users,
    usageLogs,
    creditPurchases,
    auditLogs,
    prepare(query) {
      let boundParams = [];
      const self = {
        bind(...params) {
          boundParams = params;
          return self;
        },
        async first(key) {
          const res = await self.all();
          if (!res.results || res.results.length === 0) return null;
          return key ? res.results[0][key] : res.results[0];
        },
        async all() {
          const q = query.trim();

          // CREATE TABLE fallback
          if (q.startsWith('CREATE TABLE')) {
            return { results: [] };
          }

          // Total usage row
          if (q.includes('FROM ai_usage_logs') && q.includes('COUNT(*) as total_calls')) {
            const totalCalls = usageLogs.length;
            const totalCredits = usageLogs.reduce((acc, l) => acc + (l.credits_used || 0), 0);
            const totalTokens = usageLogs.reduce((acc, l) => acc + (l.prompt_tokens + l.completion_tokens), 0);
            return {
              results: [{
                total_calls: totalCalls,
                total_credits_used: totalCredits,
                total_tokens: totalTokens
              }]
            };
          }

          // Month usage row
          if (q.includes('FROM ai_usage_logs') && q.includes('month_credits_used')) {
            const totalCredits = usageLogs.reduce((acc, l) => acc + (l.credits_used || 0), 0);
            return {
              results: [{
                month_calls: usageLogs.length,
                month_credits_used: totalCredits
              }]
            };
          }

          // Today usage row
          if (q.includes('FROM ai_usage_logs') && q.includes('today_credits_used')) {
            return {
              results: [{
                today_calls: usageLogs.length,
                today_credits_used: usageLogs.reduce((acc, l) => acc + (l.credits_used || 0), 0)
              }]
            };
          }

          // Balances row
          if (q.includes('FROM users') && q.includes('total_balance_remaining')) {
            const totalBal = users.reduce((acc, u) => acc + (u.ai_credits_balance || 0), 0);
            const depleted = users.filter(u => (u.ai_credits_balance || 0) <= 0).length;
            const low = users.filter(u => (u.ai_credits_balance || 0) > 0 && (u.ai_credits_balance || 0) <= 10).length;
            return {
              results: [{
                total_merchants: users.length,
                total_balance_remaining: totalBal,
                depleted_merchants: depleted,
                low_balance_merchants: low
              }]
            };
          }

          // Purchases row
          if (q.includes('FROM ai_credit_purchases') && q.includes('total_credits_purchased')) {
            return {
              results: [{
                total_credits_purchased: 250,
                total_revenue: 149,
                purchase_count: 1
              }]
            };
          }

          // Active shopkeepers count
          if (q.includes('COUNT(DISTINCT user_id) as cnt FROM ai_usage_logs')) {
            const uniqueUsers = new Set(usageLogs.map(l => l.user_id));
            return { results: [{ cnt: uniqueUsers.size }] };
          }

          // Usage by type
          if (q.includes('FROM ai_usage_logs') && q.includes('GROUP BY usage_type')) {
            const groups = {};
            for (const l of usageLogs) {
              if (!groups[l.usage_type]) groups[l.usage_type] = { usage_type: l.usage_type, calls: 0, credits_used: 0, tokens: 0 };
              groups[l.usage_type].calls++;
              groups[l.usage_type].credits_used += l.credits_used || 0;
              groups[l.usage_type].tokens += (l.prompt_tokens + l.completion_tokens);
            }
            return { results: Object.values(groups) };
          }

          // Usage by model
          if (q.includes('FROM ai_usage_logs') && q.includes('GROUP BY model')) {
            return {
              results: [
                { model: 'sarvam-2b', count: 2, total_cost: 0, credits_used: 4 },
                { model: 'bulbul:v1', count: 1, total_cost: 0, credits_used: 2 }
              ]
            };
          }

          // Per-Shopkeeper list query
          if (q.includes('FROM users u') && q.includes('LEFT JOIN ai_usage_logs l')) {
            let res = users.map(u => {
              const userLogs = usageLogs.filter(l => l.user_id === u.id);
              const totalCalls = userLogs.length;
              const totalCredits = userLogs.reduce((acc, l) => acc + (l.credits_used || 0), 0);
              return {
                id: u.id,
                name: u.name,
                email: u.email,
                business_name: u.business_name,
                phone: u.phone,
                subdomain: u.subdomain,
                plan: u.plan,
                ai_credits_balance: u.ai_credits_balance,
                ai_credits_monthly_limit: u.ai_credits_monthly_limit,
                ai_credits_used_month: u.ai_credits_used_month,
                ai_credits_reset_at: null,
                joined_at: u.created_at,
                total_calls: totalCalls,
                total_credits_used: totalCredits,
                last_30d_credits_used: totalCredits,
                last_ai_activity: userLogs[0]?.created_at || null
              };
            });

            if (boundParams.length > 0 && typeof boundParams[0] === 'string' && boundParams[0].includes('%')) {
              const term = boundParams[0].replaceAll('%', '').toLowerCase();
              res = res.filter(r =>
                r.name.toLowerCase().includes(term) ||
                r.email.toLowerCase().includes(term) ||
                r.business_name.toLowerCase().includes(term)
              );
            }

            return { results: res };
          }

          // Find single user
          if (q.includes('SELECT id, name, email, business_name, ai_credits_balance FROM users WHERE id = ?')) {
            const found = users.find(u => u.id === boundParams[0]);
            return { results: found ? [found] : [] };
          }

          // Recent logs
          if (q.includes('FROM ai_usage_logs l') && q.includes('ORDER BY l.created_at DESC')) {
            return { results: usageLogs };
          }

          // Recent purchases
          if (q.includes('FROM ai_credit_purchases p')) {
            return { results: creditPurchases };
          }

          return { results: [] };
        },
        async run() {
          const q = query.trim();

          // UPDATE users balance
          if (q.includes('UPDATE users SET ai_credits_balance = ?')) {
            const [newBal, now, targetId] = boundParams;
            const targetUser = users.find(u => u.id === targetId);
            if (targetUser) {
              targetUser.ai_credits_balance = newBal;
            }
            return { meta: { changes: targetUser ? 1 : 0 } };
          }

          // INSERT admin_audit_logs
          if (q.includes('INSERT INTO admin_audit_logs')) {
            auditLogs.push(boundParams);
            return { meta: { changes: 1 } };
          }

          return { meta: { changes: 0 } };
        }
      };
      return self;
    }
  };
}

console.log('🧪 Starting FeraSetu Admin AI Credits & Shopkeeper Usage Test Suite...\n');

const mockD1 = createMockD1Database();
const mockEnv = {
  DB: mockD1,
  ADMIN_USER_IDS: 'user_admin_01',
  ADMIN_EMAILS: 'founder@ferasetu.com',
  JWKS: localJWKS,
  ENVIRONMENT: 'production',
  WORKOS_CLIENT_ID: 'client_test_workos',
  JWT_SECRET: 'test-jwt-secret-12345'
};

const adminToken = await signAdminToken({
  sub: 'user_admin_01',
  email: 'founder@ferasetu.com',
  email_verified: true,
  name: 'Chief Admin'
});

// TEST 1: Unauthenticated request to /api/admin/ai-credits fails closed with 401
await test('Unauthenticated request to /api/admin/ai-credits fails closed with 401', async () => {
  const req = new Request('https://ferasetu.com/api/admin/ai-credits', {
    method: 'GET'
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 401, 'Must reject unauthenticated caller');
});

// TEST 2: GET /api/admin/ai-credits returns comprehensive summary KPIs
await test('GET /api/admin/ai-credits returns platform summary KPIs', async () => {
  const req = new Request('https://ferasetu.com/api/admin/ai-credits', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert(data.summary, 'Expected summary object');
  assert.equal(data.summary.totalCreditsUsed, 6, 'Total credits used should be 1 + 3 + 2 = 6');
  assert.equal(data.summary.totalCalls, 3, 'Total calls should be 3');
  assert.equal(data.summary.totalBalanceRemaining, 155, 'Circulating balance should be 150 + 5 + 0 = 155');
  assert.equal(data.summary.activeShopkeepersCount, 2, '2 shopkeepers have made calls');
  assert.equal(data.summary.totalCreditsPurchased, 250, 'Purchased credits should be 250');
  assert.equal(data.summary.totalPurchaseRevenue, 149, 'Purchase revenue should be 149');
});

// TEST 3: Per-shopkeeper breakdown returns exact credits used and balances
await test('Per-shopkeeper breakdown returns exact usage and credit balance for each merchant', async () => {
  const req = new Request('https://ferasetu.com/api/admin/ai-credits', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert(Array.isArray(data.shopkeepers), 'Expected shopkeepers array');
  assert.equal(data.shopkeepers.length, 3, 'Expected 3 shopkeepers in database');

  const ramesh = data.shopkeepers.find(s => s.id === 'shop_01');
  assert(ramesh, 'Ramesh should exist in shopkeepers list');
  assert.equal(ramesh.business_name, 'Sharma General Store');
  assert.equal(ramesh.ai_credits_balance, 150);
  assert.equal(ramesh.total_credits_used, 4, 'Ramesh used 1 + 3 = 4 credits');
  assert.equal(ramesh.total_calls, 2);

  const priya = data.shopkeepers.find(s => s.id === 'shop_02');
  assert(priya, 'Priya should exist in shopkeepers list');
  assert.equal(priya.total_credits_used, 2);
  assert.equal(priya.ai_credits_balance, 5);

  const anil = data.shopkeepers.find(s => s.id === 'shop_03');
  assert(anil, 'Anil should exist in shopkeepers list');
  assert.equal(anil.total_credits_used, 0);
  assert.equal(anil.ai_credits_balance, 0);
});

// TEST 4: Search filter by merchant name or dukaan
await test('Search filter retrieves targeted shopkeeper record', async () => {
  const req = new Request('https://ferasetu.com/api/admin/ai-credits?search=Sharma', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.shopkeepers.length, 1);
  assert.equal(data.shopkeepers[0].id, 'shop_01');
  assert.equal(data.shopkeepers[0].business_name, 'Sharma General Store');
});

// TEST 5: Capability breakdown separates Kirana Copilot, Website AI and Customer Assistant
await test('Usage capability breakdown segments calls and credits by product capability', async () => {
  const req = new Request('https://ferasetu.com/api/admin/ai-credits', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert(Array.isArray(data.byUsageType), 'Expected byUsageType array');
  const websiteAi = data.byUsageType.find(u => u.usage_type === 'website_ai');
  assert(websiteAi, 'website_ai capability should be tracked');
  assert.equal(websiteAi.credits_used, 3);

  const copilot = data.byUsageType.find(u => u.usage_type === 'shopkeeper_assistant');
  assert(copilot, 'shopkeeper_assistant capability should be tracked');
  assert.equal(copilot.credits_used, 1);
});

// TEST 6: Admin can grant / top-up credits to a shopkeeper
await test('Admin POST /api/admin/users/:id/ai-credits adds credits and updates balance', async () => {
  const req = new Request('https://ferasetu.com/api/admin/users/shop_03/ai-credits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      credits: 50,
      mode: 'add',
      reason: 'Onboarding kirana grant'
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.user_id, 'shop_03');
  assert.equal(data.previous_balance, 0);
  assert.equal(data.new_balance, 50);

  // Check state in mock database
  const updatedAnil = mockD1.users.find(u => u.id === 'shop_03');
  assert.equal(updatedAnil.ai_credits_balance, 50, 'Anil credit balance should be updated to 50 in D1');
  assert.equal(mockD1.auditLogs.length, 1, 'Audit log must be written for credit grant');
});

// TEST 7: Admin can set exact credit balance
await test('Admin POST /api/admin/users/:id/ai-credits can set exact balance', async () => {
  const req = new Request('https://ferasetu.com/api/admin/users/shop_02/ai-credits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      credits: 200,
      mode: 'set',
      reason: 'Boutique campaign upgrade'
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.previous_balance, 5);
  assert.equal(data.new_balance, 200);

  const updatedPriya = mockD1.users.find(u => u.id === 'shop_02');
  assert.equal(updatedPriya.ai_credits_balance, 200);
});

// TEST 8: Validation rejects invalid credit adjustments
await test('Validation rejects non-integer or negative credit sets', async () => {
  const req = new Request('https://ferasetu.com/api/admin/users/shop_01/ai-credits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      credits: -10,
      mode: 'set'
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 400, 'Must reject negative credits on set');
});

// TEST 9: Non-existent shopkeeper returns 404
await test('Non-existent shopkeeper returns 404', async () => {
  const req = new Request('https://ferasetu.com/api/admin/users/non_existent_shop/ai-credits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      credits: 20,
      mode: 'add'
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 404, 'Must return 404 for unknown user');
});

// TEST 10: GET /api/admin/ai-usage alias returns same payload
await test('GET /api/admin/ai-usage endpoint functions as compatible alias', async () => {
  const req = new Request('https://ferasetu.com/api/admin/ai-usage', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert(data.summary, 'ai-usage alias should include summary');
  assert(Array.isArray(data.shopkeepers), 'ai-usage alias should include shopkeepers array');
});

console.log('\n──────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) {
    console.error(`- ${f.name}: ${f.err.message}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ All 10 Admin AI Credit tests passed successfully!');
}

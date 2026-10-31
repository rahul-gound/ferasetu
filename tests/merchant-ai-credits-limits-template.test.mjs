/**
 * FeraSetu Merchant AI Credits, Spend Limits & Template Assistant Test Suite
 *
 * Verifies:
 * 1. GET /api/payment/ai-credits returns balances, limits, dailyUsage for graphs, and recentLogs.
 * 2. POST /api/payment/ai-credits/limits updates FeraSetu AI and Website AI limits & toggles.
 * 3. POST /api/payment/ai-credits/limits can reset limits to unlimited (null) and toggle features.
 * 4. POST /api/payment/ai-credits/purchase supports sandbox simulation and updates credit balance.
 * 5. Storefront Template AI Assistant section exists and includes "Remove from Section" capabilities.
 *
 * Run with: node tests/merchant-ai-credits-limits-template.test.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

// Generate RSA KeyPair for test auth signing
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
publicJwk.kid = 'test-workos-merchant-key';
publicJwk.use = 'sig';
publicJwk.alg = 'RS256';

const localJWKS = jose.createLocalJWKSet({
  keys: [publicJwk]
});

async function signMerchantToken(claims) {
  return await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-merchant-key' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(keyPair.privateKey);
}

function createMockD1ForMerchant() {
  const users = [
    {
      id: 'merchant_01',
      name: 'Vikram Mehta',
      email: 'vikram@mehta-kirana.in',
      business_name: 'Mehta Provisions',
      phone: '+919876500000',
      subdomain: 'mehta-provisions',
      plan: 'business',
      ai_credits_balance: 100,
      ai_credits_monthly_limit: 200,
      ai_credits_used_month: 25,
      ferasetu_ai_limit: 150,
      website_ai_limit: 80,
      ferasetu_ai_enabled: 1,
      website_ai_enabled: 1,
      created_at: '2026-09-01T10:00:00Z',
      is_blocked: 0
    }
  ];

  const usageLogs = [
    {
      id: 'log_m1',
      user_id: 'merchant_01',
      model: 'sarvam-2b',
      prompt_tokens: 150,
      completion_tokens: 80,
      credits_used: 1,
      usage_type: 'shopkeeper_assistant',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'log_m2',
      user_id: 'merchant_01',
      model: 'sarvam-2b',
      prompt_tokens: 300,
      completion_tokens: 450,
      credits_used: 3,
      usage_type: 'website_ai',
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'log_m3',
      user_id: 'merchant_01',
      model: 'bulbul:v1',
      prompt_tokens: 70,
      completion_tokens: 35,
      credits_used: 2,
      usage_type: 'customer_assistant',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ];

  const purchases = [
    {
      id: 'pur_01',
      user_id: 'merchant_01',
      credits: 250,
      amount: 149,
      usage_scope: 'shared',
      status: 'completed',
      created_at: '2026-10-15T10:00:00Z'
    }
  ];

  return {
    users,
    usageLogs,
    purchases,
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

          if (q.startsWith('CREATE TABLE') || q.startsWith('ALTER TABLE')) {
            return { results: [] };
          }

          // User row with limits
          if (q.includes('FROM users WHERE id = ?')) {
            const u = users.find(x => x.id === boundParams[0]);
            return { results: u ? [u] : [] };
          }

          // Purchases
          if (q.includes('FROM ai_credit_purchases WHERE user_id = ?')) {
            return { results: purchases };
          }

          // Usage grouped by type
          if (q.includes('FROM ai_usage_logs WHERE user_id = ?') && q.includes('GROUP BY usage_type')) {
            const groups = {};
            for (const l of usageLogs) {
              if (!groups[l.usage_type]) {
                groups[l.usage_type] = { usage_type: l.usage_type, calls: 0, credits_used: 0, tokens: 0 };
              }
              groups[l.usage_type].calls++;
              groups[l.usage_type].credits_used += l.credits_used || 0;
              groups[l.usage_type].tokens += (l.prompt_tokens + l.completion_tokens);
            }
            return { results: Object.values(groups) };
          }

          // Daily usage
          if (q.includes('FROM ai_usage_logs WHERE user_id = ?') && q.includes('GROUP BY DATE(created_at)')) {
            return {
              results: [
                { date: '2026-10-29', usage_type: 'customer_assistant', credits_used: 2, calls: 1 },
                { date: '2026-10-30', usage_type: 'website_ai', credits_used: 3, calls: 1 },
                { date: '2026-10-31', usage_type: 'shopkeeper_assistant', credits_used: 1, calls: 1 },
              ]
            };
          }

          // Recent logs
          if (q.includes('FROM ai_usage_logs WHERE user_id = ? ORDER BY created_at DESC')) {
            return { results: usageLogs };
          }

          return { results: [] };
        },
        async run() {
          const q = query.trim();

          if (q.startsWith('ALTER TABLE') || q.startsWith('CREATE TABLE')) {
            return { meta: { changes: 0 } };
          }

          // UPDATE users SET limits
          if (q.includes('UPDATE users SET') && q.includes('ferasetu_ai_limit')) {
            const u = users.find(x => x.id === boundParams[boundParams.length - 1]);
            if (u) {
              let pIdx = 0;
              if (q.includes('ferasetu_ai_limit = ?')) u.ferasetu_ai_limit = boundParams[pIdx++];
              if (q.includes('website_ai_limit = ?')) u.website_ai_limit = boundParams[pIdx++];
              if (q.includes('ferasetu_ai_enabled = ?')) u.ferasetu_ai_enabled = boundParams[pIdx++];
              if (q.includes('website_ai_enabled = ?')) u.website_ai_enabled = boundParams[pIdx++];
            }
            return { meta: { changes: 1 } };
          }

          // INSERT into ai_credit_purchases
          if (q.includes('INSERT INTO ai_credit_purchases')) {
            const [id, userId, credits, amount, scope, createdAt] = boundParams;
            purchases.unshift({ id, user_id: userId, credits, amount, usage_scope: scope, status: 'completed', created_at: createdAt });
            return { meta: { changes: 1 } };
          }

          // UPDATE users balance on purchase
          if (q.includes('UPDATE users SET ai_credits_balance = COALESCE(ai_credits_balance, 0) + ?')) {
            const [credits, , userId] = boundParams;
            const u = users.find(x => x.id === userId);
            if (u) u.ai_credits_balance += credits;
            return { meta: { changes: 1 } };
          }

          return { meta: { changes: 0 } };
        }
      };
      return self;
    }
  };
}

console.log('🧪 Starting FeraSetu Merchant AI Credits, Spend Limits & Template Assistant Suite...\n');

const mockD1 = createMockD1ForMerchant();
const mockEnv = {
  DB: mockD1,
  JWKS: localJWKS,
  ENVIRONMENT: 'test',
  JWT_SECRET: 'test-jwt-secret-merchant'
};

const merchantToken = await signMerchantToken({
  sub: 'merchant_01',
  email: 'vikram@mehta-kirana.in',
  name: 'Vikram Mehta'
});

// TEST 1: GET /api/payment/ai-credits returns rich limits and dailyUsage for graphs
await test('GET /api/payment/ai-credits returns credits, limits, dailyUsage for graphs and recentLogs', async () => {
  const req = new Request('https://ferasetu.com/api/payment/ai-credits', {
    method: 'GET',
    headers: { Authorization: `Bearer ${merchantToken}` }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert(data.credits, 'Expected credits object');
  assert.equal(data.credits.ai_credits_balance, 100);
  assert.equal(data.credits.ai_credits_monthly_limit, 200);

  // Check limits object
  assert(data.limits, 'Expected limits object');
  assert.equal(data.limits.ferasetu_ai_limit, 150);
  assert.equal(data.limits.website_ai_limit, 80);
  assert.equal(data.limits.ferasetu_ai_enabled, true);
  assert.equal(data.limits.website_ai_enabled, true);

  // Check dailyUsage array for graphing
  assert(Array.isArray(data.dailyUsage), 'Expected dailyUsage array for graph rendering');
  assert.equal(data.dailyUsage.length, 3);
  assert.equal(data.dailyUsage[0].date, '2026-10-29');

  // Check recent logs
  assert(Array.isArray(data.recentLogs), 'Expected recentLogs array');
  assert.equal(data.recentLogs.length, 3);

  // Check packs
  assert(data.packs.small && data.packs.growth && data.packs.scale);
});

// TEST 2: POST /api/payment/ai-credits/limits updates safety limits and toggles
await test('POST /api/payment/ai-credits/limits updates FeraSetu AI and Website AI limits & toggles', async () => {
  const req = new Request('https://ferasetu.com/api/payment/ai-credits/limits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${merchantToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ferasetu_ai_limit: 250,
      website_ai_limit: 50,
      ferasetu_ai_enabled: true,
      website_ai_enabled: false
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.limits.ferasetu_ai_limit, 250);
  assert.equal(data.limits.website_ai_limit, 50);
  assert.equal(data.limits.ferasetu_ai_enabled, true);
  assert.equal(data.limits.website_ai_enabled, false);

  // Check state in database
  const u = mockD1.users.find(x => x.id === 'merchant_01');
  assert.equal(u.ferasetu_ai_limit, 250);
  assert.equal(u.website_ai_limit, 50);
  assert.equal(u.website_ai_enabled, 0);
});

// TEST 3: User can set limits to unlimited (null)
await test('POST /api/payment/ai-credits/limits can reset limits to unlimited (null)', async () => {
  const req = new Request('https://ferasetu.com/api/payment/ai-credits/limits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${merchantToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ferasetu_ai_limit: null,
      website_ai_limit: null,
      ferasetu_ai_enabled: true,
      website_ai_enabled: true
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.limits.ferasetu_ai_limit, null);
  assert.equal(data.limits.website_ai_limit, null);
  assert.equal(data.limits.website_ai_enabled, true);
});

// TEST 4: User can buy credit pack via simulation or gateway
await test('POST /api/payment/ai-credits/purchase with simulation adds credits immediately', async () => {
  const initialBalance = mockD1.users[0].ai_credits_balance;
  const req = new Request('https://ferasetu.com/api/payment/ai-credits/purchase', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${merchantToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pack: 'growth', // 1,000 credits
      usage_scope: 'shared',
      simulate: true
    })
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 201);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.simulated, true);
  assert.equal(data.pack.credits, 1000);
  assert.equal(data.ai_credits_balance, initialBalance + 1000);

  // Check database update
  assert.equal(mockD1.users[0].ai_credits_balance, initialBalance + 1000);
  assert.equal(mockD1.purchases[0].credits, 1000);
  assert.equal(mockD1.purchases[0].status, 'completed');
});

// TEST 5: Verify Template Assistant section file, button, and DesignPanel integration
await test('Storefront Template AiAssistantSection includes Remove from Section button and builder integration', async () => {
  const aiSectionPath = path.resolve('frontend/src/storefront/sections/AiAssistantSection.tsx');
  assert(fs.existsSync(aiSectionPath), 'AiAssistantSection.tsx must exist');

  const content = fs.readFileSync(aiSectionPath, 'utf8');
  assert(content.includes('Remove from Section'), 'AiAssistantSection must include "Remove from Section" button');
  assert(content.includes('Trash2'), 'AiAssistantSection must include trash icon for removal');
  assert(content.includes('onRemove'), 'AiAssistantSection must support onRemove callback');
  assert(content.includes('fera-remove-section'), 'AiAssistantSection must dispatch fera-remove-section event');

  // Verify DesignPanel includes ai-assistant in AVAILABLE_BLOCKS
  const designPanelPath = path.resolve('frontend/src/builder/panels/DesignPanel.tsx');
  const designPanelContent = fs.readFileSync(designPanelPath, 'utf8');
  assert(designPanelContent.includes("type: 'ai-assistant'"), 'DesignPanel must register ai-assistant block');
  assert(designPanelContent.includes('Remove from Section'), 'DesignPanel must provide Remove from Section action for AI section');

  // Verify TemplateRenderer handles ai-assistant
  const rendererPath = path.resolve('frontend/src/components/shop/TemplateRenderer.tsx');
  const rendererContent = fs.readFileSync(rendererPath, 'utf8');
  assert(rendererContent.includes("case 'ai-assistant':"), 'TemplateRenderer must handle ai-assistant section case');
  assert(rendererContent.includes('onRemoveSection'), 'TemplateRenderer must pass onRemoveSection callback');
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
  console.log('\n✅ All 5 Merchant AI Credit, Limit & Template tests passed successfully!');
}

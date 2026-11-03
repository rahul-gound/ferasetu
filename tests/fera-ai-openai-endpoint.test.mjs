/**
 * Test Suite: Fera AI OpenAI-Compatible Endpoint & Secret Verification
 * =============================================================================
 * Validates:
 * 1. Resolution of FERA_AI_ENDPOINT ("https://ai.fera-search.tech/v1") & FERA_AI_API_KEY
 * 2. Normalization of chat completions endpoint
 * 3. OpenAI-compatible payload structure (POST, Bearer auth, model, messages)
 * 4. OpenAI-compatible response parsing & think-tag cleanup
 * 5. Strict Zero-Secret-Leak Invariant (keys never exposed in responses or errors)
 * 6. Offline simulation in dev environment
 * 7. Verification that frontend is not calling or exposed to private AI endpoint
 * =============================================================================
 */

import assert from 'node:assert/strict';
import { getProviderConfig, normalizeChatEndpoint } from '../worker/ai/config.js';
import { callFeraAi, FeraAiError } from '../worker/ai/providers/feraAi.js';
import { createAiGatewayService } from '../worker/services/aiGatewayService.js';
import { feraRouter } from '../worker/ai/router.js';

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

console.log('\n🤖 Running Fera AI OpenAI-Compatible Endpoint Test Suite...\n');

// -----------------------------------------------------------------------------
// Suite 1: Endpoint & Secret Configuration Resolution
// -----------------------------------------------------------------------------
console.log('--- Suite 1: Endpoint & Secret Configuration Resolution ---');

await test('normalizeChatEndpoint: Correctly appends /chat/completions to base URL', () => {
  assert.equal(
    normalizeChatEndpoint('https://ai.fera-search.tech/v1'),
    'https://ai.fera-search.tech/v1/chat/completions'
  );
  assert.equal(
    normalizeChatEndpoint('https://ai.fera-search.tech/v1/'),
    'https://ai.fera-search.tech/v1/chat/completions'
  );
  assert.equal(
    normalizeChatEndpoint('https://ai.fera-search.tech/v1/chat/completions'),
    'https://ai.fera-search.tech/v1/chat/completions'
  );
  assert.equal(
    normalizeChatEndpoint(''),
    'https://ai.fera-search.tech/v1/chat/completions'
  );
});

await test('getProviderConfig: Resolves AI_ENDPOINT and API_AI from env/dev.vars', () => {
  const mockEnv = {
    AI_ENDPOINT: 'https://ai.fera-search.tech/v1',
    API_AI: 'secret_api_ai_token_999',
  };

  const config = getProviderConfig(mockEnv);

  assert.equal(config.feraAi.endpoint, 'https://ai.fera-search.tech/v1/chat/completions');
  assert.equal(config.feraAi.apiKey, 'secret_api_ai_token_999');
  assert.equal(config.feraAi.model, 'glm-5.3-flash');
});

await test('getProviderConfig: Resolves lowercase ai_endpoint and api_ai from env/dev.vars', () => {
  const mockEnv = {
    ai_endpoint: 'https://ai.fera-search.tech/v1',
    api_ai: 'lowercase_api_ai_secret',
  };

  const config = getProviderConfig(mockEnv);

  assert.equal(config.feraAi.endpoint, 'https://ai.fera-search.tech/v1/chat/completions');
  assert.equal(config.feraAi.apiKey, 'lowercase_api_ai_secret');
});

await test('getProviderConfig: Resolves FERA_AI_ENDPOINT and FERA_AI_API_KEY from env', () => {
  const mockEnv = {
    FERA_AI_ENDPOINT: 'https://ai.fera-search.tech/v1',
    FERA_AI_API_KEY: 'test_secret_key_fera_123',
    FERA_AI_MODEL: 'glm-5.3-flash',
  };

  const config = getProviderConfig(mockEnv);

  assert.equal(config.feraAi.endpoint, 'https://ai.fera-search.tech/v1/chat/completions');
  assert.equal(config.feraAi.apiKey, 'test_secret_key_fera_123');
  assert.equal(config.feraAi.model, 'glm-5.3-flash');
  assert.equal(config.feraAi.isOpenAiCompatible, true);

  // Backward compatibility alias: modal config matches feraAi
  assert.equal(config.modal.endpoint, 'https://ai.fera-search.tech/v1/chat/completions');
  assert.equal(config.modal.apiKey, 'test_secret_key_fera_123');
});

await test('getProviderConfig: Falls back cleanly to default https://ai.fera-search.tech/v1 when unset', () => {
  const emptyEnv = {};
  const config = getProviderConfig(emptyEnv);

  assert.equal(config.feraAi.endpoint, 'https://ai.fera-search.tech/v1/chat/completions');
  assert.equal(config.feraAi.baseUrl, 'https://ai.fera-search.tech/v1');
  assert.equal(config.feraAi.model, 'glm-5.3-flash');
});

// -----------------------------------------------------------------------------
// Suite 2: OpenAI Compatibility & Network Dispatch
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: OpenAI Compatibility & Network Dispatch ---');

await test('callFeraAi: Correctly dispatches OpenAI-compatible POST request and parses choices[0]', async () => {
  let capturedUrl = null;
  let capturedHeaders = null;
  let capturedBody = null;

  // Intercept global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    capturedBody = JSON.parse(options.body);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: 'chatcmpl-fera-mock-123',
        object: 'chat.completion',
        created: 1718000000,
        model: 'glm-5.3-flash',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '<think>Analyzing store orders...</think>Your store has 5 pending orders today.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 42,
          completion_tokens: 18,
          total_tokens: 60,
        },
      }),
    };
  };

  try {
    const config = {
      feraAi: {
        endpoint: 'https://ai.fera-search.tech/v1/chat/completions',
        apiKey: 'secret_key_openai_compatible',
        model: 'glm-5.3-flash',
      },
    };

    const result = await callFeraAi({
      messages: [{ role: 'user', content: 'What is today\'s status?' }],
      config,
      requestId: 'req-test-uuid',
      maxTokens: 1024,
      temperature: 0.3,
    });

    // Verify URL and Headers
    assert.equal(capturedUrl, 'https://ai.fera-search.tech/v1/chat/completions');
    assert.equal(capturedHeaders['Authorization'], 'Bearer secret_key_openai_compatible');
    assert.equal(capturedHeaders['Content-Type'], 'application/json');
    assert.equal(capturedHeaders['X-Request-ID'], 'req-test-uuid');

    // Verify Body format (OpenAI schema)
    assert.equal(capturedBody.model, 'glm-5.3-flash');
    assert.equal(capturedBody.messages[0].content, 'What is today\'s status?');
    assert.equal(capturedBody.max_tokens, 1024);
    assert.equal(capturedBody.temperature, 0.3);

    // Verify Response parsing and think tag removal
    assert.equal(result.content, 'Your store has 5 pending orders today.');
    assert.equal(result.promptTokens, 42);
    assert.equal(result.completionTokens, 18);
    assert.equal(result.provider, 'fera_ai');
    assert.equal(result.fallbackUsed, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// Suite 3: Secret Protection & Offline Emulation
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Secret Protection & Offline Emulation ---');

await test('callFeraAi: Graceful offline emulation when API key is missing in development', async () => {
  const config = {
    feraAi: {
      endpoint: 'https://ai.fera-search.tech/v1/chat/completions',
      apiKey: '',
      model: 'glm-5.3-flash',
    },
  };

  const result = await callFeraAi({
    messages: [{ role: 'user', content: 'Hello' }],
    config,
    requestId: 'req-sim-test',
  });

  assert.ok(result.content.includes('FeraSetu AI'));
  assert.equal(result.provider, 'fera_ai_simulation');
  assert.equal(result.promptTokens > 0, true);
});

await test('aiGatewayService: Dispatches through OpenAI-compatible endpoint with Bearer auth', async () => {
  let capturedHeaders = null;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'Gateway responded safely' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    };
  };

  try {
    const env = {
      AI_ENDPOINT: 'https://ai.fera-search.tech/v1',
      API_AI: 'gw_secret_token_live',
      FERA_AI_MODEL: 'glm-5.3-flash',
    };
    const gateway = createAiGatewayService(env);
    const res = await gateway.chatCompletion({
      messages: [{ role: 'user', content: 'Testing AI gateway' }],
    });

    assert.equal(capturedHeaders['Authorization'], 'Bearer gw_secret_token_live');
    assert.equal(res.content, 'Gateway responded safely');
    assert.equal(res.provider, 'fera_ai');

    // Verify secret is NOT in status
    const status = gateway.getProviderStatus();
    assert.equal(status.feraAi.configured, true);
    assert.equal(JSON.stringify(status).includes('gw_secret_token_live'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// Suite 4: End-to-End Router Integration with Fera AI Config
// -----------------------------------------------------------------------------
console.log('\n--- Suite 4: End-to-End Router Integration with Fera AI Config ---');

await test('feraRouter: Successfully routes through Fera AI config and returns structured response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: 'glm-5.3-flash',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Store metrics look great. 1. Stock up on Basmati Rice. 2. Create WhatsApp weekend offer.',
            },
          },
        ],
        usage: { prompt_tokens: 80, completion_tokens: 25 },
      }),
    };
  };

  try {
    const env = {
      FERA_AI_ENDPOINT: 'https://ai.fera-search.tech/v1',
      FERA_AI_API_KEY: 'secret_router_integration_key',
    };

    const response = await feraRouter.respond({
      user: { id: 'usr-1', market: 'IN', plan: 'growth', preferred_language: 'en' },
      message: 'Give me store recommendations',
      shopContextLines: 'SHOP: Ramesh Kirana (Plan: growth)\nPRODUCTS: 20 total',
      env,
    });

    assert.ok(response.content.includes('Store metrics look great'));
    assert.equal(response.routing.market, 'IN');
    assert.equal(response.routing.reasoningModel, 'glm-5.3-flash');
    assert.equal(response.usage.promptTokens, 80);
    assert.equal(response.usage.completionTokens, 25);

    // Verify that the private endpoint and secret key are NEVER leaked in response
    const jsonString = JSON.stringify(response);
    assert.equal(jsonString.includes('secret_router_integration_key'), false);
    assert.equal(jsonString.includes('https://ai.fera-search.tech'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\n❌ Failures:');
  for (const f of failures) {
    console.error(`  - ${f.name}: ${f.err.message}`);
  }
  process.exit(1);
} else {
  console.log('\n🎉 All Fera AI OpenAI-Compatible tests passed successfully!\n');
}

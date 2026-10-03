/**
 * Test Suite: Milestone 1 Canonical Service Layer Verification
 * =============================================================================
 * Validates canonical implementations:
 * 1. emailCrypto.js: Zero fallback, strict 256-bit key derivation, plaintext backward compatibility
 * 2. cashfreeService.js: createCashfreeService(env), createOrder, getOrderStatus, Web Crypto HMAC-SHA256, 15-min replay defense, constant-time comparison
 * 3. turnstileService.js: createTurnstileService(env), verifyToken, fail-close defense
 * 4. aiGatewayService.js: createAiGatewayService(env), Modal GLM & Sarvam AI unification, secret protection, request typing
 * =============================================================================
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  encryptSecret,
  decryptSecret,
  resolveEncryptionKey
} from '../worker/services/emailCrypto.js';
import {
  createCashfreeService,
  getCashfreeCredentials,
  classifyCashfreeError,
  timingSafeEqual
} from '../worker/services/cashfreeService.js';
import {
  createTurnstileService
} from '../worker/services/turnstileService.js';
import {
  createAiGatewayService,
  normalizeLanguageCode,
  redactSecrets
} from '../worker/services/aiGatewayService.js';

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

console.log('\n🔒 Running Canonical Service Layer (M1) Test Suite...\n');

// -----------------------------------------------------------------------------
// 1. emailCrypto.js Hardening Tests
// -----------------------------------------------------------------------------
console.log('--- Suite 1: emailCrypto.js Hardening & Key Derivation ---');

await test('emailCrypto: Throws explicit error when encryption key is missing', async () => {
  await assert.rejects(
    async () => {
      await encryptSecret('my_smtp_password', '');
    },
    /Security Exception: Encryption key is required/
  );

  await assert.rejects(
    async () => {
      await encryptSecret('my_smtp_password', {});
    },
    /Security Exception: Encryption key is required/
  );
});

await test('emailCrypto: Throws explicit error in production if key is less than 256 bits (32 bytes)', async () => {
  const shortKeyEnv = {
    DATA_ENCRYPTION_KEY: 'short_key_16_bytes',
    ENVIRONMENT: 'production'
  };

  await assert.rejects(
    async () => {
      await encryptSecret('my_smtp_password', shortKeyEnv);
    },
    /Security Exception: DATA_ENCRYPTION_KEY must be at least 256 bits/
  );
});

await test('emailCrypto: Successfully encrypts and decrypts with 256-bit key string or env object', async () => {
  const masterKey = 'a_secure_256_bit_master_key_for_testing_32b!';
  const plaintext = 'SuperSecretSmtpPass!@#2026';

  // String key
  const encrypted1 = await encryptSecret(plaintext, masterKey);
  assert.ok(encrypted1.startsWith('enc:v1:'));
  assert.notEqual(encrypted1, plaintext);

  const decrypted1 = await decryptSecret(encrypted1, masterKey);
  assert.equal(decrypted1, plaintext);

  // Env object with DATA_ENCRYPTION_KEY
  const envObj = { DATA_ENCRYPTION_KEY: masterKey };
  const encrypted2 = await encryptSecret(plaintext, envObj);
  assert.ok(encrypted2.startsWith('enc:v1:'));

  const decrypted2 = await decryptSecret(encrypted2, envObj);
  assert.equal(decrypted2, plaintext);
});

await test('emailCrypto: Backward-compatible decryption for legacy plaintext', async () => {
  const masterKey = 'a_secure_256_bit_master_key_for_testing_32b!';
  const legacyPlaintext = 'legacy_unencrypted_smtp_password';

  const result = await decryptSecret(legacyPlaintext, masterKey);
  assert.equal(result, legacyPlaintext);

  const empty = await decryptSecret('', masterKey);
  assert.equal(empty, '');
});

// -----------------------------------------------------------------------------
// 2. cashfreeService.js Canonical Implementation Tests
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: cashfreeService.js Canonical PG & Webhook Tests ---');

await test('cashfreeService: Resolves credentials and sets correct sandbox vs production URL', () => {
  const sandboxEnv = {
    CASHFREE_APP_ID: 'cf_app_123',
    CASHFREE_SECRET_KEY: 'cf_sec_456',
    CASHFREE_ENV: 'sandbox'
  };
  const sbCreds = getCashfreeCredentials(sandboxEnv);
  assert.equal(sbCreds.isValid, true);
  assert.equal(sbCreds.cashfreeEnv, 'sandbox');
  assert.equal(sbCreds.baseUrl, 'https://sandbox.cashfree.com/pg');

  const prodEnv = {
    CASHFREE_APP_ID: 'cf_app_prod',
    CASHFREE_SECRET_KEY: 'cf_sec_prod',
    CASHFREE_ENV: 'production'
  };
  const prodCreds = getCashfreeCredentials(prodEnv);
  assert.equal(prodCreds.isValid, true);
  assert.equal(prodCreds.cashfreeEnv, 'production');
  assert.equal(prodCreds.baseUrl, 'https://api.cashfree.com/pg');
});

await test('cashfreeService: timingSafeEqual correctly performs constant-time comparison', () => {
  const bufA = new Uint8Array([1, 2, 3, 4, 5]);
  const bufB = new Uint8Array([1, 2, 3, 4, 5]);
  const bufC = new Uint8Array([1, 2, 3, 4, 6]);
  const bufD = new Uint8Array([1, 2, 3, 4]);

  assert.equal(timingSafeEqual(bufA, bufB), true);
  assert.equal(timingSafeEqual(bufA, bufC), false);
  assert.equal(timingSafeEqual(bufA, bufD), false);
});

await test('cashfreeService: verifyWebhookSignature enforces missing header and replay defense', async () => {
  const env = { CASHFREE_APP_ID: 'app1', CASHFREE_SECRET_KEY: 'secret123' };
  const service = createCashfreeService(env);

  // Missing headers
  const missing = await service.verifyWebhookSignature({
    signature: '',
    timestamp: '',
    rawBody: '{}'
  });
  assert.equal(missing.valid, false);
  assert.equal(missing.reason, 'MISSING_HEADERS');

  // Replay clock skew (> 15 minutes)
  const expiredTime = (Date.now() - 16 * 60 * 1000).toString();
  const replay = await service.verifyWebhookSignature({
    signature: 'fake_sig',
    timestamp: expiredTime,
    rawBody: '{}'
  });
  assert.equal(replay.valid, false);
  assert.equal(replay.reason, 'TIMESTAMP_EXPIRED');
});

await test('cashfreeService: verifyWebhookSignature validates authentic HMAC-SHA256 signature', async () => {
  const secretKey = 'my_cashfree_webhook_secret_key_123';
  const env = { CASHFREE_APP_ID: 'app1', CASHFREE_SECRET_KEY: secretKey };
  const service = createCashfreeService(env);

  const timestamp = Date.now().toString();
  const rawBody = JSON.stringify({
    data: {
      order: { order_id: 'order_test_999', order_amount: 399 },
      payment: { payment_status: 'SUCCESS', cf_payment_id: 'pay_999' }
    }
  });

  // Generate authentic HMAC signature using Node crypto
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(`${timestamp}${rawBody}`);
  const authenticSignature = hmac.digest('base64');

  const validRes = await service.verifyWebhookSignature({
    signature: authenticSignature,
    timestamp,
    rawBody
  });
  assert.equal(validRes.valid, true);

  // Tampered payload
  const tamperedRes = await service.verifyWebhookSignature({
    signature: authenticSignature,
    timestamp,
    rawBody: rawBody + 'tamper'
  });
  assert.equal(tamperedRes.valid, false);
  assert.equal(tamperedRes.reason, 'INVALID_SIGNATURE');
});

// -----------------------------------------------------------------------------
// 3. turnstileService.js Canonical Implementation Tests
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: turnstileService.js Canonical & Fail-Close Tests ---');

await test('turnstileService: Empty or invalid token fails closed', async () => {
  const env = { TURNSTILE_SECRET_KEY: 'test_turnstile_secret' };
  const service = createTurnstileService(env);

  const res1 = await service.verifyToken('');
  assert.equal(res1.success, false);
  assert.equal(res1.error, 'TOKEN_REQUIRED');

  const res2 = await service.verifyToken(null);
  assert.equal(res2.success, false);
  assert.equal(res2.error, 'TOKEN_REQUIRED');
});

await test('turnstileService: Safely bypasses in non-production when secret key is unset', async () => {
  const devEnv = {};
  const service = createTurnstileService(devEnv);

  const res = await service.verifyToken('any_test_token');
  assert.equal(res.success, true);
  assert.equal(res.skipped, true);
});

await test('turnstileService: Fails closed in production when secret key is unset', async () => {
  const prodEnv = { ENVIRONMENT: 'production' };
  const service = createTurnstileService(prodEnv);

  const res = await service.verifyToken('any_test_token');
  assert.equal(res.success, false);
  assert.equal(res.error, 'SECRET_KEY_MISSING');
});

// -----------------------------------------------------------------------------
// 4. aiGatewayService.js Canonical Implementation Tests
// -----------------------------------------------------------------------------
console.log('\n--- Suite 4: aiGatewayService.js Canonical & Secret Protection Tests ---');

await test('aiGatewayService: Normalizes Indian language codes to Sarvam BCP-47', () => {
  assert.equal(normalizeLanguageCode('en'), 'en-IN');
  assert.equal(normalizeLanguageCode('hi'), 'hi-IN');
  assert.equal(normalizeLanguageCode('bn'), 'bn-IN');
  assert.equal(normalizeLanguageCode('gu'), 'gu-IN');
  assert.equal(normalizeLanguageCode('mr'), 'mr-IN');
  assert.equal(normalizeLanguageCode('ta'), 'ta-IN');
  assert.equal(normalizeLanguageCode('te'), 'te-IN');
  assert.equal(normalizeLanguageCode('hi-IN'), 'hi-IN');
});

await test('aiGatewayService: redactSecrets scrubs sensitive tokens from objects', () => {
  const sensitiveObj = {
    apiKey: 'sk_secret_token_123',
    authorization: 'Bearer jwt_secret',
    token: 'auth_token_456',
    password: 'smtp_password',
    safeField: 'kirana_store'
  };

  const scrubbed = redactSecrets(sensitiveObj);
  assert.equal(scrubbed.apiKey, '[REDACTED]');
  assert.equal(scrubbed.authorization, '[REDACTED]');
  assert.equal(scrubbed.token, '[REDACTED]');
  assert.equal(scrubbed.password, '[REDACTED]');
  assert.equal(scrubbed.safeField, 'kirana_store');
});

await test('aiGatewayService: getProviderStatus reports capabilities with zero secret leakage', () => {
  const env = {
    MODAL_API_KEY: 'sk_modal_live_1234567890',
    SARVAM_API_KEY: 'sarvam_live_subscription_key_12345',
    MODAL_GLM_MODEL: 'glm-5.3-flash',
  };
  const service = createAiGatewayService(env);
  const status = service.getProviderStatus();

  assert.equal(status.modal.configured, true);
  assert.equal(status.modal.model, 'glm-5.3-flash');
  assert.equal(status.sarvam.configured, true);

  // Assert zero secrets exist anywhere in the status JSON
  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes('sk_modal'), false);
  assert.equal(serialized.includes('sarvam_live'), false);
});

await test('aiGatewayService: chatCompletion validates messages parameter', async () => {
  const service = createAiGatewayService({});

  await assert.rejects(
    async () => {
      await service.chatCompletion({ messages: [] });
    },
    /Invalid messages parameter/
  );

  await assert.rejects(
    async () => {
      await service.chatCompletion({ messages: [{ role: 'user' }] }); // missing content
    },
    /Invalid message item/
  );
});

await test('aiGatewayService: Offline simulation produces structured responses in development', async () => {
  const devEnv = {};
  const service = createAiGatewayService(devEnv);

  const chatRes = await service.chatCompletion({
    messages: [{ role: 'user', content: 'Hello FeraSetu AI' }]
  });
  assert.ok(chatRes.content.length > 0);
  assert.equal(chatRes.provider, 'modal_simulation');

  const transRes = await service.translateText({
    text: 'Namaste',
    sourceLang: 'hi',
    targetLang: 'en'
  });
  assert.equal(transRes.translatedText, 'Namaste');
  assert.equal(transRes.provider, 'sarvam_simulation');

  const ttsRes = await service.textToSpeech({
    text: 'Welcome to our store',
    language: 'en'
  });
  assert.equal(ttsRes.format, 'wav');
  assert.equal(ttsRes.message, 'TTS provider key not configured');
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
  console.log('\n🎉 All Canonical Service Layer (M1) tests passed successfully!\n');
}

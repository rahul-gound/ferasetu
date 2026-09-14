import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCashfreeMode,
  validateCashfreePaymentResponse,
  CashfreeConfigurationError
} from '../src/utils/cashfree.ts';

test('getCashfreeMode returns "production" for authoritative production serverEnv', () => {
  const mode = getCashfreeMode('production');
  assert.equal(mode, 'production');
});

test('getCashfreeMode returns "sandbox" for authoritative sandbox serverEnv', () => {
  const mode = getCashfreeMode('sandbox');
  assert.equal(mode, 'sandbox');
});

test('getCashfreeMode fails closed for undefined serverEnv (never defaults to production)', () => {
  assert.throws(
    () => getCashfreeMode(undefined),
    (err: unknown) => {
      assert.ok(err instanceof CashfreeConfigurationError);
      assert.ok((err as Error).message.includes('Invalid or missing Cashfree payment environment'));
      return true;
    }
  );
});

test('getCashfreeMode fails closed for null, empty, or unknown serverEnv', () => {
  assert.throws(() => getCashfreeMode(null), CashfreeConfigurationError);
  assert.throws(() => getCashfreeMode(''), CashfreeConfigurationError);
  assert.throws(() => getCashfreeMode('staging'), CashfreeConfigurationError);
  assert.throws(() => getCashfreeMode('prod'), CashfreeConfigurationError);
});

test('validateCashfreePaymentResponse successfully extracts paymentSessionId and mode', () => {
  const mockResponse = {
    gateway: 'cashfree',
    paymentSessionId: 'session_cf_prod_9876543210',
    cashfreeEnv: 'production',
    id: 'tx_123456'
  };

  const validated = validateCashfreePaymentResponse(mockResponse);
  assert.equal(validated.paymentSessionId, 'session_cf_prod_9876543210');
  assert.equal(validated.mode, 'production');
});

test('validateCashfreePaymentResponse fails closed if paymentSessionId is missing or whitespace', () => {
  assert.throws(
    () => validateCashfreePaymentResponse({ cashfreeEnv: 'production' }),
    CashfreeConfigurationError
  );
  assert.throws(
    () => validateCashfreePaymentResponse({ paymentSessionId: '   ', cashfreeEnv: 'production' }),
    CashfreeConfigurationError
  );
  assert.throws(
    () => validateCashfreePaymentResponse({ paymentSessionId: null, cashfreeEnv: 'production' }),
    CashfreeConfigurationError
  );
});

test('validateCashfreePaymentResponse fails closed if cashfreeEnv is missing or invalid', () => {
  assert.throws(
    () => validateCashfreePaymentResponse({ paymentSessionId: 'session_123' }),
    CashfreeConfigurationError
  );
  assert.throws(
    () => validateCashfreePaymentResponse({ paymentSessionId: 'session_123', cashfreeEnv: 'invalid' }),
    CashfreeConfigurationError
  );
});

test('validateCashfreePaymentResponse preserves exact paymentSessionId without truncation or mutation', () => {
  const exactSession = 'session_test_abc_123!@#$%^&*()_+=-{}[]:;<>?,./~`';
  const validated = validateCashfreePaymentResponse({
    paymentSessionId: exactSession,
    cashfreeEnv: 'sandbox'
  });
  assert.equal(validated.paymentSessionId, exactSession);
  assert.equal(validated.mode, 'sandbox');
});

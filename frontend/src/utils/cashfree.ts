/**
 * Cashfree SDK integration utilities.
 *
 * Strict fail-closed architecture:
 * The Worker is authoritative for the payment session environment.
 * The frontend must never guess, assume, or silently convert a missing/invalid
 * environment into "production" or "sandbox".
 */

export class CashfreeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CashfreeConfigurationError';
  }
}

/**
 * Validates and resolves the Cashfree JS SDK mode from the server's payment initialization response.
 *
 * Requirements:
 * - serverEnv === 'production' -> 'production'
 * - serverEnv === 'sandbox'    -> 'sandbox'
 * - missing or any other value  -> throws CashfreeConfigurationError (fails closed)
 */
export function getCashfreeMode(serverEnv?: unknown): 'production' | 'sandbox' {
  if (serverEnv === 'production') {
    return 'production';
  }
  if (serverEnv === 'sandbox') {
    return 'sandbox';
  }

  throw new CashfreeConfigurationError(
    `Invalid or missing Cashfree payment environment: ${JSON.stringify(serverEnv)}. ` +
    'The server must return cashfreeEnv as "production" or "sandbox".'
  );
}

export interface ValidatedCashfreeCheckout {
  paymentSessionId: string;
  mode: 'production' | 'sandbox';
}

/**
 * Validates that a payment response contains a non-empty paymentSessionId and
 * a valid authoritative cashfreeEnv before initializing the Cashfree SDK.
 */
export function validateCashfreePaymentResponse(data: any): ValidatedCashfreeCheckout {
  if (!data || typeof data !== 'object') {
    throw new CashfreeConfigurationError('Invalid payment initialization response from server.');
  }

  const { paymentSessionId, cashfreeEnv } = data;

  if (typeof paymentSessionId !== 'string' || !paymentSessionId.trim()) {
    throw new CashfreeConfigurationError(
      'Missing or invalid paymentSessionId in server payment response.'
    );
  }

  const mode = getCashfreeMode(cashfreeEnv);

  return {
    paymentSessionId,
    mode,
  };
}

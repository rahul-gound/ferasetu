/**
 * FeraSetu Canonical Cashfree Payment Gateway Service
 * =============================================================================
 * Centralized service for Cashfree PG order creation, order status querying,
 * and Web Crypto HMAC-SHA256 webhook signature verification with 15-minute replay defense.
 * =============================================================================
 */

/**
 * Classifies HTTP status and error response text into structured error categories.
 *
 * @param {number} status
 * @param {string} [bodyText]
 * @returns {string}
 */
export function classifyCashfreeError(status, bodyText = '') {
  const lower = String(bodyText).toLowerCase();
  if (status === 401 || status === 403 || lower.includes('auth') || lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'cashfree_authentication_error';
  }
  if (status === 400 || status === 422) {
    return 'cashfree_validation_error';
  }
  if (status >= 500) {
    return 'cashfree_upstream_error';
  }
  return 'cashfree_upstream_error';
}

/**
 * Resolves Cashfree credentials and endpoint configuration from environment.
 *
 * @param {object} env - Cloudflare Worker environment bindings
 * @returns {{
 *   appId: string|null,
 *   secretKey: string|null,
 *   isValid: boolean,
 *   isProd: boolean,
 *   cashfreeEnv: 'production'|'sandbox',
 *   baseUrl: string
 * }}
 */
export function getCashfreeCredentials(env = {}) {
  const appId = env?.CASHFREE_APP_ID || env?.CASHFREE_CLIENT_ID || null;
  const secretKey = env?.CASHFREE_SECRET_KEY || env?.CASHFREE_CLIENT_SECRET || null;
  const isDummy = !appId || !secretKey ||
    appId.includes('your_app_id') || appId.includes('your_client_id') ||
    secretKey.includes('your_secret_key');
  const isValid = Boolean(appId && secretKey && !isDummy);
  const isProd = env?.CASHFREE_ENV === 'production';
  const cashfreeEnv = isProd ? 'production' : 'sandbox';
  const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

  return { appId, secretKey, isValid, isProd, cashfreeEnv, baseUrl };
}

/**
 * Constant-time byte comparison to defend against timing attacks.
 *
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Creates an instance of the canonical Cashfree service.
 *
 * @param {object} env - Cloudflare Worker environment bindings
 */
export function createCashfreeService(env = {}) {
  const credentials = getCashfreeCredentials(env);

  return {
    getCredentials() {
      return { ...credentials };
    },

    /**
     * Creates an order with Cashfree Payment Gateway.
     *
     * @param {object} params
     * @param {string} params.orderId - Unique order ID
     * @param {number} params.orderAmount - Order amount
     * @param {string} [params.orderCurrency='INR'] - Order currency
     * @param {object} params.customerDetails - Customer details (customer_id, customer_email, customer_phone)
     * @param {object} [params.orderMeta] - Order metadata including return_url and notify_url
     * @param {string} [params.orderNote] - Optional description / note
     * @param {object} [options]
     * @param {string} [options.requestId] - Trace ID
     * @returns {Promise<object>} Cashfree order response JSON
     */
    async createOrder(params, options = {}) {
      if (!credentials.isValid) {
        const err = new Error("Payment gateway configuration missing on server");
        err.statusCode = 503;
        err.code = "PAYMENT_GATEWAY_NOT_CONFIGURED";
        throw err;
      }

      const requestId = options.requestId || crypto.randomUUID();

      // Normalize parameters allowing both snake_case and camelCase
      const payload = {
        order_id: params.order_id || params.orderId,
        order_amount: params.order_amount ?? params.orderAmount,
        order_currency: params.order_currency || params.orderCurrency || 'INR',
        customer_details: params.customer_details || params.customerDetails || {},
        order_meta: params.order_meta || params.orderMeta || {},
        order_note: params.order_note || params.orderNote || undefined,
      };

      let res;
      try {
        res = await fetch(`${credentials.baseUrl}/orders`, {
          method: 'POST',
          headers: {
            'x-client-id': credentials.appId,
            'x-client-secret': credentials.secretKey,
            'x-api-version': '2023-08-01',
            'x-request-id': requestId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } catch (netErr) {
        console.error(`[CashfreeService.createOrder] Network error: ${netErr?.message} (requestId=${requestId})`);
        const err = new Error("Unable to connect to Cashfree payment gateway. Please try again later.");
        err.statusCode = 502;
        err.classification = 'cashfree_upstream_error';
        err.requestId = requestId;
        throw err;
      }

      if (!res.ok) {
        const errText = await res.text();
        const classification = classifyCashfreeError(res.status, errText);
        console.error(`[CashfreeService.createOrder] Failed: status=${res.status} classification=${classification} requestId=${requestId}`);

        let detail = 'Payment gateway error';
        try {
          const parsed = JSON.parse(errText);
          detail = parsed.message || detail;
        } catch {}

        const err = new Error(`Cashfree payment error: ${detail}`);
        err.statusCode = res.status >= 500 ? 502 : 400;
        err.classification = classification;
        err.requestId = requestId;
        throw err;
      }

      try {
        return await res.json();
      } catch {
        const err = new Error("Invalid response received from Cashfree gateway");
        err.statusCode = 502;
        err.classification = 'cashfree_upstream_error';
        err.requestId = requestId;
        throw err;
      }
    },

    /**
     * Fetches authoritative status of an order from Cashfree.
     *
     * @param {string} orderId - Order identifier
     * @param {object} [options]
     * @param {string} [options.requestId] - Trace ID
     * @returns {Promise<object>} Cashfree order details JSON
     */
    async getOrderStatus(orderId, options = {}) {
      if (!credentials.isValid) {
        const err = new Error("Payment gateway configuration missing on server");
        err.statusCode = 503;
        throw err;
      }

      const requestId = options.requestId || crypto.randomUUID();
      const encodedId = encodeURIComponent(String(orderId).trim());

      let res;
      try {
        res = await fetch(`${credentials.baseUrl}/orders/${encodedId}`, {
          method: 'GET',
          headers: {
            'x-client-id': credentials.appId,
            'x-client-secret': credentials.secretKey,
            'x-api-version': '2023-08-01',
            'x-request-id': requestId,
          },
        });
      } catch (netErr) {
        console.error(`[CashfreeService.getOrderStatus] Network error: ${netErr?.message} (requestId=${requestId})`);
        const err = new Error("Unable to connect to Cashfree payment gateway.");
        err.statusCode = 502;
        err.classification = 'cashfree_upstream_error';
        throw err;
      }

      if (!res.ok) {
        const err = new Error("Failed to verify Cashfree order with payment gateway");
        err.statusCode = res.status >= 500 ? 502 : 400;
        throw err;
      }

      return await res.json();
    },

    /**
     * Verifies the authenticity of an incoming Cashfree webhook notification.
     * Enforces:
     * 1. Required header validation (x-webhook-signature, x-webhook-timestamp)
     * 2. Replay attack protection (15-minute tolerance window)
     * 3. HMAC-SHA256 signature verification using Web Crypto API
     * 4. Constant-time byte-by-byte signature comparison
     *
     * @param {object} params
     * @param {string} params.signature - Content of x-webhook-signature header
     * @param {string} params.timestamp - Content of x-webhook-timestamp header
     * @param {string} params.rawBody - Raw unparsed webhook request payload string
     * @returns {Promise<{ valid: boolean, reason?: string, message?: string }>}
     */
    async verifyWebhookSignature({ signature, timestamp, rawBody }) {
      if (!credentials.secretKey) {
        return {
          valid: false,
          reason: 'GATEWAY_NOT_CONFIGURED',
          message: 'Payment gateway configuration missing on server',
        };
      }

      if (!signature || !timestamp) {
        return {
          valid: false,
          reason: 'MISSING_HEADERS',
          message: 'Missing required webhook signature headers',
        };
      }

      // Replay protection: verify timestamp within 15-minute window
      const ts = parseInt(timestamp, 10);
      const parsedMs = ts > 1e11 ? ts : ts * 1000;
      if (isNaN(parsedMs) || Math.abs(Date.now() - parsedMs) > 15 * 60 * 1000) {
        return {
          valid: false,
          reason: 'TIMESTAMP_EXPIRED',
          message: 'Webhook timestamp expired or clock skew too large',
        };
      }

      try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(credentials.secretKey);
        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );

        const dataToSign = encoder.encode(`${timestamp}${rawBody}`);
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataToSign);
        const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

        let valid = false;
        try {
          const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
          const expBytes = new Uint8Array(signatureBuffer);
          valid = timingSafeEqual(sigBytes, expBytes);
        } catch {
          valid = false;
        }

        if (!valid && expectedBase64 === signature) {
          valid = true;
        }

        if (!valid) {
          return {
            valid: false,
            reason: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature',
          };
        }

        return { valid: true };
      } catch (err) {
        return {
          valid: false,
          reason: 'VERIFICATION_ERROR',
          message: err?.message || 'Webhook signature verification failed',
        };
      }
    },
  };
}

export default createCashfreeService;

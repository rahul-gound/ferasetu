/**
 * FeraSetu Canonical Cloudflare Turnstile Bot Defense Service
 * =============================================================================
 * Implements createTurnstileService(env) with verifyToken(token, clientIp).
 * Communicates with Cloudflare siteverify API with strict fail-close defense.
 * In offline/local development without TURNSTILE_SECRET_KEY, provides safe bypass.
 * =============================================================================
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Checks if the execution environment is production.
 *
 * @param {object} env
 * @returns {boolean}
 */
function isProductionEnv(env = {}) {
  if (env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production' || env.CASHFREE_ENV === 'production') {
    return true;
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return true;
  }
  return false;
}

/**
 * Creates an instance of the Turnstile verification service.
 *
 * @param {object} env - Cloudflare Worker environment bindings
 */
export function createTurnstileService(env = {}) {
  const secretKey = env?.TURNSTILE_SECRET_KEY || null;
  const isProd = isProductionEnv(env);

  return {
    /**
     * Returns true if Turnstile secret key is configured.
     */
    isConfigured() {
      return Boolean(secretKey && secretKey.trim().length > 0);
    },

    /**
     * Verifies a Turnstile response token against the Cloudflare siteverify API.
     * Enforces fail-close behavior: network errors, API timeouts, or missing tokens
     * strictly result in failed verification.
     *
     * @param {string|object} tokenOrParams - Token string or { token, clientIp }
     * @param {string} [clientIp] - Client IP address (optional)
     * @returns {Promise<{
     *   success: boolean,
     *   skipped?: boolean,
     *   error?: string,
     *   errorCodes?: string[],
     *   message?: string,
     *   hostname?: string,
     *   challengeTs?: string
     * }>}
     */
    async verifyToken(tokenOrParams, clientIp = null) {
      let token = '';
      let ip = clientIp;

      if (tokenOrParams && typeof tokenOrParams === 'object') {
        token = tokenOrParams.token || tokenOrParams.response || '';
        ip = tokenOrParams.clientIp || tokenOrParams.remoteIp || ip;
      } else if (typeof tokenOrParams === 'string') {
        token = tokenOrParams;
      }

      const cleanToken = String(token || '').trim();

      // Token is mandatory — fail closed if absent
      if (!cleanToken) {
        return {
          success: false,
          error: 'TOKEN_REQUIRED',
          errorCodes: ['missing-input-response'],
          message: 'Turnstile token is required',
        };
      }

      // If no secret key configured:
      if (!secretKey || !secretKey.trim()) {
        // In production, missing secret key must fail closed
        if (isProd) {
          console.error('[TurnstileService] Fail-close: TURNSTILE_SECRET_KEY is missing in production');
          return {
            success: false,
            error: 'SECRET_KEY_MISSING',
            errorCodes: ['missing-input-secret'],
            message: 'Turnstile configuration missing on server',
          };
        }

        // In non-production development, allow safe offline testing bypass
        return {
          success: true,
          skipped: true,
          message: 'Turnstile skipped (no secret key configured)',
        };
      }

      // Build payload for siteverify API
      const formData = new FormData();
      formData.append("secret", secretKey.trim());
      formData.append("response", cleanToken);
      if (ip && typeof ip === 'string' && ip.trim()) {
        formData.append("remoteip", ip.trim());
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      let response;
      try {
        response = await fetch(TURNSTILE_VERIFY_URL, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } catch (networkErr) {
        clearTimeout(timer);
        console.error(`[TurnstileService] Fail-close: siteverify network error: ${networkErr?.message}`);
        return {
          success: false,
          error: 'VERIFICATION_UNAVAILABLE',
          errorCodes: ['internal-error'],
          message: 'Unable to reach Turnstile verification service',
        };
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        console.error(`[TurnstileService] Fail-close: siteverify responded with status ${response.status}`);
        return {
          success: false,
          error: 'GATEWAY_ERROR',
          errorCodes: [`http-${response.status}`],
          message: 'Turnstile verification gateway error',
        };
      }

      let outcome;
      try {
        outcome = await response.json();
      } catch (parseErr) {
        console.error(`[TurnstileService] Fail-close: JSON parse error: ${parseErr?.message}`);
        return {
          success: false,
          error: 'INVALID_GATEWAY_RESPONSE',
          errorCodes: ['invalid-json'],
          message: 'Invalid response from Turnstile gateway',
        };
      }

      if (!outcome?.success) {
        return {
          success: false,
          error: 'CHALLENGE_FAILED',
          errorCodes: outcome?.['error-codes'] || ['invalid-input-response'],
          hostname: outcome?.hostname,
          challengeTs: outcome?.challenge_ts,
          message: 'Turnstile challenge failed',
        };
      }

      return {
        success: true,
        hostname: outcome?.hostname,
        challengeTs: outcome?.challenge_ts,
        action: outcome?.action,
      };
    },
  };
}

export default createTurnstileService;

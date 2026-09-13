// =============================================================================
// FeraSetu AI — Centralized Model Provider Configuration
// Source of truth for endpoints, models, timeouts, retries, and defaults.
// Never hardcode API keys. Secrets must come from environment variables.
// =============================================================================

export const ROUTER_DEFAULTS = {
  defaultMarket: 'IN',
  supportedMarkets: ['IN', 'US', 'EU'],
  defaultReasoningModel: 'glm53Flash',
  defaultLanguage: 'en',
  maxMessageLength: 4000,
  maxConversationHistory: 10,
  maxRetries: 2,
  baseRetryDelayMs: 500,
};

export const TIMEOUTS = {
  reasoningMs: 30000,
  translationMs: 10000,
  healthCheckMs: 5000,
};

/**
 * Resolve provider configuration using Cloudflare Worker env bindings or process.env.
 * @param {Record<string, any>} env
 */
export function getProviderConfig(env = {}) {
  return {
    modal: {
      provider: 'modal',
      model: env.MODAL_GLM_MODEL || env.GLM_MODEL_NAME || 'glm-5.3-flash',
      endpoint: env.MODAL_GLM_ENDPOINT || env.GLM_MODAL_URL || 'https://api.modal.com/v1/chat/completions',
      apiKey: env.MODAL_API_KEY || env.GLM_MODAL_API_KEY || '',
      timeoutMs: TIMEOUTS.reasoningMs,
      maxTokens: 2048,
      temperature: 0.45,
    },
    sarvamTranslate: {
      provider: 'sarvam',
      model: env.SARVAM_TRANSLATE_MODEL || 'mayura:v1',
      endpoint: env.SARVAM_TRANSLATE_URL || 'https://api.sarvam.ai/translate',
      apiKey: env.SARVAM_API_KEY || '',
      timeoutMs: TIMEOUTS.translationMs,
      mode: 'formal',
    },
    fallback: {
      enabled: env.AI_FALLBACK_ENABLED !== 'false',
      provider: env.AI_FALLBACK_PROVIDER || 'sarvam-completion',
      model: env.AI_FALLBACK_MODEL || 'sarvam-m',
      sarvamApiKey: env.SARVAM_API_KEY || '',
    }
  };
}

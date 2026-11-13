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
 * Helper to normalize chat completions endpoint for OpenAI-compatible services.
 * Handles base URLs like 'https://ai.fera-search.tech/v1' as well as explicit '/chat/completions'.
 */
export function normalizeChatEndpoint(endpoint = 'https://ai.fera-search.tech/v1') {
  const trimmed = String(endpoint || '').trim().replace(/\/+$/, '');
  if (!trimmed) return 'https://ai.fera-search.tech/v1/chat/completions';
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

/**
 * Resolve provider configuration using Cloudflare Worker env bindings or process.env.
 * @param {Record<string, any>} env
 */
export function getProviderConfig(env = {}) {
  // Canonical Fera AI endpoint (OpenAI-compatible)
  // Supports AI_ENDPOINT / ai_endpoint, AI_API_BASEURL / ai_api_baseurl, and API_AI / api_ai from Cloudflare Worker env / dev.vars
  const rawAiEndpoint = env.AI_ENDPOINT || env.ai_endpoint || env.AI_API_BASEURL || env.ai_api_baseurl || env.AI_BASE_URL || env.ai_base_url || env.FERA_AI_ENDPOINT || env.FERA_AI_BASE_URL || env.MODAL_GLM_ENDPOINT || env.GLM_MODAL_URL || 'https://ai.fera-search.tech/v1';
  const chatCompletionsEndpoint = normalizeChatEndpoint(rawAiEndpoint);
  const aiApiKey = env.API_AI || env.api_ai || env.AI_API_KEY || env.ai_api_key || env.FERA_AI_API_KEY || env.FERA_AI_KEY || env.OPENAI_API_KEY || env.MODAL_API_KEY || env.GLM_MODAL_API_KEY || '';
  const aiModel = env.FERA_AI_MODEL || env.AI_MODEL || env.ai_model || env.MODAL_GLM_MODEL || env.GLM_MODEL_NAME || 'glm-5.3-flash';

  const feraAiConfig = {
    provider: 'fera_ai',
    baseUrl: rawAiEndpoint.trim().replace(/\/+$/, ''),
    endpoint: chatCompletionsEndpoint,
    apiKey: aiApiKey,
    model: aiModel,
    timeoutMs: TIMEOUTS.reasoningMs,
    maxTokens: 2048,
    temperature: 0.45,
    isOpenAiCompatible: true,
  };

  return {
    feraAi: feraAiConfig,
    // Backwards-compatible alias for existing callers/strategies
    modal: {
      ...feraAiConfig,
      provider: 'fera_ai',
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

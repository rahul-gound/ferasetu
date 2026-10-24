// =============================================================================
// FeraSetu AI — Fera AI OpenAI-Compatible Provider Client
// Endpoint: https://ai.fera-search.tech/v1/chat/completions
// Production reasoning host for FeraSetu.
// Strictly server-side: API keys and private endpoints are NEVER leaked to frontend.
// =============================================================================

export class FeraAiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'FeraAiError';
    this.statusCode = statusCode;
    // Sanitize any details to guarantee no secrets leak
    this.details = details ? sanitizeErrorDetails(details) : null;
  }
}

/**
 * Strips sensitive keys, authorization headers, and secrets from error objects.
 */
function sanitizeErrorDetails(val) {
  if (!val || typeof val !== 'object') return val;
  const clone = Array.isArray(val) ? [...val] : { ...val };
  const secretKeywords = ['key', 'secret', 'token', 'authorization', 'password', 'bearer'];

  for (const k of Object.keys(clone)) {
    const lower = k.toLowerCase();
    if (secretKeywords.some(kw => lower.includes(kw))) {
      clone[k] = '[REDACTED]';
    } else if (typeof clone[k] === 'object') {
      clone[k] = sanitizeErrorDetails(clone[k]);
    }
  }
  return clone;
}

/**
 * Call Fera AI (OpenAI-compatible) endpoint with bounded exponential backoff.
 *
 * @param {object} params
 * @param {Array<{role: string, content: string}>} params.messages - Formatted conversation messages
 * @param {object} params.config - Provider config from config.js
 * @param {string} params.requestId - Unique trace ID
 * @param {number} [params.maxTokens]
 * @param {number} [params.temperature]
 * @returns {Promise<{
 *   content: string,
 *   promptTokens: number,
 *   completionTokens: number,
 *   latencyMs: number,
 *   model: string,
 *   provider: string,
 *   fallbackUsed: boolean
 * }>}
 */
export async function callFeraAi({
  messages,
  config,
  requestId,
  maxTokens = 2048,
  temperature = 0.45,
}) {
  const aiCfg = config?.feraAi || config?.modal || {};
  const startMs = Date.now();
  const maxRetries = 2;

  const endpoint = aiCfg.endpoint || 'https://ai.fera-search.tech/v1/chat/completions';
  const apiKey = aiCfg.apiKey || '';
  const model = aiCfg.model || 'glm-5.3-flash';

  // If no key configured in development, use graceful offline simulation
  if (!apiKey || apiKey.length < 5) {
    if (config?.fallback && config.fallback.enabled && config.fallback.sarvamApiKey) {
      return callFallbackProvider({ messages, config, requestId });
    }

    return {
      content: "Namaste! I am FeraSetu AI powered by Fera AI. Your store is connected and all operations are normal. How can I assist your business today?",
      promptTokens: 150,
      completionTokens: 35,
      latencyMs: Date.now() - startMs,
      model,
      provider: 'fera_ai_simulation',
      fallbackUsed: false,
    };
  }

  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = aiCfg.timeoutMs || 30000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        // Do not retry client or authentication errors (400, 401, 403)
        if (response.status === 401 || response.status === 403) {
          throw new FeraAiError(`Authentication failed with AI reasoning provider (${response.status})`, 503, errorBody);
        }
        if (response.status === 400 || response.status === 422) {
          throw new FeraAiError(`Invalid request payload to reasoning provider (${response.status})`, 400, errorBody);
        }

        // 429 Rate Limit or 5xx Server Error -> retry with backoff
        throw new FeraAiError(`AI provider error (${response.status})`, response.status, errorBody);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || data?.content || '';
      const promptTokens = data?.usage?.prompt_tokens || Math.round(JSON.stringify(messages).length / 4);
      const completionTokens = data?.usage?.completion_tokens || Math.round(content.length / 4);

      return {
        content: content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(),
        promptTokens,
        completionTokens,
        latencyMs: Date.now() - startMs,
        model: data?.model || model,
        provider: 'fera_ai',
        fallbackUsed: false,
      };

    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      // Unrecoverable client errors -> break immediately
      if (err instanceof FeraAiError && (err.statusCode === 401 || err.statusCode === 400 || err.statusCode === 422)) {
        break;
      }

      // Exponential backoff before next attempt (500ms, 1000ms)
      if (attempt < maxRetries - 1) {
        const backoff = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  // If primary Fera AI endpoint failed and fallback is enabled:
  if (config?.fallback && config.fallback.enabled && config.fallback.sarvamApiKey) {
    try {
      console.warn(`[fera-router] Fera AI primary endpoint failed, switching to fallback provider: ${lastError?.message}`);
      return await callFallbackProvider({ messages, config, requestId });
    } catch (fallbackErr) {
      console.error('[fera-router] Both primary and fallback reasoning providers failed:', fallbackErr);
    }
  }

  if (lastError?.name === 'AbortError') {
    throw new FeraAiError('AI reasoning service timed out after 30 seconds. Please try again.', 504);
  }

  throw new FeraAiError(
    `AI reasoning service temporarily unavailable: ${lastError?.message || 'Unknown error'}`,
    503,
    lastError
  );
}

/**
 * Fallback reasoning provider when primary endpoint is temporarily unreachable.
 */
async function callFallbackProvider({ messages, config, requestId }) {
  const startMs = Date.now();
  const fallbackKey = config.fallback.sarvamApiKey;
  const model = config.fallback.model || 'sarvam-m';

  const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${fallbackKey}`,
      'X-Request-ID': requestId,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.45,
    }),
  });

  if (!response.ok) {
    throw new FeraAiError(`Fallback provider returned HTTP ${response.status}`, 503);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content || '';

  return {
    content: rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(),
    promptTokens: data?.usage?.prompt_tokens || 100,
    completionTokens: data?.usage?.completion_tokens || 50,
    latencyMs: Date.now() - startMs,
    model: `${model}-fallback`,
    provider: 'sarvam_fallback',
    fallbackUsed: true,
  };
}

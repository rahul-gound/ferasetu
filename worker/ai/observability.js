function isProduction(env = {}) {
  return env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production';
}

/**
 * Captures one completed LLM generation without allowing observability failures
 * to affect the merchant-facing AI response.
 * Uses native Cloudflare Worker / browser fetch API to avoid heavy or missing Node-only dependencies.
 */
export async function captureAiGeneration({
  env,
  distinctId,
  sessionId,
  traceId,
  messages,
  content,
  model,
  provider,
  promptTokens,
  completionTokens,
  latencyMs,
}) {
  const apiKey = env?.POSTHOG_KEY;
  const host = env?.POSTHOG_HOST;

  if (!apiKey || !host || !distinctId || !traceId || provider?.endsWith('_simulation')) {
    if ((!apiKey || !host) && !isProduction(env)) {
      console.error(new Error(`POSTHOG_${!apiKey ? 'KEY' : 'HOST'} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_${!apiKey ? 'KEY' : 'HOST'} is configured`));
    }
    return;
  }

  try {
    const endpoint = `${host.replace(/\/+$/, '')}/capture/`;
    const payload = {
      api_key: apiKey,
      event: '$ai_generation',
      distinct_id: distinctId,
      properties: {
        $ai_trace_id: traceId,
        $ai_session_id: sessionId,
        $ai_model: model,
        $ai_provider: provider,
        $ai_input: messages,
        $ai_input_tokens: promptTokens,
        $ai_output_choices: [{ role: 'assistant', content }],
        $ai_output_tokens: completionTokens,
        $ai_latency: latencyMs / 1000,
      },
    };

    if (typeof fetch === 'function') {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn('[ai-observability] Direct HTTP capture failed:', err?.message || err);
      });
    }
  } catch (error) {
    console.error('[ai-observability] Failed to capture generation', error);
  }
}

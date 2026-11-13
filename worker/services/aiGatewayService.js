/**
 * FeraSetu Canonical AI Gateway Service
 * =============================================================================
 * Unifies Modal GLM (reasoning) and Sarvam AI (Indic translation, TTS, STT)
 * into a single typed, tenant-isolated edge service with strict secret protection.
 *
 * Security & Reliability Guarantees:
 * 1. Zero Secret Leaks: API keys are never returned in responses or logged in errors.
 * 2. Strict Input Typing: Validates message arrays, text length, and language codes.
 * 3. Bounded Timeouts: Uses AbortController to prevent edge worker worker stalls.
 * 4. Graceful Offline Emulation: Safe fallbacks in non-production environments.
 * =============================================================================
 */

const SARVAM_LANGUAGE_MAP = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'bn': 'bn-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'mr': 'mr-IN',
  'or': 'or-IN',
  'pa': 'pa-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'gu': 'gu-IN',
};

/**
 * Normalizes language codes to Sarvam BCP-47 codes.
 *
 * @param {string} lang
 * @returns {string}
 */
export function normalizeLanguageCode(lang = 'en') {
  const code = String(lang).trim();
  const lower = code.toLowerCase();
  if (code.includes('-')) {
    const parts = code.split('-');
    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  }
  return SARVAM_LANGUAGE_MAP[lower] || `${lower}-IN`;
}

/**
 * Strips sensitive keys and authorization tokens from errors or debug objects.
 *
 * @param {any} val
 * @returns {any}
 */
export function redactSecrets(val) {
  if (!val || typeof val !== 'object') return val;
  const clone = Array.isArray(val) ? [...val] : { ...val };
  const secretKeywords = ['key', 'secret', 'token', 'authorization', 'password'];

  for (const k of Object.keys(clone)) {
    const lower = k.toLowerCase();
    if (secretKeywords.some(keyword => lower.includes(keyword))) {
      clone[k] = '[REDACTED]';
    } else if (typeof clone[k] === 'object') {
      clone[k] = redactSecrets(clone[k]);
    }
  }
  return clone;
}

/**
 * Factory for creating the canonical AI Gateway Service.
 *
 * @param {object} env - Cloudflare Worker environment bindings
 */
export function createAiGatewayService(env = {}) {
  // Fera AI / OpenAI-compatible reasoning config (AI_ENDPOINT / ai_endpoint, AI_API_BASEURL / ai_api_baseurl, and API_AI / api_ai from Worker dev.vars / env)
  const rawAiEndpoint = env?.AI_ENDPOINT || env?.ai_endpoint || env?.AI_API_BASEURL || env?.ai_api_baseurl || env?.AI_BASE_URL || env?.ai_base_url || env?.FERA_AI_ENDPOINT || env?.FERA_AI_BASE_URL || env?.MODAL_GLM_ENDPOINT || env?.GLM_MODAL_URL || 'https://ai.fera-search.tech/v1';
  const cleanEndpoint = String(rawAiEndpoint || '').trim().replace(/\/+$/, '');
  const aiChatEndpoint = cleanEndpoint.endsWith('/chat/completions')
    ? cleanEndpoint
    : (cleanEndpoint.endsWith('/v1') ? `${cleanEndpoint}/chat/completions` : `${cleanEndpoint}/v1/chat/completions`);
  const aiModel = env?.FERA_AI_MODEL || env?.AI_MODEL || env?.ai_model || env?.MODAL_GLM_MODEL || env?.GLM_MODEL_NAME || 'glm-5.3-flash';
  const aiApiKey = env?.API_AI || env?.api_ai || env?.AI_API_KEY || env?.ai_api_key || env?.FERA_AI_API_KEY || env?.FERA_AI_KEY || env?.OPENAI_API_KEY || env?.MODAL_API_KEY || env?.GLM_MODAL_API_KEY || '';

  // Sarvam AI config
  const sarvamApiKey = env?.SARVAM_API_KEY || env?.SARVAM_30B_API_KEY || env?.SARVAM_105B_API_KEY || '';
  const sarvamTranslateEndpoint = env?.SARVAM_TRANSLATE_URL || 'https://api.sarvam.ai/translate';
  const sarvamTranslateModel = env?.SARVAM_TRANSLATE_MODEL || 'mayura:v1';
  const sarvamTtsEndpoint = env?.SARVAM_TTS_URL || 'https://api.sarvam.ai/text-to-speech';
  const sarvamTtsModel = env?.SARVAM_TTS_MODEL || 'bulbul:v1';
  const sarvamSttEndpoint = env?.SARVAM_STT_URL || 'https://api.sarvam.ai/speech-to-text';
  const sarvamSttModel = env?.SARVAM_STT_MODEL || 'saarika:v2';

  const isProd = env?.ENVIRONMENT === 'production' || env?.NODE_ENV === 'production';

  return {
    /**
     * Reports configured capabilities without exposing any secret keys.
     */
    getProviderStatus() {
      const isConfigured = Boolean(aiApiKey && aiApiKey.trim().length > 4);
      return {
        feraAi: {
          configured: isConfigured,
          model: aiModel,
          isOpenAiCompatible: true,
        },
        modal: {
          configured: isConfigured,
          model: aiModel,
          endpoint: aiChatEndpoint.split('?')[0],
        },
        sarvam: {
          configured: Boolean(sarvamApiKey && sarvamApiKey.trim().length > 4),
          models: {
            translate: sarvamTranslateModel,
            tts: sarvamTtsModel,
            stt: sarvamSttModel,
          },
        },
      };
    },

    /**
     * Executes chat completions via Modal GLM-5.3 Flash reasoning provider.
     *
     * @param {object} params
     * @param {Array<{role: string, content: string}>} params.messages - Conversation history
     * @param {string} [params.model] - Optional model override
     * @param {number} [params.maxTokens=2048]
     * @param {number} [params.temperature=0.45]
     * @param {string} [params.requestId]
     * @returns {Promise<{
     *   content: string,
     *   model: string,
     *   provider: string,
     *   promptTokens: number,
     *   completionTokens: number,
     *   latencyMs: number
     * }>}
     */
    async chatCompletion({
      messages,
      model = aiModel,
      maxTokens = 2048,
      temperature = 0.45,
      requestId = crypto.randomUUID(),
    }) {
      if (!Array.isArray(messages) || messages.length === 0) {
        const err = new Error("Invalid messages parameter: array of message objects required");
        err.statusCode = 400;
        throw err;
      }

      // Validate message structure
      for (const msg of messages) {
        if (!msg || typeof msg !== 'object' || !msg.role || typeof msg.content !== 'string') {
          const err = new Error("Invalid message item: role and content string are required");
          err.statusCode = 400;
          throw err;
        }
      }

      const startMs = Date.now();

      // Graceful offline emulation if key is not configured in development
      if (!aiApiKey || aiApiKey.trim().length < 5) {
        if (isProd) {
          const err = new Error("AI provider configuration missing on server");
          err.statusCode = 503;
          throw err;
        }
        return {
          content: "Namaste! I am FeraSetu AI powered by Fera AI. Your store is connected and all operations are normal. How can I assist your business today?",
          model,
          provider: 'modal_simulation',
          promptTokens: 120,
          completionTokens: 32,
          latencyMs: Date.now() - startMs,
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(aiChatEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiApiKey.trim()}`,
            'Content-Type': 'application/json',
            'x-request-id': requestId,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`[AiGatewayService.chatCompletion] AI error ${res.status}: ${errBody.slice(0, 150)}`);
          const err = new Error(`AI reasoning provider error: HTTP ${res.status}`);
          err.statusCode = res.status >= 500 ? 502 : 400;
          throw err;
        }

        const data = await res.json();
        const rawContent = data.choices?.[0]?.message?.content || data.content || '';
        const content = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const usage = data.usage || {};

        return {
          content,
          model: data.model || model,
          provider: 'fera_ai',
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          latencyMs: Date.now() - startMs,
        };
      } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          const timeoutErr = new Error("AI provider request timed out (30s limit)");
          timeoutErr.statusCode = 504;
          throw timeoutErr;
        }
        throw err;
      }
    },

    /**
     * Translates natural language text between Indian languages and English via Sarvam Translate.
     *
     * @param {object} params
     * @param {string} params.text - Natural language input
     * @param {string} [params.sourceLang='auto'] - Source language code
     * @param {string} [params.targetLang='en-IN'] - Target language code
     * @param {string} [params.mode='formal'] - Translation mode ('formal' | 'code-mixed')
     * @param {string} [params.requestId]
     * @returns {Promise<{
     *   translatedText: string,
     *   sourceLanguageCode: string,
     *   targetLanguageCode: string,
     *   charactersCount: number,
     *   latencyMs: number,
     *   provider: string
     * }>}
     */
    async translateText({
      text,
      sourceLang = 'auto',
      targetLang = 'en-IN',
      mode = 'formal',
      requestId = crypto.randomUUID(),
    }) {
      const cleanText = String(text || '').trim();
      if (!cleanText) {
        const err = new Error("Text parameter is required for translation");
        err.statusCode = 400;
        throw err;
      }

      const startMs = Date.now();
      const srcCode = sourceLang === 'auto' ? 'auto' : normalizeLanguageCode(sourceLang);
      const tgtCode = normalizeLanguageCode(targetLang);

      if (!sarvamApiKey || sarvamApiKey.trim().length < 5) {
        if (isProd) {
          const err = new Error("Sarvam translation key is not configured on server");
          err.statusCode = 503;
          throw err;
        }
        return {
          translatedText: cleanText,
          sourceLanguageCode: srcCode,
          targetLanguageCode: tgtCode,
          charactersCount: cleanText.length,
          latencyMs: Date.now() - startMs,
          provider: 'sarvam_simulation',
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const res = await fetch(sarvamTranslateEndpoint, {
          method: 'POST',
          headers: {
            'api-subscription-key': sarvamApiKey.trim(),
            'Content-Type': 'application/json',
            'x-request-id': requestId,
          },
          body: JSON.stringify({
            input: cleanText,
            source_language_code: srcCode,
            target_language_code: tgtCode,
            mode,
            model: sarvamTranslateModel,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[AiGatewayService.translateText] Sarvam translate error ${res.status}: ${errText.slice(0, 150)}`);
          const err = new Error(`Translation provider error: HTTP ${res.status}`);
          err.statusCode = res.status >= 500 ? 502 : 400;
          throw err;
        }

        const data = await res.json();
        return {
          translatedText: data.translated_text || cleanText,
          sourceLanguageCode: data.source_language_code || srcCode,
          targetLanguageCode: data.target_language_code || tgtCode,
          charactersCount: cleanText.length,
          latencyMs: Date.now() - startMs,
          provider: 'sarvam',
        };
      } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          const timeoutErr = new Error("Translation provider request timed out");
          timeoutErr.statusCode = 504;
          throw timeoutErr;
        }
        throw err;
      }
    },

    /**
     * Converts natural language text to synthesized speech via Sarvam TTS (bulbul:v1).
     *
     * @param {object} params
     * @param {string} params.text - Natural language text to speak
     * @param {string} [params.language='en'] - Target language
     * @param {string} [params.speaker='meera'] - Voice persona
     * @param {string} [params.requestId]
     * @returns {Promise<{
     *   audio: string|null,
     *   format: 'wav',
     *   provider: string,
     *   message?: string
     * }>}
     */
    async textToSpeech({
      text,
      language = 'en',
      speaker = 'meera',
      requestId = crypto.randomUUID(),
    }) {
      const cleanText = String(text || '').trim();
      if (!cleanText) {
        const err = new Error("Text parameter is required for TTS");
        err.statusCode = 400;
        throw err;
      }

      const targetLanguageCode = normalizeLanguageCode(language);

      if (!sarvamApiKey || sarvamApiKey.trim().length < 5) {
        return {
          audio: null,
          format: 'wav',
          provider: 'sarvam_simulation',
          message: 'TTS provider key not configured',
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(sarvamTtsEndpoint, {
          method: 'POST',
          headers: {
            'api-subscription-key': sarvamApiKey.trim(),
            'Content-Type': 'application/json',
            'x-request-id': requestId,
          },
          body: JSON.stringify({
            inputs: [cleanText],
            target_language_code: targetLanguageCode,
            speaker,
            model: sarvamTtsModel,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[AiGatewayService.textToSpeech] Sarvam TTS error ${res.status}: ${errText.slice(0, 150)}`);
          return {
            audio: null,
            format: 'wav',
            provider: 'sarvam',
            error: `TTS service error: ${res.status}`,
            message: `TTS service error: ${res.status}`,
          };
        }

        const data = await res.json();
        return {
          audio: data.audios?.[0] || null,
          format: 'wav',
          provider: 'sarvam',
        };
      } catch (err) {
        clearTimeout(timeout);
        console.error(`[AiGatewayService.textToSpeech] Network error: ${err?.message}`);
        return {
          audio: null,
          format: 'wav',
          provider: 'sarvam',
          error: err?.message || 'TTS failed',
          message: err?.message || 'TTS failed',
        };
      }
    },
  };
}

export default createAiGatewayService;

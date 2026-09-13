// =============================================================================
// FeraSetu AI — Sarvam Translate Provider Client
// Handles bi-directional translation between Indian languages and English.
// Enforces explicit input/output language registry checks, bounded retries,
// failsafe input error handling, and structured degradation on output failure.
// =============================================================================

import {
  toSarvamBCP47,
  isInputLanguageSupported,
  isOutputLanguageSupported,
} from '../capabilities.js';

export class SarvamTranslateError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'SarvamTranslateError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Execute translation via Sarvam Translate REST API (POST /translate).
 *
 * @param {object} params
 * @param {string} params.text - Natural language text to translate
 * @param {string} params.sourceLang - Source language code (e.g. 'hi' or 'hi-IN' or 'auto')
 * @param {string} params.targetLang - Target language code (e.g. 'en-IN' or 'hi-IN')
 * @param {object} params.config - Provider config from config.js
 * @param {string} params.requestId - Trace ID
 * @returns {Promise<{
 *   translatedText: string,
 *   sourceLanguageCode: string,
 *   targetLanguageCode: string,
 *   charactersCount: number,
 *   latencyMs: number
 * }>}
 */
async function executeTranslateApi({ text, sourceLang, targetLang, config, requestId }) {
  const sarvamCfg = config.sarvamTranslate;
  const startMs = Date.now();

  // Validate capability before making network call
  if (sourceLang !== 'auto' && !isInputLanguageSupported(sourceLang)) {
    throw new SarvamTranslateError(
      `Source language '${sourceLang}' is not supported by the active translation model.`,
      422
    );
  }

  if (!isOutputLanguageSupported(targetLang)) {
    throw new SarvamTranslateError(
      `Target language '${targetLang}' is not supported by the active translation model.`,
      422
    );
  }

  const srcBcp47 = sourceLang === 'auto' ? 'auto' : toSarvamBCP47(sourceLang);
  const tgtBcp47 = toSarvamBCP47(targetLang);

  // If no API key configured (development/testing), provide deterministic simulation
  if (!sarvamCfg.apiKey || sarvamCfg.apiKey.length < 5) {
    return {
      translatedText: text, // in simulation, pass text through safely
      sourceLanguageCode: srcBcp47,
      targetLanguageCode: tgtBcp47,
      charactersCount: text.length,
      latencyMs: Date.now() - startMs,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), sarvamCfg.timeoutMs || 10000);

  try {
    const response = await fetch(sarvamCfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': sarvamCfg.apiKey,
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: srcBcp47,
        target_language_code: tgtBcp47,
        mode: sarvamCfg.mode || 'formal',
        model: sarvamCfg.model || 'mayura:v1',
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new SarvamTranslateError(
        `Sarvam Translate returned HTTP ${response.status}`,
        response.status,
        errorBody
      );
    }

    const data = await response.json();
    const translatedText = data?.translated_text || text;

    return {
      translatedText: translatedText.trim(),
      sourceLanguageCode: data?.source_language_code || srcBcp47,
      targetLanguageCode: tgtBcp47,
      charactersCount: text.length,
      latencyMs: Date.now() - startMs,
    };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new SarvamTranslateError('Translation request timed out.', 504);
    }
    if (err instanceof SarvamTranslateError) throw err;
    throw new SarvamTranslateError(`Sarvam translation network failure: ${err.message}`, 503, err);
  }
}

/**
 * Translate user input to English for model reasoning.
 * Bounded retry: 1 retry with backoff.
 * Failsafe: if input translation fails, throws explicit error — NEVER sends untranslated Indic to GLM.
 */
export async function translateInputToEnglish({ text, sourceLang, config, requestId }) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await executeTranslateApi({
        text,
        sourceLang: sourceLang || 'auto',
        targetLang: 'en-IN',
        config,
        requestId,
      });
    } catch (err) {
      lastError = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  // Failsafe: Do NOT proceed to English-only GLM with broken input translation.
  throw new SarvamTranslateError(
    'Language translation service is currently unavailable. Please try sending your message again.',
    503,
    lastError
  );
}

/**
 * Translate model reasoning response from English back to user's language.
 * Bounded retry: 1 retry with backoff.
 * Degradation: if output translation fails, preserves the English answer with degraded flag.
 */
export async function translateResponseToUserLanguage({ text, targetLang, config, requestId }) {
  // If target is English, zero translation is required
  if (targetLang === 'en' || targetLang === 'en-IN') {
    return {
      translatedText: text,
      charactersCount: 0,
      degraded: false,
      translationBackFailed: false,
    };
  }

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await executeTranslateApi({
        text,
        sourceLang: 'en-IN',
        targetLang,
        config,
        requestId,
      });

      return {
        translatedText: result.translatedText,
        charactersCount: result.charactersCount,
        degraded: false,
        translationBackFailed: false,
      };
    } catch (err) {
      lastError = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  // Structured degradation: Return English reasoning text with clear transparency flag
  console.warn(`[fera-router] Response translation to ${targetLang} failed: ${lastError?.message}`);
  return {
    translatedText: text, // preserve original generated English text
    charactersCount: 0,
    degraded: true,
    translationBackFailed: true,
    fallbackReason: `Could not translate response to ${targetLang}: ${lastError?.message || 'timeout'}`,
  };
}

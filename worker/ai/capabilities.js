// =============================================================================
// Fera AI — Model & Translation Capability Registry
// Explicitly documents reasoning languages, input/output translation directions,
// token costs, and tool calling capabilities.
// =============================================================================

export const REASONING_MODELS = {
  glm53Flash: {
    id: 'glm-5.3-flash',
    provider: 'modal',
    reasoningLanguages: ['en'],
    supportsToolCalling: true,
    supportsStreaming: true,
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
    pricingUsdPer1kTokens: {
      input: 0.0001,
      output: 0.0002,
    },
  },
  sarvamFallback: {
    id: 'sarvam-m',
    provider: 'sarvam',
    reasoningLanguages: ['en', 'hi', 'bn', 'gu', 'kn', 'ml', 'mr', 'or', 'pa', 'ta', 'te'],
    supportsToolCalling: false,
    supportsStreaming: false,
    maxContextTokens: 8192,
    maxOutputTokens: 2048,
    pricingUsdPer1kTokens: {
      input: 0.0003,
      output: 0.0006,
    },
  },
};

/**
 * Translation capability registry.
 * Explicitly separates:
 * 1. supportedIndianLanguages (canonical short codes)
 * 2. supportedInputLanguages (BCP-47 codes supported as translation source)
 * 3. supportedOutputLanguages (BCP-47 codes supported as translation target)
 *
 * Configured according to the Sarvam Translate API (mayura:v1 / sarvam-translate:v1).
 */
export const TRANSLATION_CAPABILITIES = {
  sarvamTranslate: {
    provider: 'sarvam',
    model: 'mayura:v1',
    type: 'bidirectional',
    maxCharactersPerRequest: 1000,
    pricingUsdPer1kChars: 0.005,
    // Canonical 2-letter / ISO language keys recognised across FeraSetu
    supportedIndianLanguages: [
      'hi', 'bn', 'gu', 'kn', 'ml', 'mr', 'or', 'pa', 'ta', 'te', 'ur',
      'as', 'brx', 'doi', 'gom', 'ks', 'mai', 'mni', 'ne', 'sa', 'sat', 'sd'
    ],
    // Explicit list of source language codes supported by the active translate model
    supportedInputLanguages: [
      'en-IN', 'hi-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN',
      'as-IN', 'brx-IN', 'doi-IN', 'gom-IN', 'ks-IN', 'mai-IN', 'mni-IN', 'ne-IN', 'sa-IN', 'sat-IN', 'sd-IN', 'ur-IN'
    ],
    // Explicit list of target language codes supported by the active translate model
    supportedOutputLanguages: [
      'en-IN', 'hi-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN',
      'as-IN', 'brx-IN', 'doi-IN', 'gom-IN', 'ks-IN', 'mai-IN', 'mni-IN', 'ne-IN', 'sa-IN', 'sat-IN', 'sd-IN', 'ur-IN'
    ],
  },
};

/**
 * Mapping from short language code or alias to Sarvam BCP-47 locale.
 */
export const LANGUAGE_CODE_MAP = {
  hi: 'hi-IN',
  hindi: 'hi-IN',
  en: 'en-IN',
  english: 'en-IN',
  gu: 'gu-IN',
  gujarati: 'gu-IN',
  mr: 'mr-IN',
  marathi: 'mr-IN',
  bn: 'bn-IN',
  bengali: 'bn-IN',
  kn: 'kn-IN',
  kannada: 'kn-IN',
  ta: 'ta-IN',
  tamil: 'ta-IN',
  te: 'te-IN',
  telugu: 'te-IN',
  ml: 'ml-IN',
  malayalam: 'ml-IN',
  pa: 'pa-IN',
  punjabi: 'pa-IN',
  or: 'od-IN',
  od: 'od-IN',
  odia: 'od-IN',
  ur: 'ur-IN',
  urdu: 'ur-IN',
  as: 'as-IN',
  assamese: 'as-IN',
  brx: 'brx-IN',
  doi: 'doi-IN',
  gom: 'gom-IN',
  ks: 'ks-IN',
  mai: 'mai-IN',
  mni: 'mni-IN',
  ne: 'ne-IN',
  nepali: 'ne-IN',
  sa: 'sa-IN',
  sanskrit: 'sa-IN',
  sat: 'sat-IN',
  sd: 'sd-IN',
};

/**
 * Reverse mapping from BCP-47 to short language code.
 */
export const BCP47_TO_SHORT = {
  'hi-IN': 'hi',
  'en-IN': 'en',
  'gu-IN': 'gu',
  'mr-IN': 'mr',
  'bn-IN': 'bn',
  'kn-IN': 'kn',
  'ta-IN': 'ta',
  'te-IN': 'te',
  'ml-IN': 'ml',
  'pa-IN': 'pa',
  'od-IN': 'or',
  'ur-IN': 'ur',
  'as-IN': 'as',
  'brx-IN': 'brx',
  'doi-IN': 'doi',
  'gom-IN': 'gom',
  'ks-IN': 'ks',
  'mai-IN': 'mai',
  'mni-IN': 'mni',
  'ne-IN': 'ne',
  'sa-IN': 'sa',
  'sat-IN': 'sat',
  'sd-IN': 'sd',
};

/**
 * Verify whether an input language is supported as a translation source.
 * @param {string} langCode - Short code (e.g. 'hi') or BCP-47 (e.g. 'hi-IN')
 * @returns {boolean}
 */
export function isInputLanguageSupported(langCode) {
  const bcp47 = LANGUAGE_CODE_MAP[langCode?.toLowerCase()] || langCode;
  return TRANSLATION_CAPABILITIES.sarvamTranslate.supportedInputLanguages.includes(bcp47);
}

/**
 * Verify whether an output language is supported as a translation target.
 * @param {string} langCode - Short code (e.g. 'hi') or BCP-47 (e.g. 'hi-IN')
 * @returns {boolean}
 */
export function isOutputLanguageSupported(langCode) {
  const bcp47 = LANGUAGE_CODE_MAP[langCode?.toLowerCase()] || langCode;
  return TRANSLATION_CAPABILITIES.sarvamTranslate.supportedOutputLanguages.includes(bcp47);
}

/**
 * Get canonical BCP-47 code for Sarvam API.
 * @param {string} langCode
 * @returns {string}
 */
export function toSarvamBCP47(langCode) {
  return LANGUAGE_CODE_MAP[langCode?.toLowerCase()] || (langCode?.includes('-') ? langCode : `${langCode}-IN`);
}

/**
 * Convert BCP-47 code back to short code.
 * @param {string} bcp47
 * @returns {string}
 */
export function fromSarvamBCP47(bcp47) {
  return BCP47_TO_SHORT[bcp47] || bcp47?.split('-')[0] || 'en';
}

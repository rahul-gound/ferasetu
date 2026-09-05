// =============================================================================
// Fera AI — Language Detection, Normalization & State Management
// Conservative confidence scoring: distinguishes pure English from Romanized Indic.
// Intent-preserving normalizer: strips noise without dropping meaning.
// =============================================================================

/**
 * Unicode Script Ranges for Indic Languages.
 */
const SCRIPT_RANGES = [
  { script: 'Devanagari', lang: 'hi', regex: /[\u0900-\u097F]/g },
  { script: 'Bengali', lang: 'bn', regex: /[\u0980-\u09FF]/g },
  { script: 'Gurmukhi', lang: 'pa', regex: /[\u0A00-\u0A7F]/g },
  { script: 'Gujarati', lang: 'gu', regex: /[\u0A80-\u0AFF]/g },
  { script: 'Odia', lang: 'or', regex: /[\u0B00-\u0B7F]/g },
  { script: 'Tamil', lang: 'ta', regex: /[\u0B80-\u0BFF]/g },
  { script: 'Telugu', lang: 'te', regex: /[\u0C00-\u0C7F]/g },
  { script: 'Kannada', lang: 'kn', regex: /[\u0C80-\u0CFF]/g },
  { script: 'Malayalam', lang: 'ml', regex: /[\u0D00-\u0D7F]/g },
  { script: 'Arabic_Urdu', lang: 'ur', regex: /[\u0600-\u06FF]/g },
];

/**
 * Common Romanized Indic vocabulary tokens.
 * High-frequency structural and conversational markers across Hindi/Marathi/Gujarati/etc.
 */
const ROMANIZED_INDIC_MARKERS = new Set([
  'bhai', 'bhaiya', 'meri', 'mera', 'mere', 'kya', 'kaise', 'kaisi', 'kaisa',
  'chal', 'raha', 'rahi', 'rahe', 'hai', 'hain', 'tha', 'thi', 'the',
  'maal', 'bik', 'bikri', 'bikra', 'bikraha', 'kitna', 'kitni', 'kitne',
  'dukaan', 'grahak', 'kharid', 'kharidna', 'bech', 'bechna', 'lena', 'dena',
  'karo', 'karein', 'kijiye', 'batao', 'bataiye', 'dikhao', 'dikhaye', 'samjhao',
  'aaj', 'kal', 'parso', 'paisa', 'paise', 'rupaye', 'rupiya', 'khatam',
  'jyada', 'zyada', 'kam', 'badhao', 'ghatao', 'nuksan', 'fayda', 'munafa',
  'namaste', 'shukriya', 'dhanyawad', 'hoga', 'hogi', 'honge', 'kar',
  'sakte', 'sakta', 'sakti', 'aap', 'tum', 'hum', 'mujhe', 'humein',
  'apna', 'apni', 'apne', 'wali', 'wala', 'wale', 'kaun', 'kaunsa', 'kaunsi',
  'sabse', 'accha', 'achha', 'nahi', 'nahin', 'mat', 'kyun', 'kab', 'kahan',
  'thik', 'theek', 'bolo', 'sun', 'suno', 'zara', 'thoda', 'bahut', 'bohot',
  'aaja', 'aaye', 'jao', 'karenge', 'padega', 'samasya', 'madad'
]);

/**
 * Common English structural, grammatical, and analytical words.
 */
const ENGLISH_STRUCTURAL_WORDS = new Set([
  'what', 'is', 'are', 'my', 'your', 'how', 'can', 'the', 'a', 'an',
  'should', 'and', 'or', 'which', 'any', 'you', 'this', 'that', 'from',
  'with', 'about', 'trend', 'sales', 'revenue', 'inventory', 'customer',
  'customers', 'products', 'product', 'feedback', 'survey', 'increase',
  'decrease', 'up', 'down', 'profit', 'explain', 'show', 'tell', 'help',
  'grow', 'store', 'shop', 'why', 'when', 'where', 'who', 'does', 'did',
  'will', 'would', 'could', 'please', 'thanks', 'thank', 'okay', 'bro',
  'think', 'hard', 'more', 'less', 'good', 'bad', 'best', 'worst', 'order',
  'orders', 'view', 'details', 'check', 'report', 'analytics', 'give', 'add'
]);

/**
 * Safely normalize user message text without destroying meaning or removing words.
 * Trims excess whitespace, normalizes multiple spaces/newlines, and collapses
 * excessive repeated punctuation (e.g. ???? -> ?, !!!! -> !).
 *
 * @param {string} rawText
 * @returns {string}
 */
export function normalizeUserMessage(rawText) {
  if (typeof rawText !== 'string') return '';
  return rawText
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')               // collapse multiple horizontal spaces
    .replace(/\n{3,}/g, '\n\n')            // collapse 3+ newlines to 2
    .replace(/([?!.,;:])\1{2,}/g, '$1$1')  // collapse 3+ repeated punctuation to max 2
    .trim();
}

/**
 * Tokenize text into lowercase alphanumeric words.
 * @param {string} text
 * @returns {string[]}
 */
function tokenizeWords(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
}

/**
 * Detect language with conservative confidence scoring.
 * Prevents naive Latin script = English assumptions for Hinglish/Romanized Indic.
 *
 * @param {string} text - User message (normalized)
 * @param {object} context - Contextual state
 * @param {string} [context.conversationLanguage] - Established language of current thread
 * @param {string} [context.userPreferredLanguage] - Merchant profile language
 * @returns {{
 *   language: string,
 *   confidence: number,
 *   script: string,
 *   isIndic: boolean,
 *   isEnglish: boolean,
 *   englishConfidence: number,
 *   indicConfidence: number,
 *   method: 'native_script' | 'romanized_analysis' | 'conversation_prior'
 * }}
 */
export function detectLanguage(text, context = {}) {
  const clean = normalizeUserMessage(text);
  if (!clean) {
    const fallbackLang = context.conversationLanguage || context.userPreferredLanguage || 'en';
    return {
      language: fallbackLang,
      confidence: 1.0,
      script: 'unknown',
      isIndic: fallbackLang !== 'en',
      isEnglish: fallbackLang === 'en',
      englishConfidence: fallbackLang === 'en' ? 1.0 : 0.0,
      indicConfidence: fallbackLang !== 'en' ? 1.0 : 0.0,
      method: 'conversation_prior',
    };
  }

  // 1. Check Native Indic Unicode Scripts
  for (const item of SCRIPT_RANGES) {
    const matches = clean.match(item.regex);
    if (matches && matches.length >= 2) {
      const scriptDensity = matches.length / clean.replace(/\s+/g, '').length;
      if (scriptDensity > 0.1 || matches.length >= 4) {
        return {
          language: item.lang,
          confidence: Math.min(1.0, 0.85 + scriptDensity * 0.15),
          script: item.script,
          isIndic: true,
          isEnglish: false,
          englishConfidence: 0.05,
          indicConfidence: 0.95,
          method: 'native_script',
        };
      }
    }
  }

  // 2. Latin Script Analysis (English vs. Romanized Indic)
  const tokens = tokenizeWords(clean);
  if (tokens.length === 0) {
    return {
      language: 'en',
      confidence: 0.9,
      script: 'latin',
      isIndic: false,
      isEnglish: true,
      englishConfidence: 0.9,
      indicConfidence: 0.1,
      method: 'romanized_analysis',
    };
  }

  let indicHits = 0;
  let englishHits = 0;

  for (const word of tokens) {
    if (ROMANIZED_INDIC_MARKERS.has(word)) {
      indicHits++;
    }
    if (ENGLISH_STRUCTURAL_WORDS.has(word)) {
      englishHits++;
    }
  }

  // Calculate base scores based on matched token ratios
  const total = tokens.length;
  let rawIndicScore = indicHits / total;
  let rawEnglishScore = englishHits / total;

  // Apply conversation prior weighting
  const priorLang = context.conversationLanguage || context.userPreferredLanguage;
  if (priorLang && priorLang !== 'en') {
    rawIndicScore += 0.15; // mild prior if previous turns were Indic
  } else if (priorLang === 'en') {
    rawEnglishScore += 0.15;
  }

  // Normalize scores to [0.0, 1.0] range
  const indicConfidence = Math.min(1.0, Number((rawIndicScore * 1.8).toFixed(2)));
  const englishConfidence = Math.min(1.0, Number((rawEnglishScore * 1.8).toFixed(2)));

  // Decision rule:
  // - If Indic confidence >= 0.45 and exceeds English confidence -> Romanized Hindi
  // - If English confidence >= 0.40 and exceeds Indic confidence -> English
  if (indicConfidence >= 0.45 && indicConfidence > englishConfidence) {
    // Retain conversation dialect if it's already an Indic language (e.g. mr, gu)
    const targetIndic = (priorLang && priorLang !== 'en') ? priorLang : 'hi';
    return {
      language: targetIndic,
      confidence: indicConfidence,
      script: 'latin_romanized',
      isIndic: true,
      isEnglish: false,
      englishConfidence,
      indicConfidence,
      method: 'romanized_analysis',
    };
  }

  if (englishConfidence >= 0.40 && englishConfidence >= indicConfidence) {
    return {
      language: 'en',
      confidence: Math.max(englishConfidence, 0.8),
      script: 'latin',
      isIndic: false,
      isEnglish: true,
      englishConfidence,
      indicConfidence,
      method: 'romanized_analysis',
    };
  }

  // Fallback for short ambiguous queries (e.g. numbers, brand names, single words):
  // Check if text has any Indic markers at all
  if (indicHits > 0) {
    return {
      language: priorLang && priorLang !== 'en' ? priorLang : 'hi',
      confidence: 0.7,
      script: 'latin_romanized',
      isIndic: true,
      isEnglish: false,
      englishConfidence,
      indicConfidence,
      method: 'romanized_analysis',
    };
  }

  // Default to English if predominantly Latin characters without Indic markers
  return {
    language: 'en',
    confidence: 0.85,
    script: 'latin',
    isIndic: false,
    isEnglish: true,
    englishConfidence: 0.85,
    indicConfidence: 0.15,
    method: 'romanized_analysis',
  };
}

/**
 * Check if the user has switched language compared to established conversation language.
 * @param {string} detectedLang
 * @param {string} [conversationLang]
 * @returns {boolean}
 */
export function hasLanguageSwitched(detectedLang, conversationLang) {
  if (!conversationLang) return false;
  return detectedLang !== conversationLang;
}

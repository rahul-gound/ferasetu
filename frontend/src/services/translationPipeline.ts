// =============================================================================
// FeraSetu Translation Pipeline — Client-Side Dynamic Context-Aware Service
// Batched, debounced, multi-tier caching (Memory + LocalStorage + D1 Edge)
// Fully supports bidirectional multi-language translation (e.g. Telugu <-> English).
// =============================================================================

export interface TranslationRequestItem {
  id: string;
  text: string;
  targetLang: string;
  sourceLang?: string;
  context?: string;
  resolve: (translated: string) => void;
  reject: (err: any) => void;
}

const MEMORY_CACHE = new Map<string, string>();
const PENDING_QUEUE: TranslationRequestItem[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 40;

const TELUGU_REGEX = /[\u0C00-\u0C7F]/;
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const TAMIL_REGEX = /[\u0B80-\u0BFF]/;
const BENGALI_REGEX = /[\u0980-\u09FF]/;

/**
 * Detect script language of text
 */
export function detectScriptLanguage(text: string, fallback = 'en'): string {
  if (!text || typeof text !== 'string') return fallback;
  if (TELUGU_REGEX.test(text)) return 'te';
  if (DEVANAGARI_REGEX.test(text)) return 'hi';
  if (TAMIL_REGEX.test(text)) return 'ta';
  if (BENGALI_REGEX.test(text)) return 'bn';
  return fallback;
}

function computeCacheKey(sourceLang: string, targetLang: string, context: string, text: string): string {
  return `fera_tr_${sourceLang}_to_${targetLang}_${context}_${text.trim().toLowerCase().slice(0, 80)}`;
}

/**
 * High-frequency offline dictionary for instant 0ms translation of UI & Community staples
 */
const OFFLINE_DICTIONARY: Record<string, Record<string, string>> = {
  te: {
    'Merchant Community & Knowledge Hub': 'వ్యాపారి సంఘం & నాలెడ్జ్ హబ్',
    'Start Discussion': 'కొత్త చర్చను ప్రారంభించండి',
    'Ask a Question': 'ప్రశ్న అడగండి',
    'Search discussions or questions...': 'చర్చలు లేదా ప్రశ్నలను శోధించండి...',
    'All Topics': 'అన్ని అంశాలు',
    'Announcements': 'ముఖ్యమైన ప్రకటనలు',
    'Getting Started': 'ప్రారంభించండి',
    'Payments & Soundbox': 'చెల్లింపులు & సౌండ్‌బాక్స్',
    'Inventory & Godown': 'స్టాక్ & గోడౌన్',
    'Domains & DNS': 'డొమైన్లు & డీఎన్‌ఎస్',
    'Storefront Design': 'షాపు డిజైన్',
    'Local SEO': 'లోకల్ ఎస్‌ఈఓ',
    'Verified Merchant': 'ధృవీకరించబడిన వ్యాపారి',
    'Staff Verified': 'ఫేరాసేతు బృందం ధృవీకరించింది',
    'Reply': 'సమాధానం ఇవ్వండి',
    'Replies': 'సమాధానాలు',
    'Upvote': 'ఉపయోగకరం',
    'Share': 'షేర్ చేయండి',
    'Translated to': 'లోనికి అనువదించబడింది',
    'View original': 'అసలు సందేశాన్ని చూడండి',
    'Show translation': 'అనువాదం చూడండి',
    'Just now': 'ఇప్పుడే'
  },
  hi: {
    'Merchant Community & Knowledge Hub': 'व्यापारी समुदाय एवं ज्ञान केंद्र',
    'Ask questions, share advice, and connect with independent shopkeepers across India and worldwide.': 'सवाल पूछें, सुझाव साझा करें और देश-विदेश के स्वतंत्र दुकानदारों से जुड़ें।',
    'Start Discussion': 'नई चर्चा शुरू करें',
    'Ask a Question': 'सवाल पूछें',
    'Search discussions or questions...': 'चर्चाएं या सवाल खोजें...',
    'All Topics': 'सभी विषय',
    'Announcements': 'महत्वपूर्ण घोषणाएं',
    'Getting Started': 'शुरुआत करें',
    'Payments & Soundbox': 'पेमेंट्स और साउंडबॉक्स',
    'Inventory & Godown': 'इन्वेंटरी और गोदाम',
    'Domains & DNS': 'डोमेन और डीएनएस',
    'Storefront Design': 'दुकान का डिजाइन',
    'Local SEO': 'स्थानीय खोज (लोकल एसईओ)',
    'Verified Merchant': 'सत्यापित दुकानदार',
    'Staff Verified': 'फेरासेतु टीम द्वारा सत्यापित',
    'Reply': 'जवाब दें',
    'Replies': 'जवाब',
    'Upvote': 'उपयोगी',
    'Share': 'शेयर करें',
    'Weekly Merchant Spotlight': 'सप्ताह का श्रेष्ठ दुकानदार',
    'Local Neighborhood': 'स्थानीय इलाका',
    'Translated to': 'में अनुवादित',
    'View original': 'मूल संदेश देखें',
    'Show translation': 'अनुवाद देखें',
    'Auto-translated (Context-aware retail engine)': 'स्वचालित अनुवाद (दुकानदार संदर्भ इंजन)',
    'Translating discussions to your language...': 'आपकी भाषा में अनुवाद किया जा रहा है...',
    'Community Questions & Discussions': 'समुदाय के सवाल और चर्चाएं',
    'Write a reply to help this merchant...': 'इस दुकानदार की मदद के लिए जवाब लिखें...',
    'Post Reply': 'जवाब भेजें',
    'Cancel': 'रद्द करें',
    'Just now': 'अभी-अभी'
  },
  ta: {
    'Merchant Community & Knowledge Hub': 'வணிகர் சமூகம் & அறிவு மையம்',
    'Start Discussion': 'விவாதத்தைத் தொடங்குங்கள்',
    'Ask a Question': 'கேள்வி கேட்கவும்',
    'Search discussions or questions...': 'விவாதங்களைத் தேடுங்கள்...',
    'All Topics': 'அனைத்து தலைப்புகள்',
    'Announcements': 'அறிவிப்புகள்',
    'Getting Started': 'தொடங்குதல்',
    'Payments & Soundbox': 'கொடுப்பనவுகள் & சவுண்ட்பாக்ஸ்',
    'Domains & DNS': 'டொமைன்கள் & டிஎன்எஸ்',
    'Verified Merchant': 'சரிபார்க்கப்பட்ட வியாபாரி',
    'Staff Verified': 'குழுவால் சரிபார்க்கப்பட்டது',
    'Reply': 'பதிலளிக்கவும்',
    'Replies': 'பதில்கள்',
    'Upvote': 'பயனுள்ளது',
    'Share': 'பகிரவும்',
    'View original': 'அசல் காண்க',
    'Show translation': 'மொழிபெயர்ப்பைக் காண்க',
    'Just now': 'சற்று முன்'
  }
};

/**
 * Get cached translation synchronously from memory, offline dict, or localStorage
 */
export function getCachedTranslation(
  text: string,
  targetLang: string,
  context = 'retail',
  sourceLang?: string
): string | null {
  if (!text || !text.trim()) return text;

  const resolvedSource = sourceLang || detectScriptLanguage(text, 'en');
  if (resolvedSource === targetLang) return text;

  const trimmed = text.trim();
  const cacheKey = computeCacheKey(resolvedSource, targetLang, context, trimmed);

  // 1. Memory cache
  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey)!;
  }

  // 2. Offline dictionary
  if (resolvedSource === 'en' && OFFLINE_DICTIONARY[targetLang]?.[trimmed]) {
    const val = OFFLINE_DICTIONARY[targetLang][trimmed];
    MEMORY_CACHE.set(cacheKey, val);
    return val;
  }

  // 3. LocalStorage cache
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      MEMORY_CACHE.set(cacheKey, stored);
      return stored;
    }
  } catch {
    // Ignore storage quota / security errors
  }

  return null;
}

/**
 * Flush pending translation queue to worker API in batched HTTP calls
 */
async function flushQueue() {
  if (PENDING_QUEUE.length === 0) return;

  const currentBatch = [...PENDING_QUEUE];
  PENDING_QUEUE.length = 0;

  // Group by sourceLang ::: targetLang ::: context
  const groups: Record<string, TranslationRequestItem[]> = {};
  for (const item of currentBatch) {
    const sLang = item.sourceLang || detectScriptLanguage(item.text, 'en');
    const groupKey = `${sLang}:::${item.targetLang}:::${item.context || 'retail'}`;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  }

  for (const [groupKey, items] of Object.entries(groups)) {
    const [sourceLang, targetLang, context] = groupKey.split(':::');
    const texts = items.map(it => it.text);

    if (sourceLang === targetLang) {
      items.forEach(it => it.resolve(it.text));
      continue;
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts,
          targetLang,
          sourceLang,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translations: string[] = data.translations || [];

      items.forEach((item, idx) => {
        const trans = translations[idx] || item.text;
        const cacheKey = computeCacheKey(sourceLang, targetLang, context, item.text);
        MEMORY_CACHE.set(cacheKey, trans);
        try {
          localStorage.setItem(cacheKey, trans);
        } catch {
          // ignore
        }
        item.resolve(trans);
      });
    } catch (err) {
      items.forEach(item => {
        const fallback = (sourceLang === 'en' ? OFFLINE_DICTIONARY[targetLang]?.[item.text.trim()] : undefined) || item.text;
        item.resolve(fallback);
      });
    }
  }
}

/**
 * Dynamic, context-aware asynchronous translate function
 */
export function translateTextAsync(
  text: string,
  targetLang: string,
  context = 'retail',
  sourceLang?: string
): Promise<string> {
  if (!text || !text.trim()) {
    return Promise.resolve(text);
  }

  const resolvedSource = sourceLang || detectScriptLanguage(text, 'en');
  if (resolvedSource === targetLang) {
    return Promise.resolve(text);
  }

  const cached = getCachedTranslation(text, targetLang, context, resolvedSource);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return new Promise<string>((resolve, reject) => {
    PENDING_QUEUE.push({
      id: Math.random().toString(36).substring(7),
      text,
      targetLang,
      sourceLang: resolvedSource,
      context,
      resolve,
      reject
    });

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushQueue, DEBOUNCE_MS);
  });
}

/**
 * Batch translation function for arrays of strings
 * Supports bidirectional translation (e.g. Telugu to English, English to Telugu).
 */
export async function translateBatchAsync(
  texts: string[],
  targetLang: string,
  context = 'retail',
  defaultSourceLang?: string
): Promise<string[]> {
  if (!texts || texts.length === 0) {
    return texts;
  }

  const results = new Array<string>(texts.length);
  const uncachedMap: Array<{ origIdx: number; text: string; sourceLang: string }> = [];

  texts.forEach((t, i) => {
    const sLang = defaultSourceLang || detectScriptLanguage(t, 'en');
    if (sLang === targetLang) {
      results[i] = t;
      return;
    }

    const cached = getCachedTranslation(t, targetLang, context, sLang);
    if (cached !== null) {
      results[i] = cached;
    } else {
      uncachedMap.push({ origIdx: i, text: t, sourceLang: sLang });
    }
  });

  if (uncachedMap.length === 0) {
    return results;
  }

  // Group by sourceLang
  const bySource: Record<string, Array<{ origIdx: number; text: string }>> = {};
  for (const item of uncachedMap) {
    if (!bySource[item.sourceLang]) bySource[item.sourceLang] = [];
    bySource[item.sourceLang].push({ origIdx: item.origIdx, text: item.text });
  }

  for (const [sourceLang, items] of Object.entries(bySource)) {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: items.map(it => it.text),
          targetLang,
          sourceLang,
          context
        })
      });

      if (response.ok) {
        const data = await response.json();
        const translations: string[] = data.translations || [];

        items.forEach((item, j) => {
          const trans = translations[j] || item.text;
          results[item.origIdx] = trans;

          const cacheKey = computeCacheKey(sourceLang, targetLang, context, item.text);
          MEMORY_CACHE.set(cacheKey, trans);
          try {
            localStorage.setItem(cacheKey, trans);
          } catch {
            // ignore
          }
        });
        continue;
      }
    } catch (err) {
      console.warn('[FeraSetu Pipeline] Batch fetch error for source ' + sourceLang, err);
    }

    // Fallback
    items.forEach((item) => {
      results[item.origIdx] = (sourceLang === 'en' ? OFFLINE_DICTIONARY[targetLang]?.[item.text.trim()] : undefined) || item.text;
    });
  }

  return results;
}

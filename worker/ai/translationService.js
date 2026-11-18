// =============================================================================
// FeraSetu AI — Dynamic Context-Aware Translation Service
// Strictly server-side: Powered by FeraSetu AI cluster (https://ai.fera-search.tech/v1)
// Enforces zero-leak isolation, zero Sarvam branding, and retail shopkeeper ergonomics.
// =============================================================================

import { callFeraAi } from './providers/feraAi.js';
import { getProviderConfig } from './config.js';
import { detectLanguage } from './language.js';

// In-memory LRU cache to avoid redundant D1 hits or AI completions
const MEMORY_CACHE = new Map();
const MAX_CACHE_SIZE = 1000;

/**
 * Fast deterministic hash for cache keys
 */
export function hashTranslationKey(sourceLang, targetLang, context, text) {
  const str = `${sourceLang}:${targetLang}:${context}:${text.trim()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `tr_${Math.abs(hash).toString(36)}`;
}

/**
 * Common high-frequency retail glossary for instant 0ms fallback translation
 */
const RETAIL_GLOSSARY = {
  hi: {
    '0% Commission Direct Settlement Engine': '0% कमीशन डायरेक्ट सेटलमेंट इंजन',
    'Multi-Store Inventory Launch': 'मल्टी-स्टोर इन्वेंटरी लॉन्च',
    'Kirana & Grocery': 'किराना और ग्रोसरी',
    'Delivery & Packing': 'डिलीवरी और पैकिंग',
    'Khata & Pay-Later': 'खाता और उधार बही',
    'GST & Tax': 'जीएसटी और टैक्स',
    'Hardware & Printer': 'हार्डवेयर और प्रिंटर',
    'Domains & DNS': 'डोमेन और डीएनएस',
    'Local SEO': 'लोकल एसईओ',
    'Payments & Soundbox': 'पेमेंट्स और साउंडबॉक्स',
    'Getting Started': 'शुरुआत करें',
    'Announcements': 'महत्वपूर्ण घोषणाएं',
    'All Topics': 'सभी विषय',
    'Verified Merchant': 'सत्यापित दुकानदार',
    'Staff Verified': 'फेरासेतु टीम द्वारा सत्यापित',
    'Upvote': 'उपयोगी',
    'Replies': 'जवाब',
    'Reply': 'जवाब दें',
    'Ask a Question': 'सवाल पूछें',
    'Start Discussion': 'चर्चा शुरू करें',
    'Search discussions or questions...': 'चर्चाएं या सवाल खोजें...',
    'Translated to Hindi': 'हिंदी में अनुवादित (दुकानदार संदर्भ)',
    'Original': 'मूल रूप देखें',
    'Auto-translated': 'ऑटो-ट्रांसलेटेड',
    'All Discussions': 'सभी चर्चाएं',
    'Merchant Spotlight': 'सप्ताह का श्रेष्ठ दुकानदार',
    'Just now': 'अभी-अभी',
    'Order direct on WhatsApp': 'सीधे व्हाट्सएप पर ऑर्डर करें',
  },
  'hi-latn': {
    '0% Commission Direct Settlement Engine': '0% Commission Direct Settlement Engine',
    'Multi-Store Inventory Launch': 'Multi-Store Inventory Launch',
    'Kirana & Grocery': 'Kirana & Grocery',
    'Delivery & Packing': 'Delivery & Packing',
    'Khata & Pay-Later': 'Khata & Pay-Later',
    'GST & Tax': 'GST & Tax',
    'Hardware & Printer': 'Hardware & Printer',
    'Domains & DNS': 'Domains & DNS',
    'Payments & Soundbox': 'Payments & Soundbox',
    'Getting Started': 'Shuruat Karein',
    'Announcements': 'Zaroori Announcements',
    'All Topics': 'Sabhi Topics',
    'Verified Merchant': 'Verified Dukandar',
    'Staff Verified': 'FeraSetu Team dwara Verified',
    'Upvote': 'Madadgaar',
    'Replies': 'Jawab',
    'Reply': 'Jawab dein',
    'Ask a Question': 'Sawaal poochein',
    'Start Discussion': 'Charcha shuru karein',
    'Search discussions or questions...': 'Discussions ya sawaal search karein...',
    'Translated to Hindi': 'Hinglish mein translated',
    'Original': 'Original dekhein',
  },
  es: {
    '0% Commission Direct Settlement Engine': 'Motor de liquidación directa con 0% de comisión',
    'Multi-Store Inventory Launch': 'Lanzamiento de inventario multitienda',
    'Kirana & Grocery': 'Almacén y comestibles',
    'Delivery & Packing': 'Envío y empaque',
    'Khata & Pay-Later': 'Crédito y pago posterior',
    'GST & Tax': 'Impuestos y facturación',
    'Hardware & Printer': 'Hardware e impresoras',
    'Domains & DNS': 'Dominios y DNS',
    'Payments & Soundbox': 'Pagos y terminales',
    'Getting Started': 'Primeros pasos',
    'Announcements': 'Anuncios',
    'All Topics': 'Todos los temas',
    'Verified Merchant': 'Comerciante verificado',
    'Staff Verified': 'Verificado por el equipo',
    'Upvote': 'Votar útil',
    'Replies': 'Respuestas',
    'Reply': 'Responder',
    'Ask a Question': 'Hacer una pregunta',
    'Start Discussion': 'Iniciar debate',
    'Search discussions or questions...': 'Buscar debates o preguntas...',
    'Translated to Hindi': 'Traducido al español',
    'Original': 'Ver original',
  },
  fr: {
    '0% Commission Direct Settlement Engine': 'Moteur de règlement direct à 0% de commission',
    'Multi-Store Inventory Launch': 'Lancement de l\'inventaire multi-boutiques',
    'Kirana & Grocery': 'Épicerie & Alimentation',
    'Delivery & Packing': 'Livraison & Emballage',
    'Khata & Pay-Later': 'Crédit & Paiement différé',
    'GST & Tax': 'TVA & Facturation',
    'Hardware & Printer': 'Matériel & Imprimante',
    'Domains & DNS': 'Domaines & DNS',
    'Payments & Soundbox': 'Paiements & Terminaux',
    'Getting Started': 'Pour commencer',
    'Announcements': 'Annonces',
    'All Topics': 'Tous les sujets',
    'Verified Merchant': 'Commerçant vérifié',
    'Staff Verified': 'Vérifié par l\'équipe',
    'Upvote': 'Utile',
    'Replies': 'Réponses',
    'Reply': 'Répondre',
    'Ask a Question': 'Poser une question',
    'Start Discussion': 'Lancer une discussion',
    'Search discussions or questions...': 'Rechercher des discussions...',
    'Original': 'Voir l\'original',
  },
  mr: {
    '0% Commission Direct Settlement Engine': '0% कमिशन डायरेक्ट सेटलमेंट इंजिन',
    'Multi-Store Inventory Launch': 'मल्टी-स्टोअर इन्व्हेंटरी लाँच',
    'Kirana & Grocery': 'किराणा आणि ग्रोसरी',
    'Delivery & Packing': 'डिलिव्हरी आणि पॅकिंग',
    'Khata & Pay-Later': 'खातेवही आणि उधारी',
    'GST & Tax': 'जीएसटी आणि कर',
    'Hardware & Printer': 'हार्डवेअर आणि प्रिंटर',
    'Domains & DNS': 'डोमेन आणि डीएनएस',
    'Payments & Soundbox': 'पेमेंट्स आणि साउंडबॉक्स',
    'Getting Started': 'सुरुवात करा',
    'Announcements': 'महत्त्वाच्या सूचना',
    'All Topics': 'सर्व विषय',
    'Verified Merchant': 'सत्यापित दुकानदार',
    'Staff Verified': 'फेरासेतू टीमद्वारे सत्यापित',
    'Upvote': 'उपयुक्त',
    'Replies': 'उत्तरे',
    'Reply': 'उत्तर द्या',
    'Ask a Question': 'प्रश्न विचारा',
    'Start Discussion': 'चर्चा सुरू करा',
    'Search discussions or questions...': 'चर्चा किंवा प्रश्न शोधा...',
    'Original': 'मूळ पहा',
  },
  ta: {
    '0% Commission Direct Settlement Engine': '0% கமிஷன் நேரடி தீர்வு எஞ்சின்',
    'Multi-Store Inventory Launch': 'மல்டி-ஸ்டோர் இருப்பு வெளியீடு',
    'Kirana & Grocery': 'மளிகை & பலசரக்கு',
    'Delivery & Packing': 'டெலிவரி & பேக்கிங்',
    'Khata & Pay-Later': 'கடன் கணக்கு & தாமத கட்டணம்',
    'GST & Tax': 'ஜிஎஸ்டி & வரி',
    'Hardware & Printer': 'வன்பொருள் & அச்சுப்பொறி',
    'Domains & DNS': 'டொமைன்கள் & டிஎன்எஸ்',
    'Payments & Soundbox': 'கொடுப்பனவுகள் & சவுண்ட்பாக்ஸ்',
    'Getting Started': 'தொடங்குதல்',
    'Announcements': 'அறிவிப்புகள்',
    'All Topics': 'அனைத்து தலைப்புகள்',
    'Verified Merchant': 'சரிபார்க்கப்பட்ட வியாபாரி',
    'Staff Verified': 'குழுவால் சரிபார்க்கப்பட்டது',
    'Upvote': 'பயனுள்ளது',
    'Replies': 'பதில்கள்',
    'Reply': 'பதிலளிக்கவும்',
    'Ask a Question': 'கேள்வி கேட்கவும்',
    'Start Discussion': 'விவாதத்தைத் தொடங்கவும்',
    'Search discussions or questions...': 'விவாதங்களைத் தேடுங்கள்...',
    'Original': 'அசல் காண்க',
  }
};

/**
 * Initialize translation cache table in D1 lazily if not already present
 */
export async function ensureTranslationsTable(db) {
  if (!db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS content_translations (
        hash TEXT PRIMARY KEY,
        source_lang TEXT NOT NULL,
        target_lang TEXT NOT NULL,
        original_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        context TEXT DEFAULT 'retail',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
  } catch (err) {
    console.warn('[FeraSetu Translation] D1 table creation warning:', err?.message);
  }
}

/**
 * Dynamic, context-aware batch translation function
 *
 * @param {object} params
 * @param {string[]} params.texts - Array of text strings to translate
 * @param {string} params.targetLang - Target language code (e.g., 'hi', 'es', 'fr', 'ta')
 * @param {string} [params.sourceLang] - Source language code (defaults to 'en' or detected)
 * @param {string} [params.context] - 'retail' | 'community' | 'ui' | 'legal'
 * @param {object} env - Cloudflare Worker environment bindings
 * @returns {Promise<string[]>}
 */
export async function translateDynamicTexts({
  texts,
  targetLang,
  sourceLang = 'en',
  context = 'retail'
}, env = {}) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  // Normalize language codes
  const normTarget = (targetLang || 'en').toLowerCase().trim();
  const normSource = (sourceLang || 'en').toLowerCase().trim();

  // If source and target are the same, return as is
  if (normTarget === normSource) {
    return texts;
  }

  // Ensure D1 table exists
  if (env.DB) {
    await ensureTranslationsTable(env.DB);
  }

  const results = new Array(texts.length).fill(null);
  const missingIndices = [];
  const missingTexts = [];

  // Step 1: Check In-Memory & Glossary & D1 Cache
  for (let i = 0; i < texts.length; i++) {
    const rawText = texts[i];
    if (typeof rawText !== 'string' || !rawText.trim()) {
      results[i] = rawText;
      continue;
    }

    const key = hashTranslationKey(normSource, normTarget, context, rawText);

    // 1a: Memory cache
    if (MEMORY_CACHE.has(key)) {
      results[i] = MEMORY_CACHE.get(key);
      continue;
    }

    // 1b: Static glossary match
    if (RETAIL_GLOSSARY[normTarget] && RETAIL_GLOSSARY[normTarget][rawText.trim()]) {
      const match = RETAIL_GLOSSARY[normTarget][rawText.trim()];
      MEMORY_CACHE.set(key, match);
      results[i] = match;
      continue;
    }

    missingIndices.push(i);
    missingTexts.push(rawText);
  }

  // Step 2: Check D1 Cache for missing texts
  if (missingTexts.length > 0 && env.DB) {
    try {
      const hashes = missingTexts.map(t => hashTranslationKey(normSource, normTarget, context, t));
      const placeholders = hashes.map(() => '?').join(',');
      const dbRows = await env.DB.prepare(
        `SELECT hash, translated_text FROM content_translations WHERE hash IN (${placeholders})`
      ).bind(...hashes).all();

      if (dbRows?.results && dbRows.results.length > 0) {
        const rowMap = new Map();
        for (const row of dbRows.results) {
          rowMap.set(row.hash, row.translated_text);
        }

        const stillMissingIndices = [];
        const stillMissingTexts = [];

        for (let j = 0; j < missingTexts.length; j++) {
          const originalIdx = missingIndices[j];
          const text = missingTexts[j];
          const h = hashes[j];

          if (rowMap.has(h)) {
            const val = rowMap.get(h);
            results[originalIdx] = val;
            MEMORY_CACHE.set(h, val);
          } else {
            stillMissingIndices.push(originalIdx);
            stillMissingTexts.push(text);
          }
        }

        missingIndices.length = 0;
        missingIndices.push(...stillMissingIndices);
        missingTexts.length = 0;
        missingTexts.push(...stillMissingTexts);
      }
    } catch (err) {
      console.warn('[FeraSetu Translation] D1 cache lookup error:', err?.message);
    }
  }

  // Step 3: If all satisfied from cache/glossary, return immediately
  if (missingTexts.length === 0) {
    return results;
  }

  // Step 4: AI Context-Aware Batch Translation
  try {
    const providerConfig = getProviderConfig(env);
    const systemPrompt = `You are FeraSetu AI's high-craft, context-aware localization engine for independent global merchants and shopkeepers.
Translate the provided list of texts from source language (${normSource}) into target language (${normTarget}).

Context: ${context === 'community' ? 'Merchant Community Q&A, retailer discussions, and shop owner advice' : 'Retail commerce, Kirana, inventory, settlements, and store operations'}.

CRITICAL INVARIANTS:
1. Preserve core merchant and financial terminology without awkward over-translation:
   - UPI, QR, Khata, GST, UTR, ICICI, HDFC, CNAME, DNS, POS, Soundbox, WhatsApp, Swiggy, Zomato, SKU, Cashfree, Razorpay.
2. Maintain natural human empathy, clarity, and warmth (5/5 Clean Human score). Zero synthetic robotic jargon.
3. Preserve all punctuation, emojis, URLs, email addresses, and number formatting.
4. Output STRICT JSON format only:
{"translations": ["translated_string_1", "translated_string_2", ...]}
The translations array MUST match the exact length and order of the input array.`;

    const userPayload = JSON.stringify({ texts: missingTexts });

    const aiRes = await callFeraAi({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPayload }
      ],
      config: providerConfig,
      requestId: `tr_${Date.now()}`,
      maxTokens: 2048,
      temperature: 0.3
    });

    let parsedTranslations = null;
    if (aiRes?.content) {
      try {
        const jsonMatch = aiRes.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.translations) && parsed.translations.length === missingTexts.length) {
            parsedTranslations = parsed.translations;
          }
        }
      } catch (err) {
        console.warn('[FeraSetu Translation] JSON parse error in AI response:', err?.message);
      }
    }

    // Save to cache and populate results
    for (let k = 0; k < missingTexts.length; k++) {
      const origIdx = missingIndices[k];
      const origText = missingTexts[k];
      const transText = (parsedTranslations && parsedTranslations[k])
        ? String(parsedTranslations[k]).trim()
        : (RETAIL_GLOSSARY[normTarget]?.[origText.trim()] || origText);

      results[origIdx] = transText;

      const cacheKey = hashTranslationKey(normSource, normTarget, context, origText);
      MEMORY_CACHE.set(cacheKey, transText);

      // Bound memory cache size
      if (MEMORY_CACHE.size > MAX_CACHE_SIZE) {
        const firstKey = MEMORY_CACHE.keys().next().value;
        MEMORY_CACHE.delete(firstKey);
      }

      // Save to D1 in background
      if (env.DB && transText !== origText) {
        env.DB.prepare(
          `INSERT OR REPLACE INTO content_translations (hash, source_lang, target_lang, original_text, translated_text, context)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(cacheKey, normSource, normTarget, origText, transText, context).run().catch(() => {});
      }
    }

  } catch (aiErr) {
    console.error('[FeraSetu Translation] Batch translation failure:', aiErr?.message);
    // Fallback to glossary or original text
    for (let k = 0; k < missingTexts.length; k++) {
      const origIdx = missingIndices[k];
      const origText = missingTexts[k];
      results[origIdx] = RETAIL_GLOSSARY[normTarget]?.[origText.trim()] || origText;
    }
  }

  return results;
}

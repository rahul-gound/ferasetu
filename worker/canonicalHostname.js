// FeraSetu — Canonical Storefront URL & Hostname Generator
// ==============================================================
// Single source of truth for generating DNS-safe, collision-free,
// standardized merchant store URLs in the format:
//   shopname-city-district-state-1.ferasetu.com
//
// Complies with RFC 1035 / RFC 1123 DNS label rules:
// - Max 63 chars per label
// - Lowercase alphanumeric and single hyphens
// - No leading or trailing hyphens
// - Supports Unicode/Indian-language transliteration & state abbreviations

export const DEFAULT_BASE_DOMAIN = "ferasetu.com";

export const RESERVED_SUBDOMAINS = new Set([
  "api",
  "www",
  "app",
  "admin",
  "docs",
  "status",
  "mail",
  "support",
  "beta",
  "staging",
  "dev",
  "static",
  "assets",
  "cdn",
  "test",
  "demo",
]);

/**
 * Standard 2-letter state / Union Territory codes for India.
 */
export const INDIA_STATE_CODES = {
  "andhra pradesh": "ap",
  "arunachal pradesh": "ar",
  "assam": "as",
  "bihar": "br",
  "chhattisgarh": "cg",
  "goa": "ga",
  "gujarat": "gj",
  "haryana": "hr",
  "himachal pradesh": "hp",
  "jharkhand": "jh",
  "karnataka": "ka",
  "kerala": "kl",
  "madhya pradesh": "mp",
  "maharashtra": "mh",
  "manipur": "mn",
  "meghalaya": "ml",
  "mizoram": "mz",
  "nagaland": "nl",
  "odisha": "od",
  "orissa": "od",
  "punjab": "pb",
  "rajasthan": "rj",
  "sikkim": "sk",
  "tamil nadu": "tn",
  "telangana": "ts",
  "tripura": "tr",
  "uttar pradesh": "up",
  "uttarakhand": "uk",
  "west bengal": "wb",
  "delhi": "dl",
  "nct of delhi": "dl",
  "delhi nct": "dl",
  "national capital territory of delhi": "dl",
  "jammu and kashmir": "jk",
  "jammu & kashmir": "jk",
  "ladakh": "la",
  "puducherry": "py",
  "pondicherry": "py",
  "chandigarh": "ch",
  "andaman and nicobar": "an",
  "andaman & nicobar": "an",
  "lakshadweep": "ld",
  "dadra and nagar haveli": "dn",
  "daman and diu": "dn",
};

/**
 * Syllabic transliteration tables for Indian script characters (Devanagari, Gujarati, Bengali, Tamil, Telugu).
 */
const INDIC_CONSONANTS = {
  // Devanagari
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z", "ड़": "d", "ढ़": "dh", "फ़": "f",
  // Gujarati
  "ક": "k", "ખ": "kh", "ગ": "g", "ઘ": "gh", "ચ": "ch", "છ": "chh", "જ": "j", "ઝ": "jh",
  "ટ": "t", "ઠ": "th", "ડ": "d", "ઢ": "dh", "ણ": "n", "ત": "t", "થ": "th", "દ": "d", "ધ": "dh", "ન": "n",
  "પ": "p", "ફ": "ph", "બ": "b", "ભ": "bh", "મ": "m", "ય": "y", "ર": "r", "લ": "l", "વ": "v",
  "શ": "sh", "ષ": "sh", "સ": "s", "હ": "h", "ળ": "l",
  // Bengali
  "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
  "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "ny",
  "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n",
  "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
  "প": "p", "ফ": "ph", "ব": "b", "ভ": "bh", "ম": "m",
  "য": "j", "র": "r", "ল": "l", "শ": "sh", "\u09B7": "sh", "স": "s", "হ": "h",
  // Tamil
  "க": "k", "ங": "ng", "ச": "s", "ஞ": "ny", "ட": "t", "ண": "n", "த": "th", "ந": "n",
  "ப": "p", "ம": "m", "ய": "y", "ர": "r", "ல": "l", "வ": "v", "ழ": "zh", "ள": "l", "ற": "r", "ன": "n",
  // Telugu
  "క": "k", "ఖ": "kh", "గ": "g", "ఘ": "gh", "చ": "ch", "ఛ": "chh", "జ": "j", "ఝ": "jh",
  "ట": "t", "ఠ": "th", "డ": "d", "ఢ": "dh", "ణ": "n", "త": "t", "థ": "th", "ద": "d", "ధ": "dh", "న": "n",
  "ప": "p", "ఫ": "ph", "బ": "b", "భ": "bh", "మ": "m", "య": "y", "ర": "r", "ల": "l", "వ": "v",
  "శ": "sh", "ష": "sh", "స": "s", "హ": "h",
};

const INDIC_MATRAS = {
  // Devanagari
  "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
  // Gujarati
  "ા": "a", "િ": "i", "ી": "ee", "ુ": "u", "ૂ": "oo", "ે": "e", "ૈ": "ai", "ો": "o", "ૌ": "au",
  // Bengali
  "া": "a", "ি": "i", "ী": "ee", "ু": "u", "ূ": "oo", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
  // Tamil
  "ா": "aa", "ி": "i", "ீ": "ee", "ு": "u", "ூ": "oo", "ெ": "e", "ே": "ee", "ை": "ai", "ொ": "o", "ோ": "oo", "ௌ": "au",
  // Telugu
  "ా": "aa", "ి": "i", "ీ": "ee", "ు": "u", "ూ": "oo", "ె": "e", "ే": "ee", "ై": "ai", "ొ": "o", "ో": "oo", "ౌ": "au",
};

const INDIC_VOWELS = {
  // Devanagari
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
  // Gujarati
  "અ": "a", "આ": "aa", "ઇ": "i", "ઈ": "ee", "ઉ": "u", "ઊ": "oo", "એ": "e", "ઐ": "ai", "ઓ": "o", "ઔ": "au",
  // Bengali
  "অ": "o", "আ": "a", "ই": "i", "ঈ": "ee", "উ": "u", "ঊ": "oo", "ঋ": "ri", "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
  // Tamil
  "அ": "a", "ஆ": "aa", "இ": "i", "ஈ": "ee", "உ": "u", "ஊ": "oo", "எ": "e", "ஏ": "ee", "ஐ": "ai", "ஒ": "o", "ஓ": "oo", "ஔ": "au",
  // Telugu
  "అ": "a", "ఆ": "aa", "ఇ": "i", "ఈ": "ee", "ఉ": "u", "ఊ": "oo", "ఎ": "e", "ఏ": "ee", "ఐ": "ai", "ఒ": "o", "ఓ": "oo", "ఔ": "au",
};

const INDIC_HALANTS = new Set(["\u094D", "\u0ACD", "\u09CD", "\u0A4D", "\u0BCD", "\u0C4D"]);
const INDIC_NASALS = { "ं": "n", "ँ": "n", "ં": "n", "ং": "ng", "ः": "h", "ઃ": "h" };

/**
 * Transliterates Unicode Indian-language scripts into readable phonetic Latin characters.
 */
export function transliterateIndic(str) {
  if (!str || typeof str !== "string") return "";
  const chars = Array.from(str);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];
    if (INDIC_CONSONANTS[c]) {
      const base = INDIC_CONSONANTS[c];
      if (next && INDIC_HALANTS.has(next)) {
        out += base;
      } else if (next && INDIC_MATRAS[next]) {
        out += base;
      } else if (!next || next === " " || !INDIC_CONSONANTS[next]) {
        out += base;
      } else {
        out += base + "a";
      }
    } else if (INDIC_HALANTS.has(c)) {
      // halant suppresses consonant vowel; skip
    } else if (INDIC_MATRAS[c]) {
      out += INDIC_MATRAS[c];
    } else if (INDIC_VOWELS[c]) {
      out += INDIC_VOWELS[c];
    } else if (INDIC_NASALS[c]) {
      out += INDIC_NASALS[c];
    } else {
      out += c;
    }
  }
  return out;
}

export const transliterateIndicToAscii = transliterateIndic;

/**
 * Normalizes input text into a DNS-safe label component:
 * - Decomposes diacritics
 * - Transliterates Indian script characters
 * - Converts to lowercase
 * - Replaces punctuation, spaces, and special symbols with hyphens
 * - Collapses consecutive hyphens
 * - Strips leading/trailing hyphens
 */
export function normalizeDnsText(str) {
  if (!str || typeof str !== "string") return "";

  // 1. Transliterate known Indian language scripts
  const transliterated = transliterateIndic(str);

  // 2. Unicode NFKD decomposition (strips accents, umlauts, combining marks)
  const decomposed = transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  // 3. Lowercase & replace non-alphanumeric chars with hyphen
  const slug = decomposed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug;
}

/**
 * Normalizes a state code or state name into a clean 2-letter state abbreviation.
 */
export function normalizeStateCode(state) {
  if (!state || typeof state !== "string") return "";
  const cleaned = state.trim().toLowerCase();

  // If already a 2-letter alphabetic string, treat as direct state code
  if (/^[a-z]{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Lookup in Indian states mapping
  if (INDIA_STATE_CODES[cleaned]) {
    return INDIA_STATE_CODES[cleaned];
  }

  // Otherwise normalize as standard DNS text (truncated to max 6 chars for brevity)
  const normalized = normalizeDnsText(cleaned);
  return normalized.slice(0, 6).replace(/-+$/, "");
}

export const getStateCode = normalizeStateCode;
export const sanitizeDnsLabelPart = normalizeDnsText;

/**
 * Generates the canonical subdomain label (without domain) from components:
 * [shopname]-[city]-[district]-[state]-[counter]
 *
 * Enforces RFC 1035 DNS label limit: strictly <= 63 characters.
 */
export function generateCanonicalSubdomain({
  shopName,
  city = null,
  district = null,
  state = null,
  counter = 1,
}) {
  const normShop = normalizeDnsText(shopName) || "store";
  const normCity = normalizeDnsText(city);
  const normDistrict = normalizeDnsText(district);
  const normState = normalizeStateCode(state);

  // Filter out missing/empty location parts
  const parts = [normShop, normCity, normDistrict, normState].filter(Boolean);
  let baseSlug = parts.join("-");

  // If after normalization the base slug is empty or starts with invalid char, fallback
  if (!baseSlug || !/^[a-z0-9]/.test(baseSlug)) {
    baseSlug = "store";
  }

  // Suffix formatting
  const countNum = Number.parseInt(String(counter), 10);
  const safeCount = !Number.isNaN(countNum) && countNum >= 1 ? countNum : 1;
  const suffix = `-${safeCount}`;

  // Enforce max 63 characters total for the DNS label
  const maxBaseLength = 63 - suffix.length;
  if (baseSlug.length > maxBaseLength) {
    baseSlug = baseSlug.slice(0, maxBaseLength).replace(/-+$/, "");
  }

  // Ensure base slug isn't empty after truncation
  if (!baseSlug) {
    baseSlug = "store";
  }

  let fullSubdomain = `${baseSlug}${suffix}`;

  // Ensure minimum 3 characters
  if (fullSubdomain.length < 3) {
    fullSubdomain = `store${suffix}`;
  }

  return fullSubdomain;
}

/**
 * Validates whether a given subdomain conforms strictly to the canonical format:
 * - 3 to 63 chars
 * - Lowercase alphanumeric and hyphens
 * - Cannot begin or end with a hyphen
 * - No consecutive hyphens
 */
export function isValidCanonicalSubdomain(subdomain) {
  if (!subdomain || typeof subdomain !== "string") return false;
  const lower = subdomain.toLowerCase();
  if (lower.length < 3 || lower.length > 63) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lower);
}

/**
 * Generates the full canonical storefront object:
 * {
 *   subdomain: "my-fashion-store-mumbai-andheri-mh-1",
 *   hostname: "my-fashion-store-mumbai-andheri-mh-1.ferasetu.com",
 *   storeUrl: "https://my-fashion-store-mumbai-andheri-mh-1.ferasetu.com",
 *   emailSender: "noreply@my-fashion-store-mumbai-andheri-mh-1.ferasetu.com",
 *   baseDomain: "ferasetu.com"
 * }
 */
export function generateCanonicalStorefront({
  shopName,
  city = null,
  district = null,
  state = null,
  counter = 1,
  baseDomain = DEFAULT_BASE_DOMAIN,
}) {
  const domain = (baseDomain || DEFAULT_BASE_DOMAIN).toLowerCase().trim();
  const subdomain = generateCanonicalSubdomain({
    shopName,
    city,
    district,
    state,
    counter,
  });

  const hostname = `${subdomain}.${domain}`;
  const storeUrl = `https://${hostname}`;
  const emailSender = `noreply@${hostname}`;

  return {
    subdomain,
    hostname,
    storeUrl,
    emailSender,
    baseDomain: domain,
  };
}

/**
 * Finds the next available collision-free subdomain by incrementing counter from 1 upward.
 *
 * @param {Object} input - { shopName, city, district, state, baseDomain }
 * @param {Set<string>|Array<string>|Function} existingChecker - Set of taken subdomains or async/sync predicate function (subdomain) => boolean
 * @param {number} maxAttempts - Safety loop ceiling
 * @returns {Promise<Object>} Storefront details with untaken subdomain
 */
export async function findNextAvailableStorefront(
  arg1,
  arg2,
  maxAttempts = 500
) {
  let input, existingChecker;
  if (arg1 && typeof arg1.prepare === "function") {
    existingChecker = arg1;
    input = arg2;
  } else if (arg2 && typeof arg2.prepare === "function") {
    input = arg1;
    existingChecker = arg2;
  } else if (arg1 && typeof arg1 === "object" && (arg1.shopName !== undefined || arg1.name !== undefined)) {
    input = arg1;
    existingChecker = arg2;
  } else {
    existingChecker = arg1;
    input = arg2;
  }

  input = input || {};

  const checkIsTaken = async (subdomain, hostname) => {
    if (existingChecker && typeof existingChecker.prepare === "function") {
      try {
        const row = await existingChecker
          .prepare("SELECT id FROM users WHERE LOWER(subdomain) = ? OR LOWER(hostname) = ? LIMIT 1")
          .bind(subdomain, hostname)
          .first();
        return Boolean(row);
      } catch {
        return false;
      }
    }
    if (typeof existingChecker === "function") {
      return await existingChecker(subdomain, hostname);
    }
    if (existingChecker instanceof Set) {
      return existingChecker.has(subdomain) || existingChecker.has(hostname);
    }
    if (Array.isArray(existingChecker)) {
      return existingChecker.includes(subdomain) || existingChecker.includes(hostname);
    }
    return false;
  };

  let counter = 1;
  while (counter <= maxAttempts) {
    const candidate = generateCanonicalStorefront({
      ...input,
      counter,
    });

    const isTaken = await Promise.resolve(checkIsTaken(candidate.subdomain, candidate.hostname));
    if (!isTaken) {
      return candidate;
    }
    counter++;
  }

  // Fallback if loop exceeded (very high collision volume): append short random salt
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return generateCanonicalStorefront({
    ...input,
    counter: `${counter}-${randomSuffix}`,
  });
}

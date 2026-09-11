// FeraSetu — Canonical Storefront URL & Hostname Generator (Frontend Utility)
// ===========================================================================
// Mirror of the server canonical generator for client-side formatting,
// local-mock offline database, and display helpers.

export const DEFAULT_BASE_DOMAIN = 'ferasetu.com';

export interface StorefrontInput {
  shopName: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  counter?: number | string | null;
  baseDomain?: string | null;
}

export interface StorefrontResult {
  subdomain: string;
  hostname: string;
  storeUrl: string;
  emailSender: string;
  baseDomain: string;
}

export const RESERVED_SUBDOMAINS = new Set([
  'api',
  'www',
  'app',
  'admin',
  'docs',
  'status',
  'mail',
  'support',
  'beta',
  'staging',
  'dev',
  'static',
  'assets',
  'cdn',
  'test',
  'demo',
]);

export const INDIA_STATE_CODES: Record<string, string> = {
  'andhra pradesh': 'ap',
  'arunachal pradesh': 'ar',
  'assam': 'as',
  'bihar': 'br',
  'chhattisgarh': 'cg',
  'goa': 'ga',
  'gujarat': 'gj',
  'haryana': 'hr',
  'himachal pradesh': 'hp',
  'jharkhand': 'jh',
  'karnataka': 'ka',
  'kerala': 'kl',
  'madhya pradesh': 'mp',
  'maharashtra': 'mh',
  'manipur': 'mn',
  'meghalaya': 'ml',
  'mizoram': 'mz',
  'nagaland': 'nl',
  'odisha': 'od',
  'orissa': 'od',
  'punjab': 'pb',
  'rajasthan': 'rj',
  'sikkim': 'sk',
  'tamil nadu': 'tn',
  'telangana': 'ts',
  'tripura': 'tr',
  'uttar pradesh': 'up',
  'uttarakhand': 'uk',
  'west bengal': 'wb',
  'delhi': 'dl',
  'nct of delhi': 'dl',
  'delhi nct': 'dl',
  'national capital territory of delhi': 'dl',
  'jammu and kashmir': 'jk',
  'jammu & kashmir': 'jk',
  'ladakh': 'la',
  'puducherry': 'py',
  'pondicherry': 'py',
  'chandigarh': 'ch',
  'andaman and nicobar': 'an',
  'andaman & nicobar': 'an',
  'lakshadweep': 'ld',
  'dadra and nagar haveli': 'dn',
  'daman and diu': 'dn',
};

const INDIC_CONSONANTS: Record<string, string> = {
  // Devanagari
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f',
  // Gujarati
  'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh',
  'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n', 'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
  'પ': 'p', 'ફ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm', 'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v',
  'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h', 'ળ': 'l',
  // Bengali
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ध': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', '\u09B7': 'sh', 'স': 's', 'হ': 'h',
  // Tamil
  'க': 'k', 'ங': 'ng', 'ச': 's', 'ஞ': 'ny', 'ட': 't', 'ண': 'n', 'த': 'th', 'ந': 'n',
  'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r', 'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
  // Telugu
  'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh',
  'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n', 'త': 't', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n',
  'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm', 'య': 'y', 'ర': 'r', 'ల': 'l', 'వ': 'v',
  'శ': 'sh', 'ష': 'sh', 'స': 's', 'హ': 'h',
};

const INDIC_MATRAS: Record<string, string> = {
  // Devanagari
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  // Gujarati
  'ા': 'a', 'િ': 'i', 'ી': 'ee', 'ુ': 'u', 'ૂ': 'oo', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au',
  // Bengali
  'া': 'a', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
  // Tamil
  'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo', 'ெ': 'e', 'ே': 'ee', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au',
  // Telugu
  'ா': 'aa', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo', 'ె': 'e', 'ే': 'ee', 'ై': 'ai', 'ొ': 'o', 'ో': 'oo', 'ౌ': 'au',
};

const INDIC_VOWELS: Record<string, string> = {
  // Devanagari
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  // Gujarati
  'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au',
  // Bengali
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'ee', 'উ': 'u', 'ঊ': 'oo', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  // Tamil
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo', 'எ': 'e', 'ஏ': 'ee', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
  // Telugu
  'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo', 'ఎ': 'e', 'ఏ': 'ee', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'oo', 'ఔ': 'au',
};

const INDIC_HALANTS = new Set(['\u094D', '\u0ACD', '\u09CD', '\u0A4D', '\u0BCD', '\u0C4D']);
const INDIC_NASALS: Record<string, string> = { 'ं': 'n', 'ँ': 'n', 'ં': 'n', 'ং': 'ng', 'ः': 'h', 'ઃ': 'h' };

export function transliterateIndic(str: string): string {
  if (!str || typeof str !== 'string') return '';
  const chars = Array.from(str);
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];
    if (INDIC_CONSONANTS[c]) {
      const base = INDIC_CONSONANTS[c];
      if (next && INDIC_HALANTS.has(next)) {
        out += base;
      } else if (next && INDIC_MATRAS[next]) {
        out += base;
      } else if (!next || next === ' ' || !INDIC_CONSONANTS[next]) {
        out += base;
      } else {
        out += base + 'a';
      }
    } else if (INDIC_HALANTS.has(c)) {
      // skip
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

export function normalizeDnsText(str?: string | null): string {
  if (!str || typeof str !== 'string') return '';
  const transliterated = transliterateIndic(str);
  const decomposed = transliterated
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  return decomposed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeStateCode(state?: string | null): string {
  if (!state || typeof state !== 'string') return '';
  const cleaned = state.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(cleaned)) {
    return cleaned;
  }
  if (INDIA_STATE_CODES[cleaned]) {
    return INDIA_STATE_CODES[cleaned];
  }
  const normalized = normalizeDnsText(cleaned);
  return normalized.slice(0, 6).replace(/-+$/, '');
}

export const getStateCode = normalizeStateCode;
export const sanitizeDnsLabelPart = normalizeDnsText;

export function generateCanonicalSubdomain(input: StorefrontInput): string {
  const normShop = normalizeDnsText(input.shopName) || 'store';
  const normCity = normalizeDnsText(input.city);
  const normDistrict = normalizeDnsText(input.district);
  const normState = normalizeStateCode(input.state);

  const parts = [normShop, normCity, normDistrict, normState].filter(Boolean);
  let baseSlug = parts.join('-');

  if (!baseSlug || !/^[a-z0-9]/.test(baseSlug)) {
    baseSlug = 'store';
  }

  const countNum = parseInt(String(input.counter ?? 1), 10);
  const safeCount = !isNaN(countNum) && countNum >= 1 ? countNum : 1;
  const suffix = `-${safeCount}`;

  const maxBaseLength = 63 - suffix.length;
  if (baseSlug.length > maxBaseLength) {
    baseSlug = baseSlug.slice(0, maxBaseLength).replace(/-+$/, '');
  }

  if (!baseSlug) {
    baseSlug = 'store';
  }

  let fullSubdomain = `${baseSlug}${suffix}`;
  if (fullSubdomain.length < 3) {
    fullSubdomain = `store${suffix}`;
  }

  return fullSubdomain;
}

export function isValidCanonicalSubdomain(subdomain?: string | null): boolean {
  if (!subdomain || typeof subdomain !== 'string') return false;
  const lower = subdomain.toLowerCase();
  if (lower.length < 3 || lower.length > 63) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lower);
}

export function generateCanonicalStorefront(input: StorefrontInput): StorefrontResult {
  const defaultDomain = import.meta.env?.VITE_BASE_DOMAIN || DEFAULT_BASE_DOMAIN;
  const domain = (input.baseDomain || defaultDomain).toLowerCase().trim();
  const subdomain = generateCanonicalSubdomain(input);
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
 * Returns the merchant's public storefront URL from user profile data.
 * Falls back gracefully if hostname is not yet generated.
 */
export function getStorefrontUrl(user?: { hostname?: string; subdomain?: string; custom_domain?: string } | null): string {
  if (!user) return 'https://ferasetu.com';
  if (user.custom_domain) {
    return `https://${user.custom_domain}`;
  }
  if (user.hostname) {
    return `https://${user.hostname}`;
  }
  if (user.subdomain) {
    return `https://${user.subdomain}.ferasetu.com`;
  }
  return 'https://ferasetu.com';
}

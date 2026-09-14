// worker/routes/geo.js
/**
 * Canonical Pricing & Geo-Region Configuration for Cloudflare Worker
 * Server-authoritative source of truth for regional pricing, currency,
 * gateway assignment, and smart language detection.
 */

export const EU_COUNTRY_CODES = [
  "FR", "DE", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI",
  "GR", "LU", "CY", "MT", "SK", "SI", "EE", "LV", "LT"
];

export const REGIONAL_CONFIGS = {
  IN: {
    region: "IN",
    name: "India",
    currency: "INR",
    symbol: "₹",
    gateway: "cashfree",
    permanentFreePlan: true,
    trialDays: 14,
    plans: {
      free: {
        id: "free",
        name: "Free",
        price: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
        monthlyCredits: 20,
        isFree: true,
      },
      business: {
        id: "business",
        name: "Business",
        price: { monthly: 399, yearly: 3990, yearlyPerMonth: 332 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: "pro",
        name: "Pro",
        price: { monthly: 999, yearly: 9990, yearlyPerMonth: 832 },
        monthlyCredits: 1000,
        isFree: false,
      },
    },
  },
  US: {
    region: "US",
    name: "United States",
    currency: "USD",
    symbol: "$",
    gateway: "stripe",
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: "starter",
        name: "Starter",
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 50,
        isFree: false,
      },
      growth: {
        id: "growth",
        name: "Growth",
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      business: {
        id: "business",
        name: "Business",
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: "pro",
        name: "Pro",
        price: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
      scale: {
        id: "scale",
        name: "Scale",
        price: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
        monthlyCredits: 3000,
        isFree: false,
      },
    },
  },
  EU: {
    region: "EU",
    name: "Europe",
    currency: "EUR",
    symbol: "€",
    gateway: "stripe",
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: "starter",
        name: "Starter",
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 50,
        isFree: false,
      },
      growth: {
        id: "growth",
        name: "Growth",
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      business: {
        id: "business",
        name: "Business",
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: "pro",
        name: "Pro",
        price: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
      scale: {
        id: "scale",
        name: "Scale",
        price: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
        monthlyCredits: 3000,
        isFree: false,
      },
    },
  },
  OTHER: {
    region: "OTHER",
    name: "Global",
    currency: "USD",
    symbol: "$",
    gateway: "stripe",
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: "starter",
        name: "Starter",
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 50,
        isFree: false,
      },
      growth: {
        id: "growth",
        name: "Growth",
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      business: {
        id: "business",
        name: "Business",
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: "pro",
        name: "Pro",
        price: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
      scale: {
        id: "scale",
        name: "Scale",
        price: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
        monthlyCredits: 3000,
        isFree: false,
      },
    },
  },
};

/**
 * Indian State / UT Code -> Scheduled Language Code mapping
 */
export const INDIAN_STATE_TO_LANG = {
  // Southern Dravidian languages
  TN: "ta", // Tamil Nadu -> Tamil
  PY: "ta", // Puducherry -> Tamil
  KL: "ml", // Kerala -> Malayalam
  LD: "ml", // Lakshadweep -> Malayalam
  KA: "kn", // Karnataka -> Kannada
  AP: "te", // Andhra Pradesh -> Telugu
  TG: "te", // Telangana -> Telugu
  TS: "te", // Telangana (alt code) -> Telugu

  // Western & Central languages
  MH: "mr", // Maharashtra -> Marathi
  GJ: "gu", // Gujarat -> Gujarati
  DN: "gu", // Dadra and Nagar Haveli -> Gujarati
  DD: "gu", // Daman and Diu -> Gujarati
  GA: "gom", // Goa -> Konkani

  // Eastern languages
  WB: "bn", // West Bengal -> Bengali
  TR: "bn", // Tripura -> Bengali
  AN: "bn", // Andaman & Nicobar -> Bengali
  OR: "or", // Odisha -> Odia
  OD: "or", // Odisha (alt code) -> Odia
  AS: "as", // Assam -> Assamese
  BR: "mai", // Bihar -> Maithili (or Hindi fallback)
  JH: "sat", // Jharkhand -> Santali (or Hindi fallback)
  MN: "mni", // Manipur -> Manipuri
  SK: "ne", // Sikkim -> Nepali

  // Northern languages
  PB: "pa", // Punjab -> Punjabi
  JK: "ks", // Jammu & Kashmir -> Kashmiri / Urdu / Dogri
  LA: "ur", // Ladakh -> Urdu

  // Hindi Belt
  UP: "hi", // Uttar Pradesh -> Hindi
  MP: "hi", // Madhya Pradesh -> Hindi
  RJ: "hi", // Rajasthan -> Hindi
  HR: "hi", // Haryana -> Hindi
  HP: "hi", // Himachal Pradesh -> Hindi
  UT: "hi", // Uttarakhand -> Hindi
  UK: "hi", // Uttarakhand (alt code) -> Hindi
  DL: "hi", // Delhi -> Hindi
  CH: "pa", // Chandigarh -> Punjabi / Hindi
  CT: "hi", // Chhattisgarh -> Hindi
  CG: "hi", // Chhattisgarh (alt code) -> Hindi
};

/**
 * Indian State name (lowercase normalize) -> Language mapping
 */
export const INDIAN_STATE_NAME_TO_LANG = {
  "tamil nadu": "ta",
  puducherry: "ta",
  pondicherry: "ta",
  kerala: "ml",
  karnataka: "kn",
  "andhra pradesh": "te",
  telangana: "te",
  maharashtra: "mr",
  gujarat: "gu",
  goa: "gom",
  "west bengal": "bn",
  tripura: "bn",
  odisha: "or",
  orissa: "or",
  assam: "as",
  bihar: "mai",
  jharkhand: "sat",
  manipur: "mni",
  sikkim: "ne",
  punjab: "pa",
  "jammu and kashmir": "ks",
  "jammu & kashmir": "ks",
  ladakh: "ur",
  "uttar pradesh": "hi",
  "madhya pradesh": "hi",
  rajasthan: "hi",
  haryana: "hi",
  "himachal pradesh": "hi",
  uttarakhand: "hi",
  delhi: "hi",
  "nct of delhi": "hi",
  chandigarh: "pa",
  chhattisgarh: "hi",
};

/**
 * EU Country Code -> Primary Official Language mapping
 */
export const EU_COUNTRY_TO_LANG = {
  FR: "fr",
  DE: "de",
  AT: "de",
  ES: "es",
  IT: "it",
  NL: "nl",
  BE: "nl",
  PT: "pt",
  PL: "pl",
  SE: "sv",
  DK: "da",
  FI: "fi",
  GR: "el",
  CY: "el",
  CZ: "cs",
  RO: "ro",
  HU: "hu",
  IE: "en-gb",
  BG: "bg",
  HR: "hr",
  EE: "et",
  LV: "lv",
  LT: "lt",
  MT: "mt",
  SK: "sk",
  SI: "sl",
  LU: "fr",
};

export function resolvePricingRegion(countryCode) {
  if (!countryCode) return "IN";
  const clean = countryCode.toUpperCase().trim();
  if (clean === "IN") return "IN";
  if (clean === "US") return "US";
  if (EU_COUNTRY_CODES.includes(clean)) return "EU";
  return "OTHER";
}

export function resolveSuggestedLanguage(country, subdivision, subdivisionCode, acceptLanguage) {
  // 1. If India, attempt high-precision state resolution
  if (country === "IN") {
    if (subdivisionCode && INDIAN_STATE_TO_LANG[subdivisionCode]) {
      return INDIAN_STATE_TO_LANG[subdivisionCode];
    }
    if (subdivision) {
      const normalizedSub = subdivision.toLowerCase().trim();
      if (INDIAN_STATE_NAME_TO_LANG[normalizedSub]) {
        return INDIAN_STATE_NAME_TO_LANG[normalizedSub];
      }
    }
    return "hi"; // Hindi fallback for India
  }

  // 2. If EU country, map to official language
  if (country && EU_COUNTRY_TO_LANG[country]) {
    return EU_COUNTRY_TO_LANG[country];
  }

  // 3. Check Accept-Language header if available
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.split(";")[0]?.trim().toLowerCase();
    const primaryCode = primary?.split("-")[0];
    if (primaryCode && primaryCode !== "en") {
      return primaryCode;
    }
  }

  return "en";
}

/**
 * Handles GET /api/geo
 */
export async function handleGeoRoute(request, env) {
  const headers = request.headers;
  const cf = request.cf || {};

  // 1. Resolve country (CF-IPCountry, cf object, x-user-country, default to 'IN')
  const cfCountry = headers.get("cf-ipcountry") || cf.country;
  const userCountryHeader = headers.get("x-user-country");
  const effectiveCountry = (userCountryHeader || cfCountry || "IN").toUpperCase().trim();

  // 2. Resolve region and regional pricing config
  const region = resolvePricingRegion(effectiveCountry);
  const regionalConfig = REGIONAL_CONFIGS[region] || REGIONAL_CONFIGS.IN;

  // 3. Resolve subdivision and subdivision code
  const cfRegion = headers.get("cf-region") || cf.region;
  const cfRegionCode = headers.get("cf-region-code") || headers.get("x-user-region-code") || cf.regionCode;
  const userRegionHeader = headers.get("x-user-region");

  const rawSubdivision = (cfRegion || userRegionHeader || "").trim();
  const rawSubdivisionCode = (
    cfRegionCode ||
    (userRegionHeader && userRegionHeader.length <= 3 ? userRegionHeader : "")
  ).trim().toUpperCase();

  const city = headers.get("cf-ipcity") || cf.city || undefined;

  // 4. Resolve suggested language
  const suggestedLanguage = resolveSuggestedLanguage(
    effectiveCountry,
    rawSubdivision,
    rawSubdivisionCode,
    headers.get("accept-language")
  );

  return {
    country: effectiveCountry,
    region,
    subdivision: rawSubdivision || undefined,
    subdivisionCode: rawSubdivisionCode || undefined,
    city,
    suggestedLanguage,
    name: regionalConfig.name,
    currency: regionalConfig.currency,
    symbol: regionalConfig.symbol,
    gateway: regionalConfig.gateway,
    permanentFreePlan: regionalConfig.permanentFreePlan,
    trialDays: regionalConfig.trialDays,
    plans: regionalConfig.plans,
  };
}

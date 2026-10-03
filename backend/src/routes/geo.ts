// backend/src/routes/geo.ts
import { Router, Request, Response } from 'express';
import {
  resolvePricingRegion,
  REGIONAL_CONFIGS,
  type PricingRegion,
} from '../config/pricing';
import { verifyToken } from '../services/authService';

const router = Router();

/**
 * @route   GET /api/geo
 * @desc    Server-authoritative country & market pricing region detection
 * @access  Public
 */
router.get('/', (req: Request, res: Response): void => {
  // 1. Check Cloudflare Edge IP Country header (case-insensitive in Express)
  const cfCountry = req.headers['cf-ipcountry'] as string | undefined;
  const userCountryHeader = req.headers['x-user-country'] as string | undefined;
  const clientCountry = (userCountryHeader || cfCountry || 'US').toUpperCase().trim();

  // 2. Check explicit user preference from cookie or query param
  let cookieMarket: string | undefined;
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|; )fera_market=([^;]*)/);
    if (match) cookieMarket = decodeURIComponent(match[1]);
  }
  const queryMarket = (req.query.market as string | undefined)?.toUpperCase().trim();

  // 3. If user provides a Bearer token, check their stored account market
  let accountMarket: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.substring(7));
    if (payload && typeof (payload as any).market === 'string') {
      accountMarket = (payload as any).market;
    }
  }

  const savedPreference = queryMarket || cookieMarket || accountMarket;
  const region: PricingRegion = resolvePricingRegion(clientCountry, savedPreference);
  const regionalConfig = REGIONAL_CONFIGS[region] || REGIONAL_CONFIGS.GLOBAL;

  // 4. Check subdivision/region headers (Cloudflare CF-Region, CF-Region-Code, or test x-user-region)
  const cfRegion = req.headers['cf-region'] as string | undefined;
  const cfRegionCode = (req.headers['cf-region-code'] || req.headers['x-user-region-code']) as string | undefined;
  const userRegionHeader = req.headers['x-user-region'] as string | undefined;
  const rawSubdivision = (cfRegion || userRegionHeader || '').trim();
  const rawSubdivisionCode = (cfRegionCode || (userRegionHeader && userRegionHeader.length <= 3 ? userRegionHeader : '')).trim().toUpperCase();

  // 5. Resolve suggested language based on country, subdivision and Accept-Language (separate from commercial market)
  const suggestedLanguage = resolveSuggestedLanguage(
    clientCountry,
    rawSubdivision,
    rawSubdivisionCode,
    req.headers['accept-language'] as string | undefined
  );

  res.json({
    country: clientCountry,
    market: region,
    region,
    subdivision: rawSubdivision || undefined,
    subdivisionCode: rawSubdivisionCode || undefined,
    suggestedLanguage,
    name: regionalConfig.name,
    currency: regionalConfig.currency,
    symbol: regionalConfig.symbol,
    gateway: regionalConfig.gateway,
    subscriptionGateway: regionalConfig.subscriptionGateway,
    supportedMerchantProviders: regionalConfig.supportedMerchantProviders,
    permanentFreePlan: regionalConfig.permanentFreePlan,
    trialDays: regionalConfig.trialDays,
    plans: regionalConfig.plans,
  });
});

/**
 * Indian State / UT Code -> Scheduled Language Code mapping
 */
const INDIAN_STATE_TO_LANG: Record<string, string> = {
  // Southern Dravidian languages
  TN: 'ta', // Tamil Nadu -> Tamil
  PY: 'ta', // Puducherry -> Tamil
  KL: 'ml', // Kerala -> Malayalam
  LD: 'ml', // Lakshadweep -> Malayalam
  KA: 'kn', // Karnataka -> Kannada
  AP: 'te', // Andhra Pradesh -> Telugu
  TG: 'te', // Telangana -> Telugu
  TS: 'te', // Telangana (alt code) -> Telugu

  // Western & Central languages
  MH: 'mr', // Maharashtra -> Marathi
  GJ: 'gu', // Gujarat -> Gujarati
  DN: 'gu', // Dadra and Nagar Haveli -> Gujarati
  DD: 'gu', // Daman and Diu -> Gujarati
  GA: 'gom', // Goa -> Konkani

  // Eastern languages
  WB: 'bn', // West Bengal -> Bengali
  TR: 'bn', // Tripura -> Bengali
  AN: 'bn', // Andaman & Nicobar -> Bengali
  OR: 'or', // Odisha -> Odia
  OD: 'or', // Odisha (alt code) -> Odia
  AS: 'as', // Assam -> Assamese
  BR: 'mai', // Bihar -> Maithili (or Hindi fallback)
  JH: 'sat', // Jharkhand -> Santali (or Hindi fallback)
  MN: 'mni', // Manipur -> Manipuri
  SK: 'ne', // Sikkim -> Nepali

  // Northern languages
  PB: 'pa', // Punjab -> Punjabi
  JK: 'ks', // Jammu & Kashmir -> Kashmiri / Urdu / Dogri
  LA: 'ur', // Ladakh -> Urdu

  // Hindi Belt
  UP: 'hi', // Uttar Pradesh -> Hindi
  MP: 'hi', // Madhya Pradesh -> Hindi
  RJ: 'hi', // Rajasthan -> Hindi
  HR: 'hi', // Haryana -> Hindi
  HP: 'hi', // Himachal Pradesh -> Hindi
  UT: 'hi', // Uttarakhand -> Hindi
  UK: 'hi', // Uttarakhand (alt code) -> Hindi
  DL: 'hi', // Delhi -> Hindi
  CH: 'pa', // Chandigarh -> Punjabi / Hindi
  CT: 'hi', // Chhattisgarh -> Hindi
  CG: 'hi', // Chhattisgarh (alt code) -> Hindi
};

/**
 * Indian State name (lowercase normalize) -> Language mapping
 */
const INDIAN_STATE_NAME_TO_LANG: Record<string, string> = {
  'tamil nadu': 'ta',
  puducherry: 'ta',
  pondicherry: 'ta',
  kerala: 'ml',
  karnataka: 'kn',
  'andhra pradesh': 'te',
  telangana: 'te',
  maharashtra: 'mr',
  gujarat: 'gu',
  goa: 'gom',
  'west bengal': 'bn',
  tripura: 'bn',
  odisha: 'or',
  orissa: 'or',
  assam: 'as',
  bihar: 'mai',
  jharkhand: 'sat',
  manipur: 'mni',
  sikkim: 'ne',
  punjab: 'pa',
  'jammu and kashmir': 'ks',
  'jammu & kashmir': 'ks',
  ladakh: 'ur',
  'uttar pradesh': 'hi',
  'madhya pradesh': 'hi',
  rajasthan: 'hi',
  haryana: 'hi',
  'himachal pradesh': 'hi',
  uttarakhand: 'hi',
  delhi: 'hi',
  'nct of delhi': 'hi',
  chandigarh: 'pa',
  chhattisgarh: 'hi',
};

/**
 * Country Code -> Primary Official Language mapping
 */
const COUNTRY_TO_LANG: Record<string, string> = {
  FR: 'fr', // France -> French
  DE: 'de', // Germany -> German
  AT: 'de', // Austria -> German
  ES: 'es', // Spain -> Spanish
  IT: 'it', // Italy -> Italian
  NL: 'nl', // Netherlands -> Dutch
  BE: 'nl', // Belgium -> Dutch (or fr)
  PT: 'pt', // Portugal -> Portuguese
  PL: 'pl', // Poland -> Polish
  SE: 'sv', // Sweden -> Swedish
  DK: 'da', // Denmark -> Danish
  FI: 'fi', // Finland -> Finnish
  GR: 'el', // Greece -> Greek
  CY: 'el', // Cyprus -> Greek
  CZ: 'cs', // Czech Republic -> Czech
  RO: 'ro', // Romania -> Romanian
  HU: 'hu', // Hungary -> Hungarian
  IE: 'en', // Ireland -> English
  BG: 'bg', // Bulgaria -> Bulgarian
  HR: 'hr', // Croatia -> Croatian
  EE: 'et', // Estonia -> Estonian
  LV: 'lv', // Latvia -> Latvian
  LT: 'lt', // Lithuania -> Lithuanian
  MT: 'mt', // Malta -> Maltese
  SK: 'sk', // Slovakia -> Slovak
  SI: 'sl', // Slovenia -> Slovenian
  LU: 'fr', // Luxembourg -> French
  GB: 'en-gb', // United Kingdom -> English (GB)
  UK: 'en-gb', // UK alias -> English (GB)
  US: 'en', // United States -> English (US)
};

function resolveSuggestedLanguage(
  country: string,
  subdivision: string,
  subdivisionCode: string,
  acceptLanguage?: string
): string {
  // 1. If India, attempt state resolution
  if (country === 'IN') {
    if (subdivisionCode && INDIAN_STATE_TO_LANG[subdivisionCode]) {
      return INDIAN_STATE_TO_LANG[subdivisionCode];
    }
    if (subdivision) {
      const normalizedSub = subdivision.toLowerCase().trim();
      if (INDIAN_STATE_NAME_TO_LANG[normalizedSub]) {
        return INDIAN_STATE_NAME_TO_LANG[normalizedSub];
      }
    }
    return 'hi';
  }

  // 2. Specific country mapping
  if (COUNTRY_TO_LANG[country]) {
    return COUNTRY_TO_LANG[country];
  }

  // 3. Check Accept-Language header if available
  if (acceptLanguage) {
    const primary = acceptLanguage.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
    const primaryCode = primary?.split('-')[0];
    if (primaryCode && primaryCode !== 'en') {
      return primaryCode;
    }
  }

  // Default to English
  return 'en';
}

export default router;

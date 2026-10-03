// src/config/pricing.ts
/**
 * Canonical FeraSetu Market & Pricing Architecture
 * =================================================
 * Single authoritative source of truth for public markets, currencies,
 * regional pricing configurations, and market resolution.
 *
 * Markets:
 * - IN: India (INR ₹, en-IN, Permanent Free plan, Cashfree gateway)
 * - UK: United Kingdom (GBP £, en-GB, 14-day trial, Stripe gateway)
 * - US: United States (USD $, en-US, 14-day trial, Stripe gateway)
 * - EU: European Union (EUR €, en, 14-day trial, Stripe gateway)
 * - GLOBAL: Global International (USD $, en-US, 14-day trial, Stripe gateway)
 */

export type Market = 'IN' | 'UK' | 'US' | 'EU' | 'GLOBAL';
export type LegacyMarket = 'OTHER';
export type CurrencyCode = 'INR' | 'GBP' | 'USD' | 'EUR';

export const MARKET_STORAGE_KEY = 'fera_market';
export const MARKET_COOKIE_KEY = 'fera_market';
export const DEFAULT_MARKET: Market = 'GLOBAL';

/**
 * All 27 European Union (EU) sovereign member states (ISO 3166-1 alpha-2 codes).
 * Note: United Kingdom (GB) left the EU and is treated as a separate canonical market (UK).
 */
export const EU_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
] as const;

export const EU_COUNTRY_SET = new Set<string>(EU_COUNTRY_CODES);

export interface PlanPricingTier {
  monthly: number;
  yearly: number;
  yearlyPerMonth: number;
}

export type FeraSetuBillingGateway = 'cashfree';
export const FERASETU_SUBSCRIPTION_GATEWAY: FeraSetuBillingGateway = 'cashfree';

export type MerchantPaymentProvider = 'cashfree' | 'stripe' | 'razorpay' | 'paypal';

export interface MarketPricingConfig {
  market: Market;
  name: string;
  currency: CurrencyCode;
  symbol: string;
  flag: string;
  locale: string;
  pricingKey: 'india' | 'uk' | 'us' | 'eu' | 'global';
  permanentFreePlan: boolean;
  trialDays: number;
  taxNote: string;
  gateway: FeraSetuBillingGateway;
  subscriptionGateway: FeraSetuBillingGateway;
  supportedMerchantProviders: MerchantPaymentProvider[];
  plans: {
    free?: PlanPricingTier;
    starter?: PlanPricingTier;
    growth?: PlanPricingTier;
    business: PlanPricingTier;
    pro: PlanPricingTier;
    scale?: PlanPricingTier;
  };
}

export const MARKET_CONFIGS: Record<Market, MarketPricingConfig> = {
  IN: {
    market: 'IN',
    name: 'India',
    currency: 'INR',
    symbol: '₹',
    flag: '🇮🇳',
    locale: 'en-IN',
    pricingKey: 'india',
    permanentFreePlan: true,
    trialDays: 0,
    taxNote: 'Inclusive of GST where applicable',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['cashfree', 'razorpay', 'stripe'],
    plans: {
      free: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
      starter: { monthly: 199, yearly: 1990, yearlyPerMonth: 165.8 },
      growth: { monthly: 399, yearly: 3990, yearlyPerMonth: 332.5 },
      business: { monthly: 399, yearly: 3990, yearlyPerMonth: 332.5 },
      pro: { monthly: 999, yearly: 9990, yearlyPerMonth: 832.5 },
      scale: { monthly: 999, yearly: 9990, yearlyPerMonth: 832.5 },
    },
  },
  UK: {
    market: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    symbol: '£',
    flag: '🇬🇧',
    locale: 'en-GB',
    pricingKey: 'uk',
    permanentFreePlan: false,
    trialDays: 14,
    taxNote: 'Prices in GBP. VAT may apply',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['stripe', 'cashfree', 'paypal'],
    plans: {
      starter: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
      growth: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      business: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      pro: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
      scale: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
    },
  },
  US: {
    market: 'US',
    name: 'United States',
    currency: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    locale: 'en-US',
    pricingKey: 'us',
    permanentFreePlan: false,
    trialDays: 14,
    taxNote: 'Prices in USD. Local sales tax may apply',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['stripe', 'cashfree', 'paypal'],
    plans: {
      starter: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
      growth: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      business: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      pro: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
      scale: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
    },
  },
  EU: {
    market: 'EU',
    name: 'Europe',
    currency: 'EUR',
    symbol: '€',
    flag: '🇪🇺',
    locale: 'en',
    pricingKey: 'eu',
    permanentFreePlan: false,
    trialDays: 14,
    taxNote: 'Prices exclude EU VAT where applicable',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['stripe', 'cashfree', 'paypal'],
    plans: {
      starter: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
      growth: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      business: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      pro: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
      scale: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
    },
  },
  GLOBAL: {
    market: 'GLOBAL',
    name: 'Global',
    currency: 'USD',
    symbol: '$',
    flag: '🌐',
    locale: 'en-US',
    pricingKey: 'global',
    permanentFreePlan: false,
    trialDays: 14,
    taxNote: 'Prices in USD. International cards accepted',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['stripe', 'cashfree', 'paypal'],
    plans: {
      starter: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
      growth: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      business: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      pro: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
      scale: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
    },
  },
};

/**
 * Validate whether a string is a recognized canonical Market identifier.
 * Normalizes legacy alias 'OTHER' to 'GLOBAL'.
 */
export function isValidMarket(value: unknown): value is Market {
  if (typeof value !== 'string') return false;
  const upper = value.toUpperCase().trim();
  return upper === 'IN' || upper === 'UK' || upper === 'US' || upper === 'EU' || upper === 'GLOBAL' || upper === 'OTHER';
}

/**
 * Normalizes any market string or legacy alias to a canonical Market enum.
 */
export function normalizeMarket(value: unknown): Market {
  if (typeof value !== 'string') return DEFAULT_MARKET;
  const upper = value.toUpperCase().trim();
  if (upper === 'IN') return 'IN';
  if (upper === 'UK' || upper === 'GB') return 'UK';
  if (upper === 'US') return 'US';
  if (upper === 'EU') return 'EU';
  if (upper === 'GLOBAL' || upper === 'OTHER') return 'GLOBAL';
  return DEFAULT_MARKET;
}

/**
 * Centralized deterministic market resolver.
 *
 * Precedence Order (Strictly Deterministic):
 * 1. Explicit user-selected market preference (saved in cookie / localStorage)
 * 2. Account market preference (for authenticated users)
 * 3. Cloudflare visitor-country detection (CF-IPCountry / ISO country code)
 *    - IN -> IN
 *    - GB -> UK (IMPORTANT: GB is the ISO country code for United Kingdom)
 *    - US -> US
 *    - EU member states -> EU
 *    - Unknown / other -> GLOBAL
 * 4. GLOBAL fallback
 *
 * NOTE: Language and Google referral headers are NEVER used as country detectors.
 */
export function resolveMarket(
  countryOrOptions?:
    | string
    | null
    | {
        countryCode?: string | null;
        savedPreference?: string | null;
        accountMarket?: string | null;
        storedMarket?: string | null;
        locale?: string | null;
      },
  savedPreferenceParam?: string | null
): Market {
  let country: string | null = null;
  let savedPref: string | null = null;
  let accountMarket: string | null = null;

  if (typeof countryOrOptions === 'object' && countryOrOptions !== null) {
    country = countryOrOptions.countryCode || null;
    savedPref = countryOrOptions.savedPreference || countryOrOptions.storedMarket || null;
    accountMarket = countryOrOptions.accountMarket || null;
  } else if (typeof countryOrOptions === 'string') {
    country = countryOrOptions;
    savedPref = savedPreferenceParam || null;
  }

  // 1. Explicit user-selected preference wins unconditionally
  if (savedPref && isValidMarket(savedPref)) {
    return normalizeMarket(savedPref);
  }

  // 2. Existing valid account market for authenticated users
  if (accountMarket && isValidMarket(accountMarket)) {
    return normalizeMarket(accountMarket);
  }

  // Check browser cookie / localStorage if running clientside
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const cookieMarket = getMarketCookie();
    if (cookieMarket && isValidMarket(cookieMarket)) {
      return normalizeMarket(cookieMarket);
    }
    try {
      const stored = localStorage.getItem(MARKET_STORAGE_KEY);
      if (stored && isValidMarket(stored)) {
        return normalizeMarket(stored);
      }
    } catch {}
  }

  // 3. Cloudflare visitor-country detection
  if (country) {
    const clean = country.toUpperCase().trim();
    if (clean === 'IN') return 'IN';
    // IMPORTANT: GB is the ISO 3166-1 alpha-2 code for United Kingdom. Also tolerate 'UK' alias.
    if (clean === 'GB' || clean === 'UK') return 'UK';
    if (clean === 'US') return 'US';
    if (EU_COUNTRY_SET.has(clean)) return 'EU';
    return 'GLOBAL';
  }

  // 4. Default global fallback
  return DEFAULT_MARKET;
}

/**
 * Read the current market preference from document cookies.
 */
export function getMarketCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const matches = document.cookie.match(new RegExp(`(?:^|; )${MARKET_COOKIE_KEY}=([^;]*)`));
    return matches ? decodeURIComponent(matches[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Persist the explicit user market preference across both Cookie and localStorage.
 * Cookie ensures edge worker requests carry the preference; localStorage ensures SPA persistence.
 */
export function setMarketCookie(market: Market): void {
  const norm = normalizeMarket(market);
  if (typeof document !== 'undefined') {
    try {
      // 1 year max-age, secure Lax cookie for public domain
      document.cookie = `${MARKET_COOKIE_KEY}=${norm}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MARKET_STORAGE_KEY, norm);
    } catch {}
  }
}

export function getMarketConfig(market: Market = DEFAULT_MARKET): MarketPricingConfig {
  const normalized = normalizeMarket(market);
  return MARKET_CONFIGS[normalized] || MARKET_CONFIGS.GLOBAL;
}

export function getTrialPolicy(market: Market = DEFAULT_MARKET): {
  hasPermanentFree: boolean;
  trialDays: number;
  trialBadge: string;
  ctaText: string;
  trustCopy: string;
} {
  const cfg = getMarketConfig(market);
  if (cfg.permanentFreePlan) {
    return {
      hasPermanentFree: true,
      trialDays: 0,
      trialBadge: 'Permanent Free Plan',
      ctaText: 'Start Free',
      trustCopy: 'Start free. Upgrade when you need more. No credit card required.',
    };
  }

  return {
    hasPermanentFree: false,
    trialDays: cfg.trialDays,
    trialBadge: `${cfg.trialDays}-Day Free Trial`,
    ctaText: `Start ${cfg.trialDays}-day free trial`,
    trustCopy: `${cfg.trialDays} days free. No surprise charges. Cancel anytime.`,
  };
}

export function formatMarketPrice(amount: number, market: Market = DEFAULT_MARKET): string {
  const cfg = getMarketConfig(market);
  if (market === 'IN') {
    return `${cfg.symbol}${amount.toLocaleString('en-IN')}`;
  }
  if (market === 'UK') {
    return `${cfg.symbol}${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (market === 'EU') {
    return `${cfg.symbol}${amount.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${cfg.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Legacy Compatibility
// ---------------------------------------------------------------------------
export interface PlanDetails {
  currency: 'INR' | 'GBP' | 'EUR' | 'USD';
  symbol: string;
  starterPrice: string;
  starterPeriod: string;
  proPrice: string;
  proPeriod: string;
  trialDays: number;
  gateway: FeraSetuBillingGateway;
  taxNote: string;
}

export function getRegionalPricing(countryCode?: string | null): PlanDetails {
  const market = resolveMarket(countryCode);
  const cfg = getMarketConfig(market);

  if (market === 'IN') {
    return {
      currency: 'INR',
      symbol: '₹',
      starterPrice: '0',
      starterPeriod: 'Forever Free',
      proPrice: '499',
      proPeriod: '/month',
      trialDays: 0,
      gateway: 'cashfree',
      taxNote: cfg.taxNote,
    };
  }

  return {
    currency: cfg.currency,
    symbol: cfg.symbol,
    starterPrice: String(cfg.plans.business.monthly),
    starterPeriod: '/month',
    proPrice: String(cfg.plans.pro.monthly),
    proPeriod: '/month',
    trialDays: cfg.trialDays,
    gateway: cfg.gateway,
    taxNote: cfg.taxNote,
  };
}

// src/config/pricing.ts
import { EU_COUNTRY_CODES } from '../lib/i18n';

export type Market = 'IN' | 'US' | 'EU' | 'OTHER';
export type CurrencyCode = 'INR' | 'USD' | 'EUR';

export interface PlanPricingTier {
  monthly: number;
  yearly: number;
  yearlyPerMonth: number;
}

export interface MarketPricingConfig {
  market: Market;
  name: string;
  currency: CurrencyCode;
  symbol: string;
  flag: string;
  permanentFreePlan: boolean;
  trialDays: number;
  taxNote: string;
  gateway: 'cashfree' | 'razorpay' | 'stripe';
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
    permanentFreePlan: true,
    trialDays: 0,
    taxNote: 'Inclusive of GST where applicable',
    gateway: 'cashfree',
    plans: {
      free: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
      business: { monthly: 399, yearly: 3990, yearlyPerMonth: 332 },
      pro: { monthly: 999, yearly: 9990, yearlyPerMonth: 832 },
    },
  },
  US: {
    market: 'US',
    name: 'United States',
    currency: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    permanentFreePlan: false,
    trialDays: 14,
    taxNote: 'Prices in USD. Local sales tax may apply',
    gateway: 'stripe',
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
    permanentFreePlan: false,
    trialDays: 14,
    taxNote: 'Prices exclude EU VAT where applicable',
    gateway: 'stripe',
    plans: {
      starter: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
      growth: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      business: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      pro: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
      scale: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
    },
  },
  OTHER: {
    market: 'OTHER',
    name: 'International',
    currency: 'USD',
    symbol: '$',
    flag: '🌐',
    permanentFreePlan: false,
    trialDays: 14,
    taxNote: 'Prices in USD via Stripe Checkout',
    gateway: 'stripe',
    plans: {
      starter: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
      growth: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      business: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
      pro: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
      scale: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
    },
  },
};

export const DEFAULT_MARKET: Market = 'US';

/**
 * Resolve market from user context, local storage, or browser locale.
 * Priority:
 * 1. Explicit account market (if provided)
 * 2. User-selected market in localStorage
 * 3. Fallback based on language/timezone/country
 */
export function resolveMarket(options?: {
  accountMarket?: string | null;
  storedMarket?: string | null;
  locale?: string | null;
  countryCode?: string | null;
}): Market {
  // 1. Explicit account market
  if (options?.accountMarket) {
    const norm = options.accountMarket.toUpperCase().trim();
    if (norm === 'IN' || norm === 'US' || norm === 'EU' || norm === 'OTHER') return norm as Market;
  }

  // 2. User-selected market in localStorage
  if (options?.storedMarket) {
    const norm = options.storedMarket.toUpperCase().trim();
    if (norm === 'IN' || norm === 'US' || norm === 'EU' || norm === 'OTHER') return norm as Market;
  }

  // 3. Country code if passed
  if (options?.countryCode) {
    const cc = options.countryCode.toUpperCase().trim();
    if (cc === 'IN') return 'IN';
    if ((EU_COUNTRY_CODES as readonly string[]).includes(cc)) return 'EU';
    if (cc === 'US') return 'US';
    return 'OTHER';
  }

  // 4. Locale inspection
  if (options?.locale) {
    const loc = options.locale.toLowerCase().trim();
    const indianLocales = ['hi', 'bn', 'mr', 'gu', 'ta', 'te', 'kn', 'ml', 'pa', 'or', 'as', 'ur', 'ne', 'sa', 'ks', 'gom', 'mai', 'brx', 'doi', 'mni', 'sd'];
    if (indianLocales.includes(loc) || loc.includes('-in')) return 'IN';

    const euLocales = ['fr', 'de', 'es', 'it', 'nl', 'pt', 'pl', 'sv', 'da', 'fi', 'el', 'cs', 'ro', 'hu', 'ga'];
    if (euLocales.includes(loc)) return 'EU';
  }

  // 5. Browser navigator inspection in browser environment
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    try {
      const stored = localStorage.getItem('fera_market');
      if (stored === 'IN' || stored === 'US' || stored === 'EU' || stored === 'OTHER') return stored;

      const langs = navigator.languages || [navigator.language || ''];
      for (const lang of langs) {
        const lower = lang.toLowerCase();
        if (lower.includes('-in') || lower === 'hi') return 'IN';
        if (lower.includes('-fr') || lower.includes('-de') || lower.includes('-es') || lower.includes('-it')) return 'EU';
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  // Global default commercial market is US
  return DEFAULT_MARKET;
}

export function getMarketConfig(market: Market = DEFAULT_MARKET): MarketPricingConfig {
  return MARKET_CONFIGS[market] || MARKET_CONFIGS.US;
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
  const locale = market === 'EU' ? 'de-DE' : 'en-US';
  return `${cfg.symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Legacy Compatibility
// ---------------------------------------------------------------------------
export interface PlanDetails {
  currency: 'INR' | 'EUR' | 'USD';
  symbol: string;
  starterPrice: string;
  starterPeriod: string;
  proPrice: string;
  proPeriod: string;
  trialDays: number;
  gateway: 'cashfree' | 'razorpay' | 'stripe';
  taxNote: string;
}

export function getRegionalPricing(countryCode?: string | null): PlanDetails {
  const market = resolveMarket({ countryCode });
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

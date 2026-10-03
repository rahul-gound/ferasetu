// backend/src/config/pricing.ts
/**
 * Canonical Pricing & Geo-Region Configuration (Backend)
 * =======================================================
 * Server-authoritative source of truth for regional pricing, currency,
 * gateway assignment, and plan validation.
 *
 * Regions / Markets:
 * - IN: India (INR ₹, Cashfree)
 * - UK: United Kingdom (GBP £, Stripe)
 * - US: United States (USD $, Stripe)
 * - EU: European Union (EUR €, Stripe)
 * - GLOBAL: Global International (USD $, Stripe)
 */

export type PricingRegion = 'IN' | 'UK' | 'US' | 'EU' | 'GLOBAL';
export type LegacyPricingRegion = 'OTHER';

/**
 * All 27 European Union (EU) sovereign member states (ISO 3166-1 alpha-2 codes).
 * Note: United Kingdom (GB) is separate with GBP currency.
 */
export const EU_COUNTRY_CODES = [
  'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI',
  'GR', 'LU', 'CY', 'MT', 'SK', 'SI', 'EE', 'LV', 'LT', 'SE',
  'DK', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR'
] as const;

export const EU_COUNTRY_SET = new Set<string>(EU_COUNTRY_CODES);

export interface PlanPricingTier {
  monthly: number;
  yearly: number;
  yearlyPerMonth: number;
}

export interface PlanDetails {
  id: string;
  name: string;
  price: PlanPricingTier;
  monthlyCredits: number;
  isFree: boolean;
}

export type FeraSetuBillingGateway = 'cashfree';
export const FERASETU_SUBSCRIPTION_GATEWAY: FeraSetuBillingGateway = 'cashfree';

export type MerchantPaymentProvider = 'cashfree' | 'stripe' | 'razorpay' | 'paypal';

export interface RegionalConfig {
  region: PricingRegion;
  name: string;
  currency: 'INR' | 'GBP' | 'USD' | 'EUR';
  symbol: string;
  gateway: FeraSetuBillingGateway;
  subscriptionGateway: FeraSetuBillingGateway;
  supportedMerchantProviders: MerchantPaymentProvider[];
  permanentFreePlan: boolean;
  trialDays: number;
  plans: Record<string, PlanDetails>;
}

export const REGIONAL_CONFIGS: Record<PricingRegion, RegionalConfig> = {
  IN: {
    region: 'IN',
    name: 'India',
    currency: 'INR',
    symbol: '₹',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['cashfree', 'razorpay', 'stripe'],
    permanentFreePlan: true,
    trialDays: 14,
    plans: {
      free: {
        id: 'free',
        name: 'Free',
        price: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
        monthlyCredits: 20,
        isFree: true,
      },
      starter: {
        id: 'starter',
        name: 'Starter',
        price: { monthly: 199, yearly: 1990, yearlyPerMonth: 165.8 },
        monthlyCredits: 50,
        isFree: false,
      },
      business: {
        id: 'business',
        name: 'Business',
        price: { monthly: 399, yearly: 3990, yearlyPerMonth: 332 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 999, yearly: 9990, yearlyPerMonth: 832 },
        monthlyCredits: 1000,
        isFree: false,
      },
    },
  },
  UK: {
    region: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    symbol: '£',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['stripe', 'cashfree', 'paypal'],
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 50,
        isFree: false,
      },
      growth: {
        id: 'growth',
        name: 'Growth',
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      business: {
        id: 'business',
        name: 'Business',
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
      scale: {
        id: 'scale',
        name: 'Scale',
        price: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
        monthlyCredits: 3000,
        isFree: false,
      },
    },
  },
  US: {
    region: 'US',
    name: 'United States',
    currency: 'USD',
    symbol: '$',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['stripe', 'cashfree', 'paypal'],
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 50,
        isFree: false,
      },
      growth: {
        id: 'growth',
        name: 'Growth',
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      business: {
        id: 'business',
        name: 'Business',
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
      scale: {
        id: 'scale',
        name: 'Scale',
        price: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
        monthlyCredits: 3000,
        isFree: false,
      },
    },
  },
  EU: {
    region: 'EU',
    name: 'Europe',
    currency: 'EUR',
    symbol: '€',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['stripe', 'cashfree', 'paypal'],
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 50,
        isFree: false,
      },
      growth: {
        id: 'growth',
        name: 'Growth',
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      business: {
        id: 'business',
        name: 'Business',
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
      scale: {
        id: 'scale',
        name: 'Scale',
        price: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
        monthlyCredits: 3000,
        isFree: false,
      },
    },
  },
  GLOBAL: {
    region: 'GLOBAL',
    name: 'Global',
    currency: 'USD',
    symbol: '$',
    gateway: FERASETU_SUBSCRIPTION_GATEWAY,
    subscriptionGateway: FERASETU_SUBSCRIPTION_GATEWAY,
    supportedMerchantProviders: ['stripe', 'cashfree', 'paypal'],
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 50,
        isFree: false,
      },
      growth: {
        id: 'growth',
        name: 'Growth',
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      business: {
        id: 'business',
        name: 'Business',
        price: { monthly: 39, yearly: 390, yearlyPerMonth: 32.5 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 79, yearly: 790, yearlyPerMonth: 65.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
      scale: {
        id: 'scale',
        name: 'Scale',
        price: { monthly: 179, yearly: 1790, yearlyPerMonth: 149.1 },
        monthlyCredits: 3000,
        isFree: false,
      },
    },
  },
};

/**
 * Maps country code (e.g. from CF-IPCountry header) to canonical PricingRegion / Market.
 * Precedence:
 * 1. Saved / explicit preference
 * 2. Country code mapping:
 *    - IN -> IN
 *    - GB -> UK (IMPORTANT: GB is the ISO country code for UK)
 *    - US -> US
 *    - EU country code -> EU
 *    - Other -> GLOBAL
 * 3. GLOBAL fallback
 */
export function resolvePricingRegion(countryCode?: string | null, savedPreference?: string | null): PricingRegion {
  if (savedPreference) {
    const normPref = savedPreference.toUpperCase().trim();
    if (normPref === 'IN' || normPref === 'UK' || normPref === 'US' || normPref === 'EU' || normPref === 'GLOBAL') {
      return normPref as PricingRegion;
    }
    if (normPref === 'OTHER') return 'GLOBAL';
  }

  if (!countryCode) return 'GLOBAL';
  const clean = countryCode.toUpperCase().trim();
  if (clean === 'IN') return 'IN';
  if (clean === 'GB' || clean === 'UK') return 'UK';
  if (clean === 'US') return 'US';
  if (EU_COUNTRY_SET.has(clean)) return 'EU';
  if (clean === 'GLOBAL' || clean === 'OTHER') return 'GLOBAL';
  return 'GLOBAL';
}

/**
 * Normalizes alias / legacy plan names to region-appropriate canonical plan.
 */
export function normalizePlanForRegion(plan: string, region: PricingRegion): string {
  const clean = String(plan || '').toLowerCase().trim();

  if (region === 'IN') {
    if (clean === 'free' || clean === 'beta' || clean === 'trial') return 'free';
    if (clean === 'starter' || clean === 'basic') return 'starter';
    if (clean === 'pro' || clean === 'premium' || clean === 'scale' || clean === 'enterprise') return 'pro';
    return 'business'; // default paid plan for IN
  }

  // Non-Indian regions (UK, US, EU, GLOBAL) do not have a permanent free tier
  if (clean === 'starter' || clean === 'basic') return 'starter';
  if (clean === 'scale' || clean === 'enterprise') return 'scale';
  if (clean === 'pro' || clean === 'premium') return 'pro';
  if (clean === 'growth' || clean === 'business' || clean === 'standard') return 'growth';
  return 'growth';
}

/**
 * Validates whether a requested plan is available in the specified region.
 */
export function validatePlanForRegion(plan: string, region: PricingRegion): {
  valid: boolean;
  canonicalPlan?: string;
  reason?: string;
} {
  const clean = String(plan || '').toLowerCase().trim();

  // India-only Free plan protection: non-IN accounts must never activate India Free plan.
  if ((clean === 'free' || clean === 'beta' || clean === 'trial') && region !== 'IN') {
    return {
      valid: false,
      reason: 'The Free tier is only available for merchants based in India. For your region, please select Starter, Business, or Pro.',
    };
  }

  const regionalConfig = REGIONAL_CONFIGS[region] || REGIONAL_CONFIGS.GLOBAL;
  const canonical = normalizePlanForRegion(clean, region);

  if (!regionalConfig.plans[canonical]) {
    return {
      valid: false,
      reason: `Plan "${plan}" is not available in region "${region}". Available plans: ${Object.keys(regionalConfig.plans).join(', ')}.`,
    };
  }

  return {
    valid: true,
    canonicalPlan: canonical,
  };
}

/**
 * Retrieves the authoritative price amount for a plan in a given region and billing cycle.
 */
export function getPlanAmount(
  plan: string,
  region: PricingRegion,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): number {
  const regionalConfig = REGIONAL_CONFIGS[region] || REGIONAL_CONFIGS.GLOBAL;
  const canonical = normalizePlanForRegion(plan, region);
  const planDetails = regionalConfig.plans[canonical];

  if (!planDetails) {
    throw new Error(`Plan "${plan}" not found in region "${region}"`);
  }

  return billingCycle === 'yearly' ? planDetails.price.yearly : planDetails.price.monthly;
}

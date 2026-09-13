// backend/src/config/pricing.ts
/**
 * Canonical Pricing & Geo-Region Configuration (Backend)
 * =======================================================
 * Server-authoritative source of truth for regional pricing, currency,
 * gateway assignment, and plan validation.
 */

export type PricingRegion = 'IN' | 'US' | 'EU' | 'OTHER';

export const EU_COUNTRY_CODES = [
  'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI',
  'GR', 'LU', 'CY', 'MT', 'SK', 'SI', 'EE', 'LV', 'LT'
] as const;

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

export interface RegionalConfig {
  region: PricingRegion;
  name: string;
  currency: 'INR' | 'USD' | 'EUR';
  symbol: string;
  gateway: 'cashfree' | 'razorpay' | 'stripe';
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
    gateway: 'cashfree',
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
  US: {
    region: 'US',
    name: 'United States',
    currency: 'USD',
    symbol: '$',
    gateway: 'stripe',
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: { monthly: 9, yearly: 90, yearlyPerMonth: 7.5 },
        monthlyCredits: 50,
        isFree: false,
      },
      business: {
        id: 'business',
        name: 'Business',
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 49, yearly: 490, yearlyPerMonth: 40.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
    },
  },
  EU: {
    region: 'EU',
    name: 'Europe',
    currency: 'EUR',
    symbol: '€',
    gateway: 'stripe',
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: { monthly: 9, yearly: 90, yearlyPerMonth: 7.5 },
        monthlyCredits: 50,
        isFree: false,
      },
      business: {
        id: 'business',
        name: 'Business',
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 49, yearly: 490, yearlyPerMonth: 40.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
    },
  },
  OTHER: {
    region: 'OTHER',
    name: 'Global',
    currency: 'USD',
    symbol: '$',
    gateway: 'stripe',
    permanentFreePlan: false,
    trialDays: 14,
    plans: {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: { monthly: 9, yearly: 90, yearlyPerMonth: 7.5 },
        monthlyCredits: 50,
        isFree: false,
      },
      business: {
        id: 'business',
        name: 'Business',
        price: { monthly: 19, yearly: 190, yearlyPerMonth: 15.8 },
        monthlyCredits: 200,
        isFree: false,
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 49, yearly: 490, yearlyPerMonth: 40.8 },
        monthlyCredits: 1000,
        isFree: false,
      },
    },
  },
};

/**
 * Maps country code (e.g. from CF-IPCountry header) to canonical PricingRegion.
 */
export function resolvePricingRegion(countryCode?: string | null): PricingRegion {
  if (!countryCode) return 'US';
  const clean = countryCode.toUpperCase().trim();
  if (clean === 'IN') return 'IN';
  if (clean === 'US') return 'US';
  if ((EU_COUNTRY_CODES as readonly string[]).includes(clean)) return 'EU';
  return 'OTHER';
}

/**
 * Normalizes alias / legacy plan names to region-appropriate canonical plan.
 */
export function normalizePlanForRegion(plan: string, region: PricingRegion): string {
  const clean = String(plan || '').toLowerCase().trim();

  if (region === 'IN') {
    if (clean === 'free' || clean === 'beta' || clean === 'trial') return 'free';
    if (clean === 'pro' || clean === 'premium' || clean === 'scale' || clean === 'enterprise') return 'pro';
    return 'business'; // default paid plan for IN
  }

  // Non-Indian regions (US, EU, OTHER) do not have a free tier
  if (clean === 'starter' || clean === 'basic') return 'starter';
  if (clean === 'pro' || clean === 'premium' || clean === 'scale' || clean === 'enterprise') return 'pro';
  return 'business';
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

  // India-only Free plan protection: US/EU/OTHER accounts must never activate India Free plan.
  if ((clean === 'free' || clean === 'beta' || clean === 'trial') && region !== 'IN') {
    return {
      valid: false,
      reason: 'The Free tier is only available for merchants based in India. For your region, please select Starter, Business, or Pro.',
    };
  }

  const regionalConfig = REGIONAL_CONFIGS[region] || REGIONAL_CONFIGS.US;
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
  const regionalConfig = REGIONAL_CONFIGS[region] || REGIONAL_CONFIGS.US;
  const canonical = normalizePlanForRegion(plan, region);
  const planDetails = regionalConfig.plans[canonical];

  if (!planDetails) {
    throw new Error(`Plan "${plan}" not found in region "${region}"`);
  }

  return billingCycle === 'yearly' ? planDetails.price.yearly : planDetails.price.monthly;
}

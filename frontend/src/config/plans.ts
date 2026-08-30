/**
 * FeraSetu Canonical Plan Configuration (Frontend)
 * ================================================
 * Single source of truth for all plan-related logic on the frontend.
 *
 * Tiers:
 * - Free: ₹0/mo, ₹0/yr (Acquisition tier)
 * - Business: ₹399/mo, ₹3,990/yr (Main growth tier - Most Popular)
 * - Pro: ₹999/mo, ₹9,990/yr (High-volume / scale tier)
 */

// ---------------------------------------------------------------------------
// Canonical Plan IDs
// ---------------------------------------------------------------------------

export type PlanId = 'free' | 'business' | 'pro';

/**
 * Legacy Plan Aliases Map
 * Normalizes all legacy backend/DB plan IDs to canonical 3-tier PlanId.
 */
export const LEGACY_PLAN_MAP: Record<string, PlanId> = {
  // Free tier aliases
  free: 'free',
  beta: 'free',
  trial: 'free',

  // Business tier aliases (mapped from basic, starter, standard, growth, business)
  business: 'business',
  growth: 'business',
  basic: 'business',
  starter: 'business',
  standard: 'business',

  // Pro tier aliases (mapped from pro, premium, scale, enterprise)
  pro: 'pro',
  premium: 'pro',
  scale: 'pro',
  enterprise: 'pro',
};

/**
 * Resolve any plan identifier (including legacy aliases) to a canonical PlanId.
 * Defaults to 'free' for unknown or empty values.
 */
export function normalizePlanId(plan: string | undefined | null): PlanId {
  if (!plan) return 'free';
  const clean = String(plan).toLowerCase().trim();
  return LEGACY_PLAN_MAP[clean] ?? 'free';
}

// ---------------------------------------------------------------------------
// Plan Pricing & A/B Experimentation Engine
// ---------------------------------------------------------------------------

export interface PlanPrice {
  monthly: number;        // INR per month
  yearly: number;         // INR per year (≈ 10 months price = 2 months free)
  yearlyPerMonth: number; // effective monthly rate when billed annually
}

/** Default canonical pricing */
export const PLAN_PRICES: Record<PlanId, PlanPrice> = {
  free: {
    monthly: 0,
    yearly: 0,
    yearlyPerMonth: 0,
  },
  business: {
    monthly: 399,
    yearly: 3990,
    yearlyPerMonth: 332,
  },
  pro: {
    monthly: 999,
    yearly: 9990,
    yearlyPerMonth: 832,
  },
};

/**
 * A/B Pricing Variants for Business Plan
 * Supports ₹299 vs ₹399 vs ₹499 experimentation.
 */
export const BUSINESS_PRICE_VARIANTS: Record<string, PlanPrice> = {
  variant_299: {
    monthly: 299,
    yearly: 2990,
    yearlyPerMonth: 249,
  },
  control_399: {
    monthly: 399,
    yearly: 3990,
    yearlyPerMonth: 332,
  },
  variant_499: {
    monthly: 499,
    yearly: 4990,
    yearlyPerMonth: 416,
  },
};

/**
 * Get Business plan price supporting A/B test variants.
 * Handles 'variant_299', 'variant_499', 'control_399', '299', '499', '399', etc.
 */
export function getBusinessPlanPrice(variant?: string | null): PlanPrice {
  if (!variant) return PLAN_PRICES.business;
  const key = variant.toLowerCase().trim();
  if (key === 'variant_299' || key === '299' || key === 'v299') {
    return BUSINESS_PRICE_VARIANTS.variant_299;
  }
  if (key === 'variant_499' || key === '499' || key === 'v499') {
    return BUSINESS_PRICE_VARIANTS.variant_499;
  }
  if (key === 'control_399' || key === '399' || key === 'v399') {
    return BUSINESS_PRICE_VARIANTS.control_399;
  }
  return BUSINESS_PRICE_VARIANTS[key] ?? PLAN_PRICES.business;
}

/**
 * Get pricing for any plan with optional billing cycle and A/B variant support.
 */
export function getPlanPricing(
  planId: string | undefined | null,
  billing?: 'monthly' | 'yearly',
  variant?: string | null
): PlanPrice {
  const normalized = normalizePlanId(planId);
  if (normalized === 'business' && variant) {
    return getBusinessPlanPrice(variant);
  }
  return PLAN_PRICES[normalized] ?? PLAN_PRICES.free;
}

// ---------------------------------------------------------------------------
// Plan Limits (Enforced across Backend, Cloudflare Worker, and Frontend UI)
// ---------------------------------------------------------------------------

export interface PlanLimits {
  products: number;          // max products (Infinity = unlimited)
  aiCreditsPerMonth: number; // AI messages/credits per month
  storageBytes: number;      // media/invoice storage in bytes
  customDomain: boolean;     // custom domain connection
  advancedAnalytics: boolean;// profit tracking & advanced reports
  staffAccounts: number;     // number of staff/collaborator logins
  removeBranding: boolean;   // remove FeraSetu branding from store
  prioritySupport: boolean;  // priority WhatsApp & phone support
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    products: 25,
    aiCreditsPerMonth: 20,
    storageBytes: 50 * 1024 * 1024, // 50 MB
    customDomain: false,
    advancedAnalytics: false,
    staffAccounts: 1,
    removeBranding: false,
    prioritySupport: false,
  },
  business: {
    products: 500,
    aiCreditsPerMonth: 200,
    storageBytes: 1 * 1024 * 1024 * 1024, // 1 GB
    customDomain: true,
    advancedAnalytics: true,
    staffAccounts: 2,
    removeBranding: true,
    prioritySupport: true,
  },
  pro: {
    products: Infinity,
    aiCreditsPerMonth: 1000,
    storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    customDomain: true,
    advancedAnalytics: true,
    staffAccounts: 5,
    removeBranding: true,
    prioritySupport: true,
  },
};

// ---------------------------------------------------------------------------
// Plan Feature Descriptions & Conversion Metadata
// ---------------------------------------------------------------------------

export interface PlanFeature {
  label: string;
  included: boolean;
  note?: string;
}

export interface PlanDefinition {
  id: PlanId;
  displayName: string;
  tagline: string;
  outcome: string;          // Customer outcome-oriented copy
  price: PlanPrice;
  limits: PlanLimits;
  features: PlanFeature[];
  highlighted?: boolean;    // "Most Popular" highlight
  badge?: string;
  ctaText: string;
  ctaHref: string;
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    displayName: 'Free',
    tagline: 'Start your online store with zero risk.',
    outcome: 'Put your shop online, share your catalog, and receive direct WhatsApp and online orders.',
    price: PLAN_PRICES.free,
    limits: PLAN_LIMITS.free,
    ctaText: 'Start Free',
    ctaHref: '/register',
    features: [
      { label: 'Online storefront with your own link', included: true },
      { label: 'Up to 25 products', included: true },
      { label: 'Product & inventory management', included: true },
      { label: 'Order management dashboard', included: true },
      { label: 'WhatsApp ordering link', included: true },
      { label: 'Basic sales overview', included: true },
      { label: 'FeraSetu subdomain (yourshop.ferasetu.com)', included: true },
      { label: '20 Fera AI credits/month', included: true },
      { label: '50MB storage', included: true },
      { label: '1 staff account', included: true },
      { label: 'Custom domain connection', included: false },
      { label: 'Advanced analytics & profit tracking', included: false },
      { label: 'Remove FeraSetu branding', included: false },
      { label: 'Priority customer support', included: false },
    ],
  },
  {
    id: 'business',
    displayName: 'Business',
    tagline: 'Run and grow your retail business efficiently.',
    outcome: 'Expand your catalog, track profits, automate stock alerts, and use your AI assistant daily.',
    price: PLAN_PRICES.business,
    limits: PLAN_LIMITS.business,
    highlighted: true,
    badge: 'Most Popular',
    ctaText: 'Get Business',
    ctaHref: '/register?plan=business',
    features: [
      { label: 'Everything in Free', included: true },
      { label: 'Up to 500 products', included: true },
      { label: '200 Fera AI credits/month', included: true },
      { label: '1GB media & invoice storage', included: true },
      { label: 'Advanced analytics & profit tracking', included: true },
      { label: 'Inventory management & low-stock alerts', included: true },
      { label: '2 staff accounts', included: true },
      { label: 'Connect custom domain', included: true },
      { label: 'Remove FeraSetu branding', included: true },
      { label: 'Priority WhatsApp & phone support', included: true },
    ],
  },
  {
    id: 'pro',
    displayName: 'Pro',
    tagline: 'Complete power and scale for serious merchants.',
    outcome: 'Unlimited catalog capacity, advanced predictive AI forecasting, multiple staff, and top priority support.',
    price: PLAN_PRICES.pro,
    limits: PLAN_LIMITS.pro,
    ctaText: 'Get Pro',
    ctaHref: '/register?plan=pro',
    features: [
      { label: 'Everything in Business', included: true },
      { label: 'Unlimited products', included: true },
      { label: '1,000 Fera AI credits/month', included: true },
      { label: '5GB media & backup storage', included: true },
      { label: 'Advanced predictive AI & forecasting', included: true },
      { label: 'Up to 5 staff accounts', included: true },
      { label: 'Custom domain & white-label store', included: true },
      { label: 'Dedicated priority support (24/7)', included: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** Get plan definition by ID (handles legacy aliases and optional A/B pricing variant). */
export function getPlan(planId: string | undefined | null, variant?: string | null): PlanDefinition {
  const normalized = normalizePlanId(planId);
  const base = PLANS.find(p => p.id === normalized) ?? PLANS[0];
  if (normalized === 'business' && variant) {
    const variantPrice = getBusinessPlanPrice(variant);
    return {
      ...base,
      price: variantPrice,
    };
  }
  return base;
}

/** Get limits for a given plan (handles legacy aliases). */
export function getPlanLimits(planId: string | undefined | null): PlanLimits {
  const normalized = normalizePlanId(planId);
  return PLAN_LIMITS[normalized] ?? PLAN_LIMITS.free;
}

/** Check if a user on a given plan can use a specific feature. */
export function canUseFeature(
  planId: string | undefined | null,
  feature: keyof PlanLimits
): boolean {
  const limits = getPlanLimits(planId);
  const value = limits[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return false;
}

/** Check if the user has reached the product limit for their plan. */
export function hasReachedProductLimit(
  planId: string | undefined | null,
  currentProductCount: number
): boolean {
  const limit = getPlanLimits(planId).products;
  return currentProductCount >= limit;
}

/** Get the next plan up from the current one (for upgrade prompts). */
export function getNextPlan(planId: string | undefined | null): PlanDefinition | null {
  const normalized = normalizePlanId(planId);
  const index = PLANS.findIndex(p => p.id === normalized);
  if (index === -1 || index === PLANS.length - 1) return null;
  return PLANS[index + 1];
}

/** Is this a free / unpaid plan? */
export function isFreePlan(planId: string | undefined | null): boolean {
  return normalizePlanId(planId) === 'free';
}

/** Returns a human-readable plan badge label. */
export function getPlanDisplayName(planId: string | undefined | null): string {
  return getPlan(planId).displayName;
}

/** Helper to extract pricing variant parameter from search string or URLSearchParams. */
export function extractPricingVariant(input?: string | URLSearchParams | null): string | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') {
    if (input.includes('variant_299') || input.includes('299')) return 'variant_299';
    if (input.includes('variant_499') || input.includes('499')) return 'variant_499';
    if (input.includes('control_399') || input.includes('399')) return 'control_399';
    try {
      const search = input.startsWith('?') ? input : `?${input}`;
      const params = new URLSearchParams(search);
      const v = params.get('variant') || params.get('plan_variant') || params.get('pricing_variant');
      return v || undefined;
    } catch {
      return undefined;
    }
  }
  if (input instanceof URLSearchParams) {
    const v = input.get('variant') || input.get('plan_variant') || input.get('pricing_variant');
    return v || undefined;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Founding Shopkeeper Program Configuration (Optional Promotion)
// ---------------------------------------------------------------------------
export const FOUNDING_OFFER_ENABLED = false;
export const FOUNDING_SHOP_LIMIT = 50;
export const FOUNDING_OFFER_PLAN = 'business' as const;
export const FOUNDING_OFFER_MONTHS = 3;

// ---------------------------------------------------------------------------
// Legacy Compatibility Exports
// ---------------------------------------------------------------------------
export const BETA_MODE = typeof process !== 'undefined' && process.env?.VITE_BETA_MODE
  ? process.env.VITE_BETA_MODE !== 'false'
  : (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BETA_MODE !== 'false');

/** @deprecated Use getPlanLimits() and isFreePlan() instead */
export function isBetaFreePlan(planId: string | undefined | null): boolean {
  return normalizePlanId(planId) === 'free';
}

/** @deprecated Use PLAN_PRICES or getPlanPricing() instead */
export function getEffectivePlanPrice(planId: string | undefined | null, _basePrice?: number): number {
  const normalized = normalizePlanId(planId);
  return PLAN_PRICES[normalized]?.monthly ?? 0;
}

/** @deprecated Use getPlanDisplayName() instead */
export function getPlanBadge(planId: string | undefined | null): string | null {
  const normalized = normalizePlanId(planId);
  if (normalized === 'free') return BETA_MODE ? 'Free (Beta)' : 'Free';
  return null;
}

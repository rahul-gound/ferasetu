/**
 * FeraSetu Plan Configuration
 * ============================
 * Single source of truth for all plan-related logic on the frontend.
 *
 * Plan ID mapping (reconciling three naming systems in the codebase):
 *   DB / backend:   beta | trial | basic | standard | pro
 *   shared-types:   free | starter | business | beta
 *   Public display: Free | Growth | Pro
 *
 * For new users, we treat 'beta' as 'free' for display purposes.
 * The canonical plan IDs used going forward are: 'free' | 'growth' | 'pro'
 * (matching the new pricing structure).
 */

// ---------------------------------------------------------------------------
// Founding Shopkeeper Program Configuration
// ---------------------------------------------------------------------------
// Change FOUNDING_OFFER_ENABLED to true when you are ready to run the offer.
// All other values are sourced from the API when the offer is active.

export const FOUNDING_OFFER_ENABLED = false; // ← set to true to activate
export const FOUNDING_SHOP_LIMIT = 50;
export const FOUNDING_OFFER_PLAN = 'growth' as const;
export const FOUNDING_OFFER_MONTHS = 3;

// ---------------------------------------------------------------------------
// Plan IDs
// ---------------------------------------------------------------------------

export type PlanId = 'free' | 'growth' | 'pro';

/** Maps legacy backend/DB plan IDs to the canonical display plan ID. */
export const LEGACY_PLAN_MAP: Record<string, PlanId> = {
  beta: 'free',
  trial: 'free',
  free: 'free',
  basic: 'growth',
  starter: 'growth',
  standard: 'growth',
  growth: 'growth',
  pro: 'pro',
  premium: 'pro',
  business: 'pro',
  scale: 'pro',
};

/** Resolve any plan string (including legacy IDs) to canonical PlanId. */
export function normalizePlanId(plan: string | undefined | null): PlanId {
  if (!plan) return 'free';
  return LEGACY_PLAN_MAP[plan.toLowerCase()] ?? 'free';
}

// ---------------------------------------------------------------------------
// Plan Pricing
// ---------------------------------------------------------------------------

export interface PlanPrice {
  monthly: number;    // INR per month
  yearly: number;     // INR per year (≈ 10 months price = 2 months free)
  yearlyPerMonth: number; // effective monthly rate when billed annually
}

export const PLAN_PRICES: Record<PlanId, PlanPrice> = {
  free: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
  growth: { monthly: 299, yearly: 2990, yearlyPerMonth: 249 },
  pro: { monthly: 799, yearly: 7990, yearlyPerMonth: 666 },
};

// ---------------------------------------------------------------------------
// Plan Limits (enforced server-side in Worker; mirrored here for UI gating)
// ---------------------------------------------------------------------------

export interface PlanLimits {
  products: number;        // max products (Infinity = unlimited)
  aiCreditsPerMonth: number;
  storageBytes: number;    // bytes
  customDomain: boolean;
  advancedAnalytics: boolean;
  staffAccounts: number;   // 1 = owner only
  removeBranding: boolean;
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
  },
  growth: {
    products: 500,
    aiCreditsPerMonth: 200,
    storageBytes: 1 * 1024 * 1024 * 1024, // 1 GB
    customDomain: false, // coming soon
    advancedAnalytics: true,
    staffAccounts: 1,
    removeBranding: false, // coming soon
  },
  pro: {
    products: Infinity,
    aiCreditsPerMonth: 1000,
    storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    customDomain: false, // coming soon
    advancedAnalytics: true,
    staffAccounts: 1, // coming soon: up to 5
    removeBranding: true,
  },
};

// ---------------------------------------------------------------------------
// Plan Feature Descriptions (for pricing cards and comparison table)
// ---------------------------------------------------------------------------

export interface PlanFeature {
  label: string;
  included: boolean;
  note?: string; // e.g. "Coming soon"
}

export interface PlanDefinition {
  id: PlanId;
  displayName: string;
  tagline: string;
  outcome: string;    // outcome-focused benefit statement
  price: PlanPrice;
  limits: PlanLimits;
  features: PlanFeature[];
  highlighted?: boolean; // show "Most Popular" badge
  ctaText: string;
  ctaHref: string;     // href for unauthenticated users
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    displayName: 'Free',
    tagline: 'Shuruwaat karo, bina kisi risk ke.',
    outcome: 'Put your shop online and start taking orders — no cost, no tech skills needed.',
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
      { label: '20 Fera AI messages/month', included: true },
      { label: 'Basic invoices', included: true },
      { label: 'Advanced analytics', included: false },
      { label: 'Custom domain', included: false, note: 'Coming soon' },
      { label: 'Remove FeraSetu branding', included: false },
    ],
  },
  {
    id: 'growth',
    displayName: 'Growth',
    tagline: 'Apne business ko seriously chalao.',
    outcome: 'Sell more without being at your shop all day. Understand what\'s working.',
    price: PLAN_PRICES.growth,
    limits: PLAN_LIMITS.growth,
    highlighted: true,
    ctaText: 'Get Growth',
    ctaHref: '/register?plan=growth',
    features: [
      { label: 'Everything in Free', included: true },
      { label: 'Up to 500 products', included: true },
      { label: 'Advanced analytics & profit tracking', included: true },
      { label: 'Inventory management & low-stock alerts', included: true },
      { label: '200 Fera AI messages/month', included: true },
      { label: 'Professional invoices', included: true },
      { label: 'Store customization', included: true },
      { label: 'Better order automation', included: true },
      { label: 'Priority support', included: true },
      { label: 'Custom domain', included: false, note: 'Coming soon' },
      { label: 'Remove FeraSetu branding', included: false, note: 'Coming soon' },
      { label: 'Multiple staff accounts', included: false, note: 'Coming soon' },
    ],
  },
  {
    id: 'pro',
    displayName: 'Pro',
    tagline: 'Scale karo, grow karo.',
    outcome: 'Run your shop like a proper online business — unlimited products, advanced AI, priority help.',
    price: PLAN_PRICES.pro,
    limits: PLAN_LIMITS.pro,
    ctaText: 'Get Pro',
    ctaHref: '/register?plan=pro',
    features: [
      { label: 'Everything in Growth', included: true },
      { label: 'Unlimited products', included: true },
      { label: '1,000 Fera AI messages/month', included: true },
      { label: 'Advanced AI (complex analysis, forecasting)', included: true },
      { label: 'Advanced automation', included: true },
      { label: 'Remove FeraSetu branding', included: true },
      { label: 'Priority support', included: true },
      { label: 'Custom domain', included: false, note: 'Coming soon' },
      { label: 'Multiple staff accounts (up to 5)', included: false, note: 'Coming soon' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Get the canonical plan definition for a given plan ID (handles legacy IDs). */
export function getPlan(planId: string | undefined | null): PlanDefinition {
  const normalized = normalizePlanId(planId);
  return PLANS.find(p => p.id === normalized) ?? PLANS[0];
}

/** Get limits for a given plan (handles legacy IDs). */
export function getPlanLimits(planId: string | undefined | null): PlanLimits {
  return getPlan(planId).limits;
}

/** Check if a user on a given plan can use a feature. */
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

// ---------------------------------------------------------------------------
// Legacy compatibility — keep importing from beta.ts working
// (beta.ts re-exports from here so nothing breaks)
// ---------------------------------------------------------------------------
export const BETA_MODE = import.meta.env.VITE_BETA_MODE !== 'false';

/** @deprecated Use getPlanLimits() and isFreePlan() instead */
export function isBetaFreePlan(planId: string): boolean {
  return normalizePlanId(planId) === 'free';
}

/** @deprecated Use PLAN_PRICES instead */
export function getEffectivePlanPrice(planId: string, _basePrice: number): number {
  const normalized = normalizePlanId(planId);
  return PLAN_PRICES[normalized]?.monthly ?? 0;
}

/** @deprecated Use getPlanDisplayName() instead */
export function getPlanBadge(planId: string): string | null {
  const normalized = normalizePlanId(planId);
  if (normalized === 'free') return BETA_MODE ? 'Free (Beta)' : 'Free';
  return null;
}

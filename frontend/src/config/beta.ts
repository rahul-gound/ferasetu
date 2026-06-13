export const BETA_MODE = import.meta.env.VITE_BETA_MODE !== 'false';
export const BETA_FREE_PLAN_ID = 'beta';

export function isBetaFreePlan(planId: string): boolean {
  // If we are in BETA_MODE, the 'beta' plan is always free.
  return planId === 'beta' || (BETA_MODE && planId === 'basic');
}

export function getEffectivePlanPrice(planId: string, basePrice: number): number {
  return isBetaFreePlan(planId) ? 0 : basePrice;
}

export function getPlanBadge(planId: string): string | null {
  if (isBetaFreePlan(planId)) return 'Free (Beta)';
  return null;
}

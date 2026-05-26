export const BETA_MODE = import.meta.env.VITE_BETA_MODE !== 'false';
export const BETA_FREE_PLAN_ID = 'basic';

export function isBetaFreePlan(planId: string): boolean {
  return BETA_MODE && planId === BETA_FREE_PLAN_ID;
}

export function getEffectivePlanPrice(planId: string, basePrice: number): number {
  return isBetaFreePlan(planId) ? 0 : basePrice;
}

export function getPlanBadge(planId: string): string | null {
  if (isBetaFreePlan(planId)) return 'Free (Beta)';
  return null;
}

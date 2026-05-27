export const BETA_MODE = process.env.BETA_MODE !== 'false';
export const BETA_FREE_PLAN_ID = 'basic';

export function isBetaFreePlan(planId: string): boolean {
  return BETA_MODE && planId === BETA_FREE_PLAN_ID;
}

export function getEffectivePlanAmount(planId: string, baseAmount: number): number {
  return isBetaFreePlan(planId) ? 0 : baseAmount;
}

/**
 * Legacy beta.ts — kept for backward compatibility.
 * All logic has moved to plans.ts.
 * Nothing imports this directly should need to change.
 */
export {
  BETA_MODE,
  isBetaFreePlan,
  getEffectivePlanPrice,
  getPlanBadge,
} from './plans';

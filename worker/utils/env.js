/**
 * Environment utilities for FeraSetu.
 */

export function isProduction(env) {
  return env.ENVIRONMENT === "production" || env.NODE_ENV === "production";
}

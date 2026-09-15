// FeraSetu — Authoritative Minor-Unit Money Utilities
// ===================================================
// Rule: No floating-point math is permitted in financial calculations.
// All values are stored and calculated as integers in currency minor units (e.g. paise, cents).

/**
 * Adds two minor-unit integers.
 */
export function moneyAdd(a, b) {
  return (Math.trunc(Number(a)) || 0) + (Math.trunc(Number(b)) || 0);
}

/**
 * Subtracts minor-unit integer b from a. Result clamped to zero if disallowNegative is true.
 */
export function moneySubtract(a, b, disallowNegative = false) {
  const diff = (Math.trunc(Number(a)) || 0) - (Math.trunc(Number(b)) || 0);
  return disallowNegative ? Math.max(0, diff) : diff;
}

/**
 * Multiplies an integer amount by percentage basis points (1% = 100 bps, 15% = 1500 bps).
 * Performs integer rounding without intermediate float accumulation.
 */
export function moneyMultiplyPercentageBps(amountMinor, bps) {
  const amt = Math.trunc(Number(amountMinor)) || 0;
  const basisPoints = Math.trunc(Number(bps)) || 0;
  return Math.round((amt * basisPoints) / 10000);
}

/**
 * Formats a minor-unit integer into a merchant/customer display string.
 * Strictly a display formatter; never used for financial computation.
 */
export function formatMoney(amountMinor, currency = 'INR') {
  const minor = Math.trunc(Number(amountMinor)) || 0;
  const major = (minor / 100).toFixed(2);
  const cur = (currency || 'INR').toUpperCase();

  if (cur === 'INR') {
    return `₹${major}`;
  }
  if (cur === 'USD') {
    return `$${major}`;
  }
  if (cur === 'EUR') {
    return `€${major}`;
  }
  if (cur === 'GBP') {
    return `£${major}`;
  }
  return `${cur} ${major}`;
}

/**
 * Converts legacy float amount (e.g. 399.50) into integer minor units (39950)
 * solely for one-time backward-compatible migration.
 */
export function legacyFloatToMinorUnits(floatAmount) {
  if (floatAmount === null || floatAmount === undefined) return 0;
  const num = Number(floatAmount);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

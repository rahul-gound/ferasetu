/**
 * Financial Minor-Unit Monetary Utilities for FeraSetu
 *
 * Strict financial rule: ALL monetary amounts must be stored and computed
 * as integers in minor units (cents, paise, etc.) to eliminate floating-point errors.
 *
 * Examples:
 *   ₹100.50 INR -> 10050
 *   $100.50 USD -> 10050
 *   €100.50 EUR -> 10050
 */

export interface CurrencyConfig {
  code: string;
  decimals: number;
  symbol: string;
  symbolPosition: 'before' | 'after';
}

export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  INR: { code: 'INR', decimals: 2, symbol: '₹', symbolPosition: 'before' },
  USD: { code: 'USD', decimals: 2, symbol: '$', symbolPosition: 'before' },
  EUR: { code: 'EUR', decimals: 2, symbol: '€', symbolPosition: 'before' },
  GBP: { code: 'GBP', decimals: 2, symbol: '£', symbolPosition: 'before' },
  CAD: { code: 'CAD', decimals: 2, symbol: 'CA$', symbolPosition: 'before' },
  AUD: { code: 'AUD', decimals: 2, symbol: 'A$', symbolPosition: 'before' },
  AED: { code: 'AED', decimals: 2, symbol: 'AED ', symbolPosition: 'before' },
  SGD: { code: 'SGD', decimals: 2, symbol: 'S$', symbolPosition: 'before' },
  JPY: { code: 'JPY', decimals: 0, symbol: '¥', symbolPosition: 'before' },
};

export function getCurrencyConfig(currency?: string): CurrencyConfig {
  const norm = (currency || 'INR').trim().toUpperCase();
  return CURRENCY_CONFIGS[norm] || {
    code: norm,
    decimals: 2,
    symbol: norm + ' ',
    symbolPosition: 'before',
  };
}

/**
 * Convert standard currency decimal amount (e.g. 100.50) into integer minor units (10050).
 */
export function toMinorUnits(amount: number | string | undefined | null, currency: string = 'INR'): number {
  if (amount === undefined || amount === null || amount === '') return 0;
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : Number(amount);
  if (isNaN(num)) return 0;

  const cfg = getCurrencyConfig(currency);
  const factor = Math.pow(10, cfg.decimals);
  return Math.round(num * factor);
}

/**
 * Convert integer minor units (10050) back into decimal number (100.50) for display/export.
 */
export function fromMinorUnits(minorUnits: number | undefined | null, currency: string = 'INR'): number {
  if (minorUnits === undefined || minorUnits === null) return 0;
  const cfg = getCurrencyConfig(currency);
  const factor = Math.pow(10, cfg.decimals);
  const intVal = Math.round(Number(minorUnits) || 0);
  return intVal / factor;
}

/**
 * Add minor unit integers safely.
 */
export function addMinor(...values: (number | undefined | null)[]): number {
  return values.reduce<number>((acc, v) => acc + Math.round(Number(v) || 0), 0);
}

/**
 * Subtract minor unit integers safely: a - b.
 */
export function subMinor(a: number | undefined | null, b: number | undefined | null): number {
  const valA = Math.round(Number(a) || 0);
  const valB = Math.round(Number(b) || 0);
  return valA - valB;
}

/**
 * Multiply minor unit by an integer quantity.
 */
export function multiplyMinor(unitMinor: number, quantity: number): number {
  const unit = Math.round(Number(unitMinor) || 0);
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  return unit * qty;
}

/**
 * Format integer minor units into human-readable string (e.g. "₹1,250.00" or "$49.99").
 */
export function formatMinor(
  minorUnits: number | undefined | null,
  currency: string = 'INR',
  locale: string = 'en-IN'
): string {
  const val = fromMinorUnits(minorUnits, currency);
  const cfg = getCurrencyConfig(currency);

  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : locale, {
      style: 'currency',
      currency: cfg.code,
      minimumFractionDigits: cfg.decimals,
      maximumFractionDigits: cfg.decimals,
    }).format(val);
  } catch {
    const fixed = val.toFixed(cfg.decimals);
    return `${cfg.symbol}${fixed}`;
  }
}

/**
 * Ensure an amount cannot exceed a cap or drop below zero.
 */
export function clampMinor(amountMinor: number, min: number = 0, max: number): number {
  const val = Math.round(amountMinor);
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

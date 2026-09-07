import { SUPPORTED_LANGUAGES, resolveLanguageCode } from './config';

/**
 * Get standard BCP 47 locale string for language code
 */
export function getLocaleForLanguage(langCode: string): string {
  const code = resolveLanguageCode(langCode);
  const found = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return found?.locale || 'en-US';
}

/**
 * Format numbers with locale-appropriate groupings
 * (e.g. 1,00,000 for Indian locales vs 100,000 for Western locales)
 */
export function formatNumber(
  value: number,
  langCode: string = 'en',
  options: Intl.NumberFormatOptions = {}
): string {
  const locale = getLocaleForLanguage(langCode);
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return value.toLocaleString();
  }
}

/**
 * Format currency amounts with proper symbols and locale grouping
 */
export function formatCurrency(
  amount: number,
  currency: 'INR' | 'USD' | 'EUR' | string = 'INR',
  langCode: string = 'en',
  options: Intl.NumberFormatOptions = {}
): string {
  const locale = getLocaleForLanguage(langCode);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      ...options
    }).format(amount);
  } catch {
    const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$';
    return `${symbol}${amount.toLocaleString()}`;
  }
}

/**
 * Format dates with locale-appropriate formatting
 */
export function formatDate(
  date: Date | string | number,
  langCode: string = 'en',
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  const d = typeof date === 'object' ? date : new Date(date);
  const locale = getLocaleForLanguage(langCode);
  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * Format relative time (e.g. 5 minutes ago, in 2 days)
 */
export function formatRelativeTime(
  date: Date | string | number,
  langCode: string = 'en'
): string {
  const d = typeof date === 'object' ? date : new Date(date);
  const diffSeconds = Math.round((d.getTime() - Date.now()) / 1000);
  const locale = getLocaleForLanguage(langCode);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const absSeconds = Math.abs(diffSeconds);

    if (absSeconds < 60) return rtf.format(diffSeconds, 'second');
    const diffMinutes = Math.round(diffSeconds / 60);
    if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month');
    const diffYears = Math.round(diffDays / 365);
    return rtf.format(diffYears, 'year');
  } catch {
    return d.toLocaleDateString();
  }
}

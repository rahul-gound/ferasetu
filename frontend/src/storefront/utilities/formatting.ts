import DOMPurify from 'isomorphic-dompurify';

/**
 * Cleanly sanitize HTML text strings to avoid XSS while allowing basic formatting.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br', 'p'],
    ALLOWED_ATTR: ['class', 'style'],
  });
}

/**
 * Format currency in Indian numbering format (e.g. ₹1,29,999) or standard currency.
 */
export function formatPrice(amount: number | null | undefined, currency: string = 'INR'): string {
  if (amount == null || isNaN(amount)) return '₹0';
  const prefix = currency === 'INR' ? '₹' : '$';
  try {
    return prefix + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  } catch {
    return prefix + amount;
  }
}

/**
 * Calculate discount percentage between original price and sale price.
 */
export function calculateDiscount(price: number, salePrice?: number | null): number {
  if (!salePrice || salePrice >= price || price <= 0) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}

/**
 * Safely format phone number for WhatsApp wa.me links.
 */
export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return '91' + digits;
  return digits;
}

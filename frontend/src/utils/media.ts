/**
 * FeraSetu Media URL Resolution Utility
 *
 * Resolves media keys stored in D1 to full CDN URLs.
 * Supports legacy data URLs, external URLs, and canonical B2 media keys.
 */

const CDN_BASE = 'https://cdn.ferasetu.com';

/**
 * Resolves a media key or URL to a full displayable URL.
 *
 * Rules:
 * - empty/falsy -> returns fallback placeholder
 * - https:// or http:// -> return as-is (external URL)
 * - data: -> return as-is (legacy base64 compatibility)
 * - blob: -> return as-is (local preview only, never persist)
 * - shops/... -> prefix with CDN base URL
 * - known root asset -> prefix with CDN base URL
 * - unknown -> return fallback placeholder
 */
export function resolveMediaUrl(value?: string | null, fallback?: string): string {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return fallback || '';
  }

  const trimmed = value.trim();

  // External URLs - return as-is
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }

  // Legacy base64 data URLs - return as-is for backward compatibility
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Local blob preview URLs - return as-is (only for preview, never persisted)
  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Canonical B2 media keys: shops/{shopId}/...
  if (trimmed.startsWith('shops/')) {
    return CDN_BASE + '/' + trimmed;
  }

  // Known root-level B2 fixtures
  if (trimmed === 'ferasetu-new-web.png') {
    return CDN_BASE + '/' + trimmed;
  }

  // If it looks like a relative media key with a file extension, try CDN
  if (/^[a-zA-Z0-9][a-zA-Z0-9._\/-]*\.[a-zA-Z0-9]+$/.test(trimmed)) {
    return CDN_BASE + '/' + trimmed;
  }

  // Unknown format - return fallback
  return fallback || trimmed;
}

/**
 * Checks if a value is a canonical B2 media key (not a URL or data URI).
 */
export function isMediaKey(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('shops/') && !trimmed.startsWith('http') && !trimmed.startsWith('data:');
}

/**
 * Checks if a value is a legacy base64 data URL.
 */
export function isDataUrl(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.trim().startsWith('data:');
}

/**
 * Checks if a value is a blob URL (local preview only, not persistable).
 */
export function isBlobUrl(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.trim().startsWith('blob:');
}

/**
 * FeraSetu QA Engine - Deterministic Bug Fingerprinting
 * =====================================================
 * Generates stable fingerprints so identical errors occurring 500 times
 * aggregate into a single issue with occurrence counts, avoiding alert floods.
 */

import crypto from 'node:crypto';

/**
 * Normalizes an error message or string by stripping dynamic UUIDs, timestamps,
 * port numbers, and specific transient numeric identifiers.
 * @param {string} text
 * @returns {string}
 */
export function normalizeMessage(text) {
  if (!text) return '';
  return String(text)
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    // Replace Mongo/BSON/Hex IDs (24 chars)
    .replace(/\b[0-9a-f]{24}\b/gi, '<OBJECT_ID>')
    // Replace ISO timestamps
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/gi, '<TIMESTAMP>')
    // Replace file paths and line numbers (e.g. at line 42:15, bundle.js:1234:56, or line 42)
    .replace(/\b\d+:\d+\b/g, '<LINE>:<COL>')
    .replace(/(line\s+)\d+/gi, '$1<LINE>')
    // Replace URLs with query parameters down to origin and pathname
    .replace(/https?:\/\/[^\s"'`]+/g, (urlStr) => {
      try {
        const u = new URL(urlStr);
        return `${u.origin}${u.pathname}`;
      } catch {
        return urlStr;
      }
    })
    .trim()
    .toLowerCase();
}

/**
 * Generates a stable deterministic fingerprint for an issue.
 * @param {Object} params
 * @param {string} params.category
 * @param {string} params.title
 * @param {string} [params.route]
 * @param {string} [params.elementSelector]
 * @param {string} [params.apiEndpoint]
 * @param {number} [params.httpStatus]
 * @param {string} [params.componentName]
 * @returns {string}
 */
export function generateIssueFingerprint({
  category,
  title,
  route,
  elementSelector,
  apiEndpoint,
  httpStatus,
  componentName,
}) {
  const normTitle = normalizeMessage(title);
  const normRoute = route ? route.replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:id') : '';
  const normEndpoint = apiEndpoint ? apiEndpoint.replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:id') : '';
  const keyParts = [
    category,
    normTitle,
    normRoute,
    componentName || '',
    elementSelector || '',
    normEndpoint,
    httpStatus || '',
  ].filter(Boolean).join('|');

  const hash = crypto.createHash('sha256').update(keyParts).digest('hex').substring(0, 16);
  return `${category}_${hash}`;
}

/**
 * FeraSetu QA Engine - Safety Guardrails & Secret Redactor
 * ========================================================
 * Enforces strict non-destructive testing rules and ensures zero credentials
 * or customer PII leak into test reports, logs, or D1 metadata.
 */

// Patterns to mask in logs, network traces, console outputs, and DOM
const SENSITIVE_PATTERNS = [
  { regex: /Bearer\s+([a-zA-Z0-9_\-\.]+)/gi, replacement: 'Bearer [REDACTED_TOKEN]' },
  { regex: /"password"\s*:\s*"[^"]+"/gi, replacement: '"password": "[REDACTED]"' },
  { regex: /password=[^&]+/gi, replacement: 'password=[REDACTED]' },
  { regex: /"secret"\s*:\s*"[^"]+"/gi, replacement: '"secret": "[REDACTED]"' },
  { regex: /"apiKey"\s*:\s*"[^"]+"/gi, replacement: '"apiKey": "[REDACTED]"' },
  { regex: /"api_key"\s*:\s*"[^"]+"/gi, replacement: '"api_key": "[REDACTED]"' },
  { regex: /"token"\s*:\s*"[^"]+"/gi, replacement: '"token": "[REDACTED]"' },
  { regex: /client_secret=[^&]+/gi, replacement: 'client_secret=[REDACTED]' },
  { regex: /cvv=\d{3,4}/gi, replacement: 'cvv=[REDACTED]' },
  { regex: /card_number=\d{12,19}/gi, replacement: 'card_number=[REDACTED]' },
  { regex: /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, replacement: '[REDACTED_CARD]' },
  { regex: /B2_APPLICATION_KEY(?:_ID)?=[^\s&]+/gi, replacement: 'B2_KEY=[REDACTED]' },
];

/**
 * Sanitizes any string or JSON structure to remove sensitive secrets.
 * @param {any} input
 * @returns {any}
 */
export function redactSecrets(input) {
  if (!input) return input;
  if (typeof input === 'string') {
    let sanitized = input;
    for (const { regex, replacement } of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(regex, replacement);
    }
    return sanitized;
  }
  if (typeof input === 'object') {
    try {
      const serialized = JSON.stringify(input);
      let sanitized = serialized;
      for (const { regex, replacement } of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(regex, replacement);
      }
      return JSON.parse(sanitized);
    } catch {
      return input;
    }
  }
  return input;
}

/**
 * Classifies an action or endpoint to guarantee production safety.
 * @param {string} method
 * @param {string} pathOrUrl
 * @param {string} environment
 * @returns {{safe: boolean, classification: 'SAFE_READ' | 'SAFE_SIMULATION' | 'TEST_WRITE' | 'DESTRUCTIVE' | 'BLOCKED', reason?: string}}
 */
export function checkActionSafety(method, pathOrUrl, environment = 'production') {
  const m = (method || 'GET').toUpperCase();
  const p = (pathOrUrl || '').toLowerCase();

  // Strict forbidden operations
  const blockedPatterns = [
    '/refund',
    '/charge',
    '/payout',
    '/cashfree',
    '/whatsapp',
    '/send-platform',
    '/admin/users/delete',
    '/orders/cancel',
    '/stores/delete',
  ];

  for (const pattern of blockedPatterns) {
    if (p.includes(pattern)) {
      return {
        safe: false,
        classification: 'BLOCKED',
        reason: `Operation contains blocked sensitive term: ${pattern}. Financial and destructive operations are forbidden in automated scans.`,
      };
    }
  }

  // Safe simulation endpoints
  if (p.includes('/qa/synthetic') || p.includes('/test-mode')) {
    return { safe: true, classification: 'SAFE_SIMULATION' };
  }

  // Read-only operations are always safe
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') {
    return { safe: true, classification: 'SAFE_READ' };
  }

  // Test mutations allowlist (QA-specific endpoints)
  if (p.includes('/api/admin/qa/') || p.includes('/analytics/events')) {
    return { safe: true, classification: 'TEST_WRITE' };
  }

  // Mutations in production are treated as potentially destructive
  if (environment === 'production') {
    return {
      safe: false,
      classification: 'DESTRUCTIVE',
      reason: 'State mutations (POST/PUT/DELETE) on non-QA endpoints are blocked on production environment by default.',
    };
  }

  return { safe: true, classification: 'TEST_WRITE' };
}

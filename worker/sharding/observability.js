/**
 * FeraSetu Sharding & Media Observability Logger
 *
 * Emits structured JSON events for auditability and monitoring.
 * Strictly sanitizes sensitive attributes before logging.
 */

const REDACTED_KEYS = new Set([
  'token',
  'api_token',
  'cf_token',
  'cloudflare_api_token',
  'authorization',
  'auth',
  'password',
  'secret',
  'cookie',
  'jwt',
  'client_secret',
  'key',
]);

/**
 * Recursively redacts sensitive keys from log payloads.
 */
export function sanitizeLogData(obj, depth = 0) {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogData(item, depth + 1));
  }

  const sanitized = {};
  for (const [k, v] of Object.entries(obj)) {
    const lowerKey = k.toLowerCase();
    if (REDACTED_KEYS.has(lowerKey) || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('password')) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      sanitized[k] = sanitizeLogData(v, depth + 1);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/**
 * Emits a structured log event with timestamp and sanitized context.
 */
export function logShardingEvent(eventName, context = {}) {
  const sanitized = sanitizeLogData(context);
  const logEntry = {
    type: 'SHARDING_EVENT',
    event: eventName,
    timestamp: new Date().toISOString(),
    ...sanitized,
  };

  const jsonStr = JSON.stringify(logEntry);
  if (eventName.endsWith('_failure') || eventName === 'provisioning_failure') {
    console.error(jsonStr);
  } else if (eventName.endsWith('_retry') || eventName === 'shard_threshold_reached') {
    console.warn(jsonStr);
  } else {
    console.log(jsonStr);
  }

  return logEntry;
}

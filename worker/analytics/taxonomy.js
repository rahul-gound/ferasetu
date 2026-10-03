/**
 * FeraSetu Analytics Event Taxonomy & Privacy Validation Engine
 * 
 * Philosophy: "Measure behavior, don't manufacture identities."
 * - Strict schema versioning.
 * - Allowlisted event names only.
 * - Allowlisted properties only.
 * - Zero PII, zero credentials, zero payment data, zero keystrokes.
 */

export const SCHEMA_VERSION = 1;

export const ALLOWED_EVENT_NAMES = new Set([
  // Visitor & Funnel Lifecycle
  'page_view',
  'session_start',
  'section_view',
  'cta_click',
  'pricing_view',
  'pricing_plan_select',
  'faq_open',
  'product_demo_view',
  'signup_start',
  'signup_complete',
  'trial_start',
  'login',
  'language_change',
  'outbound_click',
  'error',
  'page_hidden',
  'page_exit',

  // Storefront Commerce Lifecycle (Tenant-isolated)
  'shop_visit',
  'product_view',
  'add_to_cart',
  'checkout_start',
  'order_complete'
]);

// Keys that must NEVER be accepted under any circumstances
export const FORBIDDEN_PROPERTY_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'auth',
  'secret',
  'cookie',
  'cookies',
  'credit_card',
  'card_number',
  'card_no',
  'cvv',
  'cvc',
  'expiry',
  'ssn',
  'bank_account',
  'account_number',
  'payment_credential',
  'keystroke',
  'keystrokes',
  'key_log',
  'raw_html',
  'dom_tree',
  'screen_data',
  'screen_recording',
  'canvas_fingerprint',
  'hardware_concurrency',
  'email',
  'user_email',
  'customer_email',
  'phone',
  'user_phone',
  'customer_phone',
  'full_name',
  'address',
  'order_id',
  'order',
  'tenant_id',
  'organization_id',
  'user_id',
  'ip',
  'ip_address',
  'jwt',
  'api_key',
  'apikey'
]);

// Allowlisted property names across events to prevent arbitrary state dumping
export const ALLOWED_PROPERTIES = new Set([
  // Navigation & Attribution
  'path',
  'title',
  'referrer_category',
  'referrer_host',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',

  // Sections & Interactions
  'section_id',
  'duration_ms',
  'cta_id',
  'cta_text',
  'location',
  'target_host',
  'link_id',
  'faq_id',
  'question_key',
  'feature_id',

  // Pricing & Commercial Funnel
  'market',
  'currency',
  'selected_cycle',
  'plan_id',
  'billing_cycle',
  'trial_days',
  'price',
  'source_cta',
  'referral_code',
  'method',
  'from_lang',
  'to_lang',

  // Exit & Lifecycle
  'session_duration_s',
  'events_count',
  'last_section',
  'last_cta',
  'is_bounce',

  // Friction & Errors
  'error_name',
  'error_type',
  'error_code',
  'status_code',
  'component',

  // Storefront Metrics
  'shop_slug',
  'product_id',
  'category',
  'item_count',
  'total_amount',
  'payment_method'
]);

const ALLOWED_PAYMENT_METHODS = new Set(['cash', 'card', 'upi', 'netbanking', 'wallet', 'other']);

/**
 * Deep sanitization for string values to prevent PII, tokens, or card numbers
 * from leaking via benign properties (e.g. cta_text, title, path).
 */
export function sanitizeStringValue(str) {
  if (typeof str !== 'string') return '';
  return str
    // Redact email addresses (standard and encoded)
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[REDACTED_EMAIL]')
    // Redact international and local phone numbers
    .replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[REDACTED_PHONE]')
    // Redact JWT tokens (header.payload.signature)
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9-_]*)?/g, '[REDACTED_JWT]')
    // Redact Bearer authorization tokens
    .replace(/Bearer\s+[A-Za-z0-9-_.~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    // Redact credit/debit card numbers (13-19 digits, spaced or hyphenated)
    .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CARD]')
    // Redact inline secrets/passwords/keys in text
    .replace(/(?:password|secret|token|apiKey|api_key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .slice(0, 255);
}

/**
 * Sanitizes URLs to remove sensitive query parameters (e.g. ?token=, ?code=, ?email=)
 */
export function sanitizeUrlOrPath(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const isAbsolute = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');
    const parsed = new URL(rawUrl, 'https://ferasetu.com');

    // Strip sensitive and credential query parameters
    const sensitiveParams = [
      'token', 'access_token', 'refresh_token', 'code', 'session', 'auth', 'authorization',
      'email', 'phone', 'key', 'secret', 'api_key', 'apikey', 'password', 'pwd',
      'signature', 'sig', 'jwt', 'fbclid', 'gclid', 'user_id', 'order_id'
    ];
    for (const p of sensitiveParams) {
      parsed.searchParams.delete(p);
    }

    if (isAbsolute) {
      return parsed.origin + parsed.pathname + (parsed.search ? parsed.search : '');
    }
    return parsed.pathname + (parsed.search ? parsed.search : '');
  } catch {
    return rawUrl.split('?')[0].slice(0, 200);
  }
}

/**
 * Classifies user-agent coarsely into 'mobile', 'tablet', or 'desktop' without fingerprinting.
 */
export function classifyDeviceCategory(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return 'desktop';
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Validates and sanitizes a single incoming event.
 * Returns null if invalid or rejected, or a sanitized clean event object.
 */
export function validateAndSanitizeEvent(rawEvent, request) {
  if (!rawEvent || typeof rawEvent !== 'object' || Array.isArray(rawEvent)) {
    return { error: 'Event must be a valid JSON object' };
  }

  const eventName = (rawEvent.event_name || rawEvent.event_type || '').toString().trim().toLowerCase();
  if (!eventName || !ALLOWED_EVENT_NAMES.has(eventName)) {
    return { error: `Invalid or unapproved event_name: '${eventName}'` };
  }

  const schemaVersion = parseInt(rawEvent.schema_version, 10) || 1;
  if (schemaVersion > SCHEMA_VERSION) {
    return { error: `Unsupported schema_version: ${schemaVersion}` };
  }

  // Sanitize properties
  const cleanProperties = {};
  const rawProps = (rawEvent.properties && typeof rawEvent.properties === 'object' && !Array.isArray(rawEvent.properties))
    ? rawEvent.properties
    : (rawEvent.event_data && typeof rawEvent.event_data === 'object' && !Array.isArray(rawEvent.event_data) ? rawEvent.event_data : {});

  const serializedSize = JSON.stringify(rawProps).length;
  if (serializedSize > 4096) {
    return { error: 'Event properties exceed 4KB limit' };
  }

  for (const [key, value] of Object.entries(rawProps)) {
    const cleanKey = key.toString().trim().toLowerCase();

    // Guard against prototype pollution
    if (cleanKey === '__proto__' || cleanKey === 'constructor' || cleanKey === 'prototype') {
      continue;
    }

    // Strict rejection of forbidden keys
    if (FORBIDDEN_PROPERTY_KEYS.has(cleanKey)) {
      continue; // Silently redact forbidden key
    }

    // Only allow allowlisted properties
    if (!ALLOWED_PROPERTIES.has(cleanKey)) {
      continue;
    }

    // Reject nested objects or arrays to prevent arbitrary structured data injection
    if (typeof value === 'object' && value !== null) {
      continue;
    }

    // Sanitize values
    if (typeof value === 'string') {
      if (cleanKey === 'path' || cleanKey === 'target_url') {
        cleanProperties[cleanKey] = sanitizeUrlOrPath(value);
      } else if (cleanKey === 'payment_method') {
        const normMethod = value.toLowerCase().trim();
        cleanProperties[cleanKey] = ALLOWED_PAYMENT_METHODS.has(normMethod) ? normMethod : 'other';
      } else {
        // Deep string sanitization for PII/credentials
        cleanProperties[cleanKey] = sanitizeStringValue(value);
      }
    } else if (typeof value === 'number') {
      if (Number.isFinite(value)) {
        if (cleanKey === 'total_amount') {
          // Coarsen total amounts to whole numbers to prevent price-correlation deanonymization
          cleanProperties[cleanKey] = Math.round(value);
        } else {
          cleanProperties[cleanKey] = Math.round(value * 100) / 100;
        }
      }
    } else if (typeof value === 'boolean') {
      cleanProperties[cleanKey] = value;
    }
  }

  // Coarse Geolocation: Country and Region ONLY. Never exact city or GPS.
  const country = request?.cf?.country ? String(request.cf.country).toUpperCase().slice(0, 2) : 'XX';
  const deviceCategory = classifyDeviceCategory(request?.headers?.get('user-agent'));

  // Session & Visitor identifiers: Ensure UUID format, prevent injection
  const visitorId = (typeof rawEvent.visitor_id === 'string' && /^[0-9a-f-]{16,64}$/i.test(rawEvent.visitor_id))
    ? rawEvent.visitor_id
    : null;

  const sessionId = (typeof rawEvent.session_id === 'string' && /^[0-9a-f-]{16,64}$/i.test(rawEvent.session_id))
    ? rawEvent.session_id
    : null;

  return {
    valid: true,
    event: {
      event_name: eventName,
      schema_version: schemaVersion,
      visitor_id: visitorId,
      session_id: sessionId,
      properties: cleanProperties,
      country,
      device_category: deviceCategory
    }
  };
}

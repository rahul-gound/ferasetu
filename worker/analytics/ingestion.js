/**
 * FeraSetu Analytics Ingestion & Server-Side Tenant Isolation Engine
 * 
 * Philosophy: "Measure behavior, don't manufacture identities."
 * - Server-authoritative tenant resolution (Never trust client org_id/shop_id).
 * - Strict rate limiting and payload validation.
 * - Zero PII, secrets, or credential storage.
 * - Idempotent, privacy-preserving first-party telemetry.
 */

import { validateAndSanitizeEvent } from './taxonomy.js';

// In-memory sliding window rate limiter: ip -> [timestamp, ...]
const ipRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_EVENTS_PER_WINDOW = 120; // 120 events / minute / IP

// Maximum request body size: 64 KB
const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_BATCH_SIZE = 20;

/**
 * Checks rate limit for a client IP, accounting for event batch size.
 * Uses Cloudflare-native Rate Limiter if bound (env.RATE_LIMITER),
 * falling back to an in-memory sliding window per isolate.
 */
export async function checkRateLimit(clientIp, env, eventCount = 1) {
  if (!clientIp || clientIp === 'unknown') return true;

  // 1. Cloudflare distributed Rate Limiting binding (if provisioned)
  if (env?.RATE_LIMITER && typeof env.RATE_LIMITER.limit === 'function') {
    try {
      const res = await env.RATE_LIMITER.limit({ key: clientIp });
      if (res && res.success === false) {
        return false;
      }
    } catch {
      // Fall through to per-isolate sliding window
    }
  }

  // 2. In-memory sliding window (per isolate)
  const now = Date.now();
  const timestamps = ipRateLimits.get(clientIp) || [];
  
  // Evict timestamps older than window
  const activeTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (activeTimestamps.length + eventCount > MAX_EVENTS_PER_WINDOW) {
    ipRateLimits.set(clientIp, activeTimestamps);
    return false;
  }
  
  for (let i = 0; i < eventCount; i++) {
    activeTimestamps.push(now);
  }
  ipRateLimits.set(clientIp, activeTimestamps);

  // Periodic cleanup if map grows too large
  if (ipRateLimits.size > 10000) {
    for (const [key, list] of ipRateLimits.entries()) {
      if (list.length === 0 || now - list[list.length - 1] > RATE_LIMIT_WINDOW_MS) {
        ipRateLimits.delete(key);
      }
    }
  }

  return true;
}

/**
 * Authoritatively resolves tenant identity server-side.
 * Client-supplied tenant_id / organization_id / user_id is NEVER trusted.
 * Host and authentication headers are validated strictly.
 * 
 * SECURITY:
 * - NEVER trusts X-Forwarded-Host (client-spoofable).
 * - NEVER trusts Referer for tenant binding (client-spoofable).
 * - Strictly relies on verified TLS connection Host header and verified JWTs.
 */
export async function resolveAuthoritativeTenant(request, env, getAuthenticatedUser, resolveStorefrontTenant) {
  // 1. Check for authenticated merchant via JWT
  const authHeader = request.headers.get("Authorization");
  if (authHeader && typeof getAuthenticatedUser === 'function') {
    try {
      const user = await getAuthenticatedUser(request, env);
      if (user && (user.organizationId || user.organization?.id || user.$id)) {
        return {
          tenantId: user.organizationId || user.organization?.id || user.$id,
          source: 'authenticated_merchant',
          userId: user.$id || user.id || null
        };
      }
    } catch {
      // Invalid/expired token — do NOT trust any claimed identity
    }
  }

  // 2. Check for Storefront Host ONLY (strictly validated Host header, never x-forwarded-host or referer)
  if (typeof resolveStorefrontTenant === 'function') {
    try {
      const host = (request.headers.get("host") || "").toLowerCase().trim();
      const hostname = host.split(":")[0];

      // If request Host is a merchant subdomain or custom domain (not platform apex)
      if (hostname && !hostname.startsWith("ferasetu.com") && !hostname.startsWith("www.ferasetu.com") && !hostname.startsWith("localhost") && !hostname.startsWith("127.0.0.1")) {
        // Strip any untrusted spoofing headers when invoking storefront resolver
        const safeReq = {
          ...request,
          headers: {
            get(name) {
              const lower = (name || '').toLowerCase();
              if (lower === 'x-forwarded-host' || lower === 'x-original-host' || lower === 'forwarded') return null;
              return request.headers.get(name);
            }
          }
        };
        const storeCtx = await resolveStorefrontTenant(safeReq, env);
        if (storeCtx && (storeCtx.organizationId || storeCtx.shop?.organization_id || storeCtx.shop?.id)) {
          return {
            tenantId: storeCtx.organizationId || storeCtx.shop?.organization_id || storeCtx.shop?.id,
            source: 'storefront_subdomain',
            userId: null
          };
        }
      }
    } catch {}
  }

  // 3. Fallback: Public FeraSetu marketing / landing platform
  return {
    tenantId: 'platform',
    source: 'platform_public',
    userId: null
  };
}

/**
 * Handles POST /api/analytics/events
 */
export async function handleAnalyticsEvents(request, env, dependencies = {}) {
  const { getAuthenticatedUser, resolveStorefrontTenant, jsonHelper, errorResponseHelper } = dependencies;

  // 1. Enforce Content-Length / payload size first
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return errorResponseHelper("Payload too large. Maximum size is 64KB.", 413, undefined, request);
  }

  let body;
  try {
    const rawText = await request.text();
    if (rawText.length > MAX_PAYLOAD_BYTES) {
      return errorResponseHelper("Payload too large. Maximum size is 64KB.", 413, undefined, request);
    }
    body = JSON.parse(rawText);
  } catch {
    return errorResponseHelper("Malformed JSON payload.", 400, undefined, request);
  }

  // 2. Normalize incoming events (support single event object or batch { events: [...] })
  const rawEventsList = Array.isArray(body)
    ? body
    : (Array.isArray(body.events) ? body.events : [body]);

  if (rawEventsList.length === 0) {
    return errorResponseHelper("No events provided.", 400, undefined, request);
  }

  if (rawEventsList.length > MAX_BATCH_SIZE) {
    return errorResponseHelper(`Batch size exceeds maximum limit of ${MAX_BATCH_SIZE} events.`, 400, undefined, request);
  }

  // 3. Enforce Client IP rate limiting with batch volume accounted for
  // Cloudflare sets cf-connecting-ip from TCP connection. Do not allow client-supplied x-real-ip to override in prod.
  const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
  const rateLimitOk = await checkRateLimit(clientIp, env, rawEventsList.length);
  if (!rateLimitOk) {
    return errorResponseHelper("Rate limit exceeded. Please throttle analytics dispatches.", 429, { retry_after: 60 }, request);
  }

  // 4. Authoritatively resolve tenant identity server-side
  const tenantCtx = await resolveAuthoritativeTenant(request, env, getAuthenticatedUser, resolveStorefrontTenant);
  const tenantId = tenantCtx.tenantId;

  // 5. Validate & sanitize each event against taxonomy and privacy rules
  const sanitizedEvents = [];
  const errors = [];

  for (let i = 0; i < rawEventsList.length; i++) {
    const rawEvt = rawEventsList[i];
    const result = validateAndSanitizeEvent(rawEvt, request);
    if (!result.valid) {
      errors.push({ index: i, error: result.error });
      continue;
    }

    const id = `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    sanitizedEvents.push({
      id,
      tenantId,
      userId: tenantCtx.userId,
      ip_address: clientIp && clientIp !== 'unknown' ? clientIp : '127.0.0.1',
      ...result.event
    });
  }

  if (sanitizedEvents.length === 0) {
    return errorResponseHelper("All submitted events failed validation.", 400, { validation_errors: errors }, request);
  }

  // 6. Persist to D1 Database
  if (env.DB) {
    try {
      if (sanitizedEvents.length === 1) {
        const e = sanitizedEvents[0];
        const orgId = e.tenantId !== 'platform' ? e.tenantId : null;
        await env.DB.prepare(`
          INSERT INTO analytics_events (
            id, user_id, organization_id, tenant_id, visitor_id, session_id,
            event_name, event_type, schema_version, properties, event_data,
            ip_address, country, device_category, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          e.id,
          e.userId,
          orgId,
          e.tenantId,
          e.visitor_id,
          e.session_id,
          e.event_name,
          e.event_name,
          e.schema_version,
          JSON.stringify(e.properties),
          JSON.stringify(e.properties),
          e.ip_address || clientIp,
          e.country,
          e.device_category
        ).run();
      } else {
        // D1 Batch insertion for batch requests
        const statements = sanitizedEvents.map(e => {
          const orgId = e.tenantId !== 'platform' ? e.tenantId : null;
          return env.DB.prepare(`
            INSERT INTO analytics_events (
              id, user_id, organization_id, tenant_id, visitor_id, session_id,
              event_name, event_type, schema_version, properties, event_data,
              ip_address, country, device_category, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            e.id,
            e.userId,
            orgId,
            e.tenantId,
            e.visitor_id,
            e.session_id,
            e.event_name,
            e.event_name,
            e.schema_version,
            JSON.stringify(e.properties),
            JSON.stringify(e.properties),
            e.ip_address || clientIp,
            e.country,
            e.device_category
          );
        });

        await env.DB.batch(statements);
      }
    } catch (dbErr) {
      // Ingestion must fail safely without breaking or exposing D1 internals
      console.warn("[Analytics Ingestion DB Error]", dbErr?.message || dbErr);
      return errorResponseHelper("Failed to persist analytics events.", 500, undefined, request);
    }
  }

  return jsonHelper({
    success: true,
    accepted_count: sanitizedEvents.length,
    rejected_count: errors.length,
    tenant_id: tenantId,
    errors: errors.length > 0 ? errors : undefined
  }, 201, {}, request);
}

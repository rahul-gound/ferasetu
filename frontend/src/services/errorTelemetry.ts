// FeraSetu Client Error Telemetry & Automated Crash Reporter
// =============================================================================
// Automatically captures render exceptions, unhandled rejections, and runtime
// errors. Enriches every ticket with authoritative user identity specifications:
// - User ID, Email, Name
// - Exact Subscription Plan ('free', 'starter', 'growth', 'pro', 'enterprise')
// - Free vs Paid status
// - Merchant store slug and market
// Dispatches directly to /api/error-logs for immediate admin ticketing & tracing.
// =============================================================================

import axios from 'axios';
import { trackSafeError } from '../lib/analytics/tracker';

function redactSensitiveData(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[REDACTED_PHONE]')
    .replace(/Bearer\s+[A-Za-z0-9-_.~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9-_]*)?/g, '[REDACTED_JWT]')
    .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CARD]')
    .replace(/cookie:\s*[^;\n\r]+/gi, 'cookie: [REDACTED_COOKIE]')
    .replace(/(?:password|secret|token|apiKey|api_key)\s*[:=]\s*[^\s,;&]+/gi, '$1=[REDACTED]')
    .replace(/([?&](?:token|code|auth|session|key|secret|password|access_token|jwt)=)[^&]+/gi, '$1[REDACTED]');
}

export interface UserSpecification {
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  plan_tier: string;
  is_paid: boolean;
  store_slug: string | null;
  market: string | null;
}

export interface ClientErrorReport {
  error_message: string;
  error_name: string;
  stack?: string | null;
  component_stack?: string | null;
  url?: string;
  user_agent?: string;
  network_log?: any[];
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  plan_tier?: string;
  is_paid?: boolean;
  store_slug?: string | null;
  metadata?: Record<string, any>;
}

// In-memory deduplication cache: errorKey -> { ticketId, timestamp }
const recentErrorCache = new Map<string, { ticketId: string; timestamp: number }>();
const DEDUPLICATION_WINDOW_MS = 6000;

/**
 * Extracts the authoritative current user specifications from localStorage.
 */
export function getStoredUserSpecifications(): UserSpecification {
  try {
    const rawFeraUser = localStorage.getItem('fera_user') || localStorage.getItem('user');
    if (!rawFeraUser) {
      return {
        user_id: null,
        user_email: null,
        user_name: null,
        plan_tier: 'free',
        is_paid: false,
        store_slug: null,
        market: null,
      };
    }

    const u = JSON.parse(rawFeraUser);
    const planRaw = String(u.plan || u.subscription_status || 'free').toLowerCase().trim();

    // Determine normalized plan tier:
    // free, starter, growth, pro, enterprise
    let planTier = planRaw;
    if (planRaw === 'basic') planTier = 'starter';
    else if (planRaw === 'standard' || planRaw === 'business') planTier = 'growth';
    else if (planRaw === 'premium') planTier = 'pro';
    else if (!['free', 'starter', 'growth', 'pro', 'enterprise', 'trial'].includes(planRaw)) {
      planTier = planRaw || 'free';
    }

    // A user is considered Paid if their plan is not free and not unactivated trial
    const isPaid = Boolean(planTier !== 'free' && planTier !== 'trial' && u.plan !== 'free');

    const storeSlug =
      u.organization?.store_slug ||
      u.subdomain ||
      (typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : null);

    return {
      user_id: u.id || u.$id || null,
      user_email: null, // Redacted for privacy
      user_name: null, // Redacted for privacy
      plan_tier: planTier,
      is_paid: isPaid,
      store_slug: storeSlug && storeSlug !== 'www' && storeSlug !== 'localhost' ? storeSlug : null,
      market: u.market || u.organization?.market || 'IN',
    };
  } catch (err) {
    return {
      user_id: null,
      user_email: null,
      user_name: null,
      plan_tier: 'free',
      is_paid: false,
      store_slug: null,
      market: null,
    };
  }
}

/**
 * Captures recent network requests from the browser Performance API.
 */
function captureNetworkPerformance(): any[] {
  try {
    if (typeof window !== 'undefined' && window.performance && window.performance.getEntriesByType) {
      const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources.slice(-15).map((r) => ({
        name: redactSensitiveData(r.name),
        initiatorType: r.initiatorType,
        duration: Math.round(r.duration),
        transferSize: r.transferSize,
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Automatically sends a structured client crash report to the FeraSetu backend.
 * Enforces deduplication to prevent flooding on component render loops.
 * Redacts any PII or secrets before transmission.
 *
 * @param report Partial error report details
 * @returns Ticket ID
 */
export async function reportClientError(report: Partial<ClientErrorReport>): Promise<string> {
  const userSpecs = getStoredUserSpecifications();
  const errorMessage = redactSensitiveData(report.error_message || 'Unknown client crash');
  const errorName = report.error_name || 'Error';
  const currentUrl = typeof window !== 'undefined' ? redactSensitiveData(window.location.href) : 'unknown';

  // Track safe error in first-party analytics
  try {
    trackSafeError(errorName, 'client_runtime', undefined, typeof window !== 'undefined' ? window.location.pathname : undefined);
  } catch {}

  // Deduplication check
  const dedupKey = `${errorName}:${errorMessage.slice(0, 100)}:${typeof window !== 'undefined' ? window.location.pathname : ''}`;
  const now = Date.now();
  const cached = recentErrorCache.get(dedupKey);
  if (cached && now - cached.timestamp < DEDUPLICATION_WINDOW_MS) {
    return cached.ticketId;
  }

  const ticketId = `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  recentErrorCache.set(dedupKey, { ticketId, timestamp: now });

  const rawApi = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';
  const apiBase = rawApi.replace(/\/+$/, '');
  const endpoint = apiBase.endsWith('/api') ? `${apiBase}/error-logs` : `${apiBase}/api/error-logs`;

  const payload: ClientErrorReport = {
    error_message: errorMessage,
    error_name: errorName,
    stack: report.stack ? redactSensitiveData(report.stack) : null,
    component_stack: report.component_stack ? redactSensitiveData(report.component_stack) : null,
    url: currentUrl,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    network_log: report.network_log || captureNetworkPerformance(),
    user_id: report.user_id !== undefined ? report.user_id : userSpecs.user_id,
    user_email: null, // PII minimization: email redacted over wire
    user_name: null,  // PII minimization: name redacted over wire
    plan_tier: report.plan_tier !== undefined ? report.plan_tier : userSpecs.plan_tier,
    is_paid: report.is_paid !== undefined ? report.is_paid : userSpecs.is_paid,
    store_slug: report.store_slug !== undefined ? report.store_slug : userSpecs.store_slug,
    metadata: {
      market: userSpecs.market,
      screen_width: typeof window !== 'undefined' ? window.innerWidth : null,
      screen_height: typeof window !== 'undefined' ? window.innerHeight : null,
      ...report.metadata,
    },
  };

  try {
    const res = await axios.post(endpoint, payload, {
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data?.ticket_id || ticketId;
  } catch (err) {
    // Fallback: try navigator.sendBeacon if Axios fails
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      }
    } catch {
      // ignore
    }
    return ticketId;
  }
}

let isGlobalTelemetryInitialized = false;

/**
 * Initializes global window error & unhandled promise rejection listeners.
 * Catches asset preload failures, dynamic import failures, and uncaught exceptions.
 */
export function initGlobalErrorTelemetry(): void {
  if (isGlobalTelemetryInitialized || typeof window === 'undefined') return;
  isGlobalTelemetryInitialized = true;

  // 1. Unhandled runtime exceptions and script loading errors
  window.addEventListener('error', (event: ErrorEvent) => {
    try {
      const error = event.error || {};
      const message = event.message || error.message || 'Script runtime error';
      const name = error.name || 'ErrorEvent';
      const stack = error.stack || (event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : null);

      reportClientError({
        error_message: message,
        error_name: name,
        stack,
        url: window.location.href,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'window.onerror',
        },
      });
    } catch (e) {
      console.warn('[ErrorTelemetry] Failed to record global error:', e);
    }
  });

  // 2. Unhandled promise rejections (e.g. failed dynamic chunk imports)
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    try {
      const reason = event.reason;
      let message = 'Unhandled Promise Rejection';
      let name = 'UnhandledRejection';
      let stack: string | null = null;

      if (reason instanceof Error) {
        message = reason.message;
        name = reason.name;
        stack = reason.stack || null;
      } else if (typeof reason === 'string') {
        message = reason;
      } else if (reason && typeof reason === 'object') {
        message = reason.message || JSON.stringify(reason);
      }

      reportClientError({
        error_message: message,
        error_name: name,
        stack,
        url: window.location.href,
        metadata: {
          type: 'window.onunhandledrejection',
        },
      });
    } catch (e) {
      console.warn('[ErrorTelemetry] Failed to record unhandled rejection:', e);
    }
  });
}

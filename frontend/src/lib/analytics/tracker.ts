/**
 * FeraSetu First-Party Client Analytics Tracker
 * 
 * Philosophy: "Measure behavior, don't manufacture identities."
 * - Strictly consent-gated.
 * - Anonymous pseudonymous visitor & session measurement.
 * - Zero PII, secrets, or form-field interception.
 * - Fails safely without impacting storefront or application operations.
 */

import { getOrCreateVisitorId, getOrCreateSessionId, clearAnalyticsStorage } from './identity';

export interface AnalyticsEventPayload {
  event_name: string;
  schema_version?: number;
  properties?: Record<string, any>;
  visitor_id?: string | null;
  session_id?: string | null;
}

const defaultApiUrl = typeof window !== 'undefined' && window.location.hostname === 'ferasetu.com'
  ? 'https://ferasetu.singhantima203.workers.dev/api'
  : '/api';
const rawApiUrl = (import.meta.env?.VITE_API_URL || defaultApiUrl).replace(/\/+$/, '');
const normalizedApiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
const INGESTION_ENDPOINT = `${normalizedApiUrl}/analytics/events`;
const BATCH_FLUSH_INTERVAL_MS = 3000;
const MAX_QUEUE_SIZE = 15;

let eventQueue: AnalyticsEventPayload[] = [];
let flushTimer: any = null;
let sessionStartTime = Date.now();
let lastActiveSection = 'hero';
let lastCtaClicked: string | null = null;
let isLifecycleInitialized = false;

/**
 * Checks if analytics consent is granted from localStorage.
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('fera_consent');
    if (!raw) {
      // First-party pseudonymous behavioral measurement (Zero PII, zero cross-site tracking)
      return true;
    }
    const parsed = JSON.parse(raw);
    return parsed.analytics !== false;
  } catch {
    return true;
  }
}

/**
 * Extracts and sanitizes standard UTM parameters from the current URL.
 */
function extractUtmParameters(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const utms: Record<string, string> = {};
    const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
    for (const key of allowed) {
      const val = params.get(key);
      if (val) {
        utms[key] = val.slice(0, 100);
      }
    }
    return utms;
  } catch {
    return {};
  }
}

/**
 * Sanitizes URLs to strip sensitive credentials, tokens, or emails.
 */
function sanitizePath(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    const sensitive = ['token', 'access_token', 'code', 'session', 'auth', 'email', 'phone', 'key'];
    for (const s of sensitive) {
      parsed.searchParams.delete(s);
    }
    return parsed.pathname + (parsed.search ? parsed.search : '');
  } catch {
    return (rawUrl || '/').split('?')[0].slice(0, 200);
  }
}

/**
 * Dispatches queued events to the backend ingestion endpoint.
 */
export async function flushEventQueue(useBeacon = false): Promise<void> {
  if (typeof window === 'undefined') return;

  // Strict consent enforcement: If consent was revoked or not granted, purge queue and abort immediately
  if (!hasAnalyticsConsent()) {
    eventQueue = [];
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    clearAnalyticsStorage();
    return;
  }

  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const payload = JSON.stringify({ events: eventsToSend });

  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon(INGESTION_ENDPOINT, blob);
      if (sent) return;
    } catch {
      // Fall through to fetch
    }
  }

  try {
    await fetch(INGESTION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Fail safely — analytics must never throw unhandled errors to the UI
  }
}

/**
 * Schedules a debounced queue flush.
 */
function scheduleFlush(): void {
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEventQueue();
    return;
  }

  if (!flushTimer && typeof window !== 'undefined') {
    flushTimer = setTimeout(() => {
      flushEventQueue();
    }, BATCH_FLUSH_INTERVAL_MS);
  }
}

/**
 * Tracks an analytics event if analytics consent is granted.
 */
export function trackEvent(eventName: string, properties: Record<string, any> = {}, immediate = false): void {
  if (typeof window === 'undefined') return;

  const consentGranted = hasAnalyticsConsent();
  if (!consentGranted) {
    clearAnalyticsStorage();
    return;
  }

  const visitorId = getOrCreateVisitorId(true);
  const sessionId = getOrCreateSessionId(true);

  const payload: AnalyticsEventPayload = {
    event_name: eventName,
    schema_version: 1,
    visitor_id: visitorId,
    session_id: sessionId,
    properties: {
      path: sanitizePath(window.location.pathname),
      ...extractUtmParameters(),
      ...properties,
    },
  };

  eventQueue.push(payload);

  if (immediate) {
    flushEventQueue();
  } else {
    scheduleFlush();
  }
}

// ─── HIGH-LEVEL CONVENIENCE HELPERS ──────────────────────────────────────────

export function trackPageView(path?: string, title?: string): void {
  trackEvent('page_view', {
    path: path ? sanitizePath(path) : sanitizePath(window.location.pathname),
    title: (title || document.title || '').slice(0, 100),
  });
}

export function trackSectionView(sectionId: string, durationMs?: number): void {
  lastActiveSection = sectionId;
  trackEvent('section_view', {
    section_id: sectionId.slice(0, 60),
    duration_ms: durationMs ? Math.round(durationMs) : undefined,
  });
}

export function trackCtaClick(ctaId: string, ctaText?: string, location?: string, targetUrl?: string): void {
  lastCtaClicked = ctaId;
  trackEvent('cta_click', {
    cta_id: ctaId.slice(0, 60),
    cta_text: (ctaText || '').slice(0, 60),
    location: (location || 'page').slice(0, 60),
    target_url: targetUrl ? sanitizePath(targetUrl) : undefined,
  }, true);
}

export function trackPricingView(market?: string, selectedCycle?: 'monthly' | 'yearly'): void {
  trackEvent('pricing_view', {
    market: (market || 'IN').slice(0, 5),
    selected_cycle: selectedCycle || 'monthly',
  });
}

export function trackPricingPlanSelect(planId: string, market?: string, billingCycle?: string, price?: number): void {
  trackEvent('pricing_plan_select', {
    plan_id: planId.slice(0, 50),
    market: (market || 'IN').slice(0, 5),
    billing_cycle: (billingCycle || 'monthly').slice(0, 20),
    price: typeof price === 'number' ? price : undefined,
  }, true);
}

export function trackFaqOpen(faqId: string, questionKey?: string): void {
  trackEvent('faq_open', {
    faq_id: faqId.slice(0, 60),
    question_key: (questionKey || '').slice(0, 100),
  });
}

export function trackProductDemoView(featureId: string, durationMs?: number): void {
  trackEvent('product_demo_view', {
    feature_id: featureId.slice(0, 60),
    duration_ms: durationMs ? Math.round(durationMs) : undefined,
  });
}

export function trackSignupStart(market?: string, sourceCta?: string, referralCode?: string): void {
  trackEvent('signup_start', {
    market: (market || 'IN').slice(0, 5),
    source_cta: (sourceCta || lastCtaClicked || 'direct').slice(0, 60),
    referral_code: referralCode ? referralCode.slice(0, 30) : undefined,
  }, true);
}

export function trackSignupComplete(market?: string, planId?: string): void {
  trackEvent('signup_complete', {
    market: (market || 'IN').slice(0, 5),
    plan_id: (planId || 'free').slice(0, 50),
  }, true);
}

export function trackTrialStart(market?: string, planId?: string, trialDays?: number): void {
  trackEvent('trial_start', {
    market: (market || 'US').slice(0, 5),
    plan_id: (planId || 'starter').slice(0, 50),
    trial_days: trialDays || 14,
  }, true);
}

export function trackLogin(method = 'workos'): void {
  trackEvent('login', {
    method: method.slice(0, 30),
  }, true);
}

export function trackLanguageChange(fromLang: string, toLang: string): void {
  trackEvent('language_change', {
    from_lang: fromLang.slice(0, 10),
    to_lang: toLang.slice(0, 10),
  });
}

export function trackOutboundClick(targetHost: string, linkId?: string): void {
  trackEvent('outbound_click', {
    target_host: targetHost.slice(0, 100),
    link_id: (linkId || '').slice(0, 60),
  });
}

export function trackSafeError(errorName: string, errorType = 'client_runtime', statusCode?: number, path?: string): void {
  trackEvent('error', {
    error_name: (errorName || 'GenericError').slice(0, 100),
    error_type: errorType.slice(0, 50),
    status_code: statusCode,
    path: path ? sanitizePath(path) : sanitizePath(window.location.pathname),
  });
}

// ─── BROWSER LIFECYCLE (VISIBILITY & PAGE EXIT) ──────────────────────────────

export function initLifecycleTracking(): void {
  if (isLifecycleInitialized || typeof window === 'undefined') return;
  isLifecycleInitialized = true;

  // Track initial page view & session start
  trackEvent('session_start', {
    path: sanitizePath(window.location.pathname),
    ...extractUtmParameters(),
  });

  // Track visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && hasAnalyticsConsent()) {
      trackEvent('page_hidden', {
        duration_ms: Date.now() - sessionStartTime,
        last_section: lastActiveSection,
      });
      flushEventQueue(true);
    }
  });

  // Track page exit on pagehide (preferred over beforeunload)
  window.addEventListener('pagehide', () => {
    if (hasAnalyticsConsent()) {
      const sessionDurationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
      trackEvent('page_exit', {
        session_duration_s: sessionDurationSeconds,
        last_section: lastActiveSection,
        last_cta: lastCtaClicked || undefined,
      });
      flushEventQueue(true);
    }
  });

  // Listen for consent revocation to purge data immediately
  window.addEventListener('fera_consent_updated', (e: any) => {
    const updated = e.detail;
    if (!updated?.analytics) {
      eventQueue = [];
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      clearAnalyticsStorage();
    }
  });
}

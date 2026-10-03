/**
 * Anonymous Pseudonymous Identity Management for FeraSetu Analytics
 * 
 * Principle: "Measure behavior, don't manufacture identities."
 * - Random cryptographic UUIDs only.
 * - No fingerprinting (no canvas, audio, font, hardware, or screen hashes).
 * - No PII (no email, phone, name, or IP).
 * - Automatically evicts all identifiers if analytics consent is rejected or not granted.
 */

const VISITOR_ID_KEY = 'fera_visitor_id';
const SESSION_ID_KEY = 'fera_session_id';
const SESSION_ACTIVITY_KEY = 'fera_session_last_active';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

/**
 * Returns or creates an anonymous pseudonymous visitor ID.
 * Only stores to localStorage if analyticsConsent is true.
 */
export function getOrCreateVisitorId(analyticsConsent: boolean): string | null {
  if (typeof window === 'undefined') return null;

  if (!analyticsConsent) {
    try {
      localStorage.removeItem(VISITOR_ID_KEY);
    } catch {}
    return null;
  }

  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId || !/^[0-9a-f-]{36}$/i.test(visitorId)) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  } catch {
    return null;
  }
}

/**
 * Returns or creates an ephemeral session ID.
 * Rotates on new sessions or after 30 minutes of inactivity.
 */
export function getOrCreateSessionId(analyticsConsent: boolean): string | null {
  if (typeof window === 'undefined') return null;

  if (!analyticsConsent) {
    try {
      sessionStorage.removeItem(SESSION_ID_KEY);
      sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
    } catch {}
    return null;
  }

  try {
    const now = Date.now();
    const lastActiveStr = sessionStorage.getItem(SESSION_ACTIVITY_KEY);
    const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

    // If session timed out or doesn't exist, create a fresh session ID
    if (!sessionId || !lastActive || (now - lastActive > SESSION_TIMEOUT_MS)) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }

    sessionStorage.setItem(SESSION_ACTIVITY_KEY, now.toString());
    return sessionId;
  } catch {
    return null;
  }
}

/**
 * Clears all analytics storage when consent is withdrawn.
 */
export function clearAnalyticsStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(VISITOR_ID_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
  } catch {}
}

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
export function getOrCreateVisitorId(analyticsConsent, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return null;

  if (!analyticsConsent) {
    try {
      storage.removeItem(VISITOR_ID_KEY);
    } catch {}
    return null;
  }

  try {
    let visitorId = storage.getItem(VISITOR_ID_KEY);
    if (!visitorId || !/^[0-9a-f-]{36}$/i.test(visitorId)) {
      visitorId = crypto.randomUUID();
      storage.setItem(VISITOR_ID_KEY, visitorId);
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
export function getOrCreateSessionId(analyticsConsent, sessionStore = typeof sessionStorage !== 'undefined' ? sessionStorage : null) {
  if (!sessionStore) return null;

  if (!analyticsConsent) {
    try {
      sessionStore.removeItem(SESSION_ID_KEY);
      sessionStore.removeItem(SESSION_ACTIVITY_KEY);
    } catch {}
    return null;
  }

  try {
    const now = Date.now();
    const lastActiveStr = sessionStore.getItem(SESSION_ACTIVITY_KEY);
    const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;
    let sessionId = sessionStore.getItem(SESSION_ID_KEY);

    // If session timed out or doesn't exist, create a fresh session ID
    if (!sessionId || !lastActive || (now - lastActive > SESSION_TIMEOUT_MS)) {
      sessionId = crypto.randomUUID();
      sessionStore.setItem(SESSION_ID_KEY, sessionId);
    }

    sessionStore.setItem(SESSION_ACTIVITY_KEY, now.toString());
    return sessionId;
  } catch {
    return null;
  }
}

/**
 * Clears all analytics storage when consent is withdrawn.
 */
export function clearAnalyticsStorage(
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  sessionStore = typeof sessionStorage !== 'undefined' ? sessionStorage : null
) {
  try {
    if (storage) storage.removeItem(VISITOR_ID_KEY);
    if (sessionStore) {
      sessionStore.removeItem(SESSION_ID_KEY);
      sessionStore.removeItem(SESSION_ACTIVITY_KEY);
    }
  } catch {}
}

// authBridge.ts
// Shared singleton that bridges WorkOS token retrieval and API 401 handling.
// Design rules: never log token values — only log event type + URL.

const IS_DEV = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;
function bridgeLog(event: string, detail?: string) {
  if (!IS_DEV) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[authBridge ${ts}] ${event}${detail ? ` — ${detail}` : ''}`);
}

type UnauthorizedContext = {
  url: string;
  status: number;
  error: unknown;
};

type UnauthorizedHandler = (context: UnauthorizedContext) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let rawTokenGetter: () => Promise<string | null> = async () => null;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let inFlightTokenPromise: Promise<string | null> | null = null;

export async function getWorkOSToken(): Promise<string | null> {
  const now = Date.now();
  // Return cached token if valid for at least another 60 seconds
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  // Deduplicate concurrent token retrieval so parallel API requests share one refresh cycle
  if (inFlightTokenPromise) {
    return inFlightTokenPromise;
  }

  inFlightTokenPromise = (async () => {
    try {
      const fresh = await rawTokenGetter();
      if (fresh) {
        cachedToken = fresh;
        try {
          const parts = fresh.split('.');
          if (parts.length === 3) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
            if (payload && typeof payload.exp === 'number') {
              tokenExpiresAt = payload.exp * 1000;
            } else {
              tokenExpiresAt = Date.now() + 10 * 60 * 1000;
            }
          } else {
            tokenExpiresAt = Date.now() + 10 * 60 * 1000;
          }
        } catch {
          tokenExpiresAt = Date.now() + 10 * 60 * 1000;
        }
        return fresh;
      }
    } catch (err) {
      console.warn('[authBridge] Token retrieval error:', err);
    } finally {
      inFlightTokenPromise = null;
    }

    // Never return an expired token — returning an expired token guarantees a 401 and cascading logout
    if (cachedToken && Date.now() < tokenExpiresAt) {
      return cachedToken;
    }
    return null;
  })();

  return inFlightTokenPromise;
}

export function setWorkOSTokenGetter(getter: () => Promise<string | null>) {
  rawTokenGetter = getter;
}

export function clearCachedToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(context: UnauthorizedContext) {
  // API_401 event — no token/code values logged, only URL + status.
  bridgeLog('API_401', `${context.status} on ${context.url}`);
  unauthorizedHandler?.(context);
}


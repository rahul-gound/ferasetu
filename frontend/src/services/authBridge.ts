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

export async function getWorkOSToken(): Promise<string | null> {
  const now = Date.now();
  // Return cached token if valid for at least another 60 seconds
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }
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
            tokenExpiresAt = now + 15 * 60 * 1000;
          }
        } else {
          tokenExpiresAt = now + 15 * 60 * 1000;
        }
      } catch {
        tokenExpiresAt = now + 15 * 60 * 1000;
      }
      return fresh;
    }
  } catch (err) {
    console.warn('[authBridge] Token retrieval error:', err);
  }
  return cachedToken;
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
  unauthorizedHandler?.(context);
}

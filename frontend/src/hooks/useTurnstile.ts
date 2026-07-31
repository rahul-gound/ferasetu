import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useTurnstile
 * -----------
 * React hook that loads the Cloudflare Turnstile script and renders an
 * INVISIBLE widget into a supplied container element. Human users never see
 * a challenge; only suspicious traffic gets an interactive puzzle.
 *
 * Returns a `getVerifiedToken()` function that:
 *   1. Forces Turnstile to execute (in invisible mode this is silent).
 *   2. Posts the resulting token to the Worker `/api/auth/verify-turnstile`
 *      endpoint for server-side verification (the Worker calls Cloudflare's
 *      siteverify API — the token alone is never trusted on the client).
 *   3. Resolves with the server-verified token, or rejects with a
 *      user-friendly error message ready to be shown in the UI.
 *
 * The verified token is then forwarded by the caller to whichever auth
 * flow needs it (login, signup, password reset, email-verification resend)
 * so the Worker has proof-of-humanness *for that specific action*.
 *
 * Fail-close: if `VITE_TURNSTILE_SITE_KEY` is configured but Turnstile
 * cannot produce a token (script blocked, network error), the hook rejects.
 * If no site key is configured (local dev / tests), `getVerifiedToken()`
 * resolves with an empty string and the Worker treats it as "skip".
 */

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const TURNSTILE_API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const VERIFY_ENDPOINT = '/api/auth/verify-turnstile';

// Augment the global `window` so TS knows about the injected Turnstile API.
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          mode?: 'invisible' | 'managed' | 'non-interactive';
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          'timeout-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact';
        },
      ) => string;
      execute: (
        container: HTMLElement | string,
        options?: { callback?: (token: string) => void },
      ) => void;
      reset: (container?: HTMLElement | string) => void;
      remove: (container: HTMLElement | string) => void;
    };
  }
}

interface TurnstileHook {
  /** Ref to attach to a hidden div container — the widget renders inside it. */
  containerRef: React.RefObject<HTMLDivElement>;
  /** True once the Turnstile script has finished loading. */
  ready: boolean;
  /**
   * Execute the invisible widget and verify the token server-side.
   * Resolves with the verified token (string) or rejects with a message.
   */
  getVerifiedToken: () => Promise<string>;
  /** Reset the widget so a fresh token is minted on the next call. */
  reset: () => void;
}

// Tracks how many components on a page have injected the Turnstile script.
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_API_URL}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = TURNSTILE_API_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export function useTurnstile(): TurnstileHook {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string>('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!TURNSTILE_SITE_KEY) {
      // No site key configured — skip silently (local dev).
      setReady(true);
      return;
    }
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return; // already rendered
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          mode: 'invisible',
          callback: (token: string) => {
            tokenRef.current = token;
          },
          'error-callback': () => {
            tokenRef.current = '';
          },
          'expired-callback': () => {
            tokenRef.current = '';
          },
          'timeout-callback': () => {
            tokenRef.current = '';
          },
        });
        setReady(true);
      })
      .catch(() => {
        // Script failed to load — we will fail-close on getVerifiedToken.
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* noop */
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  const getVerifiedToken = useCallback(async (): Promise<string> => {
    // Local-dev bypass: no site key configured → empty token; Worker skips.
    if (!TURNSTILE_SITE_KEY) return '';

    if (!window.turnstile || !containerRef.current) {
      throw new Error('Security check failed to load. Please refresh and try again.');
    }

    // Reset any stale token, then execute the invisible widget and wait
    // for Cloudflare to mint a fresh one.
    tokenRef.current = '';
    window.turnstile.reset(widgetIdRef.current ?? undefined);
    const rawToken = await new Promise<string>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Security check timed out. Please try again.'));
        }
      }, 15_000);
      window.turnstile!.execute(containerRef.current!, {
        callback: (token: string) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          if (!token) {
            reject(new Error('Security check failed. Please try again.'));
            return;
          }
          resolve(token);
        },
      });
    });

    // Server-side verification — the token is never trusted on the client.
    // The Worker calls Cloudflare's siteverify API and only returns success
    // if Cloudflare confirms the token is valid and not expired.
    let verifyRes: Response;
    try {
      verifyRes = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}${VERIFY_ENDPOINT}`.replace(
          /\/api\/api\//,
          '/api/',
        ),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: rawToken }),
        },
      );
    } catch {
      // Network/Worker errors are treated as fail-close — a bot could
      // intentionally block the verification call, but a legitimate user
      // also cannot proceed without a verified token, so we show a
      // generic message prompting a retry.
      throw new Error('Unable to reach security service. Check your connection and try again.');
    }

    if (!verifyRes.ok) {
      // The Worker returns 403 for invalid/expired tokens and 429 for
      // too many verification attempts. Surface a friendly message.
      if (verifyRes.status === 429) {
        throw new Error('Too many attempts. Please wait a minute and try again.');
      }
      throw new Error('Security verification failed. Please try again.');
    }

    return rawToken; // Returns the now-verified token for the caller to forward.
  }, []);

  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
    tokenRef.current = '';
  }, []);

  return { containerRef, ready, getVerifiedToken, reset };
}

export { TURNSTILE_SITE_KEY };

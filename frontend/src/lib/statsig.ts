/**
 * Deferred Statsig & Analytics Loader
 * 
 * Dynamically loads and initializes Statsig Client, AutoCapture, and Session Replay
 * in the background (using requestIdleCallback or post-load timer) so that:
 * 1. vendor-statsig (314 kB JS) is removed from the critical initial render bundle.
 * 2. DOM paint and first interactive render are never blocked.
 * 3. Network preflights and telemetries execute cleanly in browser idle periods.
 * 4. Ad-blockers, tracking protection, and offline networks are handled gracefully
 *    without throwing unhandled exceptions, retry loops, or console error noise.
 */

export function initDeferredStatsig() {
  if (typeof window === 'undefined') return;

  const launchStatsig = () => {
    Promise.all([
      import('@statsig/js-client'),
      import('@statsig/web-analytics'),
      import('@statsig/session-replay'),
    ])
      .then(([{ StatsigClient, Log, LogLevel }, { StatsigAutoCapturePlugin }, { StatsigSessionReplayPlugin }]) => {
        // Mute internal Statsig console logger (LogLevel.None = 0) to avoid spamming console
        if (Log && LogLevel) {
          Log.level = LogLevel.None;
        }

        // Track if Statsig endpoints are blocked by client ad-blockers (e.g. uBlock, Brave Shields) or offline state
        let isNetworkBlocked = typeof navigator !== 'undefined' && navigator.onLine === false;

        if (typeof window !== 'undefined') {
          window.addEventListener('offline', () => { isNetworkBlocked = true; });
        }

        const createSyntheticResponse = (url: string) => {
          const body = url.includes('/initialize')
            ? JSON.stringify({ has_updates: false, feature_gates: {}, dynamic_configs: {}, layer_configs: {} })
            : JSON.stringify({ success: true });

          return new Response(body, {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' },
          });
        };

        const client = new StatsigClient(
          'client-XOZr1YiFOBSi6y6elVRLgwEQSY44LvCVpRwTzdfbd98',
          { userID: 'a-user' },
          {
            logLevel: LogLevel ? LogLevel.None : 0,
            networkConfig: {
              networkTimeoutMs: 5000,
              networkOverrideFunc: async (url: string, args: any) => {
                // If known to be blocked by ad-blocker or offline, return synthetic success immediately
                // without triggering browser ERR_BLOCKED_BY_CLIENT errors
                if (isNetworkBlocked) {
                  return createSyntheticResponse(url);
                }

                try {
                  return await fetch(url, args);
                } catch (_err) {
                  // If fetch throws TypeError: Failed to fetch (standard ad-blocker / network behavior):
                  // 1. Mark as blocked so subsequent flushes never attempt network calls
                  // 2. Return synthetic 200 response so Statsig empties its queue without retrying 8 times
                  //    or logging unhandled console errors
                  isNetworkBlocked = true;
                  return createSyntheticResponse(url);
                }
              },
            },
            plugins: [
              new StatsigAutoCapturePlugin({
                consoleLogAutoCaptureSettings: { enabled: false }, // Prevent intercepting window.console
              }),
              new StatsigSessionReplayPlugin(),
            ],
          }
        );

        client.initializeAsync().catch(() => {
          // Gracefully handle any initialization rejection
        });
      })
      .catch(() => {
        // Deferred modules load failure (e.g. ad-blocker blocking script load or offline) - fail silently
      });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => launchStatsig(), { timeout: 3500 });
  } else {
    window.addEventListener('load', () => setTimeout(launchStatsig, 1500), { once: true });
  }
}


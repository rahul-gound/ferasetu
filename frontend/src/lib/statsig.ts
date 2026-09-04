/**
 * Deferred Statsig & Analytics Loader
 * 
 * Dynamically loads and initializes Statsig Client, AutoCapture, and Session Replay
 * in the background (using requestIdleCallback or post-load timer) so that:
 * 1. vendor-statsig (325 kB JS) is removed from the critical initial render bundle.
 * 2. DOM paint and first interactive render are never blocked.
 * 3. Network preflights and telemetries execute cleanly in browser idle periods.
 */

export function initDeferredStatsig() {
  if (typeof window === 'undefined') return;

  const launchStatsig = () => {
    Promise.all([
      import('@statsig/js-client'),
      import('@statsig/web-analytics'),
      import('@statsig/session-replay'),
    ])
      .then(([{ StatsigClient }, { StatsigAutoCapturePlugin }, { StatsigSessionReplayPlugin }]) => {
        const client = new StatsigClient(
          'client-XOZr1YiFOBSi6y6elVRLgwEQSY44LvCVpRwTzdfbd98',
          { userID: 'a-user' },
          { plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()] }
        );
        client.initializeAsync().catch((err) => {
          if (import.meta.env.DEV) console.warn('Deferred Statsig initialization warning:', err);
        });
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('Failed to load deferred Statsig modules:', err);
      });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => launchStatsig(), { timeout: 3500 });
  } else {
    window.addEventListener('load', () => setTimeout(launchStatsig, 1500), { once: true });
  }
}

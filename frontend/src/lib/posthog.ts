import posthog from 'posthog-js';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

export const isPostHogConfigured = Boolean(posthogKey && posthogHost);

if (!isPostHogConfigured) {
  if (import.meta.env.DEV) {
    const missingVariable = posthogKey ? 'VITE_POSTHOG_HOST' : 'VITE_POSTHOG_KEY';
    throw new Error(`${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`);
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: false, // Prevent continuous DOM scanning & mutation observers
    disable_session_recording: true, // Prevent continuous DOM snapshotting & serialization
    capture_pageview: false, // Page views explicitly tracked via first-party tracker
    advanced_disable_decide: true, // Prevent remote feature flag polling thrash
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    logs: {
      serviceName: 'fera-shopkeeper-web',
      environment: import.meta.env.MODE,
    },
  });

  posthog.logger.info('posthog browser logging initialized', {
    log_source: 'posthog_exporter',
  });
}

export default posthog;

import posthog, { isPostHogConfigured } from './posthog';

type LogAttributes = Record<string, string | number | boolean | undefined>;

function info(message: string, attributes: LogAttributes = {}) {
  if (!isPostHogConfigured) return;
  posthog.logger.info(message, attributes);
}

function warn(message: string, attributes: LogAttributes = {}) {
  if (!isPostHogConfigured) return;
  posthog.logger.warn(message, attributes);
}

export const posthogLogger = { info, warn };

/**
 * FeraSetu Horizontal Sharding & Media Storage Configuration
 *
 * Configurable thresholds for multi-tenant horizontal sharding, D1 capacities,
 * and plan-based media storage quotas.
 */

// Sharding capacity thresholds
export const DEFAULT_SHOP_TARGET_PER_SHARD = 3697;
export const DEV_SHOP_TARGET_PER_SHARD = 3;

export const D1_WARNING_THRESHOLD = 0.70; // 70% D1 storage usage
export const D1_SPLIT_THRESHOLD = 0.80;   // 80% D1 storage usage
export const MAX_D1_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB maximum safe D1 limit

// Valid markets & shard statuses
export const VALID_MARKETS = ['IN', 'US', 'EU'];

export const SHARD_STATUS = {
  PROVISIONING: 'provisioning',
  ACTIVE: 'active',
  WARNING: 'warning',
  DRAINING: 'draining',
  FULL: 'full',
  FAILED: 'failed',
  RETIRED: 'retired',
};

// Plan-based media storage quotas (bytes)
export const MEDIA_QUOTAS = {
  IN: {
    free: 500 * 1024 * 1024,             // 500 MB
    business: 10 * 1024 * 1024 * 1024,   // 10 GB
    growth: 10 * 1024 * 1024 * 1024,     // legacy alias
    basic: 10 * 1024 * 1024 * 1024,
    pro: 50 * 1024 * 1024 * 1024,        // 50 GB
    premium: 50 * 1024 * 1024 * 1024,
    trial: 500 * 1024 * 1024,
    beta: 500 * 1024 * 1024,
  },
  US: {
    free: 500 * 1024 * 1024,             // 500 MB trial/free
    starter: 10 * 1024 * 1024 * 1024,    // 10 GB
    growth: 50 * 1024 * 1024 * 1024,     // 50 GB
    pro: 100 * 1024 * 1024 * 1024,       // 100 GB
    scale: 250 * 1024 * 1024 * 1024,     // 250 GB
    enterprise: 250 * 1024 * 1024 * 1024,
    trial: 10 * 1024 * 1024 * 1024,
  },
  EU: {
    free: 500 * 1024 * 1024,
    starter: 10 * 1024 * 1024 * 1024,    // 10 GB
    growth: 50 * 1024 * 1024 * 1024,     // 50 GB
    pro: 100 * 1024 * 1024 * 1024,       // 100 GB
    scale: 250 * 1024 * 1024 * 1024,     // 250 GB
    enterprise: 250 * 1024 * 1024 * 1024,
    trial: 10 * 1024 * 1024 * 1024,
  }
};

// Upload security limits
export const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per file
export const UPLOAD_RESERVATION_TTL_SECONDS = 15 * 60;        // 15 minutes TTL

/**
 * Returns the effective shop target capacity for the current environment.
 */
export function getShopTargetPerShard(env) {
  if (env?.DEV_SHOP_TARGET_PER_SHARD) {
    const parsed = parseInt(env.DEV_SHOP_TARGET_PER_SHARD, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (env?.ENVIRONMENT === 'test' || env?.ENVIRONMENT === 'development' || env?.DEV_MODE === 'true' || env?.DEV_MODE === true) {
    return DEV_SHOP_TARGET_PER_SHARD;
  }
  if (env?.SHOP_TARGET_PER_SHARD) {
    const parsed = parseInt(env.SHOP_TARGET_PER_SHARD, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_SHOP_TARGET_PER_SHARD;
}

/**
 * Returns authoritative media quota in bytes based on market and plan.
 */
export function getAuthoritativeMediaQuota(market, plan, env) {
  const normMarket = (typeof market === 'string' ? market.toUpperCase().trim() : 'IN');
  const normPlan = (typeof plan === 'string' ? plan.toLowerCase().trim() : 'free');

  const marketQuotas = MEDIA_QUOTAS[normMarket] || MEDIA_QUOTAS.IN;
  return marketQuotas[normPlan] ?? marketQuotas.free ?? (500 * 1024 * 1024);
}

/**
 * Returns max file size limit.
 */
export function getMaxUploadFileSizeBytes(env) {
  if (env?.MAX_UPLOAD_FILE_SIZE_BYTES) {
    const parsed = parseInt(env.MAX_UPLOAD_FILE_SIZE_BYTES, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_FILE_SIZE_BYTES;
}

/**
 * Returns upload reservation TTL in seconds.
 */
export function getReservationTtlSeconds(env) {
  if (env?.UPLOAD_RESERVATION_TTL_SECONDS) {
    const parsed = parseInt(env.UPLOAD_RESERVATION_TTL_SECONDS, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return UPLOAD_RESERVATION_TTL_SECONDS;
}

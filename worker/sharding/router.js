/**
 * FeraSetu Shard Router & Tenant Assignment Engine
 *
 * Server-authoritative routing and capacity balancing:
 * - Directs shops to active market shards based on verified capacity
 * - Automatically triggers asynchronous or non-blocking provisioning on saturation
 * - Caches tenant -> shard resolution metadata in memory for low-latency queries
 */

import {
  getShopTargetPerShard,
  D1_WARNING_THRESHOLD,
  D1_SPLIT_THRESHOLD,
  MAX_D1_BYTES,
  SHARD_STATUS,
  VALID_MARKETS,
  getAuthoritativeMediaQuota
} from './config.js';
import { logShardingEvent } from './observability.js';
import { provisionNewShard } from './provisioner.js';

// Short-lived isolate cache for shopId -> shard metadata (TTL: 60s)
const shardCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

export function getCachedShard(shopId) {
  const cached = shardCache.get(shopId);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    shardCache.delete(shopId);
    return null;
  }
  return cached.shard;
}

export function setCachedShard(shopId, shard) {
  shardCache.set(shopId, {
    shard,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateShardCache(shopId) {
  if (shopId) shardCache.delete(shopId);
  else shardCache.clear();
}

/**
 * Assigns a tenant shop to an authoritative shard for its market.
 */
export async function assignTenantToShard(shopId, market, env, options = {}) {
  const normMarket = typeof market === 'string' && VALID_MARKETS.includes(market.toUpperCase().trim())
    ? market.toUpperCase().trim()
    : 'IN';

  const db = env.DB;
  const shopTarget = getShopTargetPerShard(env);
  const maxSafeD1Bytes = D1_SPLIT_THRESHOLD * MAX_D1_BYTES;

  // Check if shop is already assigned to a shard
  const existingShop = await db.prepare("SELECT id, shard_id FROM shops WHERE id = ?").bind(shopId).first();
  if (existingShop?.shard_id) {
    const existingShard = await db.prepare("SELECT * FROM shards WHERE id = ?").bind(existingShop.shard_id).first();
    if (existingShard) {
      setCachedShard(shopId, existingShard);
      return existingShard;
    }
  }

  // Find candidate active shards in this market ordered by capacity
  const candidateRows = await db.prepare(`
    SELECT * FROM shards
    WHERE market = ? AND status IN ('active', 'warning')
    ORDER BY shop_count ASC, created_at ASC
  `).bind(normMarket).all();

  const candidates = candidateRows?.results || [];
  let selectedShard = null;

  for (const shard of candidates) {
    // Capacity criteria
    const hasShopCapacity = shard.shop_count < shopTarget;
    const hasD1Capacity = (shard.d1_used_bytes || 0) < maxSafeD1Bytes;

    if (hasShopCapacity && hasD1Capacity) {
      selectedShard = shard;
      break;
    }
  }

  // If no eligible shard exists, provision a new shard
  if (!selectedShard) {
    logShardingEvent('shard_threshold_reached', {
      market: normMarket,
      reason: 'No available active shard with capacity',
      candidateCount: candidates.length,
      shopTarget,
    });

    selectedShard = await provisionNewShard(normMarket, env, options);
  }

  const now = new Date().toISOString();
  const newShopCount = (selectedShard.shop_count || 0) + 1;

  // Compute status transition if thresholds reached
  let newStatus = selectedShard.status;
  if (newShopCount >= shopTarget || (selectedShard.d1_used_bytes || 0) >= maxSafeD1Bytes) {
    newStatus = SHARD_STATUS.FULL;
    logShardingEvent('shard_threshold_reached', {
      shard_id: selectedShard.id,
      shard_key: selectedShard.shard_key,
      market: normMarket,
      shop_count: newShopCount,
      target: shopTarget,
      status: 'full',
    });
  } else if (newShopCount >= Math.floor(shopTarget * D1_WARNING_THRESHOLD)) {
    if (newStatus === SHARD_STATUS.ACTIVE) {
      newStatus = SHARD_STATUS.WARNING;
      logShardingEvent('shard_threshold_reached', {
        shard_id: selectedShard.id,
        shard_key: selectedShard.shard_key,
        market: normMarket,
        shop_count: newShopCount,
        target: shopTarget,
        status: 'warning',
      });
    }
  }

  // Atomically update shard count and status
  await db.prepare(`
    UPDATE shards SET shop_count = ?, status = ?, updated_at = ? WHERE id = ?
  `).bind(newShopCount, newStatus, now, selectedShard.id).run();

  // Store shard_id on shop record
  await db.prepare("UPDATE shops SET shard_id = ?, updated_at = ? WHERE id = ?")
    .bind(selectedShard.id, now, shopId)
    .run();

  // Initialize storage quota for the tenant in shop_storage
  const plan = options.plan || 'free';
  const quotaBytes = getAuthoritativeMediaQuota(normMarket, plan, env);

  try {
    await db.prepare(`
      INSERT OR IGNORE INTO shop_storage (shop_id, quota_bytes, used_bytes, reserved_bytes, updated_at)
      VALUES (?, ?, 0, 0, ?)
    `).bind(shopId, quotaBytes, now).run();
  } catch (storageErr) {
    console.warn("[assignTenantToShard] Storage quota init notice:", storageErr);
  }

  const updatedShard = {
    ...selectedShard,
    shop_count: newShopCount,
    status: newStatus,
  };

  setCachedShard(shopId, updatedShard);

  logShardingEvent('tenant_assigned', {
    shop_id: shopId,
    shard_id: selectedShard.id,
    shard_key: selectedShard.shard_key,
    market: normMarket,
    new_shop_count: newShopCount,
  });

  return updatedShard;
}

/**
 * Resolves the assigned shard for a shop, fetching from control plane if uncached.
 */
export async function getShardForShop(shopId, env) {
  const cached = getCachedShard(shopId);
  if (cached) return cached;

  const db = env.DB;
  const shopRow = await db.prepare("SELECT id, shard_id FROM shops WHERE id = ?").bind(shopId).first();
  if (!shopRow || !shopRow.shard_id) {
    return null;
  }

  const shard = await db.prepare("SELECT * FROM shards WHERE id = ?").bind(shopRow.shard_id).first();
  if (shard) {
    setCachedShard(shopId, shard);
  }
  return shard;
}

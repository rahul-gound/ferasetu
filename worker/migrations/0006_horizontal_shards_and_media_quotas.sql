-- Migration 0006: Horizontal Tenant Sharding & Media Storage Quotas
-- Adds control-plane tables for sharding and R2 media quota management.

-- Shards registry
CREATE TABLE IF NOT EXISTS shards (
  id TEXT PRIMARY KEY,
  shard_key TEXT UNIQUE NOT NULL,
  market TEXT NOT NULL CHECK(market IN ('IN', 'US', 'EU')),
  d1_database_id TEXT NOT NULL,
  d1_database_name TEXT NOT NULL,
  r2_bucket_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('provisioning', 'active', 'warning', 'draining', 'full', 'failed', 'retired')),
  shop_count INTEGER NOT NULL DEFAULT 0,
  d1_used_bytes INTEGER NOT NULL DEFAULT 0,
  d1_size_checked_at TEXT,
  r2_used_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shards_market_status ON shards(market, status);
CREATE INDEX IF NOT EXISTS idx_shards_key ON shards(shard_key);

-- Distributed shard provisioning locks
CREATE TABLE IF NOT EXISTS shard_locks (
  market TEXT PRIMARY KEY,
  locked_by TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Associate shops with assigned shard
ALTER TABLE shops ADD COLUMN shard_id TEXT;
CREATE INDEX IF NOT EXISTS idx_shops_shard ON shops(shard_id);

-- Shop media storage quotas
CREATE TABLE IF NOT EXISTS shop_storage (
  shop_id TEXT PRIMARY KEY,
  quota_bytes INTEGER NOT NULL,
  used_bytes INTEGER NOT NULL DEFAULT 0,
  reserved_bytes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Media files registry
CREATE TABLE IF NOT EXISTS media_files (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_type TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_files_shop ON media_files(shop_id);
CREATE INDEX IF NOT EXISTS idx_media_files_key ON media_files(r2_key);

-- Upload reservations
CREATE TABLE IF NOT EXISTS upload_reservations (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  reserved_bytes INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_upload_res_shop ON upload_reservations(shop_id);
CREATE INDEX IF NOT EXISTS idx_upload_res_status ON upload_reservations(status);

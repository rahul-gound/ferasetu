-- Migration 0016: Privacy-First First-Party Analytics and Aggregate Telemetry
-- Philosophy: "Measure behavior, don't manufacture identities."
-- First-party event storage, tenant-isolated aggregates, and pseudonymized attribution.

-- 1. Create analytics_events table if it does not exist
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  organization_id TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'platform',
  visitor_id TEXT,
  session_id TEXT,
  event_name TEXT NOT NULL DEFAULT 'page_view',
  event_type TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1,
  properties TEXT,
  event_data TEXT,
  country TEXT,
  device_category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ensure newly added columns exist if table was previously created with minimal schema
-- (Handled safely with ALTER TABLE in migration and worker initialization)

-- Indexes for efficient tenant-isolated querying and retention pruning
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_time ON analytics_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time ON analytics_events(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

-- 2. Create daily aggregates table for long-term retention without raw data leakage
CREATE TABLE IF NOT EXISTS analytics_aggregates_daily (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  metric_name TEXT NOT NULL,
  dimension TEXT NOT NULL DEFAULT 'all',
  count INTEGER NOT NULL DEFAULT 0,
  value REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_aggregates_unique
ON analytics_aggregates_daily(tenant_id, date, metric_name, dimension);

CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_lookup
ON analytics_aggregates_daily(tenant_id, date);

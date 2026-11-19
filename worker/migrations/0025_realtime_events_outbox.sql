-- Migration 0025: Realtime Transactional Outbox & Event Reconciliation Ledger
CREATE TABLE IF NOT EXISTS realtime_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  resource_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  audience TEXT NOT NULL DEFAULT 'merchant',
  created_at TEXT NOT NULL,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_realtime_events_org ON realtime_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_events_unpublished ON realtime_events(organization_id, published_at);

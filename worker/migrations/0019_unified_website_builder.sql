-- Migration 0019: Unified Website Builder (Drafts, Versions, Connections, and Media Assets)
-- Provides multi-tenant draft autosave, immutable version snapshots, external connections vault, and asset staging.

CREATE TABLE IF NOT EXISTS website_drafts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  draft_data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_website_drafts_org ON website_drafts(organization_id);

CREATE TABLE IF NOT EXISTS website_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot_data TEXT NOT NULL,
  description TEXT,
  published_at TEXT NOT NULL,
  published_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_website_versions_org ON website_versions(organization_id, version_number DESC);

CREATE TABLE IF NOT EXISTS website_connections (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  connection_type TEXT NOT NULL,
  name TEXT NOT NULL,
  config_json TEXT NOT NULL,
  secrets_encrypted TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_website_conns_org ON website_connections(organization_id);

-- Ensure media_files has is_draft and visibility columns for staging
ALTER TABLE media_files ADD COLUMN is_draft INTEGER NOT NULL DEFAULT 1;
ALTER TABLE media_files ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';

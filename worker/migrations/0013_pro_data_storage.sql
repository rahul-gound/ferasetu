-- FeraSetu Pro Data & Storage Schema Migration (0013)
-- =============================================================================
-- Tenant-isolated control-plane metadata for external database & storage sources,
-- server-side encrypted credential envelopes, versioned immutable B2 snapshots,
-- backup items, background operations, restore tracking, and exports.
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_data_sources (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'database' | 'storage'
  provider TEXT NOT NULL, -- 'postgres' | 'mysql' | 'libsql' | 's3_compatible' | 'b2'
  name TEXT NOT NULL,
  connection_strategy TEXT NOT NULL DEFAULT 'direct_tcp', -- 'direct_tcp' | 'neon_http' | 'supabase_rest' | 'planetscale_http' | 'libsql_http' | 'sigv4'
  status TEXT NOT NULL DEFAULT 'connected', -- 'connected' | 'error' | 'unverified' | 'disconnected'
  credential_reference TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '{}',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_site_data_sources_tenant ON site_data_sources(tenant_id);

CREATE TABLE IF NOT EXISTS site_data_source_credentials (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  envelope_version INTEGER NOT NULL DEFAULT 1,
  encrypted_envelope TEXT NOT NULL, -- { iv, salt, ciphertext, tag, algorithm: 'AES-256-GCM' }
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_site_data_source_credentials_tenant ON site_data_source_credentials(tenant_id);

CREATE TABLE IF NOT EXISTS site_backup_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  data_source_id TEXT NOT NULL,
  schedule TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'daily' | 'weekly' | 'monthly'
  retention_days INTEGER NOT NULL DEFAULT 30,
  enable_object_lock INTEGER NOT NULL DEFAULT 0,
  selected_tables TEXT NOT NULL DEFAULT '[]',
  selected_prefixes TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, data_source_id)
);
CREATE INDEX IF NOT EXISTS idx_site_backup_policies_tenant ON site_backup_policies(tenant_id);

CREATE TABLE IF NOT EXISTS site_backup_snapshots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  data_source_id TEXT NOT NULL,
  snapshot_number INTEGER NOT NULL DEFAULT 1,
  snapshot_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'scheduled' | 'safety'
  status TEXT NOT NULL DEFAULT 'REQUESTED', -- 'REQUESTED' | 'INSPECTING' | 'SNAPSHOT_PENDING' | 'EXPORTING' | 'SCANNING' | 'UPLOADING' | 'COPYING' | 'VERIFYING' | 'COMMITTED' | 'FAILED' | 'INTEGRITY_FAILED' | 'MARKED_FOR_DELETION'
  schema_fingerprint TEXT,
  content_fingerprint TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  table_count INTEGER NOT NULL DEFAULT 0,
  b2_manifest_key TEXT,
  b2_root_prefix TEXT NOT NULL,
  manifest_summary TEXT,
  object_lock_mode TEXT,
  object_lock_until TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  expires_at TEXT,
  UNIQUE(data_source_id, snapshot_number)
);
CREATE INDEX IF NOT EXISTS idx_site_backup_snapshots_tenant ON site_backup_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_backup_snapshots_source ON site_backup_snapshots(data_source_id);

CREATE TABLE IF NOT EXISTS site_backup_items (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  source_path TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'table', -- 'table' | 'object' | 'schema'
  size_bytes INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT NOT NULL,
  b2_object_key TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_site_backup_items_snapshot ON site_backup_items(snapshot_id);

CREATE TABLE IF NOT EXISTS site_backup_operations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  data_source_id TEXT NOT NULL,
  snapshot_id TEXT,
  operation_type TEXT NOT NULL DEFAULT 'backup', -- 'backup' | 'retention_cleanup'
  status TEXT NOT NULL DEFAULT 'REQUESTED', -- 'REQUESTED' | 'INSPECTING' | 'EXPORTING' | 'SCANNING' | 'UPLOADING' | 'COPYING' | 'VERIFYING' | 'COMMITTED' | 'FAILED' | 'CANCELLED'
  current_step TEXT NOT NULL DEFAULT 'init',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT,
  error_message TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_site_backup_operations_tenant ON site_backup_operations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_backup_operations_source ON site_backup_operations(data_source_id);

CREATE TABLE IF NOT EXISTS site_restore_operations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  data_source_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'as_new', -- 'as_new' | 'selected' | 'replace_existing'
  status TEXT NOT NULL DEFAULT 'REQUESTED', -- 'REQUESTED' | 'PREVIEW' | 'SAFETY_SNAPSHOT' | 'RESTORING' | 'COMPLETED' | 'FAILED'
  current_step TEXT NOT NULL DEFAULT 'init',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  safety_snapshot_id TEXT,
  conflicts TEXT,
  target_destination TEXT,
  result_summary TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_site_restore_operations_tenant ON site_restore_operations(tenant_id);

CREATE TABLE IF NOT EXISTS site_export_operations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  data_source_id TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'sql', -- 'sql' | 'json' | 'zip'
  status TEXT NOT NULL DEFAULT 'REQUESTED', -- 'REQUESTED' | 'PACKAGING' | 'UPLOADING' | 'COMPLETED' | 'FAILED'
  b2_export_key TEXT,
  download_url TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_site_export_operations_tenant ON site_export_operations(tenant_id);

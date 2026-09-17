-- Migration 0012: FeraSetu Pro Project Import & Deterministic Analysis Engine
-- Manages imported project snapshots, versioning, source file trees,
-- 3-way re-import diff state, and deterministic source-to-resource mappings.

-- 1. Imported Project Entities
CREATE TABLE IF NOT EXISTS site_imported_projects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  framework TEXT NOT NULL DEFAULT 'react',
  current_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'analyzed'
    CHECK(status IN ('analyzed', 'committed', 'deprecated')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, project_name)
);

CREATE INDEX IF NOT EXISTS idx_site_imported_projects_tenant ON site_imported_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_imported_projects_status ON site_imported_projects(tenant_id, status);

-- 2. Project Import Versions (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS site_import_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  project_fingerprint TEXT NOT NULL,
  manifest_b2_key TEXT NOT NULL,
  source_archive_b2_key TEXT NOT NULL,
  import_status TEXT NOT NULL DEFAULT 'SNAPSHOT_PENDING'
    CHECK(import_status IN ('SNAPSHOT_PENDING', 'SNAPSHOT_READY', 'IMPORTING', 'COMMITTED', 'FAILED')),
  created_at TEXT NOT NULL,
  UNIQUE(project_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_site_import_versions_project ON site_import_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_site_import_versions_status ON site_import_versions(project_id, import_status);

-- 3. Project Source File Metadata
CREATE TABLE IF NOT EXISTS site_source_files (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  source_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'text',
  relevant_metadata TEXT,
  UNIQUE(version_id, source_path)
);

CREATE INDEX IF NOT EXISTS idx_site_source_files_version ON site_source_files(version_id);
CREATE INDEX IF NOT EXISTS idx_site_source_files_path ON site_source_files(version_id, source_path);

-- 4. Source Resource Mappings (Deterministic Identity)
CREATE TABLE IF NOT EXISTS site_source_mappings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  source_path TEXT NOT NULL,
  resource_type TEXT NOT NULL
    CHECK(resource_type IN ('page', 'route', 'function')),
  resource_id TEXT,
  deterministic_identity TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  studio_hash TEXT,
  mapping_status TEXT NOT NULL DEFAULT 'active'
    CHECK(mapping_status IN ('active', 'orphaned', 'superseded')),
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, version_id, source_path, resource_type)
);

CREATE INDEX IF NOT EXISTS idx_site_source_mappings_proj_ver ON site_source_mappings(project_id, version_id);
CREATE INDEX IF NOT EXISTS idx_site_source_mappings_identity ON site_source_mappings(deterministic_identity);
CREATE INDEX IF NOT EXISTS idx_site_source_mappings_resource ON site_source_mappings(resource_type, resource_id);

-- 5. Re-Import Changes & 3-Way Conflict Tracking
CREATE TABLE IF NOT EXISTS site_import_changes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  from_version_id TEXT NOT NULL,
  to_version_id TEXT NOT NULL,
  source_path TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'modified'
    CHECK(change_type IN ('added', 'modified', 'deleted')),
  conflict_status TEXT NOT NULL DEFAULT 'TRUE_CONFLICT'
    CHECK(conflict_status IN ('UNCHANGED', 'EXTERNAL_ONLY_CHANGE', 'STUDIO_ONLY_CHANGE', 'SAME_FINAL_STATE', 'TRUE_CONFLICT')),
  resolution TEXT
    CHECK(resolution IN ('keep_external', 'keep_studio', 'manual_merge')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_import_changes_project ON site_import_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_site_import_changes_versions ON site_import_changes(from_version_id, to_version_id);

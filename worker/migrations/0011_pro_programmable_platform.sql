-- Migration 0011: FeraSetu Pro Programmable Website Platform
-- Multi-page website builder, controlled Fera Functions, dynamic routing,
-- atomic publishing, tenant-scoped storage, and quota governance.

-- 1. Multi-Page Site Pages
CREATE TABLE IF NOT EXISTS site_pages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'standard'
    CHECK(type IN ('standard', 'auth_login', 'auth_signup', 'auth_account', 'protected', 'custom')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'published', 'archived')),
  parent_id TEXT,
  is_homepage INTEGER NOT NULL DEFAULT 0,
  auth_required INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_site_pages_tenant ON site_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_tenant_status ON site_pages(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_site_pages_parent ON site_pages(parent_id);

-- 2. URL Routes & Access Policies
CREATE TABLE IF NOT EXISTS site_routes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  path_pattern TEXT NOT NULL,
  page_id TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'public'
    CHECK(access_level IN ('public', 'authenticated', 'merchant_admin')),
  function_binding TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, path_pattern)
);

CREATE INDEX IF NOT EXISTS idx_site_routes_tenant ON site_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_routes_page ON site_routes(page_id);

-- 3. Controlled Fera Functions
CREATE TABLE IF NOT EXISTS site_functions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'published', 'deprecated')),
  version INTEGER NOT NULL DEFAULT 1,
  timeout_ms INTEGER NOT NULL DEFAULT 1500,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_site_functions_tenant ON site_functions(tenant_id);

-- 4. Immutable Function Versions (Audit & Rollback)
CREATE TABLE IF NOT EXISTS site_function_versions (
  id TEXT PRIMARY KEY,
  function_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  definition TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '[]',
  published_at TEXT NOT NULL,
  published_by TEXT,
  UNIQUE(function_id, version)
);

CREATE INDEX IF NOT EXISTS idx_site_func_versions_tenant ON site_function_versions(tenant_id);

-- 5. Site Navigation Menus
CREATE TABLE IF NOT EXISTS site_navigation (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  menu_location TEXT NOT NULL DEFAULT 'header'
    CHECK(menu_location IN ('header', 'footer', 'sidebar')),
  items TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, menu_location)
);

CREATE INDEX IF NOT EXISTS idx_site_nav_tenant ON site_navigation(tenant_id);

-- 6. Atomic Site Deployments (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS site_deployments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK(status IN ('published', 'superseded', 'rolled_back')),
  snapshot TEXT NOT NULL,
  deployed_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_deployments_tenant ON site_deployments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_deployments_tenant_status ON site_deployments(tenant_id, status);

-- 7. Pro Resource Quotas
CREATE TABLE IF NOT EXISTS site_quotas (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  max_pages INTEGER NOT NULL DEFAULT 50,
  max_routes INTEGER NOT NULL DEFAULT 50,
  max_functions INTEGER NOT NULL DEFAULT 30,
  max_function_invocations_monthly INTEGER NOT NULL DEFAULT 50000,
  function_invocations_used INTEGER NOT NULL DEFAULT 0,
  max_storage_bytes INTEGER NOT NULL DEFAULT 104857600,
  storage_used_bytes INTEGER NOT NULL DEFAULT 0,
  max_published_versions INTEGER NOT NULL DEFAULT 20,
  max_ai_actions_monthly INTEGER NOT NULL DEFAULT 1000,
  ai_actions_used INTEGER NOT NULL DEFAULT 0,
  resets_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_quotas_tenant ON site_quotas(tenant_id);

-- 8. Tenant-Isolated Key-Value Storage (ferasetu.storage)
CREATE TABLE IF NOT EXISTS site_storage (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  bytes_size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_site_storage_tenant ON site_storage(tenant_id);

-- 9. Observability & Audit Logs
CREATE TABLE IF NOT EXISTS site_execution_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  function_name TEXT,
  event_type TEXT NOT NULL,
  details TEXT,
  duration_ms REAL,
  status_code INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_exec_logs_tenant ON site_execution_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_exec_logs_tenant_time ON site_execution_logs(tenant_id, created_at);

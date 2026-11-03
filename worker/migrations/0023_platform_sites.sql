-- Migration 0023: Platform Sites & Internal Infrastructure Management
-- Dedicated to FeraSetu platform-owned properties (help.ferasetu.com, docs.ferasetu.com, status.ferasetu.com, developers.ferasetu.com)
-- Strictly separated from merchant storefront infrastructure.

-- 1. Internal Admin Plan Entitlements
CREATE TABLE IF NOT EXISTS platform_admin_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('superadmin', 'platform_admin', 'developer', 'viewer')),
  entitlement_plan TEXT NOT NULL DEFAULT 'FERASETU_INTERNAL_ADMIN_PLAN',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'revoked')),
  quotas_json TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  revoked_by TEXT,
  revoked_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pae_user ON platform_admin_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_pae_status ON platform_admin_entitlements(status);
CREATE INDEX IF NOT EXISTS idx_pae_role ON platform_admin_entitlements(role);

-- 2. Granular Admin Permissions
CREATE TABLE IF NOT EXISTS platform_admin_permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  UNIQUE(user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_pap_user ON platform_admin_permissions(user_id);

-- 3. Platform Sites
CREATE TABLE IF NOT EXISTS platform_sites (
  id TEXT PRIMARY KEY,
  project_identifier TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hosting_target TEXT NOT NULL CHECK(hosting_target IN ('workers', 'pages')),
  primary_hostname TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'validating', 'reserved', 'provisioning', 'configuring', 'deploying', 'verifying', 'active', 'failed', 'rollback_pending', 'rolled_back', 'needs_manual_recovery', 'archived')),
  github_repo TEXT,
  github_branch TEXT DEFAULT 'main',
  build_command TEXT,
  output_dir TEXT,
  auto_deploy INTEGER NOT NULL DEFAULT 0,
  active_deployment_id TEXT,
  resource_quotas_json TEXT,
  cloudflare_project_ref TEXT,
  created_by TEXT NOT NULL,
  is_production_protected INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ps_identifier ON platform_sites(project_identifier);
CREATE INDEX IF NOT EXISTS idx_ps_hostname ON platform_sites(primary_hostname);
CREATE INDEX IF NOT EXISTS idx_ps_status ON platform_sites(status);
CREATE INDEX IF NOT EXISTS idx_ps_hosting ON platform_sites(hosting_target);

-- 4. Central Platform Hostname Registry (Logical separation of platform vs merchant hostnames)
CREATE TABLE IF NOT EXISTS platform_domains (
  hostname_id TEXT PRIMARY KEY,
  normalized_hostname TEXT UNIQUE NOT NULL,
  site_id TEXT,
  ownership_type TEXT NOT NULL CHECK(ownership_type IN ('platform', 'merchant')),
  provider TEXT NOT NULL DEFAULT 'CLOUDFLARE',
  resource_reference TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'failed')),
  tls_status TEXT NOT NULL DEFAULT 'pending' CHECK(tls_status IN ('pending', 'provisioning', 'active', 'failed')),
  provisioning_status TEXT NOT NULL DEFAULT 'reserved' CHECK(provisioning_status IN ('reserved', 'assigned', 'active', 'detached', 'failed')),
  routing_target TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pd_hostname ON platform_domains(normalized_hostname);
CREATE INDEX IF NOT EXISTS idx_pd_site ON platform_domains(site_id);
CREATE INDEX IF NOT EXISTS idx_pd_ownership ON platform_domains(ownership_type);
CREATE INDEX IF NOT EXISTS idx_pd_status ON platform_domains(provisioning_status);

-- 5. Platform Deployments
CREATE TABLE IF NOT EXISTS platform_deployments (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  version TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production' CHECK(environment IN ('production', 'staging', 'development')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'building', 'deploying', 'active', 'failed', 'rolled_back')),
  source_type TEXT NOT NULL CHECK(source_type IN ('github', 'ai_studio', 'direct_upload', 'template')),
  commit_hash TEXT,
  commit_message TEXT,
  commit_author TEXT,
  build_logs TEXT,
  rollback_target_id TEXT,
  deployed_by TEXT NOT NULL,
  manifest_json TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pdep_site ON platform_deployments(site_id);
CREATE INDEX IF NOT EXISTS idx_pdep_status ON platform_deployments(status);
CREATE INDEX IF NOT EXISTS idx_pdep_env ON platform_deployments(environment);

-- 6. Encrypted Platform Site Secrets (AES-GCM encrypted values, zero plaintext)
CREATE TABLE IF NOT EXISTS platform_site_secrets (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  masked_preview TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(site_id, environment, key_name)
);

CREATE INDEX IF NOT EXISTS idx_pss_site ON platform_site_secrets(site_id);

-- 7. Platform Site Usage & Observability
CREATE TABLE IF NOT EXISTS platform_site_usage (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  date TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  cpu_time_ms REAL NOT NULL DEFAULT 0,
  bandwidth_bytes INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  deploy_count INTEGER NOT NULL DEFAULT 0,
  build_failure_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'INTERNAL_OBSERVABILITY' CHECK(source IN ('CLOUDFLARE_API', 'INTERNAL_OBSERVABILITY', 'ESTIMATED')),
  created_at TEXT NOT NULL,
  UNIQUE(site_id, date, source)
);

CREATE INDEX IF NOT EXISTS idx_psu_site_date ON platform_site_usage(site_id, date);

-- 8. Asynchronous Provisioning State Machine Jobs
CREATE TABLE IF NOT EXISTS platform_provisioning_jobs (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  site_id TEXT NOT NULL,
  action TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('draft', 'validating', 'reserved', 'provisioning', 'configuring', 'deploying', 'verifying', 'active', 'failed', 'rollback_pending', 'rolled_back', 'needs_manual_recovery')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_details TEXT,
  payload_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ppj_site ON platform_provisioning_jobs(site_id);
CREATE INDEX IF NOT EXISTS idx_ppj_state ON platform_provisioning_jobs(state);

-- 9. Platform Audit Trail (Immutable log of privileged administrative actions)
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id TEXT PRIMARY KEY,
  site_id TEXT,
  actor_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pal_site ON platform_audit_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_pal_actor ON platform_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_pal_created ON platform_audit_logs(created_at);

-- 10. AI Studio Sessions & Proposals
CREATE TABLE IF NOT EXISTS platform_ai_sessions (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  session_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_ai_proposals (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  summary TEXT NOT NULL,
  site_specification_json TEXT NOT NULL,
  code_changes_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed', 'approved', 'rejected', 'applied', 'failed')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_paip_site ON platform_ai_proposals(site_id);
CREATE INDEX IF NOT EXISTS idx_paip_session ON platform_ai_proposals(session_id);

-- 11. Per-Site User Access Control (Scoped assignment)
CREATE TABLE IF NOT EXISTS platform_site_access (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'developer', 'viewer')),
  granted_at TEXT NOT NULL,
  UNIQUE(site_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_psa_site_user ON platform_site_access(site_id, user_id);

/**
 * FeraSetu Platform Sites — Internal Admin Plan & RBAC Authorization Layer
 * worker/services/platformSitesAuth.js
 *
 * Implements strict separation of:
 * A. Identity: Authenticated WorkOS user (or dev HMAC token).
 * B. Role: superadmin, platform_admin, developer, viewer.
 * C. Entitlement: FERASETU_INTERNAL_ADMIN_PLAN with configurable quotas.
 *
 * All platform operations are enforced server-side. Never trusts frontend checks.
 */

import { authenticateIdentity } from "../utils/auth.js";

export const INTERNAL_ADMIN_PLAN = "FERASETU_INTERNAL_ADMIN_PLAN";

export const PLATFORM_ROLES = {
  SUPERADMIN: "superadmin",
  PLATFORM_ADMIN: "platform_admin",
  DEVELOPER: "developer",
  VIEWER: "viewer",
};

export const ROLE_PERMISSIONS = {
  [PLATFORM_ROLES.SUPERADMIN]: [
    "entitlements:grant",
    "entitlements:revoke",
    "entitlements:manage",
    "admins:manage",
    "cloudflare:manage",
    "sites:create",
    "sites:read",
    "sites:update",
    "sites:delete",
    "domains:reserve",
    "domains:manage",
    "domains:detach",
    "deployments:create",
    "deployments:rollback",
    "secrets:read",
    "secrets:write",
    "secrets:delete",
    "ai:customize",
    "ai:propose",
    "ai:approve",
    "analytics:read",
    "logs:read",
    "audit:read",
    "quotas:manage"
  ],
  [PLATFORM_ROLES.PLATFORM_ADMIN]: [
    "sites:create",
    "sites:read",
    "sites:update",
    "domains:reserve",
    "domains:manage",
    "domains:detach",
    "deployments:create",
    "deployments:rollback",
    "secrets:read",
    "secrets:write",
    "secrets:delete",
    "ai:customize",
    "ai:propose",
    "ai:approve",
    "analytics:read",
    "logs:read"
  ],
  [PLATFORM_ROLES.DEVELOPER]: [
    "sites:read",
    "deployments:create",
    "secrets:read",
    "ai:propose",
    "logs:read"
  ],
  [PLATFORM_ROLES.VIEWER]: [
    "sites:read",
    "analytics:read",
    "logs:read"
  ]
};

export const DEFAULT_QUOTAS = {
  max_sites: 25,
  max_workers: 25,
  max_pages: 25,
  custom_domains_enabled: true,
  ai_customization_enabled: true,
  max_deployments_per_day: 100
};

export class PlatformAuthError extends Error {
  constructor(message, status = 403, code = "FORBIDDEN") {
    super(message);
    this.name = "PlatformAuthError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Ensures platform tables exist if DB is ready.
 */
export const PLATFORM_SITES_DDL = [
  `CREATE TABLE IF NOT EXISTS platform_admin_entitlements (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pae_user ON platform_admin_entitlements(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pae_status ON platform_admin_entitlements(status)`,
  `CREATE INDEX IF NOT EXISTS idx_pae_role ON platform_admin_entitlements(role)`,

  `CREATE TABLE IF NOT EXISTS platform_admin_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    permission_key TEXT NOT NULL,
    granted_at TEXT NOT NULL,
    UNIQUE(user_id, permission_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pap_user ON platform_admin_permissions(user_id)`,

  `CREATE TABLE IF NOT EXISTS platform_sites (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ps_identifier ON platform_sites(project_identifier)`,
  `CREATE INDEX IF NOT EXISTS idx_ps_hostname ON platform_sites(primary_hostname)`,
  `CREATE INDEX IF NOT EXISTS idx_ps_status ON platform_sites(status)`,
  `CREATE INDEX IF NOT EXISTS idx_ps_hosting ON platform_sites(hosting_target)`,

  `CREATE TABLE IF NOT EXISTS platform_domains (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pd_hostname ON platform_domains(normalized_hostname)`,
  `CREATE INDEX IF NOT EXISTS idx_pd_site ON platform_domains(site_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pd_ownership ON platform_domains(ownership_type)`,
  `CREATE INDEX IF NOT EXISTS idx_pd_status ON platform_domains(provisioning_status)`,

  `CREATE TABLE IF NOT EXISTS platform_deployments (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pdep_site ON platform_deployments(site_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pdep_status ON platform_deployments(status)`,
  `CREATE INDEX IF NOT EXISTS idx_pdep_env ON platform_deployments(environment)`,

  `CREATE TABLE IF NOT EXISTS platform_site_secrets (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pss_site ON platform_site_secrets(site_id)`,

  `CREATE TABLE IF NOT EXISTS platform_site_usage (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_psu_site_date ON platform_site_usage(site_id, date)`,

  `CREATE TABLE IF NOT EXISTS platform_provisioning_jobs (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ppj_site ON platform_provisioning_jobs(site_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ppj_state ON platform_provisioning_jobs(state)`,

  `CREATE TABLE IF NOT EXISTS platform_audit_logs (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pal_site ON platform_audit_logs(site_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pal_actor ON platform_audit_logs(actor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pal_created ON platform_audit_logs(created_at)`,

  `CREATE TABLE IF NOT EXISTS platform_ai_sessions (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS platform_ai_proposals (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_paip_site ON platform_ai_proposals(site_id)`,
  `CREATE INDEX IF NOT EXISTS idx_paip_session ON platform_ai_proposals(session_id)`,

  `CREATE TABLE IF NOT EXISTS platform_site_access (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'developer', 'viewer')),
    granted_at TEXT NOT NULL,
    UNIQUE(site_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_psa_site_user ON platform_site_access(site_id, user_id)`
];

/**
 * Ensures platform tables exist if DB is ready, executing statements individually for D1 reliability.
 */
export async function ensurePlatformSitesTables(db) {
  if (!db) return;
  for (const ddl of PLATFORM_SITES_DDL) {
    const clean = ddl.trim();
    if (!clean) continue;
    if (typeof db.prepare === 'function') {
      try {
        await db.prepare(clean).run();
      } catch (err) {
        // Table or index already exists
      }
    } else if (typeof db.exec === 'function') {
      try {
        await db.exec(clean);
      } catch (err) {}
    }
  }
}

/**
 * Validates whether user is a root superadmin in server env config.
 */
export function isRootSuperadmin(userId, userEmail, env) {
  const allowedUserIds = (env?.ADMIN_USER_IDS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const rawAllowedEmails = [
    ...(env?.ADMIN_EMAILS || "").split(","),
    env?.ADMIN_EMAIL || "",
    env?.ADMIN_USERNAME && env.ADMIN_USERNAME.includes("@") ? env.ADMIN_USERNAME : ""
  ];
  const allowedEmails = rawAllowedEmails
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  if (userId && allowedUserIds.includes(userId)) return true;
  if (userEmail && allowedEmails.includes(userEmail.toLowerCase())) return true;
  return false;
}

/**
 * Resolves or bootstraps the user's entitlement and role.
 */
export async function getPlatformUserEntitlement(userId, userEmail, env, identity = null) {
  await ensurePlatformSitesTables(env?.DB);

  if (!env?.DB) {
    // Mock entitlement for in-memory or detached dev
    return {
      userId,
      userEmail,
      role: PLATFORM_ROLES.SUPERADMIN,
      entitlementPlan: INTERNAL_ADMIN_PLAN,
      status: "active",
      quotas: DEFAULT_QUOTAS,
      permissions: ROLE_PERMISSIONS[PLATFORM_ROLES.SUPERADMIN]
    };
  }

  // 1. Check existing entitlement in D1
  let existing = null;
  try {
    existing = await env.DB.prepare(
      "SELECT * FROM platform_admin_entitlements WHERE user_id = ?"
    ).bind(userId).first();
  } catch (err) {
    // If table was missing, execute DDL definition and retry query once
    await ensurePlatformSitesTables(env.DB);
    try {
      existing = await env.DB.prepare(
        "SELECT * FROM platform_admin_entitlements WHERE user_id = ?"
      ).bind(userId).first();
    } catch {}
  }

  if (existing) {
    let quotas = DEFAULT_QUOTAS;
    try {
      quotas = JSON.parse(existing.quotas_json);
    } catch {}

    const permissions = ROLE_PERMISSIONS[existing.role] || [];
    return {
      id: existing.id,
      userId: existing.user_id,
      userEmail: existing.user_email,
      role: existing.role,
      entitlementPlan: existing.entitlement_plan,
      status: existing.status,
      quotas,
      permissions,
      grantedBy: existing.granted_by,
      grantedAt: existing.granted_at,
      revokedBy: existing.revoked_by,
      revokedAt: existing.revoked_at
    };
  }

  // 2. If not in DB, check if user is root superadmin from environment OR authenticated admin JWT
  const isAdminSession = identity?.payload?.role === "ADMIN" || identity?.method === "HMAC" || (userId && userId.startsWith("admin"));
  if (isRootSuperadmin(userId, userEmail, env) || isAdminSession) {
    const id = "pae_" + crypto.randomUUID();
    const now = new Date().toISOString();
    const quotasJson = JSON.stringify(DEFAULT_QUOTAS);
    
    try {
      await env.DB.prepare(`
        INSERT INTO platform_admin_entitlements 
        (id, user_id, user_email, role, entitlement_plan, status, quotas_json, granted_by, granted_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, userId, userEmail, PLATFORM_ROLES.SUPERADMIN, INTERNAL_ADMIN_PLAN, 'active', quotasJson, 'SYSTEM_ROOT_BOOTSTRAP', now, now).run();
    } catch (e) {
      // Ignore conflict on concurrent bootstrap
    }

    return {
      id,
      userId,
      userEmail,
      role: PLATFORM_ROLES.SUPERADMIN,
      entitlementPlan: INTERNAL_ADMIN_PLAN,
      status: "active",
      quotas: DEFAULT_QUOTAS,
      permissions: ROLE_PERMISSIONS[PLATFORM_ROLES.SUPERADMIN],
      grantedBy: "SYSTEM_ROOT_BOOTSTRAP",
      grantedAt: now
    };
  }

  return null;
}

/**
 * Strict server-side gate for Platform Sites API.
 * Validates authentication, Admin Plan entitlement, role, and permission.
 */
export async function requirePlatformSitesAccess(request, env, requiredPermission = null, siteId = null) {
  // 1. Authenticate Identity via WorkOS JWKS (or dev HMAC)
  let identity;
  try {
    identity = await authenticateIdentity(request, env);
  } catch (err) {
    throw new PlatformAuthError(err.message || "Authentication required", 401, "UNAUTHENTICATED");
  }

  const userId = identity.sub;
  const userEmail = identity.email;

  // 2. Validate Entitlement Plan
  const entitlement = await getPlatformUserEntitlement(userId, userEmail, env, identity);

  if (!entitlement) {
    throw new PlatformAuthError(
      "User does not possess the FERASETU_INTERNAL_ADMIN_PLAN entitlement.",
      403,
      "ENTITLEMENT_REQUIRED"
    );
  }

  if (entitlement.status !== "active") {
    throw new PlatformAuthError(
      `Access revoked: Internal Admin Plan is ${entitlement.status}. Privileged operations are prohibited.`,
      403,
      "ENTITLEMENT_REVOKED"
    );
  }

  // 3. Permission checks
  if (requiredPermission) {
    const hasPermission = entitlement.permissions.includes(requiredPermission) ||
      entitlement.permissions.includes("*") ||
      entitlement.role === PLATFORM_ROLES.SUPERADMIN;

    if (!hasPermission) {
      throw new PlatformAuthError(
        `Insufficient privileges: Role '${entitlement.role}' lacks permission '${requiredPermission}'.`,
        403,
        "PERMISSION_DENIED"
      );
    }
  }

  // 4. Site-level scoping check for developer/viewer roles
  if (siteId && entitlement.role !== PLATFORM_ROLES.SUPERADMIN && env.DB) {
    const site = await env.DB.prepare(
      "SELECT id, created_by FROM platform_sites WHERE id = ?"
    ).bind(siteId).first();

    if (site) {
      // Creator has automatic access
      if (site.created_by !== userId && entitlement.role !== PLATFORM_ROLES.PLATFORM_ADMIN) {
        // Check platform_site_access table
        const siteAccess = await env.DB.prepare(
          "SELECT role FROM platform_site_access WHERE site_id = ? AND user_id = ?"
        ).bind(siteId, userId).first();

        if (!siteAccess) {
          throw new PlatformAuthError(
            `Access denied: You are not assigned to platform site '${siteId}'.`,
            403,
            "SITE_ACCESS_DENIED"
          );
        }
      }
    }
  }

  return {
    identity,
    entitlement,
    userId,
    userEmail,
    role: entitlement.role,
    quotas: entitlement.quotas
  };
}

/**
 * Logs administrative action into immutable platform audit log.
 */
export async function logPlatformAudit(env, {
  siteId = null,
  actorId,
  actorEmail,
  action,
  resourceType,
  resourceId,
  details = {},
  request = null
}) {
  if (!env?.DB) return;
  const id = "pal_" + crypto.randomUUID();
  const now = new Date().toISOString();
  const clientIp = request ? (request.headers.get("CF-Connecting-IP") || request.headers.get("x-real-ip") || "unknown") : "system";
  const detailsJson = JSON.stringify(details);

  try {
    await env.DB.prepare(`
      INSERT INTO platform_audit_logs 
      (id, site_id, actor_id, actor_email, action, resource_type, resource_id, details_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, siteId, actorId, actorEmail, action, resourceType, resourceId, detailsJson, clientIp, now).run();
  } catch (err) {
    console.error("Failed to write platform audit log:", err);
  }
}

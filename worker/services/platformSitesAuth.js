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
export async function ensurePlatformSitesTables(db) {
  if (!db) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS platform_admin_entitlements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        user_email TEXT NOT NULL,
        role TEXT NOT NULL,
        entitlement_plan TEXT NOT NULL DEFAULT 'FERASETU_INTERNAL_ADMIN_PLAN',
        status TEXT NOT NULL DEFAULT 'active',
        quotas_json TEXT NOT NULL,
        granted_by TEXT NOT NULL,
        granted_at TEXT NOT NULL,
        revoked_by TEXT,
        revoked_at TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS platform_admin_permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        permission_key TEXT NOT NULL,
        granted_at TEXT NOT NULL,
        UNIQUE(user_id, permission_key)
      );
      CREATE TABLE IF NOT EXISTS platform_sites (
        id TEXT PRIMARY KEY,
        project_identifier TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        hosting_target TEXT NOT NULL,
        primary_hostname TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'draft',
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
      CREATE TABLE IF NOT EXISTS platform_domains (
        hostname_id TEXT PRIMARY KEY,
        normalized_hostname TEXT UNIQUE NOT NULL,
        site_id TEXT,
        ownership_type TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'CLOUDFLARE',
        resource_reference TEXT,
        verification_status TEXT NOT NULL DEFAULT 'pending',
        tls_status TEXT NOT NULL DEFAULT 'pending',
        provisioning_status TEXT NOT NULL DEFAULT 'reserved',
        routing_target TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS platform_deployments (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        version TEXT NOT NULL,
        environment TEXT NOT NULL DEFAULT 'production',
        status TEXT NOT NULL,
        source_type TEXT NOT NULL,
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
        source TEXT NOT NULL DEFAULT 'INTERNAL_OBSERVABILITY',
        created_at TEXT NOT NULL,
        UNIQUE(site_id, date, source)
      );
      CREATE TABLE IF NOT EXISTS platform_provisioning_jobs (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT UNIQUE NOT NULL,
        site_id TEXT NOT NULL,
        action TEXT NOT NULL,
        state TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        error_details TEXT,
        payload_json TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
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
        status TEXT NOT NULL DEFAULT 'proposed',
        reviewed_by TEXT,
        reviewed_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS platform_site_access (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        granted_at TEXT NOT NULL,
        UNIQUE(site_id, user_id)
      );
    `);
  } catch (err) {
    // If tables already exist or partial schema is in place, ignore error
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
export async function getPlatformUserEntitlement(userId, userEmail, env) {
  await ensurePlatformSitesTables(env.DB);

  if (!env.DB) {
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
  const existing = await env.DB.prepare(
    "SELECT * FROM platform_admin_entitlements WHERE user_id = ?"
  ).bind(userId).first();

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

  // 2. If not in DB, check if user is root superadmin from environment
  if (isRootSuperadmin(userId, userEmail, env)) {
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
  const entitlement = await getPlatformUserEntitlement(userId, userEmail, env);

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
    identity: authContext,
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

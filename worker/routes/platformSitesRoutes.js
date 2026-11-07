/**
 * FeraSetu Platform Sites REST API Router
 * worker/routes/platformSitesRoutes.js
 *
 * Implements backend-enforced, authenticated endpoints for Platform Sites.
 * Dedicated to FeraSetu-owned properties (help, docs, status, developers).
 * All endpoints enforce WorkOS identity + FERASETU_INTERNAL_ADMIN_PLAN entitlement + RBAC.
 */

import {
  requirePlatformSitesAccess,
  logPlatformAudit,
  PLATFORM_ROLES,
  INTERNAL_ADMIN_PLAN,
  DEFAULT_QUOTAS,
  ensurePlatformSitesTables
} from "../services/platformSitesAuth.js";
import {
  validatePlatformHostnameAvailability,
  registerPlatformHostname,
  detachPlatformHostname
} from "../services/platformDomainService.js";
import {
  createProvisioningJob,
  executeSiteProvisioning,
  executeDeploymentRollback
} from "../services/platformProvisioner.js";
import {
  generateWebsiteProposal,
  approveAndApplyProposal
} from "../services/platformAiStudio.js";
import {
  getCloudflareProvider,
  probeCloudflareHealth,
  encryptPlatformSecret
} from "../services/cloudflareAdapter.js";

function getCorsHeaders(request) {
  const origin = request?.headers?.get("Origin") || "https://ferasetu.com";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Pragma",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
      ...getCorsHeaders(request)
    }
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON request body");
  }
}

export async function handlePlatformSitesRoutes(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }

  const url = new URL(request.url);
  const method = request.method;
  let path = url.pathname.replace(/\/+$/, "") || "/";
  if (!path.startsWith("/api/")) {
    path = "/api" + path;
  }

  await ensurePlatformSitesTables(env.DB);
  const db = env.DB;

  try {
    // -------------------------------------------------------------------------
    // 1. Entitlement & Access Verification
    // -------------------------------------------------------------------------
    // GET /api/platform-sites/entitlement
    if (path === "/api/platform-sites/entitlement" && method === "GET") {
      const auth = await requirePlatformSitesAccess(request, env);
      return json({
        status: "authorized",
        userId: auth.userId,
        userEmail: auth.userEmail,
        role: auth.role,
        entitlementPlan: auth.entitlement.entitlementPlan,
        quotas: auth.quotas,
        permissions: auth.entitlement.permissions
      }, 200, request);
    }

    // POST /api/platform-sites/entitlement/grant (Superadmin only)
    if (path === "/api/platform-sites/entitlement/grant" && method === "POST") {
      const auth = await requirePlatformSitesAccess(request, env, "entitlements:grant");
      const body = await readJson(request);

      if (!body.targetUserId || !body.targetEmail || !body.role) {
        return json({ error: "Missing required fields: targetUserId, targetEmail, role" }, 400, request);
      }

      const id = "pae_" + crypto.randomUUID();
      const now = new Date().toISOString();
      const quotas = { ...DEFAULT_QUOTAS, ...(body.quotas || {}) };

      await db.prepare(`
        INSERT INTO platform_admin_entitlements
        (id, user_id, user_email, role, entitlement_plan, status, quotas_json, granted_by, granted_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          role = excluded.role,
          status = 'active',
          quotas_json = excluded.quotas_json,
          revoked_by = NULL,
          revoked_at = NULL,
          updated_at = excluded.updated_at
      `).bind(
        id,
        body.targetUserId,
        body.targetEmail.toLowerCase(),
        body.role,
        INTERNAL_ADMIN_PLAN,
        'active',
        JSON.stringify(quotas),
        auth.userId,
        now,
        now
      ).run();

      await logPlatformAudit(env, {
        actorId: auth.userId,
        actorEmail: auth.userEmail,
        action: "ENTITLEMENT_GRANTED",
        resourceType: "platform_admin_entitlement",
        resourceId: body.targetUserId,
        details: { role: body.role, quotas },
        request
      });

      return json({ success: true, message: `Admin Plan granted to ${body.targetEmail} with role '${body.role}'.` }, 200, request);
    }

    // POST /api/platform-sites/entitlement/revoke (Superadmin only)
    if (path === "/api/platform-sites/entitlement/revoke" && method === "POST") {
      const auth = await requirePlatformSitesAccess(request, env, "entitlements:revoke");
      const body = await readJson(request);

      if (!body.targetUserId) {
        return json({ error: "Missing required field: targetUserId" }, 400, request);
      }

      const now = new Date().toISOString();
      await db.prepare(`
        UPDATE platform_admin_entitlements
        SET status = 'revoked', revoked_by = ?, revoked_at = ?, updated_at = ?
        WHERE user_id = ?
      `).bind(auth.userId, now, now, body.targetUserId).run();

      await logPlatformAudit(env, {
        actorId: auth.userId,
        actorEmail: auth.userEmail,
        action: "ENTITLEMENT_REVOKED",
        resourceType: "platform_admin_entitlement",
        resourceId: body.targetUserId,
        details: { reason: body.reason || "Administrative revocation" },
        request
      });

      return json({ success: true, message: `Admin Plan revoked for ${body.targetUserId}. Privileged access stopped immediately.` }, 200, request);
    }

    // -------------------------------------------------------------------------
    // 2. Overview Dashboard
    // -------------------------------------------------------------------------
    // GET /api/platform-sites/overview
    if (path === "/api/platform-sites/overview" && method === "GET") {
      const auth = await requirePlatformSitesAccess(request, env, "sites:read");
      const cfHealth = await probeCloudflareHealth(env);

      let totalSites = 0;
      let activeSites = 0;
      let failedDeployments = 0;
      let pendingJobs = 0;
      let recentDeployments = [];
      let recentAuditLogs = [];

      if (db) {
        const sitesCountRes = await db.prepare(
          "SELECT COUNT(*) as count, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeCount FROM platform_sites"
        ).first();
        totalSites = sitesCountRes?.count || 0;
        activeSites = sitesCountRes?.activeCount || 0;

        const failedDepRes = await db.prepare(
          "SELECT COUNT(*) as count FROM platform_deployments WHERE status = 'failed'"
        ).first();
        failedDeployments = failedDepRes?.count || 0;

        const jobsRes = await db.prepare(
          "SELECT COUNT(*) as count FROM platform_provisioning_jobs WHERE state NOT IN ('active', 'failed', 'rolled_back')"
        ).first();
        pendingJobs = jobsRes?.count || 0;

        const recentDeps = await db.prepare(
          "SELECT d.*, s.name as site_name, s.primary_hostname FROM platform_deployments d JOIN platform_sites s ON d.site_id = s.id ORDER BY d.created_at DESC LIMIT 6"
        ).all();
        recentDeployments = recentDeps?.results || [];

        const auditRes = await db.prepare(
          "SELECT * FROM platform_audit_logs ORDER BY created_at DESC LIMIT 8"
        ).all();
        recentAuditLogs = auditRes?.results || [];
      }

      return json({
        stats: {
          totalSites,
          activeSites,
          failedDeployments,
          domainIssuesCount: 0,
          pendingJobs,
          quotas: auth.quotas
        },
        cloudflareHealth: cfHealth,
        recentDeployments,
        recentActivity: recentAuditLogs
      }, 200, request);
    }

    // -------------------------------------------------------------------------
    // 3. Platform Sites List & Creation Wizard
    // -------------------------------------------------------------------------
    // GET /api/platform-sites/sites
    if (path === "/api/platform-sites/sites" && method === "GET") {
      const auth = await requirePlatformSitesAccess(request, env, "sites:read");
      let sites = [];
      if (db) {
        const res = await db.prepare(
          "SELECT s.*, (SELECT version FROM platform_deployments WHERE id = s.active_deployment_id) as active_version FROM platform_sites s ORDER BY s.created_at DESC"
        ).all();
        sites = res?.results || [];
      }
      return json({ sites }, 200, request);
    }

    // POST /api/platform-sites/sites (Wizard Submission)
    if (path === "/api/platform-sites/sites" && method === "POST") {
      const auth = await requirePlatformSitesAccess(request, env, "sites:create");
      const body = await readJson(request);

      // Validate required wizard fields
      const {
        name,
        project_identifier,
        primary_hostname,
        hosting_target,
        description,
        github_repo,
        github_branch,
        build_command,
        output_dir,
        auto_deploy
      } = body;

      if (!name || !project_identifier || !primary_hostname || !hosting_target) {
        return json({
          error: "Missing required wizard fields: name, project_identifier, primary_hostname, hosting_target"
        }, 400, request);
      }

      if (!["workers", "pages"].includes(hosting_target)) {
        return json({ error: "hosting_target must be either 'workers' or 'pages'" }, 400, request);
      }

      // Check resource quota
      if (db) {
        const countRes = await db.prepare("SELECT COUNT(*) as count FROM platform_sites").first();
        if ((countRes?.count || 0) >= (auth.quotas.max_sites || DEFAULT_QUOTAS.max_sites)) {
          return json({
            error: `Resource quota reached. Maximum allowed platform websites: ${auth.quotas.max_sites || DEFAULT_QUOTAS.max_sites}`
          }, 403, request);
        }
      }

      // Check hostname availability & collision prevention
      await validatePlatformHostnameAvailability(db, primary_hostname);

      const siteId = "psite_" + crypto.randomUUID();
      const now = new Date().toISOString();
      const idempotencyKey = body.idempotency_key || `prov_${project_identifier}_${Date.now()}`;

      // Insert initial site in draft status
      await db.prepare(`
        INSERT INTO platform_sites
        (id, project_identifier, name, description, hosting_target, primary_hostname, status, github_repo, github_branch, build_command, output_dir, auto_deploy, created_by, is_production_protected, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(
        siteId,
        project_identifier.trim().toLowerCase(),
        name.trim(),
        description || "",
        hosting_target,
        primary_hostname.trim().toLowerCase(),
        github_repo || null,
        github_branch || "main",
        build_command || null,
        output_dir || null,
        auto_deploy ? 1 : 0,
        auth.userId,
        now,
        now
      ).run();

      // Create asynchronous provisioning job
      const { job } = await createProvisioningJob(db, {
        idempotencyKey,
        siteId,
        action: "PROVISION_SITE",
        payload: {
          siteId,
          name,
          project_identifier,
          primary_hostname,
          hosting_target,
          github_repo,
          github_branch,
          build_command,
          output_dir
        },
        actorId: auth.userId
      });

      // Execute synchronous provisioning steps immediately
      let provisioningResult;
      try {
        provisioningResult = await executeSiteProvisioning(env, job.id, {
          userId: auth.userId,
          userEmail: auth.userEmail
        });
      } catch (provErr) {
        return json({
          status: "provisioning_failed",
          siteId,
          error: provErr.message,
          jobId: job.id
        }, 500, request);
      }

      return json({
        success: true,
        siteId,
        jobId: job.id,
        status: provisioningResult.status,
        site: {
          id: siteId,
          name,
          project_identifier,
          primary_hostname,
          hosting_target,
          status: provisioningResult.status
        }
      }, 201, request);
    }

    // -------------------------------------------------------------------------
    // 4. Site Specific Routes (/api/platform-sites/sites/:id/...)
    // -------------------------------------------------------------------------
    const siteRouteMatch = path.match(/^\/api\/platform-sites\/sites\/([^/]+)(.*)$/);
    if (siteRouteMatch) {
      const siteId = siteRouteMatch[1];
      const subPath = siteRouteMatch[2];

      // Fetch site
      const site = await db.prepare("SELECT * FROM platform_sites WHERE id = ?").bind(siteId).first();
      if (!site) {
        return json({ error: `Platform site '${siteId}' not found` }, 404, request);
      }

      // GET /api/platform-sites/sites/:id (Details)
      if (subPath === "" && method === "GET") {
        await requirePlatformSitesAccess(request, env, "sites:read", siteId);
        const domains = await db.prepare("SELECT * FROM platform_domains WHERE site_id = ?").bind(siteId).all();
        const deployments = await db.prepare("SELECT * FROM platform_deployments WHERE site_id = ? ORDER BY created_at DESC LIMIT 10").bind(siteId).all();
        const usage = await db.prepare("SELECT * FROM platform_site_usage WHERE site_id = ? ORDER BY date DESC LIMIT 7").bind(siteId).all();

        return json({
          site,
          domains: domains?.results || [],
          recentDeployments: deployments?.results || [],
          usage: usage?.results || []
        }, 200, request);
      }

      // PUT /api/platform-sites/sites/:id (Update metadata & settings)
      if (subPath === "" && method === "PUT") {
        const auth = await requirePlatformSitesAccess(request, env, "sites:update", siteId);
        const body = await readJson(request);
        const now = new Date().toISOString();

        await db.prepare(`
          UPDATE platform_sites
          SET name = COALESCE(?, name),
              description = COALESCE(?, description),
              github_repo = COALESCE(?, github_repo),
              github_branch = COALESCE(?, github_branch),
              build_command = COALESCE(?, build_command),
              output_dir = COALESCE(?, output_dir),
              auto_deploy = COALESCE(?, auto_deploy),
              is_production_protected = COALESCE(?, is_production_protected),
              updated_at = ?
          WHERE id = ?
        `).bind(
          body.name || null,
          body.description || null,
          body.github_repo || null,
          body.github_branch || null,
          body.build_command || null,
          body.output_dir || null,
          body.auto_deploy !== undefined ? (body.auto_deploy ? 1 : 0) : null,
          body.is_production_protected !== undefined ? (body.is_production_protected ? 1 : 0) : null,
          now,
          siteId
        ).run();

        await logPlatformAudit(env, {
          siteId,
          actorId: auth.userId,
          actorEmail: auth.userEmail,
          action: "SITE_SETTINGS_UPDATED",
          resourceType: "platform_site",
          resourceId: siteId,
          details: body,
          request
        });

        return json({ success: true, message: "Site settings updated." }, 200, request);
      }

      // DELETE /api/platform-sites/sites/:id (Archive or Delete site)
      if (subPath === "" && method === "DELETE") {
        const auth = await requirePlatformSitesAccess(request, env, "sites:delete", siteId);
        const body = await readJson(request).catch(() => ({}));

        // Production Deletion Guard
        if (site.is_production_protected && body.confirm_delete !== site.project_identifier) {
          return json({
            error: `Production Protection Active: To delete this site, you must provide confirmation parameter confirm_delete: "${site.project_identifier}" and possess Superadmin privileges.`
          }, 400, request);
        }

        const now = new Date().toISOString();
        // Detach hostnames safely
        await db.prepare("UPDATE platform_domains SET site_id = NULL, provisioning_status = 'detached', updated_at = ? WHERE site_id = ?").bind(now, siteId).run();
        // Mark site as archived
        await db.prepare("UPDATE platform_sites SET status = ?, updated_at = ? WHERE id = ?").bind('archived', now, siteId).run();

        await logPlatformAudit(env, {
          siteId,
          actorId: auth.userId,
          actorEmail: auth.userEmail,
          action: "SITE_ARCHIVED",
          resourceType: "platform_site",
          resourceId: siteId,
          details: { identifier: site.project_identifier },
          request
        });

        return json({ success: true, message: `Platform site '${site.name}' archived safely.` }, 200, request);
      }

      // GET /api/platform-sites/sites/:id/domains
      if (subPath === "/domains" && method === "GET") {
        await requirePlatformSitesAccess(request, env, "domains:manage", siteId);
        const domains = await db.prepare("SELECT * FROM platform_domains WHERE site_id = ?").bind(siteId).all();
        return json({ domains: domains?.results || [] }, 200, request);
      }

      // POST /api/platform-sites/sites/:id/domains (Attach hostname)
      if (subPath === "/domains" && method === "POST") {
        const auth = await requirePlatformSitesAccess(request, env, "domains:manage", siteId);
        const body = await readJson(request);

        if (!body.hostname) {
          return json({ error: "Missing required field: hostname" }, 400, request);
        }

        const domainRecord = await registerPlatformHostname(db, {
          siteId,
          rawHostname: body.hostname,
          provider: "CLOUDFLARE",
          routingTarget: site.hosting_target === "workers" ? `worker:${site.project_identifier}` : `pages:${site.project_identifier}`
        });

        await logPlatformAudit(env, {
          siteId,
          actorId: auth.userId,
          actorEmail: auth.userEmail,
          action: "DOMAIN_ATTACHED",
          resourceType: "platform_domain",
          resourceId: domainRecord.hostnameId,
          details: { hostname: domainRecord.normalizedHostname },
          request
        });

        return json({ success: true, domain: domainRecord }, 201, request);
      }

      // DELETE /api/platform-sites/sites/:id/domains/:domainId (Detach hostname)
      const domainDetachMatch = subPath.match(/^\/domains\/([^/]+)$/);
      if (domainDetachMatch && method === "DELETE") {
        const domainId = domainDetachMatch[1];
        const auth = await requirePlatformSitesAccess(request, env, "domains:detach", siteId);

        const res = await detachPlatformHostname(db, domainId, siteId);

        await logPlatformAudit(env, {
          siteId,
          actorId: auth.userId,
          actorEmail: auth.userEmail,
          action: "DOMAIN_DETACHED",
          resourceType: "platform_domain",
          resourceId: domainId,
          details: { detachedHostname: res.detachedHostname },
          request
        });

        return json({ success: true, message: `Hostname detached.` }, 200, request);
      }

      // GET /api/platform-sites/sites/:id/deployments
      if (subPath === "/deployments" && method === "GET") {
        await requirePlatformSitesAccess(request, env, "sites:read", siteId);
        const deps = await db.prepare(
          "SELECT * FROM platform_deployments WHERE site_id = ? ORDER BY created_at DESC"
        ).bind(siteId).all();
        return json({ deployments: deps?.results || [] }, 200, request);
      }

      // POST /api/platform-sites/sites/:id/deployments (Trigger new deployment)
      if (subPath === "/deployments" && method === "POST") {
        const auth = await requirePlatformSitesAccess(request, env, "deployments:create", siteId);
        const body = await readJson(request);

        const deploymentId = "pdep_" + crypto.randomUUID();
        const now = new Date().toISOString();
        const version = `v1.${Date.now().toString().slice(-4)}`;

        await db.prepare(`
          INSERT INTO platform_deployments
          (id, site_id, version, environment, status, source_type, commit_hash, commit_message, commit_author, build_logs, deployed_by, manifest_json, created_at, finished_at)
          VALUES (?, ?, ?, 'production', 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          deploymentId,
          siteId,
          version,
          body.source_type || "github",
          body.commit_hash || "manual-dispatch",
          body.commit_message || "Manual deployment dispatch",
          auth.userEmail,
          `[${now}] Deployed via Platform Sites API by ${auth.userEmail}`,
          auth.userId,
          JSON.stringify(body.manifest || {}),
          now,
          now
        ).run();

        await db.prepare("UPDATE platform_sites SET active_deployment_id = ?, updated_at = ? WHERE id = ?").bind(deploymentId, now, siteId).run();

        await logPlatformAudit(env, {
          siteId,
          actorId: auth.userId,
          actorEmail: auth.userEmail,
          action: "DEPLOYMENT_CREATED",
          resourceType: "platform_deployment",
          resourceId: deploymentId,
          details: { version, commit: body.commit_hash },
          request
        });

        return json({ success: true, deploymentId, version, status: "active" }, 201, request);
      }

      // POST /api/platform-sites/sites/:id/deployments/:deploymentId/rollback
      const rollbackMatch = subPath.match(/^\/deployments\/([^/]+)\/rollback$/);
      if (rollbackMatch && method === "POST") {
        const targetDeploymentId = rollbackMatch[1];
        const auth = await requirePlatformSitesAccess(request, env, "deployments:rollback", siteId);

        const res = await executeDeploymentRollback(env, {
          siteId,
          targetDeploymentId,
          actorContext: { userId: auth.userId, userEmail: auth.userEmail }
        });

        return json(res, 200, request);
      }

      // GET /api/platform-sites/sites/:id/secrets (Masked previews only)
      if (subPath === "/secrets" && method === "GET") {
        await requirePlatformSitesAccess(request, env, "secrets:read", siteId);
        const secrets = await db.prepare(
          "SELECT id, site_id, environment, key_name, masked_preview, created_by, created_at, updated_at FROM platform_site_secrets WHERE site_id = ?"
        ).bind(siteId).all();
        return json({ secrets: secrets?.results || [] }, 200, request);
      }

      // POST /api/platform-sites/sites/:id/secrets (Add/Update encrypted secret)
      if (subPath === "/secrets" && method === "POST") {
        const auth = await requirePlatformSitesAccess(request, env, "secrets:write", siteId);
        const body = await readJson(request);

        if (!body.key_name || !body.secret_value) {
          return json({ error: "Missing required fields: key_name, secret_value" }, 400, request);
        }

        const keyName = body.key_name.trim().toUpperCase();
        const cf = getCloudflareProvider(env);
        const { encryptedValue, iv, maskedPreview } = await encryptPlatformSecret(body.secret_value, cf.masterKey);

        const id = "pss_" + crypto.randomUUID();
        const now = new Date().toISOString();
        const envName = body.environment || "production";

        await db.prepare(`
          INSERT INTO platform_site_secrets
          (id, site_id, environment, key_name, encrypted_value, iv, masked_preview, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(site_id, environment, key_name) DO UPDATE SET
            encrypted_value = excluded.encrypted_value,
            iv = excluded.iv,
            masked_preview = excluded.masked_preview,
            updated_at = excluded.updated_at
        `).bind(id, siteId, envName, keyName, encryptedValue, iv, maskedPreview, auth.userId, now, now).run();

        await logPlatformAudit(env, {
          siteId,
          actorId: auth.userId,
          actorEmail: auth.userEmail,
          action: "SECRET_UPDATED",
          resourceType: "platform_site_secret",
          resourceId: keyName,
          details: { environment: envName, key: keyName },
          request
        });

        return json({ success: true, key_name: keyName, masked_preview: maskedPreview }, 200, request);
      }

      // DELETE /api/platform-sites/sites/:id/secrets/:secretId
      const secretDelMatch = subPath.match(/^\/secrets\/([^/]+)$/);
      if (secretDelMatch && method === "DELETE") {
        const secretId = secretDelMatch[1];
        const auth = await requirePlatformSitesAccess(request, env, "secrets:delete", siteId);

        await db.prepare("DELETE FROM platform_site_secrets WHERE id = ? AND site_id = ?").bind(secretId, siteId).run();

        await logPlatformAudit(env, {
          siteId,
          actorId: auth.userId,
          actorEmail: auth.userEmail,
          action: "SECRET_DELETED",
          resourceType: "platform_site_secret",
          resourceId: secretId,
          request
        });

        return json({ success: true, message: "Secret removed." }, 200, request);
      }

      // GET /api/platform-sites/sites/:id/usage
      if (subPath === "/usage" && method === "GET") {
        await requirePlatformSitesAccess(request, env, "analytics:read", siteId);
        const usageRes = await db.prepare(
          "SELECT * FROM platform_site_usage WHERE site_id = ? ORDER BY date DESC LIMIT 30"
        ).bind(siteId).all();
        return json({ usage: usageRes?.results || [] }, 200, request);
      }

      // GET /api/platform-sites/sites/:id/logs
      if (subPath === "/logs" && method === "GET") {
        await requirePlatformSitesAccess(request, env, "logs:read", siteId);
        const audits = await db.prepare(
          "SELECT * FROM platform_audit_logs WHERE site_id = ? ORDER BY created_at DESC LIMIT 50"
        ).bind(siteId).all();
        return json({ logs: audits?.results || [] }, 200, request);
      }

      // POST /api/platform-sites/sites/:id/ai/generate (AI Studio Customization)
      if (subPath === "/ai/generate" && method === "POST") {
        const auth = await requirePlatformSitesAccess(request, env, "ai:customize", siteId);
        const body = await readJson(request);

        if (!body.prompt || typeof body.prompt !== "string") {
          return json({ error: "Missing required prompt string." }, 400, request);
        }

        const proposal = await generateWebsiteProposal(env, {
          site,
          sessionTitle: body.session_title || "AI Customization",
          prompt: body.prompt,
          actorContext: { userId: auth.userId, userEmail: auth.userEmail }
        });

        return json({ success: true, proposal }, 200, request);
      }

      // POST /api/platform-sites/sites/:id/ai/proposals/:proposalId/approve
      const approveMatch = subPath.match(/^\/ai\/proposals\/([^/]+)\/approve$/);
      if (approveMatch && method === "POST") {
        const proposalId = approveMatch[1];
        const auth = await requirePlatformSitesAccess(request, env, "ai:approve", siteId);

        const result = await approveAndApplyProposal(env, {
          proposalId,
          siteId,
          actorContext: { userId: auth.userId, userEmail: auth.userEmail }
        });

        return json(result, 200, request);
      }
    }

    // -------------------------------------------------------------------------
    // 5. Global Deployments, Domains, Integrations & Audit Trails
    // -------------------------------------------------------------------------
    // GET /api/platform-sites/deployments
    if (path === "/api/platform-sites/deployments" && method === "GET") {
      await requirePlatformSitesAccess(request, env, "sites:read");
      const deps = await db.prepare(`
        SELECT d.*, s.name as site_name, s.primary_hostname, s.hosting_target 
        FROM platform_deployments d 
        JOIN platform_sites s ON d.site_id = s.id 
        ORDER BY d.created_at DESC LIMIT 50
      `).all();
      return json({ deployments: deps?.results || [] }, 200, request);
    }

    // GET /api/platform-sites/domains
    if (path === "/api/platform-sites/domains" && method === "GET") {
      await requirePlatformSitesAccess(request, env, "domains:manage");
      const domains = await db.prepare(`
        SELECT d.*, s.name as site_name 
        FROM platform_domains d 
        LEFT JOIN platform_sites s ON d.site_id = s.id 
        ORDER BY d.created_at DESC
      `).all();
      return json({ domains: domains?.results || [] }, 200, request);
    }

    // GET /api/platform-sites/integrations/cloudflare
    if (path === "/api/platform-sites/integrations/cloudflare" && method === "GET") {
      await requirePlatformSitesAccess(request, env, "cloudflare:manage");
      const health = await probeCloudflareHealth(env);
      return json({ cloudflare: health }, 200, request);
    }

    // GET /api/platform-sites/activity
    if (path === "/api/platform-sites/activity" && method === "GET") {
      await requirePlatformSitesAccess(request, env, "audit:read");
      const logs = await db.prepare(
        "SELECT * FROM platform_audit_logs ORDER BY created_at DESC LIMIT 100"
      ).all();
      return json({ logs: logs?.results || [] }, 200, request);
    }

    return json({ error: `Not found: Platform Sites endpoint ${method} ${path}` }, 404, request);

  } catch (err) {
    console.error(`[PLATFORM SITES API ERROR] ${method} ${path}:`, err);
    const status = err.status || 500;
    return json({
      error: err.message || "Internal server error",
      code: err.code || "PLATFORM_API_ERROR"
    }, status, request);
  }
}

// FeraSetu Pro — Platform Service Layer (MCP-Ready Architecture)
// =============================================================================
// Authoritative domain operations for multi-page websites, routes, functions,
// atomic deployments, AI builder actions, and quotas.
// All operations are tenant-scoped and authorization-aware.
// =============================================================================

import { parseFeraFunction, extractOperationsFromAST, executeFeraAST, OPERATION_CAPABILITIES } from '../sandbox/feraRuntime.js';
import { createFeraSDK } from '../sandbox/feraSdk.js';
import { B2Client } from '../media/b2Client.js';
import { extractZipArchive } from '../pro/projectZipParser.js';
import { analyzeProject, computeSha256Hex, ANALYZER_VERSION } from '../pro/projectAnalyzer.js';
import { computeProjectReimportDiff, getCanonicalStudioRepresentation, evaluateThreeWayMerge } from '../pro/projectDiffEngine.js';

export const DEFAULT_PRO_QUOTAS = {
  max_pages: 50,
  max_routes: 50,
  max_functions: 30,
  max_function_invocations_monthly: 50000,
  max_storage_bytes: 104857600, // 100 MB
  max_published_versions: 20,
  max_ai_actions_monthly: 1000,
};

export class ProPlatformError extends Error {
  constructor(message, code = "PLATFORM_ERROR", details = {}) {
    super(message);
    this.name = "ProPlatformError";
    this.code = code;
    this.details = details;
  }
}

let proTablesEnsured = false;
export async function ensureProTables(env) {
  if (proTablesEnsured || !env?.DB) return;
  try {
    if (typeof env.DB.exec === 'function') {
      await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS site_pages (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          slug TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'standard',
          content TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
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
        CREATE TABLE IF NOT EXISTS site_routes (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          path_pattern TEXT NOT NULL,
          page_id TEXT NOT NULL,
          access_level TEXT NOT NULL DEFAULT 'public',
          function_binding TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(tenant_id, path_pattern)
        );
        CREATE TABLE IF NOT EXISTS site_functions (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          definition TEXT NOT NULL,
          capabilities TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'draft',
          version INTEGER NOT NULL DEFAULT 1,
          timeout_ms INTEGER NOT NULL DEFAULT 1500,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(tenant_id, name)
        );
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
        CREATE TABLE IF NOT EXISTS site_navigation (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          menu_location TEXT NOT NULL DEFAULT 'header',
          items TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'draft',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(tenant_id, menu_location)
        );
        CREATE TABLE IF NOT EXISTS site_deployments (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          version INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'published',
          snapshot TEXT NOT NULL,
          deployed_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(tenant_id, version)
        );
        CREATE TABLE IF NOT EXISTS site_quotas (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL UNIQUE,
          max_pages INTEGER NOT NULL DEFAULT 50,
          max_routes INTEGER NOT NULL DEFAULT 100,
          max_functions INTEGER NOT NULL DEFAULT 25,
          max_function_invocations_monthly INTEGER NOT NULL DEFAULT 50000,
          function_invocations_used INTEGER NOT NULL DEFAULT 0,
          max_storage_bytes INTEGER NOT NULL DEFAULT 52428800,
          storage_used_bytes INTEGER NOT NULL DEFAULT 0,
          max_published_versions INTEGER NOT NULL DEFAULT 20,
          max_ai_actions_monthly INTEGER NOT NULL DEFAULT 500,
          ai_actions_used INTEGER NOT NULL DEFAULT 0,
          resets_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
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
        CREATE TABLE IF NOT EXISTS site_execution_logs (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          function_name TEXT,
          event_type TEXT NOT NULL DEFAULT 'info',
          details TEXT,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          status_code INTEGER NOT NULL DEFAULT 200,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS site_imported_projects (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          project_name TEXT NOT NULL,
          framework TEXT NOT NULL,
          current_version_id TEXT,
          status TEXT NOT NULL DEFAULT 'analyzed',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(tenant_id, project_name)
        );
        CREATE TABLE IF NOT EXISTS site_import_versions (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          version_number INTEGER NOT NULL,
          project_fingerprint TEXT NOT NULL,
          manifest_b2_key TEXT NOT NULL,
          source_archive_b2_key TEXT NOT NULL,
          import_status TEXT NOT NULL DEFAULT 'SNAPSHOT_PENDING',
          created_at TEXT NOT NULL,
          UNIQUE(project_id, version_number)
        );
        CREATE TABLE IF NOT EXISTS site_source_files (
          id TEXT PRIMARY KEY,
          version_id TEXT NOT NULL,
          source_path TEXT NOT NULL,
          file_hash TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          file_type TEXT NOT NULL,
          relevant_metadata TEXT,
          UNIQUE(version_id, source_path)
        );
        CREATE TABLE IF NOT EXISTS site_source_mappings (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          version_id TEXT NOT NULL,
          source_path TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT,
          deterministic_identity TEXT NOT NULL,
          source_hash TEXT NOT NULL,
          studio_hash TEXT,
          mapping_status TEXT NOT NULL DEFAULT 'active',
          metadata TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(project_id, version_id, source_path, resource_type)
        );
        CREATE TABLE IF NOT EXISTS site_import_changes (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          from_version_id TEXT NOT NULL,
          to_version_id TEXT NOT NULL,
          source_path TEXT NOT NULL,
          change_type TEXT NOT NULL,
          conflict_status TEXT NOT NULL,
          resolution TEXT,
          created_at TEXT NOT NULL
        );
      `);
    }
    proTablesEnsured = true;

  } catch (err) {
    console.warn("[ensureProTables] note:", err?.message);
  }
}

// -----------------------------------------------------------------------------
// 1. Quotas & Governance
// -----------------------------------------------------------------------------

export async function getSiteQuotas(tenantId, env) {
  if (!env?.DB) return { ...DEFAULT_PRO_QUOTAS, usage: {} };

  let quota = await env.DB.prepare(
    "SELECT * FROM site_quotas WHERE tenant_id = ?"
  ).bind(tenantId).first();

  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  if (!quota) {
    const id = `quot_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    await env.DB.prepare(`
      INSERT OR IGNORE INTO site_quotas (
        id, tenant_id, max_pages, max_routes, max_functions,
        max_function_invocations_monthly, function_invocations_used,
        max_storage_bytes, storage_used_bytes, max_published_versions,
        max_ai_actions_monthly, ai_actions_used, resets_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, 0, ?, ?, ?)
    `).bind(
      id, tenantId,
      DEFAULT_PRO_QUOTAS.max_pages,
      DEFAULT_PRO_QUOTAS.max_routes,
      DEFAULT_PRO_QUOTAS.max_functions,
      DEFAULT_PRO_QUOTAS.max_function_invocations_monthly,
      DEFAULT_PRO_QUOTAS.max_storage_bytes,
      DEFAULT_PRO_QUOTAS.max_published_versions,
      DEFAULT_PRO_QUOTAS.max_ai_actions_monthly,
      resetDate, now.toISOString(), now.toISOString()
    ).run();

    quota = await env.DB.prepare("SELECT * FROM site_quotas WHERE tenant_id = ?").bind(tenantId).first();
  }

  // Count live resources
  const pageCountRow = await env.DB.prepare("SELECT COUNT(*) as count FROM site_pages WHERE tenant_id = ?").bind(tenantId).first();
  const routeCountRow = await env.DB.prepare("SELECT COUNT(*) as count FROM site_routes WHERE tenant_id = ?").bind(tenantId).first();
  const funcCountRow = await env.DB.prepare("SELECT COUNT(*) as count FROM site_functions WHERE tenant_id = ?").bind(tenantId).first();
  const storageSizeRow = await env.DB.prepare("SELECT COALESCE(SUM(bytes_size), 0) as total_bytes FROM site_storage WHERE tenant_id = ?").bind(tenantId).first();

  return {
    limits: {
      max_pages: quota?.max_pages || DEFAULT_PRO_QUOTAS.max_pages,
      max_routes: quota?.max_routes || DEFAULT_PRO_QUOTAS.max_routes,
      max_functions: quota?.max_functions || DEFAULT_PRO_QUOTAS.max_functions,
      max_function_invocations: quota?.max_function_invocations_monthly || DEFAULT_PRO_QUOTAS.max_function_invocations_monthly,
      max_storage_bytes: quota?.max_storage_bytes || DEFAULT_PRO_QUOTAS.max_storage_bytes,
      max_published_versions: quota?.max_published_versions || DEFAULT_PRO_QUOTAS.max_published_versions,
      max_ai_actions: quota?.max_ai_actions_monthly || DEFAULT_PRO_QUOTAS.max_ai_actions_monthly,
    },
    usage: {
      pages_count: pageCountRow?.count || 0,
      routes_count: routeCountRow?.count || 0,
      functions_count: funcCountRow?.count || 0,
      storage_bytes: storageSizeRow?.total_bytes || 0,
      function_invocations: quota?.function_invocations_used || 0,
      ai_actions: quota?.ai_actions_used || 0,
      resets_at: quota?.resets_at || resetDate,
    },
  };
}

export async function checkQuota(tenantId, resourceType, increment = 1, env) {
  const quotas = await getSiteQuotas(tenantId, env);
  const limits = quotas.limits;
  const usage = quotas.usage;

  if (resourceType === 'pages' && (usage.pages_count + increment) > limits.max_pages) {
    throw new ProPlatformError(`Pages quota exceeded (limit: ${limits.max_pages})`, "QUOTA_EXCEEDED", { resource: 'pages', limit: limits.max_pages });
  }
  if (resourceType === 'routes' && (usage.routes_count + increment) > limits.max_routes) {
    throw new ProPlatformError(`Routes quota exceeded (limit: ${limits.max_routes})`, "QUOTA_EXCEEDED", { resource: 'routes', limit: limits.max_routes });
  }
  if (resourceType === 'functions' && (usage.functions_count + increment) > limits.max_functions) {
    throw new ProPlatformError(`Functions quota exceeded (limit: ${limits.max_functions})`, "QUOTA_EXCEEDED", { resource: 'functions', limit: limits.max_functions });
  }
  if (resourceType === 'function_invocations' && (usage.function_invocations + increment) > limits.max_function_invocations) {
    throw new ProPlatformError(`Monthly function invocations quota exceeded`, "QUOTA_EXCEEDED", { resource: 'function_invocations' });
  }
  if (resourceType === 'ai_actions' && (usage.ai_actions + increment) > limits.max_ai_actions) {
    throw new ProPlatformError(`Monthly AI actions quota exceeded`, "QUOTA_EXCEEDED", { resource: 'ai_actions' });
  }
}

// -----------------------------------------------------------------------------
// 2. Pages Management
// -----------------------------------------------------------------------------

export async function listPages(tenantId, env) {
  if (!env?.DB) return [];
  const res = await env.DB.prepare(`
    SELECT id, tenant_id, slug, title, type, content, status, parent_id, is_homepage, auth_required, order_index, seo_title, seo_description, created_at, updated_at
    FROM site_pages
    WHERE tenant_id = ?
    ORDER BY order_index ASC, created_at ASC
  `).bind(tenantId).all();

  return (res.results || []).map((page) => ({
    ...page,
    content: typeof page.content === 'string' ? safeParseJson(page.content) : page.content,
  }));
}

export async function getPage(tenantId, pageId, env) {
  if (!env?.DB) return null;
  const page = await env.DB.prepare(`
    SELECT * FROM site_pages WHERE tenant_id = ? AND (id = ? OR slug = ?) LIMIT 1
  `).bind(tenantId, pageId, pageId).first();

  if (!page) return null;
  return {
    ...page,
    content: typeof page.content === 'string' ? safeParseJson(page.content) : page.content,
  };
}

export async function createPage(tenantId, data, env) {
  await checkQuota(tenantId, 'pages', 1, env);

  const baseSlug = sanitizeSlug(data.slug || data.title || "new-page");
  let slug = baseSlug;
  let counter = 1;
  if (env?.DB) {
    while (true) {
      const existing = await env.DB.prepare("SELECT id FROM site_pages WHERE tenant_id = ? AND slug = ?").bind(tenantId, slug).first();
      if (!existing) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }
  const title = String(data.title || "Untitled Page").trim();
  const type = ['standard', 'auth_login', 'auth_signup', 'auth_account', 'protected', 'custom'].includes(data.type) ? data.type : 'standard';
  const content = typeof data.content === 'object' ? JSON.stringify(data.content) : (data.content || '[]');
  const isHomepage = Boolean(data.is_homepage) ? 1 : 0;
  const authRequired = Boolean(data.auth_required || type === 'protected' || type === 'auth_account') ? 1 : 0;
  const parentId = data.parent_id || null;
  const orderIndex = Number(data.order_index) || 0;
  const seoTitle = data.seo_title || null;
  const seoDesc = data.seo_description || null;

  const id = `page_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();

  // If set as homepage, unset other homepages
  if (isHomepage === 1 && env?.DB) {
    await env.DB.prepare("UPDATE site_pages SET is_homepage = 0 WHERE tenant_id = ?").bind(tenantId).run();
  }

  await env.DB.prepare(`
    INSERT INTO site_pages (
      id, tenant_id, slug, title, type, content, status, parent_id,
      is_homepage, auth_required, order_index, seo_title, seo_description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, tenantId, slug, title, type, content, parentId,
    isHomepage, authRequired, orderIndex, seoTitle, seoDesc, now, now
  ).run();

  // Automatically create standard route for this page if not existing
  const routePath = isHomepage ? "/" : `/${slug}`;
  try {
    await createRoute(tenantId, {
      path_pattern: routePath,
      page_id: id,
      access_level: authRequired ? 'authenticated' : 'public',
    }, env);
  } catch {}

  return await getPage(tenantId, id, env);
}

export async function updatePage(tenantId, pageId, data, env) {
  const existing = await getPage(tenantId, pageId, env);
  if (!existing) throw new ProPlatformError("Page not found", "NOT_FOUND");

  const title = data.title !== undefined ? String(data.title).trim() : existing.title;
  const slug = data.slug !== undefined ? sanitizeSlug(data.slug) : existing.slug;
  const type = data.type !== undefined ? data.type : existing.type;
  const content = data.content !== undefined ? (typeof data.content === 'object' ? JSON.stringify(data.content) : data.content) : JSON.stringify(existing.content);
  const isHomepage = data.is_homepage !== undefined ? (data.is_homepage ? 1 : 0) : existing.is_homepage;
  const authRequired = data.auth_required !== undefined ? (data.auth_required ? 1 : 0) : existing.auth_required;
  const parentId = data.parent_id !== undefined ? data.parent_id : existing.parent_id;
  const orderIndex = data.order_index !== undefined ? Number(data.order_index) : existing.order_index;
  const seoTitle = data.seo_title !== undefined ? data.seo_title : existing.seo_title;
  const seoDesc = data.seo_description !== undefined ? data.seo_description : existing.seo_description;
  const now = new Date().toISOString();

  if (isHomepage === 1 && env?.DB) {
    await env.DB.prepare("UPDATE site_pages SET is_homepage = 0 WHERE tenant_id = ?").bind(tenantId).run();
  }

  await env.DB.prepare(`
    UPDATE site_pages
    SET title = ?, slug = ?, type = ?, content = ?, is_homepage = ?,
        auth_required = ?, parent_id = ?, order_index = ?, seo_title = ?,
        seo_description = ?, updated_at = ?
    WHERE tenant_id = ? AND id = ?
  `).bind(
    title, slug, type, content, isHomepage, authRequired, parentId,
    orderIndex, seoTitle, seoDesc, now, tenantId, pageId
  ).run();

  return await getPage(tenantId, pageId, env);
}

export async function deletePage(tenantId, pageId, env) {
  const existing = await getPage(tenantId, pageId, env);
  if (!existing) throw new ProPlatformError("Page not found", "NOT_FOUND");

  // Remove linked routes
  await env.DB.prepare("DELETE FROM site_routes WHERE tenant_id = ? AND page_id = ?").bind(tenantId, pageId).run();
  // Remove page
  await env.DB.prepare("DELETE FROM site_pages WHERE tenant_id = ? AND id = ?").bind(tenantId, pageId).run();

  return { success: true, deleted_id: pageId };
}

export async function duplicatePage(tenantId, pageId, env) {
  const existing = await getPage(tenantId, pageId, env);
  if (!existing) throw new ProPlatformError("Page not found", "NOT_FOUND");

  return await createPage(tenantId, {
    title: `${existing.title} (Copy)`,
    slug: `${existing.slug}-copy`,
    type: existing.type,
    content: existing.content,
    is_homepage: false,
    auth_required: existing.auth_required,
    parent_id: existing.parent_id,
  }, env);
}

export async function setHomepage(tenantId, pageId, env) {
  const existing = await getPage(tenantId, pageId, env);
  if (!existing) throw new ProPlatformError("Page not found", "NOT_FOUND");

  await env.DB.prepare("UPDATE site_pages SET is_homepage = 0 WHERE tenant_id = ?").bind(tenantId).run();
  await env.DB.prepare("UPDATE site_pages SET is_homepage = 1, updated_at = ? WHERE tenant_id = ? AND id = ?").bind(new Date().toISOString(), tenantId, pageId).run();

  // Ensure root route points to this page
  await env.DB.prepare(`
    INSERT INTO site_routes (id, tenant_id, path_pattern, page_id, access_level, status, created_at, updated_at)
    VALUES (?, ?, '/', ?, 'public', 'draft', ?, ?)
    ON CONFLICT(tenant_id, path_pattern) DO UPDATE SET page_id = excluded.page_id, updated_at = excluded.updated_at
  `).bind(
    `route_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
    tenantId, pageId, new Date().toISOString(), new Date().toISOString()
  ).run();

  return await getPage(tenantId, pageId, env);
}

// -----------------------------------------------------------------------------
// 3. Routes Management
// -----------------------------------------------------------------------------

export async function listRoutes(tenantId, env) {
  if (!env?.DB) return [];
  const res = await env.DB.prepare(`
    SELECT r.id, r.tenant_id, r.path_pattern, r.page_id, r.access_level, r.function_binding, r.status, r.created_at, r.updated_at,
           p.title as page_title, p.slug as page_slug
    FROM site_routes r
    LEFT JOIN site_pages p ON p.id = r.page_id
    WHERE r.tenant_id = ?
    ORDER BY r.path_pattern ASC
  `).bind(tenantId).all();

  return res.results || [];
}

export async function createRoute(tenantId, data, env) {
  await checkQuota(tenantId, 'routes', 1, env);

  const rawPath = String(data.path_pattern || "").trim();
  const pathPattern = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  if (!pathPattern || pathPattern.length < 1) {
    throw new ProPlatformError("Invalid path pattern", "INVALID_PATH");
  }

  const pageId = data.page_id;
  const accessLevel = ['public', 'authenticated', 'merchant_admin'].includes(data.access_level) ? data.access_level : 'public';
  const functionBinding = data.function_binding ? String(data.function_binding).trim() : null;

  const id = `route_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO site_routes (id, tenant_id, path_pattern, page_id, access_level, function_binding, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    ON CONFLICT(tenant_id, path_pattern) DO UPDATE SET
      page_id = excluded.page_id,
      access_level = excluded.access_level,
      function_binding = excluded.function_binding,
      updated_at = excluded.updated_at
  `).bind(id, tenantId, pathPattern, pageId, accessLevel, functionBinding, now, now).run();

  return { id, tenant_id: tenantId, path_pattern: pathPattern, page_id: pageId, access_level: accessLevel, function_binding: functionBinding };
}

export async function updateRoute(tenantId, routeId, data, env) {
  const existing = await env.DB.prepare("SELECT * FROM site_routes WHERE tenant_id = ? AND id = ?").bind(tenantId, routeId).first();
  if (!existing) throw new ProPlatformError("Route not found", "NOT_FOUND");

  const pathPattern = data.path_pattern !== undefined ? (data.path_pattern.startsWith('/') ? data.path_pattern : `/${data.path_pattern}`) : existing.path_pattern;
  const pageId = data.page_id !== undefined ? data.page_id : existing.page_id;
  const accessLevel = data.access_level !== undefined ? data.access_level : existing.access_level;
  const functionBinding = data.function_binding !== undefined ? data.function_binding : existing.function_binding;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE site_routes
    SET path_pattern = ?, page_id = ?, access_level = ?, function_binding = ?, updated_at = ?
    WHERE tenant_id = ? AND id = ?
  `).bind(pathPattern, pageId, accessLevel, functionBinding, now, tenantId, routeId).run();

  return { id: routeId, tenant_id: tenantId, path_pattern: pathPattern, page_id: pageId, access_level: accessLevel, function_binding: functionBinding };
}

export async function deleteRoute(tenantId, routeId, env) {
  await env.DB.prepare("DELETE FROM site_routes WHERE tenant_id = ? AND id = ?").bind(tenantId, routeId).run();
  return { success: true, deleted_id: routeId };
}

// -----------------------------------------------------------------------------
// 4. Functions Management & Execution
// -----------------------------------------------------------------------------

export async function listFunctions(tenantId, env) {
  if (!env?.DB) return [];
  const res = await env.DB.prepare(`
    SELECT id, tenant_id, name, description, definition, capabilities, status, version, timeout_ms, created_at, updated_at
    FROM site_functions
    WHERE tenant_id = ?
    ORDER BY name ASC
  `).bind(tenantId).all();

  return (res.results || []).map((fn) => ({
    ...fn,
    capabilities: typeof fn.capabilities === 'string' ? safeParseJson(fn.capabilities, []) : fn.capabilities,
  }));
}

export async function getFunction(tenantId, functionIdOrName, env) {
  if (!env?.DB) return null;
  const fn = await env.DB.prepare(`
    SELECT * FROM site_functions WHERE tenant_id = ? AND (id = ? OR name = ?) LIMIT 1
  `).bind(tenantId, functionIdOrName, functionIdOrName).first();

  if (!fn) return null;
  return {
    ...fn,
    capabilities: typeof fn.capabilities === 'string' ? safeParseJson(fn.capabilities, []) : fn.capabilities,
  };
}

export async function createFunction(tenantId, data, env) {
  await checkQuota(tenantId, 'functions', 1, env);

  const name = sanitizeIdentifier(data.name || "customFunction");
  const description = data.description ? String(data.description).slice(0, 500) : "";
  const sourceCode = String(data.code || data.definition || "");
  if (!sourceCode.trim()) {
    throw new ProPlatformError("Function code cannot be empty", "EMPTY_CODE");
  }

  // Parse and validate safe AST
  const ast = parseFeraFunction(sourceCode);
  const detectedOps = extractOperationsFromAST(ast);

  // Derive and validate capabilities
  let capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
  for (const op of detectedOps) {
    const requiredCap = OPERATION_CAPABILITIES[op];
    if (requiredCap && !capabilities.includes(requiredCap)) {
      capabilities.push(requiredCap);
    }
  }

  const id = `func_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  const definitionJson = JSON.stringify({ source: sourceCode, ast });

  await env.DB.prepare(`
    INSERT INTO site_functions (id, tenant_id, name, description, definition, capabilities, status, version, timeout_ms, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'draft', 1, 1500, ?, ?)
    ON CONFLICT(tenant_id, name) DO UPDATE SET
      description = excluded.description,
      definition = excluded.definition,
      capabilities = excluded.capabilities,
      version = site_functions.version + 1,
      updated_at = excluded.updated_at
  `).bind(id, tenantId, name, description, definitionJson, JSON.stringify(capabilities), now, now).run();

  return await getFunction(tenantId, name, env);
}

export async function updateFunction(tenantId, functionId, data, env) {
  const existing = await getFunction(tenantId, functionId, env);
  if (!existing) throw new ProPlatformError("Function not found", "NOT_FOUND");

  const name = data.name ? sanitizeIdentifier(data.name) : existing.name;
  const description = data.description !== undefined ? String(data.description).slice(0, 500) : existing.description;
  const sourceCode = data.code || data.definition ? String(data.code || data.definition) : null;

  let definitionJson = existing.definition;
  let capabilities = existing.capabilities;

  if (sourceCode) {
    const ast = parseFeraFunction(sourceCode);
    const detectedOps = extractOperationsFromAST(ast);
    capabilities = Array.isArray(data.capabilities) ? data.capabilities : [...existing.capabilities];
    for (const op of detectedOps) {
      const requiredCap = OPERATION_CAPABILITIES[op];
      if (requiredCap && !capabilities.includes(requiredCap)) {
        capabilities.push(requiredCap);
      }
    }
    definitionJson = JSON.stringify({ source: sourceCode, ast });
  }

  const nextVersion = existing.version + 1;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE site_functions
    SET name = ?, description = ?, definition = ?, capabilities = ?, version = ?, updated_at = ?
    WHERE tenant_id = ? AND id = ?
  `).bind(name, description, definitionJson, JSON.stringify(capabilities), nextVersion, now, tenantId, existing.id).run();

  // Record version history
  try {
    await env.DB.prepare(`
      INSERT INTO site_function_versions (id, function_id, tenant_id, version, name, definition, capabilities, published_at, published_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `fver_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
      existing.id, tenantId, nextVersion, name, definitionJson, JSON.stringify(capabilities), now, "merchant"
    ).run();
  } catch {}

  return await getFunction(tenantId, existing.id, env);
}

export async function deleteFunction(tenantId, functionId, env) {
  await env.DB.prepare("DELETE FROM site_functions WHERE tenant_id = ? AND (id = ? OR name = ?)").bind(tenantId, functionId, functionId).run();
  return { success: true, deleted_id: functionId };
}

export async function executeFunction(tenantId, functionNameOrCode, args = {}, authContext = {}, env) {
  const startTime = Date.now();
  let fn = null;
  let ast = null;
  let capabilities = [];

  // Check invocation quota
  await checkQuota(tenantId, 'function_invocations', 1, env);

  // If functionName matches stored function
  if (typeof functionNameOrCode === 'string' && !functionNameOrCode.includes('{') && !functionNameOrCode.includes('return')) {
    fn = await getFunction(tenantId, functionNameOrCode, env);
    if (!fn) throw new ProPlatformError(`Function '${functionNameOrCode}' not found`, "FUNCTION_NOT_FOUND");
    const parsedDef = safeParseJson(fn.definition, {});
    ast = parsedDef.ast || parseFeraFunction(parsedDef.source || "");
    capabilities = fn.capabilities || [];
  } else {
    // Ad-hoc source execution (for test runner / console)
    const source = typeof functionNameOrCode === 'string' ? functionNameOrCode : (functionNameOrCode.code || "");
    ast = parseFeraFunction(source);
    capabilities = functionNameOrCode.capabilities || extractOperationsFromAST(ast).map(op => OPERATION_CAPABILITIES[op]).filter(Boolean);
  }

  const sdk = createFeraSDK({ tenantId, env, authContext });

  try {
    const result = await executeFeraAST(ast, args, sdk, capabilities);
    const durationMs = Date.now() - startTime;

    // Log success
    recordExecutionLog(tenantId, {
      function_name: fn?.name || "adhoc_function",
      event_type: "function_call",
      details: JSON.stringify({ args_keys: Object.keys(args || {}) }),
      duration_ms: durationMs,
      status_code: 200,
    }, env).catch(() => {});

    // Increment quota usage counter
    try {
      await env.DB.prepare(
        "UPDATE site_quotas SET function_invocations_used = function_invocations_used + 1, updated_at = ? WHERE tenant_id = ?"
      ).bind(new Date().toISOString(), tenantId).run();
    } catch {}

    return {
      success: true,
      result,
      duration_ms: durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    recordExecutionLog(tenantId, {
      function_name: fn?.name || "adhoc_function",
      event_type: "function_error",
      details: err.message,
      duration_ms: durationMs,
      status_code: 500,
    }, env).catch(() => {});

    throw new ProPlatformError(err.message, err.code || "EXECUTION_ERROR", { duration_ms: durationMs });
  }
}

// -----------------------------------------------------------------------------
// 5. Atomic Site Validation & Publishing
// -----------------------------------------------------------------------------

export async function validateSite(tenantId, env) {
  const errors = [];
  const warnings = [];

  const pages = await listPages(tenantId, env);
  const routes = await listRoutes(tenantId, env);
  const functions = await listFunctions(tenantId, env);

  if (pages.length === 0) {
    errors.push("Site must have at least one page before publishing");
  }

  // 1. Homepage validation
  const homepage = pages.find(p => p.is_homepage === 1);
  if (!homepage && pages.length > 0) {
    warnings.push("No page is explicitly designated as homepage. First page will be used as default.");
  }

  // 2. Route validation
  const pageIdSet = new Set(pages.map(p => p.id));
  const functionNameSet = new Set(functions.map(f => f.name));
  const seenPatterns = new Set();

  for (const r of routes) {
    if (seenPatterns.has(r.path_pattern)) {
      errors.push(`Duplicate route pattern: ${r.path_pattern}`);
    }
    seenPatterns.add(r.path_pattern);

    if (!pageIdSet.has(r.page_id)) {
      errors.push(`Route '${r.path_pattern}' points to non-existent page ID: ${r.page_id}`);
    }

    if (r.function_binding && !functionNameSet.has(r.function_binding)) {
      errors.push(`Route '${r.path_pattern}' binds to non-existent function: '${r.function_binding}'`);
    }
  }

  // 3. Function capabilities validation
  for (const fn of functions) {
    const parsed = safeParseJson(fn.definition, {});
    if (parsed.ast) {
      const ops = extractOperationsFromAST(parsed.ast);
      for (const op of ops) {
        const requiredCap = OPERATION_CAPABILITIES[op];
        if (requiredCap && !fn.capabilities.includes(requiredCap)) {
          warnings.push(`Function '${fn.name}' uses operation '${op}' but capability '${requiredCap}' is undeclared.`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      pages_count: pages.length,
      routes_count: routes.length,
      functions_count: functions.length,
    },
  };
}

export async function publishSite(tenantId, deployedBy = "merchant", env) {
  const validation = await validateSite(tenantId, env);
  if (!validation.valid) {
    throw new ProPlatformError("Site validation failed. Cannot publish with errors.", "VALIDATION_FAILED", { errors: validation.errors });
  }

  const pages = await listPages(tenantId, env);
  const routes = await listRoutes(tenantId, env);
  const functions = await listFunctions(tenantId, env);

  // Fetch navigation
  let navigation = [];
  try {
    const navRes = await env.DB.prepare("SELECT * FROM site_navigation WHERE tenant_id = ?").bind(tenantId).all();
    navigation = navRes.results || [];
  } catch {}

  const now = new Date().toISOString();
  const snapshot = {
    pages,
    routes,
    functions,
    navigation,
    published_at: now,
    published_by: deployedBy,
  };

  // Supersede existing active deployments
  await env.DB.prepare("UPDATE site_deployments SET status = 'superseded' WHERE tenant_id = ? AND status = 'published'").bind(tenantId).run();

  // Fetch next version number
  const lastDep = await env.DB.prepare("SELECT MAX(version) as max_ver FROM site_deployments WHERE tenant_id = ?").bind(tenantId).first();
  const nextVer = (lastDep?.max_ver || 0) + 1;

  const depId = `dep_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

  await env.DB.prepare(`
    INSERT INTO site_deployments (id, tenant_id, version, status, snapshot, deployed_by, created_at)
    VALUES (?, ?, ?, 'published', ?, ?, ?)
  `).bind(depId, tenantId, nextVer, JSON.stringify(snapshot), deployedBy, now).run();

  // Mark draft items as published
  await env.DB.prepare("UPDATE site_pages SET status = 'published' WHERE tenant_id = ?").bind(tenantId).run();
  await env.DB.prepare("UPDATE site_routes SET status = 'published' WHERE tenant_id = ?").bind(tenantId).run();
  await env.DB.prepare("UPDATE site_functions SET status = 'published' WHERE tenant_id = ?").bind(tenantId).run();

  // Record audit log
  recordExecutionLog(tenantId, {
    event_type: "publish",
    details: JSON.stringify({ version: nextVer, pages: pages.length, routes: routes.length, functions: functions.length }),
    status_code: 200,
  }, env).catch(() => {});

  return {
    success: true,
    deployment_id: depId,
    version: nextVer,
    published_at: now,
  };
}

export async function getPublishedDeployment(tenantId, env) {
  if (!env?.DB) return null;
  const dep = await env.DB.prepare(
    "SELECT * FROM site_deployments WHERE tenant_id = ? AND status = 'published' ORDER BY version DESC LIMIT 1"
  ).bind(tenantId).first();

  if (!dep) return null;
  return {
    ...dep,
    snapshot: typeof dep.snapshot === 'string' ? safeParseJson(dep.snapshot) : dep.snapshot,
  };
}

export async function rollbackDeployment(tenantId, versionOrId, restoredBy = "merchant", env) {
  if (!env?.DB) throw new ProPlatformError("Database unavailable", "DATABASE_UNAVAILABLE");

  let targetDep;
  if (typeof versionOrId === 'number' || !isNaN(Number(versionOrId))) {
    targetDep = await env.DB.prepare(
      "SELECT * FROM site_deployments WHERE tenant_id = ? AND version = ? LIMIT 1"
    ).bind(tenantId, Number(versionOrId)).first();
  } else {
    targetDep = await env.DB.prepare(
      "SELECT * FROM site_deployments WHERE tenant_id = ? AND id = ? LIMIT 1"
    ).bind(tenantId, String(versionOrId)).first();
  }

  if (!targetDep) {
    throw new ProPlatformError("Target deployment not found", "NOT_FOUND");
  }

  const snapshot = typeof targetDep.snapshot === 'string' ? safeParseJson(targetDep.snapshot) : targetDep.snapshot;
  if (!snapshot) {
    throw new ProPlatformError("Deployment snapshot is invalid", "INVALID_SNAPSHOT");
  }

  // Supersede current published deployments
  await env.DB.prepare(
    "UPDATE site_deployments SET status = 'superseded' WHERE tenant_id = ? AND status = 'published'"
  ).bind(tenantId).run();

  // Create new deployment version with rolled-back snapshot
  const lastDep = await env.DB.prepare("SELECT MAX(version) as max_ver FROM site_deployments WHERE tenant_id = ?").bind(tenantId).first();
  const nextVer = (lastDep?.max_ver || 0) + 1;
  const now = new Date().toISOString();
  const depId = `dep_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

  await env.DB.prepare(`
    INSERT INTO site_deployments (id, tenant_id, version, status, snapshot, deployed_by, created_at)
    VALUES (?, ?, ?, 'published', ?, ?, ?)
  `).bind(depId, tenantId, nextVer, JSON.stringify(snapshot), `rollback_to_v${targetDep.version}_by_${restoredBy}`, now).run();

  return {
    success: true,
    deployment_id: depId,
    version: nextVer,
    restored_from_version: targetDep.version,
    published_at: now,
  };
}

// -----------------------------------------------------------------------------
// 6. AI Builder Action Dispatcher
// -----------------------------------------------------------------------------

export async function executeAIAction(tenantId, action, params = {}, env) {
  await checkQuota(tenantId, 'ai_actions', 1, env);

  let result = null;
  switch (action) {
    case 'create_page':
      result = await createPage(tenantId, params, env);
      break;
    case 'update_page':
      result = await updatePage(tenantId, params.id, params, env);
      break;
    case 'delete_page':
      result = await deletePage(tenantId, params.id, env);
      break;
    case 'duplicate_page':
      result = await duplicatePage(tenantId, params.id, env);
      break;
    case 'create_route':
      result = await createRoute(tenantId, params, env);
      break;
    case 'update_route':
      result = await updateRoute(tenantId, params.id, params, env);
      break;
    case 'delete_route':
      result = await deleteRoute(tenantId, params.id, env);
      break;
    case 'create_function':
      result = await createFunction(tenantId, params, env);
      break;
    case 'update_function':
      result = await updateFunction(tenantId, params.id, params, env);
      break;
    case 'delete_function':
      result = await deleteFunction(tenantId, params.id, env);
      break;
    case 'connect_function': {
      // Connect function to route or page
      if (params.route_id) {
        result = await updateRoute(tenantId, params.route_id, { function_binding: params.function_name }, env);
      } else if (params.page_slug || params.page_id) {
        const page = await getPage(tenantId, params.page_id || params.page_slug, env);
        if (page) {
          const routes = await listRoutes(tenantId, env);
          const matched = routes.find(r => r.page_id === page.id);
          if (matched) {
            result = await updateRoute(tenantId, matched.id, { function_binding: params.function_name }, env);
          }
        }
      }
      break;
    }
    case 'publish':
      result = await publishSite(tenantId, "ai_copilot", env);
      break;
    default:
      throw new ProPlatformError(`Unknown AI action: ${action}`, "INVALID_AI_ACTION");
  }

  // Increment AI quota counter
  try {
    await env.DB.prepare(
      "UPDATE site_quotas SET ai_actions_used = ai_actions_used + 1, updated_at = ? WHERE tenant_id = ?"
    ).bind(new Date().toISOString(), tenantId).run();
  } catch {}

  return result;
}

// -----------------------------------------------------------------------------
// 7. Observability & Utilities
// -----------------------------------------------------------------------------

export async function recordExecutionLog(tenantId, logData, env) {
  if (!env?.DB) return;
  try {
    const id = `log_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    await env.DB.prepare(`
      INSERT INTO site_execution_logs (id, tenant_id, function_name, event_type, details, duration_ms, status_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, tenantId,
      logData.function_name || null,
      logData.event_type || 'info',
      typeof logData.details === 'object' ? JSON.stringify(logData.details) : (logData.details || ""),
      Number(logData.duration_ms) || 0,
      Number(logData.status_code) || 200,
      new Date().toISOString()
    ).run();
  } catch {}
}

export async function listExecutionLogs(tenantId, limit = 50, env) {
  if (!env?.DB) return [];
  const res = await env.DB.prepare(`
    SELECT * FROM site_execution_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?
  `).bind(tenantId, Math.min(limit, 100)).all();
  return res.results || [];
}

function sanitizeSlug(str) {
  if (!str) return "page";
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");
}

function sanitizeIdentifier(str) {
  if (!str) return "fn";
  return String(str).replace(/[^a-zA-Z0-9_$]/g, "_");
}

function safeParseJson(jsonStr, fallback = {}) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return fallback;
  }
}

// -----------------------------------------------------------------------------
// 7. Project Import & Deterministic Analysis Service Layer
// -----------------------------------------------------------------------------

/**
 * Instantiates Backblaze B2 client from environment.
 * Exclusively uses Backblaze B2 (never Cloudflare R2).
 */
export function getProB2Client(env) {
  return new B2Client({
    endpoint: env?.B2_ENDPOINT,
    bucketName: env?.B2_BUCKET || env?.B2_BUCKET_NAME || env?.MEDIA_BUCKET_NAME || 'ferasetu-media-prod',
    applicationKeyId: env?.B2_APPLICATION_KEY_ID || env?.B2_KEY_ID || '',
    applicationKey: env?.B2_APPLICATION_KEY || env?.B2_KEY || '',
    explicitRegion: env?.B2_REGION,
    fetcher: env?.b2Fetcher || (typeof fetch !== 'undefined' ? fetch : null),
  });
}

/**
 * Analyzes an uploaded project (raw ZIP buffer or file bundle) deterministically.
 */
export async function analyzeUploadedProject(tenantId, input, options = {}, env) {
  let files = [];

  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    const extracted = await extractZipArchive(input);
    files = extracted.files;
  } else if (Array.isArray(input)) {
    files = input;
  } else if (Array.isArray(input?.files)) {
    files = input.files;
  } else {
    throw new ProPlatformError("Invalid input format. Expected ZIP archive or file bundle.", "INVALID_INPUT");
  }

  // Fetch current live quotas for tenant
  const quotas = await getSiteQuotas(tenantId, env);

  // Execute deterministic AST-first analysis
  const report = await analyzeProject(files, { quotas });

  return {
    success: true,
    report,
    files_count: files.length,
  };
}

/**
 * Executes a reviewed project import.
 * Enforces transaction state machine:
 * ANALYZED -> SNAPSHOT_PENDING -> SNAPSHOT_READY -> IMPORTING -> COMMITTED
 */
export async function executeProjectImport(tenantId, payload, env) {
  if (!env?.DB) throw new ProPlatformError("Database unavailable", "DATABASE_UNAVAILABLE");

  const projectName = String(payload.projectName || payload.project_name || payload.name || "Imported Project").trim();
  let files = payload.files || payload.rawFiles || [];

  // If raw ZIP buffer provided, extract files
  if ((!files || files.length === 0) && payload.rawZipBuffer) {
    const extracted = await extractZipArchive(payload.rawZipBuffer);
    files = extracted.files;
  }

  if (files.length === 0) {
    throw new ProPlatformError("Cannot import empty project. No files provided.", "EMPTY_PROJECT");
  }

  // 1. Quota Governance Check
  const quotas = await getSiteQuotas(tenantId, env);
  const limits = quotas.limits;
  const usage = quotas.usage;

  const selection = payload.selection || {};
  let selectedPages = Array.isArray(selection.pages) ? selection.pages : [];
  let selectedRoutes = Array.isArray(selection.routes) ? selection.routes : [];
  let selectedFunctions = Array.isArray(selection.functions) ? selection.functions : [];

  if (Array.isArray(payload.selectedResourceIdentities) && payload.resources) {
    const idSet = new Set(payload.selectedResourceIdentities);
    selectedPages = (payload.resources.pages || []).filter(p => idSet.has(p.deterministic_identity));
    selectedRoutes = (payload.resources.routes || []).filter(r => idSet.has(r.deterministic_identity));
    selectedFunctions = (payload.resources.functions || []).filter(f => idSet.has(f.deterministic_identity));
  } else if (selectedPages.length === 0 && selectedRoutes.length === 0 && selectedFunctions.length === 0 && payload.resources) {
    selectedPages = payload.resources.pages || [];
    selectedRoutes = payload.resources.routes || [];
    selectedFunctions = payload.resources.functions || [];
  }

  if ((usage.pages_count + selectedPages.length) > limits.max_pages) {
    throw new ProPlatformError(
      `Pages quota exceeded (${usage.pages_count + selectedPages.length} total requested, plan limit: ${limits.max_pages}). No partial import was committed.`,
      "QUOTA_EXCEEDED",
      { resource: 'pages', requested: selectedPages.length, limit: limits.max_pages }
    );
  }

  if ((usage.routes_count + selectedRoutes.length) > limits.max_routes) {
    throw new ProPlatformError(
      `Routes quota exceeded (${usage.routes_count + selectedRoutes.length} total requested, plan limit: ${limits.max_routes}). No partial import was committed.`,
      "QUOTA_EXCEEDED",
      { resource: 'routes', requested: selectedRoutes.length, limit: limits.max_routes }
    );
  }

  if ((usage.functions_count + selectedFunctions.length) > limits.max_functions) {
    throw new ProPlatformError(
      `Functions quota exceeded (${usage.functions_count + selectedFunctions.length} total requested, plan limit: ${limits.max_functions}). No partial import was committed.`,
      "QUOTA_EXCEEDED",
      { resource: 'functions', requested: selectedFunctions.length, limit: limits.max_functions }
    );
  }

  // 2. Dependency-aware resource resolution (Adjustment 5)
  // Ensure any selected route's target page is included so routes never orphan
  const finalPagesToCreate = [...selectedPages];
  for (const r of selectedRoutes) {
    const referencedSlug = r.page_slug || r.target_component;
    if (referencedSlug && !finalPagesToCreate.some(p => p.slug === referencedSlug || p.title === referencedSlug)) {
      // Find candidate from analyzed resources if available
      const candidatePage = (payload.candidatePages || []).find(p => p.slug === referencedSlug || p.title === referencedSlug);
      if (candidatePage) {
        finalPagesToCreate.push(candidatePage);
      }
    }
  }

  // 3. Compute Project Fingerprint
  const sortedHashes = files.map(f => `${f.path}:${f.hash}`).sort().join('\n');
  const projectFingerprint = await computeSha256Hex(sortedHashes);

  // 4. Idempotency Check (FIX 11)
  let existingProject = await env.DB.prepare(
    "SELECT * FROM site_imported_projects WHERE tenant_id = ? AND project_name = ?"
  ).bind(tenantId, projectName).first();

  if (existingProject && existingProject.current_version_id) {
    const existingVersion = await env.DB.prepare(
      "SELECT * FROM site_import_versions WHERE id = ? AND project_fingerprint = ? AND import_status = 'COMMITTED'"
    ).bind(existingProject.current_version_id, projectFingerprint).first();

    if (existingVersion) {
      // Identical project version already committed — return idempotent response
      const existingMappings = await env.DB.prepare(
        "SELECT * FROM site_source_mappings WHERE project_id = ? AND version_id = ?"
      ).bind(existingProject.id, existingVersion.id).all();

      return {
        success: true,
        is_idempotent: true,
        project_id: existingProject.id,
        version_number: existingVersion.version_number,
        import_status: 'COMMITTED',
        resources: {
          pages_count: existingMappings.results?.filter(m => m.resource_type === 'page').length || 0,
          routes_count: existingMappings.results?.filter(m => m.resource_type === 'route').length || 0,
          functions_count: existingMappings.results?.filter(m => m.resource_type === 'function').length || 0,
        },
      };
    }
  }

  // 5. State: SNAPSHOT_PENDING
  const projectId = existingProject ? existingProject.id : `proj_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();

  if (!existingProject) {
    await env.DB.prepare(`
      INSERT INTO site_imported_projects (id, tenant_id, project_name, framework, current_version_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, NULL, 'analyzed', ?, ?)
    `).bind(projectId, tenantId, projectName, payload.framework?.type || 'react', now, now).run();
    existingProject = await env.DB.prepare("SELECT * FROM site_imported_projects WHERE id = ?").bind(projectId).first();
  }

  // Determine next version number
  const lastVerRow = await env.DB.prepare(
    "SELECT MAX(version_number) as max_v FROM site_import_versions WHERE project_id = ?"
  ).bind(projectId).first();
  const nextVersionNumber = (lastVerRow?.max_v || 0) + 1;
  const versionId = `iver_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

  const manifestKey = `ferasetu-pro/projects/${tenantId}/${projectId}/v${nextVersionNumber}/manifest.json`;
  const archiveKey = `ferasetu-pro/projects/${tenantId}/${projectId}/v${nextVersionNumber}/source.zip`;

  await env.DB.prepare(`
    INSERT INTO site_import_versions (id, project_id, version_number, project_fingerprint, manifest_b2_key, source_archive_b2_key, import_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'SNAPSHOT_PENDING', ?)
  `).bind(versionId, projectId, nextVersionNumber, projectFingerprint, manifestKey, archiveKey, now).run();

  // 6. State: SNAPSHOT_READY (Upload manifest to Backblaze B2)
  const b2Client = getProB2Client(env);
  const manifestData = {
    projectId,
    versionNumber: nextVersionNumber,
    projectFingerprint,
    framework: payload.framework,
    files: files.map(f => ({ path: f.path, size: f.size, hash: f.hash, isBinary: f.isBinary })),
    created_at: now,
  };

  try {
    if (env?.B2_APPLICATION_KEY_ID || env?.B2_KEY_ID || env?.b2Fetcher) {
      await b2Client.putObject(manifestKey, JSON.stringify(manifestData, null, 2), {
        contentType: 'application/json',
      });

      // If raw ZIP buffer available, also store source.zip
      if (payload.rawZipBuffer) {
        await b2Client.putObject(archiveKey, payload.rawZipBuffer, {
          contentType: 'application/zip',
        });
      }
    }

    await env.DB.prepare(
      "UPDATE site_import_versions SET import_status = 'SNAPSHOT_READY' WHERE id = ?"
    ).bind(versionId).run();
  } catch (b2Err) {
    // Failure handling (FIX 14): Mark version failed, do NOT commit any Studio resources
    await env.DB.prepare(
      "UPDATE site_import_versions SET import_status = 'FAILED' WHERE id = ?"
    ).bind(versionId).run();

    throw new ProPlatformError(
      "B2 snapshot upload failed (B2 upload failed). No Pro Studio resources were committed. [Retry]",
      "B2_UPLOAD_FAILED",
      { originalError: b2Err?.message }
    );
  }

  // 7. State: IMPORTING
  await env.DB.prepare(
    "UPDATE site_import_versions SET import_status = 'IMPORTING' WHERE id = ?"
  ).bind(versionId).run();

  const createdPages = [];
  const createdRoutes = [];
  const createdFunctions = [];
  const sourceMappings = [];

  // A. Create Pages in D1
  for (const p of finalPagesToCreate) {
    const page = await createPage(tenantId, {
      title: p.title,
      slug: p.slug,
      type: p.type || 'standard',
      content: p.content,
      is_homepage: p.is_homepage === 1,
      auth_required: p.auth_required === 1,
      seo_title: p.seo_title,
      seo_description: p.seo_description,
    }, env);
    createdPages.push(page);

    const canonicalB = getCanonicalStudioRepresentation('page', page);
    const studioHash = await computeSha256Hex(canonicalB);

    sourceMappings.push({
      id: `smap_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
      project_id: projectId,
      version_id: versionId,
      source_path: p.source_path || `src/pages/${p.slug}.tsx`,
      resource_type: 'page',
      resource_id: page.id,
      deterministic_identity: p.deterministic_identity || (await computeSha256Hex(p.slug)),
      source_hash: p.source_hash || '',
      studio_hash: studioHash,
      metadata: JSON.stringify({ slug: page.slug, title: page.title }),
    });
  }

  // B. Create Routes in D1
  for (const r of selectedRoutes) {
    // Map route to newly created page ID
    const matchingPage = createdPages.find(p => p.slug === r.page_slug || p.title === r.target_component);
    const pageId = matchingPage ? matchingPage.id : (createdPages[0]?.id || null);

    if (pageId) {
      const route = await createRoute(tenantId, {
        path_pattern: r.path_pattern,
        page_id: pageId,
        access_level: r.access_level || 'public',
        function_binding: r.function_binding || null,
      }, env);
      createdRoutes.push(route);

      const canonicalB = getCanonicalStudioRepresentation('route', route);
      const studioHash = await computeSha256Hex(canonicalB);

      sourceMappings.push({
        id: `smap_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
        project_id: projectId,
        version_id: versionId,
        source_path: r.source_path || 'src/router.tsx',
        resource_type: 'route',
        resource_id: route.id,
        deterministic_identity: r.deterministic_identity || (await computeSha256Hex(r.path_pattern)),
        source_hash: r.source_hash || '',
        studio_hash: studioHash,
        metadata: JSON.stringify({ path_pattern: route.path_pattern, page_id: pageId }),
      });
    }
  }

  // C. Create Functions in D1
  for (const fn of selectedFunctions) {
    const createdFn = await createFunction(tenantId, {
      name: fn.name,
      description: fn.description || 'Imported function',
      code: fn.code,
      capabilities: fn.capabilities || [],
    }, env);
    createdFunctions.push(createdFn);

    const canonicalB = getCanonicalStudioRepresentation('function', createdFn);
    const studioHash = await computeSha256Hex(canonicalB);

    sourceMappings.push({
      id: `smap_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
      project_id: projectId,
      version_id: versionId,
      source_path: fn.source_path || `src/api/${fn.name}.js`,
      resource_type: 'function',
      resource_id: createdFn.id,
      deterministic_identity: fn.deterministic_identity || (await computeSha256Hex(fn.name)),
      source_hash: fn.source_hash || '',
      studio_hash: studioHash,
      metadata: JSON.stringify({ name: createdFn.name }),
    });
  }

  // D. Persist Source Files metadata in D1
  for (const f of files) {
    const fileId = `sfile_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    await env.DB.prepare(`
      INSERT OR REPLACE INTO site_source_files (id, version_id, source_path, file_hash, file_size, file_type, relevant_metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fileId, versionId, f.path, f.hash, f.size, f.isBinary ? 'binary' : 'text',
      JSON.stringify({ isBinary: f.isBinary })
    ).run();
  }

  // E. Persist Source Mappings in D1
  for (const sm of sourceMappings) {
    await env.DB.prepare(`
      INSERT OR REPLACE INTO site_source_mappings (id, project_id, version_id, source_path, resource_type, resource_id, deterministic_identity, source_hash, studio_hash, mapping_status, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).bind(
      sm.id, sm.project_id, sm.version_id, sm.source_path, sm.resource_type,
      sm.resource_id, sm.deterministic_identity, sm.source_hash, sm.studio_hash,
      sm.metadata, now, now
    ).run();
  }

  // 8. State: COMMITTED
  await env.DB.prepare(
    "UPDATE site_import_versions SET import_status = 'COMMITTED' WHERE id = ?"
  ).bind(versionId).run();

  await env.DB.prepare(
    "UPDATE site_imported_projects SET current_version_id = ?, status = 'committed', updated_at = ? WHERE id = ?"
  ).bind(versionId, now, projectId).run();

  // Record audit execution log
  recordExecutionLog(tenantId, {
    event_type: "project_import",
    details: JSON.stringify({
      projectId,
      versionNumber: nextVersionNumber,
      pagesCreated: createdPages.length,
      routesCreated: createdRoutes.length,
      functionsCreated: createdFunctions.length,
    }),
    status_code: 200,
  }, env).catch(() => {});

  return {
    success: true,
    project_id: projectId,
    version_id: versionId,
    version_number: nextVersionNumber,
    import_status: 'COMMITTED',
    b2_snapshot: {
      manifest_key: manifestKey,
      archive_key: archiveKey,
    },
    resources: {
      pages_count: createdPages.length,
      routes_count: createdRoutes.length,
      functions_count: createdFunctions.length,
      files_count: files.length,
      mappings_count: sourceMappings.length,
    },
  };
}

/**
 * Computes 3-way re-import diff between original base snapshot, live Studio state, and new upload.
 */
export async function computeReimportDiffForTenant(tenantId, projectId, newFilesOrZip, env) {
  if (!env?.DB) throw new ProPlatformError("Database unavailable", "DATABASE_UNAVAILABLE");

  let newFiles = [];
  if (newFilesOrZip instanceof ArrayBuffer || newFilesOrZip instanceof Uint8Array) {
    const extracted = await extractZipArchive(newFilesOrZip);
    newFiles = extracted.files;
  } else if (Array.isArray(newFilesOrZip)) {
    newFiles = newFilesOrZip;
  } else if (Array.isArray(newFilesOrZip?.files)) {
    newFiles = newFilesOrZip.files;
  }

  const project = await env.DB.prepare(
    "SELECT * FROM site_imported_projects WHERE tenant_id = ? AND id = ?"
  ).bind(tenantId, projectId).first();

  if (!project || !project.current_version_id) {
    throw new ProPlatformError("Imported project or version not found", "NOT_FOUND");
  }

  // Fetch current version mappings
  const mappingsRes = await env.DB.prepare(
    "SELECT * FROM site_source_mappings WHERE project_id = ? AND version_id = ?"
  ).bind(projectId, project.current_version_id).all();
  const mappings = mappingsRes.results || [];

  // Fetch base source files
  const filesRes = await env.DB.prepare(
    "SELECT * FROM site_source_files WHERE version_id = ?"
  ).bind(project.current_version_id).all();
  const baseFiles = filesRes.results || [];

  const baseFileContents = new Map();
  for (const bf of baseFiles) {
    baseFileContents.set(bf.source_path, bf.file_hash); // or content if cached
  }

  // Fetch live Studio resources
  const pages = await listPages(tenantId, env);
  const routes = await listRoutes(tenantId, env);
  const functions = await listFunctions(tenantId, env);

  const diffReport = computeProjectReimportDiff(
    mappings,
    newFiles,
    { pages, routes, functions },
    baseFileContents
  );

  return {
    success: true,
    project_id: projectId,
    current_version_id: project.current_version_id,
    diff: diffReport,
  };
}

/**
 * Applies reviewed re-import updates and conflict resolutions to live Studio resources.
 */
export async function applyReimportUpdates(tenantId, payload, env) {
  if (!env?.DB) throw new ProPlatformError("Database unavailable", "DATABASE_UNAVAILABLE");

  const projectId = payload.projectId || payload.project_id;
  const resolutions = Array.isArray(payload.resolutions)
    ? payload.resolutions
    : (Array.isArray(payload.decisions) ? payload.decisions : []);
  let newFiles = payload.newFiles || payload.files || [];

  if ((!newFiles || newFiles.length === 0) && payload.rawZipBuffer) {
    const extracted = await extractZipArchive(payload.rawZipBuffer);
    newFiles = extracted.files;
  }

  const newFileMap = new Map(newFiles.map(f => [f.path, f]));

  const project = await env.DB.prepare(
    "SELECT * FROM site_imported_projects WHERE tenant_id = ? AND id = ?"
  ).bind(tenantId, projectId).first();

  if (!project) throw new ProPlatformError("Project not found", "NOT_FOUND");

  const fromVersionId = project.current_version_id;
  const now = new Date().toISOString();

  // Create new version for updates
  const lastVerRow = await env.DB.prepare(
    "SELECT MAX(version_number) as max_v FROM site_import_versions WHERE project_id = ?"
  ).bind(projectId).first();
  const nextVerNumber = (lastVerRow?.max_v || 0) + 1;
  const toVersionId = `iver_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

  const sortedHashes = newFiles.map(f => `${f.path}:${f.hash}`).sort().join('\n');
  const projectFingerprint = await computeSha256Hex(sortedHashes);

  const manifestKey = `ferasetu-pro/projects/${tenantId}/${projectId}/v${nextVerNumber}/manifest.json`;
  const archiveKey = `ferasetu-pro/projects/${tenantId}/${projectId}/v${nextVerNumber}/source.zip`;

  await env.DB.prepare(`
    INSERT INTO site_import_versions (id, project_id, version_number, project_fingerprint, manifest_b2_key, source_archive_b2_key, import_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'IMPORTING', ?)
  `).bind(toVersionId, projectId, nextVerNumber, projectFingerprint, manifestKey, archiveKey, now).run();

  let appliedCount = 0;
  let skippedCount = 0;

  for (const res of resolutions) {
    const sourcePath = res.source_path;
    const resolution = res.resolution; // 'keep_external' | 'keep_studio' | 'manual_merge'
    const newFile = newFileMap.get(sourcePath);

    // Record in site_import_changes
    const changeId = `ichg_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    await env.DB.prepare(`
      INSERT INTO site_import_changes (id, project_id, from_version_id, to_version_id, source_path, change_type, conflict_status, resolution, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      changeId, projectId, fromVersionId, toVersionId, sourcePath,
      res.change_type || 'modified', res.conflict_status || 'TRUE_CONFLICT', resolution, now
    ).run();

    if (resolution === 'keep_studio') {
      skippedCount++;
      continue;
    }

    // Determine target content to apply
    let contentToApply = '';
    if (resolution === 'manual_merge' && res.resolved_content !== undefined) {
      contentToApply = res.resolved_content;
    } else if (newFile) {
      contentToApply = newFile.content;
    }

    if (!contentToApply && !res.resource_id) continue;

    // Apply to Page if resource_type is page
    if (res.resource_type === 'page' && res.resource_id) {
      try {
        await updatePage(tenantId, res.resource_id, {
          content: contentToApply,
          updated_at: now,
        }, env);
        appliedCount++;
      } catch {}
    } else if (res.resource_type === 'function' && res.resource_id) {
      try {
        await updateFunction(tenantId, res.resource_id, {
          code: contentToApply,
        }, env);
        appliedCount++;
      } catch {}
    }
  }

  // Upload updated manifest to Backblaze B2
  const b2Client = getProB2Client(env);
  try {
    if (env?.B2_APPLICATION_KEY_ID || env?.b2Fetcher) {
      await b2Client.putObject(manifestKey, JSON.stringify({
        projectId,
        versionNumber: nextVerNumber,
        projectFingerprint,
        resolutions,
        updated_at: now,
      }), { contentType: 'application/json' });
    }
  } catch {}

  // Commit version
  await env.DB.prepare(
    "UPDATE site_import_versions SET import_status = 'COMMITTED' WHERE id = ?"
  ).bind(toVersionId).run();

  await env.DB.prepare(
    "UPDATE site_imported_projects SET current_version_id = ?, status = 'committed', updated_at = ? WHERE id = ?"
  ).bind(toVersionId, now, projectId).run();

  return {
    success: true,
    project_id: projectId,
    version_id: toVersionId,
    version_number: nextVerNumber,
    applied_count: appliedCount,
    skipped_count: skippedCount,
  };
}

/**
 * Lists all imported projects for tenant.
 */
export async function listImportedProjects(tenantId, env) {
  if (!env?.DB) return [];
  const res = await env.DB.prepare(`
    SELECT p.*, v.version_number, v.import_status
    FROM site_imported_projects p
    LEFT JOIN site_import_versions v ON v.id = p.current_version_id
    WHERE p.tenant_id = ?
    ORDER BY p.updated_at DESC
  `).bind(tenantId).all();
  return res.results || [];
}

/**
 * Gets imported project details and source mappings.
 */
export async function getImportedProject(tenantId, projectId, env) {
  if (!env?.DB) return null;
  const project = await env.DB.prepare(
    "SELECT * FROM site_imported_projects WHERE tenant_id = ? AND id = ?"
  ).bind(tenantId, projectId).first();
  if (!project) return null;

  const versionsRes = await env.DB.prepare(
    "SELECT * FROM site_import_versions WHERE project_id = ? ORDER BY version_number DESC"
  ).bind(projectId).all();

  const mappingsRes = await env.DB.prepare(
    "SELECT * FROM site_source_mappings WHERE project_id = ? AND version_id = ?"
  ).bind(projectId, project.current_version_id).all();

  return {
    ...project,
    versions: versionsRes.results || [],
    mappings: mappingsRes.results || [],
  };
}

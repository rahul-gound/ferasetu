// FeraSetu Pro — Platform Service Layer (MCP-Ready Architecture)
// =============================================================================
// Authoritative domain operations for multi-page websites, routes, functions,
// atomic deployments, AI builder actions, and quotas.
// All operations are tenant-scoped and authorization-aware.
// =============================================================================

import { parseFeraFunction, extractOperationsFromAST, executeFeraAST, OPERATION_CAPABILITIES } from '../sandbox/feraRuntime.js';
import { createFeraSDK } from '../sandbox/feraSdk.js';

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

  const slug = sanitizeSlug(data.slug || data.title || "new-page");
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

// FeraSetu Pro — Pro Studio API Route Handlers
// =============================================================================
// All endpoints are gated behind authoritative requireProAccess().
// Strictly tenant-isolated and quota-governed.
// =============================================================================

import { requireProAccess, ProAccessError } from '../middleware/proAuth.js';
import * as proService from '../services/proPlatformService.js';
import * as dataStorageService from '../services/proDataStorageService.js';
import { PRO_TEMPLATES, installProTemplate } from '../templates/proTemplates.js';

const ALLOWED_ORIGINS = [
  "https://ferasetu.com",
  "https://www.ferasetu.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return false;
    if (url.hostname.endsWith(".ferasetu.com") || url.hostname === "ferasetu.com") return true;
    if (url.hostname.endsWith(".workers.dev")) return true;
    return false;
  } catch {
    return false;
  }
}

function getCorsHeaders(request) {
  const origin = request ? (request.headers?.get("Origin") || request.headers?.get("origin")) : null;
  const allowedOrigin = isOriginAllowed(origin) ? origin : (origin || "https://ferasetu.com");
  const reqHeaders = request ? request.headers?.get("Access-Control-Request-Headers") : null;
  const baseHeaders = "Content-Type, Authorization, X-Requested-With, Accept, X-Organization-Id, X-Shop-Slug, X-Shop-Id, X-Store-Slug, X-Customer-Session, X-Forwarded-Host, X-User-Id, Cache-Control, Pragma";
  const allowedHeaders = reqHeaders ? `${baseHeaders}, ${reqHeaders}` : baseHeaders;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": allowedHeaders,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data, status = 200, extraHeaders = {}, request = null) {
  const cors = getCorsHeaders(request);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      ...cors,
      ...extraHeaders,
    },
  });
}

function errorResponse(err, defaultStatus = 400, request = null) {
  const status = err.status || defaultStatus;
  const code = err.code || "REQUEST_FAILED";
  const cors = getCorsHeaders(request);
  return new Response(
    JSON.stringify({
      error: err.message || "An unexpected error occurred",
      code,
      details: err.details || undefined,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, private",
        ...cors,
      },
    }
  );
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/**
 * Main dispatcher for all /api/pro/* requests.
 */
export async function handleProStudioRoutes(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const cors = getCorsHeaders(request);

  // 0. Preflight OPTIONS check — immediately reply with 204 & CORS
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  // Request-scoped response helpers guaranteed to attach CORS headers
  const jsonResponse = (data, status = 200, extraHeaders = {}) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, private",
        ...cors,
        ...extraHeaders,
      },
    });
  };

  const errorResponse = (err, defaultStatus = 400) => {
    const status = err?.status || defaultStatus;
    const code = err?.code || "REQUEST_FAILED";
    return new Response(
      JSON.stringify({
        error: err?.message || "An unexpected error occurred",
        code,
        details: err?.details || undefined,
      }),
      {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, private",
          ...cors,
        },
      }
    );
  };

  // Ensure D1 Pro Platform tables exist before running any queries
  try {
    if (proService.ensureProTables) {
      await proService.ensureProTables(env);
    }
  } catch (tableErr) {
    console.warn("[handleProStudioRoutes] ensureProTables:", tableErr?.message);
  }

  // 1. Authoritative subscription gate (Strict 403 PRO_REQUIRED if not active Pro)
  let proContext;
  try {
    proContext = await requireProAccess(request, env);
  } catch (authErr) {
    if (authErr instanceof ProAccessError) {
      return authErr.toResponse(request);
    }
    return fail(authErr, 403);
  }

  const { tenantId, user, subscription } = proContext;

  try {
    // -------------------------------------------------------------------------
    // OVERVIEW & QUOTAS
    // -------------------------------------------------------------------------
    if (path === "/api/pro/overview" && method === "GET") {
      const quotas = await proService.getSiteQuotas(tenantId, env);
      const deployment = await proService.getPublishedDeployment(tenantId, env);
      return jsonResponse({
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          trial_ends_at: subscription.trial_ends_at,
          current_period_end: subscription.current_period_end,
        },
        quotas,
        deployment: deployment ? {
          id: deployment.id,
          version: deployment.version,
          status: deployment.status,
          published_at: deployment.created_at,
          published_by: deployment.deployed_by,
        } : null,
      });
    }

    if (path === "/api/pro/quotas" && method === "GET") {
      const quotas = await proService.getSiteQuotas(tenantId, env);
      return jsonResponse(quotas);
    }

    // -------------------------------------------------------------------------
    // PAGES CRUD
    // -------------------------------------------------------------------------
    if (path === "/api/pro/pages") {
      if (method === "GET") {
        const pages = await proService.listPages(tenantId, env);
        return jsonResponse(pages);
      }
      if (method === "POST") {
        const body = await readBody(request);
        const page = await proService.createPage(tenantId, body, env);
        return jsonResponse(page, 201);
      }
    }

    if (path === "/api/pro/pages/validate" && method === "POST") {
      const body = await readBody(request);
      const val = proService.validatePageDocument(body.document || body);
      return jsonResponse(val);
    }

    if (path === "/api/pro/pages/parse-code" && method === "POST") {
      const body = await readBody(request);
      const code = body.code || "";
      const language = body.language || "jsx";
      const title = body.title || "Imported Page";
      const doc = language === 'html'
        ? proService.parseHtmlToDocument(code, title)
        : proService.parseReactJsxToDocument(code, title);
      return jsonResponse(doc);
    }

    if (path === "/api/pro/pages/template" && method === "POST") {
      const body = await readBody(request);
      const templateKey = body.template || body.templateKey || "studio";
      const pageSlug = body.slug || body.pageSlug || "home";
      const doc = proService.convertTemplatePageToDocument(templateKey, pageSlug);
      return jsonResponse(doc);
    }

    if (path.startsWith("/api/pro/pages/")) {
      const pageId = decodeURIComponent(path.slice("/api/pro/pages/".length));

      if (pageId.endsWith("/duplicate") && method === "POST") {
        const realId = pageId.replace("/duplicate", "");
        const dup = await proService.duplicatePage(tenantId, realId, env);
        return jsonResponse(dup, 201);
      }

      if (pageId.endsWith("/set-homepage") && method === "POST") {
        const realId = pageId.replace("/set-homepage", "");
        const res = await proService.setHomepage(tenantId, realId, env);
        return jsonResponse(res);
      }

      if (method === "GET") {
        const page = await proService.getPage(tenantId, pageId, env);
        if (!page) return errorResponse(new Error("Page not found"), 404);
        return jsonResponse(page);
      }

      if (method === "PUT") {
        const body = await readBody(request);
        const updated = await proService.updatePage(tenantId, pageId, body, env);
        return jsonResponse(updated);
      }

      if (method === "DELETE") {
        const res = await proService.deletePage(tenantId, pageId, env);
        return jsonResponse(res);
      }
    }

    // -------------------------------------------------------------------------
    // ROUTES CRUD
    // -------------------------------------------------------------------------
    if (path === "/api/pro/routes") {
      if (method === "GET") {
        const routes = await proService.listRoutes(tenantId, env);
        return jsonResponse(routes);
      }
      if (method === "POST") {
        const body = await readBody(request);
        const route = await proService.createRoute(tenantId, body, env);
        return jsonResponse(route, 201);
      }
    }

    if (path.startsWith("/api/pro/routes/")) {
      const routeId = decodeURIComponent(path.slice("/api/pro/routes/".length));

      if (method === "PUT") {
        const body = await readBody(request);
        const updated = await proService.updateRoute(tenantId, routeId, body, env);
        return jsonResponse(updated);
      }

      if (method === "DELETE") {
        const res = await proService.deleteRoute(tenantId, routeId, env);
        return jsonResponse(res);
      }
    }

    // -------------------------------------------------------------------------
    // FUNCTIONS CRUD & TEST EXECUTION
    // -------------------------------------------------------------------------
    if (path === "/api/pro/functions") {
      if (method === "GET") {
        const functions = await proService.listFunctions(tenantId, env);
        return jsonResponse(functions);
      }
      if (method === "POST") {
        const body = await readBody(request);
        const created = await proService.createFunction(tenantId, body, env);
        return jsonResponse(created, 201);
      }
    }

    if (path === "/api/pro/functions/test" && method === "POST") {
      const body = await readBody(request);
      const testResult = await proService.executeFunction(
        tenantId,
        { code: body.code, capabilities: body.capabilities },
        body.args || {},
        { user, role: 'merchant' },
        env
      );
      return jsonResponse(testResult);
    }

    if (path.startsWith("/api/pro/functions/")) {
      const funcId = decodeURIComponent(path.slice("/api/pro/functions/".length));

      if (funcId.endsWith("/execute") && method === "POST") {
        const realId = funcId.replace("/execute", "");
        const body = await readBody(request);
        const execResult = await proService.executeFunction(
          tenantId,
          realId,
          body.args || {},
          { user, role: 'merchant' },
          env
        );
        return jsonResponse(execResult);
      }

      if (method === "GET") {
        const fn = await proService.getFunction(tenantId, funcId, env);
        if (!fn) return errorResponse(new Error("Function not found"), 404);
        return jsonResponse(fn);
      }

      if (method === "PUT") {
        const body = await readBody(request);
        const updated = await proService.updateFunction(tenantId, funcId, body, env);
        return jsonResponse(updated);
      }

      if (method === "DELETE") {
        const res = await proService.deleteFunction(tenantId, funcId, env);
        return jsonResponse(res);
      }
    }

    // -------------------------------------------------------------------------
    // TEMPLATES
    // -------------------------------------------------------------------------
    if (path === "/api/pro/templates" && method === "GET") {
      const list = Object.values(PRO_TEMPLATES).map(t => ({
        id: t.id,
        name: t.name,
        tagline: t.tagline,
        category: t.category,
        description: t.description,
        pages_count: t.pages.length,
        routes_count: t.routes.length,
        functions_count: t.functions.length,
      }));
      return jsonResponse(list);
    }

    if (path === "/api/pro/templates/apply" && method === "POST") {
      const body = await readBody(request);
      const res = await installProTemplate(tenantId, body.template_id, env);
      return jsonResponse(res);
    }

    // -------------------------------------------------------------------------
    // STORAGE KV INSPECTOR (ferasetu.storage)
    // -------------------------------------------------------------------------
    if (path === "/api/pro/storage") {
      if (method === "GET") {
        const res = await env.DB.prepare(
          "SELECT id, key, value, bytes_size, created_at, updated_at FROM site_storage WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 100"
        ).bind(tenantId).all();
        return jsonResponse(res.results || []);
      }
      if (method === "POST") {
        const body = await readBody(request);
        const sdk = createFeraSDK({ tenantId, env });
        await sdk.storage.set(body.key, body.value);
        return jsonResponse({ success: true, key: body.key });
      }
    }

    if (path.startsWith("/api/pro/storage/")) {
      const key = decodeURIComponent(path.slice("/api/pro/storage/".length));
      if (method === "DELETE") {
        const sdk = createFeraSDK({ tenantId, env });
        const deleted = await sdk.storage.delete(key);
        return jsonResponse({ success: deleted });
      }
    }

    // -------------------------------------------------------------------------
    // VALIDATION & ATOMIC PUBLISHING
    // -------------------------------------------------------------------------
    if (path === "/api/pro/validate" && method === "GET") {
      const validation = await proService.validateSite(tenantId, env);
      return jsonResponse(validation);
    }

    if (path === "/api/pro/publish" && method === "POST") {
      const published = await proService.publishSite(tenantId, user.email || user.name || "merchant", env);
      return jsonResponse(published);
    }

    if (path === "/api/pro/deployments" && method === "GET") {
      const res = await env.DB.prepare(
        "SELECT id, version, status, deployed_by, created_at FROM site_deployments WHERE tenant_id = ? ORDER BY version DESC LIMIT 20"
      ).bind(tenantId).all();
      return jsonResponse(res.results || []);
    }

    // -------------------------------------------------------------------------
    // AI BUILDER ACTIONS
    // -------------------------------------------------------------------------
    if (path === "/api/pro/ai/action" && method === "POST") {
      const body = await readBody(request);
      const actionRes = await proService.executeAIAction(tenantId, body.action, body.params, env);
      return jsonResponse({ success: true, result: actionRes });
    }

    // -------------------------------------------------------------------------
    // EXECUTION LOGS
    // -------------------------------------------------------------------------
    if (path === "/api/pro/logs" && method === "GET") {
      const logs = await proService.listExecutionLogs(tenantId, 50, env);
      return jsonResponse(logs);
    }

    // -------------------------------------------------------------------------
    // PROJECT IMPORT & DETERMINISTIC ANALYSIS
    // -------------------------------------------------------------------------
    if (path === "/api/pro/import/analyze" && method === "POST") {
      const contentType = request.headers?.get("Content-Type") || "";
      let payload;
      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) throw new Error("No file uploaded in form data.");
        payload = await file.arrayBuffer();
      } else if (contentType.includes("application/zip") || contentType.includes("application/octet-stream")) {
        payload = await request.arrayBuffer();
      } else {
        payload = await readBody(request);
      }
      const result = await proService.analyzeUploadedProject(tenantId, payload, {}, env);
      return jsonResponse(result);
    }

    if (path === "/api/pro/import/execute" && method === "POST") {
      const contentType = request.headers?.get("Content-Type") || "";
      let payload;
      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file");
        const projectName = formData.get("projectName") || formData.get("project_name") || "Imported Project";
        const selectionRaw = formData.get("selection");
        const selection = selectionRaw ? JSON.parse(selectionRaw) : {};
        const rawZipBuffer = file ? await file.arrayBuffer() : null;
        payload = { projectName, rawZipBuffer, selection };
      } else {
        payload = await readBody(request);
      }
      const result = await proService.executeProjectImport(tenantId, payload, env);
      return jsonResponse(result, 201);
    }

    if (path === "/api/pro/import/reimport-diff" && method === "POST") {
      const contentType = request.headers?.get("Content-Type") || "";
      let projectId;
      let newFilesPayload;
      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        projectId = formData.get("projectId") || formData.get("project_id");
        const file = formData.get("file");
        newFilesPayload = file ? await file.arrayBuffer() : null;
      } else {
        const body = await readBody(request);
        projectId = body.projectId || body.project_id;
        newFilesPayload = body;
      }
      if (!projectId) throw new Error("Missing projectId parameter.");
      const result = await proService.computeReimportDiffForTenant(tenantId, projectId, newFilesPayload, env);
      return jsonResponse(result);
    }

    if (path === "/api/pro/import/reimport-apply" && method === "POST") {
      const body = await readBody(request);
      const result = await proService.applyReimportUpdates(tenantId, body, env);
      return jsonResponse(result);
    }

    if (path === "/api/pro/import/projects" && method === "GET") {
      try {
        const projects = await proService.listImportedProjects(tenantId, env);
        return jsonResponse(projects);
      } catch (err) {
        console.warn("[proStudioRoutes] listImportedProjects fallback:", err?.message);
        return jsonResponse([]);
      }
    }

    if (path.startsWith("/api/pro/import/projects/")) {
      const projectId = decodeURIComponent(path.slice("/api/pro/import/projects/".length));
      if (method === "GET") {
        try {
          const project = await proService.getImportedProject(tenantId, projectId, env);
          if (!project) return errorResponse(new Error("Project not found"), 404);
          return jsonResponse(project);
        } catch (err) {
          return errorResponse(new Error("Project not found"), 404);
        }
      }
    }

    if (path === "/api/pro/dependencies" && method === "GET") {
      const type = url.searchParams.get("type") || "page";
      const id = url.searchParams.get("id") || "";
      const deps = await proService.checkResourceDependencies(tenantId, type, id, env);
      return jsonResponse(deps);
    }

    // -------------------------------------------------------------------------
    // DATA & STORAGE (External Data Sources, Snapshots, Restores, Exports)
    // -------------------------------------------------------------------------
    if (path === "/api/pro/data-sources/test" && method === "POST") {
      const body = await readBody(request);
      const res = await dataStorageService.testDataSourceConnection(tenantId, body, env);
      return jsonResponse(res);
    }

    if (path === "/api/pro/data-sources") {
      if (method === "GET") {
        const sources = await dataStorageService.listDataSources(tenantId, env);
        return jsonResponse(sources);
      }
      if (method === "POST") {
        const body = await readBody(request);
        const created = await dataStorageService.createDataSource(tenantId, body, env);
        return jsonResponse(created, 201);
      }
    }

    if (path.startsWith("/api/pro/data-sources/")) {
      const sourceId = decodeURIComponent(path.slice("/api/pro/data-sources/".length));
      if (sourceId.endsWith("/inspect") && method === "POST") {
        const realId = sourceId.replace("/inspect", "");
        const inspection = await dataStorageService.inspectDataSource(tenantId, realId, env);
        return jsonResponse(inspection);
      }
      if (method === "GET") {
        const source = await dataStorageService.getDataSource(tenantId, sourceId, env);
        if (!source) return errorResponse(new Error("Data source not found"), 404);
        return jsonResponse(source);
      }
      if (method === "DELETE") {
        const deleted = await dataStorageService.deleteDataSource(tenantId, sourceId, env);
        return jsonResponse({ success: deleted });
      }
    }

    if (path === "/api/pro/backups") {
      if (method === "GET") {
        const urlObj = new URL(request.url);
        const dataSourceId = urlObj.searchParams.get("dataSourceId");
        const list = await dataStorageService.listBackups(tenantId, { dataSourceId }, env);
        return jsonResponse(list);
      }
      if (method === "POST") {
        const body = await readBody(request);
        const result = await dataStorageService.triggerBackup(tenantId, body, env);
        return jsonResponse(result, 202);
      }
    }

    if (path.startsWith("/api/pro/backups/")) {
      const snapId = decodeURIComponent(path.slice("/api/pro/backups/".length));
      if (snapId.endsWith("/items") && method === "GET") {
        const realId = snapId.replace("/items", "");
        const items = await dataStorageService.getBackupItems(tenantId, realId, env);
        return jsonResponse(items);
      }
      if (method === "GET") {
        const snap = await dataStorageService.getBackup(tenantId, snapId, env);
        if (!snap) return errorResponse(new Error("Snapshot not found"), 404);
        return jsonResponse(snap);
      }
    }

    if (path.startsWith("/api/pro/operations/")) {
      const opId = decodeURIComponent(path.slice("/api/pro/operations/".length));
      if (method === "GET") {
        const op = await dataStorageService.getBackupOperation(tenantId, opId, env);
        if (!op) return errorResponse(new Error("Operation not found"), 404);
        return jsonResponse(op);
      }
    }

    if (path === "/api/pro/restores/preview" && method === "POST") {
      const body = await readBody(request);
      const preview = await dataStorageService.previewRestore(tenantId, body, env);
      return jsonResponse(preview);
    }

    if (path === "/api/pro/restores") {
      if (method === "POST") {
        const body = await readBody(request);
        const result = await dataStorageService.executeRestore(tenantId, body, env);
        return jsonResponse(result, 202);
      }
    }

    if (path.startsWith("/api/pro/restores/")) {
      const opId = decodeURIComponent(path.slice("/api/pro/restores/".length));
      if (method === "GET") {
        const op = await env.DB.prepare("SELECT * FROM site_restore_operations WHERE tenant_id = ? AND id = ?")
          .bind(tenantId, opId).first();
        if (!op) return errorResponse(new Error("Restore operation not found"), 404);
        return jsonResponse(op);
      }
    }

    if (path === "/api/pro/exports" && method === "POST") {
      const body = await readBody(request);
      const result = await dataStorageService.createExport(tenantId, body, env);
      return jsonResponse(result, 202);
    }

    if (path.startsWith("/api/pro/exports/")) {
      const exportId = decodeURIComponent(path.slice("/api/pro/exports/".length));
      if (method === "GET") {
        const exp = await dataStorageService.getExport(tenantId, exportId, env);
        if (!exp) return errorResponse(new Error("Export not found"), 404);
        return jsonResponse(exp);
      }
    }

    if (path === "/api/pro/retention/cleanup" && method === "POST") {
      const cleanupRes = await dataStorageService.cleanupExpiredSnapshots(tenantId, env);
      return jsonResponse(cleanupRes);
    }

    if (path === "/api/pro/schedules/run" && method === "POST") {
      const schedRes = await dataStorageService.runScheduledBackups(env);
      return jsonResponse(schedRes);
    }

    return errorResponse(new Error(`Endpoint not found: ${method} ${path}`), 404);
  } catch (err) {
    console.error("[handleProStudioRoutes error]", err?.message || err);
    return errorResponse(err, err?.status || 500);
  }
}

/**
 * Public Multi-Page Storefront Resolver (No merchant auth required; customer session evaluated)
 */
export async function handleProStorefrontResolution(tenantId, pathname, request, env, customerSession = null) {
  if (!tenantId || !env?.DB) return null;

  // 1. Fetch active published deployment
  const deployment = await proService.getPublishedDeployment(tenantId, env);
  if (!deployment || !deployment.snapshot) return null;

  const snapshot = deployment.snapshot;
  const routes = snapshot.routes || [];
  const pages = snapshot.pages || [];
  const functions = snapshot.functions || [];
  const navigation = snapshot.navigation || [];

  const cleanPath = (pathname || "/").trim();

  // 2. Resolve route (static first, then dynamic parameter extraction)
  let matchedRoute = null;
  let params = {};

  // Check static match
  for (const r of routes) {
    if (r.path_pattern === cleanPath) {
      matchedRoute = r;
      break;
    }
  }

  // Check dynamic match
  if (!matchedRoute) {
    for (const r of routes) {
      if (r.path_pattern.includes(':')) {
        const patternParts = r.path_pattern.split('/');
        const pathParts = cleanPath.split('/');
        if (patternParts.length === pathParts.length) {
          const candidateParams = {};
          let matches = true;
          for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
              candidateParams[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
            } else if (patternParts[i] !== pathParts[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            matchedRoute = r;
            params = candidateParams;
            break;
          }
        }
      }
    }
  }

  if (!matchedRoute) {
    // If root requested and no '/' route, look for homepage
    if (cleanPath === "/") {
      const homepage = pages.find(p => p.is_homepage === 1) || pages[0];
      if (homepage) {
        matchedRoute = { path_pattern: "/", page_id: homepage.id, access_level: "public" };
      }
    }
  }

  if (!matchedRoute) return null;

  const page = pages.find(p => p.id === matchedRoute.page_id);
  if (!page) return null;

  // 3. Protected Route Security Gate (Server-side Enforcement)
  const isAuthRequired = matchedRoute.access_level === 'authenticated' || Boolean(page.auth_required);
  if (isAuthRequired) {
    const isCustomerAuthed = Boolean(customerSession && customerSession.customer && customerSession.customer.id);
    if (!isCustomerAuthed) {
      return {
        is_pro: true,
        protected_blocked: true,
        error: "Customer authentication required",
        code: "CUSTOMER_AUTH_REQUIRED",
        redirect: "/login",
      };
    }
  }

  // 4. Bound Function Execution (Server-side Data Hydration)
  let boundData = null;
  if (matchedRoute.function_binding) {
    const fnDef = functions.find(f => f.name === matchedRoute.function_binding);
    if (fnDef) {
      try {
        const sdk = createFeraSDK({
          tenantId,
          env,
          authContext: { customer: customerSession?.customer, role: customerSession?.customer ? 'customer' : 'guest' },
        });
        const ast = fnDef.definition?.ast || parseFeraFunction(fnDef.definition?.source || "");
        boundData = await executeFeraAST(ast, { params, customer: customerSession?.customer }, sdk, fnDef.capabilities);
      } catch (fErr) {
        console.warn("[handleProStorefrontResolution] bound function error:", fErr?.message);
      }
    }
  }

  return {
    is_pro: true,
    version: deployment.version,
    route: matchedRoute,
    page,
    params,
    bound_data: boundData,
    navigation,
    all_pages: pages.map(p => ({ slug: p.slug, title: p.title, is_homepage: p.is_homepage, type: p.type, auth_required: p.auth_required })),
  };
}

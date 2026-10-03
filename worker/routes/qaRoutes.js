/**
 * FeraSetu QA Control Plane & Automated Bug Finder Worker Routes
 * ==============================================================
 * Production-grade control plane API for managing test runs, streaming progress,
 * ingesting correlated issues, and retrieving failure evidence.
 */

import { B2Client } from "../media/b2Client.js";

// Helper for CORS and JSON response
function getCorsHeaders(request) {
  const origin = request ? request.headers?.get("Origin") : null;
  const baseHeaders = "Content-Type, Authorization, X-Requested-With, Accept, X-Organization-Id, X-Shop-Id, Cache-Control, Pragma";
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": baseHeaders,
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Robots-Tag": "noindex, nofollow",
      ...getCorsHeaders(request),
    },
  });
}

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

/**
 * Ensures QA tables and indexes exist in D1 (idempotent initialization).
 */
export async function ensureQATables(db) {
  if (!db) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS qa_runs (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL DEFAULT 'full',
        status TEXT NOT NULL DEFAULT 'pending',
        environment TEXT NOT NULL DEFAULT 'production',
        target_url TEXT NOT NULL,
        routes_discovered INTEGER NOT NULL DEFAULT 0,
        routes_tested INTEGER NOT NULL DEFAULT 0,
        buttons_tested INTEGER NOT NULL DEFAULT 0,
        links_tested INTEGER NOT NULL DEFAULT 0,
        forms_tested INTEGER NOT NULL DEFAULT 0,
        images_tested INTEGER NOT NULL DEFAULT 0,
        api_calls_observed INTEGER NOT NULL DEFAULT 0,
        console_errors_count INTEGER NOT NULL DEFAULT 0,
        network_failures_count INTEGER NOT NULL DEFAULT 0,
        accessibility_issues_count INTEGER NOT NULL DEFAULT 0,
        performance_warnings_count INTEGER NOT NULL DEFAULT 0,
        p0_count INTEGER NOT NULL DEFAULT 0,
        p1_count INTEGER NOT NULL DEFAULT 0,
        p2_count INTEGER NOT NULL DEFAULT 0,
        p3_count INTEGER NOT NULL DEFAULT 0,
        info_count INTEGER NOT NULL DEFAULT 0,
        current_step TEXT,
        current_route TEXT,
        current_element TEXT,
        progress_percent INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        created_by TEXT NOT NULL DEFAULT 'system',
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS qa_issues (
        id TEXT PRIMARY KEY,
        fingerprint TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        regression_status TEXT NOT NULL DEFAULT 'new',
        is_flaky INTEGER NOT NULL DEFAULT 0,
        occurrences_count INTEGER NOT NULL DEFAULT 1,
        first_seen_run_id TEXT NOT NULL,
        last_seen_run_id TEXT NOT NULL,
        route TEXT NOT NULL,
        component_name TEXT,
        element_selector TEXT,
        element_text TEXT,
        element_role TEXT,
        api_endpoint TEXT,
        http_status INTEGER,
        user_impact TEXT,
        observed_summary TEXT NOT NULL,
        likely_subsystem TEXT,
        likely_cause TEXT,
        suggested_investigation TEXT,
        reproduction_steps TEXT,
        evidence_json TEXT,
        first_detected_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_detected_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS qa_issue_occurrences (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        route TEXT NOT NULL,
        observed_at TEXT NOT NULL DEFAULT (datetime('now')),
        evidence_snapshot TEXT
      );

      CREATE TABLE IF NOT EXISTS qa_route_results (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        route TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PASS',
        http_status INTEGER,
        load_time_ms INTEGER,
        fcp_ms INTEGER,
        lcp_ms INTEGER,
        elements_checked INTEGER NOT NULL DEFAULT 0,
        issues_count INTEGER NOT NULL DEFAULT 0,
        reason_skipped TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS qa_artifacts (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        issue_id TEXT,
        artifact_type TEXT NOT NULL,
        b2_key TEXT,
        storage_type TEXT NOT NULL DEFAULT 'b2',
        inline_content TEXT,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch (err) {
    console.warn("[QA] Table init warning:", err?.message || err);
  }
}

/**
 * Endpoint Safety Classifier
 */
export function classifyEndpointSafety(method, pathname) {
  const p = pathname.toLowerCase();
  const m = method.toUpperCase();

  // Explicitly blocked operations that automated tests MUST NEVER execute
  if (
    p.includes('/refund') ||
    p.includes('/charge') ||
    p.includes('/payment/verify') ||
    p.includes('/payout') ||
    p.includes('/subscription/cancel') ||
    p.includes('/send-platform') ||
    p.includes('/whatsapp/send') ||
    (m === 'DELETE' && !p.includes('/qa/'))
  ) {
    return 'BLOCKED';
  }

  // Safe simulation endpoints
  if (p.includes('/qa/synthetic') || p.includes('/test-mode')) {
    return 'SAFE_SIMULATION';
  }

  // Safe read endpoints
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') {
    return 'SAFE_READ';
  }

  // Test mutation allowlist
  if (p.includes('/qa/') || p.includes('/analytics/events')) {
    return 'TEST_WRITE';
  }

  return 'DESTRUCTIVE';
}

/**
 * Handle QA control plane requests.
 */
export async function handleQARoutes(request, env, path, method, adminEmail) {
  const url = new URL(request.url);
  const db = env.DB;
  await ensureQATables(db);

  // 1. GET /api/admin/qa/status - Overview of system health, active scan, and open issues
  if (path === "/api/admin/qa/status" && method === "GET") {
    // Current or latest run
    const latestRun = await db.prepare(
      "SELECT * FROM qa_runs ORDER BY created_at DESC LIMIT 1"
    ).first();

    const activeRun = await db.prepare(
      "SELECT * FROM qa_runs WHERE status = 'running' ORDER BY created_at DESC LIMIT 1"
    ).first();

    // Counts of open issues by severity
    const counts = await db.prepare(`
      SELECT 
        SUM(CASE WHEN severity = 'P0' AND status = 'open' THEN 1 ELSE 0 END) as open_p0,
        SUM(CASE WHEN severity = 'P1' AND status = 'open' THEN 1 ELSE 0 END) as open_p1,
        SUM(CASE WHEN severity = 'P2' AND status = 'open' THEN 1 ELSE 0 END) as open_p2,
        SUM(CASE WHEN severity = 'P3' AND status = 'open' THEN 1 ELSE 0 END) as open_p3,
        SUM(CASE WHEN severity = 'INFO' AND status = 'open' THEN 1 ELSE 0 END) as open_info,
        SUM(CASE WHEN regression_status = 'new' AND status = 'open' THEN 1 ELSE 0 END) as new_regressions,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_issues,
        SUM(CASE WHEN is_flaky = 1 THEN 1 ELSE 0 END) as flaky_tests,
        COUNT(*) as total_issues
      FROM qa_issues
    `).first();

    // Top recent open issues
    const topIssuesQuery = await db.prepare(
      "SELECT * FROM qa_issues WHERE status = 'open' ORDER BY CASE severity WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 WHEN 'P3' THEN 4 ELSE 5 END, last_detected_at DESC LIMIT 5"
    ).all();

    // Recent 10 runs
    const recentRunsQuery = await db.prepare(
      "SELECT id, mode, status, environment, duration_ms, routes_tested, p0_count, p1_count, p2_count, p3_count, created_at, completed_at FROM qa_runs ORDER BY created_at DESC LIMIT 10"
    ).all();

    return json({
      success: true,
      environment: env.ENVIRONMENT || env.APP_ENV || 'production',
      activeRun: activeRun || null,
      latestRun: latestRun || null,
      summary: {
        openP0: counts?.open_p0 || 0,
        openP1: counts?.open_p1 || 0,
        openP2: counts?.open_p2 || 0,
        openP3: counts?.open_p3 || 0,
        openInfo: counts?.open_info || 0,
        newRegressions: counts?.new_regressions || 0,
        resolvedIssues: counts?.resolved_issues || 0,
        flakyTests: counts?.flaky_tests || 0,
        totalIssues: counts?.total_issues || 0,
      },
      topIssues: topIssuesQuery.results || [],
      recentRuns: recentRunsQuery.results || [],
    }, 200, request);
  }

  // 2. GET /api/admin/qa/runs - Paginated list of test runs
  if (path === "/api/admin/qa/runs" && method === "GET") {
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;
    const mode = url.searchParams.get("mode");
    const status = url.searchParams.get("status");

    let whereClause = "WHERE 1=1";
    const bindings = [];
    if (mode) {
      whereClause += " AND mode = ?";
      bindings.push(mode);
    }
    if (status) {
      whereClause += " AND status = ?";
      bindings.push(status);
    }

    const countQuery = await db.prepare(`SELECT COUNT(*) as total FROM qa_runs ${whereClause}`)
      .bind(...bindings)
      .first();

    const runsQuery = await db.prepare(`
      SELECT * FROM qa_runs 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();

    return json({
      success: true,
      page,
      limit,
      total: countQuery?.total || 0,
      runs: runsQuery.results || [],
    }, 200, request);
  }

  // 3. POST /api/admin/qa/runs - Trigger or queue a new QA run
  if (path === "/api/admin/qa/runs" && method === "POST") {
    const body = await readJsonBody(request);
    const mode = String(body.mode || 'full').toLowerCase();
    const envName = String(body.environment || env.ENVIRONMENT || 'production');
    const targetUrl = String(body.target_url || body.targetUrl || env.PAGES_ORIGIN || 'https://ferasetu.com').trim();
    const selectedScanners = Array.isArray(body.scanners) ? body.scanners : null;
    const routeFilter = body.route_filter || body.routeFilter || null;
    const viewport = body.viewport || { width: 1440, height: 900 };

    // Production Safety Guardrail
    if (envName === 'production' && body.destructive_test) {
      throw new HttpError("Destructive actions are strictly prohibited in the production environment.", 403);
    }

    const now = new Date();
    const timestampStr = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const runId = `qa_${timestampStr}_${randomSuffix}`;

    await db.prepare(`
      INSERT INTO qa_runs (
        id, mode, status, environment, target_url, 
        current_step, progress_percent, started_at, created_by, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      runId,
      mode,
      'running',
      envName,
      targetUrl,
      'Initializing browser executor',
      5,
      now.toISOString(),
      adminEmail || 'admin',
      JSON.stringify({ selectedScanners, routeFilter, viewport }),
      now.toISOString(),
      now.toISOString()
    ).run();

    return json({
      success: true,
      runId,
      status: 'running',
      mode,
      targetUrl,
      message: 'QA Run initialized. Browser runner will execute the configured scan suites.',
    }, 201, request);
  }

  // 4. GET /api/admin/qa/runs/:id - Run details + route results
  const runDetailMatch = path.match(/^\/api\/admin\/qa\/runs\/([a-zA-Z0-9_-]+)$/);
  if (runDetailMatch && method === "GET") {
    const runId = runDetailMatch[1];
    const run = await db.prepare("SELECT * FROM qa_runs WHERE id = ?").bind(runId).first();
    if (!run) {
      throw new HttpError("QA Run not found", 404);
    }

    const routeResults = await db.prepare(
      "SELECT * FROM qa_route_results WHERE run_id = ? ORDER BY created_at ASC"
    ).bind(runId).all();

    const issues = await db.prepare(`
      SELECT i.*, o.route as occurrence_route, o.observed_at 
      FROM qa_issue_occurrences o
      JOIN qa_issues i ON o.issue_id = i.id
      WHERE o.run_id = ?
      ORDER BY CASE i.severity WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 WHEN 'P3' THEN 4 ELSE 5 END
    `).bind(runId).all();

    const artifacts = await db.prepare(
      "SELECT id, artifact_type, b2_key, storage_type, mime_type, size_bytes, created_at FROM qa_artifacts WHERE run_id = ?"
    ).bind(runId).all();

    return json({
      success: true,
      run,
      routeResults: routeResults.results || [],
      issues: issues.results || [],
      artifacts: artifacts.results || [],
    }, 200, request);
  }

  // 5. POST /api/admin/qa/runs/:id/stop - Graceful run termination
  const runStopMatch = path.match(/^\/api\/admin\/qa\/runs\/([a-zA-Z0-9_-]+)\/stop$/);
  if (runStopMatch && method === "POST") {
    const runId = runStopMatch[1];
    const run = await db.prepare("SELECT * FROM qa_runs WHERE id = ?").bind(runId).first();
    if (!run) {
      throw new HttpError("QA Run not found", 404);
    }

    const now = new Date();
    const startTime = new Date(run.started_at).getTime();
    const durationMs = Math.max(0, now.getTime() - startTime);

    await db.prepare(`
      UPDATE qa_runs 
      SET status = 'stopped', current_step = 'STOPPED_BY_ADMIN', completed_at = ?, duration_ms = ?, updated_at = ?
      WHERE id = ?
    `).bind(now.toISOString(), durationMs, now.toISOString(), runId).run();

    return json({
      success: true,
      runId,
      status: 'stopped',
      message: 'Run stopped by administrator.',
    }, 200, request);
  }

  // 6. POST /api/admin/qa/runs/:id/events - Ingest live executor events & progress
  const runEventsMatch = path.match(/^\/api\/admin\/qa\/runs\/([a-zA-Z0-9_-]+)\/events$/);
  if (runEventsMatch && method === "POST") {
    const runId = runEventsMatch[1];
    const body = await readJsonBody(request);

    // Update progress state
    const currentStep = body.current_step || body.currentStep;
    const currentRoute = body.current_route || body.currentRoute;
    const currentElement = body.current_element || body.currentElement;
    const progressPercent = typeof body.progress_percent === 'number' ? body.progress_percent : undefined;
    const updates = [];
    const bindings = [];

    if (currentStep) { updates.push("current_step = ?"); bindings.push(currentStep); }
    if (currentRoute) { updates.push("current_route = ?"); bindings.push(currentRoute); }
    if (currentElement) { updates.push("current_element = ?"); bindings.push(currentElement); }
    if (progressPercent !== undefined) { updates.push("progress_percent = ?"); bindings.push(progressPercent); }

    if (typeof body.routes_tested === 'number') { updates.push("routes_tested = ?"); bindings.push(body.routes_tested); }
    if (typeof body.buttons_tested === 'number') { updates.push("buttons_tested = ?"); bindings.push(body.buttons_tested); }
    if (typeof body.links_tested === 'number') { updates.push("links_tested = ?"); bindings.push(body.links_tested); }
    if (typeof body.forms_tested === 'number') { updates.push("forms_tested = ?"); bindings.push(body.forms_tested); }
    if (typeof body.images_tested === 'number') { updates.push("images_tested = ?"); bindings.push(body.images_tested); }
    if (typeof body.api_calls_observed === 'number') { updates.push("api_calls_observed = ?"); bindings.push(body.api_calls_observed); }
    if (typeof body.console_errors_count === 'number') { updates.push("console_errors_count = ?"); bindings.push(body.console_errors_count); }
    if (typeof body.network_failures_count === 'number') { updates.push("network_failures_count = ?"); bindings.push(body.network_failures_count); }
    if (typeof body.accessibility_issues_count === 'number') { updates.push("accessibility_issues_count = ?"); bindings.push(body.accessibility_issues_count); }
    if (typeof body.performance_warnings_count === 'number') { updates.push("performance_warnings_count = ?"); bindings.push(body.performance_warnings_count); }

    if (typeof body.p0_count === 'number') { updates.push("p0_count = ?"); bindings.push(body.p0_count); }
    if (typeof body.p1_count === 'number') { updates.push("p1_count = ?"); bindings.push(body.p1_count); }
    if (typeof body.p2_count === 'number') { updates.push("p2_count = ?"); bindings.push(body.p2_count); }
    if (typeof body.p3_count === 'number') { updates.push("p3_count = ?"); bindings.push(body.p3_count); }
    if (typeof body.info_count === 'number') { updates.push("info_count = ?"); bindings.push(body.info_count); }

    updates.push("updated_at = ?");
    bindings.push(new Date().toISOString());
    bindings.push(runId);

    if (updates.length > 1) {
      await db.prepare(`UPDATE qa_runs SET ${updates.join(", ")} WHERE id = ?`).bind(...bindings).run();
    }

    // Ingest discovered route result if present
    if (body.route_result) {
      const rr = body.route_result;
      const rrId = `rr_${Math.random().toString(36).substring(2, 10)}`;
      await db.prepare(`
        INSERT INTO qa_route_results (
          id, run_id, route, status, http_status, load_time_ms, fcp_ms, lcp_ms, elements_checked, issues_count, reason_skipped
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rrId, runId, rr.route, rr.status || 'PASS', rr.http_status || 200,
        rr.load_time_ms || null, rr.fcp_ms || null, rr.lcp_ms || null,
        rr.elements_checked || 0, rr.issues_count || 0, rr.reason_skipped || null
      ).run();
    }

    // Ingest discovered issue if present (with deterministic fingerprinting and occurrence merging)
    if (body.issue) {
      const issue = body.issue;
      const fingerprint = issue.fingerprint || `${issue.category}_${issue.route}_${issue.title}`.replace(/[^a-zA-Z0-9_]/g, '_');
      const nowIso = new Date().toISOString();

      // Check if existing issue matches fingerprint
      const existing = await db.prepare("SELECT * FROM qa_issues WHERE fingerprint = ?").bind(fingerprint).first();
      let issueId = existing?.id;

      if (existing) {
        // Increment occurrences
        await db.prepare(`
          UPDATE qa_issues SET 
            occurrences_count = occurrences_count + 1,
            last_seen_run_id = ?,
            last_detected_at = ?,
            status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END,
            regression_status = CASE WHEN status = 'resolved' THEN 'returning' ELSE regression_status END,
            evidence_json = COALESCE(?, evidence_json)
          WHERE id = ?
        `).bind(runId, nowIso, issue.evidence ? JSON.stringify(issue.evidence) : null, existing.id).run();
      } else {
        // Create new issue
        issueId = `QA-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10 + Math.random() * 90)}`;
        await db.prepare(`
          INSERT INTO qa_issues (
            id, fingerprint, title, category, severity, status, regression_status,
            occurrences_count, first_seen_run_id, last_seen_run_id, route,
            component_name, element_selector, element_text, element_role,
            api_endpoint, http_status, user_impact, observed_summary,
            likely_subsystem, likely_cause, suggested_investigation,
            reproduction_steps, evidence_json, first_detected_at, last_detected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          issueId,
          fingerprint,
          issue.title,
          issue.category,
          issue.severity || 'P2',
          'open',
          'new',
          1,
          runId,
          runId,
          issue.route,
          issue.component_name || null,
          issue.element_selector || null,
          issue.element_text || null,
          issue.element_role || null,
          issue.api_endpoint || null,
          issue.http_status || null,
          issue.user_impact || null,
          issue.observed_summary || issue.title,
          issue.likely_subsystem || null,
          issue.likely_cause || null,
          issue.suggested_investigation || null,
          issue.reproduction_steps ? JSON.stringify(issue.reproduction_steps) : null,
          issue.evidence ? JSON.stringify(issue.evidence) : null,
          nowIso,
          nowIso
        ).run();
      }

      // Record occurrence
      const occId = `occ_${Math.random().toString(36).substring(2, 12)}`;
      await db.prepare(`
        INSERT INTO qa_issue_occurrences (id, issue_id, run_id, route, observed_at, evidence_snapshot)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(occId, issueId, runId, issue.route, nowIso, issue.evidence ? JSON.stringify(issue.evidence) : null).run();
    }

    return json({ success: true, runId }, 200, request);
  }

  // 7. POST /api/admin/qa/runs/:id/finish - Mark run finished with final stats
  const runFinishMatch = path.match(/^\/api\/admin\/qa\/runs\/([a-zA-Z0-9_-]+)\/finish$/);
  if (runFinishMatch && method === "POST") {
    const runId = runFinishMatch[1];
    const body = await readJsonBody(request);
    const now = new Date();
    const run = await db.prepare("SELECT * FROM qa_runs WHERE id = ?").bind(runId).first();
    if (!run) {
      throw new HttpError("QA Run not found", 404);
    }

    const startTime = new Date(run.started_at).getTime();
    const durationMs = body.duration_ms || Math.max(0, now.getTime() - startTime);
    const finalStatus = body.status || (body.p0_count > 0 || body.p1_count > 0 ? 'completed' : 'completed');

    await db.prepare(`
      UPDATE qa_runs SET
        status = ?,
        current_step = 'Completed scan',
        progress_percent = 100,
        routes_discovered = COALESCE(?, routes_discovered),
        routes_tested = COALESCE(?, routes_tested),
        buttons_tested = COALESCE(?, buttons_tested),
        links_tested = COALESCE(?, links_tested),
        forms_tested = COALESCE(?, forms_tested),
        images_tested = COALESCE(?, images_tested),
        api_calls_observed = COALESCE(?, api_calls_observed),
        console_errors_count = COALESCE(?, console_errors_count),
        network_failures_count = COALESCE(?, network_failures_count),
        accessibility_issues_count = COALESCE(?, accessibility_issues_count),
        performance_warnings_count = COALESCE(?, performance_warnings_count),
        p0_count = COALESCE(?, p0_count),
        p1_count = COALESCE(?, p1_count),
        p2_count = COALESCE(?, p2_count),
        p3_count = COALESCE(?, p3_count),
        info_count = COALESCE(?, info_count),
        duration_ms = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      finalStatus,
      body.routes_discovered,
      body.routes_tested,
      body.buttons_tested,
      body.links_tested,
      body.forms_tested,
      body.images_tested,
      body.api_calls_observed,
      body.console_errors_count,
      body.network_failures_count,
      body.accessibility_issues_count,
      body.performance_warnings_count,
      body.p0_count,
      body.p1_count,
      body.p2_count,
      body.p3_count,
      body.info_count,
      durationMs,
      now.toISOString(),
      now.toISOString(),
      runId
    ).run();

    return json({ success: true, runId, status: finalStatus, durationMs }, 200, request);
  }

  // 8. GET /api/admin/qa/issues - List issues with search and filtering
  if (path === "/api/admin/qa/issues" && method === "GET") {
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const offset = (page - 1) * limit;
    const severity = url.searchParams.get("severity");
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const route = url.searchParams.get("route");
    const search = url.searchParams.get("q") || url.searchParams.get("search");

    let whereClause = "WHERE 1=1";
    const bindings = [];

    if (severity && severity !== 'ALL') {
      whereClause += " AND severity = ?";
      bindings.push(severity);
    }
    if (status && status !== 'ALL') {
      whereClause += " AND status = ?";
      bindings.push(status);
    }
    if (category && category !== 'ALL') {
      whereClause += " AND category = ?";
      bindings.push(category);
    }
    if (route) {
      whereClause += " AND route LIKE ?";
      bindings.push(`%${route}%`);
    }
    if (search) {
      whereClause += " AND (title LIKE ? OR observed_summary LIKE ? OR element_text LIKE ? OR likely_subsystem LIKE ?)";
      const pattern = `%${search}%`;
      bindings.push(pattern, pattern, pattern, pattern);
    }

    const countQuery = await db.prepare(`SELECT COUNT(*) as total FROM qa_issues ${whereClause}`)
      .bind(...bindings)
      .first();

    const issuesQuery = await db.prepare(`
      SELECT * FROM qa_issues 
      ${whereClause} 
      ORDER BY 
        CASE severity WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 WHEN 'P3' THEN 4 ELSE 5 END,
        last_detected_at DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();

    return json({
      success: true,
      page,
      limit,
      total: countQuery?.total || 0,
      issues: issuesQuery.results || [],
    }, 200, request);
  }

  // 9. GET /api/admin/qa/issues/:id - Detailed issue view
  const issueDetailMatch = path.match(/^\/api\/admin\/qa\/issues\/([a-zA-Z0-9_-]+)$/);
  if (issueDetailMatch && method === "GET") {
    const issueId = issueDetailMatch[1];
    const issue = await db.prepare("SELECT * FROM qa_issues WHERE id = ?").bind(issueId).first();
    if (!issue) {
      throw new HttpError("QA Issue not found", 404);
    }

    const occurrences = await db.prepare(
      "SELECT * FROM qa_issue_occurrences WHERE issue_id = ? ORDER BY observed_at DESC LIMIT 50"
    ).bind(issueId).all();

    const artifacts = await db.prepare(
      "SELECT id, artifact_type, b2_key, storage_type, mime_type, size_bytes, created_at FROM qa_artifacts WHERE issue_id = ?"
    ).bind(issueId).all();

    return json({
      success: true,
      issue,
      occurrences: occurrences.results || [],
      artifacts: artifacts.results || [],
    }, 200, request);
  }

  // 10. POST /api/admin/qa/issues/:id/resolve - Mark resolved or change status
  const issueResolveMatch = path.match(/^\/api\/admin\/qa\/issues\/([a-zA-Z0-9_-]+)\/resolve$/);
  if (issueResolveMatch && method === "POST") {
    const issueId = issueResolveMatch[1];
    const body = await readJsonBody(request).catch(() => ({}));
    const newStatus = body.status || 'resolved';

    await db.prepare(`
      UPDATE qa_issues 
      SET status = ?, resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now') ELSE NULL END
      WHERE id = ?
    `).bind(newStatus, newStatus, issueId).run();

    return json({ success: true, issueId, status: newStatus }, 200, request);
  }

  // 11. POST /api/admin/qa/routes/test - Targeted single route test
  if (path === "/api/admin/qa/routes/test" && method === "POST") {
    const body = await readJsonBody(request);
    const targetRoute = body.route || '/';
    const envName = body.environment || env.ENVIRONMENT || 'production';
    const baseUrl = body.target_url || env.PAGES_ORIGIN || 'https://ferasetu.com';

    const now = new Date();
    const runId = `qa_route_${now.toISOString().replace(/[-:T.]/g, '').slice(0, 14)}_${Math.random().toString(36).substring(2, 6)}`;

    await db.prepare(`
      INSERT INTO qa_runs (
        id, mode, status, environment, target_url, current_step, progress_percent, started_at, created_by, metadata, created_at, updated_at
      ) VALUES (?, 'route', 'running', ?, ?, ?, 10, ?, ?, ?, ?)
    `).bind(
      runId, envName, baseUrl,
      `Testing route ${targetRoute}`,
      now.toISOString(), adminEmail || 'admin',
      JSON.stringify({ targetRoute }),
      now.toISOString(), now.toISOString()
    ).run();

    return json({
      success: true,
      runId,
      targetRoute,
      status: 'running',
      message: `Focused route test initiated for ${targetRoute}`,
    }, 201, request);
  }

  // 12. Synthetic QA Sandbox Endpoints (For safe local/staging verification)
  if (path === "/api/qa/synthetic/broken-image") {
    // Simulates Backblaze B2/CDN 403 Forbidden with standard CDN headers
    return new Response(JSON.stringify({
      code: "AccessDenied",
      message: "Forbidden by Backblaze B2 bucket policy. Invalid HMAC SigV4 signature or shop isolation check failed."
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "X-FeraSetu-Subsystem": "B2 -> CDN Worker",
        "X-FeraSetu-Cache": "MISS",
        ...getCorsHeaders(request)
      }
    });
  }

  if (path === "/api/qa/synthetic/server-error") {
    return new Response(JSON.stringify({
      error: "Internal Server Error in synthetic test endpoint",
      subsystem: "synthetic_fixture",
      code: "SYNTHETIC_500"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(request)
      }
    });
  }

  if (path === "/api/qa/synthetic/delayed-response") {
    const delayMs = Math.min(10000, parseInt(url.searchParams.get("delay") || "3000", 10));
    await new Promise(r => setTimeout(r, delayMs));
    return json({ success: true, delayedMs: delayMs }, 200, request);
  }

  if (path === "/api/qa/synthetic/tenant-leak-check") {
    // Verifies tenant context headers
    const reqShop = request.headers.get("X-Shop-Id") || request.headers.get("X-Organization-Id");
    if (!reqShop || reqShop === 'tenant_b') {
      return json({
        allowed: false,
        leak_detected: false,
        message: "Strict tenant isolation enforced: cross-tenant access blocked."
      }, 403, request);
    }
    return json({
      allowed: true,
      shop_id: reqShop,
      data: [{ id: "item_1", shop_id: reqShop, name: "Tenant A Safe Product" }]
    }, 200, request);
  }

  return json({ error: "QA endpoint not found" }, 404, request);
}

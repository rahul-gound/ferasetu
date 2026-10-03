-- Migration 0017: QA Control Plane & Automated Bug & Error Finder
-- Provides persistence for automated browser runs, correlated issues, route diagnostics, and artifacts.

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

CREATE INDEX IF NOT EXISTS idx_qa_runs_status ON qa_runs(status);
CREATE INDEX IF NOT EXISTS idx_qa_runs_created ON qa_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_qa_issues_fingerprint ON qa_issues(fingerprint);
CREATE INDEX IF NOT EXISTS idx_qa_issues_severity ON qa_issues(severity);
CREATE INDEX IF NOT EXISTS idx_qa_issues_status ON qa_issues(status);
CREATE INDEX IF NOT EXISTS idx_qa_issues_route ON qa_issues(route);
CREATE INDEX IF NOT EXISTS idx_qa_occurrences_run ON qa_issue_occurrences(run_id);
CREATE INDEX IF NOT EXISTS idx_qa_occurrences_issue ON qa_issue_occurrences(issue_id);
CREATE INDEX IF NOT EXISTS idx_qa_route_results_run ON qa_route_results(run_id);
CREATE INDEX IF NOT EXISTS idx_qa_artifacts_run ON qa_artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_qa_artifacts_issue ON qa_artifacts(issue_id);

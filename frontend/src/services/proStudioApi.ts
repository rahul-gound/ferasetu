// FeraSetu Pro — Pro Studio API Client Service
// =============================================================================
// Communicates with /api/pro/* endpoints.
// Authoritative subscription validation is enforced server-side.
// =============================================================================

import api from './api';

export interface ProSubscriptionInfo {
  plan: string;
  status: string;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
}

export interface ProQuotas {
  limits: {
    max_pages: number;
    max_routes: number;
    max_functions: number;
    max_function_invocations: number;
    max_storage_bytes: number;
    max_published_versions: number;
    max_ai_actions: number;
  };
  usage: {
    pages_count: number;
    routes_count: number;
    functions_count: number;
    storage_bytes: number;
    function_invocations: number;
    ai_actions: number;
    resets_at: string;
  };
}

export interface ProPage {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  type: 'standard' | 'auth_login' | 'auth_signup' | 'auth_account' | 'protected' | 'custom';
  content: any;
  status: 'draft' | 'published';
  parent_id?: string | null;
  is_homepage: number;
  auth_required: number;
  order_index: number;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProRoute {
  id: string;
  tenant_id: string;
  path_pattern: string;
  page_id: string;
  page_title?: string;
  page_slug?: string;
  access_level: 'public' | 'authenticated' | 'merchant_admin';
  function_binding?: string | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface ProFunction {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  definition: { source: string; ast?: any } | string;
  capabilities: string[];
  status: 'draft' | 'published';
  version: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
}

export interface ProTemplate {
  id: string;
  name: string;
  tagline: string;
  category: string;
  description: string;
  pages_count: number;
  routes_count: number;
  functions_count: number;
}

export interface ProValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    pages_count: number;
    routes_count: number;
    functions_count: number;
  };
}

export interface ProDeployment {
  id: string;
  version: number;
  status: string;
  deployed_by: string;
  created_at: string;
}

export const proStudioApi = {
  // Overview & Quotas
  getOverview: async () => {
    const res = await api.get<{
      subscription: ProSubscriptionInfo;
      quotas: ProQuotas;
      deployment: ProDeployment | null;
    }>('/api/pro/overview');
    return res.data;
  },

  getQuotas: async () => {
    const res = await api.get<ProQuotas>('/api/pro/quotas');
    return res.data;
  },

  // Pages
  getPages: async () => {
    const res = await api.get<ProPage[]>('/api/pro/pages');
    return res.data;
  },

  getPage: async (id: string) => {
    const res = await api.get<ProPage>(`/api/pro/pages/${id}`);
    return res.data;
  },

  createPage: async (data: Partial<ProPage>) => {
    const res = await api.post<ProPage>('/api/pro/pages', data);
    return res.data;
  },

  updatePage: async (id: string, data: Partial<ProPage>) => {
    const res = await api.put<ProPage>(`/api/pro/pages/${id}`, data);
    return res.data;
  },

  deletePage: async (id: string) => {
    const res = await api.delete(`/api/pro/pages/${id}`);
    return res.data;
  },

  duplicatePage: async (id: string) => {
    const res = await api.post<ProPage>(`/api/pro/pages/${id}/duplicate`);
    return res.data;
  },

  setHomepage: async (id: string) => {
    const res = await api.post<ProPage>(`/api/pro/pages/${id}/set-homepage`);
    return res.data;
  },

  // Routes
  getRoutes: async () => {
    const res = await api.get<ProRoute[]>('/api/pro/routes');
    return res.data;
  },

  createRoute: async (data: Partial<ProRoute>) => {
    const res = await api.post<ProRoute>('/api/pro/routes', data);
    return res.data;
  },

  updateRoute: async (id: string, data: Partial<ProRoute>) => {
    const res = await api.put<ProRoute>(`/api/pro/routes/${id}`, data);
    return res.data;
  },

  deleteRoute: async (id: string) => {
    const res = await api.delete(`/api/pro/routes/${id}`);
    return res.data;
  },

  // Functions
  getFunctions: async () => {
    const res = await api.get<ProFunction[]>('/api/pro/functions');
    return res.data;
  },

  createFunction: async (data: { name: string; description?: string; code: string; capabilities?: string[] }) => {
    const res = await api.post<ProFunction>('/api/pro/functions', data);
    return res.data;
  },

  updateFunction: async (id: string, data: { name?: string; description?: string; code?: string; capabilities?: string[] }) => {
    const res = await api.put<ProFunction>(`/api/pro/functions/${id}`, data);
    return res.data;
  },

  deleteFunction: async (id: string) => {
    const res = await api.delete(`/api/pro/functions/${id}`);
    return res.data;
  },

  testFunction: async (code: string, capabilities: string[] = [], args: Record<string, any> = {}) => {
    const res = await api.post<{ success: boolean; result: any; duration_ms: number }>('/api/pro/functions/test', {
      code,
      capabilities,
      args,
    });
    return res.data;
  },

  executeFunction: async (id: string, args: Record<string, any> = {}) => {
    const res = await api.post<{ success: boolean; result: any; duration_ms: number }>(`/api/pro/functions/${id}/execute`, { args });
    return res.data;
  },

  // Templates
  getTemplates: async () => {
    const res = await api.get<ProTemplate[]>('/api/pro/templates');
    return res.data;
  },

  applyTemplate: async (templateId: string) => {
    const res = await api.post<{ success: boolean; pages_installed: number; routes_installed: number; functions_installed: number }>(
      '/api/pro/templates/apply',
      { template_id: templateId }
    );
    return res.data;
  },

  // Storage
  getStorage: async () => {
    const res = await api.get<Array<{ key: string; value: string; bytes_size: number; updated_at: string }>>('/api/pro/storage');
    return res.data;
  },

  setStorage: async (key: string, value: any) => {
    const res = await api.post<{ success: boolean; key: string }>('/api/pro/storage', { key, value });
    return res.data;
  },

  deleteStorage: async (key: string) => {
    const res = await api.delete(`/api/pro/storage/${encodeURIComponent(key)}`);
    return res.data;
  },

  // Validation & Publishing
  validateSite: async () => {
    const res = await api.get<ProValidationResult>('/api/pro/validate');
    return res.data;
  },

  publishSite: async () => {
    const res = await api.post<{ success: boolean; deployment_id: string; version: number; published_at: string }>('/api/pro/publish');
    return res.data;
  },

  getDeployments: async () => {
    const res = await api.get<ProDeployment[]>('/api/pro/deployments');
    return res.data;
  },

  // AI Builder
  executeAIAction: async (action: string, params: Record<string, any> = {}) => {
    const res = await api.post<{ success: boolean; result: any }>('/api/pro/ai/action', { action, params });
    return res.data;
  },

  // Logs
  getLogs: async () => {
    const res = await api.get<Array<{ id: string; function_name?: string; event_type: string; details: string; duration_ms: number; status_code: number; created_at: string }>>('/api/pro/logs');
    return res.data;
  },

  // Project Import & Deterministic Analysis
  analyzeProject: async (data: FormData | { files: any[] }) => {
    const res = await api.post<{
      success: boolean;
      report: ProjectConversionReport;
      files_count: number;
    }>('/api/pro/import/analyze', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data;
  },

  executeProjectImport: async (data: FormData | any) => {
    const res = await api.post<{
      success: boolean;
      project_id: string;
      version_id: string;
      version_number: number;
      import_status: string;
      b2_snapshot?: { manifest_key: string; archive_key: string };
      resources: {
        pages_count: number;
        routes_count: number;
        functions_count: number;
        files_count: number;
        mappings_count: number;
      };
    }>('/api/pro/import/execute', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data;
  },

  getReimportDiff: async (projectId: string, data: FormData | any) => {
    const body = data instanceof FormData ? data : { projectId, ...data };
    if (data instanceof FormData && !data.has('projectId')) {
      data.append('projectId', projectId);
    }
    const res = await api.post<{
      success: boolean;
      project_id: string;
      diff: ProjectReimportDiffReport;
    }>('/api/pro/import/reimport-diff', body, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data;
  },

  applyReimportUpdates: async (payload: {
    projectId: string;
    resolutions: Array<{
      source_path: string;
      resource_type: string;
      resource_id?: string;
      resolution: 'keep_external' | 'keep_studio' | 'manual_merge';
      resolved_content?: string;
    }>;
    newFiles?: any[];
  }) => {
    const res = await api.post<{
      success: boolean;
      project_id: string;
      version_id: string;
      version_number: number;
      applied_count: number;
      skipped_count: number;
    }>('/api/pro/import/reimport-apply', payload);
    return res.data;
  },

  getImportedProjects: async () => {
    const res = await api.get<ImportedProject[]>('/api/pro/import/projects');
    return res.data;
  },

  getImportedProject: async (projectId: string) => {
    const res = await api.get<ImportedProject & { versions: any[]; mappings: any[] }>(`/api/pro/import/projects/${encodeURIComponent(projectId)}`);
    return res.data;
  },

  // Data & Storage
  testDataSource: async (payload: {
    type: 'database' | 'storage';
    provider: string;
    connectionStrategy?: string;
    credentials: Record<string, any>;
  }) => {
    const res = await api.post<{
      success: boolean;
      connected: boolean;
      provider: string;
      capabilities: Record<string, any>;
      details: any;
      maskedMetadata: Record<string, any>;
    }>('/api/pro/data-sources/test', payload);
    return res.data;
  },

  createDataSource: async (payload: {
    name: string;
    type: 'database' | 'storage';
    provider: string;
    connectionStrategy?: string;
    credentials: Record<string, any>;
    policy?: {
      schedule?: string;
      retention_days?: number;
      enable_object_lock?: boolean;
      selected_tables?: string[];
      selected_prefixes?: string[];
    };
  }) => {
    const res = await api.post<ProDataSource>('/api/pro/data-sources', payload);
    return res.data;
  },

  getDataSources: async () => {
    const res = await api.get<ProDataSource[]>('/api/pro/data-sources');
    return res.data;
  },

  getDataSource: async (id: string) => {
    const res = await api.get<ProDataSource>(`/api/pro/data-sources/${encodeURIComponent(id)}`);
    return res.data;
  },

  deleteDataSource: async (id: string) => {
    const res = await api.delete<{ success: boolean }>(`/api/pro/data-sources/${encodeURIComponent(id)}`);
    return res.data;
  },

  inspectDataSource: async (id: string) => {
    const res = await api.post<any>(`/api/pro/data-sources/${encodeURIComponent(id)}/inspect`);
    return res.data;
  },

  triggerBackup: async (payload: {
    dataSourceId: string;
    snapshotType?: 'manual' | 'scheduled';
    idempotencyKey?: string;
  }) => {
    const res = await api.post<{
      operation_id: string;
      snapshot_id: string;
      status: string;
      message: string;
    }>('/api/pro/backups', payload);
    return res.data;
  },

  getBackups: async (params?: { dataSourceId?: string }) => {
    const res = await api.get<ProBackupSnapshot[]>('/api/pro/backups', { params });
    return res.data;
  },

  getBackup: async (id: string) => {
    const res = await api.get<ProBackupSnapshot>(`/api/pro/backups/${encodeURIComponent(id)}`);
    return res.data;
  },

  getBackupItems: async (id: string) => {
    const res = await api.get<ProBackupItem[]>(`/api/pro/backups/${encodeURIComponent(id)}/items`);
    return res.data;
  },

  getOperation: async (id: string) => {
    const res = await api.get<ProOperation>(`/api/pro/operations/${encodeURIComponent(id)}`);
    return res.data;
  },

  previewRestore: async (payload: {
    snapshotId: string;
    dataSourceId: string;
    mode?: 'as_new' | 'selected' | 'replace_existing';
  }) => {
    const res = await api.post<ProRestorePreview>('/api/pro/restores/preview', payload);
    return res.data;
  },

  executeRestore: async (payload: {
    snapshotId: string;
    dataSourceId: string;
    mode?: 'as_new' | 'selected' | 'replace_existing';
    explicitConfirmation?: boolean;
    confirmDataSourceName?: string;
    selectedTables?: string[];
  }) => {
    const res = await api.post<{
      operation_id: string;
      status: string;
      message: string;
    }>('/api/pro/restores', payload);
    return res.data;
  },

  createExport: async (payload: {
    snapshotId: string;
    dataSourceId: string;
    format?: 'sql' | 'json' | 'zip';
  }) => {
    const res = await api.post<{
      operation_id: string;
      status: string;
      format: string;
    }>('/api/pro/exports', payload);
    return res.data;
  },

  getExport: async (id: string) => {
    const res = await api.get<any>(`/api/pro/exports/${encodeURIComponent(id)}`);
    return res.data;
  },

  runRetentionCleanup: async () => {
    const res = await api.post<{ deletedCount: number; lockedCount: number }>('/api/pro/retention/cleanup');
    return res.data;
  },
};

// =============================================================================
// Project Import Types
// =============================================================================

export interface ProjectFramework {
  type: 'react_vite' | 'react' | 'express' | 'static_html' | 'generic_ts_js';
  name: string;
  description: string;
}

export interface ProjectCandidatePage {
  title: string;
  slug: string;
  type: string;
  is_homepage: number;
  auth_required: number;
  confidence: 'high' | 'medium' | 'low';
  content: any;
  deterministic_identity: string;
  source_path: string;
  source_hash: string;
  dependencies: string[];
}

export interface ProjectCandidateRoute {
  path_pattern: string;
  page_slug?: string;
  target_component?: string;
  access_level: 'public' | 'authenticated' | 'merchant_admin';
  function_binding?: string | null;
  is_dynamic: boolean;
  confidence: 'high' | 'medium' | 'low';
  deterministic_identity: string;
  source_path: string;
  source_hash: string;
  dependencies: string[];
}

export interface ProjectCandidateFunction {
  name: string;
  description?: string;
  routePath?: string;
  method?: string;
  code: string;
  capabilities: string[];
  confidence: 'high' | 'medium' | 'low';
  requiresReview?: boolean;
  deterministic_identity: string;
  source_path: string;
  source_hash: string;
}

export interface ProjectConversionReport {
  analyzer_version: string;
  project_fingerprint: string;
  framework: ProjectFramework;
  summary: {
    pages_count: number;
    routes_count: number;
    functions_count: number;
    components_count: number;
    assets_count: number;
    env_vars_count: number;
    warnings_count: number;
    unsupported_count: number;
  };
  resources: {
    pages: ProjectCandidatePage[];
    routes: ProjectCandidateRoute[];
    functions: ProjectCandidateFunction[];
    components: Array<{ name: string; title: string; confidence: string; source_path: string }>;
    assets: Array<{ path: string; size: number; hash: string; type: string }>;
  };
  envVars: string[];
  warnings: string[];
  unsupported: Array<{ package: string; reason: string; version?: string }>;
  quotaImpact: {
    pages: { detected: number; limit: number; exceeded: boolean; allowedCount: number };
    routes: { detected: number; limit: number; exceeded: boolean; allowedCount: number };
    functions: { detected: number; limit: number; exceeded: boolean; allowedCount: number };
    hasExceededQuota: boolean;
  };
}

export interface ProjectDiffHunk {
  type: 'unchanged' | 'added' | 'removed';
  line: string;
  oldLineNumber?: number | null;
  newLineNumber?: number | null;
}

export interface ProjectChangeItem {
  source_path: string;
  resource_type: string;
  resource_id?: string;
  change_type: 'unchanged' | 'added' | 'modified' | 'deleted' | 'rename_candidate';
  conflict_status: 'UNCHANGED' | 'EXTERNAL_ONLY_CHANGE' | 'STUDIO_ONLY_CHANGE' | 'SAME_FINAL_STATE' | 'TRUE_CONFLICT' | 'NO_CONFLICT';
  is_conflict: boolean;
  can_auto_apply: boolean;
  summary: string;
  diff: ProjectDiffHunk[];
  base_content?: string;
  studio_content?: string;
  external_content?: string;
  old_source_path?: string;
}

export interface ProjectReimportDiffReport {
  summary: {
    total_resources: number;
    unchanged_count: number;
    added_count: number;
    modified_count: number;
    deleted_count: number;
    conflict_count: number;
    rename_candidate_count: number;
    has_conflicts: boolean;
  };
  changes: ProjectChangeItem[];
}

export interface ImportedProject {
  id: string;
  tenant_id: string;
  project_name: string;
  framework: string;
  current_version_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  version_number?: number;
  import_status?: string;
}

// -----------------------------------------------------------------------------
// Data & Storage TypeScript Types
// -----------------------------------------------------------------------------

export interface ProDataSource {
  id: string;
  tenant_id: string;
  type: 'database' | 'storage';
  provider: string;
  name: string;
  connection_strategy: string;
  status: 'connected' | 'error' | 'unverified';
  capabilities: {
    schemaInspection?: boolean;
    tableBackup?: boolean;
    databaseBackup?: boolean;
    restore?: boolean;
    restoreAsNewSchema?: boolean;
    restoreWithPrefix?: boolean;
    objectLock?: boolean;
    streamingExport?: boolean;
  };
  metadata: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    bucket?: string;
    region?: string;
  };
  policy?: {
    schedule: 'manual' | 'daily' | 'weekly' | 'monthly';
    retention_days: number;
    enable_object_lock: boolean;
    selected_tables?: string[];
    selected_prefixes?: string[];
    last_run_at?: string;
    next_run_at?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ProBackupSnapshot {
  id: string;
  tenant_id: string;
  data_source_id: string;
  snapshot_number: number;
  snapshot_type: 'manual' | 'scheduled' | 'safety';
  status: 'REQUESTED' | 'INSPECTING' | 'SNAPSHOT_PENDING' | 'EXPORTING' | 'SCANNING' | 'UPLOADING' | 'COPYING' | 'VERIFYING' | 'COMMITTED' | 'FAILED' | 'INTEGRITY_FAILED';
  schema_fingerprint?: string;
  content_fingerprint?: string;
  size_bytes: number;
  item_count: number;
  table_count: number;
  b2_manifest_key?: string;
  b2_root_prefix: string;
  manifest_summary?: any;
  object_lock_mode?: string;
  object_lock_until?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface ProBackupItem {
  id: string;
  snapshot_id: string;
  source_path: string;
  item_type: 'table' | 'object' | 'schema';
  size_bytes: number;
  content_hash: string;
  b2_object_key?: string;
  metadata?: any;
  created_at: string;
}

export interface ProOperation {
  id: string;
  tenant_id: string;
  data_source_id: string;
  snapshot_id?: string;
  operation_type: string;
  status: string;
  current_step: string;
  progress_percent: number;
  details?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ProRestoreConflict {
  type: string;
  table?: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  existingRows?: number;
  foreignKey?: string;
  sequence?: string;
}

export interface ProRestorePreview {
  conflictCount: number;
  hasCriticalConflicts: boolean;
  recommendedMode: 'as_new' | 'selected' | 'replace_existing';
  conflicts: ProRestoreConflict[];
  dependencySafe: boolean;
}


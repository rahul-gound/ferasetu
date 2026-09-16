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
};

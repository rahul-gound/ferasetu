/**
 * FeraSetu Platform Sites API Client
 * frontend/src/services/platformSitesApi.ts
 *
 * Dedicated client for internal platform websites management.
 * Communicates with /api/platform-sites/* on Cloudflare Worker backend.
 */

import { getAdminToken } from './adminAuth';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export interface PlatformEntitlement {
  status: 'authorized' | 'forbidden' | 'unauthorized';
  userId: string;
  userEmail: string;
  role: 'superadmin' | 'platform_admin' | 'developer' | 'viewer';
  entitlementPlan: string;
  quotas: {
    max_sites: number;
    max_workers: number;
    max_pages: number;
    custom_domains_enabled: boolean;
    ai_customization_enabled: boolean;
    max_deployments_per_day: number;
  };
  permissions: string[];
}

export interface PlatformSite {
  id: string;
  project_identifier: string;
  name: string;
  description?: string;
  hosting_target: 'workers' | 'pages';
  primary_hostname: string;
  status: 'draft' | 'validating' | 'reserved' | 'provisioning' | 'configuring' | 'deploying' | 'verifying' | 'active' | 'failed' | 'rollback_pending' | 'rolled_back' | 'needs_manual_recovery' | 'archived';
  github_repo?: string;
  github_branch?: string;
  build_command?: string;
  output_dir?: string;
  auto_deploy: number;
  active_deployment_id?: string;
  active_version?: string;
  resource_quotas_json?: string;
  cloudflare_project_ref?: string;
  created_by: string;
  is_production_protected: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformDomain {
  hostname_id: string;
  normalized_hostname: string;
  site_id?: string;
  site_name?: string;
  ownership_type: 'platform' | 'merchant';
  provider: string;
  resource_reference?: string;
  verification_status: 'pending' | 'verified' | 'failed';
  tls_status: 'pending' | 'provisioning' | 'active' | 'failed';
  provisioning_status: 'reserved' | 'assigned' | 'active' | 'detached' | 'failed';
  routing_target?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformDeployment {
  id: string;
  site_id: string;
  site_name?: string;
  primary_hostname?: string;
  hosting_target?: string;
  version: string;
  environment: 'production' | 'staging' | 'development';
  status: 'pending' | 'building' | 'deploying' | 'active' | 'failed' | 'rolled_back';
  source_type: 'github' | 'ai_studio' | 'direct_upload' | 'template' | 'rollback';
  commit_hash?: string;
  commit_message?: string;
  commit_author?: string;
  build_logs?: string;
  rollback_target_id?: string;
  deployed_by: string;
  manifest_json?: string;
  created_at: string;
  finished_at?: string;
}

export interface PlatformSecret {
  id: string;
  site_id: string;
  environment: string;
  key_name: string;
  masked_preview: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformUsage {
  id: string;
  site_id: string;
  date: string;
  requests: number;
  cpu_time_ms: number;
  bandwidth_bytes: number;
  error_count: number;
  deploy_count: number;
  build_failure_count: number;
  source: 'CLOUDFLARE_API' | 'INTERNAL_OBSERVABILITY' | 'ESTIMATED';
  created_at: string;
}

export interface PlatformAuditLog {
  id: string;
  site_id?: string;
  actor_id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details_json?: string;
  ip_address?: string;
  created_at: string;
}

export interface PlatformAiProposal {
  proposalId: string;
  sessionId: string;
  siteId: string;
  summary: string;
  explanation?: string;
  navigation?: Array<{ label: string; href: string; icon?: string }>;
  pages?: Array<{
    path: string;
    title: string;
    metaDescription?: string;
    sections: Array<{ id: string; type: string; props: Record<string, any> }>;
  }>;
  theme?: {
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  codeDiff?: {
    filesModified: string[];
    changeDescription: string;
  };
  status: 'proposed' | 'approved' | 'rejected' | 'applied';
  createdAt: string;
}

export interface CloudflareHealth {
  status: 'healthy' | 'degraded' | 'unconfigured';
  healthy: boolean;
  message: string;
  prerequisites?: string[];
  details?: Record<string, any>;
}

export interface PlatformSitesOverviewData {
  stats: {
    totalSites: number;
    activeSites: number;
    failedDeployments: number;
    domainIssuesCount: number;
    pendingJobs: number;
    quotas: Record<string, any>;
  };
  cloudflareHealth: CloudflareHealth;
  recentDeployments: PlatformDeployment[];
  recentActivity: PlatformAuditLog[];
}

function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    credentials: 'omit',
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text || 'Unknown response format' };
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: Request failed`);
  }

  return data as T;
}

export const platformSitesApi = {
  // Entitlement & Roles
  async getEntitlement(): Promise<PlatformEntitlement> {
    return request<PlatformEntitlement>('/api/platform-sites/entitlement');
  },

  async grantEntitlement(targetUserId: string, targetEmail: string, role: string, quotas?: Record<string, any>) {
    return request<{ success: boolean; message: string }>('/api/platform-sites/entitlement/grant', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, targetEmail, role, quotas }),
    });
  },

  async revokeEntitlement(targetUserId: string, reason?: string) {
    return request<{ success: boolean; message: string }>('/api/platform-sites/entitlement/revoke', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, reason }),
    });
  },

  // Overview
  async getOverview(): Promise<PlatformSitesOverviewData> {
    return request<PlatformSitesOverviewData>('/api/platform-sites/overview');
  },

  // Sites
  async listSites(): Promise<{ sites: PlatformSite[] }> {
    return request<{ sites: PlatformSite[] }>('/api/platform-sites/sites');
  },

  async createSite(payload: {
    name: string;
    project_identifier: string;
    primary_hostname: string;
    hosting_target: 'workers' | 'pages';
    description?: string;
    github_repo?: string;
    github_branch?: string;
    build_command?: string;
    output_dir?: string;
    auto_deploy?: boolean;
  }): Promise<{ success: boolean; siteId: string; jobId: string; status: string; site: PlatformSite }> {
    return request('/api/platform-sites/sites', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getSiteDetails(siteId: string): Promise<{
    site: PlatformSite;
    domains: PlatformDomain[];
    recentDeployments: PlatformDeployment[];
    usage: PlatformUsage[];
  }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}`);
  },

  async updateSite(siteId: string, updates: Partial<PlatformSite>): Promise<{ success: boolean; message: string }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteSite(siteId: string, confirmDelete?: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm_delete: confirmDelete }),
    });
  },

  // Domains
  async listSiteDomains(siteId: string): Promise<{ domains: PlatformDomain[] }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/domains`);
  },

  async attachSiteDomain(siteId: string, hostname: string): Promise<{ success: boolean; domain: PlatformDomain }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/domains`, {
      method: 'POST',
      body: JSON.stringify({ hostname }),
    });
  },

  async detachSiteDomain(siteId: string, domainId: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/domains/${encodeURIComponent(domainId)}`, {
      method: 'DELETE',
    });
  },

  async listAllDomains(): Promise<{ domains: PlatformDomain[] }> {
    return request('/api/platform-sites/domains');
  },

  // Deployments
  async listSiteDeployments(siteId: string): Promise<{ deployments: PlatformDeployment[] }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/deployments`);
  },

  async triggerDeployment(siteId: string, payload: {
    source_type?: string;
    commit_hash?: string;
    commit_message?: string;
    manifest?: Record<string, any>;
  }): Promise<{ success: boolean; deploymentId: string; version: string; status: string }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/deployments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async rollbackDeployment(siteId: string, deploymentId: string): Promise<{ success: boolean; deploymentId: string; rolledBackTo: string }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/deployments/${encodeURIComponent(deploymentId)}/rollback`, {
      method: 'POST',
    });
  },

  async listAllDeployments(): Promise<{ deployments: PlatformDeployment[] }> {
    return request('/api/platform-sites/deployments');
  },

  // Secrets
  async listSiteSecrets(siteId: string): Promise<{ secrets: PlatformSecret[] }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/secrets`);
  },

  async putSiteSecret(siteId: string, payload: {
    key_name: string;
    secret_value: string;
    environment?: string;
  }): Promise<{ success: boolean; key_name: string; masked_preview: string }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/secrets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteSiteSecret(siteId: string, secretId: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/secrets/${encodeURIComponent(secretId)}`, {
      method: 'DELETE',
    });
  },

  // Usage & Logs
  async getSiteUsage(siteId: string): Promise<{ usage: PlatformUsage[] }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/usage`);
  },

  async getSiteLogs(siteId: string): Promise<{ logs: PlatformAuditLog[] }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/logs`);
  },

  // AI Studio
  async generateAiProposal(siteId: string, prompt: string, sessionTitle?: string): Promise<{ success: boolean; proposal: PlatformAiProposal }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/ai/generate`, {
      method: 'POST',
      body: JSON.stringify({ prompt, session_title: sessionTitle }),
    });
  },

  async approveAiProposal(siteId: string, proposalId: string): Promise<{ success: boolean; proposalId: string; deploymentId: string; status: string; appliedAt: string }> {
    return request(`/api/platform-sites/sites/${encodeURIComponent(siteId)}/ai/proposals/${encodeURIComponent(proposalId)}/approve`, {
      method: 'POST',
    });
  },

  // Integrations & Audit
  async getCloudflareIntegration(): Promise<{ cloudflare: CloudflareHealth }> {
    return request('/api/platform-sites/integrations/cloudflare');
  },

  async getActivityAudit(): Promise<{ logs: PlatformAuditLog[] }> {
    return request('/api/platform-sites/activity');
  },
};

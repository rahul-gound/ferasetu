/**
 * FeraSetu Unified Builder Client API
 * Connects the unified builder frontend to Worker backend endpoints.
 */

import api from '../../services/api';
import type { DraftState, ConnectionConfig } from '../types/builderTypes';

export interface VersionSummary {
  id: string;
  version_number: number;
  description: string;
  published_at: string;
  published_by: string;
}

export interface BuilderAsset {
  id: string;
  key: string;
  size: number;
  contentType: string;
  createdAt: string;
  isDraft: boolean;
  visibility: 'private' | 'public';
  url: string;
}

export const builderApi = {
  async getDraft(): Promise<{ draft: DraftState | null; version: number; exists: boolean }> {
    const res = await api.get('/builder/draft');
    return res.data;
  },

  async saveDraft(draft: DraftState): Promise<{ success: boolean; saved_at: string }> {
    const res = await api.post('/builder/draft', { draft });
    return res.data;
  },

  async publishDraft(): Promise<{ success: boolean; published_version: number; published_at: string }> {
    const res = await api.post('/builder/publish', {});
    return res.data;
  },

  async getVersions(): Promise<{ versions: VersionSummary[] }> {
    const res = await api.get('/builder/versions');
    return res.data;
  },

  async rollbackVersion(versionNumber: number): Promise<{ success: boolean; restored_version: number; restored_at: string }> {
    const res = await api.post('/builder/rollback', { version_number: versionNumber });
    return res.data;
  },

  async getConnections(): Promise<{ connections: ConnectionConfig[] }> {
    const res = await api.get('/builder/connections');
    return res.data;
  },

  async saveConnection(conn: Partial<ConnectionConfig> & { secrets?: Record<string, string> }): Promise<{ success: boolean; connection: ConnectionConfig }> {
    const res = await api.post('/builder/connections', conn);
    return res.data;
  },

  async deleteConnection(id: string): Promise<{ success: boolean; deleted_id: string }> {
    const res = await api.delete(`/builder/connections/${id}`);
    return res.data;
  },

  async testProxy(params: {
    connector_id: string;
    endpoint: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    query_params?: Record<string, string>;
  }): Promise<{ status: number; statusText: string; headers: Record<string, string>; data: any }> {
    const res = await api.post('/builder/integrations/proxy', params);
    return res.data;
  },

  async getAssets(visibility: 'all' | 'draft' | 'public' = 'all'): Promise<{ assets: BuilderAsset[] }> {
    const res = await api.get(`/builder/assets?visibility=${visibility}`);
    return res.data;
  },

  async updateAssetVisibility(assetId: string, visibility: 'private' | 'public'): Promise<{ success: boolean }> {
    const res = await api.patch(`/builder/assets/${assetId}`, { visibility });
    return res.data;
  },
};

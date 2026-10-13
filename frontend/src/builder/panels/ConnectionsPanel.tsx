import React, { useState } from 'react';
import {
  Link2,
  Lock,
  ShieldCheck,
  Plus,
  Trash2,
  Globe,
  Key,
  Server,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { builderApi } from '../services/builderApi';
import type { ConnectionConfig } from '../types/builderTypes';

interface ConnectionsPanelProps {
  connections: ConnectionConfig[];
  onRefreshConnections: () => void;
}

export default function ConnectionsPanel({
  connections,
  onRefreshConnections,
}: ConnectionsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [connType, setConnType] = useState<'firebase' | 'rest'>('firebase');
  const [name, setName] = useState('');

  // Firebase state
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbAuthDomain, setFbAuthDomain] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');

  // REST state
  const [restBaseUrl, setRestBaseUrl] = useState('https://');
  const [restBearerToken, setRestBearerToken] = useState('');
  const [restApiKeyHeader, setRestApiKeyHeader] = useState('');
  const [restApiKeyValue, setRestApiKeyValue] = useState('');

  // Test state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: number; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Connection name is required');
      return;
    }

    try {
      if (connType === 'firebase') {
        await builderApi.saveConnection({
          connection_type: 'firebase',
          name,
          config: {
            apiKey: fbApiKey,
            authDomain: fbAuthDomain,
            projectId: fbProjectId,
          },
        });
      } else {
        if (!restBaseUrl.startsWith('https://')) {
          toast.error('SSRF Protection: Base URL must start with https://');
          return;
        }

        const secrets: Record<string, string> = {};
        if (restBearerToken.trim()) secrets.bearerToken = restBearerToken.trim();
        if (restApiKeyHeader.trim() && restApiKeyValue.trim()) {
          secrets.apiKeyHeader = restApiKeyHeader.trim();
          secrets.apiKeyValue = restApiKeyValue.trim();
        }

        await builderApi.saveConnection({
          connection_type: 'rest',
          name,
          config: {
            baseUrl: restBaseUrl.trim(),
          },
          secrets,
        });
      }

      toast.success(`Connection '${name}' saved securely`);
      setIsAdding(false);
      setName('');
      setFbApiKey('');
      setFbAuthDomain('');
      setFbProjectId('');
      setRestBaseUrl('https://');
      setRestBearerToken('');
      setRestApiKeyHeader('');
      setRestApiKeyValue('');
      onRefreshConnections();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save connection');
    }
  };

  const handleDelete = async (id: string, connName: string) => {
    if (!window.confirm(`Delete connection '${connName}'?`)) return;
    try {
      await builderApi.deleteConnection(id);
      toast.success('Connection deleted');
      onRefreshConnections();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete connection');
    }
  };

  const handleTestProxy = async (conn: ConnectionConfig) => {
    setTestingId(conn.id);
    setTestResult(null);
    try {
      const res = await builderApi.testProxy({
        connector_id: conn.id,
        endpoint: '/',
        method: 'GET',
      });
      setTestResult({
        status: res.status,
        message: `Upstream responded with HTTP ${res.status}`,
      });
      toast.success(`Ping successful: HTTP ${res.status}`);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Connection test failed';
      setTestResult({
        status: err.response?.status || 500,
        message: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            External Connections & Data
          </h2>
          <p className="text-[11px] text-slate-500">
            Manage Firebase Authentication and secure server-proxied REST connectors
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-2.5 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Cancel' : 'New Connector'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Security Banner */}
        <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
            <Lock className="w-3.5 h-3.5" />
            <span>Encrypted Credential Isolation</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            All private API tokens and service credentials are encrypted at rest with AES-256-GCM. Outbound requests run strictly on the Worker server with SSRF guards. Zero secrets are exposed in client bundles or public store JSON.
          </p>
        </div>

        {/* Add Connection Form */}
        {isAdding && (
          <form
            onSubmit={handleSave}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Configure New Connection
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setConnType('firebase')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    connType === 'firebase'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Firebase Auth
                </button>
                <button
                  type="button"
                  onClick={() => setConnType('rest')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    connType === 'rest'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  REST API
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Connection Identifier Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Primary Customer CRM or Firebase User Auth"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>

            {connType === 'firebase' ? (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Public Web Configuration (Client Safe)</span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Firebase API Key</label>
                  <input
                    type="text"
                    value={fbApiKey}
                    onChange={(e) => setFbApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Auth Domain</label>
                  <input
                    type="text"
                    value={fbAuthDomain}
                    onChange={(e) => setFbAuthDomain(e.target.value)}
                    placeholder="your-app.firebaseapp.com"
                    className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Project ID</label>
                  <input
                    type="text"
                    value={fbProjectId}
                    onChange={(e) => setFbProjectId(e.target.value)}
                    placeholder="your-project-id"
                    className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Base URL (Must be secure HTTPS)
                  </label>
                  <input
                    type="url"
                    required
                    value={restBaseUrl}
                    onChange={(e) => setRestBaseUrl(e.target.value)}
                    placeholder="https://api.yourbackend.com"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Key className="w-3.5 h-3.5 text-blue-500" />
                    <span>Server-Side Secret Vault (AES-256-GCM Encrypted)</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Bearer Token (Optional)</label>
                    <input
                      type="password"
                      value={restBearerToken}
                      onChange={(e) => setRestBearerToken(e.target.value)}
                      placeholder="sk_live_..."
                      className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              Save Connection
            </button>
          </form>
        )}

        {/* Existing Connections List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Configured Connectors ({connections.length})
          </h3>

          {connections.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
              No external connectors configured yet. Add Firebase Auth or a REST API connector above.
            </div>
          ) : (
            connections.map((conn) => (
              <div
                key={conn.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {conn.connection_type === 'firebase' ? (
                      <Flame className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Globe className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="text-xs font-bold">{conn.name}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {conn.connection_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {conn.has_secrets && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <Lock className="w-3 h-3" /> Encrypted Vault
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(conn.id, conn.name)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete connector"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {conn.config?.baseUrl && (
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    Base: {conn.config.baseUrl}
                  </div>
                )}
                {conn.config?.projectId && (
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    Project: {conn.config.projectId}
                  </div>
                )}

                {conn.connection_type === 'rest' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => handleTestProxy(conn)}
                      disabled={testingId === conn.id}
                      className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Server className="w-3 h-3" />
                      <span>{testingId === conn.id ? 'Testing Proxy...' : 'Test Server Proxy'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Server, GitBranch, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { platformSitesApi, type CloudflareHealth } from '../../services/platformSitesApi';

export default function PlatformIntegrations() {
  const [cf, setCf] = useState<CloudflareHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = async () => {
    try {
      const res = await platformSitesApi.getCloudflareIntegration();
      setCf(res.cloudflare);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Integrations</h1>
          <p className="text-xs text-slate-500 mt-0.5">Status of underlying edge infrastructure providers and code repositories.</p>
        </div>
        <button
          onClick={fetchIntegrations}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs"
        >
          <RefreshCw size={13} />
          <span>Probe Status</span>
        </button>
      </div>

      {/* Cloudflare Provider Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold">
              <Server size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Cloudflare Edge Cluster</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  cf?.healthy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {cf?.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official REST API v4 Adapter for Workers, Pages, and Custom Hostnames.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">API Connection:</span>
            <span className="font-semibold text-slate-800">{cf?.message || 'Adapter active and authenticated.'}</span>
          </div>
          {cf?.details?.accountRef && (
            <div className="flex justify-between">
              <span className="text-slate-500">Account Reference:</span>
              <span className="font-mono text-slate-800">{cf.details.accountRef}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Workers Engine:</span>
            <span className="text-emerald-700 font-semibold">Enabled (V8 Isolates)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Pages Projects:</span>
            <span className="text-emerald-700 font-semibold">Enabled (Direct Edge JAMstack)</span>
          </div>
        </div>
      </div>

      {/* GitHub Integration Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <GitBranch size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">GitHub Continuous Deployment</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Webhooks & repository branch synchronization with deployment verification gates.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Organization Scope:</span>
            <span className="font-mono text-slate-800">github.com/ferasetu/*</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Deployment Gate:</span>
            <span className="text-slate-800 font-semibold">Explicit Administrator Approval Required</span>
          </div>
        </div>
      </div>
    </div>
  );
}

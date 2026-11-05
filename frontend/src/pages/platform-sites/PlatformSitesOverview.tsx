import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Globe, Server, Layers, ShieldAlert, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, Sparkles, Plus, RefreshCw, Cpu, Activity
} from 'lucide-react';
import { platformSitesApi, type PlatformSitesOverviewData } from '../../services/platformSitesApi';

export default function PlatformSitesOverview() {
  const navigate = useNavigate();
  const { openWizard } = useOutletContext<{ openWizard: () => void }>();

  const [data, setData] = useState<PlatformSitesOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await platformSitesApi.getOverview();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load platform overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200/80 rounded-2xl p-5" />
          ))}
        </div>
        <div className="h-64 bg-white border border-slate-200/80 rounded-2xl" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalSites: 0,
    activeSites: 0,
    failedDeployments: 0,
    domainIssuesCount: 0,
    pendingJobs: 0,
    quotas: {},
  };

  const cf = data?.cloudflareHealth;

  return (
    <div className="space-y-8">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Platform Infrastructure Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of FeraSetu platform-owned websites, edge workers, and deployments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openWizard}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0052FF] hover:bg-[#0045d8] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Create Website</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cloudflare Integration Health Banner */}
      {cf && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          cf.healthy
            ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
            : cf.status === 'unconfigured'
            ? 'bg-blue-50/60 border-blue-200/80 text-blue-950'
            : 'bg-amber-50/60 border-amber-200/80 text-amber-950'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              cf.healthy ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-[#0052FF]'
            }`}>
              <Server size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider">Cloudflare Edge Cluster</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  cf.healthy ? 'bg-emerald-200/80 text-emerald-800' : 'bg-blue-200/80 text-blue-800'
                }`}>
                  {cf.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {cf.message}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/platform-sites/integrations')}
            className="flex items-center gap-1 text-xs font-semibold text-[#0052FF] hover:underline self-end sm:self-center"
          >
            <span>View Integration Details</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Websites</span>
            <Globe size={18} className="text-[#0052FF]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.totalSites}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.activeSites} active on edge
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Deployments</span>
            <Layers size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {data?.recentDeployments?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.failedDeployments} failed attempts
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reserved Hostnames</span>
            <Activity size={18} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.totalSites}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            100% collision-safe
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Admin Quota Usage</span>
            <Cpu size={18} className="text-[#FF6B35]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.totalSites} / {stats.quotas?.max_sites || 25}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Platform Sites limit
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={openWizard}
          className="p-5 bg-gradient-to-br from-blue-50/80 to-white border border-blue-200/80 rounded-2xl cursor-pointer hover:shadow-sm hover:border-[#0052FF]/60 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0052FF] text-white flex items-center justify-center mb-3 shadow-xs">
            <Plus size={20} strokeWidth={2.5} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
            <span>New Platform Website</span>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-[#0052FF] transition-colors" />
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Provision a new platform-owned property (Workers or Pages) with reserved subdomain locking.
          </p>
        </div>

        <div
          onClick={() => navigate('/platform-sites/ai-studio')}
          className="p-5 bg-gradient-to-br from-orange-50/80 to-white border border-orange-200/80 rounded-2xl cursor-pointer hover:shadow-sm hover:border-[#FF6B35]/60 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35] text-white flex items-center justify-center mb-3 shadow-xs">
            <Sparkles size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
            <span>AI Website Studio</span>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-[#FF6B35] transition-colors" />
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Customize platform sites with natural language prompts, live preview, and approval gates.
          </p>
        </div>

        <div
          onClick={() => navigate('/platform-sites/deployments')}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl cursor-pointer hover:shadow-sm hover:border-slate-300 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
            <Layers size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
            <span>Deployment History</span>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Audit releases, inspect build outputs, and trigger safe zero-downtime rollbacks.
          </p>
        </div>
      </div>

      {/* Recent Deployments Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Deployments</h3>
            <p className="text-xs text-slate-500">Live production versions across all platform sites.</p>
          </div>
          <button
            onClick={() => navigate('/platform-sites/deployments')}
            className="text-xs font-semibold text-[#0052FF] hover:underline"
          >
            View all
          </button>
        </div>

        {data?.recentDeployments && data.recentDeployments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Hostname</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Deployed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentDeployments.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {dep.site_name || 'Platform Site'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {dep.primary_hostname || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#0052FF]">
                      {dep.version}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        dep.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : dep.status === 'failed'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {dep.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">
                      {dep.source_type}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(dep.created_at).toLocaleDateString()} {new Date(dep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No deployments recorded yet. Create your first platform site to begin.
          </div>
        )}
      </div>
    </div>
  );
}

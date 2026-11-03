import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, RotateCcw, ExternalLink } from 'lucide-react';
import { platformSitesApi, PlatformDeployment } from '../../services/platformSitesApi';
import toast from 'react-hot-toast';

export default function PlatformDeploymentsList() {
  const [deployments, setDeployments] = useState<PlatformDeployment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeployments = async () => {
    try {
      const res = await platformSitesApi.listAllDeployments();
      setDeployments(res.deployments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Global Deployments</h1>
          <p className="text-xs text-slate-500 mt-0.5">Audit log of all production, staging, and AI releases across platform sites.</p>
        </div>
        <button
          onClick={fetchDeployments}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading deployments...</div>
        ) : deployments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Hostname</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Commit / Note</th>
                  <th className="py-3 px-4">Deployed By</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deployments.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {dep.site_name || 'Site'}
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
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {dep.commit_message || dep.commit_hash || 'Release'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {dep.deployed_by}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(dep.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No deployments recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

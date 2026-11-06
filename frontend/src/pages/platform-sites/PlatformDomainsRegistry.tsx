import React, { useState, useEffect } from 'react';
import { GitBranch, Globe, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { platformSitesApi, type PlatformDomain } from '../../services/platformSitesApi';

export default function PlatformDomainsRegistry() {
  const [domains, setDomains] = useState<PlatformDomain[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDomains = async () => {
    try {
      const res = await platformSitesApi.listAllDomains();
      setDomains(res.domains || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Central Platform Hostname Registry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Database-reserved platform subdomains and hostnames protected against merchant collision.
          </p>
        </div>
        <button
          onClick={fetchDomains}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading domains...</div>
        ) : domains.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Hostname</th>
                  <th className="py-3 px-4">Assigned Site</th>
                  <th className="py-3 px-4">Ownership</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">TLS Status</th>
                  <th className="py-3 px-4">Routing Target</th>
                  <th className="py-3 px-4">Reserved Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {domains.map((dom) => (
                  <tr key={dom.hostname_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {dom.normalized_hostname}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {dom.site_name || dom.site_id || 'Platform Core'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-[#0052FF] border border-blue-200">
                        {dom.ownership_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 uppercase font-mono text-[11px]">
                      {dom.provider}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {dom.verification_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {dom.tls_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {dom.routing_target || 'edge-router'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(dom.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No platform hostnames registered yet.
          </div>
        )}
      </div>
    </div>
  );
}

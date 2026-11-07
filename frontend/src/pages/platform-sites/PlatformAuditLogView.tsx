import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Eye } from 'lucide-react';
import { platformSitesApi, type PlatformAuditLog } from '../../services/platformSitesApi';

export default function PlatformAuditLogView() {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<PlatformAuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await platformSitesApi.getActivityAudit();
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activity & Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">Immutable audit record of all privileged platform administration actions.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit records...</div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.actor_email}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {log.resource_type}:{log.resource_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {log.ip_address || 'system'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-[#0052FF] hover:underline font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No audit records found.
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Audit Payload: {selectedLog.action}
            </h3>
            <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-72">
              {JSON.stringify(JSON.parse(selectedLog.details_json || '{}'), null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

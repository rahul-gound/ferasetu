import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, CheckCircle2, RefreshCw, Bug,
  Search, Eye, Globe, Clock, ShieldCheck, Terminal, Trash2, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const rawApi = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawApi.replace(/\/+$/, '');
const ADMIN_API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

export default function AdminErrorLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('admin_token');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = `${ADMIN_API}/admin/error-logs`;
      const res = await axios.get(url, {
        params: statusFilter !== 'all' ? { status: statusFilter } : {},
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data?.logs || []);
    } catch (err: any) {
      try {
        const res = await axios.get(`${API_BASE}/admin/error-logs`, {
          params: statusFilter !== 'all' ? { status: statusFilter } : {},
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(res.data?.logs || []);
      } catch {
        toast.error('Failed to load error tickets');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handleResolve = async (id: string) => {
    try {
      await axios.patch(`${ADMIN_API}/admin/error-logs/${id}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ticket marked as resolved in system');
      if (selectedLog && selectedLog.id === id) {
        setSelectedLog({ ...selectedLog, status: 'resolved' });
      }
      fetchLogs();
    } catch (err) {
      toast.error('Failed to resolve error ticket');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this error log?')) return;
    try {
      await axios.delete(`${ADMIN_API}/admin/error-logs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ticket removed');
      if (selectedLog?.id === id) setSelectedLog(null);
      fetchLogs();
    } catch (err) {
      toast.error('Failed to delete error log');
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.error_message || '').toLowerCase().includes(q) ||
      (log.url || '').toLowerCase().includes(q) ||
      (log.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Bug size={20} />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Client Error Tickets</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live exceptions, chunk fetch failures, and network diagnostic tickets submitted by users.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['all', 'open', 'resolved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by error, URL, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tickets Table / List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Error Message</th>
                  <th className="px-4 py-3">Page URL</th>
                  <th className="px-4 py-3">Reported</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      <ShieldCheck size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                      <p className="text-xs font-semibold text-slate-700">No Error Tickets Found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Platform clients are currently error-free.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-800">
                        #{log.id.slice(0, 12)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {log.status === 'resolved' ? <Check size={10} /> : <AlertTriangle size={10} />}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs sm:max-w-md">
                        <p className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {log.error_message}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400 truncate mt-0.5">
                          {log.error_name || 'Error'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-500 font-mono text-[11px]">
                        {log.url || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        {log.status !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() => handleResolve(log.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Check size={11} /> Mark Resolved
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
                          title="Inspect Details"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg text-xs transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Ticket Inspection Detail Drawer */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                    <Terminal size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 font-mono">#{selectedLog.id}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        selectedLog.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {selectedLog.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Error Message */}
                <div>
                  <div className="font-bold text-slate-700 mb-1">Error Message</div>
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-mono text-xs break-all">
                    {selectedLog.error_message}
                  </div>
                </div>

                {/* URL & User Agent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-1">Origin URL</div>
                    <p className="font-mono text-slate-800 break-all text-[11px]">{selectedLog.url || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-1">User Browser</div>
                    <p className="font-mono text-slate-800 break-all text-[11px]">{selectedLog.user_agent || '—'}</p>
                  </div>
                </div>

                {/* Stack Trace */}
                {selectedLog.stack && (
                  <div>
                    <div className="font-bold text-slate-700 mb-1">Stack Trace</div>
                    <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed">
                      {selectedLog.stack}
                    </pre>
                  </div>
                )}

                {/* Component Stack */}
                {selectedLog.component_stack && (
                  <div>
                    <div className="font-bold text-slate-700 mb-1">React Component Stack</div>
                    <pre className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] overflow-x-auto max-h-36">
                      {selectedLog.component_stack}
                    </pre>
                  </div>
                )}

                {/* Network / Diagnostic Log */}
                {selectedLog.network_log && (
                  <div>
                    <div className="font-bold text-slate-700 mb-1">Network & Performance Snapshot</div>
                    <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[10px] overflow-x-auto max-h-36">
                      {typeof selectedLog.network_log === 'string'
                        ? selectedLog.network_log
                        : JSON.stringify(selectedLog.network_log, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div>
                  {selectedLog.status === 'resolved' && (
                    <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                      <CheckCircle2 size={13} /> Resolved in system
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedLog.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => handleResolve(selectedLog.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Check size={14} /> Mark as Resolved
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

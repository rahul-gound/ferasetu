import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, CheckCircle2, RefreshCw, Bug,
  Search, Eye, Globe, Clock, ShieldCheck, Terminal, Trash2, X, Check, User, Users, Flame
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

  const handleClearAll = async () => {
    const count = logs.length;
    if (count === 0) {
      toast('No logs to delete');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete all ${count} error logs? This cannot be undone.`)) return;
    try {
      await axios.delete(`${ADMIN_API}/admin/error-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Cleared all ${count} error logs`);
      setSelectedLog(null);
      fetchLogs();
    } catch {
      try {
        await axios.delete(`${API_BASE}/admin/error-logs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`Cleared all ${count} error logs`);
        setSelectedLog(null);
        fetchLogs();
      } catch (err) {
        toast.error('Failed to clear error logs');
      }
    }
  };

  const handleBatchDelete = async (logsToDelete: any[]) => {
    if (!confirm(`Are you sure you want to delete these ${logsToDelete.length} error logs?`)) return;
    try {
      await Promise.all(
        logsToDelete.map(l =>
          axios.delete(`${ADMIN_API}/admin/error-logs/${l.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null)
        )
      );
      toast.success(`Deleted ${logsToDelete.length} incident logs`);
      if (selectedLog && logsToDelete.some(l => l.id === selectedLog.id)) {
        setSelectedLog(null);
      }
      fetchLogs();
    } catch {
      toast.error('Failed to delete incident logs');
    }
  };


  const recurringIncidents = useMemo(() => {
    const map = new Map<string, {
      message: string;
      errorName: string;
      logs: any[];
      users: Set<string>;
      firstReported: string;
      lastReported: string;
      urls: Set<string>;
    }>();

    logs.filter(l => l.status !== 'resolved').forEach(log => {
      const key = (log.error_message || 'Unknown error').trim();
      if (!map.has(key)) {
        map.set(key, {
          message: key,
          errorName: log.error_name || 'Error',
          logs: [],
          users: new Set(),
          firstReported: log.created_at,
          lastReported: log.created_at,
          urls: new Set(),
        });
      }
      const entry = map.get(key)!;
      entry.logs.push(log);
      if (log.user_email || log.user_name || log.user_id) {
        entry.users.add(log.user_email || log.user_name || log.user_id);
      }
      if (log.url) entry.urls.add(log.url);
      if (new Date(log.created_at) < new Date(entry.firstReported)) entry.firstReported = log.created_at;
      if (new Date(log.created_at) > new Date(entry.lastReported)) entry.lastReported = log.created_at;
    });

    return Array.from(map.values())
      .filter(g => g.logs.length >= 2 || g.users.size >= 2)
      .sort((a, b) => b.logs.length - a.logs.length);
  }, [logs]);

  const handleBatchResolve = async (ticketIds: string[]) => {
    try {
      await Promise.all(
        ticketIds.map(id =>
          axios.patch(`${ADMIN_API}/admin/error-logs/${id}/resolve`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null)
        )
      );
      toast.success(`Resolved ${ticketIds.length} related error tickets`);
      fetchLogs();
    } catch {
      toast.error('Failed to resolve tickets in batch');
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.error_message || '').toLowerCase().includes(q) ||
      (log.url || '').toLowerCase().includes(q) ||
      (log.id || '').toLowerCase().includes(q) ||
      (log.user_email || '').toLowerCase().includes(q) ||
      (log.user_name || '').toLowerCase().includes(q) ||
      (log.plan_tier || '').toLowerCase().includes(q)
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
              Live exceptions, chunk fetch failures, and network diagnostic tickets submitted with user & subscription specifications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 size={13} /> Delete All Logs
            </button>
          </div>
        </div>


        {/* Top Critical Multi-User Incident Triage (Deduplicated with Red Action Button) */}
        {recurringIncidents.length > 0 && (
          <div className="space-y-3">
            {recurringIncidents.map((incident, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 border-2 border-rose-300 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-sm animate-pulse">
                    <Flame size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                        Critical Incident
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        {incident.logs.length} Total Occurrences
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Users size={11} />
                        {incident.users.size} Affected {incident.users.size === 1 ? 'User' : 'Users'}
                      </span>
                    </div>

                    <p className="font-mono text-xs font-black text-rose-950 mt-1 break-all">
                      {incident.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Globe size={12} className="text-slate-400" />
                        {Array.from(incident.urls)[0] || 'Multiple endpoints'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        Last reported: {new Date(incident.lastReported).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                  <button
                    onClick={() => setSearchQuery(incident.message.slice(0, 30))}
                    className="px-3 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Inspect ({incident.logs.length})
                  </button>
                  <button
                    onClick={() => handleBatchDelete(incident.logs)}
                    className="px-3.5 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Delete All ({incident.logs.length})
                  </button>
                  <button
                    onClick={() => handleBatchResolve(incident.logs.map(l => l.id))}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black tracking-wide shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} strokeWidth={2.5} />
                    Resolve All ({incident.logs.length})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
              placeholder="Search error, URL, user, plan..."
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
                  <th className="px-4 py-3">User & Subscription</th>
                  <th className="px-4 py-3">Error Message</th>
                  <th className="px-4 py-3">Page URL</th>
                  <th className="px-4 py-3">Reported</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
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
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 text-[11px] truncate max-w-[170px]">
                            <User size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate" title={log.user_email || log.user_name || log.user_id || 'Anonymous'}>
                              {log.user_name || log.user_email || (log.user_id ? `User #${log.user_id.slice(0, 8)}` : 'Anonymous')}
                            </span>
                          </div>
                          <div>
                            {log.is_paid || (log.plan_tier && log.plan_tier !== 'free' && log.plan_tier !== 'trial') ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                PAID: {(log.plan_tier || 'PRO').toUpperCase()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase bg-slate-100 text-slate-600">
                                FREE TIER
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs sm:max-w-md">
                        <p className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {log.error_message}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400 truncate mt-0.5">
                          {log.error_name || 'Error'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 max-w-[180px] truncate text-slate-500 font-mono text-[11px]">
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Delete Log"
                        >
                          <Trash2 size={12} /> Delete
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
                {/* User & Subscription Specifications Card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <User size={14} className="text-indigo-600" /> User & Subscription Specifications
                    </span>
                    {selectedLog.is_paid || (selectedLog.plan_tier && selectedLog.plan_tier !== 'free' && selectedLog.plan_tier !== 'trial') ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Paid Merchant
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                        Free Plan
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">User Identity</div>
                      <div className="font-medium text-slate-800 truncate" title={selectedLog.user_name || '—'}>
                        {selectedLog.user_name || (selectedLog.user_id ? `#${selectedLog.user_id.slice(0, 8)}` : 'Anonymous')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Email</div>
                      <div className="font-mono text-slate-800 truncate" title={selectedLog.user_email || '—'}>
                        {selectedLog.user_email || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Exact Plan Tier</div>
                      <div className="font-bold uppercase text-indigo-700">
                        {selectedLog.plan_tier || 'free'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Merchant Store</div>
                      <div className="font-mono text-slate-800 truncate">
                        {selectedLog.store_slug ? `${selectedLog.store_slug}.ferasetu.com` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

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
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedLog.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} /> Delete Log
                  </button>
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

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Activity, ArrowLeft, CheckCircle2, AlertTriangle, AlertOctagon, Info,
  Play, RefreshCw, Clock, Globe, Shield, Terminal, FileText, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const rawApi = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawApi.replace(/\/+$/, '');
const ADMIN_API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

export default function AdminQARunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const [runData, setRunData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRunDetails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/admin/qa/runs/${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setRunData(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load run details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (runId) fetchRunDetails();
  }, [runId]);

  const handleTestRoute = async (route: string) => {
    try {
      toast.loading(`Launching isolated test on ${route}...`, { id: 'test-route' });
      const res = await axios.post(
        `${ADMIN_API}/admin/qa/routes/test`,
        { route, target_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Targeted scan dispatched (#${res.data.runId})`, { id: 'test-route' });
      navigate('/admin/qa');
    } catch {
      toast.error('Failed to dispatch route test', { id: 'test-route' });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw size={28} className="animate-spin text-orange-500" />
        </div>
      </AdminLayout>
    );
  }

  const run = runData?.run;
  const routeResults = runData?.routeResults || [];
  const issues = runData?.issues || [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/qa')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to QA Control Center
          </button>
        </div>

        {/* Run Banner Card */}
        <div className="bg-[#111827] text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                  {run?.mode?.toUpperCase()} SCAN
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Environment: {run?.environment}
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-3">
                Test Run #{run?.id}
                {run?.status === 'completed' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                    COMPLETED
                  </span>
                )}
                {run?.status === 'running' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold animate-pulse">
                    RUNNING
                  </span>
                )}
                {run?.status === 'stopped' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                    STOPPED
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Target: {run?.target_url} • Started: {new Date(run?.started_at).toLocaleString()} • Duration: {run?.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchRunDetails}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
            <div>
              <div className="text-slate-400">Routes Scanned</div>
              <div className="text-lg font-black text-white">{run?.routes_tested} / {run?.routes_discovered}</div>
            </div>
            <div>
              <div className="text-slate-400">Buttons Tested</div>
              <div className="text-lg font-black text-white">{run?.buttons_tested}</div>
            </div>
            <div>
              <div className="text-slate-400">Images Tested</div>
              <div className="text-lg font-black text-white">{run?.images_tested}</div>
            </div>
            <div>
              <div className="text-slate-400">API Calls Observed</div>
              <div className="text-lg font-black text-white">{run?.api_calls_observed}</div>
            </div>
            <div>
              <div className="text-slate-400">Console Errors</div>
              <div className="text-lg font-black text-white">{run?.console_errors_count}</div>
            </div>
            <div>
              <div className="text-slate-400">P0 / P1 Defects</div>
              <div className="text-lg font-black text-rose-400">{(run?.p0_count || 0) + (run?.p1_count || 0)}</div>
            </div>
            <div>
              <div className="text-slate-400">P2 / P3 Warnings</div>
              <div className="text-lg font-black text-amber-400">{(run?.p2_count || 0) + (run?.p3_count || 0)}</div>
            </div>
          </div>
        </div>

        {/* Section 1: Discovered Issues in this run */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">
              Discovered Issues ({issues.length})
            </h2>
          </div>

          {issues.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-medium">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              Zero issues detected during this scan run. All inspected routes and controls satisfied criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue: any) => (
                <div
                  key={issue.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        issue.severity === 'P0' ? 'bg-red-600 text-white' :
                        issue.severity === 'P1' ? 'bg-rose-500 text-white' :
                        issue.severity === 'P2' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="font-bold text-slate-900">{issue.title}</span>
                    </div>
                    <div className="text-slate-500 font-mono">
                      Route: {issue.route} {issue.likely_subsystem && `• Subsystem: ${issue.likely_subsystem}`}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/admin/qa/issues/${issue.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer shrink-0"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Scanned Routes Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">
              Scanned Routes & Coverage ({routeResults.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Route Path</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">HTTP Status</th>
                  <th className="p-4">Load Time</th>
                  <th className="p-4">Elements Audited</th>
                  <th className="p-4">Defects</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {routeResults.map((rr: any) => (
                  <tr key={rr.id || rr.route} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">
                      {rr.route}
                      {rr.reason_skipped && (
                        <div className="text-[11px] font-sans font-normal text-slate-400 mt-0.5">
                          {rr.reason_skipped}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {rr.status === 'PASS' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">PASS</span>}
                      {rr.status === 'FAIL' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">FAIL</span>}
                      {rr.status === 'WARN' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">WARN</span>}
                      {rr.status === 'SKIPPED' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">SKIPPED</span>}
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {rr.http_status || '—'}
                    </td>
                    <td className="p-4 text-slate-600">
                      {rr.load_time_ms ? `${rr.load_time_ms}ms` : '—'}
                    </td>
                    <td className="p-4 text-slate-600">
                      {rr.elements_checked || 0}
                    </td>
                    <td className="p-4">
                      {rr.issues_count > 0 ? (
                        <span className="font-bold text-rose-600">{rr.issues_count} issues</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleTestRoute(rr.route)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer ml-auto"
                      >
                        <Play size={12} /> Test Route
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

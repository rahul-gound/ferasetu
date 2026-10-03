import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Activity, Play, Square, RefreshCw, AlertOctagon, AlertTriangle,
  CheckCircle2, Info, Search, Filter, Shield, Zap, Image as ImageIcon,
  MousePointer, Terminal, Eye, Layers, ChevronRight, CheckSquare, Sparkles, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const rawApi = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawApi.replace(/\/+$/, '');
const ADMIN_API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

export default function AdminQAPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const [statusData, setStatusData] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issues' | 'runs'>('issues');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('open');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Run Selected Modal
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [selectedScanners, setSelectedScanners] = useState({
    ui: true,
    api: true,
    assets: true,
    accessibility: true,
    security: true,
    performance: true,
  });

  // Polling ref for live active test run
  const pollTimerRef = useRef<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/admin/qa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setStatusData(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load QA status:', err?.message || err);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/admin/qa/issues`, {
        params: {
          q: searchQuery || undefined,
          severity: severityFilter !== 'ALL' ? severityFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setIssues(res.data.issues || []);
      }
    } catch (err: any) {
      console.warn('Failed to load issues:', err?.message || err);
    }
  };

  const fetchRuns = async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/admin/qa/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setRuns(res.data.runs || []);
      }
    } catch (err: any) {
      console.warn('Failed to load runs:', err?.message || err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchIssues(), fetchRuns()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [severityFilter, statusFilter, categoryFilter]);

  // Set up live polling when an active run is in progress
  useEffect(() => {
    if (statusData?.activeRun) {
      pollTimerRef.current = setInterval(() => {
        fetchStatus();
        fetchIssues();
      }, 2500);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [statusData?.activeRun?.id, statusData?.activeRun?.status]);

  const handleStartRun = async (mode: string, scanners?: string[]) => {
    try {
      toast.loading(`Launching ${mode.toUpperCase()} QA Scan...`, { id: 'start-run' });
      const res = await axios.post(
        `${ADMIN_API}/admin/qa/runs`,
        {
          mode,
          scanners: scanners || undefined,
          target_url: window.location.origin,
          environment: statusData?.environment || 'production',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        toast.success(`QA Run #${res.data.runId} initiated!`, { id: 'start-run' });
        setIsSelectModalOpen(false);
        await loadAll();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start QA run', { id: 'start-run' });
    }
  };

  const handleStopRun = async (runId: string) => {
    try {
      await axios.post(
        `${ADMIN_API}/admin/qa/runs/${runId}/stop`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('QA run stopped by administrator.');
      await loadAll();
    } catch (err: any) {
      toast.error('Failed to stop run');
    }
  };

  const handleResolveIssue = async (issueId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'resolved' ? 'open' : 'resolved';
    try {
      await axios.post(
        `${ADMIN_API}/admin/qa/issues/${issueId}/resolve`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(newStatus === 'resolved' ? 'Issue marked as resolved' : 'Issue reopened');
      fetchIssues();
      fetchStatus();
    } catch {
      toast.error('Failed to update issue');
    }
  };

  const handleRerunIssue = async (issue: any) => {
    try {
      toast.loading(`Re-running test for ${issue.route}...`, { id: 'rerun-issue' });
      const res = await axios.post(
        `${ADMIN_API}/admin/qa/routes/test`,
        { route: issue.route, target_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Targeted scan dispatched (#${res.data.runId})`, { id: 'rerun-issue' });
      loadAll();
    } catch {
      toast.error('Failed to rerun targeted test', { id: 'rerun-issue' });
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'P0':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white shadow-sm">P0 CRITICAL</span>;
      case 'P1':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-sm">P1 HIGH</span>;
      case 'P2':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">P2 MEDIUM</span>;
      case 'P3':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white">P3 MINOR</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500 text-white">INFO</span>;
    }
  };

  const getRegressionBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">NEW REGRESSION</span>;
      case 'returning':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">RETURNING</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">UNCHANGED</span>;
    }
  };

  const activeRun = statusData?.activeRun;
  const summary = statusData?.summary || {
    openP0: 0,
    openP1: 0,
    openP2: 0,
    openP3: 0,
    newRegressions: 0,
    resolvedIssues: 0,
    flakyTests: 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
        {/* Top Control Header */}
        <div className="bg-[#111827] text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20">
                  <Activity size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    QA & Diagnostics Control Plane
                    <span className="text-xs uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-orange-400 font-bold">
                      {statusData?.environment?.toUpperCase() || 'PRODUCTION'}
                    </span>
                  </h1>
                  <p className="text-sm text-slate-400">
                    Automated browser reliability engineer & edge diagnostic inspection suite
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleStartRun('full')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
              >
                <Play size={16} fill="currentColor" /> Run Full Test
              </button>
              <button
                onClick={() => handleStartRun('smoke')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-all cursor-pointer"
              >
                <Zap size={16} className="text-amber-400" /> Smoke Test
              </button>
              <button
                onClick={() => setIsSelectModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-all cursor-pointer"
              >
                <CheckSquare size={16} className="text-blue-400" /> Run Selected...
              </button>
              <button
                onClick={() => navigate('/admin/qa/sandbox')}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                title="Open synthetic test fixtures sandbox"
              >
                <Sparkles size={14} className="text-purple-400" /> QA Sandbox
              </button>
              <button
                onClick={loadAll}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Quick Scanner Launch Strip */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium mr-2">Quick Scans:</span>
            <button
              onClick={() => handleStartRun('ui', ['ui'])}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              UI Scan
            </button>
            <button
              onClick={() => handleStartRun('api', ['api'])}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              API Scan
            </button>
            <button
              onClick={() => handleStartRun('assets', ['assets'])}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              Assets & Media Scan
            </button>
            <button
              onClick={() => handleStartRun('accessibility', ['accessibility'])}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              Accessibility Scan
            </button>
            <button
              onClick={() => handleStartRun('security', ['security'])}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              Security & Isolation Scan
            </button>
            <button
              onClick={() => handleStartRun('performance', ['performance'])}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              Performance Scan
            </button>
          </div>
        </div>

        {/* Live Running Progress Block (When a scan is active) */}
        {activeRun && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl border border-blue-700/50 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <div className="text-xs font-bold text-blue-300 uppercase tracking-widest">Active Scan in Progress</div>
                  <div className="text-lg font-black tracking-tight">Run #{activeRun.id} ({activeRun.mode?.toUpperCase()})</div>
                </div>
              </div>
              <button
                onClick={() => handleStopRun(activeRun.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs shadow-md transition cursor-pointer self-start sm:self-auto"
              >
                <Square size={14} fill="currentColor" /> Stop Test
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-blue-200 font-medium">
                <span>Phase: {activeRun.current_step || 'Inspecting routes'}</span>
                <span>{activeRun.progress_percent || 15}%</span>
              </div>
              <div className="w-full bg-blue-950/80 rounded-full h-3 overflow-hidden border border-blue-800">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(5, activeRun.progress_percent || 15)}%` }}
                />
              </div>
              {activeRun.current_route && (
                <div className="flex items-center gap-2 text-xs text-blue-300 font-mono mt-1">
                  <span>Current Route:</span>
                  <span className="bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700 text-white">
                    {activeRun.current_route}
                  </span>
                  {activeRun.current_element && (
                    <span className="text-blue-300">({activeRun.current_element})</span>
                  )}
                </div>
              )}
            </div>

            {/* Live Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-blue-800/60 text-xs">
              <div>
                <div className="text-blue-300">Routes Scanned</div>
                <div className="text-base font-black text-white">{activeRun.routes_tested || 0}</div>
              </div>
              <div>
                <div className="text-blue-300">Buttons Tested</div>
                <div className="text-base font-black text-white">{activeRun.buttons_tested || 0}</div>
              </div>
              <div>
                <div className="text-blue-300">Images Tested</div>
                <div className="text-base font-black text-white">{activeRun.images_tested || 0}</div>
              </div>
              <div>
                <div className="text-blue-300">API Calls Observed</div>
                <div className="text-base font-black text-white">{activeRun.api_calls_observed || 0}</div>
              </div>
              <div>
                <div className="text-blue-300">Discovered Failures</div>
                <div className="text-base font-black text-rose-400">
                  {(activeRun.p0_count || 0) + (activeRun.p1_count || 0) + (activeRun.p2_count || 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Health Stat Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Open P0</span>
              <AlertOctagon size={16} className="text-red-600" />
            </div>
            <div className="text-2xl font-black text-red-600">{summary.openP0}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Catastrophic</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Open P1</span>
              <AlertTriangle size={16} className="text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-500">{summary.openP1}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Critical Business</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Open P2</span>
              <AlertTriangle size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">{summary.openP2}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Degraded / Broken</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Open P3</span>
              <Info size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl font-black text-blue-600">{summary.openP3}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Minor / Quality</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Regressions</span>
              <RefreshCw size={16} className="text-orange-500" />
            </div>
            <div className="text-2xl font-black text-orange-600">{summary.newRegressions}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">New Breakages</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Flaky Tests</span>
              <Zap size={16} className="text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-600">{summary.flakyTests}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Intermittent</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Resolved</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600">{summary.resolvedIssues}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Fixed Issues</div>
          </div>
        </div>

        {/* Tab Controls: Discovered Issues vs Historical Runs */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('issues')}
            className={`pb-3 text-sm font-bold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'issues'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Discovered Issues ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('runs')}
            className={`pb-3 text-sm font-bold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'runs'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Test Run History ({runs.length})
          </button>
        </div>

        {/* ISSUES TAB */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search issues, routes, components, error messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchIssues()}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="ALL">Severity: All</option>
                  <option value="P0">P0 (Catastrophic)</option>
                  <option value="P1">P1 (Critical)</option>
                  <option value="P2">P2 (Degraded)</option>
                  <option value="P3">P3 (Minor)</option>
                  <option value="INFO">INFO</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="ALL">Status: All</option>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="ALL">Category: All</option>
                  <option value="API_FAILURE">API Failures</option>
                  <option value="BUTTON_FAILURE">Button Failures</option>
                  <option value="IMAGE_FAILURE">Image & Media</option>
                  <option value="CONSOLE_ERROR">Console Errors</option>
                  <option value="ACCESSIBILITY">Accessibility</option>
                  <option value="SECURITY">Security / Isolation</option>
                  <option value="PERFORMANCE">Performance</option>
                </select>
              </div>
            </div>

            {/* Issues Feed / Cards */}
            {issues.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Zero Issues Discovered</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  No open issues match your filter criteria. Launch a Full Test or Smoke Test to scan the application.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getSeverityBadge(issue.severity)}
                        {getRegressionBadge(issue.regression_status)}
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {issue.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                          {issue.category}
                        </span>
                        {issue.occurrences_count > 1 && (
                          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Seen {issue.occurrences_count}x
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {issue.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          <strong>Route:</strong> <code className="text-slate-800 font-mono">{issue.route}</code>
                        </span>
                        {issue.likely_subsystem && (
                          <span>
                            <strong>Subsystem:</strong> <span className="text-indigo-600 font-medium">{issue.likely_subsystem}</span>
                          </span>
                        )}
                        <span>
                          <strong>Last detected:</strong> {new Date(issue.last_detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {issue.observed_summary && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                          {issue.observed_summary}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      <button
                        onClick={() => navigate(`/admin/qa/issues/${issue.id}`)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleRerunIssue(issue)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                        title="Re-run test for this route"
                      >
                        Re-run
                      </button>
                      <button
                        onClick={() => handleResolveIssue(issue.id, issue.status)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          issue.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        {issue.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RUNS TAB */}
        {activeTab === 'runs' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Run ID</th>
                    <th className="p-4">Mode</th>
                    <th className="p-4">Environment</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Routes Scanned</th>
                    <th className="p-4">Defects Discovered</th>
                    <th className="p-4">Started At</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">
                        {r.id}
                      </td>
                      <td className="p-4 font-semibold uppercase text-slate-700">
                        {r.mode}
                      </td>
                      <td className="p-4 text-slate-600">
                        {r.environment}
                      </td>
                      <td className="p-4">
                        {r.status === 'completed' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">COMPLETED</span>}
                        {r.status === 'running' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">RUNNING</span>}
                        {r.status === 'stopped' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">STOPPED</span>}
                        {r.status === 'failed' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">FAILED</span>}
                      </td>
                      <td className="p-4 text-slate-600">
                        {r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="p-4 text-slate-600">
                        {r.routes_tested} / {r.routes_discovered}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-bold">
                          {r.p0_count > 0 && <span className="text-red-600">{r.p0_count} P0</span>}
                          {r.p1_count > 0 && <span className="text-rose-500">{r.p1_count} P1</span>}
                          {r.p2_count > 0 && <span className="text-amber-600">{r.p2_count} P2</span>}
                          {r.p3_count > 0 && <span className="text-blue-600">{r.p3_count} P3</span>}
                          {r.p0_count === 0 && r.p1_count === 0 && r.p2_count === 0 && r.p3_count === 0 && (
                            <span className="text-emerald-600 font-semibold">0 Defects</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => navigate(`/admin/qa/runs/${r.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RUN SELECTED MODAL */}
        {isSelectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in">
              <h3 className="text-lg font-black text-slate-900 mb-2">Configure Targeted QA Scan</h3>
              <p className="text-xs text-slate-500 mb-4">
                Select the autonomous scanner modules to include in this diagnostic run:
              </p>

              <div className="space-y-2.5 mb-6 text-sm">
                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScanners.ui}
                    onChange={(e) => setSelectedScanners({ ...selectedScanners, ui: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <div>
                    <div className="font-bold text-slate-900">UI & Interactive Buttons</div>
                    <div className="text-xs text-slate-500">Test every button, locator, overlay interception & spinner</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScanners.api}
                    onChange={(e) => setSelectedScanners({ ...selectedScanners, api: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <div>
                    <div className="font-bold text-slate-900">API & Network Interception</div>
                    <div className="text-xs text-slate-500">Inspect 4xx, 5xx, timeouts, CORS & redacts secrets</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScanners.assets}
                    onChange={(e) => setSelectedScanners({ ...selectedScanners, assets: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Assets & B2/CDN Media</div>
                    <div className="text-xs text-slate-500">Inspect images, B2 403 authorization & dimensions</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScanners.accessibility}
                    onChange={(e) => setSelectedScanners({ ...selectedScanners, accessibility: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Accessibility (WCAG 2.1)</div>
                    <div className="text-xs text-slate-500">Missing button names, form labels & alt attributes</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScanners.security}
                    onChange={(e) => setSelectedScanners({ ...selectedScanners, security: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Security & Safe Tenant Isolation</div>
                    <div className="text-xs text-slate-500">Safe assertion ensuring Tenant A never leaks Tenant B records</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScanners.performance}
                    onChange={(e) => setSelectedScanners({ ...selectedScanners, performance: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Performance & Core Web Vitals</div>
                    <div className="text-xs text-slate-500">Measure real DOMContentLoaded, FCP & LCP timings</div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsSelectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const activeKeys = Object.entries(selectedScanners)
                      .filter(([_, active]) => active)
                      .map(([k]) => k);
                    handleStartRun('selected', activeKeys);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Launch Selected Scan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

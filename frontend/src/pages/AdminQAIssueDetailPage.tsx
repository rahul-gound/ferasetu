import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Activity, ArrowLeft, CheckCircle2, AlertTriangle, AlertOctagon, Info,
  Play, RefreshCw, Terminal, Globe, Camera, Layers, Check, ExternalLink,
  Code, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const rawApi = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawApi.replace(/\/+$/, '');
const ADMIN_API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

export default function AdminQAIssueDetailPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const [issueData, setIssueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evidenceTab, setEvidenceTab] = useState<'console' | 'network' | 'screenshot' | 'reproduce' | 'trace'>('reproduce');

  const fetchIssue = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/admin/qa/issues/${issueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setIssueData(res.data);
      }
    } catch {
      toast.error('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (issueId) fetchIssue();
  }, [issueId]);

  const handleResolve = async () => {
    const isCurrentlyResolved = issueData?.issue?.status === 'resolved';
    const newStatus = isCurrentlyResolved ? 'open' : 'resolved';
    try {
      await axios.post(
        `${ADMIN_API}/admin/qa/issues/${issueId}/resolve`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(newStatus === 'resolved' ? 'Issue marked as resolved' : 'Issue reopened');
      fetchIssue();
    } catch {
      toast.error('Failed to update issue');
    }
  };

  const handleRerun = async () => {
    try {
      toast.loading(`Re-running test for ${issueData?.issue?.route}...`, { id: 'rerun' });
      const res = await axios.post(
        `${ADMIN_API}/admin/qa/routes/test`,
        { route: issueData?.issue?.route, target_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Targeted scan dispatched (#${res.data.runId})`, { id: 'rerun' });
      navigate('/admin/qa');
    } catch {
      toast.error('Failed to rerun targeted test', { id: 'rerun' });
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

  const issue = issueData?.issue;
  const occurrences = issueData?.occurrences || [];
  const evidence = issue?.evidence_json ? JSON.parse(issue.evidence_json) : {};
  const reproductionSteps = issue?.reproduction_steps ? JSON.parse(issue.reproduction_steps) : [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/qa')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to QA Control Center
          </button>
        </div>

        {/* Issue Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  issue?.severity === 'P0' ? 'bg-red-600 text-white' :
                  issue?.severity === 'P1' ? 'bg-rose-500 text-white' :
                  issue?.severity === 'P2' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {issue?.severity} DEFECT
                </span>
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {issue?.id}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  {issue?.category}
                </span>
                {issue?.status === 'resolved' ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={12} /> RESOLVED
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    OPEN
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {issue?.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500">
                <span><strong>Route:</strong> <code className="font-mono text-slate-800">{issue?.route}</code></span>
                <span><strong>Occurrences:</strong> <strong className="text-slate-900">{issue?.occurrences_count}</strong></span>
                <span><strong>First detected:</strong> {new Date(issue?.first_detected_at).toLocaleString()}</span>
                <span><strong>Last detected:</strong> {new Date(issue?.last_detected_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
              <button
                onClick={handleRerun}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Play size={14} fill="currentColor" /> Re-run
              </button>
              <button
                onClick={handleResolve}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                  issue?.status === 'resolved'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent shadow-md'
                }`}
              >
                <Check size={14} /> {issue?.status === 'resolved' ? 'Reopen Issue' : 'Mark Resolved'}
              </button>
            </div>
          </div>

          {/* Diagnostic Facts vs Likely Hypotheses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            {/* Fact Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={14} className="text-slate-600" /> Observed Empirical Facts
              </div>
              <p className="text-xs font-mono text-slate-800 leading-relaxed">
                {issue?.observed_summary}
              </p>
              {issue?.user_impact && (
                <div className="text-xs text-slate-600 mt-2">
                  <strong className="text-slate-800">User Impact:</strong> {issue.user_impact}
                </div>
              )}
            </div>

            {/* Hypothesis Box */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
              <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info size={14} className="text-indigo-600" /> Diagnostic Hypothesis & Subsystem
              </div>
              <div className="text-xs text-indigo-950 font-medium leading-relaxed">
                <strong>Likely Subsystem:</strong> <span className="font-mono text-indigo-800">{issue?.likely_subsystem || 'Application Logic'}</span>
              </div>
              {issue?.likely_cause && (
                <div className="text-xs text-indigo-900 leading-relaxed">
                  <strong>Hypothesis:</strong> {issue.likely_cause}
                </div>
              )}
              {issue?.suggested_investigation && (
                <div className="text-xs text-indigo-800 bg-white/80 p-2.5 rounded-lg border border-indigo-200 mt-2">
                  <strong>Suggested Fix:</strong> {issue.suggested_investigation}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evidence & Reproduction Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 px-6 pt-4 gap-6 text-xs font-bold">
            <button
              onClick={() => setEvidenceTab('reproduce')}
              className={`pb-3 border-b-2 transition cursor-pointer ${
                evidenceTab === 'reproduce' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Exact Reproduction Steps ({reproductionSteps.length})
            </button>
            <button
              onClick={() => setEvidenceTab('console')}
              className={`pb-3 border-b-2 transition cursor-pointer ${
                evidenceTab === 'console' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Console Errors ({evidence.consoleEntries?.length || 0})
            </button>
            <button
              onClick={() => setEvidenceTab('network')}
              className={`pb-3 border-b-2 transition cursor-pointer ${
                evidenceTab === 'network' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Network Calls ({evidence.networkEntries?.length || 0})
            </button>
            <button
              onClick={() => setEvidenceTab('trace')}
              className={`pb-3 border-b-2 transition cursor-pointer ${
                evidenceTab === 'trace' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Diagnostics Trace
            </button>
          </div>

          <div className="p-6">
            {/* REPRODUCTION STEPS */}
            {evidenceTab === 'reproduce' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Step-by-step reproduction instructions:</h3>
                {reproductionSteps.length > 0 ? (
                  <ol className="space-y-2 text-xs list-decimal list-inside font-medium text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {reproductionSteps.map((step: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="font-sans font-medium">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-slate-500">No explicit reproduction steps recorded for this diagnostic.</p>
                )}
              </div>
            )}

            {/* CONSOLE ERRORS */}
            {evidenceTab === 'console' && (
              <div className="space-y-3 font-mono text-xs">
                {evidence.consoleEntries && evidence.consoleEntries.length > 0 ? (
                  evidence.consoleEntries.map((c: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900 text-rose-300 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold text-rose-400">[{c.type?.toUpperCase()}]</span>
                        <span>{c.timestamp || 'Recorded'}</span>
                      </div>
                      <div className="font-semibold text-rose-200">{c.message}</div>
                      {c.stack && <pre className="text-[11px] text-slate-400 overflow-x-auto pt-2">{c.stack}</pre>}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">Zero console errors recorded during this interaction.</div>
                )}
              </div>
            )}

            {/* NETWORK CALLS */}
            {evidenceTab === 'network' && (
              <div className="space-y-3 font-mono text-xs">
                {evidence.networkEntries && evidence.networkEntries.length > 0 ? (
                  evidence.networkEntries.map((n: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-orange-400">{n.method} {n.url}</span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          n.status >= 500 ? 'bg-red-900 text-red-200' :
                          n.status >= 400 ? 'bg-amber-900 text-amber-200' : 'bg-emerald-900 text-emerald-200'
                        }`}>
                          HTTP {n.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Duration: {n.durationMs}ms • Resource: {n.resourceType || 'fetch'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">No network calls captured for this specific event.</div>
                )}
              </div>
            )}

            {/* DIAGNOSTIC TRACE */}
            {evidenceTab === 'trace' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs leading-relaxed border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-2"># Diagnostic Pipeline Trace:</div>
                  {evidence.diagnosticTrace ? (
                    <div>{evidence.diagnosticTrace}</div>
                  ) : (
                    <div>UI Element ({issue?.element_selector || 'InteractiveControl'}) -&gt; Click Dispatched -&gt; State Observer</div>
                  )}
                  {issue?.fingerprint && (
                    <div className="mt-3 text-[11px] text-slate-500">
                      Fingerprint: {issue.fingerprint}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

import React, { useState } from 'react';
import {
  RotateCcw, Shield, AlertTriangle, CheckCircle2,
  RefreshCw, ArrowRight, Database, AlertCircle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  proStudioApi,
  type ProBackupSnapshot,
  type ProDataSource,
  type ProRestorePreview,
} from '../../../services/proStudioApi';

interface RestoreCenterTabProps {
  snapshots: ProBackupSnapshot[];
  dataSources: ProDataSource[];
  preSelectedSnapshot?: ProBackupSnapshot | null;
  onRefresh: () => void;
}

export default function RestoreCenterTab({
  snapshots,
  dataSources,
  preSelectedSnapshot,
  onRefresh,
}: RestoreCenterTabProps) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(preSelectedSnapshot?.id || snapshots[0]?.id || '');
  const [selectedTargetSourceId, setSelectedTargetSourceId] = useState<string>(preSelectedSnapshot?.data_source_id || dataSources[0]?.id || '');
  const [mode, setMode] = useState<'as_new' | 'selected' | 'replace_existing'>('as_new');

  // Conflict Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewData, setPreviewData] = useState<ProRestorePreview | null>(null);

  // Destructive Confirmation Inputs
  const [explicitConfirmation, setExplicitConfirmation] = useState(false);
  const [confirmDataSourceName, setConfirmDataSourceName] = useState('');

  // Execution & Progress
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [restoreOperationId, setRestoreOperationId] = useState<string | null>(null);

  const selectedSnapshot = snapshots.find(s => s.id === selectedSnapshotId);
  const selectedTargetSource = dataSources.find(s => s.id === selectedTargetSourceId);

  const handleRunConflictAnalysis = async () => {
    if (!selectedSnapshotId || !selectedTargetSourceId) {
      toast.error('Please select a snapshot and target data source');
      return;
    }
    setIsAnalyzing(true);
    setPreviewData(null);
    try {
      const res = await proStudioApi.previewRestore({
        snapshotId: selectedSnapshotId,
        dataSourceId: selectedTargetSourceId,
        mode,
      });
      setPreviewData(res);
      toast.success('Conflict analysis completed!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Conflict analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (mode === 'replace_existing') {
      if (!explicitConfirmation) {
        toast.error('You must explicitly confirm destructive restore');
        return;
      }
      if (confirmDataSourceName.trim() !== selectedTargetSource?.name.trim()) {
        toast.error(`Please type exact target source name: '${selectedTargetSource?.name}'`);
        return;
      }
    }

    setIsRestoring(true);
    setRestoreProgress(10);
    try {
      const res = await proStudioApi.executeRestore({
        snapshotId: selectedSnapshotId,
        dataSourceId: selectedTargetSourceId,
        mode,
        explicitConfirmation,
        confirmDataSourceName: confirmDataSourceName.trim(),
      });

      setRestoreOperationId(res.operation_id);
      setRestoreProgress(100);
      toast.success('Restore executed successfully!');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Restore execution failed');
      setRestoreProgress(0);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Info */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Restore Center & Conflict Analysis</h3>
            <p className="text-xs text-slate-400">
              Deterministic, non-destructive restore engine with schema diff detection and automatic safety snapshot safeguards.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1 & 2: Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Select Snapshot */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase">1. Select Backup Snapshot</label>
          <select
            value={selectedSnapshotId}
            onChange={e => setSelectedSnapshotId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
          >
            {snapshots.map(s => (
              <option key={s.id} value={s.id}>
                Snapshot #{s.snapshot_number} ({s.id}) — {(s.size_bytes / 1024).toFixed(0)} KB ({s.status})
              </option>
            ))}
          </select>
          {selectedSnapshot && (
            <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl text-xs space-y-1 text-slate-400 font-mono">
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="text-slate-300">{new Date(selectedSnapshot.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Size / Items:</span>
                <span className="text-slate-300">{(selectedSnapshot.size_bytes / 1024).toFixed(1)} KB ({selectedSnapshot.item_count} items)</span>
              </div>
            </div>
          )}
        </div>

        {/* Select Target Destination & Mode */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase">2. Target Destination & Mode</label>
          <select
            value={selectedTargetSourceId}
            onChange={e => setSelectedTargetSourceId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
          >
            {dataSources.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.provider})</option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { id: 'as_new', label: 'As New Schema', desc: 'Recommended' },
              { id: 'selected', label: 'Selected Tables', desc: 'Non-conflicting' },
              { id: 'replace_existing', label: 'Replace Existing', desc: 'Destructive' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as any)}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  mode === m.id
                    ? m.id === 'replace_existing'
                      ? 'bg-rose-950/30 border-rose-500 text-white'
                      : 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <p className="font-medium">{m.label}</p>
                <p className="text-[10px] text-slate-500">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conflict Analysis Trigger */}
      <div className="text-center">
        <button
          onClick={handleRunConflictAnalysis}
          disabled={isAnalyzing}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-2 border border-slate-700 shadow-sm disabled:opacity-50"
        >
          {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5 text-indigo-400" />}
          {isAnalyzing ? 'Analyzing Schema Differences...' : 'Run Conflict & Dependency Analysis'}
        </button>
      </div>

      {/* Conflict Report Preview */}
      {previewData && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Conflict Analysis Report
            </h4>
            <span className="text-xs font-mono text-slate-400">
              {previewData.conflictCount} conditions evaluated
            </span>
          </div>

          <div className="space-y-2">
            {previewData.conflicts.length === 0 ? (
              <p className="text-xs text-slate-400">No schema conflicts detected. Safe to restore.</p>
            ) : (
              previewData.conflicts.map((c, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    c.severity === 'critical'
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      : c.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{c.table ? `Table '${c.table}': ` : ''}</span>
                    <span>{c.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Destructive Safeguards */}
          {mode === 'replace_existing' && (
            <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase">
                <AlertTriangle className="w-4 h-4" /> Destructive Restore Safeguards Active
              </div>

              <div className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 border border-slate-800 space-y-1">
                <p className="font-medium text-emerald-400">✓ Mandatory Automatic Safety Snapshot</p>
                <p className="text-slate-400 text-[11px]">
                  An immutable Safety Snapshot will be created and verified before any existing tables are modified.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={explicitConfirmation}
                  onChange={e => setExplicitConfirmation(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-0"
                />
                <span>I confirm that existing table data will be overwritten and replaced.</span>
              </label>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Type target data source name <span className="font-mono text-white font-semibold">"{selectedTargetSource?.name}"</span> to confirm:
                </label>
                <input
                  type="text"
                  placeholder={selectedTargetSource?.name}
                  value={confirmDataSourceName}
                  onChange={e => setConfirmDataSourceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          {/* Execute Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleExecuteRestore}
              disabled={isRestoring}
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2 shadow-lg disabled:opacity-50 ${
                mode === 'replace_existing' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {isRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {isRestoring ? 'Executing Restore...' : mode === 'replace_existing' ? 'Execute Destructive Restore' : 'Execute Non-Destructive Restore'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

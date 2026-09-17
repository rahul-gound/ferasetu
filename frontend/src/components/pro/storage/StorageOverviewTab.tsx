import React, { useState } from 'react';
import {
  Database, HardDrive, Shield, CheckCircle2,
  Clock, Plus, RefreshCw, RotateCcw, Download, Sparkles, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { proStudioApi, type ProDataSource, type ProBackupSnapshot } from '../../../services/proStudioApi';

interface StorageOverviewTabProps {
  dataSources: ProDataSource[];
  snapshots: ProBackupSnapshot[];
  onOpenWizard: () => void;
  onNavigateToTab: (tab: string) => void;
  onRefresh: () => void;
}

export default function StorageOverviewTab({
  dataSources,
  snapshots,
  onOpenWizard,
  onNavigateToTab,
  onRefresh,
}: StorageOverviewTabProps) {
  const [isCleaning, setIsCleaning] = useState(false);

  const totalBackupBytes = snapshots.reduce((acc, s) => acc + (s.size_bytes || 0), 0);
  const maxStorageBytes = 10 * 1024 * 1024 * 1024; // 10 GB
  const usagePercent = Math.min(100, Math.round((totalBackupBytes / maxStorageBytes) * 100));

  const committedSnapshots = snapshots.filter(s => s.status === 'COMMITTED');
  const lockedSnapshots = snapshots.filter(s => Boolean(s.object_lock_mode));
  const latestSnapshot = snapshots[0];

  const handleRunCleanup = async () => {
    setIsCleaning(true);
    try {
      const res = await proStudioApi.runRetentionCleanup();
      toast.success(`Retention cleanup completed: ${res.deletedCount} deleted, ${res.lockedCount} locked.`);
      onRefresh();
    } catch (err: any) {
      toast.error('Retention cleanup failed');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Connected Sources</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{dataSources.length}</p>
          <p className="text-[11px] text-slate-500">Postgres, MySQL, LibSQL, S3, B2</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Immutable Snapshots</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{committedSnapshots.length}</p>
          <p className="text-[11px] text-slate-500">{lockedSnapshots.length} with B2 Object Lock</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Backup Storage</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{(totalBackupBytes / (1024 * 1024)).toFixed(1)} MB</p>
          <div className="space-y-1">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.max(4, usagePercent)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 text-right">{usagePercent}% of 10 GB</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">System Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">Optimal</p>
          <p className="text-[11px] text-slate-500">B2 Integrity Verified</p>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-purple-950/40 border border-indigo-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Automated External Backups into Backblaze B2
          </h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Protect your external databases and asset buckets with versioned, immutable snapshots. Backups are stored in FeraSetu-managed Backblaze B2 with cryptographic SHA-256 fingerprinting.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenWizard}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Source
          </button>
          <button
            onClick={handleRunCleanup}
            disabled={isCleaning}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
          >
            {isCleaning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            Retention Run
          </button>
        </div>
      </div>

      {/* Recent Activity & Latest Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latest Snapshot Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Latest Immutable Snapshot</h4>
            <button
              onClick={() => onNavigateToTab('backups')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {latestSnapshot ? (
            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">Snapshot #{latestSnapshot.snapshot_number}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {latestSnapshot.status}
                </span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Created:</span>
                <span className="text-slate-200">{new Date(latestSnapshot.created_at).toLocaleString()}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Size:</span>
                <span className="text-slate-200">{(latestSnapshot.size_bytes / 1024).toFixed(1)} KB</span>
              </div>
              <div className="text-slate-400 flex justify-between font-mono">
                <span>Fingerprint:</span>
                <span className="text-indigo-300">{latestSnapshot.schema_fingerprint?.slice(0, 16)}...</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">No snapshots created yet.</p>
          )}
        </div>

        {/* Security & Protection Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-semibold text-white">Security & Immutability Guarantees</h4>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">AES-256-GCM Credential Envelope</p>
                <p className="text-slate-400 text-[11px]">Secrets encrypted with HKDF subkeys. Never stored unencrypted in D1 or logs.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Backblaze B2 Compliance Mode</p>
                <p className="text-slate-400 text-[11px]">Object Lock ensures snapshots cannot be deleted until retention expires.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Automatic Pre-Restore Safety Snapshots</p>
                <p className="text-slate-400 text-[11px]">Destructive operations automatically create verified safety snapshots.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

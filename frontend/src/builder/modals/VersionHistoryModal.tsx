import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  X,
  CheckCircle,
  Clock,
  User,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { builderApi, type VersionSummary } from '../services/builderApi';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRollbackComplete: () => void;
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  onRollbackComplete,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rollingBackVersion, setRollingBackVersion] = useState<number | null>(null);

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      const res = await builderApi.getVersions();
      setVersions(res.versions || []);
    } catch (err: any) {
      console.warn('Could not fetch versions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRollback = async (versionNumber: number) => {
    if (
      !window.confirm(
        `Are you sure you want to rollback to Version ${versionNumber}? This will safely restore both your draft and your live storefront to this snapshot.`
      )
    ) {
      return;
    }

    setRollingBackVersion(versionNumber);
    try {
      await builderApi.rollbackVersion(versionNumber);
      toast.success(`Successfully rolled back to Version ${versionNumber}!`);
      onRollbackComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Rollback failed');
    } finally {
      setRollingBackVersion(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Publishing History & Rollback
              </h3>
              <p className="text-[11px] text-slate-500">
                Immutable snapshots of every published storefront release
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading version history...
            </div>
          ) : versions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No published versions yet</p>
              <p>When you click "Publish Store", a version snapshot will be preserved here.</p>
            </div>
          ) : (
            versions.map((ver, idx) => (
              <div
                key={ver.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      v{ver.version_number}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Live Production
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {ver.description || `Published version ${ver.version_number}`}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(ver.published_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 truncate max-w-[150px]">
                      <User className="w-3 h-3" /> {ver.published_by}
                    </span>
                  </div>
                </div>

                {idx !== 0 && (
                  <button
                    onClick={() => handleRollback(ver.version_number)}
                    disabled={rollingBackVersion === ver.version_number}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {rollingBackVersion === ver.version_number ? 'Restoring...' : 'Rollback'}
                    </span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

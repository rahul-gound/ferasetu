import React, { useState } from 'react';
import {
  FileText, Shield, HardDrive, Download, RotateCcw,
  CheckCircle2, AlertCircle, Clock, RefreshCw, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { proStudioApi, type ProBackupSnapshot, type ProDataSource } from '../../../services/proStudioApi';
import SnapshotManifestModal from './SnapshotManifestModal';

interface BackupsTabProps {
  snapshots: ProBackupSnapshot[];
  dataSources: ProDataSource[];
  onRefresh: () => void;
  onInitiateRestore: (snapshot: ProBackupSnapshot) => void;
}

export default function BackupsTab({
  snapshots,
  dataSources,
  onRefresh,
  onInitiateRestore,
}: BackupsTabProps) {
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [selectedManifestSnapshot, setSelectedManifestSnapshot] = useState<ProBackupSnapshot | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const filteredSnapshots = snapshots.filter(s =>
    selectedSourceFilter === 'all' ? true : s.data_source_id === selectedSourceFilter
  );

  const getSourceName = (dataSourceId: string) => {
    return dataSources.find(d => d.id === dataSourceId)?.name || dataSourceId;
  };

  const handleExport = async (snapshot: ProBackupSnapshot) => {
    setExportingId(snapshot.id);
    try {
      const res = await proStudioApi.createExport({
        snapshotId: snapshot.id,
        dataSourceId: snapshot.data_source_id,
        format: 'sql',
      });
      toast.success('SQL export initiated! Operation ID: ' + res.operation_id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Export failed');
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-400 uppercase shrink-0">Filter by Source:</label>
          <select
            value={selectedSourceFilter}
            onChange={e => setSelectedSourceFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Connected Sources ({snapshots.length})</option>
            {dataSources.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name} ({ds.provider})</option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Snapshots
        </button>
      </div>

      {/* Snapshots Table / Cards */}
      {filteredSnapshots.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <div className="mx-auto w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <HardDrive className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white">No backup snapshots found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Trigger a manual backup or wait for scheduled backup policies to generate immutable snapshots in Backblaze B2.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-5 py-3">Snapshot / Version</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Object Lock</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredSnapshots.map(snap => (
                  <tr key={snap.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span>Snapshot #{snap.snapshot_number}</span>
                        <p className="text-[10px] text-slate-500">{snap.id}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-200">
                      {getSourceName(snap.data_source_id)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        snap.snapshot_type === 'safety'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : snap.snapshot_type === 'scheduled'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {snap.snapshot_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 w-fit ${
                        snap.status === 'COMMITTED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : snap.status === 'FAILED' || snap.status === 'INTEGRITY_FAILED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {snap.status === 'COMMITTED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {snap.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono">
                      {(snap.size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-5 py-3">
                      {snap.object_lock_mode ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center gap-1 w-fit">
                          <Shield className="w-2.5 h-2.5" /> GOVERNANCE
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-[11px]">
                      {new Date(snap.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedManifestSnapshot(snap)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                          title="View Manifest & Fingerprints"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleExport(snap)}
                          disabled={exportingId === snap.id}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg disabled:opacity-50"
                          title="Export SQL"
                        >
                          {exportingId === snap.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => onInitiateRestore(snap)}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg font-medium text-[11px] flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manifest Modal */}
      <SnapshotManifestModal
        isOpen={Boolean(selectedManifestSnapshot)}
        onClose={() => setSelectedManifestSnapshot(null)}
        snapshot={selectedManifestSnapshot}
      />
    </div>
  );
}

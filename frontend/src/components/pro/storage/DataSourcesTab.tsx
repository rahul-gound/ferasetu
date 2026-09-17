import React, { useState } from 'react';
import {
  Database, HardDrive, Plus, RefreshCw, Trash2, CheckCircle2,
  AlertCircle, Shield, Key, Search, ExternalLink, Play, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { proStudioApi, type ProDataSource } from '../../../services/proStudioApi';

interface DataSourcesTabProps {
  dataSources: ProDataSource[];
  onRefresh: () => void;
  onOpenWizard: () => void;
}

export default function DataSourcesTab({
  dataSources,
  onRefresh,
  onOpenWizard,
}: DataSourcesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBackupId, setActiveBackupId] = useState<string | null>(null);
  const [inspectModalSource, setInspectModalSource] = useState<ProDataSource | null>(null);
  const [inspectionData, setInspectionData] = useState<any>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const filteredSources = dataSources.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBackupNow = async (sourceId: string) => {
    setActiveBackupId(sourceId);
    try {
      const res = await proStudioApi.triggerBackup({ dataSourceId: sourceId, snapshotType: 'manual' });
      toast.success('Backup triggered successfully! Operation ' + res.operation_id);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to trigger backup');
    } finally {
      setActiveBackupId(null);
    }
  };

  const handleDeleteSource = async (sourceId: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect data source '${name}'? Existing snapshots will remain protected.`)) return;
    try {
      await proStudioApi.deleteDataSource(sourceId);
      toast.success(`Data source '${name}' deleted.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to delete data source');
    }
  };

  const handleInspect = async (source: ProDataSource) => {
    setInspectModalSource(source);
    setIsInspecting(true);
    setInspectionData(null);
    try {
      const res = await proStudioApi.inspectDataSource(source.id);
      setInspectionData(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to inspect source');
    } finally {
      setIsInspecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search data sources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <button
          onClick={onOpenWizard}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Connect Data Source
        </button>
      </div>

      {/* Sources Grid / Empty State */}
      {filteredSources.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <div className="mx-auto w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <Database className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white">No external data sources connected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Connect your external PostgreSQL, MySQL, LibSQL, or S3/Backblaze B2 buckets to automate encrypted backups into Backblaze B2.
          </p>
          <button
            onClick={onOpenWizard}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" /> Connect Your First Data Source
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSources.map(source => (
            <div
              key={source.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-indigo-400">
                      {source.type === 'database' ? <Database className="w-5 h-5" /> : <HardDrive className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{source.name}</h4>
                      <p className="text-xs text-slate-400 uppercase font-mono">{source.provider} • {source.connection_strategy}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                </div>

                {/* Metadata Details */}
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 space-y-1.5 text-xs text-slate-400 mb-4 font-mono">
                  {source.metadata?.host && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Host:</span>
                      <span className="text-slate-200">{source.metadata.host}</span>
                    </div>
                  )}
                  {source.metadata?.database && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Database:</span>
                      <span className="text-slate-200">{source.metadata.database}</span>
                    </div>
                  )}
                  {source.metadata?.bucket && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bucket:</span>
                      <span className="text-slate-200">{source.metadata.bucket}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Schedule:</span>
                    <span className="text-indigo-300 capitalize">{source.policy?.schedule || 'manual'} (Keep {source.policy?.retention_days || 30}d)</span>
                  </div>
                </div>

                {/* Capabilities Pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {source.capabilities?.schemaInspection && (
                    <span className="px-2 py-0.5 bg-slate-800 border border-slate-700/60 text-slate-300 rounded-md text-[10px]">
                      Schema Inspection
                    </span>
                  )}
                  {source.capabilities?.tableBackup && (
                    <span className="px-2 py-0.5 bg-slate-800 border border-slate-700/60 text-slate-300 rounded-md text-[10px]">
                      Table Backups
                    </span>
                  )}
                  {source.policy?.enable_object_lock && (
                    <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-md text-[10px] flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> B2 Object Lock
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleInspect(source)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Inspect
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBackupNow(source.id)}
                    disabled={activeBackupId === source.id}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {activeBackupId === source.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Backup Now
                  </button>

                  <button
                    onClick={() => handleDeleteSource(source.id, source.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                    title="Disconnect"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Modal */}
      {inspectModalSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-semibold text-white">Structure Inspection: {inspectModalSource.name}</h3>
              <button onClick={() => setInspectModalSource(null)} className="p-1.5 text-slate-400 hover:text-white">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isInspecting ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  <p className="text-xs">Inspecting remote schema metadata...</p>
                </div>
              ) : inspectionData ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase">Discovered Tables</h4>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800">
                    {(inspectionData.tables || []).map((t: any) => (
                      <div key={t.name} className="p-3 flex justify-between items-center text-xs">
                        <span className="font-medium text-white">{t.name}</span>
                        <span className="text-slate-500">~{t.estimatedRowCount} rows ({(t.sizeBytes / 1024).toFixed(1)} KB)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No inspection data available</p>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectModalSource(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-lg"
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

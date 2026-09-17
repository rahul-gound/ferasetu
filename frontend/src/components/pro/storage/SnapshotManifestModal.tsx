import React from 'react';
import { X, FileText, CheckCircle2, Shield, HardDrive, Hash, Layers } from 'lucide-react';
import type { ProBackupSnapshot } from '../../../services/proStudioApi';

interface SnapshotManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: ProBackupSnapshot | null;
}

export default function SnapshotManifestModal({
  isOpen,
  onClose,
  snapshot,
}: SnapshotManifestModalProps) {
  if (!isOpen || !snapshot) return null;

  const manifest = snapshot.manifest_summary || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Snapshot Manifest (v1)</h3>
              <p className="text-xs text-slate-400">{snapshot.id} • Backblaze B2 Immutable Artifact</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <p className="text-xs text-slate-500">Status</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> {snapshot.status}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <p className="text-xs text-slate-500">Total Snapshot Size</p>
              <p className="text-xs font-semibold text-white">
                {(snapshot.size_bytes / 1024).toFixed(1)} KB ({snapshot.size_bytes.toLocaleString()} bytes)
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <p className="text-xs text-slate-500">Items / Tables</p>
              <p className="text-xs font-semibold text-white">
                {snapshot.item_count} items ({snapshot.table_count} tables)
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <p className="text-xs text-slate-500">Object Lock</p>
              <p className="text-xs font-semibold text-indigo-400">
                {snapshot.object_lock_mode ? `${snapshot.object_lock_mode} (Until ${snapshot.object_lock_until?.slice(0, 10)})` : 'None'}
              </p>
            </div>
          </div>

          {/* Fingerprints */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase">Deterministic SHA-256 Fingerprints</h4>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Schema Fingerprint</span>
                <span className="text-slate-500 font-mono">SHA-256</span>
              </div>
              <p className="font-mono text-xs text-indigo-300 break-all select-all">
                {snapshot.schema_fingerprint || manifest.schemaFingerprint || 'Not recorded'}
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Content Fingerprint</span>
                <span className="text-slate-500 font-mono">SHA-256</span>
              </div>
              <p className="font-mono text-xs text-emerald-300 break-all select-all">
                {snapshot.content_fingerprint || manifest.contentFingerprint || 'Not recorded'}
              </p>
            </div>
          </div>

          {/* Storage Paths */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase">B2 Storage Key</h4>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 break-all">
              {snapshot.b2_manifest_key || `${snapshot.b2_root_prefix}/manifest.json`}
            </div>
          </div>

          {/* Security Banner */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero credentials stored in snapshot manifests. Verified with Web Crypto SHA-256 checksums.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Lock,
  Globe,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { builderApi, type BuilderAsset } from '../services/builderApi';

interface AssetsPanelProps {
  onApplyAssetToNode?: (assetUrl: string) => void;
  selectedNodeId?: string | null;
}

export default function AssetsPanel({ onApplyAssetToNode, selectedNodeId }: AssetsPanelProps) {
  const [assets, setAssets] = useState<BuilderAsset[]>([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'public'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const res = await builderApi.getAssets(filter);
      setAssets(res.assets || []);
    } catch (err: any) {
      console.warn('Could not load builder assets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [filter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image uploads (PNG, JPEG, WebP, SVG) are supported.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Asset uploaded as private draft');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleVisibility = async (asset: BuilderAsset) => {
    const nextVis = asset.visibility === 'public' ? 'private' : 'public';
    try {
      await builderApi.updateAssetVisibility(asset.id, nextVis);
      toast.success(
        nextVis === 'public' ? 'Asset published to CDN' : 'Asset marked as private draft'
      );
      fetchAssets();
    } catch (err: any) {
      toast.error('Failed to update asset visibility');
    }
  };

  const handleCopyUrl = (asset: BuilderAsset) => {
    navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    toast.success('CDN URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Assets & Media Vault
          </h2>
          <p className="text-[11px] text-slate-500">
            Upload images with draft vs published CDN access control
          </p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-2.5 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Uploading...' : 'Upload Asset'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-3 py-2 gap-1 bg-slate-50 dark:bg-slate-950">
        {(['all', 'draft', 'public'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
              filter === tab
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {tab === 'all' ? 'All Assets' : tab === 'draft' ? 'Private Drafts' : 'Published'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-xs text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading assets...
          </div>
        ) : assets.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500">No assets in this category yet.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Upload an image to get started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col justify-between"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-slate-100 dark:bg-slate-900 overflow-hidden relative flex items-center justify-center">
                  <img
                    src={asset.url}
                    alt={asset.key}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  {/* Status Badge */}
                  <div className="absolute top-1.5 left-1.5">
                    {asset.isDraft ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/90 text-white backdrop-blur-sm shadow-sm">
                        <Lock className="w-2.5 h-2.5" /> Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600/90 text-white backdrop-blur-sm shadow-sm">
                        <Globe className="w-2.5 h-2.5" /> Published
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-2 space-y-1.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-mono text-slate-500 truncate" title={asset.key}>
                    {asset.key.split('/').pop()}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleCopyUrl(asset)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Copy CDN URL"
                    >
                      {copiedId === asset.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {onApplyAssetToNode && selectedNodeId && (
                      <button
                        onClick={() => onApplyAssetToNode(asset.url)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-600 hover:bg-blue-700 text-white"
                        title="Apply to selected component"
                      >
                        Apply
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleVisibility(asset)}
                      className="text-[10px] text-slate-500 hover:text-blue-600 font-medium"
                      title="Toggle Draft vs Published"
                    >
                      {asset.isDraft ? 'Publish' : 'Make Draft'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Send,
  Trash2,
  Pin,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Eye,
  Filter,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';
import api from '../services/api';

interface BroadcastItem {
  id: string;
  title: string;
  content: string;
  category: 'feature' | 'update' | 'message' | 'tip';
  badge_label?: string;
  action_url?: string;
  action_label?: string;
  target_plan?: string;
  is_pinned?: number | boolean;
  is_active?: number | boolean;
  expires_at?: string | null;
  created_at: string;
}

export default function AdminBroadcastsPage() {
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'feature' | 'update' | 'message' | 'tip'>('feature');
  const [badgeLabel, setBadgeLabel] = useState('New Feature');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [targetPlan, setTargetPlan] = useState('all');
  const [isPinned, setIsPinned] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Load active notifications from real server endpoint
  const { data, isLoading, refetch } = useQuery<{ announcements: BroadcastItem[] }>({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const res = await api.get('/announcements?limit=100');
      return { announcements: res.data?.announcements || [] };
    },
  });

  const broadcasts = data?.announcements || [];

  // Broadcast Mutation
  const broadcastMutation = useMutation({
    mutationFn: async (payload: Partial<BroadcastItem>) => {
      const res = await api.post('/announcements', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notification broadcasted to shopkeepers!');
      setTitle('');
      setContent('');
      setActionUrl('');
      setActionLabel('');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to dispatch broadcast');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/announcements/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notification deleted and revoked.');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete notification');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and message content are required');
      return;
    }

    broadcastMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      category,
      badge_label: badgeLabel.trim() || 'Notice',
      action_url: actionUrl.trim() || undefined,
      action_label: actionLabel.trim() || undefined,
      target_plan: targetPlan,
      is_pinned: isPinned ? 1 : 0,
    });
  };

  return (
    <AdminLayout>
      <div className="flex-1 overflow-y-auto bg-[#F4F7FE] p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  Real Admin Feed
                </span>
                <span className="text-xs text-slate-500 font-medium">Auto-Vanish 24h After Seen</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                Broadcasts & Merchant Notifications
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Send authentic, real-time platform updates to shopkeepers. Zero fake or AI-generated notifications.
              </p>
            </div>

            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              Refresh Active Feed
            </button>
          </div>

          {/* Vanish Rule Note */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 flex items-start gap-3">
            <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold">Automated 24-Hour Vanishing Rule Active:</span>
              <p className="text-amber-800 leading-relaxed">
                When an active shopkeeper sees this notification in their dashboard bell drawer, their client records the timestamp.
                The notification will automatically vanish for that merchant exactly 1 day (24 hours) after being seen.
              </p>
            </div>
          </div>

          {/* Dispatch Composer & Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                <Bell size={20} className="text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">Compose New Broadcast</h2>
              </div>

              <form onSubmit={handleSend} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. UPI Instant Auto-Sweep Engine is Live"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Notification Message / Details *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Explain the update in plain human language without technical buzzwords..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    >
                      <option value="feature">New Feature</option>
                      <option value="update">Platform Update</option>
                      <option value="message">Admin Direct Note</option>
                      <option value="tip">Retailer Tip</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Badge Label
                    </label>
                    <input
                      type="text"
                      value={badgeLabel}
                      onChange={(e) => setBadgeLabel(e.target.value)}
                      placeholder="e.g. New Feature, Top Update"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Action URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      placeholder="e.g. /website-builder or /orders"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Action Button Label
                    </label>
                    <input
                      type="text"
                      value={actionLabel}
                      onChange={(e) => setActionLabel(e.target.value)}
                      placeholder="e.g. Try Visual Builder"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Target Merchant Plan
                    </label>
                    <select
                      value={targetPlan}
                      onChange={(e) => setTargetPlan(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    >
                      <option value="all">All Merchants (Free & Premium)</option>
                      <option value="free">Free Plan Only</option>
                      <option value="premium">Premium Only</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="relative flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Pin size={14} className={isPinned ? 'text-orange-500' : 'text-slate-400'} />
                        Pin to Top of Updates Center
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={broadcastMutation.isPending}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 shadow-md shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={16} />
                    {broadcastMutation.isPending ? 'Broadcasting...' : 'Broadcast to Merchants'}
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={14} className="text-orange-500" />
                  Live Merchant Preview
                </span>
                <span className="text-[11px] text-slate-400">Updates Center Card</span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-md space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {badgeLabel || 'Update'}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    {isPinned && <Pin size={12} className="text-orange-500" />}
                    <span>Just now</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {title || 'Your announcement headline will appear here'}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {content || 'Detailed announcement description explaining the new tools or features to the shopkeeper.'}
                </p>

                {actionLabel && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700">
                      {actionLabel}
                      <ArrowRight size={13} />
                    </span>
                  </div>
                )}
              </div>

              {/* Status information */}
              <div className="p-4 rounded-2xl bg-white/70 border border-slate-200 text-xs text-slate-500 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Target Plan:</span>
                  <span className="font-semibold text-slate-800 capitalize">{targetPlan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pin Priority:</span>
                  <span className="font-semibold text-slate-800">{isPinned ? 'High (Pinned)' : 'Standard'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Real Storage:</span>
                  <span className="font-semibold text-emerald-600">Cloudflare D1 & Worker</span>
                </div>
              </div>
            </div>

          </div>

          {/* Active Broadcasts List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Currently Active Broadcasts</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live notifications visible to merchants. Delete any item to immediately remove it from all merchant drawers.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {broadcasts.length} Active {broadcasts.length === 1 ? 'Notice' : 'Notices'}
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading broadcasts from database...</div>
            ) : broadcasts.length === 0 ? (
              <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-100 rounded-2xl">
                <Bell size={28} className="mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No active broadcasts in database</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Zero synthetic notifications exist. Use the composer above to dispatch an authentic update.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {broadcasts.map((item) => (
                  <div key={item.id} className="py-4.5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                          {item.badge_label || item.category}
                        </span>
                        {Boolean(item.is_pinned) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Pin size={10} />
                            Pinned
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="text-[11px] text-slate-400">• Plan: {item.target_plan || 'all'}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl line-clamp-2">
                        {item.content}
                      </p>

                      {item.action_url && (
                        <div className="text-[11px] font-medium text-orange-600 flex items-center gap-1">
                          Action: {item.action_label || 'View'} &rarr; {item.action_url}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete broadcast "${item.title}"?`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition shrink-0 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}

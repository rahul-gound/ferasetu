import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  ShieldCheck,
  Send,
  Pin,
  Sparkles,
  ChevronRight,
  Filter,
  Plus,
  ArrowRight,
  ThumbsUp,
  MessageCircle,
  AlertCircle,
  HelpCircle,
  Check,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';
import api from '../services/api';

interface Reply {
  id: string;
  author: string;
  storeName: string;
  text: string;
  time: string;
  sourceLang?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  adminBadge?: string;
}

interface Discussion {
  id: string;
  channel: string;
  category: string;
  title: string;
  body: string;
  author: string;
  storeName: string;
  locality: string;
  sourceLang?: string;
  status: 'open' | 'approved' | 'planned' | 'in_progress' | 'implemented' | 'under_review';
  adminNote?: string | null;
  createdAt: string;
  upvotes: number;
  replyCount: number;
  isStaffVerified?: boolean;
  isPinned?: boolean;
  replies?: Reply[];
}

export default function AdminCommunityPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);

  // Status & Note update state
  const [editingStatus, setEditingStatus] = useState<Discussion['status']>('approved');
  const [editingAdminNote, setEditingAdminNote] = useState('');

  // Admin reply state
  const [adminReplyText, setAdminReplyText] = useState('');

  // New discussion modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newChannel, setNewChannel] = useState('announcements');
  const [newCategory, setNewCategory] = useState('Announcements');

  // Load discussions
  const { data, isLoading, refetch } = useQuery<{ discussions: Discussion[] }>({
    queryKey: ['admin-community-discussions'],
    queryFn: async () => {
      const res = await api.get('/community/discussions?limit=100');
      return { discussions: res.data?.discussions || [] };
    },
  });

  const discussions = data?.discussions || [];

  // Update Status & Admin Note Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: string; adminNote: string }) => {
      const res = await api.patch(`/community/discussions/${id}`, {
        status,
        adminNote: adminNote.trim() || null,
        isStaffVerified: true,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Feature status and admin note updated!');
      queryClient.invalidateQueries({ queryKey: ['admin-community-discussions'] });
      queryClient.invalidateQueries({ queryKey: ['community-discussions'] });
      if (activeDiscussion?.id === variables.id) {
        setActiveDiscussion(prev => prev ? { ...prev, status: variables.status as any, adminNote: variables.adminNote } : null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update discussion');
    },
  });

  // Admin Reply Mutation
  const replyMutation = useMutation({
    mutationFn: async ({ discussionId, text }: { discussionId: string; text: string }) => {
      const res = await api.post(`/community/discussions/${discussionId}/replies`, {
        text: text.trim(),
        author: 'FeraSetu Core Team',
        storeName: 'Platform Engineering',
        isAdmin: true,
        adminBadge: 'Core Team',
      });
      return res.data;
    },
    onSuccess: (res, variables) => {
      toast.success('Official admin reply posted!');
      setAdminReplyText('');
      queryClient.invalidateQueries({ queryKey: ['admin-community-discussions'] });
      queryClient.invalidateQueries({ queryKey: ['community-discussions'] });
      if (activeDiscussion?.id === variables.discussionId && res.reply) {
        setActiveDiscussion(prev => prev ? {
          ...prev,
          replies: [...(prev.replies || []), res.reply],
          replyCount: (prev.replyCount || 0) + 1
        } : null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to post reply');
    },
  });

  // Delete Discussion Mutation
  const deleteDiscussionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/community/discussions/${id}`);
      return res.data;
    },
    onSuccess: (_, id) => {
      toast.success('Discussion deleted.');
      queryClient.invalidateQueries({ queryKey: ['admin-community-discussions'] });
      queryClient.invalidateQueries({ queryKey: ['community-discussions'] });
      if (activeDiscussion?.id === id) {
        setActiveDiscussion(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete discussion');
    },
  });

  // Delete Reply Mutation
  const deleteReplyMutation = useMutation({
    mutationFn: async ({ discussionId, replyId }: { discussionId: string; replyId: string }) => {
      const res = await api.delete(`/community/discussions/${discussionId}/replies/${replyId}`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Reply deleted.');
      queryClient.invalidateQueries({ queryKey: ['admin-community-discussions'] });
      queryClient.invalidateQueries({ queryKey: ['community-discussions'] });
      if (activeDiscussion?.id === variables.discussionId) {
        setActiveDiscussion(prev => prev ? {
          ...prev,
          replies: (prev.replies || []).filter(r => r.id !== variables.replyId),
          replyCount: Math.max(0, (prev.replyCount || 1) - 1)
        } : null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete reply');
    },
  });

  // Toggle Pin Mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const res = await api.patch(`/community/discussions/${id}`, { isPinned });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pin state toggled');
      queryClient.invalidateQueries({ queryKey: ['admin-community-discussions'] });
      queryClient.invalidateQueries({ queryKey: ['community-discussions'] });
    },
  });

  // Create Discussion Mutation
  const createDiscussionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/community/discussions', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('New topic published to community!');
      setShowNewModal(false);
      setNewTitle('');
      setNewBody('');
      queryClient.invalidateQueries({ queryKey: ['admin-community-discussions'] });
      queryClient.invalidateQueries({ queryKey: ['community-discussions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to publish topic');
    },
  });

  // Filtered discussions
  const filteredDiscussions = discussions.filter(d => {
    if (selectedChannel !== 'all' && d.channel !== selectedChannel) return false;
    if (selectedStatus !== 'all' && d.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchBody = d.body.toLowerCase().includes(q);
      const matchAuthor = d.author.toLowerCase().includes(q);
      return matchTitle || matchBody || matchAuthor;
    }
    return true;
  });

  const handleSelectDiscussion = (disc: Discussion) => {
    setActiveDiscussion(disc);
    setEditingStatus(disc.status || 'open');
    setEditingAdminNote(disc.adminNote || '');
  };

  const getStatusBadge = (status: Discussion['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Feature Approved
          </span>
        );
      case 'planned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} className="text-blue-600" />
            Planned
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles size={12} className="text-purple-600" />
            In Progress
          </span>
        );
      case 'implemented':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-800 border border-green-200">
            <Check size={12} className="text-green-600" />
            Shipped / Implemented
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <HelpCircle size={12} className="text-amber-600" />
            Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Open Topic
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="flex-1 overflow-y-auto bg-[#F4F7FE] p-6 lg:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                  <ShieldCheck size={13} className="text-orange-600" />
                  Community Control & Moderation
                </span>
                <span className="text-xs text-slate-500 font-medium">Discord-Style Multi-Store Hub</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                Community & Feature Approvals
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Talk directly to shopkeepers, approve features with custom development notes, and moderate discussions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => refetch()}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 shadow-md shadow-orange-500/20 transition cursor-pointer"
              >
                <Plus size={16} />
                Post Official Team Topic
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Total Discussions</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{discussions.length}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Feature Requests</div>
              <div className="text-2xl font-black text-orange-600 mt-1">
                {discussions.filter(d => d.channel === 'feature-requests' || d.category.toLowerCase().includes('feature')).length}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Approved Features</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {discussions.filter(d => d.status === 'approved' || d.status === 'implemented').length}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Under Review</div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {discussions.filter(d => d.status === 'under_review' || d.status === 'open').length}
              </div>
            </div>
          </div>

          {/* Main 2-Column Interface: Left Feed, Right Detail/Moderation Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Search, Filters & Discussion List */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Search & Channel Filters */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, question, or shopkeeper..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px] shrink-0">Channel:</span>
                  {[
                    { id: 'all', label: 'All Channels' },
                    { id: 'feature-requests', label: '#feature-requests' },
                    { id: 'announcements', label: '#announcements' },
                    { id: 'payments', label: '#payments' },
                    { id: 'domains', label: '#domains' },
                    { id: 'general', label: '#general' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        selectedChannel === ch.id
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px] shrink-0">Status:</span>
                  {[
                    { id: 'all', label: 'All Status' },
                    { id: 'approved', label: 'Approved' },
                    { id: 'planned', label: 'Planned' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'under_review', label: 'Under Review' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStatus(st.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                        selectedStatus === st.id
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discussion Cards */}
              <div className="space-y-3">
                {isLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading discussions...</div>
                ) : filteredDiscussions.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                    No community discussions match your filters.
                  </div>
                ) : (
                  filteredDiscussions.map((disc) => {
                    const isSelected = activeDiscussion?.id === disc.id;
                    return (
                      <div
                        key={disc.id}
                        onClick={() => handleSelectDiscussion(disc)}
                        className={`p-5 rounded-2xl bg-white border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 shadow-md ring-2 ring-orange-500/10'
                            : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                              #{disc.channel || 'general'}
                            </span>
                            {getStatusBadge(disc.status)}
                            {disc.isPinned && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                <Pin size={10} />
                                Pinned
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0">{disc.createdAt}</span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1.5">
                          {disc.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                          {disc.body}
                        </p>

                        {/* Admin Note callout if present */}
                        {disc.adminNote && (
                          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                            <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-800">
                                Team Decision / Roadmap Note:
                              </span>
                              <p className="text-emerald-900 mt-0.5">{disc.adminNote}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{disc.author}</span>
                            <span>•</span>
                            <span className="text-slate-500">{disc.storeName}</span>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1 text-[11px] text-slate-600">
                              <ThumbsUp size={12} />
                              {disc.upvotes}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-600">
                              <MessageCircle size={12} />
                              {disc.replyCount || disc.replies?.length || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Active Discussion Moderation, Approvals & Comments */}
            <div className="lg:col-span-5 space-y-6">
              {activeDiscussion ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-6 sticky top-6">
                  
                  {/* Top Action Bar */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Moderation Panel
                      </span>
                      {getStatusBadge(activeDiscussion.status)}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePinMutation.mutate({ id: activeDiscussion.id, isPinned: !activeDiscussion.isPinned })}
                        title={activeDiscussion.isPinned ? 'Unpin' : 'Pin to top'}
                        className={`p-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          activeDiscussion.isPinned
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <Pin size={14} />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Permanently delete question "${activeDiscussion.title}"?`)) {
                            deleteDiscussionMutation.mutate(activeDiscussion.id);
                          }
                        }}
                        title="Delete Question / Discussion"
                        className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Active Question Title & Content */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug mb-2">
                      {activeDiscussion.title}
                    </h2>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                      {activeDiscussion.body}
                    </p>
                    <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                      <span>Posted by: <strong className="text-slate-700">{activeDiscussion.author}</strong> ({activeDiscussion.storeName})</span>
                      <span>{activeDiscussion.createdAt}</span>
                    </div>
                  </div>

                  {/* Feature Approval & Status Controller ("tell this feature will be approve and make it better") */}
                  <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-orange-600" />
                        Feature Decision & Public Roadmap
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Change Status
                      </label>
                      <select
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="approved">Feature Approved ✅</option>
                        <option value="planned">Planned 🚀</option>
                        <option value="in_progress">In Progress ⚙️</option>
                        <option value="implemented">Shipped / Implemented 🎉</option>
                        <option value="under_review">Under Review 🔍</option>
                        <option value="open">Open Discussion 💬</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Official Team Note / Roadmap Plan
                      </label>
                      <textarea
                        rows={2}
                        value={editingAdminNote}
                        onChange={(e) => setEditingAdminNote(e.target.value)}
                        placeholder="e.g. This feature has been approved! We are wiring it into our next release to make it better with instant WhatsApp sync."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => updateStatusMutation.mutate({
                        id: activeDiscussion.id,
                        status: editingStatus,
                        adminNote: editingAdminNote
                      })}
                      disabled={updateStatusMutation.isPending}
                      className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition shadow-xs cursor-pointer"
                    >
                      {updateStatusMutation.isPending ? 'Updating...' : 'Publish Approval & Status'}
                    </button>
                  </div>

                  {/* Replies & Comment Thread */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Discussion Thread ({activeDiscussion.replies?.length || 0})
                    </span>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {(!activeDiscussion.replies || activeDiscussion.replies.length === 0) ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          No replies yet. Be the first to comment as Admin!
                        </div>
                      ) : (
                        activeDiscussion.replies.map((rep) => (
                          <div
                            key={rep.id}
                            className={`p-3 rounded-2xl text-xs space-y-1 relative group ${
                              rep.isAdmin
                                ? 'bg-orange-50/70 border border-orange-200 text-orange-950'
                                : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{rep.author}</span>
                                {rep.isAdmin && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-orange-500 text-white">
                                    <ShieldCheck size={10} />
                                    Admin
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">• {rep.time}</span>
                              </div>

                              <button
                                onClick={() => deleteReplyMutation.mutate({ discussionId: activeDiscussion.id, replyId: rep.id })}
                                title="Delete Comment"
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition p-1 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <p className="text-xs leading-relaxed">{rep.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Post Admin Comment Box */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Reply as FeraSetu Admin
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder="Write official response to shopkeepers..."
                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && adminReplyText.trim()) {
                            replyMutation.mutate({ discussionId: activeDiscussion.id, text: adminReplyText });
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (adminReplyText.trim()) {
                            replyMutation.mutate({ discussionId: activeDiscussion.id, text: adminReplyText });
                          }
                        }}
                        disabled={replyMutation.isPending || !adminReplyText.trim()}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition disabled:opacity-40 cursor-pointer"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <MessageSquare size={36} className="mx-auto text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-700">Select a discussion to moderate</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Click any question or discussion on the left to approve features, write developer notes, reply to shopkeepers, or delete spam.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* New Discussion Modal */}
          {showNewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Post Official Team Topic</h3>
                  <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Channel</label>
                    <select
                      value={newChannel}
                      onChange={(e) => {
                        setNewChannel(e.target.value);
                        setNewCategory(e.target.value === 'announcements' ? 'Announcements' : 'General');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                    >
                      <option value="announcements">#announcements</option>
                      <option value="feature-requests">#feature-requests</option>
                      <option value="payments">#payments</option>
                      <option value="domains">#domains</option>
                      <option value="general">#general</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Headline / Question</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Feedback requested: New GST E-Invoicing Auto-Sync"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Topic Details</label>
                    <textarea
                      rows={4}
                      value={newBody}
                      onChange={(e) => setNewBody(e.target.value)}
                      placeholder="Details of the announcement or question for community discussion..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newTitle.trim() || !newBody.trim()) {
                        toast.error('Headline and details are required');
                        return;
                      }
                      createDiscussionMutation.mutate({
                        title: newTitle.trim(),
                        body: newBody.trim(),
                        author: 'FeraSetu Core Team',
                        storeName: 'Platform Engineering',
                        locality: 'Official',
                        category: newCategory,
                        channel: newChannel,
                        userLang: 'en',
                      });
                    }}
                    disabled={createDiscussionMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition"
                  >
                    {createDiscussionMutation.isPending ? 'Publishing...' : 'Publish to Community'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}

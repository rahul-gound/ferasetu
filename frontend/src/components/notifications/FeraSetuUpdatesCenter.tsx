import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Sparkles,
  CheckCheck,
  X,
  Pin,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import api from '../../services/api';

export interface Announcement {
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
  created_at: string;
}

const STORAGE_KEY = 'ferasetu_read_announcements';

export function useFeraSetuUpdates() {
  const queryClient = useQueryClient();
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const { data, isLoading, refetch } = useQuery<{ announcements: Announcement[] }>({
    queryKey: ['announcements'],
    queryFn: async () => {
      try {
        const res = await api.get('/announcements');
        return { announcements: res.data?.announcements || [] };
      } catch (err) {
        console.warn('Failed to load announcements from server, using local fallback:', err);
        return {
          announcements: [
            {
              id: 'ann_builder',
              title: 'Visual Storefront Builder is live',
              content: 'Design your online shop directly from your phone or computer. Arrange product displays, customize your banner, and adjust store colors with instant live previews.',
              category: 'feature',
              badge_label: 'New Feature',
              action_url: '/website-builder',
              action_label: 'Open Store Builder',
              is_pinned: 1,
              is_active: 1,
              created_at: new Date().toISOString(),
            },
            {
              id: 'ann_whatsapp',
              title: 'WhatsApp 1-Click checkout for your customers',
              content: 'Customers can now tap one button on your web storefront to send their full order with delivery details directly to your WhatsApp. Keep your personal customer connection with zero intermediaries.',
              category: 'feature',
              badge_label: 'Top Feature',
              action_url: '/orders',
              action_label: 'View Orders',
              is_pinned: 0,
              is_active: 1,
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: 'ann_zero_commission',
              title: 'A note from FeraSetu: 0% marketplace commission always',
              content: 'FeraSetu was built to protect local shopkeepers. We never take a percentage of your sales. 100% of customer payments go directly to your UPI or bank account.',
              category: 'message',
              badge_label: 'From FeraSetu',
              action_url: '/dashboard',
              action_label: 'Go to Dashboard',
              is_pinned: 1,
              is_active: 1,
              created_at: new Date(Date.now() - 7200000).toISOString(),
            },
            {
              id: 'ann_languages',
              title: 'Run your shop in your customer’s native language',
              content: 'Your storefront now supports 48 Indic languages including Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, and Punjabi. Buyers can shop comfortably in their preferred language.',
              category: 'update',
              badge_label: 'Platform Update',
              action_url: '/products',
              action_label: 'View Products',
              is_pinned: 0,
              is_active: 1,
              created_at: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              id: 'ann_ai_copy',
              title: 'Fera AI drafts product titles & details in seconds',
              content: 'Add new items to your catalog in seconds. Take a quick photo or type a short item name, and Fera AI generates ready-to-sell titles, descriptions, and regional tags.',
              category: 'feature',
              badge_label: 'Fera AI',
              action_url: '/ferasetu-ai',
              action_label: 'Try Fera AI',
              is_pinned: 0,
              is_active: 1,
              created_at: new Date(Date.now() - 172800000).toISOString(),
            },
            {
              id: 'ann_custom_domains',
              title: 'Connect your own custom shop web address',
              content: 'You can now link your own custom domain (e.g., yourstore.com or yourbrand.in) to your FeraSetu shop with automatic HTTPS encryption and mail-safe DNS record protection.',
              category: 'update',
              badge_label: 'Domain Upgrade',
              action_url: '/settings/email',
              action_label: 'Manage Domains',
              is_pinned: 0,
              is_active: 1,
              created_at: new Date(Date.now() - 259200000).toISOString(),
            },
          ],
        };
      }
    },
    staleTime: 60000,
  });

  const announcements = useMemo(() => data?.announcements || [], [data]);

  const unreadCount = useMemo(() => {
    return announcements.filter(a => !readIds.has(a.id)).length;
  }, [announcements, readIds]);

  const markAsRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const markAllAsRead = () => {
    const allIds = announcements.map(a => a.id);
    const next = new Set(allIds);
    setReadIds(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {}
  };

  return {
    announcements,
    unreadCount,
    readIds,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

interface FeraSetuUpdatesCenterProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  announcements: Announcement[];
  readIds: Set<string>;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function FeraSetuUpdatesCenter({
  isOpen,
  onClose,
  unreadCount,
  announcements,
  readIds,
  onMarkAsRead,
  onMarkAllAsRead,
}: FeraSetuUpdatesCenterProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'features' | 'messages'>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (selectedAnnouncement) {
          setSelectedAnnouncement(null);
        } else {
          onClose();
        }
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedAnnouncement, onClose]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      // Delay slightly to prevent immediate closing from the trigger button
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredAnnouncements = announcements.filter(item => {
    if (filter === 'features') {
      return item.category === 'feature' || item.category === 'update';
    }
    if (filter === 'messages') {
      return item.category === 'message' || item.category === 'tip';
    }
    return true;
  });

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'feature':
        return {
          pill: 'bg-blue-50 text-[#0052FF] border border-blue-200/70',
          dot: 'bg-[#0052FF]',
          icon: <Sparkles size={12} className="text-[#0052FF]" />,
        };
      case 'message':
        return {
          pill: 'bg-amber-50 text-amber-800 border border-amber-200/70',
          dot: 'bg-amber-500',
          icon: <Megaphone size={12} className="text-amber-700" />,
        };
      case 'update':
        return {
          pill: 'bg-emerald-50 text-emerald-800 border border-emerald-200/70',
          dot: 'bg-emerald-500',
          icon: <Layers size={12} className="text-emerald-700" />,
        };
      default:
        return {
          pill: 'bg-slate-100 text-slate-800 border border-slate-200',
          dot: 'bg-slate-500',
          icon: <Info size={12} className="text-slate-600" />,
        };
    }
  };

  const handleActionClick = (url?: string) => {
    if (!url) return;
    onClose();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Center / Dropdown Drawer */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="FeraSetu Updates & Messages"
        aria-modal="true"
        className="fixed inset-x-3 bottom-3 top-auto sm:top-16 sm:bottom-auto sm:right-6 sm:left-auto sm:w-[430px] z-50 flex max-h-[85vh] sm:max-h-[600px] flex-col rounded-2xl border border-[#E5EAF1] bg-white shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAF1] px-5 py-4 bg-gradient-to-r from-white via-white to-blue-50/30 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0052FF]">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#152238]">FeraSetu Updates</h3>
                {unreadCount > 0 && (
                  <span className="flex items-center rounded-full bg-[#E5484D] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#667085]">
                New features, improvements & team notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#0052FF] hover:bg-blue-50 transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#667085] hover:bg-slate-100 hover:text-[#152238] transition-colors cursor-pointer"
              aria-label="Close updates menu"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[#E5EAF1] bg-[#F6F8FC] px-4 py-2">
          {[
            { id: 'all', label: 'All Updates', count: announcements.length },
            {
              id: 'features',
              label: 'New Features',
              count: announcements.filter(a => a.category === 'feature' || a.category === 'update').length,
            },
            {
              id: 'messages',
              label: 'From Team',
              count: announcements.filter(a => a.category === 'message' || a.category === 'tip').length,
            },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-[#0052FF] shadow-xs'
                  : 'text-[#667085] hover:bg-white/60 hover:text-[#152238]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  filter === tab.id ? 'bg-blue-100 text-[#0052FF]' : 'bg-[#E5EAF1] text-[#667085]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* List of Updates & Messages */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E5EAF1]/70 p-2 min-h-[220px]">
          {filteredAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[#667085] mb-3">
                <Bell size={22} />
              </div>
              <h4 className="text-sm font-bold text-[#152238] mb-1">You’re all caught up</h4>
              <p className="text-xs text-[#667085] max-w-xs">
                No updates under this category right now. We’ll notify you here whenever new tools or announcements are ready.
              </p>
            </div>
          ) : (
            filteredAnnouncements.map(item => {
              const isRead = readIds.has(item.id);
              const theme = getCategoryTheme(item.category);
              const isPinned = Boolean(item.is_pinned);

              return (
                <article
                  key={item.id}
                  onClick={() => {
                    onMarkAsRead(item.id);
                    setSelectedAnnouncement(item);
                  }}
                  className={`group relative flex flex-col gap-2 rounded-xl p-3.5 transition-colors cursor-pointer ${
                    isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/30 hover:bg-blue-50/50'
                  }`}
                >
                  {/* Top metadata row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!isRead && (
                        <span
                          className="h-2 w-2 rounded-full bg-[#0052FF] ring-2 ring-blue-100 shrink-0"
                          title="Unread"
                        />
                      )}
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${theme.pill}`}>
                        {theme.icon}
                        {item.badge_label || item.category}
                      </span>
                      {isPinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#667085]">
                          <Pin size={11} className="text-[#667085]" />
                          Pinned
                        </span>
                      )}
                    </div>
                    <time className="text-[11px] font-medium text-[#667085]">
                      {formatRelativeTime(item.created_at)}
                    </time>
                  </div>

                  {/* Title & snippet */}
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-bold text-[#152238] group-hover:text-[#0052FF] transition-colors leading-snug">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-xs text-[#475467] line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  {/* Quick Action Button if present */}
                  {item.action_url && item.action_label && (
                    <div className="mt-1 flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(item.id);
                          handleActionClick(item.action_url);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0052FF] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-600 transition-colors cursor-pointer"
                      >
                        <span>{item.action_label}</span>
                        <ArrowRight size={13} />
                      </button>

                      <span className="text-[11px] font-semibold text-[#667085] flex items-center gap-1 group-hover:text-[#0052FF]">
                        Details <ChevronRight size={13} />
                      </span>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E5EAF1] bg-[#F6F8FC] px-4 py-3 rounded-b-2xl">
          <div className="flex items-center gap-1.5 text-[11px] text-[#667085]">
            <ShieldCheck size={14} className="text-[#0052FF]" />
            <span>FeraSetu 0% Commission Platform</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/survey-feedback');
            }}
            className="text-[11px] font-semibold text-[#0052FF] hover:underline cursor-pointer"
          >
            Suggest a feature
          </button>
        </div>
      </div>

      {/* Full Detail Modal (when an announcement is opened) */}
      {selectedAnnouncement && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#E5EAF1] bg-white p-6 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5EAF1] pb-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold ${getCategoryTheme(selectedAnnouncement.category).pill}`}>
                    {selectedAnnouncement.badge_label || selectedAnnouncement.category}
                  </span>
                  <span className="text-xs text-[#667085]">
                    {formatRelativeTime(selectedAnnouncement.created_at)}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#152238] leading-tight">
                  {selectedAnnouncement.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#667085] hover:bg-slate-100 hover:text-[#152238] cursor-pointer"
                aria-label="Close detail view"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-[#344054] leading-relaxed py-2">
              <p className="whitespace-pre-line">{selectedAnnouncement.content}</p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E5EAF1] pt-4">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-xl border border-[#E5EAF1] bg-white px-4 py-2.5 text-xs font-semibold text-[#344054] hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              {selectedAnnouncement.action_url && selectedAnnouncement.action_label && (
                <button
                  type="button"
                  onClick={() => {
                    const url = selectedAnnouncement.action_url;
                    setSelectedAnnouncement(null);
                    onClose();
                    handleActionClick(url);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#0052FF] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  <span>{selectedAnnouncement.action_label}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

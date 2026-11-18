import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquare,
  HelpCircle,
  Search,
  Plus,
  ThumbsUp,
  MessageCircle,
  Share2,
  Pin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter,
  Users,
  Store,
  ExternalLink,
  ShieldCheck,
  Send,
  X,
  Award,
  Languages,
  RotateCcw,
  Clock,
  Check,
  Hash,
  ChevronRight,
  Sparkle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  translateBatchAsync,
  getCachedTranslation,
  detectScriptLanguage
} from '../services/translationPipeline';
import SEO from '../components/SEO';
import api from '../services/api';

export interface CommunityReply {
  id?: string;
  author: string;
  storeName: string;
  text: string;
  time: string;
  sourceLang?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  adminBadge?: string;
}

export interface DiscussionItem {
  id: string;
  channel?: string;
  category: string;
  title: string;
  body: string;
  author: string;
  storeName: string;
  locality: string;
  sourceLang?: string;
  status?: 'open' | 'approved' | 'planned' | 'in_progress' | 'implemented' | 'under_review';
  adminNote?: string | null;
  createdAt: string;
  upvotes: number;
  replyCount: number;
  isStaffVerified?: boolean;
  isPinned?: boolean;
  hasUserUpvoted?: boolean;
  replies?: CommunityReply[];
}

const CHANNELS = [
  { id: 'all', name: 'all-channels', label: 'All Channels', icon: Hash, desc: 'Every community conversation' },
  { id: 'announcements', name: 'announcements', label: '📢 announcements', icon: Hash, desc: 'Official updates from FeraSetu team' },
  { id: 'feature-requests', name: 'feature-requests', label: '💡 feature-requests', icon: Hash, desc: 'Suggest & vote on approved features' },
  { id: 'questions-and-help', name: 'questions-and-help', label: '❓ questions-and-help', icon: Hash, desc: 'Shopkeeper Q&A and setup help' },
  { id: 'payments', name: 'payments-and-upi', label: '💳 payments-and-upi', icon: Hash, desc: 'UPI auto-sweep, soundbox & 0% fee tips' },
  { id: 'domains', name: 'domains-and-dns', label: '🌐 domains-and-dns', icon: Hash, desc: 'Custom storefront URLs & DNS routing' },
  { id: 'general', name: 'general-chat', label: '💬 general-chat', icon: Hash, desc: 'Open discussion with fellow merchants' },
];

export const INITIAL_DISCUSSIONS: DiscussionItem[] = [
  {
    id: 'disc-1',
    channel: 'announcements',
    category: 'Announcements',
    title: 'FeraSetu 0% Commission Direct Settlement Engine & Multi-Store Inventory Launch',
    body: 'We have deployed the new T+0 direct UPI bank sweep mechanism. All merchant sales now route directly into your linked ICICI/HDFC bank account with zero platform toll or holding periods.',
    author: 'FeraSetu Core Team',
    storeName: 'Platform Engineering',
    locality: 'Bengaluru / Mumbai',
    sourceLang: 'en',
    status: 'implemented',
    adminNote: 'Deployed globally across all 48 regions. Zero marketplace commissions verified.',
    createdAt: '2 days ago',
    upvotes: 84,
    replyCount: 16,
    isStaffVerified: true,
    isPinned: true,
    replies: [
      {
        id: 'rep-1',
        author: 'Ramesh Sundaram',
        storeName: 'Sundaram Provision Store',
        text: 'The instant QR auto-sweep worked seamlessly during our morning rush! Zero deduction on ₹14,200.',
        time: '1 day ago',
        sourceLang: 'en',
        isVerified: true,
        isAdmin: false,
      },
    ],
  },
  {
    id: 'disc-2',
    channel: 'feature-requests',
    category: 'Feature Requests',
    title: 'Voice-assisted multi-item barcode lookup with Hindi & Telugu number pronunciation',
    body: 'నా షాపులో కౌంటర్ వద్ద ఐటెమ్ స్కాన్ చేసిన వెంటనే ధర మరియు పేరును తెలుగులో లేదా హిందీలో గట్టిగా వినిపించేలా సౌండ్‌బాక్స్ ఇంటిగ్రేషన్ కావాలి. దీనివల్ల కస్టమర్ కూడా నమ్మకంగా ఉంటారు.',
    author: 'K. Venkatesh Rao',
    storeName: 'Venkateshwara Super Bazaar',
    locality: 'Guntur, Andhra Pradesh',
    sourceLang: 'te', // Telugu input!
    status: 'approved',
    adminNote: 'Feature Approved by Core Team! We approved this feature and will make it better by adding low-latency Bluetooth soundbox & thermal printer sync.',
    createdAt: '4 hours ago',
    upvotes: 62,
    replyCount: 5,
    isStaffVerified: true,
    isPinned: true,
    replies: [
      {
        id: 'rep-2-1',
        author: 'FeraSetu Admin',
        storeName: 'Platform Engineering',
        text: 'This feature has been officially approved! We are designing it to announce both total amount and itemized name in Telugu and Hindi automatically.',
        time: '2 hours ago',
        sourceLang: 'en',
        isVerified: true,
        isAdmin: true,
        adminBadge: 'Core Team',
      },
      {
        id: 'rep-2-2',
        author: 'John Miller',
        storeName: 'Miller Corner Goods (USA)',
        text: 'This would be huge for busy retail counters! When cashiers scan items quickly, the audio confirmation prevents missed items and speeds up checkout.',
        time: '1 hour ago',
        sourceLang: 'en',
        isVerified: true,
        isAdmin: false,
      },
    ],
  },
  {
    id: 'disc-3',
    channel: 'domains',
    category: 'Domains & DNS',
    title: 'How do I map my custom Namecheap / GoDaddy domain without breaking existing WhatsApp catalog links?',
    body: 'I bought my brand domain on Namecheap and want to point it to FeraSetu. Will my existing customers who saved my .ferasetu.store link on WhatsApp get 404 errors during DNS propagation?',
    author: 'Himmat Patel',
    storeName: 'Himmat General Store',
    locality: 'Vasai West, Mumbai',
    sourceLang: 'en',
    status: 'approved',
    adminNote: 'Feature Approved: Dual wildcard DNS routing keeps existing links alive permanently without breaking.',
    createdAt: '3 hours ago',
    upvotes: 42,
    replyCount: 4,
    isStaffVerified: true,
    replies: [
      {
        id: 'rep-3-1',
        author: 'Suresh M.',
        storeName: 'Parel Grocers',
        text: 'No 404 at all! FeraSetu keeps your native subdomain alive as a wildcard fallback. Set your CNAME to shops.ferasetu.store with TTL 300 and both links will route simultaneously.',
        time: '2 hours ago',
        sourceLang: 'en',
        isVerified: true,
      },
    ],
  },
  {
    id: 'disc-4',
    channel: 'payments',
    category: 'Payments & Soundbox',
    title: 'Managing pay-later khata balances: Do you send weekly reminders or order-by-order nudges?',
    body: 'We have about 30 regulars who take items on weekly credit. What has been the most polite, effective way to request settlement without feeling transactional?',
    author: 'Sunita Verma',
    storeName: 'Verma Organics & Kirana',
    locality: 'Kothrud, Pune',
    sourceLang: 'en',
    status: 'open',
    createdAt: '5 hours ago',
    upvotes: 38,
    replyCount: 8,
    replies: [
      {
        id: 'rep-4-1',
        author: 'Aarav Sharma',
        storeName: 'Sharma Superstore',
        text: 'The built-in "Nudge on WhatsApp" button in the Operations Dashboard has been golden. It sends a polite greeting in Hindi with their exact itemized bill and dynamic UPI link. 90% pay within 15 minutes.',
        time: '3 hours ago',
        sourceLang: 'en',
        isVerified: false,
      },
    ],
  },
];

interface DiscussionTranslation {
  title: string;
  body: string;
  adminNote?: string;
  replies: Record<number, string>;
}

export default function CommunityPage() {
  const { user } = useAuth();
  // Language selected during onboarding or from profile (e.g. 'en', 'te', 'hi', 'ta', 'es')
  const { language, tDynamic } = useLanguage();

  const [discussions, setDiscussions] = useState<DiscussionItem[]>(() => {
    try {
      const saved = localStorage.getItem('fera_community_discussions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_DISCUSSIONS;
  });

  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeThread, setActiveThread] = useState<DiscussionItem | null>(null);

  // Translation pipeline state
  const [translatedMap, setTranslatedMap] = useState<Record<string, DiscussionTranslation>>({});
  const [originalOverrides, setOriginalOverrides] = useState<Set<string>>(new Set());
  const [isTranslatingCommunity, setIsTranslatingCommunity] = useState(false);

  // New post modal
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newChannel, setNewChannel] = useState('feature-requests');
  const [newCategory, setNewCategory] = useState('Feature Requests');

  // Reply bar state
  const [replyText, setReplyText] = useState('');

  // Persist locally
  useEffect(() => {
    try {
      localStorage.setItem('fera_community_discussions', JSON.stringify(discussions));
    } catch {}
  }, [discussions]);

  // Sync active thread with discussions list updates
  useEffect(() => {
    if (activeThread) {
      const updated = discussions.find(d => d.id === activeThread.id);
      if (updated) setActiveThread(updated);
    }
  }, [discussions]);

  // Fetch discussions from backend if available
  useEffect(() => {
    api.get(`/community/discussions?targetLang=${language}`)
      .then(res => {
        if (res.data?.discussions && Array.isArray(res.data.discussions) && res.data.discussions.length > 0) {
          setDiscussions(res.data.discussions);
        }
      })
      .catch(() => {
        // graceful offline fallback to local state
      });
  }, [language]);

  // ── MULTI-LINGUAL ASYNC TRANSLATION PIPELINE ─────────────────────────────────
  // Translates ANY post or comment where author's sourceLang !== viewing user's language
  // (e.g. Telugu post -> English for US user; English reply -> Telugu for Telugu user)
  useEffect(() => {
    let isMounted = true;
    const textsToTranslate: string[] = [];
    const mapping: Array<{
      discId: string;
      field: 'title' | 'body' | 'adminNote' | 'reply';
      replyIdx?: number;
      sourceLang: string;
    }> = [];

    discussions.forEach((disc) => {
      const existing = translatedMap[disc.id];
      const discSourceLang = disc.sourceLang || detectScriptLanguage(disc.title + ' ' + disc.body, 'en');

      // If discussion was written in a language DIFFERENT from current user's language
      if (discSourceLang !== language) {
        if (!existing?.title) {
          textsToTranslate.push(disc.title);
          mapping.push({ discId: disc.id, field: 'title', sourceLang: discSourceLang });
        }
        if (!existing?.body) {
          textsToTranslate.push(disc.body);
          mapping.push({ discId: disc.id, field: 'body', sourceLang: discSourceLang });
        }
      }

      if (disc.adminNote) {
        const noteSourceLang = detectScriptLanguage(disc.adminNote, 'en');
        if (noteSourceLang !== language && !existing?.adminNote) {
          textsToTranslate.push(disc.adminNote);
          mapping.push({ discId: disc.id, field: 'adminNote', sourceLang: noteSourceLang });
        }
      }

      if (disc.replies) {
        disc.replies.forEach((rep, rIdx) => {
          const repSourceLang = rep.sourceLang || detectScriptLanguage(rep.text, 'en');
          if (repSourceLang !== language && !existing?.replies?.[rIdx]) {
            textsToTranslate.push(rep.text);
            mapping.push({ discId: disc.id, field: 'reply', replyIdx: rIdx, sourceLang: repSourceLang });
          }
        });
      }
    });

    if (textsToTranslate.length === 0) return;

    setIsTranslatingCommunity(true);

    translateBatchAsync(textsToTranslate, language, 'community')
      .then((translations) => {
        if (!isMounted) return;

        setTranslatedMap((prev) => {
          const next = { ...prev };
          mapping.forEach((mapItem, idx) => {
            const trans = translations[idx];
            if (!trans) return;

            if (!next[mapItem.discId]) {
              next[mapItem.discId] = { title: '', body: '', replies: {} };
            }

            if (mapItem.field === 'title') {
              next[mapItem.discId].title = trans;
            } else if (mapItem.field === 'body') {
              next[mapItem.discId].body = trans;
            } else if (mapItem.field === 'adminNote') {
              next[mapItem.discId].adminNote = trans;
            } else if (mapItem.field === 'reply' && mapItem.replyIdx !== undefined) {
              next[mapItem.discId].replies[mapItem.replyIdx] = trans;
            }
          });

          return next;
        });
      })
      .catch((err) => {
        console.warn('[FeraSetu Community] Cross-translation pipeline error:', err);
      })
      .finally(() => {
        if (isMounted) setIsTranslatingCommunity(false);
      });

    return () => {
      isMounted = false;
    };
  }, [discussions, language]);

  // Toggle individual override to view original or translation
  const toggleIndividualOverride = (key: string) => {
    setOriginalOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Helper getters for translated text with fallback
  const getDisplayTitle = (item: DiscussionItem) => {
    const itemLang = item.sourceLang || detectScriptLanguage(item.title, 'en');
    if (itemLang === language) return item.title;

    const isOverridden = originalOverrides.has(`disc_${item.id}`);
    if (!isOverridden) {
      return translatedMap[item.id]?.title || getCachedTranslation(item.title, language, 'community', itemLang) || item.title;
    }
    return item.title;
  };

  const getDisplayBody = (item: DiscussionItem) => {
    const itemLang = item.sourceLang || detectScriptLanguage(item.body, 'en');
    if (itemLang === language) return item.body;

    const isOverridden = originalOverrides.has(`disc_${item.id}`);
    if (!isOverridden) {
      return translatedMap[item.id]?.body || getCachedTranslation(item.body, language, 'community', itemLang) || item.body;
    }
    return item.body;
  };

  const getDisplayAdminNote = (item: DiscussionItem) => {
    if (!item.adminNote) return null;
    const noteLang = detectScriptLanguage(item.adminNote, 'en');
    if (noteLang === language) return item.adminNote;

    const isOverridden = originalOverrides.has(`admin_note_${item.id}`);
    if (!isOverridden) {
      return translatedMap[item.id]?.adminNote || getCachedTranslation(item.adminNote, language, 'community', noteLang) || item.adminNote;
    }
    return item.adminNote;
  };

  const getDisplayReply = (discId: string, replyIdx: number, rep: CommunityReply) => {
    const repLang = rep.sourceLang || detectScriptLanguage(rep.text, 'en');
    if (repLang === language) return rep.text;

    const isOverridden = originalOverrides.has(`reply_${discId}_${replyIdx}`);
    if (!isOverridden) {
      return (
        translatedMap[discId]?.replies?.[replyIdx] ||
        getCachedTranslation(rep.text, language, 'community', repLang) ||
        rep.text
      );
    }
    return rep.text;
  };

  // Upvote Action
  const handleToggleUpvote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDiscussions((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const upvoted = !d.hasUserUpvoted;
          return {
            ...d,
            hasUserUpvoted: upvoted,
            upvotes: upvoted ? d.upvotes + 1 : d.upvotes - 1,
          };
        }
        return d;
      })
    );
  };

  // Add Reply Action
  const handleAddReply = async (discussionId: string) => {
    if (!replyText.trim()) return;

    const userAuthor = user?.name || 'Shopkeeper';
    const userStore = user?.business_name || 'My Local Store';
    const text = replyText.trim();
    const repLang = detectScriptLanguage(text, language);

    const newReply: CommunityReply = {
      id: `rep-${Date.now()}`,
      author: userAuthor,
      storeName: userStore,
      text,
      time: 'Just now',
      sourceLang: repLang,
      isVerified: Boolean(user?.is_verified),
      isAdmin: false,
    };

    setDiscussions((prev) =>
      prev.map((d) => {
        if (d.id === discussionId) {
          return {
            ...d,
            replyCount: (d.replyCount || 0) + 1,
            replies: [...(d.replies || []), newReply],
          };
        }
        return d;
      })
    );

    setReplyText('');
    toast.success('Your reply has been posted to the community thread!');

    // Post to backend asynchronously
    try {
      await api.post(`/community/discussions/${discussionId}/replies`, {
        text,
        author: userAuthor,
        storeName: userStore,
        userLang: repLang,
      });
    } catch {}
  };

  // Create Post Action
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) {
      toast.error('Please enter a headline and details');
      return;
    }

    const title = newTitle.trim();
    const body = newBody.trim();
    const postLang = detectScriptLanguage(title + ' ' + body, language);

    const newPost: DiscussionItem = {
      id: `disc-${Date.now()}`,
      channel: newChannel,
      category: newCategory,
      title,
      body,
      author: user?.name || 'Local Retailer',
      storeName: user?.business_name || 'My Store',
      locality: user?.city || 'Local Area',
      sourceLang: postLang,
      status: 'open',
      createdAt: 'Just now',
      upvotes: 1,
      replyCount: 0,
      hasUserUpvoted: true,
      replies: [],
    };

    setDiscussions((prev) => [newPost, ...prev]);
    setShowNewPostModal(false);
    setNewTitle('');
    setNewBody('');
    toast.success('Your discussion has been shared across the merchant network!');

    try {
      await api.post('/community/discussions', {
        title,
        body,
        category: newCategory,
        channel: newChannel,
        author: newPost.author,
        storeName: newPost.storeName,
        locality: newPost.locality,
        userLang: postLang,
      });
    } catch {}
  };

  // Filter discussions
  const filteredDiscussions = useMemo(() => {
    let list = [...discussions];
    if (selectedChannel !== 'all') {
      list = list.filter((d) => d.channel === selectedChannel);
    }
    if (selectedStatus !== 'all') {
      list = list.filter((d) => d.status === selectedStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.body.toLowerCase().includes(q) ||
          d.author.toLowerCase().includes(q) ||
          d.storeName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [discussions, selectedChannel, selectedStatus, searchQuery]);

  const getStatusBadge = (status?: DiscussionItem['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Feature Approved
          </span>
        );
      case 'planned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} className="text-blue-600" />
            Planned
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles size={12} className="text-purple-600" />
            In Progress
          </span>
        );
      case 'implemented':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-800 border border-green-200">
            <Check size={12} className="text-green-600" />
            Shipped / Live
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <HelpCircle size={12} className="text-amber-600" />
            Under Review
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <SEO
        title="Merchant Community & Knowledge Hub — FeraSetu"
        description="Connect with independent business owners, suggest and track feature approvals, and discuss retail workflows with automatic language translation."
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none font-sans space-y-6">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-slate-500 mb-1">
              <span>FeraSetu Global Network</span>
              <span>/</span>
              <span className="text-orange-600 font-bold">Discord-Style Community</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Merchant Community & Feature Exchange
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Connect directly with independent shopkeepers across India and worldwide. Auto-translates between Telugu, Hindi, English, and 48 languages in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => setShowNewPostModal(true)}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Plus size={16} />
              <span>Suggest Feature / Ask Question</span>
            </button>
          </div>
        </header>

        {/* Translation Banner Callout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-orange-200 bg-orange-50/60 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold">
              <Languages size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900">
                  Real-Time Bi-Directional Auto-Translation Active
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-white border border-orange-200 text-orange-700">
                  Your Language: {language.toUpperCase()}
                </span>
                {isTranslatingCommunity && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600">
                    <Sparkles size={12} className="animate-spin text-orange-500" />
                    Translating feed...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                If a shopkeeper posts in Telugu, US users see it instantly in English. When you reply in English, the Telugu merchant reads it translated in Telugu!
              </p>
            </div>
          </div>
        </div>

        {/* Discord-Inspired 3-Column / 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Discord Channels Sidebar (3 cols) */}
          <aside className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 space-y-4">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Channels
              </div>
              <nav className="space-y-1">
                {CHANNELS.map((ch) => {
                  const isActive = selectedChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Hash size={15} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span className="truncate">{ch.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Status Filter */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Filter By Roadmap Status
              </div>
              <div className="space-y-1 text-xs">
                {[
                  { id: 'all', label: 'All Discussions' },
                  { id: 'approved', label: 'Approved Features ✅' },
                  { id: 'planned', label: 'Planned 🚀' },
                  { id: 'in_progress', label: 'In Progress ⚙️' },
                  { id: 'implemented', label: 'Shipped 🎉' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStatus(st.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                      selectedStatus === st.id
                        ? 'font-bold text-orange-600 bg-orange-50'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Merchant Community Rules */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-orange-500" />
                Zero Toll Invariant
              </span>
              <p className="leading-relaxed">
                FeraSetu charges 0% commission. All platform features suggested and approved here benefit independent shopkeepers globally.
              </p>
            </div>
          </aside>

          {/* Center / Right: Discussion Feed & Thread Panel (9 cols) */}
          <main className="lg:col-span-9 space-y-4">
            
            {/* Search Bar */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <Search size={16} className="text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, approved features, thermal printers, UPI settlement..."
                className="w-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              )}
            </div>

            {/* Discussion Feed Items */}
            <div className="space-y-4">
              {filteredDiscussions.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
                  No discussions found in this channel. Be the first to start one!
                </div>
              ) : (
                filteredDiscussions.map((disc) => {
                  const isThreadOpen = activeThread?.id === disc.id;
                  const itemLang = disc.sourceLang || detectScriptLanguage(disc.title, 'en');
                  const isTranslated = itemLang !== language;
                  const isOverridden = originalOverrides.has(`disc_${disc.id}`);

                  return (
                    <article
                      key={disc.id}
                      onClick={() => setActiveThread(isThreadOpen ? null : disc)}
                      className={`p-6 rounded-3xl bg-white border transition-all cursor-pointer ${
                        isThreadOpen
                          ? 'border-orange-500 shadow-lg ring-2 ring-orange-500/10'
                          : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Top Meta Header */}
                      <div className="flex items-center justify-between gap-3 mb-3">
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
                          {isTranslated && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                              <Languages size={10} />
                              {isOverridden ? `Original (${itemLang.toUpperCase()})` : `Auto-translated to ${language.toUpperCase()}`}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 shrink-0">{disc.createdAt}</span>
                      </div>

                      {/* Title */}
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-2">
                        {getDisplayTitle(disc)}
                      </h2>

                      {/* Body */}
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">
                        {getDisplayBody(disc)}
                      </p>

                      {/* Translation Toggle if original language differs */}
                      {isTranslated && (
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleIndividualOverride(`disc_${disc.id}`);
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                          >
                            <RotateCcw size={12} />
                            {isOverridden
                              ? `Show translated in ${language.toUpperCase()}`
                              : `Show original ${itemLang === 'te' ? 'Telugu' : itemLang === 'hi' ? 'Hindi' : itemLang.toUpperCase()}`}
                          </button>
                        </div>
                      )}

                      {/* Official Admin Note / Decision Banner ("tell this feature will be approve and make it better") */}
                      {disc.adminNote && (
                        <div className="mb-4 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-800 uppercase text-[10px] tracking-wider">
                            <ShieldCheck size={14} className="text-emerald-600" />
                            Official FeraSetu Engineering & Roadmap Note
                          </div>
                          <p className="text-emerald-900 leading-relaxed font-medium">
                            {getDisplayAdminNote(disc)}
                          </p>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {disc.author.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">{disc.author}</span>
                          <span>•</span>
                          <span className="text-slate-500">{disc.storeName} ({disc.locality})</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={(e) => handleToggleUpvote(disc.id, e)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              disc.hasUserUpvoted
                                ? 'bg-orange-50 text-orange-600 font-bold'
                                : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <ThumbsUp size={13} className={disc.hasUserUpvoted ? 'text-orange-600 fill-orange-500/20' : ''} />
                            <span>{disc.upvotes}</span>
                          </button>

                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <MessageCircle size={14} />
                            <span>{disc.replyCount || disc.replies?.length || 0} Replies</span>
                          </span>
                        </div>
                      </div>

                      {/* Expanded Thread Drawer / Discord Comments */}
                      {isThreadOpen && (
                        <div
                          className="mt-5 pt-5 border-t border-slate-100 space-y-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Community Discussion Thread ({disc.replies?.length || 0})
                          </div>

                          {/* Replies List */}
                          <div className="space-y-3">
                            {(!disc.replies || disc.replies.length === 0) ? (
                              <div className="text-xs text-slate-400 py-3 italic">
                                No replies yet. Start the conversation below!
                              </div>
                            ) : (
                              disc.replies.map((rep, rIdx) => {
                                const repLang = rep.sourceLang || detectScriptLanguage(rep.text, 'en');
                                const isRepTranslated = repLang !== language;
                                const isRepOverridden = originalOverrides.has(`reply_${disc.id}_${rIdx}`);

                                return (
                                  <div
                                    key={rep.id || rIdx}
                                    className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                                      rep.isAdmin
                                        ? 'bg-orange-50/70 border border-orange-200 text-orange-950'
                                        : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">{rep.author}</span>
                                        <span className="text-slate-400 font-normal">({rep.storeName})</span>
                                        {rep.isAdmin && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-md text-[10px] font-bold bg-orange-500 text-white">
                                            <ShieldCheck size={10} />
                                            Admin Core Team
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400">{rep.time}</span>
                                    </div>

                                    <p className="text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                                      {getDisplayReply(disc.id, rIdx, rep)}
                                    </p>

                                    {isRepTranslated && (
                                      <div className="pt-1">
                                        <button
                                          type="button"
                                          onClick={() => toggleIndividualOverride(`reply_${disc.id}_${rIdx}`)}
                                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                        >
                                          <RotateCcw size={10} />
                                          {isRepOverridden
                                            ? `Show translated (${language.toUpperCase()})`
                                            : `Show original (${repLang.toUpperCase()})`}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Discord-style Reply Input Bar */}
                          <div className="pt-2 flex gap-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to #${disc.channel || 'discussion'} in ${language.toUpperCase()}...`}
                              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddReply(disc.id);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddReply(disc.id)}
                              disabled={!replyText.trim()}
                              className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                            >
                              <Send size={14} />
                              <span>Reply</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>

          </main>

        </div>

        {/* Suggest Feature / Ask Question Modal */}
        {showNewPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">
                  Suggest Feature or Ask Question
                </h3>
                <button onClick={() => setShowNewPostModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Select Channel
                  </label>
                  <select
                    value={newChannel}
                    onChange={(e) => {
                      setNewChannel(e.target.value);
                      const match = CHANNELS.find(c => c.id === e.target.value);
                      if (match) setNewCategory(match.label);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                  >
                    <option value="feature-requests">#feature-requests (Request new tools)</option>
                    <option value="questions-and-help">#questions-and-help (Setup & troubleshooting)</option>
                    <option value="payments">#payments (UPI & Soundbox)</option>
                    <option value="domains">#domains (Custom URLs & DNS)</option>
                    <option value="general">#general (General retailer discussion)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Headline / Feature Idea
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Can we have automated weekly WhatsApp customer credit summaries?"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Details (Type in any language — Telugu, Hindi, English, etc.)
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Describe how this feature works for your shop. You can write in your native language comfortable for you..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNewPostModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition"
                  >
                    Publish to Community
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

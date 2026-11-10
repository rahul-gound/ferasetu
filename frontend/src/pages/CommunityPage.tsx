import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  HelpCircle,
  Search,
  Plus,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

interface DiscussionItem {
  id: string;
  title: string;
  body: string;
  author: string;
  storeName: string;
  locality: string;
  category: string;
  createdAt: string;
  upvotes: number;
  replyCount: number;
  isStaffVerified?: boolean;
  isPinned?: boolean;
  hasUserUpvoted?: boolean;
  replies?: Array<{
    author: string;
    storeName: string;
    text: string;
    time: string;
    isVerified?: boolean;
  }>;
}

const INITIAL_DISCUSSIONS: DiscussionItem[] = [
  {
    id: 'disc-1',
    title: 'FeraSetu 0% Commission Direct Settlement Engine & Multi-Store Inventory Launch',
    body: 'We have deployed the new T+0 direct UPI bank sweep mechanism. All merchant sales now route directly into your linked ICICI/HDFC bank account with zero platform toll or holding periods.',
    author: 'FeraSetu Core Team',
    storeName: 'Platform Engineering',
    locality: 'Bengaluru / Mumbai',
    category: 'Announcements',
    createdAt: '2 days ago',
    upvotes: 84,
    replyCount: 16,
    isStaffVerified: true,
    isPinned: true,
    replies: [
      {
        author: 'Ramesh Sundaram',
        storeName: 'Sundaram Provision Store',
        text: 'The instant QR auto-sweep worked seamlessly during our morning rush! Zero deduction on ₹14,200.',
        time: '1 day ago',
        isVerified: true,
      },
    ],
  },
  {
    id: 'disc-2',
    title: 'How do I map my custom Namecheap / GoDaddy domain without breaking existing WhatsApp catalog links?',
    body: 'I bought my brand domain on Namecheap and want to point it to FeraSetu. Will my existing customers who saved my .ferasetu.store link on WhatsApp get 404 errors during DNS propagation?',
    author: 'Himmat Patel',
    storeName: 'Himmat General Store',
    locality: 'Vasai West, Mumbai',
    category: 'Domains & DNS',
    createdAt: '3 hours ago',
    upvotes: 42,
    replyCount: 4,
    isStaffVerified: true,
    replies: [
      {
        author: 'Suresh M.',
        storeName: 'Parel Grocers',
        text: 'No 404 at all! FeraSetu keeps your native subdomain alive as a wildcard fallback. Set your CNAME to shops.ferasetu.store with TTL 300 and both links will route simultaneously.',
        time: '2 hours ago',
        isVerified: true,
      },
    ],
  },
  {
    id: 'disc-3',
    title: 'Managing pay-later khata balances: Do you send weekly reminders or order-by-order nudges?',
    body: 'We have about 30 regulars who take items on weekly credit. What has been the most polite, effective way to request settlement without feeling transactional?',
    author: 'Sunita Verma',
    storeName: 'Verma Organics & Kirana',
    locality: 'Kothrud, Pune',
    category: 'Payments & Soundbox',
    createdAt: '5 hours ago',
    upvotes: 38,
    replyCount: 8,
    replies: [
      {
        author: 'Aarav Sharma',
        storeName: 'Sharma Superstore',
        text: 'The built-in "Nudge on WhatsApp" button in the Operations Dashboard has been golden. It sends a polite greeting in Hindi with their exact itemized bill and dynamic UPI link. 90% pay within 15 minutes.',
        time: '3 hours ago',
        isVerified: false,
      },
    ],
  },
  {
    id: 'disc-4',
    title: 'How we scaled neighbourhood WhatsApp delivery orders from 15 to 80/day without Swiggy or Zomato commissions',
    body: 'Sharing our exact playbook: printed the FeraSetu countertop QR standee on cardstock and placed it on every delivery grocery bag with "Order direct on WhatsApp for ₹0 delivery fee". Customers loved dealing with us directly.',
    author: 'Anil Kumar',
    storeName: 'Surat Fresh & Textiles',
    locality: 'Ring Road, Surat',
    category: 'Local SEO',
    createdAt: '1 day ago',
    upvotes: 76,
    replyCount: 19,
    isStaffVerified: true,
    replies: [
      {
        author: 'Dr. Kabir Roy',
        storeName: 'Roy Health Foods',
        text: 'Did the exact same in Salt Lake. Saved over ₹18,000 in third-party aggregator commissions in October alone!',
        time: '18 hours ago',
        isVerified: true,
      },
    ],
  },
  {
    id: 'disc-5',
    title: 'Recommended Bluetooth thermal printer model for instant 58mm / 80mm counter bills?',
    body: 'Looking for a reliable printer that works with Android phones over Bluetooth and prints clean UPI QR codes at the bottom of the bill.',
    author: 'Preeti Nambiar',
    storeName: 'Nambiar Spices & Daily',
    locality: 'Panampilly Nagar, Kochi',
    category: 'Getting Started',
    createdAt: '2 days ago',
    upvotes: 27,
    replyCount: 6,
    replies: [
      {
        author: 'Gaurav Khandelwal',
        storeName: 'Jaipur Provisions',
        text: 'Everycom EC-58 or NGX N-58. Pair once in Bluetooth settings and the 1-Click Print Bill button handles standard ESC/POS commands instantly.',
        time: '1 day ago',
        isVerified: false,
      },
    ],
  },
];

const TOPICS = [
  'All Topics',
  'Announcements',
  'Getting Started',
  'Payments & Soundbox',
  'Inventory & Godown',
  'Domains & DNS',
  'Storefront Design',
  'Local SEO',
];

export default function CommunityPage() {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<DiscussionItem[]>(INITIAL_DISCUSSIONS);
  const [activeTab, setActiveTab] = useState<'discussions' | 'ideas' | 'showcase' | 'announcements'>('discussions');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'helpful' | 'verified'>('latest');

  // Modal State
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [modalMode, setModalMode] = useState<'discussion' | 'question'>('question');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('Payments & Soundbox');

  // Active reply thread
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Filtering & Sorting
  const filteredDiscussions = useMemo(() => {
    let list = [...discussions];

    if (activeTab === 'announcements') {
      list = list.filter((d) => d.category === 'Announcements');
    }

    if (selectedTopic !== 'All Topics') {
      list = list.filter((d) => d.category === selectedTopic);
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

    if (sortBy === 'helpful') {
      list.sort((a, b) => b.upvotes - a.upvotes);
    } else if (sortBy === 'verified') {
      list.sort((a, b) => (b.isStaffVerified ? 1 : 0) - (a.isStaffVerified ? 1 : 0));
    }

    return list;
  }, [discussions, activeTab, selectedTopic, searchQuery, sortBy]);

  // Actions
  const handleToggleUpvote = (id: string) => {
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

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) {
      toast.error('Please enter a title and description');
      return;
    }

    const newPost: DiscussionItem = {
      id: `disc-${Date.now()}`,
      title: newTitle.trim(),
      body: newBody.trim(),
      author: user?.name || 'Store Owner',
      storeName: user?.business_name || 'My Local Store',
      locality: user?.city || 'Local Neighborhood',
      category: newCategory,
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
    toast.success('Your post has been shared with the merchant community!');
  };

  const handleAddReply = (discussionId: string) => {
    if (!replyText.trim()) return;

    setDiscussions((prev) =>
      prev.map((d) => {
        if (d.id === discussionId) {
          const newReplies = d.replies || [];
          return {
            ...d,
            replyCount: d.replyCount + 1,
            replies: [
              ...newReplies,
              {
                author: user?.name || 'You',
                storeName: user?.business_name || 'My Store',
                text: replyText.trim(),
                time: 'Just now',
                isVerified: false,
              },
            ],
          };
        }
        return d;
      })
    );

    setReplyText('');
    setActiveReplyId(null);
    toast.success('Reply posted!');
  };

  return (
    <>
      <SEO
        title="Merchant Community & Knowledge Hub — FeraSetu"
        description="Connect with independent business owners, exchange operational workflows, ask questions, and share knowledge."
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none font-sans">
        {/* ── TOP BREADCRUMB & ACTION HEADER ───────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-slate-500">
              <span>Help &amp; Learning</span>
              <span>/</span>
              <span className="text-blue-600 font-bold">Community Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Merchant Community &amp; Knowledge Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Connect with fellow independent retailers, bodegas, and local merchants. Share real workflows, get instant answers from peers, and grow without platform commissions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setModalMode('discussion');
                setShowNewPostModal(true);
              }}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare size={15} />
              <span>Start Discussion</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalMode('question');
                setShowNewPostModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#0052FF] hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={15} />
              <span>Ask a Question</span>
            </button>
          </div>
        </header>

        {/* ── PRIMARY NAVIGATION SUB-TABS ─────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('discussions')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'discussions'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Discussions &amp; Q&amp;A</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-mono">
              {discussions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'announcements'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck size={14} className="text-blue-600" />
            <span>Official Announcements</span>
          </button>
        </div>

        {/* ── SEARCH & FILTER RIBBON ───────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions, solutions, Soundbox, GST, or DNS topics..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="latest">Latest First</option>
                <option value="helpful">Most Helpful (Upvoted)</option>
                <option value="verified">Staff Verified</option>
              </select>
            </div>
          </div>

          {/* Topic Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none text-xs">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium ${
                  selectedTopic === topic
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT (FEED + SIDEBAR) ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Feed Column (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {filteredDiscussions.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <HelpCircle size={32} className="mx-auto text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No discussions found
                </h3>
                <p className="text-xs text-slate-500">
                  Be the first to start a conversation or ask a question in this topic!
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                >
                  Ask Community
                </button>
              </div>
            ) : (
              filteredDiscussions.map((item) => (
                <article
                  key={item.id}
                  className={`bg-white dark:bg-slate-900 rounded-xl p-5 border transition-all ${
                    item.isPinned
                      ? 'border-blue-500/40 bg-blue-50/20 dark:bg-blue-900/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {item.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            <Pin size={10} />
                            Pinned
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.category}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {item.author}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          ({item.storeName})
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          • {item.createdAt}
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-slate-900 dark:text-white pt-1">
                        {item.title}
                      </h2>
                    </div>

                    {item.isStaffVerified && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded shrink-0"
                        title="Answer verified by FeraSetu engineering & retail specialists"
                      >
                        <CheckCircle2 size={13} />
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Body Text */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {item.body}
                  </p>

                  {/* Replies Preview */}
                  {item.replies && item.replies.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      {item.replies.map((reply, rIdx) => (
                        <div
                          key={rIdx}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {reply.author}{' '}
                              <span className="font-normal text-slate-500">
                                ({reply.storeName})
                              </span>
                            </span>
                            <span className="text-slate-400 font-mono">{reply.time}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 leading-snug">
                            {reply.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Reply Box if toggled */}
                  {activeReplyId === item.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your answer or operational advice..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddReply(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Send size={12} />
                        <span>Reply</span>
                      </button>
                    </div>
                  )}

                  {/* Item Footer Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleUpvote(item.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition-all ${
                          item.hasUserUpvoted
                            ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <ThumbsUp size={13} />
                        <span className="font-mono">{item.upvotes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveReplyId((prev) => (prev === item.id ? null : item.id))
                        }
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                      >
                        <MessageCircle size={13} />
                        <span className="font-mono">{item.replyCount} Replies</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Discussion link copied');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="Share discussion"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Right Rail Column (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Community Standards Box */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Shopkeeper Invariants</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                FeraSetu Community is a zero-slop space for independent merchants. No promotions, no vendor spam. Share operational tips, hardware guides, and verified tax/invoicing practices.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>100% Peer Verified</span>
                <span className="font-semibold text-blue-600">Zero Commission</span>
              </div>
            </div>

            {/* Weekly Merchant Spotlight */}
            <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-900/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  Weekly Spotlight
                </span>
                <Award size={16} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sunita Verma (Verma Organics, Pune)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Scaled daily neighbourhood recurring orders to ₹1.8L monthly direct UPI by using countertop QR standees and automatic Khata nudges.
                </p>
              </div>
            </div>

            {/* Trending Operational Tags */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Trending Topics
              </h3>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {['#UPISoundbox', '#DomainCNAME', '#GodownTransfers', '#ZeroCommission', '#GSTInvoicing', '#58mmPrinter'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSearchQuery(tag.replace('#', ''))}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CREATE DISCUSSION / QUESTION MODAL ─────────────────────────────── */}
      {showNewPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {modalMode === 'question' ? 'Ask a Question' : 'Start a Discussion'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPostModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  {TOPICS.filter((t) => t !== 'All Topics').map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. How do I configure GST rates for mixed grocery items?"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Details &amp; Context
                </label>
                <textarea
                  rows={4}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Describe your question or situation with specific context so fellow merchants can provide practical advice..."
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  Post to Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

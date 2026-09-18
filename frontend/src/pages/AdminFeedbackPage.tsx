import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  MessageSquare, Star, Search, RefreshCw, 
  Calendar, Building2, Mail, Phone,
  Sparkles, X, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

interface FeedbackItem {
  id: string;
  user_id?: string;
  name?: string;
  user_name?: string;
  email?: string;
  business_name?: string;
  shop_name?: string;
  phone?: string;
  rating?: number;
  category?: string;
  feedback_text?: string;
  comment?: string;
  answers?: any;
  ai_sentiment?: string;
  ai_summary?: string;
  created_at?: string;
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);

  const token = localStorage.getItem('token');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/feedback`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data.feedback || res.data.items || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Failed to load merchant feedback');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const filteredItems = items.filter(item => {
    const merchantName = (item.name || item.user_name || '').toLowerCase();
    const email = (item.email || '').toLowerCase();
    const business = (item.business_name || item.shop_name || '').toLowerCase();
    const text = (item.feedback_text || item.comment || '').toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = !q || merchantName.includes(q) || email.includes(q) || business.includes(q) || text.includes(q);

    if (!matchesSearch) return false;

    if (filterSentiment === 'all') return true;
    const sentiment = (item.ai_sentiment || '').toLowerCase();
    if (filterSentiment === 'positive') return sentiment.includes('pos') || (item.rating && item.rating >= 4);
    if (filterSentiment === 'negative') return sentiment.includes('neg') || (item.rating && item.rating <= 2);
    if (filterSentiment === 'neutral') return sentiment.includes('neu') || (item.rating === 3);
    return true;
  });

  // Calculate real metrics
  const totalSubmissions = items.length;
  const avgRating = totalSubmissions > 0
    ? (items.reduce((acc, curr) => acc + (curr.rating || 0), 0) / (items.filter(i => i.rating).length || 1)).toFixed(1)
    : 'N/A';
  const positiveCount = items.filter(i => (i.rating && i.rating >= 4) || (i.ai_sentiment && i.ai_sentiment.toLowerCase().includes('pos'))).length;
  const needsAttentionCount = items.filter(i => (i.rating && i.rating <= 2) || (i.ai_sentiment && i.ai_sentiment.toLowerCase().includes('neg'))).length;

  const parseAnswers = (answersRaw: any) => {
    if (!answersRaw) return null;
    if (typeof answersRaw === 'object') return answersRaw;
    try {
      return JSON.parse(answersRaw);
    } catch {
      return { response: String(answersRaw) };
    }
  };

  return (
    <AdminLayout title="Merchant Feedback & Surveys">
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <MessageSquare className="text-orange-500" size={28} />
              Merchant Feedback & Surveys
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">
              Direct voice of shopkeepers, NPS surveys, product requests, and AI-analyzed sentiments
            </p>
          </div>
          <button
            onClick={fetchFeedback}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-black text-slate-700 shadow-sm transition-all hover:bg-slate-50 self-start md:self-auto disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Responses
          </button>
        </div>

        {/* Real Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Submissions</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{totalSubmissions}</span>
              <span className="text-xs font-bold text-slate-500">responses</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Average Rating</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900">{avgRating}</span>
              {avgRating !== 'N/A' && (
                <div className="flex items-center text-amber-400">
                  <Star size={18} fill="currentColor" />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Positive Feedback</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600">{positiveCount}</span>
              <span className="text-xs font-bold text-slate-500">
                {totalSubmissions > 0 ? `(${Math.round((positiveCount / totalSubmissions) * 100)}%)` : ''}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Needs Attention</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-600">{needsAttentionCount}</span>
              <span className="text-xs font-bold text-slate-500">critical / low rating</span>
            </div>
          </div>
        </div>

        {/* Controls: Search & Filter Tabs */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by merchant, email, shop, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            {(['all', 'positive', 'neutral', 'negative'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterSentiment(tab)}
                className={`
                  px-3 py-1.5 rounded-xl text-xs font-black capitalize transition-all whitespace-nowrap
                  ${filterSentiment === tab 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-28" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
            <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900">No merchant feedback found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search ? 'No responses match your search criteria.' : 'Merchant feedback and survey responses will automatically show up here as shopkeepers submit them.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map(item => {
              const answersObj = parseAnswers(item.answers);
              const merchantName = item.name || item.user_name || 'Shopkeeper';
              const business = item.business_name || item.shop_name;
              const text = item.feedback_text || item.comment || (answersObj ? JSON.stringify(answersObj) : 'No comment provided');

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white hover:bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm">
                        {merchantName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          {merchantName}
                          {business && (
                            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                              &bull; <Building2 size={12} /> {business}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">{item.email}</p>
                      </div>

                      {item.rating !== undefined && (
                        <div className="flex items-center gap-0.5 ml-auto md:ml-2 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-xl text-xs font-black border border-amber-200">
                          <Star size={12} fill="currentColor" />
                          <span>{item.rating}/5</span>
                        </div>
                      )}

                      {item.ai_sentiment && (
                        <span className={`
                          px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider
                          ${item.ai_sentiment.toLowerCase().includes('pos') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            item.ai_sentiment.toLowerCase().includes('neg') ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'}
                        `}>
                          {item.ai_sentiment}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 font-medium line-clamp-2 pl-11">
                      {text}
                    </p>

                    {item.ai_summary && (
                      <div className="pl-11 flex items-center gap-1.5 text-[11px] text-orange-700 font-semibold bg-orange-50/50 p-2 rounded-xl border border-orange-100 w-fit">
                        <Sparkles size={13} className="text-orange-500 shrink-0" />
                        <span>AI Takeaway: {item.ai_summary}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                    {item.created_at && (
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    )}
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Feedback Detail Inspection Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-inner">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Feedback Submission #{selectedItem.id.toString().slice(0, 8)}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Submitted on {selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : 'Recent'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Merchant Details */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      {selectedItem.name || selectedItem.user_name || 'Shopkeeper'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedItem.email}</p>
                    {selectedItem.business_name && (
                      <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mt-1">
                        <Building2 size={11} /> {selectedItem.business_name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedItem.email && (
                      <a
                        href={`mailto:${selectedItem.email}`}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                      >
                        <Mail size={12} /> Contact
                      </a>
                    )}
                    {selectedItem.phone && (
                      <a
                        href={`tel:${selectedItem.phone}`}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                      >
                        <Phone size={12} /> Call
                      </a>
                    )}
                  </div>
                </div>

                {/* Rating & Sentiment */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rating</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-2xl font-black text-slate-900">{selectedItem.rating ?? 'N/A'}</span>
                      {selectedItem.rating && (
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i < selectedItem.rating! ? 'currentColor' : 'none'}
                              className={i < selectedItem.rating! ? 'text-amber-400' : 'text-slate-200'}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">AI Sentiment</span>
                    <div className="mt-1">
                      <span className="text-sm font-black text-slate-800 capitalize">
                        {selectedItem.ai_sentiment || 'Not Analyzed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feedback Comment */}
                {(selectedItem.feedback_text || selectedItem.comment) && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Merchant Feedback Note
                    </h5>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 leading-relaxed">
                      {selectedItem.feedback_text || selectedItem.comment}
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                {selectedItem.ai_summary && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2 flex items-center gap-1.5">
                      <Sparkles size={14} /> AI Sentiment Takeaway
                    </h5>
                    <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200 text-xs font-medium text-orange-950 leading-relaxed">
                      {selectedItem.ai_summary}
                    </div>
                  </div>
                )}

                {/* Structured Survey Answers */}
                {selectedItem.answers && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Survey Questions & Responses
                    </h5>
                    <div className="space-y-2">
                      {Object.entries(parseAnswers(selectedItem.answers) || {}).map(([key, val], idx) => (
                        <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                          <span className="text-[11px] font-black text-slate-700 block capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-medium text-slate-900 mt-1 block">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

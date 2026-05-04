import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Send, CheckCircle2, MessageSquare,
  User, LifeBuoy
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [status, setStatus] = useState('open');
  const [, setLoading] = useState(true);
  const token = localStorage.getItem('admin_token');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API}/admin/tickets`, {
        params: { status },
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.tickets);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (id: string) => {
    try {
      // In this setup, we'll assume a dedicated replies endpoint or we can mock/fetch
      const res = await axios.get(`${API}/admin/tickets/${id}/replies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplies(res.data.replies || []);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      // If endpoint doesn't exist yet, we'll just show the ticket description as the first message
      setReplies([]);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [status]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      await axios.post(`${API}/admin/tickets/${selectedTicket.id}/reply`, 
        { content: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReplyText('');
      toast.success('Reply sent');
      fetchTickets(); // Refresh list
      // Optionally re-fetch replies if endpoint exists
    } catch (err) {
      toast.error('Failed to send reply');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await axios.patch(`${API}/admin/tickets/${id}`, 
        { status: 'resolved' }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Ticket resolved');
      fetchTickets();
      if (selectedTicket?.id === id) {
        setSelectedTicket({ ...selectedTicket, status: 'resolved' });
      }
    } catch (err) {
      toast.error('Failed to resolve ticket');
    }
  };

  return (
    <AdminLayout>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-180px)] flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
          <div className="p-6 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Support Desk</h2>
              <LifeBuoy className="text-orange-500" size={20} />
            </div>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {['open', 'resolved'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`
                    flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all
                    ${status === s ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                  `}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <MessageSquare size={20} />
                </div>
                <p className="text-xs font-bold text-slate-400">No {status} tickets</p>
              </div>
            ) : tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTicket(t); fetchReplies(t.id); }}
                className={`
                  w-full p-5 text-left transition-all hover:bg-white border-l-4
                  ${selectedTicket?.id === t.id ? 'bg-white border-orange-500 shadow-sm' : 'border-transparent'}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${t.status === 'open' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                </div>
                <div className="text-sm font-black text-slate-900 truncate mb-1">{t.subject}</div>
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <User size={10} /> {t.user_name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedTicket ? (
            <>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900">{selectedTicket.subject}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Conversation with <span className="text-orange-600">{selectedTicket.user_name}</span>
                  </p>
                </div>
                {selectedTicket.status !== 'resolved' && (
                  <button 
                    onClick={() => handleResolve(selectedTicket.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle2 size={16} /> Resolve
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                {/* Initial Issue */}
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-2">Initial Description</div>
                    <div className="text-sm text-slate-700 leading-relaxed font-medium">{selectedTicket.description}</div>
                  </div>
                </div>

                {replies.map((r, i) => (
                  <div key={i} className={`flex ${r.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm
                      ${r.sender_role === 'admin' 
                        ? 'bg-slate-900 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}
                    `}>
                      {r.content}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>

              <form onSubmit={handleReply} className="p-6 border-t border-slate-100 bg-white">
                <div className="flex gap-4">
                  <input 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply to the shopkeeper..."
                    className="flex-1 px-5 py-3 bg-slate-100 border-none rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 font-medium text-sm"
                  />
                  <button 
                    type="submit"
                    disabled={!replyText.trim()}
                    className="p-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
                <LifeBuoy size={40} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Support Command Center</h3>
              <p className="text-sm font-bold text-slate-400 max-w-xs">Select a ticket from the left to start resolving shopkeeper issues.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { LifeBuoy, Plus, CheckCircle, Clock, Send, MessageSquare, ChevronLeft, User, Bot, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || '/api';

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTicket, setSelectedOrder] = useState<any | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [formData, setFormData] = useState({ subject: '', description: '' });
  const [submitting, setLoadingSubmitting] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('fera_token');

  // ... rest of logic
  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.tickets);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (ticketId: string) => {
    try {
      const res = await axios.get(`${API}/tickets/${ticketId}/replies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplies(res.data.replies);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error('Failed to load conversation');
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(() => {
      fetchReplies(selectedTicket.id);
      fetchTickets();
    }, 7000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmitting(true);
    try {
      await axios.post(`${API}/tickets`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Support ticket raised!');
      setShowNewModal(false);
      setFormData({ subject: '', description: '' });
      fetchTickets();
    } catch (err) {
      toast.error('Failed to raise ticket');
    } finally {
      setLoadingSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      await axios.post(`${API}/tickets/${selectedTicket.id}/replies`, { content: replyText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplyText('');
      fetchReplies(selectedTicket.id);
    } catch (err) {
      toast.error('Failed to send reply');
    }
  };

  const handleCloseTicket = async (id: string) => {
    try {
      await axios.post(`${API}/tickets/${id}/close`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ticket closed');
      if (selectedTicket?.id === id) setSelectedOrder(null);
      fetchTickets();
    } catch (err) {
      toast.error('Failed to close ticket');
    }
  };

  if (selectedTicket) {
    return (
      <div className="support-container" style={{ maxWidth: '1080px', margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
         <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(12px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .support-container { padding: 32px; }
            .animate-panel { animation: fadeIn 0.35s ease both; }
            .chat-bubble { animation: fadeUp 0.35s ease both; }
            .cta-button { transition: transform 0.2s ease, box-shadow 0.2s ease; }
            .cta-button:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25); }
            @media (max-width: 640px) {
              .support-container { padding: 16px; height: calc(100vh - 80px); }
              .ticket-header { flex-direction: column; align-items: flex-start; gap: 12px; }
            }
          `}</style>
         <button onClick={() => setSelectedOrder(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>
            <ChevronLeft size={20} /> Back to Support Center
         </button>

          <div className="animate-panel" style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E5E7EB', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="ticket-header" style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{selectedTicket.subject}</h2>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Created on {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                </div>
                <span style={{ background: selectedTicket.status === 'open' ? '#FEE2E2' : selectedTicket.status === 'in_progress' ? '#DBEAFE' : '#DCFCE7', color: selectedTicket.status === 'open' ? '#B91C1C' : selectedTicket.status === 'in_progress' ? '#1D4ED8' : '#166534', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                  {selectedTicket.status.replace('_', ' ').toUpperCase()}
                </span>
             </div>

            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               {/* Original Issue */}
                <div className="chat-bubble" style={{ alignSelf: 'flex-start', maxWidth: '90%', background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 800, fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>ORIGINAL ISSUE</div>
                  <div style={{ fontSize: '14px', color: '#1E293B', lineHeight: 1.6 }}>{selectedTicket.description}</div>
               </div>

                {replies.map((reply, index) => (
                  <div key={reply.id} className="chat-bubble" style={{ 
                    alignSelf: reply.sender_role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '90%',
                    background: reply.sender_role === 'user' ? '#2563EB' : '#111827',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: reply.sender_role === 'user' ? '16px 16px 6px 16px' : '16px 16px 16px 6px',
                    animationDelay: `${Math.min(index * 0.04, 0.28)}s`
                  }}>
                    <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>
                      {reply.sender_role === 'user' ? 'You' : 'Admin Team'}
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{reply.content}</div>
                    <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>{new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
               ))}
               <div ref={scrollRef} />
            </div>

            {selectedTicket.status !== 'resolved' ? (
              <form onSubmit={handleSendReply} style={{ padding: '16px 20px', background: '#fff', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '12px' }}>
                 <input 
                   placeholder="Type a message..." 
                   value={replyText}
                   onChange={e => setReplyText(e.target.value)}
                   style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #D1D5DB', outline: 'none' }}
                  />
                 <button className="cta-button" style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    <Send size={18} />
                  </button>
               </form>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', background: '#F0FDF4', color: '#16A34A', fontWeight: 700, fontSize: '14px' }}>
                 This ticket has been resolved.
              </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="support-container" style={{ maxWidth: '1080px', margin: '0 auto' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .support-container { padding: 32px; }
        .support-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .support-ticket-card { animation: fadeUp 0.35s ease both; transition: transform 0.22s ease, box-shadow 0.22s ease; }
        .support-ticket-card:hover { transform: translateY(-4px); box-shadow: 0 16px 30px rgba(15, 23, 42, 0.1); }
        .support-cta { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .support-cta:hover { transform: translateY(-1px); box-shadow: 0 16px 30px rgba(37, 99, 235, 0.28); }
        .support-modal { animation: fadeIn 0.25s ease both; }
        .support-modal-card { animation: fadeUp 0.35s ease both; }
        @media (max-width: 640px) {
          .support-container { padding: 16px; }
          .support-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .support-header button { width: 100%; justify-content: center; }
        }
      `}</style>
      <div className="support-header">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>Support Center</h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>Need help? Our support team replies directly here.</p>
        </div>
        <button
          className="support-cta"
          onClick={() => setShowNewModal(true)}
          style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 12px 24px rgba(37, 99, 235, 0.25)' }}
        >
          <Plus size={20} /> Open New Ticket
        </button>
      </div>

      {loading ? (
        <p>Loading your support history...</p>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
          <LifeBuoy size={48} color="#CBD5E1" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>No Support Tickets</h3>
          <p style={{ color: '#64748B' }}>Everything looks good! If you face any issues, click the button above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tickets.map((ticket, index) => (
            <div 
              className="support-ticket-card"
              key={ticket.id} 
              onClick={() => { setSelectedOrder(ticket); fetchReplies(ticket.id); }}
              style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)', animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ 
                    background: ticket.status === 'open' ? '#FEE2E2' : ticket.status === 'in_progress' ? '#DBEAFE' : '#DCFCE7', 
                    color: ticket.status === 'open' ? '#B91C1C' : ticket.status === 'in_progress' ? '#1D4ED8' : '#166534',
                    fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase'
                  }}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <span style={{ color: '#94A3B8', fontSize: '12px' }}>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>{ticket.subject}</h3>
                <p style={{ color: '#64748B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <MessageSquare size={14} /> Click to chat with admin
                </p>
              </div>
              <ChevronRight size={20} color="#CBD5E1" />
            </div>
          ))}
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="support-modal" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="support-modal-card" style={{ background: '#fff', padding: '32px', borderRadius: '20px', width: '100%', maxWidth: '500px', boxShadow: '0 24px 40px rgba(15,23,42,0.25)' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1E293B', marginBottom: '24px' }}>How can we help?</h2>
            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Subject</label>
                <input
                  required
                  placeholder="Brief summary of the issue"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Description</label>
                <textarea
                  required
                  placeholder="Tell us more about what you're facing..."
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  className="support-cta"
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#2563EB', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {submitting ? 'Submitting...' : <><Send size={18} /> Submit</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

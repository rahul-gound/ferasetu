import { useState, useEffect, useRef, type FormEvent } from 'react';
import { LifeBuoy, Plus, Send, MessageSquare, ChevronLeft, ChevronRight, MessageCircle, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [formData, setFormData] = useState({ subject: 'setup', description: '' });
  const [submitting, setSubmitting] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets');
      setTickets(res.data?.tickets || res.data || []);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (ticketId: string) => {
    try {
      const res = await api.get(`/tickets/${ticketId}/replies`);
      setReplies(res.data?.replies || res.data || []);
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

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/tickets', formData);
      toast.success('Support ticket raised!');
      setShowNewModal(false);
      setFormData({ subject: 'setup', description: '' });
      fetchTickets();
    } catch (err) {
      toast.error('Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      await api.post(`/tickets/${selectedTicket.id}/replies`, { content: replyText });
      setReplyText('');
      fetchReplies(selectedTicket.id);
    } catch (err) {
      toast.error('Failed to send reply');
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
            .cta-button:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(249, 115, 22, 0.28); }
            @media (max-width: 640px) {
              .support-container { padding: 16px; height: calc(100vh - 80px); }
              .ticket-header { flex-direction: column; align-items: flex-start; gap: 12px; }
            }
          `}</style>
         <button onClick={() => setSelectedTicket(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>
            <ChevronLeft size={20} /> Back to Support Center
         </button>

          <div className="animate-panel" style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="ticket-header" style={{ padding: '20px 28px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>{selectedTicket.subject}</h2>
                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>Ticket ID: #{String(selectedTicket.id).slice(0, 8)} • Created {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                </div>
                <span style={{ background: selectedTicket.status === 'open' ? '#FEF2F2' : selectedTicket.status === 'in_progress' ? '#FFF7ED' : '#F0FDF4', color: selectedTicket.status === 'open' ? '#DC2626' : selectedTicket.status === 'in_progress' ? '#EA580C' : '#16A34A', border: selectedTicket.status === 'open' ? '1px solid #FECACA' : selectedTicket.status === 'in_progress' ? '1px solid #FFEDD5' : '1px solid #DCFCE7', padding: '6px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em' }}>
                  {selectedTicket.status.replace('_', ' ').toUpperCase()}
                </span>
             </div>

            <div style={{ flex: 1, padding: '28px', overflowY: 'auto', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '18px' }}>
               {/* Original Issue - User on Left */}
                <div className="chat-bubble" style={{ alignSelf: 'flex-start', maxWidth: '85%', background: '#FFFFFF', padding: '18px 22px', borderRadius: '20px 20px 20px 4px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={13} strokeWidth={2.2} />
                      <span>You (Shopkeeper) • Initial Query</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>{new Date(selectedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#1E293B', lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedTicket.description}</div>
               </div>

                {replies.map((reply: any, index: number) => {
                  const isTeam = reply.sender_role === 'admin' || reply.sender_role === 'team' || reply.sender_role === 'support' || reply.sender_role === 'agent';
                  return (
                    <div 
                      key={reply.id || index} 
                      className="chat-bubble" 
                      style={{ 
                        alignSelf: isTeam ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        background: isTeam 
                          ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' 
                          : '#FFFFFF',
                        color: isTeam ? '#FFFFFF' : '#0F172A',
                        border: isTeam ? 'none' : '1px solid #E2E8F0',
                        padding: '18px 22px',
                        borderRadius: isTeam ? '22px 22px 4px 22px' : '22px 22px 22px 4px',
                        boxShadow: isTeam 
                          ? '0 10px 24px -4px rgba(249, 115, 22, 0.38), 0 2px 6px rgba(249, 115, 22, 0.18)' 
                          : '0 4px 14px rgba(15, 23, 42, 0.04)',
                        animationDelay: `${Math.min(index * 0.04, 0.28)}s`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '8px' }}>
                        <div style={{ 
                          fontSize: '11px', 
                          fontWeight: 800, 
                          letterSpacing: '0.04em', 
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: isTeam ? '#FFF7ED' : '#64748B'
                        }}>
                          {isTeam ? (
                            <>
                              <LifeBuoy size={13} strokeWidth={2.2} />
                              <span>FeraSetu Support Team</span>
                            </>
                          ) : (
                            <>
                              <User size={13} strokeWidth={2.2} />
                              <span>You (Shopkeeper)</span>
                            </>
                          )}
                        </div>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: 600, 
                          color: isTeam ? 'rgba(255, 255, 255, 0.85)' : '#94A3B8' 
                        }}>
                          {reply.created_at ? new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        lineHeight: 1.6, 
                        fontWeight: 500,
                        color: isTeam ? '#FFFFFF' : '#1E293B',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {reply.content}
                      </div>
                    </div>
                  );
                })}
               <div ref={scrollRef} />
            </div>

            {selectedTicket.status !== 'resolved' ? (
              <form onSubmit={handleSendReply} style={{ padding: '18px 24px', background: '#fff', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <input 
                   placeholder="Type your reply here..." 
                   value={replyText}
                   onChange={e => setReplyText(e.target.value)}
                   style={{ flex: 1, padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', background: '#F8FAFC' }}
                   onFocus={(e) => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.background = '#FFFFFF'; }}
                   onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
                  />
                 <button className="cta-button" type="submit" disabled={!replyText.trim()} style={{ background: replyText.trim() ? '#F97316' : '#CBD5E1', color: '#fff', border: 'none', padding: '14px 22px', borderRadius: '14px', fontWeight: 700, cursor: replyText.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          {tickets.map((ticket: any, index: number) => (
            <div 
              className="support-ticket-card"
              key={ticket.id} 
              onClick={() => { setSelectedTicket(ticket); fetchReplies(ticket.id); }}
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
        <div className="support-modal" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="support-modal-card max-h-[90vh] overflow-y-auto" style={{ background: '#fff', padding: '32px', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 40px rgba(15,23,42,0.25)' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1E293B', marginBottom: '24px' }}>How can we help?</h2>
            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Subject</label>
                <select
                  required
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', background: '#fff' }}
                >
                  <option value="setup">Help me set up my shop website</option>
                  <option value="feedback">Product feedback call (Beta)</option>
                  <option value="bug">Report a Bug</option>
                  <option value="feature">Feature Request</option>
                  <option value="confused">Something is confusing</option>
                  <option value="other">Other</option>
                </select>
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
              <div style={{ marginTop: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>Or quick chat with us</p>
                <button
                  type="button"
                  onClick={() => window.open('https://wa.me/919876543210?text=Hi FeraSetu Team, I need help with my shop...', '_blank')}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <MessageCircle size={18} /> Chat on WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

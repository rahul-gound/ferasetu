import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, DollarSign, Activity, AlertCircle,
  LayoutDashboard, LifeBuoy, Clock, Bot, Trash2, Send, Menu
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || '/api';

type Tab = 'overview' | 'users' | 'tickets' | 'health' | 'ai';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // CEO AI State
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [aiMessage, setAiMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Ticket Chat State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketReplies, setTicketReplies] = useState<any[]>([]);
  const [ticketReplyText, setTicketReplyText] = useState('');
  
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [statsRes, ticketsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/tickets`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setTickets(ticketsRes.data.tickets);
      setUsers(usersRes.data.users);
    } catch (err) {
      toast.error('Session expired or unauthorized');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketReplies = async (id: string) => {
    try {
       const res = await axios.get(`${API}/admin/tickets/${id}/replies`, {
         headers: { Authorization: `Bearer ${token}` }
       });
       setTicketReplies(res.data.replies);
       setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
       toast.error('Failed to load conversation');
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/admin');
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token, navigate]);

  useEffect(() => {
    if (!selectedTicket || activeTab !== 'tickets') return;
    const interval = setInterval(() => {
      fetchTicketReplies(selectedTicket.id);
      fetchData();
    }, 7000);
    return () => clearInterval(interval);
  }, [selectedTicket, activeTab]);

  const handleResolveTicket = async (id: string) => {
    try {
      await axios.patch(`${API}/admin/tickets/${id}`, { status: 'resolved' }, { headers: { Authorization: `Bearer ${token}` } });
      setTickets(tickets.map(t => t.id === id ? { ...t, status: 'resolved' } : t));
      if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status: 'resolved' });
      toast.success('Ticket resolved');
    } catch (err) {
      toast.error('Failed to resolve ticket');
    }
  };

  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyText.trim() || !selectedTicket) return;
    try {
      await axios.post(`${API}/admin/tickets/${selectedTicket.id}/replies`, { content: ticketReplyText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicketReplyText('');
      fetchTicketReplies(selectedTicket.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send reply');
    }
  };

  const handleToggleBlock = async (id: string) => {
    try {
      const res = await axios.post(`${API}/admin/users/${id}/toggle-block`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.map(u => u.id === id ? { ...u, is_blocked: res.data.is_blocked } : u));
      toast.success(res.data.is_blocked ? 'User blocked' : 'User unblocked');
    } catch (err) {
      toast.error('Failed to toggle block status');
    }
  };

  const handleUpdatePlan = async (id: string, plan: string) => {
    try {
      await axios.patch(`${API}/admin/users/${id}/plan`, { plan }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.map(u => u.id === id ? { ...u, plan } : u));
      toast.success(`Plan updated to ${plan}`);
    } catch (err) {
      toast.error('Failed to update plan');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('🚨 HIGH RISK: This will permanently delete this partner and ALL their data.')) return;
    try {
      await axios.delete(`${API}/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.filter(u => u.id !== id));
      toast.success('Partner removed');
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const handleSendAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim() || aiLoading) return;

    const userMsg = { role: 'user', content: aiMessage };
    setAiHistory([...aiHistory, userMsg]);
    setAiMessage('');
    setAiLoading(true);

    try {
      const res = await axios.post(`${API}/admin/ai/chat`, {
        message: aiMessage,
        history: aiHistory
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setAiHistory(prev => [...prev, { role: 'assistant', content: res.data.content }]);
    } catch (err) {
      toast.error('AI unreachable');
    } finally {
      setAiLoading(false);
    }
  };

  const handleInviteDevOps = async () => {
    try {
      const res = await axios.post(`${API}/admin/invite`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const { username, password, loginUrl } = res.data.credentials;
      const text = `DevOps Invite:\nURL: ${loginUrl}\nUser: ${username}\nPass: ${password}`;
      await navigator.clipboard.writeText(text);
      toast.success('Invite copied!');
    } catch (err) {
      toast.error('Failed to generate invite');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  const chartData = [
    { name: 'Mon', revenue: 4000 },
    { name: 'Tue', revenue: 3000 },
    { name: 'Wed', revenue: 2000 },
    { name: 'Thu', revenue: 2780 },
    { name: 'Fri', revenue: 1890 },
    { name: 'Sat', revenue: 2390 },
    { name: 'Sun', revenue: 3490 },
  ];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>CEO Command Center Loading...</div>;

  const sidebarItems = [
    { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { id: 'users', icon: <Users size={20} />, label: 'Shopkeepers' },
    { id: 'tickets', icon: <LifeBuoy size={20} />, label: 'Support Desk' },
    { id: 'ai', icon: <Bot size={20} />, label: 'Paperclip AI' },
    { id: 'health', icon: <Activity size={20} />, label: 'System Health' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F7FE', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes softPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .admin-sidebar {
          width: 280px; background: #111827; color: #fff; display: flex; flex-direction: column; position: fixed; height: 100vh; z-index: 100; transition: transform 0.3s;
        }
        .admin-main {
          margin-left: 280px; flex: 1; padding: 40px; transition: margin-left 0.3s; min-width: 0;
        }
        .animate-fade-in { animation: fadeIn 0.35s ease both; }
        .animate-fade-up { animation: fadeUp 0.45s ease both; }
        .sidebar-item { transition: all 0.2s ease; }
        .sidebar-item:hover { transform: translateX(3px); }
        .interactive-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .interactive-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08); }
        .lift-button { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .lift-button:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25); }
        .pulse-button { animation: softPulse 1.6s ease-in-out infinite; }
        .admin-overlay {
          display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90;
        }
        .mobile-header {
          display: none; padding: 20px; background: #fff; border-bottom: 1px solid #e2e8f0; align-items: center; gap: 16px;
        }
        @media (max-width: 1024px) {
          .admin-sidebar { transform: translateX(-100%); }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-main { margin-left: 0; padding: 20px; }
          .admin-overlay.open { display: block; }
          .mobile-header { display: flex; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .chat-window { flex-direction: column !important; }
          .ticket-list { width: 100% !important; border-right: none !important; border-bottom: 1px solid #F1F5F9; max-height: 250px; }
        }
      `}</style>
      
      {/* Mobile Overlay */}
      <div className={`admin-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '40px', height: '40px', background: '#FF6B35', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>F</div>
          <div><div style={{ fontWeight: 800 }}>FeraSetu CEO</div></div>
        </div>
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {sidebarItems.map(item => (
            <button className="sidebar-item" key={item.id} onClick={() => { setActiveTab(item.id as Tab); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: 'none', background: activeTab === item.id ? 'rgba(255,107,53,0.15)' : 'transparent', color: activeTab === item.id ? '#FF6B35' : '#94A3B8', cursor: 'pointer', fontWeight: 600, fontSize: '14px', textAlign: 'left' }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={handleInviteDevOps} style={{ width: '100%', padding: '10px', borderRadius: '10px', background: '#2563EB', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>Invite DevOps</button>
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: 'none', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </aside>

      <main className="admin-main animate-fade-in">
        <div className="mobile-header">
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
             <Menu size={24} color="#1E293B" />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 800 }}>{activeTab.toUpperCase()}</h1>
        </div>

        <header style={{ marginBottom: '32px', display: 'none' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>{activeTab.toUpperCase()}</h1>
        </header>

        {activeTab === 'overview' && (
          <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              <StatCard icon={<Users />} label="Partners" value={stats?.totalUsers} color="#FF6B35" />
              <StatCard icon={<DollarSign />} label="Revenue" value={`₹${stats?.totalRevenue}`} color="#10B981" />
              <StatCard icon={<AlertCircle />} label="Tickets" value={tickets.filter(t => t.status === 'open').length} color="#EF4444" />
              <StatCard icon={<Clock />} label="Uptime" value="99.9%" color="#6366F1" />
            </div>
            <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', height: '400px', minWidth: 0 }}>
               <ResponsiveContainer width="100%" height={336}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area isAnimationActive={false} type="monotone" dataKey="revenue" stroke="#FF6B35" fill="#FF6B3522" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="animate-fade-up" style={{ background: '#fff', borderRadius: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead style={{ background: '#F8FAFC' }}>
                <tr>
                  <th style={{ padding: '20px' }}>User</th>
                  <th style={{ padding: '20px' }}>Tier</th>
                  <th style={{ padding: '20px' }}>Status</th>
                  <th style={{ padding: '20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '20px' }}><b>{u.name}</b><br/>{u.email}</td>
                    <td style={{ padding: '20px' }}>
                       <select value={u.plan} onChange={(e) => handleUpdatePlan(u.id, e.target.value)} style={{ padding: '4px', borderRadius: '4px' }}>
                         {['free', 'trial', 'basic', 'standard', 'pro'].map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                    </td>
                    <td style={{ padding: '20px' }}>{u.is_blocked ? '🔴 Blocked' : '🟢 Active'}</td>
                    <td style={{ padding: '20px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                       <button onClick={() => handleToggleBlock(u.id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: u.is_blocked ? '#10B981' : '#F59E0B', color: '#fff', cursor: 'pointer' }}>{u.is_blocked ? 'Unblock' : 'Block'}</button>
                       <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer' }}><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="animate-fade-up" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {aiHistory.map((m, i) => (
                 <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#1E293B' : '#F1F5F9', color: m.role === 'user' ? '#fff' : '#000', padding: '12px', borderRadius: '12px', maxWidth: '80%' }}>{m.content}</div>
               ))}
            </div>
            <form onSubmit={handleSendAi} style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
               <input value={aiMessage} onChange={e => setAiMessage(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} placeholder="Ask Paperclip AI..." />
               <button disabled={aiLoading} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#FF6B35', color: '#fff', cursor: 'pointer' }}>Analyze</button>
            </form>
          </div>
        )}

        {activeTab === 'tickets' && (
           <div className="chat-window animate-fade-up" style={{ background: '#FFFFFF', borderRadius: '20px', overflow: 'hidden', height: 'calc(100vh - 120px)', display: 'flex', border: '1px solid #E5E7EB', boxShadow: '0 16px 36px rgba(15, 23, 42, 0.08)' }}>
              {/* Ticket List */}
              <div className="ticket-list" style={{ width: '360px', borderRight: '1px solid #E5E7EB', overflowY: 'auto', background: '#F9FAFB' }}>
                 <div style={{ padding: '20px', background: '#FFFFFF', fontWeight: 800, borderBottom: '1px solid #E5E7EB' }}>Support Inbox</div>
                 {tickets.map(t => (
                  <div className="interactive-card" key={t.id} onClick={() => { setSelectedTicket(t); fetchTicketReplies(t.id); }} style={{ padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', background: selectedTicket?.id === t.id ? '#EEF2FF' : 'transparent' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{t.user_name}</span>
                        <span style={{ fontSize: '10px', color: '#94A3B8' }}>{new Date(t.created_at).toLocaleDateString()}</span>
                     </div>
                     <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{t.subject}</div>
                     <div style={{ fontSize: '11px', color: t.status === 'open' ? '#DC2626' : t.status === 'in_progress' ? '#2563EB' : '#16A34A', fontWeight: 800, textTransform: 'uppercase', marginTop: '4px' }}>{t.status.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
             
             {/* Chat Window */}
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {selectedTicket ? (
                  <>
                    <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{selectedTicket.subject}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>Conversation with {selectedTicket.user_name}</div>
                        </div>
                        {selectedTicket.status !== 'resolved' && (
                         <button className="pulse-button" onClick={() => handleResolveTicket(selectedTicket.id)} style={{ padding: '8px 16px', borderRadius: '10px', background: '#10B981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Resolve Issue</button>
                        )}
                     </div>
                     
                    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                       <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0', maxWidth: '80%' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', marginBottom: '4px' }}>INITIAL ISSUE</div>
                          <div style={{ fontSize: '14px' }}>{selectedTicket.description}</div>
                       </div>
                       {ticketReplies.map((r, index) => (
                           <div key={r.id} style={{ 
                             alignSelf: r.sender_role === 'admin' ? 'flex-end' : 'flex-start',
                             background: r.sender_role === 'admin' ? '#111827' : '#fff',
                             color: r.sender_role === 'admin' ? '#fff' : '#1E293B',
                             padding: '12px 16px', borderRadius: '14px', border: r.sender_role === 'admin' ? 'none' : '1px solid #E2E8F0',
                             maxWidth: '80%',
                             animation: 'fadeUp 0.35s ease both',
                             animationDelay: `${Math.min(index * 0.04, 0.28)}s`
                           }}>
                             <div style={{ fontSize: '14px' }}>{r.content}</div>
                          </div>
                       ))}
                       <div ref={scrollRef} />
                    </div>

                    <form onSubmit={handleSendTicketReply} style={{ padding: '20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '12px', background: '#FFFFFF' }}>
                       <input value={ticketReplyText} onChange={e => setTicketReplyText(e.target.value)} placeholder="Type a reply to shopkeeper..." style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1px solid #D1D5DB' }} />
                        <button className="lift-button" type="submit" style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '12px', cursor: 'pointer' }}><Send size={18}/></button>
                     </form>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>Select a ticket to view conversation</div>
                )}
             </div>
           </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', animation: 'fadeUp 0.45s ease both' }}>
      <div style={{ color, marginBottom: '12px' }}>{icon}</div>
      <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 800 }}>{value}</div>
    </div>
  );
}

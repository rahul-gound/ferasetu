import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, LayoutDashboard, LifeBuoy, Globe,
  ShoppingBag, Store, Bell, Calendar,
  Menu, LogOut, ChevronRight, Zap, Terminal, Bug, MessageSquare, Activity,
  Bot
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../SEO';
import { useAuth } from '../../contexts/AuthContext';
import { clearAdminSession } from '../../services/adminAuth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    clearAdminSession();
    logout();
    toast.success('Logged out from CEO Command Center');
    navigate('/admin');
  };

  const navItems = [
    { id: 'dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.75} />, label: 'Overview' },
    { id: 'platform-sites', path: '/platform-sites', icon: <Globe size={20} strokeWidth={1.75} />, label: 'Platform Sites' },
    { id: 'qa', path: '/admin/qa', icon: <Activity size={20} strokeWidth={1.75} />, label: 'QA & Diagnostics' },
    { id: 'users', path: '/admin/users', icon: <Users size={20} strokeWidth={1.75} />, label: 'Partners' },
    { id: 'ai-credits', path: '/admin/ai-credits', icon: <Bot size={20} strokeWidth={1.75} />, label: 'AI Credits & Usage' },
    { id: 'shops', path: '/admin/shops', icon: <Store size={20} strokeWidth={1.75} />, label: 'Shops' },
    { id: 'meetings', path: '/admin/meetings', icon: <Calendar size={20} strokeWidth={1.75} />, label: 'Consultations' },
    { id: 'orders', path: '/admin/orders', icon: <ShoppingBag size={20} strokeWidth={1.75} />, label: 'Global Orders' },
    { id: 'tickets', path: '/admin/tickets', icon: <LifeBuoy size={20} strokeWidth={1.75} />, label: 'Support Desk' },
    { id: 'feedback', path: '/admin/feedback', icon: <MessageSquare size={20} strokeWidth={1.75} />, label: 'Merchant Feedback' },
    { id: 'errors', path: '/admin/errors', icon: <Bug size={20} strokeWidth={1.75} />, label: 'Error Tickets' },
    { id: 'system', path: '/admin/system', icon: <Terminal size={20} strokeWidth={1.75} />, label: 'System Controls' },
  ];

  const activeItem = navItems.find(item => 
    location.pathname === item.path || 
    (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path + '/'))
  ) || navItems[0];

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans antialiased">
      <SEO title="FeraSetu Admin" noindex />

      {/* Sidebar Overlay for Mobile Viewports */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent Fixed Left Sidebar (Locked to left viewport) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-[#111827] text-white flex flex-col
          transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Brand header - pinned at top of sidebar */}
          <div className="p-6 sm:p-7 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-10 h-10 font-black rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20 text-white shrink-0">
                F
              </div>
              <div className="min-w-0">
                <div className="text-base font-black tracking-tight text-white truncate">FeraSetu CEO</div>
                <div className="text-[10px] uppercase tracking-widest text-orange-500 font-bold opacity-90">Command Center</div>
              </div>
            </div>
          </div>

          {/* Navigation links - scroll independently within sidebar, sidebar stays fixed */}
          <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto min-h-0 overscroll-contain">
            {navItems.map((item) => {
              const isCurrent = location.pathname === item.path || 
                (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path + '/'));
              return (
                <button
                  key={item.id}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={`
                    flex items-center w-full gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-left cursor-pointer
                    ${isCurrent 
                      ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-md shadow-orange-500/5' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span className={`shrink-0 ${isCurrent ? 'text-orange-500' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="truncate flex-1">{item.label}</span>
                  {isCurrent && <ChevronRight size={14} className="ml-auto shrink-0" />}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer - pinned at bottom of sidebar */}
          <div className="p-5 mt-auto border-t border-white/5 bg-slate-900/50 shrink-0">
            <div className="p-3.5 mb-3 rounded-xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1.5 text-blue-400">
                <Zap size={15} fill="currentColor" className="shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">System Health</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Server Uptime: 99.9%<br/>
                Database: Operational
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center w-full gap-3 px-4 py-2.5 text-sm font-bold text-slate-400 transition-colors rounded-xl hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
            >
              <LogOut size={18} className="shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Offset by lg:pl-72 to never collide with fixed sidebar) */}
      <div className="lg:pl-72 flex flex-col min-h-screen min-w-0 transition-all duration-300">
        {/* Topbar: Sticky at top */}
        <header className="flex items-center justify-between px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2 transition-colors rounded-lg lg:hidden hover:bg-slate-100 text-slate-600 cursor-pointer"
              aria-label="Open Navigation"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-xl font-black tracking-tight text-slate-900">{activeItem.label}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              className="relative p-2 transition-colors rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 ml-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-slate-900 leading-tight">Admin System</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Root Access</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-white shadow-md shadow-slate-200 flex items-center justify-center text-white font-black text-xs shrink-0">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Page body content */}
        <main className="p-6 lg:p-8 max-w-[1600px] w-full mx-auto flex-1 animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}

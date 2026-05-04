import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, LayoutDashboard, LifeBuoy,
  ShoppingBag, Store, Bell,
  Menu, LogOut, ChevronRight, Zap, Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    toast.success('Logged out from CEO Command Center');
    navigate('/admin');
  };

  const navItems = [
    { id: 'dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'users', path: '/admin/users', icon: <Users size={20} />, label: 'Partners' },
    { id: 'shops', path: '/admin/shops', icon: <Store size={20} />, label: 'Shops' },
    { id: 'orders', path: '/admin/orders', icon: <ShoppingBag size={20} />, label: 'Global Orders' },
    { id: 'tickets', path: '/admin/tickets', icon: <LifeBuoy size={20} />, label: 'Support Desk' },
    { id: 'system', path: '/admin/system', icon: <Terminal size={20} />, label: 'System Controls' },
  ];

  const activeItem = navItems.find(item => location.pathname === item.path) || navItems[0];

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#111827] text-white transition-transform duration-300 transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 font-black rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">F</div>
              <div>
                <div className="text-lg font-black tracking-tight">Fera CEO</div>
                <div className="text-[10px] uppercase tracking-widest text-orange-500 font-bold opacity-80">Command Center</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`
                  flex items-center w-full gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200
                  ${location.pathname === item.path 
                    ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-lg shadow-orange-500/5' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <span className={location.pathname === item.path ? 'text-orange-500' : ''}>
                  {item.icon}
                </span>
                {item.label}
                {location.pathname === item.path && <ChevronRight size={14} className="ml-auto" />}
              </button>
            ))}
          </nav>

          <div className="p-6 mt-auto border-t border-white/5 bg-slate-900/50">
            <div className="p-4 mb-4 rounded-xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2 text-blue-400">
                <Zap size={16} fill="currentColor" />
                <span className="text-xs font-bold uppercase tracking-wider">System Health</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Server Uptime: 99.9%<br/>
                Database: Operational
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center w-full gap-3 px-4 py-3 text-sm font-bold text-slate-400 transition-colors rounded-xl hover:bg-red-500/10 hover:text-red-500"
            >
              <LogOut size={20} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <header className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2 transition-colors rounded-lg lg:hidden hover:bg-slate-100 text-slate-600"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-black tracking-tight text-slate-900">{activeItem.label}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 transition-colors rounded-xl hover:bg-slate-100 text-slate-600">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 ml-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-slate-900 leading-tight">Admin System</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Root Access</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-white shadow-md shadow-slate-200 flex items-center justify-center text-white font-black text-xs">AD</div>
            </div>
          </div>
        </header>

        <main className="p-8 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}

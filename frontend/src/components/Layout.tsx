import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3,
  Bot, Globe, LogOut, Menu, X, ChevronDown, LifeBuoy, Coins, MessageSquareText,
  Settings, Sparkles, Search, Gift, Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ENABLED_LANGUAGES } from '../i18n';
import { getPlanBadge } from '../config/beta';
import FeedbackWidget from './FeedbackWidget';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  labelKey: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',      icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
  { path: '/products',       icon: <Package size={20} />,         labelKey: 'products' },
  { path: '/orders',         icon: <ShoppingCart size={20} />,    labelKey: 'orders', badge: '12' },
  { path: '/analytics',      icon: <BarChart3 size={20} />,       labelKey: 'analytics' },
  { path: '/fera-ai',        icon: <Sparkles size={20} />,        labelKey: 'feraAI' },
  { path: '/ai-assistant',   icon: <Bot size={20} />,             labelKey: 'aiAssistant' },
  { path: '/ai-credits',     icon: <Coins size={20} />,           labelKey: 'aiCredits', badge: '120' },
  { path: '/survey-feedback',icon: <MessageSquareText size={20} />,labelKey: 'surveyFeedback' },
  { path: '/website-builder',icon: <Globe size={20} />,           labelKey: 'websiteBuilder' },
  { path: '/support',        icon: <LifeBuoy size={20} />,        labelKey: 'support' },
  { path: '/settings/email', icon: <Settings size={20} />,         labelKey: 'emailSettings' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, updateUser } = useAuth();
  const { language, setLanguage, translate } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langDropOpen, setLangDropOpen] = useState(false);
  const planBadge = user?.plan ? getPlanBadge(user.plan) : null;

  const currentLang = ENABLED_LANGUAGES.find(l => l.code === language);
  const handleLogout = () => { logout(); navigate('/login'); };
  
  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    if (user && user.preferred_language !== code) {
      updateUser({ preferred_language: code });
    }
    setLangDropOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white w-[260px] flex-shrink-0 border-r border-gray-100 shadow-sm overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-50 flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 bg-[#0052FF] rounded-lg rotate-12 flex items-center justify-center text-white font-bold italic text-lg shadow-md shadow-blue-500/20">f</div>
          <div className="w-8 h-8 bg-[#FF6B35] rounded-lg -rotate-12 flex items-center justify-center text-white font-bold italic text-lg absolute top-0 mix-blend-multiply opacity-90"></div>
        </div>
        <div>
          <div className="font-extrabold text-xl tracking-tight leading-none text-gray-900 font-outfit">
            Fera<span className="text-[#0052FF]">Setu</span>
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Your Business. Our Bridge.
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 py-6 flex-1 flex flex-col gap-1.5">
        {NAV_ITEMS.map(item => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold
              ${isActive 
                ? 'bg-blue-50 text-[#0052FF]' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
            `}
          >
            {item.icon}
            <span className="flex-1">{translate(item.labelKey)}</span>
            {item.badge && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                item.badge === '120' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
              }`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Upgrade Box */}
      <div className="px-6 py-4">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-1">Current Plan</p>
          <p className="text-lg font-bold text-[#0052FF] mb-1">Pro</p>
          <p className="text-xs font-medium text-gray-400 mb-4">Unlimited Access</p>
          <button className="w-full py-2.5 rounded-xl bg-[#0052FF] text-white text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-colors">
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="px-6 py-6 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-200/50 flex items-center justify-center text-blue-700 font-bold shadow-inner flex-shrink-0">
            {(user?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">
              {user?.name || 'Arjun Store'}
            </div>
            <div className="text-xs font-medium text-gray-400 truncate">
              {user?.subdomain ? `${user.subdomain}.ferasetu.shop` : 'arjunstore.ferasetu.shop'}
            </div>
          </div>
          <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden font-sans">

      {/* Desktop Sidebar */}
      <aside className="hidden md:block h-full z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 transition-transform duration-300 md:hidden shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-sm text-gray-500">
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium w-72 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="hidden sm:flex items-center gap-2 text-sm font-bold text-[#0052FF] bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
              <Gift size={16} />
              Refer & Earn
            </button>

            <button className="relative p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[8px] font-bold text-white flex items-center justify-center">5</span>
            </button>

            <div className="relative">
              <button onClick={() => setLangDropOpen(v => !v)} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors">
                <Globe size={16} />
                <span className="hidden sm:inline">{currentLang?.nativeName || 'English'}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {langDropOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-2">
                  {ENABLED_LANGUAGES.map(lang => (
                    <button key={lang.code} onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center justify-between transition-colors
                        ${lang.code === language ? 'bg-blue-50 text-[#0052FF]' : 'text-gray-600 hover:bg-gray-50'}
                      `}>
                      <span>{lang.nativeName}</span>
                      <span className="text-xs font-bold opacity-50 uppercase">{lang.code}</span>
                    </button>
                  ))}
                  <div className="h-px bg-gray-100 my-2 mx-4" />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>

            <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center text-white font-bold text-sm shadow-md cursor-pointer hover:opacity-90 transition-opacity">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] p-6 lg:p-8">
          {children}
        </main>
      </div>

      <FeedbackWidget />
    </div>
  );
}

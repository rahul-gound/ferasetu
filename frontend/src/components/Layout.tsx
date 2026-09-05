import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Bot,
  Globe,
  LogOut,
  Menu,
  X,
  LifeBuoy,
  Coins,
  MessageSquareText,
  Settings,
  Sparkles,
  ArrowUpRight,
  Search,
  Bell,
  Gift,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import PlanBadge from './ui/PlanBadge';
import { isFreePlan } from '../config/plans';
import FeedbackWidget from './FeedbackWidget';
import SEO from './SEO';
import LanguageSelector from './LanguageSelector';
import type { TranslationKey } from '../i18n/types';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  labelKey: TranslationKey;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
  { path: '/products', icon: <Package size={20} />, labelKey: 'products' },
  { path: '/orders', icon: <ShoppingCart size={20} />, labelKey: 'orders', badge: 0 },
  { path: '/analytics', icon: <BarChart3 size={20} />, labelKey: 'analytics' },
  { path: '/fera-ai', icon: <Sparkles size={20} />, labelKey: 'feraAI' },
  { path: '/ai-assistant', icon: <Bot size={20} />, labelKey: 'aiAssistant' },
  { path: '/ai-credits', icon: <Coins size={20} />, labelKey: 'aiCredits', badge: 20 },
  { path: '/survey-feedback', icon: <MessageSquareText size={20} />, labelKey: 'surveyFeedback' },
  { path: '/website-builder', icon: <Globe size={20} />, labelKey: 'websiteBuilder' },
  { path: '/support', icon: <LifeBuoy size={20} />, labelKey: 'support' },
  { path: '/settings/email', icon: <Settings size={20} />, labelKey: 'settings' }
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className='flex h-full w-[280px] flex-col overflow-y-auto border-r border-slate-200 bg-white'>
      <div className='flex flex-col border-b border-slate-100 px-6 py-5'>
        <img
          src='/logo-official.png'
          alt='FeraSetu'
          className='h-8 w-auto object-contain mb-1'
        />
        <span className='text-[10px] font-semibold text-slate-400 tracking-wide'>
          Your Business. Our Bridge.
        </span>
      </div>

      <nav aria-label={translate('layout.merchantNavigation')} className='flex flex-1 flex-col gap-1.5 px-4 py-6'>
        {NAV_ITEMS.map(item => {
          const badgeVal = item.path === '/ai-credits' ? (user?.ai_credits_balance ?? 20) : item.badge;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
              `}
            >
              {item.icon}
              <span className='flex-1 truncate'>{translate(item.labelKey)}</span>
              {badgeVal && Number(badgeVal) > 0 ? (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  item.path === '/orders' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-700'
                }`}>
                  {badgeVal}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div className='border-t border-slate-100 px-5 py-4'>
        <div className='rounded-2xl border border-slate-100 bg-slate-50/80 p-4'>
          <p className='text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1'>Current Plan</p>
          <h4 className='text-xl font-extrabold text-blue-600 mb-0.5 capitalize'>{user?.plan || 'Free'}</h4>
          <p className='text-xs text-slate-500 mb-3.5'>{user?.plan === 'pro' ? 'Unlimited Access' : user?.plan === 'business' ? '500 Products Limit' : 'Free Forever'}</p>
          <button
            onClick={() => navigate('/upgrade')}
            className='flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700'
          >
            Upgrade Plan
          </button>
        </div>

        <div className='mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-sm'>
              {(user?.name || user?.business_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className='min-w-0'>
              <div className='truncate text-sm font-bold text-slate-900'>
                {user?.business_name || user?.name || 'My Store'}
              </div>
              <div className='truncate text-xs text-slate-400 font-medium'>
                {user?.subdomain ? `${user.subdomain}.ferasetu.shop` : 'mystore.ferasetu.shop'}
              </div>
            </div>
          </div>
          <ChevronDown size={16} className='text-slate-400 shrink-0' />
        </div>
      </div>
    </div>
  );

  return (
    <div className='flex h-screen overflow-hidden bg-[#F8FAFC] font-sans'>
      <SEO title={translate('layout.workspaceTitle')} noindex />

      <aside className='hidden h-full md:block'>
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div
          className='fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 shadow-2xl transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className='absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
          aria-label={translate('nav.closeMenu')}
        >
          <X size={20} aria-hidden='true' />
        </button>
        {sidebarContent}
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur lg:px-6'>
          <button
            onClick={() => setSidebarOpen(true)}
            className='flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden'
            aria-label={translate('nav.openMenu')}
          >
            <Menu size={20} aria-hidden='true' />
          </button>

          {/* Search bar matching screenshot */}
          <div className="hidden md:flex items-center gap-2.5 bg-slate-50 px-4 py-2 rounded-xl text-slate-400 text-sm max-w-sm w-full border border-slate-200/80 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search anything..."
              className="bg-transparent border-none outline-none text-slate-800 text-sm w-full placeholder:text-slate-400"
            />
          </div>

          <div className='ml-auto flex items-center gap-3'>
            {/* Refer & Earn button */}
            <button
              onClick={() => navigate('/upgrade')}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Gift size={16} className="text-blue-600" />
              <span>Refer & Earn</span>
            </button>

            {/* Notification Bell */}
            <button
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
                1
              </span>
            </button>

            <LanguageSelector variant='dashboard' />

            <button
              onClick={handleLogout}
              className='flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 shadow-sm cursor-pointer'
              aria-label={translate('logout')}
              title={translate('logout')}
            >
              <LogOut size={18} aria-hidden='true' />
            </button>

            <div
              className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-md cursor-pointer'
              aria-hidden='true'
              title={user?.name || user?.email}
            >
              {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className='flex-1 overflow-y-auto bg-[#F8FAFC] p-5 sm:p-6 lg:p-8'>
          {children}
        </main>
      </div>

      <FeedbackWidget />
    </div>
  );
}

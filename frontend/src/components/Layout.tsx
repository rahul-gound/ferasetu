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
  ArrowUpRight
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
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
  { path: '/products', icon: <Package size={20} />, labelKey: 'products' },
  { path: '/orders', icon: <ShoppingCart size={20} />, labelKey: 'orders' },
  { path: '/analytics', icon: <BarChart3 size={20} />, labelKey: 'analytics' },
  { path: '/fera-ai', icon: <Sparkles size={20} />, labelKey: 'feraAI' },
  { path: '/ai-assistant', icon: <Bot size={20} />, labelKey: 'aiAssistant' },
  { path: '/ai-credits', icon: <Coins size={20} />, labelKey: 'aiCredits' },
  { path: '/survey-feedback', icon: <MessageSquareText size={20} />, labelKey: 'surveyFeedback' },
  { path: '/website-builder', icon: <Globe size={20} />, labelKey: 'websiteBuilder' },
  { path: '/support', icon: <LifeBuoy size={20} />, labelKey: 'support' },
  { path: '/settings', icon: <Settings size={20} />, labelKey: 'settings' }
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
      <div className='flex items-center border-b border-slate-100 px-6 py-5'>
        <img
          src='/logo-official.png'
          alt='FeraSetu'
          className='h-10 w-auto object-contain'
        />
      </div>

      <nav aria-label={translate('layout.merchantNavigation')} className='flex flex-1 flex-col gap-1.5 px-4 py-6'>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `
              flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors
              ${isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
            `}
          >
            {item.icon}
            <span className='flex-1 truncate'>{translate(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className='border-t border-slate-100 px-5 py-5'>
        <div className='rounded-2xl border border-slate-100 bg-slate-50 p-4'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <span className='text-xs font-bold uppercase tracking-wide text-slate-500'>
              {translate('layout.currentPlan')}
            </span>
            <PlanBadge plan={user?.plan} size='sm' />
          </div>

          {isFreePlan(user?.plan) ? (
            <>
              <p className='mb-4 text-xs font-medium leading-relaxed text-slate-500'>
                {translate('layout.freePlanDescription')}
              </p>
              <button
                id='sidebar-upgrade-cta'
                onClick={() => navigate('/upgrade')}
                className='flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
              >
                {translate('upgrade')}
                <ArrowUpRight size={14} aria-hidden='true' />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/upgrade')}
              className='flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
            >
              {translate('layout.managePlan')}
            </button>
          )}
        </div>

        <div className='mt-4 flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white'>
            {(user?.name || 'F').charAt(0).toUpperCase()}
          </div>
          <div className='min-w-0'>
            <div className='truncate text-sm font-bold text-slate-900'>
              {user?.name || translate('layout.yourWorkspace')}
            </div>
            {user?.subdomain && (
              <div className='truncate text-xs font-medium text-slate-500'>
                {user.subdomain}.ferasetu.shop
              </div>
            )}
          </div>
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
        <header className='sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 shadow-sm backdrop-blur lg:px-6'>
          <button
            onClick={() => setSidebarOpen(true)}
            className='flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden'
            aria-label={translate('nav.openMenu')}
          >
            <Menu size={20} aria-hidden='true' />
          </button>

          <div className='ml-auto flex items-center gap-3'>
            <LanguageSelector variant='dashboard' />
            <button
              onClick={handleLogout}
              className='flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2'
              aria-label={translate('logout')}
              title={translate('logout')}
            >
              <LogOut size={18} aria-hidden='true' />
            </button>
            <div
              className='hidden h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-md sm:flex'
              aria-hidden='true'
            >
              {(user?.name || 'F').charAt(0).toUpperCase()}
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

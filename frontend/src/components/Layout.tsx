import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Globe,
  LogOut,
  Menu,
  X,
  LifeBuoy,
  Coins,
  MessageSquareText,
  Mail,
  Sparkles,
  ArrowUpRight,
  Search,
  Bell,
  Gift,
  ChevronDown,
  User,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from './SEO';
import api from '../services/api';
import type { TranslationKey } from '../i18n/types';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  labelKey?: TranslationKey;
  label: string;
  badge?: string | number;
  badgeColor?: 'orange' | 'blue';
}

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Fetch genuine orders count using unified queryKey ['orders']
  const { data: ordersData } = useQuery<any>({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const res = await api.get('/orders');
        return res.data.orders || res.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  const ordersList: any[] = useMemo(() => {
    if (Array.isArray(ordersData)) return ordersData;
    if (ordersData && Array.isArray((ordersData as any).orders)) return (ordersData as any).orders;
    return [];
  }, [ordersData]);

  const ordersCount = useMemo(() => ordersList.length, [ordersList]);
  const pendingOrdersCount = useMemo(() => {
    return ordersList.filter(o => o.status === 'pending' || o.status === 'processing').length;
  }, [ordersList]);

  const navItems: NavItem[] = useMemo(() => [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/products', icon: <Package size={20} />, label: 'Products' },
    { path: '/orders', icon: <ShoppingCart size={20} />, label: 'Orders', badge: ordersCount > 0 ? ordersCount : undefined, badgeColor: 'orange' },
    { path: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
    { path: '/ferasetu-ai', icon: <Sparkles size={20} />, label: 'FeraSetu AI' },
    { path: '/ai-credits', icon: <Coins size={20} />, label: 'AI Credits', badge: user?.ai_credits_balance ?? 20, badgeColor: 'blue' },
    { path: '/survey-feedback', icon: <MessageSquareText size={20} />, label: 'Survey & Feedback' },
    { path: '/website-builder', icon: <Globe size={20} />, label: 'Website Builder' },
    { path: '/support', icon: <LifeBuoy size={20} />, label: 'Support' },
    { path: '/settings/email', icon: <Mail size={20} />, label: 'Email Settings' }
  ], [ordersCount, user?.ai_credits_balance]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const planTitle = user?.plan ? (user.plan.charAt(0).toUpperCase() + user.plan.slice(1)) : 'Free';
  const planSubtitle = user?.plan === 'pro' ? 'Unlimited Access' : user?.plan === 'business' ? '500 Products Limit' : user?.plan === 'starter' ? '50 Products Limit' : 'Free Forever';
  const storeDisplayName = user?.business_name || user?.name || 'My Store';
  const storeSubdomain = user?.subdomain ? `${user.subdomain}.ferasetu.shop` : 'mystore.ferasetu.shop';
  const avatarLetter = (storeDisplayName || user?.email || 'M').charAt(0).toUpperCase();

  const sidebarContent = (
    <div className='flex h-full w-[280px] flex-col overflow-y-auto border-r border-slate-200 bg-white'>
      <div className='flex flex-col border-b border-slate-100 px-6 py-5 pr-14'>
        <img
          src='/logo-official.png'
          alt='FeraSetu'
          className='h-8 w-auto object-contain mb-1'
        />
        <span className='text-[10px] font-semibold text-slate-400 tracking-wide'>
          Your Business. Our Bridge.
        </span>
      </div>

      <nav aria-label="Merchant Navigation" className='flex flex-1 flex-col gap-1.5 px-4 py-6'>
        {navItems.map(item => {
          const badgeVal = item.badge;
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
              <span className='flex-1 truncate'>{item.label}</span>
              {badgeVal !== undefined && Number(badgeVal) > 0 ? (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  item.badgeColor === 'orange'
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-blue-100 text-[#0052FF]'
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
          <h4 className='text-xl font-extrabold text-[#0052FF] mb-0.5'>{planTitle}</h4>
          <p className='text-xs text-slate-500 mb-3.5'>{planSubtitle}</p>
          <button
            onClick={() => navigate('/upgrade')}
            className='flex w-full items-center justify-center gap-2 rounded-xl bg-[#0052FF] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-600 cursor-pointer'
          >
            Upgrade Plan
          </button>
        </div>

        <div
          onClick={() => navigate('/settings/email')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/settings/email'); }}
          className='mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer'
          title="Manage store settings"
        >
          <div className='flex items-center gap-3 min-w-0'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-sm'>
              {avatarLetter}
            </div>
            <div className='min-w-0'>
              <div className='truncate text-sm font-bold text-slate-900'>
                {storeDisplayName}
              </div>
              <div className='truncate text-xs text-slate-400 font-medium'>
                {storeSubdomain}
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
      <SEO title="Merchant Workspace | FeraSetu" noindex />

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
          className='absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
          aria-label={translate('nav.closeMenu')}
        >
          <X size={18} aria-hidden='true' />
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
              onClick={() => navigate('/refer-earn')}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0052FF] text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Gift size={16} className="text-[#0052FF]" />
              <span>Refer & Earn</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => navigate('/orders')}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
              title={pendingOrdersCount > 0 ? `${pendingOrdersCount} pending orders` : 'Notifications'}
              aria-label="View orders notifications"
            >
              <Bell size={18} />
              {pendingOrdersCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
                  {pendingOrdersCount}
                </span>
              ) : null}
            </button>

            {/* User Profile Pill with downward caret & interactive menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-1.5 rounded-full p-1 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                aria-label="User menu"
                aria-expanded={profileMenuOpen}
              >
                <div
                  className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-sm'
                  aria-hidden='true'
                >
                  {avatarLetter}
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-50">
                  <div className="px-3 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{storeDisplayName}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate">{user?.email || storeSubdomain}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileMenuOpen(false); navigate('/settings/email'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                    >
                      <Mail size={14} className="text-slate-400" />
                      Email Settings
                    </button>
                    <button
                      onClick={() => { setProfileMenuOpen(false); navigate('/refer-earn'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                    >
                      <Gift size={14} className="text-[#0052FF]" />
                      Refer & Earn
                    </button>
                    <button
                      onClick={() => { setProfileMenuOpen(false); navigate('/upgrade'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                    >
                      <Sparkles size={14} className="text-amber-500" />
                      Upgrade Plan
                    </button>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut size={14} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className='flex-1 overflow-y-auto bg-[#F8FAFC] p-5 sm:p-6 lg:p-8'>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

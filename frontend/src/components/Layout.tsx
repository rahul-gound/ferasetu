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
  Bell,
  Gift,
  ChevronDown,
  Settings,
  Zap,
  ArrowUpRight,
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

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Fetch orders count — unified queryKey ['orders'] shared with DashboardPage
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

  const pendingOrdersCount = useMemo(
    () => ordersList.filter(o => o.status === 'pending' || o.status === 'processing').length,
    [ordersList]
  );
  const totalOrdersCount = ordersList.length;

  // Nav groups: MAIN / GROW / ENGAGE / SETTINGS
  const navGroups: NavGroup[] = useMemo(() => [
    {
      groupLabel: 'MAIN',
      items: [
        { path: '/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
        { path: '/products', icon: <Package size={17} />, label: 'Products' },
        {
          path: '/orders', icon: <ShoppingCart size={17} />, label: 'Orders',
          badge: totalOrdersCount > 0 ? totalOrdersCount : undefined,
          badgeColor: 'orange',
        },
        { path: '/analytics', icon: <BarChart3 size={17} />, label: 'Analytics' },
      ],
    },
    {
      groupLabel: 'GROW',
      items: [
        {
          path: '/ferasetu-ai', icon: <Sparkles size={17} />, label: 'FeraSetu AI',
        },
        {
          path: '/ai-credits', icon: <Coins size={17} />, label: 'AI Credits',
          badge: user?.ai_credits_balance ?? 20,
          badgeColor: 'blue',
        },
        { path: '/website-builder', icon: <Globe size={17} />, label: 'Website Builder' },
      ],
    },
    {
      groupLabel: 'ENGAGE',
      items: [
        { path: '/survey-feedback', icon: <MessageSquareText size={17} />, label: 'Survey & Feedback' },
        { path: '/support', icon: <LifeBuoy size={17} />, label: 'Support' },
      ],
    },
    {
      groupLabel: 'SETTINGS',
      items: [
        { path: '/settings/email', icon: <Mail size={17} />, label: 'Domains & Email' },
      ],
    },
  ], [totalOrdersCount, user?.ai_credits_balance]);

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

  const planTitle = user?.plan
    ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1)
    : 'Free';
  const storeDisplayName = user?.business_name || user?.name || 'My Store';
  const storeSubdomain = user?.hostname || (user?.subdomain ? `${user.subdomain}.ferasetu.com` : 'mystore.ferasetu.com');
  const avatarLetter = (storeDisplayName || user?.email || 'M').charAt(0).toUpperCase();

  const sidebarContent = (
    <div className="flex h-full w-[256px] flex-col overflow-y-auto border-r border-[#E5EAF1] bg-white">
      {/* Brand */}
      <div className="flex flex-col border-b border-[#E5EAF1] px-5 py-4 pr-12">
        <img
          src="/logo-official.png"
          alt="FeraSetu"
          className="h-10 w-auto object-contain self-start"
        />
      </div>

      {/* Grouped Navigation */}
      <nav aria-label="Merchant Navigation" className="flex flex-1 flex-col px-3 py-4 gap-5">
        {navGroups.map(group => (
          <div key={group.groupLabel}>
            <p className="text-[9px] font-bold tracking-widest text-[#667085]/70 uppercase px-2 mb-1.5">
              {group.groupLabel}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(item => {
                const badgeVal = item.badge;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex min-h-[38px] items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150
                      ${isActive
                        ? 'bg-blue-50 text-[#0052FF] font-semibold border-l-2 border-[#0052FF] pl-[10px]'
                        : 'text-[#667085] hover:bg-slate-50 hover:text-[#152238]'}
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]`
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {badgeVal !== undefined && (
                      typeof badgeVal === 'string'
                        ? (
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide ${
                            item.badgeColor === 'orange'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-blue-100 text-[#0052FF]'
                          }`}>
                            {badgeVal}
                          </span>
                        )
                        : Number(badgeVal) > 0 ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.badgeColor === 'orange'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-blue-100 text-[#0052FF]'
                          }`}>
                            {badgeVal}
                          </span>
                        ) : null
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Plan + Store Profile */}
      <div className="border-t border-[#E5EAF1] px-4 py-4 space-y-3">
        {/* Plan badge + upgrade */}
        <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FC] p-3.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#667085] mb-0.5">Current Plan</p>
            <p className="text-sm font-extrabold text-[#0052FF]">{planTitle}</p>
          </div>
          <button
            onClick={() => navigate('/upgrade')}
            className="flex items-center gap-1.5 rounded-xl bg-[#0052FF] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-600 transition-colors cursor-pointer shrink-0"
          >
            <Zap size={11} className="shrink-0" />
            Upgrade
          </button>
        </div>

        {/* Store profile */}
        <button
          type="button"
          onClick={() => navigate('/settings/email')}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-[#E5EAF1] bg-white p-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
          title="Manage store settings"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#152238] text-xs font-bold text-white">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-[#152238]">
                {storeDisplayName}
              </div>
              <div className="truncate text-[10px] text-[#667085]">
                {storeSubdomain}
              </div>
            </div>
          </div>
          <Settings size={14} className="text-[#667085] shrink-0" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F8FC] font-sans">
      <SEO title="Merchant Workspace | FeraSetu" noindex />

      {/* Desktop sidebar */}
      <aside className="hidden h-full md:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar panel */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 shadow-2xl transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5EAF1] bg-white text-[#667085] shadow-sm transition-colors hover:bg-slate-50 hover:text-[#152238] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]"
          aria-label={translate('nav.closeMenu')}
        >
          <X size={18} aria-hidden="true" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-[64px] shrink-0 items-center justify-between gap-4 border-b border-[#E5EAF1] bg-white/95 px-5 shadow-sm backdrop-blur lg:px-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5EAF1] text-[#667085] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] md:hidden"
            aria-label={translate('nav.openMenu')}
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            className="hidden md:flex items-center gap-2 bg-[#F6F8FC] px-3.5 py-2 rounded-xl text-[#667085] text-sm max-w-xs w-full border border-[#E5EAF1] focus-within:border-[#0052FF] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="bg-transparent border-none outline-none text-[#152238] text-sm w-full placeholder:text-[#667085]"
            />
          </form>

          <div className="ml-auto flex items-center gap-2.5">
            {/* Refer & Earn */}
            <button
              onClick={() => navigate('/refer-earn')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5EAF1] bg-white hover:bg-slate-50 text-[#0052FF] text-[12px] font-semibold transition-colors cursor-pointer"
            >
              <Gift size={14} />
              <span>Refer & Earn</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => navigate('/orders')}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5EAF1] bg-white text-[#667085] hover:bg-slate-50 transition-colors cursor-pointer"
              title={pendingOrdersCount > 0 ? `${pendingOrdersCount} pending orders` : 'Orders'}
              aria-label="View orders"
            >
              <Bell size={16} />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E5484D] text-[9px] font-bold text-white shadow">
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-1.5 rounded-full p-1 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                aria-label="User menu"
                aria-expanded={profileMenuOpen}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#152238] text-xs font-bold text-white">
                  {avatarLetter}
                </div>
                <ChevronDown
                  size={13}
                  className={`text-[#667085] transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white p-2 shadow-xl border border-[#E5EAF1] z-50">
                  <div className="px-3 py-2 border-b border-[#E5EAF1] mb-1">
                    <p className="text-xs font-bold text-[#152238] truncate">{storeDisplayName}</p>
                    <p className="text-[11px] text-[#667085] font-medium truncate">{user?.email || storeSubdomain}</p>
                  </div>
                  <button
                    onClick={() => { setProfileMenuOpen(false); navigate('/settings/email'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[#152238] hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <Mail size={13} className="text-[#667085]" />
                    Email Settings
                  </button>
                  <button
                    onClick={() => { setProfileMenuOpen(false); navigate('/refer-earn'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[#152238] hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <Gift size={13} className="text-[#0052FF]" />
                    Refer & Earn
                  </button>
                  <button
                    onClick={() => { setProfileMenuOpen(false); navigate('/upgrade'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[#152238] hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <Sparkles size={13} className="text-[#FF8A00]" />
                    Upgrade Plan
                    <ArrowUpRight size={11} className="ml-auto text-[#667085]" />
                  </button>
                  <div className="border-t border-[#E5EAF1] mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[#E5484D] hover:bg-red-50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut size={13} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#F6F8FC] p-5 sm:p-6 lg:p-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

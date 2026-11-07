import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
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
  MessageSquare,
  MessageSquareText,
  Mail,
  Sparkles,
  Bell,
  Gift,
  Truck,
  ArrowRightLeft,
  Tag,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Settings,
  Sliders,
  Zap,
  ArrowUpRight,
  Users,
  Server,
  ExternalLink,
  Copy,
  CreditCard,
  Warehouse,
  ShieldCheck,
  Megaphone,
  Palette,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from './SEO';
import FeraSetuUpdatesCenter, { useFeraSetuUpdates } from './notifications/FeraSetuUpdatesCenter';
import { isSyntheticUserIdentifier, cleanUserSubtitle, resolveEffectiveProfilePicture } from '../utils/avatarUtils';
import { platformSitesApi } from '../services/platformSitesApi';

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
  const location = useLocation();
  const isWebsiteBuilder =
    (location.pathname === '/website-builder' ||
      location.pathname.startsWith('/pro-studio') ||
      location.pathname.startsWith('/pro')) &&
    !location.pathname.includes('/settings');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [hasPlatformAccess, setHasPlatformAccess] = useState(false);

  useEffect(() => {
    let active = true;
    platformSitesApi.getEntitlement()
      .then((res) => {
        if (active && res.status === 'authorized') {
          setHasPlatformAccess(true);
        }
      })
      .catch(() => {
        if (active) setHasPlatformAccess(false);
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // FeraSetu Updates & Messages hook
  const {
    announcements,
    unreadCount: unreadUpdatesCount,
    readIds,
    markAsRead,
    markAllAsRead,
  } = useFeraSetuUpdates();

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

  // Fetch customer stats for sidebar badge
  const { data: customersData } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const res = await api.get('/customers');
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });

  const totalCustomersCount = customersData?.stats?.total_customers ?? customersData?.customers?.length ?? 0;

  // ── 4+1 Daily Rhythm Anchors (Hick's Law - Zero Clutter) ──
  const dailyItems: NavItem[] = useMemo(() => [
    { path: '/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    {
      path: '/orders',
      icon: <ShoppingCart size={17} />,
      label: 'Orders & Counter',
      badge: totalOrdersCount > 0 ? totalOrdersCount : undefined,
      badgeColor: 'orange',
    },
    { path: '/products', icon: <Package size={17} />, label: 'Products & Stock' },
    {
      path: '/customers',
      icon: <Users size={17} />,
      label: 'Customers & Khata',
      badge: totalCustomersCount > 0 ? totalCustomersCount : undefined,
      badgeColor: 'blue',
    },
    { path: '/website-builder', icon: <Globe size={17} />, label: 'Storefront Builder' },
  ], [totalOrdersCount, totalCustomersCount]);

  // ── Shop Toolkit (Shopify-Grade Power Features Drawer) ──
  const toolkitItems: NavItem[] = useMemo(() => [
    { path: '/dashboard/discounts', icon: <Tag size={17} />, label: 'Discounts & Offers' },
    {
      path: '/transfers',
      icon: <Truck size={17} />,
      label: 'Stock Transfers',
      badge: 'BETA',
      badgeColor: 'blue',
    },
    {
      path: '/gift-cards',
      icon: <Gift size={17} />,
      label: 'Digital Gift Cards',
      badge: 'BETA',
      badgeColor: 'orange',
    },
    { path: '/analytics', icon: <BarChart3 size={17} />, label: 'Analytics & Traffic' },
    { path: '/ferasetu-ai', icon: <Sparkles size={17} />, label: 'Fera AI Copilot' },
    {
      path: '/ai-credits',
      icon: <Coins size={17} />,
      label: 'AI Credits',
      badge: user?.ai_credits_balance ?? 20,
      badgeColor: 'blue',
    },
    { path: '/whatsapp-assistant', icon: <MessageSquare size={17} />, label: 'WhatsApp Assistant' },
    { path: '/website-design', icon: <Palette size={17} />, label: 'Website & Design' },
    { path: '/domains', icon: <Globe size={17} />, label: 'Domains & DNS' },
    { path: '/marketing-and-seo', icon: <Megaphone size={17} />, label: 'Marketing & SEO' },
    { path: '/payments', icon: <CreditCard size={17} />, label: 'Payments & Settlements' },
    { path: '/inventory-and-locations', icon: <Warehouse size={17} />, label: 'Inventory & Locations' },
    { path: '/staff', icon: <ShieldCheck size={17} />, label: 'Staff & Access' },
    { path: '/website-settings', icon: <Sliders size={17} />, label: 'SEO & Search Engine' },
    { path: '/settings/email', icon: <Mail size={17} />, label: 'Custom Domains & Mail' },
    { path: '/support', icon: <LifeBuoy size={17} />, label: 'Merchant Support' },
  ], [user?.ai_credits_balance]);

  // Contextual expansion: Open toolkit if user is visiting any toolkit route
  const isToolkitRoute = useMemo(() => {
    const p = location.pathname;
    return (
      p.startsWith('/dashboard/discounts') ||
      p.startsWith('/transfers') ||
      p.startsWith('/gift-cards') ||
      p.startsWith('/analytics') ||
      p.startsWith('/ferasetu-ai') ||
      p.startsWith('/ai-credits') ||
      p.startsWith('/whatsapp-assistant') ||
      p.startsWith('/website-settings') ||
      p.startsWith('/website-design') ||
      p.startsWith('/website-and-design') ||
      p.startsWith('/domains') ||
      p.startsWith('/marketing-and-seo') ||
      p.startsWith('/payments') ||
      p.startsWith('/inventory-and-locations') ||
      p.startsWith('/staff') ||
      p.startsWith('/settings') ||
      p.startsWith('/support') ||
      p.startsWith('/survey-feedback')
    );
  }, [location.pathname]);

  const [toolkitOpen, setToolkitOpen] = useState(isToolkitRoute);

  useEffect(() => {
    if (isToolkitRoute) {
      setToolkitOpen(true);
    }
  }, [isToolkitRoute]);

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

  const storeDisplayName = useMemo(() => {
    if (user?.business_name && !isSyntheticUserIdentifier(user.business_name)) {
      return user.business_name.trim();
    }
    if (user?.name && !isSyntheticUserIdentifier(user.name)) {
      return user.name.trim();
    }
    return 'My Store';
  }, [user?.business_name, user?.name]);

  const storeSubdomain = useMemo(() => {
    if (user?.hostname && !isSyntheticUserIdentifier(user.hostname)) {
      return user.hostname.trim();
    }
    const slug = user?.organization?.store_slug || user?.subdomain;
    if (slug && !isSyntheticUserIdentifier(slug)) {
      return `${slug}.ferasetu.com`;
    }
    return 'mystore.ferasetu.com';
  }, [user?.hostname, user?.organization?.store_slug, user?.subdomain]);

  const userSubtitle = useMemo(() => {
    return cleanUserSubtitle(user?.email, storeSubdomain);
  }, [user?.email, storeSubdomain]);

  const userProfilePic = useMemo(() => {
    return resolveEffectiveProfilePicture({
      customPicture: user?.profile_picture,
      oauthPicture: (user as any)?.profilePictureUrl,
      seedName: storeDisplayName || user?.email,
      preferredStyle: 'google',
    });
  }, [user?.profile_picture, (user as any)?.profilePictureUrl, storeDisplayName, user?.email]);
  const avatarLetter = (storeDisplayName || 'M').charAt(0).toUpperCase();

  const sidebarContent = (
    <div
      className={`flex h-full flex-col overflow-hidden border-r border-[#E5EAF1] bg-white transition-all duration-300 ${
        isCollapsed ? 'w-[80px]' : 'w-[256px]'
      }`}
    >
      {/* Brand & Toggle Header */}
      <div
        className={`flex border-b border-[#E5EAF1] py-4 transition-all duration-300 ${
          isCollapsed
            ? 'flex-col items-center justify-center px-2 gap-3'
            : 'items-center justify-between px-5'
        }`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          {isCollapsed ? (
            <img
              src="/favicon.png"
              alt="FeraSetu"
              className="h-8 w-8 object-contain self-center"
            />
          ) : (
            <img
              src="/logo-official.png"
              alt="FeraSetu"
              className="h-9 w-auto object-contain self-start"
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5EAF1] bg-white text-[#667085] hover:bg-slate-50 hover:text-[#152238] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] cursor-pointer shrink-0"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* ── 4+1 Daily Rhythm Navigation & Shop Toolkit ── */}
      <nav
        aria-label="Merchant Navigation"
        className={`flex flex-1 flex-col overflow-y-auto min-h-0 py-4 transition-all duration-300 ${
          isCollapsed ? 'px-2 gap-3' : 'px-3 gap-3'
        }`}
      >
        {/* Helper function for nav item rendering */}
        {(() => {
          const renderItem = (item: NavItem) => {
            const badgeVal = item.badge;
            const hasBadge = badgeVal !== undefined && (typeof badgeVal === 'string' || Number(badgeVal) > 0);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-[38px] items-center rounded-xl text-[13px] font-medium transition-all duration-150 ${
                    isCollapsed
                      ? `justify-center px-0 py-2.5 ${
                          isActive
                            ? 'bg-blue-50 text-[#0052FF] font-semibold'
                            : 'text-[#667085] hover:bg-slate-50 hover:text-[#152238]'
                        }`
                      : `gap-2.5 px-3 py-2 ${
                          isActive
                            ? 'bg-blue-50 text-[#0052FF] font-semibold border-l-2 border-[#0052FF] pl-[10px]'
                            : 'text-[#667085] hover:bg-slate-50 hover:text-[#152238]'
                        }`
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]`
                }
              >
                <span className="relative shrink-0 flex items-center justify-center">
                  {item.icon}
                  {isCollapsed && hasBadge && (
                    <span
                      className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ring-2 ring-white ${
                        item.badgeColor === 'orange' ? 'bg-orange-500' : 'bg-[#0052FF]'
                      }`}
                    />
                  )}
                </span>
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {hasBadge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide ${
                          item.badgeColor === 'orange'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-blue-100 text-[#0052FF]'
                        }`}
                      >
                        {badgeVal}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          };

          return (
            <>
              {/* 1. Daily Core Anchors */}
              <div>
                {!isCollapsed && (
                  <p className="text-[9px] font-bold tracking-widest text-[#667085]/70 uppercase px-2 mb-1.5">
                    Daily Counter
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {dailyItems.map(renderItem)}
                </div>
              </div>

              {/* 2. Soft Divider */}
              <div className="my-1 border-t border-[#E5EAF1]/70" />

              {/* 3. Shop Toolkit (Shopify-Grade Power Features Drawer) */}
              <div>
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => setToolkitOpen(!toolkitOpen)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left hover:bg-slate-100/70 transition-colors cursor-pointer group"
                    title={toolkitOpen ? 'Collapse power tools' : 'Expand power tools'}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-800 transition-colors">
                        Shop Toolkit
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-[9px] font-bold text-[#0052FF]">
                        Power Tools
                      </span>
                    </div>
                    <div className="text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
                      {toolkitOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>
                ) : (
                  <div className="my-1 border-t border-[#E5EAF1]/60" />
                )}

                {/* If collapsed on desktop, always show icons. If expanded, toggle via toolkitOpen */}
                {(toolkitOpen || isCollapsed) && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {toolkitItems.map(renderItem)}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {hasPlatformAccess && (
          <div className="mt-3 pt-3 border-t border-[#E5EAF1]/70 px-3">
            <button
              type="button"
              onClick={() => navigate('/platform-sites')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0052FF] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 transition-colors cursor-pointer"
              title="Platform Sites — Internal Infrastructure"
            >
              <Server size={16} className="text-[#0052FF] shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left font-bold truncate">Platform Sites</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0052FF] text-white">
                    ADMIN
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </nav>

      {/* Bottom: Plan + Store Profile */}
      <div
        className={`border-t border-[#E5EAF1] transition-all duration-300 ${
          isCollapsed ? 'px-2 py-3 space-y-2 flex flex-col items-center' : 'px-4 py-4 space-y-3'
        }`}
      >
        {isCollapsed ? (
          <>
            {/* Collapsed Plan upgrade icon button */}
            <button
              type="button"
              onClick={() => navigate('/upgrade')}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0052FF] text-white shadow-sm shadow-blue-600/20 hover:bg-blue-600 transition-colors cursor-pointer"
              title={`Current Plan: ${planTitle} — Upgrade`}
              aria-label="Upgrade Plan"
            >
              <Zap size={16} />
            </button>

            {/* Collapsed Store profile avatar button */}
            <button
              type="button"
              onClick={() => navigate('/settings/email')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5EAF1] bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              title={`${storeDisplayName} (${storeSubdomain}) — Manage store settings`}
              aria-label="Manage store settings"
            >
              {userProfilePic ? (
                <img
                  src={userProfilePic}
                  alt={storeDisplayName}
                  className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#152238] text-xs font-bold text-white ${
                  userProfilePic ? 'hidden' : 'flex'
                }`}
              >
                {avatarLetter}
              </div>
            </button>
          </>
        ) : (
          <>
            {/* Plan badge + upgrade */}
            <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FC] p-3.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#667085] mb-0.5">Current Plan</p>
                <p className="text-sm font-extrabold text-[#0052FF]">{planTitle}</p>
              </div>
              <button
                type="button"
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
                {userProfilePic ? (
                  <img
                    src={userProfilePic}
                    alt={storeDisplayName}
                    className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#152238] text-xs font-bold text-white ${
                    userProfilePic ? 'hidden' : 'flex'
                  }`}
                >
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
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F8FC] font-sans">
      <SEO title="Merchant Workspace | FeraSetu" noindex />

      {/* Desktop sidebar */}
      <aside className={`hidden h-full shrink-0 transition-all duration-300 md:block ${isCollapsed ? 'w-[80px]' : 'w-[256px]'}`}>
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
        {/* Top header - hidden when merchant is on website builder tab to maximize canvas */}
        {!isWebsiteBuilder && (
          <header className="sticky top-0 z-30 flex h-[64px] shrink-0 items-center justify-between gap-3 sm:gap-4 border-b border-[#E5EAF1] bg-white/95 px-4 sm:px-5 shadow-xs backdrop-blur lg:px-6">
            {/* Left: Mobile hamburger & Live Store Pill */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5EAF1] text-[#667085] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] md:hidden shrink-0 cursor-pointer"
              aria-label={translate('nav.openMenu')}
            >
              <Menu size={18} aria-hidden="true" />
            </button>

            {/* Live Storefront Access Pill */}
            {storeSubdomain && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50/80 text-emerald-900 text-[11px] font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate max-w-[120px] md:max-w-[180px] lg:max-w-[220px]">
                  {storeSubdomain}
                </span>
                <a
                  href={`https://${storeSubdomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-950 p-0.5 rounded hover:bg-emerald-100 transition-colors shrink-0"
                  title="Visit Live Storefront"
                >
                  <ExternalLink size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://${storeSubdomain}`);
                    toast.success('Store URL copied to clipboard!');
                  }}
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline ml-1 cursor-pointer shrink-0"
                  title="Copy Store Link"
                >
                  Copy
                </button>
              </div>
            )}
          </div>

          {/* Search bar with Ctrl+K shortcut */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            className="flex-1 max-w-xs md:max-w-sm flex items-center gap-2 bg-[#F6F8FC] px-3.5 py-2 rounded-xl text-[#667085] text-xs sm:text-sm border border-[#E5EAF1] focus-within:border-[#0052FF] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, orders..."
              className="bg-transparent border-none outline-none text-[#152238] text-xs sm:text-sm w-full placeholder:text-[#667085]"
            />
            <kbd className="hidden lg:inline-flex text-[10px] font-mono font-bold bg-white border border-[#E5EAF1] px-1.5 py-0.5 rounded text-slate-400 shrink-0 shadow-2xs">
              Ctrl+K
            </kbd>
          </form>

          <div className="ml-auto flex items-center gap-2.5">
            {/* Transfers Beta Navbar Pill */}
            <button
              type="button"
              onClick={() => navigate('/transfers/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200/90 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-950 text-[12px] font-semibold transition-all shadow-2xs cursor-pointer group active:scale-[0.98]"
              title="Create an Inventory Transfer (Beta)"
              aria-label="Create an inventory transfer"
            >
              <Truck size={14} className="text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Transfers</span>
              <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                BETA
              </span>
            </button>

            {/* Gift Cards Beta Navbar Pill */}
            <button
              type="button"
              onClick={() => navigate('/gift-cards/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200/90 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-[12px] font-semibold transition-all shadow-2xs cursor-pointer group active:scale-[0.98]"
              title="Create a Digital Gift Card product (Beta)"
              aria-label="Create a digital gift card product"
            >
              <Gift size={14} className="text-amber-600 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Gift Cards</span>
              <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                BETA
              </span>
            </button>

            {/* Refer & Earn */}
            <button
              onClick={() => navigate('/refer-earn')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5EAF1] bg-white hover:bg-slate-50 text-[#0052FF] text-[12px] font-semibold transition-colors cursor-pointer"
            >
              <Gift size={14} />
              <span>Refer & Earn</span>
            </button>

            {/* FeraSetu Updates & Announcements Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUpdatesOpen(!updatesOpen)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5EAF1] bg-white text-[#667085] hover:bg-slate-50 hover:text-[#152238] transition-colors cursor-pointer ${
                  updatesOpen ? 'bg-slate-100 text-[#0052FF] ring-2 ring-blue-100' : ''
                }`}
                title={
                  unreadUpdatesCount > 0
                    ? `${unreadUpdatesCount} new update${unreadUpdatesCount > 1 ? 's' : ''} from FeraSetu`
                    : 'FeraSetu updates & messages'
                }
                aria-label="View FeraSetu updates and messages"
                aria-expanded={updatesOpen}
              >
                <Bell size={16} />
                {unreadUpdatesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#E5484D] text-[9px] font-bold text-white shadow">
                    {unreadUpdatesCount > 9 ? '9+' : unreadUpdatesCount}
                  </span>
                )}
              </button>

              <FeraSetuUpdatesCenter
                isOpen={updatesOpen}
                onClose={() => setUpdatesOpen(false)}
                unreadCount={unreadUpdatesCount}
                announcements={announcements}
                readIds={readIds}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
              />
            </div>

            {/* User Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-1.5 rounded-full p-1 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                aria-label="User menu"
                aria-expanded={profileMenuOpen}
              >
                {userProfilePic ? (
                  <img
                    src={userProfilePic}
                    alt={storeDisplayName}
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`h-8 w-8 items-center justify-center rounded-full bg-[#152238] text-xs font-bold text-white ${
                    userProfilePic ? 'hidden' : 'flex'
                  }`}
                >
                  {avatarLetter}
                </div>
                <ChevronDown
                  size={13}
                  className={`text-[#667085] transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white p-2 shadow-xl border border-[#E5EAF1] z-50">
                  <div className="flex items-center gap-2.5 px-3 py-2 border-b border-[#E5EAF1] mb-1">
                    {userProfilePic ? (
                      <img
                        src={userProfilePic}
                        alt={storeDisplayName}
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#152238] text-xs font-bold text-white ${
                        userProfilePic ? 'hidden' : 'flex'
                      }`}
                    >
                      {avatarLetter}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#152238] truncate">{storeDisplayName}</p>
                      {userSubtitle && (
                        <p className="text-[11px] text-[#667085] font-medium truncate">{userSubtitle}</p>
                      )}
                    </div>
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
        )}

        {/* Page content */}
        <main
          className={
            isWebsiteBuilder
              ? 'flex-1 min-h-0 overflow-hidden bg-white p-0'
              : 'flex-1 overflow-y-auto bg-[#F6F8FC] p-3.5 sm:p-6 lg:p-8'
          }
        >
          {children ?? <Outlet context={{ setSidebarOpen, isCollapsed, setIsCollapsed }} />}
        </main>
      </div>
    </div>
  );
}

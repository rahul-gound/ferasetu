import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Bot, Coins, Sparkles, Search, ArrowUpRight, 
  CheckCircle2, AlertCircle, RefreshCw, CreditCard, 
  Plus, Sliders, Globe, MessageSquare, Calendar, 
  ChevronLeft, ChevronRight, TrendingUp, Store,
  Zap, Clock, ShieldCheck, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

interface ShopkeeperUsage {
  id: string;
  name: string;
  email: string;
  business_name: string;
  phone?: string;
  subdomain?: string;
  plan: string;
  ai_credits_balance: number;
  ai_credits_monthly_limit: number;
  ai_credits_used_month: number;
  ai_credits_reset_at?: string;
  joined_at?: string;
  total_calls: number;
  total_credits_used: number;
  last_30d_credits_used: number;
  last_ai_activity?: string;
}

interface SummaryStats {
  totalCreditsUsed: number;
  totalCalls: number;
  totalTokens: number;
  monthCreditsUsed: number;
  monthCalls: number;
  todayCreditsUsed: number;
  todayCalls: number;
  totalBalanceRemaining: number;
  totalMerchants: number;
  activeShopkeepersCount: number;
  depletedMerchants: number;
  lowBalanceMerchants: number;
  totalCreditsPurchased: number;
  totalPurchaseRevenue: number;
  purchaseCount: number;
}

export default function AdminAICreditsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'depleted' | 'low'>('all');
  const [activeTab, setActiveTab] = useState<'shopkeepers' | 'logs' | 'purchases'>('shopkeepers');
  const [sortBy, setSortBy] = useState<'credits_used' | 'balance' | 'calls' | 'name'>('credits_used');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Credit adjustment modal state
  const [adjustingShopkeeper, setAdjustingShopkeeper] = useState<ShopkeeperUsage | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'set'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>('Complimentary support top-up');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const token = localStorage.getItem('admin_token');

  const fetchAiCreditsData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/ai-credits`, {
        params: { search: search.trim() },
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err: any) {
      toast.error('Failed to load AI credit analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiCreditsData();
  }, [search]);

  const summary: SummaryStats = data?.summary || {
    totalCreditsUsed: 0,
    totalCalls: 0,
    totalTokens: 0,
    monthCreditsUsed: 0,
    monthCalls: 0,
    todayCreditsUsed: 0,
    todayCalls: 0,
    totalBalanceRemaining: 0,
    totalMerchants: 0,
    activeShopkeepersCount: 0,
    depletedMerchants: 0,
    lowBalanceMerchants: 0,
    totalCreditsPurchased: 0,
    totalPurchaseRevenue: 0,
    purchaseCount: 0
  };

  const rawShopkeepers: ShopkeeperUsage[] = data?.shopkeepers || [];
  const usageByType: any[] = data?.byUsageType || [];
  const logs: any[] = data?.logs || [];
  const purchases: any[] = data?.recentPurchases || [];

  // Filter and sort shopkeepers
  const filteredShopkeepers = useMemo(() => {
    let list = [...rawShopkeepers];

    if (filterType === 'active') {
      list = list.filter(s => (s.total_credits_used || 0) > 0 || (s.total_calls || 0) > 0);
    } else if (filterType === 'depleted') {
      list = list.filter(s => (s.ai_credits_balance || 0) <= 0);
    } else if (filterType === 'low') {
      list = list.filter(s => (s.ai_credits_balance || 0) > 0 && (s.ai_credits_balance || 0) <= 10);
    }

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortBy === 'credits_used') {
        valA = a.total_credits_used || 0;
        valB = b.total_credits_used || 0;
      } else if (sortBy === 'balance') {
        valA = a.ai_credits_balance || 0;
        valB = b.ai_credits_balance || 0;
      } else if (sortBy === 'calls') {
        valA = a.total_calls || 0;
        valB = b.total_calls || 0;
      } else if (sortBy === 'name') {
        valA = (a.business_name || a.name || '').toLowerCase();
        valB = (b.business_name || b.name || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return list;
  }, [rawShopkeepers, filterType, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredShopkeepers.length / itemsPerPage) || 1;
  const paginatedShopkeepers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredShopkeepers.slice(start, start + itemsPerPage);
  }, [filteredShopkeepers, currentPage]);

  const handleOpenAdjustModal = (shopkeeper: ShopkeeperUsage) => {
    setAdjustingShopkeeper(shopkeeper);
    setAdjustMode('add');
    setAdjustAmount(50);
    setAdjustReason('Complimentary onboarding top-up');
  };

  const handleSaveCreditAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingShopkeeper) return;
    if (isNaN(adjustAmount) || (adjustMode === 'add' && adjustAmount === 0)) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await axios.post(
        `${API}/admin/users/${adjustingShopkeeper.id}/ai-credits`,
        {
          credits: adjustAmount,
          mode: adjustMode,
          reason: adjustReason.trim() || 'Admin credit adjustment'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data?.message || 'Credits updated successfully');

      // Update local state smoothly
      setData((prev: any) => {
        if (!prev) return prev;
        const newShopkeepers = (prev.shopkeepers || []).map((s: ShopkeeperUsage) => {
          if (s.id === adjustingShopkeeper.id) {
            return {
              ...s,
              ai_credits_balance: res.data?.new_balance ?? (adjustMode === 'add' ? s.ai_credits_balance + adjustAmount : adjustAmount)
            };
          }
          return s;
        });

        const diff = res.data?.credits_adjusted ?? (adjustMode === 'add' ? adjustAmount : adjustAmount - adjustingShopkeeper.ai_credits_balance);
        const newSummary = {
          ...prev.summary,
          totalBalanceRemaining: Math.max(0, (prev.summary?.totalBalanceRemaining || 0) + diff)
        };

        return { ...prev, shopkeepers: newShopkeepers, summary: newSummary };
      });

      setAdjustingShopkeeper(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update shopkeeper credits');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'No activity yet';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getUsageTypeName = (type: string) => {
    if (type === 'website_ai') return 'Website Builder AI (3 cr)';
    if (type === 'customer_assistant') return 'Customer Storefront (2 cr)';
    return 'Kirana Copilot (1 cr)';
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Coins size={14} className="text-orange-600" />
              <span>Shopkeeper AI Telemetry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              AI Credit Usage &amp; Allocation
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1 max-w-2xl">
              Track real-time AI credit consumption across independent shopkeepers, identify high-volume stores, and adjust credit balances.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAiCreditsData()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-orange-500' : 'text-slate-500'} />
              <span>Refresh Stats</span>
            </button>
          </div>
        </div>

        {/* Primary Platform KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiMetricCard
            title="Total AI Credits Used"
            value={summary.totalCreditsUsed?.toLocaleString() || '0'}
            subtext={`${summary.monthCreditsUsed || 0} credits used this month`}
            badge={`${summary.todayCreditsUsed || 0} today`}
            icon={<Coins className="text-orange-500" size={20} />}
            color="orange"
          />

          <KpiMetricCard
            title="Active AI Shopkeepers"
            value={`${summary.activeShopkeepersCount} / ${summary.totalMerchants}`}
            subtext={`${Math.round(((summary.activeShopkeepersCount || 0) / Math.max(1, summary.totalMerchants || 1)) * 100)}% merchant adoption`}
            badge="Stores with AI"
            icon={<Bot className="text-blue-500" size={20} />}
            color="blue"
          />

          <KpiMetricCard
            title="Credit Balance Remaining"
            value={summary.totalBalanceRemaining?.toLocaleString() || '0'}
            subtext={`${summary.depletedMerchants} exhausted, ${summary.lowBalanceMerchants} low`}
            badge="Live in Circulation"
            icon={<ShieldCheck className="text-emerald-500" size={20} />}
            color="emerald"
          />

          <KpiMetricCard
            title="Extra Credits Purchased"
            value={summary.totalCreditsPurchased?.toLocaleString() || '0'}
            subtext={`₹${(summary.totalPurchaseRevenue || 0).toLocaleString()} extra pack revenue`}
            badge={`${summary.purchaseCount} packs`}
            icon={<CreditCard className="text-purple-500" size={20} />}
            color="purple"
          />
        </div>

        {/* AI Capability Distribution */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-orange-500" />
                AI Feature Consumption Breakdown
              </h3>
              <p className="text-xs text-slate-500 font-medium">Credits consumed by AI product capabilities across kirana merchants</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {summary.totalCalls?.toLocaleString() || 0} total AI prompts handled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard
              title="Shopkeeper Assistant"
              description="Inventory copilot, catalog copy, daily sales summary & voice queries"
              costNote="1 credit per message"
              icon={<Bot size={20} className="text-blue-600" />}
              bgClass="bg-blue-50/60 border-blue-100"
              usageItem={usageByType.find(u => u.usage_type === 'shopkeeper_assistant')}
              totalCredits={summary.totalCreditsUsed}
            />

            <FeatureCard
              title="Website Builder AI"
              description="Store generation, responsive layouts, hero banners & design prompts"
              costNote="3 credits per generation"
              icon={<Globe size={20} className="text-orange-600" />}
              bgClass="bg-orange-50/60 border-orange-100"
              usageItem={usageByType.find(u => u.usage_type === 'website_ai')}
              totalCredits={summary.totalCreditsUsed}
            />

            <FeatureCard
              title="Customer Storefront AI"
              description="Shopper product search, conversational shopping cart recommendations"
              costNote="2 credits per shopper query"
              icon={<MessageSquare size={20} className="text-purple-600" />}
              bgClass="bg-purple-50/60 border-purple-100"
              usageItem={usageByType.find(u => u.usage_type === 'customer_assistant')}
              totalCredits={summary.totalCreditsUsed}
            />
          </div>
        </div>

        {/* Tab Selection Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('shopkeepers')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'shopkeepers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store size={15} />
              <span>Shopkeeper Credit Usage ({filteredShopkeepers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'logs'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap size={15} />
              <span>Real-time AI Logs ({logs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('purchases')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'purchases'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard size={15} />
              <span>Credit Pack Purchases ({purchases.length})</span>
            </button>
          </div>

          {activeTab === 'shopkeepers' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search store, owner or email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-64 shadow-2xs"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: SHOPKEEPERS USAGE TABLE */}
        {activeTab === 'shopkeepers' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Filter & Sort Bar */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <FilterButton
                  active={filterType === 'all'}
                  onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                  label="All Shopkeepers"
                  count={rawShopkeepers.length}
                />
                <FilterButton
                  active={filterType === 'active'}
                  onClick={() => { setFilterType('active'); setCurrentPage(1); }}
                  label="Active AI Users"
                  count={rawShopkeepers.filter(s => s.total_credits_used > 0 || s.total_calls > 0).length}
                />
                <FilterButton
                  active={filterType === 'low'}
                  onClick={() => { setFilterType('low'); setCurrentPage(1); }}
                  label="Low Balance (≤10)"
                  count={rawShopkeepers.filter(s => s.ai_credits_balance > 0 && s.ai_credits_balance <= 10).length}
                  badgeColor="text-amber-700 bg-amber-100"
                />
                <FilterButton
                  active={filterType === 'depleted'}
                  onClick={() => { setFilterType('depleted'); setCurrentPage(1); }}
                  label="Exhausted (0)"
                  count={rawShopkeepers.filter(s => s.ai_credits_balance <= 0).length}
                  badgeColor="text-rose-700 bg-rose-100"
                />
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Sliders size={13} className="text-slate-400" />
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="credits_used">Highest Credits Used</option>
                  <option value="balance">Credit Balance</option>
                  <option value="calls">Most Calls</option>
                  <option value="name">Store Name</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  title="Toggle order"
                >
                  {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
                </button>
              </div>
            </div>

            {/* Shopkeepers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-100/60 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">Shopkeeper &amp; Dukaan</th>
                    <th className="py-3.5 px-4">Plan Tier</th>
                    <th className="py-3.5 px-4 text-center">Remaining Balance</th>
                    <th className="py-3.5 px-4">This Month Quota</th>
                    <th className="py-3.5 px-4 text-right">All-Time Credits</th>
                    <th className="py-3.5 px-4 text-center">AI Calls</th>
                    <th className="py-3.5 px-4">Last Activity</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedShopkeepers.length > 0 ? (
                    paginatedShopkeepers.map((shopkeeper) => {
                      const balance = shopkeeper.ai_credits_balance || 0;
                      const monthlyUsed = shopkeeper.ai_credits_used_month || 0;
                      const monthlyLimit = shopkeeper.ai_credits_monthly_limit || 20;
                      const monthPercent = Math.min(100, Math.round((monthlyUsed / Math.max(1, monthlyLimit)) * 100));

                      const balanceBadge =
                        balance <= 0
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : balance <= 10
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200';

                      return (
                        <tr key={shopkeeper.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Store & Owner details */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                                {(shopkeeper.business_name || shopkeeper.name || 'S').slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">
                                  {shopkeeper.business_name || 'My Dukaan'}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-2">
                                  <span>{shopkeeper.name}</span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">{shopkeeper.email}</span>
                                </div>
                                {shopkeeper.subdomain && (
                                  <div className="text-[10px] text-orange-600 font-mono mt-0.5 truncate">
                                    {shopkeeper.subdomain}.ferasetu.com
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="py-4 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              shopkeeper.plan === 'pro'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : shopkeeper.plan === 'business'
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : shopkeeper.plan === 'starter'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {shopkeeper.plan || 'Free'}
                            </span>
                          </td>

                          {/* Balance */}
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${balanceBadge}`}>
                              <Coins size={12} />
                              <span>{balance}</span>
                            </span>
                          </td>

                          {/* Monthly Quota */}
                          <td className="py-4 px-4 min-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                              <span>{monthlyUsed} / {monthlyLimit} used</span>
                              <span>{monthPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  monthPercent >= 100
                                    ? 'bg-rose-500'
                                    : monthPercent >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${monthPercent}%` }}
                              />
                            </div>
                          </td>

                          {/* All-time credits used */}
                          <td className="py-4 px-4 text-right">
                            <div className="text-sm font-black text-slate-900">
                              {(shopkeeper.total_credits_used || 0).toLocaleString()}
                            </div>
                            <div className="text-[10px] font-medium text-slate-400">
                              {(shopkeeper.last_30d_credits_used || 0)} in 30d
                            </div>
                          </td>

                          {/* Total calls */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                              {shopkeeper.total_calls || 0}
                            </span>
                          </td>

                          {/* Last Activity */}
                          <td className="py-4 px-4">
                            <div className="text-slate-600 font-medium text-[11px] flex items-center gap-1.5">
                              <Clock size={12} className="text-slate-400 shrink-0" />
                              <span>{formatRelativeTime(shopkeeper.last_ai_activity)}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(shopkeeper)}
                              className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto shadow-2xs hover:shadow-xs"
                            >
                              <Plus size={13} />
                              <span>Adjust Credits</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Bot size={32} className="mx-auto text-slate-300 mb-2" />
                        <div className="font-bold text-sm text-slate-600">No shopkeepers found</div>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 sm:p-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredShopkeepers.length)} of {filteredShopkeepers.length} shopkeepers
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REAL-TIME ACTIVITY LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Recent AI Request Audit Trail</h3>
                <p className="text-xs text-slate-500 font-medium">Stream of the last 100 AI queries handled by Fera AI &amp; reasoning clusters</p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                {logs.length} Recorded Queries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-100/60 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">Timestamp</th>
                    <th className="py-3.5 px-4">Shopkeeper</th>
                    <th className="py-3.5 px-4">Feature</th>
                    <th className="py-3.5 px-4">Model</th>
                    <th className="py-3.5 px-4 text-center">Credits Used</th>
                    <th className="py-3.5 px-6 text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.length > 0 ? (
                    logs.map((log: any, idx: number) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{log.business_name || log.user_name || 'Store'}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{log.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.usage_type === 'website_ai'
                              ? 'bg-orange-100 text-orange-800'
                              : log.usage_type === 'customer_assistant'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {getUsageTypeName(log.usage_type)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                          {log.model || 'fera-ai'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-100">
                            -{log.credits_used || 1} cr
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono text-slate-600">
                          {(log.prompt_tokens || 0) + (log.completion_tokens || 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No AI usage events logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CREDIT PACK PURCHASES */}
        {activeTab === 'purchases' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Credit Pack Purchases</h3>
                <p className="text-xs text-slate-500 font-medium">Extra AI credit packs purchased by shopkeepers via Cashfree</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                ₹{(summary.totalPurchaseRevenue || 0).toLocaleString()} Total Earned
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-100/60 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-4">Shopkeeper</th>
                    <th className="py-3.5 px-4 text-center">Pack Credits</th>
                    <th className="py-3.5 px-4 text-center">Amount Paid</th>
                    <th className="py-3.5 px-4">Usage Scope</th>
                    <th className="py-3.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {purchases.length > 0 ? (
                    purchases.map((purchase: any, idx: number) => (
                      <tr key={purchase.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                          {new Date(purchase.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{purchase.business_name || purchase.user_name || 'Store'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{purchase.email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-orange-600">
                          +{purchase.credits?.toLocaleString()} credits
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-slate-900">
                          ₹{purchase.amount}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 capitalize">
                          {purchase.usage_scope || 'shared'}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={11} />
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No credit pack purchases recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: GRANT / ADJUST CREDITS */}
        {adjustingShopkeeper && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-slide-up">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                    <Coins size={14} /> Credit Allocation
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Adjust Shopkeeper Credits</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {adjustingShopkeeper.business_name || adjustingShopkeeper.name} ({adjustingShopkeeper.email})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustingShopkeeper(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCreditAdjustment} className="space-y-6 mt-6">
                {/* Current Balance Display */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Balance</div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">
                      {adjustingShopkeeper.ai_credits_balance || 0} credits
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Limit</div>
                    <div className="text-sm font-bold text-slate-700 mt-0.5">
                      {adjustingShopkeeper.ai_credits_monthly_limit || 20} / mo
                    </div>
                  </div>
                </div>

                {/* Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Action Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustMode('add')}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        adjustMode === 'add'
                          ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Plus size={14} />
                      <span>Add Credits (Top-up)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdjustMode('set'); setAdjustAmount(adjustingShopkeeper.ai_credits_balance); }}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        adjustMode === 'set'
                          ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Sliders size={14} />
                      <span>Set Exact Balance</span>
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                {adjustMode === 'add' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Quick Top-Up Presets
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[20, 50, 100, 250, 500].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAdjustAmount(preset)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            adjustAmount === preset
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {adjustMode === 'add' ? 'Credits to Add' : 'New Exact Balance'}
                  </label>
                  <input
                    type="number"
                    min={adjustMode === 'add' ? 1 : 0}
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-black text-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {adjustMode === 'add'
                      ? `New projected balance will be ${(adjustingShopkeeper.ai_credits_balance || 0) + (adjustAmount || 0)} credits`
                      : `Balance will be directly set to ${adjustAmount || 0} credits`}
                  </p>
                </div>

                {/* Reason / Admin Audit Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reason / Audit Note (Required for Compliance)
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Free trial support, festival onboarding gift, bug compensation"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAdjustingShopkeeper(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdjust}
                    className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-md shadow-orange-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAdjust ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>Confirm Credit Adjustment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function KpiMetricCard({ title, value, subtext, badge, icon, color }: any) {
  const colorMap: any = {
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color] || 'bg-slate-50 text-slate-700'}`}>
          {icon}
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {badge}
        </span>
      </div>
      <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">{title}</div>
      <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
      <div className="text-[11px] font-semibold text-slate-500 mt-1">{subtext}</div>
    </div>
  );
}

function FeatureCard({ title, description, costNote, icon, bgClass, usageItem, totalCredits }: any) {
  const creditsUsed = usageItem?.credits_used || 0;
  const calls = usageItem?.calls || 0;
  const percent = totalCredits > 0 ? Math.round((creditsUsed / totalCredits) * 100) : 0;

  return (
    <div className={`p-5 rounded-2xl border ${bgClass} flex flex-col justify-between`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-xl bg-white shadow-2xs">
            {icon}
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200/50">
            {costNote}
          </span>
        </div>
        <h4 className="text-sm font-black text-slate-900">{title}</h4>
        <p className="text-xs text-slate-600 mt-1 font-medium">{description}</p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-200/50 flex items-center justify-between">
        <div>
          <div className="text-lg font-black text-slate-900">{creditsUsed.toLocaleString()} <span className="text-xs font-bold text-slate-500">cr</span></div>
          <div className="text-[10px] font-semibold text-slate-500">{calls.toLocaleString()} calls</div>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
            {percent}% total
          </span>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label, count, badgeColor }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
        active
          ? 'bg-slate-900 text-white shadow-xs'
          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      <span>{label}</span>
      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
        active
          ? 'bg-white/20 text-white'
          : badgeColor || 'bg-slate-100 text-slate-600'
      }`}>
        {count}
      </span>
    </button>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import {
  Bot,
  Coins,
  CreditCard,
  Globe,
  Loader2,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Clock,
  Zap,
  ArrowUpRight,
  BarChart2,
  Check,
  X,
  ShieldAlert,
  ArrowDownRight,
  Layers,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { validateCashfreePaymentResponse, CashfreeConfigurationError } from '../utils/cashfree';

interface CreditPack {
  credits: number;
  amount: number;
  label: string;
}

interface UsageLog {
  id: string;
  model: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  credits_used: number;
  usage_type: string;
  created_at: string;
}

interface DailyUsageItem {
  date: string;
  usage_type?: string;
  credits_used: number;
  calls: number;
}

declare global {
  interface Window {
    Cashfree?: any;
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') { resolve(false); return; }
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function loadCashfreeScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') { resolve(false); return; }
    if (window.Cashfree) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function AICreditsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [scope, setScope] = useState<'shared' | 'website_ai' | 'customer_assistant'>('shared');

  // Limits State
  const [ferasetuAiLimit, setFerasetuAiLimit] = useState<number | ''>('');
  const [websiteAiLimit, setWebsiteAiLimit] = useState<number | ''>('');
  const [ferasetuAiEnabled, setFerasetuAiEnabled] = useState(true);
  const [websiteAiEnabled, setWebsiteAiEnabled] = useState(true);
  const [isSavingLimits, setIsSavingLimits] = useState(false);
  const [limitsDirty, setLimitsDirty] = useState(false);

  // Time Range & Tabs State
  const [graphDays, setGraphDays] = useState<7 | 14 | 30>(14);
  const [activeBottomTab, setActiveBottomTab] = useState<'logs' | 'purchases' | 'pricing'>('logs');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const fetchCredits = async () => {
    try {
      const res = await api.get('/payment/ai-credits');
      setData(res.data);

      // Hydrate limits
      const lim = res.data?.limits || {};
      const u = res.data?.credits || {};
      setFerasetuAiLimit(lim.ferasetu_ai_limit ?? u.ferasetu_ai_limit ?? '');
      setWebsiteAiLimit(lim.website_ai_limit ?? u.website_ai_limit ?? '');
      setFerasetuAiEnabled(lim.ferasetu_ai_enabled ?? (u.ferasetu_ai_enabled !== 0));
      setWebsiteAiEnabled(lim.website_ai_enabled ?? (u.website_ai_enabled !== 0));
      setLimitsDirty(false);
    } catch {
      toast.error('Failed to load AI credits telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  // Handle return from Cashfree checkout via ?order_id=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (!orderId) return;

    const verifyCashfree = async () => {
      const toastId = toast.loading('Verifying your credit purchase with Cashfree...');
      try {
        const verifyRes = await api.post('/payment/verify', {
          cashfree_order_id: orderId,
          order_id: orderId,
          transaction_id: orderId,
        });

        if (verifyRes.data.success) {
          toast.success(verifyRes.data.message || 'AI credits purchased successfully!', { id: toastId });
          await fetchCredits();
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          toast.error(verifyRes.data.error || 'Payment verification failed.', { id: toastId });
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Failed to verify payment with Cashfree.', { id: toastId });
      }
    };

    verifyCashfree();
  }, []);

  // Handle Spend Limits Save
  const handleSaveLimits = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingLimits(true);
    try {
      const payload = {
        ferasetu_ai_limit: ferasetuAiLimit === '' || Number(ferasetuAiLimit) <= 0 ? null : Number(ferasetuAiLimit),
        website_ai_limit: websiteAiLimit === '' || Number(websiteAiLimit) <= 0 ? null : Number(websiteAiLimit),
        ferasetu_ai_enabled: ferasetuAiEnabled,
        website_ai_enabled: websiteAiEnabled,
      };

      const res = await api.post('/payment/ai-credits/limits', payload);
      toast.success(res.data?.message || 'AI safety limits updated successfully!');
      setLimitsDirty(false);

      if (res.data?.limits) {
        setFerasetuAiLimit(res.data.limits.ferasetu_ai_limit ?? '');
        setWebsiteAiLimit(res.data.limits.website_ai_limit ?? '');
        setFerasetuAiEnabled(Boolean(res.data.limits.ferasetu_ai_enabled));
        setWebsiteAiEnabled(Boolean(res.data.limits.website_ai_enabled));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update spend limits');
    } finally {
      setIsSavingLimits(false);
    }
  };

  // Buy Pack Handler (Cashfree or Instant Sandbox Top-Up)
  const buyPack = async (pack: string, simulate: boolean = false) => {
    setBuying(pack);
    try {
      const res = await api.post('/payment/ai-credits/purchase', {
        pack,
        usage_scope: scope,
        simulate,
      });

      // If simulated or instant response
      if (res.data.simulated || !res.data.requiresPayment) {
        toast.success(res.data.message || 'AI credits added successfully!');
        await fetchCredits();
        return;
      }

      // If gateway requires payment via Razorpay Checkout (Primary for India & Subscriptions)
      if (res.data.requiresPayment && (res.data.gateway === 'razorpay' || res.data.razorpayOrderId)) {
        const razorpayLoaded = await loadRazorpayScript();
        if (!razorpayLoaded || !window.Razorpay) {
          toast.error('Could not load Razorpay payment window. Please check your connection and try again.');
          setBuying(null);
          return;
        }

        const razorpay = new window.Razorpay({
          key: res.data.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: res.data.amount * 100,
          currency: res.data.currency || 'INR',
          name: 'FeraSetu',
          description: `AI Credits — ${res.data.pack?.label || 'Top-up Pack'}`,
          order_id: res.data.razorpayOrderId,
          prefill: { email: user?.email, name: user?.name },
          theme: { color: '#FF6B35' },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            const toastId = toast.loading('Verifying payment with Razorpay...');
            try {
              const verifyRes = await api.post('/payment/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                transaction_id: res.data.id,
              });

              if (verifyRes.data.success) {
                toast.success(verifyRes.data.message || 'AI credits added successfully!', { id: toastId });
                await fetchCredits();
              } else {
                toast.error(verifyRes.data.error || 'Payment verification failed.', { id: toastId });
              }
            } catch (verifyErr: any) {
              toast.error(verifyErr?.response?.data?.error || 'Payment verification failed.', { id: toastId });
            } finally {
              setBuying(null);
            }
          },
          modal: {
            ondismiss: () => {
              setBuying(null);
            }
          }
        });

        razorpay.open();
        return;
      }

      // If gateway requires payment via Cashfree Checkout (Fallback)
      if (res.data.requiresPayment && (res.data.gateway === 'cashfree' || res.data.paymentSessionId)) {
        try {
          const { paymentSessionId, mode } = validateCashfreePaymentResponse(res.data);
          const cashfreeLoaded = await loadCashfreeScript();
          if (cashfreeLoaded && window.Cashfree) {
            const cashfree = window.Cashfree({ mode });
            cashfree.checkout({
              paymentSessionId,
              redirectTarget: '_self',
            });
            return;
          } else {
            toast.error('Could not load Cashfree checkout window. Please try again.');
            return;
          }
        } catch (err: any) {
          if (err instanceof CashfreeConfigurationError) {
            toast.error(err.message);
            return;
          }
          throw err;
        }
      }

      toast.error('Unable to initialize checkout. Please contact support.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to buy credits');
    } finally {
      setBuying(null);
    }
  };

  // Prepare Usage & Aggregations
  const credits = data?.credits || {};
  const packs = data?.packs || {
    small: { credits: 250, amount: 149, label: '250 AI credits' },
    growth: { credits: 1000, amount: 499, label: '1,000 AI credits' },
    scale: { credits: 3000, amount: 1299, label: '3,000 AI credits' }
  };
  const purchases = data?.purchases || [];
  const rawUsage: any[] = data?.usage || [];
  const rawDailyUsage: DailyUsageItem[] = data?.dailyUsage || [];
  const recentLogs: UsageLog[] = data?.recentLogs || [];

  const balance = credits.ai_credits_balance ?? 0;
  const monthlyUsed = credits.ai_credits_used_month ?? 0;
  const monthlyLimit = credits.ai_credits_monthly_limit ?? 20;
  const monthPercent = Math.min(100, Math.round((monthlyUsed / Math.max(1, monthlyLimit)) * 100));

  // Compute aggregated feature usage
  const copilotUsage = rawUsage.find((u) => u.usage_type === 'shopkeeper_assistant')?.credits_used || 0;
  const websiteUsage = rawUsage.find((u) => u.usage_type === 'website_ai')?.credits_used || 0;
  const customerUsage = rawUsage.find((u) => u.usage_type === 'customer_assistant')?.credits_used || 0;
  const totalUsedAllFeatures = copilotUsage + websiteUsage + customerUsage || monthlyUsed || 1;

  // Process Daily Graph Data
  const dailyChartData = useMemo(() => {
    const daysCount = graphDays;
    const result: Array<{ date: string; displayDate: string; copilot: number; website: number; customer: number; total: number }> = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      // Find matching items
      const matches = rawDailyUsage.filter(item => item.date === isoDate);
      let copilot = 0;
      let website = 0;
      let customer = 0;

      matches.forEach(m => {
        if (m.usage_type === 'shopkeeper_assistant') copilot += m.credits_used || 0;
        else if (m.usage_type === 'website_ai') website += m.credits_used || 0;
        else if (m.usage_type === 'customer_assistant') customer += m.credits_used || 0;
        else copilot += m.credits_used || 0;
      });

      result.push({
        date: isoDate,
        displayDate,
        copilot,
        website,
        customer,
        total: copilot + website + customer,
      });
    }

    return result;
  }, [graphDays, rawDailyUsage]);

  // Max value for SVG scale
  const maxDayUsage = useMemo(() => {
    const highest = Math.max(...dailyChartData.map(d => d.total), 5);
    return Math.ceil(highest / 5) * 5;
  }, [dailyChartData]);

  // Average daily burn rate & runway
  const averageDailyBurn = useMemo(() => {
    const totalLastDays = dailyChartData.reduce((acc, d) => acc + d.total, 0);
    return Math.round((totalLastDays / Math.max(1, dailyChartData.length)) * 10) / 10;
  }, [dailyChartData]);

  const projectedRunwayDays = useMemo(() => {
    if (averageDailyBurn <= 0) return '90+';
    const days = Math.round(balance / averageDailyBurn);
    return days > 90 ? '90+' : days;
  }, [balance, averageDailyBurn]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <p className="text-xs font-bold text-slate-500">Loading AI Credit Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* 1. HERO & TOP TELEMETRY */}
      <section className="rounded-3xl border border-orange-200/80 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-black uppercase tracking-wider mb-3">
              <Coins size={14} className="text-orange-600" />
              <span>AI Credit Management &amp; Limits</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Control AI costs. Set safety limits.
            </h1>
            <p className="mt-2 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
              Buy credits for your dukaan, set monthly spend limits for FeraSetu Copilot and Storefront AI, and monitor real-time usage graphs with 0% hidden fees.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Zero automatic overages</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <CheckCircle2 size={14} className="text-blue-500" />
                <span>Credits never expire while plan is active</span>
              </span>
            </div>
          </div>

          {/* Live Balance Card */}
          <div className="rounded-3xl bg-white p-6 sm:p-7 border border-orange-200 shadow-sm ring-4 ring-orange-500/5 text-center min-w-[280px]">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Available AI Balance
            </span>
            <div className="mt-1 flex items-baseline justify-center gap-1.5">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                {balance.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-orange-600 uppercase">credits</span>
            </div>

            {/* Health pill */}
            <div className="mt-2.5">
              {balance <= 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <AlertCircle size={12} />
                  <span>Depleted &mdash; Top-up required</span>
                </span>
              ) : balance <= 15 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertCircle size={12} />
                  <span>Low Balance</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 size={12} />
                  <span>Healthy Balance</span>
                </span>
              )}
            </div>

            {/* Quota Progress */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-left">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Monthly Quota</span>
                <span>{monthlyUsed} / {monthlyLimit} cr ({monthPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    monthPercent >= 100
                      ? 'bg-rose-500'
                      : monthPercent >= 80
                      ? 'bg-amber-500'
                      : 'bg-orange-500'
                  }`}
                  style={{ width: `${monthPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRIMARY KPI SUMMARY ROW */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiSummaryCard
          title="FeraSetu Copilot"
          costNote="1 cr / prompt"
          value={`${copilotUsage} cr`}
          subtext={ferasetuAiEnabled ? (ferasetuAiLimit ? `Cap: ${ferasetuAiLimit} cr/mo` : 'Unlimited Cap') : 'Paused'}
          badge={ferasetuAiEnabled ? 'Active' : 'Paused'}
          badgeColor={ferasetuAiEnabled ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}
          icon={<Bot size={18} className="text-blue-600" />}
        />

        <KpiSummaryCard
          title="Website Builder AI"
          costNote="3 cr / generation"
          value={`${websiteUsage} cr`}
          subtext="Layouts, descriptions & styles"
          badge="Builder"
          badgeColor="bg-orange-100 text-orange-800"
          icon={<Globe size={18} className="text-orange-600" />}
        />

        <KpiSummaryCard
          title="Customer Storefront AI"
          costNote="2 cr / shopper query"
          value={`${customerUsage} cr`}
          subtext={websiteAiEnabled ? (websiteAiLimit ? `Cap: ${websiteAiLimit} cr/mo` : 'Unlimited Cap') : 'Paused'}
          badge={websiteAiEnabled ? 'Active' : 'Paused'}
          badgeColor={websiteAiEnabled ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}
          icon={<MessageSquare size={18} className="text-purple-600" />}
        />

        <KpiSummaryCard
          title="Burn Runway"
          costNote="~"
          value={`${projectedRunwayDays} days`}
          subtext={`Avg. burn ~${averageDailyBurn} cr/day`}
          badge="Forecast"
          badgeColor="bg-emerald-100 text-emerald-800"
          icon={<TrendingUp size={18} className="text-emerald-600" />}
        />
      </section>

      {/* 3. PROFESSIONAL USAGE GRAPH & ANALYTICS SECTION */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 size={18} className="text-orange-500" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Daily AI Credit Consumption Graph
              </h2>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Visual telemetry of credits used across FeraSetu Copilot, Website Builder, and Storefront AI
            </p>
          </div>

          {/* Time range selector pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setGraphDays(days as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  graphDays === days
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Last {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* SVG Interactive Bar Chart */}
        <div className="mt-6">
          <div className="h-64 w-full flex items-end gap-1 sm:gap-2 pt-6 pb-2 px-2 border-b border-slate-200 relative select-none">
            {/* Horizontal guide lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
            </div>

            {dailyChartData.map((item, idx) => {
              const heightPercent = maxDayUsage > 0 ? Math.min(100, Math.round((item.total / maxDayUsage) * 100)) : 0;
              const isHovered = hoveredBarIndex === idx;

              return (
                <div
                  key={item.date}
                  className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-20 z-30 bg-slate-900 text-white rounded-xl p-2.5 shadow-xl text-[11px] whitespace-nowrap min-w-[130px] pointer-events-none animate-fade-in">
                      <div className="font-bold text-orange-400 border-b border-slate-700 pb-1 mb-1">
                        {item.displayDate}
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Total:</span>
                        <span className="font-bold text-white">{item.total} credits</span>
                      </div>
                      {item.copilot > 0 && (
                        <div className="flex justify-between text-blue-300 text-[10px]">
                          <span>Copilot:</span>
                          <span>{item.copilot} cr</span>
                        </div>
                      )}
                      {item.website > 0 && (
                        <div className="flex justify-between text-orange-300 text-[10px]">
                          <span>Website AI:</span>
                          <span>{item.website} cr</span>
                        </div>
                      )}
                      {item.customer > 0 && (
                        <div className="flex justify-between text-purple-300 text-[10px]">
                          <span>Storefront:</span>
                          <span>{item.customer} cr</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stacked Bar with smooth transitions */}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      item.total === 0
                        ? 'h-1 bg-slate-200'
                        : isHovered
                        ? 'bg-orange-600 ring-2 ring-orange-300 shadow-md scale-y-102 origin-bottom'
                        : 'bg-gradient-to-t from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500'
                    }`}
                    style={{ height: `${Math.max(4, heightPercent)}%` }}
                  />

                  {/* Date label at bottom */}
                  <span className={`text-[10px] mt-2 font-medium truncate max-w-full ${
                    isHovered ? 'text-orange-600 font-bold' : 'text-slate-400'
                  }`}>
                    {idx % (graphDays === 30 ? 4 : graphDays === 14 ? 2 : 1) === 0 ? item.displayDate.split(' ')[1] : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Graph Legend & Insights */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-500" />
                <span>Shopkeeper Copilot (1 cr)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-orange-500" />
                <span>Website Builder (3 cr)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-purple-500" />
                <span>Customer Assistant (2 cr)</span>
              </div>
            </div>

            <div className="text-slate-500 font-medium">
              Average ~{averageDailyBurn} credits/day over the selected window
            </div>
          </div>
        </div>
      </section>

      {/* 4. SAFETY SPEND LIMITS & BUDGETING CONTROLS */}
      {/* DIRECT USER REQUIREMENT: "add limit to their ferasetu ai or their website ai" */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-orange-600" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Safety Spend Limits &amp; AI Budgets
              </h2>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Cap monthly AI consumption to prevent unexpected credit depletion. Turn features on or off anytime.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveLimits}
              disabled={isSavingLimits || !limitsDirty}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                limitsDirty
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSavingLimits ? <Loader2 size={14} className="animate-spin" /> : <SaveIcon size={14} />}
              <span>{isSavingLimits ? 'Saving...' : limitsDirty ? 'Save Limits' : 'Limits Saved'}</span>
            </button>
          </div>
        </div>

        {/* Dual Control Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* CONTROL CARD 1: FERASETU AI (KIRANA COPILOT) */}
          <div className="rounded-3xl border border-blue-200/80 bg-blue-50/30 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">FeraSetu AI Assistant</h3>
                    <p className="text-[11px] text-slate-500">Merchant copilot, inventory &amp; voice tools</p>
                  </div>
                </div>

                {/* Master Toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ferasetuAiEnabled}
                    onChange={(e) => {
                      setFerasetuAiEnabled(e.target.checked);
                      setLimitsDirty(true);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Status Note */}
              <div className="mb-4">
                {!ferasetuAiEnabled ? (
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2">
                    <AlertCircle size={14} className="text-slate-500 shrink-0" />
                    <span>FeraSetu AI is paused. Your dukaan assistant won't consume credits.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-blue-100/60 border border-blue-200 text-xs font-semibold text-blue-900 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Active &mdash; 1 credit per query</span>
                  </div>
                )}
              </div>

              {/* Monthly Cap Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Monthly Spend Limit (Credits)</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {ferasetuAiLimit ? `${ferasetuAiLimit} credits cap` : 'Unlimited'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={ferasetuAiLimit}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10));
                      setFerasetuAiLimit(v);
                      setLimitsDirty(true);
                    }}
                    placeholder="e.g. 100 (Leave empty for unlimited)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Quick selector chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setFerasetuAiLimit(preset);
                        setLimitsDirty(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        ferasetuAiLimit === preset
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset} cr
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFerasetuAiLimit('');
                      setLimitsDirty(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      ferasetuAiLimit === ''
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Unlimited
                  </button>
                </div>
              </div>
            </div>

            {/* Current Month Usage Bar */}
            <div className="mt-6 pt-4 border-t border-blue-200/60">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Month's Copilot Usage</span>
                <span>
                  {copilotUsage} cr {ferasetuAiLimit ? `/ ${ferasetuAiLimit} cap` : ''}
                </span>
              </div>
              <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      ferasetuAiLimit
                        ? Math.min(100, Math.round((copilotUsage / Number(ferasetuAiLimit)) * 100))
                        : Math.min(100, Math.round((copilotUsage / Math.max(1, balance + copilotUsage)) * 100))
                    }%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* CONTROL CARD 2: WEBSITE AI & STOREFRONT CUSTOMER ASSISTANT */}
          <div className="rounded-3xl border border-purple-200/80 bg-purple-50/30 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Website &amp; Storefront AI</h3>
                    <p className="text-[11px] text-slate-500">Website generation &amp; customer shopping assistant</p>
                  </div>
                </div>

                {/* Master Toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={websiteAiEnabled}
                    onChange={(e) => {
                      setWebsiteAiEnabled(e.target.checked);
                      setLimitsDirty(true);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              {/* Status Note */}
              <div className="mb-4">
                {!websiteAiEnabled ? (
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2">
                    <AlertCircle size={14} className="text-slate-500 shrink-0" />
                    <span>Storefront &amp; Website AI is paused. Customers cannot trigger automated replies.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-purple-100/60 border border-purple-200 text-xs font-semibold text-purple-900 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-purple-600 shrink-0" />
                    <span>Active &mdash; 2 cr / shopper query &bull; 3 cr / page generation</span>
                  </div>
                )}
              </div>

              {/* Monthly Cap Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Monthly Spend Limit (Credits)</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {websiteAiLimit ? `${websiteAiLimit} credits cap` : 'Unlimited'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={websiteAiLimit}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10));
                      setWebsiteAiLimit(v);
                      setLimitsDirty(true);
                    }}
                    placeholder="e.g. 100 (Leave empty for unlimited)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                {/* Quick selector chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setWebsiteAiLimit(preset);
                        setLimitsDirty(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        websiteAiLimit === preset
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset} cr
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setWebsiteAiLimit('');
                      setLimitsDirty(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      websiteAiLimit === ''
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Unlimited
                  </button>
                </div>
              </div>
            </div>

            {/* Current Month Usage Bar */}
            <div className="mt-6 pt-4 border-t border-purple-200/60">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Month's Website &amp; Storefront Usage</span>
                <span>
                  {websiteUsage + customerUsage} cr {websiteAiLimit ? `/ ${websiteAiLimit} cap` : ''}
                </span>
              </div>
              <div className="w-full bg-purple-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      websiteAiLimit
                        ? Math.min(100, Math.round(((websiteUsage + customerUsage) / Number(websiteAiLimit)) * 100))
                        : Math.min(100, Math.round(((websiteUsage + customerUsage) / Math.max(1, balance + websiteUsage + customerUsage)) * 100))
                    }%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BUY EXTRA CREDITS PACKS */}
      {/* DIRECT USER REQUIREMENT: "user can buy credit" */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-orange-500" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Buy Extra AI Credits
              </h2>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Top up your balance instantly via Cashfree UPI / Cards. 0% markup, no expiry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Allocation:</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="shared">Shared pool (Recommended)</option>
              <option value="website_ai">Website AI dedicated</option>
              <option value="customer_assistant">Customer Storefront dedicated</option>
            </select>
          </div>
        </div>

        {/* Credit Packs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {Object.entries(packs).map(([packId, packObj]) => {
            const p = packObj as CreditPack;
            const isScale = packId === 'scale';
            const isGrowth = packId === 'growth';
            const costPerCredit = (p.amount / p.credits).toFixed(2);

            return (
              <div
                key={packId}
                className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all relative border ${
                  isGrowth
                    ? 'border-orange-500 bg-gradient-to-b from-orange-50/50 via-white to-orange-50/20 shadow-md ring-2 ring-orange-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs'
                }`}
              >
                {/* Popular or Best Value Badge */}
                {isGrowth && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                    Most Popular
                  </span>
                )}
                {isScale && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                    Best Value
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                      <Sparkles size={18} />
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      ₹{costPerCredit}/credit
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900">{p.label}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">₹{p.amount}</span>
                    <span className="text-xs font-bold text-slate-400">one-time</span>
                  </div>

                  <ul className="mt-5 space-y-2.5 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>{p.credits.toLocaleString()} standard prompts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>Covers Copilot &amp; Storefront queries</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>Instant top-up to your balance</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => buyPack(packId, false)}
                    disabled={!!buying}
                    className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
                      isGrowth
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-slate-900 hover:bg-black text-white'
                    }`}
                  >
                    {buying === packId ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CreditCard size={15} />
                    )}
                    <span>Buy {p.credits.toLocaleString()} Credits</span>
                  </button>

                  {/* Sandbox Instant Simulation Button for Testing */}
                  <button
                    type="button"
                    onClick={() => buyPack(packId, true)}
                    disabled={!!buying}
                    className="w-full py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    title="Simulate instant payment confirmation without gateway"
                  >
                    Simulate Instant Sandbox Top-up
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. REAL-TIME ACTIVITY LOGS & PURCHASES TABS */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveBottomTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeBottomTab === 'logs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap size={14} className="text-orange-500" />
              <span>Recent AI Queries ({recentLogs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveBottomTab('purchases')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeBottomTab === 'purchases'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard size={14} />
              <span>Purchase History ({purchases.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchCredits()}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 w-fit shadow-2xs"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        {/* TAB 1: RECENT AI LOGS */}
        {activeBottomTab === 'logs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-100/60 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-4">AI Feature</th>
                  <th className="py-3 px-4">Model Engine</th>
                  <th className="py-3 px-4 text-center">Cost Deducted</th>
                  <th className="py-3 px-6 text-right">Tokens Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.usage_type === 'website_ai'
                            ? 'bg-orange-100 text-orange-800'
                            : log.usage_type === 'customer_assistant'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.usage_type === 'website_ai'
                            ? 'Website Builder'
                            : log.usage_type === 'customer_assistant'
                            ? 'Customer Assistant'
                            : 'Kirana Copilot'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {log.model || 'fera-ai'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 text-[11px]">
                          -{log.credits_used || 1} cr
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-slate-600 text-[11px]">
                        {(log.prompt_tokens || 0) + (log.completion_tokens || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      <Bot size={28} className="mx-auto text-slate-300 mb-2" />
                      <div className="font-bold text-xs text-slate-600">No AI usage recorded yet</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ask FeraSetu Copilot or enable Customer Assistant to see real-time query logs.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: PURCHASE HISTORY */}
        {activeBottomTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-100/60 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4 text-center">Credits Added</th>
                  <th className="py-3 px-4 text-center">Amount Paid</th>
                  <th className="py-3 px-4">Allocation Scope</th>
                  <th className="py-3 px-6 text-right">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {purchases.length > 0 ? (
                  purchases.map((p: any, idx: number) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                        {new Date(p.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-orange-600">
                        +{p.credits?.toLocaleString()} credits
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-slate-900">
                        ₹{p.amount}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-slate-600 font-medium">
                        {p.usage_scope || 'shared pool'}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 size={11} />
                          {p.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      <CreditCard size={28} className="mx-auto text-slate-300 mb-2" />
                      <div className="font-bold text-xs text-slate-600">No credit packs purchased yet</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Choose a pack above to top up credits whenever needed.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiSummaryCard({
  title,
  costNote,
  value,
  subtext,
  badge,
  badgeColor,
  icon,
}: {
  title: string;
  costNote: string;
  value: string;
  subtext: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <span className="text-xs font-bold text-slate-800">{title}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
            {badge}
          </span>
        </div>

        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
        <span className="truncate">{subtext}</span>
        <span className="shrink-0 text-[10px] font-mono text-slate-400">{costNote}</span>
      </div>
    </div>
  );
}

function SaveIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

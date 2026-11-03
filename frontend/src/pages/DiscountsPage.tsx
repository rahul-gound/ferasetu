import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Tag,
  Plus,
  Percent,
  IndianRupee,
  ShoppingBag,
  Truck,
  Sparkles,
  Search,
  Filter,
  Copy,
  Check,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hash,
  Share2,
  TrendingUp,
  Receipt,
  Users,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import ActionableEmptyState from '../components/ui/ActionableEmptyState';
import DiscountWizardModal from '../components/discounts/DiscountWizardModal';
import BulkCodeGeneratorModal from '../components/discounts/BulkCodeGeneratorModal';

export default function DiscountsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'codes' | 'automatic' | 'scheduled' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [bulkModalDiscount, setBulkModalDiscount] = useState<{ id: string; title: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch discounts list
  const { data: discountsData, isLoading: isLoadingDiscounts, refetch: refetchDiscounts } = useQuery({
    queryKey: ['discounts', activeTab, searchQuery],
    queryFn: async () => {
      try {
        const res = await api.get('/discounts', {
          params: { tab: activeTab, q: searchQuery },
        });
        return res.data?.discounts || [];
      } catch {
        return [];
      }
    },
    staleTime: 15000,
  });

  // Fetch real database-backed analytics metrics
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['discounts-analytics'],
    queryFn: async () => {
      try {
        const res = await api.get('/discounts/analytics');
        return res.data?.analytics || null;
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });

  // Fetch products and categories for wizard dropdowns
  const { data: productsData } = useQuery({
    queryKey: ['products-for-discounts'],
    queryFn: async () => {
      try {
        const res = await api.get('/products');
        return res.data?.products || res.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  const productsList = Array.isArray(productsData) ? productsData : [];
  const categoriesList = Array.from(new Set(productsList.map((p: any) => p.category).filter(Boolean))) as string[];

  // Mutations for status change and archive
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'paused' | 'expired' }) => {
      return await api.patch(`/discounts/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Discount status updated');
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      queryClient.invalidateQueries({ queryKey: ['discounts-analytics'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/discounts/${id}`);
    },
    onSuccess: () => {
      toast.success('Discount archived');
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      queryClient.invalidateQueries({ queryKey: ['discounts-analytics'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to archive discount');
    },
  });

  const discounts = Array.isArray(discountsData) ? discountsData : [];
  const analytics = analyticsData || {
    activeDiscounts: 0,
    scheduledDiscounts: 0,
    expiredDiscounts: 0,
    totalRedemptions: 0,
    ordersUsingDiscounts: 0,
    totalDiscountValueFormatted: '₹0.00',
    discountedOrdersRevenueFormatted: '₹0.00',
    grossOrderValueFormatted: '₹0.00',
    avgDiscountPerOrderFormatted: '₹0.00',
    topDiscount: null,
    upcomingExpirations: [],
    recentRedemptions: [],
  };

  const handleCopyLink = (code: string) => {
    const storeUrl = user?.subdomain
      ? `https://${user.subdomain}.ferasetu.com/discount/${code}`
      : `${window.location.origin}/discount/${code}`;
    navigator.clipboard.writeText(storeUrl);
    setCopiedCode(code);
    toast.success(`Shareable promotion link copied!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <>
      <SEO
        title="Discounts &amp; Promotional Pricing | FeraSetu"
        description="Manage promotional discount codes, automatic discounts, BOGO offers, and free shipping promotions for your store."
      />

      <div className="space-y-8 pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-50 text-[#0052FF]">
                <Tag size={22} strokeWidth={1.75} />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Discounts</h1>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Create and manage coupon codes, automatic store discounts, and promotional pricing.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="min-h-[48px] px-6 bg-[#0052FF] hover:bg-blue-700 text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus size={18} strokeWidth={2} />
            Create discount
          </Button>
        </div>

        {/* Real Database-Backed Overview Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active Offers</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {analytics.activeDiscounts}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {analytics.scheduledDiscounts} scheduled &bull; {analytics.expiredDiscounts} expired
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Redemptions</span>
              <Receipt size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {analytics.totalRedemptions}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Across {analytics.ordersUsingDiscounts} customer order{analytics.ordersUsingDiscounts !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Discount Given</span>
              <Tag size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {analytics.totalDiscountValueFormatted}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Avg {analytics.avgDiscountPerOrderFormatted} per discounted order
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Discounted Sales</span>
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {analytics.discountedOrdersRevenueFormatted}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Gross: {analytics.grossOrderValueFormatted}
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'codes', label: 'Codes' },
              { id: 'automatic', label: 'Automatic' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'expired', label: 'Expired' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap min-h-[36px] ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by title or code…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-10 bg-white"
            />
          </div>
        </div>

        {/* Main Discounts List Table */}
        {isLoadingDiscounts ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
            <div className="inline-block animate-spin text-[#0052FF] mb-3">
              <Sparkles size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Loading promotions…</p>
          </div>
        ) : discounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
            <ActionableEmptyState
              icon={<Tag size={36} className="text-[#0052FF]" strokeWidth={1.5} />}
              title={searchQuery ? 'No matching discounts' : 'No promotions yet'}
              description={
                searchQuery
                  ? `No discounts matched "${searchQuery}". Clear your search or create a new code.`
                  : 'Offer promotional coupons or automatic savings to boost customer conversions and repeat purchases.'
              }
              actionLabel="Create discount"
              onAction={() => setIsWizardOpen(true)}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">Discount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Method / Code</th>
                    <th className="py-3.5 px-4">Redemptions</th>
                    <th className="py-3.5 px-4">Active Dates</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {discounts.map((d: any) => {
                    const isCode = d.application_method === 'code';
                    const isPaused = d.status === 'paused';
                    const isExpired = d.is_expired;

                    let typeBadge = 'Product Discount';
                    if (d.discount_type === 'percentage') typeBadge = 'Percentage';
                    if (d.discount_type === 'fixed_amount') typeBadge = 'Fixed Amount';
                    if (d.discount_type === 'bogo') typeBadge = 'Buy X Get Y';
                    if (d.discount_type === 'free_shipping') typeBadge = 'Free Shipping';

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 text-sm">{d.title}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                            <span className="font-semibold text-emerald-700">{d.value_formatted}</span>
                            <span>&bull;</span>
                            <span>{typeBadge}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {isPaused ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Paused
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Expired
                            </span>
                          ) : d.is_scheduled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Scheduled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Active
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {isCode ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                                {d.primary_code || 'CODE'}
                              </span>
                              {d.primary_code && (
                                <button
                                  type="button"
                                  title="Copy shareable promotion link"
                                  onClick={() => handleCopyLink(d.primary_code)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                  {copiedCode === d.primary_code ? (
                                    <Check size={14} className="text-emerald-600" />
                                  ) : (
                                    <Share2 size={14} />
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 font-medium">Automatic</span>
                          )}
                        </td>

                        <td className="py-4 px-4 font-medium">
                          <span className="font-bold text-slate-900">{d.times_used}</span>
                          {d.usage_limit_total && (
                            <span className="text-slate-400"> / {d.usage_limit_total}</span>
                          )}{' '}
                          used
                        </td>

                        <td className="py-4 px-4 text-slate-500">
                          <div>Starts {new Date(d.starts_at).toLocaleDateString()}</div>
                          {d.expires_at ? (
                            <div className="text-[11px] text-slate-400">
                              Expires {new Date(d.expires_at).toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">Ongoing</div>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isCode && (
                              <button
                                type="button"
                                title="Generate unique codes"
                                onClick={() => setBulkModalDiscount({ id: d.id, title: d.title })}
                                className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Hash size={13} />
                                <span>Bulk Codes</span>
                              </button>
                            )}

                            {!isExpired && (
                              <button
                                type="button"
                                title={isPaused ? 'Resume discount' : 'Pause discount'}
                                onClick={() => {
                                  statusMutation.mutate({
                                    id: d.id,
                                    status: isPaused ? 'active' : 'paused',
                                  });
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                              </button>
                            )}

                            <button
                              type="button"
                              title="Archive discount"
                              onClick={() => {
                                if (window.confirm(`Archive discount "${d.title}"?`)) {
                                  deleteMutation.mutate(d.id);
                                }
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lower Intelligence Cards: Top Performer & Upcoming Expirations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Top Performer */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp size={16} />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Most Popular Promotion</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Database Verified</span>
            </div>

            {analytics.topDiscount ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">{analytics.topDiscount.title}</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    {analytics.topDiscount.redemptions_count} redemptions
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Total customer savings: <span className="font-bold text-slate-900">{analytics.topDiscount.totalSavedFormatted}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">
                No promotion redemptions recorded yet. Share your discount code with customers to start tracking performance!
              </p>
            )}
          </div>

          {/* Upcoming Expirations */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock size={16} />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Expirations</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Calendar View</span>
            </div>

            {analytics.upcomingExpirations && analytics.upcomingExpirations.length > 0 ? (
              <div className="space-y-2">
                {analytics.upcomingExpirations.map((exp: any) => (
                  <div key={exp.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                    <span className="font-medium text-slate-900">{exp.title}</span>
                    <span className="text-amber-800 font-semibold">
                      Ends {new Date(exp.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">
                No upcoming discount expirations in the next 14 days.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Creation Wizard Modal */}
      {isWizardOpen && (
        <DiscountWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['discounts'] });
            queryClient.invalidateQueries({ queryKey: ['discounts-analytics'] });
          }}
          products={productsList}
          categories={categoriesList}
        />
      )}

      {/* Bulk Code Generator Modal */}
      {bulkModalDiscount && (
        <BulkCodeGeneratorModal
          isOpen={Boolean(bulkModalDiscount)}
          discountId={bulkModalDiscount.id}
          discountTitle={bulkModalDiscount.title}
          onClose={() => setBulkModalDiscount(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['discounts'] });
          }}
        />
      )}
    </>
  );
}

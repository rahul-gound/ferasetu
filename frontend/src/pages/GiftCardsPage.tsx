import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Gift,
  Plus,
  ArrowRight,
  Sparkles,
  DollarSign,
  ShieldCheck,
  Info,
  Sliders,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  Send,
  Calendar,
  AlertTriangle,
  HelpCircle,
  Package,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import ActionableEmptyState from '../components/ui/ActionableEmptyState';

export default function GiftCardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'products' | 'issued' | 'guide'>('products');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    amount: '1000',
    recipient_email: '',
    recipient_name: '',
    note: 'A special gift voucher for your shopping.',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['gift-cards'],
    queryFn: async () => {
      try {
        const res = await api.get('/gift-cards');
        return res.data;
      } catch {
        return {
          products: [],
          issued_cards: [],
          stats: {
            total_products: 0,
            total_issued_cards: 0,
            total_issued_value: 0,
            outstanding_balance_obligation: 0,
            total_redeemed_value: 0,
            currency: 'INR',
          },
        };
      }
    },
    staleTime: 30000,
  });

  const products = data?.products || [];
  const issuedCards = data?.issued_cards || [];
  const stats = data?.stats || {
    total_products: 0,
    total_issued_cards: 0,
    total_issued_value: 0,
    outstanding_balance_obligation: 0,
    total_redeemed_value: 0,
    currency: 'INR',
  };

  const issueCardMutation = useMutation({
    mutationFn: async (payload: typeof issueForm) => {
      const res = await api.post('/gift-cards/issue', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      toast.success(`Gift card code issued: ${resData.card?.code || 'Created'}`);
      setShowIssueModal(false);
      setIssueForm({
        amount: '1000',
        recipient_email: '',
        recipient_name: '',
        note: 'A special gift voucher for your shopping.',
      });
      setActiveTab('issued');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Failed to issue gift card';
      toast.error(msg);
    },
  });

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(issueForm.amount);
    if (!amountVal || amountVal <= 0) {
      toast.error('Enter a valid gift card amount in ₹');
      return;
    }
    issueCardMutation.mutate(issueForm);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] pb-24">
      <SEO title="Digital Gift Cards • FeraSetu" noindex />

      {/* Header Banner */}
      <div className="border-b border-[#E5EAF1] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Digital Gift Cards
                </h1>
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 font-bold text-[10px] uppercase">
                  BETA
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Sell store shopping value upfront with zero commission and automated checkout redemption.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => setShowIssueModal(true)}
                className="h-10 text-xs font-semibold rounded-xl border-[#E5EAF1] hover:bg-slate-50 cursor-pointer"
                title="Issue shopping value without collecting online payment"
              >
                + Issue gift card directly
              </Button>

              <Button
                onClick={() => navigate('/gift-cards/new')}
                className="h-10 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer transition-all active:scale-[0.98]"
              >
                <Plus size={16} className="mr-1" />
                Create gift card product
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Sellable Products
              </span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {stats.total_products}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Issued Cards
              </span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {stats.total_issued_cards}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Outstanding Balance
              </span>
              <p className="text-xl font-bold text-amber-700 mt-0.5">
                ₹{Number(stats.outstanding_balance_obligation || 0).toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-slate-400">Future store obligation</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Redeemed at Checkout
              </span>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">
                ₹{Number(stats.total_redeemed_value || 0).toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-slate-400">0% fee taken</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`pb-3 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Gift card products ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('issued')}
            className={`pb-3 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'issued'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Issued gift cards & codes ({issuedCards.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-3 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'guide'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            How it works & Merchant Guide
          </button>
        </div>

        {/* TAB 1: GIFT CARD PRODUCTS */}
        {activeTab === 'products' && (
          <div className="mt-6">
            {products.length === 0 ? (
              <ActionableEmptyState
                icon={<Gift size={28} />}
                title="No gift card products yet"
                description="Create a digital gift card product so customers can purchase shopping value for their friends and redeem it at your checkout."
                actionLabel="Create gift card product"
                onAction={() => navigate('/gift-cards/new')}
                secondaryActionLabel="Read how it works"
                onSecondaryAction={() => setActiveTab('guide')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((p: any) => {
                  let meta: any = {};
                  try {
                    meta = p.metadata ? JSON.parse(p.metadata) : {};
                  } catch {}
                  const denoms: number[] = meta.denominations || [p.price];
                  return (
                    <Card key={p.id} className="overflow-hidden rounded-2xl border-[#E5EAF1] bg-white shadow-xs hover:shadow-md transition-shadow">
                      <div className="aspect-[16/9] w-full bg-slate-100 overflow-hidden relative">
                        <img
                          src={p.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80'}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-2.5 right-2.5">
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                            ACTIVE IN STORE
                          </Badge>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                            Available Denominations
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {denoms.map((d: number) => (
                              <span
                                key={d}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold"
                              >
                                ₹{d.toLocaleString('en-IN')}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ISSUED GIFT CARDS */}
        {activeTab === 'issued' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
              <strong>One important distinction:</strong> When customers buy your gift card product, FeraSetu automatically generates and lists them here upon fulfillment. You can also issue cards directly below (e.g. for store credit, apologies, or VIP rewards) without collecting an upfront payment.
            </div>

            {issuedCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Gift size={32} className="mx-auto text-slate-400 mb-3" />
                <h4 className="text-base font-bold text-slate-800">No individual gift cards issued yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Individual codes are created automatically when orders are fulfilled, or issued directly by you.
                </p>
                <Button
                  onClick={() => setShowIssueModal(true)}
                  className="text-xs font-semibold rounded-xl bg-blue-600 text-white"
                >
                  Issue a gift card code now
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#E5EAF1] bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E5EAF1] bg-slate-50 font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Initial Value</th>
                      <th className="px-4 py-3">Remaining Balance</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Issued Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {issuedCards.map((card: any) => (
                      <tr key={card.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 flex items-center gap-2">
                          <span>{card.code}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(card.code);
                              toast.success('Gift card code copied!');
                            }}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copy code"
                          >
                            <Copy size={12} />
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          ₹{Number(card.initial_value).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-emerald-700">
                          ₹{Number(card.balance).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {card.recipient_email || card.recipient_name || 'Direct issue'}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {card.status || 'Active'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                          {card.created_at?.slice(0, 10) || 'Today'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GUIDE & PLAYBOOK */}
        {activeTab === 'guide' && (
          <div className="mt-6 space-y-6 max-w-4xl">
            <Card className="rounded-2xl border-[#E5EAF1] bg-white p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                Why FeraSetu & Shopify have this feature
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Gift cards help customers give a present without guessing the recipient’s size, colour preference, or favourite product. They’re also useful for last-minute gifts because delivery is digital.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                For your business, they bring in new customers when recipients visit your store, and you receive payment before the recipient chooses their products. The important trade-off is that <strong>you still owe the recipient that shopping value later</strong>. It isn’t simply extra money with no future obligation.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2 text-slate-800">
                <span className="font-bold block text-sm">Example Scenario (₹1,000 Gift Card):</span>
                <p>
                  A customer buys a ₹1,000 gift card for a friend. The friend visits your store:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>
                    If their order total is <strong>₹700</strong>, the remaining <strong>₹300 stays on the card</strong> for a future purchase.
                  </li>
                  <li>
                    If their order total is <strong>₹1,200</strong>, they use the ₹1,000 gift card and pay the remaining <strong>₹200 with UPI or Card</strong>.
                  </li>
                </ul>
                <p className="text-[11px] text-slate-500 pt-1">
                  The card works at your store only. It is a secure payment method, not a discount coupon.
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
                <strong>Our Recommendation:</strong> If you are still building your store, gift cards are optional, not a launch requirement. Get your main products and buying experience ready first. When you are ready, create one digital gift card product with a few sensible INR amounts (₹500, ₹1,000, ₹2,000).
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL: DIRECT GIFT CARD ISSUANCE */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E5EAF1] bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Issue gift card directly
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Issue shopping value directly to a customer (e.g. for support resolution, loyalty reward, or VIP gift).
            </p>

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Card Value (INR ₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="10"
                    step="10"
                    value={issueForm.amount}
                    onChange={e => setIssueForm({ ...issueForm, amount: e.target.value })}
                    className="pl-8 h-10 text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recipient Email (Optional)
                </label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={issueForm.recipient_email}
                  onChange={e => setIssueForm({ ...issueForm, recipient_email: e.target.value })}
                  className="mt-1 h-10 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recipient Name (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={issueForm.recipient_name}
                  onChange={e => setIssueForm({ ...issueForm, recipient_name: e.target.value })}
                  className="mt-1 h-10 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Note / Reason
                </label>
                <Input
                  type="text"
                  value={issueForm.note}
                  onChange={e => setIssueForm({ ...issueForm, note: e.target.value })}
                  className="mt-1 h-10 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIssueModal(false)}
                  className="h-10 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={issueCardMutation.isPending}
                  className="h-10 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  {issueCardMutation.isPending ? 'Generating Code...' : 'Issue Code'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Gift,
  Sparkles,
  Info,
  CheckCircle2,
  DollarSign,
  Share2,
  Globe,
  Tag,
  Search,
  Eye,
  Sliders,
  Plus,
  Trash2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Send,
  MessageSquare,
  Smartphone,
  Check,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import posthog from '../lib/posthog';

interface GiftCardForm {
  title: string;
  description: string;
  image_url: string;
  denominations: number[];
  currency: string;
  cross_currency_redemption: boolean;
  sales_channels: string[];
  product_type: string;
  collection: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
  is_active: boolean;
}

const PRESET_CARDS = [
  {
    id: 'royal_gold',
    label: 'Festive Gold',
    url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
    accent: 'from-amber-600 to-yellow-500',
  },
  {
    id: 'navy_premium',
    label: 'Navy Royal',
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
    accent: 'from-slate-900 to-blue-900',
  },
  {
    id: 'vibrant_saffron',
    label: 'Warm Saffron',
    url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=800&q=80',
    accent: 'from-orange-600 to-amber-500',
  },
  {
    id: 'minimal_emerald',
    label: 'Calm Sage',
    url: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=800&q=80',
    accent: 'from-emerald-800 to-teal-700',
  },
];

export default function CreateGiftCardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const storeName = user?.business_name || user?.name || 'My Store';
  const storeSlug = user?.subdomain || (user?.hostname ? user.hostname.split('.')[0] : 'store');

  const [form, setForm] = useState<GiftCardForm>({
    title: `${storeName} Digital Gift Card`,
    description:
      'Give them the freedom to choose. Select a gift card amount and receive a digital gift card by email. Redeem it at checkout in our online store.',
    image_url: PRESET_CARDS[0].url,
    denominations: [500, 1000, 2000, 5000],
    currency: 'INR',
    cross_currency_redemption: false,
    sales_channels: ['online_store', 'whatsapp_shop'],
    product_type: 'Digital Gift Card',
    collection: 'Gift Cards',
    tags: ['Gift Card', 'Digital', 'Festive', 'Presents'],
    seo_title: `${storeName} Digital Gift Card • Store Credit Voucher`,
    seo_description: `Buy a digital gift card for ${storeName}. Delivered by email after successful fulfillment, redeemable towards any product in our catalog.`,
    is_active: true,
  });

  const [customAmountInput, setCustomAmountInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Live simulator state: ₹1,000 card example matching prompt
  const [simCardAmount, setSimCardAmount] = useState<number>(1000);
  const [simOrderTotal, setSimOrderTotal] = useState<number>(700);

  // Calculate live simulator values
  const simApplied = Math.min(simCardAmount, simOrderTotal);
  const simRemainingCard = Math.max(0, simCardAmount - simApplied);
  const simExtraToPay = Math.max(0, simOrderTotal - simApplied);

  const createProductMutation = useMutation({
    mutationFn: async (payload: GiftCardForm) => {
      const res = await api.post('/gift-cards/product', payload);
      return res.data;
    },
    onSuccess: () => {
      posthog.capture('gift_card_product_created', {
        currency: form.currency,
        denomination_count: form.denominations.length,
        sales_channel_count: form.sales_channels.length,
        cross_currency_redemption: form.cross_currency_redemption,
      });
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Gift card product created successfully!');
      navigate('/gift-cards');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Failed to create gift card product';
      toast.error(msg);
    },
  });

  const handleAddDenomination = () => {
    const val = parseInt(customAmountInput.trim(), 10);
    if (!val || val <= 0) {
      toast.error('Enter a valid positive amount in ₹ (e.g. 2500)');
      return;
    }
    if (form.denominations.includes(val)) {
      toast.error(`₹${val.toLocaleString('en-IN')} already exists in denominations`);
      return;
    }
    const updated = [...form.denominations, val].sort((a, b) => a - b);
    setForm(prev => ({ ...prev, denominations: updated }));
    setCustomAmountInput('');
  };

  const handleRemoveDenomination = (amountToRemove: number) => {
    if (form.denominations.length <= 1) {
      toast.error('A gift card product must have at least one denomination option.');
      return;
    }
    setForm(prev => ({
      ...prev,
      denominations: prev.denominations.filter(d => d !== amountToRemove),
    }));
  };

  const handleAddTag = () => {
    const tag = newTagInput.trim();
    if (!tag) return;
    if (form.tags.includes(tag)) {
      setNewTagInput('');
      return;
    }
    setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove),
    }));
  };

  const toggleSalesChannel = (channel: string) => {
    setForm(prev => {
      const exists = prev.sales_channels.includes(channel);
      const updated = exists
        ? prev.sales_channels.filter(c => c !== channel)
        : [...prev.sales_channels, channel];
      return { ...prev, sales_channels: updated };
    });
  };

  // Sidekick AI quick fill actions
  const applySidekickPreset = (type: 'festive' | 'wedding' | 'minimal') => {
    if (type === 'festive') {
      setForm(prev => ({
        ...prev,
        title: `${storeName} Festive Gift Voucher`,
        description:
          'Celebrate the festive season with the gift of choice. Delivered directly by email and redeemable for any order at our online store.',
        image_url: PRESET_CARDS[0].url,
        denominations: [500, 1000, 2500, 5000, 10000],
        tags: ['Diwali', 'Festive', 'Gifting', 'Store Voucher'],
      }));
      toast.success('Applied Festive Season gift card preset!');
    } else if (type === 'wedding') {
      setForm(prev => ({
        ...prev,
        title: `${storeName} Celebration Gift Card`,
        description:
          'The perfect present for weddings, anniversaries, and milestones. Send shopping value directly to their inbox with a personal message.',
        image_url: PRESET_CARDS[1].url,
        denominations: [1000, 2000, 5000, 10000],
        tags: ['Wedding', 'Celebration', 'Anniversary', 'Digital Gift'],
      }));
      toast.success('Applied Celebration & Milestone preset!');
    } else {
      setForm(prev => ({
        ...prev,
        title: `Digital Gift Card`,
        description:
          'Give them the freedom to choose. Select a gift card amount and receive a digital gift card by email. Redeem it at checkout in our online store.',
        image_url: PRESET_CARDS[2].url,
        denominations: [500, 1000, 2000, 5000],
        tags: ['Gift Card', 'Digital'],
      }));
      toast.success('Applied Standard Digital Gift Card preset!');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Gift card title is required (Step 1)');
      setActiveStep(1);
      return;
    }
    if (form.denominations.length === 0) {
      toast.error('Please specify at least one denomination amount (Step 2)');
      setActiveStep(2);
      return;
    }
    createProductMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] pb-32">
      <SEO title="Create Gift Card Product • FeraSetu" noindex />

      {/* Top Breadcrumb & Page Header */}
      <div className="border-b border-[#E5EAF1] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/gift-cards"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5EAF1] bg-white text-[#667085] hover:bg-slate-50 hover:text-[#152238] transition-colors"
                title="Back to Gift Cards"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Create gift card product
                  </h1>
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 font-bold text-[10px] uppercase">
                    BETA
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Digital shopping value that customers can purchase from your store and redeem at checkout.
                </p>
              </div>
            </div>

            {/* Stepper pills bar matching user screenshot flow */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100/80 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeStep === 1
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Title & Details
              </button>
              <span className="text-slate-300">→</span>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeStep === 2
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Denominations
              </button>
              <span className="text-slate-300">→</span>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeStep === 3
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Channels & Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Core Educational Clarity Banner (Shopkeeper Loss Aversion & Empathy) */}
        <div className="mb-8 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-5 sm:p-6 text-slate-800 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
              <Info size={20} />
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm">
              <p className="font-bold text-slate-900">
                You’re on the page for creating a gift card product.
              </p>
              <p className="text-slate-700 leading-relaxed">
                You are <strong>not</strong> giving someone money simply by filling in this page. You are creating an item for customers to purchase in your store catalog, similar to adding a product, but what they receive is <strong>shopping value</strong> instead of a physical item. Nothing has been changed or charged yet.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3 text-xs text-blue-900 font-semibold">
                <span className="inline-flex items-center gap-1">
                  <Check size={14} className="text-emerald-600" /> 0% Marketplace Commission
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check size={14} className="text-emerald-600" /> Payment collected upfront
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check size={14} className="text-emerald-600" /> Digital delivery via email code
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* STEP 1: TITLE, DESCRIPTION & MEDIA */}
          <div className={`space-y-6 ${activeStep !== 1 && 'hidden md:block'}`}>
            <Card className="rounded-2xl border-[#E5EAF1] bg-white p-6 sm:p-8 shadow-xs">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Step 1: Choose a clear title and description
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This is what shoppers will see on your storefront when selecting a gift card.
                  </p>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">
                  Step 1 of 3
                </Badge>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Product Title <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      e.g., “Digital Gift Card” or “{storeName} Gift Card”
                    </span>
                  </div>
                  <Input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Digital Gift Card"
                    className="mt-1.5 h-11 text-sm font-medium"
                    required
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Start with one general gift card rather than separate birthday, wedding, and festival versions, unless you need different designs.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Description <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm(f => ({
                          ...f,
                          description:
                            'Give them the freedom to choose. Select a gift card amount and receive a digital gift card by email. Redeem it at checkout in our online store.',
                        }))
                      }
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Reset to standard wording
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe what the customer receives..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 leading-relaxed"
                    required
                  />
                  <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50/80 p-3 text-xs text-amber-900 border border-amber-200/60">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Important note:</strong> Make clear that this is <em>digital</em>, not a physical plastic card delivered by courier. Do not promise instant delivery until you have checked how you fulfill gift card orders.
                    </span>
                  </div>
                </div>

                {/* Media Image Selection */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Card Media & Graphic
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Choose a clean branded card visual or enter your custom image URL.
                      </p>
                    </div>
                  </div>

                  {/* Preset visual selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
                    {PRESET_CARDS.map(preset => {
                      const isSelected = form.image_url === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setForm({ ...form, image_url: preset.url })}
                          className={`relative overflow-hidden rounded-xl border-2 transition-all p-2 text-left cursor-pointer group ${
                            isSelected
                              ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50/40'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="aspect-[16/10] w-full rounded-lg overflow-hidden bg-slate-100 mb-2 relative">
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-900 block truncate">
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2">
                    <label className="text-[11px] font-semibold text-slate-600">Custom Image URL</label>
                    <Input
                      type="url"
                      value={form.image_url}
                      onChange={e => setForm({ ...form, image_url: e.target.value })}
                      placeholder="https://..."
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    <strong>Rule:</strong> Avoid putting one fixed amount (e.g. "₹1,000") on the graphic if the product offers multiple amounts.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* STEP 2: DENOMINATIONS & HOW IT WORKS SIMULATOR */}
          <div className={`space-y-6 ${activeStep !== 2 && 'hidden md:block'}`}>
            <Card className="rounded-2xl border-[#E5EAF1] bg-white p-6 sm:p-8 shadow-xs">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Step 2: Set the amounts customers can buy (Denominations)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Since your store uses INR, offer sensible values that match your average order sizes.
                  </p>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">
                  Step 2 of 3
                </Badge>
              </div>

              {/* Denomination chips */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Active Denominations (INR)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Customers select from these preset options on your storefront. Standard checkout does not allow buyers to type arbitrary amounts.
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    {form.denominations.map((amount, idx) => (
                      <div
                        key={amount}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm font-bold text-slate-900 shadow-2xs hover:bg-white transition-all"
                      >
                        <span className="text-emerald-700 font-extrabold">₹</span>
                        <span>{amount.toLocaleString('en-IN')}</span>
                        {idx === 0 && (
                          <span className="text-[10px] text-slate-400 font-normal">(Default)</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveDenomination(amount)}
                          className="ml-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove denomination"
                          aria-label={`Remove ₹${amount}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Custom Denomination */}
                <div className="flex items-center gap-2.5 max-w-sm pt-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min="50"
                      step="50"
                      placeholder="e.g. 2500"
                      value={customAmountInput}
                      onChange={e => setCustomAmountInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDenomination();
                        }
                      }}
                      className="pl-8 h-10 text-sm font-semibold"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDenomination}
                    className="h-10 px-3.5 text-xs font-semibold cursor-pointer"
                  >
                    <Plus size={14} className="mr-1" /> Add Amount
                  </Button>
                </div>

                {/* Currency & Cross-currency settings */}
                <div className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Store Currency
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-600 text-white font-mono text-xs">
                        INR (₹)
                      </Badge>
                      <span className="text-xs text-slate-600">
                        Default checkout currency for your store
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Cross-Currency Redemption
                      </label>
                      <input
                        type="checkbox"
                        checked={form.cross_currency_redemption}
                        onChange={e =>
                          setForm({ ...form, cross_currency_redemption: e.target.checked })
                        }
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Determines whether this card can be redeemed in a foreign currency. Keep disabled for a straightforward INR store. Cannot be changed after creation.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* INTERACTIVE HOW IT WORKS SIMULATOR (From Prompt Specification) */}
            <Card className="rounded-2xl border-emerald-200/90 bg-emerald-50/40 p-6 sm:p-8 shadow-xs">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      How it works, with a simple example
                    </h3>
                    <p className="text-xs text-slate-600">
                      Test partial redemption and remaining balance calculations before launching.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-800 text-[10px] font-bold">
                  Interactive Simulator
                </Badge>
              </div>

              {/* Explanatory text matching user prompt */}
              <div className="mb-6 rounded-xl bg-white p-4 border border-emerald-100 text-xs sm:text-sm text-slate-700 space-y-2 leading-relaxed">
                <p>
                  Suppose you offer a <strong>₹1,000 gift card</strong>. A customer buys it for a friend. When fulfilled, the recipient gets an email with a unique code.
                </p>
                <p className="text-slate-600">
                  The friend shops at your store and enters the code at checkout. It works at <em>your store</em> as a payment method, not a discount coupon.
                </p>
              </div>

              {/* Interactive sliders & Live Math */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-emerald-200/70">
                {/* Inputs */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Gift Card Value:</span>
                      <span className="font-bold text-slate-900">₹{simCardAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="500"
                      value={simCardAmount}
                      onChange={e => setSimCardAmount(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>₹500</span>
                      <span>₹2,500</span>
                      <span>₹5,000</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Friend's Order Total:</span>
                      <span className="font-bold text-slate-900">₹{simOrderTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="3000"
                      step="100"
                      value={simOrderTotal}
                      onChange={e => setSimOrderTotal(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>₹200</span>
                      <span>₹1,500</span>
                      <span>₹3,000</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setSimCardAmount(1000); setSimOrderTotal(700); }}
                      className="text-[11px] px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                    >
                      Scenario A: ₹700 Order
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSimCardAmount(1000); setSimOrderTotal(1200); }}
                      className="text-[11px] px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                    >
                      Scenario B: ₹1,200 Order
                    </button>
                  </div>
                </div>

                {/* Calculation outcome */}
                <div className="flex flex-col justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gift Card Value:</span>
                      <span className="font-semibold text-slate-900">₹{simCardAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Order Total:</span>
                      <span className="font-semibold text-slate-900">₹{simOrderTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-medium border-t border-slate-200 pt-2">
                      <span>Paid from Gift Card:</span>
                      <span className="font-bold">-₹{simApplied.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-blue-700 font-bold border-t border-slate-200 pt-2">
                      <span>Remaining on Card:</span>
                      <span>₹{simRemainingCard.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-800 font-bold">
                      <span>Additional Paid via UPI/Cash:</span>
                      <span>₹{simExtraToPay.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-100">
                    {simOrderTotal <= simCardAmount
                      ? `Since order total is ₹${simOrderTotal}, the remaining ₹${simRemainingCard} stays securely on the card for a future purchase.`
                      : `Since order total is ₹${simOrderTotal}, they use the full ₹${simCardAmount} gift card and pay the remaining ₹${simExtraToPay} with another payment method.`}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* STEP 3: SALES CHANNELS, ORGANIZATION & SEO PREVIEW */}
          <div className={`space-y-6 ${activeStep !== 3 && 'hidden md:block'}`}>
            <Card className="rounded-2xl border-[#E5EAF1] bg-white p-6 sm:p-8 shadow-xs">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Step 3: Choose sales channels and organization
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Saving the product and making it available for sale are related but separate things.
                  </p>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">
                  Step 3 of 3
                </Badge>
              </div>

              {/* Sales Channels */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sales Channels and Apps
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'online_store', label: 'Online Storefront', icon: <Globe size={16} />, desc: 'Visible on catalog' },
                    { id: 'whatsapp_shop', label: 'WhatsApp Store', icon: <MessageSquare size={16} />, desc: '1-tap WhatsApp cart' },
                    { id: 'pos_checkout', label: 'In-Store POS / QR', icon: <Smartphone size={16} />, desc: 'Counter checkout' },
                  ].map(channel => {
                    const isChecked = form.sales_channels.includes(channel.id);
                    return (
                      <div
                        key={channel.id}
                        onClick={() => toggleSalesChannel(channel.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50/40 text-blue-950 ring-1 ring-blue-600'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            {channel.icon}
                            <span>{channel.label}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">{channel.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Organization (Tags, Product Type, Collection) */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Product Type
                    </label>
                    <Input
                      type="text"
                      value={form.product_type}
                      onChange={e => setForm({ ...form, product_type: e.target.value })}
                      className="mt-1.5 h-10 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Collection
                    </label>
                    <Input
                      type="text"
                      value={form.collection}
                      onChange={e => setForm({ ...form, collection: e.target.value })}
                      className="mt-1.5 h-10 text-xs"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 my-2">
                    {form.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 max-w-xs">
                    <Input
                      type="text"
                      placeholder="Add tag (e.g. Diwali, Eid)..."
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="h-9 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                      className="h-9 px-3 text-xs"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Search Engine Listing Preview (SERP Preview) */}
              <div className="pt-6 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Search size={14} className="text-blue-600" />
                      Search Engine Listing Preview
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Preview how your gift card appears on Google search results.
                    </p>
                  </div>
                </div>

                {/* Simulated Google SERP card */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-mono text-[11px] text-slate-500">
                      https://{storeSlug}.ferasetu.com/products/digital-gift-card
                    </span>
                  </div>
                  <h4 className="text-base font-medium text-[#1a0dab] hover:underline cursor-pointer">
                    {form.seo_title || form.title}
                  </h4>
                  <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                    {form.seo_description || form.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Page SEO Title</label>
                    <Input
                      type="text"
                      value={form.seo_title}
                      onChange={e => setForm({ ...form, seo_title: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Meta Description</label>
                    <Input
                      type="text"
                      value={form.seo_description}
                      onChange={e => setForm({ ...form, seo_description: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* FULFILMENT UNDERSTANDING & IMPORTANT DISTINCTION CARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <ShieldCheck size={18} className="text-blue-600" />
                  Step 9: Understand fulfilment before selling
                </div>
                <p className="text-slate-600 leading-relaxed">
                  When an order containing this gift card product is fulfilled, FeraSetu automatically generates the individual gift card code and emails it to the buyer or recipient.
                </p>
                <p className="text-slate-500">
                  Don't assume payment alone means it has been delivered; check your automated gift card fulfillment settings.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-2xs text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                  <AlertTriangle size={18} className="text-amber-600" />
                  One important distinction
                </div>
                <p className="text-amber-900 leading-relaxed">
                  <strong>“Create a gift card product”</strong> means make a gift card available to buy. Creating an individual gift card directly in admin means issuing shopping value without collecting a payment through that action.
                </p>
                <p className="text-amber-800">
                  Editing or removing this product later does not cancel cards customers already received.
                </p>
              </div>
            </div>
          </div>

          {/* BOTTOM SUBMIT BAR */}
          <div className="sticky bottom-6 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-xl backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600 text-center sm:text-left">
              <span className="font-bold text-slate-900">
                Ready to publish:
              </span>{' '}
              {form.title} · {form.denominations.length} denomination options (₹
              {form.denominations[0]} to ₹{form.denominations[form.denominations.length - 1]})
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/gift-cards')}
                className="h-12 flex-1 sm:flex-none px-5 text-sm font-semibold rounded-xl"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={createProductMutation.isPending}
                className="h-12 flex-1 sm:flex-none px-6 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
              >
                {createProductMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving Gift Card...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Gift size={18} />
                    Save gift card product
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>

      {/* FLOATING SIDEKICK / FERA AI COPILOT DOCKED AT BOTTOM (Matching User Screenshot!) */}
      <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-md w-[92%] sm:w-auto">
        <div className="flex items-center justify-between gap-2.5 rounded-full border border-slate-200 bg-white/95 px-4 py-2.5 shadow-2xl backdrop-blur text-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-2xs">
              <Sparkles size={14} />
            </div>
            <span className="font-semibold text-slate-800">
              Work with Sidekick
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applySidekickPreset('festive')}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
              title="Apply festive season wording & denominations"
            >
              Festive Preset
            </button>
            <button
              type="button"
              onClick={() => applySidekickPreset('minimal')}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
              title="Reset to clean standard wording"
            >
              Standard Preset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

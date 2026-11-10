import React, { useState, useMemo } from 'react';
import {
  X,
  Tag,
  Percent,
  IndianRupee,
  ShoppingBag,
  Truck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  Layers,
  HelpCircle,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface DiscountWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products?: Array<{ id: string; name: string; price: number; cost_price?: number; category?: string }>;
  categories?: string[];
  existingCodes?: string[];
  hasShippingConfigured?: boolean;
}

export default function DiscountWizardModal({
  isOpen,
  onClose,
  onSuccess,
  products = [],
  categories = [],
  existingCodes = [],
  hasShippingConfigured = true,
}: DiscountWizardModalProps) {
  // Wizard current step: 1 to 5 (grouped for smooth progressive disclosure)
  // Step 1: Type & Application Method
  // Step 2: Value & Details
  // Step 3: Products & Customer Eligibility
  // Step 4: Minimum Requirements & Limits
  // Step 5: Schedule, Stacking & Review
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount' | 'bogo' | 'free_shipping'>('percentage');
  const [applicationMethod, setApplicationMethod] = useState<'code' | 'automatic'>('code');
  const [code, setCode] = useState('');
  const [valueInput, setValueInput] = useState('10'); // 10% or ₹100
  const [maxDiscountInput, setMaxDiscountInput] = useState('');
  
  // Scoping
  const [targetType, setTargetType] = useState<'all' | 'specific_products' | 'specific_collections'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [excludedProductIds, setExcludedProductIds] = useState<string[]>([]);

  // BOGO config
  const [bogoBuyQty, setBogoBuyQty] = useState('2');
  const [bogoGetQty, setBogoGetQty] = useState('1');
  const [bogoRewardType, setBogoRewardType] = useState<'free' | 'percentage'>('free');
  const [bogoDiscountPercentage, setBogoDiscountPercentage] = useState('100');

  // Customer Eligibility
  const [customerEligibility, setCustomerEligibility] = useState<'all' | 'first_time' | 'repeat' | 'registered'>('all');

  // Minimum Requirements
  const [minReqType, setMinReqType] = useState<'none' | 'amount' | 'quantity'>('none');
  const [minAmountInput, setMinAmountInput] = useState('');
  const [minQuantityInput, setMinQuantityInput] = useState('');

  // Usage Limits
  const [limitTotalUses, setLimitTotalUses] = useState(false);
  const [totalUsesInput, setTotalUsesInput] = useState('');
  const [limitPerCustomer, setLimitPerCustomer] = useState(false);
  const [perCustomerUsesInput, setPerCustomerUsesInput] = useState('1');

  // Schedule
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [hasEndDate, setHasEndDate] = useState(false);
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 16);
  });

  // Stacking & Combinations
  const [combinesWithProduct, setCombinesWithProduct] = useState(false);
  const [combinesWithOrder, setCombinesWithOrder] = useState(false);
  const [combinesWithShipping, setCombinesWithShipping] = useState(true);

  const [stepError, setStepError] = useState<string | null>(null);

  const isCodeDuplicate = useMemo(() => {
    if (applicationMethod !== 'code' || !code.trim()) return false;
    return existingCodes.map(c => c.toUpperCase()).includes(code.trim().toUpperCase());
  }, [applicationMethod, code, existingCodes]);

  const handleGenerateCode = () => {
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let generated = '';
      let attempts = 0;
      const upperExisting = new Set(existingCodes.map(c => c.toUpperCase()));
      do {
        let suffix = '';
        for (let i = 0; i < 4; i++) {
          suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        generated = `SAVE${suffix}`;
        attempts++;
      } while (upperExisting.has(generated) && attempts < 50);

      if (attempts >= 50) {
        toast.error('Could not generate a unique code. Please enter one manually.');
        return;
      }
      setCode(generated);
      setStepError(null);
      toast.success(`Generated code: ${generated}`);
    } catch {
      toast.error('Code generation failed. Please type a code manually.');
    }
  };

  const handleCopyCode = () => {
    if (!code) {
      toast.error('No code to copy.');
      return;
    }
    navigator.clipboard.writeText(code);
    toast.success(`Code "${code}" copied to clipboard!`);
  };

  const validateStep = (step: number): boolean => {
    setStepError(null);
    if (step === 1) {
      if (!title.trim()) {
        const err = 'Promotion title is required.';
        setStepError(err);
        toast.error(err);
        return false;
      }
      if (discountType === 'free_shipping' && !hasShippingConfigured) {
        const err = 'Shipping rules must be configured before creating a free shipping discount.';
        setStepError(err);
        toast.error(err);
        return false;
      }
      if (applicationMethod === 'code') {
        if (!code.trim()) {
          const err = 'Discount code is required.';
          setStepError(err);
          toast.error(err);
          return false;
        }
        if (isCodeDuplicate) {
          const err = `Discount code "${code.trim().toUpperCase()}" already exists. Please choose a unique code.`;
          setStepError(err);
          toast.error(err);
          return false;
        }
      }
    } else if (step === 2) {
      if (discountType === 'percentage') {
        const val = parseFloat(valueInput);
        if (isNaN(val) || val < 1 || val > 100) {
          const err = 'Percentage discount must be between 1% and 100%.';
          setStepError(err);
          toast.error(err);
          return false;
        }
      } else if (discountType === 'fixed_amount') {
        const val = parseFloat(valueInput);
        if (isNaN(val) || val <= 0) {
          const err = 'Discount amount must be greater than ₹0.';
          setStepError(err);
          toast.error(err);
          return false;
        }
      } else if (discountType === 'bogo') {
        const buy = parseInt(bogoBuyQty, 10);
        const get = parseInt(bogoGetQty, 10);
        if (isNaN(buy) || buy < 1 || isNaN(get) || get < 1) {
          const err = 'Buy and Get quantities must be at least 1.';
          setStepError(err);
          toast.error(err);
          return false;
        }
      }
    } else if (step === 5) {
      if (!startsAt) {
        const err = 'Start date is required.';
        setStepError(err);
        toast.error(err);
        return false;
      }
      if (hasEndDate && expiresAt) {
        if (new Date(expiresAt) <= new Date(startsAt)) {
          const err = 'End date must be after the start date.';
          setStepError(err);
          toast.error(err);
          return false;
        }
      }
    }
    return true;
  };

  if (!isOpen) return null;

  // Live Summary Calculation
  const summaryDetails = useMemo(() => {
    let valueSummary = '';
    if (discountType === 'percentage') {
      valueSummary = `${valueInput || '0'}% off`;
      if (maxDiscountInput) {
        valueSummary += ` up to ₹${maxDiscountInput}`;
      }
    } else if (discountType === 'fixed_amount') {
      valueSummary = `₹${valueInput || '0'} off`;
    } else if (discountType === 'free_shipping') {
      valueSummary = 'Free Delivery';
    } else if (discountType === 'bogo') {
      valueSummary = `Buy ${bogoBuyQty}, Get ${bogoGetQty} ${bogoRewardType === 'free' ? 'Free' : `${bogoDiscountPercentage}% off`}`;
    }

    let targetSummary = 'all products';
    if (targetType === 'specific_products') {
      targetSummary = `${selectedProductIds.length} specific product(s)`;
    } else if (targetType === 'specific_collections') {
      targetSummary = `${selectedCollections.length} category/collection(s)`;
    }

    let customerSummary = 'all customers';
    if (customerEligibility === 'first_time') customerSummary = 'first-time customers only';
    if (customerEligibility === 'repeat') customerSummary = 'returning customers only';
    if (customerEligibility === 'registered') customerSummary = 'registered accounts only';

    return {
      valueSummary,
      targetSummary,
      customerSummary,
    };
  }, [
    discountType,
    valueInput,
    maxDiscountInput,
    bogoBuyQty,
    bogoGetQty,
    bogoRewardType,
    bogoDiscountPercentage,
    targetType,
    selectedProductIds,
    selectedCollections,
    customerEligibility,
  ]);

  // Profit Protection Margin Warnings
  const marginWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (discountType === 'percentage') {
      const pct = parseFloat(valueInput) || 0;
      if (pct >= 50) {
        warnings.push(`High discount alert: ${pct}% discount may result in narrow or negative margins on low-markup items.`);
      }
    } else if (discountType === 'fixed_amount') {
      const amt = parseFloat(valueInput) || 0;
      if (amt >= 500 && (!minAmountInput || parseFloat(minAmountInput) < amt * 2)) {
        warnings.push(`₹${amt} fixed discount without a corresponding minimum order requirement may exceed order margins.`);
      }
    }
    return warnings;
  }, [discountType, valueInput, minAmountInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(5)) {
      return;
    }

    setIsSubmitting(true);

    try {
      let valueMinor = 0;
      if (discountType === 'percentage') {
        valueMinor = Math.round(parseFloat(valueInput || '0') * 100); // 10% = 1000 bps
      } else if (discountType === 'fixed_amount') {
        valueMinor = Math.round(parseFloat(valueInput || '0') * 100); // ₹100 = 10000 minor
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        discount_type: discountType,
        value_minor: valueMinor,
        target_type: targetType,
        applies_to_resource_ids: targetType === 'specific_products' ? selectedProductIds : (targetType === 'specific_collections' ? selectedCollections : []),
        excluded_resource_ids: excludedProductIds,
        application_method: applicationMethod,
        code: applicationMethod === 'code' ? code.trim().toUpperCase() : undefined,
        starts_at: new Date(startsAt).toISOString(),
        expires_at: hasEndDate && expiresAt ? new Date(expiresAt).toISOString() : null,
        minimum_subtotal_minor: minReqType === 'amount' && minAmountInput ? Math.round(parseFloat(minAmountInput) * 100) : 0,
        minimum_quantity: minReqType === 'quantity' && minQuantityInput ? parseInt(minQuantityInput, 10) : 0,
        usage_limit_total: limitTotalUses && totalUsesInput ? parseInt(totalUsesInput, 10) : null,
        usage_limit_per_customer: limitPerCustomer && perCustomerUsesInput ? parseInt(perCustomerUsesInput, 10) : null,
        combines_with_product_discounts: combinesWithProduct,
        combines_with_order_discounts: combinesWithOrder,
        combines_with_shipping_discounts: combinesWithShipping,
        customer_eligibility: customerEligibility,
        bogo_config: discountType === 'bogo' ? {
          buyQuantity: parseInt(bogoBuyQty, 10) || 1,
          getQuantity: parseInt(bogoGetQty, 10) || 1,
          rewardType: bogoRewardType,
          discountPercentageBps: bogoRewardType === 'free' ? 10000 : Math.round(parseFloat(bogoDiscountPercentage || '100') * 100),
          buyProductIds: selectedProductIds,
          getProductIds: selectedProductIds,
        } : null,
        max_discount_minor: maxDiscountInput ? Math.round(parseFloat(maxDiscountInput) * 100) : null,
      };

      const res = await api.post('/discounts', payload);
      if (res.data?.success) {
        toast.success('Discount created and live!');
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to create discount');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Creation failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Tag size={18} />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Create Promotion</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Step {currentStep} of 5 &bull; Build a clean, high-converting offer for your store
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-[#0052FF] h-1.5 transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {stepError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-800 animate-in fade-in duration-150">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{stepError}</span>
            </div>
          )}
          {/* STEP 1: DISCOUNT TYPE & METHOD */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Promotion Title *
                </label>
                <Input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setStepError(null);
                  }}
                  placeholder="e.g. Diwali Festive Celebration 15% Off"
                  className="font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  Select Discount Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'percentage',
                      title: 'Amount Off Products',
                      desc: 'Percentage or fixed value off selected items',
                      icon: <Percent size={18} className="text-blue-600" />,
                    },
                    {
                      id: 'fixed_amount',
                      title: 'Amount Off Order',
                      desc: 'Fixed monetary deduction on eligible cart total',
                      icon: <IndianRupee size={18} className="text-emerald-600" />,
                    },
                    {
                      id: 'bogo',
                      title: 'Buy X Get Y (BOGO)',
                      desc: 'Reward buyers with free or discounted companion items',
                      icon: <ShoppingBag size={18} className="text-purple-600" />,
                    },
                    {
                      id: 'free_shipping',
                      title: 'Free Shipping',
                      desc: 'Waive delivery fee for qualifying customer orders',
                      icon: <Truck size={18} className="text-amber-600" />,
                    },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setDiscountType(type.id as any);
                        setStepError(null);
                      }}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        discountType === type.id
                          ? 'border-[#0052FF] bg-blue-50/40 ring-1 ring-[#0052FF]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs mt-0.5">
                        {type.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{type.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 leading-snug">{type.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {discountType === 'free_shipping' && !hasShippingConfigured && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Shipping rules not configured</span>
                    <span>Shipping rules must be configured before creating a free shipping discount.</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  How will customers claim this?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setApplicationMethod('code')}
                    className={`p-3.5 rounded-xl border text-center font-bold text-xs transition-all ${
                      applicationMethod === 'code'
                        ? 'border-[#0052FF] bg-blue-50/50 text-[#0052FF]'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                    }`}
                  >
                    Discount Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplicationMethod('automatic')}
                    className={`p-3.5 rounded-xl border text-center font-bold text-xs transition-all ${
                      applicationMethod === 'automatic'
                        ? 'border-[#0052FF] bg-blue-50/50 text-[#0052FF]'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                    }`}
                  >
                    Automatic Discount
                  </button>
                </div>
              </div>

              {applicationMethod === 'code' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Discount Code *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        required
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value.toUpperCase().replace(/\s+/g, ''));
                          setStepError(null);
                        }}
                        placeholder="e.g. WELCOME10, FESTIVE50"
                        className={`font-mono uppercase font-bold tracking-wider ${isCodeDuplicate ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="h-10 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      Generate Code
                    </button>
                    {code && (
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="h-10 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                        title="Copy code to clipboard"
                      >
                        <Copy size={13} />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  {isCodeDuplicate ? (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      This discount code already exists. Please choose or generate a unique code.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Customers enter this code at checkout. Unique and case-insensitive.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DISCOUNT VALUE */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {discountType === 'percentage' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Percentage Off (%) *
                    </label>
                    <div className="relative max-w-xs">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={valueInput}
                        onChange={(e) => setValueInput(e.target.value)}
                        placeholder="10"
                        className="text-base font-bold pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Maximum Discount Cap (Optional)
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="1"
                        value={maxDiscountInput}
                        onChange={(e) => setMaxDiscountInput(e.target.value)}
                        placeholder="e.g. 500"
                        className="pl-7"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Sets a safety limit so percentage discounts do not exceed this rupee cap.
                    </p>
                  </div>
                </div>
              )}

              {discountType === 'fixed_amount' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Discount Amount (₹) *
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={valueInput}
                      onChange={(e) => setValueInput(e.target.value)}
                      placeholder="100"
                      className="pl-7 font-bold text-base"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deducted once per qualifying order.
                  </p>
                </div>
              )}

              {discountType === 'bogo' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Customer Buys (Qty)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={bogoBuyQty}
                        onChange={(e) => setBogoBuyQty(e.target.value)}
                        className="font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Customer Gets (Qty)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={bogoGetQty}
                        onChange={(e) => setBogoGetQty(e.target.value)}
                        className="font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      At a Discounted Value
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setBogoRewardType('free');
                          setBogoDiscountPercentage('100');
                        }}
                        className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                          bogoRewardType === 'free'
                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        Free (100% Off)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBogoRewardType('percentage')}
                        className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                          bogoRewardType === 'percentage'
                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        % Discount Off Item
                      </button>
                    </div>
                  </div>

                  {bogoRewardType === 'percentage' && (
                    <div className="max-w-xs">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Reward Item Discount %
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={bogoDiscountPercentage}
                        onChange={(e) => setBogoDiscountPercentage(e.target.value)}
                        placeholder="50"
                      />
                    </div>
                  )}
                </div>
              )}

              {discountType === 'free_shipping' && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-start gap-3">
                  <Truck size={20} className="text-blue-700 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-blue-950">Free delivery promotion</div>
                    <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                      Free delivery promotion. Eligibility depends on configured delivery rules.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SCOPE & CUSTOMERS */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Eligible Products
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'all', label: 'All Products' },
                    { id: 'specific_products', label: 'Specific Items' },
                    { id: 'specific_collections', label: 'By Category' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTargetType(s.id as any)}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                        targetType === s.id
                          ? 'border-[#0052FF] bg-blue-50/50 text-[#0052FF]'
                          : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {targetType === 'specific_products' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Select Products ({selectedProductIds.length} selected)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 divide-y divide-slate-100">
                    {products.map((p) => {
                      const isChecked = selectedProductIds.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2.5 py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedProductIds(prev =>
                                isChecked ? prev.filter(id => id !== p.id) : [...prev, p.id]
                              );
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-slate-900">{p.name}</span>
                          <span className="text-slate-400 ml-auto">₹{p.price}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {targetType === 'specific_collections' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Select Categories ({selectedCollections.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const isSelected = selectedCollections.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedCollections(prev =>
                              isSelected ? prev.filter(x => x !== c) : [...prev, c]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Customer Eligibility
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'all', title: 'Everyone', desc: 'Any customer visiting store' },
                    { id: 'first_time', title: 'First-time Customers', desc: 'Valid only on order #1' },
                    { id: 'repeat', title: 'Returning Buyers', desc: 'Order history required' },
                    { id: 'registered', title: 'Registered Members', desc: 'Must have customer account' },
                  ].map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => setCustomerEligibility(cust.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        customerEligibility === cust.id
                          ? 'border-[#0052FF] bg-blue-50/40 ring-1 ring-[#0052FF]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">{cust.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{cust.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: MINIMUM REQUIREMENTS & LIMITS */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Minimum Purchase Requirement
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'none', label: 'No Minimum' },
                    { id: 'amount', label: 'Minimum Subtotal (₹)' },
                    { id: 'quantity', label: 'Minimum Quantity' },
                  ].map((req) => (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setMinReqType(req.id as any)}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                        minReqType === req.id
                          ? 'border-[#0052FF] bg-blue-50/50 text-[#0052FF]'
                          : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                      }`}
                    >
                      {req.label}
                    </button>
                  ))}
                </div>

                {minReqType === 'amount' && (
                  <div className="mt-3 max-w-xs">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Minimum Subtotal Amount (₹)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={minAmountInput}
                      onChange={(e) => setMinAmountInput(e.target.value)}
                      placeholder="e.g. 999"
                      className="font-bold"
                    />
                  </div>
                )}

                {minReqType === 'quantity' && (
                  <div className="mt-3 max-w-xs">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Minimum Items in Cart
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={minQuantityInput}
                      onChange={(e) => setMinQuantityInput(e.target.value)}
                      placeholder="e.g. 2"
                      className="font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Usage Limits
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={limitTotalUses}
                    onChange={(e) => setLimitTotalUses(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">Cap total redemptions across all buyers</span>
                    <span className="text-slate-500 block text-[11px]">Automatically expires once limit is reached</span>
                  </div>
                  {limitTotalUses && (
                    <Input
                      type="number"
                      min="1"
                      value={totalUsesInput}
                      onChange={(e) => setTotalUsesInput(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-24 ml-auto h-8 text-xs font-bold"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={limitPerCustomer}
                    onChange={(e) => setLimitPerCustomer(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">Limit to one redemption per customer</span>
                    <span className="text-slate-500 block text-[11px]">Enforced via verified phone / customer ID</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: SCHEDULE, STACKING & REVIEW */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Start Date &amp; Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="text-xs font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      End Date
                    </label>
                    <label className="text-xs text-blue-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasEndDate}
                        onChange={(e) => setHasEndDate(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span>Set expiration</span>
                    </label>
                  </div>
                  {hasEndDate ? (
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="text-xs font-medium"
                    />
                  ) : (
                    <div className="h-10 px-3 flex items-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
                      Never expires (ongoing promotion)
                    </div>
                  )}
                </div>
              </div>

              {/* Combinations & Stacking */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Layers size={14} className="text-blue-600" />
                  <span>Discount Stacking Rules</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Select which other promotions this discount can be combined with:
                </p>
                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={combinesWithProduct}
                      onChange={(e) => setCombinesWithProduct(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Can combine with Product Discounts</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={combinesWithOrder}
                      onChange={(e) => setCombinesWithOrder(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Can combine with Order Subtotal Discounts</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={combinesWithShipping}
                      onChange={(e) => setCombinesWithShipping(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Can combine with Free Delivery promotions</span>
                  </label>
                </div>
              </div>

              {/* Profit Margin Warnings */}
              {marginWarnings.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-900">Profit Protection Advisory</div>
                    <ul className="text-[11px] text-amber-800 list-disc list-inside mt-0.5 space-y-0.5">
                      {marginWarnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Live Preview Summary Card */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">Live Promotion Summary</span>
                  <span className="text-[11px] font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                    {applicationMethod === 'code' ? code || 'CODE' : 'AUTOMATIC'}
                  </span>
                </div>
                <div className="text-sm font-black text-slate-900">{title || 'Untitled Promotion'}</div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>&bull; <span className="font-semibold text-slate-800">{summaryDetails.valueSummary}</span> applies to {summaryDetails.targetSummary}.</div>
                  <div>&bull; Available to {summaryDetails.customerSummary}.</div>
                  {minReqType !== 'none' && (
                    <div>&bull; Requires minimum {minReqType === 'amount' ? `₹${minAmountInput}` : `${minQuantityInput} items`}.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex items-center gap-1.5 min-h-[44px]"
              >
                <ArrowLeft size={15} /> Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-800"
              >
                Cancel
              </Button>
            )}

            {currentStep < 5 ? (
              <Button
                type="button"
                onClick={() => {
                  if (validateStep(currentStep)) {
                    setCurrentStep(prev => prev + 1);
                  }
                }}
                className="bg-[#0052FF] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 min-h-[44px] px-6"
              >
                Continue <ArrowRight size={15} />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#0052FF] hover:bg-blue-700 text-white font-bold text-sm min-h-[48px] px-8 shadow-sm flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles size={16} className="animate-spin" />
                    <span>Publishing Promotion…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Publish Discount</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

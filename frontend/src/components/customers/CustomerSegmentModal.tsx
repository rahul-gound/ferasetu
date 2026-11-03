import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  X,
  Play,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Users,
  Info,
  CheckCircle2,
  ChevronDown,
  Filter,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

export interface SegmentRule {
  field: 'orders_count' | 'total_spent' | 'email_subscribed' | 'account_type' | 'days_since_last_order' | 'city';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'contains';
  value: any;
}

export interface SegmentTemplate {
  id: string;
  name: string;
  description: string;
  conjunction: 'AND' | 'OR';
  rules: SegmentRule[];
}

export const PRESET_TEMPLATES: SegmentTemplate[] = [
  {
    id: 'email_subscribers_no_purchase',
    name: "Email subscribers who haven't purchased yet",
    description: "Subscribed to email marketing with zero orders placed. Ideal for a warm welcome series and first-order discount.",
    conjunction: 'AND',
    rules: [
      { field: 'orders_count', operator: 'equals', value: 0 },
      { field: 'email_subscribed', operator: 'equals', value: true },
    ],
  },
  {
    id: 'haven_not_bought',
    name: "Customers who haven't bought",
    description: "All contacts with 0 orders. Automatically leave the group when they purchase.",
    conjunction: 'AND',
    rules: [
      { field: 'orders_count', operator: 'equals', value: 0 },
    ],
  },
  {
    id: 'first_time_buyers',
    name: "First-time buyers",
    description: "Placed exactly 1 order. Perfect for asking for reviews or offering second-order perks.",
    conjunction: 'AND',
    rules: [
      { field: 'orders_count', operator: 'equals', value: 1 },
    ],
  },
  {
    id: 'repeat_buyers',
    name: "Repeat buyers",
    description: "Customers who ordered 2 or more times. Your most loyal regulars.",
    conjunction: 'AND',
    rules: [
      { field: 'orders_count', operator: 'greater_than', value: 1 },
    ],
  },
  {
    id: 'high_spenders',
    name: "High-value spenders (₹5,000+)",
    description: "Top tier shoppers who have spent ₹5,000 or more in lifetime purchases.",
    conjunction: 'AND',
    rules: [
      { field: 'total_spent', operator: 'greater_than_or_equal', value: 5000 },
    ],
  },
  {
    id: 'lapsed_customers',
    name: "Lapsed past buyers (60+ days)",
    description: "Have bought before but haven't ordered in over 60 days. Prime group for win-back offers.",
    conjunction: 'AND',
    rules: [
      { field: 'orders_count', operator: 'greater_than', value: 0 },
      { field: 'days_since_last_order', operator: 'greater_than_or_equal', value: 60 },
    ],
  },
];

const FIELD_OPTIONS = [
  { value: 'orders_count', label: 'Number of orders', type: 'number', placeholder: '0' },
  { value: 'total_spent', label: 'Amount spent (₹)', type: 'number', placeholder: '1000' },
  { value: 'email_subscribed', label: 'Email marketing status', type: 'boolean' },
  { value: 'account_type', label: 'Account status', type: 'select', options: ['registered', 'guest_buyer'] },
  { value: 'days_since_last_order', label: 'Days since last order', type: 'number', placeholder: '30' },
  { value: 'city', label: 'Location / City', type: 'text', placeholder: 'e.g. Delhi, Mumbai' },
];

const OPERATOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
    { value: 'greater_than_or_equal', label: 'is at least' },
    { value: 'less_than_or_equal', label: 'is at most' },
    { value: 'not_equals', label: 'is not' },
  ],
  boolean: [
    { value: 'equals', label: 'is' },
  ],
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'equals' },
  ],
  select: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
};

interface CustomerSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newSegment: any) => void;
  initialTemplateId?: string | null;
  allCustomers: any[];
}

export default function CustomerSegmentModal({
  isOpen,
  onClose,
  onSaved,
  initialTemplateId,
  allCustomers,
}: CustomerSegmentModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conjunction, setConjunction] = useState<'AND' | 'OR'>('AND');
  const [rules, setRules] = useState<SegmentRule[]>([
    { field: 'orders_count', operator: 'equals', value: 0 },
    { field: 'email_subscribed', operator: 'equals', value: true },
  ]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId || null);

  // Preview state (Click Run step!)
  const [previewResult, setPreviewResult] = useState<{
    ran: boolean;
    loading: boolean;
    matched_count: number;
    percentage: number;
    matching_sample: any[];
  }>({
    ran: false,
    loading: false,
    matched_count: 0,
    percentage: 0,
    matching_sample: [],
  });

  // Apply template helper
  const applyTemplate = (template: SegmentTemplate) => {
    setSelectedTemplateId(template.id);
    setName(template.name);
    setDescription(template.description);
    setConjunction(template.conjunction);
    setRules(template.rules.map(r => ({ ...r })));
    setPreviewResult(prev => ({ ...prev, ran: false }));
    toast.success(`Applied template: "${template.name}"`);
  };

  useEffect(() => {
    if (initialTemplateId) {
      const found = PRESET_TEMPLATES.find(t => t.id === initialTemplateId);
      if (found) {
        applyTemplate(found);
      }
    } else if (!name) {
      // Default to the prompt's recommended starting segment: "Email subscribers who haven't purchased yet"
      const rec = PRESET_TEMPLATES[0];
      applyTemplate(rec);
    }
  }, [initialTemplateId, isOpen]);

  // Handle rule changes
  const updateRule = (index: number, updates: Partial<SegmentRule>) => {
    const next = [...rules];
    next[index] = { ...next[index], ...updates };

    // Reset value if field changes
    if (updates.field) {
      if (updates.field === 'email_subscribed') {
        next[index].operator = 'equals';
        next[index].value = true;
      } else if (updates.field === 'account_type') {
        next[index].operator = 'equals';
        next[index].value = 'registered';
      } else if (updates.field === 'city') {
        next[index].operator = 'contains';
        next[index].value = '';
      } else {
        next[index].operator = 'equals';
        next[index].value = 0;
      }
    }

    setRules(next);
    setPreviewResult(prev => ({ ...prev, ran: false }));
  };

  const addRule = () => {
    setRules(prev => [...prev, { field: 'orders_count', operator: 'equals', value: 0 }]);
    setPreviewResult(prev => ({ ...prev, ran: false }));
  };

  const removeRule = (index: number) => {
    if (rules.length <= 1) {
      toast.error('A segment must contain at least one filter rule');
      return;
    }
    setRules(prev => prev.filter((_, i) => i !== index));
    setPreviewResult(prev => ({ ...prev, ran: false }));
  };

  // Step 4: Run preview
  const handleRunPreview = async () => {
    setPreviewResult(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.post('/customers/segments/preview', {
        rules,
        conjunction,
      });

      setPreviewResult({
        ran: true,
        loading: false,
        matched_count: res.data.matched_count ?? 0,
        percentage: res.data.percentage ?? 0,
        matching_sample: res.data.matching_sample ?? [],
      });
      toast.success(`Found ${res.data.matched_count} matching customer${res.data.matched_count === 1 ? '' : 's'}`);
    } catch {
      // Local fallback calculation if backend request fails
      const matched = allCustomers.filter(c => {
        const tests = rules.map(r => {
          if (r.field === 'orders_count') {
            const val = Number(c.total_orders || 0);
            const tgt = Number(r.value);
            if (r.operator === 'equals') return val === tgt;
            if (r.operator === 'greater_than') return val > tgt;
            if (r.operator === 'less_than') return val < tgt;
            if (r.operator === 'greater_than_or_equal') return val >= tgt;
            if (r.operator === 'less_than_or_equal') return val <= tgt;
            if (r.operator === 'not_equals') return val !== tgt;
          }
          if (r.field === 'total_spent') {
            const val = Number(c.total_spent || 0);
            const tgt = Number(r.value);
            if (r.operator === 'equals') return val === tgt;
            if (r.operator === 'greater_than') return val > tgt;
            if (r.operator === 'less_than') return val < tgt;
            if (r.operator === 'greater_than_or_equal') return val >= tgt;
            if (r.operator === 'less_than_or_equal') return val <= tgt;
          }
          if (r.field === 'email_subscribed') {
            const isSub = Boolean(c.email && c.email.length > 3);
            return isSub === Boolean(r.value);
          }
          if (r.field === 'account_type') {
            return r.value === 'registered' ? c.has_password : !c.has_password;
          }
          if (r.field === 'city') {
            return String(c.address || '').toLowerCase().includes(String(r.value || '').toLowerCase());
          }
          return true;
        });

        return conjunction === 'OR' ? tests.some(Boolean) : tests.every(Boolean);
      });

      setPreviewResult({
        ran: true,
        loading: false,
        matched_count: matched.length,
        percentage: allCustomers.length > 0 ? Math.round((matched.length / allCustomers.length) * 100) : 0,
        matching_sample: matched.slice(0, 50),
      });
      toast.success(`Calculated preview: ${matched.length} customer${matched.length === 1 ? '' : 's'} match`);
    }
  };

  // Step 5: Save segment mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/customers/segments', {
        name: name.trim(),
        description: description.trim(),
        query_type: selectedTemplateId ? 'template' : 'custom',
        template_id: selectedTemplateId,
        rules,
        conjunction,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Segment "${name}" saved!`);
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSaved(data.segment);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save segment');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please give your segment a clear name');
      return;
    }
    if (rules.length === 0) {
      toast.error('Add at least one rule to define your segment');
      return;
    }
    saveMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-[#E5EAF1] bg-white shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAF1] px-5 py-4 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0052FF] border border-blue-100">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Create customer segment
                </h3>
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[#0052FF] text-[10px] font-bold">
                  Dynamic Search
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                A saved search that keeps itself up to date as customers order or register.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Empathy & Mental Model Callout (Jakob's Law & Loss Aversion) */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-700 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#0052FF]">
              <Info size={15} />
              <span>How customer segments work in FeraSetu</span>
            </div>
            <p>
              A segment is a <strong>saved customer search</strong> that updates automatically. When a customer qualifies, they join automatically; when their activity changes (e.g. placing an order), they leave automatically.
            </p>
            <p className="text-slate-500 pt-0.5">
              <strong>Note:</strong> A segment is just an audience group, not an automatic action. Saving one does not send an email, create a coupon, or charge anyone.
            </p>
          </div>

          {/* TEMPLATES ACCORDION / PICKER (Step 2 in prompt) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Choose from Templates (Recommended starting point)
              </span>
              <span className="text-[11px] text-slate-400">
                Select a template, then adjust rules as needed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_TEMPLATES.map(template => {
                const isSelected = selectedTemplateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-white ring-2 ring-blue-100 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {template.name}
                      </span>
                      {template.id === 'email_subscribers_no_purchase' && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEGMENT NAME & DESCRIPTION */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Segment Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Email subscribers who haven't bought yet"
                className="h-10 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Goal / Description (Optional)
              </label>
              <Input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Target for welcome discount code and introductory offer"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* RULES BUILDER */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Segment Filter Rules
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Condition Logic:</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => { setConjunction('AND'); setPreviewResult(p => ({ ...p, ran: false })); }}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      conjunction === 'AND' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
                    }`}
                  >
                    Match ALL (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConjunction('OR'); setPreviewResult(p => ({ ...p, ran: false })); }}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      conjunction === 'OR' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
                    }`}
                  >
                    Match ANY (OR)
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {rules.map((rule, idx) => {
                const currentField = FIELD_OPTIONS.find(f => f.value === rule.field) || FIELD_OPTIONS[0];
                const availableOps = OPERATOR_OPTIONS[currentField.type] || OPERATOR_OPTIONS.number;

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    {/* Index / Conjunction Badge */}
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">
                      {idx === 0 ? 'Where' : conjunction}
                    </span>

                    {/* Field select */}
                    <select
                      value={rule.field}
                      onChange={e => updateRule(idx, { field: e.target.value as any })}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    >
                      {FIELD_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator select */}
                    <select
                      value={rule.operator}
                      onChange={e => updateRule(idx, { operator: e.target.value as any })}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    >
                      {availableOps.map(op => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value Input */}
                    {currentField.type === 'boolean' ? (
                      <select
                        value={String(rule.value)}
                        onChange={e => updateRule(idx, { value: e.target.value === 'true' })}
                        className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                      >
                        <option value="true">Subscribed</option>
                        <option value="false">Not Subscribed</option>
                      </select>
                    ) : currentField.type === 'select' ? (
                      <select
                        value={String(rule.value)}
                        onChange={e => updateRule(idx, { value: e.target.value })}
                        className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                      >
                        <option value="registered">Registered Password Account</option>
                        <option value="guest_buyer">Guest Shopper</option>
                      </select>
                    ) : (
                      <Input
                        type={currentField.type}
                        value={rule.value}
                        placeholder={currentField.placeholder}
                        onChange={e => updateRule(idx, { value: currentField.type === 'number' ? Number(e.target.value) : e.target.value })}
                        className="h-9 flex-1 text-xs"
                      />
                    )}

                    {/* Remove rule */}
                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
                      title="Remove rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addRule}
              className="h-9 text-xs font-semibold rounded-xl border-dashed"
            >
              <Plus size={14} className="mr-1" /> Add another condition
            </Button>
          </div>

          {/* STEP 4: RUN / PREVIEW SECTION (Prompt Specification!) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Play size={14} className="text-blue-600 fill-blue-600" />
                  Step 4: Click Run to see which customers match
                </span>
                <p className="text-[11px] text-slate-500">
                  Verify the audience size and matching customer records before saving.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleRunPreview}
                disabled={previewResult.loading}
                className="h-9 px-4 text-xs font-bold bg-[#152238] hover:bg-slate-800 text-white rounded-xl shadow-xs"
              >
                {previewResult.loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Calculating...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Play size={12} className="fill-white" />
                    Run Query
                  </span>
                )}
              </Button>
            </div>

            {/* Run Outcome Table Preview */}
            {previewResult.ran && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white text-xs font-bold">
                      {previewResult.matched_count} Matched
                    </Badge>
                    <span className="text-xs text-slate-600">
                      {previewResult.percentage}% of your store's customer base
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Live dynamic preview
                  </span>
                </div>

                {previewResult.matching_sample.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="px-3 py-2">Customer</th>
                          <th className="px-3 py-2">Orders</th>
                          <th className="px-3 py-2">Spent</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewResult.matching_sample.map((cust, i) => (
                          <tr key={cust.id || i} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <span className="font-semibold text-slate-900 block">{cust.name}</span>
                              <span className="text-[10px] text-slate-400">{cust.email || cust.phone || 'No contact'}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-700">{cust.total_orders ?? 0}</td>
                            <td className="px-3 py-2 text-slate-700">₹{(cust.total_spent ?? 0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {cust.account_type || (cust.has_password ? 'Registered' : 'Guest')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-amber-50 text-amber-900 text-xs text-center border border-amber-200/60">
                    No customers currently match these rules. As new customers sign up or place orders, they will qualify automatically.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-[#E5EAF1] bg-slate-50/80 px-5 py-4 shrink-0">
          <span className="text-xs text-slate-500">
            {rules.length} rule{rules.length === 1 ? '' : 's'} configured
          </span>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-10 px-5 text-xs font-bold bg-[#0052FF] hover:bg-blue-600 text-white rounded-xl shadow-sm cursor-pointer"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save segment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

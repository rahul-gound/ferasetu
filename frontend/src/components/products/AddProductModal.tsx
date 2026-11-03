import React, { useState, useRef, useEffect, useId } from 'react';
import toast from 'react-hot-toast';
import {
  X,
  Upload,
  Package,
  Layers,
  Tag,
  DollarSign,
  TrendingUp,
  Sparkles,
  Barcode,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  HelpCircle,
  ArrowRight,
  Eye,
} from 'lucide-react';
import api from '../../services/api';
import { resolveMediaUrl } from '../../utils/media';
import posthog from '../../lib/posthog';

export interface ProductVariantItem {
  id?: string;
  title: string;
  price?: number | string;
  compare_at_price?: number | string | null;
  cost_price?: number | string | null;
  price_minor?: number;
  compare_at_price_minor?: number | null;
  cost_price_minor?: number | null;
  sku?: string;
  barcode?: string;
  status: 'active' | 'draft' | 'archived';
  option_values?: Record<string, string>;
}

export interface ProductOptionItem {
  id?: string;
  name: string;
  values: string[];
}

export interface ProductItem {
  id: string;
  name: string;
  description?: string;
  cost_price?: number;
  price: number;
  sale_price?: number;
  category: string;
  stock_quantity: number;
  image_url?: string;
  media_key?: string;
  is_active: boolean;
  status?: 'active' | 'draft' | 'archived';
  sku?: string;
  barcode?: string;
  has_variants?: boolean;
  variants?: ProductVariantItem[];
  options?: ProductOptionItem[];
  created_at: string;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editProduct?: ProductItem | null;
  onSaved: () => void;
}

interface FormState {
  name: string;
  description: string;
  cost_price: string;
  price: string;
  sale_price: string;
  category: string;
  stock_quantity: string;
  image_url: string;
  media_key: string;
  is_active: boolean;
  status: 'active' | 'draft' | 'archived';
  is_returnable: boolean;
  sku: string;
  barcode: string;
  options: { id?: string; name: string; valuesStr: string }[];
  variants: {
    id?: string;
    title: string;
    price: string;
    compare_at_price: string;
    cost_price: string;
    sku: string;
    barcode: string;
    status: 'active' | 'draft' | 'archived';
    option_values: Record<string, string>;
  }[];
}

const CATEGORIES = [
  'Grocery',
  'Fashion & Apparel',
  'Electronics & Gadgets',
  'Food & Beverages',
  'Health & Medical',
  'Home & Kitchen',
  'Beauty & Personal Care',
  'Sports & Fitness',
  'Books & Stationery',
  'Handmade & Artisan',
  'Other',
];

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  cost_price: '',
  price: '',
  sale_price: '',
  category: '',
  stock_quantity: '',
  image_url: '',
  media_key: '',
  is_active: true,
  is_returnable: true,
  status: 'active',
  sku: '',
  barcode: '',
  options: [],
  variants: [],
};

type ActiveTab = 'general' | 'pricing' | 'inventory' | 'media' | 'variants';

export default function AddProductModal({
  isOpen,
  onClose,
  editProduct,
  onSaved,
}: AddProductModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize or reset form when modal opens or editProduct changes
  useEffect(() => {
    if (!isOpen) return;

    if (editProduct) {
      setImagePreview(resolveMediaUrl(editProduct.media_key || editProduct.image_url || ''));
      setLoadingDetails(true);

      api
        .get(`/products/${editProduct.id}`)
        .then((res) => {
          const full = res.data.product || res.data;
          const opts = (full.options || []).map((o: any) => ({
            id: o.id,
            name: o.name || '',
            valuesStr: Array.isArray(o.values) ? o.values.join(', ') : '',
          }));
          const vars = (full.variants || []).map((v: any) => ({
            id: v.id,
            title: v.title || '',
            price: v.price != null ? String(v.price) : v.price_minor ? String(v.price_minor / 100) : '',
            compare_at_price:
              v.compare_at_price != null
                ? String(v.compare_at_price)
                : v.compare_at_price_minor
                ? String(v.compare_at_price_minor / 100)
                : '',
            cost_price:
              v.cost_price != null ? String(v.cost_price) : v.cost_price_minor ? String(v.cost_price_minor / 100) : '',
            sku: v.sku || '',
            barcode: v.barcode || '',
            status: (v.status || 'active') as 'active' | 'draft' | 'archived',
            option_values: v.option_values || {},
          }));

          setImagePreview(resolveMediaUrl(full.media_key || full.image_url || ''));
          setForm({
            name: full.name || '',
            description: full.description || '',
            cost_price: full.cost_price ? String(full.cost_price) : '',
            price: String(full.price ?? ''),
            sale_price: full.sale_price ? String(full.sale_price) : '',
            category: full.category || '',
            stock_quantity: String(full.stock_quantity ?? full.stock ?? 0),
            image_url: full.image_url || '',
            media_key: full.media_key || '',
            is_active: full.is_active !== false,
            is_returnable: full.is_returnable !== undefined ? Boolean(full.is_returnable) : (full.non_returnable ? false : true),
            status: (full.status || (full.is_active ? 'active' : 'draft')) as 'active' | 'draft' | 'archived',
            sku: full.sku || '',
            barcode: full.barcode || '',
            options: opts,
            variants: vars,
          });
        })
        .catch((err) => {
          console.warn('Failed to load full product details, falling back:', err);
          setForm({
            name: editProduct.name || '',
            description: editProduct.description || '',
            cost_price: editProduct.cost_price ? String(editProduct.cost_price) : '',
            price: String(editProduct.price ?? ''),
            sale_price: editProduct.sale_price ? String(editProduct.sale_price) : '',
            category: editProduct.category || '',
            stock_quantity: String(editProduct.stock_quantity ?? 0),
            image_url: editProduct.image_url || '',
            media_key: editProduct.media_key || '',
            is_active: editProduct.is_active !== false,
            is_returnable: (editProduct as any).is_returnable !== undefined ? Boolean((editProduct as any).is_returnable) : ((editProduct as any).non_returnable ? false : true),
            status: (editProduct.status || (editProduct.is_active ? 'active' : 'draft')) as
              | 'active'
              | 'draft'
              | 'archived',
            sku: editProduct.sku || '',
            barcode: editProduct.barcode || '',
            options: [],
            variants: [],
          });
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    } else {
      setForm(INITIAL_FORM);
      setImagePreview('');
      setActiveTab('general');
    }
  }, [isOpen, editProduct]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Calculations for live profit margin
  const sellingPriceNum = parseFloat(form.price) || 0;
  const costPriceNum = parseFloat(form.cost_price) || 0;
  const mrpNum = parseFloat(form.sale_price) || 0;

  const profitAmount = sellingPriceNum > 0 && costPriceNum > 0 ? sellingPriceNum - costPriceNum : 0;
  const profitMarginPercent =
    costPriceNum > 0 && profitAmount !== 0 ? ((profitAmount / costPriceNum) * 100).toFixed(1) : null;

  const discountPercent =
    mrpNum > 0 && mrpNum > sellingPriceNum
      ? Math.round(((mrpNum - sellingPriceNum) / mrpNum) * 100)
      : null;

  // Auto-generate SKU helper
  const handleAutoGenerateSku = () => {
    const catCode = form.category
      ? form.category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '')
      : 'PRD';
    const nameCode = form.name
      ? form.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()
      : 'ITEM';
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const generated = `${catCode}-${nameCode}-${randomHex}`;
    setForm((f) => ({ ...f, sku: generated }));
    toast.success('Generated unique SKU: ' + generated);
  };

  // Image upload handler with B2 cloud storage
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB for fast loading on customer phones.');
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setImagePreview(blobUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (editProduct?.id) {
        formData.append('productId', editProduct.id);
      }

      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const mediaKey = res.data?.media_key || res.data?.key;
      if (!mediaKey) {
        throw new Error('Upload succeeded but no media key returned');
      }

      setForm((f) => ({ ...f, media_key: mediaKey, image_url: '' }));
      setImagePreview(resolveMediaUrl(mediaKey));
      toast.success('Product image uploaded and optimized!');
    } catch (err: any) {
      console.error('Media upload failed:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to upload image';
      toast.error(msg);
      setImagePreview(form.media_key ? resolveMediaUrl(form.media_key) : form.image_url || '');
    } finally {
      setUploading(false);
      URL.revokeObjectURL(blobUrl);
    }
  };

  const handleRemoveImage = () => {
    setForm((f) => ({ ...f, media_key: '', image_url: '' }));
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Variant generator logic
  const handleAddOption = () => {
    setForm((f) => ({
      ...f,
      options: [...f.options, { name: '', valuesStr: '' }],
    }));
  };

  const handleRemoveOption = (index: number) => {
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, i) => i !== index),
    }));
  };

  const handleOptionChange = (index: number, field: 'name' | 'valuesStr', val: string) => {
    setForm((f) => {
      const next = [...f.options];
      next[index] = { ...next[index], [field]: val };
      return { ...f, options: next };
    });
  };

  const handleGenerateVariants = () => {
    const activeOpts = form.options
      .map((o) => ({
        name: o.name.trim(),
        values: o.valuesStr.split(',').map((s) => s.trim()).filter(Boolean),
      }))
      .filter((o) => o.name && o.values.length > 0);

    if (activeOpts.length === 0) {
      toast.error('Add at least one option with values (e.g. Size: S, M, L) first.');
      return;
    }

    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce((acc, curr) => {
        return acc.flatMap((a) => curr.map((c) => [...a, c]));
      }, [[]] as string[][]);
    };

    const optValues = activeOpts.map((o) => o.values);
    const combinations = cartesian(optValues);
    const baseSku = form.sku ? form.sku.trim().toUpperCase() : '';

    const newVariants = combinations.map((combo) => {
      const optionMap: Record<string, string> = {};
      combo.forEach((val, idx) => {
        optionMap[activeOpts[idx].name] = val;
      });
      const title = combo.join(' / ');

      const existing = form.variants.find((v) => v.title === title);
      if (existing) {
        return {
          ...existing,
          option_values: optionMap,
        };
      }

      const comboSku = combo.map((c) => c.replace(/\s+/g, '').toUpperCase()).join('-');
      const suggestedSku = baseSku ? `${baseSku}-${comboSku}` : '';

      return {
        title,
        price: form.price || '',
        compare_at_price: form.sale_price || '',
        cost_price: form.cost_price || '',
        sku: suggestedSku,
        barcode: '',
        status: 'active' as const,
        option_values: optionMap,
      };
    });

    setForm((f) => ({ ...f, variants: newVariants }));
    toast.success(`Generated ${newVariants.length} variants!`);
  };

  const handleAddCustomVariant = () => {
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        {
          title: `Custom Variant ${f.variants.length + 1}`,
          price: form.price || '',
          compare_at_price: form.sale_price || '',
          cost_price: form.cost_price || '',
          sku: form.sku ? `${form.sku}-V${f.variants.length + 1}` : '',
          barcode: '',
          status: 'active' as const,
          option_values: {},
        },
      ],
    }));
  };

  const handleRemoveVariant = (index: number) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }));
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    setForm((f) => {
      const next = [...f.variants];
      next[index] = { ...next[index], [field]: value };
      return { ...f, variants: next };
    });
  };

  // Submit handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Please enter a product name');
      setActiveTab('general');
      return;
    }

    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      toast.error('Please enter a valid selling price');
      setActiveTab('pricing');
      return;
    }

    setSaving(true);
    try {
      const parsedOptions = form.options
        .map((o, idx) => ({
          id: o.id,
          name: o.name.trim(),
          position: idx,
          values: o.valuesStr.split(',').map((s) => s.trim()).filter(Boolean),
        }))
        .filter((o) => o.name && o.values.length > 0);

      const parsedVariants = form.variants.map((v) => ({
        id: v.id,
        title: v.title.trim() || 'Default',
        price: v.price ? parseFloat(v.price) : parseFloat(form.price),
        compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
        cost_price: v.cost_price ? parseFloat(v.cost_price) : null,
        sku: v.sku?.trim() || null,
        barcode: v.barcode?.trim() || null,
        status: v.status || 'active',
        option_values: v.option_values || {},
      }));

      const payload: Record<string, any> = {
        name: form.name.trim(),
        description: form.description.trim(),
        cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
        price: parseFloat(form.price),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        category: form.category || 'General',
        stock_quantity: parseInt(form.stock_quantity, 10) || 0,
        is_active: form.status === 'active',
        is_returnable: form.is_returnable,
        non_returnable: !form.is_returnable,
        status: form.status,
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        options: parsedOptions,
        variants: parsedVariants,
      };

      if (form.media_key) {
        payload.media_key = form.media_key;
        payload.image_url = resolveMediaUrl(form.media_key);
      } else if (form.image_url) {
        payload.image_url = form.image_url;
      }

      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, payload);
        posthog.capture('product_updated', {
          category: form.category || 'uncategorized',
          status: form.status,
          variant_count: parsedVariants.length,
        });
        toast.success('Product updated successfully!');
      } else {
        await api.post('/products', payload);
        posthog.capture('product_created', {
          category: form.category || 'uncategorized',
          status: form.status,
          variant_count: parsedVariants.length,
        });
        toast.success('New product listed in your storefront!');
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Save product error:', error);
      const msg = error.response?.data?.error || error.message || 'Failed to save product';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/65 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !uploading) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden flex flex-col max-h-[92vh] animate-scale-in"
      >
        {/* Top Orange Radiant Accent Header */}
        <div className="relative bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 sm:px-8 py-5 text-white shrink-0 shadow-md">
          {/* Subtle warm background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_70%)] pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
                <Package size={22} strokeWidth={2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
                    {editProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white backdrop-blur-sm border border-white/20">
                    0% Commission
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-orange-50/90 font-medium mt-0.5 m-0">
                  {editProduct
                    ? 'Update your catalog item pricing and stock levels.'
                    : 'List an item in your store in seconds with zero tech jargon.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving || uploading}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
              title="Close modal (Esc)"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Navigation Tabs Pill Bar */}
          <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Tag size={13} />
              <span>Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'pricing'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <DollarSign size={13} />
              <span>Pricing & Profit</span>
              {profitAmount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Barcode size={13} />
              <span>Stock & SKU</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'media'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <ImageIcon size={13} />
              <span>Photo</span>
              {imagePreview && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('variants')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'variants'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Layers size={13} />
              <span>Variants</span>
              {form.variants.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-orange-700/60 text-white text-[10px]">
                  {form.variants.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {loadingDetails && (
            <div className="flex items-center justify-center gap-2.5 py-4 px-4 bg-orange-50 border border-orange-200 rounded-2xl text-orange-800 text-xs font-semibold animate-pulse">
              <Sparkles size={16} className="text-orange-600" />
              <span>Loading complete catalog specs from server...</span>
            </div>
          )}

          {/* TAB 1: GENERAL DETAILS */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Product Name <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masala Chai Blend 500g, Organic Cotton Kurta"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-12 min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Keep it clear and recognizable. Customers search for this on your storefront.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full h-12 min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 transition-all cursor-pointer appearance-none"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    ▼
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Share details about weight, material, ingredients, freshness, or size fit..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full p-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 transition-all resize-y"
                />
              </div>

              {/* Return Policy Setting */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Return Policy</span>
                      {!form.is_returnable ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full border border-amber-300">
                          🚫 Non-returnable
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300">
                          Returnable
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {form.is_returnable
                        ? 'Customers can request a return for this product.'
                        : 'Customers cannot return this product (ideal for perishables, groceries, hygiene, or custom items).'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!form.is_returnable}
                      onChange={(e) => setForm((f) => ({ ...f, is_returnable: !e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
                {!form.is_returnable && (
                  <div className="text-[11px] font-semibold text-amber-900 bg-amber-100/60 p-2.5 rounded-lg border border-amber-300/80 flex items-center gap-1.5">
                    <span>⚠️ Product will clearly say <b>Non-returnable</b> across your store catalog, checkout, and invoices.</span>
                  </div>
                )}
              </div>

              {/* Quick Jump Suggestion */}
              <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
                <span>Next up: Set your selling price & profit margin</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('pricing')}
                  className="inline-flex items-center gap-1 font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  <span>Go to Pricing</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PRICING & PROFIT */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Selling Price (₹) <span className="text-orange-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      className="w-full h-12 min-h-[48px] pl-8 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-base font-bold placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 transition-all"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    What customers pay
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    MRP / List Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Optional"
                      value={form.sale_price}
                      onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))}
                      className="w-full h-12 min-h-[48px] pl-8 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-base font-bold placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 transition-all"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Shows crossed-out
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Cost Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.cost_price}
                      onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                      className="w-full h-12 min-h-[48px] pl-8 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-base font-bold placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 transition-all"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Private to you
                  </span>
                </div>
              </div>

              {/* Dynamic Live Profit Card (Warm & Feel-Good) */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50 border border-orange-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 m-0">
                        Merchant Profit Telemetry
                      </h4>
                      <p className="text-[11px] text-slate-500 m-0">
                        Instant calculation of your margins per unit sold
                      </p>
                    </div>
                  </div>

                  {discountPercent && discountPercent > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500 text-white shadow-xs">
                      {discountPercent}% OFF deal
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-white/90 backdrop-blur rounded-xl border border-orange-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Customer Price
                    </span>
                    <p className="text-lg font-black text-slate-900 mt-0.5 m-0">
                      ₹{sellingPriceNum.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-3 bg-white/90 backdrop-blur rounded-xl border border-orange-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Estimated Profit
                    </span>
                    <p
                      className={`text-lg font-black mt-0.5 m-0 ${
                        profitAmount > 0
                          ? 'text-emerald-600'
                          : profitAmount < 0
                          ? 'text-rose-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {costPriceNum > 0
                        ? `${profitAmount >= 0 ? '+' : ''}₹${profitAmount.toLocaleString(
                            'en-IN'
                          )}`
                        : 'Enter Cost'}
                    </p>
                  </div>

                  <div className="p-3 bg-white/90 backdrop-blur rounded-xl border border-orange-100 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Profit Margin
                    </span>
                    <p
                      className={`text-lg font-black mt-0.5 m-0 ${
                        profitMarginPercent && parseFloat(profitMarginPercent) > 0
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {profitMarginPercent ? `${profitMarginPercent}%` : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium pt-1">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>
                    FeraSetu charges <strong>0% transaction commission</strong>. You keep 100% of your earnings.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STOCK & IDENTIFIERS */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.stock_quantity}
                    onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
                    className="w-full h-12 min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 transition-all"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Available units on shop shelf
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>SKU (Shop Unique Code)</span>
                    <button
                      type="button"
                      onClick={handleAutoGenerateSku}
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                    >
                      Auto-Generate
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GRO-ATT-9821"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
                    className="w-full h-12 min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono text-sm uppercase focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 transition-all"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Used for barcode scanner & inventory tracking
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Barcode / UPC / EAN
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Barcode size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 8901234567890"
                    value={form.barcode}
                    onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                    className="w-full h-12 min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 transition-all"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Scan package barcode with standard laser or mobile camera
                </span>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Visibility Status
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['active', 'draft', 'archived'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, status: st, is_active: st === 'active' }))
                      }
                      className={`min-h-[48px] p-3 rounded-2xl text-xs font-bold capitalize border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        form.status === st
                          ? st === 'active'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                            : st === 'draft'
                            ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm ring-2 ring-amber-500/20'
                            : 'bg-slate-100 border-slate-400 text-slate-900 shadow-sm'
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-black">
                        {st === 'active' ? '🟢 Active' : st === 'draft' ? '🟡 Draft' : '⚪ Archived'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {st === 'active'
                          ? 'Live in store'
                          : st === 'draft'
                          ? 'Hidden for now'
                          : 'Discontinued'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PHOTO & MEDIA */}
          {activeTab === 'media' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Product Image
                </label>

                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[200px] overflow-hidden ${
                    uploading
                      ? 'bg-orange-50/50 border-orange-300 cursor-wait'
                      : imagePreview
                      ? 'border-orange-400/60 bg-slate-50 hover:border-orange-500'
                      : 'border-slate-300 bg-slate-50/60 hover:bg-orange-50/40 hover:border-orange-400'
                  }`}
                >
                  {uploading ? (
                    <div className="space-y-3">
                      <div className="w-10 h-10 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-800">
                        Uploading to secure cloud storage...
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Optimizing image for fast mobile loading
                      </p>
                    </div>
                  ) : imagePreview ? (
                    <div className="w-full flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-36 h-36 rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white shrink-0 relative group">
                        <img
                          src={imagePreview}
                          alt="Product preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-left space-y-2 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <Check size={16} />
                          <span>Image ready for catalog display</span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Your photo will render crisp across WhatsApp catalogs, Google search previews, and customer phones.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold cursor-pointer transition-colors"
                          >
                            Replace Photo
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
                        <Upload size={24} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 m-0">
                          Click to upload or drag photo here
                        </p>
                        <p className="text-xs text-slate-500 mt-1 m-0">
                          Supports JPG, PNG, WebP up to 5MB. Clear daylight photos sell 3x faster.
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
              </div>

              {/* URL fallback for merchants who prefer image links */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Or paste direct image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/product-image.jpg"
                  value={form.image_url}
                  onChange={(e) => {
                    const url = e.target.value;
                    setForm((f) => ({ ...f, image_url: url, media_key: '' }));
                    if (url.startsWith('http')) {
                      setImagePreview(url);
                    }
                  }}
                  className="w-full h-11 min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-500/15"
                />
              </div>
            </div>
          )}

          {/* TAB 5: VARIANTS & SIZES */}
          {activeTab === 'variants' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 m-0">
                    <Layers size={16} className="text-orange-600" />
                    <span>Product Options & Variants</span>
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Configure sizes or colors with custom pricing
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus size={14} />
                  <span>Add Option</span>
                </button>
              </div>

              {form.options.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Option Types & Values
                  </div>
                  {form.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 w-1/3 focus:border-orange-500 focus:outline-none"
                        placeholder="e.g. Size or Color"
                        value={opt.name}
                        onChange={(e) => handleOptionChange(idx, 'name', e.target.value)}
                      />
                      <input
                        className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 flex-1 focus:border-orange-500 focus:outline-none"
                        placeholder="e.g. S, M, L, XL (separated by commas)"
                        value={opt.valuesStr}
                        onChange={(e) => handleOptionChange(idx, 'valuesStr', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="w-10 h-10 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors"
                        title="Remove option"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleGenerateVariants}
                    className="w-full mt-2 h-11 min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Sparkles size={15} />
                    <span>
                      Generate Variants Matrix ({form.options.filter((o) => o.name && o.valuesStr).length} Option Groups)
                    </span>
                  </button>
                </div>
              )}

              {/* Variants Matrix */}
              {form.variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Generated Combinations ({form.variants.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCustomVariant}
                      className="text-xs text-orange-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Custom Variant</span>
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                    {form.variants.map((v, vIdx) => (
                      <div
                        key={vIdx}
                        className="p-3 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs hover:border-orange-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            className="h-9 px-3 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 flex-1 focus:border-orange-500 focus:outline-none"
                            value={v.title}
                            placeholder="Variant Title (e.g. Red / Large)"
                            onChange={(e) => handleVariantChange(vIdx, 'title', e.target.value)}
                          />
                          <select
                            className="h-9 px-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white cursor-pointer focus:border-orange-500 focus:outline-none"
                            value={v.status}
                            onChange={(e) => handleVariantChange(vIdx, 'status', e.target.value)}
                          >
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(vIdx)}
                            className="w-9 h-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors"
                            title="Delete variant"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                              Price (₹) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 w-full focus:border-orange-500 focus:outline-none"
                              placeholder="Price"
                              value={v.price}
                              onChange={(e) => handleVariantChange(vIdx, 'price', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                              SKU
                            </label>
                            <input
                              type="text"
                              className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-mono uppercase text-slate-900 w-full focus:border-orange-500 focus:outline-none"
                              placeholder="SKU"
                              value={v.sku}
                              onChange={(e) =>
                                handleVariantChange(vIdx, 'sku', e.target.value.toUpperCase())
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                              Barcode
                            </label>
                            <input
                              type="text"
                              className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 w-full focus:border-orange-500 focus:outline-none"
                              placeholder="Barcode"
                              value={v.barcode}
                              onChange={(e) => handleVariantChange(vIdx, 'barcode', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.options.length === 0 && (
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                  <Layers size={24} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 m-0">
                    No options configured yet
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 m-0">
                    If this product has multiple sizes, weights, or colors, click "Add Option" above.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Modal Action Footer */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 font-medium order-2 sm:order-1 text-center sm:text-left">
              {form.status === 'active' ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Will be visible in your live store immediately
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Saved as draft (hidden from customers)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || uploading}
                className="flex-1 sm:flex-none h-12 min-h-[48px] px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 sm:flex-none h-12 min-h-[48px] px-7 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading Photo...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} strokeWidth={2.5} />
                    <span>{editProduct ? 'Save Changes' : 'Publish Product'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

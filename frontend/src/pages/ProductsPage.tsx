import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Search, Edit2, Trash2, X, Upload, Package,
  AlertTriangle, ChevronDown, ToggleLeft, ToggleRight,
  Download, Sparkles, Check, ArrowRight, ShieldCheck,
  Layers, Tag,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UpgradePrompt from '../components/ui/UpgradePrompt';
import ActionableEmptyState from '../components/ui/ActionableEmptyState';
import { getPlanLimits, normalizePlanId, hasReachedProductLimit } from '../config/plans';
import { resolveMediaUrl } from '../utils/media';

interface ProductOption {
  id?: string;
  name: string;
  values: string[];
}

interface ProductVariant {
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

interface Product {
  id: string;
  name: string;
  description?: string;
  cost_price?: number;
  price: number;
  sale_price?: number;
  price_minor?: number;
  compare_at_price_minor?: number;
  cost_price_minor?: number;
  category: string;
  stock_quantity: number;
  image_url?: string;
  media_key?: string;
  is_active: boolean;
  status?: 'active' | 'draft' | 'archived';
  sku?: string;
  barcode?: string;
  has_variants?: boolean;
  variants?: ProductVariant[];
  options?: ProductOption[];
  created_at: string;
}

interface ProductForm {
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

const CATEGORIES = ['Grocery', 'Fashion', 'Electronics', 'Food & Beverages', 'Medical', 'Home & Kitchen', 'Sports', 'Beauty', 'Books', 'Other'];

function Shimmer() {
  return (
    <div style={{
      background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
      borderRadius: '12px', height: '260px',
    }} />
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const planLimits = getPlanLimits(user?.plan);
  const productLimit = planLimits.products; // Infinity for pro

  const [search, setSearch] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const emptyForm: ProductForm = {
    name: '', description: '', cost_price: '', price: '', sale_price: '',
    category: '', stock_quantity: '', image_url: '', media_key: '', is_active: true,
    status: 'active', sku: '', barcode: '', options: [], variants: []
  };
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', statusFilter],
    queryFn: async () => {
      const res = await api.get('/products', {
        params: statusFilter !== 'all' ? { status: statusFilter } : undefined
      });
      return res.data.products || res.data;
    },
  });

  const handleExportCsv = () => {
    if (products.length === 0) {
      toast.error('No products in catalog to export.');
      return;
    }
    setExportingCsv(true);
    try {
      const headers = ['ID', 'Product Name', 'Category', 'Price', 'Sale Price', 'Cost Price', 'Stock Quantity', 'Status', 'SKU', 'Barcode', 'Variants Count', 'Image URL', 'Created At'];
      const rows = products.map(p => [
        `"${p.id}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        p.price ?? '',
        p.sale_price ?? '',
        p.cost_price ?? '',
        p.stock_quantity ?? 0,
        p.status || (p.is_active ? 'active' : 'archived'),
        `"${(p.sku || '').replace(/"/g, '""')}"`,
        `"${(p.barcode || '').replace(/"/g, '""')}"`,
        p.variants?.length ?? (p.has_variants ? 'Yes' : '0'),
        `"${(p.image_url || '').replace(/"/g, '""')}"`,
        `"${p.created_at || ''}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FeraSetu_Products_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Catalog exported! You have 100% data sovereignty over your products.');
    } catch {
      toast.error('Failed to export catalog.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Mark setup-checklist flag when the user adds at least one product.
  useEffect(() => {
    if (products.length > 0) {
      try {
        const flags = JSON.parse(localStorage.getItem('fera_setup_flags') || '{}');
        if (!flags.first_product) {
          flags.first_product = true;
          localStorage.setItem('fera_setup_flags', JSON.stringify(flags));
        }
      } catch { /* ignore */ }
    }
  }, [products.length]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });

  const atLimit = hasReachedProductLimit(user?.plan, products.length);
  const nearLimit = !atLimit && productLimit !== Infinity && products.length >= Math.floor(productLimit * 0.8);

  const openAdd = () => {
    if (atLimit) {
      setShowGrowthModal(true);
      return;
    }
    setEditProduct(null);
    setForm(emptyForm);
    setImagePreview('');
    setShowModal(true);
  };

  const openEdit = async (p: Product) => {
    setEditProduct(p);
    setImagePreview(resolveMediaUrl(p.media_key || p.image_url || ''));
    setShowModal(true);
    setLoadingDetails(true);

    try {
      const res = await api.get(`/products/${p.id}`);
      const fullProd = res.data.product || res.data;
      const opts = (fullProd.options || []).map((o: any) => ({
        id: o.id,
        name: o.name || '',
        valuesStr: Array.isArray(o.values) ? o.values.join(', ') : '',
      }));
      const vars = (fullProd.variants || []).map((v: any) => ({
        id: v.id,
        title: v.title || '',
        price: v.price != null ? String(v.price) : (v.price_minor ? String(v.price_minor / 100) : ''),
        compare_at_price: v.compare_at_price != null ? String(v.compare_at_price) : (v.compare_at_price_minor ? String(v.compare_at_price_minor / 100) : ''),
        cost_price: v.cost_price != null ? String(v.cost_price) : (v.cost_price_minor ? String(v.cost_price_minor / 100) : ''),
        sku: v.sku || '',
        barcode: v.barcode || '',
        status: (v.status || 'active') as 'active' | 'draft' | 'archived',
        option_values: v.option_values || {},
      }));

      setImagePreview(resolveMediaUrl(fullProd.media_key || fullProd.image_url || ''));
      setForm({
        name: fullProd.name || '',
        description: fullProd.description || '',
        cost_price: fullProd.cost_price ? String(fullProd.cost_price) : '',
        price: String(fullProd.price ?? ''),
        sale_price: fullProd.sale_price ? String(fullProd.sale_price) : '',
        category: fullProd.category || '',
        stock_quantity: String(fullProd.stock_quantity ?? fullProd.stock ?? 0),
        image_url: fullProd.image_url || '',
        media_key: fullProd.media_key || '',
        is_active: fullProd.is_active !== false,
        status: (fullProd.status || (fullProd.is_active ? 'active' : 'draft')) as 'active' | 'draft' | 'archived',
        sku: fullProd.sku || '',
        barcode: fullProd.barcode || '',
        options: opts,
        variants: vars,
      });
    } catch (err) {
      console.warn('Failed to load full product details, falling back:', err);
      setForm({
        name: p.name,
        description: p.description || '',
        cost_price: p.cost_price ? String(p.cost_price) : '',
        price: String(p.price),
        sale_price: p.sale_price ? String(p.sale_price) : '',
        category: p.category,
        stock_quantity: String(p.stock_quantity),
        image_url: p.image_url || '',
        media_key: p.media_key || '',
        is_active: p.is_active,
        status: (p.status || (p.is_active ? 'active' : 'draft')) as 'active' | 'draft' | 'archived',
        sku: p.sku || '',
        barcode: p.barcode || '',
        options: [],
        variants: [],
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Option handlers
  const handleAddOption = () => {
    setForm(f => ({
      ...f,
      options: [...f.options, { name: '', valuesStr: '' }]
    }));
  };

  const handleRemoveOption = (index: number) => {
    setForm(f => ({
      ...f,
      options: f.options.filter((_, i) => i !== index)
    }));
  };

  const handleOptionChange = (index: number, field: 'name' | 'valuesStr', val: string) => {
    setForm(f => {
      const next = [...f.options];
      next[index] = { ...next[index], [field]: val };
      return { ...f, options: next };
    });
  };

  // Generate Cartesian matrix of variants from options
  const handleGenerateVariants = () => {
    const activeOpts = form.options
      .map(o => ({
        name: o.name.trim(),
        values: o.valuesStr.split(',').map(s => s.trim()).filter(Boolean)
      }))
      .filter(o => o.name && o.values.length > 0);

    if (activeOpts.length === 0) {
      toast.error('Add at least one option with values (e.g. Size: S, M, L) before generating variants.');
      return;
    }

    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce((acc, curr) => {
        return acc.flatMap(a => curr.map(c => [...a, c]));
      }, [[]] as string[][]);
    };

    const optValues = activeOpts.map(o => o.values);
    const combinations = cartesian(optValues);

    const baseSku = form.sku ? form.sku.trim().toUpperCase() : '';

    const newVariants = combinations.map(combo => {
      const optionMap: Record<string, string> = {};
      combo.forEach((val, idx) => {
        optionMap[activeOpts[idx].name] = val;
      });
      const title = combo.join(' / ');

      // Keep existing variant details if already present
      const existing = form.variants.find(v => v.title === title);
      if (existing) {
        return {
          ...existing,
          option_values: optionMap
        };
      }

      const comboSku = combo.map(c => c.replace(/\s+/g, '').toUpperCase()).join('-');
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

    setForm(f => ({ ...f, variants: newVariants }));
    toast.success(`Generated ${newVariants.length} variants!`);
  };

  const handleAddCustomVariant = () => {
    setForm(f => ({
      ...f,
      variants: [
        ...f.variants,
        {
          title: `Custom Variant ${f.variants.length + 1}`,
          price: f.price || '',
          compare_at_price: f.sale_price || '',
          cost_price: f.cost_price || '',
          sku: form.sku ? `${form.sku}-V${f.variants.length + 1}` : '',
          barcode: '',
          status: 'active' as const,
          option_values: {},
        }
      ]
    }));
  };

  const handleRemoveVariant = (index: number) => {
    setForm(f => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index)
    }));
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    setForm(f => {
      const next = [...f.variants];
      next[index] = { ...next[index], [field]: value };
      return { ...f, variants: next };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    // Show instant preview using blob URL (local only, never persisted)
    const blobUrl = URL.createObjectURL(file);
    setImagePreview(blobUrl);

    // Upload to B2 via /api/media/upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // If editing an existing product, attach the product ID for canonical key
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

      // Store the canonical media key (NOT a URL, NOT base64)
      setForm(f => ({ ...f, media_key: mediaKey, image_url: '' }));
      // Update preview to CDN URL for display
      setImagePreview(resolveMediaUrl(mediaKey));
      toast.success('Image uploaded!');
    } catch (err: any) {
      console.error('Media upload failed:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to upload image';
      toast.error(msg);
      // Revert preview on failure
      setImagePreview(form.media_key ? resolveMediaUrl(form.media_key) : (form.image_url || ''));
    } finally {
      setUploading(false);
      // Revoke the blob URL to free memory
      URL.revokeObjectURL(blobUrl);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    if (!form.price || isNaN(Number(form.price))) { toast.error('Valid price is required'); return; }

    setSaving(true);
    try {
      const parsedOptions = form.options
        .map((o, idx) => ({
          id: o.id,
          name: o.name.trim(),
          position: idx,
          values: o.valuesStr.split(',').map(s => s.trim()).filter(Boolean)
        }))
        .filter(o => o.name && o.values.length > 0);

      const parsedVariants = form.variants.map(v => ({
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
        category: form.category,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        is_active: form.status === 'active',
        status: form.status,
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        options: parsedOptions,
        variants: parsedVariants,
      };

      // If we have a media_key from B2 upload, send that (canonical storage).
      // Also set image_url to CDN URL for backward compatibility with list views.
      // If no media_key, fall back to legacy image_url (existing products).
      if (form.media_key) {
        payload.media_key = form.media_key;
        payload.image_url = resolveMediaUrl(form.media_key);
      } else if (form.image_url) {
        payload.image_url = form.image_url;
      }

      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, payload);
        toast.success('Product updated!');
      } else {
        await api.post('/products', payload);
        toast.success('Product added!');
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowModal(false);
    } catch (error: any) {
      console.error('Save error:', error);
      const msg = error.response?.data?.error || error.message || 'Failed to save product';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{translate('products')}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {products.length} products
            {productLimit !== Infinity && ` · ${Math.max(0, productLimit - products.length)} of ${productLimit} remaining on your plan`}
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportingCsv || products.length === 0}
            className="btn btn-secondary flex-1 sm:flex-none inline-flex items-center justify-center gap-2 cursor-pointer"
            title="Download full catalog CSV (Data Sovereignty Guarantee)"
          >
            <Download size={16} />
            <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="btn btn-primary flex-1 sm:flex-none inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} /> {translate('addProduct')}
          </button>
        </div>
      </div>

      {/* Celebratory Milestone Banner on reaching product limit (Gain-Framed) */}
      {atLimit && (
        <div className="mb-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
              🎉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 m-0">
                  Congratulations on listing {productLimit} products!
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Milestone
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium m-0 mt-1">
                Your shop is expanding rapidly. Your existing {productLimit} products remain <strong>completely free forever</strong>. Upgrade to Business whenever you are ready to list up to 500 products and connect your custom domain.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowGrowthModal(true)}
            className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            View Growth Options
          </button>
        </div>
      )}
      {nearLimit && !atLimit && (
        <div style={{ marginBottom: 20 }}>
          <UpgradePrompt
            variant="inline"
            reason={`Getting close — ${Math.max(0, productLimit - products.length)} product slots left.`}
            benefit="Upgrade to Growth for up to 500 products, advanced analytics, and more."
            currentPlan={user?.plan}
          />
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'active', 'draft', 'archived'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
              statusFilter === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input w-full pl-9"
            placeholder={translate('products.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative sm:w-52">
          <select
            className="input w-full pr-8 cursor-pointer"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <Shimmer key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '32px 16px' }}>
          {products.length === 0 ? (
            <ActionableEmptyState
              icon={<Package size={28} />}
              title="Your store needs products"
              description="Add your first product with a name, price, and photo so customers can browse and place orders."
              actionLabel="Add Your First Product"
              onAction={openAdd}
              expectedOutcome="Products appear instantly in your store catalog."
            />
          ) : (
            <ActionableEmptyState
              icon={<Package size={28} />}
              title="No products found"
              description={search ? `No products match "${search}". Try another search term or clear filters.` : 'No products found in this category.'}
              actionLabel="Clear Filters"
              onAction={() => { setSearch(''); setCategory(''); }}
              expectedOutcome="Reset search and category filters to view all catalog products."
            />
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {filtered.map(product => (
            <div key={product.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
              {/* Image */}
              <div style={{
                height: '160px', background: (product.media_key || product.image_url) ? 'none' : 'linear-gradient(135deg,#f5f5f5,#e8e8e8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                {(product.media_key || product.image_url) ? (
                  <img src={resolveMediaUrl(product.media_key || product.image_url)} alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Package size={48} color="#ccc" />
                )}
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {product.status === 'draft' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500 text-white shadow-sm">
                      Draft
                    </span>
                  ) : (product.status === 'archived' || !product.is_active) ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-600 text-white shadow-sm">
                      Archived
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-600 text-white shadow-sm">
                      Active
                    </span>
                  )}
                </div>
                {product.sale_price && product.sale_price < product.price && (
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: '#EF4444', color: '#fff',
                    padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  }}>
                    {Math.round((1 - product.sale_price / product.price) * 100)}% OFF
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
                    {product.category}
                  </span>
                  {((product.variants && product.variants.length > 0) || product.has_variants) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Layers size={10} />
                      {product.variants?.length ? `${product.variants.length} Variants` : 'Variants'}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', marginBottom: '4px', lineHeight: 1.3 }}>
                  {product.name}
                </div>
                {product.sku && (
                  <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1">
                    <Tag size={10} />
                    <span>{product.sku}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
                    ₹{(product.sale_price || product.price).toLocaleString('en-IN')}
                  </span>
                  {product.sale_price && product.sale_price < product.price && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 600,
                    color: product.stock_quantity <= 5 ? '#EF4444' : product.stock_quantity <= 20 ? '#F59E0B' : '#10B981',
                  }}>
                    {product.stock_quantity <= 0 ? 'Out of stock' : `${product.stock_quantity} in stock`}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openEdit(product)}
                      style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: '6px', padding: '6px', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(product.id)}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '6px', padding: '6px', cursor: 'pointer',
                        color: '#EF4444', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px', width: '100%', maxWidth: '560px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '24px' }}>
              {/* Image Upload */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                  Product Image
                </label>
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  style={{
                    height: '140px', border: '2px dashed var(--border)', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: uploading ? 'wait' : 'pointer', overflow: 'hidden', position: 'relative',
                    background: imagePreview ? 'none' : 'var(--bg)',
                    opacity: uploading ? 0.7 : 1,
                  }}
                >
                  {uploading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ width: '28px', height: '28px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '13px' }}>Uploading to cloud...</p>
                    </div>
                  ) : imagePreview ? (
                    <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Upload size={28} style={{ marginBottom: '8px' }} />
                      <p style={{ fontSize: '13px' }}>Click to upload image (max 5MB)</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} disabled={uploading} />
              </div>

              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Product Name *</label>
                <input className="input" style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="e.g. Aashirvaad Atta 5kg"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Description</label>
                <textarea className="input" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '80px' }}
                  placeholder="Describe your product..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Cost Price + Selling Price + MRP (Responsive 3-Column Inputs) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Cost Price (₹)</label>
                  <input className="input" type="number" style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="0.00" min="0" step="0.01"
                    value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Only visible to you</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Selling Price (₹) *</label>
                  <input className="input" type="number" style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="0.00" min="0" step="0.01"
                    value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>MRP (₹)</label>
                  <input className="input" type="number" style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Optional" min="0" step="0.01"
                    value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
                </div>
              </div>

              {form.cost_price && form.price && parseFloat(form.cost_price) > 0 && (
                <div style={{
                  padding: '12px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)', marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Profit Margin</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E' }}>
                    {((((parseFloat(form.price) - parseFloat(form.cost_price)) / parseFloat(form.cost_price)) * 100) || 0).toFixed(2)}%
                  </div>
                </div>
              )}

              {/* Category + Stock (Responsive 2-Column Inputs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Category</label>
                  <select className="input" style={{ width: '100%', boxSizing: 'border-box' }}
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Stock Quantity</label>
                  <input className="input" type="number" style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="0" min="0"
                    value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
                </div>
              </div>

              {/* SKU + Barcode (Responsive 2-Column Inputs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                    SKU (Shop Unique)
                  </label>
                  <input
                    className="input font-mono uppercase"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="e.g. TSHIRT-BLK"
                    value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                    Barcode / UPC / EAN
                  </label>
                  <input
                    className="input font-mono"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="e.g. 8901234567890"
                    value={form.barcode}
                    onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                  Product Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['active', 'draft', 'archived'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, status: st, is_active: st === 'active' }))}
                      className={`py-2 px-3 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                        form.status === st
                          ? (st === 'active' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' :
                             st === 'draft' ? 'bg-amber-50 border-amber-500 text-amber-800' :
                             'bg-slate-100 border-slate-400 text-slate-800')
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options & Variants Section */}
              <div className="border-t border-slate-200 pt-5 mt-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 m-0">
                      <Layers size={16} className="text-indigo-600" />
                      Product Options & Variants
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">Configure sizes, colors, and variant pricing</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="btn btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Add Option
                  </button>
                </div>

                {loadingDetails && (
                  <div className="text-center py-4 text-xs text-slate-500 font-medium animate-pulse">
                    Loading options and variants...
                  </div>
                )}

                {/* Options list */}
                {form.options.length > 0 && (
                  <div className="space-y-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-xs font-semibold text-slate-700">Option Specifications</div>
                    {form.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          className="input text-xs py-1.5 w-1/3"
                          placeholder="e.g. Size"
                          value={opt.name}
                          onChange={e => handleOptionChange(idx, 'name', e.target.value)}
                        />
                        <input
                          className="input text-xs py-1.5 flex-1"
                          placeholder="e.g. S, M, L, XL (comma separated)"
                          value={opt.valuesStr}
                          onChange={e => handleOptionChange(idx, 'valuesStr', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                          title="Remove Option"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleGenerateVariants}
                      className="w-full mt-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles size={14} />
                      Generate Variants Matrix ({form.options.filter(o => o.name && o.valuesStr).length} Options)
                    </button>
                  </div>
                )}

                {/* Variants Matrix */}
                {form.variants.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Variants ({form.variants.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddCustomVariant}
                        className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} /> Add Custom
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {form.variants.map((v, vIdx) => (
                        <div key={vIdx} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              className="input text-xs font-semibold py-1 flex-1"
                              value={v.title}
                              placeholder="Variant Title"
                              onChange={e => handleVariantChange(vIdx, 'title', e.target.value)}
                            />
                            <select
                              className="input text-xs py-1 w-24 cursor-pointer"
                              value={v.status}
                              onChange={e => handleVariantChange(vIdx, 'status', e.target.value)}
                            >
                              <option value="active">Active</option>
                              <option value="draft">Draft</option>
                              <option value="archived">Archived</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(vIdx)}
                              className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                              title="Remove Variant"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Price (₹) *</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="input text-xs py-1 w-full"
                                placeholder="Price"
                                value={v.price}
                                onChange={e => handleVariantChange(vIdx, 'price', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">SKU</label>
                              <input
                                className="input text-xs py-1 w-full font-mono uppercase"
                                placeholder="SKU"
                                value={v.sku}
                                onChange={e => handleVariantChange(vIdx, 'sku', e.target.value.toUpperCase())}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Barcode</label>
                              <input
                                className="input text-xs py-1 w-full font-mono"
                                placeholder="Barcode"
                                value={v.barcode}
                                onChange={e => handleVariantChange(vIdx, 'barcode', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  {translate('cancel')}
                </button>
                <button type="submit" disabled={saving || uploading} className="btn btn-primary"
                  style={{ opacity: (saving || uploading) ? 0.7 : 1, minWidth: '100px' }}>
                  {uploading ? 'Uploading...' : saving ? 'Saving...' : translate('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px', padding: '32px',
            maxWidth: '400px', width: '100%', textAlign: 'center',
          }}>
            <Trash2 size={40} color="#EF4444" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>Delete Product?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              This action cannot be undone. The product will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                style={{
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: '#EF4444', color: '#fff', fontWeight: 600, cursor: 'pointer',
                  opacity: deleteMutation.isPending ? 0.7 : 1,
                }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebratory Growth Limit Modal (Gain-Framed Milestone) */}
      {showGrowthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/20 mb-3">
                🎉
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider mb-2">
                <Sparkles size={12} /> Milestone Achieved
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Congratulations on listing {productLimit} products!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 max-w-md mx-auto">
                Your store catalog is expanding fast. You have reached the maximum listing limit for the Free tier.
              </p>
            </div>

            {/* Reassurance Card (Loss Aversion Elimination) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Zero Extortion Guarantee</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed m-0">
                Your existing {productLimit} products will <strong>remain active, searchable, and 100% free forever</strong>. We will never hide your products, freeze customer orders, or hold your catalog hostage.
              </p>
            </div>

            {/* Growth Benefits */}
            <div className="space-y-2.5 mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 m-0">
                What you unlock on the Business Plan:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Up to 500 products</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Custom domain connection</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>FeraSetu AI Studio Cleaner</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>0% commission cuts</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowGrowthModal(false)}
                className="btn btn-secondary flex-1 text-xs py-2.5 cursor-pointer"
              >
                Keep My {productLimit} Free Products
              </button>
              <Link
                to="/upgrade"
                className="btn btn-primary flex-1 text-xs py-2.5 inline-flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Upgrade to Business</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

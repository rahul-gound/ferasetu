import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Upload,
  Package,
  AlertTriangle,
  ChevronDown,
  Download,
  Sparkles,
  Check,
  ArrowRight,
  ShieldCheck,
  Layers,
  Tag,
  Gift,
  Truck,
  LayoutGrid,
  List,
  Copy,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UpgradePrompt from '../components/ui/UpgradePrompt';
import ActionableEmptyState from '../components/ui/ActionableEmptyState';
import ImportInventoryModal from '../components/products/ImportInventoryModal';
import AddProductModal, { ProductItem } from '../components/products/AddProductModal';
import { getPlanLimits, hasReachedProductLimit } from '../config/plans';
import { resolveMediaUrl } from '../utils/media';
import posthog from '../lib/posthog';

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

export default function ProductsPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const planLimits = getPlanLimits(user?.plan);
  const productLimit = planLimits.products; // Infinity for pro

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(searchParams.get('import') === 'true');
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
    }
    if (searchParams.get('import') === 'true') {
      setShowImportModal(true);
    }
  }, [searchParams]);

  const { data: products = [], isLoading, refetch } = useQuery<ProductItem[]>({
    queryKey: ['products', statusFilter],
    queryFn: async () => {
      const res = await api.get('/products', {
        params: statusFilter !== 'all' ? { status: statusFilter } : undefined,
      });
      return res.data.products || res.data || [];
    },
  });

  // Calculate live statistics
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.status === 'active' || (p.is_active && !p.status)).length;
    const draft = products.filter((p) => p.status === 'draft').length;
    const archived = products.filter((p) => p.status === 'archived' || p.is_active === false).length;
    const lowStock = products.filter((p) => (p.stock_quantity ?? 0) <= 5 && (p.stock_quantity ?? 0) > 0).length;
    const outOfStock = products.filter((p) => (p.stock_quantity ?? 0) <= 0).length;

    const totalValue = products.reduce((acc, p) => {
      const price = p.price || 0;
      const stock = p.stock_quantity || 0;
      return acc + price * stock;
    }, 0);

    return { total, active, draft, archived, lowStock, outOfStock, totalValue };
  }, [products]);

  const handleExportCsv = () => {
    if (products.length === 0) {
      toast.error('No products in catalog to export.');
      return;
    }
    setExportingCsv(true);
    try {
      const headers = [
        'ID',
        'Product Name',
        'Category',
        'Price',
        'Sale Price',
        'Cost Price',
        'Stock Quantity',
        'Status',
        'SKU',
        'Barcode',
        'Variants Count',
        'Image URL',
        'Created At',
      ];
      const rows = products.map((p) => [
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
        `"${p.created_at || ''}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `FeraSetu_Products_Catalog_${new Date().toISOString().slice(0, 10)}.csv`
      );
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

  // Mark setup-checklist flag when the user adds at least one product
  useEffect(() => {
    if (products.length > 0) {
      try {
        const flags = JSON.parse(localStorage.getItem('fera_setup_flags') || '{}');
        if (!flags.first_product) {
          flags.first_product = true;
          localStorage.setItem('fera_setup_flags', JSON.stringify(flags));
        }
      } catch {
        /* ignore */
      }
    }
  }, [products.length]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted from catalog');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
      const matchCat = !category || p.category === category;
      return matchSearch && matchCat;
    });
  }, [products, search, category]);

  const atLimit = hasReachedProductLimit(user?.plan, products.length);
  const nearLimit =
    !atLimit && productLimit !== Infinity && products.length >= Math.floor(productLimit * 0.8);

  const openAdd = () => {
    if (atLimit) {
      setShowGrowthModal(true);
      return;
    }
    setEditProduct(null);
    setShowAddModal(true);
  };

  const openEdit = (p: ProductItem) => {
    setEditProduct(p);
    setShowAddModal(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* 🌟 VIBRANT ALIVE HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 p-6 sm:p-8 text-white shadow-xl border border-orange-500/20">
        {/* Ambient warm orange background aura */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <span className="w-2 h-2 rounded-full bg-orange-400 alive-dot-orange" />
                Live Catalog
              </span>
              <span className="text-xs text-slate-400 font-medium">
                0% Marketplace Commission
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              {translate('products')}
            </h1>

            <p className="text-sm text-slate-300 max-w-xl font-normal leading-relaxed m-0">
              Manage your products, live pricing, stock alerts, and multi-option variants with zero tech friction.
              {productLimit !== Infinity && (
                <span className="font-semibold text-orange-200">
                  {' '}
                  ({Math.max(0, productLimit - products.length)} of {productLimit} slots remaining on your plan)
                </span>
              )}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exportingCsv || products.length === 0}
              className="h-12 min-h-[48px] px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-xs border border-white/15 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-50"
              title="Download full catalog CSV (Data Sovereignty Guarantee)"
            >
              <Download size={16} />
              <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="h-12 min-h-[48px] px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-xs border border-white/15 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              title="Import inventory CSV from Shopify, WooCommerce, Excel, or standard CSV"
            >
              <Upload size={16} />
              <span>Import CSV</span>
            </button>

            <Link
              to="/transfers/new"
              className="h-12 min-h-[48px] px-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 font-bold text-xs border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-all shadow-xs"
              title="Create an Inventory Transfer"
            >
              <Truck size={16} className="text-indigo-300" />
              <span>Transfers</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[9px] font-black uppercase">
                BETA
              </span>
            </Link>

            <Link
              to="/gift-cards/new"
              className="h-12 min-h-[48px] px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all shadow-xs"
              title="Create a Digital Gift Card product"
            >
              <Gift size={16} className="text-amber-300" />
              <span>Gift Card</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-900 text-[9px] font-black uppercase">
                BETA
              </span>
            </Link>

            {/* PRIMARY CTA: VIBRANT WARM ORANGE BUTTON */}
            <button
              type="button"
              onClick={openAdd}
              className="h-12 min-h-[48px] px-6 rounded-xl btn-orange-alive font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>{translate('addProduct')}</span>
            </button>
          </div>
        </div>

        {/* 📊 LIVE METRICS / STATS RIBBON */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Total Products
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{stats.total}</span>
              {productLimit !== Infinity && (
                <span className="text-xs font-semibold text-slate-400">
                  / {productLimit}
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 alive-dot-emerald" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                Active in Store
              </span>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-black text-emerald-300">{stats.active}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                Drafts
              </span>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-black text-amber-300">{stats.draft}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={12} className={stats.lowStock > 0 ? 'text-rose-400' : 'text-slate-400'} />
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  stats.lowStock > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                Low Stock Alert
              </span>
            </div>
            <div className="mt-1">
              <span
                className={`text-2xl font-black ${
                  stats.lowStock > 0 ? 'text-rose-300 font-black' : 'text-slate-400'
                }`}
              >
                {stats.lowStock}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur border border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Catalog Value
            </span>
            <div className="mt-1">
              <span className="text-2xl font-black text-orange-300">
                ₹{stats.totalValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Celebratory Milestone Banner on reaching product limit (Gain-Framed) */}
      {atLimit && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-orange-50 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
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
                Your shop is expanding rapidly. Your existing {productLimit} products remain{' '}
                <strong>completely free forever</strong>. Upgrade to Business whenever you are ready
                to list up to 500 products and connect your custom domain.
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
        <div>
          <UpgradePrompt
            variant="inline"
            reason={`Getting close — ${Math.max(0, productLimit - products.length)} product slots left.`}
            benefit="Upgrade to Growth for up to 500 products, advanced analytics, and more."
            currentPlan={user?.plan}
          />
        </div>
      )}

      {/* 🔍 FILTER & TOOLBAR BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'active', 'draft', 'archived'] as const).map((tab) => {
            const count =
              tab === 'all'
                ? stats.total
                : tab === 'active'
                : stats.active
                : tab === 'draft'
                ? stats.draft
                : stats.archived;

            const isSelected = statusFilter === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full h-11 min-h-[44px] pl-10 pr-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-3 focus:ring-orange-500/15 transition-all"
              placeholder="Search products by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-48 shrink-0">
            <select
              className="w-full h-11 min-h-[44px] pl-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-3 focus:ring-orange-500/15 transition-all cursor-pointer appearance-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
            />
          </div>

          {/* View Mode Switcher: Grid vs Table */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Inventory Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 📦 PRODUCTS LIST / GRID CONTENT */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white"
            >
              <div className="w-full h-44 rounded-xl alive-orange-shimmer" />
              <div className="h-4 w-3/4 rounded-md alive-orange-shimmer" />
              <div className="h-3 w-1/2 rounded-md alive-orange-shimmer" />
              <div className="h-6 w-1/3 rounded-md alive-orange-shimmer" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          {products.length === 0 ? (
            <ActionableEmptyState
              icon={<Package size={32} className="text-orange-600" />}
              title="Your store catalog is waiting for products"
              description="Add your first item manually in seconds or import your full catalog from Shopify, WooCommerce, or CSV with 0% marketplace cuts."
              actionLabel="Add Your First Product"
              onAction={openAdd}
              secondaryActionLabel="Import Catalog CSV"
              onSecondaryAction={() => setShowImportModal(true)}
              expectedOutcome="Your products appear immediately in your live storefront catalog."
            />
          ) : (
            <ActionableEmptyState
              icon={<Search size={32} className="text-orange-600" />}
              title="No products match your filters"
              description={
                search
                  ? `No products found matching "${search}". Try adjusting your keywords or clearing the category filter.`
                  : 'No products in this specific category.'
              }
              actionLabel="Clear All Filters"
              onAction={() => {
                setSearch('');
                setCategory('');
                setStatusFilter('all');
              }}
              expectedOutcome="Reset search and filters to view your entire catalog."
            />
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((product) => {
            const hasDiscount = product.sale_price && product.sale_price < product.price;
            const discountPct = hasDiscount
              ? Math.round((1 - (product.sale_price || 0) / product.price) * 100)
              : null;
            const isOutOfStock = product.stock_quantity <= 0;
            const isLowStock = !isOutOfStock && product.stock_quantity <= 5;

            return (
              <div
                key={product.id}
                className="group relative rounded-2xl bg-white border border-slate-200/80 shadow-xs alive-card-hover overflow-hidden flex flex-col"
              >
                {/* Image Section */}
                <div className="relative h-48 bg-slate-100 overflow-hidden flex items-center justify-center">
                  {product.media_key || product.image_url ? (
                    <img
                      src={resolveMediaUrl(product.media_key || product.image_url)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <Package size={48} strokeWidth={1.5} />
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                        No Photo
                      </span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {product.status === 'draft' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                        Draft
                      </span>
                    ) : product.status === 'archived' || !product.is_active ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-600 text-white shadow-xs">
                        Archived
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>

                  {/* Discount Tag */}
                  {discountPct && (
                    <div className="absolute top-3 left-3 bg-rose-600 text-white px-2 py-0.5 rounded-lg text-[11px] font-black shadow-xs">
                      {discountPct}% OFF
                    </div>
                  )}

                  {/* Stock Pill at bottom of image */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md shadow-xs ${
                        isOutOfStock
                          ? 'bg-rose-500/90 text-white'
                          : isLowStock
                          ? 'bg-amber-500/90 text-white'
                          : 'bg-slate-900/75 text-white'
                      }`}
                    >
                      {isOutOfStock
                        ? 'Out of Stock'
                        : isLowStock
                        ? `Only ${product.stock_quantity} left`
                        : `${product.stock_quantity} in stock`}
                    </span>

                    {((product.variants && product.variants.length > 0) || product.has_variants) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-900/80 text-white backdrop-blur-md">
                        <Layers size={10} />
                        {product.variants?.length ? `${product.variants.length} Variants` : 'Variants'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
                      {product.category || 'General'}
                    </span>

                    <h3
                      className="text-base font-bold text-slate-900 line-clamp-1 mt-0.5 m-0"
                      title={product.name}
                    >
                      {product.name}
                    </h3>

                    {product.sku && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-slate-400">
                        <Tag size={11} />
                        <span>{product.sku}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(product.sku!, 'SKU')}
                          className="hover:text-slate-600 cursor-pointer ml-0.5"
                          title="Copy SKU"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Price & Margins */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-slate-900">
                        ₹{(product.sale_price || product.price).toLocaleString('en-IN')}
                      </span>
                      {product.sale_price && product.sale_price < product.price && (
                        <span className="text-xs font-semibold text-slate-400 line-through">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {product.cost_price && product.cost_price > 0 && (
                      <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                        +{(((product.price - product.cost_price) / product.cost_price) * 100).toFixed(0)}% profit margin
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions Toolbar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="flex-1 h-9 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-orange-200/60"
                    >
                      <Edit2 size={13} />
                      <span>Edit Item</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteId(product.id)}
                      className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors"
                      title="Delete product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">SKU / Barcode</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock Level</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Product & Photo */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {product.media_key || product.image_url ? (
                            <img
                              src={resolveMediaUrl(product.media_key || product.image_url)}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={20} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 m-0">{product.name}</p>
                          {product.variants && product.variants.length > 0 && (
                            <span className="text-[11px] font-semibold text-indigo-600">
                              {product.variants.length} Variants
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200/60">
                        {product.category || 'General'}
                      </span>
                    </td>

                    {/* SKU / Barcode */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-slate-700">
                        {product.sku || '—'}
                      </div>
                      {product.barcode && (
                        <div className="font-mono text-[10px] text-slate-400">
                          {product.barcode}
                        </div>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 text-base">
                        ₹{(product.sale_price || product.price).toLocaleString('en-IN')}
                      </div>
                      {product.sale_price && product.sale_price < product.price && (
                        <div className="text-xs text-slate-400 line-through">
                          ₹{product.price.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* Stock Level */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold ${
                            product.stock_quantity <= 0
                              ? 'text-rose-600'
                              : product.stock_quantity <= 5
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {product.stock_quantity <= 0
                            ? 'Out of Stock'
                            : `${product.stock_quantity} units`}
                        </span>
                      </div>
                      {/* Mini visual stock bar */}
                      <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            product.stock_quantity <= 0
                              ? 'bg-rose-500'
                              : product.stock_quantity <= 5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(5, product.stock_quantity * 4))}%`,
                          }}
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {product.status === 'draft' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                          Draft
                        </span>
                      ) : product.status === 'archived' || !product.is_active ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          Archived
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 cursor-pointer transition-colors"
                          title="Edit product"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(product.id)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                          title="Delete product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🚀 MODAL: ADD / EDIT PRODUCT */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        editProduct={editProduct}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }}
      />

      {/* ⚠️ MODAL: DELETE CONFIRMATION */}
      {deleteId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 animate-scale-in text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 size={26} strokeWidth={2} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 m-0">
                Delete this product?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 m-0 leading-relaxed">
                This item will be permanently removed from your catalog. It will no longer appear on your storefront or customer orders.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Keep Product
              </button>

              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 cursor-pointer transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 CELEBRATORY GROWTH LIMIT MODAL */}
      {showGrowthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 animate-scale-in">
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
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Zero Extortion Guarantee</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed m-0">
                Your existing {productLimit} products will{' '}
                <strong>remain active, searchable, and 100% free forever</strong>. We will never hide
                your products, freeze customer orders, or hold your catalog hostage.
              </p>
            </div>

            {/* Growth Benefits */}
            <div className="space-y-2.5 mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 m-0">
                What you unlock on the Business Plan:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Up to 500 products</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Custom domain connection</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>FeraSetu AI Studio Cleaner</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
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
                className="h-12 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex-1 cursor-pointer transition-colors"
              >
                Keep My {productLimit} Free Products
              </button>
              <Link
                to="/upgrade"
                className="h-12 min-h-[48px] rounded-xl btn-orange-alive font-extrabold text-xs flex-1 inline-flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Upgrade to Business</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 📥 IMPORT INVENTORY CSV MODAL */}
      <ImportInventoryModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }}
        currentProductCount={products.length}
      />
    </div>
  );
}

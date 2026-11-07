import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Download,
  Upload,
  Package,
  Globe,
  Store,
  AlertTriangle,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  X,
  Layers,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UpgradePrompt from '../components/ui/UpgradePrompt';
import ImportInventoryModal from '../components/products/ImportInventoryModal';
import AddProductModal, { type ProductItem } from '../components/products/AddProductModal';
import { getPlanLimits, hasReachedProductLimit } from '../config/plans';
import { resolveMediaUrl } from '../utils/media';

const DEFAULT_CATEGORIES = [
  'Groceries & Staples',
  'Dairy & Oils',
  'Snacks & Packaged Foods',
  'Household & Personal Care',
  'Beverages',
  'Bakery & Fresh',
];

export default function ProductsPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const planLimits = getPlanLimits(user?.plan);
  const productLimit = planLimits.products;

  // Filter & Search states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'low' | 'out'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Menu Dropdown states
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showStockMenu, setShowStockMenu] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  // Selection & Bulk Actions
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(searchParams.get('import') === 'true');
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowStatusMenu(false);
      setShowStockMenu(false);
      setOpenRowMenuId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
    }
    if (searchParams.get('import') === 'true') {
      setShowImportModal(true);
    }
  }, [searchParams]);

  // Fetch products
  const { data: products = [], isLoading } = useQuery<ProductItem[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data.products || res.data || [];
    },
  });

  // Calculate live statistics for the 4-stat ribbon
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(
      (p) => p.status === 'active' || (p.is_active !== false && !p.status)
    ).length;
    const draft = products.filter((p) => p.status === 'draft').length;
    const archived = products.filter(
      (p) => p.status === 'archived' || p.is_active === false
    ).length;
    const lowStock = products.filter(
      (p) => (p.stock_quantity ?? 0) <= 5 && (p.stock_quantity ?? 0) > 0
    ).length;
    const outOfStock = products.filter((p) => (p.stock_quantity ?? 0) <= 0).length;

    const visiblePct = total > 0 ? ((active / total) * 100).toFixed(1) : '0';

    return { total, active, draft, archived, lowStock, outOfStock, visiblePct };
  }, [products]);

  // Category pills with counts
  const categoryPills = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const c = (p.category || 'General').trim();
      counts[c] = (counts[c] || 0) + 1;
    });

    // Merge in defaults if none exist
    DEFAULT_CATEGORIES.forEach((c) => {
      if (!counts[c]) {
        counts[c] = 0;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // Filtered Products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

      const matchCategory =
        !category || (p.category || 'General').toLowerCase() === category.toLowerCase();

      const isActive = p.status === 'active' || (p.is_active !== false && !p.status);
      const isDraft = p.status === 'draft';
      const isArchived = p.status === 'archived' || p.is_active === false;

      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = isActive;
      else if (statusFilter === 'draft') matchStatus = isDraft;
      else if (statusFilter === 'archived') matchStatus = isArchived;

      const stock = p.stock_quantity ?? 0;
      let matchStock = true;
      if (stockFilter === 'in') matchStock = stock > 5;
      else if (stockFilter === 'low') matchStock = stock > 0 && stock <= 5;
      else if (stockFilter === 'out') matchStock = stock <= 0;

      return matchSearch && matchCategory && matchStatus && matchStock;
    });
  }, [products, search, category, statusFilter, stockFilter]);

  // Paginated Slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(filtered.map((p) => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkToggleVisibility = async () => {
    if (selectedProductIds.length === 0) return;
    try {
      await Promise.all(
        selectedProductIds.map((id) => {
          const prod = products.find((p) => p.id === id);
          const nextActive = prod ? !(prod.is_active !== false && prod.status !== 'draft') : true;
          return api.put(`/products/${id}`, {
            is_active: nextActive ? 1 : 0,
            status: nextActive ? 'active' : 'draft',
          });
        })
      );
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Updated visibility for ${selectedProductIds.length} products`);
      setSelectedProductIds([]);
    } catch {
      toast.error('Failed to update product visibility');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProductIds.length} products?`))
      return;
    try {
      await Promise.all(selectedProductIds.map((id) => api.delete(`/products/${id}`)));
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Deleted ${selectedProductIds.length} products`);
      setSelectedProductIds([]);
    } catch {
      toast.error('Failed to delete selected products');
    }
  };

  // Toggle Storefront visibility switch
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, newActive }: { id: string; newActive: boolean }) => {
      return api.put(`/products/${id}`, {
        is_active: newActive ? 1 : 0,
        status: newActive ? 'active' : 'draft',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Storefront visibility updated');
    },
    onError: () => toast.error('Failed to update product visibility'),
  });

  const handleToggleProductStatus = (p: ProductItem) => {
    const isCurrentlyActive = p.status === 'active' || (p.is_active !== false && !p.status);
    toggleVisibilityMutation.mutate({ id: p.id, newActive: !isCurrentlyActive });
  };

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product removed from SKU Register');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete product'),
  });

  // Export CSV
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
        'Stock Quantity',
        'Status',
        'SKU',
        'Barcode',
      ];
      const rows = products.map((p) => [
        `"${p.id}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.category || 'General').replace(/"/g, '""')}"`,
        p.price ?? '',
        p.sale_price ?? '',
        p.stock_quantity ?? 0,
        p.status || (p.is_active ? 'active' : 'archived'),
        `"${(p.sku || '').replace(/"/g, '""')}"`,
        `"${(p.barcode || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `FeraSetu_SKU_Register_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV exported successfully');
    } catch {
      toast.error('Failed to export catalog');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setStatusFilter('all');
    setStockFilter('all');
    setPage(1);
  };

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
    <div className="flex flex-col w-full gap-6 pb-12 font-sans bg-[#f9f9ff] text-[#121c2b] min-h-full">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#121c2b] tracking-tight m-0">
              {translate('products')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg bg-[#dee8fe] text-[#434656] text-xs font-semibold">
              SKU Register
            </span>
          </div>
          <p className="text-sm text-[#585e6f] mt-1 font-normal m-0">
            Manage your inventory, pricing, variants, and storefront visibility
            {productLimit !== Infinity && (
              <span className="text-[#737688]">
                {' '}
                • {products.length} of {productLimit} slots used
              </span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white hover:bg-[#e7eeff] text-[#121c2b] font-medium text-sm transition-colors shadow-xs border border-[#c3c5d9]/30 cursor-pointer"
          >
            <Download size={18} className="text-[#585e6f]" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportingCsv || products.length === 0}
            className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white hover:bg-[#e7eeff] text-[#121c2b] font-medium text-sm transition-colors shadow-xs border border-[#c3c5d9]/30 cursor-pointer disabled:opacity-50"
          >
            <Upload size={18} className="text-[#585e6f]" />
            <span>{exportingCsv ? 'Exporting...' : 'Export'}</span>
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0052ff] hover:bg-[#003ec7] text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 2. Catalogue Stats & Quick Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Register */}
        <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-xs border border-[#e7eeff]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737688]">
              Total Register
            </span>
            <Package size={18} className="text-[#737688]" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[28px] font-bold text-[#121c2b] leading-tight">
              {stats.total}
            </span>
            <span className="text-xs text-[#737688]">SKUs recorded</span>
          </div>
        </div>

        {/* Card 2: Active Online */}
        <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-xs border border-[#e7eeff]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737688]">
              Active Online
            </span>
            <Store size={18} className="text-[#003ec7]" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[28px] font-bold text-[#121c2b] leading-tight">
              {stats.active}
            </span>
            <span className="text-xs text-[#003ec7] font-semibold">
              {stats.visiblePct}% visible
            </span>
          </div>
        </div>

        {/* Card 3: Low Stock */}
        <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-xs border border-[#e7eeff]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#952200]">
              Low Stock
            </span>
            <AlertTriangle size={18} className="text-[#952200]" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[28px] font-bold text-[#952200] leading-tight">
              {stats.lowStock}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ffdbd2] text-[#891e00]">
              Reorder suggested
            </span>
          </div>
        </div>

        {/* Card 4: Out of Stock */}
        <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-xs border border-[#e7eeff]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ba1a1a]">
              Out of Stock
            </span>
            <AlertCircle size={18} className="text-[#ba1a1a]" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[28px] font-bold text-[#ba1a1a] leading-tight">
              {stats.outOfStock}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ffdad6] text-[#93000a]">
              Zero balance
            </span>
          </div>
        </div>
      </div>

      {/* Near Limit or At Limit Alerts */}
      {atLimit && (
        <div className="bg-white border-2 border-emerald-500/40 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shrink-0">
              🎉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[#121c2b] m-0">
                  Congratulations on listing {productLimit} products!
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  Milestone
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#585e6f] font-normal m-0 mt-1">
                Your shop is expanding. Your existing products remain 100% active and free forever.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowGrowthModal(true)}
            className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            View Growth Options
          </button>
        </div>
      )}

      {nearLimit && !atLimit && (
        <UpgradePrompt
          variant="inline"
          reason={`Getting close — ${Math.max(0, productLimit - products.length)} product slots left.`}
          benefit="Upgrade to Growth for up to 500 products, advanced analytics, and custom domain."
          currentPlan={user?.plan}
        />
      )}

      {/* 3. Search, Filters, & Category Pills */}
      <div className="bg-white rounded-xl p-4 flex flex-col gap-4 shadow-xs border border-[#e7eeff]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737688]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search products by title, SKU, barcode (EAN)..."
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#f0f3ff] text-[#121c2b] placeholder:text-[#737688] text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0052ff]/20 transition-all border-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737688] hover:text-[#121c2b] cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Filter Dropdowns */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Status Dropdown */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatusMenu(!showStatusMenu);
                  setShowStockMenu(false);
                }}
                className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] text-[#121c2b] text-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                <span className="text-xs text-[#737688]">Status:</span>
                <span className="font-semibold capitalize">
                  {statusFilter === 'all' ? 'All' : statusFilter}
                </span>
                <ChevronDown size={18} className="text-[#737688]" />
              </button>

              {showStatusMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl p-1 z-30 flex flex-col gap-0.5 border border-[#c3c5d9]/40"
                >
                  {(['all', 'active', 'draft', 'archived'] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setStatusFilter(val);
                        setShowStatusMenu(false);
                        setPage(1);
                      }}
                      className="text-left px-3 py-2 rounded-lg text-xs font-medium text-[#121c2b] hover:bg-[#f0f3ff] flex justify-between items-center capitalize cursor-pointer"
                    >
                      <span>{val === 'all' ? 'All Statuses' : val}</span>
                      {statusFilter === val && <Check size={16} className="text-[#0052ff]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stock Dropdown */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStockMenu(!showStockMenu);
                  setShowStatusMenu(false);
                }}
                className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] text-[#121c2b] text-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                <span className="text-xs text-[#737688]">Stock:</span>
                <span className="font-semibold">
                  {stockFilter === 'all'
                    ? 'All'
                    : stockFilter === 'in'
                    ? 'In Stock (>5)'
                    : stockFilter === 'low'
                    ? 'Low Stock (≤5)'
                    : 'Out of Stock (0)'}
                </span>
                <ChevronDown size={18} className="text-[#737688]" />
              </button>

              {showStockMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl p-1 z-30 flex flex-col gap-0.5 border border-[#c3c5d9]/40"
                >
                  {[
                    { id: 'all', label: 'All Inventory' },
                    { id: 'in', label: 'In Stock (>5)' },
                    { id: 'low', label: 'Low Stock (≤5)' },
                    { id: 'out', label: 'Out of Stock (0)' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setStockFilter(opt.id as any);
                        setShowStockMenu(false);
                        setPage(1);
                      }}
                      className="text-left px-3 py-2 rounded-lg text-xs font-medium text-[#121c2b] hover:bg-[#f0f3ff] flex justify-between items-center cursor-pointer"
                    >
                      <span>{opt.label}</span>
                      {stockFilter === opt.id && <Check size={16} className="text-[#0052ff]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset Filters"
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] text-[#737688] hover:text-[#121c2b] transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setCategory('');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              !category
                ? 'bg-[#0052ff] text-white shadow-xs'
                : 'bg-[#f0f3ff] hover:bg-[#e7eeff] text-[#434656] hover:text-[#121c2b]'
            }`}
          >
            <span>All Products</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                !category ? 'bg-white/20 text-white' : 'bg-[#d9e3f8] text-[#434656]'
              }`}
            >
              {products.length}
            </span>
          </button>

          {categoryPills.map((cat) => {
            const isSelected = category.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => {
                  setCategory(isSelected ? '' : cat.name);
                  setPage(1);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0052ff] text-white shadow-xs'
                    : 'bg-[#f0f3ff] hover:bg-[#e7eeff] text-[#434656] hover:text-[#121c2b]'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#d9e3f8] text-[#434656]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Bulk Action Bar (Contextual) */}
      {selectedProductIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#dee8fe] text-[#121c2b] shadow-xs transition-all animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-[#0052ff]" />
            <span className="font-semibold text-sm">
              <span>{selectedProductIds.length}</span> products selected
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleBulkToggleVisibility}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#e7eeff] text-xs font-semibold text-[#121c2b] transition-colors cursor-pointer shadow-2xs"
            >
              Change Visibility
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-lg bg-[#ffdad6] hover:bg-[#ffdad6]/80 text-[#ba1a1a] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedProductIds([])}
              className="px-2 py-1 text-xs text-[#585e6f] hover:text-[#121c2b] cursor-pointer"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* 5. Products Ledger Table Container */}
      <div className="bg-white rounded-xl shadow-xs overflow-hidden flex flex-col border border-[#e7eeff]">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#0052ff] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#737688]">Loading catalog items...</p>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#dee8fe] flex items-center justify-center text-[#434656] mb-3">
              <Package size={24} className="text-[#0052ff]" />
            </div>
            <h3 className="text-base font-bold text-[#121c2b] m-0">
              No products match your criteria
            </h3>
            <p className="text-xs text-[#737688] mt-1 max-w-sm m-0">
              Try resetting filters or searching with another keyword or SKU number.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] text-[#0052ff] font-semibold text-xs transition-colors cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* Table Ledger */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f0f3ff] text-[#737688] text-xs font-semibold uppercase tracking-wider select-none border-b border-[#e7eeff]">
                  <th className="py-3 pl-4 pr-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 && selectedProductIds.length === filtered.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded w-4 h-4 text-[#0052ff] focus:ring-0 cursor-pointer accent-[#0052ff]"
                    />
                  </th>
                  <th className="py-3 px-3 min-w-[280px]">Product &amp; SKU</th>
                  <th className="py-3 px-3 min-w-[140px]">Category</th>
                  <th className="py-3 px-3 text-right min-w-[100px]">Price</th>
                  <th className="py-3 px-3 text-left min-w-[140px]">Inventory</th>
                  <th className="py-3 px-3 min-w-[130px]">Channels</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Storefront</th>
                  <th className="py-3 pr-4 pl-2 text-right w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7eeff] text-sm text-[#121c2b]">
                {paginatedProducts.map((p) => {
                  const isSelected = selectedProductIds.includes(p.id);
                  const isActive =
                    p.status === 'active' || (p.is_active !== false && !p.status);
                  const isLow = (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5;
                  const isOut = (p.stock_quantity ?? 0) <= 0;

                  // Price decimal formatting
                  const priceVal = p.sale_price || p.price || 0;
                  const [intPart, decPart] = priceVal.toFixed(2).split('.');

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#f0f3ff]/60 transition-colors group"
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 pl-4 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectProduct(p.id)}
                          className="rounded w-4 h-4 text-[#0052ff] focus:ring-0 cursor-pointer accent-[#0052ff]"
                        />
                      </td>

                      {/* Product & SKU */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => openEdit(p)}
                            className="w-11 h-11 rounded-lg overflow-hidden bg-[#e7eeff] shrink-0 relative shadow-2xs flex items-center justify-center cursor-pointer"
                          >
                            {p.media_key || p.image_url ? (
                              <img
                                src={resolveMediaUrl(p.media_key || p.image_url)}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package size={20} className="text-[#737688]" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              onClick={() => openEdit(p)}
                              className="font-semibold text-sm text-[#121c2b] group-hover:text-[#0052ff] transition-colors truncate cursor-pointer"
                              title={p.name}
                            >
                              {p.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono text-[#737688]">
                                {p.sku || 'NO-SKU'}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-[#c3c5d9]" />
                              <span className="text-xs text-[#585e6f]">
                                {p.barcode ? `EAN: ${p.barcode}` : 'No barcode'}
                              </span>
                              {p.variants && p.variants.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#0052ff] ml-1">
                                  <Layers size={11} />
                                  <span>{p.variants.length} var</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-1 rounded-md bg-[#e7eeff] text-[#434656] text-xs font-medium inline-block truncate max-w-[130px]">
                          {p.category || 'General'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-semibold text-base tabular-nums text-[#121c2b]">
                          ₹{intPart}
                          <span className="text-[#737688] text-xs">.{decPart}</span>
                        </span>
                      </td>

                      {/* Inventory */}
                      <td className="py-3.5 px-3">
                        {isOut ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#ffdad6] text-[#93000a]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]" />
                              0 left
                            </span>
                          </div>
                        ) : isLow ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#ffdbd2] text-[#891e00]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#952200]" />
                              {p.stock_quantity} left
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-[#121c2b]">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>{p.stock_quantity ?? 0} in stock</span>
                          </div>
                        )}
                      </td>

                      {/* Channels */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-xs text-[#585e6f]">
                          <Globe size={16} className="text-[#003ec7]" title="Online Storefront" />
                          <Store size={16} className="text-[#585e6f]" title="POS Counter" />
                          <span className="text-[#737688] hidden sm:inline">Online &amp; Counter</span>
                        </div>
                      </td>

                      {/* Storefront Toggle Switch */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleProductStatus(p)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isActive ? 'bg-[#0052ff]' : 'bg-[#d9e3f8]'
                          }`}
                          role="switch"
                          aria-checked={isActive}
                          title={isActive ? 'Storefront Live (Click to set Draft)' : 'Storefront Hidden (Click to publish)'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Row Actions Menu */}
                      <td className="py-3.5 pr-4 pl-2 text-right relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenRowMenuId(openRowMenuId === p.id ? null : p.id);
                          }}
                          className="p-1 rounded-lg text-[#737688] hover:text-[#121c2b] hover:bg-[#e7eeff] transition-colors cursor-pointer"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {openRowMenuId === p.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-4 top-10 w-36 bg-white rounded-xl shadow-xl p-1 z-30 flex flex-col gap-0.5 border border-[#c3c5d9]/40 text-left"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenRowMenuId(null);
                                openEdit(p);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#121c2b] hover:bg-[#f0f3ff] flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 size={14} className="text-[#585e6f]" />
                              <span>Edit Product</span>
                            </button>
                            {p.sku && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenRowMenuId(null);
                                  copyToClipboard(p.sku!, 'SKU');
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#121c2b] hover:bg-[#f0f3ff] flex items-center gap-2 cursor-pointer"
                              >
                                <Copy size={14} className="text-[#585e6f]" />
                                <span>Copy SKU</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenRowMenuId(null);
                                setDeleteId(p.id);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#ba1a1a] hover:bg-[#ffdad6]/60 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 size={14} className="text-[#ba1a1a]" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Pagination & Summary Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3.5 bg-[#f0f3ff]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#585e6f] border-t border-[#e7eeff]">
            <div className="flex items-center gap-2 text-xs">
              <span>
                Showing{' '}
                <strong className="font-semibold text-[#121c2b]">
                  {Math.min(filtered.length, (page - 1) * pageSize + 1)}–
                  {Math.min(filtered.length, page * pageSize)}
                </strong>{' '}
                of <strong className="font-semibold text-[#121c2b]">{filtered.length}</strong>{' '}
                items
              </span>
              <span className="text-[#737688]">•</span>
              <span className="text-[#737688]">
                Page {page} of {totalPages}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-9 px-3 rounded-lg bg-[#f0f3ff] text-[#121c2b] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1 hover:bg-[#e7eeff] transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  // Show current, first, last, and neighbors
                  if (
                    pNum === 1 ||
                    pNum === totalPages ||
                    Math.abs(pNum - page) <= 1
                  ) {
                    const isCurrent = pNum === page;
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setPage(pNum)}
                        className={`h-9 w-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#0052ff] text-white shadow-2xs'
                            : 'hover:bg-[#e7eeff] text-[#121c2b]'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  }
                  if (
                    (pNum === 2 && page > 3) ||
                    (pNum === totalPages - 1 && page < totalPages - 2)
                  ) {
                    return (
                      <span key={pNum} className="px-1 text-[#737688] text-xs">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-9 px-3 rounded-lg bg-[#f0f3ff] text-[#121c2b] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1 hover:bg-[#e7eeff] transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#e7eeff] text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto">
              <Trash2 size={24} strokeWidth={2} />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#121c2b] m-0">
                Delete this product?
              </h3>
              <p className="text-xs text-[#585e6f] mt-1 m-0 leading-relaxed">
                This item will be permanently removed from your SKU register. It will no longer appear on your storefront or in orders.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 h-11 rounded-xl border border-[#c3c5d9]/40 bg-white hover:bg-[#f0f3ff] text-[#121c2b] font-semibold text-xs cursor-pointer transition-colors"
              >
                Keep Product
              </button>

              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white font-semibold text-xs cursor-pointer transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 CELEBRATORY GROWTH LIMIT MODAL */}
      {showGrowthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-[#e7eeff]">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/20 mb-3">
                🎉
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles size={12} /> Milestone Achieved
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#121c2b] tracking-tight m-0">
                Congratulations on listing {productLimit} products!
              </h3>
              <p className="text-xs sm:text-sm text-[#585e6f] font-normal mt-1.5 max-w-md mx-auto m-0">
                Your store catalog is expanding fast. You have reached the listing limit for the Free tier.
              </p>
            </div>

            {/* Reassurance Card */}
            <div className="bg-[#f0f3ff] border border-[#e7eeff] rounded-xl p-4 mb-5 space-y-1 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-[#121c2b]">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Zero Extortion Guarantee</span>
              </div>
              <p className="text-xs text-[#585e6f] leading-relaxed m-0">
                Your existing {productLimit} products will{' '}
                <strong>remain active, searchable, and 100% free forever</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowGrowthModal(false)}
                className="h-11 rounded-xl border border-[#c3c5d9]/40 bg-white hover:bg-[#f0f3ff] text-[#121c2b] font-semibold text-xs flex-1 cursor-pointer transition-colors"
              >
                Keep Free Products
              </button>
              <Link
                to="/upgrade"
                className="h-11 rounded-xl bg-[#0052ff] hover:bg-[#003ec7] text-white font-semibold text-xs flex-1 inline-flex items-center justify-center gap-1.5 shadow-sm"
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

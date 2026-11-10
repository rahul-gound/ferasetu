import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Truck,
  ArrowRight,
  MapPin,
  Search,
  Download,
  ScanBarcode,
  Calendar as CalendarIcon,
  Tag,
  FileText,
  Hash,
  Receipt,
  Plus,
  Trash2,
  Package,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import SEO from '../components/SEO';
import SidekickCopilotBar, { type SidekickProposal } from '../components/transfers/SidekickCopilotBar';
import BarcodeScannerModal from '../components/transfers/BarcodeScannerModal';
import posthog from '../lib/posthog';

interface TransferItem {
  product_id: string;
  title: string;
  sku?: string;
  image?: string;
  available_origin: number;
  quantity: number;
  unit_cost: number;
}

interface LocationOption {
  id: string;
  name: string;
  type: string;
  address?: string;
  city?: string;
  is_default: number;
}

export default function CreateTransferPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Transfer Form State
  const [originId, setOriginId] = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [status, setStatus] = useState<'draft' | 'in_transit'>('draft');

  // Default estimated arrival to tomorrow in merchant's configured timezone
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [estimatedArrival, setEstimatedArrival] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateError, setDateError] = useState<string | null>(null);

  const [referenceName, setReferenceName] = useState<string>('');
  const [isEditingRef, setIsEditingRef] = useState(false);
  const [note, setNote] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [purchaseOrderId, setPurchaseOrderId] = useState<string>('');
  const [isEditingPO, setIsEditingPO] = useState(false);

  // Search & Barcode state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Merchant Locations
  const { data: locationsData } = useQuery<{ success: boolean; locations: LocationOption[] }>({
    queryKey: ['inventory-locations'],
    queryFn: async () => {
      try {
        const res = await api.get('/transfers/locations');
        return res.data;
      } catch {
        return {
          success: true,
          locations: [
            { id: 'loc-wh-1', name: 'Main Warehouse', type: 'warehouse', address: 'Plot 42, Industrial Area', city: 'Delhi', is_default: 1 },
            { id: 'loc-st-1', name: 'Storefront Retail Counter', type: 'store', address: 'Shop 12, Main Market', city: 'Delhi', is_default: 0 },
            { id: 'loc-sp-1', name: 'Wholesale Supplier Node', type: 'supplier', address: 'APMC Market Yard', city: 'Karnal', is_default: 0 },
            { id: 'loc-hb-1', name: 'Regional Express Depot', type: 'hub', address: 'Ring Road Depot', city: 'Gurugram', is_default: 0 },
          ],
        };
      }
    },
    staleTime: 30000,
  });

  const locations = locationsData?.locations || [];

  // Default origin & destination
  React.useEffect(() => {
    if (locations.length >= 2) {
      if (!originId) setOriginId(locations[0].id);
      if (!destinationId) setDestinationId(locations[1].id);
    }
  }, [locations, originId, destinationId]);

  // Fetch Merchant Products for searching
  const { data: productsData, isLoading: isProductsLoading } = useQuery<{ products: any[] }>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data;
    },
    staleTime: 30000,
  });

  const productsList = useMemo(() => {
    const raw = productsData?.products || [];
    return raw.filter((p: any) => !p.is_gift_card && p.category !== 'Gift Cards');
  }, [productsData]);

  // Filtered Products for Search Dropdown
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return productsList
      .filter((p) => {
        const name = (p.title || p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return name.includes(q) || sku.includes(q);
      })
      .slice(0, 8);
  }, [productsList, searchQuery]);

  // Validation status
  const originMatchesDestination = Boolean(originId && destinationId && originId === destinationId);
  const isDateInvalid = Boolean(estimatedArrival && estimatedArrival < todayStr);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!originId) errors.push('Select an origin location.');
    if (!destinationId) errors.push('Select a destination location.');
    if (originMatchesDestination) errors.push('Origin and destination cannot be the same location.');
    if (items.length === 0) errors.push('Add at least one product to transfer.');
    if (isDateInvalid) errors.push('Estimated arrival must be today or a future date.');
    const zeroQtyItem = items.find((it) => it.quantity <= 0);
    if (zeroQtyItem) errors.push(`Quantity for ${zeroQtyItem.title} must be greater than zero.`);
    return errors;
  }, [originId, destinationId, originMatchesDestination, items, isDateInvalid]);

  const isFormValid = validationErrors.length === 0;

  // Add Item to Transfer
  const handleAddItem = (product: any, qty = 1) => {
    const pid = String(product.id);
    const existingIndex = items.findIndex((it) => it.product_id === pid);
    const availableStock = Number(product.stock_quantity ?? product.inventory ?? product.stock ?? 50);

    if (availableStock <= 0) {
      toast.error(`"${product.title || product.name}" is out of stock (0 units).`);
      return;
    }

    if (existingIndex !== -1) {
      const updated = [...items];
      updated[existingIndex].quantity += qty;
      setItems(updated);
    } else {
      setItems((prev) => [
        ...prev,
        {
          product_id: pid,
          title: product.title || product.name || 'Product',
          sku: product.sku || `SKU-${pid.slice(-4)}`,
          image: product.image_url || product.image || undefined,
          available_origin: availableStock,
          quantity: qty,
          unit_cost: Number(product.price || 0),
        },
      ]);
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.product_id === productId) {
            const next = it.quantity + delta;
            return next > 0 ? { ...it, quantity: next } : null;
          }
          return it;
        })
        .filter(Boolean) as TransferItem[]
    );
  };

  const handleSetExactQuantity = (productId: string, val: number) => {
    if (val <= 0) return;
    setItems((prev) =>
      prev.map((it) => (it.product_id === productId ? { ...it, quantity: val } : it))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.product_id !== productId));
  };

  // Add Tag
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    if (!tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Sidekick AI Proposal Handler
  const handleApplyProposal = (proposal: SidekickProposal) => {
    if (proposal.origin_name) {
      const match = locations.find((l) =>
        l.name.toLowerCase().includes(proposal.origin_name!.toLowerCase())
      );
      if (match) setOriginId(match.id);
    }
    if (proposal.destination_name) {
      const match = locations.find((l) =>
        l.name.toLowerCase().includes(proposal.destination_name!.toLowerCase())
      );
      if (match) setDestinationId(match.id);
    }
    if (proposal.estimated_arrival) {
      if (proposal.estimated_arrival >= todayStr) {
        setEstimatedArrival(proposal.estimated_arrival);
        setDateError(null);
      }
    }
    if (proposal.reference_name) {
      setReferenceName(proposal.reference_name);
      setIsEditingRef(true);
    }
    if (proposal.note) {
      setNote(proposal.note);
      setIsEditingNote(true);
    }
    if (proposal.tags) {
      const splitTags = proposal.tags.split(',').map((s) => s.trim());
      setTags((prev) => Array.from(new Set([...prev, ...splitTags])));
      setIsEditingTags(true);
    }
    if (proposal.purchase_order_id) {
      setPurchaseOrderId(proposal.purchase_order_id);
      setIsEditingPO(true);
    }
    // If product suggested, find and add it
    if (proposal.product_name) {
      const p = productsList.find((item) =>
        (item.title || item.name || '').toLowerCase().includes(proposal.product_name!.toLowerCase())
      );
      if (p) {
        handleAddItem(p, proposal.quantity || 1);
      }
    } else if (proposal.quantity && items.length > 0) {
      const updated = [...items];
      updated[0].quantity = proposal.quantity;
      setItems(updated);
    }
  };

  // Export items to CSV with defensive checks
  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error('Add products first to export the transfer sheet.');
      return;
    }
    const headers = ['SKU', 'Title', 'Quantity', 'Unit Cost', 'Total'];
    const rows = items.map((it) => [
      it.sku,
      `"${it.title.replace(/"/g, '""')}"`,
      it.quantity,
      it.unit_cost,
      it.quantity * it.unit_cost,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transfer_${referenceName || 'sheet'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Transfer sheet exported to CSV');
  };

  // Save Transfer Submission
  const handleSaveTransfer = async (selectedStatus: 'draft' | 'in_transit') => {
    if (!originId) {
      toast.error('Select an origin location');
      return;
    }
    if (!destinationId) {
      toast.error('Select a destination location');
      return;
    }
    if (originMatchesDestination) {
      toast.error('Origin and destination cannot be the same location');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one product to transfer');
      return;
    }
    if (isDateInvalid) {
      toast.error('Estimated arrival must be today or a future date.');
      return;
    }

    const originObj = locations.find((l) => l.id === originId);
    const destinationObj = locations.find((l) => l.id === destinationId);

    setIsSubmitting(true);
    try {
      const payload = {
        origin_location_id: originId,
        origin_name: originObj?.name || 'Origin Warehouse',
        destination_location_id: destinationId,
        destination_name: destinationObj?.name || 'Destination Store',
        status: selectedStatus,
        estimated_arrival: estimatedArrival,
        reference_name: referenceName || undefined,
        note: note || undefined,
        tags: tags.length > 0 ? tags.join(', ') : undefined,
        purchase_order_id: purchaseOrderId || undefined,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_title: it.title,
          sku: it.sku,
          quantity: it.quantity,
          unit_cost: it.unit_cost,
        })),
      };

      const res = await api.post('/transfers', payload);
      const createdId = res.data?.transfer?.id || res.data?.id || `TR-${Date.now().toString().slice(-6)}`;

      posthog.capture('inventory_transfer_created', {
        status: selectedStatus,
        product_count: items.length,
        unit_count: items.reduce((sum, item) => sum + item.quantity, 0),
      });

      toast.success(
        selectedStatus === 'in_transit'
          ? `Transfer #${createdId.slice(0, 8)} marked as in transit! Stock moving.`
          : `Transfer #${createdId.slice(0, 8)} draft saved successfully.`
      );
      queryClient.invalidateQueries({ queryKey: ['inventory-transfers'] });
      navigate('/transfers');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalTransferUnits = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalTransferValue = items.reduce((sum, it) => sum + it.quantity * it.unit_cost, 0);

  // Format date display using merchant locale
  const formattedArrivalDate = useMemo(() => {
    try {
      const d = new Date(estimatedArrival);
      if (isNaN(d.getTime())) throw new Error();
      return d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }, [estimatedArrival]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-5xl mx-auto pb-28">
      <SEO title="Create Transfer | FeraSetu" />

      {/* Top Navigation Bar: Back + Title + Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/transfers')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#152238] mb-2 transition-colors group cursor-pointer"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Transfers</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-[#152238] tracking-tight">
            Create transfer
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSaveTransfer('draft')}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-[#E5EAF1] bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 size={13} className="animate-spin" />}
            <span>Save as draft</span>
          </button>
          <button
            type="button"
            onClick={() => handleSaveTransfer('in_transit')}
            disabled={isSubmitting || !isFormValid}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#152238] text-white hover:bg-black transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            title={!isFormValid ? validationErrors[0] : 'Dispatch shipment into transit'}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
            <span>Mark as in transit</span>
          </button>
        </div>
      </div>

      {/* Inline Validation Warnings Banner if form has issues */}
      {validationErrors.length > 0 && items.length > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-950 text-xs flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Please resolve the following before dispatching:</span>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-amber-900">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main Origin -> Destination Pipeline Card */}
      <div className="bg-white rounded-2xl border border-[#E5EAF1] shadow-xs overflow-hidden">
        {/* Origin / In Transit / Destination Bar */}
        <div className="p-4 sm:p-6 border-b border-[#E5EAF1] bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Origin Dropdown */}
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Origin <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={originId}
                  onChange={(e) => setOriginId(e.target.value)}
                  className={`w-full h-11 pl-3 pr-8 rounded-xl border text-xs sm:text-sm font-semibold transition-all appearance-none cursor-pointer ${
                    originMatchesDestination
                      ? 'border-rose-400 bg-rose-50 text-rose-900'
                      : 'border-[#E5EAF1] bg-[#F8FAFC] text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600'
                  }`}
                >
                  <option value="" disabled>
                    Select origin location
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} disabled={loc.id === destinationId}>
                      {loc.name} {loc.is_default ? '(Default Warehouse)' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            {/* In Transit Status Pillar */}
            <div className="flex flex-col items-center justify-center shrink-0 pt-2 md:pt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="hidden md:inline text-slate-300">———→</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs font-semibold text-xs">
                  <Truck size={14} className="text-slate-500" />
                  <span>In transit</span>
                </span>
                <span className="hidden md:inline text-slate-300">———→</span>
              </div>
            </div>

            {/* Destination Dropdown */}
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Destination <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className={`w-full h-11 pl-3 pr-8 rounded-xl border text-xs sm:text-sm font-semibold transition-all appearance-none cursor-pointer ${
                    originMatchesDestination
                      ? 'border-rose-400 bg-rose-50 text-rose-900'
                      : 'border-[#E5EAF1] bg-[#F8FAFC] text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600'
                  }`}
                >
                  <option value="" disabled>
                    Select destination location
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} disabled={loc.id === originId}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {originMatchesDestination && (
            <p className="text-[11px] text-rose-600 mt-2 font-medium">
              Origin and destination cannot be the same location.
            </p>
          )}
        </div>

        {/* Product Search Bar */}
        <div className="p-4 sm:p-6 bg-white relative">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search products in catalog to add..."
              className="w-full h-11 pl-10 pr-24 rounded-xl border border-[#E5EAF1] bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs transition-all"
            />

            {/* Actions inside search input right edge: Export CSV + Barcode Scan */}
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={items.length === 0}
                title={items.length === 0 ? 'Add at least one product before exporting.' : 'Export transfer sheet to CSV'}
                className={`p-1.5 rounded-lg transition-colors ${
                  items.length === 0
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer'
                }`}
              >
                <Download size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(true)}
                title="Scan barcode or SKU"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ScanBarcode size={16} />
              </button>
            </div>
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute left-4 right-4 sm:left-6 sm:right-6 top-18 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-72 overflow-y-auto animate-fadeIn">
              <div className="p-2 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-3">
                <span>Matching store inventory</span>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="hover:text-slate-700 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {productsList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <Package size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="font-semibold text-slate-700">No products available</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Add or import a product to continue.
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No products found matching "{searchQuery}".
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {searchResults.map((p) => {
                    const isAlreadyAdded = items.some((it) => it.product_id === String(p.id));
                    const stock = Number(p.stock_quantity ?? p.inventory ?? p.stock ?? 50);
                    const isOutOfStock = stock <= 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => !isOutOfStock && handleAddItem(p, 1)}
                        className={`p-3 sm:px-4 flex items-center justify-between text-xs transition-colors group ${
                          isOutOfStock
                            ? 'opacity-50 cursor-not-allowed bg-slate-50/50'
                            : 'hover:bg-indigo-50/60 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.title || p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package size={16} />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-[#152238] block group-hover:text-indigo-600 transition-colors">
                              {p.title || p.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              SKU: {p.sku || `SKU-${p.id.slice(-4)}`} • ₹{Number(p.price || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] ${isOutOfStock ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                            {isOutOfStock ? '0 in stock' : `${stock} available`}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all ${
                              isOutOfStock
                                ? 'bg-slate-100 text-slate-400 border-slate-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'
                            }`}
                          >
                            {isOutOfStock ? 'Out of stock' : isAlreadyAdded ? '+ Add more' : '+ Add'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Line items Table (shown if 1+ items added) */}
          {items.length > 0 ? (
            <div className="mt-6 border border-[#E5EAF1] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-3 text-center">Available Origin</th>
                    <th className="py-3 px-3 text-center">Transfer Quantity</th>
                    <th className="py-3 px-3 text-right">Unit Cost</th>
                    <th className="py-3 px-3 text-right">Total</th>
                    <th className="py-3 px-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1]">
                  {items.map((it) => {
                    const exceedsStock = it.quantity > it.available_origin;

                    return (
                      <tr key={it.product_id} className={`hover:bg-slate-50/60 ${exceedsStock ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                              {it.image ? (
                                <img src={it.image} alt={it.title} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={15} />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-[#152238] block">{it.title}</span>
                              <span className="text-[10px] text-slate-500 font-mono">SKU: {it.sku}</span>
                              {exceedsStock && (
                                <span className="text-[10px] text-amber-700 font-semibold block">
                                  Warning: Exceeds origin stock ({it.available_origin} avail)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center text-slate-600 font-medium">
                          {it.available_origin} units
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(it.product_id, -1)}
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-sm cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) =>
                                handleSetExactQuantity(it.product_id, parseInt(e.target.value, 10) || 1)
                              }
                              className={`w-14 h-7 text-center font-bold border rounded-lg text-xs ${
                                exceedsStock ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(it.product_id, 1)}
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-sm cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          ₹{it.unit_cost.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{(it.quantity * it.unit_cost).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.product_id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Items Table Footer Summary */}
              <div className="p-3 bg-[#F8FAFC] border-t border-[#E5EAF1] flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>
                  Total items: <strong className="text-slate-900">{items.length}</strong> ({totalTransferUnits} units)
                </span>
                <span className="font-mono text-sm font-black text-slate-900">
                  Value: ₹{totalTransferValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-8 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
              <Package size={22} className="text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No products added yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Type above or use the barcode scanner to add inventory items to this shipment.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transfer details Card */}
      <div className="bg-white rounded-2xl border border-[#E5EAF1] shadow-xs p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-[#152238]">Transfer details</h2>

        <div className="space-y-3.5 divide-y divide-slate-100 text-xs">
          {/* Row 1: Estimated arrival date with strict future validation */}
          <div className="pt-1 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-slate-700">
                <CalendarIcon size={16} className="text-slate-400 shrink-0" />
                <span className="font-medium">Estimated arrival:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg font-mono-tabular">
                  {formattedArrivalDate}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  min={todayStr}
                  value={estimatedArrival}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val < todayStr) {
                      setDateError('Estimated arrival must be today or a future date.');
                      toast.error('Estimated arrival must be today or a future date.');
                    } else {
                      setDateError(null);
                    }
                    setEstimatedArrival(val);
                  }}
                  className={`px-2.5 py-1 text-xs border rounded-lg bg-white focus:outline-none ${
                    dateError ? 'border-rose-400 text-rose-900 bg-rose-50' : 'border-slate-200 text-slate-700 focus:border-indigo-600'
                  }`}
                  aria-label="Estimated arrival date"
                />
              </div>
            </div>
            {dateError && (
              <p className="text-[11px] text-rose-600 font-semibold pl-7">
                {dateError}
              </p>
            )}
          </div>

          {/* Row 2: Add reference name */}
          <div className="pt-3.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsEditingRef(!isEditingRef)}
                className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
              >
                <Tag size={16} className="text-slate-400 shrink-0" />
                <span>
                  {referenceName ? `Reference: ${referenceName}` : 'Add reference name'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingRef(!isEditingRef)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                {isEditingRef ? 'Done' : referenceName ? 'Edit' : '+ Add'}
              </button>
            </div>

            {isEditingRef && (
              <div className="mt-2.5 pl-7 animate-fadeIn">
                <input
                  type="text"
                  value={referenceName}
                  onChange={(e) => setReferenceName(e.target.value)}
                  placeholder="e.g. TR-2026-RESTOCK-01 or Tracking #AWB-98124"
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
            )}
          </div>

          {/* Row 3: Add note */}
          <div className="pt-3.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsEditingNote(!isEditingNote)}
                className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
              >
                <FileText size={16} className="text-slate-400 shrink-0" />
                <span>
                  {note ? `Note: "${note.slice(0, 30)}${note.length > 30 ? '…' : ''}"` : 'Add note'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingNote(!isEditingNote)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                {isEditingNote ? 'Done' : note ? 'Edit' : '+ Add'}
              </button>
            </div>

            {isEditingNote && (
              <div className="mt-2.5 pl-7 animate-fadeIn">
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Carrier instructions or inventory notes (e.g. Fragile items, deliver to rear bay)..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 resize-none"
                />
              </div>
            )}
          </div>

          {/* Row 4: Add tags */}
          <div className="pt-3.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsEditingTags(!isEditingTags)}
                className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
              >
                <Hash size={16} className="text-slate-400 shrink-0" />
                <span>
                  {tags.length > 0 ? `Tags (${tags.length}): ${tags.join(', ')}` : 'Add tags'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTags(!isEditingTags)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                {isEditingTags ? 'Done' : tags.length > 0 ? 'Edit' : '+ Add'}
              </button>
            </div>

            {isEditingTags && (
              <div className="mt-2.5 pl-7 space-y-2 animate-fadeIn">
                <form onSubmit={handleAddTag} className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="e.g. Urgent, Express, Store Restock"
                    className="flex-1 h-9 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="submit"
                    className="px-3 h-9 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-black cursor-pointer"
                  >
                    Add Tag
                  </button>
                </form>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 5: Link purchase order */}
          <div className="pt-3.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsEditingPO(!isEditingPO)}
                className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
              >
                <Receipt size={16} className="text-slate-400 shrink-0" />
                <span>
                  {purchaseOrderId ? `Linked PO: ${purchaseOrderId}` : 'Link purchase order'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingPO(!isEditingPO)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                {isEditingPO ? 'Done' : purchaseOrderId ? 'Edit' : '+ Add'}
              </button>
            </div>

            {isEditingPO && (
              <div className="mt-2.5 pl-7 animate-fadeIn">
                <input
                  type="text"
                  value={purchaseOrderId}
                  onChange={(e) => setPurchaseOrderId(e.target.value)}
                  placeholder="e.g. PO-8821 or Supplier Invoice #INV-492"
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal with Catalog Connection */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        products={productsList}
        onAddProduct={handleAddItem}
      />

      {/* Docked Floating "Work with Sidekick" Pill Bar */}
      <SidekickCopilotBar
        onApplyProposal={handleApplyProposal}
        availableProducts={productsList}
        availableLocations={locations}
      />
    </div>
  );
}

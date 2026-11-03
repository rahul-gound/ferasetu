import { useState, useRef, useMemo } from 'react';
import {
  Upload, X, CheckCircle2, AlertTriangle, Search,
  Download, Sparkles, Package, Layers, ShieldCheck,
  ArrowRight, Check, RefreshCw, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getPlanLimits, hasReachedProductLimit } from '../../config/plans';
import {
  parseInventoryCsv,
  generateSampleCsv,
  type ParsedProduct,
  type CsvParseResult
} from '../../utils/csvInventoryParser';
import posthog from '../../lib/posthog';

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  currentProductCount: number;
}

export default function ImportInventoryModal({
  isOpen,
  onClose,
  onImportComplete,
  currentProductCount,
}: ImportInventoryModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Plan limits
  const planLimits = getPlanLimits(user?.plan);
  const maxProducts = planLimits.products; // Infinity for Pro
  const remainingSlots = maxProducts === Infinity ? Infinity : Math.max(0, maxProducts - currentProductCount);

  // States
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [importCompleteStats, setImportCompleteStats] = useState<{ imported: number; failed: number } | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFileName('');
    setParseResult(null);
    setProducts([]);
    setSearchFilter('');
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0, currentName: '' });
    setImportCompleteStats(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isImporting) {
      if (!window.confirm('Import is currently in progress. Are you sure you want to cancel?')) {
        return;
      }
    }
    handleReset();
    onClose();
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a valid .csv file.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const result = parseInventoryCsv(text);
        if (result.errors.length > 0 && result.products.length === 0) {
          toast.error(result.errors[0]);
          return;
        }

        // Limit default selection if it would exceed plan remaining slots
        let selectionCount = 0;
        const initialProducts = result.products.map(p => {
          if (remainingSlots !== Infinity && selectionCount >= remainingSlots) {
            return { ...p, selectedForImport: false };
          }
          selectionCount++;
          return { ...p, selectedForImport: true };
        });

        setParseResult(result);
        setProducts(initialProducts);

        if (result.products.length > 0) {
          toast.success(`Found ${result.products.length} products from ${result.formatLabel}!`);
        }
      } catch (err: any) {
        console.error('CSV parse error:', err);
        toast.error('Failed to parse CSV file. Please verify file formatting.');
      }
    };
    reader.onerror = () => {
      toast.error('Could not read file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const downloadTemplate = (type: 'shopify' | 'standard') => {
    const csvContent = generateSampleCsv(type);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'shopify' ? 'FeraSetu_Shopify_Template.csv' : 'FeraSetu_Standard_Inventory_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${type === 'shopify' ? 'Shopify' : 'Standard'} sample template`);
  };

  // Toggle selection for a product
  const toggleSelect = (tempId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.tempId === tempId) {
        return { ...p, selectedForImport: !p.selectedForImport };
      }
      return p;
    }));
  };

  // Select / Deselect all
  const selectAll = (select: boolean) => {
    setProducts(prev => {
      let count = 0;
      return prev.map(p => {
        if (!select) return { ...p, selectedForImport: false };
        if (remainingSlots !== Infinity && count >= remainingSlots) {
          return { ...p, selectedForImport: false };
        }
        count++;
        return { ...p, selectedForImport: true };
      });
    });
  };

  const selectedProducts = useMemo(() => {
    return products.filter(p => p.selectedForImport);
  }, [products]);

  const filteredPreview = useMemo(() => {
    if (!searchFilter.trim()) return products;
    const q = searchFilter.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q)
    );
  }, [products, searchFilter]);

  // Execute Import
  const runImport = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected for import.');
      return;
    }

    if (remainingSlots !== Infinity && selectedProducts.length > remainingSlots) {
      toast.error(`Your plan only has ${remainingSlots} slots remaining. Please select fewer items or upgrade.`);
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedProducts.length, currentName: '' });

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < selectedProducts.length; i++) {
      const prod = selectedProducts[i];
      setImportProgress({
        current: i + 1,
        total: selectedProducts.length,
        currentName: prod.name,
      });

      try {
        const payload: Record<string, any> = {
          name: prod.name.trim(),
          description: prod.description || '',
          cost_price: prod.cost_price ?? null,
          price: prod.price,
          sale_price: prod.sale_price ?? null,
          category: prod.category || 'Other',
          stock_quantity: prod.stock_quantity ?? 0,
          is_active: prod.status === 'active',
          status: prod.status,
          sku: prod.sku || null,
          barcode: prod.barcode || null,
          options: (prod.options || []).map((o, idx) => ({
            name: o.name,
            position: idx,
            values: o.values,
          })),
          variants: (prod.variants || []).map(v => ({
            title: v.title || 'Default',
            price: v.price,
            compare_at_price: v.compare_at_price ?? null,
            cost_price: v.cost_price ?? null,
            sku: v.sku || null,
            barcode: v.barcode || null,
            status: v.status || 'active',
            stock_quantity: v.stock_quantity ?? 0,
            option_values: v.option_values || {},
          })),
        };

        if (prod.image_url && prod.image_url.startsWith('http')) {
          payload.image_url = prod.image_url;
        }

        await api.post('/products', payload);
        imported++;
      } catch (err: any) {
        console.error(`Error importing ${prod.name}:`, err);
        failed++;
        // If plan limit was reached unexpectedly from server, halt gracefully
        if (err.response?.status === 403 && err.response?.data?.code === 'PRODUCT_LIMIT_REACHED') {
          toast.error('Plan product limit reached. Remaining items skipped.');
          break;
        }
      }
    }

    setIsImporting(false);
    setImportCompleteStats({ imported, failed });
    if (imported > 0) {
      posthog.capture('inventory_import_completed', {
        imported_count: imported,
        failed_count: failed,
        selected_count: selectedProducts.length,
        source_format: parseResult?.formatLabel || 'unknown',
      });
    }

    // Mark setup checklist flag
    if (imported > 0) {
      try {
        const flags = JSON.parse(localStorage.getItem('fera_setup_flags') || '{}');
        flags.first_product = true;
        localStorage.setItem('fera_setup_flags', JSON.stringify(flags));
      } catch {}
    }

    onImportComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-2xs shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Import Inventory CSV
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                  0% Commission
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Import products directly from Shopify, WooCommerce, Excel, or standard CSV files.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[280px]">
          {/* STAGE 1: Upload / Drop zone */}
          {!parseResult && !importCompleteStats && (
            <div className="space-y-6">
              {/* Drag and drop box */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/60 scale-[0.99]'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3 shadow-2xs">
                  <Upload size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Choose CSV file or drag & drop here
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Upload your export file (.csv). FeraSetu automatically detects product handles, options, variants, prices, and images.
                </p>
                <button
                  type="button"
                  className="btn btn-primary px-5 py-2.5 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Upload size={14} /> Browse File
                </button>
              </div>

              {/* Supported Platforms Banner */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Supported Sources
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center gap-2 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Shopify CSV</span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center gap-2 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>WooCommerce</span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center gap-2 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Excel & Sheets</span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center gap-2 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>FeraSetu Backup</span>
                  </div>
                </div>
              </div>

              {/* Download templates */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500">Need a sample format to test?</span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => downloadTemplate('standard')}
                    className="btn btn-secondary text-xs flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} /> Sample CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplate('shopify')}
                    className="btn btn-secondary text-xs flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} /> Shopify Sample
                  </button>
                </div>
              </div>

              {/* Plan limits info */}
              <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-4">
                <span>
                  Current Catalog: <strong className="text-slate-800">{currentProductCount}</strong> products
                </span>
                <span>
                  {maxProducts === Infinity
                    ? 'Unlimited capacity on Pro plan'
                    : `${remainingSlots} slots remaining (${maxProducts} limit)`}
                </span>
              </div>
            </div>
          )}

          {/* STAGE 2: Preview & Validation Table */}
          {parseResult && !importCompleteStats && !isImporting && (
            <div className="space-y-4">
              {/* Detection Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{parseResult.formatLabel}</h4>
                      <span className="px-2 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                        {fileName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Found <strong>{products.length}</strong> products
                      {parseResult.summary.totalVariants > 0 && ` with ${parseResult.summary.totalVariants} variants`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-secondary text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw size={13} /> Change File
                </button>
              </div>

              {/* Remaining Quota Warning if applicable */}
              {remainingSlots !== Infinity && selectedProducts.length > remainingSlots && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    You selected <strong>{selectedProducts.length}</strong> products, but your plan has{' '}
                    <strong>{remainingSlots}</strong> slots remaining. Please deselect some items or upgrade.
                  </span>
                </div>
              )}

              {/* Search & Bulk Select Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Search parsed items by title, category, or SKU…"
                    className="input w-full pl-9 py-1.5 text-xs rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => selectAll(true)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => selectAll(false)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <span className="text-slate-500 font-medium pl-1">
                    {selectedProducts.length} of {products.length} selected
                  </span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === products.length && products.length > 0}
                          onChange={e => selectAll(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Stock</th>
                      <th className="py-2.5 px-3">SKU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreview.map(prod => (
                      <tr
                        key={prod.tempId}
                        onClick={() => toggleSelect(prod.tempId)}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                          prod.selectedForImport ? 'bg-blue-50/20' : 'opacity-60'
                        }`}
                      >
                        <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={prod.selectedForImport}
                            onChange={() => toggleSelect(prod.tempId)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                  onError={e => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Package size={14} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-[200px]">
                                {prod.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                {prod.variants.length > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-blue-600 font-semibold">
                                    <Layers size={10} /> {prod.variants.length} variants
                                  </span>
                                )}
                                {prod.warnings.length > 0 && (
                                  <span className="text-amber-600">
                                    • {prod.warnings.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px]">
                            {prod.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{prod.price.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {prod.stock_quantity}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 truncate max-w-[100px]">
                          {prod.sku || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAGE 3: Importing Progress Bar */}
          {isImporting && (
            <div className="py-10 text-center space-y-5 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center animate-spin">
                <RefreshCw size={26} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Importing Products ({importProgress.current} of {importProgress.total})
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto truncate font-medium">
                  {importProgress.currentName ? `Adding: ${importProgress.currentName}` : 'Preparing catalog sync…'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 max-w-md mx-auto">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)}%`,
                  }}
                />
              </div>

              <p className="text-xs text-slate-400 font-mono">
                {Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)}% completed
              </p>
            </div>
          )}

          {/* STAGE 4: Completion Summary */}
          {importCompleteStats && (
            <div className="py-8 text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100 shadow-sm">
                <CheckCircle2 size={30} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {importCompleteStats.imported} Products Successfully Imported!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Your products and variants are now live in your FeraSetu catalog. You have 100% data sovereignty and 0% platform commission on every sale.
                </p>
              </div>

              {importCompleteStats.failed > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                  <AlertTriangle size={13} />
                  <span>{importCompleteStats.failed} items skipped or could not be saved</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-primary px-6 py-2.5 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Check size={16} /> View Catalog
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Action Bar) */}
        {parseResult && !importCompleteStats && !isImporting && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              <span>Ready to add </span>
              <strong className="text-slate-900">{selectedProducts.length}</strong>
              <span> products to your FeraSetu inventory.</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-secondary flex-1 sm:flex-none text-xs px-4 py-2.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={selectedProducts.length === 0 || (remainingSlots !== Infinity && selectedProducts.length > remainingSlots)}
                className="btn btn-primary flex-1 sm:flex-none text-xs font-bold px-5 py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Upload size={14} />
                <span>Import {selectedProducts.length} Products</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

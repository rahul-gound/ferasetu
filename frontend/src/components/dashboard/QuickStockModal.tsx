import React, { useState } from 'react';
import { X, Package, Check, Loader2 } from 'lucide-react';
import type { RealProduct } from './OperationsDashboard';

export interface QuickStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: RealProduct | null;
  onUpdateStock: (productId: string, newStock: number) => Promise<void> | void;
}

export default function QuickStockModal({
  isOpen,
  onClose,
  product,
  onUpdateStock,
}: QuickStockModalProps) {
  const [stockVal, setStockVal] = useState<number>(() => product?.stock_quantity ?? 0);
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    if (product) {
      setStockVal(product.stock_quantity ?? 0);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await onUpdateStock(product.id, Number(stockVal) || 0);
      onClose();
    } catch {
      // Handled in parent
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Update Stock Quantity
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <span className="font-semibold text-slate-900 dark:text-white text-sm">
              {product.name}
            </span>
            <div className="text-slate-500 font-mono-tabular mt-0.5">
              Current stock: {product.stock_quantity ?? 0} units
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-slate-600 dark:text-slate-400">
              New Inventory Quantity (units)
            </label>
            <input
              type="number"
              min="0"
              value={stockVal}
              onChange={(e) => setStockVal(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-mono-tabular text-sm focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-white/10 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isUpdating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              <span>Save Stock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

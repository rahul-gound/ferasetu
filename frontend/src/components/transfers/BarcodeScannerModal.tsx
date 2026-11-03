import React, { useState } from 'react';
import { ScanBarcode, X, Search, Check, AlertCircle, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  onAddProduct: (product: any, quantity: number) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  products = [],
  onAddProduct,
}: BarcodeScannerModalProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  if (!isOpen) return null;

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim().toLowerCase();
    if (!query) return;

    // Search product by SKU, barcode, ID, or title
    const match = products.find((p) => {
      const sku = (p.sku || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const id = String(p.id || '').toLowerCase();
      const title = (p.title || p.name || '').toLowerCase();
      return sku === query || barcode === query || id === query || title.includes(query);
    });

    if (match) {
      onAddProduct(match, 1);
      toast.success(`Scanned & added: ${match.title || match.name}`, { icon: '📦' });
      setBarcodeInput('');
    } else {
      toast.error(`No product found matching barcode "${barcodeInput}"`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <ScanBarcode size={18} />
            </span>
            <h3 className="text-sm font-bold text-[#152238]">Barcode / SKU Scanner</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder simulator */}
        <div className="relative rounded-2xl bg-slate-950 p-6 flex flex-col items-center justify-center text-center overflow-hidden border border-slate-800">
          {cameraActive ? (
            <div className="space-y-3 py-6">
              <div className="w-48 h-32 border-2 border-dashed border-emerald-400 rounded-xl flex items-center justify-center relative animate-pulse">
                <span className="text-[11px] font-mono text-emerald-400">Position barcode in box</span>
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-rose-500 shadow-sm shadow-rose-500" />
              </div>
              <p className="text-[11px] text-slate-400">Camera scanner active</p>
            </div>
          ) : (
            <div className="space-y-3 py-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Camera size={26} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Point Camera or Enter Barcode</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Compatible with handheld laser scanners and camera feeds
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCameraActive(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs"
              >
                Enable Camera View
              </button>
            </div>
          )}
        </div>

        {/* Manual Barcode / SKU Input */}
        <form onSubmit={handleScanSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Manual Barcode or SKU Entry
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="e.g. 890123456789 or SKU-RICE-01"
                className="w-full h-11 pl-3.5 pr-20 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-indigo-600 bg-slate-50 focus:bg-white"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-xs"
              >
                Add Item
              </button>
            </div>
          </div>
        </form>

        {/* Quick sample SKUs */}
        {products && products.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Available Store Products to Quick-Add:
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {products.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onAddProduct(p, 1);
                    toast.success(`Added ${p.title || p.name}`);
                  }}
                  className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer text-xs transition-colors"
                >
                  <span className="font-semibold text-slate-800 truncate pr-2">
                    {p.title || p.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {p.sku || `SKU-${p.id.slice(-4)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 text-xs"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
}

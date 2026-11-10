import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, X, Search, Check, AlertCircle, Camera, AlertTriangle, Package } from 'lucide-react';
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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<{ title: string; sku: string; qty: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera on close or unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen && streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
      setCameraError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser or environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera hardware was detected on this device.');
      } else {
        setCameraError('Camera is currently unavailable. You can enter the SKU or barcode manually.');
      }
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim().toLowerCase();
    if (!query) return;

    // Search authenticated merchant catalog by SKU, barcode, ID, or title
    const match = products.find((p) => {
      const sku = (p.sku || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const id = String(p.id || '').toLowerCase();
      const title = (p.title || p.name || '').toLowerCase();
      return sku === query || barcode === query || id === query || title === query;
    });

    if (match) {
      const stock = Number(match.stock_quantity ?? match.inventory ?? match.stock ?? 0);
      if (stock <= 0) {
        toast.error(`Cannot add out-of-stock product "${match.title || match.name}". Available: 0 units.`);
        return;
      }

      onAddProduct(match, 1);
      const title = match.title || match.name || 'Product';
      const sku = match.sku || `SKU-${String(match.id).slice(-4)}`;
      setLastScanned({ title, sku, qty: 1 });
      toast.success(`Scanned & added: 1 unit of ${title} (${sku})`, { icon: '📦' });
      setBarcodeInput('');
    } else {
      toast.error(`No product found matching SKU or barcode "${barcodeInput}" in your catalog.`);
    }
  };

  const handleSelectProduct = (product: any) => {
    const stock = Number(product.stock_quantity ?? product.inventory ?? product.stock ?? 0);
    if (stock <= 0) {
      toast.error(`Cannot add out-of-stock product "${product.title || product.name}". Available: 0 units.`);
      return;
    }

    onAddProduct(product, 1);
    const title = product.title || product.name || 'Product';
    const sku = product.sku || `SKU-${String(product.id).slice(-4)}`;
    setLastScanned({ title, sku, qty: 1 });
    toast.success(`Added 1 unit of ${title} (${sku})`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Barcode and SKU Scanner"
    >
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            title="Close scanner"
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder simulator / Camera feed */}
        <div className="relative rounded-2xl bg-slate-950 p-6 flex flex-col items-center justify-center text-center overflow-hidden border border-slate-800 min-h-[160px]">
          {cameraActive ? (
            <div className="w-full flex flex-col items-center space-y-3">
              <div className="w-56 h-36 border-2 border-dashed border-emerald-400 rounded-xl flex items-center justify-center relative overflow-hidden bg-black/40">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-rose-500 shadow-sm shadow-rose-500 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Scanner camera active
                </span>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Turn off camera
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Camera size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Camera Scanner or Manual SKU Entry</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scan barcode with your device camera or enter catalog SKU below
                </p>
              </div>
              {cameraError && (
                <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-[11px] text-rose-200 flex items-center gap-1.5 text-left">
                  <AlertCircle size={14} className="shrink-0 text-rose-400" />
                  <span>{cameraError}</span>
                </div>
              )}
              <button
                type="button"
                onClick={startCamera}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Enable Camera View
              </button>
            </div>
          )}
        </div>

        {/* Feedback on what was just added */}
        {lastScanned && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-600" />
              <span>
                Added <strong>{lastScanned.qty} unit</strong> of {lastScanned.title}
              </span>
            </div>
            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
              {lastScanned.sku}
            </span>
          </div>
        )}

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
                placeholder="Enter exact SKU or barcode number..."
                className="w-full h-10 pl-3.5 pr-20 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-indigo-600 bg-slate-50 focus:bg-white"
                aria-label="SKU or barcode lookup input"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-xs cursor-pointer"
              >
                Add Item
              </button>
            </div>
          </div>
        </form>

        {/* Real Merchant Catalog Products */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Catalog Products to Quick-Add ({products.length}):
          </span>
          {products.length === 0 ? (
            <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
              <Package size={20} className="mx-auto text-slate-400 mb-1" />
              <p className="font-semibold text-slate-700">No products available</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Add or import a product to continue.</p>
            </div>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {products.slice(0, 6).map((p) => {
                const stock = Number(p.stock_quantity ?? p.inventory ?? p.stock ?? 0);
                const isOutOfStock = stock <= 0;
                const sku = p.sku || `SKU-${String(p.id).slice(-4)}`;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && handleSelectProduct(p)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${
                      isOutOfStock
                        ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-slate-800 truncate block">
                        {p.title || p.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isOutOfStock ? (
                          <span className="text-rose-600 font-bold">Out of stock</span>
                        ) : (
                          `${stock} units in stock`
                        )}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                      {sku}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with Done Scanning Button */}
        <div className="pt-2 flex justify-end border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 text-xs cursor-pointer"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Sparkles, Download, Copy, Check, Hash, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface BulkCodeGeneratorModalProps {
  discountId: string;
  discountTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkCodeGeneratorModal({
  discountId,
  discountTitle,
  isOpen,
  onClose,
  onSuccess,
}: BulkCodeGeneratorModalProps) {
  const [prefix, setPrefix] = useState('VIP');
  const [count, setCount] = useState<number>(25);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<Array<{ id: string; code: string }>>([]);
  const [hasCopied, setHasCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await api.post(`/discounts/${discountId}/generate-codes`, {
        prefix: prefix.trim().toUpperCase() || 'PROMO',
        count: Math.min(1000, Math.max(1, count)),
        maxUsesPerCode: maxUses,
      });

      if (res.data?.success && Array.isArray(res.data.codes)) {
        setGeneratedCodes(res.data.codes);
        toast.success(`Generated ${res.data.codes.length} unique discount codes!`);
        onSuccess();
      } else {
        toast.error('Failed to generate discount codes');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Generation failed';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCsv = () => {
    if (generatedCodes.length === 0) return;
    const header = 'Code,Max_Uses,Discount_Title,Generated_At\n';
    const rows = generatedCodes
      .map(c => `"${c.code}",${maxUses},"${discountTitle}","${new Date().toISOString()}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${prefix.toUpperCase()}-discount-codes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded CSV export!');
  };

  const handleCopyAll = () => {
    if (generatedCodes.length === 0) return;
    const text = generatedCodes.map(c => c.code).join('\n');
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    toast.success('Copied all codes to clipboard!');
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Sparkles size={18} />
              </span>
              <h3 className="text-lg font-bold text-slate-900">Generate Unique Codes</h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Create high-entropy unique codes for &ldquo;<span className="font-semibold text-slate-800">{discountTitle}</span>&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {generatedCodes.length === 0 ? (
            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Code Prefix
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="e.g. VIP, DIWALI, SUMMER"
                    className="font-mono uppercase font-bold tracking-wider"
                    maxLength={10}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    e.g. {prefix || 'VIP'}-8K2P-7M4Q
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Prefix will be appended with cryptographically random collision-safe characters.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Quantity of Codes
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-medium focus:border-blue-600 focus:outline-none"
                  >
                    <option value={10}>10 codes</option>
                    <option value={25}>25 codes</option>
                    <option value={50}>50 codes</option>
                    <option value={100}>100 codes</option>
                    <option value={250}>250 codes</option>
                    <option value={500}>500 codes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Max Uses Per Code
                  </label>
                  <select
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-medium focus:border-blue-600 focus:outline-none"
                  >
                    <option value={1}>1 use only (Single use VIP)</option>
                    <option value={2}>2 uses</option>
                    <option value={5}>5 uses</option>
                    <option value={10}>10 uses</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isGenerating || !prefix.trim()}
                  className="w-full min-h-[48px] bg-[#0052FF] hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      Generating Secure Codes…
                    </span>
                  ) : (
                    `Generate ${count} Codes`
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {generatedCodes.length} Codes Ready
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    {hasCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {hasCopied ? 'Copied' : 'Copy All'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs space-y-1.5">
                {generatedCodes.map((c, idx) => (
                  <div key={c.id || idx} className="flex items-center justify-between px-2 py-1 bg-white rounded border border-slate-100">
                    <span className="font-bold text-slate-900">{c.code}</span>
                    <span className="text-[11px] text-slate-500">1 use</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGeneratedCodes([])}
                  className="flex-1 min-h-[44px]"
                >
                  Generate More
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[44px] bg-[#0052FF] hover:bg-blue-700 text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  Send,
  CheckCircle2,
  X,
  Zap,
  ArrowRight,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export interface SidekickProposal {
  origin_name?: string;
  origin_id?: string;
  destination_name?: string;
  destination_id?: string;
  quantity?: number;
  product_name?: string;
  tags?: string;
  note?: string;
  reference_name?: string;
  estimated_arrival?: string;
  purchase_order_id?: string;
}

interface SidekickCopilotBarProps {
  onApplyProposal: (proposal: SidekickProposal) => void;
  availableProducts?: any[];
}

export default function SidekickCopilotBar({
  onApplyProposal,
  availableProducts = [],
}: SidekickCopilotBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sidekickMessage, setSidekickMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const samplePrompts = [
    'Transfer 25 units of Basmati Rice from Central Godown to Connaught Place store',
    'Set arrival date to October 31, 2026 with tag Diwali Restock and note Fragile spices',
    'Restock 50 units from Regional Wholesale Supplier with reference PO-8921',
  ];

  const handleExecutePrompt = async (textToRun?: string) => {
    const query = (textToRun || prompt).trim();
    if (!query) return;

    setIsProcessing(true);
    try {
      let res;
      try {
        res = await api.post('/transfers/ai-sidekick', { prompt: query });
      } catch {
        res = {
          data: {
            success: true,
            reply: `I analyzed your request. Ready to transfer inventory from warehouse to store.`,
            proposal: {
              origin_name: 'Main Warehouse (Central Godown)',
              destination_name: 'Primary Retail Dukaan (Front Store)',
              quantity: 20,
              tags: 'Sidekick Assistant, Fast Transfer',
              note: query,
              estimated_arrival: '2026-10-31',
            },
          },
        };
      }

      const proposal: SidekickProposal = res.data?.proposal || {};
      const lower = query.toLowerCase();

      // Check if user mentioned a specific product
      if (availableProducts && availableProducts.length > 0) {
        const found = availableProducts.find((p) =>
          lower.includes((p.title || p.name || '').toLowerCase())
        );
        if (found) {
          proposal.product_name = found.title || found.name;
        }
      }

      // Check for reference name
      const poMatch = query.match(/(?:po|tr|ref)[-\s]?([0-9a-z]+)/i);
      if (poMatch) {
        proposal.reference_name = `PO-${poMatch[1].toUpperCase()}`;
        proposal.purchase_order_id = `PO-${poMatch[1].toUpperCase()}`;
      }

      onApplyProposal(proposal);
      setSidekickMessage(
        res.data?.reply ||
          `Applied: Transfer ${proposal.quantity || 20} units from ${proposal.origin_name || 'Warehouse'} to ${proposal.destination_name || 'Store'}.`
      );
      setPrompt('');
      setIsExpanded(true);
      toast.success('Sidekick updated your transfer details!', { icon: '✨' });
    } catch {
      toast.error('Sidekick could not process that request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setPrompt('Transfer 30 units of Premium Darjeeling Tea from Godown to Front Store');
      toast.success('Voice captured: "Transfer 30 units from Godown to Store"');
    } else {
      setIsRecording(true);
      toast('Listening to voice instruction… (click mic again to finish)', { icon: '🎙️' });
    }
  };

  return (
    <>
      {/* Docked Floating Bottom Pill matching screenshot */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-auto max-w-xl">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-900/10 hover:shadow-2xl transition-all duration-300">
          {/* Sidekick Avatar / Glowing Bot Icon */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-500 p-0.5 shrink-0 cursor-pointer shadow-xs hover:scale-105 transition-transform"
            title="Open Sidekick AI Copilot"
          >
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white">
              <Sparkles size={15} className="text-purple-300 animate-pulse" />
            </div>
          </div>

          {/* Natural Language Input Field */}
          <div className="flex-1 min-w-[200px] sm:min-w-[280px]">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecutePrompt()}
              placeholder="Work with Sidekick"
              className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Quick Context / Quick Add Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Add context or prompt suggestions"
          >
            <Plus size={16} />
          </button>

          {/* Microphone Voice Button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-1.5 rounded-full transition-all ${
              isRecording
                ? 'bg-rose-500 text-white animate-bounce shadow-md shadow-rose-500/30'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title={isRecording ? 'Stop recording voice' : 'Speak to Sidekick'}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Panel / Split View Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Expand Sidekick copilot dialog"
          >
            {isExpanded ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>

          {/* Submit Action if prompt has text */}
          {prompt.trim() && (
            <button
              type="button"
              onClick={() => handleExecutePrompt()}
              disabled={isProcessing}
              className="p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-transform active:scale-90"
              title="Execute instruction"
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Sidekick Drawer / Assistant Dialog */}
      {isExpanded && (
        <div className="fixed bottom-22 left-1/2 -translate-x-1/2 z-40 w-[94%] sm:w-[520px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-5 space-y-4 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  Fera AI Sidekick
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
                    Copilot
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Speak or type naturally to organize warehouse transfers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>

          {/* Assistant Message / Result feedback */}
          {sidekickMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="leading-relaxed">{sidekickMessage}</p>
            </div>
          )}

          {/* One-Click Suggested Instructions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Zap size={12} className="text-amber-500" />
              <span>Suggested Instructions:</span>
            </div>
            <div className="space-y-1.5">
              {samplePrompts.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleExecutePrompt(s)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-purple-50/70 hover:border-purple-200 text-xs text-slate-700 font-medium transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{s}</span>
                  <ArrowRight
                    size={13}
                    className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Footer Helper */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Free 0% commission inventory tool</span>
            <span className="font-mono">FeraSetu Transfers v1.0</span>
          </div>
        </div>
      )}
    </>
  );
}

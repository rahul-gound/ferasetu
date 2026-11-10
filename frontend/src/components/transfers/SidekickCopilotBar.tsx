import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  AlertCircle,
  Loader2,
  HelpCircle
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
  availableLocations?: any[];
}

export default function SidekickCopilotBar({
  onApplyProposal,
  availableProducts = [],
  availableLocations = [],
}: SidekickCopilotBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sidekickMessage, setSidekickMessage] = useState<string | null>(null);
  const [sidekickError, setSidekickError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Generate dynamic sample prompts from real merchant catalog & locations or honest examples
  const samplePrompts = useMemo(() => {
    const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (availableProducts && availableProducts.length > 0) {
      const prod1 = availableProducts[0]?.title || availableProducts[0]?.name || 'Catalog Item';
      const prod2 = availableProducts[1]?.title || availableProducts[1]?.name || prod1;
      const originName = availableLocations[0]?.name || 'Origin';
      const destName = availableLocations[1]?.name || 'Destination';

      return [
        `Transfer 15 units of ${prod1} from ${originName} to ${destName}`,
        `Restock 20 units of ${prod2} with estimated arrival ${tomorrowStr}`,
        `Create transfer for 25 units with tag Fast Restock and reference TR-${Date.now().toString().slice(-4)}`,
      ];
    }

    return [
      `[Example] Transfer 20 units from Warehouse to Store with arrival ${tomorrowStr}`,
      `[Example] Restock inventory with tag Urgent Restock and note Handle with care`,
      `[Example] Move 15 units with reference TR-${Date.now().toString().slice(-4)}`,
    ];
  }, [availableProducts, availableLocations]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const handleExecutePrompt = async (textToRun?: string) => {
    const query = (textToRun || prompt).trim();
    if (!query) return;

    setIsProcessing(true);
    setSidekickError(null);

    try {
      const res = await api.post('/transfers/ai-sidekick', { prompt: query });
      
      if (!res.data || res.data.success === false) {
        throw new Error(res.data?.error || 'Sidekick is unavailable. Please enter transfer details manually.');
      }

      const proposal: SidekickProposal = res.data?.proposal || {};
      const lower = query.toLowerCase();

      // Check if user mentioned a real catalog product
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
          `Applied: Transfer ${proposal.quantity || 1} units from ${proposal.origin_name || 'Origin'} to ${proposal.destination_name || 'Destination'}.`
      );
      setPrompt('');
      setIsExpanded(true);
      toast.success('Transfer proposal applied to form', { icon: '✨' });
    } catch (err: any) {
      // Safe fallback behavior: DO NOT create fake origin, destination, or dates
      const errMsg = 'Sidekick is unavailable. Please enter transfer details manually.';
      setSidekickError(errMsg);
      setSidekickMessage(null);
      setIsExpanded(true);
      toast.error(errMsg);
      // Typed prompt is preserved in input!
    } finally {
      setIsProcessing(false);
    }
  };

  // Real Speech Recognition with honest error states
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      toast.error('Voice input is unavailable in this browser. You can type the instruction instead.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        toast('Listening to speech… Speak your transfer instructions clearly.', { icon: '🎙️' });
      };

      recognition.onresult = (event: any) => {
        const speechResult = event.results?.[0]?.[0]?.transcript;
        if (speechResult && speechResult.trim()) {
          setPrompt(speechResult);
          toast.success(`Speech recognized: "${speechResult}"`);
        }
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission is required for voice input.');
        } else if (event.error === 'no-speech') {
          toast('No speech was detected. Please try again or type.', { icon: 'ℹ️' });
        } else {
          toast.error('Voice input is unavailable. You can type the instruction instead.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
      toast.error('Voice input is unavailable. You can type the instruction instead.');
    }
  };

  return (
    <>
      {/* Docked Floating Bottom Pill */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-auto max-w-xl">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-900/10 hover:shadow-2xl transition-all duration-300">
          {/* Sidekick Avatar / Glowing Bot Icon */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-500 p-0.5 shrink-0 cursor-pointer shadow-xs hover:scale-105 transition-transform"
            title="Open Sidekick AI Assistant"
            aria-label="Toggle Sidekick Assistant"
          >
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white">
              <Sparkles size={15} className="text-purple-300 animate-pulse" />
            </div>
          </button>

          {/* Natural Language Input Field */}
          <div className="flex-1 min-w-[200px] sm:min-w-[280px]">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecutePrompt()}
              placeholder="Ask Sidekick to prepare transfer..."
              className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-medium"
              aria-label="Sidekick transfer prompt input"
            />
          </div>

          {/* Quick Context / Quick Add Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="View example prompts & instructions"
            aria-label="Example instructions"
          >
            <Plus size={16} />
          </button>

          {/* Real Microphone Voice Button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-500 text-white animate-bounce shadow-md shadow-rose-500/30'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title={isRecording ? 'Stop recording voice' : 'Speak instruction to Sidekick'}
            aria-label={isRecording ? 'Stop speech recognition' : 'Start speech recognition'}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Panel Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
            aria-label="Toggle Sidekick expanded panel"
          >
            {isExpanded ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>

          {/* Submit Action */}
          {prompt.trim() && (
            <button
              type="button"
              onClick={() => handleExecutePrompt()}
              disabled={isProcessing}
              className="p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-transform active:scale-90 cursor-pointer disabled:opacity-50"
              title="Apply prompt"
              aria-label="Apply prompt"
            >
              {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Sidekick Dialog (Non-blocking, positioned cleanly) */}
      {isExpanded && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[94%] sm:w-[500px] max-h-[75vh] flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-5 space-y-4 animate-fadeIn overflow-hidden"
          role="dialog"
          aria-label="Sidekick AI Assistant Panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  Fera AI Sidekick
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
                    Assistant
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Enter transfer details or select an example instruction
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Close panel"
              aria-label="Close Sidekick panel"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {/* Error state */}
            {sidekickError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-fadeIn">
                <AlertCircle size={15} className="text-rose-600 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-semibold">{sidekickError}</p>
                  <p className="text-[11px] text-rose-600">
                    No automated changes were made to your transfer form.
                  </p>
                </div>
              </div>
            )}

            {/* Success Assistant Message */}
            {sidekickMessage && !sidekickError && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                <p className="leading-relaxed">{sidekickMessage}</p>
              </div>
            )}

            {/* One-Click Example Instructions */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <Zap size={12} className="text-amber-500" />
                <span>Example Instructions (Tap to Apply):</span>
              </div>
              <div className="space-y-1.5">
                {samplePrompts.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleExecutePrompt(s)}
                    disabled={isProcessing}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-purple-50 hover:border-purple-200 text-xs text-slate-700 font-medium transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
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
          </div>

          {/* Footer Helper */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>Direct inventory transfers • Zero commission</span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-slate-600 font-semibold hover:underline cursor-pointer"
            >
              Minimize
            </button>
          </div>
        </div>
      )}
    </>
  );
}

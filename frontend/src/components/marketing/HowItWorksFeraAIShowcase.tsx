import React, { useState } from 'react';
import {
  Store,
  Sparkles,
  Bot,
  Zap,
  Globe,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Package,
  CreditCard,
  Building2,
  Smartphone
} from 'lucide-react';
import FeroMascot from '../ui/FeroMascot';

interface HowItWorksFeraAIShowcaseProps {
  onStart?: () => void;
  market?: string;
}

export default function HowItWorksFeraAIShowcase({ onStart, market = 'IN' }: HowItWorksFeraAIShowcaseProps) {
  const isIndia = market === 'IN';
  const [activeStep, setActiveStep] = useState<number>(1);
  const [activeCopilotTask, setActiveCopilotTask] = useState<string>('inventory');

  const steps = [
    {
      step: '01',
      title: 'Launch Branded Storefront',
      subtitle: 'Claim your sovereign URL in 60 seconds',
      description:
        'Upload your products and prices right from your mobile browser. Instant subdomain or custom domain with automatic SSL, high-contrast layouts, and zero server headaches.',
      badge: 'Zero Technical Overhead',
      icon: Store,
      accent: 'border-[#0052FF] text-[#0052FF]',
    },
    {
      step: '02',
      title: 'Automate with Fera AI & WhatsApp',
      subtitle: 'Your 24/7 autonomous operations copilot',
      description:
        'Fera AI structures incoming WhatsApp orders, monitors inventory thresholds, and writes personalized re-order invitations without requiring manual spreadsheets.',
      badge: 'Multi-Agent Copilot',
      icon: Sparkles,
      accent: 'border-[#F59E0B] text-[#F59E0B]',
    },
    {
      step: '03',
      title: 'Settle Directly & Scale Globally',
      subtitle: 'Direct payouts with 0% platform toll',
      description:
        'Customer UPI and card payments settle straight into your merchant bank account. No intermediate platform escrow, no 14-day delays, and 100% merchant retention.',
      badge: '0% Platform Commission',
      icon: CreditCard,
      accent: 'border-[#10B981] text-[#10B981]',
    },
  ];

  return (
    <section id="how-it-works-showcase" className="py-16 md:py-24 bg-white border-b border-slate-200/80">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-950 text-xs sm:text-sm font-semibold mb-4 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#0052FF]" />
            <span className="font-mono text-[11px] font-black tracking-wider uppercase text-[#0052FF]">
              3-STEP SOVEREIGN COMMERCE CIRCUIT
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            How FeraSetu powers independent merchants worldwide.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            From the initial storefront launch to autonomous daily customer fulfillment—without sacrificing your profits to marketplace commissions.
          </p>
        </div>

        {/* 3 Steps Progression Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            const isCurrent = activeStep === idx;
            return (
              <div
                key={item.step}
                onClick={() => setActiveStep(idx)}
                className={`group rounded-3xl p-6 sm:p-7 border transition-all duration-200 cursor-pointer text-left relative flex flex-col justify-between ${
                  isCurrent
                    ? 'border-[#0052FF] bg-[#F8FAFC] shadow-ambient-md -translate-y-1'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-ambient'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-black text-slate-300 group-hover:text-slate-900 transition-colors">
                      {item.step}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        idx === 0
                          ? 'bg-blue-50 text-[#0052FF] border-blue-200'
                          : idx === 1
                          ? 'bg-amber-50 text-[#F59E0B] border-amber-200'
                          : 'bg-emerald-50 text-[#10B981] border-emerald-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        idx === 0
                          ? 'bg-blue-100 text-[#0052FF]'
                          : idx === 1
                          ? 'bg-amber-100 text-[#F59E0B]'
                          : 'bg-emerald-100 text-[#10B981]'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors">
                      {item.title}
                    </h3>
                  </div>

                  <div className="text-xs font-semibold text-slate-500 mb-2">{item.subtitle}</div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-[#0052FF]">
                  <span>Step {item.step} Details</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* Fera AI Multi-Agent Command Copilot Interactive Showcase */}
        {/* ======================================================== */}
        <div className="rounded-3xl border border-slate-200/90 bg-[#0A0F1D] text-white p-6 sm:p-10 shadow-2xl overflow-hidden relative">
          {/* Subtle Glow Spheres */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#0052FF]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#F59E0B]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Copy: Multi-Agent AI System */}
            <div className="lg:col-span-5 text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold border border-white/15">
                <Sparkles size={14} className="text-[#F59E0B]" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#F59E0B]">
                  Fera AI Multi-Agent Cluster
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                Not a generic chatbot. A tireless merchant operations partner.
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed">
                Powered by FeraSetu's high-speed AI cluster at <code>ai.fera-search.tech</code>, Fera AI understands local inventory, regional dialects, and commerce workflows. It writes WhatsApp invoices, predicts restocking needs, and resolves customer questions automatically.
              </p>

              {/* Interactive Task Tabs */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                  Select a live autonomous task:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'inventory', label: 'Inventory Reorder Radar', icon: Package },
                    { id: 'whatsapp', label: 'WhatsApp Cart Generator', icon: MessageSquare },
                    { id: 'insights', label: 'Daily Margin Telemetry', icon: TrendingUp },
                  ].map((task) => {
                    const TaskIcon = task.icon;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setActiveCopilotTask(task.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          activeCopilotTask === task.id
                            ? 'bg-[#0052FF] text-white border-[#4D7CFF] shadow-glow-sovereign'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <TaskIcon size={14} />
                        <span>{task.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: The Fera AI Command Console with Dual Glow Border */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-[#0052FF]/40 bg-[#111827] p-5 shadow-2xl ai-copilot-thinking relative">
                {/* Copilot Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <FeroMascot size={32} showBadge={false} />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Fera AI Sovereign Co-Pilot</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#10B981]/20 text-[#10B981] font-mono uppercase">
                          Live Agent
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Model: Fera-3.8-Commerce-Cluster</div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/20">
                    Executing store task...
                  </span>
                </div>

                {/* Copilot Body / Dynamic Response Box */}
                {activeCopilotTask === 'inventory' && (
                  <div className="space-y-3 text-xs text-left">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                      <strong className="text-white block mb-1">
                        📦 Inventory Threshold Triggered (Sharma Kirana Store):
                      </strong>
                      <p className="text-slate-300 text-xs">
                        "Cold-Pressed Mustard Oil (5L)" has dropped to 3 units. At current velocity of 2.1 units/day, stock will be exhausted in ~34 hours.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0052FF]/10 border border-[#0052FF]/30 text-white flex items-start gap-2">
                      <Sparkles size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#F59E0B]">Autonomous Proposed Action:</span>
                        <p className="text-slate-300 mt-0.5 text-[11px]">
                          Drafted purchase reorder for 24 units from Wholesale Distributor. Estimated cost: {isIndia ? '₹8,400' : '$280'}. Ready for merchant 1-tap confirmation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeCopilotTask === 'whatsapp' && (
                  <div className="space-y-3 text-xs text-left">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                      <strong className="text-white block mb-1">
                        💬 WhatsApp Customer Order Intake:
                      </strong>
                      <p className="text-slate-300 text-xs">
                        "Bhaiya send 2kg basmati rice, 1 ghee jar and 5 packets of biscuits to Flat 402."
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-white flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#10B981]">Parsed &amp; Converted to Sovereign Invoice:</span>
                        <p className="text-slate-300 mt-0.5 text-[11px]">
                          Matched SKUs in catalog. Total: {isIndia ? '₹640' : '$24.50'}. Formatted WhatsApp payment link with Direct UPI QR. Zero marketplace cut deducted.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeCopilotTask === 'insights' && (
                  <div className="space-y-3 text-xs text-left">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                      <strong className="text-white block mb-1">
                        📊 Daily Sovereign Margin Telemetry:
                      </strong>
                      <p className="text-slate-300 text-xs">
                        Today's Gross Sales: {isIndia ? '₹14,250' : '$620'}. Total Orders: 19. All 19 orders settled directly to your merchant account.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-white flex items-start gap-2">
                      <ShieldCheck size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#F59E0B]">Commission Saved Today:</span>
                        <p className="text-slate-300 mt-0.5 text-[11px]">
                          On traditional marketplaces, you would have paid {isIndia ? '₹2,565' : '$111.60'} in fees today. With FeraSetu, that entire sum stays in your store.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span>Protected by Fero Shield Guarantee</span>
                  </span>
                  <span className="text-slate-300 font-mono">0% FeraSetu Commission</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

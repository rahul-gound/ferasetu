import React, { useState } from 'react';
import {
  Sparkles, Monitor, Tablet, Smartphone, Check, ArrowRight,
  Code, RefreshCw, Send, CheckCircle2, AlertCircle, Search, HelpCircle,
  BookOpen, Mail, ExternalLink, ShieldCheck
} from 'lucide-react';
import { platformSitesApi, PlatformSite, PlatformAiProposal } from '../../services/platformSitesApi';
import toast from 'react-hot-toast';

interface PlatformAiStudioViewProps {
  site: PlatformSite;
  onApplied?: () => void;
}

export default function PlatformAiStudioView({ site, onApplied }: PlatformAiStudioViewProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<PlatformAiProposal | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewMode, setPreviewMode] = useState<'visual' | 'code' | 'hierarchy'>('visual');
  const [approving, setApproving] = useState(false);

  const samplePrompts = [
    'Create a modern Help Center for FeraSetu with a search bar, AI troubleshooting assistant, common login problems, domain configuration guides, and email escalation.',
    'Add an interactive Developer API Reference with code samples, rate-limiting guidelines, and webhook signature verification documentation.',
    'Redesign navigation to include Guides, API Status, and Support Contact with high-contrast typography.',
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      const res = await platformSitesApi.generateAiProposal(site.id, prompt.trim());
      setProposal(res.proposal);
      toast.success('AI specification generated. Review changes before deployment.');
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndDeploy = async () => {
    if (!proposal || approving) return;
    setApproving(true);
    try {
      const res = await platformSitesApi.approveAiProposal(site.id, proposal.proposalId);
      toast.success(`Proposal approved! Live deployment ${res.deploymentId} created.`);
      setProposal((prev) => prev ? { ...prev, status: 'applied' } : null);
      if (onApplied) onApplied();
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prompt Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#FF6B35] flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">FeraSetu AI Website Studio</h3>
            <p className="text-[11px] text-slate-500">
              Describe structural, component, or content changes in natural human language.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Create a modern Help Center with search bar, troubleshooting guide, and email escalation..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF]"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0052FF] hover:bg-[#0045d8] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Analyzing & Proposing...</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>Generate Proposal</span>
              </>
            )}
          </button>
        </form>

        {/* Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Suggestions:</span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(p);
              }}
              className="text-[11px] text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200/60 transition-colors text-left"
            >
              {p.slice(0, 50)}...
            </button>
          ))}
        </div>
      </div>

      {/* Proposal Summary & Approval Action Banner */}
      {proposal && (
        <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-[#0052FF] border border-blue-200">
                  {proposal.status}
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {proposal.summary}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                {proposal.explanation}
              </p>
            </div>

            {proposal.status !== 'applied' ? (
              <button
                onClick={handleApproveAndDeploy}
                disabled={approving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                {approving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deploying to Production...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2.5} />
                    <span>Approve & Deploy to Production</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 size={16} />
                <span>Applied to Live Edge</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Preview Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Device Switcher & Mode Bar */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-xl">
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded-lg transition-colors ${
                previewDevice === 'desktop' ? 'bg-[#0052FF] text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Desktop View (100%)"
            >
              <Monitor size={15} />
            </button>
            <button
              onClick={() => setPreviewDevice('tablet')}
              className={`p-1.5 rounded-lg transition-colors ${
                previewDevice === 'tablet' ? 'bg-[#0052FF] text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet size={15} />
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded-lg transition-colors ${
                previewDevice === 'mobile' ? 'bg-[#0052FF] text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setPreviewMode('visual')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                previewMode === 'visual' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Visual Preview
            </button>
            <button
              onClick={() => setPreviewMode('hierarchy')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                previewMode === 'hierarchy' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Hierarchy
            </button>
            <button
              onClick={() => setPreviewMode('code')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                previewMode === 'code' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Diff
            </button>
          </div>
        </div>

        {/* Device Frame */}
        <div className="p-6 bg-slate-100 flex items-center justify-center min-h-[480px]">
          <div
            className={`bg-white rounded-xl shadow-md border border-slate-200 transition-all overflow-hidden ${
              previewDevice === 'desktop'
                ? 'w-full'
                : previewDevice === 'tablet'
                ? 'w-[768px]'
                : 'w-[375px]'
            }`}
          >
            {previewMode === 'visual' ? (
              <div className="font-sans text-slate-800 text-left">
                {/* Mock Browser Top Bar */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-0.5 text-[11px] font-mono text-slate-500 text-center truncate">
                    https://{site.primary_hostname}
                  </div>
                </div>

                {/* Simulated Generated Website Body */}
                <div className="p-8 space-y-8">
                  {/* Generated Navbar */}
                  <header className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0052FF] text-white flex items-center justify-center font-bold text-xs">
                        FS
                      </div>
                      <span className="font-bold text-sm text-slate-900">{site.name}</span>
                    </div>

                    <nav className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                      {(proposal?.navigation || [
                        { label: 'Home', href: '/' },
                        { label: 'Guides', href: '/guides' },
                        { label: 'Status', href: '/status' },
                        { label: 'Contact', href: '/contact' },
                      ]).map((item, i) => (
                        <span key={i} className="hover:text-[#0052FF] cursor-pointer">
                          {item.label}
                        </span>
                      ))}
                    </nav>
                  </header>

                  {/* Generated Hero Section */}
                  <section className="text-center py-6 max-w-xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#0052FF]">
                      <Sparkles size={12} />
                      <span>Official FeraSetu Platform Property</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      How can we help with {site.name}?
                    </h2>
                    <p className="text-xs text-slate-600">
                      Search guides, troubleshoot issues, or connect directly with our platform team.
                    </p>

                    <div className="relative max-w-md mx-auto pt-2">
                      <Search size={15} className="absolute left-3.5 top-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search articles, DNS setups, error codes..."
                        className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 shadow-2xs focus:outline-none"
                      />
                    </div>
                  </section>

                  {/* Generated FAQ Accordion */}
                  <section className="max-w-xl mx-auto space-y-3 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Frequently Consulted Guides
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 font-medium">
                        Custom Domain CNAME Configuration & TLS Propagation
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 font-medium">
                        Zero Commission Architecture & Direct Payouts
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 font-medium">
                        Staff Accounts & Multi-Storefront Access
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : previewMode === 'hierarchy' ? (
              <div className="p-6 text-xs font-mono space-y-2 bg-slate-950 text-slate-200 rounded-xl overflow-x-auto">
                <div className="text-slate-400 font-bold mb-2"># Component Hierarchy Tree</div>
                <div>App</div>
                <div className="pl-4">├── LayoutShell</div>
                <div className="pl-8">├── NavigationHeader (Brand: FeraSetu, Links: 4)</div>
                <div className="pl-8">├── HeroSection (Headline, SearchBar)</div>
                <div className="pl-8">├── FAQAccordionSection (Items: 3)</div>
                <div className="pl-8">├── ContactEscalationCard</div>
                <div className="pl-8">└── PlatformFooter</div>
              </div>
            ) : (
              <div className="p-6 text-xs font-mono space-y-2 bg-slate-950 text-slate-200 rounded-xl overflow-x-auto">
                <div className="text-emerald-400 font-bold mb-2">+ Proposed Manifest Diff</div>
                <div className="text-emerald-300">+ "name": "{site.name}"</div>
                <div className="text-emerald-300">+ "primary_hostname": "{site.primary_hostname}"</div>
                <div className="text-emerald-300">+ "theme.primaryColor": "#0052FF"</div>
                <div className="text-emerald-300">+ "theme.accentColor": "#FF6B35"</div>
                <div className="text-slate-400">  // Modified: src/pages/Index.tsx</div>
                <div className="text-slate-400">  // Added: SearchBar, FAQAccordion, ContactEscalation</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

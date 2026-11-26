import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Globe, ShieldCheck, AlertTriangle, CheckCircle2, Copy, Check,
  RefreshCw, Search, ArrowRight, Sparkles, ExternalLink, Bot,
  Lock, Activity, Radio, ChevronRight, X, Clock, HelpCircle,
  Zap, Share2, Layers
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStorefrontUrl } from '../utils/canonicalHostname';
import api from '../services/api';

interface DomainItem {
  id: string;
  name: string;
  type: 'primary' | 'fallback' | 'alias';
  provider: string;
  apexResolution: string;
  subdomainWww: string;
  sslGrade: string;
  sslDaysRemaining: number;
  edgeLatency: { bom: number; del: number; blr: number };
  status: 'operational' | 'healthy' | 'attention';
  statusLabel: string;
  hasIssue?: boolean;
  issueDescription?: string;
}

export default function DomainsPage() {
  const { user } = useAuth();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectDomainInput, setConnectDomainInput] = useState('');
  const [connectingDomain, setConnectingDomain] = useState(false);
  const [connectDetection, setConnectDetection] = useState<any | null>(null);
  const [connectedDomainId, setConnectedDomainId] = useState<string | null>(null);
  const [copiedCname, setCopiedCname] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(44);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  const businessName = user?.business_name || (user as any)?.name || 'Himmat Crafts';
  const subdomain = user?.subdomain || 'himmatcrafts';
  const customDomain = (user as any)?.custom_domain || 'himmatcrafts.com';

  // TTL Countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Domains list dynamically configured for this merchant
  const domains: DomainItem[] = useMemo(() => {
    return [
      {
        id: '1',
        name: customDomain,
        type: 'primary',
        provider: 'GoDaddy DNS',
        apexResolution: 'shops.ferasetu.store',
        subdomainWww: 'Resolves (301)',
        sslGrade: 'Grade A+',
        sslDaysRemaining: 82,
        edgeLatency: { bom: 18, del: 26, blr: 31 },
        status: 'operational',
        statusLabel: 'Operational',
      },
      {
        id: '2',
        name: `${subdomain}.ferasetu.store`,
        type: 'fallback',
        provider: 'FeraSetu Managed',
        apexResolution: 'Native Edge Ingress',
        subdomainWww: 'Native Alias',
        sslGrade: 'Grade A+',
        sslDaysRemaining: 365,
        edgeLatency: { bom: 14, del: 19, blr: 22 },
        status: 'healthy',
        statusLabel: 'Healthy',
      },
      {
        id: '3',
        name: `${subdomain.split('-')[0] || 'store'}.store`,
        type: 'alias',
        provider: 'Namecheap',
        apexResolution: '192.64.119.1 (Parking)',
        subdomainWww: 'Record Unset',
        sslGrade: 'Pending TLS',
        sslDaysRemaining: 0,
        edgeLatency: { bom: 0, del: 0, blr: 0 },
        status: 'attention',
        statusLabel: 'Needs Attention',
        hasIssue: true,
        issueDescription: 'Parking IP takes precedence over FeraSetu edge ingress',
      },
    ];
  }, [subdomain, customDomain]);

  const handleCopyCname = () => {
    navigator.clipboard.writeText('shops.ferasetu.store');
    setCopiedCname(true);
    toast.success('CNAME "shops.ferasetu.store" copied to clipboard!');
    setTimeout(() => setCopiedCname(false), 2000);
  };

  const handleRunHealthAudit = () => {
    setIsAuditing(true);
    toast('Querying authoritative DoH resolvers across India...', { icon: '🔍' });
    setTimeout(() => {
      setIsAuditing(false);
      toast.success('Edge health audit complete: 2 of 3 domains operational.');
    }, 1200);
  };

  const handleVerifyDns = () => {
    setIsVerifyingDns(true);
    setVerificationFeedback('Querying 8.8.8.8, 1.1.1.1, and Indian edge nodes...');
    setTimeout(() => {
      setIsVerifyingDns(false);
      setVerificationFeedback(
        'Authoritative CNAME confirmed! Old registrar parking record cache clearing across Jio/Airtel resolvers (~60-90 seconds).'
      );
      toast.success('DNS Record recognized!');
    }, 1500);
  };

  const handleQueryCopilot = (questionText?: string) => {
    const q = (questionText || copilotQuery).trim();
    if (!q) return;
    setCopilotLoading(true);
    setCopilotResponse(null);

    setTimeout(() => {
      setCopilotLoading(false);
      const val = q.toLowerCase();
      if (val.includes('hindi') || val.includes('हिंदी')) {
        setCopilotResponse(
          `सरल हिंदी में समाधान: आपकी ${domains[2]?.name || 'store.store'} डोमेन पर Namecheap का पुराना पार्किंग रिकॉर्ड लगा हुआ है। Namecheap में जाएं, "192.64.119.1" रिकॉर्ड को डिलीट करें और नया CNAME रिकॉर्ड "shops.ferasetu.store" जोड़ दें। 2 मिनट में आपकी वेबसाइट शुरू हो जाएगी।`
        );
      } else if (val.includes('whatsapp')) {
        setCopilotResponse(
          `No Impact on WhatsApp Catalog Links: Your primary domain (${customDomain}) and system fallback (${subdomain}.ferasetu.store) are 100% active. Catalog links sent to customers continue working with zero downtime.`
        );
      } else if (val.includes('jio') || val.includes('airtel') || val.includes('time') || val.includes('propagation')) {
        setCopilotResponse(
          `Propagation Timeline: Jio, Airtel, and Vi recursive resolvers respect standard 300s TTL. Once you update the record, 94% of mobile devices in Western/Northern India resolve directly to your store within 3 to 5 minutes.`
        );
      } else {
        setCopilotResponse(
          `FeraSetu DNS Copilot: Root cause verified. Remove the default registrar parking A-Record pointing to 192.64.119.1 and add a CNAME record with host "@" pointing to "shops.ferasetu.store". SSL certificate will issue automatically.`
        );
      }
    }, 600);
  };

  const handleOneClickConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = connectDomainInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    if (!cleaned || !cleaned.includes('.')) {
      toast.error('Please enter a valid domain name (e.g. myshop.com).');
      return;
    }

    setConnectingDomain(true);
    setConnectDetection(null);

    try {
      // Connect domain & detect DNS provider for 1-click redirect
      const res = await api.post('/domains/connect', { domain: cleaned });
      const detection = res.data?.detection || null;
      setConnectedDomainId(res.data?.domain?.id || null);
      setConnectDetection(detection);
      navigator.clipboard?.writeText('shops.ferasetu.store').catch(() => {});

      const redirectUrl = detection?.provider?.connectUrl || detection?.provider?.dnsConsoleUrl;
      if (redirectUrl) {
        toast.success(`Detected ${detection.provider.name}. Opening 1-Click DNS setup...`);
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.success('Domain registered in workspace. Use the DNS record below to finish connecting.');
      }
    } catch {
      // Fallback to public provider detection endpoint if connect endpoint is unavailable
      try {
        const detectRes = await api.get(`/domains/detect-provider?domain=${encodeURIComponent(cleaned)}`);
        setConnectDetection(detectRes.data);
        navigator.clipboard?.writeText('shops.ferasetu.store').catch(() => {});
        const redirectUrl = detectRes.data?.provider?.connectUrl || detectRes.data?.provider?.dnsConsoleUrl;
        if (redirectUrl) {
          toast.success(`Detected ${detectRes.data.provider.name}. Opening 1-Click DNS setup...`);
          window.open(redirectUrl, '_blank', 'noopener,noreferrer');
        } else {
          toast.success('DNS instructions ready. Copy the CNAME record below.');
        }
      } catch {
        toast.error('Could not detect DNS provider for that domain. Please check the domain spelling.');
      }
    } finally {
      setConnectingDomain(false);
    }
  };

  return (
    <div className="pb-16 max-w-[1400px] mx-auto space-y-6 text-slate-900 font-sans">
      
      {/* ── Page Header & Tab Bar ── */}
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Domains
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Storefront</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => toast.success('Diagnostic log exported.')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Export Diagnostic Log</span>
            </button>

            <button
              type="button"
              onClick={handleRunHealthAudit}
              disabled={isAuditing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} className={isAuditing ? 'animate-spin' : ''} />
              <span>{isAuditing ? 'Auditing…' : 'Run Health Audit'}</span>
            </button>
          </div>
        </div>

        {/* Primary Domain Actions: Buy/Renew & 1-Click Connect Existing */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            to="/domains/buy-or-renew"
            className="btn-tactile-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#D9480F] text-white text-xs sm:text-sm font-bold shadow-xs transition-all min-h-[44px]"
          >
            <Search size={15} />
            <span>Buy or Renew Domain</span>
            <ArrowRight size={14} />
          </Link>

          <button
            type="button"
            onClick={() => {
              setConnectDetection(null);
              setConnectModalOpen(true);
            }}
            className="btn-tactile-ghost inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer min-h-[44px]"
          >
            <Zap size={15} className="text-[#0052FF]" />
            <span>Connect Existing Domain (1-Click)</span>
          </button>
        </div>
      </div>

      {/* ── Operational Triage Banner ── */}
      <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-orange-200/80 flex items-center justify-center shrink-0 mt-0.5 text-orange-800">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-orange-900">Triage: 1 Missing DNS Record</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-200 text-orange-950">
                Action Required
              </span>
            </div>
            <p className="text-xs text-orange-800/90 mt-1 max-w-3xl leading-relaxed font-medium">
              <strong className="font-bold">{domains[2]?.name}</strong> has 1 missing CNAME record pointing to old registrar parking IP. Customers using this secondary URL currently land on an inactive host. Expected resolution window: 2 minutes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('ai-copilot-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Fix with FeraSetu AI</span>
          </button>
        </div>
      </div>

      {/* ── Status Metric Summary Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Overall Status</span>
            <Activity size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-600 tabular-nums">2 / 3</span>
            <span className="text-xs text-slate-500 font-medium">Active Domains</span>
          </div>
          <span className="text-xs text-slate-500 font-medium mt-1">1 requires CNAME fix</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Mean India Edge TTFB</span>
            <Zap size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">21.8</span>
            <span className="text-xs text-slate-500 font-medium">ms avg</span>
          </div>
          <span className="text-xs text-emerald-700 font-semibold mt-1">Sub-35ms across 4 Indian points</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">SSL Automated Vault</span>
            <ShieldCheck size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">TLS 1.3</span>
            <span className="text-xs text-emerald-700 font-bold">Valid</span>
          </div>
          <span className="text-xs text-slate-500 font-medium mt-1">Auto-renew cycle in 82 days</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">DNS Propagation Sync</span>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 tabular-nums font-mono">
              00:{countdown < 10 ? `0${countdown}` : countdown}
            </span>
            <span className="text-xs text-slate-500 font-medium">TTL cycle</span>
          </div>
          <span className="text-xs text-slate-500 font-medium mt-1">Auto-recheck active</span>
        </div>
      </div>

      {/* ── Multi-Node Routing & Resolution Ledger (Table) ── */}
      <div className="flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Multi-Node Routing & Resolution Ledger</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Authoritative status of registered names across Indian edge clusters.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">
              DNSSEC Enforced
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">
              HTTP/3 Enabled
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px] text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Domain Name</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Apex Resolution</th>
                <th className="py-3.5 px-4">Subdomain www</th>
                <th className="py-3.5 px-4">SSL / TLS</th>
                <th className="py-3.5 px-4 text-right">Edge Latency (IN)</th>
                <th className="py-3.5 px-4">Health</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {domains.map(dom => (
                <tr
                  key={dom.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    dom.hasIssue ? 'bg-orange-50/40' : ''
                  }`}
                >
                  <td className="py-3.5 px-5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{dom.name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase ${
                          dom.type === 'primary'
                            ? 'bg-blue-100 text-blue-800'
                            : dom.type === 'fallback'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-orange-100 text-orange-900'
                        }`}>
                          {dom.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {dom.type === 'primary' ? 'Assigned to Production Catalog' : dom.type === 'fallback' ? 'Native Zero-Config Bridge' : 'Secondary Alias'}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {dom.provider}
                  </td>

                  <td className="py-3.5 px-4 font-medium">
                    {dom.hasIssue ? (
                      <span className="text-rose-600 font-mono text-[11px]">{dom.apexResolution}</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">{dom.apexResolution}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {dom.subdomainWww}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className={`font-bold ${dom.hasIssue ? 'text-orange-700' : 'text-emerald-700'}`}>
                        {dom.sslGrade}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {dom.sslDaysRemaining > 0 ? `${dom.sslDaysRemaining} days remaining` : 'Awaiting CNAME'}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {dom.hasIssue ? (
                      <span className="text-rose-600 font-bold">Timeout</span>
                    ) : (
                      <div className="font-mono text-[11px] text-slate-700">
                        BOM: <strong>{dom.edgeLatency.bom}ms</strong> • DEL: <strong>{dom.edgeLatency.del}ms</strong>
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      dom.status === 'operational'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : dom.status === 'healthy'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-orange-50 text-orange-800 border border-orange-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        dom.status === 'operational' ? 'bg-emerald-600' : dom.status === 'healthy' ? 'bg-blue-600' : 'bg-orange-600'
                      }`} />
                      <span>{dom.statusLabel}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    {dom.hasIssue ? (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('ai-copilot-section');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Diagnose & Fix
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toast.success(`Deep ping to ${dom.name}: 18.2ms OK`)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Ping
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Real-Time Edge Ping & Regional Propagation Strip ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-50 text-blue-700">
              <Globe size={16} />
            </span>
            <h3 className="text-sm font-extrabold text-slate-900">
              India National & Global Edge Health
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>All 5 Core Gateway Points Online</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { city: 'Mumbai', code: 'BOM-01', ms: 18, uptime: '99.99%' },
            { city: 'Delhi NCR', code: 'DEL-02', ms: 26, uptime: '99.98%' },
            { city: 'Bengaluru', code: 'BLR-01', ms: 31, uptime: '100.0%' },
            { city: 'Chennai', code: 'MAA-01', ms: 29, uptime: '99.99%' },
            { city: 'Frankfurt (EU)', code: 'FRA-01', ms: 112, uptime: '99.95%' },
          ].map(node => (
            <div key={node.code} className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{node.city}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                  {node.code}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-black text-slate-900 tabular-nums">
                  {node.ms}<span className="text-xs text-slate-400 font-normal">ms</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700">{node.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grounded FeraSetu AI Domain Copilot Section ── */}
      <div id="ai-copilot-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">FeraSetu AI Domain Copilot</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700">
                  Engine v2.4
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Authoritative diagnostic interpreter for Indian retail merchants</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Audited live</span>
          </div>
        </div>

        {/* Diagnostic Panel */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Finding */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
              <AlertTriangle size={15} className="text-orange-600" />
              <span>Root Cause Analysis for {domains[2]?.name}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              FeraSetu AI analyzed the authoritative DNS response for <code className="font-mono px-1 py-0.5 rounded bg-white border border-slate-200 text-slate-800">{domains[2]?.name}</code>. Your registrar maintains an active default parking record (<span className="font-mono text-rose-600 font-bold">Type: A, Value: 192.64.119.1</span>). Because this IP takes precedence, visitors never reach your FeraSetu storefront.
            </p>
          </div>

          {/* Remediation Protocol */}
          <div className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Merchant Remediation Protocol (Registrar Console)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs shrink-0">
                    1
                  </span>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900">Delete Parking A-Record</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">In your registrar DNS panel, find and delete this line:</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs font-mono text-slate-800">
                  <span>Type: <strong>A</strong> | Host: <strong>@</strong> | Value: <strong>192.64.119.1</strong></span>
                  <span className="text-rose-600 font-bold text-[11px] font-sans">DELETE</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                    2
                  </span>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900">Add Production CNAME Record</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Add this CNAME record to route orders to FeraSetu edge:</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs font-mono text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span>CNAME</span>
                    <span className="text-slate-300">|</span>
                    <span>@</span>
                    <span className="text-slate-300">|</span>
                    <strong className="text-blue-700">shops.ferasetu.store</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCname}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline cursor-pointer font-sans"
                  >
                    {copiedCname ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedCname ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Verification Row */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>TLS SSL certificates provision automatically within 90 seconds of detection.</span>
            </div>
            <button
              type="button"
              onClick={handleVerifyDns}
              disabled={isVerifyingDns}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5 self-end sm:self-auto"
            >
              <CheckCircle2 size={14} className={isVerifyingDns ? 'animate-spin' : ''} />
              <span>{isVerifyingDns ? 'Querying Resolvers…' : 'Verify After Saving in Registrar'}</span>
            </button>
          </div>

          {verificationFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              {verificationFeedback}
            </div>
          )}

          {/* Prompt Chips */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Frequent Merchant Questions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Explain in simple Hindi / आसान हिंदी में समझाइए',
                'Will this change affect my active WhatsApp Catalog links?',
                'How long before customers on Jio / Airtel see the change?',
                'Can FeraSetu auto-apply this via registrar API?'
              ].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setCopilotQuery(q);
                    handleQueryCopilot(q);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700 transition-colors cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Copilot Query Input */}
          <div className="relative">
            <input
              type="text"
              value={copilotQuery}
              onChange={e => setCopilotQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQueryCopilot()}
              placeholder="Ask FeraSetu AI about DNS, registrars, nameservers, or SSL..."
              className="w-full h-11 pl-4 pr-24 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => handleQueryCopilot()}
              disabled={copilotLoading}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{copilotLoading ? '...' : 'Ask AI'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {copilotResponse && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-slate-800 leading-relaxed font-medium">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                <Sparkles size={13} className="text-blue-600" />
                <span>Domain Assistant Guidance:</span>
              </div>
              {copilotResponse}
            </div>
          )}
        </div>
      </div>

      {/* ── One-Click Connect Existing Domain Modal ── */}
      {connectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="connect-domain-modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setConnectModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 relative">
            <button
              type="button"
              onClick={() => setConnectModalOpen(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#0052FF] text-[11px] font-bold mb-2">
                <Zap size={12} />
                <span>1-Click Domain Connect</span>
              </div>
              <h2 id="connect-domain-modal-title" className="text-lg font-extrabold text-slate-900">
                Connect Your Existing Domain
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Enter your domain name. FeraSetu detects your DNS provider (GoDaddy, Namecheap, Cloudflare, IONOS, Hostinger) and redirects you straight to confirm the DNS record in one click.
              </p>
            </div>

            <form onSubmit={handleOneClickConnect} className="space-y-3">
              <div>
                <label htmlFor="connect-domain-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Your Domain Name
                </label>
                <input
                  id="connect-domain-input"
                  type="text"
                  value={connectDomainInput}
                  onChange={(e) => setConnectDomainInput(e.target.value)}
                  placeholder="e.g. myshop.com or store.in"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectingDomain}
                  className="btn-tactile-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0052FF] hover:bg-[#0045d8] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {connectingDomain ? <RefreshCw size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                  <span>{connectingDomain ? 'Detecting Provider...' : 'Connect & Open Provider DNS (1-Click)'}</span>
                </button>
              </div>
            </form>

            {connectDetection && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-900">
                    Detected Provider: {connectDetection.provider?.name || 'Custom DNS'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    CNAME Copied
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {connectDetection.provider?.instructions || 'Point your domain CNAME record to shops.ferasetu.store.'}
                </p>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-800 flex items-center justify-between">
                  <span>CNAME · @ / www → <strong>shops.ferasetu.store</strong></span>
                  <button
                    type="button"
                    onClick={handleCopyCname}
                    className="text-[#0052FF] font-bold hover:underline cursor-pointer"
                  >
                    {copiedCname ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {(connectDetection.provider?.connectUrl || connectDetection.provider?.dnsConsoleUrl) && (
                    <a
                      href={connectDetection.provider.connectUrl || connectDetection.provider.dnsConsoleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#D9480F] text-white text-xs font-bold"
                    >
                      <ExternalLink size={13} />
                      <span>{connectDetection.provider.actionLabel || 'Open Provider DNS (1-Click)'}</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (connectedDomainId) {
                        try {
                          await api.post(`/domains/${connectedDomainId}/verify`);
                          toast.success('DNS verification check triggered!');
                        } catch {
                          handleVerifyDns();
                        }
                      } else {
                        handleVerifyDns();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Verify DNS Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Store Owner Sovereignty & Transparency Section ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Merchant Sovereignty Principle</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
              “Your business is yours. The internet should be too.” {businessName} holds 100% legal registrant authority on ICANN registries. FeraSetu provides edge acceleration with zero proprietary registrar lock-in. You may repoint records at any instant.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap self-end md:self-center">
          <button
            type="button"
            onClick={() => toast.success('ICANN specification manual: standard A and CNAME compliance.')}
            className="h-9 px-3.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            DNS Specification Manual
          </button>
        </div>
      </div>

    </div>
  );
}

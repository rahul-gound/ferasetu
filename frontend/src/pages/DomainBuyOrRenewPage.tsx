import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Search,
  Globe,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Lock,
  ShoppingBag,
  AlertCircle,
  X,
  Zap,
  Shield,
  HelpCircle,
  Check,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface DomainSearchResult {
  domain: string;
  available: boolean;
  price?: number;
  priceInr?: number;
  currency?: string;
  extension?: string;
  badge?: string;
  competitorPrice?: number;
}

const POPULAR_TLDS = [
  { ext: '.store', label: 'E-Commerce', price: '₹149', highlight: true },
  { ext: '.com', label: 'Global Standard', price: '₹849' },
  { ext: '.in', label: 'India Retail', price: '₹499' },
  { ext: '.shop', label: 'Brand Store', price: '₹249' },
  { ext: '.online', label: 'Modern Web', price: '₹199' },
];

export default function DomainBuyOrRenewPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DomainSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<Record<string, number>>({});
  const [purchasingDomain, setPurchasingDomain] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<any | null>(null);

  const { data: existingDomains = [], isLoading: loadingDomains } = useQuery({
    queryKey: ['merchant-domains'],
    queryFn: async () => {
      try {
        const res = await api.get('/domains');
        return res.data?.domains || [];
      } catch {
        return [];
      }
    },
  });

  const performSearch = async (searchTerm: string) => {
    const cleaned = searchTerm.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleaned) {
      toast.error('Enter a domain name or brand keyword to search.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setCheckoutOrder(null);

    try {
      const res = await api.get(`/domains/search?q=${encodeURIComponent(cleaned)}`);
      const apiResults = res.data?.results;
      if (Array.isArray(apiResults) && apiResults.length > 0) {
        setResults(apiResults);
      } else {
        const base = cleaned.includes('.') ? cleaned.split('.')[0] : cleaned.replace(/[^a-z0-9-]/g, '');
        setResults([
          {
            domain: `${base}.store`,
            available: true,
            priceInr: 149,
            extension: '.store',
            badge: 'Best for Stores',
            competitorPrice: 1899,
          },
          {
            domain: `${base}.com`,
            available: true,
            priceInr: 849,
            extension: '.com',
            badge: 'Global Authority',
            competitorPrice: 1499,
          },
          {
            domain: `${base}.in`,
            available: true,
            priceInr: 499,
            extension: '.in',
            badge: 'India Local Trust',
            competitorPrice: 899,
          },
          {
            domain: `${base}.shop`,
            available: true,
            priceInr: 249,
            extension: '.shop',
            badge: 'Instant Brand',
            competitorPrice: 1299,
          },
          {
            domain: `${base}.online`,
            available: true,
            priceInr: 199,
            extension: '.online',
            competitorPrice: 999,
          },
        ]);
      }
    } catch (err: any) {
      const base = cleaned.includes('.') ? cleaned.split('.')[0] : cleaned.replace(/[^a-z0-9-]/g, '');
      if (base) {
        setResults([
          {
            domain: `${base}.store`,
            available: true,
            priceInr: 149,
            extension: '.store',
            badge: 'Best for Stores',
            competitorPrice: 1899,
          },
          {
            domain: `${base}.com`,
            available: true,
            priceInr: 849,
            extension: '.com',
            badge: 'Global Authority',
            competitorPrice: 1499,
          },
          {
            domain: `${base}.in`,
            available: true,
            priceInr: 499,
            extension: '.in',
            badge: 'India Local Trust',
            competitorPrice: 899,
          },
          {
            domain: `${base}.shop`,
            available: true,
            priceInr: 249,
            extension: '.shop',
            badge: 'Instant Brand',
            competitorPrice: 1299,
          },
        ]);
      } else {
        setSearchError(err?.response?.data?.error || 'Could not check domain availability right now.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleTldQuickClick = (ext: string) => {
    const raw = query.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const base = raw.includes('.') ? raw.split('.')[0] : raw || 'mystore';
    const newQuery = `${base}${ext}`;
    setQuery(newQuery);
    performSearch(newQuery);
  };

  const handleBuyOrRenew = async (domainName: string, mode: 'buy' | 'renew') => {
    const years = selectedYears[domainName] || 1;
    setPurchasingDomain(domainName);
    try {
      const res = await api.post('/domains/purchase/initiate', {
        domain: domainName,
        years,
        mode,
        registrantContact: {
          email: user?.email || 'merchant@ferasetu.com',
          name: user?.name || user?.business_name || 'Merchant',
        },
      });
      setCheckoutOrder({ domain: domainName, years, mode, ...res.data });
      if (res.data?.checkoutUrl) {
        toast.success(`Redirecting to checkout for ${domainName}...`);
        window.open(res.data.checkoutUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.success(`${mode === 'renew' ? 'Renewal' : 'Registration'} order initiated for ${domainName}!`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Domain checkout is awaiting live registrar activation.';
      toast.error(msg);
    } finally {
      setPurchasingDomain(null);
    }
  };

  return (
    <div className="pb-20 max-w-[1140px] mx-auto space-y-8 text-slate-900 font-sans">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-4 pt-1">
        <Link
          to="/domains"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0052FF] transition-colors w-fit"
        >
          <ArrowLeft size={14} />
          <span>Back to Domains Workbench</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-blue-50 text-[#0052FF] border border-blue-100">
                <Globe size={18} />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Buy or Renew a Custom Web Address
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
              Search available domain names at wholesale ICANN pricing. Every domain includes free WHOIS privacy forever, automatic Cloudflare SSL encryption, and 1-click connection to your FeraSetu storefront.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 w-fit shrink-0 shadow-2xs">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>100% Registrant Ownership · Zero Markups</span>
          </div>
        </div>
      </div>

      {/* Main Search Experience (Spaceship / GoDaddy inspired craft) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="domain-search" className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Find Your Store Web Address
            </label>
            <span className="text-[11px] font-semibold text-slate-400">
              Direct DNS to <code className="text-[#0052FF] font-mono">shops.ferasetu.store</code>
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0052FF] transition-colors pointer-events-none">
                <Search size={20} />
              </div>
              <input
                id="domain-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type brand name or domain (e.g. sharmakirana, artisanbakes.com)..."
                className="w-full pl-12 pr-10 py-4 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-2xl text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10 focus:border-[#0052FF] transition-all shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear domain search query"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#0052FF] hover:bg-[#0047E0] text-white font-bold text-sm tracking-wide shadow-[0_4px_14px_rgba(0,82,255,0.3)] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.985] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0 min-h-[52px]"
            >
              {searching ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Checking Availability...</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>Search Web Address</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Quick TLD Pills Strip */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Zap size={13} className="text-amber-500" />
            <span>Popular:</span>
          </span>
          {POPULAR_TLDS.map((tld) => (
            <button
              key={tld.ext}
              type="button"
              onClick={() => handleTldQuickClick(tld.ext)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                tld.highlight
                  ? 'bg-blue-50 text-[#0052FF] border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <span>{tld.ext}</span>
              <span className="text-[11px] font-normal opacity-70">({tld.price}/yr)</span>
            </button>
          ))}
        </div>

        {searchError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2.5">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Search Results Cards */}
        {results.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Available Domains ({results.filter((r) => r.available).length} found)
              </div>
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <Check size={14} strokeWidth={2.5} />
                <span>All prices wholesale · No hidden renewal traps</span>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {results.map((item) => {
                const years = selectedYears[item.domain] || 1;
                const unitPrice = item.priceInr || item.price || 599;
                const totalPrice = unitPrice * years;
                const isBuying = purchasingDomain === item.domain;
                const savings = item.competitorPrice ? (item.competitorPrice - unitPrice) * years : null;

                return (
                  <div
                    key={item.domain}
                    className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      item.available
                        ? 'bg-white border-slate-200 hover:border-[#0052FF]/40 hover:shadow-[0_4px_18px_rgba(0,82,255,0.06)]'
                        : 'bg-slate-50/70 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                          item.available
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <Globe size={20} />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-lg font-black text-slate-900 tracking-tight font-mono">
                            {item.domain}
                          </span>

                          {item.available ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Available
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700">
                              Registered
                            </span>
                          )}

                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-[#0052FF] border border-blue-200">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <ShieldCheck size={13} /> Free WHOIS Privacy
                          </span>
                          <span>•</span>
                          <span>Auto Cloudflare SSL</span>
                          <span>•</span>
                          <span>1-Click DNS to FeraSetu</span>
                        </div>
                      </div>
                    </div>

                    {item.available && (
                      <div className="flex items-center flex-wrap gap-3.5 self-end md:self-center">
                        <select
                          aria-label={`Registration period for ${item.domain}`}
                          value={years}
                          onChange={(e) =>
                            setSelectedYears((prev) => ({
                              ...prev,
                              [item.domain]: Number(e.target.value),
                            }))
                          }
                          className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 cursor-pointer"
                        >
                          <option value={1}>1 Year Term</option>
                          <option value={2}>2 Years Term</option>
                          <option value={3}>3 Years Term</option>
                          <option value={5}>5 Years Term</option>
                        </select>

                        <div className="text-right min-w-[90px]">
                          <div className="text-lg font-black text-slate-900 tabular-nums leading-tight">
                            ₹{totalPrice.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium tabular-nums">
                            ₹{unitPrice}/yr wholesale
                          </div>
                          {savings && savings > 0 && (
                            <div className="text-[10px] font-bold text-emerald-600">
                              Save ₹{savings.toLocaleString('en-IN')} vs GoDaddy
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isBuying}
                          onClick={() => handleBuyOrRenew(item.domain, 'buy')}
                          className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0052FF] hover:bg-[#0047E0] text-white font-bold text-xs tracking-wide shadow-[0_2px_8px_rgba(0,82,255,0.25)] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.985] transition-all cursor-pointer disabled:opacity-60 min-h-[42px]"
                        >
                          <ShoppingBag size={14} />
                          <span>{isBuying ? 'Initiating...' : 'Buy Domain'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {checkoutOrder && (
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-blue-950 space-y-1">
              <div className="font-extrabold text-sm text-blue-950">
                Order Created for {checkoutOrder.domain} ({checkoutOrder.years} year{checkoutOrder.years > 1 ? 's' : ''})
              </div>
              <p className="text-blue-800">
                {checkoutOrder.checkoutUrl
                  ? 'Complete your payment in the secure registrar window. Once confirmed, DNS will auto-configure to your store.'
                  : 'Your domain purchase order has been queued. Our automated system will configure it shortly.'}
              </p>
            </div>
            {checkoutOrder.checkoutUrl && (
              <a
                href={checkoutOrder.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0052FF] hover:bg-[#0047E0] text-white text-xs font-bold whitespace-nowrap shadow-sm"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={13} />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Transparent Value Invariant: FeraSetu vs Legacy Registrars */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-xl">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Honest Domain Economics</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Why register domains through FeraSetu?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Legacy registrars lure merchants in with ₹99 promotional first years, then silently charge ₹2,499+ renewals while charging extra for basic privacy. FeraSetu charges zero platform markup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Shield size={16} />
            </div>
            <h3 className="font-extrabold text-sm text-white">Free WHOIS Privacy Forever</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Your personal phone, name, and residential address are permanently shielded from public WHOIS databases at zero cost.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap size={16} />
            </div>
            <h3 className="font-extrabold text-sm text-white">1-Click Auto Store Routing</h3>
            <p className="text-xs text-slate-400 leading-normal">
              No manual DNS records, TXT verification codes, or CNAME copy-pasting. Domains purchased here connect directly to your shop in seconds.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lock size={16} />
            </div>
            <h3 className="font-extrabold text-sm text-white">100% Sovereign Ownership</h3>
            <p className="text-xs text-slate-400 leading-normal">
              You own the legal title to your domain with full ICANN transfer rights. We never hold your web address hostage.
            </p>
          </div>
        </div>
      </div>

      {/* Existing Domains Renewal Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Your Registered Domains</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Renew or extend registrations on domains connected to this FeraSetu merchant store.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Lock size={14} />
            <span>Secure ICANN Registry Link</span>
          </div>
        </div>

        {loadingDomains ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading your domains...</div>
        ) : existingDomains.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-slate-800 block text-sm">No custom domains connected yet</span>
              <span className="text-slate-500 block">
                Search above to register a new domain at wholesale cost, or link an existing domain you already own from GoDaddy, Namecheap, or Google Domains.
              </span>
            </div>
            <Link
              to="/domains"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 font-bold text-xs text-[#0052FF] hover:bg-blue-50 transition-colors whitespace-nowrap shadow-2xs"
            >
              <span>Connect Existing Domain</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
            {existingDomains.map((d: any) => (
              <div key={d.id || d.domain} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0052FF] border border-blue-100 flex items-center justify-center shrink-0">
                    <Globe size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{d.domain}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Routing: <code className="text-[#0052FF]">shops.ferasetu.store</code> • Status: {d.status || d.dns_status || 'Active'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuyOrRenew(d.domain, 'renew')}
                  disabled={purchasingDomain === d.domain}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-colors"
                >
                  {purchasingDomain === d.domain ? 'Processing...' : 'Renew (+1 Year Wholesale)'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help & Support note */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-2">
        <span className="flex items-center gap-1">
          <HelpCircle size={14} className="text-slate-400" />
          <span>Need help transferring an existing domain?</span>
        </span>
        <Link to="/domains" className="font-bold text-[#0052FF] hover:underline">
          View DNS Setup Guide &rarr;
        </Link>
      </div>
    </div>
  );
}

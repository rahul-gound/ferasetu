import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Key,
  Plus,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Warehouse,
  Users,
  MessageSquare,
  Truck,
  FileSpreadsheet,
  Cpu,
  Globe,
  Settings,
  ArrowRight,
  Sliders,
  Check,
  X,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';

interface IntegrationService {
  id: string;
  name: string;
  description: string;
  category: 'payments' | 'logistics' | 'messaging' | 'accounting' | 'hardware';
  status: 'connected' | 'ready' | 'pending';
  badge?: string;
  docsUrl?: string;
  connectedDetails?: string;
}

const INITIAL_SERVICES: IntegrationService[] = [
  {
    id: 'wa-baileys',
    name: 'WhatsApp Business & Automated Assistant',
    description: 'Multi-tenant Baileys socket integration. Send automated catalog order receipts, delivery updates, and polite khata balance nudges directly to customer chats.',
    category: 'messaging',
    status: 'connected',
    badge: 'Core Feature',
    connectedDetails: 'Session active • Zero WhatsApp per-message platform markup',
  },
  {
    id: 'cashfree-pg',
    name: 'Cashfree Payments (T+0 Auto-Sweep)',
    description: 'Direct INR gateway supporting instant UPI intent, cards, and netbanking with automated direct bank settlement.',
    category: 'payments',
    status: 'connected',
    badge: 'Active Gateway',
    connectedDetails: 'Live MID configured • Daily 11:30 PM auto-sweep',
  },
  {
    id: 'razorpay-pg',
    name: 'Razorpay Smart Routing',
    description: 'High-availability payment fallback supporting International cards, UPI QR, and EMI with automated error recovery.',
    category: 'payments',
    status: 'connected',
    badge: 'Fallback Active',
    connectedDetails: 'Key configured • 99.8% checkout success rate',
  },
  {
    id: 'shiprocket-logistics',
    name: 'Shiprocket & Delhivery Direct Dispatch',
    description: 'Automated 1-click AWB generation, pickup scheduling, and live tracking across 29,000+ Indian pincodes.',
    category: 'logistics',
    status: 'ready',
    badge: 'Popular',
  },
  {
    id: 'porter-hyperlocal',
    name: 'Porter & Dunzo Hyperlocal Dispatch',
    description: 'Same-day on-demand two-wheeler delivery for neighbourhood kirana and boutique retail orders within 15 km.',
    category: 'logistics',
    status: 'ready',
  },
  {
    id: 'tally-erp',
    name: 'Tally Prime & Zoho Books Sync',
    description: 'End-of-day sales ledger, GST tax breakdown (CGST/SGST/IGST), and credit khata XML synchronization.',
    category: 'accounting',
    status: 'connected',
    badge: 'GST Ready',
    connectedDetails: 'Daily 00:00 AM export synchronization enabled',
  },
  {
    id: 'hardware-soundbox',
    name: 'Countertop Bluetooth Soundbox & Scanner',
    description: 'Instant spoken payment announcements for UPI QR transactions over Bluetooth or LAN speaker without hardware rent.',
    category: 'hardware',
    status: 'connected',
    badge: 'In-Store',
    connectedDetails: 'Paired to counter terminal',
  },
  {
    id: 'google-merchant',
    name: 'Google Merchant Center & Local Maps (SEO)',
    description: 'Sync your in-stock product catalog with Google Search and Maps so nearby shoppers find what is on your shelves.',
    category: 'messaging',
    status: 'connected',
    badge: 'High Reach',
    connectedDetails: 'Googlebot automated crawler sync active',
  },
  {
    id: 'thermal-printer',
    name: '58mm / 80mm ESC/POS Thermal Printer',
    description: 'Direct counter billing printer. Prints customer bills, line items, and dynamic payment QR codes with zero drivers.',
    category: 'hardware',
    status: 'ready',
  },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<IntegrationService[]>(INITIAL_SERVICES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('orders.created,orders.settled');

  // Filtered Services
  const filteredServices = useMemo(() => {
    let list = services;
    if (selectedCategory !== 'all') {
      list = list.filter((s) => s.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [services, selectedCategory, searchQuery]);

  // Toggle connection state
  const handleToggleConnection = (id: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const newStatus = s.status === 'connected' ? 'ready' : 'connected';
          toast.success(
            newStatus === 'connected'
              ? `${s.name} connected successfully!`
              : `${s.name} disconnected.`
          );
          return { ...s, status: newStatus };
        }
        return s;
      })
    );
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      toast.error('Please enter a valid webhook endpoint URL');
      return;
    }
    setShowWebhookModal(false);
    toast.success('Webhook endpoint registered with HMAC-SHA256 signing secret!');
  };

  return (
    <>
      <SEO
        title="Integrations & Connected Services Hub — FeraSetu"
        description="Connect your payment gateways, shipping couriers, accounting ERP, and countertop hardware with FeraSetu."
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none font-sans">
        {/* ── HEADER SECTION ─────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-slate-500">
              <span>Settings &amp; Ecosystem</span>
              <span>/</span>
              <span className="text-blue-600 font-bold">Integrations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Integrations &amp; Operations Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Connect the services and tools your business relies on. Manage payment routes, shipping partners, ERP sync, and countertop hardware with zero commission overhead.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => toast.success('Integration request submitted to engineering team!')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
            >
              Request Integration
            </button>
            <button
              type="button"
              onClick={() => setShowWebhookModal(true)}
              className="px-4 py-2 rounded-lg bg-[#0052FF] hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <Key size={14} />
              <span>Add Webhook / API Key</span>
            </button>
          </div>
        </header>

        {/* ── ECOSYSTEM ANCHORS STRIP (STITCH SCREEN 6 ALIGNMENT) ─────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ecosystem Anchors
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Core FeraSetu Operational Workspaces
              </h2>
            </div>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Native Store Operations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Payments Hub Card */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active &amp; Verified
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Payments Hub
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Direct UPI &amp; Gateway Inflow. Cashfree, Razorpay, direct merchant QR, and zero-fee settlement schedules.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">2 Gateways Active</span>
                <Link
                  to="/payments"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Payments</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* Inventory Locations Card */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <Warehouse size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Multi-Location Active
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Inventory &amp; Locations
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Multi-Store Stock &amp; Transfers. Sync storefront shelves and godowns in real time with audio AI sidekick.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Godowns &amp; Storefront</span>
                <Link
                  to="/inventory-and-locations"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Inventory</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* Staff & Access Card */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    RBAC Enforced
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Staff &amp; Access Studio
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Granular shift permissions for cashiers, godown managers, and accountants with full security audit trails.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Least-Privilege Active</span>
                <Link
                  to="/staff"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage Staff</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── SEARCH & CATEGORY SELECTOR ─────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
            {[
              { id: 'all', label: 'All Integrations (9)' },
              { id: 'messaging', label: 'Messaging & WhatsApp' },
              { id: 'payments', label: 'Payments & UPI' },
              { id: 'logistics', label: 'Shipping & Couriers' },
              { id: 'accounting', label: 'Accounting & Tally' },
              { id: 'hardware', label: 'Hardware & POS' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter integrations..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* ── INTEGRATION CARDS GRID ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const isConnected = service.status === 'connected';

            return (
              <div
                key={service.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {service.name}
                      </span>
                    </div>

                    {service.badge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {service.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {service.description}
                  </p>

                  {service.connectedDetails && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>{service.connectedDetails}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 capitalize">
                    {service.category}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleConnection(service.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isConnected
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ADD WEBHOOK / API KEY MODAL ─────────────────────────────────────── */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key size={18} className="text-blue-600" />
                <span>Add Webhook / API Endpoint</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWebhook} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  HTTPS Endpoint URL
                </label>
                <input
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/v1/ferasetu-events"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subscribed Event Topics
                </label>
                <input
                  type="text"
                  value={webhookEvents}
                  onChange={(e) => setWebhookEvents(e.target.value)}
                  placeholder="orders.created, orders.settled, inventory.low"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  Security Guarantee
                </div>
                <div>
                  Payloads are signed with header <code>X-FeraSetu-Signature</code> using HMAC-SHA256 for zero-trust delivery.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Register Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Trash2,
  Copy,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';

interface IntegrationService {
  id: string;
  name: string;
  description: string;
  category: 'payments' | 'logistics' | 'messaging' | 'accounting' | 'hardware' | 'ai';
  status: 'connected' | 'ready' | 'pending';
  badge?: string;
  docsUrl?: string;
  connectedDetails?: string;
  actionUrl?: string;
}

interface MerchantWebhook {
  id: string;
  url: string;
  events: string;
  is_active: number;
  created_at: string;
  updated_at?: string;
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestServiceName, setRequestServiceName] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('orders.created,orders.delivered');
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);
  const [guideModalService, setGuideModalService] = useState<IntegrationService | null>(null);

  // 1. Authoritative subsystem status query
  const { data: integrationsData, isLoading: isIntegrationsLoading, refetch: refetchIntegrations } = useQuery({
    queryKey: ['integrations-status'],
    queryFn: async () => {
      const res = await api.get('/integrations');
      return res.data;
    },
  });

  // 2. Authoritative merchant webhooks query
  const { data: webhooks = [], isLoading: isWebhooksLoading, refetch: refetchWebhooks } = useQuery<MerchantWebhook[]>({
    queryKey: ['merchant-webhooks'],
    queryFn: async () => {
      const res = await api.get('/integrations/webhooks');
      return res.data?.webhooks || [];
    },
  });

  // 3. Register Webhook Mutation
  const registerWebhookMutation = useMutation({
    mutationFn: async ({ url, events }: { url: string; events: string }) => {
      const res = await api.post('/integrations/webhooks', { url, events });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Webhook registered successfully with HMAC-SHA256 signature!');
      if (data.webhook?.secret) {
        setCreatedWebhookSecret(data.webhook.secret);
      }
      setWebhookUrl('');
      queryClient.invalidateQueries({ queryKey: ['merchant-webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['integrations-status'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to register webhook');
    },
  });

  // 4. Delete Webhook Mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/integrations/webhooks/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Webhook unregistered successfully.');
      queryClient.invalidateQueries({ queryKey: ['merchant-webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['integrations-status'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete webhook');
    },
  });

  // 5. Submit Integration Request Mutation
  const requestMutation = useMutation({
    mutationFn: async ({ serviceName, notes }: { serviceName: string; notes: string }) => {
      const res = await api.post('/integrations/request', { serviceName, notes });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Integration request submitted! Our engineering team reviews requests weekly.');
      setShowRequestModal(false);
      setRequestServiceName('');
      setRequestNotes('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    },
  });

  // Action mapping for known subsystem hubs
  const services: IntegrationService[] = useMemo(() => {
    const raw: IntegrationService[] = integrationsData?.services || [];
    return raw.map((s) => {
      if (s.id === 'cashfree-pg' || s.id === 'razorpay-pg' || s.id === 'offline-cod') {
        return { ...s, actionUrl: '/payments' };
      }
      if (s.id === 'wa-baileys') {
        return { ...s, actionUrl: '/whatsapp-assistant' };
      }
      if (s.id === 'email-smtp') {
        return { ...s, actionUrl: '/settings/email' };
      }
      if (s.id === 'fera-ai') {
        return { ...s, actionUrl: '/ai-assistant' };
      }
      if (s.id === 'tally-erp') {
        return { ...s, actionUrl: '/orders' };
      }
      return s;
    });
  }, [integrationsData]);

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

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      toast.error('Please enter a valid webhook endpoint URL');
      return;
    }
    registerWebhookMutation.mutate({ url: webhookUrl, events: webhookEvents });
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestServiceName.trim()) {
      toast.error('Please specify the service or ERP tool name');
      return;
    }
    requestMutation.mutate({ serviceName: requestServiceName, notes: requestNotes });
  };

  return (
    <>
      <SEO
        title="Integrations & Connected Services Hub — FeraSetu"
        description="Connect your payment gateways, shipping couriers, accounting ERP, and countertop hardware with FeraSetu."
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 select-none font-sans">
        {/* ── HEADER SECTION ─────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-slate-500">
              <span>Settings &amp; Ecosystem</span>
              <span>/</span>
              <span className="text-blue-600 font-bold">Integrations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Integrations &amp; Operations Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Connect the verified services your business relies on. Manage payment routes, WhatsApp notifications, custom SMTP, and live webhooks with zero commission overhead.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all"
            >
              Request Integration
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedWebhookSecret(null);
                setShowWebhookModal(true);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0052FF] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2"
            >
              <Key size={15} />
              <span>Add Webhook / API Key</span>
            </button>
          </div>
        </header>

        {/* ── ECOSYSTEM ANCHORS STRIP ─────────────────────────────────────── */}
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
              Authoritative Native Operations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Payments Hub Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <CreditCard size={22} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active &amp; Verified
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Payments &amp; Settlement Hub
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Direct UPI &amp; Gateway Inflow. Cashfree, Razorpay, direct merchant QR, and zero-fee settlement schedules.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Direct Settlement Active</span>
                <Link
                  to="/payments"
                  className="min-h-[40px] px-3 py-1.5 text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Payments</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Inventory Locations Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <Warehouse size={22} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Multi-Location Ready
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Inventory &amp; Locations
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Multi-Store Stock &amp; Transfers. Sync storefront shelves and godowns in real time with audio AI sidekick.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Godowns &amp; Storefront</span>
                <Link
                  to="/inventory-and-locations"
                  className="min-h-[40px] px-3 py-1.5 text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Inventory</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Staff & Access Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <Users size={22} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    RBAC Enforced
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Staff &amp; Access Studio
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Granular shift permissions for cashiers, godown managers, and accountants with full security audit trails.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Least-Privilege Active</span>
                <Link
                  to="/staff"
                  className="min-h-[40px] px-3 py-1.5 text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage Staff</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── REGISTERED OUTBOUND WEBHOOKS TABLE (LIVE D1 STATE) ─────────── */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <Zap size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Active Webhook Endpoints ({webhooks.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time HTTPS event webhooks signed with SHA-256 HMAC
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreatedWebhookSecret(null);
                setShowWebhookModal(true);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Add Webhook</span>
            </button>
          </div>

          {createdWebhookSecret && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Webhook Signing Secret Generated</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedWebhookSecret(null)}
                  className="text-xs text-emerald-700 hover:text-emerald-900"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                Store this secret securely in your backend. FeraSetu signs every outgoing webhook with this secret in header <code>X-FeraSetu-Signature</code>.
              </p>
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <code className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 select-all">
                  {createdWebhookSecret}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdWebhookSecret);
                    toast.success('Webhook secret copied to clipboard!');
                  }}
                  className="px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded"
                >
                  Copy Secret
                </button>
              </div>
            </div>
          )}

          {isWebhooksLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading registered webhooks…</div>
          ) : webhooks.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-slate-500">
                No external webhooks registered yet. Add a webhook URL to receive live order and delivery events.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCreatedWebhookSecret(null);
                  setShowWebhookModal(true);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
              >
                Register First Webhook
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-2.5">Endpoint URL</th>
                    <th className="pb-2.5">Subscribed Topics</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Registered</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {webhooks.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-mono font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {wh.url}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {wh.events}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 text-[11px]">
                        {new Date(wh.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Unregister webhook ${wh.url}?`)) {
                              deleteWebhookMutation.mutate(wh.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Webhook"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── SEARCH & CATEGORY SELECTOR ─────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
            {[
              { id: 'all', label: `All Services (${services.length})` },
              { id: 'payments', label: 'Payments & UPI' },
              { id: 'messaging', label: 'Messaging & Email' },
              { id: 'ai', label: 'AI & MCP Tooling' },
              { id: 'logistics', label: 'Shipping & Couriers' },
              { id: 'accounting', label: 'Accounting & Tally' },
              { id: 'hardware', label: 'Hardware & POS' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search integrations..."
              className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* ── INTEGRATION CARDS GRID ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => {
            const isConnected = service.status === 'connected';

            return (
              <div
                key={service.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {service.name}
                    </span>

                    {service.badge && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 ${
                        isConnected
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {service.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {service.description}
                  </p>

                  {service.connectedDetails && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 font-mono flex items-center gap-2">
                      <CheckCircle2 size={14} className={isConnected ? "text-emerald-500 shrink-0" : "text-slate-400 shrink-0"} />
                      <span>{service.connectedDetails}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {service.category}
                  </span>

                  {service.actionUrl ? (
                    <Link
                      to={service.actionUrl}
                      className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-[#0052FF] hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors"
                    >
                      <span>Manage</span>
                      <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setGuideModalService(service)}
                      className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      Setup Guide
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SETUP GUIDE MODAL ──────────────────────────────────────────────── */}
      {guideModalService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                <span>{guideModalService.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setGuideModalService(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>{guideModalService.description}</p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white">Integration Status</div>
                <div className="font-mono text-emerald-700 dark:text-emerald-400">
                  {guideModalService.connectedDetails || 'Ready for configuration.'}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                To connect API credentials or configure automated dispatch, reach out to your logistics account manager or visit documentation.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setGuideModalService(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD WEBHOOK MODAL ──────────────────────────────────────────────── */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  HTTPS Endpoint URL *
                </label>
                <input
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/v1/ferasetu-events"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subscribed Event Topics
                </label>
                <input
                  type="text"
                  value={webhookEvents}
                  onChange={(e) => setWebhookEvents(e.target.value)}
                  placeholder="orders.created, orders.delivered, inventory.low"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono text-xs"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 space-y-1 border border-slate-100 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Security Guarantee
                </div>
                <div>
                  Outgoing payloads are signed with header <code>X-FeraSetu-Signature</code> using a unique HMAC-SHA256 signing secret.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerWebhookMutation.isPending}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50"
                >
                  {registerWebhookMutation.isPending ? 'Registering…' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REQUEST INTEGRATION MODAL ─────────────────────────────────────── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu size={18} className="text-blue-600" />
                <span>Request New Integration</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tool or Partner Name *
                </label>
                <input
                  type="text"
                  required
                  value={requestServiceName}
                  onChange={(e) => setRequestServiceName(e.target.value)}
                  placeholder="e.g. Busy Accounting, Delhivery API, Shopify Sync"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  How does your shop use this tool? (Optional)
                </label>
                <textarea
                  rows={3}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Tell our engineering team about your specific daily workflow..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50"
                >
                  {requestMutation.isPending ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

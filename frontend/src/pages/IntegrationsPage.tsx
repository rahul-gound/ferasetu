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
  Bot,
  Sparkles,
  Terminal,
  Code2,
  Play,
  Volume2,
  Printer,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { getIntegrationLogo } from '../components/integrations/IntegrationLogos';
import AddIntegrationModal, { INTEGRATION_CATALOG } from '../components/integrations/AddIntegrationModal';

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
  aiUsable?: boolean;
  aiInfo?: {
    toolName: string;
    description: string;
    samplePrompts: string[];
    defaultAction: string;
    paramSchema: Record<string, any>;
  };
}

interface MerchantWebhook {
  id: string;
  url: string;
  events: string;
  is_active: number;
  created_at: string;
  updated_at?: string;
}

// Authoritative registry of AI tool actions for integrations
const AI_ACTIONS_REGISTRY: Record<string, {
  toolName: string;
  description: string;
  samplePrompts: string[];
  defaultAction: string;
  paramSchema: Record<string, any>;
}> = {
  'google-sheets': {
    toolName: 'sync_google_sheets',
    description: 'Sync storefront orders, line items, and stock counts to Google Sheets row-by-row in real time.',
    samplePrompts: [
      'Sync today’s latest 5 orders to Orders spreadsheet tab',
      'Export low-stock catalog products to Restock Sheet',
      'Append walk-in customer invoice to Sales Log'
    ],
    defaultAction: 'sync_orders',
    paramSchema: { count: 5, tab: 'Orders' }
  },
  'slack': {
    toolName: 'send_slack_alert',
    description: 'Post order confirmations, payment receipts, and low-inventory alerts to Slack channels.',
    samplePrompts: [
      'Notify #store-orders about new order #FS-1042 (₹1,240)',
      'Send low stock warning for Tata Salt 1kg (< 5 units)',
      'Post end-of-day revenue summary to #finance'
    ],
    defaultAction: 'send_alert',
    paramSchema: { channel: '#store-orders', message: 'Order #FS-1042 placed (₹1,240.00)' }
  },
  'telegram-bot': {
    toolName: 'send_telegram_alert',
    description: 'Dispatch audio chimes and smartphone push notifications to shopkeeper Telegram bot on every order.',
    samplePrompts: [
      'Send Telegram alert for incoming order #FS-1042',
      'Send urgent reminder for pending courier pickup',
      'Broadcast morning shop opening status'
    ],
    defaultAction: 'send_message',
    paramSchema: { message: 'New order #FS-1042 received for ₹1,240' }
  },
  'notion-mcp': {
    toolName: 'create_notion_entry',
    description: 'Create an inventory reconciliation log or customer notes page in Notion workspace.',
    samplePrompts: [
      'Create weekly inventory audit page in Notion',
      'Log supplier invoice and receipt in Notion Ledger',
      'Add customer feedback review note'
    ],
    defaultAction: 'create_page',
    paramSchema: { title: 'Weekly Kirana Inventory Reconciliation', category: 'Operations' }
  },
  'shiprocket-logistics': {
    toolName: 'estimate_shipping_rate',
    description: 'Calculate courier delivery charges and transit time using Shiprocket Multi-Carrier.',
    samplePrompts: [
      'Check shipping rate for 1.2kg package to pincode 560001',
      'Compare surface vs air courier options for Delhi dispatch',
      'Generate pickup schedule for today'
    ],
    defaultAction: 'estimate_rate',
    paramSchema: { pickupPincode: '401303', deliveryPincode: '560001', weightGrams: 1200 }
  },
  'delhivery-direct': {
    toolName: 'estimate_shipping_rate',
    description: 'Direct courier API dispatch, AWB booking, and automated tracking webhooks.',
    samplePrompts: [
      'Check Delhivery Surface rate to Mumbai 400001',
      'Generate tracking link for order #FS-1042'
    ],
    defaultAction: 'estimate_rate',
    paramSchema: { pickupPincode: '401303', deliveryPincode: '400001', weightGrams: 1000 }
  },
  'porter-hyperlocal': {
    toolName: 'estimate_porter_fare',
    description: 'Instant 2-wheeler and 3-wheeler dispatch for 60-minute intra-city store orders.',
    samplePrompts: [
      'Estimate 2-wheeler bike delivery fare for 5km delivery',
      'Dispatch delivery runner for order #FS-1042'
    ],
    defaultAction: 'estimate_fare',
    paramSchema: { city: 'Mumbai' }
  },
  'thermal-printer': {
    toolName: 'print_thermal_receipt',
    description: 'Generate 58mm/80mm ESC/POS bill layout with store header and dynamic UPI payment QR.',
    samplePrompts: [
      'Print customer receipt for Order #FS-1042 with UPI QR',
      'Print daily shift sales total slip',
      'Print kitchen / packing token'
    ],
    defaultAction: 'print_receipt',
    paramSchema: { total: 316.00, customerName: 'Walk-in Customer' }
  },
  'soundbox': {
    toolName: 'trigger_soundbox_voice',
    description: 'Play spoken multilingual payment confirmation speech on 4G countertop speaker.',
    samplePrompts: [
      'Announce "फेरा सेतु पर ₹500 प्राप्त हुए" in Hindi',
      'Announce "₹250 received on FeraSetu" in English',
      'Announce "ఫెరాసేతులో ₹1,000 అందాయి" in Telugu'
    ],
    defaultAction: 'voice_alert',
    paramSchema: { amount: 500, language: 'hi' }
  },
  'tally-erp': {
    toolName: 'export_tally_vouchers',
    description: 'Generate Tally Prime XML sales voucher envelope for end-of-day accounting import.',
    samplePrompts: [
      'Export today’s sales vouchers to Tally Prime XML format',
      'Generate monthly GST breakdown (CGST / SGST) for Tally'
    ],
    defaultAction: 'export_xml',
    paramSchema: { format: 'xml' }
  },
  'wa-baileys': {
    toolName: 'send_whatsapp_receipt',
    description: 'Send automated WhatsApp order receipts with live tracking and handshake code.',
    samplePrompts: [
      'Send WhatsApp delivery code and bill link to customer',
      'Send restock alert to WhatsApp group'
    ],
    defaultAction: 'send_receipt',
    paramSchema: { phone: '+91 98765 43210' }
  },
  'fera-ai': {
    toolName: 'execute_autonomous_task',
    description: 'Fera AI sovereign store brain orchestrating all merchant workflows and tools.',
    samplePrompts: [
      'Reconcile daily inventory between shelves and orders',
      'Review store profit margins across all products'
    ],
    defaultAction: 'store_audit',
    paramSchema: { scope: 'full_store' }
  },
  'zapier-make': {
    toolName: 'dispatch_cloud_webhook',
    description: 'Trigger Zapier or Make.com scenario with full order and customer metadata.',
    samplePrompts: [
      'Trigger Zapier Catch Hook for Order #FS-1042',
      'Send abandoned cart webhook to Make.com flow'
    ],
    defaultAction: 'trigger_webhook',
    paramSchema: { event: 'order.placed', orderId: '#FS-1042' }
  }
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAiOnly, setShowAiOnly] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [requestServiceName, setRequestServiceName] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('orders.created,orders.delivered');
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);
  const [selectedConfiguringAppId, setSelectedConfiguringAppId] = useState<string | null>(null);

  // Fera AI Execution Modal State
  const [selectedAiApp, setSelectedAiApp] = useState<IntegrationService | null>(null);
  const [aiExecuting, setAiExecuting] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiActivePrompt, setAiActivePrompt] = useState<string>('');

  // 1. Authoritative subsystem status query
  const { data: integrationsData, isLoading: isIntegrationsLoading, refetch: refetchIntegrations } = useQuery({
    queryKey: ['integrations-status'],
    queryFn: async () => {
      try {
        const res = await api.get('/integrations');
        return res.data;
      } catch (err) {
        // Return resilient empty shell if unauthenticated/network issue
        return { success: true, services: [], webhooks_count: 0 };
      }
    },
  });

  // 2. Authoritative merchant webhooks query
  const { data: webhooks = [], isLoading: isWebhooksLoading } = useQuery<MerchantWebhook[]>({
    queryKey: ['merchant-webhooks'],
    queryFn: async () => {
      try {
        const res = await api.get('/integrations/webhooks');
        return res.data?.webhooks || [];
      } catch {
        return [];
      }
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

  // 6. Disconnect Integration Mutation
  const disconnectMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await api.post('/integrations/disconnect', { serviceId });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Integration disconnected');
      queryClient.invalidateQueries({ queryKey: ['integrations-status'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to disconnect integration');
    },
  });

  // 7. Authoritative Merged Services List (Guarantees all 32+ catalog apps are always visible)
  const services: IntegrationService[] = useMemo(() => {
    const raw: any[] = integrationsData?.services || [];
    const rawMap = new Map<string, any>(raw.map((s) => [s.id, s]));

    // Start with catalog items to guarantee every app is represented
    const mergedList: IntegrationService[] = INTEGRATION_CATALOG.map((catApp) => {
      const serverMatch = rawMap.get(catApp.id);
      const isConnected = serverMatch?.status === 'connected';
      const aiInfo = AI_ACTIONS_REGISTRY[catApp.id];

      let actionUrl: string | undefined;
      if (
        catApp.id === 'cashfree-pg' ||
        catApp.id === 'razorpay-pg' ||
        catApp.id === 'offline-cod' ||
        catApp.id === 'phonepe-pg' ||
        catApp.id === 'stripe-pg'
      ) {
        actionUrl = '/payments';
      } else if (catApp.id === 'wa-baileys') {
        actionUrl = '/whatsapp-assistant';
      } else if (catApp.id === 'email-smtp') {
        actionUrl = '/settings/email';
      } else if (catApp.id === 'fera-ai') {
        actionUrl = '/ai-assistant';
      } else if (catApp.id === 'tally-erp') {
        actionUrl = '/orders';
      }

      return {
        id: catApp.id,
        name: catApp.name,
        description: catApp.description,
        category: catApp.category,
        status: isConnected ? 'connected' : 'ready',
        badge: isConnected ? 'Connected & Live' : catApp.badge || 'Ready to Connect',
        connectedDetails: serverMatch?.connectedDetails,
        actionUrl,
        docsUrl: catApp.docsUrl,
        aiUsable: Boolean(aiInfo),
        aiInfo,
      };
    });

    // Also include any custom server services not in INTEGRATION_CATALOG
    const catalogIds = new Set(INTEGRATION_CATALOG.map((c) => c.id));
    for (const s of raw) {
      if (!catalogIds.has(s.id)) {
        const aiInfo = AI_ACTIONS_REGISTRY[s.id];
        mergedList.push({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category || 'ai',
          status: s.status || 'connected',
          badge: s.badge || 'Connected',
          connectedDetails: s.connectedDetails,
          actionUrl: s.actionUrl,
          docsUrl: s.docsUrl,
          aiUsable: Boolean(aiInfo),
          aiInfo,
        });
      }
    }

    return mergedList;
  }, [integrationsData]);

  // Set of actively connected service IDs
  const connectedServiceIds = useMemo(() => {
    return new Set(services.filter((s) => s.status === 'connected').map((s) => s.id));
  }, [services]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    let list = services;
    if (showAiOnly) {
      list = list.filter((s) => s.aiUsable);
    }
    if (selectedCategory !== 'all') {
      list = list.filter((s) => s.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [services, selectedCategory, searchQuery, showAiOnly]);

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

  // Execute Autonomous AI Action via POST /api/integrations/execute
  const handleExecuteAiAction = async (service: IntegrationService, promptText?: string) => {
    if (!service.aiInfo) return;
    setAiExecuting(true);
    setAiResult(null);
    try {
      const res = await api.post('/integrations/execute', {
        serviceId: service.id,
        action: service.aiInfo.defaultAction,
        params: {
          ...service.aiInfo.paramSchema,
          prompt: promptText || aiActivePrompt || service.aiInfo.samplePrompts[0],
        },
      });
      setAiResult(res.data);
      toast.success(`Fera AI executed '${service.aiInfo.toolName}' successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'AI execution request failed');
    } finally {
      setAiExecuting(false);
    }
  };

  return (
    <>
      <SEO
        title="Integrations & Connected Services Hub — FeraSetu"
        description="Connect your payment gateways, couriers, accounting ERP, and countertop POS hardware. Operate them with Fera AI."
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 select-none font-sans">
        {/* ── HEADER SECTION ─────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-slate-500">
              <span>Settings &amp; Ecosystem</span>
              <span>/</span>
              <span className="text-[#0052FF] font-bold">Integrations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Integrations &amp; Operations Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Connect verified services and operate them directly with <strong>Fera AI</strong>. Manage payment routes, couriers, thermal printers, soundbox audio, and live webhooks with zero commission overhead.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedConfiguringAppId(null);
                setShowAddModal(true);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0052FF] hover:bg-blue-700 active:translate-y-0.5 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Integration ({INTEGRATION_CATALOG.length}+)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedWebhookSecret(null);
                setShowWebhookModal(true);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 active:translate-y-0.5 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Key size={15} />
              <span>Add Webhook</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 active:translate-y-0.5 shadow-xs transition-all cursor-pointer"
            >
              Request Other
            </button>
          </div>
        </header>

        {/* ── FERA AI INTEGRATION COMMAND CENTER BANNER ─────────────────────── */}
        <section className="p-6 rounded-3xl bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
            <Bot size={280} className="text-white" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-300 shadow-inner">
                  <Bot size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                      Fera AI Integration Command Center
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                      OpenAI Cluster
                    </span>
                  </div>
                  <p className="text-xs text-blue-100/90 mt-0.5 max-w-2xl leading-relaxed">
                    Your sovereign store assistant can autonomously trigger receipts, sync sheets, post Slack alerts, estimate delivery fares, and speak payment confirmations via function tools.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiOnly(!showAiOnly)}
                  className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    showAiOnly
                      ? 'bg-white text-blue-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  <Sparkles size={14} className={showAiOnly ? 'text-blue-600' : 'text-blue-300'} />
                  <span>{showAiOnly ? 'Showing AI Enabled Only' : 'Filter AI-Enabled Only'}</span>
                </button>
                <Link
                  to="/ai-assistant"
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>Open Fera AI Assistant</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* AI Quick Execution Chips */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-blue-200 font-bold uppercase text-[10px] tracking-wider shrink-0 flex items-center gap-1">
                <Play size={11} className="text-blue-300" />
                Quick Autonomous Actions:
              </span>

              {[
                { label: '📊 Sync Google Sheets', serviceId: 'google-sheets' },
                { label: '🔔 Post Slack Alert', serviceId: 'slack' },
                { label: '🖨️ Print Thermal Receipt', serviceId: 'thermal-printer' },
                { label: '🔊 Speak ₹500 Soundbox', serviceId: 'soundbox' },
                { label: '🚚 Quote Shiprocket Courier', serviceId: 'shiprocket-logistics' },
                { label: '📑 Export Tally XML', serviceId: 'tally-erp' },
              ].map((chip) => {
                const targetService = services.find((s) => s.id === chip.serviceId);
                return (
                  <button
                    key={chip.serviceId}
                    type="button"
                    onClick={() => {
                      if (targetService) {
                        setSelectedAiApp(targetService);
                        setAiActivePrompt(targetService.aiInfo?.samplePrompts[0] || '');
                        handleExecuteAiAction(targetService, targetService.aiInfo?.samplePrompts[0]);
                      }
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 border border-white/15 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── ECOSYSTEM ANCHORS STRIP ─────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ecosystem Anchors
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Core FeraSetu Operational Workspaces
              </h2>
            </div>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Authoritative Native Operations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Payments Hub Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center">
                    <CreditCard size={22} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active &amp; Verified
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Payments &amp; Settlement Hub
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Direct UPI &amp; Gateway Inflow. Cashfree, Razorpay, direct merchant QR, and zero-fee settlement schedules.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Direct Settlement Active</span>
                <Link
                  to="/payments"
                  className="min-h-[40px] px-3 py-1.5 text-[#0052FF] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Payments</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Inventory Locations Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center">
                    <Warehouse size={22} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Multi-Location Ready
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Inventory &amp; Locations
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Multi-Store Stock &amp; Transfers. Sync storefront shelves and godowns in real time with audio AI sidekick.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Godowns &amp; Storefront</span>
                <Link
                  to="/inventory-and-locations"
                  className="min-h-[40px] px-3 py-1.5 text-[#0052FF] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Inventory</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Staff & Access Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center">
                    <Users size={22} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    RBAC Enforced
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Staff &amp; Access Studio
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Granular shift permissions for cashiers, godown managers, and accountants with full security audit trails.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Least-Privilege Active</span>
                <Link
                  to="/staff"
                  className="min-h-[40px] px-3 py-1.5 text-[#0052FF] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage Staff</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── REGISTERED OUTBOUND WEBHOOKS TABLE ─────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0052FF] flex items-center justify-center">
                <Zap size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
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
              className="text-xs font-bold text-[#0052FF] hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Webhook</span>
            </button>
          </div>

          {createdWebhookSecret && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Webhook Signing Secret Generated</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedWebhookSecret(null)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-[11px] text-emerald-800">
                Store this secret securely in your backend. FeraSetu signs every outgoing webhook with this secret in header <code>X-FeraSetu-Signature</code>.
              </p>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-200">
                <code className="text-xs font-mono font-bold text-slate-900 select-all">
                  {createdWebhookSecret}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdWebhookSecret);
                    toast.success('Webhook secret copied to clipboard!');
                  }}
                  className="px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Register First Webhook
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-2.5">Endpoint URL</th>
                    <th className="pb-2.5">Subscribed Topics</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Registered</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhooks.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono font-bold text-slate-900 max-w-xs truncate">
                        {wh.url}
                      </td>
                      <td className="py-3 text-slate-600 font-mono text-[11px]">
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
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
            {[
              { id: 'all', label: `All Services (${services.length})` },
              { id: 'ai', label: 'AI & MCP Tools' },
              { id: 'payments', label: 'Payments & UPI' },
              { id: 'logistics', label: 'Couriers & Logistics' },
              { id: 'messaging', label: 'Messaging & WhatsApp' },
              { id: 'accounting', label: 'Accounting & ERP' },
              { id: 'hardware', label: 'Counter Hardware' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  if (showAiOnly && cat.id !== 'ai') setShowAiOnly(false);
                }}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#0052FF] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[260px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${services.length} services or tools...`}
              className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-[#0052FF] focus:bg-white"
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
                className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all shadow-xs space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="shrink-0 rounded-2xl overflow-hidden shadow-2xs">
                        {getIntegrationLogo(service.id, 46)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {service.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {service.category}
                          </span>
                          {service.aiUsable && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200/60">
                              <Sparkles size={9} />
                              AI Ready
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

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

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {service.description}
                  </p>

                  {service.connectedDetails && (
                    <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 font-mono flex items-center gap-2">
                      <CheckCircle2 size={14} className={isConnected ? "text-emerald-500 shrink-0" : "text-slate-400 shrink-0"} />
                      <span className="truncate">{service.connectedDetails}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {isConnected ? 'Active in Store' : 'Ready to Connect'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isConnected ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Disconnect ${service.name}?`)) {
                                disconnectMutation.mutate(service.id);
                              }
                            }}
                            className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                            title="Disconnect Integration"
                          >
                            Disconnect
                          </button>
                          {service.actionUrl ? (
                            <Link
                              to={service.actionUrl}
                              className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0052FF] hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <span>Manage</span>
                              <ArrowRight size={13} />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedConfiguringAppId(service.id);
                                setShowAddModal(true);
                              }}
                              className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>Configure</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConfiguringAppId(service.id);
                            setShowAddModal(true);
                          }}
                          className="min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-[#0052FF] text-[#0052FF] hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 🤖 Use with Fera AI Button */}
                  {service.aiUsable && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAiApp(service);
                        setAiResult(null);
                        setAiActivePrompt(service.aiInfo?.samplePrompts[0] || '');
                      }}
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:translate-y-0.5 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Bot size={14} className="text-blue-400" />
                      <span>Use with Fera AI</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FERA AI AUTONOMOUS TOOL MODAL ──────────────────────────────────── */}
      {selectedAiApp && selectedAiApp.aiInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {getIntegrationLogo(selectedAiApp.id, 46)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {selectedAiApp.name} &bull; Fera AI Tool
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700">
                      Autonomous Tool
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Tool signature: <code>{selectedAiApp.aiInfo.toolName}()</code>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAiApp(null);
                  setAiResult(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Description Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Sparkles size={14} className="text-blue-600" />
                  <span>How Fera AI Uses This Integration</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedAiApp.aiInfo.description}
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Click a Sample Prompt to Test AI Execution:
                </label>
                <div className="space-y-1.5">
                  {selectedAiApp.aiInfo.samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAiActivePrompt(p);
                        handleExecuteAiAction(selectedAiApp, p);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-xs text-slate-800 font-medium transition-all flex items-center justify-between gap-2 group cursor-pointer"
                    >
                      <span>{p}</span>
                      <Play size={13} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Or Run Custom Action with Fera AI:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiActivePrompt}
                    onChange={(e) => setAiActivePrompt(e.target.value)}
                    placeholder="Enter command for Fera AI..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 text-slate-900 outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    disabled={aiExecuting || !aiActivePrompt.trim()}
                    onClick={() => handleExecuteAiAction(selectedAiApp, aiActivePrompt)}
                    className="min-h-[42px] px-5 rounded-xl bg-[#0052FF] hover:bg-blue-700 active:translate-y-0.5 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Zap size={14} />
                    <span>{aiExecuting ? 'Executing...' : 'Run with Fera AI'}</span>
                  </button>
                </div>
              </div>

              {/* Live Execution Telemetry & Result */}
              {aiResult && (
                <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-3 shadow-md animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 size={15} />
                      <span>Action Dispatched Successfully (HTTP 200)</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      ~{aiResult.telemetry?.executionTimeMs || 42}ms &bull; Fera AI Cluster
                    </span>
                  </div>

                  {/* Formatted Previews */}
                  {aiResult.result?.formatted_receipt && (
                    <div className="p-3 bg-black/60 rounded-xl font-mono text-[11px] text-emerald-300 whitespace-pre overflow-x-auto">
                      {aiResult.result.formatted_receipt}
                    </div>
                  )}

                  {aiResult.result?.spoken_text && (
                    <div className="p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl flex items-center gap-2 text-xs text-blue-200">
                      <Volume2 size={18} className="text-blue-400 shrink-0" />
                      <span><strong>Spoken Output:</strong> "{aiResult.result.spoken_text}"</span>
                    </div>
                  )}

                  {aiResult.result?.preview && (
                    <div className="p-3 bg-slate-800/80 rounded-xl text-xs text-slate-200">
                      {aiResult.result.preview}
                    </div>
                  )}

                  {aiResult.result?.sample_row && (
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-400 font-bold block mb-1">Row Written to Google Sheets:</span>
                      <code className="text-[11px] font-mono bg-black/40 px-2 py-1 rounded block">
                        {JSON.stringify(aiResult.result.sample_row)}
                      </code>
                    </div>
                  )}

                  {/* Raw Telemetry Accordion / JSON */}
                  <details className="text-[11px] text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-200 font-mono">
                      View Raw Execution JSON Telemetry
                    </summary>
                    <pre className="mt-2 p-2 bg-black/60 rounded-lg overflow-x-auto text-[10px] text-slate-300 font-mono">
                      {JSON.stringify(aiResult, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <Link
                to="/ai-assistant"
                className="text-xs font-bold text-[#0052FF] hover:underline flex items-center gap-1"
              >
                <span>Ask Fera AI in Chat Assistant</span>
                <ArrowRight size={13} />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSelectedAiApp(null);
                  setAiResult(null);
                }}
                className="min-h-[40px] px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
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
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key size={18} className="text-[#0052FF]" />
                <span>Add Webhook / API Endpoint</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWebhook} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  HTTPS Endpoint URL *
                </label>
                <input
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/v1/ferasetu-events"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-[#0052FF] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subscribed Event Topics
                </label>
                <input
                  type="text"
                  value={webhookEvents}
                  onChange={(e) => setWebhookEvents(e.target.value)}
                  placeholder="orders.created, orders.delivered, inventory.low"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none font-mono text-xs"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 text-[11px] text-slate-500 space-y-1 border border-slate-100">
                <div className="font-bold text-slate-700">
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
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerWebhookMutation.isPending}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0052FF] hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
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
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu size={18} className="text-[#0052FF]" />
                <span>Request New Integration</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tool or Partner Name *
                </label>
                <input
                  type="text"
                  required
                  value={requestServiceName}
                  onChange={(e) => setRequestServiceName(e.target.value)}
                  placeholder="e.g. Busy Accounting, Delhivery API, Shopify Sync"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-[#0052FF]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  How does your shop use this tool? (Optional)
                </label>
                <textarea
                  rows={3}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Tell our engineering team about your specific daily workflow..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0052FF] hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {requestMutation.isPending ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD INTEGRATION MODAL ──────────────────────────────────────────── */}
      <AddIntegrationModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedConfiguringAppId(null);
        }}
        connectedServiceIds={connectedServiceIds}
        initialSelectedAppId={selectedConfiguringAppId}
        onIntegrationAdded={() => refetchIntegrations()}
      />
    </>
  );
}

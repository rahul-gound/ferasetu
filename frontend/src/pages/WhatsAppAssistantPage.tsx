import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Smartphone,
  QrCode,
  ShieldAlert,
  Sparkles,
  Bot,
  Bell,
  Power,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Clock,
  UserCheck,
  PackageCheck,
  X,
  PhoneCall,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type WizardStep = 'intro' | 'disclosure' | 'pairing' | 'success';

interface WhatsAppSession {
  id?: string;
  organization_id?: string;
  status: 'disconnected' | 'preparing' | 'qr_ready' | 'connecting' | 'connected' | 'interrupted' | 'logged_out' | 'expired';
  phone_number_masked?: string | null;
  is_ai_replies_enabled: boolean;
  is_notifications_enabled: boolean;
  qr_code_raw?: string | null;
  qr_expires_at?: string | null;
  last_connected_at?: string | null;
  last_activity_at?: string | null;
  stats?: {
    messages_received: number;
    ai_replies_sent: number;
    pending_orders: number;
    attention_needed: number;
  };
}

interface ConversationItem {
  id: string;
  customer_phone: string;
  customer_name?: string;
  last_message_text: string;
  last_message_at: string;
  requires_attention: boolean | number;
  attention_reason?: string;
  is_ai_paused: boolean | number;
}

interface OrderRequestItem {
  id: string;
  customer_phone: string;
  customer_name?: string;
  items_json: string;
  estimated_total_cents: number;
  currency: string;
  notes?: string;
  status: 'pending_confirmation' | 'confirmed' | 'rejected';
  created_at: string;
}

export default function WhatsAppAssistantPage() {
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const queryClient = useQueryClient();

  const [wizardStep, setWizardStep] = useState<WizardStep>('intro');
  const [deviceTab, setDeviceTab] = useState<'android' | 'iphone'>('android');
  const [disclosureRiskAgreed, setDisclosureRiskAgreed] = useState(false);
  const [disclosureProcessAgreed, setDisclosureProcessAgreed] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);

  // 1. Fetch Session Status with automatic polling when in pairing or preparing mode
  const {
    data: sessionData,
    isLoading: isSessionLoading,
    refetch: refetchSession
  } = useQuery<WhatsAppSession>({
    queryKey: ['whatsapp-session'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/status');
      return res.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'preparing' || status === 'qr_ready' || status === 'connecting') {
        return 2500; // poll every 2.5s during pairing
      }
      return 15000; // poll every 15s when idle or connected
    },
  });

  const session = sessionData || {
    status: 'disconnected',
    is_ai_replies_enabled: true,
    is_notifications_enabled: true,
    stats: { messages_received: 0, ai_replies_sent: 0, pending_orders: 0, attention_needed: 0 }
  };

  const isConnected = session.status === 'connected';

  // Automatically transition step based on remote state
  useEffect(() => {
    if (isConnected && wizardStep !== 'success') {
      // If user is connected, they should see the connected control center
      setWizardStep('intro');
    }
  }, [isConnected]);

  // 2. Fetch Conversations
  const { data: conversationsData, refetch: refetchConversations } = useQuery<{ conversations: ConversationItem[] }>({
    queryKey: ['whatsapp-conversations'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/conversations?limit=30');
      return res.data;
    },
    enabled: isConnected,
    refetchInterval: isConnected ? 10000 : false,
  });

  // 3. Fetch Order Requests
  const { data: ordersData, refetch: refetchOrders } = useQuery<{ orders: OrderRequestItem[] }>({
    queryKey: ['whatsapp-orders'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/orders?limit=20');
      return res.data;
    },
    enabled: isConnected,
    refetchInterval: isConnected ? 12000 : false,
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/connect', {
        disclosureAcknowledged: true,
        acknowledgedAt: new Date().toISOString(),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['whatsapp-session'], (old: any) => ({
        ...old,
        status: data.status,
        qr_code_raw: data.qr_code_raw,
        qr_expires_at: data.qr_expires_at,
      }));
      setWizardStep('pairing');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not initiate connection. Please try again.');
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/disconnect');
      return res.data;
    },
    onSuccess: () => {
      toast.success('Shop WhatsApp disconnected');
      setDisconnectModalOpen(false);
      setWizardStep('intro');
      setDisclosureRiskAgreed(false);
      setDisclosureProcessAgreed(false);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-session'] });
    },
    onError: () => {
      toast.error('Failed to disconnect. Please try again.');
    }
  });

  // Settings mutation (AI replies / Notifications toggle)
  const settingsMutation = useMutation({
    mutationFn: async (payload: { isAiRepliesEnabled?: boolean; isNotificationsEnabled?: boolean }) => {
      const res = await api.patch('/whatsapp/settings', payload);
      return res.data;
    },
    onSuccess: (_, vars) => {
      if (vars.isAiRepliesEnabled !== undefined) {
        toast.success(vars.isAiRepliesEnabled ? 'AI automatic replies resumed' : 'AI automatic replies paused');
      }
      if (vars.isNotificationsEnabled !== undefined) {
        toast.success(vars.isNotificationsEnabled ? 'Order notifications enabled' : 'Order notifications paused');
      }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-session'] });
    },
    onError: () => {
      toast.error('Could not update setting.');
    }
  });

  // Handover mutation
  const handoverMutation = useMutation({
    mutationFn: async ({ conversationId, requiresAttention, isAiPaused }: { conversationId: string; requiresAttention?: boolean; isAiPaused?: boolean }) => {
      const res = await api.post(`/whatsapp/conversations/${conversationId}/handover`, { requiresAttention, isAiPaused });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Conversation status updated');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      setSelectedConversation(null);
    }
  });

  // Order status update mutation
  const orderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await api.patch(`/whatsapp/orders/${orderId}/status`, { status });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'confirmed' ? 'Order confirmed!' : 'Order request declined');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-orders'] });
    }
  });

  // Computed status label
  const statusBadge = useMemo(() => {
    switch (session.status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Connected & Assisting
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCw size={12} className="animate-spin text-blue-600" />
            Connecting WhatsApp...
          </span>
        );
      case 'qr_ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <QrCode size={12} className="text-amber-600" />
            QR Ready to Scan
          </span>
        );
      case 'interrupted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle size={12} className="text-rose-600" />
            Connection Interrupted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Not Connected
          </span>
        );
    }
  }, [session.status]);

  // =========================================================================
  // VIEW: CONNECTED CONTROL CENTER (When session.status === 'connected')
  // =========================================================================
  if (isConnected) {
    const stats = session.stats || {
      messages_received: 0,
      ai_replies_sent: 0,
      pending_orders: 0,
      attention_needed: 0,
    };
    const conversations = conversationsData?.conversations || [];
    const orders = ordersData?.orders || [];

    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center font-bold">
                <MessageSquare size={22} strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  WhatsApp Assistant
                </h1>
                <p className="text-sm text-slate-600">
                  Connected shop number: <span className="font-semibold text-slate-900">{session.phone_number_masked || 'Active'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {statusBadge}
            <button
              onClick={() => settingsMutation.mutate({ isAiRepliesEnabled: !session.is_ai_replies_enabled })}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                session.is_ai_replies_enabled
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
              }`}
            >
              {session.is_ai_replies_enabled ? (
                <>
                  <Power size={16} />
                  Pause AI Replies
                </>
              ) : (
                <>
                  <Bot size={16} />
                  Resume AI Replies
                </>
              )}
            </button>

            <button
              onClick={() => setDisconnectModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-medium text-sm text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Messages Received
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats.messages_received}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              AI Replies Sent
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#0052FF]">
              {stats.ai_replies_sent}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Pending Orders
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-amber-600">
              {stats.pending_orders}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Needs Attention
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-rose-600">
              {stats.attention_needed}
            </span>
          </div>
        </div>

        {/* Pending Orders Section */}
        {orders.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-[#FF6B35]" />
                <h2 className="text-lg font-bold text-slate-900">
                  Pending Order Requests ({orders.filter(o => o.status === 'pending_confirmation').length})
                </h2>
              </div>
              <button
                onClick={() => refetchOrders()}
                className="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCw size={13} /> Refresh
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {orders.map((order) => {
                let items: any[] = [];
                try {
                  items = JSON.parse(order.items_json);
                } catch {}

                return (
                  <div key={order.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {order.customer_name || order.customer_phone}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          order.status === 'pending_confirmation' ? 'bg-amber-100 text-amber-800' :
                          order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {order.status === 'pending_confirmation' ? 'Pending Confirmation' : order.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {items.map((it: any, i: number) => (
                          <span key={i} className="inline-block mr-3">
                            • {it.product_name} x {it.quantity} (₹{it.unit_price * it.quantity})
                          </span>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="text-xs text-slate-600 italic">
                          Customer note: "{order.notes}"
                        </p>
                      )}
                    </div>

                    {order.status === 'pending_confirmation' && (
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        <button
                          onClick={() => orderStatusMutation.mutate({ orderId: order.id, status: 'confirmed' })}
                          className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition"
                        >
                          Confirm Order
                        </button>
                        <button
                          onClick={() => orderStatusMutation.mutate({ orderId: order.id, status: 'rejected' })}
                          className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Customer Conversations List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-[#0052FF]" />
              <h2 className="text-lg font-bold text-slate-900">
                Recent WhatsApp Customer Conversations
              </h2>
            </div>
            <button
              onClick={() => refetchConversations()}
              className="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1"
            >
              <RotateCw size={13} /> Refresh
            </button>
          </div>

          {conversations.length === 0 ? (
            <div className="py-12 text-center text-slate-600">
              <MessageSquare size={36} className="mx-auto mb-2 text-slate-400 stroke-1" />
              <p className="font-medium text-slate-700">No customer messages received yet</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                When customers send a message to your shop's connected WhatsApp number, they will appear here and FeraSetu AI will answer automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className="py-4 px-2 hover:bg-slate-50 rounded-xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {conv.customer_name || conv.customer_phone}
                      </span>
                      {conv.requires_attention ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                          Needs Attention
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          AI Replied
                        </span>
                      )}
                      {conv.is_ai_paused ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800">
                          AI Paused
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {conv.last_message_text || 'No message content'}
                    </p>
                    {conv.attention_reason && (
                      <p className="text-xs text-rose-600 font-medium">
                        Reason: {conv.attention_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Handover Modal */}
        {selectedConversation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-[#0052FF]" />
                  <h3 className="font-bold text-slate-900">
                    Customer Conversation
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-slate-600 uppercase font-semibold">Customer</span>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedConversation.customer_name || selectedConversation.customer_phone}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-600 uppercase font-semibold">Latest Message</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800">
                    {selectedConversation.last_message_text}
                  </div>
                </div>

                {selectedConversation.attention_reason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                    <strong>Attention Flag:</strong> {selectedConversation.attention_reason}
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {selectedConversation.requires_attention ? (
                  <button
                    onClick={() => handoverMutation.mutate({
                      conversationId: selectedConversation.id,
                      requiresAttention: false,
                    })}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition"
                  >
                    Mark as Handled / Clear Attention Flag
                  </button>
                ) : (
                  <button
                    onClick={() => handoverMutation.mutate({
                      conversationId: selectedConversation.id,
                      requiresAttention: true,
                    })}
                    className="w-full py-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition"
                  >
                    Flag for Merchant Review
                  </button>
                )}

                <button
                  onClick={() => handoverMutation.mutate({
                    conversationId: selectedConversation.id,
                    isAiPaused: !selectedConversation.is_ai_paused,
                  })}
                  className="w-full py-2.5 bg-slate-100 text-slate-800 rounded-xl text-sm font-medium hover:bg-slate-200 transition"
                >
                  {selectedConversation.is_ai_paused ? 'Resume AI for this Customer' : 'Pause AI for this Customer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disconnect Confirmation Modal */}
        {disconnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Disconnect Shop WhatsApp?
                </h3>
                <p className="text-sm text-slate-600">
                  FeraSetu AI will stop answering customer messages on this number immediately.
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left">
                  <strong>Notice:</strong> To completely unlink the session from your smartphone, open WhatsApp → tap Linked Devices → select "FeraSetu WhatsApp Assistant" → tap Log Out.
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDisconnectModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-medium text-sm hover:bg-rose-700 transition"
                >
                  {disconnectMutation.isPending ? 'Disconnecting...' : 'Yes, Disconnect'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: STEP 4 - SUCCESS SCREEN
  // =========================================================================
  if (wizardStep === 'success') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
          <CheckCircle2 size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Your shop's WhatsApp is connected!
          </h2>
          <p className="text-slate-600 max-w-md mx-auto">
            FeraSetu AI is ready to assist your customers.
          </p>
          {session.phone_number_masked && (
            <p className="text-sm font-semibold text-slate-900 pt-2">
              Connected Number: {session.phone_number_masked}
            </p>
          )}
        </div>

        <button
          onClick={() => {
            setWizardStep('intro');
            refetchSession();
          }}
          className="px-8 py-3.5 bg-[#0052FF] text-white rounded-xl font-semibold text-sm hover:bg-blue-700 shadow-sm transition"
        >
          Open Control Center
        </button>
      </div>
    );
  }

  // =========================================================================
  // VIEW: STEP 3 - SIMPLE QR CONNECTION WIZARD
  // =========================================================================
  if (wizardStep === 'pairing') {
    const isReady = session.status === 'qr_ready' && Boolean(session.qr_code_raw);

    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Connect your shop's WhatsApp
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Follow these simple steps on your phone.
          </p>
        </div>

        {/* Device Instructions Selector */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setDeviceTab('android')}
              className={`pb-3 font-semibold text-sm px-4 border-b-2 transition ${
                deviceTab === 'android'
                  ? 'border-[#0052FF] text-[#0052FF]'
                  : 'border-transparent text-slate-600 hover:text-slate-700'
              }`}
            >
              For Android
            </button>
            <button
              onClick={() => setDeviceTab('iphone')}
              className={`pb-3 font-semibold text-sm px-4 border-b-2 transition ${
                deviceTab === 'iphone'
                  ? 'border-[#0052FF] text-[#0052FF]'
                  : 'border-transparent text-slate-600 hover:text-slate-700'
              }`}
            >
              For iPhone
            </button>
          </div>

          {/* Step-by-Step Instructions */}
          {deviceTab === 'android' ? (
            <ol className="space-y-2.5 text-sm text-slate-700 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Open WhatsApp on your Android phone.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Tap the three dots (⋮) in the top-right corner.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Tap <strong>Linked Devices</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>Tap <strong>Link a Device</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">5</span>
                <span>Scan the QR code shown below.</span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-2.5 text-sm text-slate-700 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Open WhatsApp on your iPhone.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Open <strong>Settings</strong> at the bottom right.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Tap <strong>Linked Devices</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>Tap <strong>Link a Device</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">5</span>
                <span>Scan the QR code shown below.</span>
              </li>
            </ol>
          )}

          {/* QR Code Presentation Box */}
          <div className="pt-4 flex flex-col items-center justify-center">
            <div className="w-72 h-72 sm:w-80 sm:h-80 border-2 border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
              {isReady && session.qr_code_raw ? (
                <img
                  src={session.qr_code_raw}
                  alt="WhatsApp Linked Devices QR Code"
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-600 text-center px-4">
                  <RotateCw size={28} className="animate-spin text-[#0052FF]" />
                  <p className="text-sm font-semibold text-slate-800">
                    Preparing connection...
                  </p>
                  <p className="text-xs text-slate-600">
                    Generating a fresh QR code for your shop.
                  </p>
                </div>
              )}
            </div>

            {/* Status bar & countdown */}
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-600">
              {statusBadge}
              <button
                onClick={() => connectMutation.mutate()}
                className="ml-3 text-[#0052FF] hover:underline flex items-center gap-1 font-semibold"
              >
                <RotateCw size={12} /> Refresh QR
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => setWizardStep('intro')}
            className="text-xs text-slate-600 hover:text-slate-800 font-medium"
          >
            ← Back to introduction
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: STEP 2 - IMPORTANT CONNECTION DISCLOSURE
  // =========================================================================
  if (wizardStep === 'disclosure') {
    const canContinue = disclosureRiskAgreed && disclosureProcessAgreed;

    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert size={26} strokeWidth={1.75} />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Before you connect
            </h1>
            <p className="text-slate-700 text-sm leading-relaxed">
              FeraSetu uses an unofficial WhatsApp Web connection to connect your shop's WhatsApp number. This is not WhatsApp's officially supported Business API integration.
            </p>
            <p className="text-slate-700 text-sm leading-relaxed">
              WhatsApp may change its systems, disconnect linked devices, or restrict an account. FeraSetu cannot guarantee that your number will never be restricted.
            </p>
            <p className="text-slate-700 text-sm leading-relaxed font-semibold">
              We recommend using a separate number for your shop.
            </p>
            <p className="text-slate-700 text-sm leading-relaxed">
              Customers should start the conversation. FeraSetu will not send bulk messages or unsolicited promotional messages.
            </p>
          </div>

          {/* Mandatory Checkboxes */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={disclosureRiskAgreed}
                onChange={(e) => setDisclosureRiskAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-[#0052FF] focus:ring-[#0052FF]"
              />
              <span className="text-xs sm:text-sm text-slate-800 leading-snug">
                I understand that this is an unofficial WhatsApp integration and that WhatsApp may disconnect or restrict my connected number.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={disclosureProcessAgreed}
                onChange={(e) => setDisclosureProcessAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-[#0052FF] focus:ring-[#0052FF]"
              />
              <span className="text-xs sm:text-sm text-slate-800 leading-snug">
                I authorize FeraSetu to process messages from this connected shop number to provide AI assistance to my customers.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
            <button
              onClick={() => setWizardStep('intro')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => connectMutation.mutate()}
              disabled={!canContinue || connectMutation.isPending}
              className={`w-full sm:flex-1 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                canContinue && !connectMutation.isPending
                  ? 'bg-[#0052FF] text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {connectMutation.isPending ? (
                <>
                  <RotateCw size={16} className="animate-spin" />
                  Starting connection...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: STEP 1 - INTRODUCTION PAGE (Default before connecting)
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#0052FF] text-xs font-semibold border border-blue-100 mb-2">
          <Sparkles size={14} />
          FeraSetu AI Assistant
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Your shop can now reply automatically.
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          Meet your FeraSetu AI Assistant. It can answer customer questions, help customers find products, and collect order requests through your shop's WhatsApp.
        </p>

        <div className="pt-2">
          <button
            onClick={() => setWizardStep('disclosure')}
            className="w-full sm:w-auto px-8 py-4 bg-[#0052FF] text-white rounded-xl font-bold text-base hover:bg-blue-700 shadow-md hover:shadow-lg transition-all min-h-[48px] flex items-center justify-center gap-2 mx-auto"
          >
            Connect Shop WhatsApp
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* 3 Simple Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center font-bold">
            <MessageSquare size={20} />
          </div>
          <h3 className="font-bold text-slate-900 text-base pt-1">
            Answer customers
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Let AI answer questions about your products and prices.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold">
            <ShoppingBag size={20} />
          </div>
          <h3 className="font-bold text-slate-900 text-base pt-1">
            Receive orders
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Capture customer order requests automatically.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Bell size={20} />
          </div>
          <h3 className="font-bold text-slate-900 text-base pt-1">
            Stay informed
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Receive notifications whenever customers need your attention.
          </p>
        </div>
      </div>

      {/* 3-Step Simple Explanation & Illustration */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center">
          How it works
        </h2>

        {/* Visual Flow diagram */}
        <div className="p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0">
              👤
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Customer</p>
              <p className="text-xs text-slate-600">Sends WhatsApp message</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 rotate-90 md:rotate-0" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Shop WhatsApp</p>
              <p className="text-xs text-slate-600">Your dedicated shop number</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 rotate-90 md:rotate-0" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0052FF] flex items-center justify-center font-bold shrink-0">
              <Bot size={18} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">FeraSetu AI</p>
              <p className="text-xs text-slate-600">Checks your real catalog</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 rotate-90 md:rotate-0" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
              ✓
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Customer Response</p>
              <p className="text-xs text-slate-600">Instant grounded reply</p>
            </div>
          </div>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#0052FF] uppercase tracking-wider">Step 1</span>
            <h4 className="font-bold text-slate-900 text-base">Get a separate WhatsApp number</h4>
            <p className="text-sm text-slate-600">
              Use a dedicated SIM or business number for your shop.
            </p>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#0052FF] uppercase tracking-wider">Step 2</span>
            <h4 className="font-bold text-slate-900 text-base">Scan a QR code using your phone</h4>
            <p className="text-sm text-slate-600">
              Link your shop number in seconds using WhatsApp → Linked Devices.
            </p>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#0052FF] uppercase tracking-wider">Step 3</span>
            <h4 className="font-bold text-slate-900 text-base">FeraSetu AI starts assisting</h4>
            <p className="text-sm text-slate-600">
              Your customers receive instant answers and can request orders anytime.
            </p>
          </div>
        </div>
      </div>

      {/* What will FeraSetu AI do & What do I need */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600" />
            What will FeraSetu AI do?
          </h3>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>Answer product questions using your actual catalog.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>Check available product information.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>Help customers understand prices and product options.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>Collect order requests.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>Notify you about new orders immediately.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>Hand over complicated questions to you.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Info size={20} className="text-[#0052FF]" />
            What do I need?
          </h3>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>A separate WhatsApp number for your shop.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>WhatsApp installed on your smartphone.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>An active internet connection.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0052FF] font-bold">•</span>
              <span>Your products added to your FeraSetu catalog.</span>
            </li>
          </ul>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
            💡 <strong>Recommendation:</strong> Always keep your personal WhatsApp separate from your shop's AI number.
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Mail, ShieldCheck, Server, Globe, CheckCircle2, AlertTriangle,
  Copy, Check, RefreshCw, Trash2, Plus, Send, Eye, EyeOff,
  ChevronRight, Info, Lock, ArrowRight
} from 'lucide-react';
import api from '../services/api';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  purpose: string;
  required: boolean;
}

interface DomainData {
  id: string;
  domain: string;
  domain_type: 'PLATFORM' | 'FERASETU_MERCHANT' | 'CUSTOM';
  verification_status: 'PENDING' | 'VERIFYING' | 'VERIFIED' | 'FAILED' | 'SUSPENDED';
  dkim_status: string;
  spf_status: string;
  dmarc_status: string;
  mail_from_status: string;
  created_at: string;
}

interface EmailSettingsResponse {
  activeProvider: 'FERASETU' | 'EXTERNAL_SMTP';
  defaultIdentity: {
    id: string;
    email_address: string;
    display_name: string;
    is_default: number;
  } | null;
  ferasetuDomain: DomainData | null;
  customDomain: DomainData | null;
  externalConnection: {
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    security_mode: string;
    status: string;
    has_password: boolean;
  } | null;
  quota: {
    dailyLimit: number;
    sentToday: number;
    remainingDaily: number;
    extraBalance: number;
  };
}

export default function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [activeDnsInstructions, setActiveDnsInstructions] = useState<DnsRecord[]>([]);
  const [activeDomainObj, setActiveDomainObj] = useState<DomainData | null>(null);
  
  // Test email state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  // External SMTP state
  const [showPassword, setShowPassword] = useState(false);
  const [externalForm, setExternalForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    security_mode: 'STARTTLS'
  });

  // 1. Fetch Email Settings
  const { data: settingsData, isLoading } = useQuery<EmailSettingsResponse>({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const res = await api.get('/email/settings');
      return res.data;
    }
  });

  // 2. Fetch Recent Email Events
  const { data: eventsData } = useQuery({
    queryKey: ['email-events'],
    queryFn: async () => {
      const res = await api.get('/email/events');
      return res.data;
    }
  });

  // Provider switch mutation
  const switchProviderMutation = useMutation({
    mutationFn: async (provider: 'FERASETU' | 'EXTERNAL_SMTP') => {
      if (provider === 'FERASETU') {
        return (await api.post('/email/provider/ferasetu')).data;
      }
      return null;
    },
    onSuccess: () => {
      toast.success('Email provider updated');
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to switch provider');
    }
  });

  // Connect custom domain mutation
  const connectDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await api.post('/email/domains', { domain });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Custom domain registered. Please configure DNS records.');
      setActiveDomainObj(data.domain);
      setActiveDnsInstructions(data.dnsInstructions || []);
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to register domain');
    }
  });

  // Verify DNS records mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const res = await api.post(`/email/domains/${domainId}/verify`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.domain?.verification_status === 'VERIFIED') {
        toast.success('Domain verified successfully!');
      } else {
        toast.error('DNS propagation still pending. Please check again in a few minutes.');
      }
      setActiveDomainObj(data.domain);
      if (data.dnsInstructions) {
        setActiveDnsInstructions(data.dnsInstructions);
      }
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Verification check failed');
    }
  });

  // Delete custom domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const res = await api.delete(`/email/domains/${domainId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Custom domain removed');
      setShowConnectModal(false);
      setActiveDomainObj(null);
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete domain');
    }
  });

  // Save external SMTP mutation
  const saveExternalSmtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/email/provider/external', externalForm);
      return res.data;
    },
    onSuccess: () => {
      toast.success('External SMTP connected and activated');
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to connect SMTP');
    }
  });

  // Test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/email/test', { to: testEmailRecipient });
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Test email sent to ${testEmailRecipient}`);
      setShowTestModal(false);
      setTestEmailRecipient('');
      queryClient.invalidateQueries({ queryKey: ['email-events'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send test email');
    }
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenDomainModal = async (domainObj?: DomainData | null) => {
    if (domainObj) {
      setActiveDomainObj(domainObj);
      try {
        const res = await api.get(`/email/domains/${domainObj.id}`);
        setActiveDnsInstructions(res.data?.dnsInstructions || []);
      } catch {
        setActiveDnsInstructions([]);
      }
    } else {
      setActiveDomainObj(null);
      setActiveDnsInstructions([]);
      setCustomDomainInput('');
    }
    setShowConnectModal(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg" />
        <div className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
        <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const activeProvider = settingsData?.activeProvider || 'FERASETU';
  const customDomain = settingsData?.customDomain;
  const ferasetuDomain = settingsData?.ferasetuDomain;
  const defaultSender = settingsData?.defaultIdentity?.email_address || `orders@${ferasetuDomain?.domain || 'store.ferasetu.com'}`;
  const quota = settingsData?.quota;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Mail className="text-[#0052FF]" size={28} />
            Email Settings
          </h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">
            Send order, account, notification and business emails from FeraSetu.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0052FF] bg-[#0052FF]/10 hover:bg-[#0052FF]/15 border border-[#0052FF]/20 rounded-xl transition-all"
          >
            <Send size={15} />
            Send Test Email
          </button>
        </div>
      </div>

      {/* Quota & Health Banner */}
      {quota && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Delivery Status:</span>
            <span className="font-bold text-emerald-700">Active &amp; Protected</span>
          </div>
          <div className="text-slate-600">
            <span className="font-semibold text-slate-700">Daily Plan Limit:</span>{' '}
            <span className="font-mono font-bold text-slate-900">{quota.dailyLimit}</span> emails/day
          </div>
          <div className="text-slate-600 sm:text-right">
            <span className="font-semibold text-slate-700">Sent Today:</span>{' '}
            <span className="font-mono font-bold text-[#0052FF]">{quota.sentToday}</span> ({quota.remainingDaily} remaining)
          </div>
        </div>
      )}

      {/* SECTION 1: Provider Selection */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Delivery Infrastructure Provider</h2>
          <p className="text-xs text-slate-500">Select how FeraSetu delivers outgoing transactional emails.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* FeraSetu Email Card */}
          <div
            onClick={() => {
              if (activeProvider !== 'FERASETU') {
                switchProviderMutation.mutate('FERASETU');
              }
            }}
            className={`
              relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between
              ${activeProvider === 'FERASETU'
                ? 'border-[#0052FF] bg-blue-50/40 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'}
            `}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                  <ShieldCheck className="text-[#0052FF]" size={20} />
                  FeraSetu Email
                </div>
                <span className="px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide bg-blue-100 text-[#0052FF] rounded-full">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                FeraSetu handles delivery, authentication, SPF/DKIM alignment, and deliverability infrastructure automatically.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Zero server maintenance</span>
              {activeProvider === 'FERASETU' ? (
                <span className="flex items-center gap-1 text-[#0052FF] font-bold">
                  <CheckCircle2 size={14} /> Active
                </span>
              ) : (
                <span className="text-slate-400">Click to switch</span>
              )}
            </div>
          </div>

          {/* My Own SMTP Card */}
          <div
            onClick={() => {
              if (activeProvider !== 'EXTERNAL_SMTP') {
                // If external SMTP exists, switch immediately; otherwise let them fill form below
                if (settingsData?.externalConnection?.has_password) {
                  switchProviderMutation.mutate('EXTERNAL_SMTP');
                }
              }
            }}
            className={`
              relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between
              ${activeProvider === 'EXTERNAL_SMTP'
                ? 'border-[#0052FF] bg-blue-50/40 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'}
            `}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                  <Server className="text-slate-700" size={20} />
                  My own SMTP
                </div>
                <span className="px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-700 rounded-full">
                  Advanced
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Use your own external SMTP provider (Gmail, Amazon SES, SendGrid, Brevo, or custom mail relay).
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Custom relay credentials</span>
              {activeProvider === 'EXTERNAL_SMTP' ? (
                <span className="flex items-center gap-1 text-[#0052FF] font-bold">
                  <CheckCircle2 size={14} /> Active
                </span>
              ) : (
                <span className="text-slate-400">Configure below</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Sender Identity (When FeraSetu Email is Selected) */}
      {activeProvider === 'FERASETU' && (
        <div className="space-y-4 pt-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Sender Identity</h2>
            <p className="text-xs text-slate-500">
              Emails sent to your customers will appear from this authenticated address.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Identity A: FeraSetu-Managed Domain */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">FeraSetu Domain</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    <CheckCircle2 size={12} /> Ready
                  </span>
                </div>
                <div className="text-base font-extrabold text-slate-900 font-mono break-all">
                  orders@{ferasetuDomain?.domain || 'store.ferasetu.com'}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Pre-configured with zero DNS setup required. Powered by FeraSetu deliverability keys.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Authentication:</span>
                <span className="text-xs font-semibold text-emerald-600">DKIM / SPF Verified</span>
              </div>
            </div>

            {/* Identity B: Custom Domain */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Custom Domain</span>
                  {customDomain?.verification_status === 'VERIFIED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : customDomain ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                      <AlertTriangle size={12} /> Pending DNS
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">Not Connected</span>
                  )}
                </div>

                {customDomain ? (
                  <>
                    <div className="text-base font-extrabold text-slate-900 font-mono break-all">
                      orders@{customDomain.domain}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {customDomain.verification_status === 'VERIFIED'
                        ? 'Authenticated custom domain. Customers see your professional brand.'
                        : 'DNS setup pending. Click view to see records and verify.'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-base font-extrabold text-slate-400 font-mono">
                      orders@yourstore.com
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Send from your own domain with custom DKIM and SPF authentication.
                    </p>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {customDomain ? (
                  <button
                    onClick={() => handleOpenDomainModal(customDomain)}
                    className="text-xs font-bold text-[#0052FF] hover:underline flex items-center gap-1"
                  >
                    Manage DNS &amp; Status <ChevronRight size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenDomainModal(null)}
                    className="text-xs font-bold text-[#0052FF] bg-[#0052FF]/10 hover:bg-[#0052FF]/15 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus size={13} /> Connect Domain
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: External SMTP Configuration Form (When My own SMTP is active or expanding) */}
      {activeProvider === 'EXTERNAL_SMTP' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Server className="text-slate-800" size={18} />
                External SMTP Configuration
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your outbound SMTP credentials. Passwords are encrypted with AES-256-GCM.
              </p>
            </div>
            {settingsData?.externalConnection?.has_password && (
              <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                <Lock size={12} /> Credentials Encrypted
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                SMTP Host <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={externalForm.smtp_host || settingsData?.externalConnection?.smtp_host || ''}
                onChange={(e) => setExternalForm(prev => ({ ...prev, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com or smtp.mailgun.org"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Port <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={externalForm.smtp_port || settingsData?.externalConnection?.smtp_port || 587}
                onChange={(e) => setExternalForm(prev => ({ ...prev, smtp_port: Number(e.target.value) }))}
                placeholder="587"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Security Mode
              </label>
              <select
                value={externalForm.security_mode || settingsData?.externalConnection?.security_mode || 'STARTTLS'}
                onChange={(e) => setExternalForm(prev => ({ ...prev, security_mode: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
              >
                <option value="STARTTLS">STARTTLS (Port 587 recommended)</option>
                <option value="SSL_TLS">SSL / TLS (Port 465)</option>
                <option value="NONE">Plain / None (Port 25)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={externalForm.smtp_username || settingsData?.externalConnection?.smtp_username || ''}
                onChange={(e) => setExternalForm(prev => ({ ...prev, smtp_username: e.target.value }))}
                placeholder="username or email"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Password / App Secret <span className="text-red-500">*</span></span>
                {settingsData?.externalConnection?.has_password && !externalForm.smtp_password && (
                  <span className="text-emerald-600 font-semibold lowercase text-[11px]">(saved)</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={externalForm.smtp_password}
                  onChange={(e) => setExternalForm(prev => ({ ...prev, smtp_password: e.target.value }))}
                  placeholder={settingsData?.externalConnection?.has_password ? '••••••••••••' : 'Enter SMTP password or API key'}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              The server will execute a handshake test before updating configuration.
            </p>
            <button
              onClick={() => saveExternalSmtpMutation.mutate()}
              disabled={saveExternalSmtpMutation.isPending}
              className="px-5 py-2.5 bg-[#0052FF] text-white font-bold text-sm rounded-xl hover:bg-[#0042cc] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {saveExternalSmtpMutation.isPending ? <RefreshCw className="animate-spin" size={15} /> : <Check size={15} />}
              Test &amp; Save Connection
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: Recent Email Activity */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Delivery Activity</h2>
            <p className="text-xs text-slate-500">Audit logs of recent outgoing transactional emails.</p>
          </div>
          <span className="text-xs font-bold text-slate-500 font-mono">
            Sender: {defaultSender}
          </span>
        </div>

        {eventsData?.events && eventsData.events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-2.5">Event</th>
                  <th className="pb-2.5">Recipient</th>
                  <th className="pb-2.5">Subject</th>
                  <th className="pb-2.5">Provider</th>
                  <th className="pb-2.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {eventsData.events.slice(0, 10).map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5">
                      <span className={`
                        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold
                        ${ev.event_type === 'DELIVERED' || ev.event_type === 'SENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}
                      `}>
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-800">{ev.recipient}</td>
                    <td className="py-2.5 text-slate-600 truncate max-w-xs">{ev.subject || 'Notification'}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-bold font-mono">
                        {ev.provider || 'FERASETU'}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 text-right">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            No outgoing emails sent yet. Place an order or send a test email to view activity.
          </div>
        )}
      </div>

      {/* MODAL 1: Connect Custom Domain & DNS Table */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Globe className="text-[#0052FF]" size={20} />
                  Connect Custom Domain
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorize your domain so orders and notifications send directly from your brand.
                </p>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* If domain not yet submitted */}
            {!activeDomainObj ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Domain Name
                  </label>
                  <input
                    type="text"
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value)}
                    placeholder="example.com or mail.yourstore.com"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Do not include http:// or https://. Example: <code>yourstore.com</code>
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setShowConnectModal(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => connectDomainMutation.mutate(customDomainInput)}
                    disabled={!customDomainInput || connectDomainMutation.isPending}
                    className="px-5 py-2 text-sm font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {connectDomainMutation.isPending && <RefreshCw className="animate-spin" size={14} />}
                    Continue <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              /* DNS Records Table and Live Status */
              <div className="space-y-6">
                {/* Domain Verification Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <div className="text-slate-500 font-medium">Ownership</div>
                    <div className="font-bold flex items-center gap-1 mt-0.5">
                      {activeDomainObj.verification_status === 'VERIFIED' ? (
                        <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 size={13} /> Verified</span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1"><AlertTriangle size={13} /> Pending</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-medium">SPF</div>
                    <div className="font-bold flex items-center gap-1 mt-0.5">
                      {activeDomainObj.spf_status === 'VERIFIED' ? (
                        <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 size={13} /> Verified</span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1"><AlertTriangle size={13} /> Pending</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-medium">DKIM</div>
                    <div className="font-bold flex items-center gap-1 mt-0.5">
                      {activeDomainObj.dkim_status === 'VERIFIED' ? (
                        <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 size={13} /> Verified</span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1"><AlertTriangle size={13} /> Pending</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-medium">DMARC</div>
                    <div className="font-bold flex items-center gap-1 mt-0.5">
                      {activeDomainObj.dmarc_status === 'VERIFIED' ? (
                        <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 size={13} /> Verified</span>
                      ) : (
                        <span className="text-blue-700 flex items-center gap-1"><Info size={13} /> Recommended</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* DNS Instructions */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Required DNS Records for <code className="text-[#0052FF]">{activeDomainObj.domain}</code>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Value</th>
                          <th className="p-2.5 text-right">Copy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {activeDnsInstructions.map((rec, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-800">{rec.type}</td>
                            <td className="p-2.5 text-slate-700 truncate max-w-[120px]" title={rec.name}>{rec.name}</td>
                            <td className="p-2.5 text-slate-600 truncate max-w-[200px]" title={rec.value}>{rec.value}</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => copyToClipboard(rec.value, `${idx}_val`)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                title="Copy Value"
                              >
                                {copiedKey === `${idx}_val` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => deleteDomainMutation.mutate(activeDomainObj.id)}
                    disabled={deleteDomainMutation.isPending}
                    className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Remove Domain
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowConnectModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => verifyDomainMutation.mutate(activeDomainObj.id)}
                      disabled={verifyDomainMutation.isPending}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={verifyDomainMutation.isPending ? 'animate-spin' : ''} size={14} />
                      Check Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Send Test Email */}
      {showTestModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Send className="text-[#0052FF]" size={17} />
                Send Test Transactional Email
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Will be sent via active provider: <strong className="text-slate-800">{activeProvider}</strong> using sender{' '}
                <code className="text-[#0052FF]">{defaultSender}</code>
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => sendTestEmailMutation.mutate()}
                disabled={!testEmailRecipient || sendTestEmailMutation.isPending}
                className="px-5 py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {sendTestEmailMutation.isPending && <RefreshCw className="animate-spin" size={13} />}
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
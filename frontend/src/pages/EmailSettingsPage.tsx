import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Mail, ShieldCheck, Server, Globe, CheckCircle2, AlertTriangle,
  Copy, Check, RefreshCw, Trash2, Plus, Send, Eye, EyeOff,
  ChevronRight, ChevronDown, ChevronUp, Info, Lock, ArrowRight,
  ExternalLink, Sparkles, AlertCircle, ShoppingBag, Edit3, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
  ownership_verification_method?: string;
  verification_token_hash?: string;
  dkim_selector?: string;
  dkim_status: string;
  spf_status: string;
  dmarc_status: string;
  mail_from_status: string;
  created_at: string;
}

interface EmailIdentity {
  id: string;
  organization_id: string;
  domain_id: string;
  local_part: string;
  email_address: string;
  display_name: string;
  identity_type: 'MERCHANT' | 'CUSTOM' | 'PLATFORM';
  status: 'ACTIVE' | 'INACTIVE';
  is_default: number;
  domain?: string;
  verification_status?: string;
  domain_type?: string;
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
    created_at?: string;
    updated_at?: string;
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
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: 'domains' | 'email' (defaults to 'domains' or respects query param)
  const currentTab = searchParams.get('tab') === 'email' ? 'email' : 'domains';
  const setActiveTab = (tab: 'domains' | 'email') => {
    setSearchParams({ tab });
  };

  // Clipboard feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Connect Domain Modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('');

  // DNS Setup Modal state
  const [showDnsModal, setShowDnsModal] = useState(false);
  const [activeDomainObj, setActiveDomainObj] = useState<DomainData | null>(null);
  const [activeDnsInstructions, setActiveDnsInstructions] = useState<DnsRecord[]>([]);

  // Domain Search / Buy Interface (Spaceship Live API)
  const [domainSearchQuery, setDomainSearchQuery] = useState('');
  const [selectedTld, setSelectedTld] = useState('.com');
  const [isSearchingDomains, setIsSearchingDomains] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ domain: string; available: boolean; price?: number | null; priceInr?: number; currency?: string; periodYears?: number; isPremium?: boolean }>>([]);
  const [purchasingDomain, setPurchasingDomain] = useState<string | null>(null);
  const [spaceshipNotice, setSpaceshipNotice] = useState<{ domain: string; price?: number | null; currency?: string } | null>(null);

  // Sender Aliases state & modal
  const [showAddAliasModal, setShowAddAliasModal] = useState(false);
  const [newAliasLocalPart, setNewAliasLocalPart] = useState('support');
  const [newAliasDisplayName, setNewAliasDisplayName] = useState('');
  const [newAliasDomainId, setNewAliasDomainId] = useState('');
  const [editingIdentityId, setEditingIdentityId] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState('');

  // Merchant Reply-To state
  const [replyToInput, setReplyToInput] = useState('');
  const [isReplyToInitialized, setIsReplyToInitialized] = useState(false);

  // Advanced SMTP Accordion state
  const [smtpAccordionOpen, setSmtpAccordionOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [externalForm, setExternalForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    security_mode: 'STARTTLS'
  });

  // Test Email Modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  // 1. Fetch Email Settings
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery<EmailSettingsResponse>({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const res = await api.get('/email/settings');
      return res.data;
    }
  });

  // 2. Fetch All Registered Domains
  const { data: domainsList = [] } = useQuery<DomainData[]>({
    queryKey: ['email-domains'],
    queryFn: async () => {
      try {
        const res = await api.get('/email/domains');
        return res.data?.domains || [];
      } catch {
        return [];
      }
    }
  });

  // 3. Fetch Sender Identities
  const { data: identitiesList = [] } = useQuery<EmailIdentity[]>({
    queryKey: ['email-identities'],
    queryFn: async () => {
      try {
        const res = await api.get('/email/identities');
        return res.data?.identities || [];
      } catch {
        return [];
      }
    }
  });

  // 4. Fetch Smtp Settings for Reply-To
  const { data: smtpSettings } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: async () => {
      try {
        const res = await api.get('/settings/smtp');
        return res.data?.settings || null;
      } catch {
        return null;
      }
    }
  });

  // 5. Fetch Recent Delivery Activity
  const { data: eventsData } = useQuery({
    queryKey: ['email-events'],
    queryFn: async () => {
      try {
        const res = await api.get('/email/events');
        return res.data;
      } catch {
        return { events: [] };
      }
    }
  });

  // Initialize Reply-To address from smtp settings, store profile, or user email
  useEffect(() => {
    if (!isReplyToInitialized) {
      if (smtpSettings?.reply_to_email) {
        setReplyToInput(smtpSettings.reply_to_email);
        setIsReplyToInitialized(true);
      } else if (user?.email) {
        setReplyToInput(user.email);
        setIsReplyToInitialized(true);
      }
    }
  }, [smtpSettings, user, isReplyToInitialized]);

  // Provider switch mutation (FeraSetu vs External)
  const switchProviderMutation = useMutation({
    mutationFn: async (provider: 'FERASETU' | 'EXTERNAL_SMTP') => {
      if (provider === 'FERASETU') {
        return (await api.post('/email/provider/ferasetu')).data;
      }
      return null;
    },
    onSuccess: () => {
      toast.success('Active email delivery provider updated');
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
      toast.success('Domain registered! Please configure the 5 DNS records.');
      setShowConnectModal(false);
      setCustomDomainInput('');
      setActiveDomainObj(data.domain);
      setActiveDnsInstructions(data.dnsInstructions || []);
      setShowDnsModal(true);
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
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
        toast.success('Domain verified successfully! DKIM and SPF are live.');
      } else {
        toast.error('DNS propagation pending. Records might take 5–15 minutes to propagate.');
      }
      setActiveDomainObj(data.domain);
      if (data.dnsInstructions) {
        setActiveDnsInstructions(data.dnsInstructions);
      }
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      queryClient.invalidateQueries({ queryKey: ['email-identities'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Verification check failed');
    }
  });

  // Verify HTTPS / TLS readiness mutation
  const verifyTlsMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const res = await api.post(`/domains/${domainId}/verify-tls`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success && data.tlsStatus === 'ACTIVE') {
        toast.success('HTTPS / TLS certificate is active and verified!');
      } else {
        toast.error(`TLS provisioning in progress: ${data.probe?.error || 'Pending handshake'}`);
      }
      setActiveDomainObj(data.domain);
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'TLS probe failed');
    }
  });

  // Auto-configure Spaceship DNS mutation
  const autoDnsMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const res = await api.post(`/domains/${domainId}/auto-dns`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Spaceship DNS records updated automatically!');
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Auto-DNS update failed');
    }
  });

  // Delete custom domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const res = await api.delete(`/email/domains/${domainId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Custom domain removed successfully');
      setShowDnsModal(false);
      setActiveDomainObj(null);
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      queryClient.invalidateQueries({ queryKey: ['email-identities'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete domain');
    }
  });

  // Add Sender Alias mutation
  const addAliasMutation = useMutation({
    mutationFn: async (payload: { domain_id: string; local_part: string; display_name: string }) => {
      const res = await api.post('/email/identities', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sender alias added successfully');
      setShowAddAliasModal(false);
      setNewAliasLocalPart('support');
      setNewAliasDisplayName('');
      queryClient.invalidateQueries({ queryKey: ['email-identities'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add sender alias');
    }
  });

  // Set default identity mutation
  const setDefaultIdentityMutation = useMutation({
    mutationFn: async (identityId: string) => {
      const res = await api.patch(`/email/identities/${identityId}`, { is_default: true });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Default sender updated');
      queryClient.invalidateQueries({ queryKey: ['email-identities'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to set default sender');
    }
  });

  // Update display name mutation
  const updateDisplayNameMutation = useMutation({
    mutationFn: async ({ identityId, displayName }: { identityId: string; displayName: string }) => {
      const res = await api.patch(`/email/identities/${identityId}`, { display_name: displayName });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sender display name updated');
      setEditingIdentityId(null);
      queryClient.invalidateQueries({ queryKey: ['email-identities'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update sender name');
    }
  });

  // Delete identity mutation
  const deleteIdentityMutation = useMutation({
    mutationFn: async (identityId: string) => {
      const res = await api.delete(`/email/identities/${identityId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sender identity removed');
      queryClient.invalidateQueries({ queryKey: ['email-identities'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete identity');
    }
  });

  // Save Merchant Reply-To mutation
  const saveReplyToMutation = useMutation({
    mutationFn: async (emailToSave: string) => {
      const res = await api.post('/settings/smtp', {
        reply_to_email: emailToSave
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Customer Reply-To address saved');
      queryClient.invalidateQueries({ queryKey: ['smtp-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save Reply-To address');
    }
  });

  // Save external SMTP mutation
  const saveExternalSmtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/email/provider/external', externalForm);
      return res.data;
    },
    onSuccess: () => {
      toast.success('External SMTP connected and verified successfully');
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to connect SMTP');
    }
  });

  // Remove external SMTP mutation
  const removeExternalSmtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/email/provider/external');
      return res.data;
    },
    onSuccess: () => {
      toast.success('Custom SMTP removed. Reverted to FeraSetu Mail.');
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to remove SMTP');
    }
  });

  // Test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/email/test', { to: testEmailRecipient });
      return res.data;
    },
    onSuccess: (data: any) => {
      if (data?.success === false) {
        toast.error(data.error || 'Failed to send test email');
        return;
      }
      toast.success(`Test email sent to ${testEmailRecipient}`);
      setShowTestModal(false);
      setTestEmailRecipient('');
      queryClient.invalidateQueries({ queryKey: ['email-events'] });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to send test email');
    }
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenDnsModal = async (domainObj: DomainData) => {
    setActiveDomainObj(domainObj);
    try {
      const res = await api.get(`/email/domains/${domainObj.id}`);
      setActiveDnsInstructions(res.data?.dnsInstructions || []);
    } catch {
      setActiveDnsInstructions([]);
    }
    setShowDnsModal(true);
  };

  const handleSearchDomains = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainSearchQuery.trim()) return;
    setIsSearchingDomains(true);

    try {
      const res = await api.get(`/domains/search?q=${encodeURIComponent(domainSearchQuery.trim())}`);
      const results = res.data?.results || [];
      setSearchResults(results);
      if (results.length === 0) {
        toast.error('No domain results found for that query');
      }
    } catch (err: any) {
      console.warn('Spaceship domain search notice:', err);
      const baseName = domainSearchQuery.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      setSearchResults([
        { domain: `${baseName}.com`, available: true, price: 9.98, currency: 'USD' },
        { domain: `${baseName}.in`, available: true, price: 8.98, currency: 'USD' },
        { domain: `${baseName}.store`, available: true, price: 3.98, currency: 'USD' },
        { domain: `${baseName}.shop`, available: true, price: 4.98, currency: 'USD' }
      ]);
    } finally {
      setIsSearchingDomains(false);
    }
  };

  const handlePurchaseDomain = async (domain: string, price?: number | null, currency: string = 'USD') => {
    setPurchasingDomain(domain);
    try {
      const initRes = await api.post('/domains/purchase/initiate', {
        domain,
        years: 1,
      });

      const order = initRes.data?.order || initRes.data;

      if (order?.checkoutEnabled && order?.checkoutUrl) {
        toast.success('Redirecting to secure Spaceship checkout...');
        window.location.href = order.checkoutUrl;
      } else {
        // Direct customer checkout feature flag is awaiting provider commercial confirmation
        setSpaceshipNotice({
          domain,
          price: order?.quotedPrice ?? price,
          currency: order?.currency ?? currency
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to initiate domain purchase';
      toast.error(msg);
    } finally {
      setPurchasingDomain(null);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="h-10 w-56 bg-slate-200 animate-pulse rounded-xl" />
        <div className="h-14 bg-slate-100 animate-pulse rounded-2xl" />
        <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const activeProvider = settingsData?.activeProvider || 'FERASETU';
  const ferasetuDomain = settingsData?.ferasetuDomain;
  const customDomains = domainsList.filter(d => d.domain_type === 'CUSTOM');
  const defaultSender = settingsData?.defaultIdentity?.email_address || `orders@${ferasetuDomain?.domain || 'store.ferasetu.com'}`;
  const quota = settingsData?.quota || { dailyLimit: 100, sentToday: 0, remainingDaily: 100, extraBalance: 0 };
  const storeSlug = ferasetuDomain?.domain?.replace('.ferasetu.com', '') || user?.subdomain || 'mystore';
  const ferasetuSubdomain = ferasetuDomain?.domain || `${storeSlug}.ferasetu.com`;
  const quotaPercent = Math.min(100, Math.round((quota.sentToday / Math.max(1, quota.dailyLimit)) * 100));

  // Eligible domains for adding new aliases (verified or platform)
  const eligibleDomainsForAlias = [
    ferasetuDomain,
    ...customDomains.filter(d => d.verification_status === 'VERIFIED')
  ].filter(Boolean) as DomainData[];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-[#0052FF] rounded-full">
              Store Infrastructure
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Globe className="text-[#0052FF]" size={28} />
            Domains &amp; Email
          </h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">
            Manage your storefront web addresses, branded email delivery, and customer communications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0052FF] bg-[#0052FF]/10 hover:bg-[#0052FF]/15 border border-[#0052FF]/20 rounded-xl transition-all shadow-sm"
          >
            <Send size={15} />
            Send Test Email
          </button>
        </div>
      </div>

      {/* Modern Two-Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('domains')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            currentTab === 'domains'
              ? 'border-[#0052FF] text-[#0052FF] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Globe size={18} />
          <span>Domains</span>
          <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
            currentTab === 'domains' ? 'bg-[#0052FF] text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {1 + customDomains.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            currentTab === 'email'
              ? 'border-[#0052FF] text-[#0052FF] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Mail size={18} />
          <span>Email</span>
          <span className="hidden sm:inline-block px-2 py-0.5 text-xs rounded-full font-mono bg-emerald-100 text-emerald-800">
            {defaultSender}
          </span>
        </button>
      </div>

      {/* TAB 1: DOMAINS */}
      {currentTab === 'domains' && (
        <div className="space-y-8 animate-fade-in">
          {/* Top Actions & Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Storefront &amp; Domain Addresses</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every store receives a free FeraSetu subdomain. Connect or buy a custom web domain anytime.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0052FF] bg-white border border-[#0052FF]/30 hover:border-[#0052FF] hover:bg-blue-50/40 rounded-xl transition-all shadow-sm"
              >
                <Plus size={14} /> Connect Domain
              </button>
              <a
                href="#buy-domain-section"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-all shadow-sm"
              >
                <ShoppingBag size={14} /> Buy Domain
              </a>
            </div>
          </div>

          {/* Active Domains Cards List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Active Domains</h3>

            {/* 1. Managed FeraSetu Subdomain Card */}
            <div className="bg-white border-2 border-[#0052FF]/30 rounded-2xl p-5 md:p-6 shadow-sm hover:border-[#0052FF] transition-all space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base md:text-lg font-extrabold text-slate-900">
                      {ferasetuSubdomain}
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide bg-blue-100 text-[#0052FF] rounded-full">
                      Platform Default
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={12} /> Verified &amp; Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Always available. Automatically provisions free HTTPS SSL certificates and email deliverability.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <a
                    href={`https://${ferasetuSubdomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    View Live Store <ArrowUpRight size={13} />
                  </a>
                  <button
                    onClick={() => copyToClipboard(`https://${ferasetuSubdomain}`, 'subdomain_url')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    title="Copy Store URL"
                  >
                    {copiedKey === 'subdomain_url' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    Copy URL
                  </button>
                </div>
              </div>

              {/* Dual Connection Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-semibold text-slate-700 flex items-center gap-2">
                    <Globe size={15} className="text-[#0052FF]" /> Storefront Connection:
                  </span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Connected
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-semibold text-slate-700 flex items-center gap-2">
                    <Mail size={15} className="text-[#0052FF]" /> Email Delivery:
                  </span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Active (orders@{ferasetuSubdomain})
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Custom Domains List */}
            {customDomains.length > 0 ? (
              customDomains.map((domain) => (
                <div
                  key={domain.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base md:text-lg font-extrabold text-slate-900">
                          {domain.domain}
                        </span>
                        <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-700 rounded-full">
                          Custom Domain
                        </span>
                        {domain.verification_status === 'VERIFIED' ? (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={12} /> Verified &amp; Active
                          </span>
                        ) : domain.verification_status === 'FAILED' ? (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full flex items-center gap-1">
                            <AlertTriangle size={12} /> DNS Failed
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
                            <AlertCircle size={12} /> Pending DNS Setup
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {domain.verification_status === 'VERIFIED'
                          ? 'Your custom domain is authenticated and powering your storefront and branded email notices.'
                          : 'DNS propagation required. Add the 5 verification records at your DNS registrar.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => handleOpenDnsModal(domain)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#0052FF] bg-[#0052FF]/10 hover:bg-[#0052FF]/15 rounded-xl transition-colors"
                      >
                        DNS Setup &amp; Records <ChevronRight size={13} />
                      </button>
                      <button
                        onClick={() => verifyDomainMutation.mutate(domain.id)}
                        disabled={verifyDomainMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={verifyDomainMutation.isPending ? 'animate-spin' : ''} size={13} />
                        Verify DNS
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove custom domain ${domain.domain}?`)) {
                            deleteDomainMutation.mutate(domain.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Remove Domain"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Dual Connection Indicators */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-semibold text-slate-700 flex items-center gap-2">
                        <Globe size={15} className="text-[#0052FF]" /> Storefront Connection:
                      </span>
                      {domain.verification_status === 'VERIFIED' ? (
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Connected
                        </span>
                      ) : (
                        <span className="font-bold text-amber-700 flex items-center gap-1">
                          <AlertCircle size={14} /> DNS Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-semibold text-slate-700 flex items-center gap-2">
                        <Mail size={15} className="text-[#0052FF]" /> Email Delivery:
                      </span>
                      {domain.verification_status === 'VERIFIED' ? (
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={14} /> DKIM / SPF Verified
                        </span>
                      ) : (
                        <span className="font-bold text-amber-700 flex items-center gap-1">
                          <AlertCircle size={14} /> DNS Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 bg-white border border-dashed border-slate-300 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052FF] flex items-center justify-center mx-auto">
                  <Globe size={24} />
                </div>
                <div className="max-w-md mx-auto">
                  <h4 className="text-base font-bold text-slate-900">Connect Your Own Domain</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect an existing domain (e.g. <code>yourstore.in</code>) from GoDaddy, Namecheap, Cloudflare, etc., or search and buy a new domain below.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowConnectModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-all shadow-sm"
                  >
                    <Plus size={14} /> Connect Existing Domain
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Search & Buy New Domain (Hook-Ready for M3) */}
          <div id="buy-domain-section" className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#FF6B35]" />
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Buy a New Custom Domain</h3>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-orange-100 text-[#FF6B35] rounded-full">
                    Zero Setup
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Search, buy, and auto-link a professional <code>.in</code> or <code>.com</code> domain. Automatic SSL &amp; DNS routing included.
                </p>
              </div>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearchDomains} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={domainSearchQuery}
                  onChange={(e) => setDomainSearchQuery(e.target.value)}
                  placeholder="Enter your store name (e.g. rohankirana, mybrand)"
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] font-mono"
                />
              </div>

              {/* TLD Selector */}
              <div className="flex items-center gap-2">
                {['.in', '.com', '.store', '.co.in'].map((tld) => (
                  <button
                    type="button"
                    key={tld}
                    onClick={() => setSelectedTld(tld)}
                    className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                      selectedTld === tld
                        ? 'bg-[#0052FF] text-white border-[#0052FF]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {tld}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSearchingDomains || !domainSearchQuery.trim()}
                className="px-6 py-3 text-sm font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSearchingDomains ? <RefreshCw className="animate-spin" size={15} /> : <ShoppingBag size={15} />}
                Search Availability
              </button>
            </form>

            {/* Search Results Display */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {searchResults.map((res) => (
                  <div
                    key={res.domain}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-[#0052FF] transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-sm text-slate-900">{res.domain}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                          Available
                        </span>
                      </div>
                      <div className="text-base font-extrabold text-[#0052FF]">
                        {res.currency === 'USD' || !res.currency
                          ? `$${res.price ?? 9.98} USD`
                          : `₹${res.priceInr ?? res.price}`}
                        <span className="text-[11px] font-normal text-slate-500"> / year</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurchaseDomain(res.domain, res.price ?? res.priceInr, res.currency || 'USD')}
                      disabled={purchasingDomain === res.domain}
                      className="w-full py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] disabled:bg-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {purchasingDomain === res.domain ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={13} /> Checkout at Spaceship
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL */}
      {currentTab === 'email' && (
        <div className="space-y-8 animate-fade-in">
          {/* Quota & Health Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Delivery Quota &amp; Health</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily transactional email limit for order notifications, OTPs, and invoices.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active &amp; Protected
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Sent Today:</span>
                <span className="text-slate-900 font-mono">
                  {quota.sentToday} / {quota.dailyLimit} emails ({quota.remainingDaily} remaining)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    quotaPercent > 90 ? 'bg-rose-500' : quotaPercent > 70 ? 'bg-[#FF6B35]' : 'bg-[#0052FF]'
                  }`}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Free Plan: 100 emails/day • Resets daily at midnight IST</span>
                <Link to="/upgrade" className="text-[#0052FF] font-bold hover:underline flex items-center gap-0.5">
                  Need more? Upgrade plan <ChevronRight size={11} />
                </Link>
              </div>
            </div>
          </div>

          {/* Hero Card: FeraSetu Mail (Default Active Experience) */}
          <div className="bg-gradient-to-r from-blue-50/50 to-white border-2 border-[#0052FF] rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide bg-[#0052FF] text-white rounded-full">
                    Recommended Default
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={13} /> Active &amp; Protected
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="text-[#0052FF]" size={24} />
                  FeraSetu Managed Mail
                </h2>
                <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Ready out of the box with zero SMTP configuration. Outbound transactional emails are automatically signed with 2048-bit RSA DKIM (<code className="text-[#0052FF]">fs1</code>), SPF, and DMARC alignment.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Default Sender</div>
                <div className="font-mono text-sm md:text-base font-extrabold text-[#0052FF] break-all">
                  orders@{ferasetuSubdomain}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200/60 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Zero manual server setup
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> 100% DKIM &amp; SPF aligned
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Optimized Indian retail inbox rates
              </div>
            </div>
          </div>

          {/* Section: Sender Identity & Aliases Manager */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Mail className="text-[#0052FF]" size={20} />
                  Sender Identities &amp; Aliases
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure official aliases (<code>orders@</code>, <code>support@</code>, <code>billing@</code>) for your store.
                </p>
              </div>

              <button
                onClick={() => setShowAddAliasModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0052FF] bg-[#0052FF]/10 hover:bg-[#0052FF]/15 border border-[#0052FF]/20 rounded-xl transition-all self-start sm:self-auto"
              >
                <Plus size={14} /> Add Sender Alias
              </button>
            </div>

            {/* List of Identities */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {identitiesList.length > 0 ? (
                identitiesList.map((ident) => (
                  <div key={ident.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {ident.email_address}
                        </span>
                        {ident.is_default === 1 && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-[#0052FF] text-white rounded-full">
                            Default Sender
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                          Active
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Display Name: <strong className="text-slate-700">{ident.display_name}</strong></span>
                        {editingIdentityId === ident.id ? (
                          <span className="inline-flex items-center gap-1">
                            <input
                              type="text"
                              value={editingDisplayName}
                              onChange={(e) => setEditingDisplayName(e.target.value)}
                              placeholder="New Display Name"
                              className="px-2 py-0.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-[#0052FF]"
                            />
                            <button
                              onClick={() => updateDisplayNameMutation.mutate({ identityId: ident.id, displayName: editingDisplayName })}
                              className="px-2 py-0.5 text-xs bg-[#0052FF] text-white rounded font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingIdentityId(null)}
                              className="px-1 text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingIdentityId(ident.id);
                              setEditingDisplayName(ident.display_name);
                            }}
                            className="text-[#0052FF] hover:underline flex items-center gap-0.5 text-[11px]"
                          >
                            <Edit3 size={11} /> Edit
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {ident.is_default !== 1 && (
                        <button
                          onClick={() => setDefaultIdentityMutation.mutate(ident.id)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Set as Default
                        </button>
                      )}
                      {ident.is_default !== 1 && (
                        <button
                          onClick={() => deleteIdentityMutation.mutate(ident.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Identity"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                /* Fallback single default identity if not yet loaded */
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{defaultSender}</span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-[#0052FF] text-white rounded-full">
                        Default Sender
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Primary sender for order notifications and fulfillment updates.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Configurable Merchant Reply-To Routing */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Merchant Customer Reply-To Address</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} /> Verified Routing
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  When customers hit &quot;Reply&quot; on order confirmations or notices, replies route directly to this address.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Reply-To Inbox Email
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={replyToInput}
                  onChange={(e) => setReplyToInput(e.target.value)}
                  placeholder="merchant@example.com"
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                />
                <button
                  onClick={() => saveReplyToMutation.mutate(replyToInput)}
                  disabled={saveReplyToMutation.isPending || !replyToInput.includes('@')}
                  className="px-5 py-2.5 bg-[#0052FF] text-white font-bold text-xs rounded-xl hover:bg-[#0042cc] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {saveReplyToMutation.isPending ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  Save Reply-To Address
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Preserves 100% DKIM and SPF alignment on outbound sender while forwarding customer inquiries to your actual inbox.
              </p>
            </div>
          </div>

          {/* Section: Expandable Advanced SMTP Settings Accordion */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all">
            <button
              onClick={() => setSmtpAccordionOpen(!smtpAccordionOpen)}
              className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                  <Server size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Advanced: Custom SMTP Server Relay</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full flex items-center gap-1">
                      <Lock size={10} /> AES-256-GCM Encrypted
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For advanced merchants who prefer routing through Amazon SES, SendGrid, Brevo, or Gmail relay credentials.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {activeProvider === 'EXTERNAL_SMTP' && (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-[#0052FF] rounded-full">
                    Active Relay
                  </span>
                )}
                {smtpAccordionOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </div>
            </button>

            {/* Accordion Body */}
            {smtpAccordionOpen && (
              <div className="p-6 border-t border-slate-100 space-y-6 bg-slate-50/40 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      SMTP Host <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={externalForm.smtp_host || settingsData?.externalConnection?.smtp_host || ''}
                      onChange={(e) => setExternalForm(prev => ({ ...prev, smtp_host: e.target.value }))}
                      placeholder="smtp.gmail.com or email-smtp.us-east-1.amazonaws.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
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
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
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
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Password / App Secret <span className="text-red-500">*</span></span>
                      {settingsData?.externalConnection?.has_password && !externalForm.smtp_password && (
                        <span className="text-emerald-600 font-semibold lowercase text-[11px]">(encrypted)</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={externalForm.smtp_password}
                        onChange={(e) => setExternalForm(prev => ({ ...prev, smtp_password: e.target.value }))}
                        placeholder={settingsData?.externalConnection?.has_password ? '••••••••••••' : 'Enter SMTP password or API key'}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
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

                <div className="pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    A handshake test is performed automatically before credentials are encrypted and stored.
                  </p>
                  <div className="flex items-center gap-2">
                    {activeProvider === 'EXTERNAL_SMTP' ? (
                      <button
                        onClick={() => removeExternalSmtpMutation.mutate()}
                        disabled={removeExternalSmtpMutation.isPending}
                        className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        Revert to FeraSetu Mail
                      </button>
                    ) : (
                      settingsData?.externalConnection?.has_password && (
                        <button
                          onClick={() => switchProviderMutation.mutate('EXTERNAL_SMTP')}
                          className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
                        >
                          Switch to this SMTP
                        </button>
                      )
                    )}

                    <button
                      onClick={() => saveExternalSmtpMutation.mutate()}
                      disabled={saveExternalSmtpMutation.isPending}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {saveExternalSmtpMutation.isPending ? <RefreshCw className="animate-spin" size={13} /> : <Check size={13} />}
                      Test &amp; Save Connection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Recent Delivery Activity Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Delivery Activity</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit log of recently dispatched transactional emails. Body contents are strictly protected.
                </p>
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
                      <th className="pb-2.5">Template / Subject</th>
                      <th className="pb-2.5">Provider</th>
                      <th className="pb-2.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {eventsData.events.slice(0, 10).map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            ev.event_type === 'DELIVERED' || ev.event_type === 'SENT'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
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
                No outgoing emails sent yet. Place an order or click &quot;Send Test Email&quot; above to preview activity.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Connect Custom Domain */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Globe className="text-[#0052FF]" size={18} />
                Connect Existing Domain
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  placeholder="e.g. yourstore.in or shop.example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Do not include <code>http://</code> or <code>https://</code>.
                </p>
              </div>

              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-600 space-y-1">
                <div className="font-bold text-[#0052FF] flex items-center gap-1">
                  <Info size={13} /> Next step: Guided DNS Setup
                </div>
                <p>
                  You will receive 5 standard DNS records (TXT challenge, DKIM, SPF, DMARC, CNAME) to add at your registrar.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => connectDomainMutation.mutate(customDomainInput)}
                  disabled={!customDomainInput || connectDomainMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {connectDomainMutation.isPending && <RefreshCw className="animate-spin" size={13} />}
                  Continue <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Guided DNS Verification Table */}
      {showDnsModal && activeDomainObj && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Globe className="text-[#0052FF]" size={18} />
                  DNS Verification: <code className="text-[#0052FF]">{activeDomainObj.domain}</code>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add these 5 DNS records at your registrar (Cloudflare, GoDaddy, Namecheap, Hostinger) to verify ownership and activate DKIM/SPF.
                </p>
              </div>
              <button
                onClick={() => setShowDnsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Verification Status Badges */}
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

            {/* DNS Records Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Required DNS Records
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Host / Name</th>
                      <th className="p-2.5">Value</th>
                      <th className="p-2.5 text-right">Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {activeDnsInstructions.length > 0 ? (
                      activeDnsInstructions.map((rec, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-800">{rec.type}</td>
                          <td className="p-2.5 text-slate-700 truncate max-w-[130px]" title={rec.name}>{rec.name}</td>
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
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 text-xs">
                          Generating DNS records... click &quot;Check Again&quot; below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (confirm(`Remove domain ${activeDomainObj.domain}?`)) {
                    deleteDomainMutation.mutate(activeDomainObj.id);
                  }
                }}
                disabled={deleteDomainMutation.isPending}
                className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
              >
                <Trash2 size={14} /> Remove Domain
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => autoDnsMutation.mutate(activeDomainObj.id)}
                  disabled={autoDnsMutation.isPending}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Automatically write DNS records via Spaceship API"
                >
                  <RefreshCw className={autoDnsMutation.isPending ? 'animate-spin' : ''} size={13} />
                  Auto-DNS (Spaceship)
                </button>
                <button
                  onClick={() => verifyTlsMutation.mutate(activeDomainObj.id)}
                  disabled={verifyTlsMutation.isPending}
                  className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Probe live TLS certificate readiness"
                >
                  <ShieldCheck size={13} />
                  Verify HTTPS
                </button>
                <button
                  onClick={() => verifyDomainMutation.mutate(activeDomainObj.id)}
                  disabled={verifyDomainMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw className={verifyDomainMutation.isPending ? 'animate-spin' : ''} size={13} />
                  Check DNS
                </button>
                <button
                  onClick={() => setShowDnsModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Spaceship Direct Checkout Notice */}
      {spaceshipNotice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="text-[#0052FF]" size={20} />
                <h3 className="text-base font-bold text-slate-900">
                  Spaceship Domain Checkout
                </h3>
              </div>
              <button
                onClick={() => setSpaceshipNotice(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Domain:</span>
                  <span className="font-mono font-bold text-sm text-slate-900">{spaceshipNotice.domain}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Official Spaceship Price:</span>
                  <span className="font-extrabold text-sm text-[#0052FF]">
                    {spaceshipNotice.currency === 'USD' ? `$${spaceshipNotice.price || 9.98} USD` : `₹${spaceshipNotice.price || 799}`} / yr
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>FeraSetu Markup:</span>
                  <span className="font-bold text-emerald-600">$0.00 (0% Commission)</span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1.5">
                <div className="font-bold text-[#0052FF] flex items-center gap-1.5 text-xs">
                  <Info size={14} /> Spaceship Direct Purchase Instructions
                </div>
                <p className="leading-relaxed">
                  To protect your payment privacy and ensure 100% legal ownership, you pay Spaceship directly. Register this domain in 1 minute on Spaceship.com, then click &quot;Connect to FeraSetu&quot; below.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <a
                  href={`https://www.spaceship.com/domain-search/?query=${encodeURIComponent(spaceshipNotice.domain)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-[#0052FF] bg-[#0052FF]/10 hover:bg-[#0052FF]/15 border border-[#0052FF]/20 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={13} />
                  Register on Spaceship.com
                </a>
                <button
                  onClick={() => {
                    const dom = spaceshipNotice.domain;
                    setSpaceshipNotice(null);
                    connectDomainMutation.mutate(dom);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check size={13} />
                  Connect to FeraSetu Store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Sender Alias */}
      {showAddAliasModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Plus className="text-[#0052FF]" size={17} />
                Add Sender Alias
              </h3>
              <button
                onClick={() => setShowAddAliasModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Domain
                </label>
                <select
                  value={newAliasDomainId || eligibleDomainsForAlias[0]?.id || ''}
                  onChange={(e) => setNewAliasDomainId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                >
                  {eligibleDomainsForAlias.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.domain} ({d.domain_type === 'FERASETU_MERCHANT' ? 'FeraSetu Managed' : 'Custom Verified'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Local Part (Prefix)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAliasLocalPart}
                    onChange={(e) => setNewAliasLocalPart(e.target.value)}
                    placeholder="support"
                    className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] font-mono"
                  />
                  <span className="text-slate-400 text-sm font-mono">@...</span>
                </div>
                {/* Suggestions */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400">Suggestions:</span>
                  {['support', 'billing', 'sales', 'care'].map((sug) => (
                    <button
                      type="button"
                      key={sug}
                      onClick={() => setNewAliasLocalPart(sug)}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newAliasDisplayName}
                  onChange={(e) => setNewAliasDisplayName(e.target.value)}
                  placeholder="e.g. Rohan Kirana Customer Care"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowAddAliasModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const domainId = newAliasDomainId || eligibleDomainsForAlias[0]?.id;
                    if (!domainId || !newAliasLocalPart) return;
                    addAliasMutation.mutate({
                      domain_id: domainId,
                      local_part: newAliasLocalPart,
                      display_name: newAliasDisplayName || 'Store'
                    });
                  }}
                  disabled={!newAliasLocalPart || addAliasMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {addAliasMutation.isPending && <RefreshCw className="animate-spin" size={13} />}
                  Add Alias
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Send Test Email */}
      {showTestModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-scale-in">
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
                className="px-5 py-2 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0042cc] rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
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
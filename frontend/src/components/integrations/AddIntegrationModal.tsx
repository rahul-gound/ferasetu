import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  ExternalLink,
  Plus,
  Key,
  Sliders,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getIntegrationLogo } from './IntegrationLogos';
import api from '../../services/api';

export interface CatalogIntegration {
  id: string;
  name: string;
  category: 'payments' | 'logistics' | 'messaging' | 'accounting' | 'hardware' | 'ai';
  developer: string;
  description: string;
  badge?: string;
  docsUrl?: string;
  popular?: boolean;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'select';
    placeholder?: string;
    options?: { label: string; value: string }[];
    helperText?: string;
    required?: boolean;
  }[];
}

export const INTEGRATION_CATALOG: CatalogIntegration[] = [
  // Payments
  {
    id: 'cashfree-pg',
    name: 'Cashfree Payments',
    category: 'payments',
    developer: 'Cashfree Payments India',
    description: 'Instant UPI Intent, cards, netbanking, and direct settlement to merchant bank account with 0% platform fee.',
    badge: 'Popular in India',
    popular: true,
    docsUrl: 'https://docs.cashfree.com',
    fields: [
      { key: 'appId', label: 'Cashfree App ID', type: 'text', placeholder: 'CF123456...', required: true, helperText: 'Find in Cashfree Merchant Dashboard → API Keys' },
      { key: 'secretKey', label: 'Cashfree Secret Key', type: 'password', placeholder: 'cfsk_ma_prod_...', required: true },
      {
        key: 'environment',
        label: 'Environment',
        type: 'select',
        options: [
          { label: 'Production (Live Storefront)', value: 'production' },
          { label: 'Sandbox (Testing Mode)', value: 'sandbox' },
        ],
      },
    ],
  },
  {
    id: 'razorpay-pg',
    name: 'Razorpay Smart Routing',
    category: 'payments',
    developer: 'Razorpay Software',
    description: 'High-availability payment fallback supporting International cards, UPI QR, and EMI with automated error recovery.',
    badge: 'Enterprise Gateway',
    popular: true,
    docsUrl: 'https://razorpay.com/docs',
    fields: [
      { key: 'keyId', label: 'Key ID', type: 'text', placeholder: 'rzp_live_...', required: true },
      { key: 'keySecret', label: 'Key Secret', type: 'password', placeholder: '••••••••••••', required: true },
    ],
  },
  {
    id: 'stripe-pg',
    name: 'Stripe Global Payments',
    category: 'payments',
    developer: 'Stripe Inc.',
    description: 'Accept credit cards, Apple Pay, Google Pay, and European payment methods across 135+ currencies worldwide.',
    badge: 'Global Commerce',
    popular: true,
    docsUrl: 'https://stripe.com/docs',
    fields: [
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...', required: true },
    ],
  },
  {
    id: 'phonepe-pg',
    name: 'PhonePe Payment Gateway',
    category: 'payments',
    developer: 'PhonePe India',
    description: 'Direct UPI flow for over 500 million Indian PhonePe users with zero transaction dropout.',
    badge: 'Direct UPI',
    docsUrl: 'https://developer.phonepe.com',
    fields: [
      { key: 'merchantId', label: 'Merchant ID (MID)', type: 'text', placeholder: 'PGTESTPAYUAT', required: true },
      { key: 'saltKey', label: 'Salt Key', type: 'password', placeholder: '••••••••', required: true },
      { key: 'saltIndex', label: 'Salt Index', type: 'text', placeholder: '1', required: true },
    ],
  },
  {
    id: 'paypal-pg',
    name: 'PayPal Commerce',
    category: 'payments',
    developer: 'PayPal Holdings',
    description: 'Trusted worldwide checkout for cross-border retail, international tourist shoppers, and diaspora buyers.',
    badge: 'International',
    docsUrl: 'https://developer.paypal.com',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'AY...Client_ID', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: '••••••••', required: true },
    ],
  },
  {
    id: 'paytm-pg',
    name: 'Paytm Payment Gateway',
    category: 'payments',
    developer: 'One97 Communications',
    description: 'Accept UPI, Paytm Wallet, netbanking, and cards with instant webhook settlement.',
    badge: 'Popular UPI',
    docsUrl: 'https://developer.paytm.com',
    fields: [
      { key: 'merchantId', label: 'Merchant ID (MID)', type: 'text', placeholder: 'PAYTM_MID_...', required: true },
      { key: 'merchantKey', label: 'Merchant Key', type: 'password', placeholder: '••••••••', required: true },
    ],
  },
  {
    id: 'payu-pg',
    name: 'PayU India Gateway',
    category: 'payments',
    developer: 'PayU Payments',
    description: 'Enterprise payment stack supporting card EMI, UPI Intent, and multi-currency billing.',
    badge: 'Enterprise',
    fields: [
      { key: 'merchantKey', label: 'Merchant Key', type: 'text', placeholder: 'PAYU_KEY_...', required: true },
      { key: 'merchantSalt', label: 'Merchant Salt', type: 'password', placeholder: '••••••••', required: true },
    ],
  },
  {
    id: 'pinelabs-pg',
    name: 'Pine Labs Plural',
    category: 'payments',
    developer: 'Pine Labs India',
    description: 'Unified online and countertop payment orchestration across retail branches.',
    badge: 'Retail POS',
    fields: [
      { key: 'merchantId', label: 'Plural Merchant ID', type: 'text', placeholder: 'PLURAL_MID_...', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: '••••••••', required: true },
    ],
  },

  // Logistics
  {
    id: 'shiprocket-logistics',
    name: 'Shiprocket Multi-Carrier',
    category: 'logistics',
    developer: 'Shiprocket BigFoot',
    description: 'Automated 1-click AWB generation, pickup scheduling, and live tracking across 29,000+ Indian pincodes.',
    badge: 'Top Courier Hub',
    popular: true,
    docsUrl: 'https://www.shiprocket.in/api',
    fields: [
      { key: 'email', label: 'Shiprocket Account Email', type: 'text', placeholder: 'logistics@store.com', required: true },
      { key: 'password', label: 'Password or API Token', type: 'password', placeholder: '••••••••', required: true },
      { key: 'pickupLocation', label: 'Default Pickup Pincode / Hub', type: 'text', placeholder: '560001', required: false },
    ],
  },
  {
    id: 'delhivery-direct',
    name: 'Delhivery Direct Dispatch',
    category: 'logistics',
    developer: 'Delhivery Logistics',
    description: 'Direct courier API connection for fast express freight, surface logistics, and cash-on-delivery reconciliation.',
    badge: 'Express Network',
    docsUrl: 'https://delhivery.com/developer',
    fields: [
      { key: 'clientId', label: 'Client / Account Code', type: 'text', placeholder: 'DELHIVERY_...', required: true },
      { key: 'apiToken', label: 'API Authorization Token', type: 'password', placeholder: '••••••••••••', required: true },
    ],
  },
  {
    id: 'porter-hyperlocal',
    name: 'Porter On-Demand Delivery',
    category: 'logistics',
    developer: 'Porter Technologies',
    description: 'Instant 2-wheeler and 3-wheeler dispatch for intra-city store orders delivered within 60 minutes.',
    badge: 'Hyperlocal 60m',
    popular: true,
    docsUrl: 'https://porter.in/enterprise',
    fields: [
      { key: 'apiKey', label: 'Porter API Key', type: 'password', placeholder: 'porter_api_...', required: true },
      { key: 'city', label: 'Operating City', type: 'text', placeholder: 'Bangalore / Mumbai / Delhi / Hyderabad', required: true },
    ],
  },
  {
    id: 'dunzo-shadowfax',
    name: 'Dunzo & Shadowfax Express',
    category: 'logistics',
    developer: 'Dunzo / Shadowfax',
    description: 'Local neighborhood delivery runner allocation for immediate counter order pickup.',
    badge: 'Immediate Runner',
    fields: [
      { key: 'clientId', label: 'Partner Client ID', type: 'text', placeholder: 'client_...', required: true },
      { key: 'secretKey', label: 'API Secret', type: 'password', placeholder: '••••••••', required: true },
    ],
  },
  {
    id: 'bluedart-apex',
    name: 'Blue Dart Apex Express',
    category: 'logistics',
    developer: 'DHL / Blue Dart Express',
    description: 'Air express domestic priority delivery with dedicated cargo reliability across metros and capitals.',
    badge: 'Air Priority',
    fields: [
      { key: 'loginId', label: 'Blue Dart Customer Login ID', type: 'text', placeholder: 'BLUEDART_CUST...', required: true },
      { key: 'licenseKey', label: 'License Key', type: 'password', placeholder: '••••••••', required: true },
    ],
  },
  {
    id: 'dtdc-express',
    name: 'DTDC Smart Express',
    category: 'logistics',
    developer: 'DTDC Express Ltd',
    description: 'Pan-India reach across tier-2, tier-3 and rural pincodes with automated tracking webhooks.',
    badge: 'Pan-India Reach',
    fields: [
      { key: 'customerId', label: 'Customer Code', type: 'text', placeholder: 'DTDC_GL123...', required: true },
      { key: 'apiToken', label: 'API Access Token', type: 'password', placeholder: '••••••••', required: true },
    ],
  },

  // Messaging
  {
    id: 'wa-baileys',
    name: 'WhatsApp Business Assistant',
    category: 'messaging',
    developer: 'FeraSetu Baileys Socket',
    description: 'Automated catalog order receipts, live order status updates, and interactive customer AI assistant.',
    badge: 'Native Socket',
    popular: true,
    fields: [
      { key: 'phoneNumber', label: 'Registered WhatsApp Phone Number', type: 'text', placeholder: '+91 98765 43210', required: true },
      { key: 'senderName', label: 'Storefront Display Name', type: 'text', placeholder: 'My Kirana Store', required: false },
    ],
  },
  {
    id: 'whatsapp-cloud-api',
    name: 'Meta WhatsApp Cloud API',
    category: 'messaging',
    developer: 'Meta Business Platform',
    description: 'Official WhatsApp Cloud API for green-badge stores with high-throughput bulk template broadcasts.',
    badge: 'Official Meta',
    popular: true,
    fields: [
      { key: 'phoneId', label: 'Phone Number ID', type: 'text', placeholder: '109823478912345', required: true },
      { key: 'accessToken', label: 'Permanent System Access Token', type: 'password', placeholder: 'EAAG...', required: true },
      { key: 'wabaId', label: 'WhatsApp Business Account ID', type: 'text', placeholder: '1029384756', required: true },
    ],
  },
  {
    id: 'gupshup-enterprise',
    name: 'Gupshup WhatsApp Enterprise',
    category: 'messaging',
    developer: 'Gupshup India',
    description: 'Enterprise WhatsApp BSP gateway with conversational commerce chatbot automation.',
    badge: 'Conversational',
    fields: [
      { key: 'appName', label: 'Gupshup App Name', type: 'text', placeholder: 'my_store_bot', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: '••••••••', required: true },
    ],
  },
  {
    id: 'telegram-bot',
    name: 'Telegram Store Alerts Bot',
    category: 'messaging',
    developer: 'Telegram Open Platform',
    description: 'Instant audio and push notification alerts directly to your Telegram smartphone app when orders arrive.',
    badge: 'Instant Alerts',
    fields: [
      { key: 'botToken', label: 'Telegram Bot Token', type: 'password', placeholder: '123456789:ABCdefGhI...', required: true, helperText: 'Create via @BotFather on Telegram' },
      { key: 'chatId', label: 'Your Chat ID or Channel ID', type: 'text', placeholder: '-100123456789', required: true },
    ],
  },
  {
    id: 'twilio-sms',
    name: 'Twilio SMS & OTP Gateway',
    category: 'messaging',
    developer: 'Twilio Inc.',
    description: 'Worldwide telecom routing for OTP authentication codes, customer delivery alerts, and SMS.',
    badge: 'Global SMS',
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'AC...', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: '••••••••', required: true },
      { key: 'fromNumber', label: 'Twilio Sender Phone Number', type: 'text', placeholder: '+1234567890', required: true },
    ],
  },
  {
    id: 'email-smtp',
    name: 'Transactional Custom SMTP',
    category: 'messaging',
    developer: 'RFC 5321 Standard Relay',
    description: 'Send branded PDF invoices and delivery codes via SendGrid, Postmark, Amazon SES, or custom corporate email.',
    badge: 'Verified Relay',
    fields: [
      { key: 'host', label: 'SMTP Host Server', type: 'text', placeholder: 'smtp.sendgrid.net', required: true },
      { key: 'port', label: 'Port', type: 'text', placeholder: '587', required: true },
      { key: 'user', label: 'Username / API User', type: 'text', placeholder: 'apikey', required: true },
      { key: 'password', label: 'Password / API Key', type: 'password', placeholder: '••••••••', required: true },
      { key: 'fromEmail', label: 'From Email Address', type: 'text', placeholder: 'orders@yourdomain.com', required: true },
    ],
  },

  // Accounting
  {
    id: 'tally-erp',
    name: 'Tally Prime Ledger Sync',
    category: 'accounting',
    developer: 'Tally Solutions',
    description: 'End-of-day sales vouchers, GST tax reports (CGST/SGST/IGST), and khata customer balances sync.',
    badge: 'GST Ready',
    popular: true,
    fields: [
      { key: 'host', label: 'Tally Prime Server URL / Port', type: 'text', placeholder: 'http://localhost:9000', required: true, helperText: 'Enable ODBC/XML Server in Tally F12 Configuration' },
      { key: 'companyName', label: 'Tally Company Name Exactly as in Tally', type: 'text', placeholder: 'Shree Retail Traders Pvt Ltd', required: true },
    ],
  },
  {
    id: 'zoho-books',
    name: 'Zoho Books Integration',
    category: 'accounting',
    developer: 'Zoho Corporation',
    description: 'Synchronize invoices, sales orders, item inventory counts, and customer ledger entries automatically.',
    badge: 'Cloud ERP',
    fields: [
      { key: 'orgId', label: 'Zoho Organization ID', type: 'text', placeholder: '6001234567', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: '1000.XXXX...', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '••••••••', required: true },
    ],
  },
  {
    id: 'marg-erp',
    name: 'Marg ERP 9+ Retail Bridge',
    category: 'accounting',
    developer: 'Marg Compusoft',
    description: 'Direct billing synchronization for pharmacies, FMCG distributors, and kirana stores running Marg ERP.',
    badge: 'Pharma & Kirana',
    fields: [
      { key: 'companyCode', label: 'Marg Company Code', type: 'text', placeholder: 'MARG_COMP_01', required: true },
      { key: 'serverUrl', label: 'Marg Bridge Server URL', type: 'text', placeholder: 'http://localhost:8080/marg', required: true },
    ],
  },
  {
    id: 'quickbooks',
    name: 'Intuit QuickBooks Online',
    category: 'accounting',
    developer: 'Intuit Inc.',
    description: 'Automated sales ledger journal entries and sales tax calculations for international retail bookkeeping.',
    badge: 'Global Accounting',
    fields: [
      { key: 'realmId', label: 'Company / Realm ID', type: 'text', placeholder: '1234567890', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'ey...', required: true },
    ],
  },

  // Hardware & Countertop
  {
    id: 'thermal-printer',
    name: 'ESC/POS Thermal Receipt Printer',
    category: 'hardware',
    developer: 'Epson / Star / Generic Standard',
    description: 'High-speed 58mm / 80mm countertop bill printing with dynamic UPI payment QR and customer receipt.',
    badge: 'Zero Drivers',
    popular: true,
    fields: [
      {
        key: 'connectionType',
        label: 'Printer Connection Protocol',
        type: 'select',
        options: [
          { label: 'USB Direct (WebUSB standard)', value: 'usb' },
          { label: 'Bluetooth Wireless (WebBluetooth)', value: 'bluetooth' },
          { label: 'LAN / Wi-Fi Network IP', value: 'network' },
        ],
      },
      {
        key: 'paperWidth',
        label: 'Paper Width',
        type: 'select',
        options: [
          { label: '80mm (Standard POS Bill)', value: '80mm' },
          { label: '58mm (Compact Mobile Receipt)', value: '58mm' },
        ],
      },
      { key: 'printerAddress', label: 'IP Address / Device Name (if Network)', type: 'text', placeholder: '192.168.1.100', required: false },
    ],
  },
  {
    id: 'soundbox',
    name: 'Smart Counter Audio Soundbox',
    category: 'hardware',
    developer: 'Paytm / PhonePe / Fera Hardware',
    description: 'Spoken audio payment confirmation in Hindi, Telugu, Tamil, and English immediately when UPI payment succeeds.',
    badge: 'Voice Confirmation',
    fields: [
      { key: 'deviceId', label: 'Soundbox Serial Number / Device ID', type: 'text', placeholder: 'SB-98234-A', required: true },
      {
        key: 'language',
        label: 'Voice Language Alert',
        type: 'select',
        options: [
          { label: 'Hindi ("₹100 प्राप्त हुए")', value: 'hi' },
          { label: 'Telugu ("₹100 అందాయి")', value: 'te' },
          { label: 'English ("₹100 received on FeraSetu")', value: 'en' },
          { label: 'Tamil ("₹100 பெறப்பட்டது")', value: 'ta' },
          { label: 'Gujarati ("₹100 મળ્યા")', value: 'gu' },
        ],
      },
    ],
  },
  {
    id: 'barcode-scanner',
    name: 'Barcode Scanner (Honeywell/Zebra)',
    category: 'hardware',
    developer: 'Honeywell / Zebra / Generic HID',
    description: 'Instant barcode scanning for ultra-fast counter billing. Automatically scans EAN-13, UPC, and Code-128.',
    badge: 'Fast Counter',
    fields: [
      {
        key: 'mode',
        label: 'Scanner Interface Mode',
        type: 'select',
        options: [
          { label: 'USB Keyboard Wedge (Plug & Play)', value: 'keyboard_wedge' },
          { label: 'Bluetooth Wireless HID', value: 'bluetooth_hid' },
          { label: 'Camera Barcode Scanner (Mobile)', value: 'camera' },
        ],
      },
    ],
  },

  // AI & Productivity
  {
    id: 'notion-mcp',
    name: 'Notion Workspace Sync',
    category: 'ai',
    developer: 'Notion Labs',
    description: 'Synchronize store operations, inventory logs, team wikis, and customer feedback directly into Notion databases.',
    badge: 'Knowledge Hub',
    fields: [
      { key: 'secret', label: 'Internal Integration Token', type: 'password', placeholder: 'secret_...', required: true, helperText: 'Created in notion.so/my-integrations' },
      { key: 'databaseId', label: 'Notion Database ID', type: 'text', placeholder: '32-character database string', required: true },
    ],
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets Live Sync',
    category: 'ai',
    developer: 'Google Workspace',
    description: 'Stream orders, customer leads, and sales transactions row-by-row into a Google Spreadsheet in real time.',
    badge: 'Real-time Sheet',
    fields: [
      { key: 'sheetId', label: 'Google Spreadsheet ID', type: 'text', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', required: true },
      { key: 'tabName', label: 'Sheet Tab Name', type: 'text', placeholder: 'Orders', required: true },
    ],
  },
  {
    id: 'slack',
    name: 'Slack Team Notifications',
    category: 'ai',
    developer: 'Slack Technologies',
    description: 'Receive real-time notifications in your Slack store channels for new orders, high-value sales, and low stock warnings.',
    badge: 'Team Chat',
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', type: 'text', placeholder: 'https://hooks.slack.com/services/...', required: true },
      { key: 'channel', label: 'Channel Name', type: 'text', placeholder: '#store-orders', required: false },
    ],
  },
  {
    id: 'fera-ai',
    name: 'Fera AI Store Brain & Sidekick',
    category: 'ai',
    developer: 'FeraSetu Core AI Cluster',
    description: 'Autonomous AI agent powered by our sovereign OpenAI-compatible cluster (ai.fera-search.tech). Operates orders, reports, and storefronts.',
    badge: 'Native AI Brain',
    popular: true,
    fields: [
      { key: 'autoSync', label: 'Autonomous Tool Mode', type: 'select', options: [{ label: 'Enabled (Autonomous Assistant)', value: 'enabled' }, { label: 'Manual Approval Only', value: 'manual' }] },
      { key: 'voiceAlerts', label: 'Voice Feedback Language', type: 'select', options: [{ label: 'Hindi + English', value: 'hi_en' }, { label: 'English Only', value: 'en' }, { label: 'Telugu', value: 'te' }] },
    ],
  },
  {
    id: 'zapier-make',
    name: 'Zapier & Make.com Webhook Automation',
    category: 'ai',
    developer: 'Zapier / Celonis Make',
    description: 'Connect FeraSetu events to 5,000+ cloud apps, CRM workflows, and custom automations without writing code.',
    badge: 'No-Code Auto',
    popular: true,
    fields: [
      { key: 'webhookUrl', label: 'Zapier / Make Catch Hook URL', type: 'text', placeholder: 'https://hooks.zapier.com/hooks/catch/...', required: true },
    ],
  },
];

interface AddIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedServiceIds: Set<string>;
  initialSelectedAppId?: string | null;
  onIntegrationAdded?: () => void;
}

export default function AddIntegrationModal({
  isOpen,
  onClose,
  connectedServiceIds,
  initialSelectedAppId,
  onIntegrationAdded,
}: AddIntegrationModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [configuringApp, setConfiguringApp] = useState<CatalogIntegration | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenConfig = (app: CatalogIntegration) => {
    setConfiguringApp(app);
    // Initialize default values
    const initial: Record<string, string> = {};
    app.fields.forEach((f) => {
      if (f.options && f.options.length > 0) {
        initial[f.key] = f.options[0].value;
      } else {
        initial[f.key] = '';
      }
    });
    setFormData(initial);
  };

  useEffect(() => {
    if (initialSelectedAppId && isOpen) {
      const match = INTEGRATION_CATALOG.find(
        (a) => a.id === initialSelectedAppId || a.id.startsWith(initialSelectedAppId) || initialSelectedAppId.startsWith(a.id)
      );
      if (match) {
        handleOpenConfig(match);
      }
    } else if (!isOpen) {
      setConfiguringApp(null);
    }
  }, [initialSelectedAppId, isOpen]);

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return INTEGRATION_CATALOG.filter((app) => {
      if (selectedCategory !== 'all' && app.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          app.developer.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringApp) return;

    // Check required fields
    for (const field of configuringApp.fields) {
      if (field.required && !formData[field.key]?.trim()) {
        toast.error(`Please enter ${field.label}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.post('/integrations/connect', {
        serviceId: configuringApp.id,
        name: configuringApp.name,
        category: configuringApp.category,
        config: formData,
        credentials: formData,
      });

      toast.success(`Successfully connected ${configuringApp.name}!`);
      setConfiguringApp(null);
      onIntegrationAdded?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to connect ${configuringApp.name}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-[#0052FF] flex items-center justify-center shadow-2xs font-bold shrink-0">
              <Plus size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {configuringApp ? `Configure ${configuringApp.name}` : 'Add New Integration'}
              </h2>
              <p className="text-xs text-slate-500">
                {configuringApp
                  ? `Enter merchant credentials to connect ${configuringApp.name} with your store.`
                  : `Choose from ${INTEGRATION_CATALOG.length}+ payment gateways, couriers, accounting ERP, and AI tools.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (configuringApp) {
                setConfiguringApp(null);
              } else {
                onClose();
              }
            }}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {configuringApp ? (
          /* Step 2: Configuration View */
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 pb-10">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="shrink-0">
                {getIntegrationLogo(configuringApp.id, 52)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">
                    {configuringApp.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                    {configuringApp.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {configuringApp.description}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitConnect} className="space-y-4">
              <div className="space-y-3.5">
                {configuringApp.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-1">*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-blue-100"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-blue-100"
                      />
                    )}

                    {field.helperText && (
                      <p className="text-[11px] text-slate-500">
                        {field.helperText}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Zero Commission & Security Invariant */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/60 flex items-center gap-2.5 text-xs text-emerald-900">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                <span>
                  <strong>0% Platform Commission Guarantee:</strong> FeraSetu does not levy fees or take a commission cut. All transactions, orders, and data flow directly and securely between your shop and {configuringApp.name}.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfiguringApp(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  ← Back to Apps
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#0052FF] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Lock size={14} />
                  <span>{isSubmitting ? 'Verifying & Connecting...' : `Connect ${configuringApp.name}`}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Step 1: Catalog Browser */
          <>
            {/* Search & Category Filter Toolbar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-[#F8FAFC] space-y-3 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${INTEGRATION_CATALOG.length}+ apps, payment gateways, couriers, accounting ERP, or AI tools...`}
                  className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { id: 'all', label: `All Apps (${INTEGRATION_CATALOG.length})` },
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
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#0052FF] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Apps Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCatalog.map((app) => {
                const isConnected = connectedServiceIds.has(app.id);

                return (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">
                            {getIntegrationLogo(app.id, 44)}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 leading-tight">
                              {app.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-medium">
                              {app.developer}
                            </p>
                          </div>
                        </div>

                        {app.badge && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            {app.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {app.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {app.category}
                      </span>

                      {isConnected ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200/70">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>Connected</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenConfig(app)}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-[#0052FF] text-[#0052FF] hover:text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add Integration</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Search, Check, Copy, ArrowRight, ExternalLink,
  Smartphone, MessageCircle, ShieldCheck, Zap, Globe, Package,
  FileText, Bot, Terminal, Printer, HelpCircle, ChevronRight,
  Sparkles, AlertCircle, Video, Image as ImageIcon, CheckCircle2,
  Layers, ShoppingCart, CreditCard, RefreshCw, BarChart3, Clock,
  ArrowUpRight, Share2, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface DocSection {
  id: string;
  category: string;
  categoryIcon: any;
  title: string;
  subtitle: string;
  readingTime: string;
  keywords: string[];
  summary: string;
  mediaRequirements?: {
    type: 'image' | 'video' | 'both';
    filename: string;
    label: string;
    specs: string;
    description: string;
  }[];
  content: {
    heading: string;
    paragraphs: string[];
    tips?: string[];
    steps?: { step: number; title: string; desc: string }[];
    codeSnippets?: { title: string; language: string; code: string }[];
    table?: { headers: string[]; rows: string[][] };
  }[];
}

const DOCS_DATA: DocSection[] = [
  {
    id: 'quickstart',
    category: 'Getting Started',
    categoryIcon: Zap,
    title: 'Store Setup in Under 2 Minutes',
    subtitle: 'From zero to your first live digital dukaan with zero coding and 0% commission.',
    readingTime: '2 min read',
    keywords: ['setup', 'create store', 'quickstart', 'subdomain', 'first product', 'register'],
    summary: 'Step-by-step walkthrough to register your merchant account, select your free shop domain, add initial stock, and start receiving customer orders.',
    mediaRequirements: [
      {
        type: 'image',
        filename: 'docs-quickstart-dashboard.png',
        label: 'Dashboard Welcome Overview',
        specs: '1920x1080 PNG • Desktop View • Crisp text',
        description: 'Screenshot of FeraSetu Merchant Dashboard showing "Good morning" banner, Store Open status badge, Live Store link, and Add Product button.'
      },
      {
        type: 'video',
        filename: 'docs-quickstart-walkthrough.mp4',
        label: '60-Second Onboarding & Store Creation',
        specs: '1080p MP4 / WebM • 60-90 seconds • 16:9 • Clean mouse movement',
        description: 'Screen recording demonstrating entering store name, choosing domain handle, adding 1 product with image & price, and previewing live on mobile.'
      }
    ],
    content: [
      {
        heading: '1. Register Your Sovereign Merchant Account',
        paragraphs: [
          'FeraSetu is built specifically for independent retail shopkeepers, bodegas, boutiques, and grocers. Creating your store takes less than 2 minutes and requires only your phone number or email address.',
          'Unlike traditional platforms that lock your business behind complex contracts or take a 10% to 30% toll on every sale, FeraSetu gives you a 100% sovereign store where you own customer relationships directly.'
        ],
        steps: [
          {
            step: 1,
            title: 'Create Your Account',
            desc: 'Visit ferasetu.com and tap "Create Free Store". Enter your business name and email or phone number to receive your instant verification magic link.'
          },
          {
            step: 2,
            title: 'Claim Your Free Subdomain',
            desc: 'Choose your unique store handle (e.g., myshop.ferasetu.com). This link is immediately live worldwide with automatic free SSL security.'
          },
          {
            step: 3,
            title: 'Add Your First Product',
            desc: 'Upload a clear product photo, enter the item title, retail price, and available stock units. Your storefront is now ready to receive orders.'
          }
        ],
        tips: [
          'Keep your store handle short and memorable so customers can easily type it into their mobile browser or WhatsApp.',
          'You can connect your own custom domain (e.g. www.yourshop.com) at any time from the Domains tab.'
        ]
      },
      {
        heading: '2. Adding & Managing Your Catalog',
        paragraphs: [
          'Your SKU Register allows you to organize products with categories, barcode numbers (EAN/UPC), and unit pricing. You can also import existing inventory via standard CSV files with 1 click.',
          'For fast-moving items, activate the Quick Stock toggle on your dashboard to adjust inventory numbers directly from your checkout counter without navigating away.'
        ]
      }
    ]
  },
  {
    id: 'whatsapp-ordering',
    category: 'Sales Channels',
    categoryIcon: MessageCircle,
    title: 'WhatsApp 1-Click Ordering & Checkout',
    subtitle: 'How customers browse and order directly through WhatsApp without installing apps.',
    readingTime: '3 min read',
    keywords: ['whatsapp', 'checkout', 'orders', 'mobile cart', 'chat commerce', 'no app'],
    summary: 'Turn familiar WhatsApp chats into high-converting storefronts. Learn how the persistent bottom cart bar lets shoppers assemble orders and send them straight to your WhatsApp business chat.',
    mediaRequirements: [
      {
        type: 'image',
        filename: 'docs-whatsapp-checkout-flow.png',
        label: 'Dual Mobile WhatsApp Checkout Flow',
        specs: '1080x1920 PNG • Mobile 9:16 • High contrast',
        description: 'Side-by-side mobile capture showing Storefront Floating Cart drawer on the left and the resulting auto-formatted WhatsApp order message on the right.'
      },
      {
        type: 'video',
        filename: 'docs-whatsapp-live-demo.mp4',
        label: 'Live Customer WhatsApp Order Flow',
        specs: '1080x1920 Vertical Video • 30-45 seconds • Mobile touch gestures',
        description: 'Real-time demonstration of a shopper browsing a category, tapping items to cart, clicking "Order via WhatsApp", and sending the order to merchant chat.'
      }
    ],
    content: [
      {
        heading: 'The Sovereign WhatsApp Mental Model',
        paragraphs: [
          'Over 80% of local customers prefer communicating and ordering over WhatsApp rather than downloading another proprietary app or creating new passwords.',
          'FeraSetu embeds Jakob’s Law into every storefront: customers browse a fast, responsive mobile catalog, tap items into a bottom thumb-zone cart (48px touch ergonomics), and tap "Order on WhatsApp".'
        ],
        steps: [
          {
            step: 1,
            title: 'Customer Discovers Your Link',
            desc: 'The customer clicks your store link from Instagram, Google Maps, a flyer QR code, or an existing WhatsApp chat.'
          },
          {
            step: 2,
            title: '1-Tap Item Assembly',
            desc: 'Shoppers select items using tactile quantity steppers. The persistent floating cart displays live totals and delivery minimums.'
          },
          {
            step: 3,
            title: 'Instant Formatted Message Generation',
            desc: 'When clicking checkout, WhatsApp opens automatically with an itemized breakdown including SKU numbers, quantities, prices, and customer delivery address.'
          }
        ],
        tips: [
          'Enable the WhatsApp Assistant feature in your dashboard to connect your business WhatsApp number for automated instant replies and payment QR links.'
        ]
      }
    ]
  },
  {
    id: 'payments-zero-commission',
    category: 'Finance & Banking',
    categoryIcon: CreditCard,
    title: 'Payments & 0% Platform Commission Guarantee',
    subtitle: 'Direct bank settlements, instant UPI QR codes, and zero marketplace tolls.',
    readingTime: '3 min read',
    keywords: ['payments', 'upi', 'razorpay', 'cashfree', 'settlement', '0% commission', 'zero fee'],
    summary: 'Keep 100% of your hard-earned revenue. Compare direct UPI routing with gateway card processing and explore the daily bank settlement ledger.',
    mediaRequirements: [
      {
        type: 'image',
        filename: 'docs-upi-settlement-ledger.png',
        label: 'Payments Dashboard & Bank Settlement Ledger',
        specs: '1920x1080 PNG • Desktop • High resolution',
        description: 'Screenshot of the /payments studio showing 0% Platform Commission guarantee pill, Total Captured metrics, and the ICICI/Bank of Baroda settlement ledger.'
      },
      {
        type: 'video',
        filename: 'docs-upi-qr-payment.mp4',
        label: 'Dynamic UPI QR Code Generation & Scan',
        specs: '1080p MP4 • 40 seconds • Soundbox / PhonePe scan demo',
        description: 'Step-by-step video generating a dynamic order payment QR code in the Orders dashboard and scanning it with a phone UPI app for instant settlement.'
      }
    ],
    content: [
      {
        heading: 'The FeraSetu Zero Commission Invariant',
        paragraphs: [
          'Big aggregator marketplaces typically deduct 18% to 30% commission on every order, eroding merchant profit margins. FeraSetu operates on a strict 0% platform commission model.',
          'Your money belongs to you. Every rupee or dollar transacted flows directly into your linked bank account without intermediate holding delays or hidden platform deductions.'
        ],
        table: {
          headers: ['Feature', 'Marketplace Apps', 'FeraSetu Dukaan'],
          rows: [
            ['Platform Commission', '15% – 30% per order', '0% (Forever)'],
            ['Customer Data Ownership', 'Kept by marketplace', '100% Owned by Merchant'],
            ['Direct UPI to Bank', 'Rarely supported', 'Instant Direct Routing'],
            ['Settlement Delay', '7 to 14 business days', 'Direct UPI instant / T+1 gateways'],
            ['Customer Contact Info', 'Masked / Hidden', 'Full phone & address visibility']
          ]
        },
        tips: [
          'You can display your dynamic UPI QR code directly on your billing counter screen or print a standee QR from the Marketing & SEO tab.'
        ]
      }
    ]
  },
  {
    id: 'custom-domains',
    category: 'Storefront & Branding',
    categoryIcon: Globe,
    title: 'Custom Domains & 1-Click DNS Sync',
    subtitle: 'Connect your own domain name (mystore.com) with automated Cloudflare edge SSL.',
    readingTime: '3 min read',
    keywords: ['domains', 'custom domain', 'godaddy', 'namecheap', 'dns', 'cname', 'ssl'],
    summary: 'Elevate your brand credibility by attaching your custom domain. Uses Domain Connect v2 and automated DNS health checks for zero-downtime propagation.',
    mediaRequirements: [
      {
        type: 'image',
        filename: 'docs-domain-dns-records.png',
        label: 'Domain Diagnostics & DNS Records Matrix',
        specs: '1920x1080 PNG • Desktop • Clean table view',
        description: 'Screenshot of /domains tab displaying the CNAME record verification status, green TLS 1.3 badge, and 5-node global latency radar.'
      }
    ],
    content: [
      {
        heading: 'Connecting Your Custom Domain',
        paragraphs: [
          'Every FeraSetu store comes with a free subdomain, but connecting a branded domain like `www.yourbrand.com` builds lasting trust and strengthens Google SEO search rank.',
          'Our Edge Ingress runs globally on Cloudflare Workers, providing sub-60ms time-to-first-byte (TTFB) and automatic SSL certificate generation.'
        ],
        steps: [
          {
            step: 1,
            title: 'Enter Your Domain Name',
            desc: 'Navigate to Domains in your merchant dashboard and type your domain (e.g., store.example.com or example.com).'
          },
          {
            step: 2,
            title: '1-Click Auto Sync or Add DNS Records',
            desc: 'If using GoDaddy, Namecheap, or IONOS, use the 1-Click Domain Connect button. For other registrars, copy the CNAME record provided.'
          },
          {
            step: 3,
            title: 'Instant Edge Verification',
            desc: 'Our automated DoH (DNS-over-HTTPS) radar checks propagation every 60 seconds. Once verified, SSL activates immediately.'
          }
        ],
        codeSnippets: [
          {
            title: 'Standard DNS CNAME Record',
            language: 'dns',
            code: 'Type:  CNAME\nName:  shop (or @ for apex with CNAME flattening)\nTarget: ingress.ferasetu.com\nTTL:   Auto / 300'
          }
        ]
      }
    ]
  },
  {
    id: 'inventory-locations',
    category: 'Store Operations',
    categoryIcon: Package,
    title: 'Multi-Location Inventory & SKU Register',
    subtitle: 'Real-time stock tracking across retail counters, backrooms, and central godowns.',
    readingTime: '4 min read',
    keywords: ['inventory', 'stock', 'barcode', 'sku', 'locations', 'godown', 'transfers'],
    summary: 'Manage inventory with zero headaches. Prevent out-of-stock orders, scan EAN barcodes with device cameras, and transfer stock between facilities.',
    mediaRequirements: [
      {
        type: 'image',
        filename: 'docs-inventory-sku-register.png',
        label: 'SKU Register & Stock Indicators',
        specs: '1920x1080 PNG • Desktop • High contrast',
        description: 'Screenshot of the Products SKU Register showing Emerald (in stock), Amber (low stock), and Rose (out of stock) status badges with quick stock buttons.'
      },
      {
        type: 'video',
        filename: 'docs-barcode-scanner-demo.mp4',
        label: 'Camera Barcode Scanner in Action',
        specs: '1080p MP4 • 30 seconds • Live camera feed demo',
        description: 'Demonstrating the integrated barcode scanner scanning a retail product barcode and instantly highlighting the SKU on screen.'
      }
    ],
    content: [
      {
        heading: 'High-Visibility Inventory Control',
        paragraphs: [
          'Never lose track of physical stock. The FeraSetu Inventory Studio categorizes stock by physical node—such as your Retail Front Till and Central Godown Warehouse.',
          'Stock numbers sync in real-time. When an online order or counter sale occurs, the available quantity updates across all customer storefront views in <400ms.'
        ],
        steps: [
          {
            step: 1,
            title: 'Register Storage Locations',
            desc: 'Define your physical points of storage in Inventory & Locations (e.g. "Main Shop Counter", "Basement Stockroom").'
          },
          {
            step: 2,
            title: 'Set Low Stock Thresholds',
            desc: 'Specify alert triggers for fast-moving goods (e.g., alert when units fall below 5) to receive prompt restock notifications.'
          },
          {
            step: 3,
            title: 'Transfer Stock with AI Sidekick',
            desc: 'Moving units between godown and retail? Use the Transfers page to record item movements with automated verification.'
          }
        ]
      }
    ]
  },
  {
    id: 'orders-delivery-otp',
    category: 'Store Operations',
    categoryIcon: ShieldCheck,
    title: 'Order Lifecycle, Delivery OTP & GST Invoices',
    subtitle: 'Fraud-proof customer delivery verification code and 1-click GST tax invoices.',
    readingTime: '3 min read',
    keywords: ['orders', 'otp', 'delivery code', 'gst', 'tax invoice', 'hsn', 'returns'],
    summary: 'Secure every order from placement to doorstep handover. Use 4-digit customer delivery OTPs to prevent false dispute claims and generate compliant PDF invoices.',
    mediaRequirements: [
      {
        type: 'image',
        filename: 'docs-order-otp-modal.png',
        label: 'Delivery OTP Verification Dialog',
        specs: '1920x1080 PNG • Desktop modal overlay • Crisp typography',
        description: 'Screenshot of the EnterDeliveryCodeModal open over the Orders list with 4-digit input fields, verified checkmark, and Complete Delivery CTA.'
      },
      {
        type: 'image',
        filename: 'docs-tax-invoice-sample.png',
        label: 'Official GST Compliant Tax Invoice PDF',
        specs: '1200x1600 PNG or PDF preview • Document view',
        description: 'Full sample of a generated tax invoice showing CGST/SGST/IGST breakdown, HSN codes, merchant GSTIN, customer details, and invoice QR.'
      }
    ],
    content: [
      {
        heading: 'Doorstep Delivery Handshake (Customer OTP)',
        paragraphs: [
          'To protect independent merchants from "package never arrived" fraud or false dispute claims, FeraSetu includes a sovereign Delivery OTP handshake.',
          'When an order is dispatched, the customer receives a private 4-digit code. Upon physical delivery, the delivery driver or shopkeeper inputs the code into the dashboard.'
        ],
        steps: [
          {
            step: 1,
            title: 'Order Dispatched',
            desc: 'The order status shifts to "Out for Delivery" and the customer receives their confidential 4-digit delivery code via SMS/WhatsApp.'
          },
          {
            step: 2,
            title: 'Physical Code Exchange',
            desc: 'At the customer’s door or retail counter, the merchant or delivery agent asks for the 4-digit code.'
          },
          {
            step: 3,
            title: 'Irreversible Delivery Locking',
            desc: 'Entering the code triggers the server-side endpoint POST /api/orders/:id/verify-otp, permanently locking status as "Delivered" and preventing reversal.'
          }
        ],
        tips: [
          'Once an order is locked as Delivered, stock deductions are final and tax invoices are locked for accounting audits.'
        ]
      },
      {
        heading: 'Automated GST Tax Invoicing',
        paragraphs: [
          'FeraSetu automatically calculates CGST, SGST, and IGST based on customer delivery state and your registered business location.',
          'Generate professional, government-compliant PDF tax invoices with 1 click directly from the Orders ledger.'
        ]
      }
    ]
  },
  {
    id: 'ferasetu-ai-copilot',
    category: 'FeraSetu AI',
    categoryIcon: Bot,
    title: 'FeraSetu AI: Catalog-Grounded Intelligence',
    subtitle: 'Private store assistant trained on your own inventory with 0% data leakage.',
    readingTime: '3 min read',
    keywords: ['ai', 'copilot', 'assistant', 'voice', 'catalog', 'sovereign', 'multilingual'],
    summary: 'Discover how FeraSetu AI helps both you and your shoppers. Grounded strictly in your live catalog data with voice recognition and 48 sovereign language localizations.',
    mediaRequirements: [
      {
        type: 'image',
        filename: 'docs-ferasetu-ai-copilot.png',
        label: 'Contextual AI Assistant Panel',
        specs: '1920x1080 PNG • Desktop slide-over • Vibrant prompt chips',
        description: 'Screenshot of ContextualAiAssistantPanel on dashboard with prompt chips like "What should I restock today?" and live inventory answers.'
      }
    ],
    content: [
      {
        heading: 'Sovereign AI Infrastructure Invariant',
        paragraphs: [
          'Unlike generic chatbots that hallucinate or leak your business records to public training pools, FeraSetu AI runs through our isolated, OpenAI-compatible backend cluster (https://ai.fera-search.tech/v1).',
          'We strictly enforce the Zero-Sarvam Invariant: our AI is branded exclusively as FeraSetu AI and communicates only with verified Cloudflare Worker serverless gateways.'
        ],
        tips: [
          'Shoppers can ask your storefront AI assistant questions like "Do you have gluten-free flour?" or "Which spices are in stock?", and it replies with direct catalog links.'
        ]
      }
    ]
  },
  {
    id: 'developer-api',
    category: 'Developers & POS',
    categoryIcon: Terminal,
    title: 'REST API, Webhooks & Thermal Hardware',
    subtitle: 'Connect thermal printers, custom POS terminals, and external ERP software.',
    readingTime: '5 min read',
    keywords: ['api', 'developer', 'webhooks', 'rest', 'thermal printer', 'pos', 'esc/pos'],
    summary: 'Full API documentation for developers and hardware integrators. Learn how to query catalogs, ingest orders, register webhooks, and pair 58mm/80mm ESC/POS thermal receipt printers.',
    mediaRequirements: [
      {
        type: 'image',
        filename: 'docs-thermal-printer-setup.png',
        label: 'Hardware Connectivity & Thermal Printer Modal',
        specs: '1920x1080 PNG • Desktop • Modal overlay',
        description: 'Screenshot of the PrinterStatusModal showing Web Serial/Bluetooth pairing options and thermal paper 58mm/80mm test print layout.'
      }
    ],
    content: [
      {
        heading: 'REST API Authentication',
        paragraphs: [
          'All API requests to the FeraSetu Core Engine require an Authorization header containing your merchant API key or AuthKit Bearer token.',
          'Endpoints return standard JSON responses with predictable HTTP status codes and ISO 8601 timestamps.'
        ],
        codeSnippets: [
          {
            title: 'Fetch Live Store Products',
            language: 'bash',
            code: 'curl -X GET "https://ferasetu.com/api/v1/products" \\\n  -H "Authorization: Bearer YOUR_MERCHANT_KEY" \\\n  -H "Content-Type: application/json"'
          },
          {
            title: 'Verify Customer Delivery Code (Doorstep OTP)',
            language: 'bash',
            code: 'curl -X POST "https://ferasetu.com/api/orders/ORD-9421/verify-otp" \\\n  -H "Authorization: Bearer YOUR_MERCHANT_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"delivery_code": "4812"}\''
          }
        ]
      },
      {
        heading: 'Hardware Integration: ESC/POS Thermal Receipt Printers',
        paragraphs: [
          'FeraSetu includes native Web Serial, Web USB, and Web Bluetooth drivers for standard 58mm and 80mm thermal bill printers (Epson, TVS, NGX, Everycom).',
          'No complex drivers or desktop software needed: simply connect your printer via USB or Bluetooth and print instant thermal order receipts directly from your browser tab.'
        ]
      }
    ]
  },
  {
    id: 'sovereign-commerce-answers',
    category: 'Core Architecture & FAQ',
    categoryIcon: HelpCircle,
    title: 'FeraSetu Core Architecture & FAQs',
    subtitle: 'Authoritative answers to the 12 core questions about sovereign commerce, data ownership, and pricing.',
    readingTime: '4 min read',
    keywords: ['what is ferasetu', 'who is ferasetu for', '0% commission', 'customer data', 'shopify alternative', 'marketplace alternative', 'faq', 'answers'],
    summary: 'Definitive guide explaining what FeraSetu is, who it is built for, how 0% commission works, customer data sovereignty, order routing, and platform capabilities.',
    content: [
      {
        heading: '1. What is FeraSetu?',
        paragraphs: [
          'FeraSetu (फेरासेतु) is sovereign digital commerce infrastructure for independent retail shopkeepers, grocers, bodegas, boutiques, and artisans.',
          'It enables merchants to operate their own branded online stores with 0% platform commission, direct payment settlement, unmasked customer relationships, and native WhatsApp ordering. FeraSetu is NOT a marketplace, NOT a closed drag-and-drop website builder, and NOT a logistics broker.'
        ]
      },
      {
        heading: '2. Who is FeraSetu Designed For?',
        paragraphs: [
          'FeraSetu is designed specifically for independent retailers, local kiranas and grocers, direct-to-consumer (D2C) brands, boutique owners, and service entrepreneurs across 48+ regions (India-first, expanding into the United States and Europe).',
          'It is built for business owners who want to sell online and build digital equity without paying 15% to 30% marketplace commissions or losing control of their customer records.'
        ]
      },
      {
        heading: '3. What Problem Does FeraSetu Solve?',
        paragraphs: [
          'Marketplaces (like Amazon, Flipkart, or Swiggy) strip merchant identity, mask customer contact details, and extract 15% to 30% tolls on every transaction. Meanwhile, complex platforms like Shopify charge monthly app subscriptions, currency conversion fees, and a 2% surcharge if using non-Shopify payment gateways.',
          'FeraSetu solves both problems by providing sovereign commerce infrastructure: 0% platform transaction fees, permanent free tier entry, unmasked customer ownership, and native tools out of the box.'
        ]
      },
      {
        heading: '4. How Does FeraSetu Work?',
        paragraphs: [
          'Merchants sign up in under 2 minutes, choose a free store subdomain (e.g., myshop.ferasetu.com) or connect their custom domain, upload products with images, variants, and HSN codes, and immediately begin receiving customer orders.',
          'Orders arrive via high-performance web storefronts, dynamic counter UPI QR codes, or native 1-click WhatsApp cart checkout. Inventory across physical locations and customer delivery OTP handshakes are managed from a real-time dashboard.'
        ]
      },
      {
        heading: '5. How is FeraSetu Different from Shopify?',
        paragraphs: [
          'Shopify charges $39 to $399/mo plus up to 2% extra transaction surcharges when using external payment gateways, and requires expensive third-party apps ($10 to $50/mo each) for WhatsApp checkout, GST invoices, and Indian payment gateways.',
          'FeraSetu charges 0% platform transaction commissions forever, includes native WhatsApp cart checkout, automated Indian GST invoicing, and Domain Connect v2 built-in, starting at ₹0/month.'
        ]
      },
      {
        heading: '6. How Does FeraSetu Differ from Online Marketplaces?',
        paragraphs: [
          'FeraSetu is NOT a marketplace. In a marketplace, buyers are the marketplace\'s customers, the marketplace sets policies, charges 15% to 30% commission, and can suspend seller listings at will.',
          'On FeraSetu, the store is 100% merchant-owned: the merchant owns the customer phone numbers, addresses, sales histories, and domain name, receiving direct payments with zero intermediary cuts.'
        ]
      },
      {
        heading: '7. What Does 0% Platform Commission Actually Mean?',
        paragraphs: [
          'FeraSetu takes ₹0 ($0/€0) cut of merchant sales revenue across ALL subscription tiers (Free, Business, and Pro).',
          'Merchants keep 100% of the money paid by their customers, minus only standard third-party payment gateway processing fees (e.g. standard Cashfree, Razorpay, or Stripe acquiring fees, or 0% on direct peer-to-peer UPI). FeraSetu never extracts a transactional toll.'
        ]
      },
      {
        heading: '8. Who Controls Customer Data?',
        paragraphs: [
          'The merchant controls 100% of customer data. Customer names, mobile phone numbers, physical delivery addresses, and purchase histories are never masked, never sold, and never shared with competing sellers.',
          'Merchants can export their customer directory and order history at any time via CSV.'
        ]
      },
      {
        heading: '9. How Do Merchants Receive Orders?',
        paragraphs: [
          'Merchants receive orders through two primary channels:',
          '1. Directly in their real-time FeraSetu Orders Dashboard with instant notifications, customer delivery verification code (OTP), and 1-click GST invoice generation; and',
          '2. Via an automated, itemized WhatsApp order message sent directly from the buyer to the shopkeeper\'s WhatsApp business number.'
        ]
      },
      {
        heading: '10. What Payment Methods Are Supported?',
        paragraphs: [
          'Supported payment methods include: Instant UPI (Google Pay, PhonePe, Paytm, BHIM with dynamic counter QR codes and 0% gateway fees), Credit/Debit Cards, Netbanking, and Wallets via integrated Cashfree/Razorpay gateways (settling T+1 directly into the merchant\'s verified bank account), plus Cash on Delivery (COD) with fraud-prevention heuristics.'
        ]
      },
      {
        heading: '11. What Are the Limitations of the Platform?',
        paragraphs: [
          'FeraSetu maintains complete transparency regarding platform constraints:',
          '1. The Free plan has a catalog limit of 25 products and operates on a .ferasetu.com subdomain (custom domains require the ₹399/mo Business tier).',
          '2. FeraSetu is commerce software infrastructure, not a logistics fleet—merchants manage their own local delivery or integrate their existing third-party couriers (e.g. Shiprocket, Dunzo, or Porter).',
          '3. FeraSetu does not provide aggregated buyer marketplace traffic—merchants build and own their direct customer audience via local reputation, WhatsApp, social channels, and search engines.'
        ]
      },
      {
        heading: '12. How Does a Merchant Get Started?',
        paragraphs: [
          'Visit https://ferasetu.com, click "Create Free Store", enter a business name and email or phone number, choose a store subdomain, upload at least 1 product, and share the store link or counter QR code.',
          'No credit card is required to start on the permanent ₹0 Free plan.'
        ]
      }
    ]
  }
];

export default function DocsPage() {
  const { section: urlSection } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { translate: t } = useLanguage();

  const [activeSectionId, setActiveSectionId] = useState<string>(urlSection || 'quickstart');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<string | null>(null);

  // Sync active section when URL changes
  useEffect(() => {
    if (urlSection && DOCS_DATA.some(d => d.id === urlSection)) {
      setActiveSectionId(urlSection);
    }
  }, [urlSection]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    DOCS_DATA.forEach(d => set.add(d.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredDocs = useMemo(() => {
    return DOCS_DATA.filter(doc => {
      const matchesCat = selectedCategory === 'All' || doc.category === selectedCategory;
      if (!matchesCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = doc.title.toLowerCase().includes(q);
      const inSubtitle = doc.subtitle.toLowerCase().includes(q);
      const inSummary = doc.summary.toLowerCase().includes(q);
      const inKeywords = doc.keywords.some(k => k.toLowerCase().includes(q));
      return inTitle || inSubtitle || inSummary || inKeywords;
    });
  }, [selectedCategory, searchQuery]);

  const activeDoc = useMemo(() => {
    return DOCS_DATA.find(d => d.id === activeSectionId) || DOCS_DATA[0];
  }, [activeSectionId]);

  const handleSelectSection = (id: string) => {
    setActiveSectionId(id);
    navigate(`/docs/${id}`, { replace: true });
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(id);
    toast.success('Snippet copied to clipboard');
    setTimeout(() => setCopiedCodeIndex(null), 2500);
  };

  // Compile total required media assets for shopkeeper reference
  const allMediaRequirements = useMemo(() => {
    const list: { docTitle: string; sectionId: string; item: any }[] = [];
    DOCS_DATA.forEach(d => {
      if (d.mediaRequirements) {
        d.mediaRequirements.forEach(m => {
          list.push({ docTitle: d.title, sectionId: d.id, item: m });
        });
      }
    });
    return list;
  }, []);

  return (
    <PublicLayout>
      <SEO
        title={activeDoc ? `${activeDoc.title} — Guides & Documentation | FeraSetu` : "Documentation & Merchant Help Center | FeraSetu"}
        description={activeDoc ? activeDoc.summary : "Official documentation, setup guides, WhatsApp checkout guides, 0% commission payment architecture, and API references for global shopkeepers."}
        url={activeDoc ? `https://ferasetu.com/docs/${activeDoc.id}` : "https://ferasetu.com/docs"}
        type="article"
        breadcrumbs={[
          { name: 'Home', url: 'https://ferasetu.com' },
          { name: 'Documentation', url: 'https://ferasetu.com/docs' },
          ...(activeDoc ? [{ name: activeDoc.title, url: `https://ferasetu.com/docs/${activeDoc.id}` }] : [])
        ]}
        structuredData={activeDoc ? [
          {
            '@type': 'TechArticle',
            '@id': `https://ferasetu.com/docs/${activeDoc.id}#article`,
            headline: activeDoc.title,
            description: activeDoc.summary,
            url: `https://ferasetu.com/docs/${activeDoc.id}`,
            datePublished: '2024-01-01',
            dateModified: '2026-11-10',
            author: {
              '@type': 'Organization',
              name: 'FeraSetu',
              url: 'https://ferasetu.com/'
            },
            publisher: {
              '@type': 'Organization',
              name: 'FeraSetu',
              url: 'https://ferasetu.com/'
            }
          }
        ] : undefined}
      />

      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100/60 pt-12 pb-14 px-4 sm:px-6">
        <div className="max-w-[1240px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4">
            <BookOpen size={14} className="text-blue-600" />
            <span>Official Knowledge Base &amp; Guides</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Everything You Need to Run Your <span className="text-blue-600">Digital Dukaan</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed mb-8">
            Clear, jargon-free guides on setting up your store, taking WhatsApp orders, direct 0% commission UPI settlements, and connecting retail hardware.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto relative">
            <div className="relative flex items-center">
              <Search size={20} className="absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides (e.g. WhatsApp checkout, delivery OTP, UPI QR, custom domain)..."
                className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 text-sm sm:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 text-xs font-semibold text-slate-400 hover:text-slate-600 p-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Documentation Grid */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Navigation Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24 space-y-6">
              
              {/* Category Filter Pills */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
                  Topics
                </span>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document List */}
              <nav aria-label="Documentation sections" className="space-y-1.5 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
                {filteredDocs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No articles match your search.
                  </div>
                ) : (
                  filteredDocs.map((doc) => {
                    const Icon = doc.categoryIcon;
                    const isActive = doc.id === activeDoc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleSelectSection(doc.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group ${
                          isActive
                            ? 'bg-blue-50/90 text-blue-900 border border-blue-200/70 shadow-xs'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:text-slate-700'
                        }`}>
                          <Icon size={16} strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-950 font-bold' : 'text-slate-800'}`}>
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-medium">
                              {doc.category}
                            </span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-[11px] text-slate-400">
                              {doc.readingTime}
                            </span>
                          </div>
                        </div>
                        {isActive && (
                          <ChevronRight size={16} className="text-blue-600 shrink-0 self-center" />
                        )}
                      </button>
                    );
                  })
                )}
              </nav>

              {/* Media Asset Quick Summary Callout */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1.5 text-amber-950">
                  <Video size={16} className="text-amber-700 shrink-0" />
                  <span>Media Production Blueprint</span>
                </div>
                <p className="text-amber-800 leading-relaxed mb-3">
                  This documentation includes exact dimensions and specs for screenshots &amp; video walkthroughs requested for each chapter.
                </p>
                <a
                  href="#media-blueprint"
                  className="inline-flex items-center gap-1 font-bold text-amber-900 underline hover:text-amber-950"
                >
                  <span>View All {allMediaRequirements.length} Required Assets ↓</span>
                </a>
              </div>

              {/* Need direct help box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-sm">
                <div className="flex items-center gap-2 font-bold mb-1.5 text-white">
                  <HelpCircle size={16} className="text-orange-400 shrink-0" />
                  <span>Need Personal Guidance?</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Join our merchant community or speak directly with our store specialists over WhatsApp.
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    to="/community"
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                  >
                    Merchant Forum
                  </Link>
                  <Link
                    to="/support"
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
                  >
                    Support Ticket
                  </Link>
                </div>
              </div>

            </div>
          </aside>

          {/* Right Main Content Pane */}
          <main className="lg:col-span-8 xl:col-span-9">
            <article className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10">
              
              {/* Breadcrumb & Category Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Link to="/" className="hover:text-blue-600">Home</Link>
                  <span>/</span>
                  <Link to="/docs" className="hover:text-blue-600">Documentation</Link>
                  <span>/</span>
                  <span className="text-slate-800 font-semibold">{activeDoc.category}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  <Clock size={12} className="text-slate-400" />
                  <span>{activeDoc.readingTime}</span>
                </div>
              </div>

              {/* Title & Subtitle */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                {activeDoc.title}
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-6 font-medium">
                {activeDoc.subtitle}
              </p>

              {/* Summary Callout Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 mb-8">
                <p className="text-sm text-blue-950 font-medium leading-relaxed">
                  <span className="font-bold text-blue-900">Key Takeaway: </span>
                  {activeDoc.summary}
                </p>
              </div>

              {/* Visual Media Requirement Callout (When image/video is needed) */}
              {activeDoc.mediaRequirements && activeDoc.mediaRequirements.length > 0 && (
                <div className="mb-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      Visual Media &amp; Video Walkthrough Blueprint
                    </span>
                    <span className="text-xs text-slate-400">
                      {activeDoc.mediaRequirements.length} asset{activeDoc.mediaRequirements.length > 1 ? 's' : ''} specified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeDoc.mediaRequirements.map((media, mIdx) => (
                      <div
                        key={mIdx}
                        className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-5 hover:border-blue-400 transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-700 shadow-2xs">
                              {media.type === 'image' ? (
                                <>
                                  <ImageIcon size={13} className="text-blue-600" />
                                  <span>Screenshot Needed</span>
                                </>
                              ) : (
                                <>
                                  <Video size={13} className="text-purple-600" />
                                  <span>Video Walkthrough Needed</span>
                                </>
                              )}
                            </span>
                            <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                              {media.filename}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 mb-1">
                            {media.label}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed mb-3">
                            {media.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-700 font-medium">
                            <strong className="text-slate-800">Spec:</strong> {media.specs}
                          </span>
                          <span className="text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => toast.success(`Target filename: /docs/${media.filename}`)}>
                            Copy Name
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Content Sections */}
              <div className="space-y-10">
                {activeDoc.content.map((block, bIdx) => (
                  <section key={bIdx} className="space-y-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      {block.heading}
                    </h3>

                    {/* Paragraphs */}
                    {block.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} className="text-base text-slate-700 leading-relaxed">
                        {p}
                      </p>
                    ))}

                    {/* Steps if present */}
                    {block.steps && (
                      <div className="grid grid-cols-1 gap-3 pt-2">
                        {block.steps.map((st) => (
                          <div
                            key={st.step}
                            className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80"
                          >
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {st.step}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                                {st.title}
                              </h4>
                              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                {st.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comparison Table if present */}
                    {block.table && (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs my-4">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold">
                              {block.table.headers.map((h, hIdx) => (
                                <th key={hIdx} className="py-3 px-4">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {block.table.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`py-3 px-4 ${
                                      cIdx === 0
                                        ? 'font-semibold text-slate-900'
                                        : cIdx === 2
                                        ? 'text-blue-700 font-semibold'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Code Snippets if present */}
                    {block.codeSnippets && (
                      <div className="space-y-3 pt-2">
                        {block.codeSnippets.map((snippet, sIdx) => {
                          const codeKey = `${bIdx}-${sIdx}`;
                          const isCopied = copiedCodeIndex === codeKey;
                          return (
                            <div key={sIdx} className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 text-xs">
                              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                                <span className="font-semibold text-slate-300 font-mono text-[11px]">
                                  {snippet.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(snippet.code, codeKey)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium cursor-pointer"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check size={12} className="text-emerald-400" />
                                      <span className="text-emerald-400 font-bold">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="p-4 font-mono text-xs overflow-x-auto text-emerald-400 leading-relaxed selection:bg-blue-600 selection:text-white">
                                <code>{snippet.code}</code>
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Tips / Notes if present */}
                    {block.tips && block.tips.length > 0 && (
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 space-y-1.5 my-3">
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-900">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>Pro Tip for Shopkeepers</span>
                        </div>
                        {block.tips.map((tText, tIdx) => (
                          <p key={tIdx} className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                            {tText}
                          </p>
                        ))}
                      </div>
                    )}

                  </section>
                ))}
              </div>

              {/* Footer Nav between articles */}
              <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  Was this documentation helpful?{' '}
                  <button
                    type="button"
                    onClick={() => toast.success('Thank you for your feedback!')}
                    className="text-blue-600 font-semibold hover:underline cursor-pointer ml-1"
                  >
                    Yes, helpful
                  </button>
                  <span className="mx-1.5">•</span>
                  <Link to="/support" className="text-slate-600 hover:underline">
                    Report an issue
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link to this guide copied');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <Share2 size={13} />
                    <span>Share Guide</span>
                  </button>

                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-xs"
                  >
                    <span>Open Merchant Dashboard</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

            </article>

            {/* Media Production Checklist Section (Anchor #media-blueprint) */}
            <div id="media-blueprint" className="mt-12 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-700">
                  <Video size={22} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    Comprehensive Media Production Checklist
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Exact list of all images and video walkthroughs needed for the documentation.
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Whenever you record a video or take a screenshot, save it using the exact filename indicated below in <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-xs">frontend/public/docs/</code>. The documentation viewer will automatically display your live assets!
              </p>

              <div className="space-y-4">
                {allMediaRequirements.map((req, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          req.item.type === 'image'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {req.item.type === 'image' ? <ImageIcon size={11} /> : <Video size={11} />}
                          {req.item.type === 'image' ? 'Image / Screenshot' : 'Video Walkthrough'}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {req.item.filename}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          in <button type="button" onClick={() => handleSelectSection(req.sectionId)} className="text-blue-600 hover:underline font-medium">{req.docTitle}</button>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800 font-semibold">{req.item.label}:</strong> {req.item.description}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Target Spec: {req.item.specs}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`frontend/public/docs/${req.item.filename}`);
                        toast.success(`Copied target path: frontend/public/docs/${req.item.filename}`);
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer self-start sm:self-center"
                    >
                      <Copy size={12} />
                      <span>Copy Path</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </main>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="bg-slate-900 text-white py-14 px-4 sm:px-6 border-t border-slate-800 mt-12">
        <div className="max-w-[1000px] mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Zap size={13} />
            <span>0% Platform Commission Forever</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Ready to Open Your Own Independent Store?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join thousands of independent retailers, grocers, and artisans taking direct control of their commerce without marketplace middlemen.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base transition-all shadow-lg hover:shadow-blue-600/30 active:scale-[0.98]"
            >
              <span>Create Free Store Now</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm sm:text-base transition-all border border-white/20"
            >
              <span>View Sovereign Plans</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

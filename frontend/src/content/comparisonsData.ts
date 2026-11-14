export interface ComparisonRow {
  feature: string;
  category: 'Economics & Fees' | 'Architecture & Speed' | 'Merchant Ownership' | 'Storefront & Ops';
  ferasetu: string;
  competitor: string;
  isFeraAdvantage: boolean;
  notes?: string;
}

export interface ComparisonFAQ {
  question: string;
  answer: string;
}

export interface CompetitorComparisonData {
  slug: string;
  competitorName: string;
  competitorCategory: string;
  title: string;
  metaDescription: string;
  h1: string;
  subheading: string;
  badge: string;
  targetQueries: string[];
  summaryQuote: string;
  pillarHighlights: {
    title: string;
    description: string;
    metric: string;
    metricLabel: string;
  }[];
  matrix: ComparisonRow[];
  whySwitchPoints?: {
    title: string;
    description: string;
    takeaway: string;
  }[];
  whySwitchReasons?: {
    title: string;
    description: string;
    takeaway: string;
  }[];
  migrationSteps: {
    step: number;
    title: string;
    detail: string;
  }[];
  faqs: ComparisonFAQ[];
}

export const COMPARISONS_DATA: Record<string, CompetitorComparisonData> = {
  'shopify-alternative': {
    slug: 'shopify-alternative',
    competitorName: 'Shopify',
    competitorCategory: 'Proprietary App-Tax Commerce',
    title: 'Shopify Alternative — 0% Commission Sovereign Commerce | FeraSetu',
    metaDescription:
      'Compare FeraSetu vs Shopify. 0% platform commission, direct bank settlement, native WhatsApp cart checkout, and zero 3rd-party transaction penalties.',
    h1: 'The 0% Commission Shopify Alternative for Independent Retailers',
    subheading:
      'Stop paying a 2% penalty on every customer sale and hundreds of dollars per month on mandatory third-party apps. FeraSetu gives you a fast, sovereign online storefront with direct payment settlement and native WhatsApp ordering.',
    badge: '0% Platform Commission vs. Shopify 2% Surcharge',
    targetQueries: [
      'Shopify alternative',
      '0% commission Shopify alternative',
      'FeraSetu vs Shopify',
      'affordable Shopify alternative India',
    ],
    summaryQuote:
      'Shopify charges \$39-\$399/mo plus a 0.5%-2.0% fee if you use your own payment gateway, plus extra app bills for basic WhatsApp checkout and GST invoices. FeraSetu charges 0% platform commission and includes native commerce tools out of the box.',
    pillarHighlights: [
      {
        title: '0% Platform Commission',
        description:
          'Shopify penalizes merchants using external gateways with up to 2% extra transaction fees. FeraSetu charges ₹0 commission on all sales; 100% of your earnings settle directly with your payment provider.',
        metric: '0%',
        metricLabel: 'Platform Cut on Sales',
      },
      {
        title: 'Direct Payment Settlement',
        description:
          'Connect your own Cashfree or standard payment gateway. Funds settle directly into your bank account on your gateway schedule, completely isolated from SaaS subscriptions.',
        metric: 'T+1',
        metricLabel: 'Direct Bank Settlement',
      },
      {
        title: 'Native WhatsApp Cart Checkout',
        description:
          'No \$20-\$50/mo third-party apps required. FeraSetu provides built-in 1-click WhatsApp cart drawers that send itemized, address-formatted orders directly to your customer chat.',
        metric: 'Built-in',
        metricLabel: 'Zero Extra Plugins',
      },
      {
        title: 'All-Inclusive SaaS Pricing',
        description:
          'Start on the permanent ₹0 Free plan for up to 25 products. Upgrade to Business (₹399/mo) or Pro (₹999/mo) with custom domains and automated GST invoices included.',
        metric: '₹0',
        metricLabel: 'Permanent Free Entry',
      },
    ],
    matrix: [
      {
        feature: 'Platform Transaction Commission',
        category: 'Economics & Fees',
        ferasetu: '0% platform fee on all plans',
        competitor: '0.5% – 2.0% penalty for 3rd-party gateways',
        isFeraAdvantage: true,
        notes: 'Merchant pays only standard payment gateway rates (e.g. Cashfree/Razorpay).',
      },
      {
        feature: 'Entry Plan Monthly Cost',
        category: 'Economics & Fees',
        ferasetu: '₹0/month permanent free plan (25 products)',
        competitor: '~$39/month (~₹3,200/mo) Basic tier',
        isFeraAdvantage: true,
        notes: 'Shopify offers temporary promos but renormalizes to full USD pricing.',
      },
      {
        feature: 'Custom Domain Connection',
        category: 'Merchant Ownership',
        ferasetu: 'Included in Business tier (₹399/mo) + free subdomain on all plans',
        competitor: 'Included on paid plans (~$39/mo min)',
        isFeraAdvantage: true,
        notes: 'Both support custom root and subdomains with automated SSL.',
      },
      {
        feature: 'Customer Contact Ownership',
        category: 'Merchant Ownership',
        ferasetu: '100% unmasked customer names, phones & addresses',
        competitor: 'Full data access, but locked into proprietary ecosystem',
        isFeraAdvantage: true,
        notes: 'Export CSV of customers and orders at any time without fees.',
      },
      {
        feature: 'WhatsApp Cart & Drawer Checkout',
        category: 'Storefront & Ops',
        ferasetu: 'Native, built-in 1-click WhatsApp drawer',
        competitor: 'Requires 3rd-party apps ($10–$50/mo)',
        isFeraAdvantage: true,
        notes: 'FeraSetu formats complete order details and recipient location automatically.',
      },
      {
        feature: 'Automated GST Invoicing (India)',
        category: 'Storefront & Ops',
        ferasetu: 'Native CGST/SGST/IGST tax invoices with HSN/SAC',
        competitor: 'Requires paid Shopify App Store plugins',
        isFeraAdvantage: true,
        notes: 'Compliant tax invoices generated automatically upon order fulfillment.',
      },
      {
        feature: 'Hosting Infrastructure & Edge Speed',
        category: 'Architecture & Speed',
        ferasetu: 'Global Cloudflare edge network (<50ms TTFB)',
        competitor: 'Proprietary cloud infrastructure (fast, but heavy JS runtime)',
        isFeraAdvantage: true,
        notes: 'FeraSetu storefronts load instantly even on low-bandwidth 4G mobile devices.',
      },
      {
        feature: 'App Store Dependency & Plugin Bloat',
        category: 'Architecture & Speed',
        ferasetu: 'Zero app bloat; core commerce is pre-integrated',
        competitor: 'High app dependency; each app injects client-side script tags',
        isFeraAdvantage: true,
        notes: 'Every Shopify app slows down mobile Core Web Vitals (LCP/INP).',
      },
    ],
    whySwitchReasons: [
      {
        title: 'Eliminate the Hidden Third-Party Gateway Tax',
        description:
          'Shopify actively penalizes businesses that want to use their preferred local or regional payment processors by adding a 0.5% to 2% surcharge on top of standard payment processing fees. At ₹10,00,000 in monthly sales, that equals ₹20,000 paid to Shopify simply for processing transactions outside Shopify Payments. FeraSetu charges 0% commission forever.',
        takeaway: 'Save up to 2% on your gross merchandise value every single month.',
      },
      {
        title: 'Stop the Subscription App Creep',
        description:
          'To get WhatsApp order capture, GST invoicing, pin-code delivery checks, and custom checkout fields on Shopify, merchants typically subscribe to 4 to 8 separate apps from the Shopify App Store, inflating monthly software costs by $60 to $200. FeraSetu integrates these retail necessities directly into the core platform.',
        takeaway: 'Predictable, flat monthly pricing without unexpected plugin bills.',
      },
      {
        title: 'Mobile-First Edge Architecture for High Conversion',
        description:
          'Over 80% of retail transactions in emerging and global markets happen on mobile devices under variable network speeds. While heavy Shopify themes burdened by app scripts can take 4-6 seconds to become interactive, FeraSetu’s serverless Cloudflare edge architecture renders storefronts in under 500ms.',
        takeaway: 'Faster mobile load speeds translate directly to lower bounce rates and higher checkout conversion.',
      },
    ],
    migrationSteps: [
      {
        step: 1,
        title: 'Export Your Catalog from Shopify',
        detail: 'Navigate to Products > Export > All Products (CSV) in your Shopify admin to download your full inventory.',
      },
      {
        step: 2,
        title: 'Claim Your FeraSetu Subdomain or Domain',
        detail: 'Create your account in 30 seconds for ₹0 and choose your permanent store handle (e.g. brand.ferasetu.com).',
      },
      {
        step: 3,
        title: 'Import Catalog & Configure Payment Gateway',
        detail: 'Upload your product CSV, connect your direct Cashfree/UPI credentials, and your store is live.',
      },
    ],
    faqs: [
      {
        question: 'Does FeraSetu charge transaction commissions like Shopify?',
        answer:
          'No. FeraSetu has an absolute 0% platform transaction commission policy. While Shopify charges up to 2% when using non-Shopify payment gateways, FeraSetu charges ₹0. You only pay standard gateway processing fees to your payment provider.',
      },
      {
        question: 'Can I connect my existing custom domain (e.g. mybrand.com)?',
        answer:
          'Yes. On FeraSetu Business (₹399/mo) and Pro (₹999/mo) plans, you can connect your existing domain from GoDaddy, Namecheap, Cloudflare, or any registrar. We provision an automated SSL certificate on Cloudflare Edge at zero extra charge.',
      },
      {
        question: 'How do WhatsApp cart orders work without paid plugins?',
        answer:
          'FeraSetu includes a native WhatsApp cart checkout drawer. When a buyer selects products and taps "Order via WhatsApp", the system formats the order breakdown, delivery address, quantities, and totals into a pre-filled WhatsApp message sent directly to your verified business number.',
      },
      {
        question: 'Can I migrate my products from Shopify to FeraSetu?',
        answer:
          'Yes. You can export your product CSV from Shopify and import it directly into FeraSetu with automated title, price, SKU, inventory count, and image mapping.',
      },
      {
        question: 'Is FeraSetu suitable for B2B or wholesale commerce?',
        answer:
          'Yes. FeraSetu is purpose-built for independent retailers, wholesale suppliers, and multi-region merchants with customer segmentation, digital invoices, and flexible direct payment collection.',
      },
    ],
  },

  'woocommerce-alternative': {
    slug: 'woocommerce-alternative',
    competitorName: 'WooCommerce',
    competitorCategory: 'Self-Hosted WordPress Plugin',
    title: 'WooCommerce Alternative — Zero Server Maintenance & 0% Commission | FeraSetu',
    metaDescription:
      'Compare FeraSetu vs WooCommerce. Eliminate server crashes, plugin updates, database bloat, and costly VPS maintenance with managed serverless edge commerce.',
    h1: 'The Fast, Managed WooCommerce Alternative with Zero Plugin Bloat',
    subheading:
      'Tired of broken WordPress plugin updates, slow MySQL databases, expensive managed VPS hosting, and PHP fatal errors? FeraSetu offers modern serverless commerce that runs on Cloudflare Edge with zero maintenance.',
    badge: 'Zero Maintenance Serverless vs. Self-Hosted WordPress',
    targetQueries: [
      'WooCommerce alternative',
      'managed serverless commerce vs WooCommerce',
      'FeraSetu vs WooCommerce',
      'WordPress ecommerce alternative',
    ],
    summaryQuote:
      'WooCommerce appears free, but hosting, caching, security firewalls, premium plugins, and developer retainers cost \$50-\$300/mo. FeraSetu delivers edge-hosted speed, built-in WhatsApp carts, and 0% commission with zero server management.',
    pillarHighlights: [
      {
        title: 'Zero Server Maintenance',
        description:
          'No PHP updates, no MySQL crashes, and no security vulnerabilities like Wordfence alerts. Everything is managed serverless at the edge.',
        metric: '99.99%',
        metricLabel: 'Serverless Uptime',
      },
      {
        title: '0% Platform Commission',
        description:
          'Like self-hosted WordPress, FeraSetu charges 0% commission on your sales. Unlike WordPress, you don’t need to pay \$100/mo for VPS hosting.',
        metric: '0%',
        metricLabel: 'Platform Commission',
      },
      {
        title: 'Edge Performance Out of the Box',
        description:
          'WooCommerce requires Redis object caches, Varnish, and Cloudflare APO plugins just to get decent TTFB. FeraSetu runs natively on global edge workers in <50ms.',
        metric: '<50ms',
        metricLabel: 'Edge TTFB Speed',
      },
      {
        title: 'Unified Admin Dashboard',
        description:
          'Manage inventory, pending orders, tax invoices, customer segments, and delivery verification codes in one unified workspace with zero technical jargon.',
        metric: '1 UI',
        metricLabel: 'Zero Conflicting Plugins',
      },
    ],
    matrix: [
      {
        feature: 'Server & Hosting Maintenance',
        category: 'Architecture & Speed',
        ferasetu: 'Fully managed serverless (zero maintenance)',
        competitor: 'Self-managed (requires VPS, cPanel, PHP & MySQL upkeep)',
        isFeraAdvantage: true,
        notes: 'FeraSetu handles scaling, security patches, and edge routing automatically.',
      },
      {
        feature: 'Plugin Conflicts & Broken Updates',
        category: 'Architecture & Speed',
        ferasetu: 'Impossible; unified battle-tested codebase',
        competitor: 'Frequent; plugin version clashes break checkout',
        isFeraAdvantage: true,
        notes: 'One WordPress plugin update can crash the entire checkout flow.',
      },
      {
        feature: 'Platform Transaction Commission',
        category: 'Economics & Fees',
        ferasetu: '0% platform fee on all plans',
        competitor: '0% platform fee (but high infrastructure costs)',
        isFeraAdvantage: false,
        notes: 'Both have 0% platform commission, but WooCommerce requires hosting and plugin licenses.',
      },
      {
        feature: 'True Hosting & Maintenance Cost',
        category: 'Economics & Fees',
        ferasetu: '₹0 Free plan, ₹399/mo Business (all-inclusive)',
        competitor: '₹1,500 – ₹8,000/mo (VPS + premium plugins + backups)',
        isFeraAdvantage: true,
        notes: 'Managed WP hosting (Kinsta, WP Engine) starts at $30–$35/month.',
      },
      {
        feature: 'Security & Vulnerability Patches',
        category: 'Architecture & Speed',
        ferasetu: 'Enterprise Cloudflare WAF & ISO-grade edge isolation',
        competitor: 'Frequent target for SQL injection & plugin CVE exploits',
        isFeraAdvantage: true,
        notes: 'Over 90% of WordPress vulnerabilities stem from outdated third-party plugins.',
      },
      {
        feature: 'Native WhatsApp Ordering & Invoicing',
        category: 'Storefront & Ops',
        ferasetu: 'Pre-built native WhatsApp drawer + GST invoices',
        competitor: 'Requires multiple third-party plugins ($49–$99/yr each)',
        isFeraAdvantage: true,
        notes: 'FeraSetu includes both without additional licensing or setup.',
      },
      {
        feature: 'Mobile Admin Speed',
        category: 'Storefront & Ops',
        ferasetu: 'Instant, responsive mobile PWA dashboard (<400ms interactions)',
        competitor: 'Sluggish WP Admin interface on mobile viewports',
        isFeraAdvantage: true,
        notes: 'Manage orders and restock inventory directly from your smartphone.',
      },
    ],
    whySwitchReasons: [
      {
        title: 'End the Endless Cycle of Plugin Updates & Site Crashes',
        description:
          'The average WooCommerce store relies on 15 to 30 plugins for payment processing, SEO, caching, invoicing, and forms. Every Tuesday WordPress update carries the risk of breaking checkout or causing white-screen fatal errors. FeraSetu provides a cohesive platform where every feature is engineered and verified by our team.',
        takeaway: 'Never worry about a broken site or hiring a developer for emergency fixes again.',
      },
      {
        title: 'Drastically Lower Total Cost of Ownership',
        description:
          'While WooCommerce software is open source, running a reliable store requires high-memory VPS hosting ($25–$100/mo), security suites like Wordfence ($99/yr), backup tools like UpdraftPlus, and premium payment gateway extensions. FeraSetu bundles edge hosting, automatic backups, and SSL into simple plans starting at ₹0.',
        takeaway: 'Save thousands of dollars annually while gaining higher reliability.',
      },
      {
        title: 'Global Edge Speed Without Complex Caching Rules',
        description:
          'WooCommerce dynamic cart fragments frequently bypass caching layers, causing sluggish TTFB on mobile checkouts. FeraSetu uses modern React and Cloudflare Worker microservices to deliver sub-second cart operations globally.',
        takeaway: 'Buttery smooth checkout that converts higher on mobile devices.',
      },
    ],
    migrationSteps: [
      {
        step: 1,
        title: 'Export WooCommerce Products CSV',
        detail: 'Go to WooCommerce > Products > Export in WordPress to download your CSV catalog including images and attributes.',
      },
      {
        step: 2,
        title: 'Create Your FeraSetu Workspace',
        detail: 'Sign up for FeraSetu in 30 seconds and enter your business name.',
      },
      {
        step: 3,
        title: 'Point DNS & Connect Payments',
        detail: 'Add your CNAME record to point your domain to FeraSetu and enter your direct payment gateway keys.',
      },
    ],
    faqs: [
      {
        question: 'Why should I switch from WooCommerce to FeraSetu if WooCommerce is free?',
        answer:
          'While WooCommerce is free software, the real cost of hosting, SSL, caching layers, Wordfence security, and plugin subscriptions often exceeds ₹3,000–₹10,000/month. FeraSetu eliminates all server maintenance, security patching, and plugin conflicts while maintaining 0% platform commission.',
      },
      {
        question: 'Will I still own my customer data on FeraSetu?',
        answer:
          'Yes, 100%. You maintain sovereign ownership of your catalog, customer list, order histories, and domains. You can export your data to standard CSV format at any time without fees or lock-in.',
      },
      {
        question: 'How does FeraSetu perform under traffic spikes compared to WooCommerce?',
        answer:
          'WooCommerce servers often crash when traffic spikes because each visitor executes heavy PHP scripts and MySQL database queries. FeraSetu runs on Cloudflare Edge serverless workers, scaling automatically to handle thousands of concurrent visits with zero server configuration.',
      },
      {
        question: 'Can I use custom domains and email notifications?',
        answer:
          'Yes. You can connect your custom domain on Business and Pro plans, and configure automated email and WhatsApp order notifications to both you and your buyers.',
      },
    ],
  },

  'bigcommerce-alternative': {
    slug: 'bigcommerce-alternative',
    competitorName: 'BigCommerce',
    competitorCategory: 'Enterprise SaaS Commerce',
    title: 'BigCommerce Alternative — Simple, Sovereign 0% Commission | FeraSetu',
    metaDescription:
      'Compare FeraSetu vs BigCommerce. Avoid forced annual revenue tier upgrades and complex enterprise bloat with sovereign 0% commission commerce starting at ₹0.',
    h1: 'The Sovereign BigCommerce Alternative Without Forced Revenue Penalties',
    subheading:
      'BigCommerce forces merchants into expensive \$299/mo tiers as sales grow, locking you into enterprise complexity. FeraSetu keeps commerce simple, accessible, and 0% commission regardless of your store size.',
    badge: 'No Forced Tier Upgrades vs. BigCommerce Revenue Caps',
    targetQueries: [
      'BigCommerce alternative',
      'sovereign commerce platform',
      'FeraSetu vs BigCommerce',
      'affordable BigCommerce competitor',
    ],
    summaryQuote:
      'BigCommerce punishes growing stores with mandatory upgrades to \$79-\$299+/mo based on gross sales thresholds. FeraSetu believes in sovereign growth: flat SaaS pricing, 0% platform commission, and full merchant autonomy.',
    pillarHighlights: [
      {
        title: 'No Revenue Penalties',
        description:
          'BigCommerce automatically pushes you to higher tiers if you exceed \$50k or \$180k in annual sales. FeraSetu never penalizes you for earning more.',
        metric: 'Zero',
        metricLabel: 'Revenue Growth Caps',
      },
      {
        title: '0% Platform Commission',
        description:
          'Direct bank settlement through your choice of payment gateways without platform revenue extraction.',
        metric: '0%',
        metricLabel: 'Platform Cut',
      },
      {
        title: 'Modern Lightweight Stack',
        description:
          'Built with modern React and Cloudflare Edge rather than legacy Stencil template engines from a decade ago.',
        metric: '100%',
        metricLabel: 'Modern Edge Stack',
      },
      {
        title: 'Setup in 5 Minutes',
        description:
          'BigCommerce requires days of technical onboarding. FeraSetu is designed for human retailers to launch their store in under 5 minutes.',
        metric: '<5 min',
        metricLabel: 'Store Launch Time',
      },
    ],
    matrix: [
      {
        feature: 'Forced Tier Upgrades on Sales Growth',
        category: 'Economics & Fees',
        ferasetu: 'Never; tier limits are catalog-based, not revenue-capped',
        competitor: 'Yes; forced upgrades from $39 to $105 to $399/mo',
        isFeraAdvantage: true,
        notes: 'BigCommerce caps Standard tier at $50,000/yr and Plus at $180,000/yr.',
      },
      {
        feature: 'Monthly Starting Price',
        category: 'Economics & Fees',
        ferasetu: '₹0 Free plan; ₹399/mo Business tier',
        competitor: '~$39/mo Standard tier',
        isFeraAdvantage: true,
        notes: 'FeraSetu allows testing and initial launch with zero financial risk.',
      },
      {
        feature: 'Template Customization Complexity',
        category: 'Architecture & Speed',
        ferasetu: 'Clean visual controls & Fera AI content assistant',
        competitor: 'Complex Stencil CLI & Handlebars developer toolchain',
        isFeraAdvantage: true,
        notes: 'BigCommerce theme customization often requires dedicated front-end developers.',
      },
      {
        feature: 'WhatsApp Cart Ordering',
        category: 'Storefront & Ops',
        ferasetu: 'Native 1-click WhatsApp drawer',
        competitor: 'Not natively supported; requires external connectors',
        isFeraAdvantage: true,
        notes: 'Essential for mobile-first markets in Asia, LATAM, and EMEA.',
      },
      {
        feature: 'GST & Localized Invoicing',
        category: 'Storefront & Ops',
        ferasetu: 'Built-in automated GST tax invoices with HSN/SAC codes',
        competitor: 'Requires expensive 3rd-party accounting integrations',
        isFeraAdvantage: true,
        notes: 'Compliant tax invoices generated at fulfillment with zero addon costs.',
      },
    ],
    whySwitchReasons: [
      {
        title: 'Say Goodbye to Sales Threshold Penalties',
        description:
          'On BigCommerce, crossing $50,000 in online orders automatically forces you onto their $105/month Plus plan, and crossing $180,000 forces you onto their $399/month Pro plan. FeraSetu charges honest, predictable pricing based strictly on your catalog size and operational needs — never taking a tax on your commercial success.',
        takeaway: 'Keep 100% of your scaling margins in your own business.',
      },
      {
        title: 'Intuitive Management Without Enterprise Overhead',
        description:
          'BigCommerce is built for large corporate enterprises with dedicated IT departments, making simple daily tasks like updating prices, adding variants, or sending customer receipts confusing and cumbersome. FeraSetu focuses on radical clarity, intuitive ergonomics, and zero technical jargon.',
        takeaway: 'Manage your entire business directly from your phone or laptop in minutes.',
      },
    ],
    migrationSteps: [
      {
        step: 1,
        title: 'Export BigCommerce Catalog CSV',
        detail: 'Download your full catalog from Products > Export in BigCommerce.',
      },
      {
        step: 2,
        title: 'Import to FeraSetu',
        detail: 'Upload products with images, prices, variants, and stock counts.',
      },
      {
        step: 3,
        title: 'Reassign Custom Domain',
        detail: 'Update your DNS records to connect your custom brand domain to FeraSetu.',
      },
    ],
    faqs: [
      {
        question: 'Does FeraSetu limit my store revenue like BigCommerce?',
        answer:
          'No. FeraSetu never places sales caps or forced revenue tier upgrades on your account. Whether you generate ₹50,000 or ₹50,00,000 in monthly sales, your subscription tier remains unchanged.',
      },
      {
        question: 'How does FeraSetu handle B2B wholesale pricing?',
        answer:
          'FeraSetu includes customer tagging and segmentation features, allowing merchants to offer differentiated catalogs and wholesale relationships directly.',
      },
      {
        question: 'Can I migrate my customer database from BigCommerce?',
        answer:
          'Yes. You can export your customer list from BigCommerce and import it into FeraSetu to maintain all your customer contacts and order histories.',
      },
    ],
  },

  'dukaan-alternative': {
    slug: 'dukaan-alternative',
    competitorName: 'Dukaan',
    competitorCategory: 'Storefront SaaS App',
    title: 'Dukaan Alternative — Transparent 0% Commission Commerce | FeraSetu',
    metaDescription:
      'Compare FeraSetu vs Dukaan. Enjoy 100% data ownership, 0% platform commission, direct bank settlement, and sovereign custom domains with zero hidden fees.',
    h1: 'The Independent Dukaan Alternative with 100% Data & Domain Ownership',
    subheading:
      'Looking for an alternative to Dukaan? FeraSetu offers independent storefronts, direct bank settlements via your own payment gateway, 0% platform commission, and full customer relationship ownership.',
    badge: '100% Data Ownership vs. Dukaan Closed Ecosystem',
    targetQueries: [
      'Dukaan alternative',
      'independent online storefront vs Dukaan',
      'FeraSetu vs Dukaan',
      'free dukaan online store alternative',
    ],
    summaryQuote:
      'Dukaan charges platform commissions or transaction cuts and controls payment routing. FeraSetu is sovereign infrastructure: you own your customer contacts, connect your own payment gateway, and pay 0% platform commission.',
    pillarHighlights: [
      {
        title: '100% Direct Settlement',
        description:
          'Receive payments directly into your bank account through your own gateway keys. FeraSetu never holds your money or delays settlements.',
        metric: 'Direct',
        metricLabel: 'Bank Settlement',
      },
      {
        title: '0% Platform Commission',
        description:
          'Keep 100% of your earnings on every order, whether paid via UPI, card, netbanking, or Cash on Delivery.',
        metric: '0%',
        metricLabel: 'Platform Commission',
      },
      {
        title: 'Unmasked Customer Data',
        description:
          'Never worry about platforms hiding customer phone numbers or remarketing to your buyers. Your customer data belongs exclusively to you.',
        metric: '100%',
        metricLabel: 'Data Ownership',
      },
      {
        title: 'Modern High-Craft UI',
        description:
          'Sleek, lightning-fast storefronts designed to Apple and Stripe aesthetic standards with zero clutter.',
        metric: 'Premium',
        metricLabel: 'Modern Craftsmanship',
      },
    ],
    matrix: [
      {
        feature: 'Payment Settlement Flow',
        category: 'Merchant Ownership',
        ferasetu: 'Direct into merchant bank account (via Cashfree/gateway)',
        competitor: 'Settled through platform intermediary or wallet payout cycles',
        isFeraAdvantage: true,
        notes: 'FeraSetu never holds or mediates your customer payments.',
      },
      {
        feature: 'Platform Sales Commission',
        category: 'Economics & Fees',
        ferasetu: '0% on all plans',
        competitor: 'Up to 0.99% – 4.99% depending on tier / payment mode',
        isFeraAdvantage: true,
        notes: 'Zero platform fee on all FeraSetu plans.',
      },
      {
        feature: 'Permanent Free Plan',
        category: 'Economics & Fees',
        ferasetu: 'Yes, permanent ₹0 plan (25 products, WhatsApp cart, UPI)',
        competitor: 'Limited free trials; requires paid subscription to sell',
        isFeraAdvantage: true,
        notes: 'Launch your store without entering credit card or payment info.',
      },
      {
        feature: 'Automated GST Tax Invoicing',
        category: 'Storefront & Ops',
        ferasetu: 'Native, customizable GST invoice PDFs with HSN/SAC codes',
        competitor: 'Basic invoicing, often requiring plugin upgrades',
        isFeraAdvantage: true,
        notes: 'Generates B2B and B2C tax invoices in 1 click.',
      },
      {
        feature: 'Customer Data Export',
        category: 'Merchant Ownership',
        ferasetu: 'Full unmasked CSV export at any time',
        competitor: 'Platform controls customer touchpoints and notifications',
        isFeraAdvantage: true,
        notes: 'You own 100% of customer names, phones, and addresses.',
      },
    ],
    whySwitchReasons: [
      {
        title: 'Protect Your Cash Flow with Direct Settlements',
        description:
          'When platforms act as payment intermediaries, your funds can be delayed by verification holds, platform settlement batching, or dispute freezes. FeraSetu connects directly to your own verified merchant gateway (like Cashfree), so funds settle straight into your business bank account according to your direct banking schedule.',
        takeaway: 'Total financial sovereignty and predictable working capital.',
      },
      {
        title: 'Build Your Own Brand, Not a Closed Network Node',
        description:
          'Your storefront should showcase your brand identity, build customer loyalty, and enable direct repeat business. FeraSetu guarantees that your customer contact details are never aggregated or remarketed to competing sellers.',
        takeaway: 'Cultivate direct, lifelong customer relationships.',
      },
    ],
    migrationSteps: [
      {
        step: 1,
        title: 'Export Products from Dukaan',
        detail: 'Download your inventory list or copy product catalog details.',
      },
      {
        step: 2,
        title: 'Set Up Your Free FeraSetu Store',
        detail: 'Claim your store handle (yourname.ferasetu.com) in 30 seconds.',
      },
      {
        step: 3,
        title: 'Connect UPI & WhatsApp',
        detail: 'Enter your WhatsApp business number and UPI payment ID to start receiving direct orders.',
      },
    ],
    faqs: [
      {
        question: 'Does FeraSetu take a commission on my orders like Dukaan?',
        answer:
          'No. FeraSetu charges 0% platform commission across all plans. You keep 100% of the money your customers pay, minus whatever standard processing fee your payment gateway charges.',
      },
      {
        question: 'How do customers pay me on FeraSetu?',
        answer:
          'Customers can pay via UPI (Google Pay, PhonePe, Paytm), credit/debit cards, netbanking, or Cash on Delivery. Payments go directly to your registered bank account via your gateway.',
      },
      {
        question: 'Can I start using FeraSetu for free?',
        answer:
          'Yes. FeraSetu has a permanent ₹0 Free plan that includes up to 25 catalog products, WhatsApp cart ordering, and UPI payments without requiring a credit card.',
      },
    ],
  },

  'wix-squarespace-alternative': {
    slug: 'wix-squarespace-alternative',
    competitorName: 'Wix & Squarespace',
    competitorCategory: 'Generic Website Builders',
    title: 'Wix & Squarespace Alternative — Modern Commerce Infrastructure | FeraSetu',
    metaDescription:
      'Compare FeraSetu vs Wix and Squarespace. Fast mobile edge speed, native WhatsApp ordering, and sovereign commerce infrastructure with 0% platform commission.',
    h1: 'The Fast, Commerce-Focused Wix & Squarespace Alternative',
    subheading:
      'Generic website builders make commerce an afterthought, slowing down mobile pages with bloated code and charging high monthly fees. FeraSetu is purpose-built commerce infrastructure that loads in milliseconds.',
    badge: 'Purpose-Built Commerce vs. Bloated Drag-and-Drop Builders',
    targetQueries: [
      'Wix eCommerce alternative',
      'Squarespace commerce alternative',
      'FeraSetu vs Wix',
      'FeraSetu vs Squarespace',
    ],
    summaryQuote:
      'Wix and Squarespace charge \$27-\$65/mo for basic commerce plans and load slow, heavy JavaScript on mobile phones. FeraSetu is purpose-built for fast buying: instant mobile loads, native WhatsApp ordering, and 0% commission.',
    pillarHighlights: [
      {
        title: 'Built for Commerce, Not Portfolios',
        description:
          'Generic builders treat shopping carts as an add-on. FeraSetu is engineered specifically for inventory, checkout conversion, and order fulfillment.',
        metric: '100%',
        metricLabel: 'Commerce Focus',
      },
      {
        title: 'Blazing Fast Mobile Speeds',
        description:
          'Wix sites routinely score poorly on Google PageSpeed due to heavy drag-and-drop runtime DOMs. FeraSetu delivers pristine Core Web Vitals.',
        metric: '95+',
        metricLabel: 'Mobile Speed Score',
      },
      {
        title: '0% Platform Commission',
        description:
          'Squarespace charges 3% transaction fees on their basic commerce tier. FeraSetu charges 0% on all plans.',
        metric: '0%',
        metricLabel: 'Platform Commission',
      },
      {
        title: 'Native WhatsApp Ordering',
        description:
          'Neither Wix nor Squarespace offers native WhatsApp checkout drawers. FeraSetu has it built into every storefront.',
        metric: 'Built-in',
        metricLabel: 'WhatsApp Drawer',
      },
    ],
    matrix: [
      {
        feature: 'Monthly Starting Cost for Selling',
        category: 'Economics & Fees',
        ferasetu: '₹0 Free plan; ₹399/mo Business tier',
        competitor: '$27 – $36/month minimum to accept online payments',
        isFeraAdvantage: true,
        notes: 'Wix and Squarespace block checkout functionality on their basic tiers.',
      },
      {
        feature: 'Platform Transaction Fee',
        category: 'Economics & Fees',
        ferasetu: '0% on all plans',
        competitor: '0% on higher tiers, 3% on Squarespace Business tier',
        isFeraAdvantage: true,
        notes: 'FeraSetu never charges transaction fees.',
      },
      {
        feature: 'Mobile PageSpeed & Core Web Vitals',
        category: 'Architecture & Speed',
        ferasetu: 'Sub-second edge rendering (<500ms LCP on 4G)',
        competitor: 'Heavy DOM bloat and slow script execution (3–7s LCP)',
        isFeraAdvantage: true,
        notes: 'Drag-and-drop builders generate thousands of unnecessary nested DOM wrappers.',
      },
      {
        feature: 'Native WhatsApp Checkout Drawer',
        category: 'Storefront & Ops',
        ferasetu: 'Included natively on all storefronts',
        competitor: 'Not available (requires external embed widgets)',
        isFeraAdvantage: true,
        notes: 'Direct 1-click cart submission to merchant WhatsApp.',
      },
      {
        feature: 'Automated GST Tax Invoicing',
        category: 'Storefront & Ops',
        ferasetu: 'Built-in CGST/SGST/IGST tax invoices with HSN/SAC',
        competitor: 'Not supported out-of-the-box for India',
        isFeraAdvantage: true,
        notes: 'FeraSetu generates compliant tax invoice PDFs automatically.',
      },
    ],
    whySwitchReasons: [
      {
        title: 'Stop Losing Mobile Customers to Slow Page Loads',
        description:
          'Drag-and-drop builders like Wix generate massive bundles of absolute-positioned CSS and runtime layout scripts. On mobile devices, this causes noticeable jank and high bounce rates. FeraSetu storefronts are streamlined for speed, rendering clean HTML and CSS that Googlebot and mobile shoppers love.',
        takeaway: 'Higher Google ranking and lower mobile drop-offs.',
      },
      {
        title: 'Honest Commerce Pricing Without Dollar Shocks',
        description:
          'Selling on Wix or Squarespace requires paying \$27 to \$65 USD every single month (₹2,200 to ₹5,400/month). FeraSetu gives you a superior commerce experience starting at ₹0 for 25 products, with full custom domain support at just ₹399/month.',
        takeaway: 'Save up to 80% on software costs while getting better commerce features.',
      },
    ],
    migrationSteps: [
      {
        step: 1,
        title: 'Export or List Your Products',
        detail: 'Download your products CSV from Wix or Squarespace.',
      },
      {
        step: 2,
        title: 'Create Your FeraSetu Store',
        detail: 'Sign up in 30 seconds for ₹0 and upload your product catalog.',
      },
      {
        step: 3,
        title: 'Connect Your Domain',
        detail: 'Point your existing domain DNS records to FeraSetu for instant SSL and global CDN.',
      },
    ],
    faqs: [
      {
        question: 'Can I sell digital and physical goods on FeraSetu?',
        answer:
          'Yes. FeraSetu supports physical goods, retail inventory, and digital merchandise with direct payments and unmasked customer data.',
      },
      {
        question: 'Does FeraSetu require complex web design skills?',
        answer:
          'No. Unlike Wix or Squarespace where you have to manually drag elements around an empty canvas, FeraSetu provides polished, high-conversion store layouts that look gorgeous automatically on both desktop and mobile viewports.',
      },
      {
        question: 'Can I connect a domain purchased through Wix or Squarespace?',
        answer:
          'Yes. You can keep your domain registration with Wix, Squarespace, or Google Domains and simply update the DNS CNAME records to point your storefront to FeraSetu.',
      },
    ],
  },
  'marketplace-alternative': {
    slug: 'marketplace-alternative',
    competitorName: 'Traditional Marketplaces',
    competitorCategory: 'Centralized Toll Marketplaces (Amazon, Flipkart, Swiggy)',
    title: 'Online Marketplace Alternative — 0% Commission Direct Commerce | FeraSetu',
    metaDescription:
      'Compare FeraSetu vs online marketplaces. Keep 100% customer revenue, own direct buyer contact details, and stop paying 15-30% commissions on every sale.',
    h1: 'The Sovereign Alternative to Commission-Heavy Online Marketplaces',
    subheading:
      'Stop losing 18% to 30% of your retail margin on every sale and being forbidden from contacting your own buyers. FeraSetu gives you a branded digital storefront with 0% platform commission and direct customer relationships.',
    badge: '0% Platform Fee vs. 15%–30% Marketplace Toll',
    targetQueries: [
      'marketplace alternative',
      'alternative to selling on amazon',
      'sell online without marketplace commission',
      'own customer data ecommerce',
      'independent commerce infrastructure',
    ],
    summaryQuote:
      'Centralized marketplaces treat merchants as replaceable inventory suppliers, masking customer contact info and charging 15%-30% commissions. FeraSetu provides sovereign commerce infrastructure: you keep 100% of your earnings, own your customer records, and build your own brand.',
    pillarHighlights: [
      {
        title: '0% Platform Commission',
        description:
          'Centralized marketplaces deduct 15% to 30% on every order. FeraSetu charges 0% platform commission on all plans; 100% of customer payments settle directly into your bank account.',
        metric: '0%',
        metricLabel: 'Platform Cut on Sales',
      },
      {
        title: 'Direct Customer Ownership',
        description:
          'Marketplaces strictly hide customer phone numbers and emails to prevent direct relationships. On FeraSetu, you own 100% of buyer contact records and can reach out directly via WhatsApp.',
        metric: '100%',
        metricLabel: 'Merchant-Owned Data',
      },
      {
        title: 'Direct Bank Settlement',
        description:
          'Instead of waiting 7 to 15 business days for marketplace disbursements, payments route directly to your verified bank account instantly via UPI or T+1 via gateway.',
        metric: 'Instant / T+1',
        metricLabel: 'Direct Bank Payout',
      },
      {
        title: 'Sovereign Brand Identity',
        description:
          'Build lasting equity under your own domain handle or custom domain. No competing sponsored ads or algorithmic private-label clones placed above your products.',
        metric: 'Your Brand',
        metricLabel: 'Zero Competitor Ads',
      },
    ],
    matrix: [
      {
        feature: 'Platform Commission per Order',
        category: 'Economics & Fees',
        ferasetu: '0% platform commission on all tiers',
        competitor: '15% to 30% commission + listing & closing fees',
        isFeraAdvantage: true,
        notes: 'Merchants retain 100% of gross earnings after standard payment processing.',
      },
      {
        feature: 'Customer Contact Info Visibility',
        category: 'Merchant Ownership',
        ferasetu: 'Full unmasked customer names, phones & addresses',
        competitor: 'Masked / strictly retained by the marketplace',
        isFeraAdvantage: true,
        notes: 'Marketplaces treat buyers as their own property, forbidding direct seller contact.',
      },
      {
        feature: 'Direct Customer Communication',
        category: 'Merchant Ownership',
        ferasetu: 'Built-in 1-click WhatsApp messaging & direct order updates',
        competitor: 'Strictly prohibited; penalty of account suspension',
        isFeraAdvantage: true,
        notes: 'Build lasting repeat customer relationships directly over WhatsApp.',
      },
      {
        feature: 'Payment Disbursement & Settlement',
        category: 'Economics & Fees',
        ferasetu: 'Direct bank settlement (Instant UPI or T+1)',
        competitor: 'Bi-weekly or monthly holding cycle (7–15 days)',
        isFeraAdvantage: true,
        notes: 'Funds settle directly to your verified merchant bank account.',
      },
      {
        feature: 'Store Branding & Custom Domain',
        category: 'Storefront & Ops',
        ferasetu: 'Branded standalone storefront (yourshop.com)',
        competitor: 'Generic catalog listing under marketplace logo',
        isFeraAdvantage: true,
        notes: 'Establish brand equity that you own rather than renting attention.',
      },
      {
        feature: 'Listing Protection & Sponsored Clones',
        category: 'Architecture & Speed',
        ferasetu: 'Zero competitor ads or clone placements on your store',
        competitor: 'Competing sponsored listings and in-house clones shown on product pages',
        isFeraAdvantage: true,
        notes: 'Marketplaces routinely promote cheaper competitors on your listing pages.',
      },
      {
        feature: 'Entry Cost & Ongoing Subscriptions',
        category: 'Economics & Fees',
        ferasetu: '₹0 Free plan forever for up to 25 products',
        competitor: 'Fulfillment deposits, storage penalties & advertising fees',
        isFeraAdvantage: true,
        notes: 'No credit card required to start selling independently on FeraSetu.',
      },
    ],
    whySwitchPoints: [
      {
        title: 'Reclaim Your 15%–30% Profit Margins',
        description:
          'When selling on traditional marketplaces, commissions, closing fees, and shipping surcharges consume up to a third of your gross revenue. FeraSetu eliminates all platform tolls, allowing you to price competitively while earning significantly higher net profit.',
        takeaway: 'Keep 100% of what your customers pay you.',
      },
      {
        title: 'Turn One-Time Shoppers Into Lifelong Direct Customers',
        description:
          'On marketplaces, you cannot email, call, or message your buyers—they belong to the platform. FeraSetu provides full visibility into customer phone numbers, order histories, and addresses, enabling authentic WhatsApp loyalty campaigns and repeat sales.',
        takeaway: 'Build genuine customer equity that nobody can take away.',
      },
      {
        title: 'Protect Your Business from Arbitrary Account Bans',
        description:
          'Marketplaces frequently suspend seller accounts or suppress listings without human recourse. With FeraSetu sovereign infrastructure, your store, product catalog, customer list, and custom domain remain 100% under your ownership.',
        takeaway: 'Your business is yours. The internet should be too.',
      },
    ],
    whySwitchReasons: [
      {
        title: 'Reclaim Your 15%–30% Profit Margins',
        description:
          'When selling on traditional marketplaces, commissions, closing fees, and shipping surcharges consume up to a third of your gross revenue. FeraSetu eliminates all platform tolls, allowing you to price competitively while earning significantly higher net profit.',
        takeaway: 'Keep 100% of what your customers pay you.',
      },
      {
        title: 'Turn One-Time Shoppers Into Lifelong Direct Customers',
        description:
          'On marketplaces, you cannot email, call, or message your buyers—they belong to the platform. FeraSetu provides full visibility into customer phone numbers, order histories, and addresses, enabling authentic WhatsApp loyalty campaigns and repeat sales.',
        takeaway: 'Build genuine customer equity that nobody can take away.',
      },
      {
        title: 'Protect Your Business from Arbitrary Account Bans',
        description:
          'Marketplaces frequently suspend seller accounts or suppress listings without human recourse. With FeraSetu sovereign infrastructure, your store, product catalog, customer list, and custom domain remain 100% under your ownership.',
        takeaway: 'Your business is yours. The internet should be too.',
      },
    ],
    migrationSteps: [
      {
        step: 1,
        title: 'Export Your Product Catalog',
        detail: 'Download your product images, descriptions, and SKU details from your existing seller portal.',
      },
      {
        step: 2,
        title: 'Launch Your Sovereign FeraSetu Store',
        detail: 'Register in 2 minutes for ₹0, claim your free handle, and upload your products with variants and pricing.',
      },
      {
        step: 3,
        title: 'Redirect Your Existing Customer Base',
        detail: 'Share your branded store link via WhatsApp, print your counter standee QR code, and invite existing buyers to order directly.',
      },
    ],
    faqs: [
      {
        question: 'Does FeraSetu bring traffic like an online marketplace?',
        answer:
          'No. FeraSetu is commerce infrastructure, not an aggregator marketplace. You bring your own customers via local reputation, WhatsApp, social media, and Google Search, and in exchange, you pay 0% commission and own 100% of the customer relationship.',
      },
      {
        question: 'Can I sell on both marketplaces and FeraSetu at the same time?',
        answer:
          'Yes. Many merchants use marketplaces for initial discovery while directing repeat buyers to their FeraSetu store for 0% commission and higher profit margins.',
      },
      {
        question: 'How do customers pay on my FeraSetu store?',
        answer:
          'Customers pay directly via instant UPI (PhonePe, Google Pay, Paytm, BHIM), debit/credit cards, netbanking, or Cash on Delivery. Funds settle directly into your linked bank account with zero intermediate holding.',
      },
    ],
  },
};

/**
 * Cloudflare Pages Middleware for Edge SEO & Social Preview Pre-rendering.
 * Uses Cloudflare Pages' native HTMLRewriter to rewrite <head> meta tags and
 * JSON-LD structured data at the edge for non-JS crawlers, Googlebot, and social scrapers,
 * while ensuring static assets (sitemap.xml, robots.txt, images) pass untouched with correct MIME types.
 */

interface RouteMeta {
  title: string;
  description: string;
  canonical: string;
  faqs?: { q: string; a: string }[];
}

const BASE_URL = 'https://ferasetu.com';

const ROUTE_REGISTRY: Record<string, RouteMeta> = {
  '/': {
    title: 'FeraSetu — Your business is yours. The internet should be too.',
    description:
      'Run your own branded online store, receive direct customer orders, and keep what you make after payment processing. 0% FeraSetu platform commission.',
    canonical: `${BASE_URL}/`,
  },
  '/pricing': {
    title: 'Pricing — FeraSetu | Honest, Simple Pricing with Permanent Free Entry',
    description:
      'Start your online store for ₹0. Upgrade to Business (₹399/mo) or Pro (₹999/mo) as your catalog grows. Zero commissions, no hidden fees.',
    canonical: `${BASE_URL}/pricing/`,
  },
  '/compare': {
    title: 'Compare E-Commerce Platforms & Alternatives | FeraSetu',
    description:
      'Compare FeraSetu vs Shopify, WooCommerce, BigCommerce, Dukaan & Wix. 0% platform commission, direct settlements, and serverless edge speed.',
    canonical: `${BASE_URL}/compare/`,
  },
  '/compare/shopify-alternative': {
    title: 'Shopify Alternative — 0% Commission Sovereign Commerce | FeraSetu',
    description:
      'Compare FeraSetu vs Shopify. 0% platform commission, direct bank settlement, native WhatsApp cart checkout, and zero 3rd-party transaction penalties.',
    canonical: `${BASE_URL}/compare/shopify-alternative/`,
    faqs: [
      {
        q: 'Does FeraSetu charge transaction commissions like Shopify?',
        a: 'No. FeraSetu has an absolute 0% platform transaction commission policy. While Shopify charges up to 2% when using non-Shopify payment gateways, FeraSetu charges ₹0.',
      },
      {
        q: 'Can I connect my existing custom domain (e.g. mybrand.com)?',
        a: 'Yes. On FeraSetu Business (₹399/mo) and Pro (₹999/mo) plans, you can connect your existing domain with automated Cloudflare SSL.',
      },
    ],
  },
  '/compare/woocommerce-alternative': {
    title: 'WooCommerce Alternative — Zero Server Maintenance & 0% Commission | FeraSetu',
    description:
      'Compare FeraSetu vs WooCommerce. Eliminate server crashes, plugin updates, database bloat, and costly VPS maintenance with managed serverless edge commerce.',
    canonical: `${BASE_URL}/compare/woocommerce-alternative/`,
    faqs: [
      {
        q: 'Why should I switch from WooCommerce to FeraSetu if WooCommerce is free?',
        a: 'While WooCommerce is free software, the real cost of hosting, SSL, caching, security plugins, and developer upkeep often exceeds ₹3,000–₹10,000/month. FeraSetu eliminates all maintenance with managed edge performance.',
      },
    ],
  },
  '/compare/bigcommerce-alternative': {
    title: 'BigCommerce Alternative — Simple, Sovereign 0% Commission | FeraSetu',
    description:
      'Compare FeraSetu vs BigCommerce. Avoid forced annual revenue tier upgrades and complex enterprise bloat with sovereign 0% commission commerce starting at ₹0.',
    canonical: `${BASE_URL}/compare/bigcommerce-alternative/`,
  },
  '/compare/dukaan-alternative': {
    title: 'Dukaan Alternative — Transparent 0% Commission Commerce | FeraSetu',
    description:
      'Compare FeraSetu vs Dukaan. Enjoy 100% data ownership, 0% platform commission, direct bank settlement, and sovereign custom domains with zero hidden fees.',
    canonical: `${BASE_URL}/compare/dukaan-alternative/`,
  },
  '/compare/wix-squarespace-alternative': {
    title: 'Wix & Squarespace Alternative — Modern Commerce Infrastructure | FeraSetu',
    description:
      'Compare FeraSetu vs Wix and Squarespace. Fast mobile edge speed, native WhatsApp ordering, and sovereign commerce infrastructure with 0% platform commission.',
    canonical: `${BASE_URL}/compare/wix-squarespace-alternative/`,
  },
  '/compare/marketplace-alternative': {
    title: 'Online Marketplace Alternative — 0% Commission Direct Commerce | FeraSetu',
    description:
      'Compare FeraSetu vs online marketplaces. Keep 100% customer revenue, own direct buyer contact details, and stop paying 15-30% commissions on every sale.',
    canonical: `${BASE_URL}/compare/marketplace-alternative/`,
    faqs: [
      {
        q: 'Does FeraSetu take commission on orders like Amazon or Flipkart?',
        a: 'No. FeraSetu has an absolute 0% platform transaction commission policy. While marketplaces take 15% to 30%, FeraSetu charges ₹0 commission on all sales.',
      },
      {
        q: 'Do I get access to customer phone numbers and addresses?',
        a: 'Yes. On FeraSetu, customer records are 100% unmasked and owned by the merchant, allowing direct WhatsApp and customer support relationships.',
      },
    ],
  },
  '/docs': {
    title: 'Documentation & Merchant Help Center | FeraSetu',
    description:
      'Official documentation and setup guides for independent merchants. Learn store setup, WhatsApp ordering, 0% commission UPI payments, and custom domains.',
    canonical: `${BASE_URL}/docs/`,
  },
  '/docs/quickstart': {
    title: 'Store Setup in Under 2 Minutes — Documentation | FeraSetu',
    description:
      'Step-by-step walkthrough to register your merchant account, select your free shop domain, add initial stock, and start receiving customer orders.',
    canonical: `${BASE_URL}/docs/quickstart/`,
  },
  '/docs/whatsapp-ordering': {
    title: 'WhatsApp 1-Click Ordering & Checkout — Documentation | FeraSetu',
    description:
      'Turn familiar WhatsApp chats into high-converting storefronts. Learn how the persistent bottom cart bar lets shoppers assemble orders and send to WhatsApp.',
    canonical: `${BASE_URL}/docs/whatsapp-ordering/`,
  },
  '/docs/payments-zero-commission': {
    title: 'Payments & 0% Platform Commission Guarantee — Documentation | FeraSetu',
    description:
      'Keep 100% of your hard-earned revenue. Compare direct UPI routing with gateway card processing and explore the daily bank settlement ledger.',
    canonical: `${BASE_URL}/docs/payments-zero-commission/`,
  },
  '/docs/custom-domains': {
    title: 'Custom Domains & 1-Click DNS Sync — Documentation | FeraSetu',
    description:
      'Connect your own domain name (mystore.com) with automated Cloudflare edge SSL, Domain Connect v2, and sub-60ms global edge routing.',
    canonical: `${BASE_URL}/docs/custom-domains/`,
  },
  '/docs/inventory-locations': {
    title: 'Multi-Location Inventory & SKU Register — Documentation | FeraSetu',
    description:
      'Manage inventory across retail counters, backrooms, and central godowns. Prevent out-of-stock orders, scan EAN barcodes, and transfer stock with AI Sidekick.',
    canonical: `${BASE_URL}/docs/inventory-locations/`,
  },
  '/docs/orders-delivery-otp': {
    title: 'Order Lifecycle, Delivery OTP & GST Invoices — Documentation | FeraSetu',
    description:
      'Secure orders from placement to doorstep handover. Use 4-digit customer delivery OTPs to prevent dispute claims and generate compliant PDF tax invoices.',
    canonical: `${BASE_URL}/docs/orders-delivery-otp/`,
  },
  '/docs/ferasetu-ai-copilot': {
    title: 'FeraSetu AI: Catalog-Grounded Intelligence — Documentation | FeraSetu',
    description:
      'Discover how FeraSetu AI helps merchants. Grounded strictly in your live catalog data with voice recognition and 48 sovereign language localizations.',
    canonical: `${BASE_URL}/docs/ferasetu-ai-copilot/`,
  },
  '/docs/developer-api': {
    title: 'REST API, Webhooks & Thermal Hardware — Documentation | FeraSetu',
    description:
      'Full API documentation for developers and hardware integrators. Query catalogs, ingest orders, register webhooks, and pair 58mm/80mm ESC/POS printers.',
    canonical: `${BASE_URL}/docs/developer-api/`,
  },
  '/docs/sovereign-commerce-answers': {
    title: 'FeraSetu Core Architecture & FAQs — Documentation | FeraSetu',
    description:
      'Authoritative answers to the 12 core questions about FeraSetu: architecture, 0% commission model, customer data sovereignty, order routing, and limitations.',
    canonical: `${BASE_URL}/docs/sovereign-commerce-answers/`,
    faqs: [
      {
        q: 'What is FeraSetu?',
        a: 'FeraSetu (फेरासेतु) is sovereign digital commerce infrastructure for independent retail shopkeepers, grocers, bodegas, boutiques, and artisans with 0% platform commission, direct bank settlement, and native WhatsApp ordering.',
      },
      {
        q: 'How does FeraSetu differ from online marketplaces?',
        a: 'FeraSetu is not a marketplace. Merchants own 100% of their customer data, pay 0% commission, and operate under their own brand and custom domain.',
      },
      {
        q: 'What does 0% platform commission actually mean?',
        a: 'FeraSetu takes ₹0 cut of merchant sales revenue across all tiers. Merchants only pay standard acquiring fees directly to payment gateways like Cashfree, Razorpay, or Stripe, or 0% on direct peer-to-peer UPI.',
      },
    ],
  },
  '/online-dukaan-banaye': {
    title: 'Online Dukaan Kaise Banaye — Step-by-Step Store Setup Guide | FeraSetu',
    description:
      'Apni dukaan ka online website 4 aasan steps me banayein. Subdomain claim karein, products add karein, WhatsApp orders paayein. Free me dukaan online karein.',
    canonical: `${BASE_URL}/online-dukaan-banaye/`,
  },
  '/kirana-store-online': {
    title: 'Kirana Store Online Kaise Banaye — Free Digital Dukaan | FeraSetu',
    description:
      'Apne kirana store ko FeraSetu par online le jayein. 25 products free, WhatsApp cart orders, direct UPI payments, aur 0% platform commission.',
    canonical: `${BASE_URL}/kirana-store-online/`,
  },
  '/free-online-store': {
    title: 'Free Online Store Kaise Banaye — ₹0 Free Plan & Limits | FeraSetu',
    description:
      'FeraSetu par ₹0 me apna online store shuru karein. 25 products, WhatsApp cart checkout, UPI payments, aur 0% commission. No credit card required.',
    canonical: `${BASE_URL}/free-online-store/`,
  },
  '/shopify-alternative-india': {
    title: 'Shopify Alternative India — Factual Comparison & Pricing | FeraSetu',
    description:
      'Compare FeraSetu vs Shopify on ₹0 pricing, 0% sales commission, direct UPI payments, and built-in WhatsApp customer orders in India.',
    canonical: `${BASE_URL}/shopify-alternative-india/`,
  },
  '/terms': {
    title: 'Terms of Service — FeraSetu',
    description:
      'Rights and responsibilities for merchants using FeraSetu software, including storefronts, orders, billing, and data ownership.',
    canonical: `${BASE_URL}/terms/`,
  },
  '/privacy': {
    title: 'Privacy Policy — FeraSetu',
    description:
      'Learn how FeraSetu collects, uses, protects, and manages personal data when you use FeraSetu services with transparency and security.',
    canonical: `${BASE_URL}/privacy/`,
  },
};

const STATIC_EXTENSIONS = new Set([
  'xml',
  'txt',
  'json',
  'webmanifest',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'svg',
  'ico',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'css',
  'js',
  'mjs',
  'map',
]);

interface EventContext {
  request: Request;
  next: () => Promise<Response>;
}

export async function onRequest(context: EventContext): Promise<Response> {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Direct bypass for API routes
  if (pathname.startsWith('/api/')) {
    return context.next();
  }

  // Preserve static asset responses and force correct MIME types for robots.txt & sitemap.xml
  const ext = pathname.split('.').pop()?.toLowerCase();
  if (ext && STATIC_EXTENSIONS.has(ext)) {
    const res = await context.next();
    if (pathname === '/robots.txt') {
      const headers = new Headers(res.headers);
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      return new Response(res.body, { status: res.status, headers });
    }
    if (pathname === '/sitemap.xml') {
      const headers = new Headers(res.headers);
      headers.set('Content-Type', 'application/xml; charset=utf-8');
      return new Response(res.body, { status: res.status, headers });
    }
    return res;
  }

  // Normalize route path by stripping trailing slashes for lookup
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  let meta = ROUTE_REGISTRY[normalizedPath];

  // Dynamic resolution for regional language landing pages (e.g. /kn, /ml, /pa)
  if (!meta) {
    const langMatch = normalizedPath.match(/^\/([a-z]{2,3}(?:-[a-z]+)?)$/);
    if (langMatch) {
      const code = langMatch[1];
      meta = {
        title: `FeraSetu — 0% Commission Sovereign Online Store (${code.toUpperCase()})`,
        description:
          'Run your own branded online store, receive direct customer orders, and keep what you make after payment processing. 0% FeraSetu platform commission.',
        canonical: `${BASE_URL}/${code}/`,
      };
    }
  }

  const response = await context.next();

  // If not an HTML response or route not in registry, return response directly
  const contentType = response.headers.get('content-type') || '';
  if (!meta || !contentType.includes('text/html')) {
    return response;
  }

  // Construct structured data graph
  const globalGraph = [
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'FeraSetu',
      legalName: 'FeraSetu Technologies',
      alternateName: ['Fera Setu', 'FeraSetu Commerce', 'ferasetu.com', 'erasetu'],
      url: `${BASE_URL}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo-official.png`,
        width: 512,
        height: 512,
      },
      description:
        'Sovereign B2B digital commerce infrastructure for independent retailers, grocers, and brands with 0% platform commission.',
      email: 'support@ferasetu.com',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@ferasetu.com',
        availableLanguage: ['en', 'hi'],
        areaServed: 'Global',
      },
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
      foundingDate: '2024',
      sameAs: [
        'https://twitter.com/ferasetu',
        'https://linkedin.com/company/ferasetu',
        'https://github.com/ferasetu',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: `${BASE_URL}/`,
      name: 'FeraSetu',
      alternateName: ['Fera Setu', 'FeraSetu Commerce', 'erasetu'],
      publisher: {
        '@id': `${BASE_URL}/#organization`,
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${BASE_URL}/#software`,
      name: 'FeraSetu',
      alternateName: ['Fera Setu', 'FeraSetu Commerce', 'erasetu'],
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: `${BASE_URL}/`,
      description:
        'Sovereign B2B commerce infrastructure platform enabling independent retailers to operate branded online stores with 0% platform commission, direct payment settlement, unmasked customer relationships, and Cloudflare edge serverless performance.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
        category: 'Free Forever Tier',
      },
    },
  ];

  if (meta.faqs && meta.faqs.length > 0) {
    globalGraph.push({
      '@type': 'FAQPage',
      mainEntity: meta.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a,
        },
      })),
    } as any);
  }

  const structuredDataJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': globalGraph,
  });

  // Execute Edge HTMLRewriter
  const rewriter = new HTMLRewriter()
    .on('title', {
      element(e) {
        e.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', {
      element(e) {
        e.setAttribute('content', meta.description);
      },
    })
    .on('link[rel="canonical"]', {
      element(e) {
        e.setAttribute('href', meta.canonical);
      },
    })
    .on('meta[property="og:title"]', {
      element(e) {
        e.setAttribute('content', meta.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(e) {
        e.setAttribute('content', meta.description);
      },
    })
    .on('meta[property="og:url"]', {
      element(e) {
        e.setAttribute('content', meta.canonical);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(e) {
        e.setAttribute('content', meta.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(e) {
        e.setAttribute('content', meta.description);
      },
    })
    .on('script[type="application/ld+json"]', {
      element(e) {
        e.setInnerContent(structuredDataJson, { html: true });
      },
    });

  const transformedResponse = rewriter.transform(response);
  transformedResponse.headers.set(
    'Cache-Control',
    'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
  );
  return transformedResponse;
}

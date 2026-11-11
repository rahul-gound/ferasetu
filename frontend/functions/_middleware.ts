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
  const meta = ROUTE_REGISTRY[normalizedPath];

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

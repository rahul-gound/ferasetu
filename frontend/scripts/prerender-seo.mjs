import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const i18nDir = path.resolve(__dirname, '../src/i18n');

if (!fs.existsSync(distDir)) {
  console.error('❌ dist directory not found! Run vite build first.');
  process.exit(1);
}

const templatePath = path.join(distDir, 'index.html');
const template = fs.readFileSync(templatePath, 'utf8');

const BASE_URL = 'https://ferasetu.com';

const coreRoutes = [
  {
    path: '/',
    outPath: 'index.html',
    title: 'FeraSetu — Your business is yours. The internet should be too.',
    description: 'Run your own branded online store, receive direct customer orders, and keep what you make after payment processing. 0% FeraSetu platform commission.',
    canonical: `${BASE_URL}/`,
    lang: 'en'
  },
  {
    path: '/pricing',
    outPath: 'pricing/index.html',
    title: 'Pricing — FeraSetu | Honest, Simple Pricing with Permanent Free Entry',
    description: 'Start your online store for ₹0. Upgrade to Business (₹399/mo) or Pro (₹999/mo) as your catalog grows. Zero commissions, no hidden fees.',
    canonical: `${BASE_URL}/pricing/`,
    lang: 'en'
  },
  {
    path: '/free-online-store',
    outPath: 'free-online-store/index.html',
    title: 'Free Online Store Kaise Banaye — ₹0 Free Plan & Limits | FeraSetu',
    description: 'FeraSetu par ₹0 me apna online store shuru karein. 25 products, WhatsApp cart checkout, UPI payments, aur 0% commission. No credit card required.',
    canonical: `${BASE_URL}/free-online-store/`,
    lang: 'en'
  },
  {
    path: '/shopify-alternative-india',
    outPath: 'shopify-alternative-india/index.html',
    title: 'Shopify Alternative India — Factual Comparison & Pricing | FeraSetu',
    description: 'Compare FeraSetu vs Shopify on ₹0 pricing, 0% sales commission, direct UPI payments, and built-in WhatsApp customer orders in India.',
    canonical: `${BASE_URL}/shopify-alternative-india/`,
    lang: 'en'
  },
  {
    path: '/online-dukaan-banaye',
    outPath: 'online-dukaan-banaye/index.html',
    title: 'Online Dukaan Kaise Banaye — Step-by-Step Store Setup Guide | FeraSetu',
    description: 'Apni dukaan ka online website 4 aasan steps me banayein. Subdomain claim karein, products add karein, WhatsApp orders paayein. Free me dukaan online karein.',
    canonical: `${BASE_URL}/online-dukaan-banaye/`,
    lang: 'en'
  },
  {
    path: '/kirana-store-online',
    outPath: 'kirana-store-online/index.html',
    title: 'Kirana Store Online Kaise Banaye — Free Digital Dukaan | FeraSetu',
    description: 'Apne kirana store ko FeraSetu par online le jayein. 25 products free, WhatsApp cart orders, direct UPI payments, aur 0% platform commission.',
    canonical: `${BASE_URL}/kirana-store-online/`,
    lang: 'en'
  },
  {
    path: '/terms',
    outPath: 'terms/index.html',
    title: 'Terms of Service — FeraSetu',
    description: 'Rights and responsibilities for merchants using FeraSetu software, including storefronts, orders, billing, and data ownership.',
    canonical: `${BASE_URL}/terms/`,
    lang: 'en'
  },
  {
    path: '/privacy',
    outPath: 'privacy/index.html',
    title: 'Privacy Policy — FeraSetu',
    description: 'Learn how FeraSetu collects, uses, protects, and manages personal data when you use FeraSetu services with transparency and security.',
    canonical: `${BASE_URL}/privacy/`,
    lang: 'en'
  }
];

// Scan i18n directory for language landing pages
const langFiles = fs.existsSync(i18nDir)
  ? fs.readdirSync(i18nDir).filter(f => f.endsWith('.ts') && !['index.ts', 'config.ts', 'types.ts', 'formatters.ts', 'en.ts'].includes(f))
  : [];

const localizedRoutes = [];

for (const file of langFiles) {
  const code = file.replace('.ts', '');
  const content = fs.readFileSync(path.join(i18nDir, file), 'utf8');
  const titleMatch = content.match(/"seo\.landing\.title":\s*"([^"]+)"/);
  const descMatch = content.match(/"seo\.landing\.desc":\s*"([^"]+)"/);
  if (titleMatch && descMatch) {
    localizedRoutes.push({
      path: `/${code}`,
      outPath: `${code}/index.html`,
      title: titleMatch[1],
      description: descMatch[1],
      canonical: `${BASE_URL}/${code}/`,
      lang: code
    });
  }
}

const allRoutes = [...coreRoutes, ...localizedRoutes];

// Pre-compute language links HTML for crawler navigation
const languageLinksHtml = localizedRoutes.map(r => 
  `<a href="/${r.lang}/" style="color: #64748b; text-decoration: none; padding: 2px 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 11px;">${r.lang.toUpperCase()}</a>`
).join(' ');

// Organization + WebSite JSON-LD Schema
const orgSchemaJson = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://ferasetu.com/#organization",
      "name": "FeraSetu",
      "url": "https://ferasetu.com/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://ferasetu.com/logo-official.png",
        "width": 512,
        "height": 512
      },
      "description": "Independent digital commerce software for local shopkeepers and global retailers. 0% platform commission.",
      "email": "support@ferasetu.com"
    },
    {
      "@type": "WebSite",
      "@id": "https://ferasetu.com/#website",
      "url": "https://ferasetu.com/",
      "name": "FeraSetu",
      "publisher": {
        "@id": "https://ferasetu.com/#organization"
      }
    }
  ]
});

function generateSemanticBody(route) {
  return `
    <div id="root">
      <header style="padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box;">
        <a href="/" style="font-weight: 800; font-size: 20px; color: #0f172a; text-decoration: none; display: flex; align-items: center; gap: 8px;">
          <span>FeraSetu</span>
        </a>
        <nav style="display: flex; gap: 16px; font-size: 14px; font-weight: 600; flex-wrap: wrap;">
          <a href="/pricing/" style="color: #334155; text-decoration: none;">Pricing</a>
          <a href="/free-online-store/" style="color: #334155; text-decoration: none;">Free Online Store</a>
          <a href="/shopify-alternative-india/" style="color: #334155; text-decoration: none;">Shopify Alternative</a>
          <a href="/online-dukaan-banaye/" style="color: #334155; text-decoration: none;">Online Dukaan</a>
          <a href="/kirana-store-online/" style="color: #334155; text-decoration: none;">Kirana Store</a>
        </nav>
      </header>

      <main style="max-width: 960px; margin: 0 auto; padding: 48px 24px; font-family: Inter, system-ui, -apple-system, sans-serif; box-sizing: border-box;">
        <div style="display: inline-block; padding: 4px 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #9a3412; text-transform: uppercase; margin-bottom: 20px;">
          Independent Commerce • 0% Commission
        </div>
        
        <h1 style="font-size: 36px; font-weight: 900; color: #0f172a; margin: 0 0 16px 0; line-height: 1.2; letter-spacing: -0.02em;">
          ${route.title}
        </h1>

        <p style="font-size: 18px; color: #475569; margin: 0 0 28px 0; line-height: 1.6; font-weight: 500;">
          ${route.description}
        </p>

        <section style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; margin-bottom: 36px; font-size: 15px; color: #334155; line-height: 1.75;">
          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
            Direct Digital Storefront &amp; Order Management
          </h2>
          <p style="margin: 0 0 16px 0;">
            FeraSetu provides independent digital commerce infrastructure for retailers, grocers, boutiques, and artisans across 48+ regions. Run your own branded online store, receive direct customer orders via WhatsApp and web cart checkout, accept UPI and card payments directly into your bank account, and keep 100% of your earnings with 0% platform commission.
          </p>
          <p style="margin: 0 0 16px 0;">
            Unlike traditional aggregators and closed marketplace platforms that deduct 15% to 30% from every sale and mask customer contacts, FeraSetu gives you complete data ownership. You receive unmasked customer names, verified phone numbers, and full order histories. With automated GST tax invoice generation, real-time inventory management, and zero technical jargon, you can bring your shop online in under five minutes.
          </p>
          <p style="margin: 0;">
            Get started for ₹0 on the permanent Free plan with up to 25 catalog products, or upgrade to Business (₹399/mo) and Pro (₹999/mo) as your catalog grows. No credit card required to start.
          </p>
        </section>

        <div style="display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 48px;">
          <a href="/register" style="display: inline-flex; align-items: center; justify-content: center; background: #ea580c; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px;">
            Bring My Business Online (₹0)
          </a>
          <a href="/pricing/" style="display: inline-flex; align-items: center; justify-content: center; background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 14px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px;">
            View Pricing Plans
          </a>
        </div>
      </main>

      <footer style="padding: 40px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; font-size: 13px; color: #64748b; font-family: Inter, system-ui, sans-serif;">
        <div style="max-w-[1200px]; margin: 0 auto;">
          <div style="display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 24px; font-weight: 600;">
            <a href="/" style="color: #475569; text-decoration: none;">Home</a>
            <a href="/pricing/" style="color: #475569; text-decoration: none;">Pricing Plans</a>
            <a href="/free-online-store/" style="color: #475569; text-decoration: none;">Free Online Store</a>
            <a href="/shopify-alternative-india/" style="color: #475569; text-decoration: none;">Shopify Alternative India</a>
            <a href="/online-dukaan-banaye/" style="color: #475569; text-decoration: none;">Online Dukaan Banaye</a>
            <a href="/kirana-store-online/" style="color: #475569; text-decoration: none;">Kirana Store Online</a>
            <a href="/terms/" style="color: #475569; text-decoration: none;">Terms of Service</a>
            <a href="/privacy/" style="color: #475569; text-decoration: none;">Privacy Policy</a>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="font-weight: 700; color: #334155; margin-bottom: 8px;">Regional Storefront Editions:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${languageLinksHtml}
            </div>
          </div>

          <p style="margin: 0; color: #94a3b8;">
            © 2026 FeraSetu. Independent digital commerce infrastructure. Zero platform commission.
          </p>
        </div>
      </footer>
    </div>
  `;
}

function renderPage(route) {
  let html = template;

  // Replace <html lang="...">
  html = html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${route.lang}"`);

  // Replace <title>...</title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${route.title}</title>`);

  // Replace <meta name="description" ...>
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${route.description}" />`
  );

  // Replace canonical link
  if (/<link\s+rel="canonical"[^>]*\/?>/i.test(html)) {
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${route.canonical}" />`
    );
  } else {
    html = html.replace('</head>', `    <link rel="canonical" href="${route.canonical}" />\n  </head>`);
  }

  // Replace Open Graph title and desc
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${route.title}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${route.description}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${route.canonical}" />`
  );

  // Replace Twitter title and desc
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${route.title}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${route.description}" />`
  );

  // Inject Schema.org Organization + WebSite if not already present
  if (!html.includes('"@type": "Organization"')) {
    html = html.replace('</head>', `    <script type="application/ld+json">${orgSchemaJson}</script>\n  </head>`);
  }

  // Inject crawlable semantic body inside <div id="root"></div>
  const semanticBody = generateSemanticBody(route);
  html = html.replace('<div id="root"></div>', semanticBody);

  return html;
}

let generatedCount = 0;
for (const route of allRoutes) {
  const destPath = path.join(distDir, route.outPath);
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const rendered = renderPage(route);
  fs.writeFileSync(destPath, rendered, 'utf8');
  generatedCount++;
}

console.log(`✅ SEO Prerender: successfully generated ${generatedCount} static HTML pages with semantic markup, H1 headings, outbound navigation, and Organization schema.`);

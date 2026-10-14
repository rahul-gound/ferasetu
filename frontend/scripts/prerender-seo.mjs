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
    canonical: `${BASE_URL}/pricing`,
    lang: 'en'
  },
  {
    path: '/free-online-store',
    outPath: 'free-online-store/index.html',
    title: 'Free Online Store Kaise Banaye — ₹0 Free Plan & Limits | FeraSetu',
    description: 'FeraSetu par ₹0 me apna online store shuru karein. 25 products, WhatsApp cart checkout, UPI payments, automatic invoices, 0% commission. No credit card required.',
    canonical: `${BASE_URL}/free-online-store`,
    lang: 'en'
  },
  {
    path: '/shopify-alternative-india',
    outPath: 'shopify-alternative-india/index.html',
    title: 'Shopify Alternative India — Factual Comparison & Pricing | FeraSetu',
    description: 'Evaluating Shopify alternatives in India? Compare FeraSetu vs Shopify on pricing (₹0 vs ₹1,999+), 0% commissions, built-in WhatsApp orders, and Indian UPI payments.',
    canonical: `${BASE_URL}/shopify-alternative-india`,
    lang: 'en'
  },
  {
    path: '/online-dukaan-banaye',
    outPath: 'online-dukaan-banaye/index.html',
    title: 'Online Dukaan Kaise Banaye — Step-by-Step Store Setup Guide | FeraSetu',
    description: 'Apni dukaan ka online website 4 aasan steps me banayein. Subdomain claim karein, products add karein, WhatsApp orders paayein. Free me dukaan online karein.',
    canonical: `${BASE_URL}/online-dukaan-banaye`,
    lang: 'en'
  },
  {
    path: '/kirana-store-online',
    outPath: 'kirana-store-online/index.html',
    title: 'Kirana Store Online Kaise Banaye — Free Digital Dukaan | FeraSetu',
    description: 'Apne kirana store ko FeraSetu par online le jayein. 25 products free, WhatsApp cart orders, direct UPI payments, home delivery & pickup options, 0% commission.',
    canonical: `${BASE_URL}/kirana-store-online`,
    lang: 'en'
  },
  {
    path: '/terms',
    outPath: 'terms/index.html',
    title: 'Terms of Service — FeraSetu',
    description: 'The rights and responsibilities of merchants using the FeraSetu online software service, including storefronts, orders, AI features, billing, data ownership, and termination.',
    canonical: `${BASE_URL}/terms`,
    lang: 'en'
  },
  {
    path: '/privacy',
    outPath: 'privacy/index.html',
    title: 'Privacy Policy — FeraSetu',
    description: 'Learn how FeraSetu collects, uses, protects, and manages personal data when you use FeraSetu services with transparency and security.',
    canonical: `${BASE_URL}/privacy`,
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
      canonical: `${BASE_URL}/${code}`,
      lang: code
    });
  }
}

const allRoutes = [...coreRoutes, ...localizedRoutes];

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

console.log(`✅ SEO Prerender: successfully generated ${generatedCount} static HTML pages with unique metadata.`);

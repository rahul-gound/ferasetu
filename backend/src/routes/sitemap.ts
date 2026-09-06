import { Router, Request, Response } from 'express';

const router = Router();

const BASE_URL = 'https://ferasetu.com';

// EU Languages (15)
const EU_LANGUAGES = [
  'fr', 'de', 'es', 'it', 'nl', 'pt', 'pl', 'sv', 'da', 'fi', 'el', 'cs', 'ro', 'hu', 'ga'
];

// Indian Languages (21 non-English)
const IN_LANGUAGES = [
  'hi', 'bn', 'mr', 'gu', 'ta', 'te', 'kn', 'ml', 'pa', 'or', 'as', 'ur', 'ne', 'sa', 'ks', 'gom', 'mai', 'brx', 'doi', 'mni', 'sd'
];

const ALL_LANGUAGES = [...EU_LANGUAGES, ...IN_LANGUAGES];

const PUBLIC_CORE_PAGES = [
  { path: '', priority: '1.0', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
  { path: '/free-online-store', priority: '0.8', changefreq: 'weekly' },
  { path: '/shopify-alternative-india', priority: '0.8', changefreq: 'weekly' },
  { path: '/online-dukaan-banaye', priority: '0.7', changefreq: 'weekly' },
  { path: '/kirana-store-online', priority: '0.7', changefreq: 'weekly' },
  { path: '/terms', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
];

const LANGUAGE_LANDING_PAGES = ALL_LANGUAGES.map(lang => ({
  path: `/${lang}`,
  priority: '0.8',
  changefreq: 'weekly'
}));

const ALL_PAGES = [...PUBLIC_CORE_PAGES, ...LANGUAGE_LANDING_PAGES];

function generateSitemapXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ALL_PAGES.map(page => `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

// Serve real XML sitemap
router.get('/', (_req: Request, res: Response): void => {
  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.status(200).send(generateSitemapXml());
});

export default router;

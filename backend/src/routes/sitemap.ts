import { Router, Request, Response } from 'express';

const router = Router();

const BASE_URL = 'https://ferasetu.com';

const PUBLIC_PAGES = [
  { path: '', priority: '1.0', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
  { path: '/free-online-store', priority: '0.8', changefreq: 'weekly' },
  { path: '/shopify-alternative-india', priority: '0.8', changefreq: 'weekly' },
  { path: '/online-dukaan-banaye', priority: '0.7', changefreq: 'weekly' },
  { path: '/kirana-store-online', priority: '0.7', changefreq: 'weekly' },
  { path: '/terms', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
];

function generateSitemapXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PAGES.map(page => `  <url>
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

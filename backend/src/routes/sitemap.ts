import { Router, Request, Response } from 'express';
import { getDatabase } from '../models/database';

const router = Router();

const BASE_URL = process.env.FRONTEND_URL || 'https://ferasetu.appwrite.network';

router.get('/', (_req: Request, res: Response): void => {
  try {
    const db = getDatabase();

    // Get all published shops
    const shops = db.prepare(`
      SELECT u.subdomain, u.custom_domain, u.business_name, u.name
      FROM users u
      INNER JOIN websites w ON w.user_id = u.id
      WHERE w.is_published = 1
    `).all() as Array<{
      subdomain: string;
      custom_domain: string | null;
      business_name: string;
      name: string;
    }>;

    const shopUrls = shops
      .filter((s) => s.subdomain)
      .map((shop) => {
        const lastModified = new Date().toISOString().split('T')[0];
        return `  <url>
    <loc>${BASE_URL}/shop/${shop.subdomain}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      })
      .join('\n');

    const landingPages = [
      { path: '/online-dukaan-banaye', priority: '0.9' },
      { path: '/free-online-store', priority: '0.9' },
      { path: '/shopify-alternative-india', priority: '0.8' },
      { path: '/kirana-store-online', priority: '0.8' },
    ];

    const landingUrls = landingPages.map((p) => `  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${landingUrls}
  <url>
    <loc>${BASE_URL}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${BASE_URL}/register</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
${shopUrls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).send('<?xml version="1.0"?><error>Sitemap generation failed</error>');
  }
});

export default router;

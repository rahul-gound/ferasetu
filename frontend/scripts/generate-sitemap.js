import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import config directly (can't import TS file easily without ts-node, so we redefine the necessary config here for the build script)
const ENABLED_LANGUAGES = ['en', 'hi', 'mr', 'gu'];
const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/online-dukaan-banaye',
  '/free-online-store',
  '/shopify-alternative-india',
  '/kirana-store-online',
  '/terms',
  '/privacy'
];

const BASE_URL = 'https://fera-search.tech';

function generateSitemap() {
  const urls = [];

  // Generate URL for each public route in each enabled language
  PUBLIC_ROUTES.forEach(route => {
    ENABLED_LANGUAGES.forEach(lang => {
      let loc = '';
      if (lang === 'en') {
        loc = `${BASE_URL}${route === '/' ? '' : route}`;
      } else {
        loc = `${BASE_URL}/${lang}${route === '/' ? '' : route}`;
      }
      
      urls.push(`
  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`);
    });
  });

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapContent);
  console.log(`Generated sitemap.xml with ${urls.length} URLs`);
}

generateSitemap();

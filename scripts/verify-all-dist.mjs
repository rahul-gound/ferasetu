import fs from 'node:fs';
import path from 'node:path';

const sitemap = fs.readFileSync('frontend/public/sitemap.xml', 'utf8');
const locs = (sitemap.match(/<loc>[^<]+<\/loc>/g) || []).map(l => l.replace(/<\/?loc>/g, ''));
console.log('Total URLs in sitemap:', locs.length);

let errors = 0;
for (const loc of locs) {
  const url = new URL(loc);
  const p = url.pathname === '/' ? 'index.html' : path.join(url.pathname.replace(/^\/|\/$/g, ''), 'index.html');
  const full = path.join('frontend/dist', p);
  if (!fs.existsSync(full)) {
    console.error('MISSING:', full);
    errors++;
  } else {
    const html = fs.readFileSync(full, 'utf8');
    const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (canon !== loc) {
      console.error('CANONICAL MISMATCH:', loc, 'vs found', canon);
      errors++;
    }
  }
}
console.log(`Verification complete: ${locs.length} URLs, ${errors} errors.`);

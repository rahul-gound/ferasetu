import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

test('sitemap.xml has valid format, canonical trailing slashes, and no redirecting directory URLs', () => {
  const sitemapPath = path.join(frontendDir, 'public/sitemap.xml');
  assert.ok(fs.existsSync(sitemapPath), 'sitemap.xml must exist');

  const content = fs.readFileSync(sitemapPath, 'utf8');
  assert.match(content, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);

  // Extract all <loc>...</loc>
  const locMatches = [...content.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  assert.ok(locMatches.length >= 30, `Expected at least 30 URLs, found ${locMatches.length}`);

  for (const url of locMatches) {
    assert.ok(url.startsWith('https://ferasetu.com/'), `URL must start with https://ferasetu.com/: ${url}`);
    // Non-root paths must end with a trailing slash to prevent Cloudflare Pages 308 redirect
    if (url !== 'https://ferasetu.com/') {
      assert.ok(url.endsWith('/'), `Directory URL must end with trailing slash: ${url}`);
    }
  }

  // Core expected pages
  assert.ok(locMatches.includes('https://ferasetu.com/pricing/'));
  assert.ok(locMatches.includes('https://ferasetu.com/free-online-store/'));
  assert.ok(locMatches.includes('https://ferasetu.com/shopify-alternative-india/'));
  assert.ok(locMatches.includes('https://ferasetu.com/terms/'));
  assert.ok(locMatches.includes('https://ferasetu.com/privacy/'));
});

test('robots.txt has consistent policies for search, AI search engines, and AI scrapers', () => {
  const robotsPath = path.join(frontendDir, 'public/robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'robots.txt must exist');

  const content = fs.readFileSync(robotsPath, 'utf8');

  // Verify search engines and AI search bots
  assert.match(content, /User-agent: \*/);
  assert.match(content, /User-agent: OAI-SearchBot/);
  assert.match(content, /User-agent: PerplexityBot/);
  assert.match(content, /User-agent: GPTBot/);
  assert.match(content, /User-agent: ClaudeBot/);
  assert.match(content, /Disallow: \/dashboard/);
  assert.match(content, /Disallow: \/admin/);
  assert.match(content, /Sitemap: https:\/\/ferasetu\.com\/sitemap\.xml/);
});

test('index.html contains Schema.org Organization and WebSite JSON-LD and clean canonical', () => {
  const indexPath = path.join(frontendDir, 'index.html');
  const content = fs.readFileSync(indexPath, 'utf8');

  assert.match(content, /<link rel="canonical" href="https:\/\/ferasetu\.com\/" \/>/);
  assert.match(content, /"@type":\s*"Organization"/);
  assert.match(content, /"@type":\s*"WebSite"/);
  assert.match(content, /"name":\s*"FeraSetu"/);
  assert.match(content, /"url":\s*"https:\/\/ferasetu\.com\/"/);
});

test('prerender-seo.mjs generates semantic body with H1, internal links, and length-compliant descriptions', () => {
  const scriptPath = path.join(frontendDir, 'scripts/prerender-seo.mjs');
  const content = fs.readFileSync(scriptPath, 'utf8');

  // Verify H1 heading generation
  assert.match(content, /<h1[\s\S]*?>\s*\$\{route\.title\}\s*<\/h1>/);

  // Verify internal navigation links
  assert.match(content, /href="\/pricing\/"/);
  assert.match(content, /href="\/free-online-store\/"/);
  assert.match(content, /href="\/terms\/"/);
  assert.match(content, /href="\/privacy\/"/);

  // Verify Schema.org injection
  assert.match(content, /"@type":\s*"Organization"/);

  // Verify all core route descriptions are within 100-160 character boundary
  const descMatches = [...content.matchAll(/description:\s*['"`](.*?)['"`]/g)].map(m => m[1]);
  assert.ok(descMatches.length >= 8);
  for (const desc of descMatches) {
    assert.ok(
      desc.length >= 100 && desc.length <= 160,
      `Core description length ${desc.length} outside bounds (100-160): "${desc}"`
    );
  }
});

test('Public page components have descriptions within 100-160 characters (no too-short or too-long)', () => {
  const pagesDir = path.join(frontendDir, 'src/pages');
  const targets = [
    { file: 'FreeOnlineStore.tsx', min: 100, max: 160 },
    { file: 'ShopifyAlternativeIndia.tsx', min: 100, max: 160 },
    { file: 'TermsPage.tsx', min: 100, max: 160 },
    { file: 'LoginPage.tsx', min: 100, max: 160 },
    { file: 'RegisterPage.tsx', min: 100, max: 160 },
  ];

  for (const target of targets) {
    const filePath = path.join(pagesDir, target.file);
    const content = fs.readFileSync(filePath, 'utf8');
    const descMatch = content.match(/description=\{?['"`](.*?)['"`]\}?/);
    assert.ok(descMatch, `Description not found in ${target.file}`);
    const desc = descMatch[1];
    assert.ok(
      desc.length >= target.min && desc.length <= target.max,
      `${target.file} description length ${desc.length} outside bounds (${target.min}-${target.max}): "${desc}"`
    );
  }
});

test('Cloudflare Pages _middleware.ts sets href on canonical link and includes complete Organization schema', () => {
  const middlewarePath = path.join(frontendDir, 'functions/_middleware.ts');
  const content = fs.readFileSync(middlewarePath, 'utf8');

  // Verify href is used for link[rel="canonical"]
  assert.match(content, /e\.setAttribute\('href',\s*meta\.canonical\)/);
  assert.match(content, /\.on\('link\[rel="canonical"\]'[\s\S]*?e\.setAttribute\('href',\s*meta\.canonical\)/);

  // Verify complete Organization schema
  assert.match(content, /contactPoint/);
  assert.match(content, /PostalAddress/);
  assert.match(content, /addressCountry/);

  // Verify Edge Cache-Control header
  assert.match(content, /Cache-Control/);
});

test('All i18n landing page descriptions meet minimum length (>= 100 characters)', () => {
  const i18nDir = path.join(frontendDir, 'src/i18n');
  const files = fs.readdirSync(i18nDir).filter(f => f.endsWith('.ts'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(i18nDir, file), 'utf8');
    const descMatch = content.match(/"seo\.landing\.desc":\s*"([^"]+)"/);
    if (descMatch) {
      const desc = descMatch[1];
      assert.ok(
        desc.length >= 100,
        `i18n ${file} description length ${desc.length} is too short (< 100): "${desc}"`
      );
    }
  }
});

test('PublicFooter.tsx contains incoming links for guides, comparisons, and regional storefront editions', () => {
  const footerPath = path.join(frontendDir, 'src/components/public/PublicFooter.tsx');
  const content = fs.readFileSync(footerPath, 'utf8');

  // Verify guide links
  assert.match(content, /\/free-online-store/);
  assert.match(content, /\/shopify-alternative-india/);
  assert.match(content, /\/online-dukaan-banaye/);
  assert.match(content, /\/kirana-store-online/);

  // Verify regional editions bar
  assert.match(content, /Storefront Editions:/);
  assert.match(content, /lang\.code/);
});

test('IndexNow key file exists and matches 32-character hexadecimal format', () => {
  const keyPath = path.join(frontendDir, 'public/c96b8e39f72b4c10a184e9d1bf7b9a2d.txt');
  assert.ok(fs.existsSync(keyPath), 'IndexNow key file must exist in public directory');
  const key = fs.readFileSync(keyPath, 'utf8').trim();
  assert.equal(key, 'c96b8e39f72b4c10a184e9d1bf7b9a2d');
});

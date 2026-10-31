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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');

const KEY = 'c96b8e39f72b4c10a184e9d1bf7b9a2d';
const HOST = 'ferasetu.com';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

if (!fs.existsSync(sitemapPath)) {
  console.error('sitemap.xml not found!');
  process.exit(1);
}

const content = fs.readFileSync(sitemapPath, 'utf8');
const urlMatches = [...content.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

console.log(`Found ${urlMatches.length} URLs to submit to IndexNow...`);

async function submitToIndexNow() {
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlMatches
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 200 || res.status === 202) {
      console.log(`✅ IndexNow successfully submitted ${urlMatches.length} URLs (HTTP ${res.status}).`);
    } else {
      console.log(`ℹ️ IndexNow responded with HTTP ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error('⚠️ IndexNow submission warning:', err.message);
  }
}

submitToIndexNow();

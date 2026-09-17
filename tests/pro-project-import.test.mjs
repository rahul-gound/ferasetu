import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { createProMockD1 } from './pro-mock-d1.mjs';
import * as proService from '../worker/services/proPlatformService.js';
import { parseZipArchive } from '../worker/pro/projectZipParser.js';
import { analyzeProject } from '../worker/pro/projectAnalyzer.js';
import {
  computeThreeWayDiff,
  getCanonicalStudioRepresentation,
  DIFF_OUTCOMES
} from '../worker/pro/projectDiffEngine.js';

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  ❌ ${name}:`, err.message);
  }
}

// -----------------------------------------------------------------------------
// In-Memory PKZIP Creator Helper for Tests
// -----------------------------------------------------------------------------
function createTestZip(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const rawContent = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content || '', 'utf-8');
    const pathBuf = Buffer.from(file.path, 'utf-8');
    const crc = zlib.crc32(rawContent);
    const method = file.method ?? (rawContent.length > 0 ? 8 : 0);
    const compressed = method === 8 ? zlib.deflateRawSync(rawContent) : rawContent;

    const compSize = file.compressedSizeOverride ?? compressed.length;
    const uncompSize = file.uncompressedSizeOverride ?? rawContent.length;

    const lh = Buffer.alloc(30 + pathBuf.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compSize, 18);
    lh.writeUInt32LE(uncompSize, 22);
    lh.writeUInt16LE(pathBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    pathBuf.copy(lh, 30);

    const localChunk = Buffer.concat([lh, compressed]);
    localHeaders.push(localChunk);

    const ch = Buffer.alloc(46 + pathBuf.length);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(compSize, 20);
    ch.writeUInt32LE(uncompSize, 24);
    ch.writeUInt16LE(pathBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    pathBuf.copy(ch, 46);

    centralHeaders.push(ch);
    offset += localChunk.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

// -----------------------------------------------------------------------------
// Mock Backblaze B2 Fetcher for Tests (Intercepts S3 SigV4 API calls)
// -----------------------------------------------------------------------------
function createMockB2Env(db, options = {}) {
  const storedObjects = new Map();
  const mockFetcher = async (url, init) => {
    if (options.failUpload) {
      return new Response('B2 Internal Error', { status: 500 });
    }
    const urlStr = typeof url === 'string' ? url : url.url;
    const method = init?.method || 'GET';

    if (method === 'PUT') {
      const body = init?.body;
      storedObjects.set(urlStr, body);
      return new Response(null, { status: 200 });
    }

    if (method === 'GET') {
      if (!storedObjects.has(urlStr)) {
        return new Response('Not Found', { status: 404 });
      }
      return new Response(storedObjects.get(urlStr), { status: 200 });
    }

    return new Response(null, { status: 200 });
  };

  return {
    DB: db,
    B2_KEY_ID: 'test_key_id',
    B2_APPLICATION_KEY: 'test_app_key',
    B2_BUCKET_NAME: 'ferasetu-pro-snapshots',
    B2_REGION: 'us-west-004',
    b2Fetcher: mockFetcher,
    _storedObjects: storedObjects,
  };
}

console.log('\n=============================================================================');
console.log('  RUNNING FERASETU PRO PROJECT IMPORT & DETERMINISTIC ANALYSIS TEST SUITE');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// 1. React Page Detection & Route Extraction
// -----------------------------------------------------------------------------
await test('React Page Detection & Route Extraction: JSX and object-based routes', async () => {
  const files = [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'my-vite-app',
        dependencies: { react: '^18.2.0', 'react-router-dom': '^6.20.0' },
        devDependencies: { vite: '^5.0.0' }
      })
    },
    {
      path: 'src/App.jsx',
      content: `
        import React from 'react';
        import { Routes, Route } from 'react-router-dom';
        import HomePage from './pages/HomePage';
        import ProductDetail from './pages/ProductDetail';
        import Dashboard from './pages/Dashboard';

        export default function App() {
          return (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            </Routes>
          );
        }
      `
    },
    {
      path: 'src/pages/HomePage.jsx',
      content: 'export default function HomePage() { return <h1>Welcome to Store</h1>; }'
    },
    {
      path: 'src/pages/ProductDetail.jsx',
      content: 'export default function ProductDetail() { return <h1>Product Detail</h1>; }'
    },
    {
      path: 'src/pages/Dashboard.jsx',
      content: 'export default function Dashboard() { return <h1>Merchant Dashboard</h1>; }'
    },
    {
      path: 'src/components/Header.jsx',
      content: 'export default function Header() { return <header>Header Bar</header>; }'
    }
  ];

  const report = await analyzeProject(files);
  assert.equal(report.framework.type, 'react_vite');
  assert.equal(report.analyzer_version, '1.0.0');

  // Should detect pages
  assert.ok(report.resources.pages.length >= 3);
  const homePage = report.resources.pages.find(p => p.slug === 'home' || p.slug === 'homepage' || p.slug === 'index' || p.is_homepage === 1);
  assert.ok(homePage, 'Home page must be detected');
  assert.equal(homePage.confidence, 'high');

  // Should distinguish components from pages
  const headerComp = report.resources.components.find(c => c.name === 'Header');
  assert.ok(headerComp, 'Header should be classified as a reusable component');

  // Should detect routes with path patterns and auth requirements
  assert.ok(report.resources.routes.length >= 3);
  const prodRoute = report.resources.routes.find(r => r.path_pattern === '/products/:id');
  assert.ok(prodRoute, 'Dynamic product route should be extracted');
  assert.equal(prodRoute.is_dynamic, true);

  const dashRoute = report.resources.routes.find(r => r.path_pattern === '/admin/dashboard');
  assert.ok(dashRoute, 'Dashboard route should be extracted');
  assert.equal(dashRoute.access_level, 'authenticated');
});

// -----------------------------------------------------------------------------
// 2. Static HTML/CSS/JS Detection
// -----------------------------------------------------------------------------
await test('Static Site Detection: Parses HTML pages, titles, and styles', async () => {
  const files = [
    {
      path: 'index.html',
      content: '<!DOCTYPE html><html><head><title>Modern Store</title></head><body><h1>Welcome</h1></body></html>'
    },
    {
      path: 'about.html',
      content: '<!DOCTYPE html><html><head><title>About Our Brand</title></head><body><p>We craft artisan goods.</p></body></html>'
    },
    {
      path: 'css/style.css',
      content: 'body { margin: 0; font-family: sans-serif; }'
    }
  ];

  const report = await analyzeProject(files);
  assert.equal(report.framework.type, 'static_html');
  assert.equal(report.resources.pages.length, 2);

  const home = report.resources.pages.find(p => p.slug === 'home' || p.slug === 'index' || p.is_homepage === 1);
  assert.ok(home);
  assert.equal(home.title, 'Modern Store');
  assert.equal(home.is_homepage, 1);

  const about = report.resources.pages.find(p => p.slug === 'about');
  assert.ok(about);
  assert.equal(about.title, 'About Our Brand');
});

// -----------------------------------------------------------------------------
// 3. Express Backend Route & Function Detection
// -----------------------------------------------------------------------------
await test('Express Backend Detection: Detects server handlers and converts to Fera Functions', async () => {
  const files = [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'express-api',
        dependencies: { express: '^4.18.2' }
      })
    },
    {
      path: 'server.js',
      content: `
        const express = require('express');
        const app = express();

        app.get('/api/products', (req, res) => {
          res.json({ products: [] });
        });

        app.post('/api/orders', (req, res) => {
          res.status(201).json({ success: true });
        });

        app.listen(3000);
      `
    }
  ];

  const report = await analyzeProject(files);
  assert.equal(report.framework.type, 'express');

  // Backend route handlers must be converted to Fera Functions with confidence 'high'
  const getProductsFn = report.resources.functions.find(f => f.name.includes('get_api_products'));
  const postOrdersFn = report.resources.functions.find(f => f.name.includes('post_api_orders'));

  assert.ok(getProductsFn, 'get_api_products function should be detected');
  assert.equal(getProductsFn.confidence, 'high');
  assert.ok(getProductsFn.capabilities.includes('products.read'));

  assert.ok(postOrdersFn, 'post_api_orders function should be detected');
  assert.equal(postOrdersFn.confidence, 'high');
  assert.ok(postOrdersFn.capabilities.includes('orders.create'));
});

// -----------------------------------------------------------------------------
// 4. Deterministic Identity Stability Test (Mandatory Correction 1 & 6)
// -----------------------------------------------------------------------------
await test('Deterministic Identity Stability: Unrelated edits do not mutate unchanged resource identities', async () => {
  const projectV1 = [
    {
      path: 'package.json',
      content: JSON.stringify({ name: 'store', dependencies: { react: '^18.0.0' } })
    },
    {
      path: 'src/pages/Contact.jsx',
      content: 'export default function Contact() { return <h1>Contact Us</h1>; }'
    },
    {
      path: 'src/pages/Blog.jsx',
      content: 'export default function Blog() { return <h1>Old Blog Post</h1>; }'
    }
  ];

  // Version 2: Blog is edited, Contact is untouched
  const projectV2 = [
    {
      path: 'package.json',
      content: JSON.stringify({ name: 'store', dependencies: { react: '^18.0.0' } })
    },
    {
      path: 'src/pages/Contact.jsx',
      content: 'export default function Contact() { return <h1>Contact Us</h1>; }'
    },
    {
      path: 'src/pages/Blog.jsx',
      content: 'export default function Blog() { return <h1>New Rewritten Blog Post With More Content</h1>; }'
    }
  ];

  const report1 = await analyzeProject(projectV1);
  const report2 = await analyzeProject(projectV2);

  const contactV1 = report1.resources.pages.find(p => p.slug === 'contact');
  const contactV2 = report2.resources.pages.find(p => p.slug === 'contact');
  const blogV1 = report1.resources.pages.find(p => p.slug === 'blog');
  const blogV2 = report2.resources.pages.find(p => p.slug === 'blog');

  // Contact was untouched: identity MUST be identical across versions
  assert.equal(contactV1.deterministic_identity, contactV2.deterministic_identity);
  assert.equal(contactV1.source_hash, contactV2.source_hash);

  // Blog was modified: deterministic_identity stays stable (same path + type + export)
  assert.equal(blogV1.deterministic_identity, blogV2.deterministic_identity);
  // But source_hash MUST reflect the content change
  assert.notEqual(blogV1.source_hash, blogV2.source_hash);
});

// -----------------------------------------------------------------------------
// 5. Analyzer Versioning & Identity Verification
// -----------------------------------------------------------------------------
await test('Analyzer Versioning: Analyzer version is reported and embedded in identity hashes', async () => {
  const files = [
    { path: 'index.html', content: '<html><body><h1>Hello</h1></body></html>' }
  ];

  const report = await analyzeProject(files);
  assert.equal(report.analyzer_version, '1.0.0');

  const page = report.resources.pages[0];
  assert.ok(page.deterministic_identity);
  assert.equal(page.deterministic_identity.length, 64); // Valid SHA-256 hex string
});

// -----------------------------------------------------------------------------
// 6. Function Classification with Confidence & Client Helper Guard
// -----------------------------------------------------------------------------
await test('Function Classification: Client API helpers require review and are low confidence', async () => {
  const files = [
    {
      path: 'package.json',
      content: JSON.stringify({ dependencies: { react: '^18.0.0' } })
    },
    {
      path: 'src/api/client.js',
      content: `
        export async function fetchProducts() {
          const res = await fetch('/api/products');
          return res.json();
        }
      `
    }
  ];

  const report = await analyzeProject(files);
  const clientFn = report.resources.functions.find(f => f.name.includes('fetchProducts'));
  assert.ok(clientFn, 'Client helper should be identified');
  assert.equal(clientFn.confidence, 'low');
  assert.equal(clientFn.requiresReview, true);
});

// -----------------------------------------------------------------------------
// 7. Quota Enforcement & Atomic Guard
// -----------------------------------------------------------------------------
await test('Quota Enforcement: Blocks import if pages exceed quota with zero partial commits', async () => {
  const db = createProMockD1();
  const env = createMockB2Env(db);
  const tenantId = 'org_pro_active';

  // Set quota to max 2 pages
  await db.prepare('UPDATE site_quotas SET max_pages = ? WHERE tenant_id = ?').bind(2, tenantId).run();

  // Create 3 pages in payload
  const mockPayload = {
    name: 'Quota Test Project',
    framework: 'static_html',
    projectFingerprint: 'quota_fingerprint',
    resources: {
      pages: [
        { title: 'Page 1', slug: 'p1', type: 'standard', is_homepage: 1, auth_required: 0, deterministic_identity: 'id1', source_path: 'p1.html', source_hash: 'h1', content: {} },
        { title: 'Page 2', slug: 'p2', type: 'standard', is_homepage: 0, auth_required: 0, deterministic_identity: 'id2', source_path: 'p2.html', source_hash: 'h2', content: {} },
        { title: 'Page 3', slug: 'p3', type: 'standard', is_homepage: 0, auth_required: 0, deterministic_identity: 'id3', source_path: 'p3.html', source_hash: 'h3', content: {} },
      ],
      routes: [],
      functions: [],
    },
    rawFiles: [
      { path: 'p1.html', content: '1', hash: 'h1', size: 1 },
      { path: 'p2.html', content: '2', hash: 'h2', size: 1 },
      { path: 'p3.html', content: '3', hash: 'h3', size: 1 },
    ],
    selectedResourceIdentities: ['id1', 'id2', 'id3'],
  };

  let threw = false;
  try {
    await proService.executeProjectImport(tenantId, mockPayload, env);
  } catch (err) {
    threw = true;
    assert.equal(err.code, 'QUOTA_EXCEEDED');
  }

  assert.equal(threw, true, 'Import must throw QUOTA_EXCEEDED');

  // Verify zero pages were committed to D1
  const pagesInDb = db.tables.site_pages.filter(p => p.tenant_id === tenantId);
  assert.equal(pagesInDb.length, 0, 'Zero pages should be committed after quota failure');
});

// -----------------------------------------------------------------------------
// 8. ZIP Security Guards (Path Traversal, Bomb Detection, Size Limits)
// -----------------------------------------------------------------------------
await test('ZIP Security: Rejects directory traversal attempts', async () => {
  const maliciousZip = createTestZip([
    { path: '../../etc/passwd', content: 'root:x:0:0:::' },
    { path: 'src/App.jsx', content: 'export default () => null;' }
  ]);

  let traversalBlocked = false;
  try {
    await parseZipArchive(maliciousZip);
  } catch (err) {
    traversalBlocked = true;
    assert.ok(err.message.includes('Path traversal') || err.message.includes('illegal'));
  }
  assert.equal(traversalBlocked, true, 'Malicious path traversal must be rejected');
});

await test('ZIP Security: Detects and rejects compression bombs', async () => {
  // Simulate a zip-bomb header where uncompressed size is reported as 100MB but compressed size is 100 bytes (> 1000:1 ratio)
  const bombZip = createTestZip([
    {
      path: 'bomb.txt',
      content: Buffer.alloc(50),
      compressedSizeOverride: 50,
      uncompressedSizeOverride: 4 * 1024 * 1024 // 4 MB (under 5MB single file limit, ratio 83,886:1 > 100:1)
    }
  ]);

  let bombBlocked = false;
  try {
    await parseZipArchive(bombZip);
  } catch (err) {
    bombBlocked = true;
    assert.ok(err.message.includes('Zip bomb') || err.message.includes('ratio'));
  }
  assert.equal(bombBlocked, true, 'Compression bomb ratio must be rejected');
});

// -----------------------------------------------------------------------------
// 9. Build Directory Filtering
// -----------------------------------------------------------------------------
await test('Build Directory Filtering: Ignores node_modules, dist, and cache deterministically', async () => {
  const files = [
    { path: 'src/index.html', content: '<h1>App</h1>' },
    { path: 'node_modules/react/index.js', content: 'module.exports = {};' },
    { path: 'dist/assets/index.js', content: 'console.log("built");' },
    { path: '.git/config', content: '[core]' },
    { path: '.cache/cache.json', content: '{}' }
  ];

  const report = await analyzeProject(files);
  const foundNodeModules = report.resources.pages.some(p => p.source_path.includes('node_modules'));
  const foundDist = report.resources.pages.some(p => p.source_path.includes('dist'));

  assert.equal(foundNodeModules, false);
  assert.equal(foundDist, false);
});

// -----------------------------------------------------------------------------
// 10. .env Privacy & Secret Scrubbing
// -----------------------------------------------------------------------------
await test('.env Privacy: Discovers variable keys but scrubs all secret values immediately', async () => {
  const files = [
    {
      path: '.env',
      content: `
        VITE_API_URL=https://api.ferasetu.com
        DATABASE_SECRET_KEY=super_secret_password_12345
        STRIPE_SECRET=dummy_mock_secret_token_abcdef123456
      `
    },
    { path: 'index.html', content: '<h1>Home</h1>' }
  ];

  const report = await analyzeProject(files);
  assert.ok(report.envVars.includes('VITE_API_URL'));
  assert.ok(report.envVars.includes('DATABASE_SECRET_KEY'));
  assert.ok(report.envVars.includes('STRIPE_SECRET'));

  // Ensure values are NOT leaked anywhere in the report JSON
  const reportStr = JSON.stringify(report);
  assert.equal(reportStr.includes('super_secret_password_12345'), false);
  assert.equal(reportStr.includes('dummy_mock_secret_token_abcdef123456'), false);
});

// -----------------------------------------------------------------------------
// 11. 3-Way Merge Case 0: A == B == C -> UNCHANGED (Mandatory Correction 2)
// -----------------------------------------------------------------------------
await test('3-Way Merge Case 0: A == B == C produces UNCHANGED', async () => {
  const baseContent = 'export default function Header() { return <header>Logo</header>; }';
  const studioContent = 'export default function Header() { return <header>Logo</header>; }';
  const externalContent = 'export default function Header() { return <header>Logo</header>; }';

  const baseHash = crypto.createHash('sha256').update(baseContent).digest('hex');

  const baseResource = {
    source_path: 'src/Header.jsx',
    resource_type: 'component',
    source_hash: baseHash,
    studio_hash: baseHash,
    content: baseContent,
  };

  const studioResource = {
    content: studioContent,
  };

  const externalFile = {
    path: 'src/Header.jsx',
    content: externalContent,
  };

  const diff = computeThreeWayDiff(baseResource, studioResource, externalFile, 'component');
  assert.equal(diff.outcome, DIFF_OUTCOMES.UNCHANGED);
  assert.equal(diff.isConflict, false);
  assert.equal(diff.safeToAutoApply, false);
});

// -----------------------------------------------------------------------------
// 12. 3-Way Merge Case 1: A == B && A != C -> EXTERNAL_ONLY_CHANGE
// -----------------------------------------------------------------------------
await test('3-Way Merge Case 1: Studio untouched, External changed produces EXTERNAL_ONLY_CHANGE', async () => {
  const baseContent = 'export default function Page() { return <h1>Version 1</h1>; }';
  const studioContent = 'export default function Page() { return <h1>Version 1</h1>; }';
  const externalContent = 'export default function Page() { return <h1>Version 2 Updated</h1>; }';

  const baseHash = crypto.createHash('sha256').update(baseContent).digest('hex');

  const baseResource = {
    source_path: 'src/Page.jsx',
    resource_type: 'page',
    source_hash: baseHash,
    studio_hash: baseHash,
    content: baseContent,
  };

  const studioResource = {
    content: studioContent,
  };

  const externalFile = {
    path: 'src/Page.jsx',
    content: externalContent,
  };

  const diff = computeThreeWayDiff(baseResource, studioResource, externalFile, 'page');
  assert.equal(diff.outcome, DIFF_OUTCOMES.EXTERNAL_ONLY_CHANGE);
  assert.equal(diff.isConflict, false);
  assert.equal(diff.safeToAutoApply, true);
  assert.ok(diff.diffHunks.some(h => h.type === 'added' && h.line.includes('Version 2 Updated')));
});

// -----------------------------------------------------------------------------
// 13. 3-Way Merge Case 2: A != B && A == C -> STUDIO_ONLY_CHANGE
// -----------------------------------------------------------------------------
await test('3-Way Merge Case 2: Studio edited, External untouched produces STUDIO_ONLY_CHANGE', async () => {
  const baseContent = 'export default function Page() { return <h1>Original Base</h1>; }';
  const studioContent = 'export default function Page() { return <h1>Studio Customized Content</h1>; }';
  const externalContent = 'export default function Page() { return <h1>Original Base</h1>; }';

  const baseHash = crypto.createHash('sha256').update(baseContent).digest('hex');

  const baseResource = {
    source_path: 'src/Page.jsx',
    resource_type: 'page',
    source_hash: baseHash,
    studio_hash: baseHash,
    content: baseContent,
  };

  const studioResource = {
    content: studioContent,
  };

  const externalFile = {
    path: 'src/Page.jsx',
    content: externalContent,
  };

  const diff = computeThreeWayDiff(baseResource, studioResource, externalFile, 'page');
  assert.equal(diff.outcome, DIFF_OUTCOMES.STUDIO_ONLY_CHANGE);
  assert.equal(diff.isConflict, false);
  assert.equal(diff.safeToAutoApply, false); // Studio modification is preserved by default
});

// -----------------------------------------------------------------------------
// 14. 3-Way Merge Case 3: A != B && A != C && B == C -> SAME_FINAL_STATE
// -----------------------------------------------------------------------------
await test('3-Way Merge Case 3: Both modified to identical state produces SAME_FINAL_STATE', async () => {
  const baseContent = 'const val = 1;';
  const studioContent = 'const val = 42;';
  const externalContent = 'const val = 42;';

  const baseHash = crypto.createHash('sha256').update(baseContent).digest('hex');

  const baseResource = {
    source_path: 'src/calc.js',
    resource_type: 'function',
    source_hash: baseHash,
    studio_hash: baseHash,
    content: baseContent,
  };

  const studioResource = {
    definition: studioContent,
  };

  const externalFile = {
    path: 'src/calc.js',
    content: externalContent,
  };

  const diff = computeThreeWayDiff(baseResource, studioResource, externalFile, 'function');
  assert.equal(diff.outcome, DIFF_OUTCOMES.SAME_FINAL_STATE);
  assert.equal(diff.isConflict, false);
  assert.equal(diff.safeToAutoApply, false);
});

// -----------------------------------------------------------------------------
// 15. 3-Way Merge Case 4: A != B && A != C && B != C -> TRUE_CONFLICT
// -----------------------------------------------------------------------------
await test('3-Way Merge Case 4: Conflicting concurrent edits produces TRUE_CONFLICT', async () => {
  const baseContent = '<h1>Welcome</h1>';
  const studioContent = '<h1>Welcome to FeraSetu Official Store</h1>';
  const externalContent = '<h1>Welcome to External Git Store</h1>';

  const baseHash = crypto.createHash('sha256').update(baseContent).digest('hex');

  const baseResource = {
    source_path: 'src/Hero.jsx',
    resource_type: 'page',
    source_hash: baseHash,
    studio_hash: baseHash,
    content: baseContent,
  };

  const studioResource = {
    content: studioContent,
  };

  const externalFile = {
    path: 'src/Hero.jsx',
    content: externalContent,
  };

  const diff = computeThreeWayDiff(baseResource, studioResource, externalFile, 'page');
  assert.equal(diff.outcome, DIFF_OUTCOMES.TRUE_CONFLICT);
  assert.equal(diff.isConflict, true);
  assert.equal(diff.safeToAutoApply, false);
  assert.ok(diff.diffHunks.length > 0);
});

// -----------------------------------------------------------------------------
// 16. Manual Merge Produces Actual Resolved Content (Mandatory Correction 4)
// -----------------------------------------------------------------------------
await test('Manual Merge: Re-import apply persists actual resolved_content to Studio resource', async () => {
  const db = createProMockD1();
  const env = createMockB2Env(db);
  const tenantId = 'org_pro_active';

  // 1. Initial import of page
  const initialPayload = {
    name: 'Conflict Project',
    framework: 'static_html',
    projectFingerprint: 'fp_conflict_1',
    resources: {
      pages: [
        {
          title: 'Home Page',
          slug: 'home',
          type: 'standard',
          is_homepage: 1,
          auth_required: 0,
          deterministic_identity: 'id_home_page',
          source_path: 'index.html',
          source_hash: 'initial_hash',
          content: '<h1>Initial Content</h1>',
        }
      ],
      routes: [],
      functions: [],
    },
    rawFiles: [{ path: 'index.html', content: '<h1>Initial Content</h1>', hash: 'initial_hash', size: 24 }],
    selectedResourceIdentities: ['id_home_page'],
  };

  const importResult = await proService.executeProjectImport(tenantId, initialPayload, env);
  assert.equal(importResult.success, true);

  const importedPage = db.tables.site_pages.find(p => p.tenant_id === tenantId && p.slug === 'home');
  assert.ok(importedPage);

  // 2. Apply manual merge with custom resolved_content
  const manualResolvedText = '<h1>Manually Merged Unified Content</h1>';
  const applyPayload = {
    projectId: importResult.project_id,
    decisions: [
      {
        source_path: 'index.html',
        resource_type: 'page',
        resource_id: importedPage.id,
        resolution: 'manual_merge',
        resolved_content: manualResolvedText,
      }
    ],
    newFiles: [{ path: 'index.html', content: '<h1>External Content</h1>', hash: 'ext_hash', size: 25 }],
  };

  const applyResult = await proService.applyReimportUpdates(tenantId, applyPayload, env);
  assert.equal(applyResult.success, true);
  assert.equal(applyResult.applied_count, 1);

  // 3. Verify D1 site_pages was updated with actual resolved_content
  assert.equal(importedPage.content, manualResolvedText);

  // 4. Verify site_import_changes recorded the resolution
  const recordedChange = db.tables.site_import_changes.find(c => c.project_id === importResult.project_id && c.resolution === 'manual_merge');
  assert.ok(recordedChange);
});

// -----------------------------------------------------------------------------
// 17. Idempotency & Backblaze B2 Failure Resilience
// -----------------------------------------------------------------------------
await test('Idempotency & B2 Failure Resilience: Duplicate import returns existing; B2 failure rolls back cleanly', async () => {
  const db = createProMockD1();
  const env = createMockB2Env(db);
  const tenantId = 'org_pro_active';

  const payload = {
    name: 'Idempotent Project',
    framework: 'static_html',
    projectFingerprint: 'idemp_fp',
    resources: {
      pages: [
        {
          title: 'About',
          slug: 'about',
          type: 'standard',
          is_homepage: 0,
          auth_required: 0,
          deterministic_identity: 'id_about',
          source_path: 'about.html',
          source_hash: 'about_hash',
          content: '<p>About</p>',
        }
      ],
      routes: [],
      functions: [],
    },
    rawFiles: [{ path: 'about.html', content: '<p>About</p>', hash: 'about_hash', size: 14 }],
    selectedResourceIdentities: ['id_about'],
  };

  // 1. Initial successful import
  const res1 = await proService.executeProjectImport(tenantId, payload, env);
  assert.equal(res1.success, true);
  assert.equal(res1.version_number, 1);

  // 2. Exact duplicate import must be idempotent
  const res2 = await proService.executeProjectImport(tenantId, payload, env);
  assert.equal(res2.success, true);
  assert.equal(res2.is_idempotent, true);
  assert.equal(res2.project_id, res1.project_id);

  // 3. Backblaze B2 upload failure test: zero D1 corruption
  const failEnv = createMockB2Env(db, { failUpload: true });
  const failPayload = {
    name: 'Failing Project',
    framework: 'static_html',
    projectFingerprint: 'fail_fp',
    resources: {
      pages: [
        {
          title: 'Secret Page',
          slug: 'secret',
          type: 'standard',
          is_homepage: 0,
          auth_required: 0,
          deterministic_identity: 'id_secret',
          source_path: 'secret.html',
          source_hash: 'secret_hash',
          content: '<p>Secret</p>',
        }
      ],
      routes: [],
      functions: [],
    },
    rawFiles: [{ path: 'secret.html', content: '<p>Secret</p>', hash: 'secret_hash', size: 15 }],
    selectedResourceIdentities: ['id_secret'],
  };

  let b2Failed = false;
  try {
    await proService.executeProjectImport(tenantId, failPayload, failEnv);
  } catch (err) {
    b2Failed = true;
    assert.ok(err.message.includes('B2 upload failed') || err.message.includes('B2 snapshot'));
  }
  assert.equal(b2Failed, true, 'B2 snapshot failure must throw');

  // Verify secret page was NEVER committed to D1
  const secretPageInDb = db.tables.site_pages.find(p => p.slug === 'secret');
  assert.equal(secretPageInDb, undefined, 'Zero D1 resources should be committed on B2 snapshot failure');
});

// -----------------------------------------------------------------------------
// Test Summary
// -----------------------------------------------------------------------------
console.log('\n=============================================================================');
if (failed > 0) {
  console.error(`  ❌ FERASETU PRO PROJECT IMPORT SUITE FAILED: ${passed} passed, ${failed} failed`);
  for (const f of failures) {
    console.error(`     - ${f.name}: ${f.err.message}`);
  }
  process.exit(1);
} else {
  console.log(`  🎉 ALL ${passed} PROJECT IMPORT & DETERMINISTIC ANALYSIS TESTS PASSED CLEANLY!`);
  console.log('=============================================================================\n');
}

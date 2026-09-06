import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// --------------------------------------------------------------------------
// 1. ROUTE DEFINITIONS & PERSISTENT SHELL TRANSITIONS
// --------------------------------------------------------------------------
test('App.tsx defines all required public, merchant, admin, and SEO routes', async () => {
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

  // Public root routes
  assert.match(appSource, /path="\/" element=\{<LandingPage \/>}/);
  assert.match(appSource, /path="\/login"/);
  assert.match(appSource, /path="\/register"/);
  assert.match(appSource, /path="\/callback" element=\{<AuthCallbackPage \/>}/);

  // SEO landing pages
  const seoRoutes = [
    '/pricing',
    '/online-dukaan-banaye',
    '/free-online-store',
    '/shopify-alternative-india',
    '/kirana-store-online',
    '/terms',
    '/privacy',
  ];
  for (const route of seoRoutes) {
    assert.ok(appSource.includes(`path="${route}"`), `Missing SEO/public route: ${route}`);
  }

  // Merchant workspace routes under ProtectedRoute + Layout shell
  const merchantRoutes = [
    '/dashboard',
    '/products',
    '/orders',
    '/analytics',
    '/fera-ai',
    '/ai-assistant',
    '/ai-credits',
    '/website-builder',
    '/survey-feedback',
    '/settings/email',
    '/refer-earn',
    '/upgrade',
    '/support',
    '/get-started',
  ];
  for (const route of merchantRoutes) {
    assert.ok(appSource.includes(`path="${route}"`), `Missing merchant route: ${route}`);
  }

  // Verify nested Layout Outlet architecture
  assert.match(appSource, /<Route element=\{<ProtectedRoute><Layout \/><\/ProtectedRoute>\}>/);

  // Admin routes & protection
  assert.match(appSource, /path="\/admin" element=\{<AdminLogin \/>}/);
  assert.match(appSource, /path="\/admin\/\*" element=\{\s*<AdminProtectedRoute>/);
  assert.match(appSource, /path="dashboard" element=\{<AdminDashboardPage \/>}/);
  assert.match(appSource, /path="users" element=\{<AdminUsersPage \/>}/);
  assert.match(appSource, /path="shops" element=\{<AdminShopsPage \/>}/);
  assert.match(appSource, /path="meetings" element=\{<AdminMeetingsPage \/>}/);
  assert.match(appSource, /path="orders" element=\{<AdminOrdersPage \/>}/);
  assert.match(appSource, /path="tickets" element=\{<AdminTicketsPage \/>}/);
  assert.match(appSource, /path="system" element=\{<AdminSystemPage \/>}/);
});

// --------------------------------------------------------------------------
// 2. SEO LANDING PAGES SPA TRANSITIONS (NO RAW ANCHOR TAGS)
// --------------------------------------------------------------------------
test('SEO landing pages use SPA <Link> navigation and have 0 raw internal <a> tags', async () => {
  const seoFiles = [
    'OnlineDukaanBanaye.tsx',
    'FreeOnlineStore.tsx',
    'ShopifyAlternativeIndia.tsx',
    'KiranaStoreOnline.tsx',
  ];

  for (const fileName of seoFiles) {
    const content = await readFile(new URL(`../src/pages/${fileName}`, import.meta.url), 'utf8');

    // Must import Link from react-router-dom
    assert.match(content, /import\s*\{[^}]*Link[^}]*\}\s*from\s*['"]react-router-dom['"]/);

    // Must have <Link to="/register"
    assert.match(content, /<Link\s+to="\/register"/);

    // Must NOT contain raw anchor tags <a href=...
    const rawAnchorMatch = content.match(/<a[\s>]/g);
    assert.equal(rawAnchorMatch, null, `Found raw anchor tag <a in ${fileName}`);
  }
});

// --------------------------------------------------------------------------
// 3. RESPONSIVE LAYOUT & MODAL SCROLL CLAMPS
// --------------------------------------------------------------------------
test('GetStartedPage enforces responsive 1-column mobile layout and responsive padding', async () => {
  const content = await readFile(new URL('../src/pages/GetStartedPage.tsx', import.meta.url), 'utf8');

  // Container must use grid-cols-1 on mobile and md:grid-cols-2 on tablet/desktop
  assert.match(content, /grid grid-cols-1 md:grid-cols-2/);

  // Left panel must use responsive padding (p-6 sm:p-10)
  assert.match(content, /className="p-6 sm:p-10 flex flex-col justify-between"/);

  // Right panel must be hidden on mobile (hidden md:flex)
  assert.match(content, /hidden md:flex flex-col justify-between/);
});

test('SupportPage and ProductsPage modals enforce 90vh scroll clamping', async () => {
  const supportContent = await readFile(new URL('../src/pages/SupportPage.tsx', import.meta.url), 'utf8');
  assert.match(supportContent, /max-h-\[90vh\]\s+overflow-y-auto/);
  assert.match(supportContent, /maxHeight:\s*['"]90vh['"]/);
  assert.match(supportContent, /overflowY:\s*['"]auto['"]/);

  const productsContent = await readFile(new URL('../src/pages/ProductsPage.tsx', import.meta.url), 'utf8');
  assert.match(productsContent, /maxHeight:\s*['"]90vh['"]/);
  assert.match(productsContent, /overflowY:\s*['"]auto['"]/);
});

// --------------------------------------------------------------------------
// 4. ACTIONABLE EMPTY STATES & BEHAVIOR TRIGGERS
// --------------------------------------------------------------------------
test('AnalyticsPage renders ActionableEmptyState for revenue, volume, and inventory charts', async () => {
  const content = await readFile(new URL('../src/pages/AnalyticsPage.tsx', import.meta.url), 'utf8');

  assert.match(content, /import ActionableEmptyState from '\.\.\/components\/ui\/ActionableEmptyState'/);
  assert.match(content, /actionHref="\/products"/);
  assert.match(content, /actionHref="\/orders"/);
  assert.match(content, /title="No revenue data yet"/);
  assert.match(content, /title="No order volume yet"/);
  assert.match(content, /title="No inventory categories"/);
});

test('OrdersPage and ProductsPage empty states provide actionable interaction handlers', async () => {
  const ordersContent = await readFile(new URL('../src/pages/OrdersPage.tsx', import.meta.url), 'utf8');
  assert.match(ordersContent, /import ActionableEmptyState from '\.\.\/components\/ui\/ActionableEmptyState'/);
  assert.match(ordersContent, /actionLabel="Share Store on WhatsApp"/);
  assert.match(ordersContent, /actionLabel="View All Orders"/);

  const productsContent = await readFile(new URL('../src/pages/ProductsPage.tsx', import.meta.url), 'utf8');
  assert.match(productsContent, /import ActionableEmptyState from '\.\.\/components\/ui\/ActionableEmptyState'/);
  assert.match(productsContent, /actionLabel="Add Your First Product"/);
  assert.match(productsContent, /onAction=\{openAdd\}/);
  assert.match(productsContent, /actionLabel="Clear Filters"/);
});

// --------------------------------------------------------------------------
// 5. DEFENSIVE PROGRAMMING & NULL SAFETY IN ADMIN PAGES
// --------------------------------------------------------------------------
test('AdminMeetingsPage and AdminOrdersPage guard against null/undefined records', async () => {
  const meetingsContent = await readFile(new URL('../src/pages/AdminMeetingsPage.tsx', import.meta.url), 'utf8');
  assert.match(meetingsContent, /Boolean\(m\)/);
  assert.match(meetingsContent, /m\.customer_name\?\.toLowerCase\(\)/);
  assert.match(meetingsContent, /m\.business_name\?\.toLowerCase\(\)/);
  assert.match(meetingsContent, /m\.customer_email\?\.toLowerCase\(\)/);

  const ordersContent = await readFile(new URL('../src/pages/AdminOrdersPage.tsx', import.meta.url), 'utf8');
  assert.match(ordersContent, /String\(order\?\.id \|\| ''\)\.slice\(0, 8\)/);
  assert.match(ordersContent, /order\?\.customer_name \|\| 'Customer'/);
});

// --------------------------------------------------------------------------
// 6. TAILWIND DESIGN TOKEN PURITY IN EmailSettingsPage
// --------------------------------------------------------------------------
test('EmailSettingsPage contains 0 invalid/deprecated custom theme classes', async () => {
  const content = await readFile(new URL('../src/pages/EmailSettingsPage.tsx', import.meta.url), 'utf8');
  const invalidTokens = ['bg-surface', 'border-border', 'text-text', 'text-text-muted', 'bg-bg2', 'bg-border'];

  for (const token of invalidTokens) {
    const regex = new RegExp(`\\b${token}\\b`, 'g');
    assert.equal(content.match(regex), null, `Found invalid CSS token: ${token} in EmailSettingsPage`);
  }
});

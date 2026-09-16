import assert from 'node:assert/strict';
import { createProMockD1 } from './pro-mock-d1.mjs';
import * as proService from '../worker/services/proPlatformService.js';
import { handleProStorefrontResolution } from '../worker/routes/proStudioRoutes.js';

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

console.log('\n--- 4. Testing Multi-Page Routing, Dynamic Parameters & Protected Route Gates ---');

await test('Pages CRUD: Create pages and assign homepage', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  // 1. Create Home page
  const home = await proService.createPage(tenantId, {
    title: 'Home Page',
    slug: 'home',
    is_homepage: true,
    content: [{ type: 'hero', headline: 'Welcome to Pro Store' }]
  }, env);
  assert.ok(home.id);
  assert.equal(home.is_homepage, 1);

  // 2. Create About page
  const about = await proService.createPage(tenantId, {
    title: 'About Us',
    slug: 'about',
    content: [{ type: 'text', body: 'Story of our craft.' }]
  }, env);
  assert.ok(about.id);
  assert.equal(about.is_homepage, 0);

  // 3. Create Protected Client Portal page
  const portal = await proService.createPage(tenantId, {
    title: 'Client Portal',
    slug: 'portal',
    type: 'protected',
    auth_required: 1,
    content: [{ type: 'portal', data: 'Secret client files' }]
  }, env);
  assert.ok(portal.id);
  assert.equal(portal.auth_required, 1);

  // Verify list
  const pages = await proService.listPages(tenantId, env);
  assert.equal(pages.length, 3);
});

await test('Routes CRUD: Create static, dynamic, and protected routes', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  const home = await proService.createPage(tenantId, { title: 'Home', slug: 'home', is_homepage: 1 }, env);
  const about = await proService.createPage(tenantId, { title: 'About', slug: 'about' }, env);
  const prodDetail = await proService.createPage(tenantId, { title: 'Product Details', slug: 'product-details' }, env);
  const account = await proService.createPage(tenantId, { title: 'Customer Account', slug: 'account', auth_required: 1 }, env);

  // Create routes
  const rHome = await proService.createRoute(tenantId, {
    path_pattern: '/',
    page_id: home.id,
    access_level: 'public'
  }, env);
  assert.ok(rHome.id);

  const rAbout = await proService.createRoute(tenantId, {
    path_pattern: '/about',
    page_id: about.id,
    access_level: 'public'
  }, env);
  assert.ok(rAbout.id);

  const rDynamic = await proService.createRoute(tenantId, {
    path_pattern: '/products/:slug',
    page_id: prodDetail.id,
    access_level: 'public'
  }, env);
  assert.ok(rDynamic.id);

  const rProtected = await proService.createRoute(tenantId, {
    path_pattern: '/account',
    page_id: account.id,
    access_level: 'authenticated'
  }, env);
  assert.ok(rProtected.id);

  const routes = await proService.listRoutes(tenantId, env);
  assert.ok(routes.length >= 4);
  assert.ok(routes.some(r => r.path_pattern === '/products/:slug'));
});

await test('Storefront Resolution: Static and Dynamic parameter extraction', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  // Setup pages and routes
  const home = await proService.createPage(tenantId, { title: 'Home', slug: 'home', is_homepage: 1 }, env);
  const prod = await proService.createPage(tenantId, { title: 'Product Detail', slug: 'product' }, env);

  await proService.createRoute(tenantId, { path_pattern: '/products/:slug', page_id: prod.id, access_level: 'public' }, env);

  // Publish deployment snapshot
  const deployment = await proService.publishSite(tenantId, 'usr_pro_active', env);
  assert.ok(deployment);

  // 1. Resolve root '/'
  const resRoot = await handleProStorefrontResolution(tenantId, '/', null, env, null);
  assert.ok(resRoot);
  assert.equal(resRoot.page.slug, 'home');

  // 2. Resolve dynamic route '/products/silk-scarf'
  const resDynamic = await handleProStorefrontResolution(tenantId, '/products/silk-scarf', null, env, null);
  assert.ok(resDynamic);
  assert.equal(resDynamic.page.slug, 'product');
  assert.equal(resDynamic.params.slug, 'silk-scarf');
});

await test('Protected Route Gate: Unauthenticated visitor is blocked and redirected to /login', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  const secretPage = await proService.createPage(tenantId, {
    title: 'VIP Lounge',
    slug: 'vip',
    auth_required: 1,
    type: 'protected'
  }, env);

  await proService.createRoute(tenantId, {
    path_pattern: '/vip',
    page_id: secretPage.id,
    access_level: 'authenticated'
  }, env);

  await proService.publishSite(tenantId, 'usr_pro_active', env);

  // Guest visitor (no customer session)
  const resGuest = await handleProStorefrontResolution(tenantId, '/vip', null, env, null);

  assert.ok(resGuest);
  assert.equal(resGuest.protected_blocked, true);
  assert.equal(resGuest.code, 'CUSTOMER_AUTH_REQUIRED');
  assert.equal(resGuest.redirect, '/login');
});

await test('Protected Route Gate: Authenticated customer is permitted through', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  const secretPage = await proService.createPage(tenantId, {
    title: 'VIP Lounge',
    slug: 'vip',
    auth_required: 1,
    type: 'protected'
  }, env);

  await proService.createRoute(tenantId, {
    path_pattern: '/vip',
    page_id: secretPage.id,
    access_level: 'authenticated'
  }, env);

  await proService.publishSite(tenantId, 'usr_pro_active', env);

  // Authenticated customer session
  const customerSession = {
    customer: { id: 'cust_alice', email: 'alice@example.com', name: 'Alice Merchant' }
  };

  const resAuth = await handleProStorefrontResolution(tenantId, '/vip', null, env, customerSession);

  assert.ok(resAuth);
  assert.equal(resAuth.protected_blocked, undefined);
  assert.equal(resAuth.page.slug, 'vip');
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}

import assert from 'node:assert/strict';
import { createProMockD1 } from './pro-mock-d1.mjs';
import * as proService from '../worker/services/proPlatformService.js';
import { PRO_TEMPLATES, installProTemplate } from '../worker/templates/proTemplates.js';

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

console.log('\n--- 5. Testing Atomic Publishing, Rollback, Templates & Quotas ---');

await test('Pre-publish Validation: Catches empty site and broken references', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  // 1. Empty site validation
  const emptyValidation = await proService.validateSite(tenantId, env);
  assert.equal(emptyValidation.valid, false);
  assert.ok(emptyValidation.errors.some(e => e.includes('Site must have at least one page')));

  // 2. Add page and create broken route
  const page = await proService.createPage(tenantId, { title: 'Home', slug: 'home', is_homepage: 1 }, env);

  // Directly insert broken route pointing to nonexistent page
  await db.prepare(`
    INSERT INTO site_routes (id, tenant_id, path_pattern, page_id, access_level, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind('r_broken', tenantId, '/broken', 'page_does_not_exist', 'public', 'draft', new Date().toISOString(), new Date().toISOString()).run();

  const brokenValidation = await proService.validateSite(tenantId, env);
  assert.equal(brokenValidation.valid, false);
  assert.ok(brokenValidation.errors.some(e => e.includes('non-existent page ID')));

  // Delete broken route
  await proService.deleteRoute(tenantId, 'r_broken', env);

  // Valid site passes
  const validValidation = await proService.validateSite(tenantId, env);
  assert.equal(validValidation.valid, true);
});

await test('Atomic Publish: Creates immutable deployment snapshot and increments version', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  await proService.createPage(tenantId, { title: 'Home', slug: 'home', is_homepage: 1 }, env);
  await proService.createPage(tenantId, { title: 'About', slug: 'about' }, env);

  // Publish v1
  const pub1 = await proService.publishSite(tenantId, 'merchant_admin', env);
  assert.equal(pub1.success, true);
  assert.equal(pub1.version, 1);

  const dep1 = await proService.getPublishedDeployment(tenantId, env);
  assert.ok(dep1);
  assert.equal(dep1.version, 1);
  assert.equal(dep1.status, 'published');
  assert.equal(dep1.snapshot.pages.length, 2);

  // Add another page and publish v2
  await proService.createPage(tenantId, { title: 'Contact', slug: 'contact' }, env);
  const pub2 = await proService.publishSite(tenantId, 'merchant_admin', env);
  assert.equal(pub2.version, 2);

  const dep2 = await proService.getPublishedDeployment(tenantId, env);
  assert.equal(dep2.version, 2);
  assert.equal(dep2.snapshot.pages.length, 3);
});

await test('Rollback Safety: Restores deployment to previous snapshot version', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  // Setup v1 with 1 page
  await proService.createPage(tenantId, { title: 'Home v1', slug: 'home', is_homepage: 1 }, env);
  const pub1 = await proService.publishSite(tenantId, 'admin', env);
  assert.equal(pub1.version, 1);

  // Setup v2 with additional page
  await proService.createPage(tenantId, { title: 'Extra Page', slug: 'extra' }, env);
  const pub2 = await proService.publishSite(tenantId, 'admin', env);
  assert.equal(pub2.version, 2);

  // Rollback to v1
  const rollbackRes = await proService.rollbackDeployment(tenantId, 1, 'admin', env);
  assert.equal(rollbackRes.success, true);
  assert.equal(rollbackRes.version, 3);
  assert.equal(rollbackRes.restored_from_version, 1);

  const currentDep = await proService.getPublishedDeployment(tenantId, env);
  assert.equal(currentDep.version, 3);
  // Restored snapshot has 1 page from v1
  assert.equal(currentDep.snapshot.pages.length, 1);
  assert.equal(currentDep.snapshot.pages[0].slug, 'home');
});

await test('Premium Templates: Installs all 4 templates cleanly', async () => {
  const db = createProMockD1();
  const env = { DB: db };

  // 1. Studio Template
  const resStudio = await installProTemplate('org_studio', 'studio', env);
  assert.equal(resStudio.success, true);
  assert.ok(resStudio.pages_installed >= 3);
  assert.ok(resStudio.routes_installed >= 3);
  assert.ok(resStudio.functions_installed >= 1);

  // 2. Launch Template
  const resLaunch = await installProTemplate('org_launch', 'launch', env);
  assert.equal(resLaunch.success, true);
  assert.ok(resLaunch.pages_installed >= 2);
  assert.ok(resLaunch.routes_installed >= 2);
  assert.ok(resLaunch.functions_installed >= 1);

  // 3. Creator Template
  const resCreator = await installProTemplate('org_creator', 'creator', env);
  assert.equal(resCreator.success, true);
  assert.ok(resCreator.pages_installed >= 3);
  assert.ok(resCreator.routes_installed >= 3);
  assert.ok(resCreator.functions_installed >= 1);

  // 4. Commerce Pro Template
  const resCommerce = await installProTemplate('org_commerce', 'commerce_pro', env);
  assert.equal(resCommerce.success, true);
  assert.ok(resCommerce.pages_installed >= 4);
  assert.ok(resCommerce.routes_installed >= 4);
  assert.ok(resCommerce.functions_installed >= 1);
});

await test('Quotas Enforcement: Limits page creations to max_pages quota', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  // Set tight quota of max 2 pages
  await db.prepare(`
    INSERT INTO site_quotas (
      id, tenant_id, max_pages, max_routes, max_functions,
      max_function_invocations_monthly, max_storage_bytes,
      max_published_versions, max_ai_actions_monthly,
      resets_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    'q_tight', tenantId, 2, 20, 10,
    10000, 10485760, 10, 500,
    new Date(Date.now() + 30 * 86400000).toISOString(),
    new Date().toISOString(), new Date().toISOString()
  ).run();

  // Create page 1 -> OK
  await proService.createPage(tenantId, { title: 'P1', slug: 'p1' }, env);

  // Create page 2 -> OK
  await proService.createPage(tenantId, { title: 'P2', slug: 'p2' }, env);

  // Create page 3 -> Quota exceeded!
  await assert.rejects(
    async () => await proService.createPage(tenantId, { title: 'P3', slug: 'p3' }, env),
    (err) => {
      assert.equal(err.code, 'QUOTA_EXCEEDED');
      assert.equal(err.details.resource, 'pages');
      return true;
    }
  );
});

await test('AI Builder Action Dispatcher: Dispatches AI operations safely', async () => {
  const db = createProMockD1();
  const env = { DB: db };
  const tenantId = 'org_pro_active';

  // 1. AI create_page action
  const createdPage = await proService.executeAIAction(tenantId, 'create_page', {
    title: 'AI Showcase',
    slug: 'ai-showcase',
    content: [{ type: 'hero', headline: 'Built by AI' }]
  }, env);
  assert.ok(createdPage.id);
  assert.equal(createdPage.slug, 'ai-showcase');

  // 2. AI create_route action
  const createdRoute = await proService.executeAIAction(tenantId, 'create_route', {
    path_pattern: '/ai-custom-route',
    page_id: createdPage.id,
    access_level: 'public'
  }, env);
  assert.ok(createdRoute.id);
  assert.equal(createdRoute.path_pattern, '/ai-custom-route');

  // 3. Verify AI action usage quota incremented
  const quotas = await proService.getSiteQuotas(tenantId, env);
  assert.ok(quotas.usage.ai_actions >= 2);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}

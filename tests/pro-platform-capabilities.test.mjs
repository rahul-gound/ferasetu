import assert from 'node:assert/strict';
import { executeFeraFunction, parseFeraFunction, extractRequiredCapabilities } from '../worker/sandbox/feraRuntime.js';
import { createFeraSDK } from '../worker/sandbox/feraSdk.js';
import { createProMockD1 } from './pro-mock-d1.mjs';

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

console.log('\n--- 3. Testing Fera Functions Capabilities & Tenant Isolation ---');

await test('extractRequiredCapabilities inspects AST and discovers required permissions', () => {
  const code = `
    let prods = products.list({ limit: 5 });
    let val = storage.get("custom_setting");
    return prods;
  `;
  const ast = parseFeraFunction(code);
  const caps = extractRequiredCapabilities(ast);

  assert.ok(caps.includes('products.read'), 'Must detect products.read');
  assert.ok(caps.includes('storage.read'), 'Must detect storage.read');
});

await test('Missing capability: Calling products.list() without products.read is rejected', async () => {
  const db = createProMockD1();
  const sdk = createFeraSDK({ tenantId: 'org_pro_active', env: { DB: db } });

  const code = `
    let list = products.list();
    return list;
  `;

  await assert.rejects(
    async () => {
      await executeFeraFunction({
        source: code,
        sdk,
        capabilities: ['storage.read'] // missing products.read
      });
    },
    (err) => {
      assert.equal(err.code, 'MISSING_CAPABILITY');
      assert.equal(err.details.operation, 'products.list');
      assert.equal(err.details.requiredCapability, 'products.read');
      return true;
    }
  );
});

await test('Missing capability: Calling storage.set() without storage.write is rejected', async () => {
  const db = createProMockD1();
  const sdk = createFeraSDK({ tenantId: 'org_pro_active', env: { DB: db } });

  const code = `
    let saved = storage.set("banner_text", "Welcome!");
    return saved;
  `;

  await assert.rejects(
    async () => {
      await executeFeraFunction({
        source: code,
        sdk,
        capabilities: ['storage.read'] // only read, no write
      });
    },
    (err) => {
      assert.equal(err.code, 'MISSING_CAPABILITY');
      assert.equal(err.details.operation, 'storage.set');
      assert.equal(err.details.requiredCapability, 'storage.write');
      return true;
    }
  );
});

await test('Declared capability: Permitted function executes platform SDK successfully', async () => {
  const db = createProMockD1();
  const sdk = createFeraSDK({ tenantId: 'org_pro_active', env: { DB: db } });

  const code = `
    let prods = products.list({ limit: 10 });
    return prods;
  `;

  const result = await executeFeraFunction({
    source: code,
    sdk,
    capabilities: ['products.read']
  });

  assert.ok(Array.isArray(result));
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Heritage Silk Scarf');
});

await test('Tenant Isolation: Tenant A cannot read Tenant B catalog items', async () => {
  const db = createProMockD1();
  const sdkA = createFeraSDK({ tenantId: 'org_pro_active', env: { DB: db } });
  const sdkB = createFeraSDK({ tenantId: 'org_tenant_b', env: { DB: db } });

  // Tenant A queries list
  const prodsA = await sdkA.products.list();
  assert.equal(prodsA.length, 1);
  assert.equal(prodsA[0].id, 'prod_1');
  assert.ok(!prodsA.find(p => p.id === 'prod_tenant_b'), 'Tenant A must NOT see Tenant B products');

  // Tenant A tries to get Tenant B product by ID
  const prodSecret = await sdkA.products.get('prod_tenant_b');
  assert.equal(prodSecret, null, 'Direct lookup across tenant boundary must return null');

  // Tenant B querying their own catalog
  const prodsB = await sdkB.products.list();
  assert.equal(prodsB.length, 1);
  assert.equal(prodsB[0].id, 'prod_tenant_b');
});

await test('Tenant Isolation: Tenant A cannot access Tenant B orders', async () => {
  const db = createProMockD1();
  const sdkA = createFeraSDK({ tenantId: 'org_pro_active', env: { DB: db } });

  // Tenant A tries to look up Tenant B order
  const order = await sdkA.orders.get('ord_tenant_b');
  assert.equal(order, null, 'Tenant A cannot read Tenant B order');
});

await test('Customer IDOR Protection: Customer cannot view other customer profiles', async () => {
  const db = createProMockD1();
  // Customer Alice context
  const sdkAlice = createFeraSDK({
    tenantId: 'org_pro_active',
    env: { DB: db },
    authContext: {
      role: 'customer',
      customer: { id: 'cust_alice', email: 'alice@example.com' }
    }
  });

  await assert.rejects(
    async () => await sdkAlice.auth.getCustomer('cust_bob'),
    (err) => {
      assert.equal(err.code, 'FORBIDDEN');
      assert.ok(err.message.includes('Cannot access other customer profile'));
      return true;
    }
  );
});

await test('Tenant-isolated Key-Value Storage: Isolated namespaces between tenants', async () => {
  const db = createProMockD1();
  const sdkA = createFeraSDK({ tenantId: 'org_pro_active', env: { DB: db } });
  const sdkB = createFeraSDK({ tenantId: 'org_tenant_b', env: { DB: db } });

  // Tenant A sets key
  await sdkA.storage.set('promo_headline', { banner: 'Summer Sale 20% Off' });

  // Tenant A reads key back
  const valA = await sdkA.storage.get('promo_headline');
  assert.deepEqual(valA, { banner: 'Summer Sale 20% Off' });

  // Tenant B reads same key -> gets null
  const valB = await sdkB.storage.get('promo_headline');
  assert.equal(valB, null, 'Tenant B cannot read Tenant A storage');
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}

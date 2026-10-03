import assert from 'node:assert/strict';
import { resolvePricingRegion as workerResolveGeo, EU_COUNTRY_CODES as WORKER_EU } from '../worker/routes/geo.js';
import worker from '../worker/index.js';

console.log('🧪 VERIFYING P0 AUDIT FIXES');

// 1. UK / Great Britain Geo-Resolution Fallback to India
console.log('\n--- 1. UK / GB Geo-Resolution ---');
assert.equal(workerResolveGeo('GB'), 'UK', 'Worker resolves GB to UK');
assert.equal(workerResolveGeo('UK'), 'UK', 'Worker resolves UK to UK');
assert.notEqual(workerResolveGeo('GB'), 'IN', 'Worker never routes GB to India');
console.log('  ✅ UK/GB geo-resolution verified (routes to UK, never IN)');

// 2. Flow B Customer Online Payment Spoofing Rejection
console.log('\n--- 2. Online Payment Spoofing Rejection ---');
const dummyEnv = {
  DB: {
    prepare() {
      return {
        bind() { return this; },
        async first() { return null; },
        async run() { return { meta: { changes: 1 } }; }
      };
    }
  }
};

const spoofReq = new Request('https://ferasetu.com/api/orders/public/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerName: 'Attacker',
    customerPhone: '9876543210',
    shopId: 'shop_1',
    paymentMethod: 'online',
    items: [{ productId: 'p1', quantity: 1 }]
  })
});

const spoofRes = await worker.fetch(spoofReq, dummyEnv);
assert.equal(spoofRes.status, 400, 'Worker returns HTTP 400 for online paymentMethod');
const spoofData = await spoofRes.json();
assert.match(
  spoofData.error,
  /Online payments are not yet enabled for this store/i,
  'Worker returns clear explanatory error message'
);
console.log('  ✅ Online payment spoofing rejected with HTTP 400');

console.log('\n────────────────────────────────────────────────────────────');
console.log('🎉 All targeted P0 fix checks passed successfully!\n');

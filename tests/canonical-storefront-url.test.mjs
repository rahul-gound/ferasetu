// FeraSetu — Canonical Storefront URL & Hostname Verification Test Suite
// ======================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCanonicalSubdomain,
  generateCanonicalStorefront,
  isValidCanonicalSubdomain,
  getStateCode,
  transliterateIndicToAscii,
  sanitizeDnsLabelPart,
  findNextAvailableStorefront,
  RESERVED_SUBDOMAINS,
  DEFAULT_BASE_DOMAIN,
} from '../worker/canonicalHostname.js';
import { classifyHostname } from '../worker/storefront.js';

test('1. Normal shop name with full location details', () => {
  const result = generateCanonicalStorefront({
    shopName: 'My Fashion Store',
    city: 'Mumbai',
    district: 'Andheri',
    state: 'Maharashtra',
    counter: 1,
  });

  assert.equal(result.subdomain, 'my-fashion-store-mumbai-andheri-mh-1');
  assert.equal(result.hostname, 'my-fashion-store-mumbai-andheri-mh-1.ferasetu.com');
  assert.equal(result.storeUrl, 'https://my-fashion-store-mumbai-andheri-mh-1.ferasetu.com');
  assert.equal(result.emailSender, 'noreply@my-fashion-store-mumbai-andheri-mh-1.ferasetu.com');
  assert.equal(isValidCanonicalSubdomain(result.subdomain), true);
});

test('2. Indian state mapping to 2-letter codes', () => {
  assert.equal(getStateCode('Maharashtra'), 'mh');
  assert.equal(getStateCode('MH'), 'mh');
  assert.equal(getStateCode('Delhi'), 'dl');
  assert.equal(getStateCode('NCT of Delhi'), 'dl');
  assert.equal(getStateCode('Karnataka'), 'ka');
  assert.equal(getStateCode('Tamil Nadu'), 'tn');
  assert.equal(getStateCode('Uttar Pradesh'), 'up');
  assert.equal(getStateCode('West Bengal'), 'wb');
  assert.equal(getStateCode('Gujarat'), 'gj');
  assert.equal(getStateCode('Rajasthan'), 'rj');
  assert.equal(getStateCode('Punjab'), 'pb');
  assert.equal(getStateCode('Kerala'), 'kl');
  assert.equal(getStateCode('Telangana'), 'ts');
  assert.equal(getStateCode('Bihar'), 'br');
  assert.equal(getStateCode('Goa'), 'ga');
  assert.equal(getStateCode('UnknownState'), 'unknow');
});

test('3. Partial / missing location fields omit cleanly without double hyphens', () => {
  // Only shopName and state
  const res1 = generateCanonicalStorefront({
    shopName: 'Gupta Sweets',
    state: 'Uttar Pradesh',
    counter: 1,
  });
  assert.equal(res1.subdomain, 'gupta-sweets-up-1');
  assert.equal(res1.hostname, 'gupta-sweets-up-1.ferasetu.com');
  assert.ok(!res1.subdomain.includes('--'));

  // Only shopName and city
  const res2 = generateCanonicalStorefront({
    shopName: 'Sharma General Store',
    city: 'Jaipur',
    counter: 1,
  });
  assert.equal(res2.subdomain, 'sharma-general-store-jaipur-1');
  assert.ok(!res2.subdomain.includes('--'));

  // Only shopName (no location)
  const res3 = generateCanonicalStorefront({
    shopName: 'Rajesh Kirana',
    counter: 1,
  });
  assert.equal(res3.subdomain, 'rajesh-kirana-1');
  assert.ok(!res3.subdomain.includes('--'));
});

test('4. Special characters and punctuation sanitization', () => {
  const res = generateCanonicalStorefront({
    shopName: "  S.K. & Sons (Fashion's Hub)! @2026 #Top  ",
    city: 'New  Delhi',
    district: 'South-West',
    state: 'Delhi',
    counter: 1,
  });

  assert.equal(res.subdomain, 's-k-sons-fashion-s-hub-2026-top-new-delhi-south-west-dl-1');
  assert.ok(!res.subdomain.includes('--'));
  assert.ok(!res.subdomain.startsWith('-'));
  assert.ok(!res.subdomain.endsWith('-'));
  assert.equal(isValidCanonicalSubdomain(res.subdomain), true);
});

test('5. Long shop names truncate safely within RFC 1035 63-character limit', () => {
  const res = generateCanonicalStorefront({
    shopName: 'Super Mega Ultra Deluxe Royal Heritage Fashion And Electronics Superstore',
    city: 'Thiruvananthapuram',
    district: 'Thiruvananthapuram',
    state: 'Kerala',
    counter: 1,
  });

  assert.ok(res.subdomain.length <= 63, `Subdomain length ${res.subdomain.length} must be <= 63`);
  assert.ok(res.subdomain.endsWith('-1'));
  assert.ok(!res.subdomain.includes('--'));
  assert.ok(!res.subdomain.startsWith('-'));
  assert.equal(isValidCanonicalSubdomain(res.subdomain), true);
});

test('6. Collision-safe sequential suffix incrementation', () => {
  const res1 = generateCanonicalStorefront({
    shopName: 'Om Sai Mart',
    city: 'Pune',
    district: 'Haveli',
    state: 'Maharashtra',
    counter: 1,
  });
  const res2 = generateCanonicalStorefront({
    shopName: 'Om Sai Mart',
    city: 'Pune',
    district: 'Haveli',
    state: 'Maharashtra',
    counter: 2,
  });
  const res3 = generateCanonicalStorefront({
    shopName: 'Om Sai Mart',
    city: 'Pune',
    district: 'Haveli',
    state: 'Maharashtra',
    counter: 3,
  });

  assert.equal(res1.subdomain, 'om-sai-mart-pune-haveli-mh-1');
  assert.equal(res2.subdomain, 'om-sai-mart-pune-haveli-mh-2');
  assert.equal(res3.subdomain, 'om-sai-mart-pune-haveli-mh-3');
});

test('7. Indic script transliteration (Hindi, Gujarati, Bengali, etc.)', () => {
  // Hindi / Devanagari: "नमस्ते किराना"
  const resHindi = generateCanonicalStorefront({
    shopName: 'नमस्ते किराना',
    city: 'वाराणसी',
    state: 'Uttar Pradesh',
    counter: 1,
  });
  assert.equal(isValidCanonicalSubdomain(resHindi.subdomain), true);
  assert.ok(resHindi.subdomain.includes('namaste'));
  assert.ok(resHindi.subdomain.includes('kirana'));
  assert.ok(resHindi.subdomain.includes('up-1'));

  // Gujarati: "પટેલ સ્ટોર્સ"
  const resGujarati = generateCanonicalStorefront({
    shopName: 'પટેલ સ્ટોર્સ',
    city: 'અમદાવાદ',
    state: 'Gujarat',
    counter: 1,
  });
  assert.equal(isValidCanonicalSubdomain(resGujarati.subdomain), true);
  assert.ok(resGujarati.subdomain.includes('patel'));
  assert.ok(resGujarati.subdomain.includes('gj-1'));
});

test('8. Reserved subdomains set includes core platform subdomains', () => {
  assert.ok(RESERVED_SUBDOMAINS.has('www'));
  assert.ok(RESERVED_SUBDOMAINS.has('app'));
  assert.ok(RESERVED_SUBDOMAINS.has('api'));
  assert.ok(RESERVED_SUBDOMAINS.has('admin'));
  assert.ok(RESERVED_SUBDOMAINS.has('mail'));
  assert.ok(RESERVED_SUBDOMAINS.has('cdn'));
  assert.ok(RESERVED_SUBDOMAINS.has('status'));
});

test('9. Hostname classification recognizes platform root, reserved, and merchant', () => {
  // Root domain
  const root = classifyHostname('ferasetu.com');
  assert.equal(root.type, 'platform_root');

  // Reserved subdomain: www
  const www = classifyHostname('www.ferasetu.com');
  assert.equal(www.type, 'platform_reserved');
  assert.equal(www.subdomain, 'www');

  // Reserved subdomain: app
  const app = classifyHostname('app.ferasetu.com');
  assert.equal(app.type, 'platform_reserved');
  assert.equal(app.subdomain, 'app');

  // Reserved subdomain: api
  const api = classifyHostname('api.ferasetu.com');
  assert.equal(api.type, 'api');
  assert.equal(api.subdomain, 'api');

  // Merchant storefront
  const merchant = classifyHostname('my-fashion-store-mumbai-andheri-mh-1.ferasetu.com');
  assert.equal(merchant.type, 'merchant');
  assert.equal(merchant.subdomain, 'my-fashion-store-mumbai-andheri-mh-1');

  // Legacy short merchant subdomain
  const legacy = classifyHostname('rajeshmart.ferasetu.com');
  assert.equal(legacy.type, 'merchant');
  assert.equal(legacy.subdomain, 'rajeshmart');
});

test('10. findNextAvailableStorefront avoids existing collisions in DB', async () => {
  const existingSet = new Set([
    'super-mart-delhi-central-dl-1',
    'super-mart-delhi-central-dl-2',
  ]);

  const mockDb = {
    prepare(query) {
      return {
        bind(subdomain, hostname) {
          return {
            async first() {
              if (existingSet.has(subdomain)) {
                return { id: 'existing-123' };
              }
              return null;
            }
          };
        }
      };
    }
  };

  const result = await findNextAvailableStorefront(mockDb, {
    shopName: 'Super Mart',
    city: 'Delhi',
    district: 'Central',
    state: 'Delhi',
  });

  assert.equal(result.subdomain, 'super-mart-delhi-central-dl-3');
  assert.equal(result.hostname, 'super-mart-delhi-central-dl-3.ferasetu.com');
  assert.equal(result.storeUrl, 'https://super-mart-delhi-central-dl-3.ferasetu.com');
  assert.equal(result.emailSender, 'noreply@super-mart-delhi-central-dl-3.ferasetu.com');
});

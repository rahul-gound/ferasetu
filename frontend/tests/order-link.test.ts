import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStorefrontUrl,
  getStorefrontPreviewUrl,
  generateCanonicalStorefront,
  generateCanonicalSubdomain,
} from '../src/utils/canonicalHostname.ts';

test('Order Link — Canonical Storefront URL Generation', () => {
  // Test merchant with full geographic data
  const canonical = generateCanonicalStorefront({
    shopName: 'Ramesh Kirana',
    city: 'Andheri West',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    counter: 1,
  });

  assert.ok(canonical.subdomain.includes('ramesh-kirana'));
  assert.ok(canonical.subdomain.includes('mh'));
  assert.equal(canonical.storeUrl, `https://${canonical.subdomain}.ferasetu.com`);

  // Test getStorefrontUrl with hostname
  const urlWithHostname = getStorefrontUrl({
    hostname: 'ramesh-grocery-mumbai-mh-1.ferasetu.com',
  });
  assert.equal(urlWithHostname, 'https://ramesh-grocery-mumbai-mh-1.ferasetu.com');

  // Test getStorefrontUrl with custom domain
  const urlWithCustomDomain = getStorefrontUrl({
    custom_domain: 'rameshkirana.in',
  });
  assert.equal(urlWithCustomDomain, 'https://rameshkirana.in');

  // Test getStorefrontUrl with business_name fallback
  const urlWithBusiness = getStorefrontUrl({
    business_name: 'Gupta Sweets',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
  });
  assert.ok(urlWithBusiness.includes('gupta-sweets'));
  assert.ok(urlWithBusiness.includes('up'));
  assert.ok(urlWithBusiness.endsWith('.ferasetu.com'));
});

test('Order Link — WhatsApp Cart Query Parameter Formatting', () => {
  const items = [
    { productId: 'prod_1', quantity: 2 },
    { productId: 'prod_2', quantity: 1 },
  ];

  const cartParam = items.map((i) => `${i.productId}:${i.quantity}`).join(',');
  assert.equal(cartParam, 'prod_1:2,prod_2:1');

  // Test parsing cart tokens
  const tokens = cartParam.split(',');
  const parsed = tokens.map((t) => {
    const [id, qty] = t.split(':');
    return { productId: id, quantity: parseInt(qty, 10) };
  });

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].productId, 'prod_1');
  assert.equal(parsed[0].quantity, 2);
  assert.equal(parsed[1].productId, 'prod_2');
  assert.equal(parsed[1].quantity, 1);
});

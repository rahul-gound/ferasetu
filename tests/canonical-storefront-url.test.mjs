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
import { classifyHostname, resolveCustomDomainTenant } from '../worker/storefront.js';
import worker from '../worker/index.js';

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

test('11. classifyHostname recognizes custom domains, secondary base domains, and rejects nested subdomains', () => {
  // Custom domains
  const custom1 = classifyHostname('rohankirana.in');
  assert.equal(custom1.type, 'custom_domain');
  assert.equal(custom1.host, 'rohankirana.in');

  const custom2 = classifyHostname('store.brand.com');
  assert.equal(custom2.type, 'custom_domain');
  assert.equal(custom2.host, 'store.brand.com');

  const custom3 = classifyHostname('my-shop.co.in');
  assert.equal(custom3.type, 'custom_domain');

  // Secondary base domain
  const secRoot = classifyHostname('fera-search.tech');
  assert.equal(secRoot.type, 'platform_root');
  assert.equal(secRoot.domain, 'fera-search.tech');

  const secMerchant = classifyHostname('gupta-sweets.fera-search.tech');
  assert.equal(secMerchant.type, 'merchant');
  assert.equal(secMerchant.slug, 'gupta-sweets');

  // Case insensitivity & trimming
  const upper = classifyHostname('  ROHANKIRANA.IN  ');
  assert.equal(upper.type, 'custom_domain');
  assert.equal(upper.host, 'rohankirana.in');

  // Nested subdomains under base domain are disallowed
  const nested = classifyHostname('sub.store.ferasetu.com');
  assert.equal(nested.type, 'unknown_host');
  assert.equal(nested.reason, 'nested_subdomain');
});

test('12. classifyHostname handles malformed and boundary inputs', () => {
  assert.equal(classifyHostname(null).type, 'unknown_host');
  assert.equal(classifyHostname(undefined).type, 'unknown_host');
  assert.equal(classifyHostname('').type, 'unknown_host');
  assert.equal(classifyHostname('localhost').type, 'api');
  assert.equal(classifyHostname('127.0.0.1').type, 'api');
  assert.equal(classifyHostname('singleword').type, 'unknown_host');
  assert.equal(classifyHostname('.leadingdot.com').type, 'unknown_host');
  assert.equal(classifyHostname('trailingdot.com.').type, 'unknown_host');
});

test('13. Platform routes collision: platform domains can never be custom domains', () => {
  const platformHosts = [
    'ferasetu.com',
    'fera-search.tech',
    'api.ferasetu.com',
    'www.ferasetu.com',
    'app.ferasetu.com',
    'admin.ferasetu.com',
    'cdn.ferasetu.com',
    'mail.ferasetu.com',
    'status.ferasetu.com',
  ];

  for (const host of platformHosts) {
    const res = classifyHostname(host);
    assert.notEqual(res.type, 'custom_domain', `${host} must never be classified as custom_domain`);
  }
});

test('14. resolveCustomDomainTenant resolves verified domains and rejects unverified/unknown', async () => {
  const emailDomains = new Map();
  const users = new Map();
  const shops = new Map();

  emailDomains.set('verified-store.in', {
    id: 'ed-1',
    organization_id: 'org-1',
    domain: 'verified-store.in',
    verification_status: 'VERIFIED',
  });
  emailDomains.set('pending-store.in', {
    id: 'ed-2',
    organization_id: 'org-2',
    domain: 'pending-store.in',
    verification_status: 'PENDING',
  });
  shops.set('org-1', {
    id: 'shop-1',
    store_slug: 'verified-slug',
    name: 'Verified Shop',
  });
  users.set('org-1', {
    id: 'user-1',
    subdomain: 'verified-slug',
    business_name: 'Verified Shop',
  });
  users.set('legacy-user', {
    id: 'user-legacy',
    organization_id: 'org-legacy',
    subdomain: 'legacy-store',
    business_name: 'Legacy Store',
    custom_domain: 'legacy-domain.com',
  });

  const mockDb = {
    prepare(q) {
      const cleanQ = q.trim().replace(/\s+/g, ' ');
      return {
        bind(...args) {
          return {
            async first() {
              if (cleanQ.includes('FROM email_domains ed') && cleanQ.includes("ed.verification_status = 'VERIFIED'")) {
                const dom = emailDomains.get(args[0]);
                if (dom && dom.verification_status === 'VERIFIED') {
                  const sh = shops.get(dom.organization_id) || {};
                  const u = users.get(dom.organization_id) || {};
                  return {
                    id: dom.id,
                    organization_id: dom.organization_id,
                    domain: dom.domain,
                    verification_status: dom.verification_status,
                    shop_id: sh.id,
                    store_slug: sh.store_slug,
                    shop_name: sh.name,
                    user_id: u.id,
                    subdomain: u.subdomain,
                    business_name: u.business_name,
                  };
                }
                return null;
              }
              if (cleanQ.includes('FROM users WHERE LOWER(custom_domain) = ?')) {
                const target = args[0];
                for (const u of users.values()) {
                  if ((u.custom_domain || '').toLowerCase() === target) {
                    return {
                      id: u.id,
                      organization_id: u.organization_id,
                      subdomain: u.subdomain,
                      business_name: u.business_name,
                    };
                  }
                }
                return null;
              }
              return null;
            }
          };
        }
      };
    }
  };

  const env = { DB: mockDb };

  // 1. Verified domain resolves correctly
  const resVerified = await resolveCustomDomainTenant('verified-store.in', env);
  assert.ok(resVerified, 'Verified domain must resolve');
  assert.equal(resVerified.organizationId, 'org-1');
  assert.equal(resVerified.slug, 'verified-slug');
  assert.equal(resVerified.shopName, 'Verified Shop');

  // 2. Pending domain returns null
  const resPending = await resolveCustomDomainTenant('pending-store.in', env);
  assert.equal(resPending, null, 'Pending domain must NOT resolve');

  // 3. Unknown domain returns null
  const resUnknown = await resolveCustomDomainTenant('unknown-domain.org', env);
  assert.equal(resUnknown, null, 'Unknown domain must return null');

  // 4. Fallback users.custom_domain resolves
  const resLegacy = await resolveCustomDomainTenant('legacy-domain.com', env);
  assert.ok(resLegacy, 'Fallback custom_domain in users table must resolve');
  assert.equal(resLegacy.slug, 'legacy-store');
});

test('15. Edge route dispatching: custom domain SPA serving vs 404', async () => {
  const mockDb = {
    prepare(q) {
      const cleanQ = q.trim().replace(/\s+/g, ' ');
      return {
        bind(...args) {
          return {
            async first() {
              if (cleanQ.includes('FROM email_domains ed') && cleanQ.includes("ed.verification_status = 'VERIFIED'")) {
                if (args[0] === 'verified-shop.in') {
                  return {
                    id: 'dom-10',
                    organization_id: 'org-10',
                    domain: 'verified-shop.in',
                    verification_status: 'VERIFIED',
                    shop_id: 'shop-10',
                    store_slug: 'verified-shop',
                    shop_name: 'Verified Shop Title',
                  };
                }
                return null;
              }
              if (cleanQ.includes('FROM users u') && cleanQ.includes('WHERE u.subdomain = ? OR u.hostname = ?')) {
                return {
                  id: 'usr-10',
                  business_name: 'Verified Shop Title',
                  subdomain: 'verified-shop',
                  is_blocked: 0,
                  is_published: 1,
                  plan: 'business',
                  market: 'IN',
                };
              }
              if (cleanQ.includes('SELECT COUNT(*) as cnt FROM products')) {
                return { cnt: 10 };
              }
              return null;
            }
          };
        }
      };
    }
  };

  const env = { DB: mockDb, PAGES_ORIGIN: 'https://ferasetu.com' };

  // Verified domain serves storefront SPA (200)
  const reqVerified = new Request('https://verified-shop.in/', {
    method: 'GET',
    headers: { 'Host': 'verified-shop.in' },
  });
  const resVerified = await worker.fetch(reqVerified, env, {});
  assert.equal(resVerified.status, 200);
  assert.equal(resVerified.headers.get('Content-Type'), 'text/html; charset=utf-8');
  const html = await resVerified.text();
  assert.ok(html.includes('<title>Verified Shop Title</title>'));

  // Unknown domain returns 404 "Domain not configured"
  const reqUnknown = new Request('https://unknown-shop.in/', {
    method: 'GET',
    headers: { 'Host': 'unknown-shop.in' },
  });
  const resUnknown = await worker.fetch(reqUnknown, env, {});
  assert.equal(resUnknown.status, 404);
  const text404 = await resUnknown.text();
  assert.equal(text404, 'Domain not configured');
  assert.equal(resUnknown.headers.get('X-Robots-Tag'), 'noindex, nofollow');

  // Reserved subdomain returns 404 "Reserved platform subdomain"
  const reqReserved = new Request('https://admin.ferasetu.com/', {
    method: 'GET',
    headers: { 'Host': 'admin.ferasetu.com' },
  });
  const resReserved = await worker.fetch(reqReserved, env, {});
  assert.equal(resReserved.status, 404);
  const textReserved = await resReserved.text();
  assert.equal(textReserved, 'Reserved platform subdomain');
});

test('16. Remediated: isOriginAllowed rejects arbitrary external origins and falls back to platform root', async () => {
  const env = { DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } };
  const arbitraryOrigin = 'https://malicious-attacker-domain.com';
  const req = new Request('https://ferasetu.com/api/health', {
    method: 'OPTIONS',
    headers: {
      'Host': 'ferasetu.com',
      'Origin': arbitraryOrigin,
      'Access-Control-Request-Method': 'GET',
    },
  });

  const res = await worker.fetch(req, env, {});
  const allowOrigin = res.headers.get('Access-Control-Allow-Origin');

  assert.notEqual(allowOrigin, arbitraryOrigin, 'Arbitrary external origin must NOT be reflected');
  assert.equal(allowOrigin, 'https://ferasetu.com', 'Arbitrary origin must fall back to platform root');
});

test('17. Remediated: resolveStorefrontOrgId handles custom_domain check, resolving customer endpoints', async () => {
  const mockDb = {
    prepare(q) {
      const cleanQ = q.trim().replace(/\s+/g, ' ');
      return {
        bind(...args) {
          return {
            async first() {
              if (cleanQ.includes('FROM email_domains') && cleanQ.includes("verification_status = 'VERIFIED'")) {
                if (args[0] === 'verified-shop.in') {
                  return { organization_id: 'org-custom-123' };
                }
              }
              if (cleanQ.includes('FROM shops WHERE hostname = ?')) {
                if (args[0] === 'verified-shop.in') {
                  return { id: 'shop-custom', organization_id: 'org-custom-123' };
                }
              }
              return null;
            }
          };
        }
      };
    }
  };

  const env = { DB: mockDb };

  // A customer on custom domain verified-shop.in accesses customer endpoint
  const req = new Request('https://verified-shop.in/api/storefront/customer/me', {
    method: 'GET',
    headers: {
      'Host': 'verified-shop.in',
      'Referer': 'https://verified-shop.in/account',
    },
  });

  const res = await worker.fetch(req, env, {});
  const body = await res.json();

  assert.equal(res.status, 200, 'Custom domain storefront context must resolve without throwing 400');
  assert.equal(body.authenticated, false);
});



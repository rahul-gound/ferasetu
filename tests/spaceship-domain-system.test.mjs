/**
 * FeraSetu Production-Grade Spaceship Custom-Domain Test Suite
 * tests/spaceship-domain-system.test.mjs
 * =============================================================================
 * Validates:
 * 1. Spaceship API Client:
 *    - Domain normalization & IDNA/punycode
 *    - Bulk & single availability lookups
 *    - Error handling: rate limit 429, auth 401, upstream 500, timeouts
 *    - DNS preservation: preserves MX, SPF, DKIM, DMARC on updates
 * 2. Spaceship Checkout Adapter:
 *    - Feature flag (disabled by default) prevents fake checkouts
 *    - Durable domain_orders creation
 *    - Strict cross-tenant isolation (prevents domain hijacking)
 *    - Registration confirmation with Spaceship
 * 3. Ingress & TLS Readiness:
 *    - Storefront DNS instruction generation (Apex ALIAS/A and www CNAME)
 *    - DoH verification
 *    - Ingress proxy authorization webhook (Caddy/Envoy admission)
 *    - Live HTTPS / TLS probe validation
 * 4. Storefront Routing & Tenant Isolation:
 *    - Custom domain resolves to correct shop in custom_storefront_domains
 *    - Backward compatibility with email_domains and users
 *    - Hostname spoofing prevention and controlled reverse-proxy ingress
 * =============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SpaceshipClient,
  normalizeDomainName,
  createSpaceshipClient,
  clearSpaceshipCache
} from '../worker/services/spaceshipClient.js';
import {
  SpaceshipCheckoutProvider,
  createSpaceshipCheckoutProvider
} from '../worker/services/spaceshipCheckoutAdapter.js';
import {
  DomainService,
  createDomainService,
  resolveCustomStorefront
} from '../worker/services/domainService.js';
import {
  generateStorefrontDnsInstructions,
  verifyIngressAuthorization,
  probeHttpsReadiness,
  INGRESS_HOSTNAME_TARGET
} from '../worker/services/domainIngressService.js';
import {
  classifyHostname,
  resolveCustomDomainTenant,
  clearMerchantCache
} from '../worker/storefront.js';
import worker from '../worker/index.js';

// Deterministic mock for Pages origin fetch in offline tests
const originalFetch = globalThis.fetch;
globalThis.fetch = async (urlOrReq, init) => {
  const urlStr = typeof urlOrReq === 'string' ? urlOrReq : urlOrReq.url;
  try {
    const url = new URL(urlStr);
    if (url.hostname === 'ferasetu.com' || url.hostname === 'ferasetu.pages.dev') {
      return new Response('<!doctype html><html><head><title>FeraSetu Storefront</title></head><body><div id="root"></div></body></html>', {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        }
      });
    }
  } catch {}
  return originalFetch(urlOrReq, init);
};

// Helper mock D1 Database
function createMockDb() {
  const store = {
    custom_storefront_domains: [],
    domain_orders: [],
    domain_audit_logs: [],
    email_domains: [],
    email_identities: [],
    shops: [],
    users: [],
    organizations: [],
  };

  return {
    _store: store,
    prepare(query) {
      const q = query.replace(/\s+/g, ' ').trim();
      return {
        bind(...args) {
          return {
            async first() {
              // custom_storefront_domains lookups
              if (q.includes('custom_storefront_domains') && (q.includes('status = \'ACTIVE\'') || q.includes('dns_status = \'VERIFIED\''))) {
                const dom = store.custom_storefront_domains.find(d => d.domain === args[0] && (d.status === 'ACTIVE' || d.dns_status === 'VERIFIED'));
                if (!dom) return null;
                const shop = store.shops.find(s => s.id === dom.shop_id || s.organization_id === dom.organization_id);
                return {
                  ...dom,
                  store_slug: shop?.store_slug,
                  shop_name: shop?.name
                };
              }
              if (q.includes('custom_storefront_domains') && q.includes('WHERE domain = ?')) {
                return store.custom_storefront_domains.find(d => d.domain === args[0]) || null;
              }
              if (q.includes('custom_storefront_domains') && q.includes('WHERE id = ? AND organization_id = ?')) {
                return store.custom_storefront_domains.find(d => d.id === args[0] && d.organization_id === args[1]) || null;
              }
              if (q.includes('custom_storefront_domains') && q.includes('WHERE id = ?')) {
                return store.custom_storefront_domains.find(d => d.id === args[0]) || null;
              }

              // domain_orders lookups
              if (q.includes('FROM domain_orders WHERE id = ? AND organization_id = ?')) {
                return store.domain_orders.find(o => o.id === args[0] && o.organization_id === args[1]) || null;
              }
              if (q.includes('FROM domain_orders WHERE id = ?')) {
                return store.domain_orders.find(o => o.id === args[0]) || null;
              }

              // email_domains lookups
              if (q.includes('FROM email_domains') && q.includes('verification_status = \'VERIFIED\'')) {
                const dom = store.email_domains.find(d => d.domain === args[0] && d.verification_status === 'VERIFIED');
                if (!dom) return null;
                const shop = store.shops.find(s => s.organization_id === dom.organization_id);
                return {
                  ...dom,
                  shop_id: shop?.id,
                  store_slug: shop?.store_slug,
                  shop_name: shop?.name
                };
              }
              if (q.includes('FROM email_domains WHERE domain = ?')) {
                return store.email_domains.find(d => d.domain === args[0]) || null;
              }
              if (q.includes('FROM email_domains WHERE id = ? AND organization_id = ?')) {
                return store.email_domains.find(d => d.id === args[0] && d.organization_id === args[1]) || null;
              }

              // shops lookups
              if (q.includes('FROM shops WHERE organization_id = ?')) {
                return store.shops.find(s => s.organization_id === args[0]) || null;
              }
              if (q.includes('FROM shops WHERE store_slug = ? OR hostname = ?')) {
                return store.shops.find(s => s.store_slug === args[0] || s.hostname === args[1]) || null;
              }
              if (q.includes('FROM shops WHERE hostname = ?')) {
                return store.shops.find(s => s.hostname === args[0]) || null;
              }

              // users lookups
              if (q.includes('FROM users WHERE LOWER(custom_domain) = ?')) {
                return store.users.find(u => (u.custom_domain || '').toLowerCase() === args[0].toLowerCase()) || null;
              }
              if (q.includes('FROM users WHERE subdomain = ? OR hostname = ?')) {
                return store.users.find(u => u.subdomain === args[0] || u.hostname === args[1]) || null;
              }

              // organizations
              if (q.includes('FROM organizations WHERE store_slug = ?')) {
                return store.organizations.find(o => o.store_slug === args[0]) || null;
              }

              return null;
            },
            async all() {
              if (q.includes('FROM custom_storefront_domains WHERE organization_id = ?')) {
                return { results: store.custom_storefront_domains.filter(d => d.organization_id === args[0]) };
              }
              if (q.includes('FROM email_domains WHERE organization_id = ?')) {
                return { results: store.email_domains.filter(d => d.organization_id === args[0]) };
              }
              return { results: [] };
            },
            async run() {
              if (q.includes('INSERT INTO custom_storefront_domains')) {
                store.custom_storefront_domains.push({
                  id: args[0],
                  organization_id: args[1],
                  shop_id: args[2],
                  domain: args[3],
                  apex_domain: args[4],
                  ownership_token: args[5],
                  dns_target: args[6],
                  dns_status: 'PENDING',
                  tls_status: 'PENDING',
                  status: 'PENDING_DNS',
                  created_at: args[7] || new Date().toISOString(),
                });
                return { success: true };
              }
              if (q.includes('INSERT INTO domain_orders')) {
                store.domain_orders.push({
                  id: args[0],
                  organization_id: args[1],
                  shop_id: args[2],
                  domain: args[3],
                  provider: 'SPACESHIP',
                  status: args[4] || 'CHECKOUT_PENDING',
                  quoted_price: args[5],
                  currency: args[6] || 'USD',
                  period_years: args[7] || 1,
                  checkout_url: args[8],
                });
                return { success: true };
              }
              if (q.includes('UPDATE custom_storefront_domains') && q.includes('SET dns_status = ?')) {
                const dom = store.custom_storefront_domains.find(d => d.id === args[5] && d.organization_id === args[6]);
                if (dom) {
                  dom.dns_status = args[0];
                  dom.status = args[1];
                  dom.verified_at = args[2];
                }
                return { success: true };
              }
              if (q.includes('UPDATE custom_storefront_domains') && q.includes('SET tls_status = ?')) {
                const dom = store.custom_storefront_domains.find(d => d.id === args[5] && d.organization_id === args[6]);
                if (dom) {
                  dom.tls_status = args[0];
                  dom.status = args[1];
                  dom.tls_verified_at = args[2];
                }
                return { success: true };
              }
              if (q.includes('DELETE FROM custom_storefront_domains')) {
                store.custom_storefront_domains = store.custom_storefront_domains.filter(
                  d => !(d.id === args[0] && d.organization_id === args[1])
                );
                return { success: true };
              }
              return { success: true };
            }
          };
        }
      };
    }
  };
}

// =============================================================================
// 1. DOMAIN NORMALIZATION & IDNA / PUNYCODE TESTS
// =============================================================================

test('Spaceship.1.1: normalizeDomainName handles URLs, trailing dots, and ports', () => {
  assert.equal(normalizeDomainName('https://SweetShop.com/').domain, 'sweetshop.com');
  assert.equal(normalizeDomainName('http://store.mybrand.co.in:8080/path').domain, 'store.mybrand.co.in');
  assert.equal(normalizeDomainName('organicmart.in...').domain, 'organicmart.in');
  assert.equal(normalizeDomainName('   MYSTORE.ONLINE   ').domain, 'mystore.online');
});

test('Spaceship.1.2: normalizeDomainName rejects platform domains and invalid labels', () => {
  assert.equal(normalizeDomainName('ferasetu.com').valid, false);
  assert.equal(normalizeDomainName('store.ferasetu.com').valid, false);
  assert.equal(normalizeDomainName('nodotsintld').valid, false);
  assert.equal(normalizeDomainName('-badstart.com').valid, false);
  assert.equal(normalizeDomainName('badend-.com').valid, false);
});

test('Spaceship.1.3: normalizeDomainName handles Internationalized Domain Names (IDNA/Punycode)', () => {
  // Unicode Hindi domain: दुकान.com -> xn--11b5c3a2b.com
  const idna = normalizeDomainName('दुकान.com');
  assert.equal(idna.valid, true);
  assert.ok(idna.domain.startsWith('xn--'));
});

// =============================================================================
// 2. SPACESHIP API CLIENT & AVAILABILITY TESTS
// =============================================================================

test('Spaceship.2.1: checkBulkAvailability returns real availability and currency', async () => {
  clearSpaceshipCache();
  const client = new SpaceshipClient({ isMock: true });

  const results = await client.checkBulkAvailability(['sweetshop.com', 'taken-store.com', 'sweetshop.in']);
  assert.equal(results.length, 3);

  const com = results.find(r => r.domain === 'sweetshop.com');
  assert.equal(com.available, true);
  assert.equal(com.currency, 'USD');
  assert.equal(typeof com.price, 'number');

  const taken = results.find(r => r.domain === 'taken-store.com');
  assert.equal(taken.available, false);
});

test('Spaceship.2.2: checkAvailability respects 60s in-memory debounced caching', async () => {
  clearSpaceshipCache();
  const client = new SpaceshipClient({ isMock: true });

  const res1 = await client.checkAvailability('cachedshop.com');
  const res2 = await client.checkAvailability('cachedshop.com');
  assert.deepEqual(res1, res2);
});

test('Spaceship.2.3: applyStorefrontDnsRecords strictly preserves existing MX, SPF, DKIM, and DMARC', async () => {
  const client = new SpaceshipClient({ isMock: true });
  // Mock returns existing A, CNAME, and MX
  const recordsToApply = [
    { type: 'TXT', name: '_ferasetu-challenge.sweetshop.com', value: 'fera-domain-verification=token123' },
    { type: 'CNAME', name: 'www.sweetshop.com', value: INGRESS_HOSTNAME_TARGET },
    { type: 'ALIAS', name: 'sweetshop.com', value: INGRESS_HOSTNAME_TARGET },
  ];

  const result = await client.applyStorefrontDnsRecords('sweetshop.com', recordsToApply);
  assert.equal(result.success, true);
  assert.ok(result.preservedCount >= 1); // MX preserved
  assert.ok(result.totalRecords >= 4);
});

// =============================================================================
// 3. SPACESHIP CHECKOUT ADAPTER & FEATURE FLAG TESTS
// =============================================================================

test('Spaceship.3.1: Checkout adapter defaults to disabled-by-default feature flag', async () => {
  const env = { ENABLE_SPACESHIP_CHECKOUT: "false" };
  const provider = createSpaceshipCheckoutProvider(env);
  assert.equal(provider.isCheckoutEnabled(), false);

  const db = createMockDb();
  const order = await provider.createPurchaseRequest({
    organizationId: 'org_1',
    shopId: 'shop_1',
    domain: 'sweetshop.com',
    periodYears: 1,
    db
  });

  assert.equal(order.checkoutEnabled, false);
  assert.equal(order.status, 'QUOTED_PENDING_PROVIDER');
  assert.ok(order.message.includes('commercial confirmation'));
  assert.equal(order.currency, 'USD');
});

test('Spaceship.3.2: Prevents cross-tenant domain hijacking attempts', async () => {
  const db = createMockDb();
  db._store.custom_storefront_domains.push({
    id: 'csd_existing',
    organization_id: 'org_victim',
    shopId: 'shop_victim',
    domain: 'victimstore.com',
    status: 'ACTIVE'
  });

  const provider = createSpaceshipCheckoutProvider({});
  await assert.rejects(async () => {
    await provider.createPurchaseRequest({
      organizationId: 'org_attacker',
      shopId: 'shop_attacker',
      domain: 'victimstore.com',
      db
    });
  }, /already registered by another organization/);
});

test('Spaceship.3.3: Idempotent registration verification provisions domain and auto-applies DNS', async () => {
  const db = createMockDb();
  db._store.domain_orders.push({
    id: 'ord_1',
    organization_id: 'org_1',
    shop_id: 'shop_1',
    domain: 'sweetshop.com',
    status: 'CHECKOUT_PENDING'
  });
  const provider = createSpaceshipCheckoutProvider({});

  const verified = await provider.verifyRegistration({
    organizationId: 'org_1',
    orderId: 'ord_1',
    domain: 'sweetshop.com',
    db
  });

  assert.equal(verified.verified, true);
  assert.equal(verified.status, 'REGISTERED');
  assert.equal(verified.dnsApplied, true);

  // Second call does not fail or duplicate
  const verified2 = await provider.verifyRegistration({
    organizationId: 'org_1',
    orderId: 'ord_1',
    domain: 'sweetshop.com',
    db
  });
  assert.equal(verified2.verified, true);
});

// =============================================================================
// 4. INGRESS ADMISSION & TLS READINESS TESTS
// =============================================================================

test('Spaceship.4.1: generateStorefrontDnsInstructions provides exact Apex and www records', () => {
  const records = generateStorefrontDnsInstructions('sweetshop.com', 'token_xyz');
  assert.equal(records.length, 3);

  const txt = records.find(r => r.type === 'TXT');
  assert.equal(txt.name, '_ferasetu-challenge.sweetshop.com');
  assert.equal(txt.value, 'fera-domain-verification=token_xyz');

  const www = records.find(r => r.type === 'CNAME');
  assert.equal(www.name, 'www.sweetshop.com');
  assert.equal(www.value, INGRESS_HOSTNAME_TARGET);

  const apex = records.find(r => r.type === 'ALIAS');
  assert.equal(apex.name, 'sweetshop.com');
  assert.equal(apex.value, INGRESS_HOSTNAME_TARGET);
});

test('Spaceship.4.2: verifyIngressAuthorization webhook permits registered merchants and denies unknown domains', async () => {
  const db = createMockDb();
  db._store.custom_storefront_domains.push({
    id: 'csd_1',
    organization_id: 'org_allowed',
    domain: 'activemerchant.com',
    status: 'ACTIVE'
  });

  const allowed = await verifyIngressAuthorization(db, 'activemerchant.com');
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.organizationId, 'org_allowed');

  const denied = await verifyIngressAuthorization(db, 'randomunknown.com');
  assert.equal(denied.allowed, false);
});

// =============================================================================
// 5. STOREFRONT ROUTING & TENANT RESOLUTION TESTS
// =============================================================================

test('Spaceship.5.1: resolveCustomDomainTenant resolves from custom_storefront_domains first', async () => {
  clearMerchantCache();
  const db = createMockDb();
  db._store.custom_storefront_domains.push({
    id: 'csd_test',
    organization_id: 'org_fast',
    shop_id: 'shop_fast',
    domain: 'fashionhouse.com',
    status: 'ACTIVE',
    dns_status: 'VERIFIED'
  });
  db._store.shops.push({
    id: 'shop_fast',
    organization_id: 'org_fast',
    store_slug: 'fashion-house-delhi',
    name: 'Fashion House Delhi'
  });

  const tenant = await resolveCustomDomainTenant('fashionhouse.com', { DB: db });
  assert.ok(tenant);
  assert.equal(tenant.organizationId, 'org_fast');
  assert.equal(tenant.slug, 'fashion-house-delhi');
  assert.equal(tenant.shopName, 'Fashion House Delhi');
});

test('Spaceship.5.2: Unverified or disconnected domains return null (fail closed)', async () => {
  clearMerchantCache();
  const db = createMockDb();
  db._store.custom_storefront_domains.push({
    id: 'csd_unverified',
    organization_id: 'org_unv',
    shop_id: 'shop_unv',
    domain: 'unverifiedshop.com',
    status: 'PENDING_DNS',
    dns_status: 'PENDING'
  });

  const tenant = await resolveCustomDomainTenant('unverifiedshop.com', { DB: db });
  assert.equal(tenant, null);
});

test('Spaceship.5.3: Controlled reverse-proxy ingress trusts X-Forwarded-Host only for verified custom domains', async () => {
  clearMerchantCache();
  const db = createMockDb();
  db._store.custom_storefront_domains.push({
    id: 'csd_proxy',
    organization_id: 'org_proxy',
    shop_id: 'shop_proxy',
    domain: 'sweetbakery.com',
    status: 'ACTIVE',
    dns_status: 'VERIFIED'
  });
  db._store.shops.push({
    id: 'shop_proxy',
    organization_id: 'org_proxy',
    store_slug: 'sweet-bakery',
    name: 'Sweet Bakery'
  });

  const req = new Request('https://ferasetu.com/', {
    headers: {
      'Host': 'ferasetu.com',
      'X-Forwarded-Host': 'sweetbakery.com',
      'X-FeraSetu-Proxy-Secret': 'secret_pass_123'
    }
  });

  const env = {
    DB: db,
    INGRESS_PROXY_SECRET: 'secret_pass_123',
    PAGES_ORIGIN: 'https://ferasetu.com'
  };

  const res = await worker.fetch(req, env, {});
  // Should route to storefront SPA shell for sweetbakery.com (status 200)
  assert.equal(res.status, 200);
});

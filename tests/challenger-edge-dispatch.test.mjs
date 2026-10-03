// Challenger 2 Empirical Test Suite: Storefront Edge Resolution & Route Dispatching
// ==============================================================================
// Tests:
// 1. classifyHostname against root, subdomains, custom domains, and edge cases
// 2. Custom domain edge resolution and 404 behavior for unverified/unknown domains
// 3. Platform route collision resistance
// 4. Storefront API context resolution on custom domains
// 5. CORS origin evaluation for custom and arbitrary external domains

import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../worker/index.js';
import {
  classifyHostname,
  resolveCustomDomainTenant,
  isValidMerchantSlug,
  isStaticAsset,
  BASE_DOMAINS,
  RESERVED_SUBDOMAINS,
  clearMerchantCache,
} from '../worker/storefront.js';

// ---------------------------------------------------------------------------
// Mock D1 Database
// ---------------------------------------------------------------------------
function createMockDb() {
  const emailDomains = new Map();
  const users = new Map();
  const shops = new Map();
  const organizations = new Map();

  return {
    _emailDomains: emailDomains,
    _users: users,
    _shops: shops,
    _organizations: organizations,

    prepare(query) {
      const q = query.trim().replace(/\s+/g, ' ');

      return {
        bind(...args) {
          return {
            async first() {
              // 1. resolveCustomDomainTenant primary query (email_domains join shops join users)
              if (q.includes('FROM email_domains ed') && q.includes("ed.verification_status = 'VERIFIED'")) {
                const domain = args[0];
                const dom = emailDomains.get(domain);
                if (dom && dom.verification_status === 'VERIFIED') {
                  const shop = shops.get(dom.organization_id) || {};
                  const user = users.get(dom.organization_id) || {};
                  return {
                    id: dom.id,
                    organization_id: dom.organization_id,
                    domain: dom.domain,
                    verification_status: dom.verification_status,
                    shop_id: shop.id || null,
                    store_slug: shop.store_slug || null,
                    shop_name: shop.name || null,
                    user_id: user.id || null,
                    subdomain: user.subdomain || null,
                    business_name: user.business_name || null,
                  };
                }
                return null;
              }

              // 2. resolveCustomDomainTenant fallback query (users where LOWER(custom_domain) = ?)
              if (q.includes('FROM users WHERE LOWER(custom_domain) = ?')) {
                const domain = args[0];
                for (const u of users.values()) {
                  if ((u.custom_domain || '').toLowerCase() === domain) {
                    return {
                      id: u.id,
                      organization_id: u.organization_id || u.id,
                      subdomain: u.subdomain,
                      business_name: u.business_name,
                    };
                  }
                }
                return null;
              }

              // 3. resolveTenantContext / resolveStorefrontTenant: shops by hostname or store_slug
              if (q.includes('FROM shops WHERE hostname = ? OR store_slug = ?')) {
                const [h, s] = args;
                for (const sh of shops.values()) {
                  if (sh.hostname === h || sh.store_slug === s) return sh;
                }
                return null;
              }
              if (q.includes('FROM shops WHERE hostname = ?')) {
                const h = args[0];
                for (const sh of shops.values()) {
                  if (sh.hostname === h) return sh;
                }
                return null;
              }

              // 4. email_domains by domain and VERIFIED status
              if (q.includes('SELECT organization_id FROM email_domains WHERE domain = ? AND verification_status = \'VERIFIED\'')) {
                const d = args[0];
                const dom = emailDomains.get(d);
                if (dom && dom.verification_status === 'VERIFIED') {
                  return { organization_id: dom.organization_id };
                }
                return null;
              }

              // 5. shops by organization_id
              if (q.includes('FROM shops WHERE organization_id = ?')) {
                const orgId = args[0];
                for (const sh of shops.values()) {
                  if (sh.organization_id === orgId) return sh;
                }
                return null;
              }

              // 6. organizations by id or store_slug
              if (q.includes('FROM organizations WHERE')) {
                const val = args[0];
                for (const org of organizations.values()) {
                  if (org.id === val || org.store_slug === val) return org;
                }
                return null;
              }

              // 7. users storefront query
              if (q.includes('FROM users u') && q.includes('WHERE u.subdomain = ? OR u.hostname = ?')) {
                const [sub, host] = args;
                for (const u of users.values()) {
                  if (u.subdomain === sub || u.hostname === host) {
                    return {
                      id: u.id,
                      business_name: u.business_name || u.name,
                      name: u.name,
                      subdomain: u.subdomain,
                      hostname: u.hostname,
                      is_blocked: u.is_blocked || 0,
                      plan: u.plan || 'business',
                      market: 'IN',
                      is_published: 1,
                    };
                  }
                }
                return null;
              }

              // 8. products count
              if (q.includes('SELECT COUNT(*) as cnt FROM products')) {
                return { cnt: 5 };
              }

              return null;
            },
            async all() {
              return { results: [] };
            },
            async run() {
              return { success: true };
            }
          };
        }
      };
    }
  };
}

// ===========================================================================
// SECTION 1: classifyHostname Comprehensive Matrix Tests
// ===========================================================================

test('1.1 classifyHostname correctly classifies platform root apex domains', () => {
  for (const base of BASE_DOMAINS) {
    const res = classifyHostname(base);
    assert.equal(res.type, 'platform_root', `Expected platform_root for ${base}`);
    assert.equal(res.domain, base);

    // Case insensitivity
    const upperRes = classifyHostname(base.toUpperCase());
    assert.equal(upperRes.type, 'platform_root', `Expected case-insensitive platform_root for ${base}`);

    // Whitespace handling
    const paddedRes = classifyHostname(`  ${base}  `);
    assert.equal(paddedRes.type, 'platform_root', `Expected trimmed platform_root for ${base}`);
  }
});

test('1.2 classifyHostname correctly classifies all platform reserved subdomains', () => {
  for (const base of BASE_DOMAINS) {
    for (const sub of RESERVED_SUBDOMAINS) {
      const host = `${sub}.${base}`;
      const res = classifyHostname(host);

      if (sub === 'api') {
        assert.equal(res.type, 'api', `api.${base} must classify as api`);
        assert.equal(res.subdomain, 'api');
      } else {
        assert.equal(res.type, 'platform_reserved', `${sub}.${base} must classify as platform_reserved`);
        assert.equal(res.subdomain, sub);
      }
      assert.equal(res.domain, base);
    }
  }
});

test('1.3 classifyHostname classifies single-label merchant subdomains correctly', () => {
  const merchants = [
    'rohankirana',
    'sharma-sweets',
    'fashion-hub-mumbai-mh-1',
    'store123',
  ];

  for (const m of merchants) {
    const res = classifyHostname(`${m}.ferasetu.com`);
    assert.equal(res.type, 'merchant', `${m}.ferasetu.com should be merchant`);
    assert.equal(res.slug, m);
    assert.equal(res.subdomain, m);
    assert.equal(res.domain, 'ferasetu.com');

    // On secondary base domain
    const res2 = classifyHostname(`${m}.fera-search.tech`);
    assert.equal(res2.type, 'merchant');
    assert.equal(res2.slug, m);
    assert.equal(res2.domain, 'fera-search.tech');
  }
});

test('1.4 classifyHostname disallows nested subdomains under base domains', () => {
  const nested = [
    'sub.store.ferasetu.com',
    'a.b.c.ferasetu.com',
    'api.merchant.ferasetu.com',
    'www.shop.fera-search.tech',
  ];

  for (const h of nested) {
    const res = classifyHostname(h);
    assert.equal(res.type, 'unknown_host', `${h} should be rejected as unknown_host`);
    assert.equal(res.reason, 'nested_subdomain');
  }
});

test('1.5 classifyHostname classifies valid external domains as custom_domain', () => {
  const customDomains = [
    'rohankirana.in',
    'www.rohankirana.in',
    'shop.brand.com',
    'my-boutique.co.in',
    'store.delhi-market.org',
    'ferasetu.net', // not in BASE_DOMAINS
    'ferasetu.org', // not in BASE_DOMAINS
  ];

  for (const cd of customDomains) {
    const res = classifyHostname(cd);
    assert.equal(res.type, 'custom_domain', `${cd} must be classified as custom_domain`);
    assert.equal(res.host, cd);
  }
});

test('1.6 classifyHostname handles local development and Worker domains', () => {
  assert.equal(classifyHostname('localhost').type, 'api');
  assert.equal(classifyHostname('127.0.0.1').type, 'api');
  assert.equal(classifyHostname('ferasetu-worker.himanshu.workers.dev').type, 'api');
});

test('1.7 classifyHostname handles malformed, empty, and edge inputs safely', () => {
  assert.equal(classifyHostname(null).type, 'unknown_host');
  assert.equal(classifyHostname(undefined).type, 'unknown_host');
  assert.equal(classifyHostname('').type, 'unknown_host');
  assert.equal(classifyHostname(12345).type, 'unknown_host');
  assert.equal(classifyHostname({}).type, 'unknown_host');
  assert.equal(classifyHostname('singleword').type, 'unknown_host'); // no dot
  assert.equal(classifyHostname('.leadingdot.com').type, 'unknown_host'); // starts with dot
  assert.equal(classifyHostname('trailingdot.com.').type, 'unknown_host'); // ends with dot
});

// ===========================================================================
// SECTION 2: Platform Route Collision & Custom Domain Isolation
// ===========================================================================

test('2.1 Base platform domains and subdomains can NEVER be classified as custom_domain', () => {
  const platformHosts = [
    'ferasetu.com',
    'fera-search.tech',
    'api.ferasetu.com',
    'www.ferasetu.com',
    'app.ferasetu.com',
    'admin.ferasetu.com',
    'cdn.ferasetu.com',
    'mail.ferasetu.com',
    'shop1.ferasetu.com',
  ];

  for (const host of platformHosts) {
    const res = classifyHostname(host);
    assert.notEqual(res.type, 'custom_domain', `${host} must NOT be classified as custom_domain`);
  }
});

test('2.2 Attacker attempting to use ferasetu.com as custom domain suffix does not collide', () => {
  // E.g. attacker domain ferasetu.com.attacker.com
  const attackerHost = 'ferasetu.com.attacker.com';
  const res = classifyHostname(attackerHost);
  assert.equal(res.type, 'custom_domain');
  assert.equal(res.host, attackerHost);
  // It is classified as custom_domain (which requires D1 verification for attacker.com), never platform_root
  assert.notEqual(res.type, 'platform_root');
});

// ===========================================================================
// SECTION 3: Storefront Edge Resolution & Route Dispatching (End-to-End)
// ===========================================================================

test('3.1 Verified custom domain GET / resolves tenant and serves Storefront SPA', async () => {
  const mockDb = createMockDb();
  mockDb._emailDomains.set('rohankirana.in', {
    id: 'dom-1',
    organization_id: 'org-rohan',
    domain: 'rohankirana.in',
    verification_status: 'VERIFIED',
  });
  mockDb._shops.set('org-rohan', {
    id: 'shop-rohan',
    organization_id: 'org-rohan',
    store_slug: 'rohan-kirana-store',
    name: 'Rohan Kirana Store',
    hostname: 'rohankirana.in',
  });
  mockDb._users.set('org-rohan', {
    id: 'user-rohan',
    organization_id: 'org-rohan',
    subdomain: 'rohan-kirana-store',
    business_name: 'Rohan Kirana Store',
  });

  const env = {
    DB: mockDb,
    PAGES_ORIGIN: 'https://ferasetu.com',
  };

  const req = new Request('https://rohankirana.in/', {
    method: 'GET',
    headers: { 'Host': 'rohankirana.in' },
  });

  const res = await worker.fetch(req, env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(res.headers.get('Cache-Control'), 'private, no-cache, no-store, must-revalidate');

  const text = await res.text();
  assert.ok(text.includes('<title>Rohan Kirana Store</title>'), 'SPA title should reflect custom domain store name');
});

test('3.2 Unverified / unknown custom domain GET / returns 404 Domain not configured', async () => {
  const mockDb = createMockDb();
  // Domain exists in DB but is PENDING, NOT VERIFIED
  mockDb._emailDomains.set('pendingstore.in', {
    id: 'dom-pending',
    organization_id: 'org-pending',
    domain: 'pendingstore.in',
    verification_status: 'PENDING',
  });

  const env = { DB: mockDb };

  // 1. Pending domain
  const req1 = new Request('https://pendingstore.in/', {
    method: 'GET',
    headers: { 'Host': 'pendingstore.in' },
  });
  const res1 = await worker.fetch(req1, env, {});
  assert.equal(res1.status, 404);
  const text1 = await res1.text();
  assert.equal(text1, 'Domain not configured');
  assert.equal(res1.headers.get('X-Robots-Tag'), 'noindex, nofollow');

  // 2. Completely unknown domain
  const req2 = new Request('https://completelyunknown.com/', {
    method: 'GET',
    headers: { 'Host': 'completelyunknown.com' },
  });
  const res2 = await worker.fetch(req2, env, {});
  assert.equal(res2.status, 404);
  const text2 = await res2.text();
  assert.equal(text2, 'Domain not configured');
});

test('3.3 Security.txt endpoint responds on custom domains deterministically', async () => {
  const env = { DB: createMockDb() };
  const req = new Request('https://rohankirana.in/.well-known/security.txt', {
    method: 'GET',
    headers: { 'Host': 'rohankirana.in' },
  });

  const res = await worker.fetch(req, env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'text/plain; charset=utf-8');
  const body = await res.text();
  assert.ok(body.includes('Contact: mailto:security@ferasetu.com'));
});

test('3.4 Reserved platform subdomain access behavior', async () => {
  const env = { DB: createMockDb() };

  // admin.ferasetu.com -> 404 Reserved platform subdomain
  const reqAdmin = new Request('https://admin.ferasetu.com/', {
    method: 'GET',
    headers: { 'Host': 'admin.ferasetu.com' },
  });
  const resAdmin = await worker.fetch(reqAdmin, env, {});
  assert.equal(resAdmin.status, 404);
  const bodyAdmin = await resAdmin.text();
  assert.equal(bodyAdmin, 'Reserved platform subdomain');

  // cdn.ferasetu.com -> handled by media CDN gateway
  const reqCdn = new Request('https://cdn.ferasetu.com/media/file-123.jpg', {
    method: 'GET',
    headers: { 'Host': 'cdn.ferasetu.com' },
  });
  const resCdn = await worker.fetch(reqCdn, env, {});
  // CDN gateway executes without throwing
  assert.ok(resCdn.status !== 500);
});

test('3.5 CORS Preflight on custom domain responds with 204 and CORS headers', async () => {
  const env = { DB: createMockDb() };
  const req = new Request('https://rohankirana.in/api/storefront/customer/me', {
    method: 'OPTIONS',
    headers: {
      'Host': 'rohankirana.in',
      'Origin': 'https://rohankirana.in',
      'Access-Control-Request-Method': 'GET',
    },
  });

  const res = await worker.fetch(req, env, {});
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://rohankirana.in');
  assert.equal(res.headers.get('Access-Control-Allow-Credentials'), 'true');
});

// ===========================================================================
// SECTION 4: Empirical Edge Case & Vulnerability Investigations
// ===========================================================================

test('4.1 Adversarial check: Does isOriginAllowed permit arbitrary external origins?', async () => {
  // Verify that an arbitrary external origin is NOT reflected and falls back to ferasetu.com
  const env = { DB: createMockDb() };
  const req = new Request('https://ferasetu.com/api/health', {
    method: 'OPTIONS',
    headers: {
      'Host': 'ferasetu.com',
      'Origin': 'https://evil-phishing-attacker.com',
      'Access-Control-Request-Method': 'GET',
    },
  });

  const res = await worker.fetch(req, env, {});
  const allowOrigin = res.headers.get('Access-Control-Allow-Origin');

  console.log(`[Remediated Check] CORS Access-Control-Allow-Origin for evil-phishing-attacker.com: ${allowOrigin}`);
  assert.notEqual(allowOrigin, 'https://evil-phishing-attacker.com', 'Hostile arbitrary origin must never be reflected');
  assert.equal(allowOrigin, 'https://ferasetu.com', 'Fallback must be https://ferasetu.com');
});

test('4.2 Storefront context resolution on custom domain: /api/storefront/customer/me', async () => {
  const mockDb = createMockDb();
  mockDb._emailDomains.set('rohankirana.in', {
    id: 'dom-1',
    organization_id: 'org-rohan',
    domain: 'rohankirana.in',
    verification_status: 'VERIFIED',
  });
  mockDb._shops.set('org-rohan', {
    id: 'shop-rohan',
    organization_id: 'org-rohan',
    store_slug: 'rohan-kirana',
    name: 'Rohan Kirana Store',
    hostname: 'rohankirana.in',
  });

  const env = { DB: mockDb };

  // A customer makes a request from the storefront on rohankirana.in to /api/storefront/customer/me
  const req = new Request('https://rohankirana.in/api/storefront/customer/me', {
    method: 'GET',
    headers: {
      'Host': 'rohankirana.in',
      'Referer': 'https://rohankirana.in/account',
    },
  });

  const res = await worker.fetch(req, env, {});
  const body = await res.json();
  console.log(`[Remediated Check] /api/storefront/customer/me status on custom domain: ${res.status}, body:`, body);

  assert.equal(res.status, 200, 'Custom domain storefront orgId must resolve, returning 200 for guest me without throwing 400');
  assert.equal(body.authenticated, false);
});

test('4.3 Slug fallback sanitizes underscores in organization_id', async () => {
  const mockDb = createMockDb();
  mockDb._emailDomains.set('custom-store.in', {
    id: 'dom-2',
    organization_id: 'org_underscored_123',
    domain: 'custom-store.in',
    verification_status: 'VERIFIED',
  });
  const env = { DB: mockDb };
  const tenant = await resolveCustomDomainTenant('custom-store.in', env);
  assert.ok(tenant);
  assert.equal(tenant.slug, 'org-underscored-123');
  assert.ok(isValidMerchantSlug(tenant.slug), 'Sanitized slug must pass isValidMerchantSlug');
});

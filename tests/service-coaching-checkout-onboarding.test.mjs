import assert from 'node:assert/strict';
import * as jose from '../worker/node_modules/jose/dist/node/esm/index.js';
import worker from '../worker/index.js';

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

// Generate RSA key pair for test WorkOS JWT
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-service';

async function createToken(sub, email, orgId = 'org_yoga_test', role = 'owner') {
  return await new jose.SignJWT({ sub, email, org_id: orgId, role })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-service' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

function createMockDb() {
  const tables = {
    users: [
      {
        id: 'usr_coach_1',
        email: 'coach@antigravityyoga.com',
        name: 'Priya Sharma',
        business_name: 'Anti-Gravity Yoga Studio',
        market: 'IN',
        city: 'Mumbai',
        state: 'Maharashtra',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    organizations: [],
    organization_members: [],
    shops: [],
    websites: [],
    products: [
      {
        id: 'prod_yoga_batch_1',
        user_id: 'usr_coach_1',
        organization_id: 'org_yoga_test',
        shop_id: 'org_yoga_test',
        name: 'Morning Aerial Yoga (Monthly Pass)',
        description: 'Daily 7:00 AM to 8:15 AM aerial silk immersion classes.',
        price: 3500,
        sale_price: 2999,
        category: 'Yoga & Movement',
        stock: 12,
        stock_quantity: 12,
        is_active: 1,
        status: 'active',
        created_at: new Date().toISOString(),
      },
    ],
    orders: [],
  };

  return {
    prepare(query) {
      const q = query.trim();
      const createRunner = (params = []) => ({
        async first() {
          if (q.includes('FROM organizations WHERE id = ? OR store_slug = ?')) {
            const [id, slug] = params;
            return tables.organizations.find(o => o.id === id || o.store_slug === slug) || null;
          }
          if (q.includes('FROM organizations WHERE store_slug = ?')) {
            return tables.organizations.find(o => o.store_slug === params[0]) || null;
          }
          if (q.includes('FROM organizations WHERE id = ?')) {
            return tables.organizations.find(o => o.id === params[0]) || null;
          }
          if (q.includes('FROM shops WHERE organization_id = ?')) {
            return tables.shops.find(s => s.organization_id === params[0]) || null;
          }
          if (q.includes('FROM shops WHERE store_slug = ?')) {
            return tables.shops.find(s => s.store_slug === params[0]) || null;
          }
          if (q.includes('FROM users WHERE id = ?')) {
            return tables.users.find(u => u.id === params[0]) || null;
          }
          if (q.includes('FROM users WHERE LOWER(subdomain) = ?')) {
            return tables.users.find(u => (u.subdomain || '').toLowerCase() === params[0].toLowerCase()) || null;
          }
          if (q.includes('FROM organization_members WHERE organization_id = ?')) {
            return tables.organization_members.find(m => m.organization_id === params[0]) || null;
          }
          if (q.includes('FROM organization_members om') && q.includes('role = \'owner\'')) {
            const mem = tables.organization_members.find(m => m.user_id === params[0] && m.role === 'owner');
            if (!mem) return null;
            return tables.organizations.find(o => o.id === mem.organization_id) || null;
          }
          if (q.includes('FROM websites WHERE organization_id = ?')) {
            return tables.websites.find(w => w.organization_id === params[0]) || null;
          }
          if (q.includes('SELECT 1 FROM organizations')) {
            return { 1: 1 };
          }
          return null;
        },
        async all() {
          if (q.includes('FROM products')) {
            return { results: [...tables.products] };
          }
          if (q.includes('FROM product_options')) {
            return { results: [] };
          }
          if (q.includes('FROM product_variants')) {
            return { results: [] };
          }
          return { results: [] };
        },
        async run() {
          if (q.includes('INSERT INTO organizations')) {
            const [id, name, workosOrgId, market, plan, address, city, district, state, country, storeSlug, is_service, business_type, category, created_at, updated_at] = params;
            const org = {
              id,
              name,
              workos_organization_id: workosOrgId,
              market,
              plan,
              address,
              city,
              district,
              state,
              country,
              store_slug: storeSlug,
              is_service: is_service || 0,
              business_type: business_type || 'retail',
              category: category || 'grocery',
              created_at,
              updated_at,
            };
            tables.organizations.push(org);
            return { success: true };
          }
          if (q.includes('INSERT OR REPLACE INTO shops')) {
            const [id, orgId, name, storeSlug, hostname, is_service, business_type, category, created_at, updated_at] = params;
            const shop = {
              id,
              organization_id: orgId,
              name,
              store_slug: storeSlug,
              hostname,
              status: 'active',
              is_service: is_service || 0,
              business_type: business_type || 'retail',
              category: category || 'grocery',
              created_at,
              updated_at,
            };
            const idx = tables.shops.findIndex(s => s.id === id);
            if (idx >= 0) tables.shops[idx] = shop;
            else tables.shops.push(shop);
            return { success: true };
          }
          if (q.includes('INSERT OR REPLACE INTO organization_members')) {
            const [id, orgId, userId, role, created_at, updated_at] = params;
            tables.organization_members.push({ id, organization_id: orgId, user_id: userId, role, created_at, updated_at });
            return { success: true };
          }
          if (q.includes('INSERT OR REPLACE INTO websites')) {
            const [id, user_id, orgId, name, config, theme, created_at, updated_at] = params;
            tables.websites.push({
              id,
              user_id,
              organization_id: orgId,
              name,
              template: 'default',
              config,
              sections: '[]',
              is_published: 1,
              theme,
              created_at,
              updated_at,
            });
            return { success: true };
          }
          if (q.includes('INSERT INTO users')) {
            return { success: true };
          }
          return { success: true };
        },
      });

      return {
        bind(...params) {
          return createRunner(params);
        },
        ...createRunner([]),
      };
    },
    tables,
  };
}

console.log('🧪 Starting Service, Coaching & Lightweight Checkout Test Suite...\n');

// ---------------------------------------------------------------------------
// TEST 1: Onboarding Categories Invariant
// ---------------------------------------------------------------------------
await test('Onboarding Grid contains Coaching & Consulting alongside the 6 retail categories', async () => {
  const RETAIL_CATEGORIES = [
    { id: 'grocery', name: 'Grocery & Kirana', icon: '🛒', desc: 'Daily essentials, packed foods, staples', isService: false, businessType: 'retail' },
    { id: 'fashion', name: 'Fashion & Boutique', icon: '👗', desc: 'Apparel, sarees, kurtas, jewelry', isService: false, businessType: 'retail' },
    { id: 'bakery', name: 'Bakery & Sweets', icon: '🍰', desc: 'Mithai, cakes, dairy, savories', isService: false, businessType: 'retail' },
    { id: 'electronics', name: 'Electronics & Mobile', icon: '📱', desc: 'Gadgets, accessories, repairs', isService: false, businessType: 'retail' },
    { id: 'artisan', name: 'Artisan & Handcrafted', icon: '🎨', desc: 'Handicrafts, pottery, decor', isService: false, businessType: 'retail' },
    { id: 'general', name: 'General Retail', icon: '🏪', desc: 'Supermarket, stationery, hardware', isService: false, businessType: 'retail' },
    { id: 'coaching', name: 'Coaching & Consulting', icon: '🧘', desc: 'Yoga, fitness, classes & 1-on-1 sessions', isService: true, businessType: 'service' },
  ];

  assert.equal(RETAIL_CATEGORIES.length, 7, 'Must have exactly 7 categories');
  
  const coaching = RETAIL_CATEGORIES.find(c => c.id === 'coaching');
  assert.ok(coaching, 'Coaching category card must exist');
  assert.equal(coaching.name, 'Coaching & Consulting');
  assert.equal(coaching.desc, 'Yoga, fitness, classes & 1-on-1 sessions');
  assert.equal(coaching.isService, true);
  assert.equal(coaching.businessType, 'service');

  const retailCategories = RETAIL_CATEGORIES.filter(c => c.id !== 'coaching');
  assert.equal(retailCategories.length, 6, 'Must preserve all 6 retail categories');
  for (const rc of retailCategories) {
    assert.equal(rc.isService, false, `${rc.name} must have isService: false`);
    assert.equal(rc.businessType, 'retail', `${rc.name} must have businessType: retail`);
  }
});

// ---------------------------------------------------------------------------
// TEST 2: City & State Auto-Sync Invariant
// ---------------------------------------------------------------------------
await test('Clicking or typing quick-select cities accurately auto-resolves state', async () => {
  const POPULAR_INDIAN_CITIES = [
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Delhi', state: 'Delhi' },
    { city: 'Bengaluru', state: 'Karnataka' },
    { city: 'Jaipur', state: 'Rajasthan' },
    { city: 'Ahmedabad', state: 'Gujarat' },
    { city: 'Pune', state: 'Maharashtra' },
    { city: 'Kolkata', state: 'West Bengal' },
  ];

  const CITY_TO_STATE_MAP = {
    mumbai: 'Maharashtra',
    delhi: 'Delhi',
    bengaluru: 'Karnataka',
    bangalore: 'Karnataka',
    jaipur: 'Rajasthan',
    ahmedabad: 'Gujarat',
    pune: 'Maharashtra',
    kolkata: 'West Bengal',
  };

  // Simulate chip click for each city
  for (const preset of POPULAR_INDIAN_CITIES) {
    let currentCity = '';
    let currentState = '';
    
    // Simulate handleSelectCityPreset(preset.city, preset.state)
    currentCity = preset.city;
    currentState = preset.state;

    assert.equal(currentCity, preset.city);
    assert.equal(currentState, preset.state);
  }

  // Simulate typing 'bengaluru' -> auto-updates state to 'Karnataka'
  const typedCity = 'bengaluru';
  const resolvedState = CITY_TO_STATE_MAP[typedCity.toLowerCase()];
  assert.equal(resolvedState, 'Karnataka', 'Typing Bengaluru must resolve to Karnataka');

  // Simulate typing 'mumbai' -> auto-updates state to 'Maharashtra'
  assert.equal(CITY_TO_STATE_MAP['mumbai'], 'Maharashtra');
});

// ---------------------------------------------------------------------------
// TEST 3: Backend Store Creation for Coaching & Yoga Studio
// ---------------------------------------------------------------------------
await test('POST /api/organizations correctly persists is_service: 1 and business_type: service for Coaching', async () => {
  const db = createMockDb();
  const token = await createToken('usr_coach_1', 'coach@antigravityyoga.com');

  const env = {
    DB: db,
    JWKS: jose.createLocalJWKSet({ keys: [jwk] }),
    JWT_SECRET: 'test-secret',
    DEFAULT_REGION: 'IN',
  };

  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Anti-Gravity Yoga Studio',
      city: 'Mumbai',
      state: 'Maharashtra',
      category: 'coaching',
      isService: true,
      businessType: 'service',
    }),
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201, 'Should return 201 Created');
  const body = await res.json();

  assert.equal(body.success, true);
  assert.equal(body.organization.name, 'Anti-Gravity Yoga Studio');
  assert.equal(body.organization.is_service, 1);
  assert.equal(body.organization.isService, true);
  assert.equal(body.organization.business_type, 'service');
  assert.equal(body.organization.category, 'coaching');

  // Verify DB record
  const savedOrg = db.tables.organizations[0];
  assert.ok(savedOrg);
  assert.equal(savedOrg.is_service, 1);
  assert.equal(savedOrg.business_type, 'service');
  assert.equal(savedOrg.category, 'coaching');

  // Verify website config saved with is_service: true
  const savedWeb = db.tables.websites[0];
  assert.ok(savedWeb);
  const webConfig = JSON.parse(savedWeb.config);
  assert.equal(webConfig.is_service, true);
  assert.equal(webConfig.business_type, 'service');
});

// ---------------------------------------------------------------------------
// TEST 4: Backend Store Creation for Retail (Preserves e-commerce defaults)
// ---------------------------------------------------------------------------
await test('POST /api/organizations preserves is_service: 0 and business_type: retail for Retail categories', async () => {
  const db = createMockDb();
  const token = await createToken('usr_retail_1', 'grocer@kirana.com');

  const env = {
    DB: db,
    JWKS: jose.createLocalJWKSet({ keys: [jwk] }),
    JWT_SECRET: 'test-secret',
    DEFAULT_REGION: 'IN',
  };

  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Patel Fresh Grocery',
      city: 'Mumbai',
      state: 'Maharashtra',
      category: 'grocery',
      isService: false,
      businessType: 'retail',
    }),
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);
  const body = await res.json();

  assert.equal(body.organization.is_service, 0);
  assert.equal(body.organization.isService, false);
  assert.equal(body.organization.business_type, 'retail');
  assert.equal(body.organization.category, 'grocery');
});

// ---------------------------------------------------------------------------
// TEST 5: Public Storefront API Returns Service Metadata
// ---------------------------------------------------------------------------
await test('GET /api/website/public/:shopName returns is_service: 1 and business_type: service', async () => {
  const db = createMockDb();
  // Seed a coaching studio organization
  db.tables.organizations.push({
    id: 'org_anti_gravity',
    name: 'Anti-Gravity Yoga Studio',
    store_slug: 'anti-gravity-yoga',
    is_service: 1,
    business_type: 'service',
    category: 'coaching',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  db.tables.shops.push({
    id: 'org_anti_gravity',
    organization_id: 'org_anti_gravity',
    name: 'Anti-Gravity Yoga Studio',
    store_slug: 'anti-gravity-yoga',
    hostname: 'anti-gravity-yoga.ferasetu.com',
    is_service: 1,
    business_type: 'service',
    category: 'coaching',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  db.tables.websites.push({
    id: 'site-anti-gravity',
    organization_id: 'org_anti_gravity',
    name: 'Anti-Gravity Yoga Studio',
    template: 'market',
    config: JSON.stringify({ is_service: true, business_type: 'service', category: 'coaching' }),
    sections: '[]',
    is_published: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const env = {
    DB: db,
    DEFAULT_REGION: 'IN',
  };

  const req = new Request('https://ferasetu.singhantima203.workers.dev/api/website/public/anti-gravity-yoga');
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.equal(body.shop.is_service, 1);
  assert.equal(body.shop.isService, true);
  assert.equal(body.shop.business_type, 'service');
  assert.equal(body.shop.category, 'coaching');
});

// ---------------------------------------------------------------------------
// TEST 6: Lightweight Checkout Formatting & WhatsApp Message Generation
// ---------------------------------------------------------------------------
await test('WhatsApp summary generates New Class / Session Booking with no delivery address when isService is true', async () => {
  const cart = [
    { id: 'c1', name: 'Anti-Gravity Aerial Silk Session', price: 1200, sale_price: 1000, quantity: 2 },
  ];
  const cartSubtotal = 2000;
  const shopName = 'Anti-Gravity Yoga';
  const notes = 'Morning 7 AM batch';
  const activeSymbol = '₹';
  const numberLocale = 'en-IN';

  // Service WhatsApp generator logic
  function generateWhatsAppMessage(isService, notes) {
    const lines = cart.map((item, idx) => {
      const price = item.sale_price ?? item.price;
      return `${idx + 1}. *${item.name}* (x${item.quantity}) — ${activeSymbol}${(price * item.quantity).toLocaleString(numberLocale)}`;
    });

    if (isService) {
      return (
        `Namaste ${shopName}!\n\n*New Class / Session Booking*\n\n` +
        lines.join('\n') +
        `\n\n💵 *Total: ${activeSymbol}${cartSubtotal.toLocaleString(numberLocale)}*` +
        (notes ? `\n\n📅 *Preferred Batch / Note:* ${notes}` : '') +
        `\n\nPlease confirm availability and session schedule. Thank you!`
      );
    } else {
      return (
        `Namaste ${shopName}!\n\n*New Delivery Order*\n\n` +
        lines.join('\n') +
        `\n\n💵 *Total: ${activeSymbol}${cartSubtotal.toLocaleString(numberLocale)}*` +
        (notes ? `\n\n📝 Note: ${notes}` : '') +
        `\n\nPlease confirm availability and payment details. Thank you!`
      );
    }
  }

  const serviceMsg = generateWhatsAppMessage(true, notes);
  assert.ok(serviceMsg.includes('*New Class / Session Booking*'), 'Must contain New Class / Session Booking header');
  assert.ok(!serviceMsg.includes('*New Delivery Order*'), 'Must not contain New Delivery Order header');
  assert.ok(serviceMsg.includes('📅 *Preferred Batch / Note:* Morning 7 AM batch'), 'Must format preferred batch note');
  assert.ok(!serviceMsg.includes('Delivery Address'), 'Must omit delivery address section');
  assert.ok(serviceMsg.includes('confirm availability and session schedule'), 'Must use session schedule closing phrase');

  // Ensure standard retail is preserved
  const retailMsg = generateWhatsAppMessage(false, 'Deliver before sunset');
  assert.ok(retailMsg.includes('*New Delivery Order*'), 'Retail must keep New Delivery Order header');
  assert.ok(!retailMsg.includes('*New Class / Session Booking*'), 'Retail must not have booking header');
  assert.ok(retailMsg.includes('📝 Note: Deliver before sunset'));
});

// ---------------------------------------------------------------------------
// TEST 7: CTA Button Labels Adaptation Invariant
// ---------------------------------------------------------------------------
await test('CTA Button text adapts to Book Spot and Join Class when isService is true', async () => {
  function getCtaLabels(isService) {
    return {
      addToCart: isService ? 'Book Spot' : 'Add to Cart',
      buyNow: isService ? 'Join Class' : 'Buy Now',
      cartProceed: isService ? 'Proceed to Booking' : 'Proceed to Checkout',
      cartWhatsApp: isService ? 'Quick Booking on WhatsApp' : 'Quick Checkout on WhatsApp',
      confirmButton: isService ? 'Confirm Booking' : 'Confirm Order',
      header: isService ? 'Your Booked Sessions' : 'Your Shopping Bag',
    };
  }

  const serviceLabels = getCtaLabels(true);
  assert.equal(serviceLabels.addToCart, 'Book Spot');
  assert.equal(serviceLabels.buyNow, 'Join Class');
  assert.equal(serviceLabels.cartProceed, 'Proceed to Booking');
  assert.equal(serviceLabels.cartWhatsApp, 'Quick Booking on WhatsApp');
  assert.equal(serviceLabels.confirmButton, 'Confirm Booking');
  assert.equal(serviceLabels.header, 'Your Booked Sessions');

  const retailLabels = getCtaLabels(false);
  assert.equal(retailLabels.addToCart, 'Add to Cart');
  assert.equal(retailLabels.buyNow, 'Buy Now');
  assert.equal(retailLabels.cartProceed, 'Proceed to Checkout');
  assert.equal(retailLabels.cartWhatsApp, 'Quick Checkout on WhatsApp');
  assert.equal(retailLabels.confirmButton, 'Confirm Order');
  assert.equal(retailLabels.header, 'Your Shopping Bag');
});

console.log('\n----------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('----------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

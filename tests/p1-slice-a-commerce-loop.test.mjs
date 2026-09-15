import assert from 'node:assert/strict';
import * as jose from '../worker/node_modules/jose/dist/node/esm/index.js';
import worker, {
  resolveSellablePrice,
  registerShopSku,
  registerShopBarcode,
  generateOptionSignature,
  moneyAdd,
  moneySubtract,
  moneyMultiplyPercentageBps,
  formatMoney,
  migrateLegacyStock,
  backfillHistoricalOrderItems,
} from '../worker/index.js';
import { legacyFloatToMinorUnits } from '../worker/utils/money.js';

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

// In-Memory Multi-Tenant D1 Mock for Slice A Commerce Loop Verification
function createTestDb() {
  const tables = {
    users: [
      {
        id: 'usr_merchant_slice_a',
        email: 'merchant_a@example.com',
        name: 'Merchant Slice A',
        plan: 'growth',
        market: 'IN',
        ai_credits_balance: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr_merchant_shop_b',
        email: 'merchant_b@example.com',
        name: 'Merchant Shop B',
        plan: 'pro',
        market: 'IN',
        ai_credits_balance: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    organizations: [
      {
        id: 'org_slice_a',
        name: 'Slice A Organic Store',
        store_slug: 'organic-a',
        currency: 'INR',
        plan: 'growth',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'org_shop_b',
        name: 'Shop B Electronics',
        store_slug: 'shop-b',
        currency: 'INR',
        plan: 'pro',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    shops: [
      {
        id: 'shop_slice_a',
        organization_id: 'org_slice_a',
        store_slug: 'organic-a',
        name: 'Slice A Organic Store',
        hostname: 'organic-a.ferasetu.com',
        currency: 'INR',
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'shop_b',
        organization_id: 'org_shop_b',
        store_slug: 'shop-b',
        name: 'Shop B Electronics',
        hostname: 'shop-b.ferasetu.com',
        currency: 'INR',
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    organization_members: [
      {
        id: 'mem_slice_a',
        organization_id: 'org_slice_a',
        user_id: 'usr_merchant_slice_a',
        role: 'owner',
        created_at: new Date().toISOString(),
      },
      {
        id: 'mem_shop_b',
        organization_id: 'org_shop_b',
        user_id: 'usr_merchant_shop_b',
        role: 'owner',
        created_at: new Date().toISOString(),
      }
    ],
    locations: [],
    inventory_locations: [],
    inventory_movements: [],
    products: [],
    product_options: [],
    product_variants: [],
    shop_skus: [],
    shop_barcodes: [],
    orders: [],
    order_items: [],
    invoices: [],
    customers: [],
    customer_sessions: [],
  };

  return {
    tables,
    prepare(sql) {
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async first() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');

          if (s.includes('from users where id =')) {
            return tables.users.find(u => u.id === this._params[0]) || null;
          }
          if (s.includes('from organization_members om') && s.includes('join organizations o')) {
            const mem = tables.organization_members.find(m => m.user_id === this._params[0]);
            if (!mem) return null;
            const org = tables.organizations.find(o => o.id === mem.organization_id);
            if (!org) return null;
            return { ...org, member_role: mem.role, member_id: mem.id };
          }
          if (s.includes('from organization_members where organization_id = ? and user_id = ?')) {
            return tables.organization_members.find(m => m.organization_id === this._params[0] && m.user_id === this._params[1]) || null;
          }
          if (s.includes('from organizations where id = ? or store_slug = ?')) {
            return tables.organizations.find(o => o.id === this._params[0] || o.store_slug === this._params[1]) || null;
          }
          if (s.includes('from organizations where id = ?')) {
            return tables.organizations.find(o => o.id === this._params[0]) || null;
          }
          if (s.includes('from organizations where store_slug = ?')) {
            return tables.organizations.find(o => o.store_slug === this._params[0]) || null;
          }
          if (s.includes('from shops where id = ? or store_slug = ?')) {
            return tables.shops.find(sh => sh.id === this._params[0] || sh.store_slug === this._params[1]) || null;
          }
          if (s.includes('from shops where hostname = ? or store_slug = ?')) {
            return tables.shops.find(sh => sh.hostname === this._params[0] || sh.store_slug === this._params[1]) || null;
          }
          if (s.includes('from shops where organization_id = ?')) {
            return tables.shops.find(sh => sh.organization_id === this._params[0]) || null;
          }
          if (s.includes('from shop_skus where shop_id = ? and sku_normalized = ?')) {
            return tables.shop_skus.find(sk => sk.shop_id === this._params[0] && sk.sku_normalized === this._params[1]) || null;
          }
          if (s.includes('from shop_barcodes where shop_id = ? and barcode_normalized = ?')) {
            return tables.shop_barcodes.find(bc => bc.shop_id === this._params[0] && bc.barcode_normalized === this._params[1]) || null;
          }
          if (s.includes('from products where id = ? and (shop_id = ? or organization_id = ?)')) {
            return tables.products.find(p => p.id === this._params[0] && (p.shop_id === this._params[1] || p.organization_id === this._params[2])) || null;
          }
          if (s.includes('from products where id = ? and (organization_id = ? or (organization_id is null and user_id = ?))')) {
            return tables.products.find(p => p.id === this._params[0] && (p.organization_id === this._params[1] || (!p.organization_id && p.user_id === this._params[2]))) || null;
          }
          if (s.includes('from products where id = ? and organization_id = ?')) {
            return tables.products.find(p => p.id === this._params[0] && p.organization_id === this._params[1]) || null;
          }
          if (s.includes('from products where id = ?')) {
            return tables.products.find(p => p.id === this._params[0]) || null;
          }
          if (s.includes('from inventory_locations where organization_id = ? and product_id = ?')) {
            return tables.inventory_locations.find(il => il.organization_id === this._params[0] && il.product_id === this._params[1]) || null;
          }
          if (s.includes('from locations where organization_id = ?')) {
            return tables.locations.find(l => l.organization_id === this._params[0]) || null;
          }
          if (s.includes('count(*) as cnt from products')) {
            return { cnt: tables.products.length };
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');

          if (s.includes('from product_variants where product_id = ? and (shop_id = ? or organization_id = ?) and status = \'active\'')) {
            const [pId, shopId, orgId] = this._params;
            return {
              results: tables.product_variants.filter(v => v.product_id === pId && (v.shop_id === shopId || v.organization_id === orgId) && v.status === 'active')
            };
          }
          if (s.includes('from product_variants where product_id = ? and status = \'active\'')) {
            const pId = this._params[0];
            return {
              results: tables.product_variants.filter(v => v.product_id === pId && v.status === 'active')
            };
          }
          if (s.includes('from product_variants where product_id = ?')) {
            const pId = this._params[0];
            return {
              results: tables.product_variants.filter(v => v.product_id === pId)
            };
          }
          if (s.includes('from product_options where product_id = ?')) {
            const pId = this._params[0];
            return {
              results: tables.product_options.filter(o => o.product_id === pId)
            };
          }
          if (s.includes('from products where stock > 0 or stock_quantity > 0')) {
            return {
              results: tables.products.filter(p => (p.stock > 0 || p.stock_quantity > 0))
            };
          }
          if (s.includes('from orders o where o.id not in')) {
            const existingOrderIds = new Set(tables.order_items.map(oi => oi.order_id));
            return {
              results: tables.orders.filter(o => !existingOrderIds.has(o.id))
            };
          }
          if (s.includes('from products where') && (s.includes('status = \'active\'') || s.includes('status = ?'))) {
            const orgId = this._params[0];
            const stat = this._params.find(p => p === 'active' || p === 'draft' || p === 'archived');
            if (stat) {
              return { results: tables.products.filter(p => (p.organization_id === orgId || p.shop_id === orgId) && (p.status === stat || (!p.status && stat === 'active' && p.is_active === 1))) };
            }
            return { results: tables.products.filter(p => (p.organization_id === orgId || p.shop_id === orgId) && (p.status === 'active' || (!p.status && p.is_active === 1))) };
          }
          if (s.includes('from products where')) {
            const orgId = this._params[0];
            return { results: tables.products.filter(p => p.organization_id === orgId || p.shop_id === orgId) };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');

          if (s.includes('insert into shop_skus')) {
            const [id, shop_id, sku_normalized, product_id, variant_id, created_at] = this._params;
            const duplicate = tables.shop_skus.find(x => x.shop_id === shop_id && x.sku_normalized === sku_normalized);
            if (duplicate) {
              throw new Error(`UNIQUE constraint failed: shop_skus.shop_id, shop_skus.sku_normalized`);
            }
            tables.shop_skus.push({ id, shop_id, sku_normalized, product_id, variant_id, created_at });
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into shop_barcodes')) {
            const [id, shop_id, barcode_normalized, product_id, variant_id, created_at] = this._params;
            const duplicate = tables.shop_barcodes.find(x => x.shop_id === shop_id && x.barcode_normalized === barcode_normalized);
            if (duplicate) {
              throw new Error(`UNIQUE constraint failed: shop_barcodes.shop_id, shop_barcodes.barcode_normalized`);
            }
            tables.shop_barcodes.push({ id, shop_id, barcode_normalized, product_id, variant_id, created_at });
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into products')) {
            const [
              id, user_id, organization_id, shop_id, slug, name, price, cost_price, sale_price,
              price_minor, compare_at_price_minor, cost_price_minor, currency, is_inventory_tracked,
              category, stock, stock_quantity, description, image_url, media_key, sku, barcode,
              sku_normalized, barcode_normalized, is_active, created_at, updated_at
            ] = this._params;
            tables.products.push({
              id, user_id, organization_id, shop_id, slug, name, title: name, price, cost_price, sale_price,
              price_minor, compare_at_price_minor, cost_price_minor, currency, is_inventory_tracked,
              category, stock, stock_quantity, description, image_url, media_key, sku, barcode,
              sku_normalized, barcode_normalized, is_active, status: is_active === 1 ? 'active' : 'archived',
              created_at, updated_at
            });
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into product_options')) {
            const [id, shop_id, organization_id, product_id, name, position, values_json, created_at] = this._params;
            tables.product_options.push({ id, shop_id, organization_id, product_id, name, position, values_json, created_at });
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into product_variants')) {
            const [
              id, shop_id, organization_id, product_id, title, option_signature,
              sku, barcode, sku_normalized, barcode_normalized, currency,
              price_minor, compare_at_price_minor, cost_price_minor, image_url,
              weight_grams, status, option_values_json, created_at, updated_at
            ] = this._params;
            tables.product_variants.push({
              id, shop_id, organization_id, product_id, title, option_signature,
              sku, barcode, sku_normalized, barcode_normalized, currency,
              price_minor, compare_at_price_minor, cost_price_minor, image_url,
              weight_grams, status, option_values_json, created_at, updated_at
            });
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into locations')) {
            if (this._params.length === 5) {
              const [id, organization_id, store_id, created_at, updated_at] = this._params;
              tables.locations.push({ id, organization_id, store_id, name: 'Legacy Inventory', type: 'warehouse', address: 'Migrated warehouse stock', is_active: 1, created_at, updated_at });
            } else {
              const [id, organization_id, store_id, name, type, address, is_active, created_at, updated_at] = this._params;
              tables.locations.push({ id, organization_id, store_id, name, type, address, is_active, created_at, updated_at });
            }
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into inventory_locations')) {
            if (this._params.length === 7) {
              const [id, organization_id, product_id, location_id, available_quantity, created_at, updated_at] = this._params;
              tables.inventory_locations.push({
                id, organization_id, product_id, variant_id: '', location_id,
                available_quantity, reserved_quantity: 0, incoming_quantity: 0, reorder_threshold: 0, created_at, updated_at
              });
            } else {
              const [
                id, organization_id, product_id, variant_id, location_id,
                available_quantity, reserved_quantity, incoming_quantity, reorder_threshold, created_at, updated_at
              ] = this._params;
              tables.inventory_locations.push({
                id, organization_id, product_id, variant_id, location_id,
                available_quantity, reserved_quantity, incoming_quantity, reorder_threshold, created_at, updated_at
              });
            }
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into inventory_movements')) {
            if (this._params.length === 7) {
              const [id, organization_id, product_id, location_id, quantity_change, balance_after, created_at] = this._params;
              tables.inventory_movements.push({
                id, organization_id, product_id, variant_id: '', location_id,
                quantity_change, balance_after, reason: 'initial', notes: 'Legacy stock migration', created_at
              });
            } else {
              const [
                id, organization_id, product_id, variant_id, location_id,
                quantity_change, balance_after, reason, notes, created_at
              ] = this._params;
              tables.inventory_movements.push({
                id, organization_id, product_id, variant_id, location_id,
                quantity_change, balance_after, reason, notes, created_at
              });
            }
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into order_items')) {
            const [
              id, shop_id, organization_id, order_id, product_id, variant_id,
              title_snapshot, variant_title_snapshot, sku_snapshot, option_values_snapshot,
              quantity, unit_price_minor, total_minor, discount_minor, tax_minor, currency, created_at
            ] = this._params;
            tables.order_items.push({
              id, shop_id, organization_id, order_id, product_id, variant_id,
              title_snapshot, variant_title_snapshot, sku_snapshot, option_values_snapshot,
              quantity, unit_price_minor, total_minor, discount_minor, tax_minor, currency, created_at
            });
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into orders')) {
            const [
              id, user_id, organization_id, shop_id, customer_id, customer_name,
              customer_phone, items, total, status, invoice_number, created_at, updated_at
            ] = this._params;
            tables.orders.push({
              id, user_id, organization_id, shop_id, customer_id, customer_name,
              customer_phone, items, total, status, invoice_number, created_at, updated_at
            });
            return { meta: { changes: 1 } };
          }
          if (s.includes('update products set stock = stock - ?')) {
            const qty = this._params[0];
            const prodId = this._params[2];
            const p = tables.products.find(x => x.id === prodId);
            if (p && p.stock >= qty) {
              p.stock -= qty;
              p.stock_quantity -= qty;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (s.includes('update inventory_locations set available_quantity = available_quantity - ?')) {
            const qty = this._params[0];
            const invId = this._params[1];
            const il = tables.inventory_locations.find(x => x.id === invId);
            if (il && il.available_quantity >= qty) {
              il.available_quantity -= qty;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (s.includes('update orders set subtotal_minor = ?')) {
            const [subtotal_minor, total_minor, orderId] = this._params;
            const o = tables.orders.find(x => x.id === orderId);
            if (o) {
              o.subtotal_minor = subtotal_minor;
              o.total_minor = total_minor;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (s.includes('insert into invoices')) {
            tables.invoices.push({ id: this._params[0], order_id: this._params[3] });
            return { meta: { changes: 1 } };
          }
          if (s.includes('insert into customers')) {
            tables.customers.push({ id: this._params[0], name: this._params[2], phone: this._params[4] });
            return { meta: { changes: 1 } };
          }

          return { meta: { changes: 1 } };
        }
      };
    }
  };
}

// Generate test JWT for merchant staff
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-slice-a';

async function generateTestJwt(payload) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-slice-a' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

function createTestEnv(db) {
  return {
    DB: db,
    ENVIRONMENT: 'test',
    JWT_SECRET: 'test_jwt_secret_slice_a_key',
    WORKOS_CLIENT_ID: 'client_test_id',
    WORKOS_API_KEY: 'sk_test_key',
    JWKS: jose.createLocalJWKSet({ keys: [jwk] }),
    CACHE: {
      async get() { return null; },
      async put() { return; },
      async delete() { return; },
    }
  };
}

console.log('🧪 RUNNING P1 SLICE A: COMMERCE FOUNDATION VERIFICATION SUITE');
console.log('===============================================================');

// 1. Authoritative Minor-Unit Monetary Arithmetic
await test('1. Minor-Unit Math: Zero floating-point drift on additions, subtractions and bps calculations', async () => {
  // ₹399.00 + ₹19.99 = 39900 + 1999 = 41899 paise
  const sum = moneyAdd(39900, 1999);
  assert.equal(sum, 41899);

  // Subtraction
  const diff = moneySubtract(41899, 1999);
  assert.equal(diff, 39900);

  // 18% GST (1800 bps) on ₹399.00 (39900 paise) = 7182 paise (₹71.82)
  const gstMinor = moneyMultiplyPercentageBps(39900, 1800);
  assert.equal(gstMinor, 7182);

  // Formatting
  assert.equal(formatMoney(39900, 'INR'), '₹399.00');
  assert.equal(formatMoney(1999, 'USD'), '$19.99');

  // Conversion from legacy floats
  assert.equal(legacyFloatToMinorUnits(399.00), 39900);
  assert.equal(legacyFloatToMinorUnits(19.99), 1999);
});

// 2. Deterministic Option Signature Generation
await test('2. Option Signature: Normalized and alphabetically deterministic key-value signatures', async () => {
  const sig1 = generateOptionSignature({ "Size": "M", "Color": "Navy Blue" });
  const sig2 = generateOptionSignature({ "Color": "navy blue", "Size": "m" });
  assert.equal(sig1, "color:navy blue|size:m");
  assert.equal(sig1, sig2, "Option signatures must be case-insensitive and key-order independent");

  const sigArr = generateOptionSignature([
    { name: 'Material', value: 'Cotton' },
    { name: 'Fit', value: 'Slim' }
  ]);
  assert.equal(sigArr, "fit:slim|material:cotton");
});

// 3. Price Authority Rule (resolveSellablePrice)
await test('3. Price Authority: Product price authoritative when 0 variants; Variant selection required when 1+ variants', async () => {
  const db = createTestDb();

  // Product 1: Simple product (0 variants)
  db.tables.products.push({
    id: 'prod_simple_soap',
    organization_id: 'org_slice_a',
    shop_id: 'shop_slice_a',
    name: 'Organic Neem Soap',
    title: 'Organic Neem Soap',
    price_minor: 12000, // ₹120.00
    currency: 'INR',
    status: 'active',
    is_active: 1,
    is_inventory_tracked: 1,
    stock: 50,
    stock_quantity: 50
  });

  // Product 2: Configurable product with 2 variants
  db.tables.products.push({
    id: 'prod_tshirt_cotton',
    organization_id: 'org_slice_a',
    shop_id: 'shop_slice_a',
    name: 'Organic Cotton T-Shirt',
    title: 'Organic Cotton T-Shirt',
    price_minor: 79900, // Base ₹799.00 (not authoritative because variants exist)
    currency: 'INR',
    status: 'active',
    is_active: 1,
    is_inventory_tracked: 1,
    stock: 100,
    stock_quantity: 100
  });

  db.tables.product_variants.push(
    {
      id: 'var_tshirt_m',
      shop_id: 'shop_slice_a',
      organization_id: 'org_slice_a',
      product_id: 'prod_tshirt_cotton',
      title: 'Medium / Blue',
      option_signature: 'color:blue|size:m',
      price_minor: 79900,
      currency: 'INR',
      status: 'active'
    },
    {
      id: 'var_tshirt_xl',
      shop_id: 'shop_slice_a',
      organization_id: 'org_slice_a',
      product_id: 'prod_tshirt_cotton',
      title: 'Extra Large / Blue',
      option_signature: 'color:blue|size:xl',
      price_minor: 89900, // ₹899.00
      currency: 'INR',
      status: 'active'
    },
    {
      id: 'var_tshirt_draft',
      shop_id: 'shop_slice_a',
      organization_id: 'org_slice_a',
      product_id: 'prod_tshirt_cotton',
      title: 'XXL / Blue (Draft)',
      option_signature: 'color:blue|size:xxl',
      price_minor: 99900,
      currency: 'INR',
      status: 'draft'
    }
  );

  // Case A: 0 variants -> product price is authoritative
  const simplePrice = await resolveSellablePrice(db, {
    shopId: 'shop_slice_a',
    productId: 'prod_simple_soap'
  });
  assert.equal(simplePrice.price_minor, 12000);
  assert.equal(simplePrice.is_variant, false);

  // Providing variantId to 0-variant product must throw
  await assert.rejects(
    () => resolveSellablePrice(db, { shopId: 'shop_slice_a', productId: 'prod_simple_soap', variantId: 'var_nonexistent' }),
    { code: 'PRODUCT_HAS_NO_VARIANTS' }
  );

  // Case B: 1+ variants -> Omitting variantId MUST throw VARIANT_SELECTION_REQUIRED
  await assert.rejects(
    () => resolveSellablePrice(db, { shopId: 'shop_slice_a', productId: 'prod_tshirt_cotton' }),
    { code: 'VARIANT_SELECTION_REQUIRED' }
  );

  // Case C: Valid active variant selected -> variant price is authoritative
  const xlPrice = await resolveSellablePrice(db, {
    shopId: 'shop_slice_a',
    productId: 'prod_tshirt_cotton',
    variantId: 'var_tshirt_xl'
  });
  assert.equal(xlPrice.price_minor, 89900);
  assert.equal(xlPrice.is_variant, true);
  assert.equal(xlPrice.variant.title, 'Extra Large / Blue');

  // Case D: Selecting draft variant MUST be rejected as INVALID_VARIANT
  await assert.rejects(
    () => resolveSellablePrice(db, { shopId: 'shop_slice_a', productId: 'prod_tshirt_cotton', variantId: 'var_tshirt_draft' }),
    { code: 'INVALID_VARIANT' }
  );
});

// 4. Shop-Wide SKU and Barcode Registry Uniqueness
await test('4. SKU & Barcode Registry: Shop-wide uniqueness enforced; Cross-shop identical SKUs permitted', async () => {
  const db = createTestDb();

  // Register SKU for product in shop_slice_a
  const sku1 = await registerShopSku(db, {
    shopId: 'shop_slice_a',
    sku: '  tea-assam-100g  ',
    productId: 'prod_tea_1'
  });
  assert.equal(sku1, 'TEA-ASSAM-100G', 'SKU must be normalized and upper-cased');

  // Attempting to register the same SKU for a variant in the same shop MUST fail with DUPLICATE_SKU
  await assert.rejects(
    () => registerShopSku(db, {
      shopId: 'shop_slice_a',
      sku: 'tea-assam-100g',
      productId: 'prod_tea_2',
      variantId: 'var_tea_green'
    }),
    { code: 'DUPLICATE_SKU' }
  );

  // Registering the EXACT same SKU in a DIFFERENT shop (shop_b) MUST SUCCEED
  const crossShopSku = await registerShopSku(db, {
    shopId: 'shop_b',
    sku: 'tea-assam-100g',
    productId: 'prod_shop_b_item'
  });
  assert.equal(crossShopSku, 'TEA-ASSAM-100G', 'Identical SKU allowed across different shops');

  // Barcode Uniqueness in shop_slice_a
  const bar1 = await registerShopBarcode(db, {
    shopId: 'shop_slice_a',
    barcode: ' 8901234567890 ',
    productId: 'prod_tea_1'
  });
  assert.equal(bar1, '8901234567890');

  // Collision within same shop
  await assert.rejects(
    () => registerShopBarcode(db, {
      shopId: 'shop_slice_a',
      barcode: '8901234567890',
      productId: 'prod_tea_2'
    }),
    { code: 'DUPLICATE_BARCODE' }
  );

  // Barcode in different shop allowed
  const crossShopBar = await registerShopBarcode(db, {
    shopId: 'shop_b',
    barcode: '8901234567890',
    productId: 'prod_shop_b_item'
  });
  assert.equal(crossShopBar, '8901234567890');
});

// 5. Legacy Stock Migration into "Legacy Inventory" Location
await test('5. Stock Migration: Migrates legacy stock into authoritative inventory_locations with audit trail', async () => {
  const db = createTestDb();

  db.tables.products.push({
    id: 'prod_legacy_grain',
    organization_id: 'org_slice_a',
    shop_id: 'shop_slice_a',
    name: 'Organic Wheat Grain 10kg',
    stock: 45,
    stock_quantity: 45,
    is_active: 1
  });

  const report = await migrateLegacyStock(db);
  assert.equal(report.totalProductsScanned, 1);
  assert.equal(report.locationsCreated, 1);
  assert.equal(report.stockMigratedCount, 1);
  assert.equal(report.anomalies.length, 0);

  // Verify created location
  assert.equal(db.tables.locations.length, 1);
  const loc = db.tables.locations[0];
  assert.equal(loc.name, 'Legacy Inventory');
  assert.equal(loc.type, 'warehouse');
  assert.equal(loc.organization_id, 'org_slice_a');

  // Verify inventory_locations record
  assert.equal(db.tables.inventory_locations.length, 1);
  const inv = db.tables.inventory_locations[0];
  assert.equal(inv.product_id, 'prod_legacy_grain');
  assert.equal(inv.available_quantity, 45);
  assert.equal(inv.location_id, loc.id);

  // Verify inventory movement ledger entry
  assert.equal(db.tables.inventory_movements.length, 1);
  const mov = db.tables.inventory_movements[0];
  assert.equal(mov.quantity_change, 45);
  assert.equal(mov.balance_after, 45);
  assert.equal(mov.reason, 'initial');

  // Re-running migration must be idempotent and create 0 duplicates
  const report2 = await migrateLegacyStock(db);
  assert.equal(report2.stockMigratedCount, 0);
  assert.equal(db.tables.inventory_locations.length, 1);
});

// 6. Historical Orders Backfill with Subtotal Validation
await test('6. Orders Backfill: Safely snapshots order line items and audits subtotal anomalies', async () => {
  const db = createTestDb();

  // Order 1: Clean historical order (₹200.00 x 2 = ₹400.00 subtotal)
  db.tables.orders.push({
    id: 'ord_hist_1',
    organization_id: 'org_slice_a',
    shop_id: 'shop_slice_a',
    items: JSON.stringify([
      { product_id: 'prod_honey_1', name: 'Raw Forest Honey', price: 200, quantity: 2, sku: 'HON-RAW-500' }
    ]),
    subtotal: 400,
    total: 400,
    subtotal_minor: 0,
    total_minor: 0,
    currency: 'INR',
    created_at: new Date('2026-01-10T10:00:00Z').toISOString()
  });

  // Order 2: Order with subtotal mismatch anomaly (recorded subtotal ₹300, items sum to ₹500)
  db.tables.orders.push({
    id: 'ord_hist_anomaly',
    organization_id: 'org_slice_a',
    shop_id: 'shop_slice_a',
    items: JSON.stringify([
      { product_id: 'prod_oil_1', name: 'Cold Pressed Mustard Oil', price: 250, quantity: 2 }
    ]),
    subtotal: 300, // Anomaly!
    total: 300,
    subtotal_minor: 0,
    total_minor: 0,
    currency: 'INR',
    created_at: new Date('2026-01-12T10:00:00Z').toISOString()
  });

  const backfillReport = await backfillHistoricalOrderItems(db);
  assert.equal(backfillReport.totalScanned, 2);
  assert.equal(backfillReport.migratedCount, 2);
  assert.equal(backfillReport.anomalyCount, 1, "Should detect 1 subtotal mismatch anomaly");

  // Verify order_items created
  assert.equal(db.tables.order_items.length, 2);
  const item1 = db.tables.order_items.find(i => i.order_id === 'ord_hist_1');
  assert.ok(item1);
  assert.equal(item1.unit_price_minor, 20000);
  assert.equal(item1.total_minor, 40000);
  assert.equal(item1.sku_snapshot, 'HON-RAW-500');
  assert.equal(item1.title_snapshot, 'Raw Forest Honey');

  // Verify orders table subtotal_minor updated
  const ord1 = db.tables.orders.find(o => o.id === 'ord_hist_1');
  assert.equal(ord1.subtotal_minor, 40000);
  assert.equal(ord1.total_minor, 40000);
});

// 7. Full Commerce Loop via Worker API: Product CRUD + Variant Creation + Status Filter + Storefront Checkout
await test('7. Full End-to-End Commerce Loop: Product creation with variants -> Status filter -> Variant checkout -> Order items snapshot', async () => {
  const db = createTestDb();
  const env = createTestEnv(db);
  const token = await generateTestJwt({ sub: 'usr_merchant_slice_a', email: 'merchant_a@example.com' });

  // Step A: Create Product with 2 Options (Size, Color) and 2 Variants via POST /api/products
  const createProdReq = new Request('https://ferasetu.com/api/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Organic Hemp Hoodie',
      price: 1499,
      price_minor: 149900,
      stock_quantity: 40,
      category: 'Fashion',
      description: 'Comfortable organic hemp fleece hoodie',
      options: [
        { name: 'Size', values: ['M', 'L'] },
        { name: 'Color', values: ['Olive', 'Oatmeal'] }
      ],
      variants: [
        {
          title: 'M / Olive',
          price_minor: 149900,
          price: 1499,
          sku: 'HOODIE-M-OLIVE',
          barcode: '8901111111111',
          options: { size: 'M', color: 'Olive' },
          status: 'active'
        },
        {
          title: 'L / Oatmeal',
          price_minor: 169900, // ₹1699.00
          price: 1699,
          sku: 'HOODIE-L-OATMEAL',
          barcode: '8901111111112',
          options: { size: 'L', color: 'Oatmeal' },
          status: 'active'
        }
      ]
    })
  });

  const createProdRes = await worker.fetch(createProdReq, env);
  assert.equal(createProdRes.status, 201);
  const prodData = await createProdRes.json();
  const createdProductId = prodData.product?.id || prodData.id;
  assert.ok(createdProductId);

  // Step B: Fetch Product via GET /api/products/:id and verify attached options & variants
  const getProdReq = new Request(`https://ferasetu.com/api/products/${createdProductId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getProdRes = await worker.fetch(getProdReq, env);
  assert.equal(getProdRes.status, 200);
  const fetchedProd = await getProdRes.json();
  assert.equal(fetchedProd.has_variants, true);
  assert.equal(fetchedProd.options.length, 2);
  assert.equal(fetchedProd.variants.length, 2);
  assert.equal(fetchedProd.variants[0].sku, 'HOODIE-M-OLIVE');
  assert.equal(fetchedProd.variants[1].price_minor, 169900);

  const oliveVariantId = fetchedProd.variants[0].id;
  const oatmealVariantId = fetchedProd.variants[1].id;

  // Step C: Verify Status Filter on GET /api/products?status=active
  const listActiveReq = new Request('https://ferasetu.com/api/products?status=active', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const listActiveRes = await worker.fetch(listActiveReq, env);
  assert.equal(listActiveRes.status, 200);
  const activeList = await listActiveRes.json();
  assert.equal(activeList.products.length, 1);
  assert.equal(activeList.products[0].id, createdProductId);

  // Step D: Public Storefront Checkout with Variant Selection (Buying 2 x L / Oatmeal @ ₹1699.00 = ₹3398.00)
  const checkoutReq = new Request('https://organic-a.ferasetu.com/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'organic-a',
      customerName: 'Ananya Roy',
      customerPhone: '9876500001',
      deliveryType: 'pickup',
      items: [
        {
          productId: createdProductId,
          variantId: oatmealVariantId,
          quantity: 2
        }
      ]
    })
  });

  const checkoutRes = await worker.fetch(checkoutReq, env);
  assert.equal(checkoutRes.status, 201);
  const orderResult = await checkoutRes.json();
  assert.equal(orderResult.success, true);
  assert.equal(orderResult.order.total, 3398); // ₹3398.00
  const createdOrderId = orderResult.order.id;

  // Step E: Verify order_items Snapshot and Price Immutability
  assert.equal(db.tables.order_items.length, 1);
  const snapItem = db.tables.order_items[0];
  assert.equal(snapItem.order_id, createdOrderId);
  assert.equal(snapItem.product_id, createdProductId);
  assert.equal(snapItem.variant_id, oatmealVariantId);
  assert.equal(snapItem.unit_price_minor, 169900);
  assert.equal(snapItem.total_minor, 339800);
  assert.equal(snapItem.sku_snapshot, 'HOODIE-L-OATMEAL');
  assert.equal(snapItem.variant_title_snapshot, 'L / Oatmeal');

  // Step F: Verify Stock Decrement
  const prodInDb = db.tables.products.find(p => p.id === createdProductId);
  assert.equal(prodInDb.stock, 38, "Stock must decrement from 40 to 38");
});

console.log('────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Failed specifications:', failures);
  process.exit(1);
} else {
  console.log('🌟 All P1 Slice A Commerce Foundation Specifications Verified Successfully!');
}

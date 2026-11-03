/**
 * FeraSetu Inventory CSV Import & Shopify Parser Test Suite
 * ========================================================
 * Verifies:
 * 1. Standard CSV parsing with prices, stock, categories, SKUs.
 * 2. Shopify CSV parsing with Handle-based grouping, multi-row variants, HTML cleanup.
 * 3. Numerical and currency symbol cleaning (₹, $, commas).
 * 4. Sample CSV generation for both Standard and Shopify formats.
 * 5. Frontend UI integration in ProductsPage.tsx and DashboardPage.tsx.
 *
 * Run with: node tests/inventory-csv-import.test.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import parser functions
import {
  parseRawCsvText,
  cleanNumber,
  stripHtml,
  normalizeCategory,
  parseInventoryCsv,
  generateSampleCsv
} from './csvParserRuntime.mjs';

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

console.log('\n--- Running FeraSetu Inventory CSV Import Tests ---\n');

// TEST 1: Raw RFC 4180 CSV Parsing (escaped quotes, commas inside quotes, multiline)
await test('RFC 4180 CSV parser handles quotes, newlines, and commas', () => {
  const csv = `Title,Description,Price\n"Basmati Rice","Aged, premium grain\nwith fragrance",499.50\n"T-Shirt ""Classic""","Cotton",799`;
  const rows = parseRawCsvText(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[0][0], 'Title');
  assert.equal(rows[1][0], 'Basmati Rice');
  assert.equal(rows[1][1], 'Aged, premium grain\nwith fragrance');
  assert.equal(rows[1][2], '499.50');
  assert.equal(rows[2][0], 'T-Shirt "Classic"');
});

// TEST 2: Numerical & Currency Cleaning
await test('Numerical cleaner scrubs ₹, $, commas, and whitespace', () => {
  assert.equal(cleanNumber('₹1,499.00'), 1499);
  assert.equal(cleanNumber('$29.99'), 29.99);
  assert.equal(cleanNumber('  450  '), 450);
  assert.equal(cleanNumber(''), 0);
  assert.equal(cleanNumber(null), 0);
});

// TEST 3: HTML Description Stripping
await test('stripHtml removes tags, converts line breaks, and decodes entities', () => {
  const html = '<p>100% Pure Organic Cotton.</p><br><p>Comfortable &amp; breathable &quot;daily&quot; wear.</p>';
  const clean = stripHtml(html);
  assert.ok(!clean.includes('<p>'));
  assert.ok(!clean.includes('</p>'));
  assert.ok(clean.includes('100% Pure Organic Cotton.'));
  assert.ok(clean.includes('&'));
  assert.ok(clean.includes('"daily"'));
});

// TEST 4: Category Normalization
await test('normalizeCategory maps retail sectors into standard FeraSetu categories', () => {
  assert.equal(normalizeCategory('Food & Snacks > Spices'), 'Grocery');
  assert.equal(normalizeCategory('Apparel & Accessories > Tops'), 'Fashion');
  assert.equal(normalizeCategory('Smartphones & Audio'), 'Electronics');
  assert.equal(normalizeCategory('Cookware & Dinnerware'), 'Home & Kitchen');
  assert.equal(normalizeCategory('Unique Artisan Pottery'), 'Unique Artisan Pottery');
});

// TEST 5: Standard CSV Parsing
await test('Standard Retail CSV correctly parses products, prices, and stock', () => {
  const standardCsv = `Product Name,Category,Price,Sale Price,Cost Price,Stock Quantity,SKU,Barcode,Description,Image URL
"Tata Tea Gold (500g)",Food & Beverages,275.00,295.00,220.00,40,TEA-500,8901234567890,"Aromatic tea leaves",https://example.com/tea.jpg
"Fortune Sunflower Oil (1L)",Grocery,145.00,165.00,120.00,60,OIL-1L,8901234567891,"Refined sunflower oil",https://example.com/oil.jpg`;

  const result = parseInventoryCsv(standardCsv);
  assert.equal(result.detectedFormat, 'generic');
  assert.equal(result.products.length, 2);

  const tea = result.products[0];
  assert.equal(tea.name, 'Tata Tea Gold (500g)');
  assert.equal(tea.category, 'Food & Beverages');
  assert.equal(tea.price, 275);
  assert.equal(tea.sale_price, 295);
  assert.equal(tea.cost_price, 220);
  assert.equal(tea.stock_quantity, 40);
  assert.equal(tea.sku, 'TEA-500');
  assert.equal(tea.image_url, 'https://example.com/tea.jpg');
});

// TEST 6: Shopify Product CSV with Multi-Row Variant Grouping
await test('Shopify CSV groups multiple rows by Handle into single product with variants', () => {
  const shopifyCsv = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Variant SKU,Variant Inventory Qty,Variant Price,Variant Compare At Price,Cost per item,Variant Barcode,Image Src,Status
cotton-crew-tee,Classic Cotton Tee,<p>Ultra soft breathable cotton t-shirt.</p>,Acme,Fashion,tshirt,TRUE,Size,S,Color,Navy,TEE-S-NVY,15,499.00,699.00,250.00,8901001,https://example.com/tee.jpg,active
cotton-crew-tee,,,,,,,,M,,Navy,TEE-M-NVY,25,499.00,699.00,250.00,8901002,,active
cotton-crew-tee,,,,,,,,L,,Navy,TEE-L-NVY,10,549.00,749.00,280.00,8901003,,active
basmati-rice-1kg,Aged Basmati Rice 1kg,<p>Long grain aromatic rice.</p>,Farmer,Grocery,rice,TRUE,Title,Default Title,,,RICE-1KG,50,120.00,140.00,90.00,8902001,https://example.com/rice.jpg,active`;

  const result = parseInventoryCsv(shopifyCsv);
  assert.equal(result.detectedFormat, 'shopify');
  assert.equal(result.formatLabel, 'Shopify Product Catalog');
  assert.equal(result.products.length, 2);

  // Check first product (with 3 variants)
  const tee = result.products[0];
  assert.equal(tee.name, 'Classic Cotton Tee');
  assert.equal(tee.category, 'Fashion');
  assert.equal(tee.description, 'Ultra soft breathable cotton t-shirt.');
  assert.equal(tee.image_url, 'https://example.com/tee.jpg');
  assert.equal(tee.stock_quantity, 15 + 25 + 10); // 50 total stock
  assert.equal(tee.options.length, 2); // Size, Color
  assert.equal(tee.variants.length, 3);
  assert.equal(tee.variants[0].sku, 'TEE-S-NVY');
  assert.equal(tee.variants[1].title, 'M / Navy');
  assert.equal(tee.variants[2].price, 549);

  // Check second product (single variant default title)
  const rice = result.products[1];
  assert.equal(rice.name, 'Aged Basmati Rice 1kg');
  assert.equal(rice.category, 'Grocery');
  assert.equal(rice.price, 120);
  assert.equal(rice.stock_quantity, 50);
});

// TEST 7: Sample CSV Template Generation
await test('generateSampleCsv outputs valid parseable CSVs for both standard and shopify', () => {
  const stdSample = generateSampleCsv('standard');
  const shopifySample = generateSampleCsv('shopify');

  assert.ok(stdSample.includes('Product Name'));
  assert.ok(shopifySample.includes('Handle'));

  const parsedStd = parseInventoryCsv(stdSample);
  assert.ok(parsedStd.products.length >= 2);

  const parsedShopify = parseInventoryCsv(shopifySample);
  assert.equal(parsedShopify.detectedFormat, 'shopify');
  assert.ok(parsedShopify.products.length >= 2);
});

// TEST 8: Frontend UI Files Verification
await test('ProductsPage.tsx includes Import CSV button, modal, and empty state action', () => {
  const productsPageContent = fs.readFileSync(path.resolve('frontend/src/pages/ProductsPage.tsx'), 'utf-8');
  assert.ok(productsPageContent.includes('ImportInventoryModal'), 'Must import ImportInventoryModal');
  assert.ok(productsPageContent.includes('Import CSV'), 'Must render Import CSV button');
  assert.ok(productsPageContent.includes('showImportModal'), 'Must manage showImportModal state');
  assert.ok(productsPageContent.includes("searchParams.get('import')"), 'Must support ?import=true query param');
});

await test('DashboardPage.tsx includes Import CSV button in header and product empty state', () => {
  const dashboardContent = fs.readFileSync(path.resolve('frontend/src/pages/DashboardPage.tsx'), 'utf-8');
  assert.ok(dashboardContent.includes('/products?import=true'), 'Must link to /products?import=true');
  assert.ok(dashboardContent.includes('Import CSV'), 'Must render Import CSV label');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}

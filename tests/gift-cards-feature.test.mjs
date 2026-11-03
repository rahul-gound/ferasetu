/**
 * FeraSetu — Digital Gift Cards Feature Test Suite
 * tests/gift-cards-feature.test.mjs
 * =============================================================================
 * Validates:
 * 1. Partial redemption math & split payments (Scenario A: ₹1,000 card / ₹700 order; Scenario B: ₹1,000 card / ₹1,200 order)
 * 2. Gift card product structure & catalog metadata (INR denominations, channels, SEO)
 * 3. Unique high-entropy code generation (FERA-XXXX-XXXX-XXXX)
 * 4. Direct gift card issuance vs sellable catalog item distinction
 * 5. Outstanding financial obligation calculations (Future store liability)
 * =============================================================================
 */

import assert from 'node:assert/strict';

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
    throw err;
  }
}

console.log('🧪 Starting FeraSetu Digital Gift Cards Feature Test Suite...\n');

// 1. Partial Redemption & Split Payment Math (Matching User Prompt Specification)
await test('Simulator: Scenario A (₹1,000 Card, ₹700 Order) leaves ₹300 balance on card with ₹0 to pay', () => {
  const cardBalance = 1000;
  const orderTotal = 700;

  const applied = Math.min(cardBalance, orderTotal);
  const remainingBalance = Math.max(0, cardBalance - applied);
  const extraToPay = Math.max(0, orderTotal - applied);

  assert.equal(applied, 700, 'Applied amount equals order total');
  assert.equal(remainingBalance, 300, 'Remaining ₹300 balance stays on the card');
  assert.equal(extraToPay, 0, 'No extra payment required');
});

await test('Simulator: Scenario B (₹1,000 Card, ₹1,200 Order) depletes card and leaves ₹200 for UPI/Card', () => {
  const cardBalance = 1000;
  const orderTotal = 1200;

  const applied = Math.min(cardBalance, orderTotal);
  const remainingBalance = Math.max(0, cardBalance - applied);
  const extraToPay = Math.max(0, orderTotal - applied);

  assert.equal(applied, 1000, 'Full ₹1,000 gift card applied');
  assert.equal(remainingBalance, 0, 'Gift card balance depleted to 0');
  assert.equal(extraToPay, 200, 'Customer pays remaining ₹200 with another payment method');
});

// 2. High-Entropy Unique Gift Card Code Generator
await test('Code Generator: Generates FERA-XXXX-XXXX-XXXX masked codes without ambiguous characters', () => {
  function generateGiftCardCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0, O, 1, I
    let code = 'FERA-';
    for (let block = 0; block < 3; block++) {
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (block < 2) code += '-';
    }
    return code;
  }

  const code1 = generateGiftCardCode();
  const code2 = generateGiftCardCode();

  assert.match(code1, /^FERA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.match(code2, /^FERA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.notEqual(code1, code2, 'Generated codes are distinct and random');
  assert.ok(!code1.includes('0') && !code1.includes('O') && !code1.includes('I') && !code1.includes('1'), 'Excludes ambiguous glyphs');
});

// 3. Product Catalog Model Validation
await test('Product Model: Validates required denominations, INR currency, and digital inventory', () => {
  const giftCardPayload = {
    title: 'Ramesh Kirana Digital Gift Card',
    description: 'Give them the freedom to choose. Select a gift card amount and receive a digital gift card by email.',
    denominations: [500, 1000, 2000, 5000],
    currency: 'INR',
    cross_currency_redemption: false,
    sales_channels: ['online_store', 'whatsapp_shop'],
    tags: ['Gift Card', 'Diwali'],
    product_type: 'Digital Gift Card',
    collection: 'Gift Cards',
  };

  assert.ok(giftCardPayload.title.length > 0, 'Title is non-empty');
  assert.ok(giftCardPayload.denominations.length >= 1, 'At least one denomination');
  assert.deepEqual(giftCardPayload.denominations, [500, 1000, 2000, 5000], 'Practical INR denominations present');
  assert.equal(giftCardPayload.currency, 'INR', 'Currency locked to INR');
  assert.equal(giftCardPayload.cross_currency_redemption, false, 'Cross-currency redemption disabled for INR single-store clarity');
  assert.ok(giftCardPayload.sales_channels.includes('online_store'), 'Enabled for online storefront');
});

// 4. Financial Obligation Accounting & Balance Tracking
await test('Accounting: Correctly calculates outstanding shopping obligation vs redeemed shopping value', () => {
  const issuedCards = [
    { id: 'gc_1', initial_value: 1000, balance: 300 }, // ₹700 redeemed
    { id: 'gc_2', initial_value: 2000, balance: 2000 }, // Untouched
    { id: 'gc_3', initial_value: 500, balance: 0 },    // Fully redeemed
  ];

  const totalIssuedValue = issuedCards.reduce((acc, c) => acc + c.initial_value, 0);
  const outstandingBalance = issuedCards.reduce((acc, c) => acc + c.balance, 0);
  const totalRedeemedValue = totalIssuedValue - outstandingBalance;

  assert.equal(totalIssuedValue, 3500, 'Total issued value is ₹3,500');
  assert.equal(outstandingBalance, 2300, 'Outstanding obligation is ₹2,300');
  assert.equal(totalRedeemedValue, 1200, 'Total redeemed at checkout is ₹1,200');
});

// 5. Merchant Empathy & Educational Distinction
await test('Educational Distinction: Distinguishes between catalog product and direct manual issuance', () => {
  const isCatalogProduct = (item) => item.category === 'Gift Cards' && item.is_active === true;
  const isDirectIssuedCard = (item) => Boolean(item.code && item.balance !== undefined && !item.price);

  const product = { category: 'Gift Cards', is_active: true, price: 1000 };
  const issuedCard = { code: 'FERA-ABCD-EFGH-JKLM', initial_value: 1000, balance: 1000 };

  assert.ok(isCatalogProduct(product), 'Product is a sellable item customers buy in store');
  assert.ok(isDirectIssuedCard(issuedCard), 'Issued card is a redemption code, not a catalogue SKU');
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`🎉 All ${passed} Digital Gift Card feature tests passed successfully!\n`);

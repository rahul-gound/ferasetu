// =============================================================================
// FeraSetu Shop Toolkit & Shopkeeper Tools Audit Verification Test Suite
// Verifies all data integrity, validation, and UX invariants across:
// - /transfers & /transfers/new
// - /dashboard/discounts
// - /gift-cards & /gift-cards/new
// - /analytics
// - /inventory-and-locations
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

describe('FeraSetu Shopkeeper Toolkit & Data Integrity Audit', () => {

  test('1. Inventory Transfers: No past dates, strict future arrival validation, and empty state safety', () => {
    const createTransferPath = path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'CreateTransferPage.tsx');
    const content = fs.readFileSync(createTransferPath, 'utf8');

    // Check no hardcoded past dates
    assert.doesNotMatch(content, /2026-10-31/, 'Should not contain hardcoded past date 2026-10-31');
    assert.doesNotMatch(content, /October 31, 2026/, 'Should not contain past date October 31, 2026');

    // Check future date validation inline message
    assert.ok(
      content.includes('Estimated arrival must be today or a future date.'),
      'Must contain explicit inline validation for future arrival date'
    );

    // Check origin !== destination validation
    assert.ok(
      content.includes('Origin and destination cannot be the same location.') ||
      content.includes('originMatchesDestination'),
      'Must validate that origin and destination are not identical'
    );

    // Check export transfer sheet protection
    assert.ok(
      content.includes('Add at least one product before exporting.') ||
      content.includes('Add products first to export the transfer sheet.'),
      'Must protect export button when transfer has no items'
    );
  });

  test('2. Sidekick Copilot: Safe error fallback, no fake inventory proposals, speech permission handling', () => {
    const sidekickPath = path.join(ROOT_DIR, 'frontend', 'src', 'components', 'transfers', 'SidekickCopilotBar.tsx');
    const content = fs.readFileSync(sidekickPath, 'utf8');

    // Ensure safe error fallback
    assert.ok(
      content.includes('Sidekick is unavailable. Please enter transfer details manually.'),
      'Must show explicit unavailable message without fake proposals'
    );
    assert.doesNotMatch(content, /Main Warehouse/i, 'Must not populate fake Main Warehouse fallback');

    // Speech error handling
    assert.ok(
      content.includes('Microphone permission is required for voice input.'),
      'Must handle microphone permission denial accurately'
    );
    assert.ok(
      content.includes('Voice input is unavailable. You can type the instruction instead.'),
      'Must handle speech service unavailability without claiming fake capture'
    );
  });

  test('3. Barcode Scanner: Real merchant catalog lookup, camera error handling, out-of-stock check', () => {
    const scannerPath = path.join(ROOT_DIR, 'frontend', 'src', 'components', 'transfers', 'BarcodeScannerModal.tsx');
    const content = fs.readFileSync(scannerPath, 'utf8');

    // Empty catalog state
    assert.ok(
      content.includes('No products available') && content.includes('Add or import a product to continue.'),
      'Must provide clean empty state when catalog has no products'
    );

    // Out of stock prevention
    assert.ok(
      content.includes('Cannot add out-of-stock product') || content.includes('stock <= 0'),
      'Must prevent adding products with 0 available stock'
    );

    // Camera errors
    assert.ok(
      content.includes('Camera permission was denied') && content.includes('No camera hardware was detected'),
      'Must handle camera permission and hardware errors gracefully'
    );
  });

  test('4. Discounts & Offers: Honest stats, unique code generation, free shipping rule validation', () => {
    const discountsPagePath = path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'DiscountsPage.tsx');
    const pageContent = fs.readFileSync(discountsPagePath, 'utf8');

    // Replaces misleading DATABASE VERIFIED when no promotions exist
    assert.ok(
      pageContent.includes("analytics.topDiscount ? 'Database Verified' : 'No promotion data yet'"),
      'Must show "No promotion data yet" when topDiscount is null'
    );

    const wizardPath = path.join(ROOT_DIR, 'frontend', 'src', 'components', 'discounts', 'DiscountWizardModal.tsx');
    const wizardContent = fs.readFileSync(wizardPath, 'utf8');

    // Replaced "Free Delivery Protection Guaranteed"
    assert.doesNotMatch(
      wizardContent,
      /Free Delivery Protection Guaranteed/,
      'Must not claim unverified delivery protection guarantees'
    );
    assert.ok(
      wizardContent.includes('Free delivery promotion. Eligibility depends on configured delivery rules.'),
      'Must show honest free shipping delivery rule notice'
    );

    // Unique code generator & copy button & duplicate detection
    assert.ok(wizardContent.includes('handleGenerateCode'), 'Must implement handleGenerateCode');
    assert.ok(wizardContent.includes('handleCopyCode'), 'Must implement handleCopyCode');
    assert.ok(wizardContent.includes('isCodeDuplicate'), 'Must check for duplicate codes');
    assert.ok(
      wizardContent.includes('Shipping rules must be configured before creating a free shipping discount.'),
      'Must validate that shipping rules are configured before free shipping discount can be created'
    );
  });

  test('5. Digital Gift Cards: Honest fulfillment promise & ledger issuance confirmation', () => {
    const createPath = path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'CreateGiftCardPage.tsx');
    const createContent = fs.readFileSync(createPath, 'utf8');

    assert.doesNotMatch(
      createContent,
      /Delivered instantly by email/,
      'Must not promise instant email delivery without automated fulfillment setup'
    );
    assert.ok(
      createContent.includes('Delivered by email after successful fulfillment'),
      'Must promise fulfillment-dependent delivery'
    );

    const pagePath = path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'GiftCardsPage.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf8');

    // Confirmation dialog before creating store credit
    assert.ok(
      pageContent.includes('You are issuing store credit without collecting payment. This action will be recorded in the merchant ledger. Continue?'),
      'Must require confirmation dialog before issuing unpaid store credit'
    );
    assert.ok(
      pageContent.includes('issued_by') && pageContent.includes('Issuing Staff Member'),
      'Must require issuing staff member attribution'
    );
  });

  test('6. Analytics & Traffic: Period-strict metrics, no synthetic multipliers, honest tracking status', () => {
    const analyticsPath = path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'AnalyticsPage.tsx');
    const content = fs.readFileSync(analyticsPath, 'utf8');

    // No synthetic multipliers
    assert.doesNotMatch(
      content,
      /Math\.max\(uniqueShoppers \* 12, 48\)/,
      'Must not use synthetic multiplier Math.max(uniqueShoppers * 12, 48)'
    );

    // Strictly filters orders by selected period
    assert.ok(
      content.includes('periodOrders'),
      'Must filter orders strictly by selected period'
    );

    // Reporting period and last updated labels
    assert.ok(
      content.includes('periodDateRange'),
      'Must calculate and display formatted period date range in IST'
    );
    assert.ok(
      content.includes('Last updated:'),
      'Must display last updated timestamp'
    );

    // Honest visitor status
    assert.ok(
      content.includes('Visitor tracking not configured'),
      'Must show "Visitor tracking not configured" when telemetry is inactive'
    );

    // Empty state when no orders in period
    assert.ok(
      content.includes('No sales activity in this period. Try selecting another date range or share your store link.'),
      'Must show explicit empty state when period has 0 sales'
    );
  });

  test('7. Multi-Location Inventory: Zero hardcoded grocery fallbacks, clean empty and error states', () => {
    const invPath = path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'InventoryLocationsPage.tsx');
    const content = fs.readFileSync(invPath, 'utf8');

    // No hardcoded grocery items
    assert.doesNotMatch(content, /Aashirvaad Superior MP Atta/, 'Must not have Aashirvaad fake fallback');
    assert.doesNotMatch(content, /Fortune Sunlite Sunflower Oil/, 'Must not have Fortune Oil fake fallback');
    assert.doesNotMatch(content, /Tata Salt Vacuum Evaporated/, 'Must not have Tata Salt fake fallback');
    assert.doesNotMatch(content, /Wagh Bakri Premium CTC Tea/, 'Must not have Wagh Bakri fake fallback');

    // Clean empty state
    assert.ok(
      content.includes('No inventory records found. Add products or import inventory to get started.'),
      'Must display empty state when no inventory records exist'
    );

    // Error retry state
    assert.ok(
      content.includes('Inventory could not be loaded.'),
      'Must display error state with retry when loading fails'
    );

    // Stock adjustment validation: non-zero and non-negative
    assert.ok(
      content.includes('Cannot reduce stock below zero.') || content.includes('currentQty + adjustQty < 0'),
      'Must prevent negative inventory stock adjustments'
    );
  });
});

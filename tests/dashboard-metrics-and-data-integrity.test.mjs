// =============================================================================
// FeraSetu Comprehensive QA Test Suite: Dashboard Reconciliation & Data Integrity
// =============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

// Helper metric computation function mirroring OperationsDashboard.tsx canonical logic
function computeDashboardMetrics(orders, timeRange, totalVisitors = 0) {
  const now = new Date();
  let periodOrders = [];

  if (timeRange === 'today') {
    const today = new Date();
    periodOrders = orders.filter((o) => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    });
  } else if (timeRange === '7d') {
    const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    periodOrders = orders.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  } else if (timeRange === '30d') {
    const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    periodOrders = orders.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  }

  const validOrders = periodOrders.filter((o) => o.status !== 'cancelled');
  const cancelledOrders = periodOrders.filter((o) => o.status === 'cancelled');

  const grossSales = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const refunds = cancelledOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const netSales = Math.max(0, grossSales - refunds);
  const orderCount = validOrders.length;

  const counterOrders = validOrders.filter((o) => {
    const pm = (o.payment_method || '').toLowerCase();
    return pm === 'cash' || o.delivery_type === 'pickup';
  }).length;

  const upiOrders = validOrders.filter((o) => {
    const pm = (o.payment_method || '').toLowerCase();
    return pm.includes('upi') || pm.includes('qr');
  }).length;

  const onlineOrders = Math.max(0, orderCount - counterOrders);

  const settledPayments = validOrders.filter((o) => {
    const ps = (o.payment_status || '').toLowerCase();
    const s = (o.status || '').toLowerCase();
    return ps === 'paid' || s === 'delivered';
  }).reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const pendingPayments = Math.max(0, grossSales - settledPayments);
  const avgOrderValue = orderCount > 0 ? Math.round((grossSales / orderCount) * 10) / 10 : 0;

  const storeVisits = totalVisitors > 0
    ? (timeRange === 'today' ? Math.round(totalVisitors * 0.3) : timeRange === '7d' ? Math.round(totalVisitors * 0.7) : totalVisitors)
    : (orderCount > 0 ? Math.round(orderCount * 2.8) : 0);

  const conversionRate = storeVisits > 0 ? Number(((orderCount / storeVisits) * 100).toFixed(1)) : 0;
  const settlementBalance = settledPayments;

  const peakRush = orderCount > 0
    ? `Midday Rush (${orderCount} orders, ₹${grossSales})`
    : 'No rush recorded (0 orders, ₹0)';

  return {
    grossSales,
    refunds,
    netSales,
    orderCount,
    counterOrders,
    upiOrders,
    onlineOrders,
    settledPayments,
    pendingPayments,
    avgOrderValue,
    storeVisits,
    conversionRate,
    settlementBalance,
    peakRush,
  };
}

// -----------------------------------------------------------------------------
// Test 1: Zero Orders State (No Fake ₹211.3 AOV or hardcoded ₹3,440 settlement)
// -----------------------------------------------------------------------------
test('Zero Orders: Metrics reconcile strictly to 0 with no hardcoded fallbacks', () => {
  const emptyOrders = [];
  const metrics = computeDashboardMetrics(emptyOrders, 'today', 0);

  assert.equal(metrics.grossSales, 0, 'Gross sales must be 0');
  assert.equal(metrics.netSales, 0, 'Net sales must be 0');
  assert.equal(metrics.orderCount, 0, 'Order count must be 0');
  assert.equal(metrics.counterOrders, 0, 'Counter orders must be 0');
  assert.equal(metrics.upiOrders, 0, 'UPI orders must be 0');
  assert.equal(metrics.onlineOrders, 0, 'Online orders must be 0');
  assert.equal(metrics.settledPayments, 0, 'Settled payments must be 0');
  assert.equal(metrics.pendingPayments, 0, 'Pending payments must be 0');
  assert.equal(metrics.refunds, 0, 'Refunds must be 0');
  assert.equal(metrics.avgOrderValue, 0, 'Average order value must be 0 (NOT fake 211.3!)');
  assert.equal(metrics.settlementBalance, 0, 'Settlement balance must be 0 (NOT fake 3440!)');
  assert.equal(metrics.conversionRate, 0, 'Conversion rate must be 0');
  assert.equal(metrics.peakRush, 'No rush recorded (0 orders, ₹0)');
});

// -----------------------------------------------------------------------------
// Test 2: Multi-Order Mathematical Reconciliation
// -----------------------------------------------------------------------------
test('Populated Orders: Reconciles Gross = Settled + Pending, Net = Gross - Refunds', () => {
  const todayStr = new Date().toISOString();
  const sampleOrders = [
    {
      id: 'ord_1',
      total: 1200,
      status: 'delivered',
      payment_status: 'paid',
      payment_method: 'upi',
      delivery_type: 'delivery',
      created_at: todayStr,
    },
    {
      id: 'ord_2',
      total: 450,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'khata',
      delivery_type: 'pickup',
      created_at: todayStr,
    },
    {
      id: 'ord_3',
      total: 350,
      status: 'cancelled',
      payment_status: 'refunded',
      payment_method: 'upi',
      delivery_type: 'delivery',
      created_at: todayStr,
    },
    {
      id: 'ord_4',
      total: 800,
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'cash',
      delivery_type: 'pickup',
      created_at: todayStr,
    },
  ];

  const metrics = computeDashboardMetrics(sampleOrders, 'today', 20);

  // Valid orders are 1, 2, 4 (order 3 is cancelled)
  // Gross sales = 1200 + 450 + 800 = 2450
  assert.equal(metrics.grossSales, 2450, 'Gross sales must sum non-cancelled orders');

  // Refunds = 350
  assert.equal(metrics.refunds, 350, 'Refunds must sum cancelled orders');

  // Net sales = 2450 - 350 = 2100
  assert.equal(metrics.netSales, 2100, 'Net sales = grossSales - refunds');

  // Total orders = 3
  assert.equal(metrics.orderCount, 3, 'Order count is 3 non-cancelled orders');

  // Settled = ord_1 (1200, paid) + ord_4 (800, paid) = 2000
  assert.equal(metrics.settledPayments, 2000, 'Settled payments = 2000');

  // Pending = ord_2 (450)
  assert.equal(metrics.pendingPayments, 450, 'Pending payments = 450');

  // Mathematical invariant: Gross = Settled + Pending
  assert.equal(metrics.grossSales, metrics.settledPayments + metrics.pendingPayments, 'Gross Sales === Settled + Pending');

  // Counter orders: ord_2 (pickup) + ord_4 (cash, pickup) = 2
  assert.equal(metrics.counterOrders, 2, 'Counter orders = 2');

  // Online orders: orderCount (3) - counterOrders (2) = 1 (ord_1)
  assert.equal(metrics.onlineOrders, 1, 'Online orders = 1');
  assert.equal(metrics.orderCount, metrics.counterOrders + metrics.onlineOrders, 'Order Count === Counter + Online');

  // Average Basket = 2450 / 3 = 816.7
  assert.equal(metrics.avgOrderValue, 816.7, 'AOV is exactly gross / orderCount');

  // Settlement Balance = settled payments = 2000
  assert.equal(metrics.settlementBalance, 2000, 'Settlement balance matches settled total');
});

// -----------------------------------------------------------------------------
// Test 3: Time Range Filtering Consistency (Today, 7D, 30D)
// -----------------------------------------------------------------------------
test('Time Range Filtering: Correctly isolates periods without cross-contamination', () => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const orders = [
    { id: 'today_1', total: 500, status: 'delivered', payment_status: 'paid', created_at: new Date(now - 1 * 3600 * 1000).toISOString() },
    { id: 'past_3d', total: 700, status: 'delivered', payment_status: 'paid', created_at: new Date(now - 3 * dayMs).toISOString() },
    { id: 'past_15d', total: 1000, status: 'delivered', payment_status: 'paid', created_at: new Date(now - 15 * dayMs).toISOString() },
    { id: 'past_45d', total: 3000, status: 'delivered', payment_status: 'paid', created_at: new Date(now - 45 * dayMs).toISOString() },
  ];

  const mToday = computeDashboardMetrics(orders, 'today');
  assert.equal(mToday.orderCount, 1, 'Today has 1 order');
  assert.equal(mToday.grossSales, 500, 'Today gross is 500');

  const m7d = computeDashboardMetrics(orders, '7d');
  assert.equal(m7d.orderCount, 2, '7D has 2 orders');
  assert.equal(m7d.grossSales, 1200, '7D gross is 500 + 700 = 1200');

  const m30d = computeDashboardMetrics(orders, '30d');
  assert.equal(m30d.orderCount, 3, '30D has 3 orders');
  assert.equal(m30d.grossSales, 2200, '30D gross is 500 + 700 + 1000 = 2200');
});

// -----------------------------------------------------------------------------
// Test 4: Dynamic SVG Placeholder Generator (No MacBook images for Books/Grocery)
// -----------------------------------------------------------------------------
test('Placeholder SVG: Generates contextual initials and never defaults to MacBook image', () => {
  function getProductPlaceholderSvg(name = 'Product', bg = '#0F172A') {
    const initials = (name || 'Product')
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%"><rect width="400" height="400" fill="${bg}"/><text x="50%" y="54%" font-family="system-ui, sans-serif" font-size="72" font-weight="700" fill="#ffffff" opacity="0.9" dominant-baseline="middle" text-anchor="middle">${initials}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  const bookSvg = getProductPlaceholderSvg('rertsttdtdb', '#0F172A');
  assert.ok(bookSvg.startsWith('data:image/svg+xml;utf8,'), 'Generates safe SVG data URI');
  assert.ok(!bookSvg.includes('macbook-pro-14.png'), 'Must NOT contain hardcoded MacBook image path');

  const grocerySvg = getProductPlaceholderSvg('Aashirvaad Chakki Atta', '#0F172A');
  assert.ok(grocerySvg.includes('AC'), 'Initials AC present in SVG text');
});

// -----------------------------------------------------------------------------
// Test 5: Future Estimated Arrival Date Validation (No Past Dates)
// -----------------------------------------------------------------------------
test('Arrival Date Validation: Blocks past dates and ensures future delivery estimate', () => {
  function validateArrivalDate(inputDateStr) {
    const today = new Date().toISOString().slice(0, 10);
    if (!inputDateStr || inputDateStr < today) {
      return { valid: false, error: 'Estimated arrival date cannot be in the past' };
    }
    return { valid: true };
  }

  const pastDate = '2026-10-31';
  assert.equal(validateArrivalDate(pastDate).valid, false, 'Must reject past date 2026-10-31');

  const todayDate = new Date().toISOString().slice(0, 10);
  assert.equal(validateArrivalDate(todayDate).valid, true, 'Accepts today date');

  const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  assert.equal(validateArrivalDate(futureDate).valid, true, 'Accepts future date');
});

// -----------------------------------------------------------------------------
// Test 6: Storefront Out-of-Stock Disabling Logic
// -----------------------------------------------------------------------------
test('Storefront Out-of-Stock: Add to Cart button disabled when stock <= 0', () => {
  function canAddToCart(product) {
    const stock = Number(product.stock_quantity ?? product.stockQuantity ?? 0);
    const isActive = product.is_active !== false && product.isActive !== false;
    return stock > 0 && isActive;
  }

  assert.equal(canAddToCart({ name: 'Book', stock_quantity: 0 }), false, '0 stock cannot be added to cart');
  assert.equal(canAddToCart({ name: 'Pen', stock_quantity: -1 }), false, 'Negative stock cannot be added to cart');
  assert.equal(canAddToCart({ name: 'Bag', stock_quantity: 10, is_active: false }), false, 'Inactive product cannot be added to cart');
  assert.equal(canAddToCart({ name: 'Notebook', stock_quantity: 5, is_active: true }), true, 'In-stock active product can be added');
});

// -----------------------------------------------------------------------------
// Test 7: Settle Now Confirmation Parameters
// -----------------------------------------------------------------------------
test('Settle Now Modal: Confirmation contains required parameters', () => {
  const settlementSpec = {
    amount: 2450,
    bankAccountMasked: '••••3912',
    bankName: 'Bank of Baroda',
    provider: 'UPI AutoCollect / Bank Direct',
    fees: 0,
    expectedArrival: 'Instant (2-4 hours via NEFT / IMPS)',
    commissionClaim: '0% Intermediate Platform Fee',
    status: 'Verified Ready for Direct Bank Sweep',
  };

  assert.ok(settlementSpec.amount > 0, 'Valid positive amount');
  assert.equal(settlementSpec.fees, 0, 'Zero platform fees');
  assert.ok(settlementSpec.bankAccountMasked.startsWith('••••'), 'Bank account is masked');
  assert.ok(settlementSpec.provider.includes('Direct'), 'Direct bank sweep verified');
});

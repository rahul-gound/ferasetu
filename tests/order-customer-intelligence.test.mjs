/**
 * Order Customer Intelligence, Top Spenders & AI Risk Detection Test Suite
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// Client-side intelligence computation function mirror
function computeOrderIntelligence(orders, products = []) {
  const productCostMap = {};
  for (const p of products) {
    if (p.cost_price != null) {
      productCostMap[p.id] = Number(p.cost_price);
    } else if (p.cost_price_minor != null) {
      productCostMap[p.id] = p.cost_price_minor / 100;
    }
  }

  const customerMap = new Map();
  let totalRevenue = 0;
  let totalCost = 0;
  let totalGrossProfit = 0;
  let totalCancelledCount = 0;
  let totalCancelledValue = 0;

  const analyzedOrders = [];

  for (const ord of orders) {
    let items = [];
    if (Array.isArray(ord.items)) {
      items = ord.items;
    } else if (typeof ord.items === 'string') {
      try { items = JSON.parse(ord.items); } catch { items = []; }
    }

    const orderTotal = Number(ord.total) || 0;
    const isCancelled = ord.status === 'cancelled';
    let orderCost = 0;
    let totalUnits = 0;

    for (const it of items) {
      const pId = it.productId || it.product_id;
      const qty = Math.max(1, Math.trunc(Number(it.quantity || it.qty || 1)));
      totalUnits += qty;
      const unitCost = productCostMap[pId] ?? (it.cost_price != null ? Number(it.cost_price) : (Number(it.price || 0) * 0.65));
      orderCost += unitCost * qty;
    }

    const orderProfit = Math.round((orderTotal - orderCost) * 100) / 100;
    const marginPercent = orderTotal > 0 ? Math.round((orderProfit / orderTotal) * 100) : 0;
    const isLoss = isCancelled || orderProfit <= 0;

    if (!isCancelled) {
      totalRevenue += orderTotal;
      totalCost += orderCost;
      totalGrossProfit += orderProfit;
    } else {
      totalCancelledCount++;
      totalCancelledValue += orderTotal;
    }

    // AI Risk Detection Heuristics
    const riskFlags = [];
    let riskScore = 10;

    const phoneDigits = (ord.customer_phone || '').replace(/\D/g, '');
    if (phoneDigits) {
      if (/^(\d)\1{6,}$/.test(phoneDigits)) {
        riskFlags.push('Suspicious phone number pattern (repeated identical digits)');
        riskScore += 45;
      }
      if (phoneDigits.length < 10) {
        riskFlags.push('Incomplete phone number (<10 digits)');
        riskScore += 25;
      }
    }

    if (totalUnits >= 15) {
      riskFlags.push(`Abnormally high cart volume (${totalUnits} total units)`);
      riskScore += 30;
    }

    if (ord.delivery_type === 'delivery' && ord.payment_status === 'unpaid' && orderTotal >= 5000) {
      riskFlags.push('High-value Cash on Delivery (> ₹5,000) without advance payment');
      riskScore += 35;
    }

    if (orderProfit < 0 && !isCancelled) {
      riskFlags.push(`Negative profit margin: store loses ₹${Math.abs(orderProfit)} on this transaction`);
      riskScore += 25;
    }

    const addr = (ord.delivery_address || ord.customer_address || '').toLowerCase().trim();
    if (addr && (addr.includes('test') || addr === 'asdf' || addr === 'xyz' || addr.length < 5)) {
      riskFlags.push('Placeholder or incomplete delivery address');
      riskScore += 30;
    }

    const riskLevel = riskScore >= 60 ? 'high' : (riskScore >= 35 ? 'medium' : 'safe');

    analyzedOrders.push({
      id: ord.id,
      customer_name: ord.customer_name || 'Customer',
      customer_phone: ord.customer_phone || '',
      total: orderTotal,
      order_cost: Math.round(orderCost * 100) / 100,
      gross_profit: orderProfit,
      margin_percent: marginPercent,
      is_profitable: !isCancelled && orderProfit > 0,
      is_loss: isLoss,
      status: ord.status || 'pending',
      payment_status: ord.payment_status || 'unpaid',
      created_at: ord.created_at || new Date().toISOString(),
      risk_score: Math.min(100, riskScore),
      risk_level: riskLevel,
      risk_flags: riskFlags,
      items_count: items.length,
      units_count: totalUnits
    });

    const custKey = ord.customer_id || phoneDigits || ord.customer_name || 'unknown';
    let c = customerMap.get(custKey);
    if (!c) {
      c = {
        id: ord.customer_id || `cust_${custKey}`,
        name: ord.customer_name || 'Customer',
        phone: ord.customer_phone || '',
        total_orders: 0,
        completed_orders: 0,
        cancelled_orders: 0,
        total_spent: 0,
        total_profit: 0,
        average_order_value: 0,
        cancellation_rate: 0,
        is_profitable: true,
        is_loss: false,
        ai_risk: 'safe',
        risk_flags: [],
        last_order_at: ord.created_at
      };
      customerMap.set(custKey, c);
    }

    c.total_orders++;
    if (isCancelled) {
      c.cancelled_orders++;
    } else {
      c.completed_orders++;
      c.total_spent += orderTotal;
      c.total_profit += orderProfit;
    }
  }

  const customersList = Array.from(customerMap.values()).map(c => {
    const cancelRate = c.total_orders > 0 ? (c.cancelled_orders / c.total_orders) : 0;
    const isSuspicious = c.cancelled_orders >= 2 && cancelRate >= 0.5;
    const riskFlags = [];
    if (isSuspicious) {
      riskFlags.push(`High cancellation history (${Math.round(cancelRate * 100)}% orders cancelled)`);
    }

    return {
      ...c,
      total_spent: Math.round(c.total_spent * 100) / 100,
      total_profit: Math.round(c.total_profit * 100) / 100,
      average_order_value: c.completed_orders > 0 ? Math.round(c.total_spent / c.completed_orders) : 0,
      cancellation_rate: Math.round(cancelRate * 100),
      is_profitable: c.total_profit > 0,
      is_loss: isSuspicious || c.total_profit <= 0,
      ai_risk: isSuspicious ? 'suspicious' : 'safe',
      risk_flags: riskFlags
    };
  });

  const topBuyers = [...customersList].sort((a, b) => b.total_spent - a.total_spent);
  const profitableOrders = analyzedOrders.filter(o => o.is_profitable).sort((a, b) => b.gross_profit - a.gross_profit);
  const lossOrders = analyzedOrders.filter(o => o.is_loss).sort((a, b) => a.gross_profit - b.gross_profit);
  const suspiciousOrders = analyzedOrders.filter(o => o.risk_level === 'high' || o.risk_level === 'medium').sort((a, b) => b.risk_score - a.risk_score);

  return {
    summary: {
      total_orders: orders.length,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_estimated_profit: Math.round(totalGrossProfit * 100) / 100,
      overall_margin_percent: totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0,
      total_cancelled_orders: totalCancelledCount,
      total_cancelled_value: Math.round(totalCancelledValue * 100) / 100,
      top_buyer: topBuyers.length > 0 && topBuyers[0].total_spent > 0 ? topBuyers[0] : null,
      profitable_customers_count: customersList.filter(c => c.is_profitable).length,
      loss_customers_count: customersList.filter(c => c.is_loss).length,
      suspicious_orders_count: suspiciousOrders.length
    },
    top_buyers: topBuyers,
    profitable_orders: profitableOrders,
    loss_orders: lossOrders,
    suspicious_orders: suspiciousOrders
  };
}

test('Order Intelligence: Tracks top spender with highest lifetime purchase value', () => {
  const sampleOrders = [
    {
      id: 'ord_1',
      customer_id: 'cust_rajesh',
      customer_name: 'Rajesh Sharma',
      customer_phone: '9876543210',
      total: 4500,
      status: 'delivered',
      payment_status: 'paid',
      items: [{ product_id: 'p1', quantity: 2, price: 2250, cost_price: 1500 }]
    },
    {
      id: 'ord_2',
      customer_id: 'cust_rajesh',
      customer_name: 'Rajesh Sharma',
      customer_phone: '9876543210',
      total: 3000,
      status: 'delivered',
      payment_status: 'paid',
      items: [{ product_id: 'p1', quantity: 1, price: 3000, cost_price: 2000 }]
    },
    {
      id: 'ord_3',
      customer_id: 'cust_priya',
      customer_name: 'Priya Verma',
      customer_phone: '9123456780',
      total: 1200,
      status: 'delivered',
      payment_status: 'paid',
      items: [{ product_id: 'p2', quantity: 1, price: 1200, cost_price: 800 }]
    }
  ];

  const intel = computeOrderIntelligence(sampleOrders);
  assert.equal(intel.top_buyers.length, 2);
  assert.equal(intel.summary.top_buyer.name, 'Rajesh Sharma');
  assert.equal(intel.summary.top_buyer.total_spent, 7500);
  assert.equal(intel.summary.top_buyer.completed_orders, 2);
  assert.equal(intel.summary.top_buyer.average_order_value, 3750);
});

test('Order Intelligence: Identifies store profitable vs loss orders', () => {
  const sampleOrders = [
    {
      id: 'ord_profitable',
      customer_name: 'Amit Patel',
      customer_phone: '9822334455',
      total: 2000,
      status: 'delivered',
      items: [{ product_id: 'p1', quantity: 2, price: 1000, cost_price: 600 }] // cost = 1200, profit = 800
    },
    {
      id: 'ord_loss_cancelled',
      customer_name: 'Cancelled Customer',
      customer_phone: '9811223344',
      total: 1500,
      status: 'cancelled',
      items: [{ product_id: 'p1', quantity: 1, price: 1500, cost_price: 1000 }]
    }
  ];

  const intel = computeOrderIntelligence(sampleOrders);
  assert.equal(intel.profitable_orders.length, 1);
  assert.equal(intel.profitable_orders[0].id, 'ord_profitable');
  assert.equal(intel.profitable_orders[0].gross_profit, 800);
  assert.equal(intel.profitable_orders[0].margin_percent, 40);

  assert.equal(intel.loss_orders.length, 1);
  assert.equal(intel.loss_orders[0].id, 'ord_loss_cancelled');
  assert.equal(intel.summary.total_cancelled_orders, 1);
  assert.equal(intel.summary.total_cancelled_value, 1500);
});

test('Order Intelligence: AI Risk Radar flags suspicious orders accurately', () => {
  const sampleOrders = [
    {
      id: 'ord_suspicious_phone',
      customer_name: 'Fake User',
      customer_phone: '9999999999', // Repeated digits
      total: 6000,
      delivery_type: 'delivery',
      payment_status: 'unpaid', // High COD
      delivery_address: 'asdf test', // Placeholder address
      items: [{ product_id: 'p1', quantity: 20, price: 300 }] // High volume (20 units)
    },
    {
      id: 'ord_safe',
      customer_name: 'Genuine Customer',
      customer_phone: '9876543210',
      total: 450,
      delivery_type: 'pickup',
      payment_status: 'paid',
      delivery_address: 'Shop 12, Main Market, Mumbai',
      items: [{ product_id: 'p1', quantity: 1, price: 450 }]
    }
  ];

  const intel = computeOrderIntelligence(sampleOrders);
  assert.equal(intel.suspicious_orders.length, 1);
  const flagged = intel.suspicious_orders[0];
  assert.equal(flagged.id, 'ord_suspicious_phone');
  assert.equal(flagged.risk_level, 'high');
  assert(flagged.risk_score >= 80, `Expected score >= 80, got ${flagged.risk_score}`);
  assert(flagged.risk_flags.some(f => f.includes('Suspicious phone number pattern')));
  assert(flagged.risk_flags.some(f => f.includes('High-value Cash on Delivery')));
  assert(flagged.risk_flags.some(f => f.includes('Abnormally high cart volume')));
  assert(flagged.risk_flags.some(f => f.includes('Placeholder or incomplete delivery address')));

  // Safe order is not in suspicious_orders
  assert(!intel.suspicious_orders.some(o => o.id === 'ord_safe'));
});

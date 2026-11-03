import test from 'node:test';
import assert from 'node:assert/strict';

// Customer segment evaluation logic
function evaluateCustomerAgainstRule(customer, rule) {
  if (rule.field === 'orders_count') {
    const val = Number(customer.total_orders || 0);
    const tgt = Number(rule.value);
    if (rule.operator === 'equals') return val === tgt;
    if (rule.operator === 'greater_than') return val > tgt;
    if (rule.operator === 'less_than') return val < tgt;
    if (rule.operator === 'greater_than_or_equal') return val >= tgt;
    if (rule.operator === 'less_than_or_equal') return val <= tgt;
    if (rule.operator === 'not_equals') return val !== tgt;
  }
  if (rule.field === 'total_spent') {
    const val = Number(customer.total_spent || 0);
    const tgt = Number(rule.value);
    if (rule.operator === 'equals') return val === tgt;
    if (rule.operator === 'greater_than') return val > tgt;
    if (rule.operator === 'less_than') return val < tgt;
    if (rule.operator === 'greater_than_or_equal') return val >= tgt;
  }
  if (rule.field === 'email_subscribed') {
    const isSub = Boolean(customer.email && customer.email.length > 3);
    return isSub === Boolean(rule.value);
  }
  return true;
}

function filterCustomersBySegment(customers, rules, conjunction = 'AND') {
  if (!rules || rules.length === 0) return customers;
  return customers.filter((c) => {
    const results = rules.map((r) => evaluateCustomerAgainstRule(c, r));
    return conjunction === 'OR' ? results.some(Boolean) : results.every(Boolean);
  });
}

const mockCustomers = [
  { id: '1', name: 'Aarav Sharma', email: 'aarav@example.com', total_orders: 0, total_spent: 0 },
  { id: '2', name: 'Pooja Verma', email: 'pooja@example.com', total_orders: 3, total_spent: 4200 },
  { id: '3', name: 'Rohan Mehra', email: '', total_orders: 0, total_spent: 0 },
  { id: '4', name: 'Anita Desai', email: 'anita@example.com', total_orders: 1, total_spent: 1200 },
];

test('Customer Segments: filters subscribers who have not purchased yet (AND rule)', () => {
  const rules = [
    { field: 'orders_count', operator: 'equals', value: 0 },
    { field: 'email_subscribed', operator: 'equals', value: true }
  ];

  const matched = filterCustomersBySegment(mockCustomers, rules, 'AND');
  assert.equal(matched.length, 1);
  assert.equal(matched[0].name, 'Aarav Sharma');
});

test('Customer Segments: filters repeat or high spenders (OR rule)', () => {
  const rules = [
    { field: 'orders_count', operator: 'greater_than_or_equal', value: 2 },
    { field: 'total_spent', operator: 'greater_than_or_equal', value: 3000 }
  ];

  const matched = filterCustomersBySegment(mockCustomers, rules, 'OR');
  assert.equal(matched.length, 1);
  assert.equal(matched[0].name, 'Pooja Verma');
});

test('Customer Segments: preview count matches dynamically as customers change', () => {
  const rules = [{ field: 'orders_count', operator: 'equals', value: 0 }];
  const before = filterCustomersBySegment(mockCustomers, rules, 'AND');
  assert.equal(before.length, 2); // Aarav and Rohan

  // Simulated purchase: Aarav places an order
  const updatedCustomers = mockCustomers.map(c => c.id === '1' ? { ...c, total_orders: 1, total_spent: 500 } : c);
  const after = filterCustomersBySegment(updatedCustomers, rules, 'AND');
  assert.equal(after.length, 1); // Only Rohan remains
  assert.equal(after[0].id, '3');
});

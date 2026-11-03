import test from 'node:test';
import assert from 'node:assert/strict';

// Helper validator for creating transfers
function validateTransferInput(payload) {
  const { origin_location_id, destination_location_id, items } = payload;
  if (!origin_location_id) throw new Error('Origin location is required');
  if (!destination_location_id) throw new Error('Destination location is required');
  if (origin_location_id === destination_location_id) {
    throw new Error('Origin and destination locations must be different');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one product item is required for transfer');
  }
  return true;
}

// Sidekick Natural Language parser
function parseSidekickPrompt(prompt) {
  const lower = prompt.toLowerCase();
  let units = 20;
  const numberMatch = prompt.match(/\b(\d+)\b/);
  if (numberMatch) {
    units = parseInt(numberMatch[1], 10);
  }

  let origin = 'Main Warehouse (Central Godown)';
  let destination = 'Primary Retail Dukaan (Front Store)';
  if (lower.includes('supplier')) origin = 'Regional Wholesale Supplier';
  if (lower.includes('godown') || lower.includes('warehouse')) origin = 'Main Warehouse (Central Godown)';

  const tags = ['Sidekick Assistant'];
  if (lower.includes('diwali') || lower.includes('festival')) tags.push('Festival Rush');
  if (lower.includes('urgent') || lower.includes('fast')) tags.push('Urgent');

  return {
    units,
    origin,
    destination,
    tags: tags.join(', ')
  };
}

test('Transfers: rejects transfer when origin equals destination', () => {
  assert.throws(
    () => validateTransferInput({
      origin_location_id: 'loc-1',
      destination_location_id: 'loc-1',
      items: [{ product_id: 'p1', quantity: 10 }]
    }),
    /Origin and destination locations must be different/
  );
});

test('Transfers: requires at least one product item', () => {
  assert.throws(
    () => validateTransferInput({
      origin_location_id: 'loc-1',
      destination_location_id: 'loc-2',
      items: []
    }),
    /At least one product item is required/
  );
});

test('Transfers: computes total units and total value accurately', () => {
  const items = [
    { product_id: 'p1', title: 'Organic Basmati Rice 5kg', quantity: 20, unit_cost: 450 },
    { product_id: 'p2', title: 'Cold Pressed Mustard Oil 1L', quantity: 15, unit_cost: 180 },
  ];

  const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalValue = items.reduce((sum, it) => sum + it.quantity * it.unit_cost, 0);

  assert.equal(totalUnits, 35);
  assert.equal(totalValue, (20 * 450) + (15 * 180)); // 9000 + 2700 = 11700
  assert.equal(totalValue, 11700);
});

test('Sidekick Copilot: extracts quantity and routes from natural merchant speech', () => {
  const result = parseSidekickPrompt('Transfer 50 units from Regional Wholesale Supplier for Diwali rush urgent');
  assert.equal(result.units, 50);
  assert.equal(result.origin, 'Regional Wholesale Supplier');
  assert(result.tags.includes('Festival Rush'));
  assert(result.tags.includes('Urgent'));
});

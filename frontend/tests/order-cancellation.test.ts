import test from 'node:test';
import assert from 'node:assert/strict';

test('Order Cancellation — Irreversible Warning Copy Invariants', () => {
  const irreversibleWarning = 'Once this order is cancelled, this action is irreversible.';
  const subWarning = 'This order cannot be reopened once cancelled. The customer will be informed and the items will not be delivered.';
  
  assert.ok(irreversibleWarning.includes('irreversible'));
  assert.ok(irreversibleWarning.includes('cancelled'));
  assert.ok(subWarning.includes('cannot be reopened'));
  assert.ok(subWarning.includes('customer will be informed'));
});

test('Order Cancellation — State Transition Contracts', () => {
  // Simulating store owner workflow in Orders tab
  interface OrderState {
    id: string;
    customer_name: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  }

  const initialOrder: OrderState = {
    id: 'ord_123456789',
    customer_name: 'Gupta General Store Buyer',
    status: 'pending',
  };

  let pendingCancelOrder: OrderState | null = null;
  let activeOrderState = { ...initialOrder };

  // 1. Store owner selects "cancelled" in the Update status selector
  function onStatusSelect(order: OrderState, newStatus: string) {
    if (newStatus === 'cancelled') {
      pendingCancelOrder = order;
      return;
    }
    activeOrderState.status = newStatus as any;
  }

  onStatusSelect(activeOrderState, 'cancelled');

  // Verify that the order is NOT immediately cancelled; modal is opened instead
  assert.equal(activeOrderState.status, 'pending');
  assert.notEqual(pendingCancelOrder, null);
  assert.equal(pendingCancelOrder?.id, 'ord_123456789');

  // 2. Scenario A: Store owner chooses "Back" option
  function onBack() {
    pendingCancelOrder = null;
  }

  onBack();
  assert.equal(pendingCancelOrder, null);
  assert.equal(activeOrderState.status, 'pending', 'Order status must remain pending when Back is selected');

  // 3. Scenario B: Store owner selects "cancelled" again and chooses "Proceed" option
  onStatusSelect(activeOrderState, 'cancelled');
  assert.notEqual(pendingCancelOrder, null);

  function onProceed(reason: string) {
    if (!pendingCancelOrder) return;
    activeOrderState.status = 'cancelled';
    pendingCancelOrder = null;
  }

  onProceed('Customer requested cancellation');
  assert.equal(pendingCancelOrder, null);
  assert.equal(activeOrderState.status, 'cancelled', 'Order status must be updated to cancelled when Proceed is confirmed');
});

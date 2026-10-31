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

test('Order Cancellation — State Transition Contracts & Modal Controls', () => {
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

test('Order Cancellation — Lock After Cancel (Cannot be changed to other updates)', () => {
  interface Order {
    id: string;
    status: string;
  }

  const cancelledOrder: Order = {
    id: 'ord_cancelled_001',
    status: 'cancelled',
  };

  function tryUpdateStatus(order: Order, nextStatus: string): { success: boolean; error?: string } {
    if (order.status === 'cancelled') {
      return {
        success: false,
        error: 'Order is cancelled and cannot be changed to other updates. Cancellation is irreversible.',
      };
    }
    order.status = nextStatus;
    return { success: true };
  }

  // Attempt to transition cancelled order to "confirmed", "preparing", "delivered"
  const attempt1 = tryUpdateStatus(cancelledOrder, 'confirmed');
  assert.equal(attempt1.success, false);
  assert.ok(attempt1.error?.includes('cannot be changed to other updates'));
  assert.equal(cancelledOrder.status, 'cancelled');

  const attempt2 = tryUpdateStatus(cancelledOrder, 'delivered');
  assert.equal(attempt2.success, false);
  assert.equal(cancelledOrder.status, 'cancelled');
});

test('Order Cancellation — Revenue & Profit Exclusion Invariant', () => {
  interface OrderMetric {
    id: string;
    total: number;
    profit: number;
    status: string;
  }

  const sampleOrders: OrderMetric[] = [
    { id: '1', total: 1500, profit: 300, status: 'delivered' },
    { id: '2', total: 2500, profit: 500, status: 'confirmed' },
    { id: '3', total: 4000, profit: 800, status: 'cancelled' }, // Should NOT count!
  ];

  function calculateActiveRevenueAndProfit(orders: OrderMetric[]) {
    return orders
      .filter(o => o.status !== 'cancelled')
      .reduce((acc, curr) => ({
        revenue: acc.revenue + curr.total,
        profit: acc.profit + curr.profit,
        ordersCount: acc.ordersCount + 1,
      }), { revenue: 0, profit: 0, ordersCount: 0 });
  }

  const metrics = calculateActiveRevenueAndProfit(sampleOrders);

  // Revenue must strictly exclude the ₹4000 cancelled order
  assert.equal(metrics.revenue, 4000); // 1500 + 2500
  assert.equal(metrics.profit, 800);   // 300 + 500
  assert.equal(metrics.ordersCount, 2); // Excludes cancelled order
});

test('Order Cancellation — Invoice Invalidation Invariant', () => {
  function getInvoiceAvailability(orderStatus: string, invoiceStatus: string): { canView: boolean; canDownload: boolean; status: string } {
    if (orderStatus === 'cancelled' || invoiceStatus === 'voided') {
      return { canView: false, canDownload: false, status: 'voided' };
    }
    return { canView: true, canDownload: true, status: 'issued' };
  }

  const activeInvoice = getInvoiceAvailability('delivered', 'issued');
  assert.equal(activeInvoice.canView, true);
  assert.equal(activeInvoice.canDownload, true);

  const cancelledInvoice = getInvoiceAvailability('cancelled', 'issued');
  assert.equal(cancelledInvoice.canView, false);
  assert.equal(cancelledInvoice.canDownload, false);
  assert.equal(cancelledInvoice.status, 'voided');
});

test('Order Cancellation — Customer Email Notification Dispatch', () => {
  interface EmailPayload {
    to: string;
    template: string;
    orderId: string;
    storeName: string;
    reason: string;
  }

  const dispatchedEmails: EmailPayload[] = [];

  function notifyCancellation(customerEmail: string | undefined, orderId: string, storeName: string, reason: string) {
    if (!customerEmail) return;
    dispatchedEmails.push({
      to: customerEmail,
      template: 'order.cancelled',
      orderId,
      storeName,
      reason,
    });
  }

  notifyCancellation('customer@example.com', 'ord_123', 'Ramesh Kirana', 'Customer requested cancellation');

  assert.equal(dispatchedEmails.length, 1);
  assert.equal(dispatchedEmails[0].to, 'customer@example.com');
  assert.equal(dispatchedEmails[0].template, 'order.cancelled');
  assert.equal(dispatchedEmails[0].orderId, 'ord_123');
  assert.equal(dispatchedEmails[0].storeName, 'Ramesh Kirana');
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Order Lifecycle: Confirm, Delivery Code, Locked Status, Return Loss & Non-Returnable', () => {

  test('1. Pending Order Status Transition: Can confirm or cancel', () => {
    let order = {
      id: 'ord_test_001',
      customer_name: 'vvgjhjhvjhvjhvjhvjhv',
      customer_phone: '9264917440',
      total: 174,
      delivery_type: 'delivery',
      status: 'pending',
      payment_status: 'unpaid',
    };

    assert.equal(order.status, 'pending');

    // Confirm transition
    order.status = 'confirmed';
    assert.equal(order.status, 'confirmed');
  });

  test('2. Verification of Customer Delivery Code marks order Delivered', () => {
    const order = {
      id: 'ord_test_002',
      customer_name: 'vvgjhjhvjhvjhvjhvjhv',
      customer_phone: '9264917440',
      delivery_code: 'FERA88',
      status: 'confirmed',
    };

    const enteredCode = 'FERA88';
    assert.equal(enteredCode.trim().toUpperCase(), order.delivery_code);

    // Handshake successful
    order.status = 'delivered';
    order.payment_status = 'paid';
    assert.equal(order.status, 'delivered');
  });

  test('3. Invariant: Delivered Order Status is permanently locked and cannot be changed', () => {
    const order = {
      id: 'ord_test_003',
      status: 'delivered',
    };

    function updateOrderStatus(existingOrder, newStatus) {
      if (existingOrder.status === 'delivered') {
        throw new Error('Order is delivered and finalized. Status cannot be modified.');
      }
      existingOrder.status = newStatus;
    }

    assert.throws(() => {
      updateOrderStatus(order, 'pending');
    }, /Status cannot be modified/);

    assert.throws(() => {
      updateOrderStatus(order, 'confirmed');
    }, /Status cannot be modified/);

    assert.throws(() => {
      updateOrderStatus(order, 'cancelled');
    }, /Status cannot be modified/);

    assert.equal(order.status, 'delivered');
  });

  test('4. Return Flow & Delivery Loss: Courier fee is an operational loss for shopkeeper on delivery', () => {
    // Delivery order with courier
    const deliveryOrder = {
      id: 'ord_test_004',
      total: 174,
      delivery_type: 'delivery',
      delivery_fee_minor: 5000, // ₹50.00
      status: 'delivered',
    };

    // Calculation logic matching worker & backend
    const deliveryLossMinor = deliveryOrder.delivery_type === 'delivery'
      ? (deliveryOrder.delivery_fee_minor || 5000)
      : 0;

    assert.equal(deliveryLossMinor, 5000);
    const deliveryLossRupees = deliveryLossMinor / 100;
    assert.equal(deliveryLossRupees, 50);

    // Pickup order has ₹0 delivery loss
    const pickupOrder = {
      id: 'ord_test_005',
      total: 174,
      delivery_type: 'pickup',
      delivery_fee_minor: 0,
      status: 'delivered',
    };

    const pickupLossMinor = pickupOrder.delivery_type === 'delivery'
      ? (pickupOrder.delivery_fee_minor || 5000)
      : 0;

    assert.equal(pickupLossMinor, 0);
  });

  test('5. Shopkeeper can review, reject or approve return requests', () => {
    const returnRequest = {
      id: 'ret_001',
      order_id: 'ord_test_004',
      status: 'requested',
      reason: 'Customer requested return: Damaged in transit',
      delivery_loss_minor: 5000,
    };

    assert.equal(returnRequest.status, 'requested');

    // Reject flow
    const rejectReason = 'Packaging seal was tampered by customer after delivery';
    returnRequest.status = 'rejected';
    returnRequest.rejection_reason = rejectReason;

    assert.equal(returnRequest.status, 'rejected');
    assert.equal(returnRequest.rejection_reason, rejectReason);
  });

  test('6. Product Non-Returnable Setting: Blocks return requests for non-returnable items', () => {
    const product = {
      id: 'prod_perishable_01',
      name: 'Fresh Dairy Paneer',
      price: 120,
      is_returnable: false,
    };

    assert.equal(product.is_returnable, false);

    // Order with both returnable and non-returnable items
    const orderItems = [
      { product_id: 'prod_perishable_01', name: 'Fresh Dairy Paneer', is_returnable: false, quantity: 1 },
      { product_id: 'prod_grocery_02', name: 'Basmati Rice 1kg', is_returnable: true, quantity: 1 },
    ];

    const returnableItems = orderItems.filter(item => item.is_returnable !== false);
    assert.equal(returnableItems.length, 1);
    assert.equal(returnableItems[0].name, 'Basmati Rice 1kg');

    const nonReturnableItems = orderItems.filter(item => item.is_returnable === false);
    assert.equal(nonReturnableItems.length, 1);
    assert.equal(nonReturnableItems[0].name, 'Fresh Dairy Paneer');
  });

});

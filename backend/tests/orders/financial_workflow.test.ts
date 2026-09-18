import request from 'supertest';
import app from '../../src/index';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, initializeDatabase } from '../../src/models/database';
import {
  toMinorUnits,
  fromMinorUnits,
  addMinor,
  subMinor,
  multiplyMinor,
  clampMinor,
  formatMinor,
} from '../../src/utils/money';
import { generateInvoicePdf, generateCreditNotePdf } from '../../src/services/pdfService';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod';
const testUserId = uuidv4();
const testEmail = `fin-tester-${Date.now()}@example.com`;
const authToken = jwt.sign({ id: testUserId, email: testEmail, plan: 'pro' }, JWT_SECRET);

describe('Financial, Invoicing, Refunds & Credit Notes Verification Suite', () => {
  let createdOrderId: string;
  let orderTrackingToken: string;
  let sampleInvoiceNumber: string;

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDatabase();
    db.prepare(`
      INSERT INTO users (id, email, name, plan, is_verified)
      VALUES (?, ?, 'Financial Merchant', 'pro', 1)
    `).run(testUserId, testEmail);

    try {
      db.prepare(`
        INSERT INTO organizations (id, name, store_slug, plan)
        VALUES (?, 'Financial Merchant Store', ?, 'pro')
      `).run(testUserId, `test-shop-${Date.now()}`);
    } catch (_) {}
  });

  afterAll(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM customer_sessions WHERE organization_id = ?').run(testUserId);
    db.prepare('DELETE FROM customers WHERE organization_id = ?').run(testUserId);
    db.prepare('DELETE FROM organizations WHERE id = ?').run(testUserId);
    db.prepare('DELETE FROM financial_audit_logs WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM credit_notes WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM refunds WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)').run(testUserId);
    db.prepare('DELETE FROM order_returns WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)').run(testUserId);
    db.prepare('DELETE FROM invoices WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM orders WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  // =========================================================================
  // 1. Integer Minor Units Utility Tests
  // =========================================================================
  describe('Money Utility (Minor Units & No Float Drift)', () => {
    it('correctly converts floating values to integer minor units without precision loss', () => {
      expect(toMinorUnits(100.5)).toBe(10050);
      expect(toMinorUnits(100.50)).toBe(10050);
      expect(toMinorUnits(49.99)).toBe(4999);
      expect(toMinorUnits(0.1 + 0.2)).toBe(30);
      expect(toMinorUnits(0)).toBe(0);
      expect(toMinorUnits('250.75')).toBe(25075);
    });

    it('correctly converts minor units back to major float for display', () => {
      expect(fromMinorUnits(10050)).toBe(100.5);
      expect(fromMinorUnits(4999)).toBe(49.99);
      expect(fromMinorUnits(30)).toBe(0.3);
      expect(fromMinorUnits(0)).toBe(0);
    });

    it('performs pure integer arithmetic', () => {
      expect(addMinor(10050, 4950)).toBe(15000);
      expect(subMinor(15000, 5000)).toBe(10000);
      expect(subMinor(5000, 10000)).toBe(-5000);
      expect(multiplyMinor(10050, 2)).toBe(20100);
      expect(clampMinor(-500, 0, 10000)).toBe(0);
      expect(clampMinor(15000, 0, 10000)).toBe(10000);
    });

    it('formats currencies accurately', () => {
      expect(formatMinor(10050, 'INR')).toBe('₹100.50');
      expect(formatMinor(5000, 'USD')).toBe('$50.00');
      expect(formatMinor(7500, 'EUR')).toBe('€75.00');
    });
  });

  // =========================================================================
  // 2. Pure Vector PDF Engine Tests
  // =========================================================================
  describe('Pure Vector PDF-1.4 Engine (Zero External Dependencies)', () => {
    it('generates a valid, syntactically conforming PDF-1.4 Invoice buffer', () => {
      const invoiceData = {
        invoiceNumber: 'INV-TEST-0001',
        orderId: 'ORD-TEST-1234',
        issuedAt: '2026-09-17',
        currency: 'INR',
        merchant: {
          name: 'Fera Setu Demo Store',
          businessName: 'Fera Setu Demo Store Pvt Ltd',
          address: '123 Tech Park, Bangalore, KA, India',
          city: 'Bangalore',
          state: 'KA',
          phone: '+91 9876543210',
          email: 'store@example.com',
          gstin: '29ABCDE1234F1Z5',
        },
        customer: {
          name: 'Aarav Patel',
          phone: '+91 9123456780',
          deliveryAddress: '45 Green Meadows, Bangalore',
          deliveryType: 'delivery',
        },
        items: [
          { name: 'Organic Almonds (500g)', quantity: 2, unitPriceMinor: 45000, totalMinor: 90000 },
          { name: 'Cold Pressed Coconut Oil (1L)', quantity: 1, unitPriceMinor: 35000, totalMinor: 35000 },
        ],
        subtotalMinor: 125000,
        deliveryFeeMinor: 5000,
        taxMinor: 0,
        totalMinor: 130000,
        amountPaidMinor: 130000,
        paymentStatus: 'paid',
        paymentMethod: 'Online UPI',
        notes: 'Thank you for shopping with us!',
      };

      const pdfBuffer = generateInvoicePdf(invoiceData);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(500);

      const pdfString = pdfBuffer.toString('binary');
      expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfString).toContain('/Type /Catalog');
      expect(pdfString).toContain('/Type /Pages');
      expect(pdfString).toContain('/Type /Page');
      expect(pdfString).toContain('/Type /Font');
      expect(pdfString).toContain('INV-TEST-0001');
      expect(pdfString).toContain('Powered by FeraSetu');
      expect(pdfString).toContain('xref');
      expect(pdfString).toContain('trailer');
      expect(pdfString).toContain('startxref');
      expect(pdfString.trim().endsWith('%%EOF')).toBe(true);
    });

    it('generates a valid Credit Note PDF-1.4 buffer referencing original invoice', () => {
      const creditNoteData = {
        creditNoteNumber: 'CN-TEST-0001',
        originalInvoiceNumber: 'INV-TEST-0001',
        originalOrderId: 'ORD-TEST-1234',
        issuedAt: '2026-09-17',
        currency: 'INR',
        reason: 'Goods returned by customer due to packaging damage',
        status: 'issued',
        merchant: {
          name: 'Fera Setu Demo Store',
          businessName: 'Fera Setu Demo Store Pvt Ltd',
          address: '123 Tech Park, Bangalore, KA, India',
          city: 'Bangalore',
          state: 'KA',
          phone: '+91 9876543210',
          email: 'store@example.com',
          gstin: '29ABCDE1234F1Z5',
        },
        customer: {
          name: 'Aarav Patel',
          phone: '+91 9123456780',
        },
        items: [
          { name: 'Organic Almonds (500g)', quantity: 1, unitPriceMinor: 45000, totalMinor: 45000 },
        ],
        taxableValueMinor: 45000,
        taxAdjustmentMinor: 0,
        totalCreditMinor: 45000,
      };

      const pdfBuffer = generateCreditNotePdf(creditNoteData);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      const pdfString = pdfBuffer.toString('binary');
      expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfString).toContain('CN-TEST-0001');
      expect(pdfString).toContain('INV-TEST-0001');
      expect(pdfString).toContain('CREDIT NOTE');
      expect(pdfString.trim().endsWith('%%EOF')).toBe(true);
    });
  });

  // =========================================================================
  // 3. Order Creation, Immutable Invoice, & Tracking Token Tests
  // =========================================================================
  describe('Order Creation & Immutable Tax Invoice', () => {
    it('creates an order with minor units, tracking token, and automatic immutable invoice', async () => {
      const payload = {
        customer_name: 'Vikram Mehta',
        customer_phone: '+919988776655',
        delivery_address: '77 Residency Road, Pune, MH',
        delivery_type: 'pickup',
        payment_method: 'cod',
        payment_status: 'unpaid',
        items: [
          { product_id: 'prod-pune-1', name: 'Alphonso Mango Box', price: 600, quantity: 2 },
        ],
        total: 1200,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.tracking_token).toBeDefined();
      expect(res.body.total_minor).toBe(120000);
      expect(res.body.payment_status).toBe('unpaid');

      createdOrderId = res.body.id;
      orderTrackingToken = res.body.tracking_token;

      // Verify invoice was created in DB
      const db = getDatabase();
      const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(createdOrderId) as any;
      expect(invoice).toBeDefined();
      expect(invoice.invoice_number).toMatch(/INV-/);
      expect(invoice.status).toBe('issued');
      expect(invoice.total_minor).toBe(120000);
      expect(invoice.amount_paid_minor).toBe(0);
      sampleInvoiceNumber = invoice.invoice_number;
    });

    it('allows downloading invoice PDF via authenticated merchant endpoint', async () => {
      const res = await request(app)
        .get(`/api/orders/${createdOrderId}/invoice/pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition'].toLowerCase()).toContain(`invoice-${sampleInvoiceNumber.toLowerCase()}.pdf`);
      expect(res.body).toBeDefined();
    });

    it('allows downloading invoice PDF via secure tracking token without merchant auth', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${createdOrderId}/invoice/pdf?token=${orderTrackingToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
    });

    it('rejects public invoice download with invalid tracking token', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${createdOrderId}/invoice/pdf?token=invalid-hacker-token`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 4. Decoupled Delivery OTP Verification
  // =========================================================================
  describe('Decoupled Delivery OTP Verification (Rule 1: MUST NOT set payment_status = paid)', () => {
    it('sets order status to delivered, logs verified_at and verified_by_user_id, but PRESERVES payment_status = unpaid', async () => {
      const db = getDatabase();
      const orderBefore = db.prepare('SELECT * FROM orders WHERE id = ?').get(createdOrderId) as any;
      expect(orderBefore.status).toBe('pending');
      expect(orderBefore.payment_status).toBe('unpaid');
      const deliveryCode = orderBefore.delivery_code;
      expect(deliveryCode).toBeDefined();

      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/verify-otp`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: deliveryCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const orderAfter = db.prepare('SELECT * FROM orders WHERE id = ?').get(createdOrderId) as any;
      expect(orderAfter.status).toBe('delivered');
      expect(orderAfter.verified_at).not.toBeNull();
      expect(orderAfter.verified_by_user_id).toBe(testUserId);
      // CRITICAL VERIFICATION: payment_status MUST REMAIN 'unpaid'
      expect(orderAfter.payment_status).toBe('unpaid');
    });
  });

  // =========================================================================
  // 5. Authoritative After-Sales & COD Refund Guards
  // =========================================================================
  describe('Authoritative Balance Calculation & Unpaid COD Guards', () => {
    it('returns authoritative financial breakdown via /:id/after-sales', async () => {
      const res = await request(app)
        .get(`/api/orders/${createdOrderId}/after-sales`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.order).toBeDefined();
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.total_minor).toBe(120000);
      expect(res.body.summary.amount_paid_minor).toBe(0);
      expect(res.body.summary.remaining_refundable_minor).toBe(0);
      expect(res.body.summary.is_unpaid_cod).toBe(true);
    });

    it('rejects refund request on unpaid COD order with clear explanation', async () => {
      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount_minor: 50000,
          reason: 'Customer cancelled at door',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No payment was collected');
    });
  });

  // =========================================================================
  // 6. Paid Order Refund Flow & Over-Refund Blocking
  // =========================================================================
  describe('Paid Order Refund Processing & Authoritative Balance Clamping', () => {
    let paidOrderId: string;

    beforeAll(async () => {
      const payload = {
        customer_name: 'Pooja Nair',
        customer_phone: '+919811223344',
        delivery_address: '10 Marine Lines, Mumbai',
        delivery_type: 'pickup',
        payment_method: 'upi',
        payment_status: 'paid',
        items: [
          { product_id: 'prod-mumbai-1', name: 'Artisan Sourdough', price: 250, quantity: 2 },
          { product_id: 'prod-mumbai-2', name: 'Salted Butter', price: 150, quantity: 1 },
        ],
        total: 650,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      paidOrderId = res.body.id;
    });

    it('issues a partial manual refund and updates balances atomically', async () => {
      const res = await request(app)
        .post(`/api/orders/${paidOrderId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount_minor: 25000, // ₹250.00
          reason: 'Customer item damaged in transit',
          method: 'manual_cod',
          manual_method: 'UPI Direct',
          manual_reference: 'UPI/987654/REF',
        });

      expect(res.status).toBe(201);
      expect(res.body.refund).toBeDefined();
      expect(res.body.refund.status).toBe('completed');
      expect(res.body.refund.amount_minor).toBe(25000);
      expect(res.body.balances.refunded_amount_minor).toBe(25000);
      expect(res.body.balances.remaining_refundable_minor).toBe(40000);

      const db = getDatabase();
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(paidOrderId) as any;
      expect(order.refunded_amount_minor).toBe(25000);
      expect(order.refundable_amount_minor).toBe(40000);
    });

    it('strictly blocks attempts to over-refund beyond remaining balance', async () => {
      const res = await request(app)
        .post(`/api/orders/${paidOrderId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount_minor: 50000,
          reason: 'Excessive refund attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exceeds remaining refundable balance');
    });

    it('allows refunding the exact remaining balance', async () => {
      const res = await request(app)
        .post(`/api/orders/${paidOrderId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount_minor: 40000, // Remaining ₹400.00
          reason: 'Customer satisfaction guarantee',
          method: 'manual_cod',
          manual_method: 'Bank Transfer NEFT',
          manual_reference: 'NEFT/2026/8899',
        });

      expect(res.status).toBe(201);
      expect(res.body.balances.remaining_refundable_minor).toBe(0);
      expect(res.body.balances.refunded_amount_minor).toBe(65000);

      const db = getDatabase();
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(paidOrderId) as any;
      expect(order.payment_status).toBe('refunded');
      expect(order.refundable_amount_minor).toBe(0);
    });
  });

  // =========================================================================
  // 7. Credit Notes Lifecycle & Immutability
  // =========================================================================
  describe('Credit Notes Lifecycle & PDF Generation', () => {
    let testCreditNoteId: string;

    it('issues a credit note on an order without mutating the original invoice status', async () => {
      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/credit-notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Price adjustment for promotional discount',
          items: [
            { name: 'Alphonso Mango Box discount', quantity: 1, amount_minor: 20000 },
          ],
          total_minor: 20000,
        });

      expect(res.status).toBe(201);
      expect(res.body.credit_note).toBeDefined();
      expect(res.body.credit_note.credit_note_number).toMatch(/CN-/);
      expect(res.body.credit_note.status).toBe('issued');
      expect(res.body.credit_note.total_minor).toBe(20000);
      testCreditNoteId = res.body.credit_note.id;

      const db = getDatabase();
      const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(createdOrderId) as any;
      expect(invoice.status).toBe('issued');
    });

    it('downloads the generated Credit Note PDF', async () => {
      const res = await request(app)
        .get(`/api/orders/${createdOrderId}/credit-notes/${testCreditNoteId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toContain('.pdf');
    });
  });

  // =========================================================================
  // 8. Storefront Return Policy & Quantity Guards
  // =========================================================================
  describe('Customer Storefront Return Validation', () => {
    let customerOrderId: string;
    let customerToken: string;
    let customerId: string;

    beforeAll(async () => {
      const db = getDatabase();

      // Register storefront customer
      const regRes = await request(app)
        .post('/api/storefront/customer/register')
        .send({
          shopId: testUserId,
          name: 'Kavita Rao',
          email: `kavita-${Date.now()}@example.com`,
          password: 'Password123!',
          phone: '+919777888999',
        });

      expect(regRes.status).toBe(201);
      customerToken = regRes.body.token;
      customerId = regRes.body.customer.id;

      const payload = {
        customer_name: 'Kavita Rao',
        customer_phone: '+919777888999',
        delivery_address: '15 Gandhi Marg, Chennai',
        delivery_type: 'pickup',
        payment_method: 'cod',
        payment_status: 'paid',
        items: [
          { product_id: 'prod-chn-1', name: 'Cotton Bedspread', price: 500, quantity: 3 },
        ],
        total: 1500,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      customerOrderId = res.body.id;

      // Associate customer with order
      db.prepare('UPDATE orders SET customer_id = ?, user_id = ? WHERE id = ?').run(customerId, testUserId, customerOrderId);

      // Mark delivered via OTP
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(customerOrderId) as any;
      await request(app)
        .post(`/api/orders/${customerOrderId}/verify-otp`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: order.delivery_code });
    });

    it('blocks return request when returned quantity exceeds purchased quantity', async () => {
      // Purchased 3, attempt to return 5
      const res = await request(app)
        .post(`/api/storefront/customer/orders/${customerOrderId}/return`)
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-shop-id', testUserId)
        .send({
          reason: 'Defective item',
          items: [
            { name: 'Cotton Bedspread', quantity: 5 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('purchased');
    });

    it('accepts valid return request with quantity <= purchased quantity', async () => {
      // Return 2 of 3
      const res = await request(app)
        .post(`/api/storefront/customer/orders/${customerOrderId}/return`)
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-shop-id', testUserId)
        .send({
          reason: 'Color mismatch',
          items: [
            { name: 'Cotton Bedspread', quantity: 2 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.returnRequest).toBeDefined();
      expect(res.body.returnRequest.status).toBe('requested');

      const db = getDatabase();
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(customerOrderId) as any;
      expect(order.return_status).toBe('requested');
    });
  });
});

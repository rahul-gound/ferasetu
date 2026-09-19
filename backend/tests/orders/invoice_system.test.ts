import request from 'supertest';
import app from '../../src/index';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, initializeDatabase } from '../../src/models/database';
import { generateInvoicePdf, InvoicePdfData } from '../../src/services/pdfService';
import { generateOrderTrackingToken } from '../../src/routes/orders';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod';

// Merchant A
const merchantAId = uuidv4();
const merchantAEmail = `merchant-a-${Date.now()}@example.com`;
const aliceStoreSlug = `alice-shop-${Date.now()}`;
const tokenA = jwt.sign({ id: merchantAId, email: merchantAEmail, plan: 'pro' }, JWT_SECRET);

// Merchant B (tenant isolation test)
const merchantBId = uuidv4();
const merchantBEmail = `merchant-b-${Date.now()}@example.com`;
const tokenB = jwt.sign({ id: merchantBId, email: merchantBEmail, plan: 'pro' }, JWT_SECRET);

// Customer setup
const customerPhone = '+919876501234';
const customerSessionToken = 'raw_customer_token_' + uuidv4();
const customerId = uuidv4();

describe('Professional Invoice System (P1.1) Verification Suite', () => {
  let merchantAOrderId: string;
  let merchantAInvoiceNumber: string;
  let trackingToken: string;

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDatabase();

    // Create Merchant A
    db.prepare(`
      INSERT INTO users (id, email, name, business_name, plan, is_verified)
      VALUES (?, ?, 'Merchant Alice', 'Alice Superstore', 'pro', 1)
    `).run(merchantAId, merchantAEmail);

    db.prepare(`
      INSERT INTO organizations (id, name, store_slug, plan)
      VALUES (?, 'Alice Superstore', ?, 'pro')
    `).run(merchantAId, aliceStoreSlug);

    // Create Merchant B
    db.prepare(`
      INSERT INTO users (id, email, name, business_name, plan, is_verified)
      VALUES (?, ?, 'Merchant Bob', 'Bob Kirana', 'pro', 1)
    `).run(merchantBId, merchantBEmail);

    // Create Customer under Merchant A
    db.prepare(`
      INSERT INTO customers (id, organization_id, phone, name, email)
      VALUES (?, ?, ?, 'Test Customer', 'customer@example.com')
    `).run(customerId, merchantAId, customerPhone);

    const tokenHash = crypto.createHash('sha256').update(customerSessionToken).digest('hex');
    db.prepare(`
      INSERT INTO customer_sessions (id, customer_id, organization_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, datetime('now', '+7 days'), datetime('now'))
    `).run(uuidv4(), customerId, merchantAId, tokenHash);
  });

  afterAll(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM customer_sessions WHERE organization_id IN (?, ?)').run(merchantAId, merchantBId);
    db.prepare('DELETE FROM customers WHERE organization_id IN (?, ?)').run(merchantAId, merchantBId);
    db.prepare('DELETE FROM organizations WHERE id IN (?, ?)').run(merchantAId, merchantBId);
    db.prepare('DELETE FROM invoices WHERE user_id IN (?, ?)').run(merchantAId, merchantBId);
    db.prepare('DELETE FROM orders WHERE user_id IN (?, ?)').run(merchantAId, merchantBId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(merchantAId, merchantBId);
  });

  // =========================================================================
  // 1. Multi-Page Vector PDF Generation Engine Tests
  // =========================================================================
  describe('Multi-Page Vector PDF Generator', () => {
    it('generates a single-page vector PDF for a small order (1-3 items)', async () => {
      const pdfData: InvoicePdfData = {
        invoiceNumber: 'INV-2026-TEST01',
        orderId: 'ord-single-page-01',
        issuedAt: new Date().toISOString(),
        currency: 'INR',
        merchant: {
          name: 'Merchant Alice',
          businessName: 'Alice Superstore',
          address: '123 Market Road, Bengaluru',
          gstin: '29ABCDE1234F1Z5',
          phone: '+919876543210',
          email: 'alice@example.com',
        },
        customer: {
          name: 'Jane Doe',
          phone: customerPhone,
          email: 'jane@example.com',
          deliveryAddress: 'Flat 101, Lakeview, Bengaluru',
          deliveryType: 'delivery',
        },
        items: [
          { name: 'Cold Pressed Mustard Oil 1L', quantity: 1, unitPriceMinor: 19000, totalMinor: 19000 },
          { name: 'Organic Turmeric 100g', quantity: 1, unitPriceMinor: 6000, totalMinor: 6000 },
        ],
        subtotalMinor: 25000,
        deliveryFeeMinor: 0,
        taxMinor: 0,
        totalMinor: 25000,
        amountPaidMinor: 25000,
        balanceDueMinor: 0,
        paymentMethod: 'UPI',
        paymentStatus: 'paid',
      };

      const pdfBuffer = generateInvoicePdf(pdfData);

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(500);

      const pdfText = pdfBuffer.toString('binary');
      expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfText).toContain('/Type /Pages');
      expect(pdfText).toContain('/Count 1');
      expect(pdfText).toContain('ALICE SUPERSTORE');
      expect(pdfText).toContain('Cold Pressed Mustard Oil');
      expect(pdfText).toContain('%%EOF');
    });

    it('automatically breaks into multi-page PDF with repeated headers when items exceed 30', async () => {
      // Create 36 line items to force at least 2 pages
      const manyItems = [];
      let totalMinor = 0;
      for (let i = 1; i <= 36; i++) {
        const itemPrice = 5000 + i * 200;
        totalMinor += itemPrice * 2;
        manyItems.push({
          name: `Item #${i} Premium Organic Spice Blend ${i}00g pack`,
          quantity: 2,
          unitPriceMinor: itemPrice,
          totalMinor: itemPrice * 2,
        });
      }

      const multiPageData: InvoicePdfData = {
        invoiceNumber: 'INV-2026-MULTI36',
        orderId: 'ord-multi-page-36',
        issuedAt: new Date().toISOString(),
        currency: 'INR',
        merchant: {
          name: 'Merchant Alice',
          businessName: 'Alice Superstore',
          address: 'Warehouse 4B, Electronic City, Bengaluru',
          gstin: '29ABCDE1234F1Z5',
          phone: '+919876543210',
          email: 'alice@example.com',
        },
        customer: {
          name: 'Wholesale Buyer',
          phone: customerPhone,
          email: 'wholesale@example.com',
          deliveryAddress: 'Commercial Street, Bengaluru',
          deliveryType: 'delivery',
        },
        items: manyItems,
        subtotalMinor: totalMinor,
        deliveryFeeMinor: 0,
        taxMinor: 0,
        totalMinor,
        amountPaidMinor: totalMinor,
        balanceDueMinor: 0,
        paymentMethod: 'Bank Transfer',
        paymentStatus: 'paid',
      };

      const pdfBuffer = generateInvoicePdf(multiPageData);

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      const pdfText = pdfBuffer.toString('binary');

      expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
      // Verify multi-page catalog /Pages has Count > 1
      const countMatch = pdfText.match(/\/Count\s+(\d+)/);
      expect(countMatch).not.toBeNull();
      const pageCount = parseInt(countMatch![1], 10);
      expect(pageCount).toBeGreaterThanOrEqual(2);

      // Verify page references in /Kids
      expect(pdfText).toContain('/Kids [');
      // Verify pagination footer text
      expect(pdfText).toContain('Page 1 of');
      expect(pdfText).toContain('Page 2 of');
      // Verify line items from both pages exist
      expect(pdfText).toContain('Item #1');
      expect(pdfText).toContain('Item #35');
      expect(pdfText).toContain('%%EOF');
    });
  });

  // =========================================================================
  // 2. Invoice Creation, Idempotency & Database Constraints
  // =========================================================================
  describe('Invoice Creation & Idempotency', () => {
    it('creates an order and automatically provisions a unique professional invoice', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customer_name: 'Sunita Roy',
          customer_phone: customerPhone,
          customer_email: 'sunita@example.com',
          delivery_address: '74 MG Road, Bengaluru',
          delivery_type: 'delivery',
          items: [
            { product_id: 'p-1', name: 'Darjeeling Tea 250g', price: 350, quantity: 1 },
            { product_id: 'p-2', name: 'Assam Gold Tea 500g', price: 420, quantity: 2 },
          ],
          total: 1190,
          currency: 'INR',
        });

      merchantAOrderId = res.body.id;
      merchantAInvoiceNumber = res.body.invoiceNumber || res.body.invoice_number;
      trackingToken = generateOrderTrackingToken(merchantAOrderId, customerPhone);

      expect(res.status).toBe(201);
      expect(merchantAOrderId).toBeDefined();
      expect(merchantAInvoiceNumber).toMatch(/INV-/);

      // Link customer to this order so customer portal tests can fetch it
      const db = getDatabase();
      db.prepare('UPDATE orders SET customer_id = ?, organization_id = ? WHERE id = ?')
        .run(customerId, merchantAId, merchantAOrderId);

      // Verify invoice row in database
      const invoiceRow = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(merchantAOrderId) as any;
      expect(invoiceRow).toBeDefined();
      expect(invoiceRow.invoice_number).toBe(merchantAInvoiceNumber);
      expect(invoiceRow.user_id).toBe(merchantAId);
    });

    it('enforces idempotency: multiple invoice checks return the identical invoice record', async () => {
      const res = await request(app)
        .get(`/api/orders/${merchantAOrderId}/invoice`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.invoice).toBeDefined();
      expect(res.body.invoice.invoice_number).toBe(merchantAInvoiceNumber);
      expect(res.body.invoice.order_id).toBe(merchantAOrderId);
    });

    it('enforces database unique index to prevent duplicate invoice records for the same order', () => {
      const db = getDatabase();
      expect(() => {
        db.prepare(`
          INSERT INTO invoices (id, user_id, order_id, invoice_number, total, currency, status)
          VALUES ('inv-dup-test', ?, ?, 'INV-DUPLICATE-999', 1190, 'INR', 'issued')
        `).run(merchantAId, merchantAOrderId);
      }).toThrow(); // Should throw UNIQUE constraint failed: invoices.order_id
    });
  });

  // =========================================================================
  // 3. Strict Tenant Isolation (Security Barrier)
  // =========================================================================
  describe('Strict Tenant Isolation', () => {
    it('blocks Merchant B from viewing Merchant A invoice data (IDOR protection)', async () => {
      const res = await request(app)
        .get(`/api/orders/${merchantAOrderId}/invoice`)
        .set('Authorization', `Bearer ${tokenB}`);

      // Expect 404 or 403
      expect([403, 404]).toContain(res.status);
    });

    it('blocks Merchant B from downloading Merchant A invoice PDF', async () => {
      const res = await request(app)
        .get(`/api/orders/${merchantAOrderId}/invoice/pdf`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect([403, 404]).toContain(res.status);
    });

    it('allows Merchant A to download their own invoice PDF', async () => {
      const res = await request(app)
        .get(`/api/orders/${merchantAOrderId}/invoice/pdf`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toContain(merchantAInvoiceNumber);
      expect(res.body.length).toBeGreaterThan(500);
    });
  });

  // =========================================================================
  // 4. Public Customer Tracking Token Cryptographic Verification
  // =========================================================================
  describe('Public Invoice Access via Tracking Token', () => {
    it('rejects public invoice request without tracking token', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${merchantAOrderId}/invoice`);

      expect([400, 401, 403]).toContain(res.status);
    });

    it('rejects public invoice request with invalid token', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${merchantAOrderId}/invoice?token=invalid_forged_token`);

      expect([401, 403]).toContain(res.status);
    });

    it('serves complete invoice payload when presenting valid cryptographic possession token', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${merchantAOrderId}/invoice?token=${encodeURIComponent(trackingToken)}`);

      expect(res.status).toBe(200);
      expect(res.body.invoice).toBeDefined();
      expect(res.body.invoice.invoice_number).toBe(merchantAInvoiceNumber);
      expect(res.body.invoice.customer.phone).toBe(customerPhone);
      expect(res.body.invoice.merchant.business_name).toBe('Alice Superstore');
      expect(res.body.invoice.items.length).toBe(2);
    });

    it('streams PDF via public endpoint when presenting valid tracking token', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${merchantAOrderId}/invoice/pdf?token=${encodeURIComponent(trackingToken)}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.body.length).toBeGreaterThan(500);
    });
  });

  // =========================================================================
  // 5. Authenticated Storefront Customer Portal Access
  // =========================================================================
  describe('Storefront Customer Authenticated Invoicing', () => {
    it('serves invoice details to authenticated customer with active session', async () => {
      const res = await request(app)
        .get(`/api/storefront/customer/orders/${merchantAOrderId}/invoice`)
        .set('x-shop-id', merchantAId)
        .set('X-Customer-Session', customerSessionToken);

      expect(res.status).toBe(200);
      expect(res.body.invoice).toBeDefined();
      expect(res.body.invoice.invoice_number).toBe(merchantAInvoiceNumber);
      expect(res.body.invoice.order_id).toBe(merchantAOrderId);
    });

    it('streams invoice PDF to authenticated customer', async () => {
      const res = await request(app)
        .get(`/api/storefront/customer/orders/${merchantAOrderId}/invoice/pdf`)
        .set('x-shop-id', merchantAId)
        .set('X-Customer-Session', customerSessionToken);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.body.length).toBeGreaterThan(500);
    });

    it('blocks customer with no session header from storefront customer invoice', async () => {
      const res = await request(app)
        .get(`/api/storefront/customer/orders/${merchantAOrderId}/invoice`)
        .set('x-shop-id', merchantAId);

      expect([401, 403]).toContain(res.status);
    });
  });
});

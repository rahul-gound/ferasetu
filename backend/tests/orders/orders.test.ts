import request from 'supertest';
import app from '../../src/index';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, initializeDatabase } from '../../src/models/database';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod';
const testUserId = uuidv4();
const testEmail = `order-tester-${Date.now()}@example.com`;
const authToken = jwt.sign({ id: testUserId, email: testEmail, plan: 'pro' }, JWT_SECRET);

describe('Orders API Tests', () => {
  let createdOrderId: string;

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDatabase();
    db.prepare(`
      INSERT INTO users (id, email, name, plan, is_verified)
      VALUES (?, ?, 'Order Merchant', 'pro', 1)
    `).run(testUserId, testEmail);
  });

  afterAll(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM orders WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  it('POST /api/orders creates a new customer order', async () => {
    const payload = {
      customer_name: 'Rahul Sharma',
      customer_phone: '+919876543210',
      delivery_address: '123 Market Street, Delhi',
      delivery_type: 'delivery',
      items: [
        { product_id: 'prod-1', name: 'Rice', price: 100, quantity: 2 }
      ],
      total: 200
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.customer_name).toBe('Rahul Sharma');
    createdOrderId = res.body.id;
  });

  it('GET /api/orders lists all merchant orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/orders/:id retrieves order details', async () => {
    const res = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdOrderId);
  });
});

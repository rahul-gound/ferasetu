import request from 'supertest';
import app from '../../src/index';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, initializeDatabase } from '../../src/models/database';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod';
const testUserId = uuidv4();
const testEmail = `test-merchant-${Date.now()}@example.com`;
const authToken = jwt.sign({ id: testUserId, email: testEmail, plan: 'pro' }, JWT_SECRET);

describe('Products API — D1 & Appwrite Storage', () => {
  let createdProductId: string;

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDatabase();
    db.prepare(`
      INSERT INTO users (id, email, name, plan, is_verified)
      VALUES (?, ?, ?, 'pro', 1)
    `).run(testUserId, testEmail, 'Product Test Merchant');
  });

  afterAll(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM products WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  it('POST /api/products with JSON and empty numerical strings should succeed without NaN', async () => {
    const payload = {
      name: 'Test Basmati Rice 5kg',
      price: 450,
      cost_price: '',
      sale_price: '',
      stock_quantity: '',
      image_url: 'https://sgp.cloud.appwrite.io/v1/storage/buckets/69f60d1f00330c793cab/files/sample/view',
      category: 'Grocery'
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Test Basmati Rice 5kg');
    expect(res.body.price).toBe(450);
    expect(res.body.cost_price).toBeNull();
    expect(res.body.sale_price).toBeNull();
    expect(res.body.stock_quantity).toBe(0);
    expect(res.body.image_url).toBe(payload.image_url);

    createdProductId = res.body.id;

    // Verify directly in D1
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(createdProductId) as any;
    expect(row).toBeDefined();
    expect(row.cost_price).toBeNull();
    expect(row.stock_quantity).toBe(0);
    expect(Number.isNaN(row.cost_price)).toBe(false);
  });

  it('POST /api/products should accept camelCase imageUrl for backward compatibility', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Turmeric Powder 200g',
        price: 65,
        imageUrl: 'https://sgp.cloud.appwrite.io/v1/storage/buckets/69f60d1f00330c793cab/files/turmeric/view'
      });

    expect(res.status).toBe(201);
    expect(res.body.image_url).toBe('https://sgp.cloud.appwrite.io/v1/storage/buckets/69f60d1f00330c793cab/files/turmeric/view');

    // Clean up
    getDatabase().prepare('DELETE FROM products WHERE id = ?').run(res.body.id);
  });

  it('POST /api/products with multipart/form-data should upload file to Appwrite and persist URL', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .field('name', 'Organic Honey 500g')
      .field('price', '299')
      .field('stock_quantity', '15')
      .attach('image', Buffer.from('fake png image'), 'honey.png');

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Organic Honey 500g');
    expect(res.body.image_url).toContain('/storage/buckets/69f60d1f00330c793cab/files/');

    // Clean up
    getDatabase().prepare('DELETE FROM products WHERE id = ?').run(res.body.id);
  });

  it('POST /api/products should validate required name', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '   ',
        price: 100
      });

    expect(res.status).toBe(400);
  });

  it('POST /api/products should reject negative price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Bad Price Product',
        price: -50
      });

    expect([400, 422]).toContain(res.status);
    expect(res.body.error).toContain('non-negative');
  });

  it('POST /api/products should reject negative stock quantity', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Negative Stock Product',
        price: 50,
        stock_quantity: -5
      });

    expect([400, 422]).toContain(res.status);
    expect(res.body.error).toContain('Stock quantity');
  });

  it('POST /api/products should reject dangerous/malformed image URL schemes', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'XSS Image Product',
        price: 50,
        image_url: 'javascript:alert("hacked")'
      });

    expect([400, 422]).toContain(res.status);
    expect(res.body.error).toContain('Invalid image URL format');
  });

  it('GET /api/products should list merchant products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/products/:id should retrieve single product', async () => {
    const res = await request(app)
      .get(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdProductId);
  });

  it('GET /api/products/:id with nonexistent ID should return 404', async () => {
    const res = await request(app)
      .get('/api/products/non-existent-id')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });

  it('PUT /api/products/:id should update product details', async () => {
    const res = await request(app)
      .put(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        price: 499,
        stock_quantity: 25
      });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe(499);
    expect(res.body.stock_quantity).toBe(25);
  });

  it('DELETE /api/products/:id should remove product from D1', async () => {
    const res = await request(app)
      .delete(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app)
      .get(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(check.status).toBe(404);
  });
});

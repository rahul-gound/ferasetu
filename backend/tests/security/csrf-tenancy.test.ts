import request from 'supertest';
import app from '../../src/index';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, initializeDatabase } from '../../src/models/database';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod';

describe('Security & Multi-Tenant Isolation Tests', () => {
  const merchantA_Id = uuidv4();
  const merchantB_Id = uuidv4();
  const tokenA = jwt.sign({ id: merchantA_Id, email: 'merchant-a@test.com', plan: 'pro' }, JWT_SECRET);
  const tokenB = jwt.sign({ id: merchantB_Id, email: 'merchant-b@test.com', plan: 'pro' }, JWT_SECRET);
  let productB_Id: string;

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDatabase();

    db.prepare(`
      INSERT INTO users (id, email, name, plan, is_verified)
      VALUES (?, 'merchant-a@test.com', 'Merchant A', 'pro', 1),
             (?, 'merchant-b@test.com', 'Merchant B', 'pro', 1)
    `).run(merchantA_Id, merchantB_Id);

    // Create a product owned by Merchant B
    productB_Id = uuidv4();
    db.prepare(`
      INSERT INTO products (id, user_id, name, price, stock_quantity)
      VALUES (?, ?, 'Merchant B Secret Item', 1000, 5)
    `).run(productB_Id, merchantB_Id);
  });

  afterAll(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM products WHERE user_id IN (?, ?)').run(merchantA_Id, merchantB_Id);
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(merchantA_Id, merchantB_Id);
  });

  describe('CSRF Security Boundaries', () => {
    it('POST /api/auth/login should NOT be blocked by CSRF (403)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' });

      // Should fail with 401 (invalid credentials) or 400, NEVER 403 CSRF_INVALID
      expect(res.status).not.toBe(403);
    });

    it('POST /api/users/workos-session should NOT be blocked by CSRF (403)', async () => {
      const res = await request(app)
        .post('/api/users/workos-session')
        .send({});

      // Should fail with 401 (Missing token), NEVER 403 CSRF_INVALID
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Missing WorkOS access token');
    });
  });

  describe('Tenant Data Isolation', () => {
    it('Merchant A cannot view Merchant B product by ID', async () => {
      const res = await request(app)
        .get(`/api/products/${productB_Id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Product not found');
    });

    it('Merchant A cannot edit Merchant B product', async () => {
      const res = await request(app)
        .put(`/api/products/${productB_Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ price: 1 });

      expect(res.status).toBe(404);

      // Verify product price did NOT change in D1
      const check = getDatabase().prepare('SELECT price FROM products WHERE id = ?').get(productB_Id) as any;
      expect(check.price).toBe(1000);
    });

    it('Merchant A cannot delete Merchant B product', async () => {
      const res = await request(app)
        .delete(`/api/products/${productB_Id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);

      // Verify product still exists in D1
      const check = getDatabase().prepare('SELECT id FROM products WHERE id = ?').get(productB_Id);
      expect(check).toBeDefined();
    });

    it('Merchant A product list never contains Merchant B products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const ids = (res.body.products || []).map((p: any) => p.id);
      expect(ids).not.toContain(productB_Id);
    });
  });
});

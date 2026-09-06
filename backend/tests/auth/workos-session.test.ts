import request from 'supertest';
import app from '../../src/index';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, initializeDatabase } from '../../src/models/database';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod';
const testUserId = uuidv4();
const testEmail = `workos-tester-${Date.now()}@example.com`;
const authToken = jwt.sign({ id: testUserId, email: testEmail, plan: 'pro' }, JWT_SECRET);

describe('WorkOS Authentication & Session Tests', () => {
  beforeAll(async () => {
    await initializeDatabase();
    const db = getDatabase();
    db.prepare(`
      INSERT INTO users (id, email, name, plan, is_verified)
      VALUES (?, ?, 'WorkOS Merchant', 'pro', 1)
    `).run(testUserId, testEmail);
  });

  afterAll(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  it('POST /api/users/workos-session rejects request when Bearer token is missing', async () => {
    const res = await request(app)
      .post('/api/users/workos-session')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Missing WorkOS access token');
  });

  it('POST /api/users/workos-session rejects invalid token structure', async () => {
    const res = await request(app)
      .post('/api/users/workos-session')
      .set('Authorization', 'Bearer invalid.token.value')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('failed');
  });

  it('GET /api/auth/me returns current user profile for authenticated session', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testUserId);
    expect(res.body.email).toBe(testEmail);
    expect(res.body.name).toBe('WorkOS Merchant');
  });

  it('POST /api/auth/logout successfully clears session', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(200);
  });
});

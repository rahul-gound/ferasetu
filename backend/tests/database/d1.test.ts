import { getDatabase, initializeDatabase } from '../../src/models/database';
import { v4 as uuidv4 } from 'uuid';

describe('Cloudflare D1 Database Tests', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it('D1 database should be reachable and initialized', () => {
    const db = getDatabase();
    expect(db).toBeDefined();
  });

  it('should execute parameterized D1 queries safely without SQL injection', () => {
    const db = getDatabase();
    const testUserId = uuidv4();
    const testEmail = `d1-test-${Date.now()}@example.com`;

    // Insert
    db.prepare(`
      INSERT INTO users (id, email, name, plan)
      VALUES (?, ?, ?, ?)
    `).run(testUserId, testEmail, 'D1 Test User', 'pro');

    // Select
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(testUserId) as any;
    expect(user).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.plan).toBe('pro');

    // Update
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run('Updated D1 User', testUserId);
    const updated = db.prepare('SELECT name FROM users WHERE id = ?').get(testUserId) as any;
    expect(updated.name).toBe('Updated D1 User');

    // Delete
    const delRes = db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    expect(delRes.changes).toBe(1);

    const check = db.prepare('SELECT * FROM users WHERE id = ?').get(testUserId);
    expect(check).toBeUndefined();
  });

  it('should support D1 standard prepare.bind().first() and .all() APIs', async () => {
    const db = getDatabase();
    const testId = uuidv4();
    db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)')
      .bind(testId, `bind-${Date.now()}@example.com`, 'Bind Tester')
      .run();

    const row = await db.prepare('SELECT id, name FROM users WHERE id = ?')
      .bind(testId)
      .first() as any;

    expect(row).toBeDefined();
    expect(row.id).toBe(testId);
    expect(row.name).toBe('Bind Tester');

    // Clean up
    db.prepare('DELETE FROM users WHERE id = ?').run(testId);
  });
});

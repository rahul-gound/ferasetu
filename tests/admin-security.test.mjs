import test from 'node:test';
import assert from 'node:assert/strict';

// Test database mock
class MockD1PreparedStatement {
  constructor(query, db) {
    this.query = query;
    this.db = db;
    this.bound = [];
  }
  bind(...args) {
    this.bound = args;
    return this;
  }
  async first(col) {
    if (this.query.includes('COUNT(*) as count FROM ip_firewall_rules')) {
      const active = this.db.firewallRules.filter(r => r.is_active === 1);
      return col ? active.length : { count: active.length };
    }
    if (this.query.includes('COUNT(*) as count FROM admin_audit_logs')) {
      return col ? this.db.auditLogs.length : { count: this.db.auditLogs.length };
    }
    return { count: 0 };
  }
  async all() {
    if (this.query.includes('FROM ip_firewall_rules')) {
      return { results: this.db.firewallRules };
    }
    if (this.query.includes('FROM admin_audit_logs')) {
      return { results: this.db.auditLogs };
    }
    return { results: [] };
  }
  async run() {
    if (this.query.includes('INSERT INTO ip_firewall_rules')) {
      const [id, ip_address, reason, banned_by, created_at, expires_at] = this.bound;
      const existingIdx = this.db.firewallRules.findIndex(r => r.ip_address === ip_address);
      const rule = { id, ip_address, reason, banned_by, is_active: 1, created_at, expires_at };
      if (existingIdx >= 0) {
        this.db.firewallRules[existingIdx] = rule;
      } else {
        this.db.firewallRules.push(rule);
      }
      return { success: true };
    }
    if (this.query.includes('UPDATE ip_firewall_rules SET is_active = 0')) {
      const target = this.bound[0];
      for (const r of this.db.firewallRules) {
        if (r.id === target || r.ip_address === target) {
          r.is_active = 0;
        }
      }
      return { success: true };
    }
    if (this.query.includes('INSERT INTO admin_audit_logs')) {
      this.db.auditLogs.push({
        id: this.bound[0],
        admin_email: this.bound[1],
        action: this.bound[2],
        target_type: this.bound[3],
        target_id: this.bound[4],
        metadata: this.bound[5],
        ip_address: this.bound[6],
        severity: this.bound[7],
        created_at: this.bound[8]
      });
      return { success: true };
    }
    return { success: true };
  }
}

class MockD1 {
  constructor() {
    this.firewallRules = [];
    this.auditLogs = [];
  }
  prepare(q) {
    return new MockD1PreparedStatement(q, this);
  }
}

test('Admin Security System: edge firewall & audit validation', async (t) => {
  const db = new MockD1();
  const env = { DB: db, ADMIN_JWT_SECRET: 'test-secret' };

  await t.test('1. Ban IP creates active rule in firewall', async () => {
    const id = 'rule_1';
    const ip = '198.51.100.42';
    const reason = 'Credential brute force attack';
    const enforcer = 'ceo@ferasetu.com';
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO ip_firewall_rules (id, ip_address, reason, banned_by, is_active, created_at, expires_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).bind(id, ip, reason, enforcer, now, null).run();

    assert.equal(db.firewallRules.length, 1);
    assert.equal(db.firewallRules[0].ip_address, '198.51.100.42');
    assert.equal(db.firewallRules[0].is_active, 1);
  });

  await t.test('2. Overview counts active firewall rules correctly', async () => {
    const row = await db.prepare("SELECT COUNT(*) as count FROM ip_firewall_rules WHERE is_active = 1").first("count");
    assert.equal(row, 1);
  });

  await t.test('3. Unban IP deactivates firewall rule', async () => {
    await db.prepare("UPDATE ip_firewall_rules SET is_active = 0 WHERE ip_address = ?").bind('198.51.100.42').run();
    assert.equal(db.firewallRules[0].is_active, 0);

    const activeCount = await db.prepare("SELECT COUNT(*) as count FROM ip_firewall_rules WHERE is_active = 1").first("count");
    assert.equal(activeCount, 0);
  });

  await t.test('4. Security audit log records actor, IP and severity', async () => {
    await db.prepare(`
      INSERT INTO admin_audit_logs (id, admin_email, action, target_type, target_id, metadata, ip_address, severity, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'audit_1',
      'security@ferasetu.com',
      'FIREWALL_IP_BANNED',
      'ip_firewall',
      '203.0.113.19',
      JSON.stringify({ reason: 'DDoS mitigation' }),
      '192.0.2.1',
      'critical',
      new Date().toISOString()
    ).run();

    assert.equal(db.auditLogs.length, 1);
    assert.equal(db.auditLogs[0].action, 'FIREWALL_IP_BANNED');
    assert.equal(db.auditLogs[0].severity, 'critical');
    assert.equal(db.auditLogs[0].ip_address, '192.0.2.1');
  });
});

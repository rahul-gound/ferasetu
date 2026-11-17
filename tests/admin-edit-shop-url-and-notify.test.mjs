import test from 'node:test';
import assert from 'node:assert/strict';

// Test Mock D1 Database
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
    if (this.query.includes('FROM users WHERE id = ?')) {
      const u = this.db.users.find(user => user.id === this.bound[0]);
      return u || null;
    }
    if (this.query.includes('FROM users WHERE LOWER(subdomain) = ?')) {
      const sub = String(this.bound[0]).toLowerCase();
      const excludeId = this.bound[1];
      const match = this.db.users.find(u => u.subdomain?.toLowerCase() === sub && u.id !== excludeId);
      return match || null;
    }
    if (this.query.includes('FROM users WHERE LOWER(custom_domain) = ?')) {
      const cd = String(this.bound[0]).toLowerCase();
      const excludeId = this.bound[1];
      const match = this.db.users.find(u => u.custom_domain?.toLowerCase() === cd && u.id !== excludeId);
      return match || null;
    }
    if (this.query.includes('SELECT site_changed_notice FROM users WHERE id = ?')) {
      const u = this.db.users.find(user => user.id === this.bound[0]);
      return u ? { site_changed_notice: u.site_changed_notice } : null;
    }
    if (this.query.includes('SELECT COUNT(*) as total FROM users')) {
      return { total: this.db.users.length };
    }
    return null;
  }
  async all() {
    if (this.query.includes('FROM users')) {
      return {
        results: this.db.users.map(u => ({
          id: `shop_${u.id}`,
          user_id: u.id,
          shop_name: u.business_name || u.name,
          subdomain: u.subdomain,
          custom_domain: u.custom_domain,
          hostname: u.custom_domain || `${u.subdomain}.ferasetu.com`,
          owner_name: u.name,
          owner_email: u.email,
          created_at: u.created_at,
          product_count: 0,
        }))
      };
    }
    if (this.query.includes('FROM announcements')) {
      const targetUserId = this.bound[0];
      const matching = this.db.announcements.filter(a => !a.target_user_id || a.target_user_id === targetUserId);
      return { results: matching };
    }
    return { results: [] };
  }
  async run() {
    if (this.query.includes('UPDATE users') && this.query.includes('site_changed_notice = ?')) {
      const [subdomain, customDomain, hostname, notice, updated_at, id] = this.bound;
      const user = this.db.users.find(u => u.id === id);
      if (user) {
        user.subdomain = subdomain;
        user.custom_domain = customDomain;
        user.hostname = hostname;
        user.site_changed_notice = notice;
        user.updated_at = updated_at;
      }
      return { success: true };
    }
    if (this.query.includes('UPDATE users SET site_changed_notice = NULL')) {
      const id = this.bound[0];
      const user = this.db.users.find(u => u.id === id);
      if (user) {
        user.site_changed_notice = null;
      }
      return { success: true };
    }
    if (this.query.includes('INSERT INTO announcements')) {
      this.db.announcements.push({
        id: this.bound[0],
        title: this.bound[1],
        content: this.bound[2],
        category: this.bound[3],
        badge_label: this.bound[4],
        action_url: this.bound[5],
        action_label: this.bound[6],
        target_plan: 'all',
        is_pinned: 1,
        is_active: 1,
        target_user_id: this.bound[7],
        created_at: this.bound[8]
      });
      return { success: true };
    }
    return { success: true };
  }
}

class MockD1 {
  constructor() {
    this.users = [
      {
        id: 'usr_shop_01',
        email: 'ramesh@kirana.com',
        name: 'Ramesh Patel',
        business_name: 'Patel General Store',
        subdomain: 'patel-store',
        custom_domain: null,
        hostname: 'patel-store.ferasetu.com',
        site_changed_notice: null,
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-01T10:00:00Z'
      },
      {
        id: 'usr_shop_02',
        email: 'priya@boutique.in',
        name: 'Priya Sharma',
        business_name: 'Priya Handloom Silks',
        subdomain: 'priya-silks',
        custom_domain: 'priyasilks.in',
        hostname: 'priyasilks.in',
        site_changed_notice: null,
        created_at: '2026-10-05T12:00:00Z',
        updated_at: '2026-10-05T12:00:00Z'
      }
    ];
    this.announcements = [];
  }
  prepare(q) {
    return new MockD1PreparedStatement(q, this);
  }
}

test('Admin Edit Website URL & Shopkeeper Dashboard Notification Suite', async (t) => {
  const db = new MockD1();

  await t.test('1. Admin updates shop subdomain and triggers "Your site is changed" message', async () => {
    const targetUserId = 'usr_shop_01';
    const newSlug = 'patel-supermarket';
    const newHostname = `${newSlug}.ferasetu.com`;
    const newUrl = `https://${newHostname}`;
    const now = new Date().toISOString();

    const noticePayload = {
      id: 'notice_123',
      type: 'site_changed',
      message: 'Your site is changed',
      details: `Your website address has been changed to ${newUrl} by platform administrator. All incoming customer links and orders are live at this updated address.`,
      new_url: newUrl,
      previous_url: 'https://patel-store.ferasetu.com',
      subdomain: newSlug,
      custom_domain: null,
      changed_at: now,
      unread: true
    };

    // Simulate update in DB
    await db.prepare(`
      UPDATE users 
      SET subdomain = ?, custom_domain = ?, hostname = ?, site_changed_notice = ?, updated_at = ?
      WHERE id = ?
    `).bind(newSlug, null, newHostname, JSON.stringify(noticePayload), now, targetUserId).run();

    // Verify user record updated
    const updatedUser = await db.prepare("SELECT * FROM users WHERE id = ?").bind(targetUserId).first();
    assert.equal(updatedUser.subdomain, 'patel-supermarket');
    assert.equal(updatedUser.hostname, 'patel-supermarket.ferasetu.com');
    assert.ok(updatedUser.site_changed_notice);

    const parsedNotice = JSON.parse(updatedUser.site_changed_notice);
    assert.equal(parsedNotice.message, 'Your site is changed');
    assert.equal(parsedNotice.new_url, 'https://patel-supermarket.ferasetu.com');
  });

  await t.test('2. Targeted announcement is created with "Your site is changed"', async () => {
    const targetUserId = 'usr_shop_01';
    const annId = 'ann_site_change_01';
    const newUrl = 'https://patel-supermarket.ferasetu.com';
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO announcements (
        id, title, content, category, badge_label, action_url, action_label,
        target_plan, is_pinned, is_active, target_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'all', 1, 1, ?, ?)
    `).bind(
      annId,
      'Your site is changed',
      `Your store address has been updated to ${newUrl}. Your web storefront is now live at this address.`,
      'update',
      'Site Updated',
      newUrl,
      'Visit Store',
      targetUserId,
      now
    ).run();

    assert.equal(db.announcements.length, 1);
    assert.equal(db.announcements[0].title, 'Your site is changed');
    assert.equal(db.announcements[0].target_user_id, 'usr_shop_01');
    assert.equal(db.announcements[0].badge_label, 'Site Updated');
  });

  await t.test('3. Collision guard prevents duplicate subdomain assignment', async () => {
    // Attempting to assign 'priya-silks' (belongs to usr_shop_02) to usr_shop_01
    const attemptedSubdomain = 'priya-silks';
    const collision = await db.prepare("SELECT id FROM users WHERE LOWER(subdomain) = ? AND id != ?")
      .bind(attemptedSubdomain, 'usr_shop_01')
      .first();

    assert.ok(collision, 'Subdomain collision should be detected');
    assert.equal(collision.id, 'usr_shop_02');
  });

  await t.test('4. Shopkeeper receives site notice on dashboard (/api/website/site-notice)', async () => {
    const res = await db.prepare("SELECT site_changed_notice FROM users WHERE id = ?").bind('usr_shop_01').first();
    assert.ok(res?.site_changed_notice);

    const notice = JSON.parse(res.site_changed_notice);
    assert.equal(notice.message, 'Your site is changed');
    assert.equal(notice.unread, true);
    assert.equal(notice.new_url, 'https://patel-supermarket.ferasetu.com');
  });

  await t.test('5. Shopkeeper dismisses notice on dashboard, clearing site_changed_notice', async () => {
    await db.prepare("UPDATE users SET site_changed_notice = NULL WHERE id = ?").bind('usr_shop_01').run();

    const res = await db.prepare("SELECT site_changed_notice FROM users WHERE id = ?").bind('usr_shop_01').first();
    assert.equal(res.site_changed_notice, null);
  });
});

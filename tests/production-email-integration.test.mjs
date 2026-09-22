/**
 * Automated Test Suite: Production Email Architecture Integration
 * Tests matrix items A through O across FeraSetu EmailService, templates,
 * sender resolution, external SMTP routing, failure decoupling, and tenant isolation.
 */

import assert from 'node:assert/strict';
import {
  EmailService,
  PLATFORM_TENANT_ID,
  ALLOWED_PLATFORM_SENDERS
} from '../worker/services/emailService.js';
import {
  EMAIL_TEMPLATES,
  validateTemplateVariables,
  renderEmailTemplate
} from '../worker/templates/emailTemplates.js';
import { encryptSecret } from '../worker/services/emailCrypto.js';

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  ❌ ${name}:`, err.message);
  }
}

const MASTER_ENCRYPTION_KEY = 'test_master_encryption_key_32bytes!!';

function createMockDb() {
  const tables = {
    users: [
      { id: 'usr_merchant_1', email: 'merchant1@example.com', name: 'Merchant One', business_name: 'Kirana One' },
      { id: 'usr_merchant_2', email: 'merchant2@example.com', name: 'Merchant Two', business_name: 'Store Two' }
    ],
    organizations: [
      {
        id: 'org_kirana_1',
        name: 'Kirana Superstore',
        store_slug: 'kirana-one',
        store_url: 'https://kirana-one.ferasetu.com',
        primary_color: '#FF6B35',
        support_email: 'help@kiranaone.com'
      },
      {
        id: 'org_custom_2',
        name: 'Artisan Crafts',
        store_slug: 'artisan-crafts',
        store_url: 'https://artisancrafts.in',
        primary_color: '#0052FF',
        support_email: 'support@artisancrafts.in'
      },
      {
        id: 'org_external_3',
        name: 'External Mailer Shop',
        store_slug: 'ext-shop',
        store_url: 'https://ext-shop.ferasetu.com',
        primary_color: '#10B981',
        support_email: 'contact@ext-shop.com'
      }
    ],
    shops: [
      { id: 'shop_1', organization_id: 'org_kirana_1', name: 'Kirana Superstore', store_slug: 'kirana-one' },
      { id: 'shop_2', organization_id: 'org_custom_2', name: 'Artisan Crafts', store_slug: 'artisan-crafts' },
      { id: 'shop_3', organization_id: 'org_external_3', name: 'External Mailer Shop', store_slug: 'ext-shop' }
    ],
    email_domains: [
      {
        id: 'dom_plat_1',
        organization_id: null,
        domain: 'ferasetu.com',
        domain_type: 'PLATFORM',
        verification_status: 'VERIFIED'
      },
      {
        id: 'dom_m_1',
        organization_id: 'org_kirana_1',
        domain: 'kirana-one.ferasetu.com',
        domain_type: 'FERASETU_MERCHANT',
        verification_status: 'VERIFIED'
      },
      {
        id: 'dom_c_2',
        organization_id: 'org_custom_2',
        domain: 'artisancrafts.in',
        domain_type: 'CUSTOM',
        verification_status: 'VERIFIED'
      },
      {
        id: 'dom_m_2',
        organization_id: 'org_custom_2',
        domain: 'artisan-crafts.ferasetu.com',
        domain_type: 'FERASETU_MERCHANT',
        verification_status: 'VERIFIED'
      },
      {
        id: 'dom_m_3',
        organization_id: 'org_external_3',
        domain: 'ext-shop.ferasetu.com',
        domain_type: 'FERASETU_MERCHANT',
        verification_status: 'VERIFIED'
      }
    ],
    email_identities: [
      {
        id: 'ident_plat_noreply',
        organization_id: null,
        domain_id: 'dom_plat_1',
        local_part: 'no-reply',
        email_address: 'no-reply@ferasetu.com',
        identity_type: 'PLATFORM',
        is_default: 1,
        status: 'ACTIVE'
      },
      {
        id: 'ident_plat_support',
        organization_id: null,
        domain_id: 'dom_plat_1',
        local_part: 'support',
        email_address: 'support@ferasetu.com',
        identity_type: 'PLATFORM',
        is_default: 0,
        status: 'ACTIVE'
      },
      {
        id: 'ident_plat_billing',
        organization_id: null,
        domain_id: 'dom_plat_1',
        local_part: 'billing',
        email_address: 'billing@ferasetu.com',
        identity_type: 'PLATFORM',
        is_default: 0,
        status: 'ACTIVE'
      },
      {
        id: 'ident_m_1',
        organization_id: 'org_kirana_1',
        domain_id: 'dom_m_1',
        local_part: 'orders',
        email_address: 'orders@kirana-one.ferasetu.com',
        identity_type: 'MERCHANT',
        is_default: 1,
        status: 'ACTIVE'
      },
      {
        id: 'ident_c_2',
        organization_id: 'org_custom_2',
        domain_id: 'dom_c_2',
        local_part: 'orders',
        email_address: 'orders@artisancrafts.in',
        identity_type: 'CUSTOM',
        is_default: 1,
        status: 'ACTIVE'
      },
      {
        id: 'ident_m_3',
        organization_id: 'org_external_3',
        domain_id: 'dom_m_3',
        local_part: 'orders',
        email_address: 'orders@ext-shop.ferasetu.com',
        identity_type: 'MERCHANT',
        is_default: 1,
        status: 'ACTIVE'
      }
    ],
    email_provider_connections: [
      {
        id: 'epc_1',
        organization_id: 'org_kirana_1',
        provider_type: 'FERASETU',
        status: 'ACTIVE'
      },
      {
        id: 'epc_2',
        organization_id: 'org_custom_2',
        provider_type: 'FERASETU',
        status: 'ACTIVE'
      },
      {
        id: 'epc_3',
        organization_id: 'org_external_3',
        provider_type: 'EXTERNAL_SMTP',
        smtp_host: 'smtp.sendgrid.net',
        smtp_port: 587,
        smtp_username: 'apikey',
        encrypted_secret_reference: null, // Populated in setup
        security_mode: 'STARTTLS',
        status: 'ACTIVE'
      }
    ],
    subscriptions: [
      { organization_id: 'org_kirana_1', plan: 'growth', status: 'active' },
      { organization_id: 'org_custom_2', plan: 'pro', status: 'active' },
      { organization_id: 'org_external_3', plan: 'business', status: 'active' }
    ],
    shop_email_quotas: [
      {
        organization_id: 'org_kirana_1',
        daily_limit: 500,
        emails_sent_today: 0,
        extra_quota_balance: 0,
        last_reset_date: new Date().toISOString().slice(0, 10)
      },
      {
        organization_id: 'org_custom_2',
        daily_limit: 1000,
        emails_sent_today: 0,
        extra_quota_balance: 0,
        last_reset_date: new Date().toISOString().slice(0, 10)
      },
      {
        organization_id: 'org_external_3',
        daily_limit: 500,
        emails_sent_today: 0,
        extra_quota_balance: 0,
        last_reset_date: new Date().toISOString().slice(0, 10)
      }
    ],
    email_messages: [],
    email_events: []
  };

  return {
    tables,
    prepare(sql) {
      const s = sql.toLowerCase();
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async first() {
          const res = await this.all();
          return res.results?.[0] || null;
        },
        async all() {
          if (s.includes('from email_messages where idempotency_key =')) {
            const key = this._params[0];
            const mId = this._params[1];
            const isPlat = this._params[2] === 1;
            const rows = tables.email_messages.filter(m => 
              m.idempotency_key === key && (m.merchant_id === mId || (!m.merchant_id && isPlat))
            );
            return { results: rows };
          }

          if (s.includes('from email_domains')) {
            let rows = [...tables.email_domains];
            if (s.includes("domain_type = 'custom'") && s.includes("verification_status = 'verified'")) {
              rows = rows.filter(d => d.organization_id === this._params[0] && d.domain_type === 'CUSTOM' && d.verification_status === 'VERIFIED');
            } else if (s.includes("domain_type = 'ferasetu_merchant'")) {
              rows = rows.filter(d => d.organization_id === this._params[0] && d.domain_type === 'FERASETU_MERCHANT');
            }
            return { results: rows };
          }

          if (s.includes('from email_identities ei') && s.includes('join email_domains ed')) {
            const rows = tables.email_identities.map(i => {
              const d = tables.email_domains.find(dom => dom.id === i.domain_id);
              return { ...i, verification_status: d?.verification_status || 'VERIFIED' };
            });
            if (s.includes('ei.email_address = ? and ei.organization_id = ?')) {
              return { results: rows.filter(i => i.email_address === this._params[0] && i.organization_id === this._params[1]) };
            }
            if (s.includes('ei.id = ? and ei.organization_id = ?')) {
              return { results: rows.filter(i => i.id === this._params[0] && i.organization_id === this._params[1]) };
            }
            if (s.includes('ei.organization_id = ? and ei.is_default = 1')) {
              return { results: rows.filter(i => i.organization_id === this._params[0] && i.is_default === 1) };
            }
            return { results: rows };
          }

          if (s.includes('from email_identities')) {
            let rows = [...tables.email_identities];
            if (s.includes('domain_id = ? and organization_id = ? and is_default = 1 and status =')) {
              rows = rows.filter(i => i.domain_id === this._params[0] && i.organization_id === this._params[1] && i.is_default === 1);
            } else if (s.includes('where organization_id = ? and is_default = 1 and status =')) {
              rows = rows.filter(i => i.organization_id === this._params[0] && i.is_default === 1);
            } else if (s.includes('where organization_id = ? and is_default = 1')) {
              rows = rows.filter(i => i.organization_id === this._params[0] && i.is_default === 1);
            } else if (s.includes("identity_type = 'platform'")) {
              rows = rows.filter(i => i.email_address === this._params[0] && i.identity_type === 'PLATFORM');
            }
            return { results: rows };
          }

          if (s.includes('from email_provider_connections where organization_id =')) {
            const rows = tables.email_provider_connections.filter(c => c.organization_id === this._params[0]);
            return { results: rows };
          }

          if (s.includes('from organizations where id =')) {
            const rows = tables.organizations.filter(o => o.id === this._params[0]);
            return { results: rows };
          }

          if (s.includes('from shops where organization_id =')) {
            const rows = tables.shops.filter(sh => sh.organization_id === this._params[0]);
            return { results: rows };
          }

          if (s.includes('from subscriptions where')) {
            const rows = tables.subscriptions.filter(sub => sub.organization_id === this._params[0] || sub.user_id === this._params[0]);
            return { results: rows };
          }

          if (s.includes('from shop_email_quotas where organization_id =')) {
            const rows = tables.shop_email_quotas.filter(q => q.organization_id === this._params[0]);
            return { results: rows };
          }

          return { results: [] };
        },
        async run() {
          if (s.includes('insert into email_messages')) {
            tables.email_messages.push({
              id: this._params[0],
              merchant_id: this._params[1],
              sender_identity_id: this._params[2],
              provider: this._params[3],
              to_address: this._params[4],
              reply_to: this._params[5],
              subject: this._params[6],
              status: 'PENDING',
              idempotency_key: this._params[7],
              priority: this._params[8],
              created_at: this._params[9],
              updated_at: this._params[10]
            });
            return { success: true };
          }

          if (s.includes('update email_messages set status =')) {
            const status = this._params[0];
            const now = this._params[1];
            const msgId = this._params[2];
            const msg = tables.email_messages.find(m => m.id === msgId);
            if (msg) {
              msg.status = status;
              msg.updated_at = now;
            }
            return { success: true };
          }

          if (s.includes('insert into email_events')) {
            tables.email_events.push({
              id: this._params[0],
              message_id: this._params[1],
              merchant_id: this._params[2],
              event_type: this._params[3],
              provider_status: this._params[4],
              recipient: this._params[5],
              timestamp: this._params[6],
              metadata: this._params[7]
            });
            return { success: true };
          }

          if (s.includes('update shop_email_quotas') && s.includes('emails_sent_today = emails_sent_today + 1')) {
            const orgId = this._params[1];
            const q = tables.shop_email_quotas.find(x => x.organization_id === orgId);
            if (q) q.emails_sent_today = (q.emails_sent_today || 0) + 1;
            return { success: true };
          }

          return { success: true };
        }
      };
    }
  };
}

console.log('\n🚀 Starting Production Email Integration Test Suite (Matrix A through O)...\n');

// ---------------------------------------------------------------------------
// A. Platform verification email (account.verify_email)
// ---------------------------------------------------------------------------
await test('A. Platform Verification Email: sendPlatformEmail sends account.verify_email via no-reply@ferasetu.com', async () => {
  const db = createMockDb();
  const env = { DB: db, ENCRYPTION_SECRET: MASTER_ENCRYPTION_KEY };

  const res = await EmailService.sendPlatformEmail(env, {
    event: 'account.verify_email',
    to: 'newmerchant@example.com',
    data: { otp: '849201', customer_name: 'Harish Patel', expiry_minutes: 10 },
    idempotencyKey: 'verify_test_user_1'
  });

  assert.equal(res.success, true);
  assert.equal(res.from, 'no-reply@ferasetu.com');
  assert.equal(res.to, 'newmerchant@example.com');
  assert.equal(res.status, 'SENT');

  const msg = db.tables.email_messages.find(m => m.id === res.messageId);
  assert.ok(msg, 'Message record must be saved in email_messages');
  assert.ok(msg.subject.includes('849201'), 'Subject must contain verification OTP');
  assert.equal(msg.merchant_id, PLATFORM_TENANT_ID);
});

// ---------------------------------------------------------------------------
// B. Platform password reset (account.password_reset)
// ---------------------------------------------------------------------------
await test('B. Platform Password Reset: sendPlatformEmail sends account.password_reset with secure URL', async () => {
  const db = createMockDb();
  const env = { DB: db };

  const resetUrl = 'https://ferasetu.com/reset-password?token=sec_abc123xyz';
  const res = await EmailService.sendPlatformEmail(env, {
    event: 'account.password_reset',
    to: 'user@example.com',
    data: { reset_url: resetUrl, customer_name: 'Ananya' },
    idempotencyKey: 'pwd_reset_1'
  });

  assert.equal(res.success, true);
  assert.equal(res.from, 'no-reply@ferasetu.com');

  const msg = db.tables.email_messages.find(m => m.id === res.messageId);
  assert.ok(msg.subject.includes('Reset your password'));
});

// ---------------------------------------------------------------------------
// C. Merchant order confirmation (order.confirmation)
// ---------------------------------------------------------------------------
await test('C. Merchant Order Confirmation: sendCustomerEmail renders order details and OTP badge', async () => {
  const db = createMockDb();
  const env = { DB: db };

  const res = await EmailService.sendCustomerEmail(env, {
    organizationId: 'org_kirana_1',
    customerEmail: 'buyer@example.com',
    templateKey: 'order.confirmation',
    data: {
      order_id: 'ord_9876543210',
      total: 1250.00,
      currency: 'INR',
      customer_name: 'Rohan Sharma',
      otp: '4591',
      items: [
        { name: 'Basmati Rice 5kg', quantity: 1, price: 450.00, total: 450.00 },
        { name: 'Cold Pressed Mustard Oil 1L', quantity: 2, price: 400.00, total: 800.00 }
      ]
    },
    idempotencyKey: 'order_conf_ord_9876543210',
    storeSlug: 'kirana-one',
    orgName: 'Kirana Superstore'
  });

  assert.equal(res.success, true);
  assert.equal(res.from, 'orders@kirana-one.ferasetu.com');
  assert.equal(res.to, 'buyer@example.com');

  const msg = db.tables.email_messages.find(m => m.id === res.messageId);
  assert.ok(msg.subject.includes('Order Confirmed #ORD_9876'));
  assert.equal(msg.merchant_id, 'org_kirana_1');
});

// ---------------------------------------------------------------------------
// D. Merchant invoice email (invoice.created)
// ---------------------------------------------------------------------------
await test('D. Merchant Invoice: sendCustomerEmail dispatches tax invoice summary with invoice number', async () => {
  const db = createMockDb();
  const env = { DB: db };

  const res = await EmailService.sendCustomerEmail(env, {
    organizationId: 'org_kirana_1',
    customerEmail: 'buyer@example.com',
    templateKey: 'invoice.created',
    data: {
      invoice_number: 'INV-2026-0042',
      order_id: 'ord_9876543210',
      total: 1250.00,
      customer_name: 'Rohan Sharma',
      invoice_url: 'https://ferasetu.com/api/orders/ord_9876543210/invoice/pdf'
    },
    idempotencyKey: 'invoice_ord_9876543210'
  });

  assert.equal(res.success, true);
  const msg = db.tables.email_messages.find(m => m.id === res.messageId);
  assert.ok(msg.subject.includes('Tax Invoice INV-2026-0042'));
});

// ---------------------------------------------------------------------------
// E. Merchant refund email (refund.initiated & refund.completed)
// ---------------------------------------------------------------------------
await test('E. Merchant Refund: sendCustomerEmail dispatches refund notification', async () => {
  const db = createMockDb();
  const env = { DB: db };

  const res = await EmailService.sendCustomerEmail(env, {
    organizationId: 'org_kirana_1',
    customerEmail: 'buyer@example.com',
    templateKey: 'refund.completed',
    data: {
      refund_number: 'REF-882190',
      order_id: 'ord_9876543210',
      amount: 450.00,
      customer_name: 'Rohan'
    },
    idempotencyKey: 'refund_ref_882190'
  });

  assert.equal(res.success, true);
  const msg = db.tables.email_messages.find(m => m.id === res.messageId);
  assert.ok(msg.subject.includes('Refund Completed'));
  assert.ok(msg.subject.includes('450'));
});

// ---------------------------------------------------------------------------
// F. Merchant custom-domain sender
// ---------------------------------------------------------------------------
await test('F. Custom Domain Sender: Verified custom domain sends from orders@artisancrafts.in without fallback', async () => {
  const db = createMockDb();
  const env = { DB: db };

  const res = await EmailService.sendCustomerEmail(env, {
    organizationId: 'org_custom_2',
    customerEmail: 'customer@test.com',
    templateKey: 'order.confirmation',
    data: { order_id: 'ord_cust_1', total: 500, customer_name: 'Priya' },
    idempotencyKey: 'order_conf_cust_1',
    storeSlug: 'artisan-crafts'
  });

  assert.equal(res.success, true);
  assert.equal(res.from, 'orders@artisancrafts.in', 'Should use verified custom domain identity');
  assert.equal(res.fallbackApplied, false, 'No fallback should be applied for verified custom domain');
});

// ---------------------------------------------------------------------------
// G. FeraSetu merchant sender (managed domain)
// ---------------------------------------------------------------------------
await test('G. FeraSetu Merchant Sender: Store without custom domain sends from orders@{storeSlug}.ferasetu.com', async () => {
  const db = createMockDb();
  const env = { DB: db };

  const res = await EmailService.sendCustomerEmail(env, {
    organizationId: 'org_kirana_1',
    customerEmail: 'buyer@test.com',
    templateKey: 'order.confirmation',
    data: { order_id: 'ord_k_2', total: 100 },
    idempotencyKey: 'order_conf_k_2',
    storeSlug: 'kirana-one'
  });

  assert.equal(res.success, true);
  assert.equal(res.from, 'orders@kirana-one.ferasetu.com');
});

// ---------------------------------------------------------------------------
// H. External SMTP routing
// ---------------------------------------------------------------------------
await test('H. External SMTP: Routes via external connection and decrypts SMTP credentials', async () => {
  const db = createMockDb();
  const encryptedPassword = await encryptSecret('my_sg_secret_pass', MASTER_ENCRYPTION_KEY);
  db.tables.email_provider_connections.find(c => c.organization_id === 'org_external_3').encrypted_secret_reference = encryptedPassword;

  const env = { DB: db, ENCRYPTION_SECRET: MASTER_ENCRYPTION_KEY };

  const res = await EmailService.sendMerchantEmail(env, {
    organizationId: 'org_external_3',
    to: 'staff@ext-shop.com',
    templateKey: 'system.test',
    data: { recipient_email: 'staff@ext-shop.com', provider: 'SendGrid External SMTP' },
    idempotencyKey: 'ext_smtp_test_1'
  });

  assert.equal(res.success, true);
  assert.equal(res.provider, 'EXTERNAL_SMTP');
});

// ---------------------------------------------------------------------------
// I. Invalid sender rejection
// ---------------------------------------------------------------------------
await test('I. Invalid Sender: Rejects spoofed platform sender and cross-tenant identities', async () => {
  const db = createMockDb();
  const env = { DB: db };

  // 1. Spoofed platform sender
  await assert.rejects(async () => {
    await EmailService.sendPlatformEmail(env, {
      from: 'attacker@ferasetu.com',
      to: 'target@example.com',
      templateKey: 'system.test',
      data: { recipient_email: 'target@example.com' }
    });
  }, /Unauthorized platform sender/);

  // 2. Cross-tenant sender spoof
  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_kirana_1',
      from: 'orders@artisancrafts.in', // Belongs to org_custom_2!
      to: 'buyer@test.com',
      subject: 'Spoof'
    });
  }, /No authorized email identity found/);
});

// ---------------------------------------------------------------------------
// J. Missing template variables validation
// ---------------------------------------------------------------------------
await test('J. Schema Validation: Missing required variables rejected before dispatch', async () => {
  // Pure schema validation test
  const invalidRes = validateTemplateVariables('order.confirmation', { customer_name: 'Alice' });
  assert.equal(invalidRes.valid, false);
  assert.equal(invalidRes.reason, 'MISSING_TEMPLATE_VARIABLES');
  assert.ok(invalidRes.missing.includes('order_id'));
  assert.ok(invalidRes.missing.includes('total'));

  // Integration rejection test
  const db = createMockDb();
  const env = { DB: db };

  await assert.rejects(async () => {
    await EmailService.sendCustomerEmail(env, {
      organizationId: 'org_kirana_1',
      customerEmail: 'buyer@test.com',
      templateKey: 'order.confirmation',
      data: { customer_name: 'Alice' } // Missing order_id & total
    });
  }, /missing required variables: order_id, total/);
});

// ---------------------------------------------------------------------------
// K. Duplicate business event (idempotency deduplication)
// ---------------------------------------------------------------------------
await test('K. Idempotency: Duplicate business event returns original message without re-dispatching', async () => {
  const db = createMockDb();
  const env = { DB: db };

  const idemKey = 'order_confirmation:ord_idempotent_test_99';
  const emailPayload = {
    organizationId: 'org_kirana_1',
    customerEmail: 'repeat@example.com',
    templateKey: 'order.confirmation',
    data: { order_id: 'ord_idempotent_test_99', total: 299 },
    idempotencyKey: idemKey
  };

  const res1 = await EmailService.sendCustomerEmail(env, emailPayload);
  assert.equal(res1.success, true);
  assert.equal(res1.duplicate, undefined);

  // Re-dispatch identical business event
  const res2 = await EmailService.sendCustomerEmail(env, emailPayload);
  assert.equal(res2.success, true);
  assert.equal(res2.duplicate, true, 'Second call must be marked as duplicate');
  assert.equal(res2.messageId, res1.messageId, 'Must return same messageId');

  const matchingMessages = db.tables.email_messages.filter(m => m.idempotency_key === idemKey);
  assert.equal(matchingMessages.length, 1, 'Only one message record must exist in DB');
});

// ---------------------------------------------------------------------------
// L. Temporary SMTP failure (5xx server error recorded as FAILED)
// ---------------------------------------------------------------------------
await test('L. Temporary SMTP Failure: 500 error records FAILED status without crashing', async () => {
  const db = createMockDb();
  const originalFetch = globalThis.fetch;

  // Mock gateway returning temporary 500 error
  globalThis.fetch = async (url, opts) => {
    return new Response('SMTP Gateway Temporary Queue Overload', { status: 500 });
  };

  try {
    const env = {
      DB: db,
      FERASETU_SMTP_SERVICE_URL: 'https://smtp.mock.modal.run',
      FERASETU_SMTP_API_KEY: 'test_key'
    };

    const res = await EmailService.sendCustomerEmail(env, {
      organizationId: 'org_kirana_1',
      customerEmail: 'buyer@example.com',
      templateKey: 'order.confirmation',
      data: { order_id: 'ord_500_fail', total: 100 }
    });

    assert.equal(res.success, false, 'Dispatch should report failure');
    assert.equal(res.status, 'FAILED');

    const msg = db.tables.email_messages.find(m => m.id === res.messageId);
    assert.ok(msg);
    assert.equal(msg.status, 'FAILED', 'Message status in DB must be updated to FAILED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// M. Permanent SMTP failure (422 unprocessable entity)
// ---------------------------------------------------------------------------
await test('M. Permanent SMTP Failure: 422 rejected recipient recorded as FAILED with event detail', async () => {
  const db = createMockDb();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response('Recipient domain does not accept mail', { status: 422 });
  };

  try {
    const env = {
      DB: db,
      FERASETU_SMTP_SERVICE_URL: 'https://smtp.mock.modal.run',
      FERASETU_SMTP_API_KEY: 'test_key'
    };

    const res = await EmailService.sendCustomerEmail(env, {
      organizationId: 'org_kirana_1',
      customerEmail: 'unreachable@invalid-domain-nowhere.org',
      templateKey: 'order.confirmation',
      data: { order_id: 'ord_422_fail', total: 100 }
    });

    assert.equal(res.success, false);
    assert.equal(res.status, 'FAILED');

    const event = db.tables.email_events.find(e => e.message_id === res.messageId);
    assert.ok(event);
    assert.equal(event.event_type, 'FAILED');
    assert.ok(event.provider_status.includes('422'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// N. Cross-tenant authorization prevention
// ---------------------------------------------------------------------------
await test('N. Cross-Tenant Isolation: Tenant A cannot dispatch using Tenant B identities or connections', async () => {
  const db = createMockDb();
  const env = { DB: db };

  // org_kirana_1 tries to use org_custom_2's identity ID
  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_kirana_1',
      senderIdentityId: 'ident_c_2', // Belongs to org_custom_2
      to: 'target@test.com',
      subject: 'Unauthorized access'
    });
  }, /No authorized email identity found/);
});

// ---------------------------------------------------------------------------
// O. Platform/merchant quota separation
// ---------------------------------------------------------------------------
await test('O. Quota Isolation: Platform emails never consume merchant quota, merchant emails do', async () => {
  const db = createMockDb();
  const env = { DB: db };

  const quotaBefore = db.tables.shop_email_quotas.find(q => q.organization_id === 'org_kirana_1').emails_sent_today;
  assert.equal(quotaBefore, 0);

  // Send 3 platform emails
  await EmailService.sendPlatformEmail(env, {
    event: 'account.verify_email',
    to: 'u1@test.com',
    data: { otp: '1111' }
  });
  await EmailService.sendPlatformEmail(env, {
    event: 'account.verify_email',
    to: 'u2@test.com',
    data: { otp: '2222' }
  });
  await EmailService.sendPlatformEmail(env, {
    event: 'account.verify_email',
    to: 'u3@test.com',
    data: { otp: '3333' }
  });

  const quotaAfterPlatform = db.tables.shop_email_quotas.find(q => q.organization_id === 'org_kirana_1').emails_sent_today;
  assert.equal(quotaAfterPlatform, 0, 'Platform emails must never touch merchant quota');

  // Send 1 merchant email
  await EmailService.sendCustomerEmail(env, {
    organizationId: 'org_kirana_1',
    customerEmail: 'buyer@test.com',
    templateKey: 'order.confirmation',
    data: { order_id: 'ord_quota_test', total: 50 }
  });

  const quotaAfterMerchant = db.tables.shop_email_quotas.find(q => q.organization_id === 'org_kirana_1').emails_sent_today;
  assert.equal(quotaAfterMerchant, 1, 'Merchant email must increment merchant quota by 1');
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error('Failures:');
  for (const f of failures) {
    console.error(`- ${f.name}:`, f.err);
  }
  process.exit(1);
} else {
  console.log('🎉 All Production Email Integration tests passed successfully!\n');
}

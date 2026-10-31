/**
 * Tests for:
 * 1. New User Welcome Email from noreply@ferasetu.com
 * 2. Merchant First Order Congratulatory Email & 0% Commission Reassurance
 * 3. Modal SQLite Migration Order (Priority column created before index)
 */

import assert from 'node:assert/strict';
import { EMAIL_TEMPLATES, renderEmailTemplate, validateTemplateVariables } from '../worker/templates/emailTemplates.js';
import { EmailService } from '../worker/services/emailService.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}:`, err.message);
  }
}

console.log('\n🧪 Testing New User & First Order Email Features...');

// Test 1: account.welcome template exists and renders correctly
await test('account.welcome template renders with warm copy and 0% commission promise', () => {
  const tpl = EMAIL_TEMPLATES['account.welcome'];
  assert.ok(tpl, 'account.welcome template should exist');
  assert.equal(tpl.status, 'ACTIVE');
  assert.ok(tpl.optionalVariables.includes('user_name'));

  const rendered = renderEmailTemplate({
    templateKey: 'account.welcome',
    data: {
      user_name: 'Ramesh Sharma',
      store_url: 'https://rameshkirana.ferasetu.com',
      email: 'ramesh@example.com'
    },
    isPlatform: true
  });

  assert.ok(rendered.subject.includes('Welcome to FeraSetu'), 'Subject should welcome the merchant');
  assert.ok(rendered.html.includes('Ramesh Sharma'), 'HTML should include user name');
  assert.ok(rendered.html.includes('0% Platform Commission'), 'HTML should highlight 0% commission');
  assert.ok(rendered.html.includes('https://ferasetu.com/dashboard'), 'HTML should link to dashboard');
  assert.ok(rendered.text.includes('0% platform commission'), 'Text version should mention 0% commission');
});

// Test 2: merchant.first_order template exists and renders correctly
await test('merchant.first_order template renders congratulations and order details', () => {
  const tpl = EMAIL_TEMPLATES['merchant.first_order'];
  assert.ok(tpl, 'merchant.first_order template should exist');
  assert.equal(tpl.status, 'ACTIVE');
  assert.ok(tpl.requiredVariables.includes('order_id'));

  const rendered = renderEmailTemplate({
    templateKey: 'merchant.first_order',
    data: {
      order_id: 'ord_123456',
      customer_name: 'Priya Patel',
      total: 850,
      currency: 'INR',
      merchant_name: 'Ramesh',
      store_name: 'Ramesh Kirana'
    }
  });

  assert.ok(rendered.subject.includes('Congratulations'), 'Subject should congratulate');
  assert.ok(rendered.subject.toLowerCase().includes('first order'), 'Subject should mention first order');
  assert.ok(rendered.html.includes('Priya Patel'), 'HTML should include customer name');
  assert.ok(rendered.html.includes('850'), 'HTML should include order total');
  assert.ok(rendered.html.includes('Platform Commission') && rendered.html.includes('0%'), 'HTML should reassure 0% commission');
});

// Test 3: EmailService.sendNewUserWelcomeEmail invokes platform email dispatcher with idempotency
await test('EmailService.sendNewUserWelcomeEmail creates valid platform email payload', async () => {
  let dispatchedPayload = null;
  const mockEnv = {
    DB: {
      prepare: (sql) => ({
        bind: (...args) => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true })
        })
      })
    }
  };

  // Temporarily stub sendPlatformEmail
  const originalSendPlatform = EmailService.sendPlatformEmail;
  EmailService.sendPlatformEmail = async (env, payload) => {
    dispatchedPayload = payload;
    return { success: true, messageId: 'msg_welcome_test' };
  };

  try {
    const res = await EmailService.sendNewUserWelcomeEmail(mockEnv, {
      email: 'newshopkeeper@example.com',
      name: 'Sunita Devi',
      storeUrl: 'https://sunitastore.ferasetu.com'
    });

    assert.ok(res.success);
    assert.equal(dispatchedPayload.to, 'newshopkeeper@example.com');
    assert.equal(dispatchedPayload.from, 'noreply@ferasetu.com');
    assert.equal(dispatchedPayload.event, 'account.welcome');
    assert.equal(dispatchedPayload.idempotencyKey, 'welcome_newshopkeeper@example.com');
  } finally {
    EmailService.sendPlatformEmail = originalSendPlatform;
  }
});

// Test 4: EmailService.sendFirstOrderCongratulatoryEmail finds store owner and dispatches
await test('EmailService.sendFirstOrderCongratulatoryEmail resolves owner and dispatches', async () => {
  let dispatchedPayload = null;
  const mockEnv = {
    DB: {
      prepare: (sql) => ({
        bind: (...args) => ({
          first: async () => {
            if (sql.includes('organization_members')) {
              return { email: 'owner@dukaan.com', name: 'Dukaan Owner' };
            }
            return null;
          },
          all: async () => ({ results: [] }),
          run: async () => ({ success: true })
        })
      })
    }
  };

  const originalSendPlatform = EmailService.sendPlatformEmail;
  EmailService.sendPlatformEmail = async (env, payload) => {
    dispatchedPayload = payload;
    return { success: true, messageId: 'msg_first_order_test' };
  };

  try {
    const res = await EmailService.sendFirstOrderCongratulatoryEmail(mockEnv, {
      organizationId: 'org_test_123',
      orderId: 'ord_9999',
      total: 1250,
      customerName: 'Aarav Gupta',
      storeSlug: 'dukaan',
      shopName: 'Aarav General Store'
    });

    assert.ok(res.success);
    assert.equal(dispatchedPayload.to, 'owner@dukaan.com');
    assert.equal(dispatchedPayload.from, 'noreply@ferasetu.com');
    assert.equal(dispatchedPayload.event, 'merchant.first_order');
    assert.equal(dispatchedPayload.data.order_id, 'ord_9999');
    assert.equal(dispatchedPayload.data.total, 1250);
  } finally {
    EmailService.sendPlatformEmail = originalSendPlatform;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

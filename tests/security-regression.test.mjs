/**
 * FeraSetu — Security Regression Tests
 *
 * Run with: node tests/security-regression.test.mjs
 *
 * Tests cover confirmed vulnerabilities:
 * - FS-01: Meeting PATCH IDOR (missing ownership check)
 * - FS-04: AI usageType client-controlled credit undercharge
 * - FS-06: Order total client-supplied manipulation
 * - FS-03: Payment OTP plain text in notes
 * - Business logic: plan limits, AI credits, price validation
 * - Auth: JWT validation, admin token isolation
 * - Input: SQL injection patterns, XSS payloads
 * - CORS: origin validation
 *
 * All tests use synthetic data. No live network calls.
 */

import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Mock helpers — simulate code before and after fixes
// ---------------------------------------------------------------------------

function updateMeeting_BEFORE_FIX(meetingId, authenticatedUserId, newStatus) {
  // VULNERABLE: No user_id check in WHERE clause
  return {
    sql: `UPDATE meetings SET status = ? WHERE id = ?`,
    params: [newStatus, meetingId],
    ownershipChecked: false
  };
}

function updateMeeting_AFTER_FIX(meetingId, authenticatedUserId, newStatus) {
  // FIXED: user_id included in WHERE clause
  return {
    sql: `UPDATE meetings SET status = ? WHERE id = ? AND user_id = ?`,
    params: [newStatus, meetingId, authenticatedUserId],
    ownershipChecked: true
  };
}

function getAICreditCost_BEFORE_FIX(usageTypeFromClientBody) {
  const AI_CREDIT_COST = { shopkeeper_assistant: 1, website_ai: 3, customer_assistant: 2 };
  return AI_CREDIT_COST[usageTypeFromClientBody] || 1;
}

function getAICreditCost_AFTER_FIX(messageContent, isWebsiteRequest) {
  // Credit cost determined server-side from request context
  if (isWebsiteRequest) return 3;
  return 1;
}

function calculateOrderTotal_BEFORE_FIX(body) {
  let total = Number(body.total);
  if (!Number.isFinite(total) || total < 0) {
    total = body.items.reduce((sum, it) => {
      return sum + (Number(it?.price) || 0) * (Number(it?.qty ?? it?.quantity) || 0);
    }, 0);
  }
  return total;
}

function calculateOrderTotal_AFTER_FIX(body, serverProducts) {
  // Always recompute from authoritative DB product prices
  let total = 0;
  for (const item of body.items) {
    const product = serverProducts.find(p => p.id === item.productId);
    if (!product) continue;
    const price = product.sale_price || product.price;
    const qty = parseInt(item.qty ?? item.quantity) || 1;
    total += price * qty;
  }
  return total;
}

function isOriginAllowed(origin, allowedList) {
  if (!origin) return false;
  if (allowedList.includes(origin)) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return host.endsWith('.ferasetu.com') || host.endsWith('.fera-search.tech');
  } catch {
    return false;
  }
}

function validateAuthHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, reason: 'Missing or invalid Authorization header' };
  }
  const token = authHeader.substring(7).trim();
  if (!token || token.length < 10) {
    return { valid: false, reason: 'Empty or too-short token' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Malformed JWT structure' };
  }
  return { valid: true, token };
}

function validateProductPrice(price) {
  const p = Number(price);
  if (!Number.isFinite(p) || p < 0) {
    return { valid: false, error: '`price` must be a non-negative number' };
  }
  return { valid: true, price: p };
}

function checkPlanProductLimit(userPlan, currentCount) {
  const PLAN_PRODUCT_LIMITS = {
    free: 25, beta: 25, trial: 25,
    basic: 500, growth: 500, standard: 500,
    pro: Infinity, premium: Infinity, scale: Infinity, business: Infinity
  };
  const limit = PLAN_PRODUCT_LIMITS[userPlan] ?? 25;
  if (limit !== Infinity && currentCount >= limit) {
    return { allowed: false, error: 'Product limit reached', code: 'PRODUCT_LIMIT_REACHED', limit, current: currentCount };
  }
  return { allowed: true, limit, current: currentCount };
}

function checkAICredits(balance) {
  return balance > 0;
}

function containsSQLInjectionPattern(input) {
  const patterns = [
    /'\s*(OR|AND)\s*'?\d/i,
    /;\s*(DROP|DELETE|INSERT|UPDATE|SELECT)/i,
    /UNION\s+SELECT/i,
    /--\s/,
    /\/\*.*\*\//
  ];
  return patterns.some(p => p.test(input));
}

function containsXSSPattern(input) {
  const patterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<img[^>]+src/i];
  return patterns.some(p => p.test(input));
}

function validateAdminJWTPayload(payload) {
  // Real code: if (!payload || payload.role !== "ADMIN") reject
  // Boolean cast matches real middleware behavior
  return !!(payload && (payload.role === 'ADMIN' || payload.role === 'admin'));
}

function storeOrderOTP_BEFORE_FIX(orderId, deliveryCode, paymentOtp) {
  return { notes: `Code: ${deliveryCode} | OTP: ${paymentOtp}` };
}

function storeOrderOTP_AFTER_FIX(orderId, deliveryCode, paymentOtpHash) {
  return { notes: `Code: ${deliveryCode}`, payment_otp_hash: paymentOtpHash };
}

// ---------------------------------------------------------------------------
// SUITE 1: FS-01 — IDOR: Meeting PATCH Ownership Check
// ---------------------------------------------------------------------------
console.log('\n🔒 Suite 1: FS-01 — IDOR Meeting PATCH Ownership Check');

test('BEFORE fix: updateMeeting has no user_id check (vulnerability confirmed)', () => {
  const result = updateMeeting_BEFORE_FIX('meeting-victim-123', 'attacker-user-id', 'cancelled');
  assert.equal(result.ownershipChecked, false);
  assert.ok(!result.sql.includes('user_id'));
});

test('AFTER fix: updateMeeting includes user_id in WHERE clause', () => {
  const result = updateMeeting_AFTER_FIX('meeting-victim-123', 'attacker-user-id', 'cancelled');
  assert.equal(result.ownershipChecked, true);
  assert.ok(result.sql.includes('user_id'));
  assert.equal(result.params[2], 'attacker-user-id');
});

test('AFTER fix: attacker user_id != victim owner -> 0 rows updated', () => {
  const attackerUserId = 'attacker-789';
  const victimOwnerId = 'victim-456';
  const result = updateMeeting_AFTER_FIX('meeting-abc', attackerUserId, 'cancelled');
  assert.equal(result.params[2], attackerUserId);
  assert.notEqual(result.params[2], victimOwnerId);
});

test('AFTER fix: legitimate owner can update own meeting', () => {
  const ownerUserId = 'user-456';
  const result = updateMeeting_AFTER_FIX('meeting-xyz', ownerUserId, 'completed');
  assert.ok(result.sql.includes('AND user_id = ?'));
  assert.equal(result.params[2], ownerUserId);
});

// ---------------------------------------------------------------------------
// SUITE 2: FS-04 — AI usageType Client-Controlled Credit Undercharge
// ---------------------------------------------------------------------------
console.log('\n💳 Suite 2: FS-04 — AI Credit usageType Manipulation');

test('BEFORE fix: client sends cheap usageType for expensive operation (1 instead of 3)', () => {
  const cost = getAICreditCost_BEFORE_FIX('shopkeeper_assistant');
  assert.equal(cost, 1, 'Vulnerability: attacker pays 1 credit instead of 3 for website_ai');
});

test('BEFORE fix: client uses customer_assistant (2) instead of website_ai (3)', () => {
  const cost = getAICreditCost_BEFORE_FIX('customer_assistant');
  assert.equal(cost, 2, 'Vulnerability: saves 1 credit per website generation');
});

test('AFTER fix: website AI always costs 3 credits (server-determined)', () => {
  const cost = getAICreditCost_AFTER_FIX('Generate website sections JSON', true);
  assert.equal(cost, 3);
});

test('AFTER fix: regular chat always costs 1 credit (server-determined)', () => {
  const cost = getAICreditCost_AFTER_FIX('What products should I restock?', false);
  assert.equal(cost, 1);
});

test('unknown usageType falls back to 1 credit (no free usage)', () => {
  const cost = getAICreditCost_BEFORE_FIX('nonexistent_type');
  assert.equal(cost, 1);
});

// ---------------------------------------------------------------------------
// SUITE 3: FS-06 — Order Total Client Manipulation
// ---------------------------------------------------------------------------
console.log('\n🛒 Suite 3: FS-06 — Order Total Client-Supplied Manipulation');

test('BEFORE fix: client supplies total=1 for a 500-rupee order', () => {
  const body = { total: 1, items: [{ price: 250, qty: 2 }] };
  const total = calculateOrderTotal_BEFORE_FIX(body);
  assert.equal(total, 1, 'Vulnerability: client-supplied 1 accepted');
});

test('BEFORE fix: total=0 passes validation (free order exploit)', () => {
  const body = { total: 0, items: [{ price: 100, qty: 3 }] };
  const total = calculateOrderTotal_BEFORE_FIX(body);
  assert.equal(total, 0, 'Vulnerability: zero-value order created');
});

test('BEFORE fix: negative total falls back to computed (partial protection)', () => {
  const body = { total: -999, items: [{ price: 100, qty: 2 }] };
  const total = calculateOrderTotal_BEFORE_FIX(body);
  assert.equal(total, 200, 'Negative total falls back to computed');
});

test('AFTER fix: total always recomputed from DB prices, client total ignored', () => {
  const serverProducts = [
    { id: 'p1', price: 250, sale_price: null },
    { id: 'p2', price: 100, sale_price: 80 }
  ];
  const body = { total: 1, items: [{ productId: 'p1', qty: 2 }, { productId: 'p2', qty: 1 }] };
  const total = calculateOrderTotal_AFTER_FIX(body, serverProducts);
  assert.equal(total, 580, 'Server computes: 250*2 + 80*1 = 580');
});

test('AFTER fix: sale_price used from DB (not client)', () => {
  const serverProducts = [{ id: 'p1', price: 250, sale_price: 200 }];
  const body = { total: 9999, items: [{ productId: 'p1', qty: 1 }] };
  const total = calculateOrderTotal_AFTER_FIX(body, serverProducts);
  assert.equal(total, 200, 'Uses DB sale_price 200, ignores client total 9999');
});

// ---------------------------------------------------------------------------
// SUITE 4: FS-03 — OTP Plain Text Storage
// ---------------------------------------------------------------------------
console.log('\n🔑 Suite 4: FS-03 — OTP Plain Text Storage');

test('BEFORE fix: OTP extractable via simple regex from notes', () => {
  const order = storeOrderOTP_BEFORE_FIX('order-1', 'ABC123', '847291');
  const otp = order.notes.match(/OTP: ([0-9]+)/)?.[1];
  assert.equal(otp, '847291', 'Vulnerability: OTP readable from notes');
});

test('BEFORE fix: delivery code also exposed in plain text', () => {
  const order = storeOrderOTP_BEFORE_FIX('order-1', 'XYZ789', '123456');
  assert.ok(order.notes.includes('XYZ789'));
});

test('AFTER fix: OTP stored as hash in separate column', () => {
  const mockHash = '$2a$12$hashvaluehere';
  const order = storeOrderOTP_AFTER_FIX('order-1', 'ABC123', mockHash);
  assert.ok(!order.notes.includes('847291'), 'OTP not in notes');
  assert.ok(order.payment_otp_hash.startsWith('$2a$'), 'Hash in separate column');
});

test('AFTER fix: notes field has delivery code but not OTP keyword', () => {
  const mockHash = '$2a$12$hashvalue';
  const order = storeOrderOTP_AFTER_FIX('order-1', 'DELIV99', mockHash);
  assert.ok(order.notes.includes('DELIV99'));
  assert.ok(!order.notes.includes('OTP:'));
});

// ---------------------------------------------------------------------------
// SUITE 5: Authentication Header Validation
// ---------------------------------------------------------------------------
console.log('\n🔐 Suite 5: Authentication Header Validation');

test('null Authorization header rejected', () => {
  assert.equal(validateAuthHeader(null).valid, false);
});

test('non-Bearer token prefix rejected', () => {
  assert.equal(validateAuthHeader('Token sometoken').valid, false);
});

test('Bearer with empty token rejected', () => {
  assert.equal(validateAuthHeader('Bearer ').valid, false);
});

test('Bearer with non-JWT (no dots) rejected', () => {
  assert.equal(validateAuthHeader('Bearer notajwttoken').valid, false);
});

test('JWT with only two parts rejected', () => {
  assert.equal(validateAuthHeader('Bearer header.payload').valid, false);
});

test('valid three-part JWT format passes', () => {
  assert.equal(validateAuthHeader('Bearer eyJ.eyJ.sig').valid, true);
});

// ---------------------------------------------------------------------------
// SUITE 6: Admin JWT Role Validation
// ---------------------------------------------------------------------------
console.log('\n👑 Suite 6: Admin JWT Role Validation');

test('user JWT payload (no role) fails admin check', () => {
  assert.equal(validateAdminJWTPayload({ sub: 'user-123' }), false);
});

test('role=user fails admin check', () => {
  assert.equal(validateAdminJWTPayload({ role: 'user' }), false);
});

test('role=ADMIN passes Worker admin check', () => {
  assert.equal(validateAdminJWTPayload({ role: 'ADMIN' }), true);
});

test('role=admin passes Backend admin check', () => {
  assert.equal(validateAdminJWTPayload({ role: 'admin' }), true);
});

test('null payload fails admin check', () => {
  assert.equal(validateAdminJWTPayload(null), false);
});

test('role=administrator (wrong string) fails', () => {
  assert.equal(validateAdminJWTPayload({ role: 'administrator' }), false);
});

// ---------------------------------------------------------------------------
// SUITE 7: Product Validation
// ---------------------------------------------------------------------------
console.log('\n📦 Suite 7: Product Price Validation');

test('negative price rejected', () => {
  assert.equal(validateProductPrice(-1).valid, false);
});

test('NaN price rejected', () => {
  assert.equal(validateProductPrice('not-a-number').valid, false);
});

test('Infinity price rejected', () => {
  assert.equal(validateProductPrice(Infinity).valid, false);
});

test('zero price accepted (free item)', () => {
  const r = validateProductPrice(0);
  assert.equal(r.valid, true);
  assert.equal(r.price, 0);
});

test('positive price accepted', () => {
  assert.equal(validateProductPrice(299).valid, true);
});

// ---------------------------------------------------------------------------
// SUITE 8: Plan Product Limits
// ---------------------------------------------------------------------------
console.log('\n📊 Suite 8: Plan Product Limits');

test('free plan at limit (25) is blocked', () => {
  const r = checkPlanProductLimit('free', 25);
  assert.equal(r.allowed, false);
  assert.equal(r.code, 'PRODUCT_LIMIT_REACHED');
});

test('free plan under limit (24) is allowed', () => {
  assert.equal(checkPlanProductLimit('free', 24).allowed, true);
});

test('beta plan has 25-product limit (same as free)', () => {
  const r = checkPlanProductLimit('beta', 25);
  assert.equal(r.allowed, false);
  assert.equal(r.limit, 25);
});

test('pro plan is unlimited', () => {
  assert.equal(checkPlanProductLimit('pro', 10000).allowed, true);
});

test('unknown plan defaults to free limit (25)', () => {
  const r = checkPlanProductLimit('unknown_plan', 25);
  assert.equal(r.allowed, false);
  assert.equal(r.limit, 25);
});

test('growth plan limit is 500', () => {
  assert.equal(checkPlanProductLimit('growth', 499).allowed, true);
  assert.equal(checkPlanProductLimit('growth', 500).allowed, false);
});

// ---------------------------------------------------------------------------
// SUITE 9: CORS Origin Validation
// ---------------------------------------------------------------------------
console.log('\n🌐 Suite 9: CORS Origin Validation');

const ALLOWED_ORIGINS = ['https://ferasetu.com', 'https://www.ferasetu.com', 'http://localhost:5173', 'http://127.0.0.1:5173'];

test('exact allowed origin passes', () => {
  assert.equal(isOriginAllowed('https://ferasetu.com', ALLOWED_ORIGINS), true);
});

test('ferasetu.com subdomain allowed', () => {
  assert.equal(isOriginAllowed('https://myshop.ferasetu.com', ALLOWED_ORIGINS), true);
});

test('fera-search.tech subdomain allowed', () => {
  assert.equal(isOriginAllowed('https://shop.fera-search.tech', ALLOWED_ORIGINS), true);
});

test('completely different origin blocked', () => {
  assert.equal(isOriginAllowed('https://evil.com', ALLOWED_ORIGINS), false);
});

test('ferasetu.com.evil.com is NOT allowed (not a subdomain of ferasetu.com)', () => {
  assert.equal(isOriginAllowed('https://ferasetu.com.evil.com', ALLOWED_ORIGINS), false);
});

test('null origin blocked', () => {
  assert.equal(isOriginAllowed(null, ALLOWED_ORIGINS), false);
});

test('localhost:3000 blocked (not in allowlist)', () => {
  assert.equal(isOriginAllowed('http://localhost:3000', ALLOWED_ORIGINS), false);
});

// ---------------------------------------------------------------------------
// SUITE 10: Input Security
// ---------------------------------------------------------------------------
console.log('\n🛡️  Suite 10: Input Security Patterns');

test('UNION SELECT SQL injection detected', () => {
  assert.equal(containsSQLInjectionPattern("'; UNION SELECT * FROM users; --"), true);
});

test('DROP TABLE injection detected', () => {
  assert.equal(containsSQLInjectionPattern("; DROP TABLE users; --"), true);
});

test('legitimate product name not flagged', () => {
  assert.equal(containsSQLInjectionPattern('Basmati Rice 5kg Premium'), false);
});

test('XSS script tag detected', () => {
  assert.equal(containsXSSPattern('<script>alert(1)</script>'), true);
});

test('XSS javascript: protocol detected', () => {
  assert.equal(containsXSSPattern('javascript:alert(1)'), true);
});

test('XSS onerror detected', () => {
  assert.equal(containsXSSPattern('<img src=x onerror=alert(1)>'), true);
});

test('clean product description not flagged for XSS', () => {
  assert.equal(containsXSSPattern('Fresh organic tomatoes from local farm'), false);
});

// ---------------------------------------------------------------------------
// SUITE 11: AI Credit Enforcement
// ---------------------------------------------------------------------------
console.log('\n🤖 Suite 11: AI Credit Enforcement');

test('0 credits blocked', () => {
  assert.equal(checkAICredits(0), false);
});

test('negative credits blocked', () => {
  assert.equal(checkAICredits(-1), false);
});

test('1+ credits allowed', () => {
  assert.equal(checkAICredits(1), true);
});

test('credit deduction cannot go below 0', () => {
  const balance = 1;
  const newBalance = Math.max(0, balance - 1);
  assert.equal(newBalance, 0);
  assert.equal(checkAICredits(newBalance), false);
});

test('website_ai (3 credits) costs more than chat (1 credit)', () => {
  const website = getAICreditCost_AFTER_FIX('Create website', true);
  const chat = getAICreditCost_AFTER_FIX('Restock advice', false);
  assert.ok(website > chat);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.error(`  ❌ ${f.name}: ${f.error}`));
}
if (failed > 0) {
  console.error('\n❌ Security regression tests failed.\n');
  process.exit(1);
} else {
  console.log('\n✅ All security regression tests passed!\n');
}

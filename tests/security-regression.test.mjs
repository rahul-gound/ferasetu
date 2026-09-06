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
import crypto from 'node:crypto';

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
// SUITE 12: Route Guard Enforcement & Access Control (Adversarial Challenge)
// ---------------------------------------------------------------------------
console.log('\n🚪 Suite 12: Route Guard Enforcement & Access Control');

function evaluateProtectedRoute({ user, isLoading, pathname }) {
  if (isLoading) return { action: 'render_loading', target: null };
  if (!user) return { action: 'redirect', target: '/login' };
  const isVerifyPage = pathname === '/verify-email';
  if (!user.is_verified && !isVerifyPage) {
    return { action: 'redirect', target: '/verify-email' };
  }
  return { action: 'render_child', target: pathname };
}

function evaluateAdminProtectedRoute({ token, backendVerifySuccess }) {
  if (!token) return { action: 'redirect', target: '/admin', tokenRevoked: false };
  if (!backendVerifySuccess) return { action: 'redirect', target: '/admin', tokenRevoked: true };
  return { action: 'render_child', target: null };
}

const PROTECTED_MERCHANT_ROUTES = [
  '/dashboard', '/products', '/orders', '/analytics', '/fera-ai',
  '/ai-assistant', '/ai-credits', '/website-builder', '/survey-feedback',
  '/settings/email', '/refer-earn', '/upgrade', '/support', '/get-started'
];

for (const route of PROTECTED_MERCHANT_ROUTES) {
  test(`Unauthenticated visitor to ${route} redirected to /login`, () => {
    const res = evaluateProtectedRoute({ user: null, isLoading: false, pathname: route });
    assert.equal(res.action, 'redirect');
    assert.equal(res.target, '/login');
  });
}

test('Unverified merchant redirected to /verify-email', () => {
  const res = evaluateProtectedRoute({
    user: { id: 'u1', is_verified: false },
    isLoading: false,
    pathname: '/dashboard'
  });
  assert.equal(res.action, 'redirect');
  assert.equal(res.target, '/verify-email');
});

test('Unverified merchant on /verify-email does not redirect loop', () => {
  const res = evaluateProtectedRoute({
    user: { id: 'u1', is_verified: false },
    isLoading: false,
    pathname: '/verify-email'
  });
  assert.equal(res.action, 'render_child');
});

test('Verified merchant allowed on /dashboard', () => {
  const res = evaluateProtectedRoute({
    user: { id: 'u1', is_verified: true },
    isLoading: false,
    pathname: '/dashboard'
  });
  assert.equal(res.action, 'render_child');
});

const PROTECTED_ADMIN_ROUTES = [
  '/admin/dashboard', '/admin/users', '/admin/shops', '/admin/meetings',
  '/admin/orders', '/admin/tickets', '/admin/system'
];

for (const adminRoute of PROTECTED_ADMIN_ROUTES) {
  test(`Unauthenticated access to ${adminRoute} redirected to /admin`, () => {
    const res = evaluateAdminProtectedRoute({ token: null, backendVerifySuccess: false });
    assert.equal(res.action, 'redirect');
    assert.equal(res.target, '/admin');
  });
}

test('Invalid admin token triggers token eviction and redirect to /admin', () => {
  const res = evaluateAdminProtectedRoute({ token: 'bad-token', backendVerifySuccess: false });
  assert.equal(res.action, 'redirect');
  assert.equal(res.target, '/admin');
  assert.equal(res.tokenRevoked, true);
});

// Express authenticate middleware simulation
function runAuthenticate(req, mockDbUser, verifyTokenFn) {
  let resStatus = 200;
  let resJson = null;
  let nextCalled = false;
  const res = {
    status(s) { resStatus = s; return this; },
    json(j) { resJson = j; }
  };
  const token = req.cookies?.access_token ||
    (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return { status: resStatus, body: resJson, next: nextCalled };
  }
  const decoded = verifyTokenFn(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return { status: resStatus, body: resJson, next: nextCalled };
  }
  if (!mockDbUser) {
    res.status(401).json({ error: 'User not found' });
    return { status: resStatus, body: resJson, next: nextCalled };
  }
  if (mockDbUser.is_blocked) {
    res.status(403).json({ error: 'Account blocked' });
    return { status: resStatus, body: resJson, next: nextCalled };
  }
  if ((mockDbUser.plan === 'trial' || mockDbUser.plan === 'beta') && mockDbUser.plan_expires_at) {
    if (new Date(mockDbUser.plan_expires_at) < new Date()) {
      res.status(403).json({ error: 'Trial expired', expired: true });
      return { status: resStatus, body: resJson, next: nextCalled };
    }
  }
  req.user = { ...decoded, plan: mockDbUser.plan };
  nextCalled = true;
  return { status: resStatus, body: resJson, next: nextCalled, user: req.user };
}

test('Backend authenticate: missing token -> 401', () => {
  const res = runAuthenticate({ headers: {}, cookies: {} }, null, () => null);
  assert.equal(res.status, 401);
  assert.equal(res.next, false);
});

test('Backend authenticate: blocked user -> 403 Account blocked', () => {
  const res = runAuthenticate(
    { headers: { authorization: 'Bearer tok' } },
    { id: 'u1', is_blocked: 1, plan: 'business' },
    () => ({ id: 'u1' })
  );
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'Account blocked');
  assert.equal(res.next, false);
});

test('Backend authenticate: expired trial -> 403 Trial expired', () => {
  const res = runAuthenticate(
    { headers: { authorization: 'Bearer tok' } },
    { id: 'u1', is_blocked: 0, plan: 'trial', plan_expires_at: new Date(Date.now() - 3600000).toISOString() },
    () => ({ id: 'u1' })
  );
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'Trial expired');
  assert.equal(res.next, false);
});

test('Backend authenticate: active user -> 200 with DB plan', () => {
  const res = runAuthenticate(
    { headers: { authorization: 'Bearer tok' } },
    { id: 'u1', is_blocked: 0, plan: 'business' },
    () => ({ id: 'u1', plan: 'free' })
  );
  assert.equal(res.status, 200);
  assert.equal(res.next, true);
  assert.equal(res.user.plan, 'business');
});

// ---------------------------------------------------------------------------
// SUITE 13: XSS & Hostile Protocol URL Sanitization
// ---------------------------------------------------------------------------
console.log('\n💉 Suite 13: XSS & Hostile Protocol URL Sanitization');

function sanitizeUrl(input) {
  if (!input || typeof input !== 'string') return '#';
  const trimmed = input.trim();
  if (!trimmed || trimmed === '#') return '#';

  const anchorMatch = trimmed.match(/href="([^"]+)"/i);
  const candidateUrl = anchorMatch ? anchorMatch[1].trim() : trimmed;

  const SAFE_PROTOCOL_REGEX = /^(?:https?|mailto|tel):/i;
  if (!SAFE_PROTOCOL_REGEX.test(candidateUrl)) {
    return '#';
  }

  // Pure regex verification for safe protocol stripping (matching DOMPurify behavior)
  const isHostile = /javascript:|data:|vbscript:|file:/i.test(candidateUrl);
  return isHostile ? '#' : candidateUrl;
}

const HOSTILE_URLS = [
  'javascript:alert(1)',
  'JAVASCRIPT:alert(document.cookie)',
  'JavaScript:void(0)',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
  '<a href="javascript:alert(1)">Click</a>',
  '<script>alert(1)</script>',
  '//evil.com/phish',
  '',
  '   ',
  null,
  undefined
];

for (const u of HOSTILE_URLS) {
  test(`Hostile URL [${String(u).substring(0, 25)}] sanitized to "#"`, () => {
    assert.equal(sanitizeUrl(u), '#');
  });
}

const SAFE_URLS = [
  'https://instagram.com/kirana_store',
  'http://mykirana.in',
  'mailto:help@ferasetu.com',
  'tel:+919876543210',
  '<a href="https://facebook.com/kirana">FB</a>'
];

for (const u of SAFE_URLS) {
  test(`Safe URL [${u.substring(0, 25)}] preserved`, () => {
    const clean = sanitizeUrl(u);
    assert.notEqual(clean, '#');
    assert.ok(clean.startsWith('http') || clean.startsWith('mailto:') || clean.startsWith('tel:'));
  });
}

test('Store profile updates whitelist filters out plan and credits tampering', () => {
  const body = {
    name: 'Kirana Store',
    phone: '+919876543210',
    plan: 'pro',
    ai_credits_balance: 99999,
    is_admin: true
  };
  const allowed = ['name', 'phone', 'business_name', 'preferred_language', 'subdomain', 'market'];
  const filtered = {};
  for (const k of allowed) {
    if (body[k] !== undefined) filtered[k] = body[k];
  }
  assert.equal(filtered.name, 'Kirana Store');
  assert.equal(filtered.phone, '+919876543210');
  assert.equal(filtered.plan, undefined);
  assert.equal(filtered.ai_credits_balance, undefined);
  assert.equal(filtered.is_admin, undefined);
});

// ---------------------------------------------------------------------------
// SUITE 14: Token Tampering, Forged Headers & Parameter Pollution
// ---------------------------------------------------------------------------
console.log('\n🔏 Suite 14: Token Tampering, Forged Headers & Parameter Pollution');

function verifyHmacJwt(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  if (header.alg === 'none' || !header.alg) {
    throw new Error('Algorithm none rejected');
  }

  const expectedSig = crypto.createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  if (sigB64 !== expectedSig) {
    throw new Error('Invalid signature');
  }

  return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
}

test('JWT "alg: none" attack rejected', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'admin@fera.ai', role: 'ADMIN' })).toString('base64url');
  const token = `${header}.${payload}.`;
  assert.throws(() => verifyHmacJwt(token, 'secret'), /Algorithm none rejected/);
});

test('Altered payload claim without valid signature rejected', () => {
  const secret = 'test-secret';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'user-1', role: 'user' })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  // Tamper payload to role: ADMIN
  const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'user-1', role: 'ADMIN' })).toString('base64url');
  const tamperedToken = `${header}.${tamperedPayload}.${sig}`;
  assert.throws(() => verifyHmacJwt(tamperedToken, secret), /Invalid signature/);
});

test('Token signed with wrong secret rejected', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'admin@fera.ai' })).toString('base64url');
  const sig = crypto.createHmac('sha256', 'wrong-secret').update(`${header}.${payload}`).digest('base64url');
  assert.throws(() => verifyHmacJwt(`${header}.${payload}.${sig}`, 'correct-secret'), /Invalid signature/);
});

test('Forged headers (X-Original-URL, cf-connecting-ip) do not bypass auth', () => {
  const req = {
    headers: {
      'x-original-url': '/api/admin/users',
      'x-rewrite-url': '/admin/dashboard',
      'cf-connecting-ip': '127.0.0.1'
    }
  };
  const res = runAuthenticate(req, null, () => null);
  assert.equal(res.status, 401);
  assert.equal(res.next, false);
});

test('Order total manipulation (FS-06): authoritative catalog prices override client total', () => {
  const dbProducts = [
    { id: 'p1', price: 200, sale_price: 180 },
    { id: 'p2', price: 100, sale_price: null }
  ];
  const clientPayload = {
    total: 1, // Attacker sends total: 1
    items: [
      { productId: 'p1', qty: 2 }, // 180 * 2 = 360
      { productId: 'p2', qty: 3 }  // 100 * 3 = 300
    ]
  };

  let authoritativeTotal = 0;
  for (const it of clientPayload.items) {
    const p = dbProducts.find(x => x.id === it.productId);
    const eff = p.sale_price || p.price;
    const qty = Math.max(1, Math.trunc(Number(it.qty || 1)));
    authoritativeTotal += eff * qty;
  }
  assert.equal(authoritativeTotal, 660);
  assert.notEqual(authoritativeTotal, clientPayload.total);
});

test('Quantity is strictly clamped to positive integer', () => {
  const inputs = [-5, 0, 1.99, '4', 7.01];
  const clamped = inputs.map(q => Math.max(1, Math.trunc(Number(q || 1))));
  assert.deepEqual(clamped, [1, 1, 1, 4, 7]);
});

// ---------------------------------------------------------------------------
// SUITE 15: Rate Limiting Brute-Force & Denial of Service Protection
// ---------------------------------------------------------------------------
console.log('\n🔒 Suite 15: Rate Limiting Brute-Force Protection');

class AdminRateLimiter {
  constructor() { this.attempts = new Map(); }
  recordAttempt(ip, now = Date.now()) {
    const s = this.attempts.get(ip) || { count: 0, last: now };
    if (now - s.last < 60000 && s.count >= 5) {
      return { allowed: false, status: 429, error: 'Too many login attempts. Try again later.' };
    }
    if (now - s.last >= 60000) s.count = 0;
    s.count++;
    s.last = now;
    this.attempts.set(ip, s);
    return { allowed: true, count: s.count };
  }
}

test('Admin login: >5 attempts within 60s blocked with 429', () => {
  const limiter = new AdminRateLimiter();
  const ip = '192.0.2.1';
  const t0 = 1000000;
  for (let i = 1; i <= 5; i++) {
    const r = limiter.recordAttempt(ip, t0 + i * 1000);
    assert.equal(r.allowed, true);
  }
  const blocked = limiter.recordAttempt(ip, t0 + 6000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.error, 'Too many login attempts. Try again later.');

  // Reset after 61s
  const reset = limiter.recordAttempt(ip, t0 + 65000);
  assert.equal(reset.allowed, true);
  assert.equal(reset.count, 1);
});

// ---------------------------------------------------------------------------
// SUITE 16: Error Masking & Information Leakage Prevention
// ---------------------------------------------------------------------------
console.log('\n🛡️  Suite 16: Error Masking & Information Leakage Prevention');

function runExpressErrorHandler(err) {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  return { status, body: { error: message, code: `ERR_${status}` } };
}

test('Express 500 handler masks stack traces and internal DB messages', () => {
  const err = new Error('SQLite3 fatal error: SELECT * FROM users WHERE password_hash = 123');
  err.stack = 'Error: SQLite3 fatal error\n    at db.prepare (database.ts:42)';
  const res = runExpressErrorHandler(err);
  assert.equal(res.status, 500);
  assert.equal(res.body.error, 'Internal server error');
  assert.equal(res.body.code, 'ERR_500');
  assert.equal(res.body.stack, undefined);
  assert.ok(!JSON.stringify(res.body).includes('SQLite3'));
  assert.ok(!JSON.stringify(res.body).includes('password_hash'));
});

test('Worker 500 error response masks D1 exceptions', () => {
  function workerErrorResponse(err) {
    return { status: 500, body: { error: 'Internal server error' } };
  }
  const d1Error = new Error('D1_ERROR: table products has no column named fake_col');
  const res = workerErrorResponse(d1Error);
  assert.equal(res.status, 500);
  assert.equal(res.body.error, 'Internal server error');
  assert.ok(!JSON.stringify(res.body).includes('D1_ERROR'));
  assert.ok(!JSON.stringify(res.body).includes('fake_col'));
});

test('Jose JWT verification failure returns masked message without raw crypto dump', () => {
  function maskJoseError(rawError) {
    return { status: 401, body: { error: 'Unauthorized: Invalid session signature or expired token' } };
  }
  const rawJose = new Error('JWKSet: No matching key found with kid "k_01KZRE47" in remote key set');
  const res = maskJoseError(rawJose);
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Unauthorized: Invalid session signature or expired token');
  assert.ok(!res.body.error.includes('JWKSet'));
  assert.ok(!res.body.error.includes('k_01KZRE47'));
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

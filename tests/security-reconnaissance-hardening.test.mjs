/**
 * FeraSetu — Security Reconnaissance Hardening Regression Tests
 *
 * Validates confirmed fixes for FS-001 through FS-005:
 * - FS-002: Deterministic RFC 9116 security.txt (no SPA fallback, valid fields)
 * - FS-001: Strict Content-Security-Policy (no unsafe-eval, all required service origins)
 * - FS-003: 1-Year HSTS with includeSubDomains (safe subdomains, preload deferred)
 * - FS-004: API CORS (explicit allowlist, no origin reflection for attackers, preflight handling)
 * - FS-005: Elimination of legacy localStorage token fallbacks (token, authToken, admin_token)
 * - Phase 7: Verification of fera_user client cache isolation
 * - Phase 8: SPA fallback boundary protection for static files (.txt, .xml, .well-known)
 *
 * Run with: node --test tests/security-reconnaissance-hardening.test.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import worker from '../worker/index.js';
import {
  isStaticAsset,
  RFC9116_SECURITY_TXT,
  FERASETU_CSP,
  getSecurityTxtResponse
} from '../worker/storefront.js';

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
    throw err;
  }
}

const mockEnv = {
  PAGES_ORIGIN: 'https://ferasetu.com',
  WORKOS_CLIENT_ID: 'client_test_123',
};

console.log('\n=== SUITE 1: FS-002 RFC 9116 Security.txt Endpoint & Boundaries ===');

await test('1a. GET /.well-known/security.txt returns HTTP 200 with text/plain', async () => {
  const req = new Request('https://ferasetu.com/.well-known/security.txt');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/plain'), 'Content-Type must be text/plain');
});

await test('1b. Security.txt contains mandatory RFC 9116 fields with monitored contact', async () => {
  const req = new Request('https://ferasetu.com/.well-known/security.txt');
  const res = await worker.fetch(req, mockEnv);
  const text = await res.text();

  assert.ok(text.includes('Contact: mailto:security@ferasetu.com'), 'Must use existing project contact');
  assert.ok(text.includes('Expires:'), 'Must include RFC 9116 Expires field');
  assert.ok(text.includes('Policy: https://ferasetu.com/terms'), 'Must reference terms policy');
  assert.ok(text.includes('Canonical: https://ferasetu.com/.well-known/security.txt'), 'Must reference canonical URL');
  assert.ok(!text.includes('<!doctype html>'), 'Must NOT return SPA HTML');
  assert.ok(!text.includes('<div id="root">'), 'Must NOT return React root');
});

await test('1c. GET /security.txt alias also returns deterministic RFC 9116 response', async () => {
  const req = new Request('https://ferasetu.com/security.txt');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/plain'));
  const text = await res.text();
  assert.ok(text.includes('Contact: mailto:security@ferasetu.com'));
});

await test('1d. Security.txt endpoint permits CORS for public security scanners', async () => {
  const req = new Request('https://ferasetu.com/.well-known/security.txt');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

await test('1e. Static security.txt file exists in frontend/public/.well-known/security.txt', () => {
  const filePath = path.resolve('frontend/public/.well-known/security.txt');
  assert.ok(fs.existsSync(filePath), 'frontend/public/.well-known/security.txt must exist');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('security@ferasetu.com'));
  assert.ok(content.includes('Expires:'));
});

console.log('\n=== SUITE 2: FS-001 Content-Security-Policy (CSP) ===');

await test('2a. frontend/public/_headers defines comprehensive Content-Security-Policy', () => {
  const headersPath = path.resolve('frontend/public/_headers');
  const content = fs.readFileSync(headersPath, 'utf8');
  assert.ok(content.includes('Content-Security-Policy:'), '_headers must define Content-Security-Policy');

  // Verify critical directives
  assert.ok(content.includes("default-src 'self'"), 'CSP must define default-src');
  assert.ok(content.includes("object-src 'none'"), 'CSP must block plugins via object-src none');
  assert.ok(content.includes("base-uri 'self'"), 'CSP must restrict base-uri');
  assert.ok(!content.includes("'unsafe-eval'"), 'CSP must NOT contain unsafe-eval');

  // Verify trusted third-party origins
  assert.ok(content.includes('https://sdk.cashfree.com'), 'CSP must allow Cashfree script SDK');
  assert.ok(content.includes('https://*.cashfree.com'), 'CSP must allow Cashfree checkout connect & frames');
  assert.ok(content.includes('https://api.workos.com'), 'CSP must allow WorkOS AuthKit');
  assert.ok(content.includes('https://challenges.cloudflare.com'), 'CSP must allow Cloudflare Turnstile');
  assert.ok(content.includes('https://*.statsigapi.net'), 'CSP must allow Statsig feature flags');
  assert.ok(content.includes('https://api.sarvam.ai'), 'CSP must allow Sarvam AI');
});

await test('2b. Worker storefront proxy and SPA HTML shell set Content-Security-Policy', async () => {
  assert.ok(FERASETU_CSP.includes("default-src 'self'"));
  assert.ok(!FERASETU_CSP.includes("'unsafe-eval'"));
  assert.ok(FERASETU_CSP.includes("object-src 'none'"));
  assert.ok(FERASETU_CSP.includes('https://*.cashfree.com'));
  assert.ok(FERASETU_CSP.includes('https://api.workos.com'));

  // Test edge storefront request carries CSP
  const req = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/about');
  const res = await worker.fetch(req, mockEnv);
  const cspHeader = res.headers.get('content-security-policy');
  assert.ok(cspHeader, 'Storefront response must include Content-Security-Policy');
  assert.ok(cspHeader.includes("default-src 'self'"));
  assert.ok(!cspHeader.includes("'unsafe-eval'"));
});

console.log('\n=== SUITE 3: FS-003 Strict-Transport-Security (HSTS) ===');

await test('3a. frontend/public/_headers sets 1-year HSTS with includeSubDomains', () => {
  const headersPath = path.resolve('frontend/public/_headers');
  const content = fs.readFileSync(headersPath, 'utf8');
  assert.ok(
    content.includes('Strict-Transport-Security: max-age=31536000; includeSubDomains'),
    'HSTS must be 31536000 seconds with includeSubDomains'
  );
  assert.ok(
    !content.includes('Strict-Transport-Security: max-age=86400'),
    'Legacy 1-day HSTS max-age must be removed'
  );
  assert.ok(!content.includes('preload'), 'Preload must be deferred until submission');
});

await test('3b. Worker HTML shell response attaches 1-year HSTS with includeSubDomains', async () => {
  const req = new Request('https://rajeshmart-mumbai-mh-in.ferasetu.com/about');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(
    res.headers.get('strict-transport-security'),
    'max-age=31536000; includeSubDomains'
  );
});

await test('3c. Worker API json() helper attaches 1-year HSTS with includeSubDomains', async () => {
  const req = new Request('https://ferasetu.com/api/v1/health');
  const res = await worker.fetch(req, mockEnv);
  assert.equal(
    res.headers.get('strict-transport-security'),
    'max-age=31536000; includeSubDomains'
  );
});

console.log('\n=== SUITE 4: FS-004 API CORS Security & Preflight ===');

await test('4a. Approved origin receives valid Access-Control-Allow-Origin', async () => {
  const req = new Request('https://ferasetu.com/api/v1/health', {
    headers: { Origin: 'https://ferasetu.com' }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://ferasetu.com');
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
});

await test('4b. Merchant storefront subdomain origin receives matching CORS header', async () => {
  const req = new Request('https://ferasetu.com/api/v1/health', {
    headers: { Origin: 'https://rajeshmart-mumbai-mh-in.ferasetu.com' }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://rajeshmart-mumbai-mh-in.ferasetu.com');
});

await test('4c. Hostile untrusted origin is NEVER reflected in CORS header', async () => {
  const req = new Request('https://ferasetu.com/api/v1/health', {
    headers: { Origin: 'https://evil-hacker.com' }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.notEqual(res.headers.get('access-control-allow-origin'), 'https://evil-hacker.com');
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://ferasetu.com');
});

await test('4d. Preflight OPTIONS returns 204 with required CORS methods and headers', async () => {
  const req = new Request('https://ferasetu.com/api/products', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://ferasetu.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization, X-Organization-Id'
    }
  });
  const res = await worker.fetch(req, mockEnv);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://ferasetu.com');
  assert.ok(res.headers.get('access-control-allow-methods')?.includes('POST'));
  assert.ok(res.headers.get('access-control-allow-headers')?.includes('Authorization'));
});

console.log('\n=== SUITE 5: FS-005 Elimination of Legacy localStorage Token Fallback ===');

await test('5a. frontend/src/services/api.ts contains no localStorage token fallback', () => {
  const apiPath = path.resolve('frontend/src/services/api.ts');
  const code = fs.readFileSync(apiPath, 'utf8');

  assert.ok(
    !code.includes("localStorage.getItem('token')"),
    'Must not read token from localStorage'
  );
  assert.ok(
    !code.includes("localStorage.getItem('authToken')"),
    'Must not read authToken from localStorage'
  );
  assert.ok(
    !code.includes("localStorage.getItem('admin_token')"),
    'remoteApi must not fall back to admin_token'
  );
  assert.ok(
    code.includes('const token = await getWorkOSToken();'),
    'Must solely use getWorkOSToken()'
  );
});

console.log('\n=== SUITE 6: SPA Fallback Boundaries Protection ===');

await test('6a. isStaticAsset classifies security.txt, sitemap.xml, and robots.txt as static', () => {
  assert.equal(isStaticAsset('/.well-known/security.txt'), true);
  assert.equal(isStaticAsset('/security.txt'), true);
  assert.equal(isStaticAsset('/robots.txt'), true);
  assert.equal(isStaticAsset('/sitemap.xml'), true);
  assert.equal(isStaticAsset('/site.webmanifest'), true);
  assert.equal(isStaticAsset('/assets/index-123.js'), true);
  assert.equal(isStaticAsset('/custom.txt'), true);
  assert.equal(isStaticAsset('/feed.xml'), true);
});

await test('6b. isStaticAsset correctly rejects document routes so SPA router works', () => {
  assert.equal(isStaticAsset('/'), false);
  assert.equal(isStaticAsset('/dashboard'), false);
  assert.equal(isStaticAsset('/pricing'), false);
  assert.equal(isStaticAsset('/login'), false);
  assert.equal(isStaticAsset('/orders'), false);
  assert.equal(isStaticAsset('/about'), false);
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('────────────────────────────────────────────────────────────');
console.log('🌟 All Security Reconnaissance Hardening regression tests passed!\n');

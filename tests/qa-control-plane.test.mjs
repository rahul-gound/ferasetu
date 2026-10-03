/**
 * FeraSetu QA Control Plane & Autonomous Reliability Engine Test Suite
 * ====================================================================
 * Verifies that the QA testing system accurately detects failures, avoids false
 * positives, correlates multi-symptom defects, redacts secrets, and blocks destructive actions.
 *
 * Run with: node --test tests/qa-control-plane.test.mjs
 */

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { redactSecrets, checkActionSafety } from '../packages/qa-engine/src/intelligence/safetyGuardrails.js';
import { generateIssueFingerprint, normalizeMessage } from '../packages/qa-engine/src/intelligence/fingerprinting.js';
import { diagnoseMediaFailure } from '../packages/qa-engine/src/intelligence/b2Diagnostics.js';
import { correlateInteractionResult, correlateMediaIssue } from '../packages/qa-engine/src/intelligence/correlationEngine.js';
import { analyzeButtonInteraction } from '../packages/qa-engine/src/scanners/buttonScanner.js';
import { auditImageElement } from '../packages/qa-engine/src/scanners/imageScanner.js';
import { auditAccessibility } from '../packages/qa-engine/src/scanners/accessibilityScanner.js';
import { auditTenantIsolation, auditPublicSourceLeakage } from '../packages/qa-engine/src/scanners/securityScanner.js';
import { auditPerformanceMetrics } from '../packages/qa-engine/src/scanners/performanceScanner.js';
import { NetworkObserver } from '../packages/qa-engine/src/scanners/networkScanner.js';
import { ConsoleObserver } from '../packages/qa-engine/src/scanners/consoleScanner.js';
import { QARunOrchestrator } from '../packages/qa-engine/src/orchestrator.js';
import { ensureQATables, handleQARoutes, classifyEndpointSafety } from '../worker/routes/qaRoutes.js';
import worker from '../worker/index.js';

describe('1. Safety Guardrails & Secret Redaction', () => {
  test('Redacts Bearer authorization tokens', () => {
    const raw = 'Request header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload.sig';
    const clean = redactSecrets(raw);
    assert.match(clean, /Bearer \[REDACTED_TOKEN\]/);
    assert.doesNotMatch(clean, /eyJhbGci/);
  });

  test('Redacts passwords and API keys from JSON objects', () => {
    const obj = {
      user: 'admin',
      password: 'SuperSecretPassword123!',
      apiKey: 'sk_live_0123456789abcdef',
    };
    const clean = redactSecrets(obj);
    assert.equal(clean.password, '[REDACTED]');
    assert.equal(clean.apiKey, '[REDACTED]');
  });

  test('Blocks financial and destructive endpoints', () => {
    const refundSafety = checkActionSafety('POST', '/api/orders/123/refund', 'production');
    assert.equal(refundSafety.safe, false);
    assert.equal(refundSafety.classification, 'BLOCKED');

    const whatsappSafety = checkActionSafety('POST', '/api/whatsapp/send', 'production');
    assert.equal(whatsappSafety.safe, false);
    assert.equal(whatsappSafety.classification, 'BLOCKED');

    const readSafety = checkActionSafety('GET', '/api/products', 'production');
    assert.equal(readSafety.safe, true);
    assert.equal(readSafety.classification, 'SAFE_READ');
  });
});

describe('2. Deterministic Bug Fingerprinting', () => {
  test('Normalizes dynamic UUIDs, timestamps, and stack lines', () => {
    const msg1 = 'Failed to fetch /api/products/f47ac10b-58cc-4372-a567-0e02b2c3d479 at 2026-10-01T17:05:00Z: error at line 42:15';
    const msg2 = 'Failed to fetch /api/products/c9bf9e57-1685-4c89-bafb-ff5af830be8a at 2026-10-01T17:08:22Z: error at line 99:40';
    assert.equal(normalizeMessage(msg1), normalizeMessage(msg2));
  });

  test('Generates identical fingerprints for recurring errors (prevents 500 duplicate alerts)', () => {
    const fp1 = generateIssueFingerprint({
      category: 'API_FAILURE',
      title: 'POST /api/products returned 500',
      route: '/dashboard/products',
      apiEndpoint: '/api/products',
      httpStatus: 500,
    });

    const fp2 = generateIssueFingerprint({
      category: 'API_FAILURE',
      title: 'POST /api/products returned 500',
      route: '/dashboard/products',
      apiEndpoint: '/api/products',
      httpStatus: 500,
    });

    assert.equal(fp1, fp2);
    assert.ok(fp1.startsWith('API_FAILURE_'));
  });
});

describe('3. Backblaze B2 & CDN Media Intelligence', () => {
  test('Traces B2 403 Forbidden to CDN Worker SigV4 authorization', () => {
    const diagnosis = diagnoseMediaFailure({
      url: 'https://cdn.ferasetu.com/shops/shop_alpha/products/photo.webp',
      status: 403,
      componentName: 'ProductCard',
      naturalWidth: 0,
      naturalHeight: 0,
    });

    assert.equal(diagnosis.likelySubsystem, 'B2 -> CDN Worker Authorization');
    assert.match(
      diagnosis.diagnosticTrace,
      /ProductCard -> image src -> cdn\.ferasetu\.com -> CDN Worker -> Backblaze B2 -> HTTP 403 Forbidden/
    );
    assert.match(diagnosis.likelyCause, /SigV4/i);
  });

  test('Detects missing image src and zero dimensions', () => {
    const issues = auditImageElement({
      route: '/products',
      src: '',
      naturalWidth: 0,
      naturalHeight: 0,
      componentName: 'ProductGrid',
    });

    assert.equal(issues.length, 1);
    assert.equal(issues[0].category, 'IMAGE_FAILURE');
    assert.equal(issues[0].severity, 'P2');
  });
});

describe('4. Button Failure & Pre/Post State Observation Engine', () => {
  test('Does not falsely flag valid UI state transitions (No false positives)', () => {
    const validBtn = analyzeButtonInteraction({
      route: '/dashboard',
      element: { role: 'button', name: 'Filter Orders', text: 'Filter Orders', selector: 'button.filter-btn' },
      before: { url: '/dashboard', domHash: 'hashA', dialogCount: 0, networkCount: 0, consoleErrorCount: 0, isLoading: false, pageTitle: 'Dashboard' },
      after: { url: '/dashboard', domHash: 'hashB', dialogCount: 1, networkCount: 0, consoleErrorCount: 0, isLoading: false, pageTitle: 'Dashboard' }, // dialog opened!
      networkRequests: [],
      consoleLogs: [],
      correlationId: 'qa-1',
    });

    assert.equal(validBtn, null, 'Valid dialog toggle is NOT flagged as broken');
  });

  test('Detects CLICK INTERCEPTED when overlay blocks element', () => {
    const blockedBtn = analyzeButtonInteraction({
      route: '/dashboard/products',
      element: { role: 'button', name: 'Create Product', text: 'Create Product', selector: 'button[data-testid="create-product"]' },
      before: { url: '/dashboard/products', domHash: 'h1', dialogCount: 0, networkCount: 0, consoleErrorCount: 0, isLoading: false, pageTitle: 'Products' },
      after: { url: '/dashboard/products', domHash: 'h1', dialogCount: 0, networkCount: 0, consoleErrorCount: 0, isLoading: false, pageTitle: 'Products' },
      networkRequests: [],
      consoleLogs: [],
      intercepted: true,
      correlationId: 'qa-2',
    });

    assert.ok(blockedBtn);
    assert.equal(blockedBtn.category, 'BUTTON_FAILURE');
    assert.equal(blockedBtn.severity, 'P1');
    assert.match(blockedBtn.title, /Click Intercepted/);
  });

  test('Correlates Button Click + API 500 + Console Error + Infinite Spinner into ONE unified issue', () => {
    const correlated = analyzeButtonInteraction({
      route: '/dashboard/products',
      element: { role: 'button', name: 'Save Product', text: 'Save Product', selector: 'button[data-testid="save-btn"]', componentName: 'ProductCreateForm' },
      before: { url: '/dashboard/products', domHash: 'h1', dialogCount: 1, networkCount: 0, consoleErrorCount: 0, isLoading: false, pageTitle: 'Products' },
      after: { url: '/dashboard/products', domHash: 'h1', dialogCount: 1, networkCount: 1, consoleErrorCount: 1, isLoading: true, pageTitle: 'Products' },
      networkRequests: [
        { url: 'https://ferasetu.com/api/products', method: 'POST', status: 500, durationMs: 250 },
      ],
      consoleLogs: [
        { type: 'error', message: 'TypeError: Cannot read properties of undefined (reading "success")' },
      ],
      correlationId: 'qa-run-1842-action-73',
    });

    assert.ok(correlated);
    assert.equal(correlated.severity, 'P1');
    assert.equal(correlated.category, 'API_FAILURE');
    assert.match(correlated.observedSummary, /POST https:\/\/ferasetu\.com\/api\/products failed with HTTP 500/);
    assert.match(correlated.observedSummary, /infinite loading\/spinner state/);
    assert.equal(correlated.reproductionSteps.length >= 4, true);
  });
});

describe('5. Accessibility (a11y) & Security Isolation', () => {
  test('Detects missing accessible name on icon buttons (WCAG 4.1.2)', () => {
    const issues = auditAccessibility({
      route: '/settings',
      elements: [
        { role: 'button', name: '', text: '', selector: 'button.icon-only' },
      ],
    });

    assert.equal(issues.length, 1);
    assert.equal(issues[0].category, 'ACCESSIBILITY');
    assert.match(issues[0].title, /no accessible name/i);
  });

  test('Detects cross-tenant data leak and flags CRITICAL P0 security warning', () => {
    const leak = auditTenantIsolation({
      tenantAId: 'tenant_ramesh_kirana',
      tenantBId: 'tenant_priya_fashion',
      returnedItems: [
        { id: 'prod_99', shop_id: 'tenant_priya_fashion', name: 'Silk Saree' },
      ],
      route: '/api/products',
    });

    assert.ok(leak);
    assert.equal(leak.severity, 'P0');
    assert.equal(leak.category, 'SECURITY');
    assert.match(leak.title, /Cross-Tenant Data Leakage Detected/);
  });

  test('Guarantees clean tenant query returns zero issues', () => {
    const clean = auditTenantIsolation({
      tenantAId: 'tenant_ramesh_kirana',
      tenantBId: 'tenant_priya_fashion',
      returnedItems: [
        { id: 'prod_01', shop_id: 'tenant_ramesh_kirana', name: 'Atta 5kg' },
      ],
      route: '/api/products',
    });

    assert.equal(clean, null);
  });
});

describe('6. Full QA Orchestrator Execution', () => {
  test('Runs smoke scan end-to-end and reports structured findings', async () => {
    const orchestrator = new QARunOrchestrator({
      mode: 'smoke',
      targetUrl: 'http://localhost:5173',
      environment: 'local',
    });

    const result = await orchestrator.run();
    assert.ok(result.runId);
    assert.equal(result.status, 'completed');
    assert.ok(result.routes_tested > 0);
    assert.ok(result.buttons_tested > 0);
    assert.ok(result.images_tested > 0);
  });
});

describe('7. Worker QA API & Synthetic Test Endpoints', () => {
  const mockDbStorage = new Map();

  const mockDb = {
    async exec(sql) {
      return { meta: { changes: 0 } };
    },
    prepare(query) {
      return {
        bind(...args) {
          return {
            async first(col) {
              if (query.includes('COUNT(*)')) return 0;
              return null;
            },
            async all() {
              return { results: [] };
            },
            async run() {
              return { meta: { changes: 1 } };
            },
          };
        },
        async first() {
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          return { meta: { changes: 1 } };
        },
      };
    },
  };

  const dummyEnv = {
    DB: mockDb,
    PAGES_ORIGIN: 'http://localhost:5173',
    ENVIRONMENT: 'development',
  };

  test('GET /api/qa/synthetic/broken-image returns HTTP 403 with B2/CDN diagnostic header', async () => {
    const req = new Request('http://localhost:5173/api/qa/synthetic/broken-image', { method: 'GET' });
    const res = await worker.fetch(req, dummyEnv);
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('X-FeraSetu-Subsystem'), 'B2 -> CDN Worker');
  });

  test('POST /api/qa/synthetic/server-error returns HTTP 500', async () => {
    const req = new Request('http://localhost:5173/api/qa/synthetic/server-error', { method: 'POST' });
    const res = await worker.fetch(req, dummyEnv);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.code, 'SYNTHETIC_500');
  });

  test('GET /api/qa/synthetic/tenant-leak-check blocks unauthorized cross-tenant query', async () => {
    const leakReq = new Request('http://localhost:5173/api/qa/synthetic/tenant-leak-check', {
      method: 'GET',
      headers: { 'X-Shop-Id': 'tenant_b' },
    });
    const res = await worker.fetch(leakReq, dummyEnv);
    assert.equal(res.status, 403);
  });
});

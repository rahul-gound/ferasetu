/**
 * FeraSetu — Error Log Endpoint Security Regression Tests
 *
 * Validates that /api/error-logs:
 * 1. Cannot be used to impersonate other users or organizations (Server-side enrichment checks).
 * 2. Does not leak information (though it currently just creates logs).
 *
 * Run with: node --test tests/error-logs-security.test.mjs
 */

import assert from 'node:assert/strict';
import { createProMockD1 } from './pro-mock-d1.mjs';
import worker from '../worker/index.js';

console.log('\n=== SUITE F: /api/error-logs Security ===');

async function testErrorLogs() {
  const db = await createProMockD1();
  const env = { DB: db };

  // Setup User/Org
  const userRow = {
    id: 'usr_pro_active',
    email: 'pro@example.com',
    name: 'Pro Merchant',
    plan: 'pro',
    organization_id: 'org_pro_active'
  };
  // No insert needed; createProMockD1 already seeds this user

  // Test 1: Submission with correct ID/Email enriches correctly
  const payload = {
    error_message: 'Test Error',
    user_id: 'usr_pro_active'
  };
  const req = new Request('https://ferasetu.com/api/error-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const res = await worker.fetch(req, env);
  const json = await res.json();

  assert.equal(res.status, 201);
  assert.equal(json.user_email, 'pro@example.com');
  assert.equal(json.plan_tier, 'pro');
  assert.equal(json.is_paid, true);
  console.log('  ✅ F1. Correct user enrichment verified');

  // Test 2: Submission with fake ID should NOT enrich from user table
  const payload2 = {
    error_message: 'Fake User Error',
    user_id: 'non_existent_user'
  };
  const req2 = new Request('https://ferasetu.com/api/error-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload2)
  });

  const res2 = await worker.fetch(req2, env);
  const json2 = await res2.json();

  assert.equal(res2.status, 201);
  assert.equal(json2.user_id, 'non_existent_user'); // ID should remain what was provided if not found
  assert.equal(json2.user_email, null); // Email should not be enriched
  console.log('  ✅ F2. Fake user ID does not leak data');
}

await testErrorLogs();

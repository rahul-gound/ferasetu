/**
 * FeraSetu — Tenant Isolation Regression Tests
 *
 * Validates that users cannot access resources belonging to another organization.
 *
 * Run with: node --test tests/tenant-isolation.test.mjs
 */

import assert from 'node:assert/strict';
import * as jose from '../worker/node_modules/jose/dist/node/esm/index.js';
import { createProMockD1 } from './pro-mock-d1.mjs';
import worker from '../worker/index.js';

// Setup local JWKS for authentication bypass
const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
const jwks = jose.createLocalJWKSet({ keys: [jwk] });

async function signOrgJwt(orgId, userId) {
  return await new jose.SignJWT({
    sub: userId,
    org_id: orgId,
    email: 'user@example.com'
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
}

console.log('\n=== SUITE E: Tenant Isolation ===');

async function testIsolation() {
  const db = await createProMockD1();
  const env = { DB: db, JWKS: jwks };

  // Setup Org A and Org B
  const orgA = 'org_a_id';
  const orgB = 'org_b_id';
  const userA = 'user_a_id';

  // Seed orgs/members
  // We need to match the structure expected by requireOrgContext and ensureTables
  // The worker expects 'organizations' and 'organization_members' tables.
  await db.prepare('INSERT INTO organizations (id, workos_organization_id, name) VALUES (?, ?, ?)').bind('org_a_db_id', orgA, 'Org A').run();
  await db.prepare('INSERT INTO organizations (id, workos_organization_id, name) VALUES (?, ?, ?)').bind('org_b_db_id', orgB, 'Org B').run();
  await db.prepare('INSERT INTO organization_members (id, organization_id, user_id, role) VALUES (?, ?, ?, ?)').bind('mem_a', 'org_a_db_id', userA, 'staff').run();

  // Create a product for Org B
  await db.prepare('INSERT INTO products (id, organization_id, name) VALUES (?, ?, ?)').bind('prod_b', 'org_b_db_id', 'Secret Product B').run();

  // 1. User A tries to list products (should NOT see Org B's products)
  const tokenA = await signOrgJwt(orgA, userA);
  const req = new Request('https://ferasetu.com/api/products', {
    headers: { Authorization: `Bearer ${tokenA}` }
  });

  const res = await worker.fetch(req, env);
  const data = await res.json();
  const products = Array.isArray(data) ? data : (data.products || []);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(products));
  // Org A user should not see Org B products
  const hasSecretProduct = products.some(p => p.id === 'prod_b');
  assert.equal(hasSecretProduct, false, 'User A should not see Org B products');
  console.log('  ✅ Tenant isolation validated: User A cannot see Org B products');
}

await testIsolation();

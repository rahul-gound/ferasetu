/**
 * FeraSetu — 1-Click DNS Automation & Domain Connect Provider Tests
 * tests/domain-connect-provider.test.mjs
 * =============================================================================
 * Validates:
 * 1. extractApexDomain normalization across gTLDs and ccTLDs
 * 2. detectDomainDnsProvider recognizes GoDaddy, Namecheap, Cloudflare, Spaceship, Hostinger, IONOS, Squarespace
 * 3. Checks if registrar has given/delegated active DNS (hasDns)
 * 4. Synthesizes official Domain Connect Sync URLs with required query params
 * 5. Returns official Domain Connect service template manifest
 * =============================================================================
 */

import assert from 'node:assert/strict';
import {
  extractApexDomain,
  detectDomainDnsProvider,
  getDomainConnectTemplateManifest,
  DOMAIN_CONNECT_PROVIDER_ID,
  DOMAIN_CONNECT_SERVICE_ID
} from '../worker/services/domainConnectService.js';

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

// Save original global.fetch
const originalFetch = globalThis.fetch;

console.log('🧪 Starting Domain Connect & Provider Detection Test Suite...\n');

// 1. Apex Domain Extraction
await test('FS-DNS-01: extractApexDomain extracts root from subdomains and multi-level ccTLDs', () => {
  assert.equal(extractApexDomain('rohankirana.com'), 'rohankirana.com');
  assert.equal(extractApexDomain('www.rohankirana.com'), 'rohankirana.com');
  assert.equal(extractApexDomain('shop.store.rohankirana.in'), 'rohankirana.in');
  assert.equal(extractApexDomain('store.organicdukkan.co.uk'), 'organicdukkan.co.uk');
  assert.equal(extractApexDomain('https://delhimart.com.in/products'), 'delhimart.com.in');
});

// 2. Domain Connect Manifest
await test('FS-DNS-02: getDomainConnectTemplateManifest returns valid Domain Connect v2 template', () => {
  const manifest = getDomainConnectTemplateManifest(DOMAIN_CONNECT_PROVIDER_ID, DOMAIN_CONNECT_SERVICE_ID);
  assert.ok(manifest, 'Manifest should not be null');
  assert.equal(manifest.providerId, 'ferasetu.com');
  assert.equal(manifest.serviceId, 'storefront');
  assert.equal(manifest.version, 1);
  assert.ok(Array.isArray(manifest.records), 'Records must be an array');
  
  // Verify challenge TXT and CNAME records exist in manifest
  const txtRecord = manifest.records.find(r => r.name === '_ferasetu-challenge');
  assert.ok(txtRecord, 'Should have _ferasetu-challenge TXT record');
  assert.ok(txtRecord.data.includes('%ferasetu_token%'), 'Challenge data should reference token variable');

  const cnameRecord = manifest.records.find(r => r.name === 'www');
  assert.ok(cnameRecord, 'Should have www CNAME record');
  assert.equal(cnameRecord.data, '%ferasetu_target%');
});

// 3. Provider Detection: GoDaddy (Domain Connect)
await test('FS-DNS-03: detectDomainDnsProvider detects GoDaddy and builds Domain Connect 1-Click URL', async () => {
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('type=NS')) {
      return new Response(JSON.stringify({
        Status: 0,
        Answer: [
          { name: 'sweetshop.com', type: 2, data: 'ns1.domaincontrol.com.' },
          { name: 'sweetshop.com', type: 2, data: 'ns2.domaincontrol.com.' }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
    }
    return new Response(JSON.stringify({ Status: 0, Answer: [] }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
  };

  const result = await detectDomainDnsProvider('sweetshop.com', {
    ownershipToken: 'tok_test_12345',
    redirectUri: 'https://ferasetu.com/callback'
  });

  assert.equal(result.valid, true);
  assert.equal(result.hasDns, true, 'GoDaddy domain must be marked as hasDns=true');
  assert.equal(result.provider?.id, 'godaddy');
  assert.equal(result.provider?.name, 'GoDaddy');
  assert.equal(result.provider?.supports1ClickDns, true);
  assert.equal(result.provider?.supportsDomainConnect, true);
  assert.equal(result.provider?.type, 'DOMAIN_CONNECT');
  
  assert.ok(result.provider?.connectUrl?.includes('dcc.godaddy.com/manage/domainconnect'), 'Must include GoDaddy Domain Connect sync UX endpoint');
  assert.ok(result.provider?.connectUrl?.includes('providerId=ferasetu.com'));
  assert.ok(result.provider?.connectUrl?.includes('ferasetu_token=tok_test_12345'));
  assert.ok(result.provider?.connectUrl?.includes('serviceId=storefront'));
});

// 4. Provider Detection: Namecheap (Domain Connect)
await test('FS-DNS-04: detectDomainDnsProvider detects Namecheap registrar servers', async () => {
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('type=NS')) {
      return new Response(JSON.stringify({
        Status: 0,
        Answer: [
          { name: 'myboutique.store', type: 2, data: 'dns1.registrar-servers.com.' },
          { name: 'myboutique.store', type: 2, data: 'dns2.registrar-servers.com.' }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
    }
    return new Response(JSON.stringify({ Status: 0, Answer: [] }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
  };

  const result = await detectDomainDnsProvider('myboutique.store');
  assert.equal(result.provider?.id, 'namecheap');
  assert.equal(result.provider?.name, 'Namecheap');
  assert.equal(result.provider?.supports1ClickDns, true);
  assert.equal(result.hasDns, true);
});

// 5. Provider Detection: Cloudflare
await test('FS-DNS-05: detectDomainDnsProvider detects Cloudflare nameservers', async () => {
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('type=NS')) {
      return new Response(JSON.stringify({
        Status: 0,
        Answer: [
          { name: 'techgrocer.in', type: 2, data: 'dina.ns.cloudflare.com.' },
          { name: 'techgrocer.in', type: 2, data: 'kurt.ns.cloudflare.com.' }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
    }
    return new Response(JSON.stringify({ Status: 0, Answer: [] }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
  };

  const result = await detectDomainDnsProvider('techgrocer.in');
  assert.equal(result.provider?.id, 'cloudflare');
  assert.equal(result.provider?.name, 'Cloudflare');
  assert.equal(result.provider?.type, 'DIRECT_DASHBOARD');
  assert.ok(result.provider?.dnsConsoleUrl?.includes('dash.cloudflare.com'));
});

// 6. Provider Detection: Spaceship (API automation)
await test('FS-DNS-06: detectDomainDnsProvider detects Spaceship API automation', async () => {
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('type=NS')) {
      return new Response(JSON.stringify({
        Status: 0,
        Answer: [
          { name: 'jaipursarees.online', type: 2, data: 'ns1.spaceship.com.' },
          { name: 'jaipursarees.online', type: 2, data: 'ns2.spaceship.com.' }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
    }
    return new Response(JSON.stringify({ Status: 0, Answer: [] }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
  };

  const result = await detectDomainDnsProvider('jaipursarees.online');
  assert.equal(result.provider?.id, 'spaceship');
  assert.equal(result.provider?.name, 'Spaceship');
  assert.equal(result.provider?.type, 'API_AUTOMATION');
  assert.equal(result.provider?.supports1ClickDns, true);
});

// 7. Provider Detection: Hostinger
await test('FS-DNS-07: detectDomainDnsProvider detects Hostinger DNS parking / zone', async () => {
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('type=NS')) {
      return new Response(JSON.stringify({
        Status: 0,
        Answer: [
          { name: 'kashmirtea.in', type: 2, data: 'ns1.dns-parking.com.' },
          { name: 'kashmirtea.in', type: 2, data: 'ns2.dns-parking.com.' }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
    }
    return new Response(JSON.stringify({ Status: 0, Answer: [] }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
  };

  const result = await detectDomainDnsProvider('kashmirtea.in');
  assert.equal(result.provider?.id, 'hostinger');
  assert.equal(result.provider?.name, 'Hostinger');
  assert.ok(result.provider?.dnsConsoleUrl?.includes('hpanel.hostinger.com'));
});

// 8. Provider Detection: No Active Nameservers (Unconfigured domain)
await test('FS-DNS-08: detectDomainDnsProvider reports hasDns=false when domain has no nameservers', async () => {
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({
      Status: 3, // NXDOMAIN
      Answer: []
    }), { status: 200, headers: { 'Content-Type': 'application/dns-json' } });
  };

  const result = await detectDomainDnsProvider('unregistered12345domain.xyz');
  assert.equal(result.hasDns, false, 'Should report hasDns=false when no NS answers return');
  assert.equal(result.provider?.type, 'NO_DNS');
  assert.equal(result.provider?.supports1ClickDns, false);
});

// Restore original fetch
globalThis.fetch = originalFetch;

console.log(`\n======================================================`);
console.log(`🎉 All ${passed} Domain Connect & Provider tests passed!`);
console.log(`======================================================\n`);

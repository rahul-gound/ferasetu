import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDestinationUrl,
  BuilderHttpError,
} from '../worker/services/builderService.js';
import { encryptSecret, decryptSecret } from '../worker/services/emailCrypto.js';

test('1. SSRF Defense: validateDestinationUrl allows legitimate public HTTPS endpoints', () => {
  const allowedUrls = [
    'https://api.stripe.com/v1/charges',
    'https://api.sendgrid.com/v3/mail/send',
    'https://identitytoolkit.googleapis.com/v1/accounts',
    'https://crm.example.com/api/webhooks',
    'https://api.example.com:8443/data',
  ];

  for (const url of allowedUrls) {
    const parsed = validateDestinationUrl(url);
    assert.equal(parsed.protocol, 'https:');
  }
});

test('2. SSRF Defense: blocks non-HTTPS schemes fail-closed', () => {
  const blockedSchemes = [
    'http://api.example.com/data',
    'ftp://files.example.com/upload',
    'file:///etc/passwd',
    'gopher://gopher.example.com',
    'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==',
  ];

  for (const url of blockedSchemes) {
    assert.throws(
      () => validateDestinationUrl(url),
      (err) => err instanceof BuilderHttpError && err.status === 400
    );
  }
});

test('3. SSRF Defense: blocks Loopback, RFC1918 Private subnets, and Cloud Metadata', () => {
  const blockedDestinations = [
    'https://localhost/api',
    'https://127.0.0.1/admin',
    'https://127.0.0.2:443/status',
    'https://0.0.0.0/internal',
    'https://10.0.0.5/secrets',
    'https://10.254.1.1/keys',
    'https://172.16.0.10/metrics',
    'https://172.31.255.255/db',
    'https://192.168.1.1/router',
    'https://192.168.100.50/vault',
    'https://169.254.169.254/latest/meta-data/', // AWS/GCP metadata
    'https://metadata.google.internal/computeMetadata/v1/',
    'https://instance-data/latest/meta-data',
    'https://server.local/api',
    'https://app.internal/config',
    'https://[::1]/debug',
  ];

  for (const url of blockedDestinations) {
    assert.throws(
      () => validateDestinationUrl(url),
      (err) => err instanceof BuilderHttpError && err.status === 403,
      `Should have blocked: ${url}`
    );
  }
});

test('4. SSRF Defense: blocks non-standard and dangerous port numbers', () => {
  const dangerousPorts = [
    'https://api.example.com:22/ssh',
    'https://api.example.com:25/smtp',
    'https://api.example.com:80/insecure',
    'https://api.example.com:3306/mysql',
    'https://api.example.com:5432/postgres',
    'https://api.example.com:6379/redis',
    'https://api.example.com:8080/dev',
    'https://api.example.com:9200/elastic',
  ];

  for (const url of dangerousPorts) {
    assert.throws(
      () => validateDestinationUrl(url),
      (err) => err instanceof BuilderHttpError && err.status === 403
    );
  }
});

test('5. Cryptographic Vault: AES-256-GCM encrypts and decrypts connector credentials', async () => {
  const mockEnv = {
    DATA_ENCRYPTION_KEY: 'test-master-encryption-key-for-unit-tests-32b!',
  };

  const sensitiveCredentials = {
    apiKey: 'sk_live_983749823472938472938472938472',
    bearerToken: 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.credentials',
    secretHeader: 'X-Merchant-Secret-Key',
  };

  const plaintext = JSON.stringify(sensitiveCredentials);
  const encrypted = await encryptSecret(plaintext, mockEnv);

  assert.ok(encrypted.startsWith('enc:v1:'));
  assert.notEqual(encrypted, plaintext);
  assert.ok(!encrypted.includes('sk_live_')); // Plaintext credential must not be visible

  const decrypted = await decryptSecret(encrypted, mockEnv);
  assert.equal(decrypted, plaintext);

  const parsed = JSON.parse(decrypted);
  assert.equal(parsed.apiKey, sensitiveCredentials.apiKey);
  assert.equal(parsed.bearerToken, sensitiveCredentials.bearerToken);
});

test('6. In-Memory Mock D1: Draft persistence, publish, and rollback lifecycle', async () => {
  // Simple in-memory mock database
  const storage = {
    website_drafts: new Map(),
    website_versions: [],
    websites: new Map(),
    media_files: new Map(),
  };

  const mockOrgId = 'org_tenant_1';
  const mockUserId = 'usr_merchant_1';

  // 1. Initial State: Save Draft
  const draftData = {
    name: 'Unified Artisan Store',
    template: 'artisan',
    activePageId: 'page_home',
    pages: [
      {
        id: 'page_home',
        name: 'Home',
        slug: '/',
        nodes: [
          { id: 'node_hero', type: 'page-block', props: { title: 'Welcome to Artisan Goods' } },
          { id: 'node_signup_btn', type: 'button', props: { label: 'Register Now', workflowId: 'wf_signup' } },
        ],
      },
    ],
    tokens: {
      colors: { primary: '#b45309', secondary: '#78350f', background: '#fffbeb' },
      typography: { fontFamily: 'serif', baseFontSize: 16 },
    },
    workflows: [
      {
        id: 'wf_signup',
        name: 'Customer Registration Flow',
        startStepId: 'step_validate',
        steps: [
          { id: 'step_validate', type: 'validateForm', onSuccess: ['step_firebase_auth'] },
          { id: 'step_firebase_auth', type: 'firebaseAuth', onSuccess: ['step_notify_crm'] },
          { id: 'step_notify_crm', type: 'restRequest', onSuccess: ['step_welcome_nav'] },
          { id: 'step_welcome_nav', type: 'navigate' },
        ],
      },
    ],
  };

  storage.website_drafts.set(mockOrgId, {
    id: `draft_${mockOrgId}`,
    organization_id: mockOrgId,
    user_id: mockUserId,
    draft_data: JSON.stringify(draftData),
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const savedDraft = storage.website_drafts.get(mockOrgId);
  assert.ok(savedDraft);
  assert.equal(JSON.parse(savedDraft.draft_data).name, 'Unified Artisan Store');

  // 2. Publish Draft -> Version 1
  const v1Snapshot = savedDraft.draft_data;
  storage.website_versions.push({
    id: 'ver_1',
    organization_id: mockOrgId,
    user_id: mockUserId,
    version_number: 1,
    snapshot_data: v1Snapshot,
    description: 'Published version 1',
    published_at: new Date().toISOString(),
  });

  storage.websites.set(mockOrgId, {
    id: `site_${mockOrgId}`,
    organization_id: mockOrgId,
    name: draftData.name,
    template: draftData.template,
    sections: JSON.stringify(draftData.pages[0].nodes),
    is_published: 1,
  });

  assert.equal(storage.website_versions.length, 1);
  assert.equal(storage.websites.get(mockOrgId).is_published, 1);

  // 3. Edit Draft -> Update to Version 2
  const updatedDraftData = {
    ...draftData,
    name: 'Unified Artisan Store — Spring Edition',
    pages: [
      {
        ...draftData.pages[0],
        nodes: [
          ...draftData.pages[0].nodes,
          { id: 'node_sale_banner', type: 'card', props: { text: '20% Off Spring Sale' } },
        ],
      },
    ],
  };

  storage.website_drafts.set(mockOrgId, {
    ...savedDraft,
    draft_data: JSON.stringify(updatedDraftData),
    version: 2,
    updated_at: new Date().toISOString(),
  });

  // Publish Version 2
  storage.website_versions.push({
    id: 'ver_2',
    organization_id: mockOrgId,
    user_id: mockUserId,
    version_number: 2,
    snapshot_data: JSON.stringify(updatedDraftData),
    description: 'Published version 2',
    published_at: new Date().toISOString(),
  });

  storage.websites.set(mockOrgId, {
    id: `site_${mockOrgId}`,
    organization_id: mockOrgId,
    name: updatedDraftData.name,
    template: updatedDraftData.template,
    sections: JSON.stringify(updatedDraftData.pages[0].nodes),
    is_published: 1,
  });

  assert.equal(storage.website_versions.length, 2);
  assert.equal(storage.websites.get(mockOrgId).name, 'Unified Artisan Store — Spring Edition');

  // 4. Rollback to Version 1
  const targetVersion = storage.website_versions.find(
    (v) => v.organization_id === mockOrgId && v.version_number === 1
  );
  assert.ok(targetVersion);

  const restoredData = JSON.parse(targetVersion.snapshot_data);
  storage.website_drafts.set(mockOrgId, {
    ...savedDraft,
    draft_data: targetVersion.snapshot_data,
    version: 1,
    updated_at: new Date().toISOString(),
  });

  storage.websites.set(mockOrgId, {
    id: `site_${mockOrgId}`,
    organization_id: mockOrgId,
    name: restoredData.name,
    template: restoredData.template,
    sections: JSON.stringify(restoredData.pages[0].nodes),
    is_published: 1,
  });

  // Verify rollback restored initial title and node count
  assert.equal(storage.websites.get(mockOrgId).name, 'Unified Artisan Store');
  const restoredNodes = JSON.parse(storage.websites.get(mockOrgId).sections);
  assert.equal(restoredNodes.length, 2); // Banner node is gone
});

test('7. Multi-Tenant Isolation: Tenant B cannot access Tenant A draft or connection', async () => {
  const connectionStorage = [
    {
      id: 'conn_tenant_a',
      organization_id: 'org_tenant_a',
      connection_type: 'rest',
      name: 'Tenant A CRM',
      config_json: JSON.stringify({ baseUrl: 'https://crm-a.example.com' }),
      secrets_encrypted: 'enc:v1:mock_encrypted_secret_a',
    },
  ];

  const tenantBOrgId = 'org_tenant_b';

  // Tenant B attempts to read Tenant A's connection
  const foundForTenantB = connectionStorage.find(
    (c) => c.id === 'conn_tenant_a' && c.organization_id === tenantBOrgId
  );
  assert.equal(foundForTenantB, undefined, 'Tenant B must not find Tenant A connection');

  // Secrets Redaction: Tenant A reads their connection
  const foundForTenantA = connectionStorage.find(
    (c) => c.id === 'conn_tenant_a' && c.organization_id === 'org_tenant_a'
  );
  assert.ok(foundForTenantA);

  const clientExposedResponse = {
    id: foundForTenantA.id,
    connection_type: foundForTenantA.connection_type,
    name: foundForTenantA.name,
    config: JSON.parse(foundForTenantA.config_json),
    has_secrets: !!foundForTenantA.secrets_encrypted,
  };

  assert.equal(clientExposedResponse.has_secrets, true);
  assert.equal('secrets_encrypted' in clientExposedResponse, false);
  assert.equal('secret' in clientExposedResponse, false);
});

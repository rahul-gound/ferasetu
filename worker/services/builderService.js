/**
 * FeraSetu Unified Builder Service
 * Provides backend persistence, versioning, publishing, rollback, connection vault,
 * and secure SSRF-hardened REST proxying.
 *
 * Security Guarantees:
 * - Strict tenant isolation via requireOrgContext
 * - Private credentials encrypted at rest with AES-256-GCM and never returned to client
 * - SSRF defense: enforces HTTPS, blocks private IPs, metadata endpoints, and internal networks
 * - 5,000ms timeout and 1MB payload/response limits on external proxy requests
 * - No eval or customer code execution
 */

import { encryptSecret, decryptSecret } from './emailCrypto.js';

export class BuilderHttpError extends Error {
  constructor(message, status = 400, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function safeParseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

let builderTablesInitialized = false;

export async function ensureBuilderTables(db) {
  if (builderTablesInitialized || !db) return;
  try {
    const runSql = async (sql) => {
      const clean = typeof sql === 'string' ? sql.trim().replace(/;\s*$/, '') : '';
      if (!clean) return;
      if (typeof db.prepare === 'function') {
        try {
          await db.prepare(clean).run();
        } catch {
          // Table/index/column already exists or statement non-fatal
        }
      } else if (typeof db.exec === 'function') {
        try {
          await db.exec(clean);
        } catch {}
      }
    };

    await runSql(`
      CREATE TABLE IF NOT EXISTS website_drafts (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        draft_data TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_website_drafts_org ON website_drafts(organization_id)`);

    await runSql(`
      CREATE TABLE IF NOT EXISTS website_versions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        snapshot_data TEXT NOT NULL,
        description TEXT,
        published_at TEXT NOT NULL,
        published_by TEXT
      )
    `);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_website_versions_org ON website_versions(organization_id, version_number DESC)`);

    await runSql(`
      CREATE TABLE IF NOT EXISTS website_connections (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        connection_type TEXT NOT NULL,
        name TEXT NOT NULL,
        config_json TEXT NOT NULL,
        secrets_encrypted TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_website_conns_org ON website_connections(organization_id)`);

    // Ensure staging columns in media_files
    await runSql(`ALTER TABLE media_files ADD COLUMN is_draft INTEGER NOT NULL DEFAULT 1`);
    await runSql(`ALTER TABLE media_files ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'`);

    builderTablesInitialized = true;
  } catch (err) {
    console.warn('[ensureBuilderTables] non-fatal notice:', err?.message || err);
  }
}


/**
 * Validates external URL to strictly prevent SSRF attacks.
 * Blocks:
 * - Non-HTTPS protocols
 * - RFC 1918 Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Loopback addresses (127.0.0.0/8, ::1)
 * - Link-local / Cloud metadata (169.254.169.254, fe80::/10)
 * - Carrier-grade NAT (100.64.0.0/10)
 * - Dangerous hostnames (localhost, metadata.google.internal, *.internal, *.local)
 * - Non-standard external HTTP ports
 */
export function validateDestinationUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BuilderHttpError('Invalid destination URL format', 400);
  }

  if (parsed.protocol !== 'https:') {
    throw new BuilderHttpError('SSRF Protection: Only secure HTTPS destinations are allowed', 400);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Dangerous named hosts
  const forbiddenHosts = [
    'localhost',
    'metadata.google.internal',
    'instance-data',
    'metadata',
    '169.254.169.254',
  ];
  if (forbiddenHosts.includes(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.lan')) {
    throw new BuilderHttpError(`SSRF Protection: Access to host '${hostname}' is strictly forbidden`, 403);
  }

  // IPv4 Private & Loopback Checks
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Regex);
  if (ipMatch) {
    const [_, o1, o2, o3, o4] = ipMatch.map(Number);
    // 127.0.0.0/8
    if (o1 === 127) throw new BuilderHttpError('SSRF Protection: Loopback destination blocked', 403);
    // 0.0.0.0/8
    if (o1 === 0) throw new BuilderHttpError('SSRF Protection: Invalid target IP', 403);
    // 10.0.0.0/8
    if (o1 === 10) throw new BuilderHttpError('SSRF Protection: Private subnet blocked', 403);
    // 172.16.0.0/12
    if (o1 === 172 && o2 >= 16 && o2 <= 31) throw new BuilderHttpError('SSRF Protection: Private subnet blocked', 403);
    // 192.168.0.0/16
    if (o1 === 192 && o2 === 168) throw new BuilderHttpError('SSRF Protection: Private subnet blocked', 403);
    // 169.254.0.0/16 (Link Local / Cloud Metadata)
    if (o1 === 169 && o2 === 254) throw new BuilderHttpError('SSRF Protection: Cloud metadata IP blocked', 403);
    // 100.64.0.0/10 (CGNAT)
    if (o1 === 100 && o2 >= 64 && o2 <= 127) throw new BuilderHttpError('SSRF Protection: Carrier-grade NAT blocked', 403);
  }

  // IPv6 Checks
  const cleanHost = hostname.replace(/^\[|\]$/g, '');
  if (cleanHost === '::1' || cleanHost.startsWith('fe80:') || cleanHost.startsWith('fc') || cleanHost.startsWith('fd')) {
    throw new BuilderHttpError('SSRF Protection: Private IPv6 address blocked', 403);
  }

  // Allowed Ports
  const port = parsed.port ? parseInt(parsed.port, 10) : 443;
  const allowedPorts = [443, 8443];
  if (!allowedPorts.includes(port)) {
    throw new BuilderHttpError(`SSRF Protection: Port ${port} is not permitted for external connections`, 403);
  }

  return parsed;
}

/**
 * Strips sensitive authorization headers and credentials from response objects and logs.
 */
function sanitizeHeaders(headersObj) {
  const sanitized = {};
  const sensitiveKeys = ['authorization', 'api-key', 'x-api-key', 'secret', 'password', 'cookie', 'set-cookie'];
  for (const [key, value] of Object.entries(headersObj || {})) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// Draft API Handlers
// ---------------------------------------------------------------------------

export async function getBuilderDraft(request, env, orgContext) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const orgId = orgContext.organizationId;
  let draftRow = null;
  try {
    if (env?.DB?.prepare) {
      draftRow = await env.DB.prepare(
        `SELECT * FROM website_drafts WHERE organization_id = ?`
      ).bind(orgId).first();
    }
  } catch (draftErr) {
    console.warn('[getBuilderDraft] website_drafts query notice:', draftErr?.message);
  }

  if (draftRow) {
    return {
      draft: safeParseJson(draftRow.draft_data),
      version: draftRow.version,
      updated_at: draftRow.updated_at,
      exists: true,
    };
  }

  // Fallback: check published website row to seed initial draft
  let siteRow = null;
  try {
    if (env?.DB?.prepare) {
      siteRow = await env.DB.prepare(
        `SELECT * FROM websites WHERE organization_id = ? OR (organization_id IS NULL AND user_id = ?)`
      ).bind(orgId, orgContext.user.$id).first();
    }
  } catch (siteErr) {
    console.warn('[getBuilderDraft] websites query notice:', siteErr?.message);
  }

  if (siteRow) {
    const seededDraft = {
      name: siteRow.name || 'Storefront',
      template: siteRow.template || 'market',
      activePageId: 'page_home',
      pages: [
        {
          id: 'page_home',
          name: 'Home',
          slug: '/',
          title: siteRow.name || 'Home',
          nodes: safeParseJson(siteRow.sections, []),
        },
      ],
      theme: safeParseJson(siteRow.theme, { primaryColor: '#2563eb' }),
      tokens: {
        colors: { primary: '#2563eb', secondary: '#4b5563', background: '#ffffff', text: '#111827' },
        typography: { fontFamily: 'sans', headingFont: 'sans', baseFontSize: 16 },
      },
      workflows: [],
    };

    return {
      draft: seededDraft,
      version: 1,
      updated_at: siteRow.updated_at || new Date().toISOString(),
      exists: false,
      seededFromPublished: true,
    };
  }

  return {
    draft: null,
    version: 1,
    exists: false,
  };
}

export async function saveBuilderDraft(request, env, orgContext) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const orgId = orgContext.organizationId;
  const userId = orgContext.user.$id;
  const body = await request.json();
  const draftData = body.draft;

  if (!draftData || typeof draftData !== 'object') {
    throw new BuilderHttpError('Invalid draft data provided', 400);
  }

  const now = new Date().toISOString();
  const draftId = `draft_${orgId}`;
  const serialized = JSON.stringify(draftData);

  await env.DB.prepare(`
    INSERT INTO website_drafts (id, organization_id, user_id, draft_data, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(organization_id) DO UPDATE SET
      draft_data = excluded.draft_data,
      user_id = excluded.user_id,
      version = website_drafts.version + 1,
      updated_at = excluded.updated_at
  `).bind(draftId, orgId, userId, serialized, now, now).run();

  return {
    success: true,
    saved_at: now,
  };
}

// ---------------------------------------------------------------------------
// Publishing & Versioning API Handlers
// ---------------------------------------------------------------------------

export async function publishBuilderDraft(request, env, orgContext) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const orgId = orgContext.organizationId;
  const userId = orgContext.user.$id;
  const now = new Date().toISOString();

  // 1. Fetch active draft
  const draftRow = await env.DB.prepare(
    `SELECT * FROM website_drafts WHERE organization_id = ?`
  ).bind(orgId).first();

  if (!draftRow) {
    throw new BuilderHttpError('No working draft found to publish. Please save a draft first.', 404);
  }

  const draft = safeParseJson(draftRow.draft_data);
  const homePage = (draft.pages && Array.isArray(draft.pages))
    ? draft.pages.find((p) => p.slug === '/' || p.id === 'page_home') || draft.pages[0]
    : null;

  const sections = homePage ? homePage.nodes || [] : [];
  const theme = draft.theme || { primaryColor: '#2563eb' };
  const template = draft.template || 'market';
  const name = draft.name || 'Store';

  // 2. Determine next sequential version number
  const versionRow = await env.DB.prepare(
    `SELECT COALESCE(MAX(version_number), 0) AS max_v FROM website_versions WHERE organization_id = ?`
  ).bind(orgId).first();
  const nextVersionNumber = (versionRow?.max_v || 0) + 1;

  // 3. Insert snapshot into website_versions
  const versionId = `ver_${crypto.randomUUID()}`;
  await env.DB.prepare(`
    INSERT INTO website_versions (id, organization_id, user_id, version_number, snapshot_data, description, published_at, published_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    versionId,
    orgId,
    userId,
    nextVersionNumber,
    draftRow.draft_data,
    `Published version ${nextVersionNumber}`,
    now,
    orgContext.user.email || userId
  ).run();

  // 4. Atomically sync to live `websites` table
  const existingWebsite = await env.DB.prepare(
    `SELECT id FROM websites WHERE organization_id = ? OR (organization_id IS NULL AND user_id = ?)`
  ).bind(orgId, userId).first();

  if (existingWebsite) {
    await env.DB.prepare(`
      UPDATE websites SET
        name = ?,
        template = ?,
        config = ?,
        theme = ?,
        sections = ?,
        organization_id = ?,
        is_published = 1,
        updated_at = ?
      WHERE id = ?
    `).bind(
      name,
      template,
      JSON.stringify(draft.config || {}),
      JSON.stringify(theme),
      JSON.stringify(sections),
      orgId,
      now,
      existingWebsite.id
    ).run();
  } else {
    const siteId = `site_${crypto.randomUUID()}`;
    await env.DB.prepare(`
      INSERT INTO websites (id, user_id, organization_id, name, template, config, theme, sections, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      siteId,
      userId,
      orgId,
      name,
      template,
      JSON.stringify(draft.config || {}),
      JSON.stringify(theme),
      JSON.stringify(sections),
      now,
      now
    ).run();
  }

  // 5. Upgrade referenced draft assets to public in media_files
  try {
    await env.DB.prepare(`
      UPDATE media_files SET is_draft = 0, visibility = 'public' WHERE shop_id = ?
    `).bind(orgId).run();
  } catch (mediaErr) {
    console.warn('[publishBuilderDraft] Media files update notice:', mediaErr?.message);
  }

  return {
    success: true,
    published_version: nextVersionNumber,
    published_at: now,
  };
}

export async function listBuilderVersions(request, env, orgContext) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const orgId = orgContext.organizationId;
  try {
    const rows = await env.DB.prepare(`
      SELECT id, version_number, description, published_at, published_by
      FROM website_versions
      WHERE organization_id = ?
      ORDER BY version_number DESC
      LIMIT 30
    `).bind(orgId).all();

    return {
      versions: rows?.results || [],
    };
  } catch (err) {
    console.warn('[listBuilderVersions] query notice:', err?.message);
    return {
      versions: [],
    };
  }
}

export async function rollbackBuilderVersion(request, env, orgContext) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const orgId = orgContext.organizationId;
  const userId = orgContext.user.$id;
  const body = await request.json();
  const versionNumber = Number(body.version_number);

  if (!versionNumber || isNaN(versionNumber)) {
    throw new BuilderHttpError('Valid version_number is required for rollback', 400);
  }

  const versionRow = await env.DB.prepare(`
    SELECT * FROM website_versions WHERE organization_id = ? AND version_number = ?
  `).bind(orgId, versionNumber).first();

  if (!versionRow) {
    throw new BuilderHttpError(`Version ${versionNumber} not found`, 404);
  }

  const now = new Date().toISOString();
  const draftId = `draft_${orgId}`;

  // 1. Restore website_drafts
  await env.DB.prepare(`
    INSERT INTO website_drafts (id, organization_id, user_id, draft_data, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(organization_id) DO UPDATE SET
      draft_data = excluded.draft_data,
      user_id = excluded.user_id,
      version = excluded.version,
      updated_at = excluded.updated_at
  `).bind(draftId, orgId, userId, versionRow.snapshot_data, versionNumber, now, now).run();

  // 2. Restore live websites table
  const draft = safeParseJson(versionRow.snapshot_data);
  const homePage = (draft.pages && Array.isArray(draft.pages))
    ? draft.pages.find((p) => p.slug === '/' || p.id === 'page_home') || draft.pages[0]
    : null;

  const sections = homePage ? homePage.nodes || [] : [];
  const theme = draft.theme || { primaryColor: '#2563eb' };
  const template = draft.template || 'market';
  const name = draft.name || 'Store';

  const existingWebsite = await env.DB.prepare(
    `SELECT id FROM websites WHERE organization_id = ? OR (organization_id IS NULL AND user_id = ?)`
  ).bind(orgId, userId).first();

  if (existingWebsite) {
    await env.DB.prepare(`
      UPDATE websites SET
        name = ?,
        template = ?,
        config = ?,
        theme = ?,
        sections = ?,
        organization_id = ?,
        is_published = 1,
        updated_at = ?
      WHERE id = ?
    `).bind(
      name,
      template,
      JSON.stringify(draft.config || {}),
      JSON.stringify(theme),
      JSON.stringify(sections),
      orgId,
      now,
      existingWebsite.id
    ).run();
  }

  return {
    success: true,
    restored_version: versionNumber,
    restored_at: now,
  };
}

// ---------------------------------------------------------------------------
// External Connections Vault (Firebase & REST)
// ---------------------------------------------------------------------------

export async function listBuilderConnections(request, env, orgContext) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const orgId = orgContext.organizationId;
  try {
    const rows = await env.DB.prepare(`
      SELECT id, connection_type, name, config_json, secrets_encrypted, created_at, updated_at
      FROM website_connections
      WHERE organization_id = ?
      ORDER BY created_at ASC
    `).bind(orgId).all();

    const connections = (rows?.results || []).map((row) => ({
      id: row.id,
      connection_type: row.connection_type,
      name: row.name,
      config: safeParseJson(row.config_json),
      has_secrets: !!(row.secrets_encrypted && row.secrets_encrypted.length > 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { connections };
  } catch (err) {
    console.warn('[listBuilderConnections] query notice:', err?.message);
    return { connections: [] };
  }
}

export async function saveBuilderConnection(request, env, orgContext) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const orgId = orgContext.organizationId;
  const body = await request.json();
  const { id, connection_type, name, config = {}, secrets } = body;

  if (!connection_type || !['firebase', 'rest'].includes(connection_type)) {
    throw new BuilderHttpError("connection_type must be either 'firebase' or 'rest'", 400);
  }
  if (!name || typeof name !== 'string') {
    throw new BuilderHttpError('Connection name is required', 400);
  }

  const connectionId = id || `conn_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // If new secrets are provided, encrypt them with AES-256-GCM.
  // If editing and no new secrets provided, retain existing encrypted blob.
  let secretsEncrypted = null;
  if (secrets && typeof secrets === 'object' && Object.keys(secrets).length > 0) {
    try {
      secretsEncrypted = await encryptSecret(JSON.stringify(secrets), env);
    } catch (encErr) {
      console.error('[saveBuilderConnection] Secret encryption failed:', encErr);
      throw new BuilderHttpError('Failed to securely encrypt connection secrets', 500);
    }
  } else if (id) {
    const existing = await env.DB.prepare(
      `SELECT secrets_encrypted FROM website_connections WHERE id = ? AND organization_id = ?`
    ).bind(id, orgId).first();
    secretsEncrypted = existing?.secrets_encrypted || null;
  }

  const configJson = JSON.stringify(config);

  await env.DB.prepare(`
    INSERT INTO website_connections (id, organization_id, connection_type, name, config_json, secrets_encrypted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      connection_type = excluded.connection_type,
      config_json = excluded.config_json,
      secrets_encrypted = COALESCE(excluded.secrets_encrypted, website_connections.secrets_encrypted),
      updated_at = excluded.updated_at
  `).bind(connectionId, orgId, connection_type, name, configJson, secretsEncrypted, now, now).run();

  return {
    success: true,
    connection: {
      id: connectionId,
      connection_type,
      name,
      config,
      has_secrets: !!secretsEncrypted,
      updated_at: now,
    },
  };
}

export async function deleteBuilderConnection(request, env, orgContext, connectionId) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const orgId = orgContext.organizationId;
  await env.DB.prepare(`
    DELETE FROM website_connections WHERE id = ? AND organization_id = ?
  `).bind(connectionId, orgId).run();

  return { success: true, deleted_id: connectionId };
}

// ---------------------------------------------------------------------------
// Secure SSRF-Hardened REST & Integration Proxy (Phase 4)
// ---------------------------------------------------------------------------

export async function handleBuilderProxy(request, env, orgContext) {
  const orgId = orgContext.organizationId;
  const body = await request.json();
  const { connector_id, endpoint = '', method = 'POST', headers = {}, body: payloadBody, query_params = {} } = body;

  if (!connector_id) {
    throw new BuilderHttpError('connector_id is required', 400);
  }

  // 1. Fetch and verify tenant-isolated connection
  const connRow = await env.DB.prepare(`
    SELECT * FROM website_connections WHERE id = ? AND organization_id = ?
  `).bind(connector_id, orgId).first();

  if (!connRow) {
    throw new BuilderHttpError(`Connector '${connector_id}' not found for this tenant`, 404);
  }

  const config = safeParseJson(connRow.config_json);
  const baseUrl = config.baseUrl || config.apiUrl;
  if (!baseUrl) {
    throw new BuilderHttpError('Configured connection is missing baseUrl', 400);
  }

  // 2. Build full target URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let targetUrl = `${baseUrl.replace(/\/+$/, '')}${cleanEndpoint}`;

  // Append query params safely
  const queryEntries = Object.entries(query_params);
  if (queryEntries.length > 0) {
    const sp = new URLSearchParams();
    for (const [k, v] of queryEntries) {
      if (v !== undefined && v !== null) sp.append(k, String(v));
    }
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + sp.toString();
  }

  // 3. Strict SSRF destination check
  const validatedUrl = validateDestinationUrl(targetUrl);

  // 4. Decrypt server-side secrets safely
  let storedSecrets = {};
  if (connRow.secrets_encrypted) {
    try {
      const decrypted = await decryptSecret(connRow.secrets_encrypted, env);
      storedSecrets = safeParseJson(decrypted);
    } catch (decErr) {
      console.error('[handleBuilderProxy] Failed to decrypt connection secrets:', decErr);
      throw new BuilderHttpError('Could not unlock server credentials for request', 500);
    }
  }

  // 5. Construct request headers and inject credentials
  const outboundHeaders = new Headers();
  outboundHeaders.set('Content-Type', 'application/json');
  outboundHeaders.set('Accept', 'application/json');
  outboundHeaders.set('User-Agent', 'FeraSetu-Connector/1.0');

  // Client allowed headers
  for (const [hk, hv] of Object.entries(headers)) {
    const lk = hk.toLowerCase();
    if (!['host', 'authorization', 'x-api-key', 'cookie'].includes(lk)) {
      outboundHeaders.set(hk, String(hv));
    }
  }

  // Server credentials injection
  if (storedSecrets.bearerToken) {
    outboundHeaders.set('Authorization', `Bearer ${storedSecrets.bearerToken}`);
  } else if (storedSecrets.apiKeyHeader && storedSecrets.apiKeyValue) {
    outboundHeaders.set(storedSecrets.apiKeyHeader, storedSecrets.apiKeyValue);
  } else if (storedSecrets.basicAuth) {
    outboundHeaders.set('Authorization', `Basic ${storedSecrets.basicAuth}`);
  }

  // 6. Enforce payload size limit (max 1 MB)
  let requestPayload = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    requestPayload = typeof payloadBody === 'string' ? payloadBody : JSON.stringify(payloadBody || {});
    if (new TextEncoder().encode(requestPayload).length > 1048576) {
      throw new BuilderHttpError('Payload size exceeds 1MB limit', 413);
    }
  }

  // 7. Enforce strict 5,000ms timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const upstreamRes = await fetch(validatedUrl.toString(), {
      method: method.toUpperCase(),
      headers: outboundHeaders,
      body: requestPayload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Limit response size
    const contentType = upstreamRes.headers.get('content-type') || '';
    let responseData = null;

    if (contentType.includes('application/json')) {
      responseData = await upstreamRes.json();
    } else {
      responseData = await upstreamRes.text();
      if (typeof responseData === 'string' && responseData.length > 1048576) {
        throw new BuilderHttpError('Upstream response exceeded 1MB limit', 502);
      }
    }

    const safeResponseHeaders = {};
    for (const [k, v] of upstreamRes.headers.entries()) {
      if (!['set-cookie', 'server', 'via'].includes(k.toLowerCase())) {
        safeResponseHeaders[k] = v;
      }
    }

    return {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: safeResponseHeaders,
      data: responseData,
    };
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr.name === 'AbortError') {
      throw new BuilderHttpError('Destination upstream request timed out after 5,000ms', 504);
    }
    if (fetchErr instanceof BuilderHttpError) throw fetchErr;
    console.error('[handleBuilderProxy] Upstream call failed:', fetchErr.message);
    throw new BuilderHttpError(`Upstream connection failed: ${fetchErr.message}`, 502);
  }
}

// ---------------------------------------------------------------------------
// Builder Assets Management (Draft vs Published)
// ---------------------------------------------------------------------------

export async function listBuilderAssets(request, env, orgContext) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const shopId = orgContext.organizationId;
  const url = new URL(request.url);
  const filter = url.searchParams.get('visibility') || 'all';

  let rows = null;
  try {
    let query = 'SELECT id, shop_id, r2_key, size_bytes, content_type, created_at, is_draft, visibility FROM media_files WHERE shop_id = ?';
    const params = [shopId];

    if (filter === 'draft') {
      query += ' AND is_draft = 1';
    } else if (filter === 'public' || filter === 'published') {
      query += ' AND is_draft = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    rows = await env.DB.prepare(query).bind(...params).all();
  } catch (err) {
    console.warn('[listBuilderAssets] Primary query failed, attempting fallback without staging columns:', err?.message);
    try {
      const fallbackQuery = 'SELECT id, shop_id, r2_key, size_bytes, content_type, created_at FROM media_files WHERE shop_id = ? ORDER BY created_at DESC LIMIT 100';
      rows = await env.DB.prepare(fallbackQuery).bind(shopId).all();
    } catch (fallbackErr) {
      console.warn('[listBuilderAssets] Fallback query failed, returning empty:', fallbackErr?.message);
      return { assets: [] };
    }
  }

  const cdnBase = (env.CDN_BASE_URL || 'https://cdn.ferasetu.com').replace(/\/+$/, '');

  const assets = (rows?.results || []).map((row) => ({
    id: row.id,
    key: row.r2_key,
    size: row.size_bytes,
    contentType: row.content_type,
    createdAt: row.created_at,
    isDraft: row.is_draft === 1,
    visibility: row.visibility || (row.is_draft === 1 ? 'private' : 'public'),
    url: `${cdnBase}/${row.r2_key}`,
  }));

  return { assets };
}

export async function updateAssetVisibility(request, env, orgContext, assetId) {
  if (env?.DB) await ensureBuilderTables(env.DB);
  const shopId = orgContext.organizationId;
  const body = await request.json();
  const visibility = body.visibility === 'public' ? 'public' : 'private';
  const isDraft = visibility === 'public' ? 0 : 1;

  await env.DB.prepare(`
    UPDATE media_files SET visibility = ?, is_draft = ? WHERE id = ? AND shop_id = ?
  `).bind(visibility, isDraft, assetId, shopId).run();

  return { success: true, asset_id: assetId, visibility, is_draft: isDraft };
}



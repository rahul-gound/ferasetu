// FeraSetu Pro Data & Storage — Service Layer
// =============================================================================
// Authoritative domain operations for data sources, background backup workflows,
// restore safeguards, export pipelines, retention lifecycles, and scheduled backups.
// Strictly tenant-isolated and quota-governed.
// =============================================================================

import {
  encryptCredentials,
  decryptCredentials,
  maskDataSourceMetadata,
} from '../pro/credentialEnvelope.js';
import { createProviderAdapter } from '../pro/dataStorageAdapters.js';
import {
  runBackupWorkflow,
  BACKUP_STATES,
  evaluateObjectLockRetention,
} from '../pro/backupEngine.js';
import {
  runRestoreWorkflow,
  analyzeRestoreConflicts,
  validateDestructiveConfirmation,
  RESTORE_MODES,
} from '../pro/restoreEngine.js';
import { runExportWorkflow } from '../pro/exportEngine.js';
import { getProB2Client } from './proPlatformService.js';

export class DataStorageError extends Error {
  constructor(message, code = 'DATA_STORAGE_ERROR', status = 400) {
    super(message);
    this.name = 'DataStorageError';
    this.code = code;
    this.status = status;
  }
}

// -----------------------------------------------------------------------------
// Data Sources Management
// -----------------------------------------------------------------------------

export async function testDataSourceConnection(tenantId, payload, env) {
  const { type, provider, connectionStrategy, credentials, options } = payload;
  const adapter = createProviderAdapter(type, provider, connectionStrategy, credentials, options);
  const testResult = await adapter.testConnection();
  const capabilities = adapter.getCapabilities();

  return {
    success: true,
    connected: true,
    provider,
    type,
    connectionStrategy: adapter.strategy,
    capabilities,
    details: testResult,
    maskedMetadata: maskDataSourceMetadata(credentials, provider),
  };
}

export async function createDataSource(tenantId, payload, env) {
  if (!env?.DB) throw new DataStorageError('Database service unavailable', 'DB_UNAVAILABLE', 500);

  const { name, type, provider, connectionStrategy = 'direct_tcp', credentials, policy = {} } = payload;

  if (!name || !type || !provider || !credentials) {
    throw new DataStorageError('Missing required fields (name, type, provider, credentials)');
  }

  // 1. Quota Check: Max Data Sources (e.g. 5 on Pro)
  const countRes = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM site_data_sources WHERE tenant_id = ?'
  ).bind(tenantId).first();

  if (countRes && countRes.count >= 10) {
    throw new DataStorageError('Data source quota exceeded. Upgrade plan to connect more sources.', 'QUOTA_EXCEEDED', 403);
  }

  // 2. Test Connection before saving
  const adapter = createProviderAdapter(type, provider, connectionStrategy, credentials, payload.options);
  await adapter.testConnection();
  const capabilities = adapter.getCapabilities();

  // 3. Encrypt credentials envelope (Server-side AES-256-GCM + HKDF)
  const encryptedEnvelope = await encryptCredentials(credentials, env);
  const credId = `cred_${Math.random().toString(36).slice(2, 14)}`;

  await env.DB.prepare(`
    INSERT INTO site_data_source_credentials (id, tenant_id, key_version, envelope_version, encrypted_envelope, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    credId, tenantId, encryptedEnvelope.key_version, encryptedEnvelope.envelope_version,
    JSON.stringify(encryptedEnvelope), new Date().toISOString(), new Date().toISOString()
  ).run();

  // 4. Persist Data Source with safe masked metadata
  const sourceId = `ds_${Math.random().toString(36).slice(2, 14)}`;
  const maskedMeta = maskDataSourceMetadata(credentials, provider);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO site_data_sources (id, tenant_id, type, provider, name, connection_strategy, status, credential_reference, capabilities, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'connected', ?, ?, ?, ?, ?)
  `).bind(
    sourceId, tenantId, type, provider, name.trim(), connectionStrategy,
    credId, JSON.stringify(capabilities), JSON.stringify(maskedMeta), now, now
  ).run();

  // 5. Create default backup policy
  const policyId = `pol_${Math.random().toString(36).slice(2, 14)}`;
  await env.DB.prepare(`
    INSERT INTO site_backup_policies (id, tenant_id, data_source_id, schedule, retention_days, enable_object_lock, selected_tables, selected_prefixes, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    policyId, tenantId, sourceId, policy.schedule || 'manual',
    policy.retention_days || 30, policy.enable_object_lock ? 1 : 0,
    JSON.stringify(policy.selected_tables || []), JSON.stringify(policy.selected_prefixes || []),
    now, now
  ).run();

  return {
    id: sourceId,
    tenant_id: tenantId,
    type,
    provider,
    name: name.trim(),
    connection_strategy: connectionStrategy,
    status: 'connected',
    capabilities,
    metadata: maskedMeta,
    policy: {
      schedule: policy.schedule || 'manual',
      retention_days: policy.retention_days || 30,
      enable_object_lock: Boolean(policy.enable_object_lock),
    },
    created_at: now,
  };
}

export async function listDataSources(tenantId, env) {
  if (!env?.DB) return [];

  const sourcesRes = await env.DB.prepare(`
    SELECT s.*, p.schedule, p.retention_days, p.enable_object_lock, p.selected_tables, p.selected_prefixes, p.last_run_at, p.next_run_at
    FROM site_data_sources s
    LEFT JOIN site_backup_policies p ON p.data_source_id = s.id
    WHERE s.tenant_id = ?
    ORDER BY s.created_at DESC
  `).bind(tenantId).all();

  return (sourcesRes.results || []).map(r => ({
    ...r,
    capabilities: typeof r.capabilities === 'string' ? JSON.parse(r.capabilities || '{}') : r.capabilities,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : r.metadata,
    policy: {
      schedule: r.schedule || 'manual',
      retention_days: r.retention_days || 30,
      enable_object_lock: Boolean(r.enable_object_lock),
      selected_tables: typeof r.selected_tables === 'string' ? JSON.parse(r.selected_tables || '[]') : (r.selected_tables || []),
      selected_prefixes: typeof r.selected_prefixes === 'string' ? JSON.parse(r.selected_prefixes || '[]') : (r.selected_prefixes || []),
      last_run_at: r.last_run_at,
      next_run_at: r.next_run_at,
    },
  }));
}

export async function getDataSource(tenantId, id, env) {
  if (!env?.DB) return null;

  const source = await env.DB.prepare(`
    SELECT s.*, p.schedule, p.retention_days, p.enable_object_lock, p.selected_tables, p.selected_prefixes, p.last_run_at, p.next_run_at
    FROM site_data_sources s
    LEFT JOIN site_backup_policies p ON p.data_source_id = s.id
    WHERE s.tenant_id = ? AND s.id = ?
  `).bind(tenantId, id).first();

  if (!source) return null;

  return {
    ...source,
    capabilities: typeof source.capabilities === 'string' ? JSON.parse(source.capabilities || '{}') : source.capabilities,
    metadata: typeof source.metadata === 'string' ? JSON.parse(source.metadata || '{}') : source.metadata,
    policy: {
      schedule: source.schedule || 'manual',
      retention_days: source.retention_days || 30,
      enable_object_lock: Boolean(source.enable_object_lock),
      selected_tables: typeof source.selected_tables === 'string' ? JSON.parse(source.selected_tables || '[]') : [],
      selected_prefixes: typeof source.selected_prefixes === 'string' ? JSON.parse(source.selected_prefixes || '[]') : [],
    },
  };
}

export async function deleteDataSource(tenantId, id, env) {
  if (!env?.DB) return false;

  const source = await env.DB.prepare('SELECT credential_reference FROM site_data_sources WHERE tenant_id = ? AND id = ?')
    .bind(tenantId, id).first();
  if (!source) return false;

  // Delete credentials envelope
  if (source.credential_reference) {
    await env.DB.prepare('DELETE FROM site_data_source_credentials WHERE id = ?').bind(source.credential_reference).run();
  }
  await env.DB.prepare('DELETE FROM site_backup_policies WHERE data_source_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM site_data_sources WHERE id = ?').bind(id).run();

  return true;
}

export async function inspectDataSource(tenantId, id, env) {
  if (!env?.DB) throw new DataStorageError('Database unavailable', 'DB_UNAVAILABLE', 500);

  const source = await env.DB.prepare('SELECT * FROM site_data_sources WHERE tenant_id = ? AND id = ?')
    .bind(tenantId, id).first();
  if (!source) throw new DataStorageError('Data source not found', 'NOT_FOUND', 404);

  const credRow = await env.DB.prepare('SELECT encrypted_envelope FROM site_data_source_credentials WHERE id = ?')
    .bind(source.credential_reference).first();
  if (!credRow) throw new DataStorageError('Credential envelope not found', 'CREDENTIAL_NOT_FOUND', 404);

  const envelope = JSON.parse(credRow.encrypted_envelope);
  const credentials = await decryptCredentials(envelope, env);

  const adapter = createProviderAdapter(source.type, source.provider, source.connection_strategy, credentials);

  if (source.type === 'database') {
    return await adapter.inspectSchema();
  } else {
    return await adapter.listObjects();
  }
}

// -----------------------------------------------------------------------------
// Backup Workflow Trigger & Execution
// -----------------------------------------------------------------------------

export async function triggerBackup(tenantId, payload, env) {
  if (!env?.DB) throw new DataStorageError('Database unavailable', 'DB_UNAVAILABLE', 500);

  const { dataSourceId, snapshotType = 'manual', idempotencyKey } = payload;
  if (!dataSourceId) throw new DataStorageError('dataSourceId is required');

  // 1. Idempotency Check (Duplicate request returns existing operation even if currently running)
  if (idempotencyKey) {
    const existingOp = await env.DB.prepare(
      'SELECT * FROM site_backup_operations WHERE tenant_id = ? AND idempotency_key = ?'
    ).bind(tenantId, idempotencyKey).first();
    if (existingOp) {
      return {
        operation_id: existingOp.id,
        snapshot_id: existingOp.snapshot_id,
        status: existingOp.status,
        idempotent: true,
      };
    }
  }

  // 2. Concurrency Locking per Data Source
  const runningOp = await env.DB.prepare(`
    SELECT id FROM site_backup_operations
    WHERE tenant_id = ? AND data_source_id = ? AND status IN ('REQUESTED', 'INSPECTING', 'SCANNING', 'EXPORTING', 'UPLOADING', 'COPYING', 'VERIFYING')
  `).bind(tenantId, dataSourceId).first();

  if (runningOp) {
    throw new DataStorageError(
      'Another backup operation is currently in progress for this data source. Please wait for it to complete.',
      'ALREADY_RUNNING',
      409
    );
  }

  // 3. Retrieve Data Source & Decrypt Credentials
  const source = await getDataSource(tenantId, dataSourceId, env);
  if (!source) throw new DataStorageError('Data source not found', 'NOT_FOUND', 404);

  const credRow = await env.DB.prepare('SELECT encrypted_envelope FROM site_data_source_credentials WHERE id = ?')
    .bind(source.credential_reference).first();
  const credentials = await decryptCredentials(JSON.parse(credRow.encrypted_envelope), env);

  const adapter = createProviderAdapter(source.type, source.provider, source.connection_strategy, credentials, payload.options);

  // 4. Create Snapshot and Operation rows
  const snapshotCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM site_backup_snapshots WHERE data_source_id = ?'
  ).bind(dataSourceId).first();
  const snapshotNumber = (snapshotCount?.count || 0) + 1;

  const snapshotId = `snap_${Math.random().toString(36).slice(2, 14)}`;
  const operationId = `op_${Math.random().toString(36).slice(2, 14)}`;
  const b2RootPrefix = `ferasetu-data/${tenantId}/${dataSourceId}/snapshots/${snapshotId}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO site_backup_snapshots (id, tenant_id, data_source_id, snapshot_number, snapshot_type, status, b2_root_prefix, created_at)
    VALUES (?, ?, ?, ?, ?, 'REQUESTED', ?, ?)
  `).bind(snapshotId, tenantId, dataSourceId, snapshotNumber, snapshotType, b2RootPrefix, now).run();

  await env.DB.prepare(`
    INSERT INTO site_backup_operations (id, tenant_id, data_source_id, snapshot_id, operation_type, status, current_step, progress_percent, idempotency_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'backup', 'REQUESTED', 'init', 0, ?, ?, ?)
  `).bind(operationId, tenantId, dataSourceId, snapshotId, idempotencyKey || null, now, now).run();

  // 5. Launch Background Workflow asynchronously
  const workflowPromise = runBackupWorkflow(
    operationId,
    {
      tenantId,
      dataSourceId,
      snapshotId,
      snapshotNumber,
      snapshotType,
      policy: source.policy,
    },
    adapter,
    env
  );

  // In Cloudflare Worker context, if executionContext is available
  if (env?.ctx && typeof env.ctx.waitUntil === 'function') {
    env.ctx.waitUntil(workflowPromise);
  } else {
    workflowPromise.catch(e => console.error('[proDataStorage] background backup error:', e?.message));
  }

  // 6. Return immediate 202 Accepted response with operation ID
  return {
    operation_id: operationId,
    snapshot_id: snapshotId,
    status: 'REQUESTED',
    message: 'Backup operation scheduled. Track progress via operation status endpoint.',
  };
}

export async function getBackupOperation(tenantId, operationId, env) {
  if (!env?.DB) return null;
  return await env.DB.prepare(
    'SELECT * FROM site_backup_operations WHERE tenant_id = ? AND id = ?'
  ).bind(tenantId, operationId).first();
}

export async function listBackups(tenantId, query = {}, env) {
  if (!env?.DB) return [];

  let sql = 'SELECT * FROM site_backup_snapshots WHERE tenant_id = ?';
  const binds = [tenantId];

  if (query.dataSourceId) {
    sql += ' AND data_source_id = ?';
    binds.push(query.dataSourceId);
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';

  const res = await env.DB.prepare(sql).bind(...binds).all();
  return (res.results || []).map(r => ({
    ...r,
    manifest_summary: typeof r.manifest_summary === 'string' ? JSON.parse(r.manifest_summary || '{}') : r.manifest_summary,
  }));
}

export async function getBackup(tenantId, id, env) {
  if (!env?.DB) return null;
  const snap = await env.DB.prepare('SELECT * FROM site_backup_snapshots WHERE tenant_id = ? AND id = ?')
    .bind(tenantId, id).first();
  if (!snap) return null;

  return {
    ...snap,
    manifest_summary: typeof snap.manifest_summary === 'string' ? JSON.parse(snap.manifest_summary || '{}') : snap.manifest_summary,
  };
}

export async function getBackupItems(tenantId, snapshotId, env) {
  if (!env?.DB) return [];
  const res = await env.DB.prepare('SELECT * FROM site_backup_items WHERE snapshot_id = ? ORDER BY source_path ASC')
    .bind(snapshotId).all();
  return res.results || [];
}

// -----------------------------------------------------------------------------
// Restore Safety Workflow
// -----------------------------------------------------------------------------

export async function previewRestore(tenantId, payload, env) {
  const { snapshotId, dataSourceId, mode = 'as_new' } = payload;
  const snapshot = await getBackup(tenantId, snapshotId, env);
  if (!snapshot) throw new DataStorageError('Snapshot not found', 'NOT_FOUND', 404);

  const items = await getBackupItems(tenantId, snapshotId, env);
  const liveSchema = await inspectDataSource(tenantId, dataSourceId, env);

  return analyzeRestoreConflicts(items, liveSchema, mode);
}

export async function executeRestore(tenantId, payload, env) {
  if (!env?.DB) throw new DataStorageError('Database unavailable', 'DB_UNAVAILABLE', 500);

  const { snapshotId, dataSourceId, mode = 'as_new', explicitConfirmation = false, confirmDataSourceName = '', selectedTables = [] } = payload;

  const source = await getDataSource(tenantId, dataSourceId, env);
  if (!source) throw new DataStorageError('Target data source not found', 'NOT_FOUND', 404);

  const snapshot = await getBackup(tenantId, snapshotId, env);
  if (!snapshot) throw new DataStorageError('Snapshot not found', 'NOT_FOUND', 404);

  // Destructive safeguard validation
  if (mode === RESTORE_MODES.REPLACE_EXISTING) {
    validateDestructiveConfirmation({
      mode,
      explicit_confirmation: explicitConfirmation,
      confirm_data_source_name: confirmDataSourceName,
    }, source.name);
  }

  const credRow = await env.DB.prepare('SELECT encrypted_envelope FROM site_data_source_credentials WHERE id = ?')
    .bind(source.credential_reference).first();
  const credentials = await decryptCredentials(JSON.parse(credRow.encrypted_envelope), env);
  const adapter = createProviderAdapter(source.type, source.provider, source.connection_strategy, credentials, payload.options);

  const operationId = `rop_${Math.random().toString(36).slice(2, 14)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO site_restore_operations (id, tenant_id, snapshot_id, data_source_id, mode, status, current_step, progress_percent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'REQUESTED', 'init', 0, ?, ?)
  `).bind(operationId, tenantId, snapshotId, dataSourceId, mode, now, now).run();

  // Helper to trigger verified safety snapshot
  const triggerSafetySnapshotFn = async (tId, dsId, currentEnv) => {
    const backupRes = await triggerBackup(tId, { dataSourceId: dsId, snapshotType: 'safety' }, currentEnv);
    return { success: true, snapshotId: backupRes.snapshot_id };
  };

  const restorePromise = runRestoreWorkflow(
    operationId,
    {
      tenantId,
      dataSourceId,
      dataSourceName: source.name,
      snapshotId,
      mode,
      explicitConfirmation,
      confirmDataSourceName,
      selectedTables,
    },
    adapter,
    triggerSafetySnapshotFn,
    env
  );

  if (env?.ctx && typeof env.ctx.waitUntil === 'function') {
    env.ctx.waitUntil(restorePromise);
  } else {
    restorePromise.catch(e => console.error('[proDataStorage] background restore error:', e?.message));
  }

  return {
    operation_id: operationId,
    status: 'REQUESTED',
    mode,
    message: 'Restore operation scheduled. Safety snapshot and conflict safeguards active.',
  };
}

// -----------------------------------------------------------------------------
// Export Pipeline
// -----------------------------------------------------------------------------

export async function createExport(tenantId, payload, env) {
  if (!env?.DB) throw new DataStorageError('Database unavailable', 'DB_UNAVAILABLE', 500);

  const { snapshotId, dataSourceId, format = 'sql' } = payload;
  const source = await getDataSource(tenantId, dataSourceId, env);
  if (!source) throw new DataStorageError('Data source not found', 'NOT_FOUND', 404);

  const credRow = await env.DB.prepare('SELECT encrypted_envelope FROM site_data_source_credentials WHERE id = ?')
    .bind(source.credential_reference).first();
  const credentials = await decryptCredentials(JSON.parse(credRow.encrypted_envelope), env);
  const adapter = createProviderAdapter(source.type, source.provider, source.connection_strategy, credentials, payload.options);

  const operationId = `eop_${Math.random().toString(36).slice(2, 14)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO site_export_operations (id, tenant_id, snapshot_id, data_source_id, format, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'REQUESTED', ?)
  `).bind(operationId, tenantId, snapshotId, dataSourceId, format, now).run();

  const exportPromise = runExportWorkflow(
    operationId,
    { tenantId, dataSourceId, snapshotId, format },
    adapter,
    env
  );

  if (env?.ctx && typeof env.ctx.waitUntil === 'function') {
    env.ctx.waitUntil(exportPromise);
  } else {
    exportPromise.catch(e => console.error('[proDataStorage] export error:', e?.message));
  }

  return {
    operation_id: operationId,
    status: 'REQUESTED',
    format,
  };
}

export async function getExport(tenantId, operationId, env) {
  if (!env?.DB) return null;
  return await env.DB.prepare('SELECT * FROM site_export_operations WHERE tenant_id = ? AND id = ?')
    .bind(tenantId, operationId).first();
}

// -----------------------------------------------------------------------------
// Retention Cleanup & Scheduled Backups Runner
// -----------------------------------------------------------------------------

export async function cleanupExpiredSnapshots(tenantId, env) {
  if (!env?.DB) return { deletedCount: 0, lockedCount: 0 };

  const expired = await env.DB.prepare(`
    SELECT s.*, p.enable_object_lock
    FROM site_backup_snapshots s
    JOIN site_backup_policies p ON p.data_source_id = s.data_source_id
    WHERE s.tenant_id = ? AND s.status = 'COMMITTED'
    AND datetime(s.created_at, '+' || p.retention_days || ' days') < datetime('now')
  `).bind(tenantId).all();

  let deletedCount = 0;
  let lockedCount = 0;
  const b2Client = getProB2Client(env);

  for (const snap of expired.results || []) {
    // Check B2 Object Lock
    const lockCheck = evaluateObjectLockRetention(snap);
    if (!lockCheck.canDelete) {
      lockedCount++;
      continue;
    }

    // Phase 1: Mark for deletion
    await env.DB.prepare("UPDATE site_backup_snapshots SET status = 'MARKED_FOR_DELETION' WHERE id = ?")
      .bind(snap.id).run();

    // Phase 2: Delete B2 objects
    if (snap.b2_manifest_key && b2Client && b2Client.isConfigured) {
      try {
        await b2Client.deleteObject(snap.b2_manifest_key);
      } catch (delErr) {
        console.warn('[cleanupExpiredSnapshots] B2 delete note:', delErr?.message);
      }
    }

    // Phase 3: Finalize D1
    await env.DB.prepare("UPDATE site_backup_snapshots SET status = 'DELETED' WHERE id = ?")
      .bind(snap.id).run();
    deletedCount++;
  }

  return { deletedCount, lockedCount };
}

export async function runScheduledBackups(env) {
  if (!env?.DB) return { triggeredCount: 0 };

  const policies = await env.DB.prepare(`
    SELECT p.*, s.tenant_id
    FROM site_backup_policies p
    JOIN site_data_sources s ON s.id = p.data_source_id
    WHERE p.is_active = 1 AND p.schedule != 'manual'
    AND (p.next_run_at IS NULL OR datetime(p.next_run_at) <= datetime('now'))
  `).all();

  let triggeredCount = 0;

  for (const pol of policies.results || []) {
    try {
      await triggerBackup(pol.tenant_id, {
        dataSourceId: pol.data_source_id,
        snapshotType: 'scheduled',
      }, env);

      // Compute next_run_at
      const nextRun = new Date();
      if (pol.schedule === 'daily') nextRun.setDate(nextRun.getDate() + 1);
      else if (pol.schedule === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
      else if (pol.schedule === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);

      await env.DB.prepare(`
        UPDATE site_backup_policies
        SET last_run_at = datetime('now'), next_run_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(nextRun.toISOString(), pol.id).run();

      triggeredCount++;
    } catch (err) {
      console.warn(`[runScheduledBackups] failed for policy ${pol.id}:`, err?.message);
    }
  }

  return { triggeredCount };
}

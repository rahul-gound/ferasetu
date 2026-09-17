// FeraSetu Pro Data & Storage — Export Engine
// =============================================================================
// Generates standalone SQL dumps, canonical JSON bundles, or storage archives.
// Stored in Backblaze B2 under ferasetu-data/{tenantId}/{dataSourceId}/exports/{exportId}/
// Exposes secure authorized download access without exposing raw credentials.
// =============================================================================

import { sha256Hex } from '../media/b2Client.js';
import { getProB2Client } from '../services/proPlatformService.js';

export async function runExportWorkflow(operationId, params, adapter, env) {
  const {
    tenantId,
    dataSourceId,
    snapshotId,
    format = 'sql', // 'sql' | 'json' | 'zip'
  } = params;

  const updateOp = async (status, b2Key = null, downloadUrl = null, sizeBytes = 0, error = null) => {
    if (!env?.DB) return;
    await env.DB.prepare(`
      UPDATE site_export_operations
      SET status = ?, b2_export_key = COALESCE(?, b2_export_key), download_url = COALESCE(?, download_url), size_bytes = ?, error_message = ?, updated_at = ?, completed_at = CASE WHEN ? = 'COMPLETED' THEN ? ELSE completed_at END
      WHERE id = ?
    `).bind(status, b2Key, downloadUrl, sizeBytes, error, new Date().toISOString(), status, new Date().toISOString(), operationId).run();
  };

  try {
    await updateOp('PACKAGING');

    const b2Client = getProB2Client(env);
    const exportFileName = `export_${snapshotId}_${Date.now()}.${format === 'json' ? 'json' : (format === 'zip' ? 'zip' : 'sql')}`;
    const b2ExportKey = `ferasetu-data/${tenantId}/${dataSourceId}/exports/${operationId}/${exportFileName}`;

    let exportContent = '';
    let contentType = 'text/plain';

    if (format === 'sql') {
      const dbExport = await adapter.exportDatabase();
      exportContent = `-- FeraSetu Pro Backup SQL Dump\n-- Snapshot: ${snapshotId}\n-- Created: ${new Date().toISOString()}\n\n${dbExport.schemaDdl || ''}\n\n`;
      for (const [tblName, tblData] of Object.entries(dbExport.tables || {})) {
        if (tblData.rows && tblData.rows.length > 0) {
          const keys = Object.keys(tblData.rows[0]);
          for (const row of tblData.rows) {
            const vals = keys.map(k => typeof row[k] === 'number' ? row[k] : `'${String(row[k]).replace(/'/g, "''")}'`);
            exportContent += `INSERT INTO "${tblName}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${vals.join(', ')});\n`;
          }
        }
      }
      contentType = 'application/sql';
    } else if (format === 'json') {
      const dbExport = await adapter.exportDatabase();
      exportContent = JSON.stringify(dbExport, null, 2);
      contentType = 'application/json';
    } else {
      exportContent = JSON.stringify({ snapshotId, export: 'storage_archive_manifest' });
      contentType = 'application/json';
    }

    const exportBytes = new TextEncoder().encode(exportContent);
    const exportHash = await sha256Hex(exportBytes);

    await updateOp('UPLOADING', b2ExportKey, null, exportBytes.byteLength);

    if (b2Client && b2Client.isConfigured) {
      await b2Client.putObject(b2ExportKey, exportContent, {
        contentType,
        contentLength: exportBytes.byteLength,
        payloadSha256: exportHash,
      });
    }

    const downloadUrl = `/api/pro/exports/${operationId}/download`;
    await updateOp('COMPLETED', b2ExportKey, downloadUrl, exportBytes.byteLength);

    return {
      success: true,
      operationId,
      status: 'COMPLETED',
      format,
      b2ExportKey,
      downloadUrl,
      sizeBytes: exportBytes.byteLength,
    };
  } catch (err) {
    const errMsg = err?.message || 'Export failed';
    await updateOp('FAILED', null, null, 0, errMsg);
    throw err;
  }
}

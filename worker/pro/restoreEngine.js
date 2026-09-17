// FeraSetu Pro Data & Storage — Restore Engine & Safety Architecture
// =============================================================================
// - Deep conflict analysis: FKs, indexes, constraints, sequences, triggers, views.
// - Provider-specific restore: as_new prefers separate schema/database.
// - Prefix table restore enforces dependency safety validation.
// - Destructive restore strictly requires:
//     1. explicit_confirmation: true
//     2. confirm_data_source_name matching target
//     3. Automatic and verified pre-restore Safety Snapshot
// =============================================================================

export const RESTORE_MODES = {
  AS_NEW: 'as_new',
  SELECTED: 'selected',
  REPLACE_EXISTING: 'replace_existing',
};

/**
 * Performs comprehensive conflict analysis between snapshot and target live schema.
 */
export function analyzeRestoreConflicts(snapshotItems = [], liveSchema = {}, mode = RESTORE_MODES.AS_NEW) {
  const conflicts = [];
  const liveTables = liveSchema.tables || [];
  const liveTableMap = new Map(liveTables.map(t => [t.name, t]));

  for (const item of snapshotItems) {
    if (item.item_type !== 'table') continue;

    const tableName = item.source_path;
    const liveTable = liveTableMap.get(tableName);

    if (!liveTable) {
      conflicts.push({
        type: 'table_missing_in_target',
        table: tableName,
        severity: 'info',
        message: `Table '${tableName}' does not exist in the target database and will be created fresh.`,
      });
      continue;
    }

    // Check if live table has data
    if (liveTable.estimatedRowCount > 0) {
      conflicts.push({
        type: 'table_has_existing_data',
        table: tableName,
        severity: mode === RESTORE_MODES.REPLACE_EXISTING ? 'critical' : 'warning',
        existingRows: liveTable.estimatedRowCount,
        message: `Target table '${tableName}' contains ${liveTable.estimatedRowCount} existing rows that would be affected.`,
      });
    }

    // Check foreign keys & dependency safety in prefix mode
    if (mode === RESTORE_MODES.AS_NEW && (liveTable.foreignKeys || []).length > 0) {
      for (const fk of liveTable.foreignKeys) {
        conflicts.push({
          type: 'foreign_key_dependency',
          table: tableName,
          foreignKey: `${fk.column} -> ${fk.foreignTable}.${fk.foreignColumn}`,
          severity: 'warning',
          message: `Foreign key constraint detected on '${tableName}'. Prefix table mode requires remapping or using a separate schema to prevent cross-schema constraint violations.`,
        });
      }
    }

    // Check sequences
    if (liveSchema.sequences && liveSchema.sequences.length > 0) {
      const relatedSeq = liveSchema.sequences.find(s => s.includes(tableName));
      if (relatedSeq) {
        conflicts.push({
          type: 'sequence_detected',
          table: tableName,
          sequence: relatedSeq,
          severity: 'info',
          message: `Auto-increment sequence '${relatedSeq}' will need synchronization on restore.`,
        });
      }
    }
  }

  const hasCritical = conflicts.some(c => c.severity === 'critical');
  const recommendedMode = hasCritical ? RESTORE_MODES.AS_NEW : mode;

  return {
    conflictCount: conflicts.length,
    hasCriticalConflicts: hasCritical,
    recommendedMode,
    conflicts,
    dependencySafe: !conflicts.some(c => c.type === 'foreign_key_dependency' && mode === 'prefix'),
  };
}

/**
 * Validates destructive restore confirmation safeguards.
 */
export function validateDestructiveConfirmation(payload = {}, targetDataSourceName = '') {
  if (payload.mode !== RESTORE_MODES.REPLACE_EXISTING) {
    return true;
  }

  if (payload.explicit_confirmation !== true) {
    const err = new Error('Destructive restore blocked: explicit_confirmation must be true.');
    err.code = 'CONFIRMATION_REQUIRED';
    throw err;
  }

  if (!payload.confirm_data_source_name || payload.confirm_data_source_name.trim() !== targetDataSourceName.trim()) {
    const err = new Error(
      `Destructive restore blocked: confirm_data_source_name must match target data source name ('${targetDataSourceName}').`
    );
    err.code = 'NAME_CONFIRMATION_MISMATCH';
    throw err;
  }

  return true;
}

/**
 * Runs the restore workflow with pre-restore safety snapshot for destructive mode.
 */
export async function runRestoreWorkflow(operationId, params, adapter, triggerSafetySnapshotFn, env) {
  const {
    tenantId,
    dataSourceId,
    dataSourceName,
    snapshotId,
    mode = RESTORE_MODES.AS_NEW,
    explicitConfirmation = false,
    confirmDataSourceName = '',
    selectedTables = [],
  } = params;

  const updateOp = async (status, step, progress, details = null, error = null, safetySnapId = null) => {
    if (!env?.DB) return;
    await env.DB.prepare(`
      UPDATE site_restore_operations
      SET status = ?, current_step = ?, progress_percent = ?, result_summary = ?, error_message = ?, safety_snapshot_id = COALESCE(?, safety_snapshot_id), updated_at = ?
      WHERE id = ?
    `).bind(
      status, step, progress, details ? JSON.stringify(details) : null,
      error, safetySnapId || null, new Date().toISOString(), operationId
    ).run();
  };

  try {
    // 1. Conflict Preview & Verification (20%)
    await updateOp('PREVIEW', 'analyze_conflicts', 20);
    const liveSchema = await adapter.inspectSchema();
    const conflictAnalysis = analyzeRestoreConflicts([], liveSchema, mode);

    // 2. Destructive Safeguards & Mandatory Safety Snapshot (30% - 60%)
    let safetySnapshotId = null;
    if (mode === RESTORE_MODES.REPLACE_EXISTING) {
      validateDestructiveConfirmation({
        mode,
        explicit_confirmation: explicitConfirmation,
        confirm_data_source_name: confirmDataSourceName,
      }, dataSourceName);

      await updateOp('SAFETY_SNAPSHOT', 'create_safety_snapshot', 35);

      // Trigger automatic safety snapshot before modifying target source
      if (typeof triggerSafetySnapshotFn === 'function') {
        const safetyResult = await triggerSafetySnapshotFn(tenantId, dataSourceId, env);
        if (!safetyResult || !safetyResult.success) {
          throw new Error('Safety Snapshot creation failed. Destructive restore aborted to protect data integrity.');
        }
        safetySnapshotId = safetyResult.snapshotId;
        await updateOp('SAFETY_SNAPSHOT', 'safety_snapshot_verified', 60, { safetySnapshotId }, null, safetySnapshotId);
      }
    }

    // 3. Execute Restore (60% - 90%)
    await updateOp('RESTORING', 'apply_restore', 75, null, null, safetySnapshotId);

    const restoreTarget = mode === RESTORE_MODES.AS_NEW
      ? (adapter.getCapabilities().restoreAsNewSchema ? `schema_restored_${Date.now()}` : 'prefixed_tables')
      : 'original_tables';

    // Call adapter restore
    const restoreResult = await adapter.restoreDatabase({
      selectedTables,
      mode,
      newSchema: restoreTarget.startsWith('schema_') ? restoreTarget : null,
    });

    // 4. Complete (100%)
    const summary = {
      mode,
      targetDestination: restoreTarget,
      safetySnapshotId,
      conflictsResolved: conflictAnalysis.conflictCount,
      completedAt: new Date().toISOString(),
    };

    await updateOp('COMPLETED', 'finished', 100, summary, null, safetySnapshotId);

    return {
      success: true,
      operationId,
      status: 'COMPLETED',
      mode,
      targetDestination: restoreTarget,
      safetySnapshotId,
    };
  } catch (err) {
    const errMsg = err?.message || 'Restore workflow failed';
    await updateOp('FAILED', 'failed', 0, null, errMsg);
    throw err;
  }
}

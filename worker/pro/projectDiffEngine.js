/**
 * FeraSetu Pro — Deterministic 3-Way Diff & Re-Import Conflict Engine
 * =============================================================================
 * Implements exact 3-way merge semantics:
 * A = original imported source / base
 * B = current Pro Studio state
 * C = newly uploaded source
 * 
 * 5 Outcomes:
 * 0. A == B == C                     => UNCHANGED
 * 1. A == B && A != C                => EXTERNAL_ONLY_CHANGE (safe to apply)
 * 2. A != B && A == C                => STUDIO_ONLY_CHANGE (preserve Studio)
 * 3. A != B && A != C && B == C      => SAME_FINAL_STATE (no conflict)
 * 4. A != B && A != C && B != C      => TRUE_CONFLICT (requires resolution)
 * 
 * Resolutions for TRUE_CONFLICT:
 * - 'keep_external': apply C to Studio
 * - 'keep_studio': preserve B in Studio
 * - 'manual_merge': apply custom resolved_content
 * =============================================================================
 */

export const DIFF_OUTCOMES = {
  UNCHANGED: 'UNCHANGED',
  EXTERNAL_ONLY_CHANGE: 'EXTERNAL_ONLY_CHANGE',
  STUDIO_ONLY_CHANGE: 'STUDIO_ONLY_CHANGE',
  SAME_FINAL_STATE: 'SAME_FINAL_STATE',
  TRUE_CONFLICT: 'TRUE_CONFLICT',
};

/**
 * Computes deterministic canonical representation B for a live Studio resource.
 */
export function getCanonicalStudioRepresentation(resourceType, studioResource) {
  if (!studioResource) return '';

  if (resourceType === 'page') {
    const canonical = {
      title: String(studioResource.title || '').trim(),
      slug: String(studioResource.slug || '').trim(),
      type: studioResource.type || 'standard',
      is_homepage: studioResource.is_homepage ? 1 : 0,
      auth_required: studioResource.auth_required ? 1 : 0,
      content: typeof studioResource.content === 'object' ? studioResource.content : (studioResource.content || ''),
      seo_title: studioResource.seo_title || null,
      seo_description: studioResource.seo_description || null,
    };
    return JSON.stringify(canonical);
  }

  if (resourceType === 'route') {
    const canonical = {
      path_pattern: String(studioResource.path_pattern || '').trim(),
      page_id: String(studioResource.page_id || '').trim(),
      access_level: studioResource.access_level || 'public',
      function_binding: studioResource.function_binding || null,
    };
    return JSON.stringify(canonical);
  }

  if (resourceType === 'function') {
    let sourceCode = '';
    if (typeof studioResource.definition === 'string') {
      try {
        const parsed = JSON.parse(studioResource.definition);
        sourceCode = parsed.source || studioResource.definition;
      } catch {
        sourceCode = studioResource.definition;
      }
    } else if (typeof studioResource.definition === 'object') {
      sourceCode = studioResource.definition?.source || '';
    } else if (studioResource.code) {
      sourceCode = studioResource.code;
    }

    const canonical = {
      name: String(studioResource.name || '').trim(),
      code: String(sourceCode || '').trim(),
      capabilities: Array.isArray(studioResource.capabilities) ? studioResource.capabilities.sort() : [],
    };
    return JSON.stringify(canonical);
  }

  return String(studioResource.content || studioResource.definition || '');
}

/**
 * Evaluates the 3-way merge outcome for a single resource.
 * 
 * @param {string} a - Original imported source / base content
 * @param {string} b - Current Pro Studio state content
 * @param {string} c - Newly uploaded source content
 * @returns {{ outcome: string, isConflict: boolean, canAutoApply: boolean, summary: string }}
 */
export function evaluateThreeWayMerge(a, b, c) {
  const normA = (a || '').trim();
  const normB = (b || '').trim();
  const normC = (c || '').trim();

  // Outcome 0: A == B == C
  if (normA === normB && normB === normC) {
    return {
      outcome: 'UNCHANGED',
      isConflict: false,
      canAutoApply: false,
      summary: 'Resource is identical across original base, Studio, and newly uploaded project.',
    };
  }

  // Outcome 1: A == B && A != C
  if (normA === normB && normA !== normC) {
    return {
      outcome: 'EXTERNAL_ONLY_CHANGE',
      isConflict: false,
      canAutoApply: true,
      summary: 'Updated in newly uploaded source while unchanged in Studio. Safe to apply external update.',
    };
  }

  // Outcome 2: A != B && A == C
  if (normA !== normB && normA === normC) {
    return {
      outcome: 'STUDIO_ONLY_CHANGE',
      isConflict: false,
      canAutoApply: false,
      summary: 'Modified in Studio while unchanged in external project. Studio edits are preserved.',
    };
  }

  // Outcome 3: A != B && A != C && B == C
  if (normA !== normB && normA !== normC && normB === normC) {
    return {
      outcome: 'SAME_FINAL_STATE',
      isConflict: false,
      canAutoApply: false,
      summary: 'Both external source and Studio changed independently to identical final content. No conflict.',
    };
  }

  // Outcome 4: A != B && A != C && B != C
  return {
    outcome: 'TRUE_CONFLICT',
    isConflict: true,
    canAutoApply: false,
    summary: 'Both external source and Studio modified this resource independently to different states. User review required.',
  };
}

/**
 * Computes a 3-way diff between base resource, live studio resource, and external file.
 */
export function computeThreeWayDiff(baseResource, studioResource, externalFile, resourceType) {
  const baseContent = typeof baseResource === 'string'
    ? baseResource
    : (baseResource?.content || '');

  let studioCanonical = '';
  if (typeof studioResource === 'string') {
    studioCanonical = studioResource;
  } else if (studioResource?.content && typeof studioResource.content === 'string') {
    studioCanonical = studioResource.content;
  } else if (studioResource?.definition && typeof studioResource.definition === 'string') {
    studioCanonical = studioResource.definition;
  } else if (studioResource) {
    studioCanonical = getCanonicalStudioRepresentation(resourceType, studioResource);
  }

  const newContent = typeof externalFile === 'string'
    ? externalFile
    : (externalFile?.content || '');

  const evalResult = evaluateThreeWayMerge(baseContent, studioCanonical, newContent);
  const hunks = generateLineDiff(baseContent, newContent);

  return {
    ...evalResult,
    diffHunks: hunks,
    safeToAutoApply: evalResult.canAutoApply,
  };
}

/**
 * Generates unified line-by-line diff hunks.
 */
export function generateLineDiff(oldText, newText) {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');

  const hunks = [];
  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      hunks.push({ type: 'unchanged', line: oldLine, oldLineNumber: i + 1, newLineNumber: i + 1 });
    } else if (oldLine !== undefined && newLine !== undefined) {
      hunks.push({ type: 'removed', line: oldLine, oldLineNumber: i + 1, newLineNumber: null });
      hunks.push({ type: 'added', line: newLine, oldLineNumber: null, newLineNumber: i + 1 });
    } else if (oldLine !== undefined) {
      hunks.push({ type: 'removed', line: oldLine, oldLineNumber: i + 1, newLineNumber: null });
    } else if (newLine !== undefined) {
      hunks.push({ type: 'added', line: newLine, oldLineNumber: null, newLineNumber: i + 1 });
    }
  }

  return hunks;
}

/**
 * Compares an existing imported project base and live Studio state against newly uploaded files.
 * 
 * @param {Array<{ source_path: string, source_hash: string, studio_hash: string, resource_type: string, resource_id: string }>} existingMappings
 * @param {Array<{ path: string, content: string, hash: string }>} newFiles
 * @param {object} liveStudioResources - { pages: [], routes: [], functions: [] }
 * @param {Map<string, string>} baseFileContents - Map of source_path => original file content in base
 * @returns {object} Comprehensive 3-way re-import diff report
 */
export function computeProjectReimportDiff(existingMappings, newFiles, liveStudioResources = {}, baseFileContents = new Map()) {
  const newFileMap = new Map(newFiles.map(f => [f.path, f]));
  const existingPathMap = new Map(existingMappings.map(m => [m.source_path, m]));

  const changes = [];
  let unchangedCount = 0;
  let addedCount = 0;
  let modifiedCount = 0;
  let deletedCount = 0;
  let conflictCount = 0;
  let renameCandidateCount = 0;

  // Track potential renames: deleted paths and added paths
  const deletedCandidates = [];
  const addedCandidates = [];

  // 1. Check existing mappings for modifications, deletions, or conflicts
  for (const mapping of existingMappings) {
    const sourcePath = mapping.source_path;
    const resourceType = mapping.resource_type;
    const newFile = newFileMap.get(sourcePath);

    // Find current live Studio resource
    let liveResource = null;
    if (resourceType === 'page') {
      liveResource = (liveStudioResources.pages || []).find(p => p.id === mapping.resource_id || p.slug === mapping.resource_id);
    } else if (resourceType === 'route') {
      liveResource = (liveStudioResources.routes || []).find(r => r.id === mapping.resource_id || r.path_pattern === mapping.resource_id);
    } else if (resourceType === 'function') {
      liveResource = (liveStudioResources.functions || []).find(f => f.id === mapping.resource_id || f.name === mapping.resource_id);
    }

    if (!newFile) {
      // File was deleted from external project
      deletedCandidates.push({ mapping, liveResource });
      deletedCount++;
      changes.push({
        source_path: sourcePath,
        resource_type: resourceType,
        resource_id: mapping.resource_id,
        change_type: 'deleted',
        conflict_status: liveResource ? 'STUDIO_ONLY_CHANGE' : 'NO_CONFLICT',
        is_conflict: false,
        summary: `File was removed in newly uploaded project. Studio resource can be kept or removed.`,
        diff: [],
      });
      continue;
    }

    // Both base and new upload have this file
    const baseContent = baseFileContents.get(sourcePath) || '';
    const newContent = newFile.content || '';
    const studioCanonical = liveResource ? getCanonicalStudioRepresentation(resourceType, liveResource) : (mapping.studio_hash ? baseContent : '');

    // Execute 3-way merge evaluation
    const mergeEval = evaluateThreeWayMerge(baseContent, studioCanonical, newContent);

    if (mergeEval.outcome === 'UNCHANGED') {
      unchangedCount++;
    } else if (mergeEval.outcome === 'TRUE_CONFLICT') {
      conflictCount++;
      modifiedCount++;
    } else {
      modifiedCount++;
    }

    changes.push({
      source_path: sourcePath,
      resource_type: resourceType,
      resource_id: mapping.resource_id,
      change_type: mergeEval.outcome === 'UNCHANGED' ? 'unchanged' : 'modified',
      conflict_status: mergeEval.outcome,
      is_conflict: mergeEval.isConflict,
      can_auto_apply: mergeEval.canAutoApply,
      summary: mergeEval.summary,
      diff: mergeEval.outcome !== 'UNCHANGED' ? generateLineDiff(baseContent, newContent) : [],
      base_content: baseContent,
      studio_content: studioCanonical,
      external_content: newContent,
    });
  }

  // 2. Check for newly added files in new upload
  for (const newFile of newFiles) {
    if (!existingPathMap.has(newFile.path)) {
      addedCandidates.push(newFile);
      addedCount++;
      changes.push({
        source_path: newFile.path,
        resource_type: 'unknown',
        resource_id: null,
        change_type: 'added',
        conflict_status: 'EXTERNAL_ONLY_CHANGE',
        is_conflict: false,
        can_auto_apply: true,
        summary: `New file added in updated project.`,
        diff: generateLineDiff('', newFile.content),
        external_content: newFile.content,
      });
    }
  }

  // 3. Rename detection: match deleted paths with added paths by content hash
  for (const del of deletedCandidates) {
    const matchingAdd = addedCandidates.find(add => add.hash === del.mapping.source_hash);
    if (matchingAdd) {
      renameCandidateCount++;
      changes.push({
        source_path: matchingAdd.path,
        old_source_path: del.mapping.source_path,
        resource_type: del.mapping.resource_type,
        resource_id: del.mapping.resource_id,
        change_type: 'rename_candidate',
        conflict_status: 'EXTERNAL_ONLY_CHANGE',
        is_conflict: false,
        can_auto_apply: false,
        summary: `Possible rename detected: '${del.mapping.source_path}' -> '${matchingAdd.path}' with identical content hash.`,
        diff: [],
      });
    }
  }

  return {
    summary: {
      total_resources: changes.length,
      unchanged_count: unchangedCount,
      added_count: addedCount,
      modified_count: modifiedCount,
      deleted_count: deletedCount,
      conflict_count: conflictCount,
      rename_candidate_count: renameCandidateCount,
      has_conflicts: conflictCount > 0,
    },
    changes,
  };
}

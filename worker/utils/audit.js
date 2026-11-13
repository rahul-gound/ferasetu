/**
 * Admin Audit Logging Utility
 * Records privileged actions to the admin_audit_logs table.
 */

export async function logAdminAction(env, adminEmail, action, targetType, targetId, metadata = null, ipAddress = null, severity = 'info') {
  if (!env?.DB) return;
  try {
    const id = `audit_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const metadataStr = metadata ? (typeof metadata === 'object' ? JSON.stringify(metadata) : String(metadata)) : null;

    await env.DB.prepare(
      `INSERT INTO admin_audit_logs (id, admin_email, action, target_type, target_id, metadata, ip_address, severity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, adminEmail || 'system', action, targetType || 'system', targetId || '', metadataStr, ipAddress || null, severity, createdAt)
    .run();
  } catch (err) {
    // If table doesn't have new columns or audit log failure occurs, do not crash
    console.warn(`Failed to write audit log [${action}]:`, err?.message || err);
    try {
      // Fallback simple insert
      const id = `audit_${crypto.randomUUID()}`;
      await env.DB.prepare(
        `INSERT INTO admin_audit_logs (id, admin_email, action, target_type, target_id, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(id, adminEmail || 'system', action, targetType || 'system', targetId || '', JSON.stringify(metadata || {})).run();
    } catch {}
  }
}

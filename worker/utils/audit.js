/**
 * Admin Audit Logging Utility
 * Records privileged actions to the admin_audit_logs table.
 */

export async function logAdminAction(env, adminEmail, action, targetType, targetId, metadata = null) {
  try {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const metadataStr = metadata ? JSON.stringify(metadata) : null;

    await env.DB.prepare(
      `INSERT INTO admin_audit_logs (id, admin_email, action, target_type, target_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, adminEmail, action, targetType, targetId, metadataStr, createdAt)
    .run();
  } catch (err) {
    // Audit log failure shouldn't crash the application, but should be logged loudly
    console.error(`Failed to write audit log [${action}]:`, err);
  }
}

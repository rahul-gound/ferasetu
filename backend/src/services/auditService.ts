import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';

export type FinancialEventType =
  | 'invoice_issued'
  | 'order_cancelled'
  | 'cancellation_requested'
  | 'cancellation_approved'
  | 'cancellation_rejected'
  | 'return_requested'
  | 'return_approved'
  | 'return_rejected'
  | 'items_received'
  | 'credit_note_issued'
  | 'refund_requested'
  | 'refund_processing'
  | 'refund_completed'
  | 'refund_failed'
  | 'manual_refund_recorded'
  | 'delivery_otp_verified'
  | 'payment_verified';

export interface AuditLogParams {
  userId: string;
  orderId?: string;
  invoiceId?: string;
  creditNoteId?: string;
  refundId?: string;
  eventType: FinancialEventType;
  actorType: 'merchant' | 'customer' | 'system' | 'webhook';
  actorId?: string;
  currency?: string;
  amountMinor?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only financial audit trail logging.
 * Financial records are permanent and auditable.
 */
export function recordFinancialAudit(params: AuditLogParams): void {
  try {
    const db = getDatabase();
    const id = `aud_${uuidv4()}`;
    const metaStr = params.metadata ? JSON.stringify(params.metadata) : null;

    db.prepare(`
      INSERT INTO financial_audit_logs (
        id, user_id, order_id, invoice_id, credit_note_id, refund_id,
        event_type, actor_type, actor_id, currency, amount_minor, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      params.userId,
      params.orderId || null,
      params.invoiceId || null,
      params.creditNoteId || null,
      params.refundId || null,
      params.eventType,
      params.actorType,
      params.actorId || null,
      params.currency || 'INR',
      params.amountMinor !== undefined ? Math.round(params.amountMinor) : null,
      metaStr
    );
  } catch (err: any) {
    console.error('[auditService] Failed to record financial audit log:', err.message);
  }
}

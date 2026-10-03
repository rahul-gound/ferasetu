import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { getDatabase } from '../models/database';
import { recordFinancialAudit } from './auditService';
import { addMinor, subMinor, fromMinorUnits, toMinorUnits } from '../utils/money';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || '';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';
const CASHFREE_API_BASE = CASHFREE_ENV === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

export interface InitiateRefundParams {
  orderId: string;
  userId: string; // Merchant ID for strict tenant isolation
  amountMinor: number;
  reason: string;
  refundMethod: 'original_payment_method' | 'upi' | 'bank_transfer' | 'cash' | 'manual_offline';
  isManual?: boolean;
  manualReference?: string;
  creditNoteId?: string;
  idempotencyKey?: string;
  actorType?: 'merchant' | 'system' | 'webhook';
  actorId?: string;
}

function generateRefundNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomInt(1000, 10000);
  return `FS-RF-${dateStr}-${rand}`;
}

export interface OrderFinancialSummary {
  orderId: string;
  currency: string;
  totalMinor: number;
  amountPaidMinor: number;
  refundedAmountMinor: number;
  remainingRefundableMinor: number;
  paymentStatus: string;
  paymentMethod: string;
  providerPaymentId?: string;
  cancellationStatus: string;
  isUnpaidCod: boolean;
}

/**
 * Calculate authoritative financial status for an order.
 * Strictly calculates: remaining_refundable_minor = amount_paid_minor - already_refunded_minor.
 */
export function getOrderFinancialSummary(orderId: string, userId?: string): OrderFinancialSummary {
  const db = getDatabase();
  let query = 'SELECT * FROM orders WHERE id = ?';
  const params: unknown[] = [orderId];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  const order = db.prepare(query).get(...params) as any;
  if (!order) {
    throw new Error('Order not found');
  }

  const currency = order.currency || 'INR';
  const totalMinor = order.total_minor !== undefined && order.total_minor !== null && order.total_minor > 0
    ? order.total_minor
    : toMinorUnits(order.total, currency);

  // Sum all completed or processing refunds from the refunds table for rock-solid reconciliation
  const refundRows = db.prepare(`
    SELECT COALESCE(SUM(amount_minor), 0) as total_refunded
    FROM refunds
    WHERE order_id = ? AND status IN ('completed', 'processing', 'pending')
  `).get(order.id) as { total_refunded: number };

  const tableRefundedMinor = Math.round(Number(refundRows?.total_refunded) || 0);
  const columnRefundedMinor = Math.round(Number(order.refunded_amount_minor) || 0);
  const effectiveRefundedMinor = Math.max(tableRefundedMinor, columnRefundedMinor);

  // Determine amount paid in minor units
  let amountPaidMinor = 0;
  if (order.amount_paid_minor !== undefined && order.amount_paid_minor !== null && order.amount_paid_minor > 0) {
    amountPaidMinor = Math.round(order.amount_paid_minor);
  } else if (order.payment_status === 'paid') {
    amountPaidMinor = totalMinor;
  }

  const remainingRefundableMinor = Math.max(0, subMinor(amountPaidMinor, effectiveRefundedMinor));
  const isUnpaidCod = (order.payment_status !== 'paid' && amountPaidMinor === 0) &&
    (order.delivery_type === 'delivery' || order.delivery_type === 'pickup' || order.payment_method === 'offline');

  return {
    orderId: order.id,
    order_id: order.id,
    currency,
    totalMinor,
    total_minor: totalMinor,
    amountPaidMinor,
    amount_paid_minor: amountPaidMinor,
    refundedAmountMinor: effectiveRefundedMinor,
    refunded_amount_minor: effectiveRefundedMinor,
    remainingRefundableMinor,
    remaining_refundable_minor: remainingRefundableMinor,
    paymentStatus: order.payment_status || 'unpaid',
    payment_status: order.payment_status || 'unpaid',
    paymentMethod: order.payment_method || (order.payment_status === 'paid' ? 'online' : 'offline'),
    payment_method: order.payment_method || (order.payment_status === 'paid' ? 'online' : 'offline'),
    providerPaymentId: order.provider_payment_id || null,
    provider_payment_id: order.provider_payment_id || null,
    cancellationStatus: order.cancellation_status || 'none',
    cancellation_status: order.cancellation_status || 'none',
    isUnpaidCod,
    is_unpaid_cod: isUnpaidCod,
  } as any;
}

/**
 * Execute refund with full validation, balance guards, and idempotency protection.
 */
export async function processRefund(params: InitiateRefundParams): Promise<any> {
  const db = getDatabase();

  // 1. Idempotency Check
  if (params.idempotencyKey) {
    const existingRefund = db.prepare(`
      SELECT * FROM refunds WHERE idempotency_key = ? AND user_id = ?
    `).get(params.idempotencyKey, params.userId) as any;

    if (existingRefund) {
      console.log(`[refundService] Returning existing refund for idempotency key ${params.idempotencyKey}`);
      return existingRefund;
    }
  }

  // 2. Authoritative Order & Balance Check
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(params.orderId, params.userId) as any;
  if (!order) {
    throw new Error('Order not found or access denied');
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(order.id) as any;
  const financialSummary = getOrderFinancialSummary(order.id, params.userId);

  const requestedAmountMinor = Math.round(Number(params.amountMinor));
  if (requestedAmountMinor <= 0) {
    throw new Error('Refund amount must be greater than zero');
  }

  if (financialSummary.isUnpaidCod) {
    throw new Error('No payment was collected for this order. No refund is required.');
  }

  if (requestedAmountMinor > financialSummary.remainingRefundableMinor) {
    throw new Error(
      `Requested refund amount (${requestedAmountMinor} minor units) exceeds remaining refundable balance (${financialSummary.remainingRefundableMinor} minor units).`
    );
  }

  const refundId = `ref_${uuidv4()}`;
  const refundNumber = generateRefundNumber();
  const currency = financialSummary.currency;
  const isManual = Boolean(params.isManual || params.refundMethod !== 'original_payment_method');
  const provider = isManual ? 'manual' : (order.provider_payment_id?.startsWith('pay_') ? 'razorpay' : 'cashfree');

  // 3. Create initial refund record
  const initialStatus = isManual ? 'completed' : 'processing';
  const completedAt = isManual ? new Date().toISOString() : null;

  db.prepare(`
    INSERT INTO refunds (
      id, refund_number, order_id, invoice_id, credit_note_id, user_id,
      organization_id, shop_id, customer_id, customer_name, customer_email, customer_phone,
      original_payment_id, amount_minor, currency, reason, refund_method, provider,
      provider_refund_id, provider_event_id, status, is_manual, manual_reference,
      actor_type, actor_id, idempotency_key, error_message, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    refundId,
    refundNumber,
    order.id,
    invoice?.id || null,
    params.creditNoteId || null,
    params.userId,
    order.organization_id || null,
    order.shop_id || null,
    order.customer_id || null,
    order.customer_name || 'Customer',
    order.customer_email || null,
    order.customer_phone || null,
    order.provider_payment_id || null,
    requestedAmountMinor,
    currency,
    params.reason,
    params.refundMethod,
    provider,
    null, // provider_refund_id
    null, // provider_event_id
    initialStatus,
    isManual ? 1 : 0,
    params.manualReference || null,
    params.actorType || 'merchant',
    params.actorId || params.userId,
    params.idempotencyKey || null,
    null,
    completedAt
  );

  // 4. Provider Dispatch for Online Payments
  let finalStatus = initialStatus;
  let providerRefundId: string | null = null;
  let errorMessage: string | null = null;

  if (!isManual) {
    if (provider === 'razorpay') {
      try {
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
          throw new Error('Razorpay credentials not configured in backend');
        }

        const paymentId = order.provider_payment_id;
        if (!paymentId) {
          throw new Error('Original Razorpay payment ID missing from order record');
        }

        const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        const rzpResponse = await axios.post(
          `${RAZORPAY_API_BASE}/payments/${paymentId}/refund`,
          {
            amount: requestedAmountMinor,
            speed: 'normal',
            notes: {
              order_id: order.id,
              refund_id: refundId,
              refund_number: refundNumber,
            },
            receipt: refundNumber,
          },
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const rzpData = rzpResponse.data;
        providerRefundId = rzpData.id;
        finalStatus = rzpData.status === 'processed' ? 'completed' : 'processing';
      } catch (err: any) {
        console.error('[refundService] Razorpay refund API failed:', err.response?.data || err.message);
        finalStatus = 'failed';
        errorMessage = err.response?.data?.error?.description || err.message;
      }
    } else if (provider === 'cashfree') {
      try {
        if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
          throw new Error('Cashfree credentials not configured in backend');
        }

        const cfResponse = await axios.post(
          `${CASHFREE_API_BASE}/orders/${encodeURIComponent(order.id)}/refunds`,
          {
            refund_amount: fromMinorUnits(requestedAmountMinor, currency),
            refund_id: refundNumber,
            refund_note: params.reason,
            refund_speed: 'STANDARD',
          },
          {
            headers: {
              'x-client-id': CASHFREE_APP_ID,
              'x-client-secret': CASHFREE_SECRET_KEY,
              'x-api-version': '2023-08-01',
              'Content-Type': 'application/json',
            },
          }
        );

        const cfData = cfResponse.data;
        providerRefundId = cfData.cf_refund_id || cfData.refund_id;
        finalStatus = cfData.refund_status === 'SUCCESS' ? 'completed' : 'processing';
      } catch (err: any) {
        console.error('[refundService] Cashfree refund API failed:', err.response?.data || err.message);
        finalStatus = 'failed';
        errorMessage = err.response?.data?.message || err.message;
      }
    }
  }

  // 5. Update Refund Record with Provider Outcome
  const nowStr = new Date().toISOString();
  db.prepare(`
    UPDATE refunds SET
      status = ?,
      provider_refund_id = ?,
      error_message = ?,
      completed_at = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    finalStatus,
    providerRefundId,
    errorMessage,
    finalStatus === 'completed' ? nowStr : null,
    refundId
  );

  // 6. If refund completed or processing, update order totals atomically
  if (finalStatus === 'completed' || finalStatus === 'processing') {
    const newRefundedTotal = addMinor(financialSummary.refundedAmountMinor, requestedAmountMinor);
    const newRemaining = Math.max(0, subMinor(financialSummary.amountPaidMinor, newRefundedTotal));
    const newPaymentStatus = newRemaining === 0 ? 'refunded' : (newRefundedTotal > 0 ? 'partially_refunded' : order.payment_status);

    db.prepare(`
      UPDATE orders SET
        refunded_amount_minor = ?,
        refundable_amount_minor = ?,
        payment_status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(newRefundedTotal, newRemaining, newPaymentStatus, order.id);
  }

  // 7. Append-only Audit Trail
  recordFinancialAudit({
    userId: params.userId,
    orderId: order.id,
    invoiceId: invoice?.id,
    refundId,
    eventType: finalStatus === 'completed' ? (isManual ? 'manual_refund_recorded' : 'refund_completed') : (finalStatus === 'failed' ? 'refund_failed' : 'refund_processing'),
    actorType: params.actorType || 'merchant',
    actorId: params.actorId || params.userId,
    currency,
    amountMinor: requestedAmountMinor,
    metadata: {
      refundNumber,
      provider,
      providerRefundId,
      refundMethod: params.refundMethod,
      isManual,
      status: finalStatus,
      manualReference: params.manualReference,
      error: errorMessage,
    },
  });

  return getRefundById(refundId, params.userId);
}

export function getRefundById(refundId: string, userId?: string): any {
  const db = getDatabase();
  let query = 'SELECT * FROM refunds WHERE id = ?';
  const params: unknown[] = [refundId];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  return db.prepare(query).get(...params);
}

export function getRefundsForOrder(orderId: string, userId?: string): any[] {
  const db = getDatabase();
  let query = 'SELECT * FROM refunds WHERE order_id = ?';
  const params: unknown[] = [orderId];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  query += ' ORDER BY created_at DESC';
  return (db.prepare(query).all(...params) || []) as any[];
}

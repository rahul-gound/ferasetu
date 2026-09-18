import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { recordFinancialAudit } from './auditService';
import { generateCreditNotePdf, CreditNotePdfData } from './pdfService';
import { addMinor, subMinor } from '../utils/money';

export interface CreateCreditNoteParams {
  orderId: string;
  userId: string;
  items: Array<{
    productId?: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor?: number;
    reason?: string;
  }>;
  taxAdjustmentMinor?: number;
  reason: string;
  actorId?: string;
  actorType?: 'merchant' | 'system';
}

function generateCreditNoteNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FS-CN-${dateStr}-${rand}`;
}

export function createCreditNote(params: CreateCreditNoteParams): any {
  const db = getDatabase();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(params.orderId, params.userId) as any;
  if (!order) {
    throw new Error('Order not found or access denied');
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ? AND user_id = ?').get(params.orderId, params.userId) as any;
  if (!invoice) {
    throw new Error('Cannot issue credit note: No invoice exists for this order');
  }

  // Calculate items and total credit amount in minor units
  let taxableValueMinor = 0;
  const processedItems = params.items.map(it => {
    const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
    const anyIt = it as any;
    const unitPrice = Math.round(Number(it.unitPriceMinor ?? anyIt.unit_price_minor ?? anyIt.amount_minor ?? anyIt.priceMinor ?? 0));
    const lineTotal = Math.round(anyIt.totalMinor !== undefined ? Number(anyIt.totalMinor) : (anyIt.total_minor !== undefined ? Number(anyIt.total_minor) : (anyIt.amount_minor !== undefined ? Number(anyIt.amount_minor) : unitPrice * qty)));
    taxableValueMinor = addMinor(taxableValueMinor, lineTotal);
    return {
      productId: it.productId || anyIt.product_id || null,
      name: it.name,
      quantity: qty,
      unitPriceMinor: unitPrice,
      totalMinor: lineTotal,
      reason: it.reason || params.reason,
    };
  });

  const taxAdjustmentMinor = Math.round(Number(params.taxAdjustmentMinor) || 0);
  const totalCreditMinor = addMinor(taxableValueMinor, taxAdjustmentMinor);

  if (totalCreditMinor <= 0) {
    throw new Error('Total credit amount must be greater than zero');
  }

  const creditNoteId = `cn_${uuidv4()}`;
  const creditNoteNumber = generateCreditNoteNumber();
  const currency = order.currency || invoice.currency || 'INR';

  db.prepare(`
    INSERT INTO credit_notes (
      id, credit_note_number, invoice_id, invoice_number, order_id, user_id,
      organization_id, shop_id, customer_id, customer_name, customer_phone, customer_email,
      currency, items, taxable_value_minor, tax_adjustment_minor, total_credit_minor,
      reason, status, issued_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', datetime('now'), datetime('now'), datetime('now'))
  `).run(
    creditNoteId,
    creditNoteNumber,
    invoice.id,
    invoice.invoice_number,
    order.id,
    params.userId,
    order.organization_id || null,
    order.shop_id || null,
    order.customer_id || null,
    order.customer_name || '',
    order.customer_phone || '',
    order.customer_email || null,
    currency,
    JSON.stringify(processedItems),
    taxableValueMinor,
    taxAdjustmentMinor,
    totalCreditMinor,
    params.reason
  );

  // NOTE: Original invoice is NEVER modified or deleted (Financial Immutability Rule #3)

  // Append audit trail
  recordFinancialAudit({
    userId: params.userId,
    orderId: order.id,
    invoiceId: invoice.id,
    creditNoteId,
    eventType: 'credit_note_issued',
    actorType: params.actorType || 'merchant',
    actorId: params.actorId || params.userId,
    currency,
    amountMinor: totalCreditMinor,
    metadata: {
      creditNoteNumber,
      invoiceNumber: invoice.invoice_number,
      reason: params.reason,
      itemsCount: processedItems.length,
    },
  });

  return getCreditNoteById(creditNoteId, params.userId);
}

export function getCreditNoteById(creditNoteId: string, userId?: string): any {
  const db = getDatabase();
  let query = 'SELECT * FROM credit_notes WHERE id = ?';
  const params: unknown[] = [creditNoteId];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  const cn = db.prepare(query).get(...params) as any;
  if (!cn) return null;
  return {
    ...cn,
    total_minor: cn.total_credit_minor,
    totalCreditMinor: cn.total_credit_minor,
    items: typeof cn.items === 'string' ? JSON.parse(cn.items) : cn.items,
  };
}

export function getCreditNotesForOrder(orderId: string, userId?: string): any[] {
  const db = getDatabase();
  let query = 'SELECT * FROM credit_notes WHERE order_id = ?';
  const params: unknown[] = [orderId];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params) as any[];
  return (rows || []).map(r => ({
    ...r,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
  }));
}

export function getCreditNotePdfBuffer(creditNoteId: string, userId?: string): Buffer {
  const db = getDatabase();
  const cn = getCreditNoteById(creditNoteId, userId);
  if (!cn) {
    throw new Error('Credit Note not found');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(cn.user_id) as any;
  const shop = db.prepare('SELECT * FROM shops WHERE organization_id = ? OR id = ?').get(user?.id, user?.id) as any;

  const pdfData: CreditNotePdfData = {
    creditNoteNumber: cn.credit_note_number,
    originalInvoiceNumber: cn.invoice_number,
    originalOrderId: cn.order_id,
    issuedAt: cn.issued_at || cn.created_at,
    currency: cn.currency || 'INR',
    reason: cn.reason || 'Goods returned / Price adjustment',
    status: cn.status,
    merchant: {
      name: shop?.name || user?.business_name || user?.name || 'FeraSetu Merchant',
      businessName: user?.business_name || shop?.name,
      address: [user?.city, user?.state].filter(Boolean).join(', ') || undefined,
      city: user?.city,
      state: user?.state,
      phone: user?.phone,
      email: user?.email,
      gstin: user?.gstin || undefined,
    },
    customer: {
      name: cn.customer_name || 'Customer',
      phone: cn.customer_phone,
      email: cn.customer_email,
    },
    items: (cn.items || []).map((it: any) => ({
      name: it.name,
      quantity: it.quantity,
      unitPriceMinor: it.unitPriceMinor,
      totalMinor: it.totalMinor,
      reason: it.reason,
    })),
    taxableValueMinor: cn.taxable_value_minor,
    taxAdjustmentMinor: cn.tax_adjustment_minor,
    totalCreditMinor: cn.total_credit_minor,
  };

  return generateCreditNotePdf(pdfData);
}

import { formatMinor, getCurrencyConfig } from '../utils/money';

export interface InvoicePdfItem {
  name: string;
  sku?: string;
  variant?: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor?: number;
  taxMinor?: number;
  totalMinor: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  orderId: string;
  issuedAt: string;
  currency: string;
  merchant: {
    name: string;
    businessName?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    logoUrl?: string | null;
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
    deliveryAddress?: string;
    deliveryType?: string;
  };
  items: InvoicePdfItem[];
  subtotalMinor: number;
  discountMinor?: number;
  deliveryFeeMinor?: number;
  taxMinor?: number;
  totalMinor: number;
  amountPaidMinor?: number;
  balanceDueMinor?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  notes?: string;
}

export interface CreditNotePdfItem {
  name: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  reason?: string;
}

export interface CreditNotePdfData {
  creditNoteNumber: string;
  originalInvoiceNumber: string;
  originalOrderId: string;
  issuedAt: string;
  currency: string;
  reason: string;
  status: string;
  merchant: {
    name: string;
    businessName?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  customer: {
    name: string;
    phone?: string;
    email?: string;
    deliveryAddress?: string;
  };
  items: CreditNotePdfItem[];
  taxableValueMinor: number;
  taxAdjustmentMinor: number;
  totalCreditMinor: number;
}

/**
 * Escape string for PDF Type 1 standard text literal
 */
function escapePdfText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  // Map non-ASCII currency symbols to clean ASCII equivalents for standard Type 1 Helvetica
  const clean = String(text)
    .replace(/\u20B9/g, 'Rs. ')
    .replace(/\u20AC/g, 'EUR ')
    .replace(/\u00A3/g, 'GBP ')
    .replace(/\u00A5/g, 'JPY ')
    .replace(/[^\x20-\x7E]/g, ' '); // Strip non-printable or unsupported extended glyphs
  return clean.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function formatPdfMoney(amountMinor: number | undefined | null, currency: string = 'INR'): string {
  const normCurr = (currency || 'INR').toUpperCase();
  const cfg = getCurrencyConfig(normCurr);
  const val = (Math.round(Number(amountMinor) || 0) / Math.pow(10, cfg.decimals)).toFixed(cfg.decimals);
  const symbol = normCurr === 'INR' ? 'Rs. ' : cfg.symbol;
  return `${symbol}${val}`;
}

/**
 * Pure vector PDF-1.4 generator for Invoices and Credit Notes.
 * Produces crisp, print-ready A4 documents with no external dependencies.
 */
class PdfDocumentBuilder {
  private pageWidth = 595.28;  // A4 standard width (pt)
  private pageHeight = 841.89; // A4 standard height (pt)
  private streamParts: string[] = [];

  constructor() {}

  addRect(x: number, y: number, w: number, h: number, fillColor?: [number, number, number], strokeColor?: [number, number, number], lineWidth = 1) {
    if (fillColor) {
      this.streamParts.push(`${fillColor[0]} ${fillColor[1]} ${fillColor[2]} rg`);
    }
    if (strokeColor) {
      this.streamParts.push(`${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG`);
      this.streamParts.push(`${lineWidth} w`);
    }
    const op = fillColor && strokeColor ? 'B' : fillColor ? 'f' : 'S';
    this.streamParts.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
  }

  addLine(x1: number, y1: number, x2: number, y2: number, strokeColor: [number, number, number] = [0.8, 0.8, 0.8], lineWidth = 1) {
    this.streamParts.push(`${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG`);
    this.streamParts.push(`${lineWidth} w`);
    this.streamParts.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  addText(
    text: string | number,
    x: number,
    y: number,
    options: {
      font?: '/F1' | '/F2'; // /F1 = Helvetica, /F2 = Helvetica-Bold
      size?: number;
      color?: [number, number, number];
      align?: 'left' | 'right' | 'center';
      maxWidth?: number;
    } = {}
  ) {
    const font = options.font || '/F1';
    const size = options.size || 10;
    const color = options.color || [0.1, 0.1, 0.1];
    const align = options.align || 'left';
    const escaped = escapePdfText(text);

    // Approximate text width estimation for alignment
    const charWidth = size * (font === '/F2' ? 0.58 : 0.52);
    const textWidth = escaped.length * charWidth;

    let targetX = x;
    if (align === 'right') {
      targetX = x - textWidth;
    } else if (align === 'center') {
      targetX = x - textWidth / 2;
    }

    this.streamParts.push('BT');
    this.streamParts.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    this.streamParts.push(`${font} ${size} Tf`);
    this.streamParts.push(`1 0 0 1 ${targetX.toFixed(2)} ${y.toFixed(2)} Tm`);
    this.streamParts.push(`(${escaped}) Tj`);
    this.streamParts.push('ET');
  }

  build(): Buffer {
    const contentStream = this.streamParts.join('\n');
    const streamLength = Buffer.byteLength(contentStream, 'utf-8');

    // Build PDF objects
    const objects: string[] = [];

    // Object 1: Catalog
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Object 2: Pages
    objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    // Object 3: Page
    objects.push(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`
    );

    // Object 4: Content Stream
    objects.push(
      `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`
    );

    // Object 5: Standard Font Helvetica
    objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

    // Object 6: Standard Font Helvetica-Bold
    objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

    // Calculate cross-reference table
    let offset = 9; // "%PDF-1.4\n"
    const xrefOffsets: number[] = [0]; // special 0 entry

    for (let i = 0; i < objects.length; i++) {
      xrefOffsets.push(offset);
      offset += Buffer.byteLength(objects[i], 'utf-8');
    }

    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      xref += `${String(xrefOffsets[i]).padStart(10, '0')} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;

    const pdfString = `%PDF-1.4\n${objects.join('')}${xref}${trailer}`;
    return Buffer.from(pdfString, 'binary');
  }
}

/**
 * Generate a professional, print-friendly A4 Invoice PDF.
 */
export function generateInvoicePdf(data: InvoicePdfData): Buffer {
  const doc = new PdfDocumentBuilder();
  const margin = 40;
  const contentWidth = 595.28 - margin * 2;
  let curY = 841.89 - margin; // 801.89

  // Header Brand Accent Bar
  doc.addRect(margin, curY, contentWidth, 3, [0.08, 0.25, 0.45]); // Dark Navy
  curY -= 20;

  // Title & Document Header
  const storeDisplayName = data.merchant.businessName || data.merchant.name || 'FeraSetu Store';
  doc.addText(storeDisplayName.toUpperCase(), margin, curY, { font: '/F2', size: 16, color: [0.08, 0.15, 0.25] });
  doc.addText('TAX INVOICE', margin + contentWidth, curY, { font: '/F2', size: 18, color: [0.08, 0.25, 0.45], align: 'right' });

  curY -= 16;
  doc.addText(`Invoice No: ${data.invoiceNumber}`, margin + contentWidth, curY, { font: '/F2', size: 10, color: [0.15, 0.2, 0.3], align: 'right' });

  // Store Address details (left)
  curY -= 4;
  let storeY = curY;
  if (data.merchant.address) {
    doc.addText(data.merchant.address, margin, storeY, { size: 9, color: [0.35, 0.4, 0.45] });
    storeY -= 13;
  }
  const locationLine = [data.merchant.city, data.merchant.state].filter(Boolean).join(', ');
  if (locationLine) {
    doc.addText(locationLine, margin, storeY, { size: 9, color: [0.35, 0.4, 0.45] });
    storeY -= 13;
  }
  if (data.merchant.phone) {
    doc.addText(`Phone: ${data.merchant.phone}`, margin, storeY, { size: 9, color: [0.35, 0.4, 0.45] });
    storeY -= 13;
  }
  if (data.merchant.gstin) {
    doc.addText(`GSTIN: ${data.merchant.gstin}`, margin, storeY, { font: '/F2', size: 9, color: [0.2, 0.3, 0.4] });
    storeY -= 13;
  }

  // Invoice Metadata (right)
  let metaY = curY;
  doc.addText(`Date: ${new Date(data.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, margin + contentWidth, metaY, { size: 9, color: [0.35, 0.4, 0.45], align: 'right' });
  metaY -= 13;
  doc.addText(`Order ID: #${data.orderId.slice(0, 10).toUpperCase()}`, margin + contentWidth, metaY, { size: 9, color: [0.35, 0.4, 0.45], align: 'right' });
  metaY -= 13;
  const payMethod = data.paymentMethod ? data.paymentMethod.toUpperCase() : 'OFFLINE';
  doc.addText(`Payment: ${payMethod} (${(data.paymentStatus || 'UNPAID').toUpperCase()})`, margin + contentWidth, metaY, { font: '/F2', size: 9, color: data.paymentStatus === 'paid' ? [0.05, 0.5, 0.25] : [0.75, 0.2, 0.1], align: 'right' });

  curY = Math.min(storeY, metaY) - 15;

  // Horizontal separator
  doc.addLine(margin, curY, margin + contentWidth, curY, [0.85, 0.88, 0.9]);
  curY -= 18;

  // Bill To / Customer Details Box
  doc.addRect(margin, curY - 45, contentWidth, 52, [0.97, 0.98, 0.99], [0.88, 0.9, 0.93]);
  doc.addText('BILL TO / CUSTOMER', margin + 12, curY - 8, { font: '/F2', size: 8, color: [0.45, 0.5, 0.55] });
  doc.addText(data.customer.name, margin + 12, curY - 22, { font: '/F2', size: 11, color: [0.1, 0.15, 0.2] });
  doc.addText(`Phone: ${data.customer.phone || 'N/A'}${data.customer.email ? '  |  Email: ' + data.customer.email : ''}`, margin + 12, curY - 34, { size: 9, color: [0.35, 0.4, 0.45] });
  if (data.customer.deliveryAddress) {
    doc.addText(`Address: ${data.customer.deliveryAddress}`, margin + 12, curY - 45, { size: 8.5, color: [0.35, 0.4, 0.45] });
  }

  curY -= 65;

  // Table Headers
  const colX = {
    item: margin + 10,
    qty: margin + 280,
    price: margin + 360,
    total: margin + contentWidth - 10,
  };

  doc.addRect(margin, curY - 14, contentWidth, 20, [0.1, 0.15, 0.25]);
  doc.addText('ITEM DESCRIPTION', colX.item, curY - 9, { font: '/F2', size: 8.5, color: [1, 1, 1] });
  doc.addText('QTY', colX.qty, curY - 9, { font: '/F2', size: 8.5, color: [1, 1, 1], align: 'center' });
  doc.addText('UNIT PRICE', colX.price, curY - 9, { font: '/F2', size: 8.5, color: [1, 1, 1], align: 'right' });
  doc.addText('TOTAL', colX.total, curY - 9, { font: '/F2', size: 8.5, color: [1, 1, 1], align: 'right' });

  curY -= 22;

  // Line items
  data.items.forEach((item, idx) => {
    const isAlt = idx % 2 === 1;
    if (isAlt) {
      doc.addRect(margin, curY - 10, contentWidth, 18, [0.98, 0.98, 0.99]);
    }

    const itemLabel = item.name + (item.variant ? ` (${item.variant})` : '');
    doc.addText(itemLabel.slice(0, 45), colX.item, curY - 5, { font: '/F2', size: 9, color: [0.15, 0.2, 0.25] });
    doc.addText(String(item.quantity), colX.qty, curY - 5, { size: 9, color: [0.3, 0.35, 0.4], align: 'center' });
    doc.addText(formatPdfMoney(item.unitPriceMinor, data.currency), colX.price, curY - 5, { size: 9, color: [0.3, 0.35, 0.4], align: 'right' });
    doc.addText(formatPdfMoney(item.totalMinor, data.currency), colX.total, curY - 5, { font: '/F2', size: 9, color: [0.1, 0.15, 0.2], align: 'right' });

    doc.addLine(margin, curY - 10, margin + contentWidth, curY - 10, [0.92, 0.93, 0.95]);
    curY -= 18;
  });

  curY -= 10;

  // Summary Table (right aligned)
  const summaryBoxWidth = 230;
  const summaryX = margin + contentWidth - summaryBoxWidth;
  const summaryLabelX = summaryX + 10;
  const summaryValX = margin + contentWidth - 10;

  doc.addRect(summaryX, curY - 85, summaryBoxWidth, 92, [0.98, 0.98, 0.99], [0.85, 0.88, 0.92]);

  doc.addText('Subtotal', summaryLabelX, curY - 12, { size: 9, color: [0.35, 0.4, 0.45] });
  doc.addText(formatPdfMoney(data.subtotalMinor, data.currency), summaryValX, curY - 12, { size: 9, color: [0.2, 0.25, 0.3], align: 'right' });

  curY -= 16;
  doc.addText('Delivery / Shipping', summaryLabelX, curY - 12, { size: 9, color: [0.35, 0.4, 0.45] });
  doc.addText(formatPdfMoney(data.deliveryFeeMinor || 0, data.currency), summaryValX, curY - 12, { size: 9, color: [0.2, 0.25, 0.3], align: 'right' });

  if (data.taxMinor && data.taxMinor > 0) {
    curY -= 16;
    doc.addText('Tax / GST', summaryLabelX, curY - 12, { size: 9, color: [0.35, 0.4, 0.45] });
    doc.addText(formatPdfMoney(data.taxMinor, data.currency), summaryValX, curY - 12, { size: 9, color: [0.2, 0.25, 0.3], align: 'right' });
  }

  if (data.discountMinor && data.discountMinor > 0) {
    curY -= 16;
    doc.addText('Discount', summaryLabelX, curY - 12, { size: 9, color: [0.35, 0.4, 0.45] });
    doc.addText(`-${formatPdfMoney(data.discountMinor, data.currency)}`, summaryValX, curY - 12, { size: 9, color: [0.8, 0.2, 0.1], align: 'right' });
  }

  curY -= 18;
  doc.addLine(summaryX + 5, curY - 5, summaryValX, curY - 5, [0.85, 0.88, 0.92]);
  doc.addText('Grand Total', summaryLabelX, curY - 14, { font: '/F2', size: 11, color: [0.08, 0.15, 0.25] });
  doc.addText(formatPdfMoney(data.totalMinor, data.currency), summaryValX, curY - 14, { font: '/F2', size: 12, color: [0.08, 0.25, 0.45], align: 'right' });

  // Notes if any
  if (data.notes) {
    const notesY = curY - 40;
    doc.addText('NOTES / SPECIAL INSTRUCTIONS', margin, notesY, { font: '/F2', size: 8, color: [0.45, 0.5, 0.55] });
    doc.addText(data.notes.slice(0, 100), margin, notesY - 12, { size: 8.5, color: [0.35, 0.4, 0.45] });
  }

  // Footer
  const footerY = margin + 25;
  doc.addLine(margin, footerY + 15, margin + contentWidth, footerY + 15, [0.85, 0.88, 0.9]);
  doc.addText('Powered by FeraSetu', margin + contentWidth / 2, footerY, { font: '/F2', size: 9, color: [0.35, 0.4, 0.45], align: 'center' });
  doc.addText('This is a computer-generated tax invoice and requires no physical signature.', margin + contentWidth / 2, footerY - 12, { size: 7.5, color: [0.6, 0.65, 0.7], align: 'center' });

  return doc.build();
}

/**
 * Generate a professional Credit Note PDF.
 */
export function generateCreditNotePdf(data: CreditNotePdfData): Buffer {
  const doc = new PdfDocumentBuilder();
  const margin = 40;
  const contentWidth = 595.28 - margin * 2;
  let curY = 841.89 - margin;

  // Header Brand Accent Bar (Brick red for Credit Notes)
  doc.addRect(margin, curY, contentWidth, 3, [0.75, 0.2, 0.15]);
  curY -= 20;

  // Store & Document Title
  const storeDisplayName = data.merchant.businessName || data.merchant.name || 'FeraSetu Store';
  doc.addText(storeDisplayName.toUpperCase(), margin, curY, { font: '/F2', size: 16, color: [0.08, 0.15, 0.25] });
  doc.addText('CREDIT NOTE', margin + contentWidth, curY, { font: '/F2', size: 18, color: [0.75, 0.2, 0.15], align: 'right' });

  curY -= 16;
  doc.addText(`Credit Note No: ${data.creditNoteNumber}`, margin + contentWidth, curY, { font: '/F2', size: 10, color: [0.15, 0.2, 0.3], align: 'right' });

  curY -= 4;
  let storeY = curY;
  if (data.merchant.address) {
    doc.addText(data.merchant.address, margin, storeY, { size: 9, color: [0.35, 0.4, 0.45] });
    storeY -= 13;
  }
  const locationLine = [data.merchant.city, data.merchant.state].filter(Boolean).join(', ');
  if (locationLine) {
    doc.addText(locationLine, margin, storeY, { size: 9, color: [0.35, 0.4, 0.45] });
    storeY -= 13;
  }
  if (data.merchant.phone) {
    doc.addText(`Phone: ${data.merchant.phone}`, margin, storeY, { size: 9, color: [0.35, 0.4, 0.45] });
    storeY -= 13;
  }

  let metaY = curY;
  doc.addText(`Date: ${new Date(data.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, margin + contentWidth, metaY, { size: 9, color: [0.35, 0.4, 0.45], align: 'right' });
  metaY -= 13;
  doc.addText(`Original Invoice: ${data.originalInvoiceNumber}`, margin + contentWidth, metaY, { font: '/F2', size: 9, color: [0.2, 0.3, 0.4], align: 'right' });
  metaY -= 13;
  doc.addText(`Original Order: #${data.originalOrderId.slice(0, 10).toUpperCase()}`, margin + contentWidth, metaY, { size: 9, color: [0.35, 0.4, 0.45], align: 'right' });

  curY = Math.min(storeY, metaY) - 15;
  doc.addLine(margin, curY, margin + contentWidth, curY, [0.85, 0.88, 0.9]);
  curY -= 18;

  // Credit Issued To
  doc.addRect(margin, curY - 45, contentWidth, 52, [0.99, 0.98, 0.98], [0.93, 0.88, 0.88]);
  doc.addText('CREDIT ISSUED TO', margin + 12, curY - 8, { font: '/F2', size: 8, color: [0.6, 0.3, 0.3] });
  doc.addText(data.customer.name, margin + 12, curY - 22, { font: '/F2', size: 11, color: [0.1, 0.15, 0.2] });
  doc.addText(`Phone: ${data.customer.phone || 'N/A'}${data.customer.email ? '  |  Email: ' + data.customer.email : ''}`, margin + 12, curY - 34, { size: 9, color: [0.35, 0.4, 0.45] });
  doc.addText(`Reason: ${data.reason}`, margin + 12, curY - 45, { font: '/F2', size: 8.5, color: [0.75, 0.2, 0.15] });

  curY -= 65;

  // Table Headers
  const colX = {
    item: margin + 10,
    qty: margin + 280,
    price: margin + 360,
    total: margin + contentWidth - 10,
  };

  doc.addRect(margin, curY - 14, contentWidth, 20, [0.25, 0.15, 0.15]);
  doc.addText('ADJUSTED / RETURNED ITEM', colX.item, curY - 9, { font: '/F2', size: 8.5, color: [1, 1, 1] });
  doc.addText('QTY', colX.qty, curY - 9, { font: '/F2', size: 8.5, color: [1, 1, 1], align: 'center' });
  doc.addText('UNIT PRICE', colX.price, curY - 9, { font: '/F2', size: 8.5, color: [1, 1, 1], align: 'right' });
  doc.addText('CREDIT AMOUNT', colX.total, curY - 9, { font: '/F2', size: 8.5, color: [1, 1, 1], align: 'right' });

  curY -= 22;

  data.items.forEach((item, idx) => {
    const isAlt = idx % 2 === 1;
    if (isAlt) {
      doc.addRect(margin, curY - 10, contentWidth, 18, [0.99, 0.98, 0.98]);
    }

    doc.addText(item.name.slice(0, 45), colX.item, curY - 5, { font: '/F2', size: 9, color: [0.15, 0.2, 0.25] });
    doc.addText(String(item.quantity), colX.qty, curY - 5, { size: 9, color: [0.3, 0.35, 0.4], align: 'center' });
    doc.addText(formatPdfMoney(item.unitPriceMinor, data.currency), colX.price, curY - 5, { size: 9, color: [0.3, 0.35, 0.4], align: 'right' });
    doc.addText(formatPdfMoney(item.totalMinor, data.currency), colX.total, curY - 5, { font: '/F2', size: 9, color: [0.75, 0.2, 0.15], align: 'right' });

    doc.addLine(margin, curY - 10, margin + contentWidth, curY - 10, [0.92, 0.93, 0.95]);
    curY -= 18;
  });

  curY -= 10;

  // Summary box
  const summaryBoxWidth = 230;
  const summaryX = margin + contentWidth - summaryBoxWidth;
  const summaryLabelX = summaryX + 10;
  const summaryValX = margin + contentWidth - 10;

  doc.addRect(summaryX, curY - 70, summaryBoxWidth, 75, [0.99, 0.98, 0.98], [0.92, 0.85, 0.85]);

  doc.addText('Taxable Adjustment', summaryLabelX, curY - 12, { size: 9, color: [0.35, 0.4, 0.45] });
  doc.addText(formatPdfMoney(data.taxableValueMinor, data.currency), summaryValX, curY - 12, { size: 9, color: [0.2, 0.25, 0.3], align: 'right' });

  curY -= 16;
  doc.addText('Tax Adjustment', summaryLabelX, curY - 12, { size: 9, color: [0.35, 0.4, 0.45] });
  doc.addText(formatPdfMoney(data.taxAdjustmentMinor, data.currency), summaryValX, curY - 12, { size: 9, color: [0.2, 0.25, 0.3], align: 'right' });

  curY -= 18;
  doc.addLine(summaryX + 5, curY - 5, summaryValX, curY - 5, [0.9, 0.82, 0.82]);
  doc.addText('Total Credit', summaryLabelX, curY - 14, { font: '/F2', size: 11, color: [0.1, 0.15, 0.2] });
  doc.addText(formatPdfMoney(data.totalCreditMinor, data.currency), summaryValX, curY - 14, { font: '/F2', size: 12, color: [0.75, 0.2, 0.15], align: 'right' });

  // Footer
  const footerY = margin + 25;
  doc.addLine(margin, footerY + 15, margin + contentWidth, footerY + 15, [0.85, 0.88, 0.9]);
  doc.addText('Powered by FeraSetu', margin + contentWidth / 2, footerY, { font: '/F2', size: 9, color: [0.35, 0.4, 0.45], align: 'center' });
  doc.addText('This credit note is issued against original invoice. Keep for tax reconciliation.', margin + contentWidth / 2, footerY - 12, { size: 7.5, color: [0.6, 0.65, 0.7], align: 'center' });

  return doc.build();
}

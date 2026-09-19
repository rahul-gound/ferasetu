import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Mail,
  Receipt,
  Building2,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface InvoiceModalOrder {
  id: string;
  user_id?: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  customer_email?: string;
  customerEmail?: string;
  customer_address?: string;
  delivery_address?: string;
  deliveryAddress?: string;
  delivery_type?: string;
  deliveryType?: string;
  status?: string;
  payment_status?: string;
  paymentStatus?: string;
  payment_method?: string;
  paymentMethod?: string;
  currency?: string;
  subtotal?: number;
  subtotal_minor?: number;
  delivery_fee?: number;
  delivery_fee_minor?: number;
  tax?: number;
  tax_minor?: number;
  discount?: number;
  discount_minor?: number;
  total?: number;
  total_minor?: number;
  invoice_number?: string;
  invoiceNumber?: string;
  created_at?: string;
  items?: Array<{
    product_id?: string;
    productId?: string;
    id?: string;
    name?: string;
    product_name?: string;
    quantity?: number;
    price?: number;
    unit_price_minor?: number;
    total?: number;
    total_minor?: number;
    variant?: string;
  }>;
  notes?: string;
  tracking_token?: string;
}

export interface InvoiceDocumentData {
  id: string;
  invoice_number: string;
  order_id: string;
  issued_at: string;
  order_date?: string;
  currency: string;
  status: string;
  payment_method: string;
  payment_status: string;
  order_status?: string;
  merchant: {
    id?: string;
    name?: string;
    business_name?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    logo_url?: string | null;
  };
  customer: {
    name?: string;
    phone?: string;
    email?: string;
    delivery_address?: string;
    delivery_type?: string;
  };
  items: Array<{
    product_id?: string;
    name: string;
    quantity: number;
    price?: number;
    unit_price_minor?: number;
    total?: number;
    total_minor?: number;
  }>;
  subtotal: number;
  subtotal_minor?: number;
  delivery_fee: number;
  delivery_fee_minor?: number;
  tax: number;
  tax_minor?: number;
  discount?: number;
  discount_minor?: number;
  total: number;
  total_minor?: number;
  amount_paid_minor?: number;
  balance_due_minor?: number;
  notes?: string;
}

interface InvoiceDocumentModalProps {
  order: InvoiceModalOrder;
  onClose: () => void;
  merchantName?: string;
  merchantLogo?: string | null;
  onPaymentUpdate?: (id: string, status: string) => void;
  onVerifyOtp?: (id: string, otp: string) => void;
  isCustomerView?: boolean;
  trackingToken?: string;
}

export function formatCurrencyValue(amount: number | undefined | null, currency: string = 'INR'): string {
  const num = Number(amount) || 0;
  const curr = (currency || 'INR').toUpperCase();
  
  if (curr === 'INR') {
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (curr === 'USD') {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (curr === 'EUR') {
    return `€${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (curr === 'GBP') {
    return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${curr} ${num.toFixed(2)}`;
}

export default function InvoiceDocumentModal({
  order,
  onClose,
  merchantName,
  merchantLogo,
  onPaymentUpdate,
  onVerifyOtp,
  isCustomerView = false,
  trackingToken,
}: InvoiceDocumentModalProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceDocumentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const invoiceRef = useRef<HTMLDivElement>(null);

  const effectiveToken = trackingToken || order.tracking_token || '';

  useEffect(() => {
    let isMounted = true;
    const fetchInvoiceDetails = async () => {
      setLoading(true);
      try {
        let endpoint = '';
        if (isCustomerView) {
          if (effectiveToken) {
            endpoint = `/orders/public/${order.id}/invoice?token=${encodeURIComponent(effectiveToken)}`;
          } else {
            endpoint = `/storefront/customer/orders/${order.id}/invoice`;
          }
        } else {
          endpoint = `/orders/${order.id}/invoice`;
        }

        const headers: Record<string, string> = {};
        const customerToken = typeof window !== 'undefined' ? localStorage.getItem('fs_customer_session_token') : null;
        if (isCustomerView && customerToken) {
          headers['X-Customer-Session'] = customerToken;
        }

        const res = await api.get(endpoint, { headers });
        if (isMounted && res.data?.invoice) {
          setInvoiceData(res.data.invoice);
        }
      } catch {
        // Fallback to order prop if dedicated invoice fetch returns 404/unsupported
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInvoiceDetails();
    return () => {
      isMounted = false;
    };
  }, [order.id, isCustomerView, effectiveToken]);

  const currency = invoiceData?.currency || order.currency || 'INR';
  const invoiceNum = invoiceData?.invoice_number || order.invoice_number || order.invoiceNumber || `INV-${order.id.slice(-8).toUpperCase()}`;
  const issueDateStr = invoiceData?.issued_at || order.created_at || new Date().toISOString();
  const invoiceDate = new Date(issueDateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const orderDate = new Date(order.created_at || issueDateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const paymentStatus = (invoiceData?.payment_status || order.payment_status || order.paymentStatus || 'unpaid').toLowerCase();
  const paymentMethod = (invoiceData?.payment_method || order.payment_method || order.paymentMethod || 'offline').toUpperCase();

  const customerName = invoiceData?.customer?.name || order.customer_name || order.customerName || 'Guest Customer';
  const customerPhone = invoiceData?.customer?.phone || order.customer_phone || order.customerPhone || '';
  const customerEmail = invoiceData?.customer?.email || order.customer_email || order.customerEmail || '';
  const deliveryAddress = invoiceData?.customer?.delivery_address || order.delivery_address || order.deliveryAddress || order.customer_address || '';
  const deliveryType = invoiceData?.customer?.delivery_type || order.delivery_type || order.deliveryType || 'delivery';

  const merchantDisplay = {
    name: invoiceData?.merchant?.business_name || invoiceData?.merchant?.name || merchantName || 'FeraSetu Merchant Store',
    address: invoiceData?.merchant?.address || [invoiceData?.merchant?.city, invoiceData?.merchant?.state].filter(Boolean).join(', ') || '',
    phone: invoiceData?.merchant?.phone || '',
    email: invoiceData?.merchant?.email || '',
    gstin: invoiceData?.merchant?.gstin || '',
    logo: invoiceData?.merchant?.logo_url || merchantLogo || null,
  };

  const lineItems = invoiceData?.items?.length
    ? invoiceData.items
    : (order.items || []).map((it) => ({
        name: it.name || it.product_name || 'Item',
        quantity: it.quantity || 1,
        price: it.price || 0,
        total: (it.quantity || 1) * (it.price || 0),
      }));

  const subtotal = typeof invoiceData?.subtotal === 'number'
    ? invoiceData.subtotal
    : (typeof order.subtotal === 'number'
      ? order.subtotal
      : lineItems.reduce((acc, it) => acc + ((it.price || 0) * (it.quantity || 1)), 0));

  const deliveryFee = typeof invoiceData?.delivery_fee === 'number'
    ? invoiceData.delivery_fee
    : (typeof order.delivery_fee === 'number'
      ? order.delivery_fee
      : (deliveryType === 'delivery' ? 30 : 0));

  const tax = typeof invoiceData?.tax === 'number' ? invoiceData.tax : (order.tax || 0);
  const discount = typeof invoiceData?.discount === 'number' ? invoiceData.discount : (order.discount || 0);
  const grandTotal = typeof invoiceData?.total === 'number'
    ? invoiceData.total
    : (typeof order.total === 'number' ? order.total : (subtotal + deliveryFee + tax - discount));

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      let downloadUrl = '';
      if (isCustomerView && effectiveToken) {
        downloadUrl = `${API_BASE}/orders/public/${order.id}/invoice/pdf?token=${encodeURIComponent(effectiveToken)}`;
        window.open(downloadUrl, '_blank');
        const url = isCustomerView
          ? `${API_BASE}/storefront/customer/orders/${order.id}/invoice/pdf`
          : `${API_BASE}/orders/${order.id}/invoice/pdf`;

        const headers: Record<string, string> = {};
        const customerToken = typeof window !== 'undefined' ? localStorage.getItem('fs_customer_session_token') : null;
        if (isCustomerView && customerToken) {
          headers['X-Customer-Session'] = customerToken;
        }

        const response = await api.get(url, { responseType: 'blob', headers });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `invoice-${invoiceNum}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success('Invoice PDF downloaded');
    } catch {
      toast.error('Failed to download invoice PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="invoice-modal-backdrop fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .invoice-printable-card, .invoice-printable-card * {
            visibility: visible !important;
          }
          .invoice-printable-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .invoice-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        ref={invoiceRef}
        className="invoice-printable-card bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Header Bar */}
        <div className="bg-[#004E89] text-white px-6 py-5 flex items-start justify-between border-b-4 border-[#FF6B35]">
          <div>
            <div className="flex items-center gap-2">
              <Receipt size={22} className="text-[#FF6B35]" />
              <span className="text-xl font-black tracking-wide uppercase">TAX INVOICE</span>
            </div>
            <p className="text-xs text-blue-100/80 mt-1 font-mono">
              Invoice #{invoiceNum}
            </p>
          </div>
          <div className="flex items-center gap-2 invoice-no-print">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Handshake Panel for merchant verification if unpaid */}
        {!isCustomerView && onVerifyOtp && paymentStatus !== 'paid' && (
          <div className="invoice-no-print m-5 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={18} className="text-[#FF6B35]" />
              <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                Order Delivery & Payment Verification
              </span>
            </div>
            <p className="text-xs text-orange-800 mb-3">
              Ask the customer for their delivery code or payment OTP to verify and mark complete.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Code / OTP"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-white border border-orange-300 rounded-lg outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
              <button
                type="button"
                onClick={() => onVerifyOtp(order.id, otpValue)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#FF6B35] hover:bg-orange-600 rounded-lg transition-colors cursor-pointer"
              >
                Verify
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Printable Document Body */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 text-xs">
          {/* Header info: From Merchant & Document Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
            {/* Merchant Details */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Seller / From
              </span>
              {merchantDisplay.logo && (
                <img
                  src={merchantDisplay.logo}
                  alt={merchantDisplay.name}
                  className="h-8 max-w-[140px] object-contain mb-1.5"
                />
              )}
              <h3 className="text-sm font-bold text-slate-900">{merchantDisplay.name}</h3>
              {merchantDisplay.address && (
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {merchantDisplay.address}
                </p>
              )}
              {merchantDisplay.phone && (
                <p className="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5">
                  <Phone size={11} className="text-slate-400" />
                  <span>{merchantDisplay.phone}</span>
                </p>
              )}
              {merchantDisplay.email && (
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Email: {merchantDisplay.email}
                </p>
              )}
              {merchantDisplay.gstin && (
                <p className="font-mono text-[11px] text-slate-700 font-semibold mt-1">
                  GSTIN: {merchantDisplay.gstin}
                </p>
              )}
            </div>

            {/* Document & Order Metadata */}
            <div className="sm:text-right space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Invoice Details
              </span>
              <div className="space-y-0.5 pt-0.5">
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Invoice Date: </span>
                  {invoiceDate}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Order Reference: </span>
                  <span className="font-mono font-bold text-slate-900">
                    #{order.id.slice(0, 10).toUpperCase()}
                  </span>
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Order Date: </span>
                  {orderDate}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Payment Method: </span>
                  <span className="font-bold text-slate-800">{paymentMethod}</span>
                </p>
                <div className="inline-flex items-center gap-1.5 mt-1 sm:justify-end">
                  <span className="font-semibold text-slate-700">Status: </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {paymentStatus === 'paid' ? (
                      <>
                        <CheckCircle2 size={10} /> Paid
                      </>
                    ) : (
                      <>
                        <Clock size={10} /> Unpaid
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To Customer Information */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
              Bill To / Delivery Customer
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{customerName}</p>
                {customerPhone && (
                  <p className="text-slate-600 text-[11px] mt-0.5">Phone: {customerPhone}</p>
                )}
                {customerEmail && (
                  <p className="text-slate-600 text-[11px]">Email: {customerEmail}</p>
                )}
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase">
                  Delivery Type: <span className="text-slate-800 font-bold capitalize">{deliveryType}</span>
                </p>
                {deliveryAddress && (
                  <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                    <span className="font-semibold text-slate-700">Address: </span>
                    {deliveryAddress}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Product Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[11px] text-slate-500 font-bold uppercase">
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lineItems.map((item, idx) => {
                  const unitPrice = item.price || 0;
                  const qty = item.quantity || 1;
                  const total = item.total ?? unitPrice * qty;
                  return (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                        {qty}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                        {formatCurrencyValue(unitPrice, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrencyValue(total, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes Section */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-6">
            {/* Notes on the left */}
            <div className="flex-1 space-y-2">
              {order.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                    Order Notes
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrencyValue(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping / Delivery</span>
                <span className="font-mono">
                  {deliveryFee > 0 ? formatCurrencyValue(deliveryFee, currency) : 'Free'}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax / GST</span>
                  <span className="font-mono">{formatCurrencyValue(tax, currency)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrencyValue(discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-200">
                <span>Grand Total</span>
                <span className="text-[#004E89] font-mono">
                  {formatCurrencyValue(grandTotal, currency)}
                </span>
              </div>
              {paymentStatus !== 'paid' && (
                <div className="flex justify-between text-[11px] text-amber-800 font-bold pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrencyValue(grandTotal, currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Branding */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[10px] gap-2">
            <div className="flex items-center gap-1 font-semibold text-slate-500">
              <span>Powered by</span>
              <span className="text-[#004E89] font-black">Fera</span>
              <span className="text-[#FF6B35] font-black">Setu</span>
            </div>
            <p className="text-center sm:text-right">
              Computer-generated tax invoice. No physical signature required.
            </p>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="invoice-no-print bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {!isCustomerView && onPaymentUpdate && paymentStatus !== 'paid' && (
              <button
                type="button"
                onClick={() => onPaymentUpdate(order.id, 'paid')}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={14} /> Mark as Paid
              </button>
            )}
            {!isCustomerView && (
              <button
                type="button"
                onClick={async () => {
                  const email = window.prompt('Send invoice to email:', customerEmail || '');
                  if (!email) return;
                  try {
                    await api.post(`/orders/${order.id}/invoice/send`, { email });
                    toast.success(`Invoice sent to ${email}`);
                  } catch (err: any) {
                    toast.error(err.response?.data?.error || 'Failed to send invoice');
                  }
                }}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Mail size={14} /> Email Invoice
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-2 rounded-xl bg-[#004E89] hover:bg-[#003B66] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download size={14} /> {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

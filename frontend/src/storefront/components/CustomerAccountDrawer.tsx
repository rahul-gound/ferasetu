import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  X, Package, LogOut, ChevronRight, ShoppingBag, ArrowLeft, Download,
  Ban, RotateCcw, Truck, MapPin, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';
import InvoiceDocumentModal from '../../components/orders/InvoiceDocumentModal';

const rawApi = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const API = rawApi.endsWith('/api') ? rawApi : `${rawApi}/api`;

export default function CustomerAccountDrawer() {
  const {
    isCustomerAccountOpen,
    closeCustomerAccount,
    customer,
    logoutCustomer,
    customerOrders,
    fetchCustomerOrders,
    selectedCustomerOrder,
    setSelectedCustomerOrder,
    currencySymbol,
    shopName,
    shopId,
  } = useStorefront();

  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [returnReason, setReturnReason] = useState('');
  const [selectedReturnItems, setSelectedReturnItems] = useState<Record<string, number>>({});
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [viewingInvoiceOrder, setViewingInvoiceOrder] = useState<any>(null);

  useEffect(() => {
    if (isCustomerAccountOpen && customer) {
      fetchCustomerOrders();
    }
  }, [isCustomerAccountOpen, customer, fetchCustomerOrders]);

  if (!isCustomerAccountOpen || !customer) return null;

  const getHeaders = () => {
    const token = localStorage.getItem('fs_customer_session_token');
    return {
      'X-Shop-Slug': shopName,
      'X-Organization-Id': shopId,
      ...(token ? { 'X-Customer-Session': token } : {}),
    };
  };

  const handleDownloadInvoicePdf = (order: any) => {
    const token = order.tracking_token || '';
    const invoiceUrl = `${API}/orders/public/${order.id}/invoice/pdf?token=${encodeURIComponent(token)}`;
    window.open(invoiceUrl, '_blank');
  };

  const handleCancelOrder = async () => {
    if (!selectedCustomerOrder) return;
    setIsCancelling(true);
    setActionError(null);
    try {
      await axios.post(
        `${API}/storefront/customer/orders/${selectedCustomerOrder.id}/cancel`,
        { reason: cancelReason || 'Customer requested cancellation' },
        { headers: getHeaders(), withCredentials: true }
      );
      setActionSuccess('Order cancelled successfully.');
      setShowCancelModal(false);
      setCancelReason('');
      await fetchCustomerOrders();
      setSelectedCustomerOrder((prev: any) => prev ? { ...prev, status: 'cancelled', cancellation_status: 'cancelled', cancellation_reason: cancelReason } : null);
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRequestReturn = async () => {
    if (!selectedCustomerOrder) return;
    setIsSubmittingReturn(true);
    setActionError(null);

    const itemsToReturn = Object.entries(selectedReturnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([idOrName, qty]) => {
        const item = (selectedCustomerOrder.items || []).find((i: any) => (i.productId || i.product_id || i.name) === idOrName);
        return {
          productId: item?.productId || item?.product_id,
          name: item?.name || idOrName,
          quantity: qty,
          reason: returnReason,
        };
      });

    if (itemsToReturn.length === 0) {
      setActionError('Please select at least one item to return.');
      setIsSubmittingReturn(false);
      return;
    }

    try {
      await axios.post(
        `${API}/storefront/customer/orders/${selectedCustomerOrder.id}/return`,
        { items: itemsToReturn, reason: returnReason || 'Defective or not as described' },
        { headers: getHeaders(), withCredentials: true }
      );
      setActionSuccess('Return request submitted. The store merchant will review it.');
      setShowReturnModal(false);
      setReturnReason('');
      setSelectedReturnItems({});
      await fetchCustomerOrders();
      setSelectedCustomerOrder((prev: any) => prev ? { ...prev, return_status: 'requested' } : null);
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to submit return request');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={closeCustomerAccount}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slideLeft">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            {selectedCustomerOrder ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerOrder(null);
                    setActionError(null);
                    setActionSuccess(null);
                  }}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Back to all orders"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedCustomerOrder.invoice_number || `Order #${selectedCustomerOrder.id.slice(0, 8).toUpperCase()}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Placed on {new Date(selectedCustomerOrder.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  {(customer.name || customer.email)[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                    {customer.name || 'Store Patron'}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{customer.email}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={closeCustomerAccount}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {actionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {selectedCustomerOrder ? (
              /* Single Order Detailed View */
              <div className="space-y-4">
                {/* Status card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full uppercase ${
                      selectedCustomerOrder.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedCustomerOrder.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : selectedCustomerOrder.status === 'confirmed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedCustomerOrder.status}
                    </span>
                  </div>

                  {selectedCustomerOrder.cancellation_status === 'cancelled' && (
                    <div className="pt-2 border-t border-slate-200 text-xs text-red-700">
                      <span className="font-bold">Cancellation Reason:</span> {selectedCustomerOrder.cancellation_reason || 'Order cancelled'}
                    </div>
                  )}

                  {selectedCustomerOrder.refunded_amount_minor > 0 && (
                    <div className="pt-2 border-t border-slate-200 text-xs text-emerald-700 font-bold flex items-center justify-between">
                      <span>Refunded Amount:</span>
                      <span>{currencySymbol}{(selectedCustomerOrder.refunded_amount_minor / 100).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Handshake Code */}
                {selectedCustomerOrder.status !== 'delivered' && selectedCustomerOrder.status !== 'cancelled' && (
                  <div className="p-3.5 bg-orange-50/80 border border-orange-200 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-orange-900 uppercase">
                      {selectedCustomerOrder.delivery_type === 'delivery' ? 'Delivery Security Code' : 'Pickup OTP'}
                    </div>
                    <div className="text-xl font-black text-orange-600 tracking-wider">
                      {selectedCustomerOrder.delivery_code || (typeof selectedCustomerOrder.notes === 'string' ? selectedCustomerOrder.notes.match(/Code:\s*([A-Z0-9]+)/i)?.[1] : null) || '---'}
                    </div>
                    <div className="text-[11px] text-orange-700">
                      Show this code to the delivery partner or shopkeeper upon receiving your items.
                    </div>
                  </div>
                )}

                {/* Items breakdown */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Items in Order</h4>
                  <div className="divide-y divide-slate-100">
                    {(selectedCustomerOrder.items || []).map((it: any, idx: number) => {
                      const isNonReturnable = it.is_returnable === false || it.is_returnable === 0 || it.non_returnable === true;
                      return (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span>{it.name || it.product_name}</span>
                              {isNonReturnable && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                  🚫 Non-returnable
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500">Qty: {it.quantity} × {currencySymbol}{it.price?.toLocaleString()}</div>
                          </div>
                          <div className="font-bold text-slate-900">
                            {currencySymbol}{((it.quantity || 1) * (it.price || 0)).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{currencySymbol}{(selectedCustomerOrder.subtotal || Math.max(0, selectedCustomerOrder.total - (selectedCustomerOrder.delivery_fee ?? 30))).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span>{selectedCustomerOrder.delivery_type === 'pickup' ? 'Free' : `${currencySymbol}${selectedCustomerOrder.delivery_fee ?? 30}`}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total</span>
                      <span className="text-[#0052FF]">{currencySymbol}{selectedCustomerOrder.total?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingInvoiceOrder(selectedCustomerOrder)}
                      className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-blue-200"
                    >
                      <FileText size={15} />
                      <span>View Invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoicePdf(selectedCustomerOrder)}
                      className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Download size={15} />
                      <span>Download PDF</span>
                    </button>
                  </div>

                  {/* Cancel Order Action */}
                  {['pending', 'confirmed'].includes(selectedCustomerOrder.status) && (
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="w-full py-2 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Ban size={14} />
                      <span>Cancel Order</span>
                    </button>
                  )}

                  {/* Return Request Action */}
                  {selectedCustomerOrder.status === 'delivered' && selectedCustomerOrder.return_status !== 'requested' && (
                    (() => {
                      const returnableItems = (selectedCustomerOrder.items || []).filter((i: any) =>
                        i.is_returnable !== false && i.is_returnable !== 0 && i.non_returnable !== true
                      );
                      const hasReturnable = returnableItems.length > 0;
                      return (
                        <div className="space-y-1">
                          <button
                            type="button"
                            disabled={!hasReturnable}
                            onClick={() => {
                              if (!hasReturnable) return;
                              const initItems: Record<string, number> = {};
                              returnableItems.forEach((i: any) => {
                                initItems[i.productId || i.product_id || i.name] = i.quantity || 1;
                              });
                              setSelectedReturnItems(initItems);
                              setShowReturnModal(true);
                            }}
                            className={`w-full py-2 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                              hasReturnable
                                ? 'border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
                                : 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                            }`}
                          >
                            <RotateCcw size={14} />
                            <span>{hasReturnable ? 'Request Item Return' : 'All Items Non-Returnable'}</span>
                          </button>
                          {!hasReturnable && (
                            <p className="text-[11px] text-center text-slate-400">
                              Items in this order are designated non-returnable by store policy.
                            </p>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Cancel Modal Form */}
                {showCancelModal && (
                  <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-3">
                    <div className="font-bold text-xs text-red-900">Cancel this order?</div>
                    <textarea
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Please provide reason for cancellation (e.g. ordered by mistake, found alternative)..."
                      className="w-full text-xs p-2.5 rounded-lg border border-red-200 bg-white outline-none focus:ring-2 focus:ring-red-400"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
                        className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors"
                      >
                        {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(false)}
                        className="py-1.5 px-3 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-100"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Return Modal Form */}
                {showReturnModal && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="font-bold text-xs text-slate-900">Select items to return:</div>
                    <div className="space-y-2">
                      {(selectedCustomerOrder.items || []).map((it: any, idx: number) => {
                        const key = it.productId || it.product_id || it.name;
                        const currentQty = selectedReturnItems[key] || 0;
                        const isNonReturnable = it.is_returnable === false || it.is_returnable === 0 || it.non_returnable === true;
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white rounded-lg border border-slate-200">
                            <div>
                              <span className="font-medium text-slate-800">{it.name || it.product_name}</span>
                              {isNonReturnable && (
                                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  🚫 Non-returnable
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isNonReturnable ? (
                                <span className="text-[11px] font-medium text-slate-400 italic">Not eligible</span>
                              ) : (
                                <>
                                  <span className="text-slate-400">Qty:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={it.quantity || 1}
                                    value={currentQty}
                                    onChange={e => setSelectedReturnItems(prev => ({ ...prev, [key]: Math.min(it.quantity || 1, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                    className="w-14 p-1 border border-slate-200 rounded text-center text-xs"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <textarea
                      value={returnReason}
                      onChange={e => setReturnReason(e.target.value)}
                      placeholder="Reason for return (defective, wrong item, damaged in transit)..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-400"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRequestReturn}
                        disabled={isSubmittingReturn}
                        className="flex-1 py-1.5 bg-[#0052FF] hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
                      >
                        {isSubmittingReturn ? 'Submitting...' : 'Submit Return Request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReturnModal(false)}
                        className="py-1.5 px-3 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* All Orders List View */
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} className="text-slate-500" />
                    Your Orders ({customerOrders.length})
                  </h4>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    <ShoppingBag size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No orders yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      When you place orders at {shopName || 'this store'}, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => setSelectedCustomerOrder(order)}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-slate-900">
                            {order.invoice_number || `Order #${order.id.slice(0, 8)}`}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            order.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.status === 'confirmed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : order.status === 'cancelled'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          <span className="font-bold text-slate-900">
                            {currencySymbol}{order.total?.toLocaleString()}
                          </span>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                            <span className="truncate max-w-[240px]">
                              {order.items.map((i: any) => `${i.quantity || 1}x ${i.name || i.product_name}`).join(', ')}
                            </span>
                            <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer with Logout */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Customer session secure
            </span>
            <button
              type="button"
              onClick={logoutCustomer}
              className="py-1.5 px-3 rounded-lg border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {viewingInvoiceOrder && (
        <InvoiceDocumentModal
          order={viewingInvoiceOrder}
          onClose={() => setViewingInvoiceOrder(null)}
          isCustomerView={true}
          trackingToken={viewingInvoiceOrder.tracking_token}
          merchantName={shopName}
        />
      )}
    </div>
  );
}


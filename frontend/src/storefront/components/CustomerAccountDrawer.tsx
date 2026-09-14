import React, { useEffect } from 'react';
import { X, Package, LogOut, User, Clock, CheckCircle2, ChevronRight, ShoppingBag } from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';

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
  } = useStorefront();

  useEffect(() => {
    if (isCustomerAccountOpen && customer) {
      fetchCustomerOrders();
    }
  }, [isCustomerAccountOpen, customer, fetchCustomerOrders]);

  if (!isCustomerAccountOpen || !customer) return null;

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
            <button
              type="button"
              onClick={closeCustomerAccount}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Orders Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                          {order.items.map((i: any) => `${i.quantity || 1}x ${i.name}`).join(', ')}
                        </span>
                        <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
    </div>
  );
}

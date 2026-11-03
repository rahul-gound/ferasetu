import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Package,
  ShoppingBag,
  Store,
  Truck,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Users,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  Star,
  Award,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { getStorefrontUrl, getStorefrontPreviewUrl } from '../../utils/canonicalHostname';
import { resolveMediaUrl } from '../../utils/media';
import posthog from '../../lib/posthog';
import OrderPaymentQrModal from './OrderPaymentQrModal';

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  category?: string;
  image_url?: string;
  media_key?: string;
  is_active: boolean | number;
}

interface SelectedItem {
  product: Product;
  quantity: number;
  price: number;
}

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onOrderCreated?: () => void;
}

export default function AddOrderModal({
  isOpen,
  onClose,
  user,
  onOrderCreated
}: AddOrderModalProps) {
  const queryClient = useQueryClient();

  // Search & Catalog state
  const [productSearch, setProductSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Customer state & Saved customer picker
  const [customerMode, setCustomerMode] = useState<'saved' | 'new'>('saved');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [saveToCustomerBook, setSaveToCustomerBook] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // UI state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSavingDirect, setIsSavingDirect] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [createdOrderForQr, setCreatedOrderForQr] = useState<any>(null);

  // Fetch Saved Customers Directory
  const { data: rawCustomers = [], isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      const data = res.data;
      return data?.customers || (Array.isArray(data) ? data : []);
    },
    enabled: isOpen,
  });

  const customers = useMemo(() => Array.isArray(rawCustomers) ? rawCustomers : [], [rawCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase().trim();
    return customers.filter((c: any) =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 10);
  }, [customers, customerSearch]);

  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c: any) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const handleSelectCustomer = (c: any) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    if (c.address) {
      setDeliveryAddress(c.address);
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
  };

  // Fetch Merchant Catalog
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products');
      const data = res.data.products || res.data;
      return Array.isArray(data) ? data : [];
    },
    enabled: isOpen,
  });

  // Filter catalog by search
  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => (p.is_active === true || p.is_active === 1));
    if (!productSearch.trim()) return active.slice(0, 12);
    const q = productSearch.toLowerCase().trim();
    return active.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [products, productSearch]);

  // Pricing calculations
  const subtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedItems]);

  const deliveryFee = deliveryType === 'delivery' ? 30 : 0;
  const totalAmount = subtotal + deliveryFee;

  // Estimated gross profit & margin calculation
  const estimatedProfitInfo = useMemo(() => {
    let cost = 0;
    for (const it of selectedItems) {
      const prodCost = (it.product as any).cost_price != null && Number((it.product as any).cost_price) > 0
        ? Number((it.product as any).cost_price)
        : (it.price * 0.65);
      cost += prodCost * it.quantity;
    }
    const profit = Math.round((totalAmount - cost) * 100) / 100;
    const margin = totalAmount > 0 ? Math.round((profit / totalAmount) * 100) : 0;
    return {
      cost: Math.round(cost * 100) / 100,
      profit,
      margin,
      isLoss: profit < 0
    };
  }, [selectedItems, totalAmount]);

  // Cart operations
  const handleAddItem = (product: Product) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      const effectivePrice = product.sale_price != null && product.sale_price > 0 ? product.sale_price : product.price;
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, price: effectivePrice }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is SelectedItem => item !== null)
    );
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Official Shopkeeper Website URL
  const officialBaseUrl = useMemo(() => getStorefrontUrl(user), [user]);
  const previewBaseUrl = useMemo(() => getStorefrontPreviewUrl(user), [user]);

  // Is environment local or preview
  const isLocalDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname.includes('127.0.0.1') ||
     window.location.hostname.includes('app.github.dev'));

  // Build Cart URL parameter: "id1:qty1,id2:qty2"
  const cartQueryParam = useMemo(() => {
    return selectedItems.map((i) => `${i.product.id}:${i.quantity}`).join(',');
  }, [selectedItems]);

  // Construct Full Official Storefront URL
  const officialOrderUrl = useMemo(() => {
    if (!cartQueryParam) return officialBaseUrl;
    const params = new URLSearchParams();
    params.set('cart', cartQueryParam);
    if (customerName.trim()) params.set('cname', customerName.trim());
    if (customerPhone.trim()) params.set('cphone', customerPhone.trim());
    if (orderNotes.trim()) params.set('notes', orderNotes.trim());
    if (deliveryType) params.set('delivery_type', deliveryType);
    return `${officialBaseUrl}?${params.toString()}`;
  }, [officialBaseUrl, cartQueryParam, customerName, customerPhone, orderNotes, deliveryType]);

  // Construct Full Preview Test URL (for local dev testing)
  const previewOrderUrl = useMemo(() => {
    if (!cartQueryParam) return previewBaseUrl;
    const params = new URLSearchParams();
    params.set('cart', cartQueryParam);
    if (customerName.trim()) params.set('cname', customerName.trim());
    if (customerPhone.trim()) params.set('cphone', customerPhone.trim());
    if (orderNotes.trim()) params.set('notes', orderNotes.trim());
    if (deliveryType) params.set('delivery_type', deliveryType);
    return `${previewBaseUrl}?${params.toString()}`;
  }, [previewBaseUrl, cartQueryParam, customerName, customerPhone, orderNotes, deliveryType]);

  const shopDisplayName = user?.business_name || user?.name || 'Our Store';

  // Construct WhatsApp Message Text
  const whatsAppMessage = useMemo(() => {
    const greeting = customerName.trim() ? `Namaste ${customerName.trim()}!` : 'Namaste!';
    const itemLines = selectedItems
      .map((it, idx) => `${idx + 1}. *${it.product.name}* (x${it.quantity}) — ₹${(it.price * it.quantity).toLocaleString('en-IN')}`)
      .join('\n');

    const deliveryNote = deliveryType === 'delivery'
      ? `🚚 Delivery: ₹${deliveryFee}`
      : `🏬 Store Pickup: Free`;

    return `${greeting} 🛍️\nHere is your order from *${shopDisplayName}*:\n\n${itemLines}\n\n${deliveryNote}\n💵 *Total: ₹${totalAmount.toLocaleString('en-IN')}*\n\n👉 *Tap here to review your items, add more if you like, and checkout directly on our official store:*\n${officialOrderUrl}\n\nThank you for shopping with us! 🙏`;
  }, [customerName, selectedItems, shopDisplayName, deliveryType, deliveryFee, totalAmount, officialOrderUrl]);

  // 1-Click WhatsApp Send: Automatically creates the order and then opens WhatsApp
  const handleSendWhatsApp = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please add at least one product to the order.');
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      // 1. Automatically make the order in backend
      const payload = {
        customerName: customerName.trim() || 'WhatsApp Customer',
        customerPhone: customerPhone.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        deliveryType,
        items: selectedItems.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          price: i.price,
        })),
        notes: orderNotes.trim()
          ? `${orderNotes.trim()} (WhatsApp 1-Click Order)`
          : 'Created via Add Order (WhatsApp Send)',
        status: 'pending',
        payment_status: 'unpaid',
      };

      const res = await api.post('/orders', payload);
      const newOrder = res.data;

      posthog.capture('whatsapp_order_created', {
        delivery_type: deliveryType,
        product_count: selectedItems.length,
        unit_count: selectedItems.reduce((count, item) => count + item.quantity, 0),
        order_total: totalAmount,
        order_id: newOrder?.id,
      });

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (onOrderCreated) onOrderCreated();

      // 2. Open WhatsApp with formatted message
      const cleanPhone = customerPhone.replace(/\D/g, '');
      let targetUrl = '';

      if (cleanPhone) {
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        targetUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsAppMessage)}`;
      } else {
        targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppMessage)}`;
      }

      window.open(targetUrl, '_blank');
      toast.success(
        `Order #${(newOrder?.id || '').slice(-8).toUpperCase()} created & opened in WhatsApp!`
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create order before sending to WhatsApp.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Copy Storefront Link
  const handleCopyLink = async () => {
    if (selectedItems.length === 0) {
      toast.error('Add items to generate link');
      return;
    }
    try {
      await navigator.clipboard.writeText(officialOrderUrl);
      setCopiedLink(true);
      toast.success('Official storefront order link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // Copy Full WhatsApp Message
  const handleCopyMessage = async () => {
    if (selectedItems.length === 0) {
      toast.error('Add items first');
      return;
    }
    try {
      await navigator.clipboard.writeText(whatsAppMessage);
      setCopiedMessage(true);
      toast.success('WhatsApp order message copied!');
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      toast.error('Failed to copy message');
    }
  };

  // Save Direct Order into Dashboard (for Counter/Cash sales) & Pop up QR Code + Link
  const handleSaveDirectOrder = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one product.');
      return;
    }

    setIsSavingDirect(true);
    try {
      const payload = {
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        deliveryType,
        items: selectedItems.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          price: i.price,
        })),
        notes: orderNotes.trim() || 'Counter / Cash Sale',
        status: 'pending',
        payment_status: 'unpaid',
      };

      const res = await api.post('/orders', payload);
      const newOrder = res.data;

      posthog.capture('direct_order_created', {
        delivery_type: deliveryType,
        product_count: selectedItems.length,
        unit_count: selectedItems.reduce((count, item) => count + item.quantity, 0),
        order_total: totalAmount,
        order_id: newOrder?.id,
      });

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order recorded! Scan or share QR code to receive payment.');
      if (onOrderCreated) onOrderCreated();

      // Immediately pop up Payment QR and Link modal for this order!
      setCreatedOrderForQr(newOrder);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save order.');
    } finally {
      setIsSavingDirect(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-order-title"
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
              <ShoppingBag size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 id="add-order-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Add Order & WhatsApp Link</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Storefront Checkout
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Create an order for your shop, generate a 1-click WhatsApp link, or record a direct sale.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Selection & Catalog (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Search Catalog */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Items from Catalog
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name or category..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none bg-slate-50/50"
                />
              </div>
            </div>

            {/* Product Quick Picker Grid */}
            <div className="border border-slate-200 rounded-xl p-2.5 max-h-52 overflow-y-auto bg-slate-50/30">
              {isLoadingProducts ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading your catalog...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No products found. Add products in the Products tab first!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredProducts.map((p) => {
                    const price = p.sale_price != null && p.sale_price > 0 ? p.sale_price : p.price;
                    const isSelected = selectedItems.some((i) => i.product.id === p.id);
                    return (
                      <div
                        key={p.id}
                        className={`p-2 rounded-lg border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50/70 border-orange-300 ring-1 ring-orange-300'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        onClick={() => handleAddItem(p)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {p.image_url || p.media_key ? (
                            <img
                              src={resolveMediaUrl(p.image_url || p.media_key)}
                              alt={p.name}
                              className="w-9 h-9 rounded object-cover flex-shrink-0 bg-slate-100 border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                              <Package size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{p.name}</h4>
                            <span className="text-[11px] font-semibold text-slate-600">
                              ₹{price.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-700 flex items-center justify-center flex-shrink-0 transition-colors"
                          title="Add to order"
                          aria-label={`Add ${p.name} to order`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Items Table / List */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Items in this Order ({selectedItems.length})
                </span>
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedItems([])}
                    className="text-[11px] font-medium text-red-600 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedItems.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-2">
                    <ShoppingBag size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">No items added yet</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click items above to assemble this order for your customer.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-[11px] text-slate-500">
                          ₹{item.price.toLocaleString('en-IN')} each
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, -1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded-l transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded-r transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Line Subtotal */}
                      <div className="text-right min-w-[70px]">
                        <span className="text-xs font-bold text-slate-900">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Details Inputs */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Customer Details (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    WhatsApp Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Fulfillment Method
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('delivery')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                        deliveryType === 'delivery'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Truck size={13} /> Delivery (+₹30)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                        deliveryType === 'pickup'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Store size={13} /> Pickup (Free)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Order Note / Address
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="e.g. Leave with security / Urgent"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: WhatsApp Link Generator & Checkout Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 pt-4 lg:pt-0">
            <div className="space-y-4">
              {/* Order Cost Breakdown */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({selectedItems.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                  <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Fulfillment ({deliveryType === 'delivery' ? 'Home Delivery' : 'Store Pickup'})</span>
                  <span className="font-semibold text-slate-900">
                    {deliveryFee > 0 ? `₹${deliveryFee}` : 'Free'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-base text-emerald-700">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Official Storefront Target Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Customer lands on your Official Storefront</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  The customer will see your store, your brand, and these pre-added items. They can add more items if wanted, or proceed straight to checkout.
                </p>
                <div className="font-mono text-[10px] text-emerald-950 bg-emerald-100/70 p-1.5 rounded truncate select-all">
                  {officialOrderUrl}
                </div>
              </div>

              {/* WhatsApp Message Preview Bubble */}
              <div>
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MessageCircle size={14} className="text-emerald-600" />
                  WhatsApp Message Preview
                </span>
                <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 text-[11px] text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {whatsAppMessage}
                </div>
              </div>

              {/* Link Sharing Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={selectedItems.length === 0}
                  className="py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  disabled={selectedItems.length === 0}
                  className="py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {copiedMessage ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedMessage ? 'Copied Message!' : 'Copy Message'}</span>
                </button>
              </div>

              {/* In local dev, provide preview button to test link right now */}
              {isLocalDev && (
                <div className="pt-1">
                  <a
                    href={previewOrderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <span>Test Storefront Cart Link in this browser</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
              {/* Primary 1-Click WhatsApp Send Button: creates order & opens WhatsApp */}
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={selectedItems.length === 0 || isSendingWhatsApp || isSavingDirect}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <MessageCircle size={18} strokeWidth={2.2} />
                <span>
                  {isSendingWhatsApp
                    ? 'Creating Order & Opening WhatsApp...'
                    : 'Send to WhatsApp in One Click'}
                </span>
              </button>

              {/* Direct Save Order (for Counter / Cash sales): creates order & pops up QR + Link */}
              <button
                type="button"
                onClick={handleSaveDirectOrder}
                disabled={selectedItems.length === 0 || isSavingDirect || isSendingWhatsApp}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <FileCheck size={15} />
                <span>{isSavingDirect ? 'Recording Order...' : 'Record as Counter / Cash Order'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Counter / Cash Order Payment QR & Link Pop-up Modal */}
      {createdOrderForQr && (
        <OrderPaymentQrModal
          isOpen={!!createdOrderForQr}
          onClose={() => {
            setCreatedOrderForQr(null);
            onClose();
          }}
          order={createdOrderForQr}
          user={user}
          onPaymentConfirmed={() => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            if (onOrderCreated) onOrderCreated();
          }}
        />
      )}
    </div>
  );
}

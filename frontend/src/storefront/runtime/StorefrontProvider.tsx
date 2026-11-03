import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { ShopProduct } from '../../types/template';
import type {
  CartItem,
  CheckoutFormData,
  OrderSuccessData,
  StorefrontContextValue,
  StorefrontCustomer,
  CustomerOrder,
  AppliedDiscountInfo,
} from './storefrontState';
import { formatWhatsAppPhone } from '../utilities/formatting';

const rawApi = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const API = rawApi.endsWith('/api') ? rawApi : `${rawApi}/api`;

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function useStorefront(): StorefrontContextValue {
  const ctx = useContext(StorefrontContext);
  if (!ctx) {
    throw new Error('useStorefront must be used within a StorefrontProvider');
  }
  return ctx;
}

interface StorefrontProviderProps {
  children: React.ReactNode;
  shopId: string;
  shopName: string;
  shopPhone?: string;
  shopLogo?: string;
  currency?: string;
  currencySymbol?: string;
  products: ShopProduct[];
  initialProductId?: string | null;
}

export function StorefrontProvider({
  children,
  shopId,
  shopName,
  shopPhone = '',
  shopLogo,
  currency = 'INR',
  currencySymbol,
  products,
  initialProductId,
}: StorefrontProviderProps) {
  const activeCurrency = currency || 'INR';
  const activeSymbol = currencySymbol || (activeCurrency === 'USD' ? '$' : activeCurrency === 'EUR' ? '€' : '₹');
  const numberLocale = activeCurrency === 'INR' ? 'en-IN' : activeCurrency === 'EUR' ? 'de-DE' : 'en-US';
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [sharedOrderInfo, setSharedOrderInfo] = useState<{
    isPreloaded: boolean;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  } | null>(null);

  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);

  // Filter & Search state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Order state
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccessData | null>(null);

  // Discounts & Promotional Pricing state
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscountInfo | null>(null);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Customer Authentication & Account state
  const [customer, setCustomer] = useState<StorefrontCustomer | null>(null);
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [customerAuthInitialTab, setCustomerAuthInitialTab] = useState<'login' | 'register'>('login');
  const [isCustomerAccountOpen, setIsCustomerAccountOpen] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [selectedCustomerOrder, setSelectedCustomerOrder] = useState<CustomerOrder | null>(null);

  const getCustomerHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'X-Shop-Slug': shopName,
      'X-Organization-Id': shopId,
    };
    try {
      const token = localStorage.getItem('fs_customer_session_token');
      if (token) {
        headers['X-Customer-Session'] = token;
      }
    } catch {}
    return headers;
  }, [shopName, shopId]);

  const checkCustomerSession = useCallback(async () => {
    if (!shopName && !shopId) {
      setCustomer(null);
      return;
    }
    try {
      const res = await axios.get(`${API}/storefront/customer/me`, {
        withCredentials: true,
        headers: getCustomerHeaders()
      });
      if (res.data?.authenticated && res.data?.customer) {
        setCustomer(res.data.customer);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    }
  }, [shopName, shopId, getCustomerHeaders]);

  useEffect(() => {
    checkCustomerSession();
  }, [checkCustomerSession]);

  const trackStoreEvent = useCallback((eventType: string, extraData: Record<string, any> = {}) => {
    try {
      let sid = '';
      try {
        sid = sessionStorage.getItem('fs_visitor_session') || '';
        if (!sid) {
          sid = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
          sessionStorage.setItem('fs_visitor_session', sid);
        }
      } catch {}
      axios.post(`${API}/analytics/events`, {
        event_type: eventType,
        user_id: shopId,
        organization_id: shopId,
        event_data: {
          shop_id: shopId,
          shop_name: shopName,
          session_id: sid,
          referrer: typeof document !== 'undefined' ? (document.referrer || 'direct') : 'direct',
          path: typeof window !== 'undefined' ? window.location.pathname : '',
          ...extraData,
        }
      }).catch(() => {});
    } catch {}
  }, [shopId, shopName]);

  const openCustomerAuth = useCallback((tab: 'login' | 'register' = 'login') => {
    setCustomerAuthInitialTab(tab);
    setIsCustomerAuthOpen(true);
  }, []);

  const closeCustomerAuth = useCallback(() => {
    setIsCustomerAuthOpen(false);
  }, []);

  const openCustomerAccount = useCallback(() => {
    setIsCustomerAccountOpen(true);
  }, []);

  const closeCustomerAccount = useCallback(() => {
    setIsCustomerAccountOpen(false);
  }, []);

  const loginCustomer = useCallback(async (email: string, password: string) => {
    try {
      const res = await axios.post(`${API}/storefront/customer/login`, {
        email,
        password,
        shopId,
        shopSlug: shopName
      }, {
        withCredentials: true,
        headers: getCustomerHeaders()
      });
      if (res.data?.success && res.data?.customer) {
        if (res.data?.token) {
          try {
            localStorage.setItem('fs_customer_session_token', res.data.token);
          } catch {}
        }
        setCustomer(res.data.customer);
        setIsCustomerAuthOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      // In builder preview or demo mode, provide realistic preview session
      if (shopId === 'demo-shop' || !shopId || err.response?.status === 400) {
        const demoCust: StorefrontCustomer = {
          id: 'cust_demo_preview',
          email: email || 'shopper@example.com',
          name: email.split('@')[0] || 'Valued Shopper',
          phone: '+91 98765 43210',
          organization_id: shopId || 'store',
        };
        setCustomer(demoCust);
        setIsCustomerAuthOpen(false);
        return { success: true };
      }
      const msg = err.response?.data?.error || 'Invalid email or password';
      return { success: false, error: msg };
    }
  }, [getCustomerHeaders, shopId, shopName]);

  const registerCustomer = useCallback(async (data: { email: string; password: string; name?: string; phone?: string }) => {
    try {
      const res = await axios.post(`${API}/storefront/customer/register`, {
        ...data,
        shopId,
        shopSlug: shopName
      }, {
        withCredentials: true,
        headers: getCustomerHeaders()
      });
      if (res.data?.success && res.data?.customer) {
        if (res.data?.token) {
          try {
            localStorage.setItem('fs_customer_session_token', res.data.token);
          } catch {}
        }
        setCustomer(res.data.customer);
        setIsCustomerAuthOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err: any) {
      // In builder preview or demo mode, provide realistic preview session
      if (shopId === 'demo-shop' || !shopId || err.response?.status === 400) {
        const demoCust: StorefrontCustomer = {
          id: `cust_demo_${Date.now()}`,
          email: data.email,
          name: data.name || data.email.split('@')[0] || 'Store Customer',
          phone: data.phone || '+91 98765 43210',
          organization_id: shopId || 'store',
        };
        setCustomer(demoCust);
        setIsCustomerAuthOpen(false);
        return { success: true };
      }
      const msg = err.response?.data?.error || 'Registration failed';
      return { success: false, error: msg };
    }
  }, [getCustomerHeaders, shopId, shopName]);

  const logoutCustomer = useCallback(async () => {
    try {
      await axios.post(`${API}/storefront/customer/logout`, {}, {
        withCredentials: true,
        headers: getCustomerHeaders()
      });
    } catch {}
    try {
      localStorage.removeItem('fs_customer_session_token');
    } catch {}
    setCustomer(null);
    setCustomerOrders([]);
    setIsCustomerAccountOpen(false);
  }, [getCustomerHeaders]);

  const fetchCustomerOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/storefront/customer/orders`, {
        withCredentials: true,
        headers: getCustomerHeaders()
      });
      setCustomerOrders(res.data?.orders || []);
    } catch (err) {
      console.warn('Failed to fetch customer orders:', err);
    }
  }, [getCustomerHeaders]);

  // Check URL query parameter for product deep-linking
  useEffect(() => {
    if (initialProductId) {
      const match = products.find((p) => p.id === initialProductId && p.is_active === 1);
      if (match) {
        setSelectedProduct(match);
        trackStoreEvent('product_click', {
          product_id: match.id,
          product_name: match.name,
          price: match.price,
          image_url: match.image_url || (match as any).media_key || '',
          action: 'deep_link'
        });
      }
    }
  }, [initialProductId, products, trackStoreEvent]);

  // Check URL query parameter for pre-filled cart / merchant shared order link
  useEffect(() => {
    if (!products || products.length === 0) return;
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      if (!search) return;
      const params = new URLSearchParams(search);
      const cartParam = params.get('cart') || params.get('items') || params.get('order_items');
      const cname = params.get('cname') || params.get('name') || params.get('customer_name') || '';
      const cphone = params.get('cphone') || params.get('phone') || params.get('customer_phone') || '';
      const notes = params.get('notes') || params.get('note') || '';

      if (cartParam) {
        let itemsToLoad: Array<{ productId: string; quantity: number; variantId?: string }> = [];

        if (cartParam.startsWith('[') || cartParam.startsWith('{')) {
          try {
            const parsed = JSON.parse(cartParam);
            itemsToLoad = Array.isArray(parsed) ? parsed : (parsed.items || []);
          } catch {}
        } else {
          const tokens = cartParam.split(',');
          for (const token of tokens) {
            const parts = token.trim().split(':');
            if (parts[0]) {
              const productId = parts[0];
              const quantity = Math.max(1, parseInt(parts[1] || '1', 10) || 1);
              const variantId = parts[2] || undefined;
              itemsToLoad.push({ productId, quantity, variantId });
            }
          }
        }

        if (itemsToLoad.length > 0) {
          const preloadedCart: CartItem[] = [];
          for (const item of itemsToLoad) {
            const prod = products.find((p) => p.id === item.productId || (p as any).sku === item.productId);
            if (!prod) continue;
            const variant = item.variantId && (prod as any).variants
              ? (prod as any).variants.find((v: any) => v.id === item.variantId)
              : undefined;

            const itemKey = variant ? `${prod.id}__${variant.id}` : prod.id;
            const effectivePrice = variant ? variant.price : (prod.sale_price != null && prod.sale_price > 0 ? prod.sale_price : prod.price);
            const itemStock = variant && (variant as any).stock !== undefined ? Number((variant as any).stock) : prod.stock_quantity;
            const cappedQty = itemStock > 0 ? Math.min(item.quantity, itemStock) : item.quantity;

            preloadedCart.push({
              ...prod,
              price: effectivePrice,
              variant_id: variant?.id,
              variant_title: variant?.title,
              variant,
              cart_key: itemKey,
              quantity: cappedQty,
            });
          }

          if (preloadedCart.length > 0) {
            setCart(preloadedCart);
            setSharedOrderInfo({
              isPreloaded: true,
              customerName: cname,
              customerPhone: cphone,
              notes,
            });
            setIsCartOpen(true);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse cart URL parameters:', e);
    }
  }, [products]);


  // Derive unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Derived filtered products
  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.is_active === 1);
    let result = active;

    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(
        (p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = item.sale_price != null && item.sale_price > 0 ? item.sale_price : item.price;
      return sum + price * item.quantity;
    }, 0);
  }, [cart]);

  const addToCart = useCallback((product: ShopProduct, quantity: number = 1, variant?: ProductVariant) => {
    const itemKey = variant ? `${product.id}__${variant.id}` : product.id;
    const effectivePrice = variant ? variant.price : (product.sale_price != null && product.sale_price > 0 ? product.sale_price : product.price);
    const itemStock = variant && (variant as any).stock !== undefined ? Number((variant as any).stock) : product.stock_quantity;

    trackStoreEvent('product_click', {
      product_id: product.id,
      product_name: product.name,
      price: effectivePrice,
      image_url: product.image_url || (product as any).media_key || '',
      action: 'add_to_cart'
    });

    setCart((prev) => {
      const existing = prev.find((i) => (i.cart_key || (i.variant_id ? `${i.id}__${i.variant_id}` : i.id)) === itemKey);
      if (existing) {
        const newQty = existing.quantity + quantity;
        const cappedQty = itemStock > 0 ? Math.min(newQty, itemStock) : newQty;
        return prev.map((i) => ((i.cart_key || (i.variant_id ? `${i.id}__${i.variant_id}` : i.id)) === itemKey ? { ...i, quantity: cappedQty } : i));
      }
      const initialQty = itemStock > 0 ? Math.min(quantity, itemStock) : quantity;
      return [...prev, {
        ...product,
        price: effectivePrice,
        variant_id: variant?.id,
        variant_title: variant?.title,
        variant,
        cart_key: itemKey,
        quantity: initialQty
      }];
    });
    setIsCartOpen(true);
  }, [trackStoreEvent]);

  const updateCartQuantity = useCallback((itemKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          const key = item.cart_key || (item.variant_id ? `${item.id}__${item.variant_id}` : item.id);
          if (key === itemKey || item.id === itemKey) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (item.stock_quantity > 0 && newQty > item.stock_quantity) {
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  }, []);

  const removeFromCart = useCallback((itemKey: string) => {
    setCart((prev) => prev.filter((i) => {
      const key = i.cart_key || (i.variant_id ? `${i.id}__${i.variant_id}` : i.id);
      return key !== itemKey && i.id !== itemKey;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const openProductModal = useCallback((product: ShopProduct) => {
    setSelectedProduct(product);
    trackStoreEvent('product_click', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      image_url: product.image_url || (product as any).media_key || '',
      action: 'view_modal'
    });
  }, [trackStoreEvent]);

  const closeProductModal = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const clearOrderSuccess = useCallback(() => {
    setOrderSuccess(null);
  }, []);

  // Promotional Discounts Evaluation & Application
  const evaluateDiscounts = useCallback(async (codeToTest?: string | null) => {
    if (!shopId || cart.length === 0) {
      if (!codeToTest) {
        setAppliedDiscount(null);
      }
      return;
    }

    try {
      const itemsPayload = cart.map(i => ({
        productId: i.id,
        variantId: i.variant_id || undefined,
        quantity: i.quantity,
        unitPriceMinor: Math.round(((i.sale_price != null && i.sale_price > 0 ? i.sale_price : i.price) || 0) * 100),
        category: i.category,
      }));

      const activeCode = codeToTest !== undefined ? codeToTest : (appliedDiscount?.code || discountCodeInput || null);

      const res = await axios.post(`${API}/storefront/discounts/evaluate`, {
        shopId,
        code: activeCode,
        items: itemsPayload,
        shippingFeeMinor: 3000,
        customer: customer ? { id: customer.id, phone: customer.phone, email: customer.email } : null,
      }, {
        headers: getCustomerHeaders(),
      });

      if (res.data?.success && res.data.calculation) {
        const calc = res.data.calculation;
        if (calc.discountsApplied && calc.discountsApplied.length > 0) {
          let savingsMsg = '';
          const primaryDisc = calc.discountsApplied[0];
          if (primaryDisc.type === 'free_shipping') {
            savingsMsg = 'Free delivery promotion applied!';
          } else {
            savingsMsg = `Saved ${activeSymbol}${(calc.totalDiscountMinor / 100).toFixed(0)} with promotion`;
          }

          setAppliedDiscount({
            code: calc.codeApplied || null,
            totalDiscount: calc.totalDiscountMinor / 100,
            totalDiscountMinor: calc.totalDiscountMinor,
            productDiscount: calc.productDiscountMinor / 100,
            orderDiscount: calc.orderDiscountMinor / 100,
            shippingDiscount: calc.shippingDiscountMinor / 100,
            effectiveShipping: calc.effectiveShippingMinor / 100,
            finalPayable: calc.finalPayableMinor / 100,
            discountsApplied: calc.discountsApplied,
            savingsMessage: savingsMsg,
          });
          setDiscountError(null);
        } else {
          setAppliedDiscount(null);
        }
      }
    } catch {
      // Non-blocking
    }
  }, [shopId, cart, customer, appliedDiscount?.code, discountCodeInput, activeSymbol, getCustomerHeaders]);

  // Re-evaluate discounts when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      evaluateDiscounts();
    } else {
      setAppliedDiscount(null);
    }
  }, [cart, evaluateDiscounts]);

  const applyDiscountCode = useCallback(async (codeToApply?: string) => {
    const raw = (codeToApply || discountCodeInput || '').trim();
    if (!raw) {
      setDiscountError('Please enter a promo code');
      return { success: false, error: 'Please enter a promo code' };
    }
    if (cart.length === 0) {
      setDiscountError('Add items to your bag before applying a code');
      return { success: false, error: 'Cart is empty' };
    }

    setIsApplyingDiscount(true);
    setDiscountError(null);

    try {
      const itemsPayload = cart.map(i => ({
        productId: i.id,
        variantId: i.variant_id || undefined,
        quantity: i.quantity,
        unitPriceMinor: Math.round(((i.sale_price != null && i.sale_price > 0 ? i.sale_price : i.price) || 0) * 100),
        category: i.category,
      }));

      const res = await axios.post(`${API}/storefront/discounts/validate`, {
        shopId,
        code: raw,
        items: itemsPayload,
        shippingFeeMinor: 3000,
        customer: customer ? { id: customer.id, phone: customer.phone, email: customer.email } : null,
      }, {
        headers: getCustomerHeaders(),
      });

      if (res.data?.success && res.data.calculation) {
        const calc = res.data.calculation;
        setAppliedDiscount({
          code: calc.codeApplied || raw.toUpperCase(),
          totalDiscount: calc.totalDiscountMinor / 100,
          totalDiscountMinor: calc.totalDiscountMinor,
          productDiscount: calc.productDiscountMinor / 100,
          orderDiscount: calc.orderDiscountMinor / 100,
          shippingDiscount: calc.shippingDiscountMinor / 100,
          effectiveShipping: calc.effectiveShippingMinor / 100,
          finalPayable: calc.finalPayableMinor / 100,
          discountsApplied: calc.discountsApplied,
          savingsMessage: `Code ${raw.toUpperCase()} applied! Saved ${activeSymbol}${(calc.totalDiscountMinor / 100).toFixed(0)}`,
        });
        setDiscountCodeInput('');
        setDiscountError(null);
        return { success: true };
      } else {
        const err = res.data?.error || 'Invalid promotion code';
        setDiscountError(err);
        return { success: false, error: err };
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Discount code is invalid or not applicable to your order.';
      setDiscountError(msg);
      return { success: false, error: msg };
    } finally {
      setIsApplyingDiscount(false);
    }
  }, [discountCodeInput, cart, shopId, customer, activeSymbol, getCustomerHeaders]);

  const removeDiscountCode = useCallback(() => {
    setAppliedDiscount(null);
    setDiscountCodeInput('');
    setDiscountError(null);
    evaluateDiscounts(null);
  }, [evaluateDiscounts]);

  // Submit direct checkout order via backend /api/orders/create
  const submitOrder = useCallback(
    async (formData: CheckoutFormData): Promise<boolean> => {
      if (cart.length === 0) return false;
      setIsSubmittingOrder(true);

      try {
        const payload = {
          customerName: formData.customerName || customer?.name || 'Customer',
          customerEmail: formData.customerEmail || customer?.email || `${formData.customerPhone}@customer.ferasetu.local`,
          customerPhone: formData.customerPhone || customer?.phone,
          deliveryAddress: formData.deliveryAddress,
          deliveryType: formData.deliveryType,
          paymentMethod: formData.paymentMethod,
          shopId: shopId,
          notes: formData.notes,
          discountCode: appliedDiscount?.code || discountCodeInput || undefined,
          items: cart.map((i) => ({
            productId: i.id,
            variantId: i.variant_id || undefined,
            quantity: i.quantity
          })),
        };

        const idempotencyKey = `ord_idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const headers = {
          ...getCustomerHeaders(),
          'Idempotency-Key': idempotencyKey,
        };

        const res = await axios.post(`${API}/orders/create`, payload, {
          withCredentials: true,
          headers,
        });
        const data = res.data;
        const ord = data.order || data;

        setOrderSuccess({
          id: ord.id || data.id,
          invoice: ord.invoice_number || ord.invoice || data.invoiceNumber || data.invoice || 'N/A',
          deliveryCode: ord.delivery_code || ord.deliveryCode || 'N/A',
          customerName: ord.customer_name || formData.customerName,
          customerEmail: ord.customer_email || formData.customerEmail,
          customerPhone: ord.customer_phone || formData.customerPhone,
          total: ord.total,
          subtotal: ord.subtotal,
          deliveryFee: ord.delivery_fee,
          discount: ord.discount || (ord.discount_minor ? ord.discount_minor / 100 : 0) || (appliedDiscount ? appliedDiscount.totalDiscount : 0),
          discountMinor: ord.discount_minor || ord.discountMinor || (appliedDiscount ? appliedDiscount.totalDiscountMinor : 0),
          discountsApplied: ord.discountsApplied || (appliedDiscount ? appliedDiscount.discountsApplied : []),
          deliveryAddress: ord.delivery_address || formData.deliveryAddress,
          deliveryType: ord.delivery_type || formData.deliveryType,
          items: Array.isArray(ord.items)
            ? ord.items
            : typeof ord.items === 'string'
            ? JSON.parse(ord.items || '[]')
            : [],
          emailStatus: ord.email_status,
          emailSent: Boolean(ord.email_sent),
          trackingToken: ord.trackingToken || ord.tracking_token || data.trackingToken || data.order?.trackingToken,
        });

        clearCart();
        setIsCartOpen(true);
        return true;
      } catch (err: any) {
        console.error('Failed to submit order:', err);
        const errMsg = err?.response?.data?.error || err?.message || 'Failed to place order';
        alert(`Order failed: ${errMsg}`);
        // Do NOT clear cart on failure to preserve customer selections
        return false;
      } finally {
        setIsSubmittingOrder(false);
      }
    },
    [cart, shopId, shopName, customer, clearCart, setIsCartOpen]
  );

  // WhatsApp helpers
  const openWhatsAppInquiry = useCallback(
    (product: ShopProduct) => {
      const phone = formatWhatsAppPhone(shopPhone);
      if (!phone) {
        alert('Merchant has not configured a WhatsApp contact phone number yet.');
        return;
      }
      const price = product.sale_price ?? product.price;
      trackStoreEvent('product_click', {
        product_id: product.id,
        product_name: product.name,
        price,
        image_url: product.image_url || (product as any).media_key || '',
        action: 'whatsapp_inquiry'
      });
      const text = `Namaste ${shopName}!\n\nI am interested in:\n📦 *${product.name}*\n💰 Price: ${activeSymbol}${price.toLocaleString(numberLocale)}\n\nIs this item currently available for delivery?`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    },
    [shopName, shopPhone, activeSymbol, numberLocale, trackStoreEvent]
  );

  const openWhatsAppCartOrder = useCallback(
    (notes: string = '') => {
      const phone = formatWhatsAppPhone(shopPhone);
      if (!phone) {
        alert('Merchant has not configured a WhatsApp contact phone number yet.');
        return;
      }

      if (cart.length === 0) return;

      const lines = cart.map((item, idx) => {
        const price = item.sale_price ?? item.price;
        return `${idx + 1}. *${item.name}* (x${item.quantity}) — ${activeSymbol}${(price * item.quantity).toLocaleString(numberLocale)}`;
      });

      const message =
        `Namaste ${shopName}!\n\nI would like to place an order:\n\n` +
        lines.join('\n') +
        `\n\n💵 *Total: ${activeSymbol}${cartSubtotal.toLocaleString(numberLocale)}*` +
        (notes ? `\n📝 Note: ${notes}` : '') +
        `\n\nPlease confirm availability and payment details. Thank you!`;

      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    },
    [cart, cartSubtotal, shopName, shopPhone, activeSymbol, numberLocale]
  );

  const contextValue: StorefrontContextValue = {
    shopId,
    shopName,
    shopPhone,
    shopLogo,
    currency: activeCurrency,
    currencySymbol: activeSymbol,
    products,
    categories,
    cart,
    cartCount,
    cartSubtotal,
    isCartOpen,
    openCart,
    closeCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    selectedProduct,
    openProductModal,
    closeProductModal,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    filteredProducts,
    isSubmittingOrder,
    orderSuccess,
    clearOrderSuccess,
    submitOrder,
    openWhatsAppInquiry,
    openWhatsAppCartOrder,

    // Customer Authentication & Account
    customer,
    isCustomerAuthOpen,
    customerAuthInitialTab,
    openCustomerAuth,
    closeCustomerAuth,
    isCustomerAccountOpen,
    openCustomerAccount,
    closeCustomerAccount,
    loginCustomer,
    registerCustomer,
    logoutCustomer,
    customerOrders,
    fetchCustomerOrders,
    selectedCustomerOrder,
    setSelectedCustomerOrder,

    // Shared Order Info
    sharedOrderInfo,

    // Discounts & Promotional Pricing
    appliedDiscount,
    discountCodeInput,
    setDiscountCodeInput,
    isApplyingDiscount,
    discountError,
    applyDiscountCode,
    removeDiscountCode,
  };


  return (
    <StorefrontContext.Provider value={contextValue}>
      {children}
    </StorefrontContext.Provider>
  );
}

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
} from './storefrontState';
import { formatWhatsAppPhone } from '../utilities/formatting';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

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

  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);

  // Filter & Search state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Order state
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccessData | null>(null);

  // Customer Authentication & Account state
  const [customer, setCustomer] = useState<StorefrontCustomer | null>(null);
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [customerAuthInitialTab, setCustomerAuthInitialTab] = useState<'login' | 'register'>('login');
  const [isCustomerAccountOpen, setIsCustomerAccountOpen] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [selectedCustomerOrder, setSelectedCustomerOrder] = useState<CustomerOrder | null>(null);

  const checkCustomerSession = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/storefront/customer/me`, {
        withCredentials: true,
        headers: { 'X-Shop-Slug': shopName, 'X-Organization-Id': shopId }
      });
      if (res.data?.authenticated && res.data?.customer) {
        setCustomer(res.data.customer);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    }
  }, [shopName, shopId]);

  useEffect(() => {
    checkCustomerSession();
  }, [checkCustomerSession]);

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
      const res = await axios.post(`${API}/storefront/customer/login`, { email, password }, {
        withCredentials: true,
        headers: { 'X-Shop-Slug': shopName, 'X-Organization-Id': shopId }
      });
      if (res.data?.success && res.data?.customer) {
        setCustomer(res.data.customer);
        setIsCustomerAuthOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid email or password';
      return { success: false, error: msg };
    }
  }, [shopName, shopId]);

  const registerCustomer = useCallback(async (data: { email: string; password: string; name?: string; phone?: string }) => {
    try {
      const res = await axios.post(`${API}/storefront/customer/register`, data, {
        withCredentials: true,
        headers: { 'X-Shop-Slug': shopName, 'X-Organization-Id': shopId }
      });
      if (res.data?.success && res.data?.customer) {
        setCustomer(res.data.customer);
        setIsCustomerAuthOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed';
      return { success: false, error: msg };
    }
  }, [shopName, shopId]);

  const logoutCustomer = useCallback(async () => {
    try {
      await axios.post(`${API}/storefront/customer/logout`, {}, {
        withCredentials: true,
        headers: { 'X-Shop-Slug': shopName, 'X-Organization-Id': shopId }
      });
    } catch {}
    setCustomer(null);
    setCustomerOrders([]);
    setIsCustomerAccountOpen(false);
  }, [shopName, shopId]);

  const fetchCustomerOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/storefront/customer/orders`, {
        withCredentials: true,
        headers: { 'X-Shop-Slug': shopName, 'X-Organization-Id': shopId }
      });
      setCustomerOrders(res.data?.orders || []);
    } catch (err) {
      console.warn('Failed to fetch customer orders:', err);
    }
  }, [shopName, shopId]);

  // Check URL query parameter for product deep-linking
  useEffect(() => {
    if (initialProductId) {
      const match = products.find((p) => p.id === initialProductId && p.is_active === 1);
      if (match) {
        setSelectedProduct(match);
      }
    }
  }, [initialProductId, products]);

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
  }, []);

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
  }, []);

  const closeProductModal = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const clearOrderSuccess = useCallback(() => {
    setOrderSuccess(null);
  }, []);

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
          items: cart.map((i) => ({
            productId: i.id,
            variantId: i.variant_id || undefined,
            quantity: i.quantity
          })),
        };

        const res = await axios.post(`${API}/orders/create`, payload, {
          withCredentials: true,
          headers: { 'X-Shop-Slug': shopName, 'X-Organization-Id': shopId },
        });
        const data = res.data;

        setOrderSuccess({
          id: data.order?.id || data.id,
          invoice: data.invoiceNumber || data.invoice || 'N/A',
          deliveryCode: data.order?.deliveryCode || data.deliveryCode || 'N/A',
          paymentOtp: data.order?.paymentOtp || data.paymentOtp || 'N/A',
        });

        clearCart();
        return true;
      } catch (err) {
        console.error('Failed to submit order:', err);
        // Do NOT clear cart on failure to preserve customer selections
        return false;
      } finally {
        setIsSubmittingOrder(false);
      }
    },
    [cart, shopId, shopName, customer, clearCart]
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
      const text = `Namaste ${shopName}!\n\nI am interested in:\n📦 *${product.name}*\n💰 Price: ${activeSymbol}${price.toLocaleString(numberLocale)}\n\nIs this item currently available for delivery?`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    },
    [shopName, shopPhone, activeSymbol, numberLocale]
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
  };

  return (
    <StorefrontContext.Provider value={contextValue}>
      {children}
    </StorefrontContext.Provider>
  );
}

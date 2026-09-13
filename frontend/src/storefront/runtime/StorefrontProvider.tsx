import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { ShopProduct } from '../../types/template';
import type {
  CartItem,
  CheckoutFormData,
  OrderSuccessData,
  StorefrontContextValue,
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

  const addToCart = useCallback((product: ShopProduct, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        const cappedQty = product.stock_quantity > 0 ? Math.min(newQty, product.stock_quantity) : newQty;
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: cappedQty } : i));
      }
      const initialQty = product.stock_quantity > 0 ? Math.min(quantity, product.stock_quantity) : quantity;
      return [...prev, { ...product, quantity: initialQty }];
    });
    setIsCartOpen(true);
  }, []);

  const updateCartQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
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

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== productId));
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
          customerName: formData.customerName,
          customerEmail: formData.customerEmail || `${formData.customerPhone}@customer.ferasetu.local`,
          customerPhone: formData.customerPhone,
          deliveryAddress: formData.deliveryAddress,
          deliveryType: formData.deliveryType,
          paymentMethod: formData.paymentMethod,
          shopId: shopId,
          notes: formData.notes,
          items: cart.map((i) => ({ productId: i.id, quantity: i.quantity })),
        };

        const res = await axios.post(`${API}/orders/create`, payload);
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
    [cart, shopId, clearCart]
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
  };

  return (
    <StorefrontContext.Provider value={contextValue}>
      {children}
    </StorefrontContext.Provider>
  );
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  MONO_ELECTRONIC_PRODUCTS,
  getElectronicProduct,
  formatPrice as formatElectronicPrice,
  type ElectronicProduct,
} from './electronicData';
import { useStorefront } from '../../runtime/StorefrontProvider';
import type { ShopProduct } from '../../../types/template';
import { getProductPlaceholderSvg } from '../../utilities/imageFallback';

interface ToastItem {
  id: string;
  msg: string;
}

interface CartItemEntry {
  product: ElectronicProduct;
  qty: number;
}

interface MonoContextValue {
  products: ElectronicProduct[];
  filter: string;
  setFilter: (f: string) => void;
  selectCategory: (cat: string) => void;
  ui: {
    cart: boolean;
    auth: boolean;
    search: boolean;
    quickView: string | null;
  };
  openCart: (open?: boolean) => void;
  openAuth: (open?: boolean) => void;
  openSearch: (open?: boolean) => void;
  openQuickView: (productId: string | null) => void;
  cartItems: CartItemEntry[];
  cartCount: number;
  subtotal: number;
  addToCart: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  user: { name: string; email: string } | null;
  orders: Array<{ id: string; total: number; date: string }>;
  login: (email: string, name?: string) => void;
  signup: (name: string, email: string) => void;
  logout: () => void;
  placeOrder: () => { id: string; total: number };
  toasts: ToastItem[];
  toast: (msg: string) => void;
  currencySymbol: string;
  shopName: string;
  shopLogo?: string;
  formatPrice: (price: number) => string;
}

const MonoContext = createContext<MonoContextValue | null>(null);

export const useMonoShop = () => {
  const ctx = useContext(MonoContext);
  if (!ctx) {
    throw new Error('useMonoShop must be used within a MonoShopProvider');
  }
  return ctx;
};

const safeLoad = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

interface MonoShopProviderProps {
  children: React.ReactNode;
}

export function MonoShopProvider({ children }: MonoShopProviderProps) {
  // Check if we are inside FeraSetu's StorefrontProvider
  let parentStorefront: ReturnType<typeof useStorefront> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    parentStorefront = useStorefront();
  } catch {
    parentStorefront = null;
  }

  const currencySymbol = parentStorefront?.currencySymbol || '$';
  const shopName = parentStorefront?.shopName || 'MONO';
  const shopLogo = parentStorefront?.shopLogo;

  // Local UI and product state
  const [filter, setFilter] = useState('all');
  const [cart, setCart] = useState<Record<string, number>>(() => safeLoad('mono.cart', {}));
  const [user, setUser] = useState<{ name: string; email: string } | null>(() => safeLoad('mono.user', null));
  const [orders, setOrders] = useState<Array<{ id: string; total: number; date: string }>>(() =>
    safeLoad('mono.orders', [])
  );
  const [ui, setUi] = useState({ cart: false, auth: false, search: false, quickView: null as string | null });
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Sync state to localStorage safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mono.cart', JSON.stringify(cart));
      } catch {}
    }
  }, [cart]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mono.user', JSON.stringify(user));
      } catch {}
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mono.orders', JSON.stringify(orders));
      } catch {}
    }
  }, [orders]);

  // Ground storefront exclusively to merchant catalog (zero fake products / reviews / images)
  const products: ElectronicProduct[] = useMemo(() => {
    if (parentStorefront?.products && parentStorefront.products.length > 0) {
      // Convert merchant products to ElectronicProduct format
      const converted: ElectronicProduct[] = parentStorefront.products.map((p: ShopProduct) => {
        const hasRealReviews = typeof (p as any).reviews_count === 'number' && (p as any).reviews_count > 0;
        const realReviews = hasRealReviews ? (p as any).reviews_count : 0;
        const realRating = hasRealReviews ? Number((p as any).rating) || 5 : 0;
        const hasStock = (Number(p.stock_quantity) || 0) > 0;

        return {
          id: p.id,
          brand: p.category || shopName,
          name: p.name,
          sub: p.category || 'Direct Quality Product',
          category: (p.category || 'general').toLowerCase().replace(/\s+/g, '-'),
          rating: realRating,
          reviews: realReviews,
          price: Number(p.sale_price != null && p.sale_price > 0 ? p.sale_price : p.price) || 0,
          stock: hasStock ? 'in' : 'out',
          img: p.image_url || getProductPlaceholderSvg(p.name, '#0F172A'),
          fit: 'contain',
          desc: p.description || 'Direct merchant fulfillment with 0% platform commission.',
          specs: [
            'Direct Merchant Fulfillment',
            '0% Platform Commission',
            'Doorstep Local Delivery',
          ],
        };
      });
      return converted;
    }
    return [];
  }, [parentStorefront?.products, shopName]);

  const toast = useCallback((msg: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, msg }]);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    }
  }, []);

  const openCart = useCallback((open?: boolean) => {
    setUi((prev) => ({ ...prev, cart: open !== undefined ? open : !prev.cart }));
  }, []);

  const openAuth = useCallback((open?: boolean) => {
    setUi((prev) => ({ ...prev, auth: open !== undefined ? open : !prev.auth }));
  }, []);

  const openSearch = useCallback((open?: boolean) => {
    setUi((prev) => ({ ...prev, search: open !== undefined ? open : !prev.search }));
  }, []);

  const openQuickView = useCallback((productId: string | null) => {
    setUi((prev) => ({ ...prev, quickView: productId }));
  }, []);

  const selectCategory = useCallback((cat: string) => {
    setFilter(cat);
    if (typeof document !== 'undefined') {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const addToCart = useCallback(
    (id: string, qty = 1) => {
      setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + qty }));
      const found = products.find((p) => p.id === id) || getElectronicProduct(id);
      toast(`${found?.name ?? 'Item'} added to cart`);

      // If connected to FeraSetu parent cart, also add it to FeraSetu's cart
      if (parentStorefront && found) {
        const asShopProduct: ShopProduct = {
          id: found.id,
          name: found.name,
          price: found.price,
          category: found.category,
          stock_quantity: 99,
          image_url: found.img,
          is_active: 1,
        };
        parentStorefront.addToCart(asShopProduct, qty);
      }
    },
    [toast, products, parentStorefront]
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      setCart((c) => {
        const next = { ...c };
        if (qty <= 0) delete next[id];
        else next[id] = qty;
        return next;
      });
      if (parentStorefront) {
        parentStorefront.updateQuantity(id, qty);
      }
    },
    [parentStorefront]
  );

  const removeFromCart = useCallback(
    (id: string) => {
      setCart((c) => {
        const next = { ...c };
        delete next[id];
        return next;
      });
      if (parentStorefront) {
        parentStorefront.removeFromCart(id);
      }
    },
    [parentStorefront]
  );

  const clearCart = useCallback(() => {
    setCart({});
    if (parentStorefront) {
      parentStorefront.clearCart();
    }
  }, [parentStorefront]);

  const cartItems: CartItemEntry[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id) || getElectronicProduct(id);
        return product ? { product, qty } : null;
      })
      .filter((i): i is CartItemEntry => i !== null);
  }, [cart, products]);

  const cartCount = useMemo(() => cartItems.reduce((n, i) => n + i.qty, 0), [cartItems]);
  const subtotal = useMemo(() => cartItems.reduce((n, i) => n + i.product.price * i.qty, 0), [cartItems]);

  const login = useCallback(
    (email: string, name?: string) => {
      const u = { name: name || email.split('@')[0], email };
      setUser(u);
      toast(`Welcome back, ${u.name}`);
    },
    [toast]
  );

  const signup = useCallback(
    (name: string, email: string) => {
      const u = { name, email };
      setUser(u);
      toast(`Account created — welcome, ${name}`);
    },
    [toast]
  );

  const logout = useCallback(() => {
    setUser(null);
    toast('Signed out');
  }, [toast]);

  const placeOrder = useCallback(() => {
    const order = {
      id: `MN-${Math.floor(100000 + Math.random() * 900000)}`,
      total: subtotal,
      date: new Date().toISOString().slice(0, 10),
    };
    setOrders((os) => [order, ...os]);
    clearCart();
    return order;
  }, [subtotal, clearCart]);

  const formatPrice = useCallback(
    (n: number) => {
      return formatElectronicPrice(n, currencySymbol);
    },
    [currencySymbol]
  );

  const value: MonoContextValue = {
    products,
    filter,
    setFilter,
    selectCategory,
    ui,
    openCart,
    openAuth,
    openSearch,
    openQuickView,
    cartItems,
    cartCount,
    subtotal,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
    user,
    orders,
    login,
    signup,
    logout,
    placeOrder,
    toasts,
    toast,
    currencySymbol,
    shopName,
    shopLogo,
    formatPrice,
  };

  return <MonoContext.Provider value={value}>{children}</MonoContext.Provider>;
}

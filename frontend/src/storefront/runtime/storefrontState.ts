import type { ShopProduct } from '../../types/template';

export interface CartItem extends ShopProduct {
  quantity: number;
}

export interface OrderSuccessData {
  id: string;
  invoice: string;
  deliveryCode: string;
  paymentOtp: string;
}

export interface CheckoutFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryType: 'pickup' | 'delivery';
  paymentMethod: 'offline' | 'online';
  notes?: string;
}

export interface StorefrontContextValue {
  shopId: string;
  shopName: string;
  shopPhone: string;
  shopLogo?: string;
  currency: string;
  currencySymbol: string;
  products: ShopProduct[];
  categories: string[];

  // Cart
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: ShopProduct, quantity?: number) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Product Modal / Detail
  selectedProduct: ShopProduct | null;
  openProductModal: (product: ShopProduct) => void;
  closeProductModal: () => void;

  // Filter & Search
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredProducts: ShopProduct[];

  // Checkout & Order
  isSubmittingOrder: boolean;
  orderSuccess: OrderSuccessData | null;
  clearOrderSuccess: () => void;
  submitOrder: (formData: CheckoutFormData) => Promise<boolean>;

  // WhatsApp helpers
  openWhatsAppInquiry: (product: ShopProduct) => void;
  openWhatsAppCartOrder: (notes?: string) => void;
}

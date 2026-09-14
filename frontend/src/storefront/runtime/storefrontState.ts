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

export interface StorefrontCustomer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  organization_id?: string;
}

export interface CustomerOrder {
  id: string;
  invoice_number?: string;
  total: number;
  subtotal?: number;
  delivery_fee?: number;
  status: string;
  payment_status: string;
  delivery_address?: string;
  delivery_type?: string;
  items: any[];
  created_at: string;
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

  // Customer Authentication & Account
  customer: StorefrontCustomer | null;
  isCustomerAuthOpen: boolean;
  customerAuthInitialTab: 'login' | 'register';
  openCustomerAuth: (tab?: 'login' | 'register') => void;
  closeCustomerAuth: () => void;
  isCustomerAccountOpen: boolean;
  openCustomerAccount: () => void;
  closeCustomerAccount: () => void;
  loginCustomer: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerCustomer: (data: { email: string; password: string; name?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logoutCustomer: () => Promise<void>;
  customerOrders: CustomerOrder[];
  fetchCustomerOrders: () => Promise<void>;
  selectedCustomerOrder: CustomerOrder | null;
  setSelectedCustomerOrder: (order: CustomerOrder | null) => void;

  // WhatsApp helpers
  openWhatsAppInquiry: (product: ShopProduct) => void;
  openWhatsAppCartOrder: (notes?: string) => void;
}

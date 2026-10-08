import { type Market } from './pricing';

export interface MarketDemoProduct {
  name: string;
  subtitle: string;
  price: number;
  formattedPrice: string;
  stock: string;
}

export interface MarketDemoConfig {
  market: Market;
  currency: string;
  symbol: string;
  storeName: string;
  storeCategory: string;
  storeSlug: string;
  storeUrl: string;
  displayUrl: string;
  products: MarketDemoProduct[];
  orderTotal: number;
  formattedOrderTotal: string;
  customerName: string;
  customerPhone: string;
  orderId: string;
  orderTime: string;
  paymentMethod: string;
  paymentProviderName: string;
  settlementText: string;
  commissionText: string;
}

export const MARKET_DEMO_CONFIGS: Record<Market, MarketDemoConfig> = {
  IN: {
    market: 'IN',
    currency: 'INR',
    symbol: '₹',
    storeName: 'Sharma Kirana & General Store',
    storeCategory: 'Daily Essentials & Groceries',
    storeSlug: 'sharmakirana',
    storeUrl: 'https://sharmakirana.ferasetu.com',
    displayUrl: 'sharmakirana.ferasetu.com',
    products: [
      {
        name: 'Sharbati Whole Wheat Atta (5kg)',
        subtitle: 'Premium Stone-Ground Flour',
        price: 280,
        formattedPrice: '₹280',
        stock: 'In Stock (42 left)',
      },
      {
        name: 'Pure Cow Desi Ghee (1L)',
        subtitle: 'Traditional Bilona Method',
        price: 350,
        formattedPrice: '₹350',
        stock: 'In Stock (18 left)',
      },
    ],
    orderTotal: 630,
    formattedOrderTotal: '₹630.00',
    customerName: 'Aarav S.',
    customerPhone: '+91 98000 00000',
    orderId: '#FS-1084',
    orderTime: 'Just now',
    paymentMethod: 'Direct UPI & QR Checkout',
    paymentProviderName: 'Cashfree / UPI',
    settlementText: 'Direct settlement to your bank account',
    commissionText: '0% (₹0.00)',
  },
  UK: {
    market: 'UK',
    currency: 'GBP',
    symbol: '£',
    storeName: 'Apex Specialty Goods',
    storeCategory: 'Artisan Roasts & Pantry Provisions',
    storeSlug: 'apexstore',
    storeUrl: 'https://apexstore.ferasetu.com',
    displayUrl: 'apexstore.ferasetu.com',
    products: [
      {
        name: 'Single Origin Espresso Beans (500g)',
        subtitle: 'Organic Highland Roast',
        price: 16,
        formattedPrice: '£16.00',
        stock: 'In Stock (24 left)',
      },
      {
        name: 'Cold Brew Concentrate (1L)',
        subtitle: 'Steeped 24h · Arabica Blend',
        price: 12,
        formattedPrice: '£12.00',
        stock: 'In Stock (12 left)',
      },
    ],
    orderTotal: 28,
    formattedOrderTotal: '£28.00',
    customerName: 'Oliver H.',
    customerPhone: '+44 7700 900123',
    orderId: '#FS-2041',
    orderTime: 'Just now',
    paymentMethod: 'Direct Card Checkout',
    paymentProviderName: 'Stripe',
    settlementText: 'Direct payout to your UK bank',
    commissionText: '0% (£0.00)',
  },
  US: {
    market: 'US',
    currency: 'USD',
    symbol: '$',
    storeName: 'Apex Specialty Goods',
    storeCategory: 'Artisan Roasts & Pantry Provisions',
    storeSlug: 'apexstore',
    storeUrl: 'https://apexstore.ferasetu.com',
    displayUrl: 'apexstore.ferasetu.com',
    products: [
      {
        name: 'Single Origin Espresso Beans (12oz)',
        subtitle: 'Organic Highland Roast',
        price: 18,
        formattedPrice: '$18.00',
        stock: 'In Stock (24 left)',
      },
      {
        name: 'Cold Brew Concentrate (32oz)',
        subtitle: 'Steeped 24h · Arabica Blend',
        price: 16,
        formattedPrice: '$16.00',
        stock: 'In Stock (12 left)',
      },
    ],
    orderTotal: 34,
    formattedOrderTotal: '$34.00',
    customerName: 'Sarah M.',
    customerPhone: '+1 (555) 012-3456',
    orderId: '#FS-3012',
    orderTime: 'Just now',
    paymentMethod: 'Direct Card Checkout',
    paymentProviderName: 'Stripe',
    settlementText: 'Direct payout to your bank account',
    commissionText: '0% ($0.00)',
  },
  EU: {
    market: 'EU',
    currency: 'EUR',
    symbol: '€',
    storeName: 'Apex Specialty Goods',
    storeCategory: 'Artisan Roasts & Pantry Provisions',
    storeSlug: 'apexstore',
    storeUrl: 'https://apexstore.ferasetu.com',
    displayUrl: 'apexstore.ferasetu.com',
    products: [
      {
        name: 'Single Origin Espresso Beans (500g)',
        subtitle: 'Organic Highland Roast',
        price: 18,
        formattedPrice: '€18.00',
        stock: 'In Stock (24 left)',
      },
      {
        name: 'Cold Brew Concentrate (1L)',
        subtitle: 'Steeped 24h · Arabica Blend',
        price: 14,
        formattedPrice: '€14.00',
        stock: 'In Stock (12 left)',
      },
    ],
    orderTotal: 32,
    formattedOrderTotal: '€32.00',
    customerName: 'Lukas M.',
    customerPhone: '+49 151 0123456',
    orderId: '#FS-2041',
    orderTime: 'Just now',
    paymentMethod: 'Direct Card Checkout',
    paymentProviderName: 'Stripe',
    settlementText: 'Direct payout to your European bank',
    commissionText: '0% (€0.00)',
  },
  GLOBAL: {
    market: 'GLOBAL',
    currency: 'USD',
    symbol: '$',
    storeName: 'Apex Specialty Goods',
    storeCategory: 'Artisan Roasts & Pantry Provisions',
    storeSlug: 'apexstore',
    storeUrl: 'https://apexstore.ferasetu.com',
    displayUrl: 'apexstore.ferasetu.com',
    products: [
      {
        name: 'Single Origin Espresso Beans (12oz)',
        subtitle: 'Organic Highland Roast',
        price: 18,
        formattedPrice: '$18.00',
        stock: 'In Stock (24 left)',
      },
      {
        name: 'Cold Brew Concentrate (32oz)',
        subtitle: 'Steeped 24h · Arabica Blend',
        price: 16,
        formattedPrice: '$16.00',
        stock: 'In Stock (12 left)',
      },
    ],
    orderTotal: 34,
    formattedOrderTotal: '$34.00',
    customerName: 'Sarah M.',
    customerPhone: '+1 (555) 012-3456',
    orderId: '#FS-3012',
    orderTime: 'Just now',
    paymentMethod: 'Direct Card Checkout',
    paymentProviderName: 'Stripe',
    settlementText: 'Direct payout to your bank account',
    commissionText: '0% ($0.00)',
  },
};

export function getMarketDemoConfig(market: Market = 'GLOBAL'): MarketDemoConfig {
  return MARKET_DEMO_CONFIGS[market] || MARKET_DEMO_CONFIGS.GLOBAL;
}

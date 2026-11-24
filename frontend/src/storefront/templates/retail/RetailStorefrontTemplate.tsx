import React, { useState, useMemo } from 'react';
import {
  Search, ShoppingBag, ShieldCheck, MapPin, Clock, MessageCircle,
  Star, ChevronRight, CheckCircle2, ArrowRight, X, Plus, Minus,
  Truck, ArrowLeft, CreditCard, QrCode, Sparkles, Filter
} from 'lucide-react';
import type { ShopProduct } from '../../../types/template';

interface RetailStorefrontTemplateProps {
  products: ShopProduct[];
  shopName?: string;
  shopPhone?: string;
  shopLogo?: string;
  currencySymbol?: string;
  isPreview?: boolean;
}

export default function RetailStorefrontTemplate({
  products,
  shopName = 'Sharma Handlooms & Electronics',
  shopPhone = '919876543210',
  shopLogo,
  currencySymbol = '₹',
  isPreview = false,
}: RetailStorefrontTemplateProps) {
  // Navigation & Screen selection in Template preview
  const [activeTab, setActiveTab] = useState<'home' | 'catalog' | 'pdp' | 'cart' | 'payment'>('home');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cartItems, setCartItems] = useState<{ product: ShopProduct; quantity: number }[]>([]);
  const [deliveryPincode, setDeliveryPincode] = useState('110001');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSize, setSelectedSize] = useState('L');

  // Fallback demo retail catalog if none passed
  const displayProducts = useMemo(() => {
    if (products && products.length > 0) return products;
    return [
      {
        id: 'ret-1',
        name: 'Royal Indigo Handloom Cotton Kurta',
        price: 899,
        sale_price: 1499,
        category: 'Apparel',
        stock_quantity: 14,
        image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
        is_active: 1,
      },
      {
        id: 'ret-2',
        name: 'Philips LED Smart Bulb 10W (Pack of 2)',
        price: 749,
        sale_price: 999,
        category: 'Electronics',
        stock_quantity: 28,
        image_url: 'https://images.unsplash.com/photo-1550524514-9b69b626786a?auto=format&fit=crop&w=600&q=80',
        is_active: 1,
      },
      {
        id: 'ret-3',
        name: 'Saffron Silk Blend Festive Kurta',
        price: 1299,
        sale_price: 1899,
        category: 'Apparel',
        stock_quantity: 6,
        image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80',
        is_active: 1,
      },
      {
        id: 'ret-4',
        name: 'Heavy Cotton Jaipuri Double Bedsheet',
        price: 949,
        sale_price: 1399,
        category: 'Home & Living',
        stock_quantity: 12,
        image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80',
        is_active: 1,
      },
      {
        id: 'ret-5',
        name: 'Pure Copper Water Dispenser (5L)',
        price: 1899,
        sale_price: 2499,
        category: 'Kitchenware',
        stock_quantity: 8,
        image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
        is_active: 1,
      },
      {
        id: 'ret-6',
        name: 'Havells Instant Immersion Water Heater 1500W',
        price: 699,
        sale_price: 899,
        category: 'Electronics',
        stock_quantity: 20,
        image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        is_active: 1,
      },
    ];
  }, [products]);

  const categories = ['All', 'Apparel', 'Electronics', 'Home & Living', 'Kitchenware'];

  const filteredProducts = useMemo(() => {
    return displayProducts.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [displayProducts, selectedCategory, searchQuery]);

  // Cart operations
  const handleAddToCart = (product: ShopProduct) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: ShopProduct; quantity: number }[];
    });
  };

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cartItems]);

  const totalCartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const openWhatsAppDraft = (productName?: string) => {
    const text = productName
      ? `Namaste! I would like to order "${productName}" from ${shopName}.`
      : `Namaste ${shopName}! I have a question regarding my order.`;
    window.open(`https://wa.me/${shopPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="w-full min-h-screen bg-[#F8F9FF] text-[#0D1C2F] font-sans antialiased flex flex-col selection:bg-[#FC6018]/20">
      
      {/* ── Top Pincode & Store Hours Bar ── */}
      <div className="bg-[#001428] text-white text-xs px-4 py-2 flex items-center justify-between border-b border-[#0F2942]">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-[#FC6018]" />
          <span>Deliver to: <strong className="font-bold underline cursor-pointer">{deliveryPincode}</strong></span>
          <span className="hidden sm:inline text-white/40">•</span>
          <span className="hidden sm:inline text-emerald-400 font-medium">Fast 24-hr local dispatch</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/80">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Open Today till 9:30 PM
          </span>
        </div>
      </div>

      {/* ── Merchant Main Header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DDE9FF] px-4 py-3 shadow-[0_2px_8px_rgba(0,20,40,0.04)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Store Identity */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {shopLogo ? (
              <img src={shopLogo} alt={shopName} className="w-9 h-9 rounded-xl object-cover border border-[#DDE9FF]" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#001428] text-white flex items-center justify-center font-black text-sm shadow-[0_2px_4px_rgba(0,20,40,0.2)]">
                {shopName.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm sm:text-base text-[#001428] tracking-tight group-hover:text-[#FC6018] transition-colors">
                  {shopName}
                </h1>
                <span className="p-0.5 rounded-full bg-emerald-100 text-emerald-700" title="GSTIN Verified">
                  <CheckCircle2 size={13} />
                </span>
              </div>
              <p className="text-[10px] text-[#475569] font-medium flex items-center gap-1">
                <span>GSTIN Verified</span>
                <span>•</span>
                <span className="text-amber-600 font-bold flex items-center">
                  <Star size={10} className="fill-amber-500 text-amber-500 mr-0.5" /> 4.9 (840+)
                </span>
              </p>
            </div>
          </div>

          {/* Right Header CTAs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openWhatsAppDraft()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200 transition-all cursor-pointer active:translate-y-0.5"
            >
              <MessageCircle size={14} className="text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            {/* Cart Trigger Button */}
            <button
              type="button"
              onClick={() => setActiveTab('cart')}
              className="relative p-2.5 rounded-xl bg-[#EFF4FF] hover:bg-[#DDE9FF] text-[#001428] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_2px_0_0_#DDE9FF] active:translate-y-0.5"
            >
              <ShoppingBag size={17} />
              <span className="hidden sm:inline">Bag</span>
              {totalCartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#FC6018] text-white text-[10px] font-black flex items-center justify-center -ml-0.5 shadow-sm animate-in fade-in">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="max-w-4xl mx-auto mt-2.5">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74777E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search handloom kurtas, LED bulbs, kitchenware..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8F9FF] border border-[#DDE9FF] text-xs font-medium placeholder:text-[#74777E] focus:outline-none focus:border-[#FC6018] focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Screen Navigation Pills (For Previewing All 5 Touchpoints) ── */}
      <div className="bg-white border-b border-[#DDE9FF] px-4 py-2 sticky top-[108px] z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-1 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#001428] text-white shadow-[0_3px_0_0_#0F2942]'
                : 'text-[#475569] hover:bg-slate-100'
            }`}
          >
            1. Store Home
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-[#001428] text-white shadow-[0_3px_0_0_#0F2942]'
                : 'text-[#475569] hover:bg-slate-100'
            }`}
          >
            2. Catalog & Filters
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedProduct(displayProducts[0]);
              setActiveTab('pdp');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'pdp'
                ? 'bg-[#001428] text-white shadow-[0_3px_0_0_#0F2942]'
                : 'text-[#475569] hover:bg-slate-100'
            }`}
          >
            3. Product Detail (PDP)
          </button>
          <button
            type="button"
            onClick={() => {
              if (cartItems.length === 0) {
                handleAddToCart(displayProducts[0]);
                handleAddToCart(displayProducts[1]);
              }
              setActiveTab('cart');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'cart'
                ? 'bg-[#001428] text-white shadow-[0_3px_0_0_#0F2942]'
                : 'text-[#475569] hover:bg-slate-100'
            }`}
          >
            4. Cart & Checkout ({totalCartCount})
          </button>
          <button
            type="button"
            onClick={() => {
              if (cartItems.length === 0) handleAddToCart(displayProducts[0]);
              setActiveTab('payment');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-[#FC6018] text-white shadow-[0_3px_0_0_#C74507]'
                : 'text-[#475569] hover:bg-slate-100'
            }`}
          >
            5. Payment Mode
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT VIEWPORT ── */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* ──────── TAB 1: HOME STOREFRONT ──────── */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001428] to-[#0F2942] text-white p-6 sm:p-8 shadow-[0_8px_24px_rgba(0,20,40,0.16)] flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3 max-w-md">
                <span className="px-2.5 py-1 rounded-md bg-[#FC6018] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                  0% Commission Direct Store
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  Handcrafted kurtas & home essentials from our local shop.
                </h2>
                <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
                  Every order settles directly to our verified bank account. No middlemen markup, no surprise charges.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="h-11 px-5 rounded-xl bg-[#FC6018] hover:bg-[#E05210] text-white font-extrabold text-xs shadow-[0_4px_0_0_#C74507,0_8px_16px_rgba(252,96,24,0.3)] active:translate-y-0.5 active:scale-[0.985] active:shadow-[0_1px_0_0_#C74507] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Shop Bestsellers</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsAppDraft()}
                    className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-xs transition-all cursor-pointer active:translate-y-0.5"
                  >
                    WhatsApp Us
                  </button>
                </div>
              </div>
              <div className="w-full sm:w-56 h-48 rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-lg shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80"
                  alt="Store hero"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Category Ribbon */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#74777E]">
                Explore By Shelf
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setActiveTab('catalog');
                    }}
                    className={`h-9 px-4 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#001428] text-white shadow-[0_3px_0_0_#0F2942]'
                        : 'bg-white border border-[#DDE9FF] text-[#475569] hover:bg-[#EFF4FF]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Local Bestsellers Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-[#001428]">Local Bestsellers</h3>
                  <p className="text-xs text-[#74777E]">Verified customer favorites with fast delivery</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="text-xs font-bold text-[#FC6018] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
                {displayProducts.slice(0, 6).map(product => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-[#DDE9FF] p-3 shadow-[0_2px_8px_rgba(0,20,40,0.04)] hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div
                      onClick={() => {
                        setSelectedProduct(product);
                        setActiveTab('pdp');
                      }}
                      className="cursor-pointer"
                    >
                      <div className="aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 relative mb-2.5">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                        />
                        {product.sale_price && (
                          <span className="absolute top-2 left-2 bg-[#FC6018] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                            {Math.round(((product.sale_price - product.price) / product.sale_price) * 100)}% OFF
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-[#74777E] uppercase">{product.category}</p>
                      <h4 className="font-bold text-xs sm:text-sm text-[#001428] line-clamp-2 mt-0.5">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#EFF4FF] flex items-center justify-between gap-2">
                      <div>
                        <span className="font-black text-sm text-[#001428] tabular-nums">
                          {currencySymbol}{product.price.toLocaleString('en-IN')}
                        </span>
                        {product.sale_price && (
                          <span className="text-[10px] text-slate-400 line-through ml-1.5 tabular-nums">
                            {currencySymbol}{product.sale_price}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="h-8 px-3 rounded-xl bg-[#001428] hover:bg-[#0F2942] text-white font-bold text-xs shadow-[0_3px_0_0_#0F2942] active:translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={13} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reassurance Banner */}
            <div className="bg-[#EFF4FF] border border-[#DDE9FF] rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#001428]">Direct Merchant Settlement</h4>
                  <p className="text-[11px] text-[#475569]">0% marketplace tax. Your payments deposit straight to Sharma Handlooms via UPI.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────── TAB 2: PRODUCT CATALOG & FILTERS ──────── */}
        {activeTab === 'catalog' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-[#001428]">Product Catalog</h2>
                <p className="text-xs text-[#74777E]">{filteredProducts.length} items available in stock</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#74777E]">Filter:</span>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-[#DDE9FF] bg-white text-xs font-bold text-[#001428] focus:outline-none"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-[#DDE9FF] p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div
                    onClick={() => {
                      setSelectedProduct(product);
                      setActiveTab('pdp');
                    }}
                    className="cursor-pointer"
                  >
                    <div className="aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 relative mb-2">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-[#74777E] uppercase">{product.category}</p>
                    <h4 className="font-bold text-xs sm:text-sm text-[#001428] line-clamp-2 mt-0.5">
                      {product.name}
                    </h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#EFF4FF] flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#001428] tabular-nums">
                      {currencySymbol}{product.price.toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className="h-8 px-3 rounded-xl bg-[#FC6018] hover:bg-[#E05210] text-white font-bold text-xs shadow-[0_3px_0_0_#C74507] active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      Add +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──────── TAB 3: PRODUCT DETAIL (PDP) ──────── */}
        {activeTab === 'pdp' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="text-xs font-bold text-[#475569] hover:text-[#001428] flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Storefront</span>
            </button>

            {(() => {
              const p = selectedProduct || displayProducts[0];
              return (
                <div className="bg-white rounded-2xl border border-[#DDE9FF] p-5 sm:p-7 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-6">
                  {/* Photo Column */}
                  <div className="sm:col-span-6 space-y-3">
                    <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100 border border-[#DDE9FF]">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                      <Truck size={15} />
                      <span>Free delivery to {deliveryPincode} by tomorrow evening</span>
                    </div>
                  </div>

                  {/* Info Column */}
                  <div className="sm:col-span-6 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#FC6018] bg-[#FC6018]/10 px-2 py-0.5 rounded-md">
                        {p.category || 'Retail Special'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-[#001428] tracking-tight">
                        {p.name}
                      </h2>
                      <div className="flex items-center gap-2">
                        <div className="flex text-amber-500">
                          {'★'.repeat(5)}
                        </div>
                        <span className="text-xs font-bold text-[#475569]">4.9 (128 reviews)</span>
                      </div>

                      <div className="pt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#001428] tabular-nums">
                          {currencySymbol}{p.price.toLocaleString('en-IN')}
                        </span>
                        {p.sale_price && (
                          <span className="text-sm text-slate-400 line-through tabular-nums">
                            {currencySymbol}{p.sale_price}
                          </span>
                        )}
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Save {currencySymbol}{(p.sale_price ? p.sale_price - p.price : 0)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#74777E]">Inclusive of all taxes (GST 5% included)</p>
                    </div>

                    {/* Sizing Specifications */}
                    <div className="space-y-2 pt-2 border-t border-[#EFF4FF]">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>Select Size (Chest Specs)</span>
                        <span className="text-[#FC6018] underline cursor-pointer">Size Chart</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {['S (38")', 'M (40")', 'L (42")', 'XL (44")', 'XXL (46")'].map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            className={`h-9 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              selectedSize === size
                                ? 'bg-[#001428] text-white shadow-[0_3px_0_0_#0F2942]'
                                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* CTA Actions */}
                    <div className="space-y-2.5 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          handleAddToCart(p);
                          setActiveTab('cart');
                        }}
                        className="w-full h-12 rounded-xl bg-[#FC6018] hover:bg-[#E05210] text-white font-black text-sm shadow-[0_4px_0_0_#C74507,0_8px_18px_rgba(252,96,24,0.3)] active:translate-y-0.5 active:scale-[0.985] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ShoppingBag size={17} />
                        <span>Add to Bag • {currencySymbol}{p.price.toLocaleString('en-IN')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openWhatsAppDraft(p.name)}
                        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-[0_3px_0_0_#065F46] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={15} />
                        <span>Order via WhatsApp Direct</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ──────── TAB 4: CART & CHECKOUT ──────── */}
        {activeTab === 'cart' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <h2 className="text-xl font-extrabold text-[#001428]">Shopping Bag & Delivery</h2>

            {cartItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#DDE9FF] p-8 text-center space-y-3">
                <ShoppingBag size={36} className="mx-auto text-slate-300" />
                <p className="font-bold text-sm text-[#001428]">Your bag is currently empty</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="px-4 py-2 bg-[#001428] text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Browse Store Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                {/* Cart Items List */}
                <div className="sm:col-span-7 space-y-3">
                  {cartItems.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-[#DDE9FF] p-3.5 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-[#001428] truncate">{product.name}</h4>
                        <p className="text-[10px] text-[#74777E]">{product.category}</p>
                        <p className="font-black text-xs text-[#001428] mt-1 tabular-nums">
                          {currencySymbol}{product.price.toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Tactile Quantity Stepper */}
                      <div className="flex items-center gap-1.5 bg-[#F8F9FF] border border-[#DDE9FF] p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold active:translate-y-0.5 shadow-xs cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center font-black text-xs tabular-nums text-[#001428]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-[#001428] text-white flex items-center justify-center font-bold active:translate-y-0.5 shadow-xs cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Delivery Address Box */}
                  <div className="bg-white rounded-2xl border border-[#DDE9FF] p-4 space-y-3 shadow-xs">
                    <h4 className="font-extrabold text-xs text-[#001428]">Delivery Address</h4>
                    <input
                      type="text"
                      defaultValue="Shop 14, Main Market, Connaught Place"
                      className="w-full h-9 px-3 rounded-xl bg-[#F8F9FF] border border-[#DDE9FF] text-xs font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        defaultValue="Near Metro Gate 2"
                        className="h-9 px-3 rounded-xl bg-[#F8F9FF] border border-[#DDE9FF] text-xs font-medium"
                      />
                      <input
                        type="text"
                        defaultValue={deliveryPincode}
                        onChange={e => setDeliveryPincode(e.target.value)}
                        className="h-9 px-3 rounded-xl bg-[#F8F9FF] border border-[#DDE9FF] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Bill Breakdown (Right Column) */}
                <div className="sm:col-span-5 space-y-3">
                  <div className="bg-white rounded-2xl border border-[#DDE9FF] p-4 space-y-3 shadow-xs">
                    <h4 className="font-extrabold text-xs text-[#001428]">Bill Breakdown</h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#475569]">
                        <span>Item Total</span>
                        <span className="font-bold tabular-nums text-[#001428]">
                          {currencySymbol}{cartTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#475569]">
                        <span>Delivery Fee</span>
                        <span className="font-bold text-emerald-600">FREE</span>
                      </div>
                      <div className="flex justify-between text-[#475569]">
                        <span>Aggregator Platform Fee</span>
                        <span className="font-bold text-emerald-600">₹0.00 (Waived)</span>
                      </div>
                      <div className="pt-2 border-t border-[#EFF4FF] flex justify-between font-black text-sm text-[#001428]">
                        <span>Total Due</span>
                        <span className="tabular-nums">{currencySymbol}{cartTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('payment')}
                      className="w-full h-12 rounded-xl bg-[#FC6018] hover:bg-[#E05210] text-white font-black text-xs shadow-[0_4px_0_0_#C74507,0_8px_16px_rgba(252,96,24,0.3)] active:translate-y-0.5 active:scale-[0.985] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Payment Mode</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────── TAB 5: SELECT PAYMENT MODE ──────── */}
        {activeTab === 'payment' && (
          <div className="space-y-5 animate-in fade-in duration-200 max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border border-[#DDE9FF] p-6 shadow-sm space-y-5">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FC6018] bg-orange-50 px-2 py-0.5 rounded-md">
                  Direct Merchant Settlement
                </span>
                <h2 className="text-xl font-extrabold text-[#001428]">Select Payment Mode</h2>
                <p className="text-2xl font-black text-[#001428] pt-1 tabular-nums">
                  {currencySymbol}{(cartTotal || 1648).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-[#74777E]">To: Sharma Handlooms & Electronics</p>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2.5">
                {/* UPI Instant */}
                <div className="p-3.5 rounded-xl border-2 border-[#001428] bg-[#F8F9FF] flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#001428] text-white flex items-center justify-center shadow-xs">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#001428]">UPI Instant Settlement</h4>
                      <p className="text-[11px] text-[#475569]">GPay • PhonePe • Paytm • CRED • BHIM</p>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full border-4 border-[#001428] bg-white" />
                </div>

                {/* Cash on Delivery */}
                <div className="p-3.5 rounded-xl border border-[#DDE9FF] bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Truck size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#001428]">Cash on Delivery (COD)</h4>
                      <p className="text-[11px] text-[#475569]">Pay cash or scan QR when delivered</p>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                </div>

                {/* Debit / Credit Cards */}
                <div className="p-3.5 rounded-xl border border-[#DDE9FF] bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#001428]">Cards & NetBanking</h4>
                      <p className="text-[11px] text-[#475569]">RuPay • Visa • Mastercard • 256-Bit SSL</p>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                </div>
              </div>

              {/* Master Tactile Pay CTA */}
              <button
                type="button"
                onClick={() => {
                  alert(`Payment of ₹${(cartTotal || 1648).toLocaleString('en-IN')} simulated! Direct merchant settlement verified.`);
                }}
                className="w-full h-12 rounded-xl bg-[#001428] hover:bg-[#0F2942] text-white font-black text-sm shadow-[0_4px_0_0_#0F2942,0_8px_18px_rgba(0,20,40,0.3)] active:translate-y-0.5 active:scale-[0.985] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} className="text-emerald-400" />
                <span>Pay {currencySymbol}{(cartTotal || 1648).toLocaleString('en-IN')} via UPI</span>
              </button>

              <p className="text-center text-[10px] text-[#74777E] leading-relaxed">
                FeraSetu does not take commission or hold your funds. Payment routes directly to merchant VPA with instant bank SMS.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-[#DDE9FF] py-6 px-4 text-center text-xs text-[#74777E]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {shopName} • 100% Independent Storefront</p>
          <p className="font-bold text-[#001428]">0% Aggregator Toll • Powered by FeraSetu</p>
        </div>
      </footer>

    </div>
  );
}

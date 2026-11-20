import React from 'react';
import { ShoppingBag, ArrowRight, Sparkles, Tag, Plus } from 'lucide-react';
import { useStorefront } from '../../runtime/StorefrontProvider';
import type { ShopProduct } from '../../../types/template';

const DEFAULT_GYM_PRODUCTS: Partial<ShopProduct>[] = [
  {
    id: 'gym-prod-1',
    name: 'Cold-Filtered Whey Isolate (1kg - Dark Cocoa)',
    price: 3299,
    sale_price: 2899,
    category: 'Nutrition',
    image_url: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=800&q=80',
    description: '27g protein per scoop, 0g added sugar, zero bloating. Third-party lab tested.',
  },
  {
    id: 'gym-prod-2',
    name: '10mm Lever Competition Lifting Belt (Cowhide)',
    price: 4499,
    sale_price: 3999,
    category: 'Gear',
    image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    description: 'IPF specification thickness. Heavy-duty zinc alloy lever clamp with lifetime warranty.',
  },
  {
    id: 'gym-prod-3',
    name: 'Oversized Heavyweight Club Pump Cover (280 GSM)',
    price: 1499,
    sale_price: 1199,
    category: 'Apparel',
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
    description: '100% combed cotton, drop-shoulder cut, double-stitched collar built for warmups.',
  },
  {
    id: 'gym-prod-4',
    name: 'Double-Walled Insulated Steel Shaker (900ml)',
    price: 999,
    sale_price: 849,
    category: 'Gear',
    image_url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
    description: 'Keeps liquids ice-cold for 24 hours. Odorless medical grade 304 stainless steel.',
  },
];

export default function GymProShop() {
  const { products, openProductModal, addToCart, currencySymbol = '₹' } = useStorefront();

  const displayProducts = products && products.length > 0 ? products.slice(0, 4) : (DEFAULT_GYM_PRODUCTS as ShopProduct[]);

  return (
    <section id="pro-shop" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#0D0F14] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4FF00] block">
              OFFICIAL GEAR &amp; NUTRITION
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-display">
              Pro Shop Dispensary.
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base max-w-xl font-normal">
              Tested on our lifting floor. Heavyweight apparel, verified third-party supplements, and competition accessories.
            </p>
          </div>
          <a
            href="#products"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#D4FF00] hover:underline"
          >
            <span>View All Gear</span>
            <ArrowRight size={14} />
          </a>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.map((p) => {
            const hasSale = p.sale_price && p.sale_price < p.price;
            const finalPrice = hasSale ? p.sale_price : p.price;

            return (
              <div
                key={p.id}
                className="group rounded-sm bg-[#12141A] border border-white/10 hover:border-[#D4FF00]/50 overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-lg"
              >
                {/* Image Box */}
                <div
                  onClick={() => openProductModal(p)}
                  className="relative aspect-square overflow-hidden bg-neutral-900 cursor-pointer"
                >
                  <img
                    src={p.image_url || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80'}
                    alt={p.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {hasSale && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-xs bg-[#EF4444] text-white font-mono text-[10px] font-bold uppercase shadow-sm">
                      SALE
                    </span>
                  )}
                  {p.category && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-xs bg-black/70 backdrop-blur-md text-neutral-300 font-mono text-[10px] uppercase border border-white/10">
                      {p.category}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <h3
                      onClick={() => openProductModal(p)}
                      className="text-base font-bold text-white group-hover:text-[#D4FF00] transition-colors cursor-pointer line-clamp-1"
                    >
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* Price & Cart Trigger */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black font-display text-white">
                        {currencySymbol}{finalPrice?.toLocaleString('en-IN')}
                      </span>
                      {hasSale && (
                        <span className="text-xs text-neutral-500 line-through font-mono">
                          {currencySymbol}{p.price.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(p, 1)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-sm bg-[#D4FF00] hover:bg-[#BCE600] active:scale-95 text-[#090A0D] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                      aria-label={`Add ${p.name} to cart`}
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

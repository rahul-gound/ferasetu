import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  MessageSquare,
  Zap,
  ArrowRight,
  CheckCircle2,
  Package,
  Truck,
} from 'lucide-react';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';

const kiranaFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Kirana store ko FeraSetu par online kaise shuru karein?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FeraSetu par apna free account banayein, apni dukaan ka naam aur location daalein. Aapko turant apna store link (yourshop.ferasetu.com) milta hai. Phir apne grocery items (jaise Atta, Chawal, Tel, Masale) photos aur prices ke saath add karein aur WhatsApp par share karein.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya kirana store ke liye FeraSetu sach me free hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Haan, FeraSetu ka Free plan ₹0 me available hai. Isme aap 25 products add kar sakte hain, custom subdomain milta hai, direct WhatsApp orders aate hain, aur har order par automatic tax invoice banta hai. Sales par koi commission nahi lagta.',
      },
    },
    {
      '@type': 'Question',
      name: 'Customers order kaise karenge aur payment kaise aayegi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Customer aapke store link par jakar items cart me add karte hain aur 1-click me formatted WhatsApp order bhejte hain ya online checkout karte hain. Payment direct aapke UPI QR code ya Cash on Delivery (COD) se seedha aapke paas aati hai — koi middleman nahi.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya grocery items ke alag-alag pack size (jaise 500g, 1kg, 5kg) add ho sakte hain?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Bilkul! FeraSetu product variants support karta hai. Ek hi product me aap 500g, 1kg, aur 5kg ke alag-alag daam aur stock quantity set kar sakte hain.',
      },
    },
    {
      '@type': 'Question',
      name: 'Home delivery aur store pickup dono handle ho sakte hain?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Haan, customer order karte waqt select kar sakte hain ki unhe Ghar par delivery chahiye ya Dukaan se aakar khud saman lena hai (Store Pickup). Aapke order dashboard me delivery address aur customer phone number clear dikhta hai.',
      },
    },
  ],
};

const kiranaArticleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Kirana Store Online Kaise Banaye — Free Digital Dukaan',
  description:
    'Apne kirana store ko FeraSetu par online le jayein. 25 products free, WhatsApp cart orders, direct UPI payments, aur 0% platform commission.',
  url: 'https://ferasetu.com/kirana-store-online/',
  inLanguage: 'hi',
  author: {
    '@type': 'Organization',
    name: 'FeraSetu',
    url: 'https://ferasetu.com/',
  },
  publisher: {
    '@type': 'Organization',
    name: 'FeraSetu',
    url: 'https://ferasetu.com/',
    logo: {
      '@type': 'ImageObject',
      url: 'https://ferasetu.com/logo-official.png',
    },
  },
  datePublished: '2026-10-15T00:00:00Z',
  dateModified: '2026-11-10T00:00:00Z',
};

const kiranaBreadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://ferasetu.com',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Kirana Store Online',
      item: 'https://ferasetu.com/kirana-store-online',
    },
  ],
};

const SAMPLE_GROCERY_ITEMS = [
  {
    name: 'Aashirvaad Shudh Chakki Atta',
    category: 'Staples & Flour',
    variant: '5 kg Pack',
    price: '₹245',
    mrp: '₹270',
    stock: '28 packets in stock',
    tag: 'Daily Essential',
  },
  {
    name: 'Fortune Sunlite Refined Sunflower Oil',
    category: 'Cooking Oils',
    variant: '1 Litre Pouch',
    price: '₹138',
    mrp: '₹155',
    stock: '14 pouches left (Low stock alert)',
    tag: 'Trending',
  },
  {
    name: 'Tata Sampann Unpolished Toor Dal',
    category: 'Pulses & Dals',
    variant: '1 kg',
    price: '₹175',
    mrp: '₹195',
    stock: '35 packets in stock',
    tag: 'Staple',
  },
  {
    name: 'India Gate Basmati Rice Feast Rozzana',
    category: 'Rice & Grains',
    variant: '1 kg Pack',
    price: '₹95',
    mrp: '₹110',
    stock: '50 packets in stock',
    tag: 'Best Seller',
  },
];

export default function KiranaStoreOnline() {
  const [activeFulfillmentTab, setActiveFulfillmentTab] = useState<'delivery' | 'pickup'>('delivery');

  return (
    <PublicLayout>
      <SEO
        title="Kirana Store Online Kaise Banaye — Free Digital Dukaan | FeraSetu"
        description="Apne kirana store ko FeraSetu par online le jayein. 25 products free, WhatsApp cart orders, direct UPI payments, home delivery & pickup options, 0% commission."
        type="article"
        structuredData={{
          '@graph': [kiranaArticleSchema, kiranaFaqSchema, kiranaBreadcrumbSchema],
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs sm:text-sm font-semibold mb-6">
                <Store size={15} className="text-blue-600" />
                <span>Indian Kirana & Grocery Stores Ke Liye Dedicated Solution</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
                Apne Kirana Store Ko <span className="text-blue-600">Online Dukaan</span> Banayein — Zero Commission Par
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
                Ab aas-paas ke mohalle aur colony ke grahak aapki dukaan se seedha WhatsApp aur online order kar sakte hain. 
                Grocery catalog banayein, pack-sizes (500g, 1kg, 5kg) set karein, aur bina kisi middleman ya marketplace commission ke direct orders paayein.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5"
                >
                  <span>Free Me Kirana Store Banayein</span>
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base transition-colors"
                >
                  <span>Plans & Limits Dekhein</span>
                </Link>
              </div>

              {/* Verified Product Truth Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200/70 text-xs sm:text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span>Permanent ₹0 Free Entry</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span>0% Commission on Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span>Direct Customer UPI</span>
                </div>
              </div>
            </div>

            {/* Right Column: Authentic Kirana Visual & Live Store Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                {/* Visual Header */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Live Kirana Storefront</p>
                      <p className="text-sm font-bold text-white">sharmakirana.ferasetu.com</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
                    Grocery Verified
                  </span>
                </div>

                {/* Real Kirana Shopkeeper Picture */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src="/pictures/shop-owner-grocery.jpg"
                    alt="Indian kirana store owner managing grocery stock in his shop"
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <p className="text-sm font-bold">Sharma Kirana & General Store</p>
                    <p className="text-xs text-slate-200">Mohalla Delivery • Pay on Pickup / UPI</p>
                  </div>
                </div>

                {/* Simulated Order Notification */}
                <div className="p-4 bg-amber-50/70 border-b border-amber-200/60">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow">
                      <MessageSquare size={16} />
                    </div>
                    <div className="text-xs text-slate-700">
                      <p className="font-bold text-slate-900">New WhatsApp Grocery Order #1084</p>
                      <p className="text-slate-600 mt-0.5">4 Items (Atta 5kg, Sunflower Oil 1L, Toor Dal 1kg, Sugar 2kg)</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">₹685 Total</span>
                        <span className="text-slate-500">• Flat No. 402, Sunshine Apts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action footer */}
                <div className="p-4 bg-white flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Automatic GST Invoice Generated</span>
                  <span className="text-blue-600 font-bold">Ready to Dispatch</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* The Kirana Reality Section: What FeraSetu Actually Solves */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs sm:text-sm font-bold tracking-wider text-blue-600 uppercase bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-full">
              Built For Neighborhood Retail
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mt-3 mb-4">
              Kirana Store Ko Online Chalana Ab Phone Se Asaan Hai
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Marketplace apps par saman bechne par 15%–25% commission kat jaata hai aur grahak unka ban jata hai. 
              FeraSetu par aapka apna permanent store link banta hai jisme grahak aapke rehte hain aur pura munafa aapka hota hai.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-md shadow-blue-600/20">
                <Package size={22} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Pack Sizes & Loose Weight Variants
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Grocery me ek hi daal ya chawal ke alag-alag size bikte hain. FeraSetu me aap asani se 500g, 1kg, 2kg, aur 5kg ke pack-size bana sakte hain. Har variant ka daam aur stock alag control hota hai.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-5 shadow-md shadow-orange-500/20">
                <MessageSquare size={22} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                WhatsApp Par Structured Parchiyaan
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Grahak WhatsApp par hath se likhi aadhi-adhuri list bhejte hain jise padhna mushkil hota hai. FeraSetu cart se grahak saaf-suthra formatted order bhejte hain — item name, quantity, aur address ke saath.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-5 shadow-md shadow-emerald-600/20">
                <Zap size={22} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Direct UPI & Cash on Delivery (COD)
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Paisa kisi 14-din ke marketplace escrow me nahi rukta. Customer aapke UPI QR code par turant payment bhejte hain ya delivery par cash dete hain. Paisa seedha aapke bank account me.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Realistic Product Catalog & Stock Warning Demonstration */}
      <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Catalog Inspection</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Kirana Items & Stock Management Ka Real Preview
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-xl">
                Dekhein kaise aapke daily grocery products, retail prices, aur low-stock warnings dashboard me maintain hote hain:
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              <span>Apne 25 Free Products Add Karein</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Sample Product Catalog Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SAMPLE_GROCERY_ITEMS.map((item) => (
              <div key={item.name} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{item.category}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{item.tag}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">{item.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mb-3">Unit / Pack: {item.variant}</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-lg font-extrabold text-slate-900">{item.price}</span>
                    <span className="text-xs text-slate-400 line-through">MRP {item.mrp}</span>
                  </div>
                  <p className={`text-xs font-semibold flex items-center gap-1.5 ${item.stock.includes('Low stock') ? 'text-amber-600' : 'text-emerald-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.stock.includes('Low stock') ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    {item.stock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fulfillment: Home Delivery vs Store Pickup Walkthrough */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Dukaan Se Pickup Ho Ya Ghar Delivery — Dono Supported
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Customer apne aasan anusar option select kar sakta hai. Aapko order slip me delivery address aur fulfillment type saaf-saaf milta hai.
            </p>
          </div>

          {/* Fulfillment Toggle Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 md:p-8">
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-xl bg-slate-200/80 p-1">
                <button
                  type="button"
                  onClick={() => setActiveFulfillmentTab('delivery')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    activeFulfillmentTab === 'delivery'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Truck size={16} />
                  <span>Home Delivery Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFulfillmentTab('pickup')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    activeFulfillmentTab === 'pickup'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store size={16} />
                  <span>Store Pickup Mode</span>
                </button>
              </div>
            </div>

            {activeFulfillmentTab === 'delivery' ? (
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4 text-left">
                  <h3 className="text-xl font-bold text-slate-900">Mohalla & Colony Home Delivery</h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Customer checkout karte waqt apna building, flat number, aur landmark bharte hain. Aap apne delivery boy ya khud 10 minute me order dispatch kar sakte hain.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <span>Customer address order details me permanent saved rehta hai</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <span>Delivery charge set karne ki suvidha (e.g. Free above ₹499)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <span>Cash on delivery ya pre-paid UPI dono options available</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 font-mono text-xs text-slate-800 shadow-sm">
                  <p className="font-bold text-blue-700 mb-2">📦 FERASETU ORDER DETAILS #1084</p>
                  <p className="text-slate-500">TYPE: HOME DELIVERY</p>
                  <p className="text-slate-500">CUSTOMER: Ramesh Verma (9876543210)</p>
                  <p className="text-slate-500">ADDRESS: Flat 204, Radha Krishna Apts, Link Road</p>
                  <hr className="my-2 border-slate-200" />
                  <p>1. Chakki Atta 5kg - ₹245</p>
                  <p>2. Sunflower Oil 1L - ₹138</p>
                  <p>3. Toor Dal 1kg - ₹175</p>
                  <hr className="my-2 border-slate-200" />
                  <p className="font-bold text-slate-900">NET TOTAL: ₹558 (UNPAID / COD)</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4 text-left">
                  <h3 className="text-xl font-bold text-slate-900">Dukaan Par Ready-to-Collect Pickup</h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Customer ghar baithe saman choose kar lete hain. Aap saman pack karke counter par ready rakhte hain. Grahak aakar payment karke saman le jaata hai — dukaan par bheed aur time bachta hai.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <span>Zero delivery cost aur zero dispatch hassle</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <span>Ready order notification customer ko WhatsApp par milta hai</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <span>Counter par aakar UPI QR scan ya Cash se settlement</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 font-mono text-xs text-slate-800 shadow-sm">
                  <p className="font-bold text-emerald-700 mb-2">🏪 STORE PICKUP ORDER #1085</p>
                  <p className="text-slate-500">TYPE: SELF PICKUP AT COUNTER</p>
                  <p className="text-slate-500">CUSTOMER: Sunita Devi (9822334455)</p>
                  <p className="text-slate-500">STATUS: PACKED & READY AT COUNTER</p>
                  <hr className="my-2 border-slate-200" />
                  <p>1. Basmati Rice 1kg - ₹95</p>
                  <p>2. Tata Salt 1kg - ₹28</p>
                  <p>3. Everest Garam Masala 100g - ₹92</p>
                  <hr className="my-2 border-slate-200" />
                  <p className="font-bold text-slate-900">NET TOTAL: ₹215 (PAID VIA UPI)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Kirana Merchant FAQ */}
      <section className="py-16 md:py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-[850px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Aksar Pooche Jaane Wale Sawaal</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Kirana Store Online Karne Ke Baare Me Sawaal
            </h2>
          </div>

          <div className="space-y-4">
            {kiranaFaqSchema.mainEntity.map((faq) => (
              <details
                key={faq.name}
                className="group bg-white rounded-xl border border-slate-200 p-5 transition-colors open:border-blue-300"
              >
                <summary className="flex items-center justify-between cursor-pointer font-bold text-slate-900 text-base sm:text-lg select-none list-none">
                  <span>{faq.name}</span>
                  <span className="text-blue-600 group-open:rotate-180 transition-transform text-xl">▾</span>
                </summary>
                <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 pt-3">
                  {faq.acceptedAnswer.text}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Block */}
      <section className="py-16 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-center">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Aaj Hi Apni Kirana Dukaan Ko Online Le Aayein
          </h2>
          <p className="text-blue-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Free plan me 25 products, WhatsApp orders, aur professional invoices shamil hain. Koi credit card nahi chahiye.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5"
            >
              Kirana Store Free Me Shuru Karein →
            </Link>
            <Link
              to="/free-online-store"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base transition-colors border border-white/20"
            >
              Free Plan Ki Puri Details
            </Link>
          </div>
        </div>
      </section>

      {/* Contextual Internal Links */}
      <section className="py-10 bg-slate-100 border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 text-center text-xs sm:text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-3">FeraSetu Merchant Resources:</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link to="/online-dukaan-banaye" className="text-blue-600 hover:text-blue-800 hover:underline">
              Online Dukaan Kaise Banaye Step-by-Step
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/free-online-store" className="text-blue-600 hover:text-blue-800 hover:underline">
              ₹0 Free Online Store Plan Guide
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/shopify-alternative-india" className="text-blue-600 hover:text-blue-800 hover:underline">
              FeraSetu vs Shopify India Comparison
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/pricing" className="text-blue-600 hover:text-blue-800 hover:underline">
              Official FeraSetu Pricing & Limits
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

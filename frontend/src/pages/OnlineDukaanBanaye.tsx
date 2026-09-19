import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  ArrowRight,
  CheckCircle2,
  Package,
  Share2,
  ShoppingCart,
  Receipt,
  Smartphone,
  Sparkles,
  QrCode,
  Tag,
  Palette,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';

const dukaanFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Online dukaan banane ke liye kitna kharcha aata hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FeraSetu par online dukaan banana ₹0 se shuru hota hai. Free plan me aap 25 products add kar sakte hain, custom subdomain milta hai, direct WhatsApp orders aate hain, aur koi transaction commission nahi lagta.',
      },
    },
    {
      '@type': 'Question',
      name: 'Online dukaan banane me kitna samay lagta hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sirf 5 se 10 minute lagte hain. Register karein, dukaan ka naam dalein (jaise radhafashion), pehle 3-4 products photos aur prices ke saath add karein, aur apna store link WhatsApp par share karein.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya dukaan banane ke liye computer ya coding ki zaroorat hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Bilkul nahi! Poora setup aur management aap apne mobile phone ke browser se kar sakte hain. Coding ki zero requirement hai — bas photos upload karein aur price type karein.',
      },
    },
    {
      '@type': 'Question',
      name: 'Grahak mujhse kaise order karenge aur paise kaise denge?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Grahak aapke store link par jakar saman dekhte hain, cart me add karte hain, aur 1-click me structured WhatsApp order bhejte hain. Payment seedha aapke UPI QR code ya Cash on Delivery ke zariye aapke account me aati hai.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kaun-kaun si dukaan ke liye ye platform upyogi hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kirana, Kapde aur Sarees, Footwear, Electronics, Stationery, Mobile Accessories, Sweets & Bakery, Home Decor, aur Organic products jaise sabhi retail vyapari FeraSetu par apni dukaan chala rahe hain.',
      },
    },
  ],
};

const dukaanBreadcrumbSchema = {
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
      name: 'Online Dukaan Banaye',
      item: 'https://ferasetu.com/online-dukaan-banaye',
    },
  ],
};

const STEPS_GUIDE = [
  {
    step: '01',
    title: 'Dukaan Ka Naam & Subdomain Claim Karein',
    tag: '2 Minute Setup',
    description: 'FeraSetu par register karein aur apni dukaan ka naam daalein. Aapko turant apna personalized store address milta hai — jaise radhafashion.ferasetu.com. Koi domain khareedne ka jhanjhat nahi.',
    action: 'Dukaan ka naam claim karein',
    details: ['Personalized clean subdomain', 'Zero domain purchase cost', 'Free SSL security included'],
  },
  {
    step: '02',
    title: 'Products & Prices Phone Se Add Karein',
    tag: 'Phone Se Catalog',
    description: 'Apne mobile camera se saman ki photo lein, product ka naam, selling price, aur category dalein. Agar alag-alag size (S, M, L, XL ya 500g, 1kg) hain toh variants bhi aasani se banayein.',
    action: 'Products add karein',
    details: ['Variant management (sizes/weights)', 'Compare-at MRP discounts', 'Stock quantity tracking'],
  },
  {
    step: '03',
    title: 'WhatsApp Groups & Counter QR Par Share Karein',
    tag: 'Grahak Connect',
    description: 'Apna digital storefront link WhatsApp status, broadcast lists, aur regular customers ke saath share karein. Dukaan ke counter par QR code print karke lagayein taaki grahak ghar baithe re-order kar sakein.',
    action: 'Link share karein',
    details: ['1-Click WhatsApp share', 'Printable counter QR code', 'Instagram bio link ready'],
  },
  {
    step: '04',
    title: 'Structured Orders Paayein & Direct Payment Lein',
    tag: 'Fulfillment & Profits',
    description: 'Grahak cart banakar WhatsApp ya online order bhejte hain. Dashboard me order status update karein (Preparing, Out for Delivery, Delivered), auto GST bills print karein, aur 100% munafa paayein.',
    action: 'Order dispatch karein',
    details: ['Structured WhatsApp cart slip', 'Direct UPI payment QR', '1-Click GST PDF invoice'],
  },
];

const SUPPORTED_CATEGORIES = [
  { name: 'Kirana & Grocery', example: 'Chakki Atta, Dal, Tel, Spices', icon: '🛒' },
  { name: 'Fashion & Sarees', example: 'Kurtis, Sarees, Menswear, Kids', icon: '👗' },
  { name: 'Footwear & Shoes', example: 'Formal Shoes, Sandals, Chappals', icon: '👞' },
  { name: 'Electronics & Mobile', example: 'Chargers, Earphones, Accessories', icon: '📱' },
  { name: 'Stationery & Books', example: 'Notebooks, Pens, Art Supplies', icon: '📚' },
  { name: 'Sweets, Snacks & Food', example: 'Mithai, Namkeen, Bakery Items', icon: '🍱' },
];

export default function OnlineDukaanBanaye() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <PublicLayout>
      <SEO
        title="Online Dukaan Kaise Banaye — Step-by-Step Store Setup Guide | FeraSetu"
        description="Apni dukaan ka online website 4 aasan steps me banayein. Subdomain claim karein, products add karein, WhatsApp orders paayein. Free me dukaan online karein."
        structuredData={{
          '@graph': [dukaanFaqSchema, dukaanBreadcrumbSchema],
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-slate-50 pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-800 text-xs sm:text-sm font-semibold mb-6">
                <Sparkles size={15} className="text-orange-600" />
                <span>Action-Oriented Setup Blueprint for Indian Shopkeepers</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
                Apni Dukaan Ka Website <span className="text-blue-600">Kaise Banayein?</span> Step-by-Step Guide
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
                Coding ki koi zaroorat nahi. Na hi kisi website developer ko ₹25,000 dene hain. 
                FeraSetu par aap apne phone se 10 minute me apni dukaan live kar sakte hain — products dalein, WhatsApp par orders lein, aur direct UPI se payment paayein.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5"
                >
                  <span>Abhi Free Me Dukaan Banayein</span>
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/free-online-store"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base transition-colors"
                >
                  <span>Free Plan Ki Details Dekhein</span>
                </Link>
              </div>

              <div className="flex flex-wrap gap-5 text-xs sm:text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" /> 10 Minute Me Live
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Zero Coding Required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" /> ₹0 Se Shuruat
                </span>
              </div>
            </div>

            {/* Interactive Dukaan Blueprint Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 relative">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      FS
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Dukaan Live Roadmap</p>
                      <p className="text-[11px] text-slate-500">4 Clear Milestones</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                    Active Setup
                  </span>
                </div>

                <div className="space-y-3.5">
                  {STEPS_GUIDE.map((item, idx) => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setActiveStep(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        activeStep === idx
                          ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        activeStep === idx ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.step}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold leading-tight ${activeStep === idx ? 'text-blue-950' : 'text-slate-800'}`}>
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.tag}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-5 p-3.5 rounded-xl bg-slate-900 text-white text-xs">
                  <p className="font-bold text-orange-400 mb-1">Step {STEPS_GUIDE[activeStep].step} Highlight:</p>
                  <p className="text-slate-300 leading-relaxed">{STEPS_GUIDE[activeStep].description}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4 Detailed Practical Steps */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              Detailed Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mt-3 mb-4">
              Dukaan Online Karne Ke 4 Aasan Steps
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Yahan dekhein step-by-step kaise aapki dukaan physical counter se digital storefront banti hai:
            </p>
          </div>

          <div className="space-y-8">
            {STEPS_GUIDE.map((stepItem) => (
              <div
                key={stepItem.step}
                className="bg-slate-50 rounded-2xl border border-slate-200/90 p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start hover:shadow-sm transition-shadow"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-md shadow-blue-600/20">
                  {stepItem.step}
                </div>

                <div className="flex-grow">
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {stepItem.tag}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {stepItem.title}
                    </h3>
                  </div>

                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4">
                    {stepItem.description}
                  </p>

                  <div className="grid sm:grid-cols-3 gap-2.5 text-xs sm:text-sm text-slate-700 pt-3 border-t border-slate-200">
                    {stepItem.details.map((point) => (
                      <div key={point} className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Retail Categories Supported */}
      <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Multi-Category Flexibility</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2 mb-4">
              Har Tarah Ki Indian Retail Dukaan Ke Liye Ready
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Chahe aap kapde bechte hon, kirana, electronics ya sweets — FeraSetu ka catalog system har category ke liye customized hai:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SUPPORTED_CATEGORIES.map((cat) => (
              <div key={cat.name} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
                <span className="text-3xl p-2.5 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                  {cat.icon}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{cat.name}</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{cat.example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Ordering Experience Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Smooth Customer Journey</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2 mb-4">
                Grahak Ke Liye Saman Khareedna Utna Hi Aasan Jaisa WhatsApp Chalana
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                Kisi application ko download karne ki zaroorat nahi hoti. Grahak aapke link par click karte hain, phone browser me store khulta hai, saman bag me daalte hain aur seedha WhatsApp par order bhejte hain.
              </p>

              <div className="space-y-3.5 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">✓</div>
                  <p><strong>Mobile-First Speed:</strong> 2G aur 3G networks par bhi store turant load hota hai.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">✓</div>
                  <p><strong>Clean Cart Drawer:</strong> Customer ko item quantity ghatane-badhane ki poori azaadi.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">✓</div>
                  <p><strong>Instant Tax Invoice:</strong> Order complete hone par customer aur merchant dono ko invoice download milta hai.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white font-mono text-xs shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <span className="text-green-400 font-bold">📲 Incoming WhatsApp Cart Order</span>
                <span className="text-slate-400">Just Now</span>
              </div>
              <p className="text-slate-300">"Namaste! Maine aapki online dukaan se yeh saman order kiya hai:</p>
              <div className="my-3 p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1 text-slate-200">
                <p>• Pure Cotton Designer Kurti (Size: L) x 1 — ₹899</p>
                <p>• Printed Silk Dupatta (Red) x 1 — ₹299</p>
                <hr className="my-1.5 border-slate-700" />
                <p className="font-bold text-white">Total Amount: ₹1,198</p>
                <p className="text-slate-400">Payment: UPI on Delivery</p>
              </div>
              <p className="text-slate-300">Delivery Address: H.No. 45, Gandhi Nagar, Near Shiv Mandir</p>
              <p className="text-slate-400 mt-2">Kripya order confirm karein aur dispatch karein. Dhanyawaad!"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-16 md:py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-[850px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Aksar Pooche Jaane Wale Sawaal</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Online Dukaan Banane Ke Baare Me Sawaal
            </h2>
          </div>

          <div className="space-y-4">
            {dukaanFaqSchema.mainEntity.map((faq) => (
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
      <section className="py-16 bg-gradient-to-r from-orange-600 to-amber-700 text-white text-center">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Apni Dukaan Ko Aaj Hi Digital Banayein
          </h2>
          <p className="text-orange-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Free me shuru karein, WhatsApp par grahako se connect karein, aur 0% commission ke saath sell karein.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-orange-700 font-bold text-base shadow-lg transition-all hover:bg-orange-50 hover:-translate-y-0.5"
            >
              Apni Dukaan Free Me Banayein →
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
          <p className="font-semibold text-slate-800 mb-3">Zaroori Links:</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link to="/free-online-store" className="text-blue-600 hover:text-blue-800 hover:underline">
              Free Online Store Kaise Banaye
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/kirana-store-online" className="text-blue-600 hover:text-blue-800 hover:underline">
              Kirana & Grocery Online Store Solution
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/shopify-alternative-india" className="text-blue-600 hover:text-blue-800 hover:underline">
              Shopify vs FeraSetu India Comparison
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/pricing" className="text-blue-600 hover:text-blue-800 hover:underline">
              Pricing Plans & Feature Limits
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

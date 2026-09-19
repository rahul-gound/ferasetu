import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Zap,
  DollarSign,
  Globe,
  MessageSquare,
  Receipt,
  Scale,
  Percent,
  Layers,
  HelpCircle,
} from 'lucide-react';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';

const shopifyAlternativeFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Shopify ke mukable FeraSetu ka kharcha kitna kam hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Shopify Basic plan ₹1,999/month + GST se shuru hota hai, plus third-party gateway par 2% extra transaction fee lagti hai, aur WhatsApp/GST bills ke liye paid apps ($10–$30/mo) lene padte hain. FeraSetu par permanent ₹0 Free plan hai, aur Business plan sirf ₹399/month hai jisme WhatsApp cart, GST invoices, aur 0% commission pehle se shamil hain.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya FeraSetu par sales par koi transaction fee lagti hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Nahi. FeraSetu 0% platform transaction fee leta hai. Aapke customers jo bhi payment UPI, cards ya Cash on Delivery ke zariye karte hain, uska 100% revenue aapke paas rehta hai.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya FeraSetu me custom domain (jaise mystore.com) lag sakta hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Haan! FeraSetu ke Business plan (₹399/month) me aap apna custom domain (jaise www.yourbrand.com) bina kisi extra charge ke connect kar sakte hain. Free plan me aapko yourshop.ferasetu.com subdomain milta hai.',
      },
    },
    {
      '@type': 'Question',
      name: 'WhatsApp orders me Shopify aur FeraSetu me kya fark hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Shopify me native WhatsApp cart checkout nahi hota — iske liye alag se monthly paid app store plugins install karne padte hain. FeraSetu me 1-click WhatsApp cart drawer pehle se built-in hai jisme customer ka address, items, aur total calculation automatically format hokar aata hai.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya FeraSetu GST tax invoices generate karta hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Haan, har order ke sath automatic GST-compliant PDF invoice banta hai jise merchant aur customer dono 1-click me download ya print kar sakte hain. Iske liye kisi alag invoicing software ki zaroorat nahi padti.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kis business ke liye Shopify behtar hai aur kiske liye FeraSetu?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Agar aap ek badi global D2C enterprise hain jo US/Europe me international currency me bechti hai aur aapke paas full-time tech team hai, toh Shopify appropriate hai. Lekin agar aap Indian market me UPI, WhatsApp, aur local delivery ke saath sell kar rahe hain aur app-store subscription ke kharche se bachna chahte hain, toh FeraSetu designed for India hai.',
      },
    },
  ],
};

const shopifyBreadcrumbSchema = {
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
      name: 'Shopify Alternative India',
      item: 'https://ferasetu.com/shopify-alternative-india',
    },
  ],
};

const FACTUAL_COMPARISON = [
  {
    category: 'Software Cost',
    feature: 'Monthly Starting Price',
    shopify: '₹1,999 / mo + 18% GST (~₹2,358)',
    fera: '₹0 / mo (Permanent Free Tier)',
    advantage: 'fera',
  },
  {
    category: 'Software Cost',
    feature: 'Growth / Business Tier',
    shopify: '₹7,499 / mo (Shopify Plan)',
    fera: '₹399 / mo (FeraSetu Business)',
    advantage: 'fera',
  },
  {
    category: 'Commissions',
    feature: 'Platform Transaction Cut',
    shopify: '2.0% cut on external payment gateways',
    fera: '0% platform cut on all sales',
    advantage: 'fera',
  },
  {
    category: 'Channels',
    feature: 'Native WhatsApp Cart Checkout',
    shopify: 'Paid app required ($10–$30/mo extra)',
    fera: 'Built-in 1-click cart drawer',
    advantage: 'fera',
  },
  {
    category: 'Payments',
    feature: 'Direct Indian UPI Payments',
    shopify: 'Third-party gateway setup with payout delays',
    fera: 'Direct merchant UPI QR & Cashfree instant',
    advantage: 'fera',
  },
  {
    category: 'Compliance',
    feature: 'Automated GST Tax Invoices',
    shopify: 'Requires separate paid invoicing app',
    fera: 'Built-in 1-click PDF tax invoice',
    advantage: 'fera',
  },
  {
    category: 'Localization',
    feature: 'Indian Regional Languages',
    shopify: 'English-first (translation apps needed)',
    fera: '22 Indian Scheduled Languages + Hinglish',
    advantage: 'fera',
  },
  {
    category: 'Setup & Tech',
    feature: 'Technical Complexity',
    shopify: 'High (Liquid code, app ecosystem)',
    fera: 'Zero-code phone & desktop dashboard',
    advantage: 'fera',
  },
  {
    category: 'Scalability',
    feature: 'Cross-Border Global DTC (USD/EUR)',
    shopify: 'Global multicurrency & customs APIs',
    fera: 'India-focused retail & domestic commerce',
    advantage: 'shopify',
  },
];

export default function ShopifyAlternativeIndia() {
  return (
    <PublicLayout>
      <SEO
        title="Shopify Alternative India — Factual Comparison & Pricing | FeraSetu"
        description="Evaluating Shopify alternatives in India? Compare FeraSetu vs Shopify on pricing (₹0 vs ₹1,999+), 0% commissions, built-in WhatsApp orders, and Indian UPI payments."
        structuredData={{
          '@graph': [shopifyAlternativeFaqSchema, shopifyBreadcrumbSchema],
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-slate-50 pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-xs sm:text-sm font-semibold mb-6">
              <Scale size={15} className="text-blue-600" />
              <span>Factual & Objective Comparison for Indian Merchants</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
              Shopify Alternative in India — <span className="text-blue-600">Seedhi Baat</span>, Factual Comparison
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8">
              Shopify ek powerful global tool hai, lekin Indian retail ke liye har mahine ₹2,500+ subscription, 2% extra transaction fee, aur WhatsApp/GST apps ke alag kharche bojh ban jate hain. 
              Yahan dekhein dono platforms ka factual analysis.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5"
              >
                <span>FeraSetu Free Me Try Karein (₹0)</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base transition-colors"
              >
                <span>FeraSetu Full Pricing</span>
              </Link>
            </div>

            {/* Quick Summary Pill */}
            <div className="inline-flex flex-wrap justify-center items-center gap-4 sm:gap-8 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs sm:text-sm text-slate-700 font-medium">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> FeraSetu: 0% Platform Commission
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Built-in WhatsApp Cart
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Native Indian GST Invoices
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Factual Comparison Matrix */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[1050px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              Side-by-Side Reality
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mt-3 mb-4">
              Shopify vs FeraSetu: Concrete Feature & Cost Breakdown
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Dono platforms ki capabilities ko bina kisi hawa-hawai daawe ke compare karein:
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-slate-900 text-white font-bold text-xs sm:text-sm p-4 sm:p-5">
              <div className="col-span-4 sm:col-span-4">Evaluation Criteria</div>
              <div className="col-span-4 sm:col-span-4 text-center text-slate-300">Shopify (India)</div>
              <div className="col-span-4 sm:col-span-4 text-center text-blue-400">FeraSetu</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              {FACTUAL_COMPARISON.map((row, idx) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-12 p-4 items-center ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                  }`}
                >
                  <div className="col-span-4 sm:col-span-4">
                    <p className="text-slate-900 font-bold leading-tight">{row.feature}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{row.category}</p>
                  </div>
                  <div className="col-span-4 sm:col-span-4 text-center px-2 text-slate-600 font-medium">
                    {row.shopify}
                  </div>
                  <div className="col-span-4 sm:col-span-4 text-center px-2 font-bold text-blue-700">
                    {row.fera}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* When to Choose Which Platform: Honest Decision Rubric */}
      <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unbiased Guidance</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mt-2 mb-4">
              Aapke Business Ke Liye Kaun Sa Platform Sahi Hai?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Hum chahte hain ki aap apne business model ke hisab se sahi decision lein:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* When to choose Shopify */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                  🛍️
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">Aapko Shopify Chunna Chahiye Agar:</h3>
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="font-bold text-slate-400">•</span>
                  <span>Aap US, UK ya Europe me cross-border export karte hain aur foreign currencies (USD, EUR, GBP) me sell karte hain.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-bold text-slate-400">•</span>
                  <span>Aapka monthly software budget ₹10,000+ hai jisme multiple paid app subscriptions shamil hain.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-bold text-slate-400">•</span>
                  <span>Aapke paas in-house web developers hain jo Liquid code aur custom theme architectures manage karte hain.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-bold text-slate-400">•</span>
                  <span>Aapko complex ERP ya warehouse management integrations ki requirement hai.</span>
                </li>
              </ul>
            </div>

            {/* When to choose FeraSetu */}
            <div className="bg-blue-50/40 rounded-2xl border border-blue-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  🇮🇳
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-blue-950">Aapko FeraSetu Chunna Chahiye Agar:</h3>
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>Aap Indian customers ko direct UPI QR, Cash on Delivery, ya instant payment gateways se bechna chahte hain.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>Aapko 1-click WhatsApp cart ordering chahiye bina kisi extra paid plugin ke.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>Aap software par 0% commission chahte hain aur ₹0 se ₹399/mo ke honest budget me kaam karna chahte hain.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>Aapko automatic Indian GST tax invoices chahiye jo seedha PDF download ho jayein.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Data Portability & No-Lockin Commitment */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mb-4">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
            100% Data Portability & Exit Guarantee
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-2xl mx-auto mb-6">
            Aapka data aapka hai. FeraSetu par aap jab chahein apne saare products, customer details, aur order records ko 1-click me standard CSV format me export kar sakte hain. Koi lock-in nahi, koi penalty nahi.
          </p>
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
            <span>✓ Complete CSV Catalog Export</span>
            <span>•</span>
            <span>✓ Cancel Anytime</span>
            <span>•</span>
            <span>✓ Zero Exit Fees</span>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-16 md:py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-[850px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Clear & Honest Answers</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Shopify vs FeraSetu Ke Baare Me Aksar Pooche Jaane Wale Sawaal
            </h2>
          </div>

          <div className="space-y-4">
            {shopifyAlternativeFaqSchema.mainEntity.map((faq) => (
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

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-900 text-white text-center">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Mehenge Subscriptions Chhodiye, FeraSetu Par Shuru Karein
          </h2>
          <p className="text-blue-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            ₹0 Free tier se shuruat karein. Jab aapka catalog bade, tab sirf ₹399/month me upgrade karein.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5"
            >
              Free Me Dukaan Banayein →
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base transition-colors border border-white/20"
            >
              Plans & Pricing Details
            </Link>
          </div>
        </div>
      </section>

      {/* Contextual Internal Links */}
      <section className="py-10 bg-slate-100 border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 text-center text-xs sm:text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-3">Related Guides & Resources:</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link to="/free-online-store" className="text-blue-600 hover:text-blue-800 hover:underline">
              ₹0 Free Online Store Plan Details
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/online-dukaan-banaye" className="text-blue-600 hover:text-blue-800 hover:underline">
              Online Dukaan Banane Ka Step-by-Step Tarika
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/kirana-store-online" className="text-blue-600 hover:text-blue-800 hover:underline">
              Kirana & Grocery Store Online Solutions
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/pricing" className="text-blue-600 hover:text-blue-800 hover:underline">
              Official FeraSetu Pricing Plans
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

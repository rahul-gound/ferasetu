import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Store,
  Sparkles,
  Lock,
  Percent,
  Receipt,
  FileCheck,
  HelpCircle,
  Package,
} from 'lucide-react';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';

const freeStoreFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Kya FeraSetu par online store banana sach me bilkul free hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Haan, FeraSetu ka Free plan ₹0 me available hai. Koi credit card nahi maanga jaata aur koi setup fee nahi hai. Aap 25 products tak add kar sakte hain, custom subdomain milta hai, aur direct WhatsApp aur online orders process kar sakte hain.',
      },
    },
    {
      '@type': 'Question',
      name: 'Free plan me kaun-kaun se features shamil hain?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Free plan me 25 products limit, 20 FeraSetu AI credits/month, FeraSetu subdomain (yourshop.ferasetu.com), mobile-responsive storefront, WhatsApp 1-click cart drawer, direct UPI payment acceptance, order management dashboard, aur automatic PDF tax invoices shamil hain.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya meri sales par koi commission katega?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Nahi! FeraSetu 0% transaction commission leta hai. Marketplace platforms jaise 15%–30% cut lene ke bajay, aapka 100% customer revenue aapke paas rehta hai.',
      },
    },
    {
      '@type': 'Question',
      name: 'Free plan me kya limitations hain?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Free plan me अधिकतम 25 products add ho sakte hain, 1 staff account milta hai, aur 50MB storage milti hai. Custom domain (jaise yourshop.com), advanced analytics, aur low-stock automation ke liye Business plan (₹399/month) me upgrade karna hota hai.',
      },
    },
    {
      '@type': 'Question',
      name: 'Jab 25 se zyada products ho jayein toh kya hota hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Aap asani se Business plan me upgrade kar sakte hain jo sirf ₹399/month me 500 products, 200 AI credits, custom domain connection, aur low-stock inventory alerts provide karta hai.',
      },
    },
  ],
};

const freeStoreBreadcrumbSchema = {
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
      name: 'Free Online Store',
      item: 'https://ferasetu.com/free-online-store',
    },
  ],
};

const PLAN_COMPARISON = [
  {
    feature: 'Monthly Software Cost',
    free: '₹0 / Month (Permanent)',
    business: '₹399 / Month (₹3,990/yr)',
    highlight: true,
  },
  {
    feature: 'Product Catalog Limit',
    free: '25 Active Products',
    business: '500 Active Products',
    highlight: true,
  },
  {
    feature: 'Platform Sales Commission',
    free: '0% (You keep 100%)',
    business: '0% (You keep 100%)',
    highlight: false,
  },
  {
    feature: 'Storefront Subdomain',
    free: 'yourshop.ferasetu.com',
    business: 'yourshop.ferasetu.com',
    highlight: false,
  },
  {
    feature: 'Custom Domain (yourshop.com)',
    free: 'Not Included',
    business: 'Included (Connect custom domain)',
    highlight: false,
  },
  {
    feature: 'WhatsApp Cart Checkout',
    free: 'Built-in 1-Click Drawer',
    business: 'Built-in 1-Click Drawer',
    highlight: false,
  },
  {
    feature: 'FeraSetu AI Operations Copilot',
    free: '20 Credits / Month',
    business: '200 Credits / Month',
    highlight: false,
  },
  {
    feature: 'Automatic Tax Invoices (PDF)',
    free: 'Included for every order',
    business: 'Included for every order',
    highlight: false,
  },
  {
    feature: 'Low Stock Alerts & Inventory Tracking',
    free: 'Basic stock display',
    business: 'Automated warnings & restock insight',
    highlight: false,
  },
  {
    feature: 'Staff & Team Logins',
    free: '1 Admin Account',
    business: '2 Staff Accounts',
    highlight: false,
  },
  {
    feature: 'Media & File Storage',
    free: '50 MB',
    business: '1 GB',
    highlight: false,
  },
  {
    feature: 'Remove FeraSetu Branding',
    free: 'Powered by FeraSetu footer',
    business: '100% White-label storefront',
    highlight: false,
  },
];

export default function FreeOnlineStore() {
  return (
    <PublicLayout>
      <SEO
        title="Free Online Store Kaise Banaye — ₹0 Free Plan & Limits | FeraSetu"
        description="FeraSetu par ₹0 me apna online store shuru karein. 25 products, WhatsApp cart checkout, UPI payments, aur 0% commission. No credit card required."
        structuredData={{
          '@graph': [freeStoreFaqSchema, freeStoreBreadcrumbSchema],
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-slate-50 pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold mb-6">
              <Zap size={15} className="text-emerald-600" />
              <span>Permanent ₹0 Free Entry For Indian Retailers</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
              Free Me Online Store Banayein — <span className="text-blue-600">Zero Risk</span>, Zero Commission
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8">
              Apni dukaan ko digital karne ke liye pehle din se mehenge software subscription ya marketplace commission dene ki zaroorat nahi hai. 
              FeraSetu Free plan me aapko milti hai poori functioning dukaan — bina kisi credit card ke.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5"
              >
                <span>Free Account Banayein (₹0)</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base transition-colors"
              >
                <span>Full Pricing Comparison</span>
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-xs sm:text-sm text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" /> No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" /> 0% Transaction Fees
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" /> 25 Products Included
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" /> WhatsApp Orders Built-in
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Radical Transparency: What "Free" Actually Means on FeraSetu */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              Radical Transparency
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mt-3 mb-4">
              "Free" Ka Asli Matlab: Kya Milta Hai Aur Kya Nahi?
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Hum koi jhoothe "unlimited forever" daawe nahi karte. FeraSetu ka Free plan ek real, practical launching pad hai. Yahan saaf-saaf dekhein:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* What is Included */}
            <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200/80 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Free Plan Me Kya Shamil Hai:</h3>
              </div>
              <ul className="space-y-3.5 text-sm sm:text-base text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>25 Active Products:</strong> Photos, daam, variants, aur descriptions ke saath.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Store Subdomain:</strong> Aapki dukaan ka permanent address: <code className="text-xs bg-white px-1.5 py-0.5 rounded border">yourshop.ferasetu.com</code>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Direct WhatsApp Orders:</strong> Customer cart banakar 1-click me order bhejte hain.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>0% Commission:</strong> FeraSetu sales par koi platform fees nahi leta.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Automatic Invoices:</strong> Har order ka professional GST-ready PDF bill.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>20 FeraSetu AI Credits:</strong> Monthly copilot assistance for shop operations.</span>
                </li>
              </ul>
            </div>

            {/* What is NOT in Free (Requires Upgrade) */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center">
                  <XCircle size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Free Plan Me Kya Nahi Hai:</h3>
              </div>
              <ul className="space-y-3.5 text-sm sm:text-base text-slate-700">
                <li className="flex items-start gap-2.5">
                  <XCircle size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <span><strong>Custom Domain:</strong> <code className="text-xs bg-white px-1.5 py-0.5 rounded border">yourshop.com</code> connect karne ke liye Business plan chahiye.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <span><strong>More Than 25 Products:</strong> 26 se 500 products ke liye Business plan (₹399/mo) lagta hai.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <span><strong>Multiple Staff Logins:</strong> Free me 1 admin login hota hai (Business me 2 staff).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <span><strong>Automated Low-Stock Alerts:</strong> Advanced inventory warning Business tier me aati hai.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <span><strong>Remove FeraSetu Branding:</strong> Free stores par footer me "Powered by FeraSetu" rehta hai.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table: Free vs Business */}
      <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Side-by-Side Breakdown</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Free Plan (₹0) vs Business Plan (₹399) Comparison
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Aap kisi bhi waqt Free plan se shuru kar sakte hain aur jarurat padne par Business plan par switch kar sakte hain.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-slate-900 text-white font-bold text-xs sm:text-sm p-4 sm:p-5">
              <div className="col-span-6 sm:col-span-6">Feature & Capability</div>
              <div className="col-span-3 sm:col-span-3 text-center text-emerald-400">Free (₹0)</div>
              <div className="col-span-3 sm:col-span-3 text-center text-blue-300">Business (₹399)</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              {PLAN_COMPARISON.map((row, idx) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-12 p-3.5 sm:p-4 items-center ${
                    row.highlight ? 'bg-blue-50/40 font-semibold' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <div className="col-span-6 sm:col-span-6 text-slate-900 font-medium">
                    {row.feature}
                  </div>
                  <div className="col-span-3 sm:col-span-3 text-center text-slate-700 font-semibold">
                    {row.free}
                  </div>
                  <div className="col-span-3 sm:col-span-3 text-center text-blue-700 font-bold">
                    {row.business}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Responsibility Division: Merchant vs FeraSetu */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
              Aapko Kya Karna Hai Aur FeraSetu Kya Sambhalta Hai?
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Clear expectations hone se business chalana aasan hota hai:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Store size={20} className="text-blue-600" />
                <span>Aapka Kaam (Merchant Responsibility):</span>
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">•</span>
                  <span>Apne phone se products ki photo lena aur daam set karna.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">•</span>
                  <span>Apna store link mohalla WhatsApp groups aur customers ke saath share karna.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">•</span>
                  <span>Order aane par saman pack karke customer tak pahunchana ya counter par ready rakhna.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">•</span>
                  <span>Customer se payment UPI QR scan ya Cash me collect karna.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-600" />
                <span>FeraSetu Ka Kaam (Platform Technology):</span>
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span>Fast, mobile-optimized website hosting with free SSL security.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span>Seamless WhatsApp cart drawer technology jo formatted order banaati hai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span>Centralized order dashboard jisme status update aur customer details aate hain.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span>Automatic tax invoice generation jo 1-click me PDF download ho jaata hai.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Free Plan FAQ */}
      <section className="py-16 md:py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-[850px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Transparent Answers</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Free Online Store Ke Baare Me Aksar Pooche Jaane Wale Sawaal
            </h2>
          </div>

          <div className="space-y-4">
            {freeStoreFaqSchema.mainEntity.map((faq) => (
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
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-teal-800 text-white text-center">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            ₹0 Me Apni Dukaan Aaj Hi Online Karein
          </h2>
          <p className="text-emerald-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Koi credit card nahi. Koi hidden charges nahi. 25 products add karein aur turant orders lena shuru karein.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-emerald-800 font-bold text-base shadow-lg transition-all hover:bg-emerald-50 hover:-translate-y-0.5"
            >
              Free Store Create Karein →
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base transition-colors border border-white/20"
            >
              Business Plan (₹399) Dekhein
            </Link>
          </div>
        </div>
      </section>

      {/* Contextual Internal Links */}
      <section className="py-10 bg-slate-100 border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 text-center text-xs sm:text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-3">Explore Other Resources:</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link to="/online-dukaan-banaye" className="text-blue-600 hover:text-blue-800 hover:underline">
              Online Dukaan Kaise Banaye Guide
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/kirana-store-online" className="text-blue-600 hover:text-blue-800 hover:underline">
              Kirana & Grocery Store Online Solutions
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/shopify-alternative-india" className="text-blue-600 hover:text-blue-800 hover:underline">
              Shopify vs FeraSetu Pricing & Cost Comparison
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/pricing" className="text-blue-600 hover:text-blue-800 hover:underline">
              All Plans & Feature Limits
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

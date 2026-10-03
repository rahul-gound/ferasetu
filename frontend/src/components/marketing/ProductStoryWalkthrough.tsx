import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PackagePlus,
  Eye,
  ShoppingCart,
  CreditCard,
  BellRing,
  CheckCircle,
  TrendingUp,
  UserCheck,
  ArrowRight
} from 'lucide-react';

interface StoryScene {
  step: number;
  label: string;
  headline: string;
  summary: string;
  actor: 'Merchant' | 'Customer' | 'System' | 'Payment';
  icon: typeof PackagePlus;
  visual: {
    title: string;
    sub: string;
    details: Array<{ label: string; value: string }>;
    accentColor: string;
  };
}

const STORY_SCENES: StoryScene[] = [
  {
    step: 1,
    label: 'STEP 1: CREATION',
    headline: 'Merchant creates the product in seconds',
    summary: 'The store owner snaps a photo, sets the price (e.g. ₹34 for Farm Fresh Milk), and adds stock limit. With FeraSetu AI assistance, descriptions and tags generate in one tap.',
    actor: 'Merchant',
    icon: PackagePlus,
    visual: {
      title: 'New Product Added',
      sub: 'Farm Fresh Milk (500ml) · ₹34.00',
      details: [
        { label: 'Category', value: 'Dairy & Cold' },
        { label: 'Stock Initialized', value: '40 Units' },
        { label: 'Catalog Visibility', value: 'Immediate' },
      ],
      accentColor: 'border-blue-500',
    },
  },
  {
    step: 2,
    label: 'STEP 2: DISCOVERY',
    headline: 'Customer visits the merchant’s storefront',
    summary: 'A neighborhood customer clicks the store link (sharmageneral.ferasetu.com) from a WhatsApp status or counter QR code. No app download needed.',
    actor: 'Customer',
    icon: Eye,
    visual: {
      title: 'Storefront Opened',
      sub: 'sharmageneral.ferasetu.com',
      details: [
        { label: 'Load Time', value: '< 1 second' },
        { label: 'Device', value: 'Mobile Responsive' },
        { label: 'Catalog Items', value: 'Browsing live stock' },
      ],
      accentColor: 'border-green-500',
    },
  },
  {
    step: 3,
    label: 'STEP 3: ORDERING',
    headline: 'Customer builds cart and places order',
    summary: 'Customer picks milk, bread, and biscuits. They select delivery or in-store pickup, provide their address and contact number, and review clear line items.',
    actor: 'Customer',
    icon: ShoppingCart,
    visual: {
      title: 'Structured Cart Submitted',
      sub: '3 items · Subtotal ₹109.00',
      details: [
        { label: 'Items', value: 'Milk, Bread, Biscuits' },
        { label: 'Delivery Choice', value: 'Local Delivery' },
        { label: 'Destination', value: 'Flat 302, Green Ave' },
      ],
      accentColor: 'border-blue-600',
    },
  },
  {
    step: 4,
    label: 'STEP 4: PAYMENT',
    headline: 'Payment is securely processed directly',
    summary: 'Integrated payment gateways (Cashfree / Stripe) handle transaction security. FeraSetu collects 0% platform commission — 100% of the sale goes straight to the merchant.',
    actor: 'Payment',
    icon: CreditCard,
    visual: {
      title: 'Payment Completed',
      sub: '₹109.00 via Instant UPI / Card',
      details: [
        { label: 'Platform Fee', value: '₹0.00 (0% FeraSetu cut)' },
        { label: 'Destination', value: 'Merchant Bank Account' },
        { label: 'Status', value: 'Paid · Instant Record' },
      ],
      accentColor: 'border-emerald-500',
    },
  },
  {
    step: 5,
    label: 'STEP 5: NOTIFICATION',
    headline: 'Merchant receives organized order alert',
    summary: 'Order #1042 arrives in the merchant’s live dashboard with customer name, phone number, and exact item list. No deciphering messy chat messages.',
    actor: 'Merchant',
    icon: BellRing,
    visual: {
      title: 'New Order Alert #1042',
      sub: 'Ramesh K. · Paid Online',
      details: [
        { label: 'Order Status', value: 'Confirmed' },
        { label: 'Action Taken', value: 'Moved to Preparing' },
        { label: 'Invoice', value: 'Generated Automatically' },
      ],
      accentColor: 'border-purple-500',
    },
  },
  {
    step: 6,
    label: 'STEP 6: FULFILLMENT',
    headline: 'Merchant packs goods and coordinates delivery',
    summary: 'The shop staff packs items into a delivery bag. Merchant’s rider delivers to the customer doorstep and verifies the 4-digit delivery OTP code.',
    actor: 'Merchant',
    icon: CheckCircle,
    visual: {
      title: 'Handshake Verified',
      sub: 'Delivery OTP 4829 Confirmed',
      details: [
        { label: 'Fulfillment Type', value: 'Store Rider Dispatch' },
        { label: 'Delivery Verification', value: 'OTP Handshake Matched' },
        { label: 'Order Status', value: 'Delivered' },
      ],
      accentColor: 'border-teal-500',
    },
  },
  {
    step: 7,
    label: 'STEP 7: DATA OWNERSHIP',
    headline: 'Business sees what happened and retains insights',
    summary: 'The sale is automatically reflected in the merchant’s revenue trends, inventory levels decrease by 1 unit, and the customer profile is saved for repeat business.',
    actor: 'System',
    icon: TrendingUp,
    visual: {
      title: 'Business Intelligence Updated',
      sub: 'Today: ₹4,820 · 14 Orders',
      details: [
        { label: 'Stock Deduction', value: 'Milk: 39 Left' },
        { label: 'Customer Retention', value: 'Added to Contact List' },
        { label: 'Exportable', value: '100% Merchant Owned' },
      ],
      accentColor: 'border-orange-500',
    },
  },
  {
    step: 8,
    label: 'STEP 8: REORDER',
    headline: 'Customer returns directly to the store',
    summary: 'Because the customer knows the merchant’s permanent web address, next week’s groceries are ordered directly from the same store. No middleman poaching the customer.',
    actor: 'Customer',
    icon: UserCheck,
    visual: {
      title: 'Repeat Customer Order',
      sub: 'Ramesh K. · Order #1089',
      details: [
        { label: 'Source', value: 'Direct URL / Saved Bookmark' },
        { label: 'Commission Paid', value: '₹0 to marketplaces' },
        { label: 'Loyalty', value: 'Owned by Merchant' },
      ],
      accentColor: 'border-blue-700',
    },
  },
];

export default function ProductStoryWalkthrough() {
  const [activeStep, setActiveStep] = useState(1);
  const currentScene = STORY_SCENES.find((s) => s.step === activeStep) || STORY_SCENES[0];
  const Icon = currentScene.icon;

  return (
    <div className="w-full">
      {/* Story Timeline Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-8">
        {STORY_SCENES.map((scene) => {
          const isActive = scene.step === activeStep;
          return (
            <button
              key={scene.step}
              type="button"
              onClick={() => setActiveStep(scene.step)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className={`text-[10px] font-mono font-bold uppercase mb-1 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                Step {scene.step}
              </div>
              <div className="text-xs font-bold truncate">
                {scene.actor}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Story Stage */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-10 grid lg:grid-cols-12 gap-8 items-center">
        {/* Narrative Side */}
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Icon size={14} className="text-blue-600" />
            <span>{currentScene.label}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {currentScene.headline}
          </h3>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            {currentScene.summary}
          </p>

          <div className="pt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={activeStep === 1}
              onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              ← Previous Step
            </button>
            <button
              type="button"
              disabled={activeStep === STORY_SCENES.length}
              onClick={() => setActiveStep((prev) => Math.min(STORY_SCENES.length, prev + 1))}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-700 shadow-sm"
            >
              Next Step →
            </button>
          </div>
        </div>

        {/* Visual Card Side */}
        <div className="lg:col-span-5">
          <div className={`p-6 rounded-xl bg-slate-50 border-2 ${currentScene.visual.accentColor} shadow-md`}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Product State
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  {currentScene.visual.title}
                </h4>
              </div>
              <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center font-bold text-xs shadow-sm">
                #{activeStep}
              </span>
            </div>

            <p className="text-xs font-semibold text-blue-900 font-mono mb-4 bg-white p-2.5 rounded border border-slate-200">
              {currentScene.visual.sub}
            </p>

            <div className="space-y-2 text-xs">
              {currentScene.visual.details.map((d) => (
                <div key={d.label} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-500 font-medium">{d.label}</span>
                  <span className="font-bold text-slate-800">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Link to detailed features */}
      <div className="mt-8 text-center">
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors group"
        >
          <span>Explore everything FeraSetu can do</span>
          <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

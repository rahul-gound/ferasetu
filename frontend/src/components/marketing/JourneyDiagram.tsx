import {
  Compass,
  Store,
  CheckSquare,
  ShoppingCart,
  CreditCard,
  PackageCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface JourneyStep {
  key: string;
  stepNumber: string;
  title: string;
  role: string;
  actor: string;
  badge: string;
  description: string;
  icon: typeof Compass;
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    key: 'discover',
    stepNumber: '01',
    title: 'DISCOVER',
    role: 'Local Outreach',
    actor: 'Customer',
    badge: 'WhatsApp & QR',
    description: 'Finds your shop via shared WhatsApp link, QR code on your storefront, or direct link.',
    icon: Compass,
  },
  {
    key: 'visit',
    stepNumber: '02',
    title: 'VISIT',
    role: 'Digital Storefront',
    actor: 'FeraSetu System',
    badge: 'Unique URL',
    description: 'Opens your fast, responsive store at your unique link (yourshop.ferasetu.com).',
    icon: Store,
  },
  {
    key: 'choose',
    stepNumber: '03',
    title: 'CHOOSE',
    role: 'Catalog & Inventory',
    actor: 'Customer',
    badge: 'Live Stock',
    description: 'Browses real products, checks real-time prices, and adds items to their shopping cart.',
    icon: CheckSquare,
  },
  {
    key: 'order',
    stepNumber: '04',
    title: 'ORDER',
    role: 'Structured Cart',
    actor: 'FeraSetu Workflow',
    badge: 'Cart Checkout',
    description: 'Submits a structured order with exact quantities, notes, and delivery address.',
    icon: ShoppingCart,
  },
  {
    key: 'pay',
    stepNumber: '05',
    title: 'PAY',
    role: 'Payment Gateway',
    actor: 'Payment Provider',
    badge: '0% Commission',
    description: 'Customer pays directly via UPI or card. 0% FeraSetu cut; settles to merchant bank.',
    icon: CreditCard,
  },
  {
    key: 'fulfill',
    stepNumber: '06',
    title: 'FULFILL',
    role: 'Order Preparation',
    actor: 'Merchant Team',
    badge: 'Tax Invoice',
    description: 'Merchant receives instant notification, prints invoice, and packs physical goods.',
    icon: PackageCheck,
  },
  {
    key: 'deliver',
    stepNumber: '07',
    title: 'DELIVER',
    role: 'Last-Mile Transit',
    actor: 'Rider / Pickup',
    badge: 'OTP Handshake',
    description: 'Merchant rider or chosen carrier delivers package with secure OTP handshake.',
    icon: Truck,
  },
  {
    key: 'return',
    stepNumber: '08',
    title: 'RETURN',
    role: 'Repeat Relationship',
    actor: 'Merchant & Customer',
    badge: 'Owned Customer',
    description: 'Customer reorders directly. Merchant owns customer history and relationship.',
    icon: RotateCcw,
  },
];

export default function JourneyDiagram() {
  return (
    <div className="w-full">
      {/* 8-step connected timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-10">
        {JOURNEY_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isFinal = idx === JOURNEY_STEPS.length - 1;
          return (
            <div
              key={step.key}
              className="relative bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 tabular-nums tracking-normal">
                    STEP {step.stepNumber}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {step.actor}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon size={17} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-blue-700 font-semibold">
                      {step.role}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  {step.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  {step.badge}
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums tracking-normal">
                  {`0${idx + 1}/08`}
                </span>
              </div>

              {!isFinal && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <span className="w-4 h-4 rounded-full bg-white border border-slate-300 text-slate-400 flex items-center justify-center text-[10px] shadow-sm">
                    <ArrowRight size={9} aria-hidden="true" />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Differentiator Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-7 text-center max-w-3xl mx-auto shadow-sm">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
          <CheckCircle2 size={13} className="text-blue-600" aria-hidden="true" />
          <span>Connected Digital Workflow</span>
        </div>
        <h4 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
          One connected journey. One business relationship.
        </h4>
        <p className="text-slate-600 text-sm leading-relaxed max-w-2xl mx-auto">
          FeraSetu is not merely a website builder that leaves you stranded after the catalog is uploaded. It provides the digital workflow that connects your real-world store to ordering, payment, fulfillment, and customer retention.
        </p>
      </div>
    </div>
  );
}

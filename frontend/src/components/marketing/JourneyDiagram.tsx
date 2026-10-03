import {
  Compass,
  Store,
  CheckSquare,
  ShoppingCart,
  CreditCard,
  PackageCheck,
  Truck,
  RotateCcw
} from 'lucide-react';

interface JourneyStep {
  key: string;
  stepNumber: string;
  title: string;
  role: string;
  actor: string;
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
    description: 'Finds your shop via shared WhatsApp link, QR code on your storefront, or direct link.',
    icon: Compass,
  },
  {
    key: 'visit',
    stepNumber: '02',
    title: 'VISIT',
    role: 'Digital Storefront',
    actor: 'FeraSetu System',
    description: 'Opens your fast, responsive store at your unique link (yourshop.ferasetu.com).',
    icon: Store,
  },
  {
    key: 'choose',
    stepNumber: '03',
    title: 'CHOOSE',
    role: 'Catalog & Inventory',
    actor: 'Customer',
    description: 'Browses real products, checks real-time prices, and adds items to their shopping cart.',
    icon: CheckSquare,
  },
  {
    key: 'order',
    stepNumber: '04',
    title: 'ORDER',
    role: 'Structured Cart',
    actor: 'FeraSetu Workflow',
    description: 'Submits a structured order with exact quantities, notes, and delivery address.',
    icon: ShoppingCart,
  },
  {
    key: 'pay',
    stepNumber: '05',
    title: 'PAY',
    role: 'Payment Gateway',
    actor: 'Payment Provider',
    description: 'Customer pays directly via UPI or card. 0% FeraSetu cut; settles to merchant bank.',
    icon: CreditCard,
  },
  {
    key: 'fulfill',
    stepNumber: '06',
    title: 'FULFILL',
    role: 'Order Preparation',
    actor: 'Merchant Team',
    description: 'Merchant receives instant notification, prints invoice, and packs physical goods.',
    icon: PackageCheck,
  },
  {
    key: 'deliver',
    stepNumber: '07',
    title: 'DELIVER',
    role: 'Last-Mile Transit',
    actor: 'Rider / Pickup',
    description: 'Merchant rider or chosen carrier delivers package with secure OTP handshake.',
    icon: Truck,
  },
  {
    key: 'return',
    stepNumber: '08',
    title: 'RETURN',
    role: 'Repeat Relationship',
    actor: 'Merchant & Customer',
    description: 'Customer reorders directly. Merchant owns customer history and relationship.',
    icon: RotateCcw,
  },
];

export default function JourneyDiagram() {
  return (
    <div className="w-full">
      {/* 8-step connected timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {JOURNEY_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isFinal = idx === JOURNEY_STEPS.length - 1;
          return (
            <div
              key={step.key}
              className="relative bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {step.stepNumber}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {step.actor}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-blue-600 font-medium">
                      {step.role}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  {step.description}
                </p>
              </div>

              {!isFinal && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                  <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-[10px]">
                    →
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Differentiator Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 text-center max-w-3xl mx-auto">
        <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
          One connected journey. One business relationship.
        </h4>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          FeraSetu is not merely a website builder that leaves you stranded after the catalog is uploaded. It provides the digital workflow that connects your real-world store to ordering, payment, fulfillment, and customer retention.
        </p>
      </div>
    </div>
  );
}

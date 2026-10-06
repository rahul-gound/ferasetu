import { useState } from 'react';
import {
  Store,
  ShoppingCart,
  CreditCard,
  ClipboardList,
  Truck,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Lock,
  Printer,
  Download,
  Check,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  FileText
} from 'lucide-react';

interface EvidenceItem {
  id: string;
  tabLabel: string;
  tagline: string;
  title: string;
  description: string;
  icon: typeof Store;
  badge: string;
}

const EVIDENCE_TABS: EvidenceItem[] = [
  {
    id: 'storefront',
    tabLabel: '1. Storefront',
    tagline: 'YOUR DIGITAL FRONT DOOR',
    title: 'A live, branded storefront at your own URL',
    description: 'Customers browse your real catalog at your custom link (e.g. sharmageneral.ferasetu.com) without downloading an app or searching through a noisy marketplace.',
    icon: Store,
    badge: 'Live Storefront',
  },
  {
    id: 'ordering',
    tabLabel: '2. Customer Order',
    tagline: 'STRUCTURED ORDER INTAKE',
    title: 'Clean cart checkout with direct customer details',
    description: 'Customers choose items, pick delivery or in-store pickup, and submit clear, itemized orders. No lost messages or deciphering messy handwritten notes.',
    icon: ShoppingCart,
    badge: 'Checkout Workflow',
  },
  {
    id: 'payment',
    tabLabel: '3. Direct Payment',
    tagline: 'DIRECT SETTLEMENT',
    title: 'Money settles straight to your bank account',
    description: 'Integrated directly with trusted gateways like Cashfree (UPI, cards, netbanking) and Stripe. FeraSetu charges 0% platform commission — funds go directly to your business.',
    icon: CreditCard,
    badge: '0% Platform Commission',
  },
  {
    id: 'management',
    tabLabel: '4. Order Management',
    tagline: 'OPERATIONAL CLARITY',
    title: 'Manage status from confirmed to preparing',
    description: 'Your real-time order board tracks every stage: Pending → Confirmed → Preparing → Out for Delivery → Delivered. Print invoices or download PDF receipts with one click.',
    icon: ClipboardList,
    badge: 'Real-Time Orders',
  },
  {
    id: 'fulfillment',
    tabLabel: '5. Fulfillment & OTP',
    tagline: 'SECURE HANDSHAKE',
    title: 'OTP handshake for local delivery & in-store pickup',
    description: 'You pack the order in your shop. When your rider or customer receives it, verify the secure 4-digit delivery OTP to confirm the handshake. Safe, simple, accountable.',
    icon: Truck,
    badge: 'Delivery Verification',
  },
  {
    id: 'analytics',
    tabLabel: '6. Business Data',
    tagline: 'OWN YOUR DATA',
    title: 'Every customer, order, and rupee belongs to you',
    description: 'See total sales, top-selling items, and repeat customer trends in one clear dashboard. Your customer list is yours to keep, export, and nurture permanently.',
    icon: BarChart3,
    badge: 'Data Ownership',
  },
];

export default function EvidenceShowcase() {
  const [activeTab, setActiveTab] = useState('storefront');
  const current = EVIDENCE_TABS.find((t) => t.id === activeTab) || EVIDENCE_TABS[0];

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar border-b border-slate-200">
        {EVIDENCE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600'
                  : 'bg-white text-slate-700 hover:text-blue-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-white' : 'text-slate-500'} aria-hidden="true" />
              <span>{tab.tabLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Main Evidence Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden grid lg:grid-cols-12">
        {/* Left Explanation Column */}
        <div className="lg:col-span-5 p-7 lg:p-9 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              {current.tagline}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
              {current.title}
            </h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base mb-6">
              {current.description}
            </p>

            <div className="space-y-2.5 pt-4 border-t border-slate-200 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5 text-slate-700">
                <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Runs in the live FeraSetu web application today</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-700">
                <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Zero marketplace intermediaries between you and your buyer</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-700">
                <ShieldCheck size={15} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Merchant controls all prices, catalog items, and stock</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>EVIDENCE // STEP {EVIDENCE_TABS.findIndex((t) => t.id === activeTab) + 1} OF 6</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Real Interface
            </span>
          </div>
        </div>

        {/* Right UI Demonstration Canvas */}
        <div className="lg:col-span-7 p-5 sm:p-8 bg-slate-900 text-slate-100 flex items-center justify-center">
          {activeTab === 'storefront' && (
            <div className="w-full max-w-lg bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/40 font-sans text-xs">
              {/* Storefront Browser Chrome */}
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="bg-white px-3 py-0.5 rounded-md border border-slate-200 text-slate-600 font-mono text-[11px] flex items-center gap-1.5 truncate max-w-[220px]">
                  <Lock size={11} className="text-emerald-600 shrink-0" aria-hidden="true" />
                  <span className="truncate">sharmageneral.ferasetu.com</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Live
                </span>
              </div>

              {/* Storefront Content */}
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-900 text-sm">Sharma General Store</h4>
                      <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-medium">Verified</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Fresh groceries & essentials · Open 8:00 AM – 9:00 PM</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    SG
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-semibold">All Items</span>
                    <span className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium border border-slate-200">Dairy</span>
                    <span className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium border border-slate-200">Bakery</span>
                    <span className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium border border-slate-200">Pantry</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <div className="font-semibold text-slate-900 text-xs">Farm Fresh Milk (500ml)</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>Amul Taaza</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">In Stock (42 left)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-xs">₹34</span>
                        <button type="button" className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded border border-blue-200 text-[10px] transition-colors">
                          + Add
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <div className="font-semibold text-slate-900 text-xs">Whole Wheat Bread (400g)</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>Fresh Bakery</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">In Stock (18 left)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-xs">₹45</span>
                        <button type="button" className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded border border-blue-200 text-[10px] transition-colors">
                          + Add
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <div className="font-semibold text-slate-900 text-xs">Butter Marie Biscuits (250g)</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>Tea Time Snack</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">In Stock (60 left)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-xs">₹30</span>
                        <button type="button" className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded border border-blue-200 text-[10px] transition-colors">
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100">
                      Cart: 3 items
                    </span>
                    <span className="font-bold text-slate-900 text-xs">₹109.00</span>
                  </div>
                  <button type="button" className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-sm transition-colors">
                    <span>Checkout</span>
                    <ArrowRight size={12} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ordering' && (
            <div className="w-full max-w-lg bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/40 font-sans text-xs">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ShoppingCart size={13} className="text-blue-600" aria-hidden="true" />
                  Review &amp; Place Order
                </span>
                <span className="text-slate-500 font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                  Order Draft #FS-1042
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Phone size={10} aria-hidden="true" />
                      Direct Customer Contact
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">Verified</span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs">Ramesh Kumar</div>
                  <div className="text-slate-600 text-[11px] font-mono mt-0.5">+91 98765 43210</div>
                  <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-1">
                    <MapPin size={11} className="text-slate-400 shrink-0" aria-hidden="true" />
                    <span>Flat 302, Green Avenue, Sector 4</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                    Fulfillment Method
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg border border-blue-600 bg-blue-50/70 text-blue-900 font-bold text-center flex items-center justify-center gap-1.5">
                      <Check size={12} className="text-blue-600" aria-hidden="true" />
                      <span>Local Delivery</span>
                    </div>
                    <div className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 font-medium text-center">
                      Store Pickup
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Farm Fresh Milk (500ml) × 1</span>
                    <span className="font-mono text-slate-900">₹34.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Whole Wheat Bread (400g) × 1</span>
                    <span className="font-mono text-slate-900">₹45.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Butter Marie Biscuits (250g) × 1</span>
                    <span className="font-mono text-slate-900">₹30.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 text-xs pt-2 border-t border-slate-200">
                    <span>Total Order Value</span>
                    <span className="font-mono text-blue-900">₹109.00</span>
                  </div>
                </div>

                <button type="button" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-center rounded-lg text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                  <span>Confirm &amp; Pay ₹109.00</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="w-full max-w-lg bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/40 font-sans text-xs">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CreditCard size={13} className="text-blue-600" aria-hidden="true" />
                  Direct Payment Settlement
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold rounded text-[10px]">
                  <Lock size={10} aria-hidden="true" />
                  256-Bit Encrypted
                </span>
              </div>
              <div className="p-4 space-y-3.5">
                <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Settlement Destination</span>
                    <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">Active &amp; Verified</span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs mt-1">Sharma General Store Bank Account</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">HDFC Bank · A/C Ending in 8841</div>
                </div>

                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/40">
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>Gross Order Value</span>
                    <span className="font-bold text-slate-900 font-mono">₹109.00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span className="flex items-center gap-1 font-semibold text-blue-700">
                      FeraSetu Platform Cut
                    </span>
                    <span className="font-bold text-emerald-700 font-mono">0% (₹0.00)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-500 text-[11px]">
                    <span>Payment Gateway Fee (Cashfree / Stripe)</span>
                    <span className="text-slate-700 font-mono">Standard gateway rate</span>
                  </div>
                  <div className="flex justify-between pt-1.5 text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <Check size={13} aria-hidden="true" />
                      Net Merchant Payout
                    </span>
                    <span className="text-emerald-700 font-mono text-sm">100% of sale</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                  <ShieldCheck size={14} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    FeraSetu never holds merchant funds in an escrow pool. Funds settle directly into your bank account.
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'management' && (
            <div className="w-full max-w-lg bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/40 font-sans text-xs">
              <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <ClipboardList size={13} className="text-blue-400" aria-hidden="true" />
                  Merchant Orders Board
                </span>
                <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Order #FS-1042
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">Ramesh Kumar</span>
                    <span className="text-slate-500 text-[11px] ml-2">3 items · ₹109.00</span>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 font-bold rounded text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                    Preparing
                  </span>
                </div>

                {/* Status progression bar */}
                <div className="py-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Order Lifecycle</span>
                    <span className="text-emerald-700">Step 2 of 4</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
                    <div className="py-1 bg-emerald-600 text-white rounded flex items-center justify-center gap-0.5">
                      <Check size={10} aria-hidden="true" />
                      <span>Confirmed</span>
                    </div>
                    <div className="py-1 bg-purple-600 text-white rounded">Preparing</div>
                    <div className="py-1 bg-slate-100 text-slate-400 rounded border border-slate-200">Out for Delivery</div>
                    <div className="py-1 bg-slate-100 text-slate-400 rounded border border-slate-200">Delivered</div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-700">Amul Taaza Milk (500ml)</span>
                    <span className="font-bold text-slate-900">1×</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Whole Wheat Bread (400g)</span>
                    <span className="font-bold text-slate-900">1×</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Butter Marie Biscuits (250g)</span>
                    <span className="font-bold text-slate-900">1×</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                    <Printer size={12} aria-hidden="true" />
                    <span>Print Tax Invoice</span>
                  </button>
                  <button type="button" className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-center border border-slate-200 transition-colors cursor-pointer">
                    Mark Ready for Rider
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fulfillment' && (
            <div className="w-full max-w-lg bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/40 font-sans text-xs">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Truck size={13} className="text-blue-600" aria-hidden="true" />
                  Delivery Verification Handshake
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Secure OTP Handshake
                </span>
              </div>
              <div className="p-4 space-y-3.5">
                <div className="text-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium mb-1">
                    Customer presents verification code upon delivery or pickup
                  </div>
                  <div className="text-2xl font-black font-mono tracking-widest text-blue-900 my-1">
                    4 8 2 9
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Check size={11} aria-hidden="true" />
                    OTP Handshake Matches Order #FS-1042
                  </div>
                </div>

                <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                  <strong className="block mb-0.5 font-bold">Clear Operational Boundary:</strong>
                  FeraSetu does not own delivery trucks or operate a rider fleet. You fulfill orders using your own store staff, local delivery riders, or your preferred courier.
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                  <span className="text-slate-600">Proof of Handshake:</span>
                  <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 size={12} aria-hidden="true" />
                    Digital Confirmation Logged
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="w-full max-w-lg bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/40 font-sans text-xs">
              <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-blue-400" aria-hidden="true" />
                  Merchant Business Intelligence
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Sales Today</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">₹4,820</div>
                    <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                      <Check size={10} aria-hidden="true" />
                      14 orders completed
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Customer Retained</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">100%</div>
                    <div className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={10} aria-hidden="true" />
                      Direct relationship
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Customer Catalog Velocity</div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-700">1. Farm Fresh Milk (500ml)</span>
                      <span className="font-bold text-slate-900 font-mono">32 sold</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-700">2. Whole Wheat Bread (400g)</span>
                      <span className="font-bold text-slate-900 font-mono">18 sold</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-700">3. Butter Marie Biscuits</span>
                      <span className="font-bold text-slate-900 font-mono">14 sold</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200 text-blue-900 text-[11px] flex items-center justify-between">
                  <span className="font-medium">Customer Phone &amp; Data Ownership</span>
                  <button type="button" className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 text-[10px] bg-white px-2 py-0.5 rounded border border-blue-200 cursor-pointer">
                    <Download size={10} aria-hidden="true" />
                    Full CSV Export
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

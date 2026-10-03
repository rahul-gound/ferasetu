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
  Printer
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
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white text-slate-600 hover:text-blue-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-slate-500'} />
              <span>{tab.tabLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Main Evidence Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden grid lg:grid-cols-12">
        {/* Left Explanation Column */}
        <div className="lg:col-span-5 p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              {current.tagline}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">
              {current.title}
            </h3>
            <p className="text-slate-600 leading-relaxed text-base mb-6">
              {current.description}
            </p>

            <div className="space-y-3 pt-4 border-t border-slate-200/80 text-sm">
              <div className="flex items-start gap-2.5 text-slate-700">
                <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Runs in the live FeraSetu web application today</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-700">
                <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Zero marketplace intermediaries between you and your buyer</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-700">
                <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Merchant controls all prices, catalog items, and stock</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <span className="text-xs font-mono font-medium text-slate-500 block">
              EVIDENCE INSPECTOR // STEP {EVIDENCE_TABS.findIndex((t) => t.id === activeTab) + 1} OF 6
            </span>
          </div>
        </div>

        {/* Right UI Demonstration Canvas */}
        <div className="lg:col-span-7 p-6 sm:p-8 bg-slate-900 text-slate-100 flex items-center justify-center">
          {activeTab === 'storefront' && (
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 font-sans text-xs">
              {/* Storefront Browser Chrome */}
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="bg-white px-3 py-1 rounded border border-slate-200 text-slate-600 font-mono text-[11px] truncate max-w-[200px]">
                  https://sharmageneral.ferasetu.com
                </div>
                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                  Live
                </span>
              </div>
              {/* Storefront Content */}
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Sharma General Store</h4>
                    <p className="text-[11px] text-slate-500">Fresh groceries & essentials · Daily 8 AM – 9 PM</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    SG
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-blue-600 text-white rounded-md text-[11px] font-bold">All Items</span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px]">Dairy</span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px]">Bakery</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-800">Farm Fresh Milk (500ml)</div>
                        <div className="text-[10px] text-slate-500">Amul Taaza · In Stock</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">₹34</span>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200 text-[10px]">
                          + Add
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-800">Whole Wheat Bread (400g)</div>
                        <div className="text-[10px] text-slate-500">Fresh Bakery · In Stock</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">₹45</span>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200 text-[10px]">
                          + Add
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-800">Butter Marie Biscuits (250g)</div>
                        <div className="text-[10px] text-slate-500">Tea Time Snack · In Stock</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">₹30</span>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200 text-[10px]">
                          + Add
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Cart: 3 items (₹109)</span>
                  <span className="px-3 py-1.5 bg-orange-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1">
                    Checkout <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ordering' && (
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 font-sans text-xs">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Review & Place Order</span>
                <span className="text-slate-500 font-mono text-[11px]">Sharma General Store</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800 mb-1 text-[11px] uppercase tracking-wider text-slate-500">
                    Customer Details
                  </div>
                  <div className="font-semibold text-slate-900">Ramesh Kumar</div>
                  <div className="text-slate-600">+91 98765 43210</div>
                  <div className="text-slate-500 text-[11px]">Flat 302, Green Avenue, Sector 4</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800 mb-2 text-[11px] uppercase tracking-wider text-slate-500">
                    Fulfillment Method
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded border-2 border-blue-600 bg-blue-50/50 text-blue-900 font-bold text-center">
                      Local Delivery
                    </div>
                    <div className="p-2 rounded border border-slate-200 bg-white text-slate-600 font-medium text-center">
                      Store Pickup
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Farm Fresh Milk x 1</span>
                    <span>₹34.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Whole Wheat Bread x 1</span>
                    <span>₹45.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Butter Marie Biscuits x 1</span>
                    <span>₹30.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 text-xs pt-2 border-t border-slate-200">
                    <span>Total Order Value</span>
                    <span>₹109.00</span>
                  </div>
                </div>

                <div className="w-full py-2.5 bg-blue-600 text-white font-bold text-center rounded-lg text-xs shadow-md">
                  Proceed to Payment (₹109.00)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 font-sans text-xs">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Payment Processing</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-800 font-bold rounded text-[10px]">
                  256-Bit Encrypted
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                  <div className="text-[11px] text-blue-700 font-medium">Settlement Destination</div>
                  <div className="font-bold text-blue-950 text-sm mt-0.5">Sharma General Store Bank Account</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">HDFC Bank · A/C Ending in 8841</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                    <span>Gross Order Value</span>
                    <span className="font-bold text-slate-900">₹109.00</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                    <span className="flex items-center gap-1 font-semibold text-blue-700">
                      FeraSetu Platform Commission
                    </span>
                    <span className="font-bold text-green-600">0% (₹0.00)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                    <span className="text-slate-500">Third-Party Gateway Processing (Standard)</span>
                    <span className="text-slate-700">Configured provider</span>
                  </div>
                  <div className="flex justify-between py-2 text-xs font-bold text-slate-900">
                    <span>Net to Merchant</span>
                    <span className="text-green-600 text-sm">100% of sale</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                  <Lock size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    FeraSetu never holds your money in an escrow pool. Funds settle directly through supported gateways (Cashfree / Stripe).
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'management' && (
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 font-sans text-xs">
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-sm">Merchant Orders Board</span>
                <span className="text-[11px] font-mono text-slate-400">Order #1042</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">Ramesh K.</span>
                    <span className="text-slate-500 text-[11px] ml-2">3 items · ₹109</span>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-bold rounded-full text-[10px]">
                    ● Preparing
                  </span>
                </div>

                {/* Status progression bar */}
                <div className="py-2">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                    Order Status Workflow
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
                    <div className="py-1 bg-green-500 text-white rounded">Confirmed</div>
                    <div className="py-1 bg-purple-600 text-white rounded">Preparing</div>
                    <div className="py-1 bg-slate-100 text-slate-400 rounded">Out for Delivery</div>
                    <div className="py-1 bg-slate-100 text-slate-400 rounded">Delivered</div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Amul Taaza Milk (500ml)</span>
                    <span className="font-bold text-slate-800">1x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Whole Wheat Bread (400g)</span>
                    <span className="font-bold text-slate-800">1x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Butter Marie Biscuits (250g)</span>
                    <span className="font-bold text-slate-800">1x</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button className="flex-1 py-2 bg-blue-600 text-white rounded font-bold text-center flex items-center justify-center gap-1.5">
                    <Printer size={12} /> Print Invoice
                  </button>
                  <button className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-center">
                    Mark Ready for Rider
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fulfillment' && (
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 font-sans text-xs">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Delivery Verification Handshake</span>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Secure OTP
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium mb-1">
                    Customer presents verification code upon delivery or pickup
                  </div>
                  <div className="text-2xl font-black font-mono tracking-widest text-blue-900">
                    4 8 2 9
                  </div>
                  <div className="text-[10px] text-green-700 font-bold mt-1">
                    ✓ Handshake OTP Matches Order #1042
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                  <strong className="block mb-0.5">Clear Responsibility Boundary:</strong>
                  FeraSetu does not own delivery trucks or operate a rider fleet. You fulfill orders using your own store staff, local delivery riders, or your preferred courier.
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px]">
                  <span className="text-slate-600">Proof of Handshake:</span>
                  <span className="font-bold text-green-700">Digital Confirmation Logged</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 font-sans text-xs">
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-sm">Merchant Business Intelligence</span>
                <span className="text-[11px] text-green-400 font-bold">● Live Sync</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Sales Today</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">₹4,820</div>
                    <div className="text-[10px] text-green-600 font-semibold">14 orders completed</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Customer Retained</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">100%</div>
                    <div className="text-[10px] text-blue-600 font-semibold">Direct relationship</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Customer Catalog Velocity</div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-700">1. Farm Fresh Milk (500ml)</span>
                      <span className="font-bold text-slate-900">32 sold</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">2. Whole Wheat Bread (400g)</span>
                      <span className="font-bold text-slate-900">18 sold</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">3. Butter Marie Biscuits</span>
                      <span className="font-bold text-slate-900">14 sold</span>
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-blue-50 rounded border border-blue-200 text-blue-900 text-[11px] flex items-center justify-between">
                  <span>Customer Phone & Data Ownership</span>
                  <span className="font-bold text-blue-700">Full CSV Export</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

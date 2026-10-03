import { Info } from 'lucide-react';

interface BoundaryRow {
  area: string;
  ferasetuRole: string;
  merchantRole: string;
  thirdPartyRole: string;
}

const BOUNDARY_DATA: BoundaryRow[] = [
  {
    area: 'Online Storefront',
    ferasetuRole: 'Provides the digital storefront system, edge hosting, subdomain routing, and SSL.',
    merchantRole: 'Controls brand name, logo, product catalog, descriptions, prices, and store hours.',
    thirdPartyRole: 'Domain registrar (optional, if merchant links a custom .com / .in domain).',
  },
  {
    area: 'Order Intake',
    ferasetuRole: 'Provides structured cart checkout, WhatsApp order formatting, and live merchant alerts.',
    merchantRole: 'Reviews incoming orders, verifies item availability, and accepts or manages orders.',
    thirdPartyRole: 'Customer web browser / WhatsApp client submitting the order.',
  },
  {
    area: 'Payment Processing',
    ferasetuRole: 'Connects the checkout flow with 0% FeraSetu platform commission.',
    merchantRole: 'Connects merchant payment account; receives payouts directly into their own bank.',
    thirdPartyRole: 'Payment gateways (Cashfree / Stripe) process the money. Standard processing fees apply.',
  },
  {
    area: 'Physical Inventory',
    ferasetuRole: 'Provides digital inventory counters, stock tracking, and low-stock alerts.',
    merchantRole: 'Owns, procures, stores, and manages real physical goods. FeraSetu owns no inventory.',
    thirdPartyRole: 'Merchant’s wholesale suppliers and distributors.',
  },
  {
    area: 'Order Fulfillment',
    ferasetuRole: 'Provides workflow board (confirmed → preparing → ready), printable invoices, and receipts.',
    merchantRole: 'Inspects, picks, and packages the physical items from store shelves.',
    thirdPartyRole: 'None — order packing is 100% merchant-handled.',
  },
  {
    area: 'Delivery & Last-Mile',
    ferasetuRole: 'Provides order status tracking and a secure 4-digit OTP verification handshake.',
    merchantRole: 'Dispatches order via store staff/riders, local courier, or coordinates customer pickup.',
    thirdPartyRole: 'Merchant’s chosen rider or third-party courier. FeraSetu operates no delivery fleet.',
  },
  {
    area: 'Customer Data',
    ferasetuRole: 'Stores operational records securely. FeraSetu never sells customer lists or markets competitors.',
    merchantRole: 'Retains 100% direct ownership of customer relationships, phone numbers, and repeat sales.',
    thirdPartyRole: 'None — customer data belongs solely to the merchant.',
  },
];

export default function TransparencyTable() {
  return (
    <div className="w-full">
      {/* Notice Banner */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-sm flex items-start gap-3">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Our Commitment to Reality:</strong> We believe in absolute operational clarity. FeraSetu provides the digital bridge and workflow technology. We do not claim to operate warehouses, delivery fleets, or hold your cash.
        </div>
      </div>

      {/* Desktop / Tablet Table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th scope="col" className="px-6 py-4 w-1/4">Operational Area</th>
              <th scope="col" className="px-6 py-4 w-1/4 text-blue-900 bg-blue-50/40">FeraSetu System</th>
              <th scope="col" className="px-6 py-4 w-1/4 text-slate-900">Merchant Responsibility</th>
              <th scope="col" className="px-6 py-4 w-1/4 text-slate-500">Third-Party Providers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {BOUNDARY_DATA.map((row, idx) => (
              <tr key={row.area} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                <td className="px-6 py-4 font-bold text-slate-900 align-top">
                  {row.area}
                </td>
                <td className="px-6 py-4 text-slate-700 bg-blue-50/20 align-top leading-relaxed">
                  <span className="font-semibold text-blue-700 block text-xs uppercase mb-1">Digital Infrastructure</span>
                  {row.ferasetuRole}
                </td>
                <td className="px-6 py-4 text-slate-700 align-top leading-relaxed">
                  <span className="font-semibold text-slate-900 block text-xs uppercase mb-1">Merchant Controls</span>
                  {row.merchantRole}
                </td>
                <td className="px-6 py-4 text-slate-500 align-top leading-relaxed text-xs">
                  <span className="font-semibold text-slate-400 block uppercase mb-1">External Service</span>
                  {row.thirdPartyRole}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {BOUNDARY_DATA.map((row) => (
          <div key={row.area} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
              {row.area}
            </h4>
            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <span className="text-xs font-bold text-blue-800 uppercase block mb-1">
                FeraSetu System
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {row.ferasetuRole}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-900 uppercase block mb-1">
                Merchant Responsibility
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {row.merchantRole}
              </p>
            </div>
            <div className="p-2.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-400 uppercase block text-[10px] mb-0.5">
                Third-Party Providers
              </span>
              {row.thirdPartyRole}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

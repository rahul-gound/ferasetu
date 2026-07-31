import { TrendingUp, ShoppingCart, Users, Package, Activity } from 'lucide-react';

export function DashboardPreview() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-secondary/20 rounded-3xl blur-2xl -z-10" />

      {/* Dashboard container */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">FeraSetu Dashboard</h3>
              <p className="text-xs text-slate-500">Today</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-slate-300 rounded-full" />
            <div className="w-3 h-3 bg-slate-300 rounded-full" />
            <div className="w-3 h-3 bg-slate-300 rounded-full" />
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-8 bg-white">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Today's Orders */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Today's Orders</span>
                <ShoppingCart size={16} className="text-primary" />
              </div>
              <div className="text-2xl font-bold text-slate-900">42</div>
              <p className="text-xs text-green-600 mt-1">↑ 12% from yesterday</p>
            </div>

            {/* Revenue */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Revenue</span>
                <TrendingUp size={16} className="text-primary" />
              </div>
              <div className="text-2xl font-bold text-slate-900">₹84.5K</div>
              <p className="text-xs text-green-600 mt-1">↑ 8% this week</p>
            </div>

            {/* Customers */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Customers</span>
                <Users size={16} className="text-primary" />
              </div>
              <div className="text-2xl font-bold text-slate-900">1,284</div>
              <p className="text-xs text-green-600 mt-1">↑ 23 new today</p>
            </div>

            {/* Inventory */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Inventory</span>
                <Package size={16} className="text-primary" />
              </div>
              <div className="text-2xl font-bold text-slate-900">324</div>
              <p className="text-xs text-orange-600 mt-1">⚠ 12 low stock</p>
            </div>
          </div>

          {/* Chart area - simple representation */}
          <div className="bg-gradient-to-b from-slate-50 to-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-end gap-2 h-32 justify-around mb-4">
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-gradient-to-t from-primary to-secondary rounded-t" style={{ height: '40%' }} />
                <span className="text-xs text-slate-500">Mon</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-gradient-to-t from-primary to-secondary rounded-t" style={{ height: '60%' }} />
                <span className="text-xs text-slate-500">Tue</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-gradient-to-t from-primary to-secondary rounded-t" style={{ height: '75%' }} />
                <span className="text-xs text-slate-500">Wed</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-gradient-to-t from-primary to-secondary rounded-t" style={{ height: '85%' }} />
                <span className="text-xs text-slate-500">Thu</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-gradient-to-t from-primary to-secondary rounded-t" style={{ height: '90%' }} />
                <span className="text-xs text-slate-500">Fri</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-gradient-to-t from-primary to-secondary rounded-t" style={{ height: '70%' }} />
                <span className="text-xs text-slate-500">Sat</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">Weekly Revenue Trend</p>
          </div>
        </div>
      </div>
    </div>
  );
}

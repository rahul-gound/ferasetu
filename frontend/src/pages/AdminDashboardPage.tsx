import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, DollarSign, Activity, ShoppingBag, 
  TrendingUp, Bot, CheckCircle2,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API}/admin/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load platform stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const chartData = (data?.revenueChart || []).map((row: any) => ({
    name: new Date(row.date).toLocaleDateString(undefined, { weekday: 'short' }),
    revenue: row.revenue || 0,
    orders: row.orders || 0,
  }));

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
          <KpiCard 
            title="Total Revenue" 
            value={`₹${data?.stats?.totalRevenue?.toLocaleString()}`} 
            trend="Live" 
            trendUp={true}
            icon={<DollarSign className="text-emerald-500" />}
            color="emerald"
          />
          <KpiCard 
            title="Active Shopkeepers" 
            value={data?.stats?.totalUsers} 
            trend={`${data?.stats?.activeUsers || 0} active`} 
            trendUp={true}
            icon={<Users className="text-blue-500" />}
            color="blue"
          />
          <KpiCard 
            title="Global Orders" 
            value={data?.stats?.totalOrders} 
            trend={`${data?.stats?.totalProducts || 0} products`} 
            trendUp={true}
            icon={<ShoppingBag className="text-purple-500" />}
            color="purple"
          />
          <KpiCard 
            title="Conversion Rate" 
            value={`${data?.stats?.conversionRate}%`} 
            trend={`${data?.stats?.premiumUsers || 0} paid`} 
            trendUp={true}
            icon={<TrendingUp className="text-orange-500" />}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm shadow-slate-100 min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900">Revenue Growth</h3>
                <p className="text-sm text-slate-500 font-medium">Platform-wide income performance</p>
              </div>
              <select className="bg-slate-50 border-none rounded-xl text-sm font-bold px-4 py-2 outline-none text-slate-600 cursor-pointer">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
              <ResponsiveContainer width="99%" height={350}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'}}
                  />
                  <Area isAnimationActive={false} type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Health */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm shadow-slate-100 h-full">
              <h3 className="text-lg font-black text-slate-900 mb-6">System Health</h3>
              <div className="space-y-6">
                <HealthItem 
                  label="Database" 
                  status={data?.health?.database} 
                  icon={<Activity size={18} />} 
                />
                <HealthItem 
                  label="SMTP Service" 
                  status={data?.health?.smtp} 
                  icon={<CheckCircle2 size={18} />} 
                />
                <HealthItem 
                  label="AI Engine (Sarvam)" 
                  status="operational" 
                  icon={<Bot size={18} />} 
                />
                
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Uptime</span>
                    <span className="text-sm font-black text-slate-900">99.98%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[99.98%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function KpiCard({ title, value, trend, trendUp, icon, color }: any) {
  const colorMap: any = {
    emerald: 'bg-emerald-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-black ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function HealthItem({ label, status, icon }: any) {
  const isOk = status === 'operational' || status === 'true';
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={isOk ? 'text-emerald-500' : 'text-rose-500'}>
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        {isOk ? 'Stable' : 'Error'}
      </span>
    </div>
  );
}

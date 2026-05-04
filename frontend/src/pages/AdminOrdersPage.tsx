import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Clock, ChevronLeft, ChevronRight, Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('admin_token');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/orders`, {
        params: { page, limit: 10, status },
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data.orders);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load global orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, status]);

  const totalPages = Math.ceil(total / 10);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-slate-900">Global Orders Monitor</h2>
          <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl">
            {['all', 'pending', 'paid', 'delivered'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`
                  px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all
                  ${status === s ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                `}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Shop / Partner</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold animate-pulse">Syncing orders...</td></tr>)
                ) : orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-900">#{order.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{order.customer_name}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Store size={14} className="text-orange-500" />
                        <span className="font-bold text-slate-700">{order.shop_name}</span>
                      </div>
                      <div className="text-xs text-slate-400 ml-6">{order.user_email}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-900">₹{order.total?.toLocaleString()}</div>
                      <div className={`text-[10px] font-black uppercase ${order.payment_status === 'paid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {order.payment_status}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`
                        px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                          'bg-blue-100 text-blue-700 border-blue-200'}
                      `}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <Clock size={12} /> {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-500">
              Total Results: <span className="text-slate-900 font-black">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p-1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                disabled={page === totalPages || totalPages === 0}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

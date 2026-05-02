import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, Store, ExternalLink, Package, 
  ChevronLeft, ChevronRight, Globe, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('admin_token');

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/shops`, {
        params: { page, limit: 10 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setShops(res.data.shops);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [page]);

  const totalPages = Math.ceil(total / 10);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Platform Websites</h2>
          <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200">
            Total Shops: <span className="text-slate-900">{total}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Shop Name</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Owner</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Products</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Created</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold animate-pulse">Loading shops...</td></tr>)
                ) : shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                          <Store size={20} />
                        </div>
                        <div>
                          <div className="font-black text-slate-900">{shop.shop_name}</div>
                          <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Globe size={10} /> {shop.subdomain}.fera-shop.fera-search.tech
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-700">{shop.owner_name}</div>
                      <div className="text-xs text-slate-400">{shop.owner_email}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 font-black text-slate-900">
                        <Package size={14} className="text-slate-400" />
                        {shop.product_count}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-bold text-slate-600">
                        {new Date(shop.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <a 
                        href={`/shop/${shop.shop_name}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Visit <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-500">
              Page {page} of {totalPages || 1}
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

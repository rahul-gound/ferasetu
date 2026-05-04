import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, ShieldAlert, ShieldCheck, UserCog, 
  Trash2, ChevronLeft, ChevronRight,
  Package, ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('admin_token');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/users`, {
        params: { page, search, limit: 10 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleUpdatePlan = async (id: string, plan: string) => {
    try {
      await axios.patch(`${API}/admin/users/${id}/plan`, 
        { plan }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(u => u.id === id ? { ...u, plan } : u));
      toast.success(`Plan updated to ${plan}`);
    } catch (err) {
      toast.error('Failed to update plan');
    }
  };

  const handleToggleBlock = async (id: string, currentStatus: number) => {
    try {
      await axios.patch(`${API}/admin/users/${id}/status`, 
        { is_blocked: !currentStatus }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(u => u.id === id ? { ...u, is_blocked: !currentStatus } : u));
      toast.success(currentStatus ? 'Partner unblocked' : 'Partner blocked');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleImpersonate = async (id: string) => {
    try {
      const res = await axios.post(`${API}/admin/users/${id}/impersonate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Store user token and redirect to dashboard
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success(`Entering impersonation mode: ${res.data.user.name}`);
      window.open('/dashboard', '_blank');
    } catch (err) {
      toast.error('Impersonation failed');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`🚨 DANGER: Are you sure you want to delete "${name}"? This will permanently remove all their products, orders, and data. This action CANNOT be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Partner deleted successfully');
      setUsers(users.filter(u => u.id !== id));
      setTotal(prev => prev - 1);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to delete partner';
      toast.error(errorMsg);
    }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by email, name or shop..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium"
            />
          </div>
          <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            Total Partners: <span className="text-slate-900">{total}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Partner Details</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Business</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Activity</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
                ) : users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                          {user.name[0]}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 leading-none mb-1">{user.name}</div>
                          <div className="text-xs font-bold text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-700">{user.business_name || '—'}</div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        <span className="flex items-center gap-1"><Package size={12} /> {user.product_count}</span>
                        <span className="flex items-center gap-1"><ShoppingCart size={12} /> {user.order_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <select 
                        value={user.plan} 
                        onChange={(e) => handleUpdatePlan(user.id, e.target.value)}
                        className={`
                          px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer
                          ${user.plan === 'pro' || user.plan === 'premium' 
                            ? 'bg-purple-100 text-purple-700 border-purple-200' 
                            : user.plan === 'free' 
                              ? 'bg-slate-100 text-slate-600 border-slate-200' 
                              : 'bg-blue-100 text-blue-700 border-blue-200'}
                        `}
                      >
                        {['free', 'trial', 'basic', 'standard', 'pro', 'premium'].map(p => (
                          <option key={p} value={p}>{p.toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-bold text-slate-600">Joined</div>
                      <div className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-tighter">
                        {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleImpersonate(user.id)}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Impersonate"
                        >
                          <UserCog size={18} />
                        </button>
                        <button 
                          onClick={() => handleToggleBlock(user.id, user.is_blocked)}
                          className={`p-2.5 rounded-xl transition-all ${user.is_blocked ? 'text-emerald-600 bg-emerald-50' : 'text-orange-600 bg-orange-50 hover:bg-orange-100'}`}
                          title={user.is_blocked ? 'Unblock' : 'Block'}
                        >
                          {user.is_blocked ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-500">
              Showing <span className="text-slate-900">{(page-1)*10+1}</span> to <span className="text-slate-900">{Math.min(page*10, total)}</span> of <span className="text-slate-900">{total}</span> partners
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p-1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button 
                    key={p}
                    onClick={() => setPage(p)}
                    className={`
                      w-8 h-8 rounded-lg text-xs font-black transition-all
                      ${page === p ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white border border-transparent hover:border-slate-200 text-slate-500'}
                    `}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
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

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-5"><div className="h-10 w-40 bg-slate-100 rounded-xl animate-pulse" /></td>
      <td className="px-6 py-5"><div className="h-6 w-24 bg-slate-100 rounded-xl animate-pulse" /></td>
      <td className="px-6 py-5"><div className="h-6 w-16 bg-slate-100 rounded-xl animate-pulse" /></td>
      <td className="px-6 py-5"><div className="h-6 w-20 bg-slate-100 rounded-xl animate-pulse" /></td>
      <td className="px-6 py-5 text-right"><div className="h-8 w-24 bg-slate-100 rounded-xl animate-pulse ml-auto" /></td>
    </tr>
  );
}

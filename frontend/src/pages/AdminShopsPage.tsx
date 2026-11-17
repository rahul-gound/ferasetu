import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Store, ExternalLink, Package, 
  ChevronLeft, ChevronRight, Globe, Edit2, Check, X, Search, AlertCircle, Sparkles, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit URL Modal State
  const [editingShop, setEditingShop] = useState<any | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const token = localStorage.getItem('admin_token');

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/shops`, {
        params: { page, limit: 10 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setShops(res.data.shops || []);
      setTotal(res.data.total || 0);
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

  // Filtered shops based on local search query
  const filteredShops = useMemo(() => {
    if (!searchQuery.trim()) return shops;
    const q = searchQuery.toLowerCase();
    return shops.filter(s => 
      s.shop_name?.toLowerCase().includes(q) ||
      s.owner_name?.toLowerCase().includes(q) ||
      s.owner_email?.toLowerCase().includes(q) ||
      s.subdomain?.toLowerCase().includes(q) ||
      s.hostname?.toLowerCase().includes(q)
    );
  }, [shops, searchQuery]);

  const handleOpenEditModal = (shop: any) => {
    setEditingShop(shop);
    // Pre-fill with existing custom_domain or subdomain
    const currentDomain = shop.custom_domain || shop.hostname || `${shop.subdomain || 'store'}.ferasetu.com`;
    setInputUrl(currentDomain);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setEditingShop(null);
    setInputUrl('');
  };

  // Preview computed URL
  const previewUrl = useMemo(() => {
    const raw = inputUrl.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (!raw) return '';
    if (raw.endsWith('.ferasetu.com') || raw.endsWith('.fera-search.tech')) {
      return `https://${raw}`;
    }
    if (!raw.includes('.')) {
      const slug = raw.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
      return `https://${slug || 'store'}.ferasetu.com`;
    }
    return `https://${raw}`;
  }, [inputUrl]);

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;

    const trimmed = inputUrl.trim();
    if (!trimmed) {
      toast.error('Please enter a valid website URL or subdomain');
      return;
    }

    setIsSaving(true);
    try {
      const res = await axios.put(
        `${API}/admin/shops/${editingShop.id}/url`,
        { website_url: trimmed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data?.message || 'Website URL updated! Shopkeeper notified on their dashboard.');
      setEditingShop(null);
      setInputUrl('');
      // Refresh list to show updated URL
      fetchShops();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to update website URL';
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Platform Websites</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Manage shopkeeper store URLs, custom domains, and platform storefront addresses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
              Total Shops: <span className="text-slate-900 font-black">{total}</span>
            </div>
            <button
              onClick={() => fetchShops()}
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-xs"
              title="Refresh list"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <Search size={18} className="text-slate-400 ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop name, subdomain, custom domain, or owner email..."
            className="w-full text-sm font-medium bg-transparent border-none outline-hidden text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Shops Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Shop Name & Website URL</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Owner</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Products</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Created</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold animate-pulse">
                        Loading shops...
                      </td>
                    </tr>
                  ))
                ) : filteredShops.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Store size={24} />
                      </div>
                      <div className="font-bold text-slate-700">No shops found</div>
                      <div className="text-xs text-slate-400 mt-1">Try refining your search keyword</div>
                    </td>
                  </tr>
                ) : filteredShops.map((shop) => {
                  const currentHostname = shop.hostname || (shop.subdomain ? `${shop.subdomain}.ferasetu.com` : 'store.ferasetu.com');
                  const currentFullUrl = `https://${currentHostname}`;

                  return (
                    <tr key={shop.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <Store size={20} />
                          </div>
                          <div>
                            <div className="font-black text-slate-900">{shop.shop_name}</div>
                            <div className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Globe size={11} className="text-orange-500 shrink-0" />
                              <span className="truncate max-w-[240px]">{currentHostname}</span>
                              {shop.custom_domain && (
                                <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase">
                                  Custom Domain
                                </span>
                              )}
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
                          {shop.created_at ? new Date(shop.created_at).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(shop)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 hover:text-orange-800 rounded-xl text-xs font-bold border border-orange-200/80 transition-all cursor-pointer shadow-xs active:scale-98"
                            title="Edit website URL and notify shopkeeper"
                          >
                            <Edit2 size={13} />
                            <span>Edit URL</span>
                          </button>
                          <a 
                            href={currentFullUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
                            title="Visit live storefront"
                          >
                            <span>Visit</span>
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-500">
              Page {page} of {totalPages || 1}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p-1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                disabled={page === totalPages || totalPages === 0}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── EDIT WEBSITE URL MODAL ── */}
        {editingShop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Edit Website URL</h3>
                    <p className="text-xs font-bold text-slate-500">{editingShop.shop_name}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Shop Owner Info Banner */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 font-bold">Owner: </span>
                  <span className="font-bold text-slate-800">{editingShop.owner_name}</span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">{editingShop.owner_email}</div>
              </div>

              {/* Current URL Notice */}
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Current Website URL</span>
                <div className="font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 break-all">
                  https://{editingShop.hostname || (editingShop.subdomain ? `${editingShop.subdomain}.ferasetu.com` : 'store.ferasetu.com')}
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSaveUrl} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    New Website URL / Subdomain
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="e.g. ram-kirana or ramkirana.in"
                      disabled={isSaving}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Enter a shop slug (e.g. <span className="font-mono text-slate-700 font-bold">ram-kirana</span> for <span className="font-mono text-slate-700">ram-kirana.ferasetu.com</span>) or a custom domain (<span className="font-mono text-slate-700 font-bold">ramkirana.in</span>).
                  </p>
                </div>

                {/* Real-time Preview */}
                {previewUrl && (
                  <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-black text-orange-900 text-[11px] uppercase tracking-wider">
                      <Sparkles size={12} className="text-orange-600" />
                      <span>Live URL Preview</span>
                    </div>
                    <div className="font-mono font-bold text-orange-700 text-sm break-all">
                      {previewUrl}
                    </div>
                  </div>
                )}

                {/* Shopkeeper Notification Banner Note */}
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
                  <AlertCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-bold">Instant Shopkeeper Alert: </strong>
                    When saved, the shopkeeper will automatically receive a prominent notification on their dashboard:
                    <span className="block mt-1 font-semibold text-emerald-800 bg-white/70 px-2.5 py-1 rounded-lg border border-emerald-200">
                      "Your site is changed to {previewUrl || 'new address'}"
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSaving}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !inputUrl.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/20 active:scale-98"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Updating & Notifying...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save & Notify Shopkeeper</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

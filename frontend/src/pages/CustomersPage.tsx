import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users,
  UserCheck,
  ShoppingBag,
  IndianRupee,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  X,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  UserPlus,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  account_type: 'registered' | 'guest_buyer' | 'lead';
  has_password: boolean;
  total_orders: number;
  total_spent: number;
  last_order_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
  source: string;
}

interface CustomerApiResponse {
  success: boolean;
  stats: {
    total_customers: number;
    registered_accounts: number;
    repeat_buyers: number;
    total_revenue: number;
  };
  customers: CustomerRecord[];
}

export default function CustomersPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'registered' | 'guest'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Fetch customers from backend
  const { data, isLoading, refetch, isRefetching } = useQuery<CustomerApiResponse>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data;
    },
    staleTime: 15000,
  });

  // Query single customer details when selected
  const { data: customerDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['customer-detail', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return null;
      const res = await api.get(`/customers/${selectedCustomer.id}`);
      return res.data;
    },
    enabled: Boolean(selectedCustomer?.id),
  });

  const customersList = data?.customers || [];
  const stats = data?.stats || {
    total_customers: customersList.length,
    registered_accounts: customersList.filter((c) => c.has_password).length,
    repeat_buyers: customersList.filter((c) => c.total_orders > 1).length,
    total_revenue: customersList.reduce((sum, c) => sum + (c.total_spent || 0), 0),
  };

  // Filtered & Searched Customers
  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      // Type Filter
      if (filterType === 'registered' && !c.has_password) return false;
      if (filterType === 'guest' && c.has_password) return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesEmail = c.email?.toLowerCase().includes(q);
        const matchesPhone = c.phone?.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone;
      }
      return true;
    });
  }, [customersList, filterType, searchQuery]);

  // Add Customer Mutation
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setSavingCustomer(true);
    try {
      await api.post('/customers', {
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        address: newAddress.trim() || undefined,
      });

      toast.success('Customer added successfully');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewAddress('');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const openWhatsApp = (phone?: string, name?: string) => {
    if (!phone) {
      toast.error('No phone number recorded for this customer');
      return;
    }
    const clean = phone.replace(/\D/g, '');
    const greeting = encodeURIComponent(`Namaste ${name || 'Customer'}! Thank you for ordering from ${user?.business_name || 'our shop'}. How can we assist you today?`);
    window.open(`https://wa.me/${clean}?text=${greeting}`, '_blank');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      <SEO title="Customers & Signups | FeraSetu" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-[#0052FF] border border-blue-100">
              <Users size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#152238] tracking-tight">
              Customers & Storefront Accounts
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#667085]">
            View signed-up customer accounts, verified logins, and buyer lifetime activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5EAF1] bg-white text-[#667085] hover:text-[#152238] hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh customer data"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin text-[#0052FF]' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#0052FF] text-white hover:bg-blue-600 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          >
            <UserPlus size={15} />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#E5EAF1] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">Total Customers</span>
            <Users size={16} className="text-[#0052FF]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#152238]">
            {stats.total_customers}
          </div>
          <p className="text-[11px] text-[#667085] mt-1">Across online and direct store</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5EAF1] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Signed Up Accounts</span>
            <UserCheck size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {stats.registered_accounts}
          </div>
          <p className="text-[11px] text-[#667085] mt-1">Registered password accounts</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5EAF1] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Repeat Buyers</span>
            <ShoppingBag size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600">
            {stats.repeat_buyers}
          </div>
          <p className="text-[11px] text-[#667085] mt-1">Placed 2+ verified orders</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5EAF1] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Lifetime Value</span>
            <IndianRupee size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#152238]">
            ₹{stats.total_revenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#667085] mt-1">Total revenue generated</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF1] p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, or email..."
            className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E5EAF1] bg-[#F6F8FC] focus:bg-white focus:outline-none focus:border-[#0052FF] transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `All (${customersList.length})` },
            { id: 'registered', label: `Signed Up (${stats.registered_accounts})` },
            { id: 'guest', label: `Guest Shoppers (${customersList.length - stats.registered_accounts})` },
          ].map((tab) => {
            const isAct = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isAct
                    ? 'bg-[#152238] text-white shadow-xs'
                    : 'bg-slate-100 text-[#667085] hover:text-[#152238] hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF1] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-[#0052FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#667085]">Loading customer accounts…</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052FF] flex items-center justify-center mx-auto mb-3 font-bold text-xl">
              👥
            </div>
            <h3 className="text-base font-bold text-[#152238] mb-1">No customers found</h3>
            <p className="text-xs text-[#667085] mb-4">
              {searchQuery
                ? 'No customer matched your search terms.'
                : 'When customers register an account or place orders on your storefront, they appear here.'}
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0052FF] text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <UserPlus size={14} /> Add First Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[#667085] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Customer</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4">Total Spent</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {filteredCustomers.map((cust) => {
                  const avatarInitial = (cust.name || cust.email || 'C').charAt(0).toUpperCase();
                  const isRegistered = cust.has_password;

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            isRegistered
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {avatarInitial}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors block truncate">
                              {cust.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Joined {new Date(cust.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {cust.phone ? (
                            <div className="flex items-center gap-1 text-slate-700 font-mono font-medium">
                              <Phone size={11} className="text-slate-400" />
                              <span>{cust.phone}</span>
                            </div>
                          ) : null}
                          {cust.email && !cust.email.endsWith('.local') ? (
                            <div className="flex items-center gap-1 text-slate-500 text-[11px] truncate max-w-[170px]">
                              <Mail size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{cust.email}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3.5 px-4">
                        {isRegistered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            Registered Account
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            Guest Shopper
                          </span>
                        )}
                      </td>

                      {/* Orders Placed */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs bg-slate-100 text-slate-800">
                          {cust.total_orders}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹{cust.total_spent.toLocaleString('en-IN')}
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {cust.last_login_at ? (
                          <span className="text-blue-600 font-medium">
                            Logged in {new Date(cust.last_login_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : cust.last_order_at ? (
                          <span>
                            Ordered {new Date(cust.last_order_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">Recently signed up</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {cust.phone && (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(cust.phone, cust.name)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Message customer on WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="View Customer Profile"
                          >
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slideInRight">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E5EAF1] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  selectedCustomer.has_password ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#152238]">{selectedCustomer.name}</h3>
                  <p className="text-xs text-[#667085]">{selectedCustomer.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Account Overview Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-[#F8FAFC]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Account Status
                  </span>
                  <span className={`text-xs font-bold inline-block px-2 py-0.5 rounded-full ${
                    selectedCustomer.has_password
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedCustomer.has_password ? 'Registered Account' : 'Guest Shopper'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-[#F8FAFC]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Lifetime Spend
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    ₹{selectedCustomer.total_spent.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact Details</h4>
                <div className="space-y-2 text-xs">
                  {selectedCustomer.phone && (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                      <div className="flex items-center gap-2 text-slate-700 font-mono">
                        <Phone size={14} className="text-slate-400" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openWhatsApp(selectedCustomer.phone, selectedCustomer.name)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1 hover:bg-emerald-100"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </button>
                    </div>
                  )}

                  {selectedCustomer.email && (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Mail size={14} className="text-slate-400" />
                        <span className="truncate">{selectedCustomer.email}</span>
                      </div>
                      <a
                        href={`mailto:${selectedCustomer.email}`}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200"
                      >
                        Email
                      </a>
                    </div>
                  )}

                  {selectedCustomer.address && (
                    <div className="p-3 rounded-xl border border-slate-100 bg-white flex items-start gap-2">
                      <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="text-slate-700">{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order History Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Past Orders</h4>

                {isLoadingDetail ? (
                  <div className="p-6 text-center text-xs text-slate-400">Loading order history…</div>
                ) : !customerDetail?.orders || customerDetail.orders.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 border border-dashed rounded-xl text-center">
                    No orders recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {customerDetail.orders.map((ord: any) => (
                      <div key={ord.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-800">#{ord.id.slice(-6).toUpperCase()}</span>
                          <span className="font-bold text-slate-900">₹{Number(ord.total).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="capitalize">{ord.status}</span>
                          <span>{new Date(ord.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E5EAF1] bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-[#667085]">FeraSetu Store Customer</span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#152238]">Add New Customer</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0052FF]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (WhatsApp)</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0052FF]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="rajesh@example.com"
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0052FF]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Address (Optional)</label>
                <textarea
                  rows={2}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="House/Shop address, city..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0052FF] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-5 py-2.5 rounded-xl bg-[#0052FF] text-white font-bold hover:bg-blue-600 disabled:opacity-50"
                >
                  {savingCustomer ? 'Adding…' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

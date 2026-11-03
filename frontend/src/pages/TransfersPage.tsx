import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  Layers,
  MapPin,
  Calendar,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import api from '../services/api';
import SEO from '../components/SEO';

interface TransferSummary {
  id: string;
  transfer_number: string;
  reference_name?: string;
  origin_name: string;
  destination_name: string;
  status: 'draft' | 'in_transit' | 'partially_received' | 'received' | 'completed' | 'cancelled';
  total_items: number;
  total_units: number;
  estimated_arrival?: string;
  created_at: string;
  tags?: string;
}

export default function TransfersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'in_transit' | 'draft' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Transfers
  const { data, isLoading, refetch, isRefetching } = useQuery<{
    success: boolean;
    transfers: TransferSummary[];
    stats: {
      total_transfers: number;
      in_transit: number;
      drafts: number;
      completed: number;
      total_units_in_transit: number;
    };
  }>({
    queryKey: ['inventory-transfers'],
    queryFn: async () => {
      try {
        const res = await api.get('/transfers');
        return res.data;
      } catch {
        const raw = localStorage.getItem('fera_local_inventory_transfers_v1') || '[]';
        let transfers: any[] = [];
        try { transfers = JSON.parse(raw); } catch { transfers = []; }
        return {
          success: true,
          transfers,
          stats: {
            total_transfers: transfers.length,
            in_transit: transfers.filter((t) => t.status === 'in_transit').length,
            drafts: transfers.filter((t) => t.status === 'draft').length,
            completed: transfers.filter((t) => t.status === 'completed' || t.status === 'received').length,
            total_units_in_transit: transfers
              .filter((t) => t.status === 'in_transit')
              .reduce((sum, t) => sum + (Number(t.total_units) || 0), 0),
          },
        };
      }
    },
    staleTime: 15000,
  });

  const transfersList = data?.transfers || [];
  const stats = data?.stats || {
    total_transfers: transfersList.length,
    in_transit: transfersList.filter((t) => t.status === 'in_transit').length,
    drafts: transfersList.filter((t) => t.status === 'draft').length,
    completed: transfersList.filter((t) => t.status === 'completed' || t.status === 'received').length,
    total_units_in_transit: 0,
  };

  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    return transfersList.filter((t) => {
      if (activeTab === 'in_transit' && t.status !== 'in_transit') return false;
      if (activeTab === 'draft' && t.status !== 'draft') return false;
      if (activeTab === 'completed' && t.status !== 'completed' && t.status !== 'received') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (t.transfer_number || '').toLowerCase();
        const ref = (t.reference_name || '').toLowerCase();
        const org = (t.origin_name || '').toLowerCase();
        const dest = (t.destination_name || '').toLowerCase();
        return num.includes(q) || ref.includes(q) || org.includes(q) || dest.includes(q);
      }
      return true;
    });
  }, [transfersList, activeTab, searchQuery]);

  const handleQuickReceive = async (transferId: string) => {
    try {
      await api.post(`/transfers/${transferId}/receive`, {});
      toast.success('Inventory received into destination stock!');
      queryClient.invalidateQueries({ queryKey: ['inventory-transfers'] });
    } catch {
      toast.error('Failed to receive inventory');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_transit':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200 flex items-center gap-1">
            <Truck size={12} /> In transit
          </span>
        );
      case 'completed':
      case 'received':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 size={12} /> Received
          </span>
        );
      case 'partially_received':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200 flex items-center gap-1">
            <Clock size={12} /> Partially received
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      <SEO title="Inventory Transfers | FeraSetu" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Truck size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#152238] tracking-tight">
              Inventory Transfers
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
              BETA
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#667085]">
            Move and track stock between your warehouse and retail shops.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5EAF1] bg-white text-[#667085] hover:text-[#152238] hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin text-indigo-600' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/transfers/new')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus size={15} />
            <span>+ Create transfer</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#E5EAF1] p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Transfers
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total_transfers}</div>
          <p className="text-[11px] text-slate-500 mt-1">Recorded shipments</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5EAF1] p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
            In Transit
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">{stats.in_transit}</div>
          <p className="text-[11px] text-slate-500 mt-1">{stats.total_units_in_transit} units currently moving</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5EAF1] p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Drafts
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-700">{stats.drafts}</div>
          <p className="text-[11px] text-slate-500 mt-1">Unconfirmed transfer orders</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5EAF1] p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Completed / Received
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.completed}</div>
          <p className="text-[11px] text-slate-500 mt-1">Stock merged into destination</p>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="bg-white rounded-2xl border border-[#E5EAF1] p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transfer number, reference, or warehouse..."
            className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E5EAF1] bg-[#F6F8FC] focus:bg-white focus:outline-none focus:border-indigo-600 transition-all"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `All (${transfersList.length})` },
            { id: 'in_transit', label: `In Transit (${stats.in_transit})` },
            { id: 'draft', label: `Drafts (${stats.drafts})` },
            { id: 'completed', label: `Completed (${stats.completed})` },
          ].map((tab) => {
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isAct
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF1] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading transfers…</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 font-bold text-xl">
              <Truck size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No transfers found</h3>
            <p className="text-xs text-slate-500 mb-4">
              {searchQuery
                ? 'No transfer shipment matched your search query.'
                : 'Create your first inventory transfer to move products between store locations.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/transfers/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700"
            >
              <Plus size={14} /> Create First Transfer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Transfer</th>
                  <th className="py-3.5 px-4">Route (Origin → Destination)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Items & Units</th>
                  <th className="py-3.5 px-4">Est. Arrival</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-bold text-slate-900">{t.transfer_number}</div>
                      {t.reference_name && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Ref: {t.reference_name}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                        <span className="truncate max-w-[140px]">{t.origin_name}</span>
                        <ArrowRight size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px] font-bold text-slate-900">
                          {t.destination_name}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-900">{t.total_units}</span>
                      <span className="text-slate-500 ml-1">({t.total_items} items)</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {t.estimated_arrival
                        ? new Date(t.estimated_arrival).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      {t.status === 'in_transit' ? (
                        <button
                          type="button"
                          onClick={() => handleQuickReceive(t.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-2xs inline-flex items-center gap-1"
                        >
                          <Check size={12} /> Receive items
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate('/transfers/new')}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 shadow-2xs"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

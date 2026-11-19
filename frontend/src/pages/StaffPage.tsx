import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Sliders,
  CheckCircle2,
  Clock,
  Lock,
  Search,
  Filter,
  Download,
  Key,
  LogOut,
  Send,
  Building2,
  History,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  AlertCircle,
  Copy,
  ExternalLink,
  Store,
  Warehouse,
  Receipt,
  UserCheck,
  Trash2,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import SEO from '../components/SEO';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import { ConfirmDialog } from '../components/ui/confirm-dialog';

export interface StaffItem {
  id: string;
  name: string;
  contact: string;
  initials: string;
  role: 'owner' | 'admin' | 'staff' | 'cashier' | 'warehouse';
  roleLabel: string;
  roleDescription: string;
  station: string;
  scopeSummary: string;
  status: 'active' | 'pending';
  isOwner: boolean;
  createdAt?: string;
  lastActive?: string;
  invitationId?: string;
}

export default function StaffPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'directory' | 'roles' | 'stations' | 'audit'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'admin' | 'cashier' | 'warehouse'>('all');

  // Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffItem | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<StaffItem | null>(null);
  const [invitationToRevoke, setInvitationToRevoke] = useState<string | null>(null);

  // Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteContact, setInviteContact] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'cashier' | 'warehouse'>('cashier');
  const [inviteStation, setInviteStation] = useState('Main Billing Counter');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // 1. Fetch organization members
  const { data: membersData, isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ['orgMembers'],
    queryFn: async () => {
      try {
        const res = await api.get('/organizations/members');
        return res.data?.members || [];
      } catch (err) {
        console.warn('Failed to fetch org members:', err);
        return [];
      }
    }
  });

  // 2. Fetch pending invitations
  const { data: invitationsData, refetch: refetchInvitations } = useQuery({
    queryKey: ['orgInvitations'],
    queryFn: async () => {
      try {
        const res = await api.get('/organizations/invitations');
        return res.data?.invitations || [];
      } catch {
        return [];
      }
    }
  });

  // 3. Fetch store physical locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const res = await api.get('/locations');
        return res.data?.locations || [];
      } catch {
        return [];
      }
    }
  });

  // Available Stations list
  const availableStations = useMemo(() => {
    const list = ['Main Billing Counter', 'Central Godown / Warehouse', 'Online Fulfillment Desk'];
    if (Array.isArray(locationsData) && locationsData.length > 0) {
      locationsData.forEach((loc: any) => {
        if (loc.name && !list.includes(loc.name)) {
          list.push(loc.name);
        }
      });
    }
    return list;
  }, [locationsData]);

  // Authenticated Owner info
  const ownerName = user?.name || user?.business_name || 'Store Owner';
  const ownerContact = user?.email || user?.phone || 'owner@ferasetu.store';
  const ownerInitials = (ownerName.split(' ').map((n: string) => n[0]).join('') || 'SO').toUpperCase().slice(0, 2);

  // Combined staff items list
  const allStaff: StaffItem[] = useMemo(() => {
    const list: StaffItem[] = [
      {
        id: 'owner-primary',
        name: ownerName,
        contact: ownerContact,
        initials: ownerInitials,
        role: 'owner',
        roleLabel: 'Store Owner',
        roleDescription: 'Full Store Control & Bank Payouts',
        station: 'All Store Locations',
        scopeSummary: 'Banking, UPI Payouts, Catalog, Staff & Settings',
        status: 'active',
        isOwner: true,
        lastActive: 'Active Now'
      }
    ];

    // Add confirmed members
    if (Array.isArray(membersData)) {
      membersData.forEach((m: any) => {
        if (m.user_id === user?.id || m.email === user?.email || m.role === 'owner') return;
        const name = m.name || m.email?.split('@')[0] || 'Team Member';
        const inits = (name.split(' ').map((n: string) => n[0]).join('') || 'TM').toUpperCase().slice(0, 2);
        const isManager = m.role === 'admin';
        list.push({
          id: m.id || `mem-${m.user_id}`,
          name,
          contact: m.email || m.phone || 'Store Terminal',
          initials: inits,
          role: isManager ? 'admin' : 'cashier',
          roleLabel: isManager ? 'Store Manager' : 'Counter Cashier',
          roleDescription: isManager ? 'Orders, Catalog & Stock Operations' : 'Counter POS Billing & WhatsApp Dispatch',
          station: m.station || (isManager ? 'All Stations' : 'Main Billing Counter'),
          scopeSummary: isManager ? 'Orders, Products, Customer Khata & Stock' : 'POS Barcode Billing, Receipts & Cash Collection',
          status: 'active',
          isOwner: false,
          createdAt: m.created_at,
          lastActive: 'Logged In'
        });
      });
    }

    // Add pending invitations
    if (Array.isArray(invitationsData)) {
      invitationsData.forEach((inv: any) => {
        const name = inv.name || inv.email?.split('@')[0] || 'Staff Member';
        const inits = (name.split(' ').map((n: string) => n[0]).join('') || 'ST').toUpperCase().slice(0, 2);
        const role = inv.role === 'admin' ? 'admin' : inv.role === 'warehouse' ? 'warehouse' : 'cashier';
        list.push({
          id: `inv-${inv.id}`,
          name,
          contact: inv.email || inv.phone || 'Contact pending',
          initials: inits,
          role,
          roleLabel: role === 'admin' ? 'Store Manager (Invited)' : role === 'warehouse' ? 'Stock Keeper (Invited)' : 'Counter Cashier (Invited)',
          roleDescription: 'Awaiting team member login',
          station: inv.station || 'Main Billing Counter',
          scopeSummary: 'Invitation Link Sent — Access ready upon join',
          status: 'pending',
          isOwner: false,
          createdAt: inv.created_at,
          invitationId: inv.id
        });
      });
    }

    return list;
  }, [membersData, invitationsData, ownerName, ownerContact, ownerInitials, user?.id, user?.email]);

  // Telemetry counts
  const totalCount = allStaff.length;
  const activeCount = allStaff.filter(s => s.status === 'active').length;
  const pendingCount = allStaff.filter(s => s.status === 'pending').length;

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return allStaff.filter(s => {
      if (roleFilter !== 'all') {
        if (roleFilter === 'owner' && !s.isOwner) return false;
        if (roleFilter === 'admin' && s.role !== 'admin') return false;
        if (roleFilter === 'cashier' && s.role !== 'cashier') return false;
        if (roleFilter === 'warehouse' && s.role !== 'warehouse') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.contact.toLowerCase().includes(q) ||
          s.roleLabel.toLowerCase().includes(q) ||
          s.station.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allStaff, roleFilter, searchQuery]);

  // Handle Send Invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteContact.trim()) {
      toast.error('Please enter an email or phone number to send the invitation.');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const email = inviteContact.includes('@') ? inviteContact.trim() : `${inviteContact.replace(/[^0-9]/g, '')}@sms.ferasetu.store`;
      const phone = !inviteContact.includes('@') ? inviteContact.trim() : '';

      await api.post('/organizations/invitations', {
        email,
        phone,
        name: inviteName.trim() || undefined,
        role: inviteRole,
        station: inviteStation
      });

      toast.success(`Invitation sent to ${inviteName || inviteContact}!`);
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteContact('');
      setInviteRole('cashier');
      setInviteStation('Main Billing Counter');
      queryClient.invalidateQueries({ queryKey: ['orgInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['orgMembers'] });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to dispatch invitation';
      toast.error(msg);
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // Handle Copy / Share WhatsApp Invite Link
  const handleShareWhatsApp = (staff: StaffItem) => {
    const storeSlug = user?.store_slug || 'store';
    const storeUrl = `https://${storeSlug}.ferasetu.com`;
    const message = `Namaste ${staff.name}! You are invited to join our store billing desk on FeraSetu as ${staff.roleLabel}. Open this link to sign in: ${storeUrl}/login`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(message);
    toast.success('Invitation text copied! Opening WhatsApp...');

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle Update Member Role / Station
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      if (editingMember.status === 'pending') {
        toast.success(`Role preferences noted for ${editingMember.name}`);
      } else {
        await api.patch(`/organizations/members/${editingMember.id}`, {
          role: editingMember.role,
          station: editingMember.station
        });
        toast.success(`Permissions updated for ${editingMember.name}!`);
        queryClient.invalidateQueries({ queryKey: ['orgMembers'] });
      }
      setEditingMember(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update member');
    }
  };

  // Handle Remove Member
  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      if (memberToRemove.status === 'pending' && memberToRemove.invitationId) {
        await api.delete(`/organizations/invitations/${memberToRemove.invitationId}`);
        toast.success(`Invitation revoked for ${memberToRemove.name}`);
        queryClient.invalidateQueries({ queryKey: ['orgInvitations'] });
      } else {
        await api.delete(`/organizations/members/${memberToRemove.id}`);
        toast.success(`${memberToRemove.name} removed from store staff`);
        queryClient.invalidateQueries({ queryKey: ['orgMembers'] });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove staff member');
    } finally {
      setMemberToRemove(null);
    }
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    const headers = ['Staff Name', 'Contact Details', 'Assigned Role', 'Physical Station', 'Permissions Scope', 'Status'];
    const rows = filteredStaff.map(s => [
      `"${s.name}"`,
      `"${s.contact}"`,
      `"${s.roleLabel}"`,
      `"${s.station}"`,
      `"${s.scopeSummary}"`,
      `"${s.status === 'active' ? 'Active' : 'Pending Invite'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `store_staff_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Staff ledger downloaded as CSV');
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50 pb-20">
      <SEO
        title="Staff & Access Management — Team Directory | FeraSetu"
        description="Invite counter cashiers, managers, and stock keepers with least-privilege permissions, keeping your bank payouts safe."
      />

      <div className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Workspace Breadcrumbs & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-2 border-b border-slate-200/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <span>Store Operations</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold">Team &amp; Access Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Staff &amp; Access Management
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Bring your counter cashiers, shop managers, and warehouse staff together. Delegate billing and inventory safely — your bank accounts and payout profits stay 100% private to you.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Download size={15} className="text-slate-500" />
              <span>Export Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="h-10 px-5 rounded-xl bg-[#0052FF] hover:bg-[#0040CC] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <UserPlus size={16} />
              <span>+ Invite Team Member</span>
            </button>
          </div>
        </div>

        {/* Confidence & Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Store Team</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0052FF] flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{totalCount}</span>
              <span className="text-xs text-slate-500">Members</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>1 Primary Owner</span>
              <span className="font-medium text-slate-700">{totalCount - 1} Delegated</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Shifts</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Ready
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{activeCount}</span>
              <span className="text-xs text-slate-500">Terminals active</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Counter POS &amp; Register</span>
              <span className="text-emerald-700 font-medium">Synchronized</span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Invites</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-700 tabular-nums">{pendingCount}</span>
              <span className="text-xs text-amber-700 font-medium">Awaiting Join</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>WhatsApp / Email Links</span>
              <span className="text-amber-700 font-medium">{pendingCount > 0 ? 'Ready to Resend' : 'All Joined'}</span>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bank &amp; Payout Guard</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Lock size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">Owner Only</span>
              <span className="text-xs text-emerald-700 font-semibold">100% Protected</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Bank details &amp; UPI payouts</span>
              <span className="text-slate-700 font-medium">Never visible to staff</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer border-b-2 ${
                activeTab === 'directory'
                  ? 'border-[#0052FF] text-[#0052FF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users size={16} />
              <span>Team Directory</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0052FF]">
                {allStaff.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer border-b-2 ${
                activeTab === 'roles'
                  ? 'border-[#0052FF] text-[#0052FF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck size={16} />
              <span>Roles &amp; Permissions Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stations')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer border-b-2 ${
                activeTab === 'stations'
                  ? 'border-[#0052FF] text-[#0052FF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Store size={16} />
              <span>Station Assignments</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer border-b-2 ${
                activeTab === 'audit'
                  ? 'border-[#0052FF] text-[#0052FF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History size={16} />
              <span>Access &amp; Security Log</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 pb-3 text-xs text-slate-500">
            <span>Least-Privilege Principle:</span>
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              Active &amp; Enforced
            </span>
          </div>
        </div>

        {/* TAB 1: TEAM DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            
            {/* Filter and Search Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, contact, or station..."
                  className="w-full h-9 pl-9 pr-8 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0052FF] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs text-slate-500 mr-1 shrink-0">Role:</span>
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    roleFilter === 'all'
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({allStaff.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('owner')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    roleFilter === 'owner'
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Store Owner
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    roleFilter === 'admin'
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Managers
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('cashier')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    roleFilter === 'cashier'
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cashiers / POS
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('warehouse')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    roleFilter === 'warehouse'
                      ? 'bg-amber-700 text-white font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Stock Keepers
                </button>
              </div>
            </div>

            {/* Staff Directory Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Team Member</th>
                      <th className="py-3.5 px-4">Role &amp; Responsibilities</th>
                      <th className="py-3.5 px-4">Assigned Station</th>
                      <th className="py-3.5 px-4">Security Scope</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                        
                        {/* Member Identity */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                                staff.isOwner
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : staff.role === 'admin'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                  : staff.role === 'warehouse'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              }`}
                            >
                              {staff.initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 truncate text-sm">
                                  {staff.name}
                                </span>
                                {staff.isOwner && (
                                  <span
                                    title="Primary Store Owner"
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded"
                                  >
                                    <ShieldCheck size={11} className="text-[#0052FF]" />
                                    Owner
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-500 text-xs truncate">{staff.contact}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role Details */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md font-semibold text-xs ${
                                staff.isOwner
                                  ? 'bg-slate-900 text-white'
                                  : staff.role === 'admin'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                  : staff.role === 'warehouse'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              }`}
                            >
                              {staff.roleLabel}
                            </span>
                            <span className="text-[11px] text-slate-500 leading-tight">
                              {staff.roleDescription}
                            </span>
                          </div>
                        </td>

                        {/* Station */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">{staff.station}</span>
                          </div>
                        </td>

                        {/* Scope */}
                        <td className="py-4 px-4 max-w-xs">
                          <span className="text-slate-600 line-clamp-2 leading-relaxed text-[11px]">
                            {staff.scopeSummary}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          {staff.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                              Pending Invite
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          {staff.isOwner ? (
                            <span className="text-xs text-slate-400 font-medium italic">
                              Immutable Super Admin
                            </span>
                          ) : staff.status === 'pending' ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleShareWhatsApp(staff)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Share invitation message via WhatsApp"
                              >
                                <Send size={12} />
                                <span>WhatsApp Link</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(staff)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Revoke invitation"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingMember(staff)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Sliders size={13} className="text-slate-500" />
                                <span>Edit Role</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(staff)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove staff member"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Zero State if only Owner */}
              {allStaff.length === 1 && (
                <div className="p-8 sm:p-10 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052FF] flex items-center justify-center shrink-0">
                      <Users size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        Ready to add your counter boys, billing cashiers, or godown staff?
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                        Delegating store tasks takes 30 seconds. They sign in from their own phone or tablet to scan barcodes and create bills — without seeing your bank account, payout logs, or profit margins.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="h-10 px-5 rounded-xl bg-[#0052FF] hover:bg-[#0040CC] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm shrink-0 cursor-pointer"
                  >
                    <UserPlus size={16} />
                    <span>+ Invite First Staff Member</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROLES & PERMISSIONS GUIDE */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            
            {/* Role Cards Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Role 1: Store Manager */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <ShieldCheck size={20} />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      Manager Access
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-4">Store Manager</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Ideal for your trusted head manager who runs daily shop operations, updates products, and resolves customer orders.
                  </p>
                  
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Manage orders, packing, and dispatch</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Add new products &amp; update prices</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Customer roster &amp; Khata ledger balance</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-600">
                      <X size={14} className="text-rose-500 shrink-0" />
                      <span>Cannot modify bank accounts or payouts</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-600">
                      <X size={14} className="text-rose-500 shrink-0" />
                      <span>Cannot delete store or transfer ownership</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInviteRole('admin');
                    setIsInviteModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                >
                  Invite Store Manager
                </button>
              </div>

              {/* Role 2: Counter Cashier */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Receipt size={20} />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Counter POS Billing
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-4">Counter Cashier</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Designed for your front desk billing staff. Optimized for rapid barcode scanning, accepting UPI/cash, and printing receipts.
                  </p>
                  
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Fast POS order creation &amp; barcode scan</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Accept Cash &amp; Dynamic UPI QR payments</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Print thermal receipts &amp; WhatsApp slips</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-600">
                      <X size={14} className="text-rose-500 shrink-0" />
                      <span>Zero access to wholesale margins or profit</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-600">
                      <X size={14} className="text-rose-500 shrink-0" />
                      <span>Zero access to bank accounts or settings</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInviteRole('cashier');
                    setIsInviteModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200/60 transition-colors cursor-pointer"
                >
                  Invite Counter Cashier
                </button>
              </div>

              {/* Role 3: Warehouse & Stock Keeper */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                      <Warehouse size={20} />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                      Godown &amp; Stock
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-4">Stock Keeper</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Designed for godown managers and warehouse boys who receive supplier goods and manage inventory transfers.
                  </p>
                  
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Receive stock from supplier challans</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Adjust stock levels &amp; count inventory</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Initiate inter-facility stock transfers</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-600">
                      <X size={14} className="text-rose-500 shrink-0" />
                      <span>Cannot view sales revenue or customer details</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-600">
                      <X size={14} className="text-rose-500 shrink-0" />
                      <span>Cannot access bank accounts or payouts</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInviteRole('warehouse');
                    setIsInviteModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200/60 transition-colors cursor-pointer"
                >
                  Invite Stock Keeper
                </button>
              </div>

            </div>

            {/* Matrix Comparison Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Capabilities Comparison Matrix</h3>
                <p className="text-xs text-slate-500">
                  Granular permission enforcement across store operations, payments, and system controls.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Capability &amp; Operation</th>
                      <th className="py-3 px-4 text-center">Store Owner (You)</th>
                      <th className="py-3 px-4 text-center">Store Manager</th>
                      <th className="py-3 px-4 text-center">Counter Cashier</th>
                      <th className="py-3 px-4 text-center">Stock Keeper</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    <tr>
                      <td className="py-3 px-4 font-semibold">Counter POS Billing &amp; Invoices</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                      <td className="py-3 px-4 text-center text-slate-300">&mdash;</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold">Product Catalog &amp; Retail Pricing</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                      <td className="py-3 px-4 text-center text-slate-400">View Only</td>
                      <td className="py-3 px-4 text-center text-slate-400">View Only</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold">Stock Inward &amp; Godown Transfers</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                      <td className="py-3 px-4 text-center text-slate-300">&mdash;</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold">Customer Orders &amp; Khata Ledgers</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-semibold">&check; Counter Only</td>
                      <td className="py-3 px-4 text-center text-slate-300">&mdash;</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold">Bank Accounts, UPI &amp; Payouts</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Owner Only</td>
                      <td className="py-3 px-4 text-center text-rose-600 font-semibold">&cross; Blocked</td>
                      <td className="py-3 px-4 text-center text-rose-600 font-semibold">&cross; Blocked</td>
                      <td className="py-3 px-4 text-center text-rose-600 font-semibold">&cross; Blocked</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold">Domain Settings &amp; Store Deletion</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Owner Only</td>
                      <td className="py-3 px-4 text-center text-rose-600 font-semibold">&cross; Blocked</td>
                      <td className="py-3 px-4 text-center text-rose-600 font-semibold">&cross; Blocked</td>
                      <td className="py-3 px-4 text-center text-rose-600 font-semibold">&cross; Blocked</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: STATION ASSIGNMENTS */}
        {activeTab === 'stations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Station 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center">
                    <Store size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Main Retail Counter</h3>
                    <p className="text-xs text-slate-500">Front billing desk &amp; register printer</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#0052FF]">
                  {allStaff.filter(s => s.station.toLowerCase().includes('counter') || s.isOwner).length} Personnel
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {allStaff
                  .filter(s => s.station.toLowerCase().includes('counter') || s.isOwner)
                  .map(s => (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold text-[11px] flex items-center justify-center text-slate-800">
                          {s.initials}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900 block">{s.name}</span>
                          <span className="text-[11px] text-slate-500">{s.roleLabel}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Terminal Active
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Station 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                    <Warehouse size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Central Godown Hub</h3>
                    <p className="text-xs text-slate-500">Inventory intake &amp; bulk transfers</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800">
                  {allStaff.filter(s => s.station.toLowerCase().includes('godown') || s.station.toLowerCase().includes('warehouse') || s.isOwner).length} Personnel
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {allStaff
                  .filter(s => s.station.toLowerCase().includes('godown') || s.station.toLowerCase().includes('warehouse') || s.isOwner)
                  .map(s => (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold text-[11px] flex items-center justify-center text-slate-800">
                          {s.initials}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900 block">{s.name}</span>
                          <span className="text-[11px] text-slate-500">{s.roleLabel}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        Receiving Dock
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ACCESS & SECURITY AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Security &amp; Staff Activity Feed</h3>
              <p className="text-xs text-slate-500">
                Transparent activity ledger for staff logins, dispatched invitations, and permission updates.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Store Owner session verified ({ownerName})
                    </span>
                    <span className="text-slate-500 text-[11px]">Primary admin sovereignty confirmed</span>
                  </div>
                </div>
                <span className="text-slate-400 text-xs">Active Session</span>
              </div>

              {pendingCount > 0 && (
                <div className="p-3.5 bg-amber-50/60 rounded-xl flex items-center justify-between border border-amber-200/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Send size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {pendingCount} Staff Invitation{pendingCount > 1 ? 's' : ''} Dispatched
                      </span>
                      <span className="text-slate-500 text-[11px]">Awaiting acceptance from invited team members</span>
                    </div>
                  </div>
                  <span className="text-amber-700 font-semibold text-xs">Pending Join</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0052FF] flex items-center justify-center shrink-0">
                    <Lock size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Bank &amp; UPI Settlement Security Enforced
                    </span>
                    <span className="text-slate-500 text-[11px]">Staff restricted from seeing bank account numbers or withdrawal keys</span>
                  </div>
                </div>
                <span className="text-emerald-700 font-semibold text-xs">Always Active</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL 1: INVITE TEAM MEMBER MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="max-w-lg p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Invite a Team Member
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Assign a role and designated counter station. They will receive an instant login link via email or WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
            
            {/* Field: Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0052FF] transition-all"
              />
            </div>

            {/* Field: Contact */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Phone or Email Address
              </label>
              <input
                type="text"
                required
                value={inviteContact}
                onChange={(e) => setInviteContact(e.target.value)}
                placeholder="+91 98765 43210 or cashier@gmail.com"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0052FF] transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Enter their WhatsApp number to send the invite directly via WhatsApp.
              </span>
            </div>

            {/* Field: Role Selector (3 visual cards) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Store Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                
                {/* Option 1: Cashier */}
                <div
                  onClick={() => setInviteRole('cashier')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    inviteRole === 'cashier'
                      ? 'border-[#0052FF] bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Receipt size={16} className={inviteRole === 'cashier' ? 'text-[#0052FF]' : 'text-slate-500'} />
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      inviteRole === 'cashier' ? 'border-[#0052FF] bg-[#0052FF]' : 'border-slate-300'
                    }`}>
                      {inviteRole === 'cashier' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Cashier / POS</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Counter billing &amp; receipts only</p>
                </div>

                {/* Option 2: Manager */}
                <div
                  onClick={() => setInviteRole('admin')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    inviteRole === 'admin'
                      ? 'border-[#0052FF] bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <ShieldCheck size={16} className={inviteRole === 'admin' ? 'text-[#0052FF]' : 'text-slate-500'} />
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      inviteRole === 'admin' ? 'border-[#0052FF] bg-[#0052FF]' : 'border-slate-300'
                    }`}>
                      {inviteRole === 'admin' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Store Manager</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Orders, products &amp; stock</p>
                </div>

                {/* Option 3: Warehouse */}
                <div
                  onClick={() => setInviteRole('warehouse')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    inviteRole === 'warehouse'
                      ? 'border-[#0052FF] bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Warehouse size={16} className={inviteRole === 'warehouse' ? 'text-[#0052FF]' : 'text-slate-500'} />
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      inviteRole === 'warehouse' ? 'border-[#0052FF] bg-[#0052FF]' : 'border-slate-300'
                    }`}>
                      {inviteRole === 'warehouse' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Stock Keeper</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Godown intake &amp; count</p>
                </div>

              </div>
            </div>

            {/* Field: Station */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Station
              </label>
              <select
                value={inviteStation}
                onChange={(e) => setInviteStation(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-[#0052FF]"
              >
                {availableStations.map(station => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            </div>

            {/* Bank Protection Assurance Banner */}
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 flex items-start gap-2.5 text-xs text-emerald-800">
              <Lock size={15} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>0% Bank Exposure:</strong> Staff accounts can never view your bank account number, UPI settlement ledger, or profit margins.
              </span>
            </div>

            <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="w-full sm:w-auto h-10 px-4 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#0052FF] hover:bg-[#0040CC] active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingInvite ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  <span>{isSubmittingInvite ? 'Dispatching...' : 'Send Invitation'}</span>
                </button>
              </div>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL 2: EDIT ROLE / STATION */}
      {/* ──────────────────────────────────────────────────────────── */}
      {editingMember && (
        <Dialog open={Boolean(editingMember)} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Edit Access: {editingMember.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update assigned role template or physical store station.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateMember} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designated Role
                </label>
                <select
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as any })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-[#0052FF]"
                >
                  <option value="cashier">Counter Cashier (POS &amp; Receipts)</option>
                  <option value="admin">Store Manager (Catalog &amp; Orders)</option>
                  <option value="warehouse">Stock Keeper (Godown Intake)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Station
                </label>
                <select
                  value={editingMember.station}
                  onChange={(e) => setEditingMember({ ...editingMember, station: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-[#0052FF]"
                >
                  {availableStations.map(station => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="h-10 px-4 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#0052FF] hover:bg-[#0040CC] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL 3: CONFIRM REMOVE STAFF MEMBER */}
      {/* ──────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title={memberToRemove?.status === 'pending' ? 'Revoke Staff Invitation?' : `Remove ${memberToRemove?.name}?`}
        description={
          memberToRemove?.status === 'pending'
            ? `Are you sure you want to cancel the pending invitation to ${memberToRemove?.name} (${memberToRemove?.contact})? The invite link will expire immediately.`
            : `Are you sure you want to remove ${memberToRemove?.name} from your store team? They will immediately lose access to the billing terminal and catalog.`
        }
        confirmLabel={memberToRemove?.status === 'pending' ? 'Revoke Invite' : 'Remove Staff Member'}
        variant="destructive"
        onConfirm={handleConfirmRemove}
      />

    </div>
  );
}

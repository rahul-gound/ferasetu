import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

interface StaffMember {
  id: string;
  name: string;
  email_or_phone: string;
  initials: string;
  role: string;
  role_subtitle: string;
  assigned_location: string;
  location_detail: string;
  scope: string;
  status: 'active_owner' | 'active' | 'pending_invite';
  last_session: string;
  terminal: string;
}

export default function StaffPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'locations' | 'audit'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'store' | 'godown'>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteContact, setInviteContact] = useState('');
  const [inviteRole, setInviteRole] = useState('Counter Cashier');
  const [inviteLocation, setInviteLocation] = useState('Main Retail Storefront');

  // Real store owner
  const ownerName = user?.name || 'Himmat Patel';
  const ownerEmail = user?.email || 'owner@ferasetu.store';
  const ownerInitials = (ownerName.split(' ').map(n => n[0]).join('') || 'HP').toUpperCase().slice(0, 2);

  // Seeded / dynamically maintained team members
  const [members, setMembers] = useState<StaffMember[]>([
    {
      id: 'staff-1',
      name: ownerName,
      email_or_phone: ownerEmail,
      initials: ownerInitials,
      role: 'Store Owner',
      role_subtitle: 'Super Admin Sovereignty',
      assigned_location: 'All Locations',
      location_detail: 'Storefront & Godown',
      scope: 'Full Sovereignty, Financial Payouts, Domain Keys, Staff Management',
      status: 'active_owner',
      last_session: 'Now',
      terminal: 'Terminal #1'
    },
    {
      id: 'staff-2',
      name: 'Rajesh Kumar',
      email_or_phone: 'rajesh.k@generalstore.in',
      initials: 'RK',
      role: 'Godown Manager',
      role_subtitle: 'Inventory In/Out Specialization',
      assigned_location: 'Central Godown',
      location_detail: 'Central Bulk Storage',
      scope: 'Stock Inward/Outward, Stock Transfers, Supplier Delivery Receipts (No Payouts)',
      status: 'active',
      last_session: '14 mins ago',
      terminal: 'Godown Handheld'
    },
    {
      id: 'staff-3',
      name: 'Priya Sharma',
      email_or_phone: 'priya.s@generalstore.in',
      initials: 'PS',
      role: 'Counter Cashier',
      role_subtitle: 'POS Order Desk',
      assigned_location: 'Main Retail Store',
      location_detail: 'Front Register #1 & #2',
      scope: 'Order Processing, Counter POS billing, WhatsApp customer dispatch (No API/Settings)',
      status: 'active',
      last_session: '5 mins ago',
      terminal: 'Register Tablet'
    },
    {
      id: 'staff-4',
      name: 'Ramesh Yadav',
      email_or_phone: '+91 98201 44820',
      initials: 'RY',
      role: 'Fulfillment Associate',
      role_subtitle: 'Packing & Label Verification',
      assigned_location: 'Main Retail Store',
      location_detail: 'Dispatch Corner',
      scope: 'Order picking, packing slips, dispatch labeling, parcel photos',
      status: 'pending_invite',
      last_session: 'Invitation Sent',
      terminal: 'SMS & WhatsApp'
    }
  ]);

  // Telemetry counts
  const totalTeam = members.length;
  const activeShift = members.filter(m => m.status === 'active' || m.status === 'active_owner').length;
  const pendingApprovals = members.filter(m => m.status === 'pending_invite').length;

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (roleFilter === 'store' && !m.assigned_location.toLowerCase().includes('store') && m.assigned_location !== 'All Locations') return false;
      if (roleFilter === 'godown' && !m.assigned_location.toLowerCase().includes('godown') && m.assigned_location !== 'All Locations') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email_or_phone.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.assigned_location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, roleFilter, searchQuery]);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteContact.trim()) {
      toast.error('Please enter team member name and contact info.');
      return;
    }

    const newMember: StaffMember = {
      id: `staff-${Date.now()}`,
      name: inviteName.trim(),
      email_or_phone: inviteContact.trim(),
      initials: inviteName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'TM',
      role: inviteRole,
      role_subtitle: 'Assigned Role Template',
      assigned_location: inviteLocation,
      location_detail: 'Designated Hub',
      scope: 'Granular least-privilege operations',
      status: 'pending_invite',
      last_session: 'Invitation Sent',
      terminal: 'WhatsApp / SMS'
    };

    setMembers(prev => [...prev, newMember]);
    setIsInviteModalOpen(false);
    setInviteName('');
    setInviteContact('');
    toast.success(`Sovereign invitation dispatched to ${newMember.name}!`);
  };

  const handleExportCsv = () => {
    const headers = ['Name', 'Contact', 'Role', 'Assigned Unit', 'Scope', 'Status', 'Last Session'];
    const rows = filteredMembers.map(m => [
      `"${m.name}"`,
      `"${m.email_or_phone}"`,
      `"${m.role}"`,
      `"${m.assigned_location}"`,
      `"${m.scope}"`,
      m.status,
      m.last_session
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `staff_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Staff ledger exported to CSV!');
  };

  return (
    <div className="w-full min-h-screen bg-surface pb-16">
      <SEO
        title="Staff & Access Management — Team Directory | FeraSetu"
        description="Manage store team members, assign physical locations, and enforce least-privilege operational permissions."
      />

      <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-secondary uppercase tracking-wider">
              <span>Operations Console</span>
              <span className="text-outline">/</span>
              <span className="text-on-surface font-semibold">Access Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Staff &amp; Access Management
            </h1>
            <p className="text-sm text-secondary max-w-2xl">
              Bring your team together, assign physical store stations, and enforce granular operational permissions under sovereign verification.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className="h-10 px-4 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/30 hover:bg-surface-container-low transition-colors text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs"
            >
              <ShieldCheck size={16} className="text-secondary" />
              <span>Role Templates &amp; Policies</span>
            </button>
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="h-10 px-4 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs"
            >
              <UserPlus size={16} />
              <span>+ Invite Team Member</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Team</span>
              <Users size={18} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface tabular-nums">{totalTeam}</span>
              <span className="text-xs text-secondary">Registered</span>
            </div>
            <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
              <span>1 Sovereign Owner</span>
              <span>{totalTeam - 1} Floor Staff</span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Active Shift</span>
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface tabular-nums">{activeShift}</span>
              <span className="text-xs text-secondary">Devices active</span>
            </div>
            <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
              <span>Store POS + Godown</span>
              <span className="text-primary font-medium">Synced</span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending Approvals</span>
              <Clock size={18} className="text-amber-700" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-900 tabular-nums">{pendingApprovals}</span>
              <span className="text-xs text-amber-800 font-medium">Awaiting Join</span>
            </div>
            <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
              <span className="truncate">{members.find(m => m.status === 'pending_invite')?.name || 'Staff Member'}</span>
              <span className="text-amber-800 font-medium">48h Expire</span>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Security Posture</span>
              <Lock size={18} className="text-primary" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-bold text-on-surface">Enforced</span>
              <span className="text-xs text-secondary">Least-Privilege</span>
            </div>
            <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
              <span>OTP Guard: Bank/Keys</span>
              <span className="text-emerald-700 font-semibold">100% Locked</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2.5 rounded-t-lg text-xs sm:text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'members'
                  ? 'bg-surface-container text-primary border-b-2 border-primary font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <Users size={16} />
              <span>Team Members</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-primary/10 text-primary font-bold">
                {members.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2.5 rounded-t-lg text-xs sm:text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'roles'
                  ? 'bg-surface-container text-primary border-b-2 border-primary font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <ShieldCheck size={16} />
              <span>Roles &amp; Permissions Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('locations')}
              className={`px-4 py-2.5 rounded-t-lg text-xs sm:text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'locations'
                  ? 'bg-surface-container text-primary border-b-2 border-primary font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <MapPin size={16} />
              <span>Location Assignments</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2.5 rounded-t-lg text-xs sm:text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'audit'
                  ? 'bg-surface-container text-primary border-b-2 border-primary font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <History size={16} />
              <span>Administrative Audit Log</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pb-2">
            <span className="text-xs text-secondary">Store Scope:</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-surface-container-high text-on-surface rounded">
              2 Physical Facilities
            </span>
          </div>
        </div>

        {/* TAB 1: TEAM MEMBERS DIRECTORY */}
        {activeTab === 'members' && (
          <div className="flex flex-col space-y-4">
            {/* Search and Filter Bar */}
            <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search size={16} className="text-secondary ml-1" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter staff by name, phone, or assigned station..."
                  className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-outline-variant/30 text-xs text-on-surface placeholder:text-secondary focus:outline-none focus:bg-surface-container-lowest"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-secondary">Scope:</span>
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    roleFilter === 'all' ? 'bg-surface-container text-primary font-semibold' : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  All Roles
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('store')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    roleFilter === 'store' ? 'bg-surface-container text-primary font-semibold' : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  Storefront Only
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('godown')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    roleFilter === 'godown' ? 'bg-surface-container text-primary font-semibold' : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  Godown Only
                </button>
                <div className="h-4 w-[1px] bg-outline-variant/30 mx-1" />
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-2.5 py-1 rounded-md border border-outline-variant/30 hover:bg-surface-container-low text-on-surface-variant text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Download size={14} />
                  <span>Export Sheet</span>
                </button>
              </div>
            </div>

            {/* Tabular Directory Ledger */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 bg-surface-container-low/50 text-xs font-semibold uppercase tracking-wider text-secondary">
                      <th className="py-3 px-4">Member Identification</th>
                      <th className="py-3 px-4">Role Template</th>
                      <th className="py-3 px-4">Assigned Physical Unit</th>
                      <th className="py-3 px-4">Operational Scope</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Last Session</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 text-xs text-on-surface">
                    {filteredMembers.map(member => (
                      <tr key={member.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center shrink-0">
                              {member.initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-on-surface truncate">{member.name}</span>
                                {member.status === 'active_owner' && (
                                  <ShieldCheck size={14} className="text-primary shrink-0" title="Store Owner Key" />
                                )}
                              </div>
                              <span className="text-secondary text-[11px] truncate">{member.email_or_phone}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface">{member.role}</span>
                            <span className="text-secondary text-[11px]">{member.role_subtitle}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              member.assigned_location === 'All Locations' ? 'bg-primary' : 'bg-secondary'
                            }`} />
                            <span className="font-medium text-on-surface">{member.assigned_location}</span>
                          </div>
                          <span className="text-secondary text-[11px] block">{member.location_detail}</span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <span className="text-on-surface-variant line-clamp-2 leading-relaxed">
                            {member.scope}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {member.status === 'active_owner' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active (Owner)
                            </span>
                          )}
                          {member.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          )}
                          {member.status === 'pending_invite' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                              Pending Invite (48h)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-semibold text-on-surface">{member.last_session}</span>
                          <span className="block text-secondary text-[11px]">{member.terminal}</span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {member.status === 'pending_invite' ? (
                            <button
                              type="button"
                              onClick={() => toast.success(`Invitation re-sent to ${member.email_or_phone}`)}
                              className="px-2.5 py-1 rounded bg-surface-container text-primary hover:bg-surface-container-high transition-colors font-medium text-xs inline-flex items-center gap-1"
                            >
                              <Send size={12} />
                              <span>Resend</span>
                            </button>
                          ) : member.status === 'active_owner' ? (
                            <span className="text-secondary text-[11px] font-mono">Immutable</span>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toast.success(`Configuring policies for ${member.name}`)}
                                className="p-1.5 rounded hover:bg-surface-container text-secondary hover:text-primary transition-colors"
                                title="Adjust Roles"
                              >
                                <Sliders size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => toast.success(`Revoked session for ${member.name}`)}
                                className="p-1.5 rounded hover:bg-surface-container text-secondary hover:text-rose-600 transition-colors"
                                title="Sign Out Session"
                              >
                                <LogOut size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
        {activeTab === 'roles' && (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-on-surface">Roles &amp; Sovereign Permissions Matrix</h2>
              <p className="text-xs text-secondary">
                Enforce least-privilege access across orders, inventory, payouts, and system configurations.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-secondary font-semibold uppercase tracking-wider border-b border-outline-variant/20">
                    <th className="py-3 px-4">Operational Capability</th>
                    <th className="py-3 px-4 text-center">Store Owner</th>
                    <th className="py-3 px-4 text-center">Godown Manager</th>
                    <th className="py-3 px-4 text-center">Counter Cashier</th>
                    <th className="py-3 px-4 text-center">Fulfillment Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-on-surface">
                  <tr>
                    <td className="py-3 px-4 font-semibold">Counter POS &amp; Order Billing</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                    <td className="py-3 px-4 text-center text-secondary">&mdash;</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                    <td className="py-3 px-4 text-center text-secondary">&mdash;</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Stock Inward &amp; Godown Transfers</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Full</td>
                    <td className="py-3 px-4 text-center text-secondary">&mdash;</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-semibold">&check; View Only</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Bank Accounts, UPI &amp; Payout Sweep</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Sovereign</td>
                    <td className="py-3 px-4 text-center text-rose-700 font-bold">&cross; Blocked</td>
                    <td className="py-3 px-4 text-center text-rose-700 font-bold">&cross; Blocked</td>
                    <td className="py-3 px-4 text-center text-rose-700 font-bold">&cross; Blocked</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Custom Domains &amp; DNS Keys</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">&check; Sovereign</td>
                    <td className="py-3 px-4 text-center text-rose-700 font-bold">&cross; Blocked</td>
                    <td className="py-3 px-4 text-center text-rose-700 font-bold">&cross; Blocked</td>
                    <td className="py-3 px-4 text-center text-rose-700 font-bold">&cross; Blocked</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LOCATION ASSIGNMENTS */}
        {activeTab === 'locations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  <h3 className="text-sm font-semibold text-on-surface">Main Retail Storefront</h3>
                </div>
                <span className="text-xs bg-surface-container text-primary px-2 py-0.5 rounded font-semibold">
                  3 Assigned
                </span>
              </div>
              <p className="text-xs text-secondary">Assigned personnel have active billing and register desk privileges.</p>
              <div className="space-y-2 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between">
                  <span className="font-semibold text-on-surface">{ownerName} (Owner)</span>
                  <span className="text-emerald-700 font-medium">Terminal #1</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between">
                  <span className="font-semibold text-on-surface">Priya Sharma (Cashier)</span>
                  <span className="text-emerald-700 font-medium">Register Tablet</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between">
                  <span className="font-semibold text-on-surface">Ramesh Yadav (Packing)</span>
                  <span className="text-amber-800 font-medium">Pending Join</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-secondary" />
                  <h3 className="text-sm font-semibold text-on-surface">Central Godown Hub</h3>
                </div>
                <span className="text-xs bg-surface-container-high text-secondary px-2 py-0.5 rounded font-semibold">
                  2 Assigned
                </span>
              </div>
              <p className="text-xs text-secondary">Personnel authorized to accept supplier challans and dispatch transfers.</p>
              <div className="space-y-2 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between">
                  <span className="font-semibold text-on-surface">{ownerName} (Owner)</span>
                  <span className="text-emerald-700 font-medium">All Units</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between">
                  <span className="font-semibold text-on-surface">Rajesh Kumar (Depot Lead)</span>
                  <span className="text-emerald-700 font-medium">Handheld #4</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 shadow-xs space-y-3">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-on-surface">Administrative Security &amp; Access Log</h2>
              <p className="text-xs text-secondary">Cryptographic audit trail of all staff authentication and permission updates.</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-surface-container-low rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span className="font-medium text-on-surface">Store Owner terminal session authenticated</span>
                </div>
                <span className="text-secondary">Today, 08:00 AM &bull; IP 49.36.128.4</span>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send size={16} className="text-primary" />
                  <span className="font-medium text-on-surface">Dispatched SMS invitation to Ramesh Yadav (+91 98201 44820)</span>
                </div>
                <span className="text-secondary">Yesterday, 04:30 PM &bull; Console</span>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-secondary" />
                  <span className="font-medium text-on-surface">Cashier role policy refreshed: POS restricted to Vasai node</span>
                </div>
                <span className="text-secondary">Nov 06, 02:15 PM &bull; Sovereign Key</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSendInvite} className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 border border-outline-variant/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div>
                <h3 className="text-base font-bold text-on-surface">Invite Team Member</h3>
                <p className="text-xs text-secondary">Send sovereign WhatsApp / SMS invite link with designated role.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-secondary hover:text-on-surface p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-secondary font-medium mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Suresh Patel"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-secondary font-medium mb-1">WhatsApp Mobile or Email</label>
                <input
                  type="text"
                  required
                  value={inviteContact}
                  onChange={(e) => setInviteContact(e.target.value)}
                  placeholder="+91 98765 43210 or staff@gmail.com"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-secondary font-medium mb-1">Role Template</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/30 focus:outline-none"
                  >
                    <option>Counter Cashier</option>
                    <option>Godown Manager</option>
                    <option>Fulfillment Associate</option>
                    <option>Store Assistant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-secondary font-medium mb-1">Primary Physical Location</label>
                  <select
                    value={inviteLocation}
                    onChange={(e) => setInviteLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/30 focus:outline-none"
                  >
                    <option>Main Retail Storefront</option>
                    <option>Central Godown Hub</option>
                    <option>All Locations</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="h-10 px-4 rounded-lg bg-surface-container text-on-surface text-xs font-medium hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-lg bg-primary-container text-on-primary text-xs font-medium hover:bg-primary transition-colors flex items-center gap-1.5"
              >
                <Send size={14} />
                <span>Dispatch Invitation</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

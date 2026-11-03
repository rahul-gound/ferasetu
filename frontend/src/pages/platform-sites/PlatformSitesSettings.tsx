import React, { useState } from 'react';
import { Settings, ShieldCheck, UserPlus, UserX, AlertCircle } from 'lucide-react';
import { platformSitesApi } from '../../services/platformSitesApi';
import toast from 'react-hot-toast';

export default function PlatformSitesSettings() {
  const [targetUserId, setTargetUserId] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [role, setRole] = useState<'platform_admin' | 'developer' | 'viewer'>('platform_admin');
  const [grantLoading, setGrantLoading] = useState(false);

  const [revokeUserId, setRevokeUserId] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !targetEmail) return;
    setGrantLoading(true);
    try {
      await platformSitesApi.grantEntitlement(targetUserId.trim(), targetEmail.trim(), role);
      toast.success(`Admin Plan granted to ${targetEmail} with role '${role}'.`);
      setTargetUserId('');
      setTargetEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to grant entitlement');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeUserId || !confirm(`Immediately revoke Admin Plan for user '${revokeUserId}'?`)) return;
    setRevokeLoading(true);
    try {
      await platformSitesApi.revokeEntitlement(revokeUserId.trim());
      toast.success(`Admin Plan revoked for ${revokeUserId}.`);
      setRevokeUserId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke entitlement');
    } finally {
      setRevokeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Sites Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage FERASETU_INTERNAL_ADMIN_PLAN entitlements, roles, and quotas.</p>
      </div>

      {/* Grant Entitlement Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-[#0052FF]" />
          <h3 className="text-sm font-bold text-slate-900">Grant Internal Admin Plan</h3>
        </div>
        <p className="text-xs text-slate-600">
          Superadmins can grant internal platform administration entitlements to authenticated WorkOS users.
        </p>

        <form onSubmit={handleGrant} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="WorkOS User ID (user_...)"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
            required
          />
          <input
            type="email"
            placeholder="Admin Email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0052FF]"
          >
            <option value="platform_admin">Platform Admin</option>
            <option value="developer">Developer</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={grantLoading}
            className="px-4 py-2 bg-[#0052FF] hover:bg-[#0045d8] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            {grantLoading ? 'Granting...' : 'Grant Entitlement'}
          </button>
        </form>
      </div>

      {/* Revoke Entitlement Card */}
      <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-rose-700">
          <UserX size={18} />
          <h3 className="text-sm font-bold">Revoke Internal Admin Plan</h3>
        </div>
        <p className="text-xs text-slate-600">
          Revocation takes effect immediately. The user will be barred from privileged endpoints. Existing production sites will not be deleted.
        </p>

        <form onSubmit={handleRevoke} className="flex gap-3 max-w-lg">
          <input
            type="text"
            placeholder="WorkOS User ID to revoke"
            value={revokeUserId}
            onChange={(e) => setRevokeUserId(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-rose-200 focus:outline-none focus:border-rose-500"
            required
          />
          <button
            type="submit"
            disabled={revokeLoading}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            {revokeLoading ? 'Revoking...' : 'Revoke Access'}
          </button>
        </form>
      </div>
    </div>
  );
}

import React from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import CommunityPage from './CommunityPage';

export default function AdminCommunityPage() {
  return (
    <AdminLayout>
      <div className="min-h-full bg-slate-50/50">
        <CommunityPage isAdmin={true} />
      </div>
    </AdminLayout>
  );
}

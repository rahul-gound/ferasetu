import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  
  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  // Optional: Add JWT expiration check here
  
  return <>{children}</>;
}

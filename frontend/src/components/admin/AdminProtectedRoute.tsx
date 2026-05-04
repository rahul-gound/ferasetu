import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  
  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('admin_token');
      return <Navigate to="/admin" replace />;
    }
  } catch {
    localStorage.removeItem('admin_token');
    return <Navigate to="/admin" replace />;
  }
   
  return <>{children}</>;
}

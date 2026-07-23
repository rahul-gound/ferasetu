import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);
  const token = localStorage.getItem('admin_token');
  
  useEffect(() => {
    if (!token) {
      setVerified(false);
      return;
    }

    // Verify token with the backend — client-side JWT parsing is not enough.
    axios.get(`${API}/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => setVerified(true))
      .catch(() => {
        localStorage.removeItem('admin_token');
        setVerified(false);
      });
  }, [token]);

  if (verified === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #FF6B35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!verified) {
    return <Navigate to="/admin" replace />;
  }
   
  return <>{children}</>;
}

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { verifyAdminStatus, clearAdminSession } from '../../services/adminAuth';
import SEO from '../SEO';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [verificationState, setVerificationState] = useState<'checking' | 'authorized' | 'forbidden' | 'unauthorized'>('checking');
  const [denialDetails, setDenialDetails] = useState<string>('');

  useEffect(() => {
    let isCurrent = true;

    async function checkAdminAccess() {
      // 1. Wait for AuthKit to finish initializing
      if (isAuthLoading) {
        return;
      }

      // 2. If AuthKit has settled and there is no user session
      if (!user) {
        // Also check if there's a cached admin token (e.g. from developer/test)
        const cachedToken = localStorage.getItem('admin_token');
        if (!cachedToken) {
          try {
            sessionStorage.setItem('fera_auth_return_to', location.pathname + location.search);
          } catch {}
          if (isCurrent) setVerificationState('unauthorized');
          return;
        }
      }

      // 3. Cryptographically verify token & server allowlist with Worker
      try {
        const result = await verifyAdminStatus();
        if (!isCurrent) return;

        if (result.status === 'authorized') {
          setVerificationState('authorized');
        } else if (result.status === 'forbidden') {
          setDenialDetails(result.errorMessage || 'This account does not have platform administration privileges.');
          setVerificationState('forbidden');
        } else {
          clearAdminSession();
          try {
            sessionStorage.setItem('fera_auth_return_to', location.pathname + location.search);
          } catch {}
          setVerificationState('unauthorized');
        }
      } catch (err: any) {
        if (!isCurrent) return;
        clearAdminSession();
        setVerificationState('unauthorized');
      }
    }

    checkAdminAccess();

    return () => {
      isCurrent = false;
    };
  }, [user, isAuthLoading, location.pathname, location.search]);

  // Loading state
  if (isAuthLoading || verificationState === 'checking') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#090c1a', color: '#fff', gap: 16 }}>
        <SEO title="Verifying Admin Access — FeraSetu" noindex />
        <div style={{ width: 44, height: 44, border: '3px solid rgba(255,107,53,0.2)', borderTopColor: '#ff6b35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600 }}>
          Verifying administrator credentials with WorkOS...
        </p>
      </div>
    );
  }

  // Not authenticated at all -> redirect to /admin gateway
  if (verificationState === 'unauthorized') {
    return <Navigate to="/admin" replace />;
  }

  // Authenticated with WorkOS, but NOT in FeraSetu platform administrator allowlist -> HTTP 403 Forbidden
  if (verificationState === 'forbidden') {
    const handleSwitchAccount = () => {
      clearAdminSession();
      logout();
      try {
        sessionStorage.setItem('fera_auth_return_to', location.pathname + location.search);
      } catch {}
      navigate('/admin', { replace: true });
    };

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090c1a',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '24px'
      }}>
        <SEO title="403 Forbidden — Admin Access Denied" noindex />
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '28px',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            margin: '0 auto 24px'
          }}>
            <ShieldAlert size={34} />
          </div>

          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '999px',
            color: '#f87171',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '16px'
          }}>
            HTTP 403 Forbidden
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Access Denied
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            You are securely authenticated via WorkOS as <strong style={{ color: '#fff' }}>{user?.email || 'authenticated user'}</strong>, but this identity is not registered on the FeraSetu platform administrator allowlist.
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'left',
            marginBottom: '32px'
          }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
              Security Enforcement
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0, fontFamily: 'monospace' }}>
              {denialDetails || 'Role verification failed: platform_admin scope missing'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleSwitchAccount}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: '#ff6b35',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <LogOut size={16} /> Sign In with Different Account
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 600,
                fontSize: '14px',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <ArrowLeft size={16} /> Return to Store Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authorized -> render children
  return <>{children}</>;
}

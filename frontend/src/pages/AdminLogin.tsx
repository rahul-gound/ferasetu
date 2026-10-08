import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ArrowRight, Home, LogOut, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { verifyAdminStatus, clearAdminSession } from '../services/adminAuth';
import SEO from '../components/SEO';

export default function AdminLogin() {
  const { user, isLoading: isAuthLoading, login, logout } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);
  const [devPassword, setDevPassword] = useState('');
  const [devUsername, setDevUsername] = useState('admin@ferasetu.com');
  const [devLoading, setDevLoading] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const navigate = useNavigate();

  // If user is already authenticated with WorkOS, check if they are an authorized admin
  useEffect(() => {
    let isCurrent = true;

    async function evaluateAdminSession() {
      if (isAuthLoading) return;

      if (!user) {
        // Check if there is already a cached admin token
        const cachedToken = localStorage.getItem('admin_token');
        if (cachedToken) {
          setCheckingAdmin(true);
          const res = await verifyAdminStatus(cachedToken);
          if (!isCurrent) return;
          setCheckingAdmin(false);

          if (res.status === 'authorized') {
            toast.success('Welcome back, Administrator');
            navigate('/admin/dashboard', { replace: true });
            return;
          } else {
            clearAdminSession();
          }
        }
        return;
      }

      setCheckingAdmin(true);
      try {
        const result = await verifyAdminStatus();
        if (!isCurrent) return;

        if (result.status === 'authorized') {
          toast.success('Admin authorization verified');
          navigate('/admin/dashboard', { replace: true });
        } else if (result.status === 'forbidden') {
          setForbiddenError(result.errorMessage || 'Account is not authorized as a platform administrator.');
        } else {
          clearAdminSession();
        }
      } catch (err) {
        console.error('[AdminLogin] Verification failed:', err);
      } finally {
        if (isCurrent) setCheckingAdmin(false);
      }
    }

    evaluateAdminSession();

    return () => {
      isCurrent = false;
    };
  }, [user, isAuthLoading, navigate]);

  const handleWorkOSLogin = async () => {
    try {
      sessionStorage.setItem('fera_auth_return_to', '/admin/dashboard');
    } catch {}
    login();
  };

  const handleSwitchAccount = () => {
    clearAdminSession();
    logout();
    setForbiddenError(null);
    try {
      sessionStorage.setItem('fera_auth_return_to', '/admin/dashboard');
    } catch {}
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevLoading(true);
    try {
      const rawApi = import.meta.env.VITE_API_URL || '/api';
      const apiBase = rawApi.replace(/\/+$/, '');
      const loginUrl = apiBase.endsWith('/api') ? `${apiBase}/admin/login` : `${apiBase}/api/admin/login`;
      
      const res = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: devUsername, password: devPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      localStorage.setItem('admin_token', data.token);
      toast.success('Access Granted (Local Dev Session)');
      navigate('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Dev login failed');
    } finally {
      setDevLoading(false);
    }
  };

  const isDev = import.meta.env.DEV;

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#090c1a',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <SEO title="Admin Command Center — FeraSetu" noindex />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .login-card { animation: fadeIn 0.6s ease-out both; }
        .btn-hover:hover { transform: translateY(-2px); }
      `}</style>

      <div className="login-card" style={{ 
        width: '100%', 
        maxWidth: '460px', 
        padding: '20px'
      }}>
        {/* Back to Platform Link */}
        <Link to="/" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 8, 
          color: 'rgba(255,255,255,0.4)', 
          textDecoration: 'none', 
          fontSize: '13px', 
          fontWeight: 600, 
          marginBottom: '32px',
          transition: 'color 0.2s'
        }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
          <Home size={16} /> Back to FeraSetu
        </Link>

        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '32px',
          padding: '48px 40px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)'
        }}>
          {/* Header Icon */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: forbiddenError 
                ? 'rgba(239, 68, 68, 0.15)' 
                : 'linear-gradient(135deg, #ff6b35 0%, #e55a24 100%)', 
              border: forbiddenError ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
              borderRadius: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: forbiddenError ? '#ef4444' : '#fff', 
              margin: '0 auto 20px',
              boxShadow: forbiddenError ? 'none' : '0 12px 32px rgba(255,107,53,0.3)'
            }}>
              {forbiddenError ? <ShieldAlert size={32} /> : <ShieldCheck size={32} />}
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              Command Center
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontWeight: 500, lineHeight: 1.5 }}>
              Restricted platform operations for authorized administrators
            </p>
          </div>

          {/* Loading State */}
          {(isAuthLoading || checkingAdmin) && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#ff6b35', margin: '0 auto 16px' }} />
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600 }}>
                Verifying administrator identity with WorkOS...
              </p>
            </div>
          )}

          {/* Forbidden State (Logged in with WorkOS, but NOT an admin) */}
          {!isAuthLoading && !checkingAdmin && forbiddenError && (
            <div>
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Access Denied (HTTP 403)
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                  Signed in as <strong style={{ color: '#fff' }}>{user?.email}</strong>. This account does not possess platform administration privileges.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="btn-hover"
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: '#ff6b35',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    transition: 'all 0.2s',
                    boxShadow: '0 8px 24px rgba(255,107,53,0.3)'
                  }}
                >
                  <LogOut size={16} /> Sign In with Another Account
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 600,
                    fontSize: '13px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowLeft size={16} /> Return to Store Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Unauthenticated State (Ready to authenticate with WorkOS) */}
          {!isAuthLoading && !checkingAdmin && !forbiddenError && (
            <div>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '28px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <ShieldCheck size={14} style={{ color: '#ff6b35' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Identity Verification
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                  Authentication is managed securely via WorkOS AuthKit with Multi-Factor Authentication (MFA) and Single Sign-On (SSO).
                </p>
              </div>

              <button
                type="button"
                onClick={handleWorkOSLogin}
                className="btn-hover"
                style={{ 
                  width: '100%',
                  padding: '18px', 
                  borderRadius: '18px', 
                  background: '#fff', 
                  color: '#090c1a', 
                  fontWeight: 800, 
                  fontSize: '15px', 
                  border: 'none', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  transition: 'all 0.2s',
                  boxShadow: '0 12px 30px rgba(255,255,255,0.1)'
                }}
              >
                <span>Continue with WorkOS</span>
                <ArrowRight size={18} />
              </button>

              {/* Dev bypass toggle (only in development or testing) */}
              {isDev && (
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <button
                    type="button"
                    onClick={() => setShowDevLogin(!showDevLogin)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      margin: '0 auto'
                    }}
                  >
                    <KeyRound size={12} /> {showDevLogin ? 'Hide Dev Sandbox' : 'Local Dev Sandbox Login'}
                  </button>

                  {showDevLogin && (
                    <form onSubmit={handleDevLogin} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        value={devUsername}
                        onChange={e => setDevUsername(e.target.value)}
                        placeholder="Admin Email/Username"
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <input
                        type="password"
                        value={devPassword}
                        onChange={e => setDevPassword(e.target.value)}
                        placeholder="Admin Dev Password"
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <button
                        type="submit"
                        disabled={devLoading}
                        style={{ padding: '8px', background: 'rgba(255,107,53,0.3)', border: '1px solid #ff6b35', color: '#fff', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {devLoading ? 'Verifying...' : 'Dev Login'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* System Footer Badge */}
          <div style={{ marginTop: '36px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              System Integrity Level: High • WorkOS AuthKit
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

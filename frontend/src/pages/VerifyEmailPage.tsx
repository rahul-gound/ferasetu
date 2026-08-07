import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { account } from '../lib/appwrite';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#060818',
    padding: 16,
    fontFamily: 'Inter, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#090d1e',
    borderRadius: 24,
    padding: 32,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 1.6,
    marginBottom: 24,
  },
  btnPrimary: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'transform 0.2s',
    marginBottom: 12,
  },
  btnSecondary: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 600,
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s',
    marginBottom: 20,
  },
};

export default function VerifyEmailPage() {
  const { user, sendVerificationEmail, logout } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  // If user somehow gets here but is already verified, redirect immediately
  useEffect(() => {
    if (user && user.is_verified) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSendEmail = async () => {
    setSending(true);
    try {
      await sendVerificationEmail();
      toast.success('Verification link sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const me = await account.get();
      if (me.emailVerification) {
        toast.success('Email verified successfully! 🎉');
        // Force reload page to refresh session state
        window.location.reload();
      } else {
        toast.error('Email not verified yet. Please check your inbox or resend the link.');
      }
    } catch {
      toast.error('Failed to verify status. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(245, 158, 11, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#F59E0B', margin: '0 auto',
        }}>
          <ShieldAlert size={28} />
        </div>
        
        <h2 style={styles.title}>Email Verification Required</h2>
        
        <p style={styles.description}>
          We've sent a verification link to <strong style={{ color: '#fff' }}>{user?.email}</strong>. 
          Please verify your email address to unlock your account dashboard.
        </p>

        <button 
          onClick={handleCheckStatus}
          disabled={checking}
          style={styles.btnPrimary}
        >
          {checking ? 'Checking...' : <><RefreshCw size={16} /> I've Verified My Email</>}
        </button>

        <button 
          onClick={handleSendEmail}
          disabled={sending}
          style={styles.btnSecondary}
        >
          {sending ? 'Sending...' : <><Mail size={16} /> Resend Verification Email</>}
        </button>

        <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', marginBottom: 20 }} />

        <button 
          onClick={logout}
          style={{
            background: 'none', border: 'none', color: '#EF4444',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 700, cursor: 'pointer', margin: '0 auto'
          }}
        >
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}

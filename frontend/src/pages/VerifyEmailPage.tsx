import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // If already verified, navigate to dashboard
  useEffect(() => {
    if (user?.is_verified) {
      navigate('/dashboard', { replace: true });
    }
  }, [user?.is_verified, navigate]);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      toast.loading('Checking verification status...', { id: 'verify-status' });
      // Reload page to re-fetch session and verification state from auth provider
      window.location.reload();
    } catch {
      toast.error('Unable to check verification status. Please try again.', { id: 'verify-status' });
      setChecking(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <SEO title="Verify Your Email • FeraSetu" noindex />
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060818] px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20">
            <Mail size={32} />
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-2">
            Verify your email address
          </h1>

          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            We sent a verification link to <span className="font-semibold text-slate-200">{user?.email || 'your email'}</span>.
            Please verify your email address to access your merchant dashboard.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0052FF] py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-70"
            >
              {checking ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Checking status...</span>
                </>
              ) : (
                <>
                  <span>Check verification status</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign in with another account</span>
            </button>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Did not receive the email? Check your spam folder or re-authenticate.
          </p>
        </div>
      </div>
    </>
  );
}

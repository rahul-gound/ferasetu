import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const hasTriggered = useRef(false);
  const [showManualButton, setShowManualButton] = useState(false);

  const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID || 'client_01KZRE47KGSPK84HEP9WNBG9YY';
  const directSignInUrl = `https://api.workos.com/user_management/authorize?provider=authkit&client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/callback')}&response_type=code&screen_hint=sign-in`;

  // Handle redirect once auth state is settled
  useEffect(() => {
    if (isLoading) return;

    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!hasTriggered.current) {
      hasTriggered.current = true;
      login();
    }
  }, [user, isLoading, login, navigate]);

  // Fallback: If auth state hangs on slow networks for > 2.5s, trigger login anyway
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasTriggered.current && !user) {
        hasTriggered.current = true;
        login();
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, [user, login]);

  // After 1.5s, reveal the manual button in case browser blocked auto-redirects
  useEffect(() => {
    const buttonTimer = setTimeout(() => {
      setShowManualButton(true);
    }, 1500);

    return () => clearTimeout(buttonTimer);
  }, []);

  const handleManualRedirect = () => {
    try {
      login();
    } catch {
      window.location.assign(directSignInUrl);
    }
  };

  return (
    <>
      <SEO title="Sign in • FeraSetu" noindex />
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060818] px-4 text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <span
            className="h-10 w-10 animate-spin rounded-full border-3 border-blue-500 border-t-transparent"
            role="status"
            aria-label="Connecting to secure sign in..."
          />
          <p className="text-base font-semibold text-slate-200">
            Connecting to secure sign in...
          </p>
          <p className="text-xs text-slate-400">
            Redirecting to FeraSetu authentication
          </p>

          {showManualButton && (
            <div className="mt-4 pt-4 border-t border-slate-800 w-full animate-fadeIn">
              <a
                href={directSignInUrl}
                onClick={(e) => {
                  e.preventDefault();
                  handleManualRedirect();
                }}
                className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Click here if not redirected</span>
                <ArrowRight size={15} />
              </a>
              <p className="text-[11px] text-slate-500 mt-2">
                Takes you straight to secure WorkOS sign in
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

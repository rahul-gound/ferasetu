import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const { register, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const hasTriggered = useRef(false);
  const [showManualButton, setShowManualButton] = useState(false);

  const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID || 'client_01KZRE47KGSPK84HEP9WNBG9YY';
  const directSignUpUrl = `https://api.workos.com/user_management/authorize?provider=authkit&client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/callback')}&response_type=code&screen_hint=sign-up`;

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!hasTriggered.current) {
      hasTriggered.current = true;
      try {
        register();
      } catch (err) {
        console.error('Register trigger failed, navigating directly:', err);
        window.location.assign(directSignUpUrl);
      }
    }

    // Fail-safe: if after 2.5 seconds we are still here, force direct navigation
    const forceTimer = setTimeout(() => {
      if (!user) {
        window.location.assign(directSignUpUrl);
      }
    }, 2500);

    // After 800ms, show the manual button so user is never stranded
    const buttonTimer = setTimeout(() => {
      setShowManualButton(true);
    }, 800);

    return () => {
      clearTimeout(forceTimer);
      clearTimeout(buttonTimer);
    };
  }, [user, isLoading, register, navigate, directSignUpUrl]);

  return (
    <>
      <SEO title="Create Your Store • FeraSetu" noindex />
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060818] px-4 text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <span
            className="h-10 w-10 animate-spin rounded-full border-3 border-blue-500 border-t-transparent"
            role="status"
            aria-label="Redirecting to secure registration..."
          />
          <p className="text-base font-semibold text-slate-200">
            Redirecting to secure sign up...
          </p>
          <p className="text-xs text-slate-400">
            Setting up your FeraSetu account
          </p>

          {showManualButton && (
            <div className="mt-4 pt-4 border-t border-slate-800 w-full animate-fadeIn">
              <a
                href={directSignUpUrl}
                className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <span>Click here if not redirected</span>
                <ArrowRight size={15} />
              </a>
              <p className="text-[11px] text-slate-500 mt-2">
                Takes you straight to secure WorkOS registration
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

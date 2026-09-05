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
  const [hasLoopDetected, setHasLoopDetected] = useState(false);

  const directAuthUrl = 'https://decent-grass-08.authkit.app/sign-up';

  useEffect(() => {
    // Detect redirect loop: if bounced back within 5 seconds more than twice
    const now = Date.now();
    const lastAttempt = parseInt(sessionStorage.getItem('workos_signup_redirect_ts') || '0', 10);
    const attemptCount = parseInt(sessionStorage.getItem('workos_signup_attempts') || '0', 10);

    if (now - lastAttempt < 5000) {
      const newCount = attemptCount + 1;
      sessionStorage.setItem('workos_signup_attempts', newCount.toString());
      if (newCount >= 2) {
        setHasLoopDetected(true);
        setShowManualButton(true);
        return;
      }
    } else {
      sessionStorage.setItem('workos_signup_attempts', '1');
    }
    sessionStorage.setItem('workos_signup_redirect_ts', now.toString());

    if (isLoading) return;

    if (user) {
      sessionStorage.removeItem('workos_signup_attempts');
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!hasTriggered.current) {
      hasTriggered.current = true;
      register();
    }
  }, [user, isLoading, register, navigate]);

  // Fallback: If auth state hangs on slow networks for > 2.5s, trigger registration anyway
  useEffect(() => {
    if (hasLoopDetected) return;
    const timeout = setTimeout(() => {
      if (!hasTriggered.current && !user) {
        hasTriggered.current = true;
        register();
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, [user, register, hasLoopDetected]);

  // After 1.5s, reveal manual button
  useEffect(() => {
    const buttonTimer = setTimeout(() => {
      setShowManualButton(true);
    }, 1500);

    return () => clearTimeout(buttonTimer);
  }, []);

  const handleManualRedirect = () => {
    try {
      register();
    } catch {
      window.location.assign(directAuthUrl);
    }
  };

  return (
    <>
      <SEO title="Create Your Store • FeraSetu" noindex />
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060818] px-4 text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          {!hasLoopDetected ? (
            <>
              <span
                className="h-10 w-10 animate-spin rounded-full border-3 border-blue-500 border-t-transparent"
                role="status"
                aria-label="Redirecting to secure registration..."
              />
              <p className="text-base font-semibold text-slate-200">
                Redirecting to secure sign up...
              </p>
              <p className="text-xs text-slate-400">
                Taking you to WorkOS AuthKit sign-up
              </p>
            </>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs mb-2">
              It looks like you were redirected back. Click the button below to open sign up.
            </div>
          )}

          {showManualButton && (
            <div className="mt-4 pt-4 border-t border-slate-800 w-full animate-fadeIn">
              <a
                href={directAuthUrl}
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
                Takes you straight to secure WorkOS registration
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

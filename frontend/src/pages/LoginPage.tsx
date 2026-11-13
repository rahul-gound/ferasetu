import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { ArrowRight, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, user, isLoading, getDirectAuthUrl } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTriggeredRef = useRef(false);

  // Capture return_to destination if provided
  useEffect(() => {
    const returnTo = searchParams.get('return_to');
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      try {
        sessionStorage.setItem('fera_auth_return_to', returnTo);
      } catch {}
    }
  }, [searchParams]);

  // If already authenticated, head straight to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Automatically send user directly to the login URL without intermediate screens
  useEffect(() => {
    if (user || isLoading || redirectTriggeredRef.current) return;
    redirectTriggeredRef.current = true;

    try {
      login();
    } catch (err) {
      console.error('[LoginPage] Auto-redirect failed, falling back to direct URL:', err);
      const fallbackUrl = getDirectAuthUrl ? getDirectAuthUrl('sign-in') : null;
      if (fallbackUrl) {
        window.location.replace(fallbackUrl);
      }
    }
  }, [user, isLoading, login, getDirectAuthUrl]);

  const directAuthUrl = getDirectAuthUrl ? getDirectAuthUrl('sign-in') : '#';

  return (
    <>
      <SEO
        title="Sign In • FeraSetu"
        description="Sign in to your FeraSetu merchant workspace to manage your products, track customer orders, and configure your independent online store."
        noindex
      />

      <div className="min-h-screen bg-slate-50/70 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-slate-900 select-none">
        <div className="w-full max-w-sm mx-auto text-center flex flex-col items-center">
          {/* Official Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-8 group">
            <img
              src="/logo-official.png"
              alt="FeraSetu"
              className="h-10 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </Link>

          {/* Calm Loading Animation */}
          <div className="relative mb-6 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shadow-inner">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <span className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping -z-10" />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
            Taking you to secure sign-in...
          </h1>

          <p className="text-sm text-slate-600 max-w-xs mx-auto mb-6 leading-relaxed">
            Connecting directly to the official merchant portal. One moment please.
          </p>

          {/* Instant fallback link if browser blocks auto-navigation */}
          <div className="pt-2 pb-4">
            <a
              href={directAuthUrl}
              onClick={(e) => {
                e.preventDefault();
                login();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer group"
            >
              <span>Not redirected automatically? Click here</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Micro trust indicators */}
          <div className="mt-8 pt-6 border-t border-slate-200/60 w-full flex items-center justify-center gap-3 text-[11px] text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1">
              <Lock size={12} className="text-emerald-600" />
              <span>256-Bit SSL</span>
            </span>
            <span>•</span>
            <span>0% Commission</span>
            <span>•</span>
            <span>Merchant Data Owned</span>
          </div>
        </div>
      </div>
    </>
  );
}

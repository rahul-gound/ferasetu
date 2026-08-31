/**
 * LoginPage — AIDA: Authenticate with FeraSetu identity.
 *
 * The page communicates what you're signing into and why it's worth it,
 * while preserving the existing WorkOS authentication behavior.
 *
 * Does NOT break OAuth flow, redirect logic, or session handling.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowRight, ArrowLeft, Store, Percent, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import SEO from '../components/SEO';

const VALUE_POINTS = [
  { icon: <Store size={14} />, text: 'Your own online store — yourshop.ferasetu.com' },
  { icon: <Percent size={14} />, text: 'Zero commission on every sale' },
  { icon: <MessageSquare size={14} />, text: 'WhatsApp orders + direct UPI payments' },
  { icon: <Sparkles size={14} />, text: 'Fera AI that knows your shop data' },
];

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const { getLocalizedLink } = useLanguage();
  const navigate = useNavigate();
  const hasAttempted = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setIsSubmitting(true);
    try {
      await login();
    } catch (err) {
      console.error('Login attempt failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      navigate('/dashboard');
    } else if (!hasAttempted.current) {
      hasAttempted.current = true;
      handleLogin();
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
      <SEO title="Sign In — FeraSetu" noindex />

      {/* Background ambient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back link */}
        <Link
          to={getLocalizedLink('/')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={15} />
          Back to Home
        </Link>

        <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <Link to="/" className="inline-block mb-6">
            <img
              src="/logo-official.png"
              alt="FeraSetu"
              className="h-9 w-auto object-contain"
            />
          </Link>

          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            Sign in to manage your online store, orders, and products.
          </p>

          {/* Value reminder — brief, not distracting */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Your FeraSetu workspace
            </p>
            <div className="space-y-2">
              {VALUE_POINTS.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <span className="text-blue-400 flex-shrink-0">{v.icon}</span>
                  {v.text}
                </div>
              ))}
            </div>
          </div>

          {/* Spinner */}
          <div className="py-3 mb-5 flex flex-col items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-2.5" />
            <p className="text-sm text-slate-300 font-medium">Connecting to secure login...</p>
          </div>

          {/* Fallback */}
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Opening Sign In...' : 'Click Here to Sign In'}
              <ArrowRight size={15} />
            </button>

            <Link
              to={getLocalizedLink('/register')}
              className="block w-full py-2.5 px-4 text-sm font-semibold text-slate-400 hover:text-white transition-colors text-center"
            >
              Don't have an account?{' '}
              <span className="text-blue-400 underline underline-offset-4">Start Free</span>
            </Link>
          </div>
        </div>

        {/* Info bar */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span>Secure login · Data stays in India · ₹0 to start</span>
        </div>
      </div>
    </div>
  );
}

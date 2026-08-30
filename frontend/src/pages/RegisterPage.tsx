import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowRight, Store, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

export default function RegisterPage() {
  const { register, login, user, isLoading } = useAuth();
  const { getLocalizedLink } = useLanguage();
  const navigate = useNavigate();
  const hasAttempted = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
      await register();
    } catch (err) {
      console.warn('Register attempt failed, falling back to login:', err);
      try {
        await login();
      } catch (loginErr) {
        console.error('Fallback login failed:', loginErr);
      }
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
      handleRegister();
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
      <SEO title="Start Free Trial" noindex />

      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <Link 
          to={getLocalizedLink('/')} 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl text-center">
          {/* Logo */}
          <Link to="/" className="inline-block mb-6">
            <img 
              src="/logo-official.png" 
              alt="FeraSetu" 
              className="h-10 w-auto mx-auto object-contain" 
            />
          </Link>

          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">
            Create Your Free Account
          </h1>
          <p className="text-sm text-slate-400 mb-8">
            Dukaan ko online lao, orders WhatsApp par pao. No credit card required.
          </p>

          {/* Spinner / Status */}
          <div className="py-4 mb-6 flex flex-col items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-500 border-t-transparent mb-3"></div>
            <p className="text-sm text-slate-300 font-medium">
              Connecting to secure signup...
            </p>
          </div>

          {/* Fallback Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Opening Sign Up...' : 'Click Here to Sign Up'}
              <ArrowRight size={16} />
            </button>

            <Link
              to={getLocalizedLink('/login')}
              className="block w-full py-2.5 px-4 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Already have an account? <span className="text-blue-400 underline underline-offset-4">Sign In</span>
            </Link>
          </div>
        </div>

        {/* Benefits bar */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-center text-xs text-slate-400">
          <div className="flex items-center justify-center gap-1.5">
            <Store size={14} className="text-blue-400" />
            <span>5-minute setup</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Zero commissions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
/**
 * RegisterPage — AIDA: Create account with "what happens next" clarity.
 *
 * Communicates:
 * - What you're creating (your online store)
 * - What happens immediately after signup
 * - Why it's worth the 2 minutes
 *
 * Preserves all existing WorkOS auth behavior (register → login fallback).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowRight, ArrowLeft, CheckCircle2, Package, Globe, ShoppingCart, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';

const NEXT_STEPS = [
  { icon: <Package size={14} className="text-blue-400" />, label: 'Add your first product' },
  { icon: <Globe size={14} className="text-blue-400" />, label: 'Your store URL is ready instantly' },
  { icon: <ShoppingCart size={14} className="text-blue-400" />, label: 'Share with customers & receive orders' },
  { icon: <Sparkles size={14} className="text-purple-400" />, label: 'Ask Fera AI to help manage your shop' },
];

export default function RegisterPage() {
  const { register, login, user, isLoading } = useAuth();
  const { getLocalizedLink } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasAttempted = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = searchParams.get('plan');

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
      <SEO title="Create Free Store — FeraSetu" noindex />

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
            {selectedPlan === 'business'
              ? 'Start your Business store'
              : selectedPlan === 'pro'
              ? 'Start your Pro store'
              : 'Create your free store'}
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            Dukaan ko online lao, orders WhatsApp par pao.{' '}
            <span className="text-emerald-400 font-semibold">No credit card required.</span>
          </p>

          {/* What happens next */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              What happens after you sign up
            </p>
            <div className="space-y-2.5">
              {NEXT_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
                  <span className="flex-shrink-0">{step.icon}</span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Spinner */}
          <div className="py-3 mb-5 flex flex-col items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-2.5" />
            <p className="text-sm text-slate-300 font-medium">Setting up your account...</p>
          </div>

          {/* Fallback */}
          <div className="space-y-3">
            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Opening Sign Up...' : 'Click Here to Create Account'}
              <ArrowRight size={15} />
            </button>

            <Link
              to={getLocalizedLink('/login')}
              className="block w-full py-2.5 px-4 text-sm font-semibold text-slate-400 hover:text-white transition-colors text-center"
            >
              Already have an account?{' '}
              <span className="text-blue-400 underline underline-offset-4">Sign In</span>
            </Link>
          </div>
        </div>

        {/* Trust footer */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-500" />
            Free forever for 25 products
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-500" />
            0% commission
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-500" />
            Data stays in India
          </span>
        </div>
      </div>
    </div>
  );
}
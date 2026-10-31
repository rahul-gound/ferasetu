import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import SEO from '../components/SEO';
import { ArrowRight, Sparkles, CheckCircle2, Loader2, Lock } from 'lucide-react';

export default function RegisterPage() {
  const { register, user, isLoading } = useAuth();
  const { market } = useMarket();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleRegister = async () => {
    if (isSubmitting || isLoading) return;
    setIsSubmitting(true);
    try {
      await register();
    } catch (err) {
      console.error('Failed to initiate registration:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Create Your Store • FeraSetu"
        description="Create your free independent online store in 5 minutes with FeraSetu. 0% platform commission, direct UPI payments, and zero jargon."
        noindex
      />
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-900 relative">
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="flex flex-col items-center justify-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 group mb-3">
              <img
                src="/logo-official.png"
                alt="FeraSetu"
                className="h-11 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </Link>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <span>Official Merchant Registration</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>{market === 'IN' ? '₹0 Free Plan Available' : '14-Day Free Trial Available'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Launch Your Online Store
            </h1>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              Build your online store, accept more orders, and manage your business from one place.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="space-y-6">
              <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{market === 'IN' ? 'Free ₹0 tier with 25 product catalog and WhatsApp orders' : 'Full access to Business capabilities during 14-day trial'}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Built-in AI assistant for instant catalog and description creation</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Direct checkout with 0% platform commission</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isLoading || isSubmitting}
                  className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:-translate-y-0.5 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Starting registration...</span>
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking session...</span>
                    </>
                  ) : (
                    <>
                      <span>{market === 'IN' ? 'Start Free with WorkOS' : 'Start 14-Day Free Trial'}</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-600 font-medium">
                  Already have a store?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Micro-trust indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1">
              <Lock size={12} className="text-emerald-600" />
              <span>256-Bit SSL</span>
            </span>
            <span>•</span>
            <span>0% Sales Commission</span>
            <span>•</span>
            <span>Merchant Data Owned</span>
          </div>

          <div className="text-center mt-4">
            <Link
              to="/"
              className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors inline-flex items-center gap-1"
            >
              ← Back to FeraSetu Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

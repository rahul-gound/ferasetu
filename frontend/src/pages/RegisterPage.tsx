import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import SEO from '../components/SEO';
import { Store, ArrowRight, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

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
      <SEO title="Create Your Store • FeraSetu" description="Start your free online store with FeraSetu." noindex />
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-900 relative">
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="flex justify-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <img
                src="/logo-official.png"
                alt="FeraSetu"
                className="h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>
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

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="space-y-6">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{market === 'IN' ? 'Free ₹0 tier with 25 product catalog and WhatsApp orders' : 'Full access to Business capabilities during 14-day trial'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Built-in AI assistant for instant catalog and description creation</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Mobile-optimized digital catalog and direct checkout</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isLoading || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Starting registration...</span>
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Checking session...</span>
                    </>
                  ) : (
                    <>
                      <span>{market === 'IN' ? 'Start Free with WorkOS' : 'Start 14-Day Free Trial'}</span>
                      <ArrowRight className="w-4 h-4" />
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

          <div className="text-center mt-6">
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

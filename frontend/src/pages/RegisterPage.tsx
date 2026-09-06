import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { Store, ArrowRight, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const { register, user, isLoading } = useAuth();
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
      <div className="min-h-screen bg-[#060818] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="flex justify-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">FeraSetu</span>
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>₹0 Free Plan Available</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Launch Your Online Store
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Build your online store, accept more orders, and manage your business from one place.
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
            <div className="space-y-6">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Free ₹0 tier with 25 product catalog and WhatsApp orders</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Built-in AI assistant for instant catalog creation</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Supports 22 Indian regional languages</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isLoading || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-blue-600/25 cursor-pointer"
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
                      <span>Start Free with WorkOS</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-sm text-slate-400">
                  Already have a store?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
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
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            >
              ← Back to FeraSetu Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

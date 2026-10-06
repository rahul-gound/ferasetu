import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { Store, ArrowRight, ShieldCheck, Loader2, Lock } from 'lucide-react';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    if (isSubmitting || isLoading) return;
    setIsSubmitting(true);
    try {
      await login();
    } catch (err) {
      console.error('Failed to initiate login:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Sign In • FeraSetu" description="Sign in to your FeraSetu merchant dashboard." noindex />
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
              <span>Official Merchant Portal</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign In to Your Store
            </h1>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              Manage orders, update products, and grow your independent business.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="space-y-6">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed font-medium">
                    Secure merchant authentication powered by WorkOS AuthKit. One-click sign-in with your business email or Google account.
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoading || isSubmitting}
                  className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:-translate-y-0.5 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting to secure sign-in...</span>
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking session...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue with WorkOS</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-600 font-medium">
                  New to FeraSetu?{' '}
                  <Link
                    to="/register"
                    className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Create your store free
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

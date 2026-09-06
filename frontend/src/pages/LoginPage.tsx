import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { Store, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

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
      <div className="min-h-screen bg-[#060818] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sign In to Your Store
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Build your online store, accept more orders, and manage from one place.
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    Secure authentication powered by WorkOS AuthKit. One-click sign-in with your business email or Google account.
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoading || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-blue-600/25 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Connecting to secure sign-in...</span>
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Checking session...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue with WorkOS</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-sm text-slate-400">
                  New to FeraSetu?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Create your store free
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

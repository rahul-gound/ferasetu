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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign In to Your Store
            </h1>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              Build your online store, accept more orders, and manage from one place.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed font-medium">
                    Secure authentication powered by WorkOS AuthKit. One-click sign-in with your business email or Google account.
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoading || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-blue-600/20 cursor-pointer"
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

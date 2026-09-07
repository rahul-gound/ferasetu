import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

export default function AuthCallbackPage() {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorHandledRef = useRef(false);

  useEffect(() => {
    // 1. If an explicit error was returned by the auth provider:
    const error = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    if (error && !errorHandledRef.current) {
      errorHandledRef.current = true;
      toast.error(errorDesc || 'Authentication cancelled or failed. Please sign in again.');
      navigate('/login', { replace: true });
      return;
    }

    // 2. Direct visit check: if there is no code and user is already known or loading finished
    const code = searchParams.get('code');
    if (!code && !isLoading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else if (!errorHandledRef.current) {
        errorHandledRef.current = true;
        toast('No authentication session in progress. Please sign in.', { icon: 'ℹ️' });
        navigate('/login', { replace: true });
      }
      return;
    }

    // 3. When authentication finishes:
    if (!isLoading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else if (!errorHandledRef.current) {
        errorHandledRef.current = true;
        toast.error('Authentication session could not be established. Please sign in again.');
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, navigate, searchParams]);

  // Timeout fallback in case auth provider or token exchange hangs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!errorHandledRef.current && !user) {
        errorHandledRef.current = true;
        toast.error('Sign in timed out. Please try again.');
        navigate('/login', { replace: true });
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  return (
    <>
      <SEO title="Opening your shop • FeraSetu" noindex />
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <span
            className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-orange-500"
            role="status"
            aria-label="Opening your shop..."
          />
          <p className="text-base font-bold text-slate-800">
            Opening your shop...
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Finalizing your secure session
          </p>
        </div>
      </div>
    </>
  );
}

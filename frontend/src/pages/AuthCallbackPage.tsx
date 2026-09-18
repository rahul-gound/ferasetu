import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const IS_DEV = import.meta.env.DEV;
function callbackLog(event: string, detail?: string) {
  if (!IS_DEV) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[AUTH ${ts}] ${event}${detail ? ` — ${detail}` : ''}`);
}

export default function AuthCallbackPage() {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorHandledRef = useRef(false);
  const callbackStartedRef = useRef(false);

  useEffect(() => {
    if (!callbackStartedRef.current) {
      callbackStartedRef.current = true;
      const hasCode = Boolean(searchParams.get('code'));
      callbackLog('AUTH_CALLBACK_START', hasCode ? 'code present — WorkOS will exchange' : 'no code in URL');
    }

    // 1. If an explicit error was returned by the auth provider:
    const error = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    if (error && !errorHandledRef.current) {
      errorHandledRef.current = true;
      callbackLog('AUTH_CALLBACK_FAILURE', `provider error: ${error}`);
      toast.error(errorDesc || 'Authentication cancelled or failed. Please sign in again.');
      navigate('/login', { replace: true });
      return;
    }

    // 2. Direct visit check: no ?code= and loading is done
    const code = searchParams.get('code');
    if (!code && !isLoading) {
      if (user) {
        callbackLog('AUTH_CALLBACK_SUCCESS', 'no code — user already authenticated, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      } else if (!errorHandledRef.current) {
        errorHandledRef.current = true;
        callbackLog('AUTH_CALLBACK_FAILURE', 'no code and no session — redirecting to login');
        toast('No authentication session in progress. Please sign in.', { icon: 'ℹ️' });
        navigate('/login', { replace: true });
      }
      return;
    }

    // 3. WorkOS has processed the code (isLoading settled):
    if (!isLoading) {
      if (user) {
        callbackLog('AUTH_CALLBACK_SUCCESS', `session established for ${user.email} — redirecting to dashboard`);
        navigate('/dashboard', { replace: true });
      } else if (!errorHandledRef.current) {
        errorHandledRef.current = true;
        callbackLog('AUTH_CALLBACK_FAILURE', 'WorkOS returned no user after code exchange');
        toast.error('Authentication session could not be established. Please sign in again.');
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, navigate, searchParams]);

  // Timeout fallback — allow 15s for code exchange and profile load on slow connections.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!errorHandledRef.current && !user) {
        errorHandledRef.current = true;
        callbackLog('AUTH_CALLBACK_FAILURE', 'timeout after 15s');
        toast.error('Sign in timed out. Please try again.');
        navigate('/login', { replace: true });
      }
    }, 15000);

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

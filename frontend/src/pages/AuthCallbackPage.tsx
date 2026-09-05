import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

export default function AuthCallbackPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const errorHandledRef = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else if (!errorHandledRef.current) {
        errorHandledRef.current = true;
        toast.error('Authentication failed or was cancelled. Please sign in again.');
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060818] px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <span
            className="h-10 w-10 animate-spin rounded-full border-3 border-blue-500 border-t-transparent"
            role="status"
            aria-label="Opening your shop..."
          />
          <p className="text-base font-semibold text-slate-200">
            Opening your shop...
          </p>
          <p className="text-xs text-slate-500">
            Finalizing your secure session
          </p>
        </div>
      </div>
    </>
  );
}

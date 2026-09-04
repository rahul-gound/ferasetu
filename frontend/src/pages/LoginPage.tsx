import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!isLoading && !user && !hasTriggered.current) {
      hasTriggered.current = true;
      login();
    }
  }, [user, isLoading, login, navigate]);

  return (
    <>
      <SEO title="Sign in • FeraSetu" noindex />
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060818] px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <span
            className="h-10 w-10 animate-spin rounded-full border-3 border-blue-500 border-t-transparent"
            role="status"
            aria-label="Connecting to secure sign in..."
          />
          <p className="text-base font-semibold text-slate-300">
            Connecting to secure sign in...
          </p>
          <p className="text-xs text-slate-500">
            Redirecting to FeraSetu authentication
          </p>
        </div>
      </div>
    </>
  );
}

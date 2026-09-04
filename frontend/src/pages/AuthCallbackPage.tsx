import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

export default function AuthCallbackPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

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

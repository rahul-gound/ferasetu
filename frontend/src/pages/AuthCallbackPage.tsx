import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AuthShell from '../components/auth/AuthShell';
import SEO from '../components/SEO';

export default function AuthCallbackPage() {
  const { login, user, isLoading, profileError } = useAuth();
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    navigate('/dashboard', { replace: true });
  }, [user, isLoading, navigate]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await login();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      <SEO title={translate('auth.login.title')} noindex />
      <AuthShell
        title={translate('auth.login.title')}
        subtitle={
          isLoading
            ? translate('auth.loading.connect')
            : (profileError ?? translate('common.error'))
        }
      >
        {isLoading ? (
          <div className='flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6 text-center'>
            <span
              className='h-9 w-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent'
              role='status'
              aria-label={translate('auth.loading.connect')}
            />
            <p className='text-sm font-medium text-slate-300'>
              {translate('auth.loading.connect')}
            </p>
          </div>
        ) : (
          <button
            type='button'
            onClick={handleRetry}
            disabled={isRetrying}
            className='flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0'
          >
            {isRetrying
              ? translate('auth.loading.connect')
              : translate('auth.button.login')}
            <ArrowRight size={16} aria-hidden='true' />
          </button>
        )}
      </AuthShell>
    </>
  );
}

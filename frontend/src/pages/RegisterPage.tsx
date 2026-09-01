import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Globe, Package, ShoppingCart, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AuthShell from '../components/auth/AuthShell';
import SEO from '../components/SEO';

export default function RegisterPage() {
  const { register, login, user, isLoading } = useAuth();
  const { translate, getLocalizedLink } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = searchParams.get('plan');
  const title = selectedPlan === 'business'
    ? `${translate('auth.register.freeTitle')} · Business`
    : selectedPlan === 'pro'
      ? `${translate('auth.register.freeTitle')} · Pro`
      : translate('auth.register.freeTitle');

  const nextSteps = [
    {
      icon: <Package size={15} aria-hidden='true' />,
      label: translate('auth.next.product')
    },
    {
      icon: <Globe size={15} aria-hidden='true' />,
      label: translate('auth.next.storeUrl')
    },
    {
      icon: <ShoppingCart size={15} aria-hidden='true' />,
      label: translate('auth.next.orders')
    },
    {
      icon: <Sparkles size={15} aria-hidden='true' />,
      label: translate('auth.next.feraAI')
    }
  ];

  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
      await register();
    } catch {
      try {
        await login();
      } catch (loginError) {
        console.error('Register fallback failed:', loginError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  return (
    <>
      <SEO title={translate('auth.register.freeTitle')} noindex />
      <AuthShell title={title} subtitle={translate('auth.register.subtitle')}>
        <section
          aria-labelledby='register-next-steps'
          className='mb-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5'
        >
          <h2
            id='register-next-steps'
            className='mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500'
          >
            {translate('auth.register.whatHappens')}
          </h2>
          <ul className='space-y-3'>
            {nextSteps.map(step => (
              <li
                key={step.label}
                className='flex min-h-[36px] items-center gap-3 text-sm font-medium text-slate-300'
              >
                <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-300'>
                  {step.icon}
                </span>
                {step.label}
              </li>
            ))}
          </ul>
        </section>

        <div className='mb-6 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6 text-center'>
          <span
            className='h-9 w-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent'
            role='status'
            aria-label={translate('auth.loading.setup')}
          />
          <p className='text-sm font-medium text-slate-300'>
            {translate('auth.loading.setup')}
          </p>
        </div>

        <button
          type='button'
          onClick={handleRegister}
          disabled={isSubmitting}
          className='flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0'
        >
          {translate('auth.button.register')}
          <ArrowRight size={16} aria-hidden='true' />
        </button>

        <Link
          to={getLocalizedLink('/login')}
          className='mt-5 block rounded-xl py-2 text-center text-sm font-semibold text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
        >
          {translate('auth.login.title')}
        </Link>
      </AuthShell>
    </>
  );
}

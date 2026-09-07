import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMarket } from '../../contexts/MarketContext';
import LanguageSelector from '../LanguageSelector';
import MarketSelector from '../marketing/MarketSelector';

export default function PublicNavbar() {
  const { user, login, register, logout, isLoading } = useAuth();
  const { translate: t, getLocalizedLink } = useLanguage();
  const { market } = useMarket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryLinks = [
    {
      label: t('nav.howItWorks'),
      to: `${getLocalizedLink('/')}#how-it-works`
    },
    {
      label: 'FeraSetu AI',
      to: `${getLocalizedLink('/')}#ferasetu-ai`
    },
    {
      label: t('nav.features'),
      to: `${getLocalizedLink('/')}#features`
    },
    {
      label: t('nav.pricing'),
      to: getLocalizedLink('/pricing')
    }
  ];

  return (
    <>
      <nav
        aria-label={t('nav.primary')}
        className='sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70'
      >
        <div className='mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-6'>
          <Link
            to={getLocalizedLink('/')}
            className='group flex shrink-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
            aria-label='FeraSetu'
          >
            <img
              src='/logo-official.png'
              alt='FeraSetu'
              fetchPriority='high'
              className='h-13 sm:h-14 md:h-15 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]'
            />
          </Link>

          <div className='hidden items-center gap-7 lg:flex'>
            {primaryLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className='rounded-md text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4'
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className='flex items-center gap-3'>
            <div className='hidden items-center gap-2 md:flex'>
              <MarketSelector variant='light' />
              <LanguageSelector variant='light' />
            </div>

            {isLoading ? (
              <div className='hidden items-center gap-2 md:flex'>
                <div className='h-9 w-24 rounded-full bg-slate-100 animate-pulse' />
              </div>
            ) : user ? (
              <div className='flex items-center gap-2.5'>
                <Link
                  to='/dashboard'
                  className='inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
                >
                  <LayoutDashboard size={15} />
                  <span>{t('nav.dashboard') || 'Dashboard'}</span>
                  <ArrowRight size={14} aria-hidden='true' />
                </Link>
                <button
                  type='button'
                  onClick={() => logout()}
                  className='inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm'
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className='hidden items-center gap-3 md:flex'>
                <button
                  type='button'
                  onClick={() => login()}
                  className='cursor-pointer rounded-full px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
                >
                  {t('nav.signIn')}
                </button>
                <button
                  type='button'
                  onClick={() => register()}
                  className='inline-flex cursor-pointer items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
                >
                  {market === 'IN' ? t('nav.startFree') : 'Start Trial'}
                  <ArrowRight size={15} aria-hidden='true' />
                </button>
              </div>
            )}

            <button
              type='button'
              onClick={() => setMobileMenuOpen(true)}
              className='flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden'
              aria-label={t('nav.openMenu')}
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={20} aria-hidden='true' />
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className='fixed inset-0 z-[70] flex flex-col bg-white md:hidden'>
          <div className='flex h-20 items-center justify-between border-b border-slate-200 px-5'>
            <img src='/logo-official.png' alt='FeraSetu' className='h-12 w-auto object-contain' />
            <button
              type='button'
              onClick={() => setMobileMenuOpen(false)}
              className='flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
              aria-label={t('nav.closeMenu')}
            >
              <X size={20} aria-hidden='true' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto px-5 py-6'>
            <div className='flex flex-col gap-1'>
              {primaryLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className='rounded-2xl px-4 py-4 text-lg font-bold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className='mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6'>
              <div className='flex items-center gap-2'>
                <MarketSelector variant='light' />
                <div className='flex-1'>
                  <LanguageSelector variant='light' />
                </div>
              </div>
              {isLoading ? (
                <div className='h-12 w-full rounded-2xl bg-slate-100 animate-pulse' />
              ) : user ? (
                <>
                  <Link
                    to='/dashboard'
                    onClick={() => setMobileMenuOpen(false)}
                    className='flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700'
                  >
                    <LayoutDashboard size={18} />
                    <span>{t('nav.dashboard') || 'Dashboard'}</span>
                    <ArrowRight size={16} aria-hidden='true' />
                  </Link>
                  <button
                    type='button'
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className='flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors'
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={() => {
                      setMobileMenuOpen(false);
                      login();
                    }}
                    className='flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-2xl bg-slate-50 text-base font-bold text-slate-900 transition-colors hover:bg-slate-100'
                  >
                    {t('nav.signIn')}
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setMobileMenuOpen(false);
                      register();
                    }}
                    className='flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-2xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700'
                  >
                    {market === 'IN' ? t('nav.startFree') : 'Start 14-Day Trial'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

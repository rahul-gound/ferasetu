import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSelector from '../LanguageSelector';

export default function PublicNavbar() {
  const { user } = useAuth();
  const { translate: t, getLocalizedLink } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryLinks = [
    {
      label: t('nav.howItWorks'),
      to: `${getLocalizedLink('/')}#how-it-works`
    },
    {
      label: 'Fera AI',
      to: `${getLocalizedLink('/')}#fera-ai`
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
              className='h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]'
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
            <div className='hidden md:block'>
              <LanguageSelector variant='light' />
            </div>

            {user ? (
              <Link
                to='/dashboard'
                className='hidden items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:inline-flex'
              >
                {t('nav.dashboard')}
                <ArrowRight size={14} aria-hidden='true' />
              </Link>
            ) : (
              <div className='hidden items-center gap-3 md:flex'>
                <Link
                  to={getLocalizedLink('/login')}
                  className='rounded-full px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to={getLocalizedLink('/register')}
                  className='inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
                >
                  {t('nav.startFree')}
                  <ArrowRight size={15} aria-hidden='true' />
                </Link>
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
            <img src='/logo-official.png' alt='FeraSetu' className='h-8 w-auto object-contain' />
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
              <LanguageSelector variant='light' />
              {user ? (
                <Link
                  to='/dashboard'
                  onClick={() => setMobileMenuOpen(false)}
                  className='flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-slate-900 text-base font-bold text-white shadow-lg shadow-slate-900/10 transition-colors hover:bg-slate-800'
                >
                  {t('nav.dashboard')}
                  <ArrowRight size={16} aria-hidden='true' />
                </Link>
              ) : (
                <>
                  <Link
                    to={getLocalizedLink('/login')}
                    onClick={() => setMobileMenuOpen(false)}
                    className='flex min-h-[52px] items-center justify-center rounded-2xl bg-slate-50 text-base font-bold text-slate-900 transition-colors hover:bg-slate-100'
                  >
                    {t('nav.signIn')}
                  </Link>
                  <Link
                    to={getLocalizedLink('/register')}
                    onClick={() => setMobileMenuOpen(false)}
                    className='flex min-h-[52px] items-center justify-center rounded-2xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700'
                  >
                    {t('nav.startFree')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

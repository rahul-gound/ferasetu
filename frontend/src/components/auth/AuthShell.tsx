import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSelector from '../LanguageSelector';
import MarketSelector from '../marketing/MarketSelector';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  children
}: AuthShellProps) {
  const { translate, getLocalizedLink } = useLanguage();

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-12'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(129,140,248,0.18),transparent_42%)]'
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:52px_52px]'
      />

      <div className='relative z-10 flex w-full max-w-md flex-col'>
        <div className='mb-5 flex items-center justify-between gap-4'>
          <Link
            to={getLocalizedLink('/')}
            className='inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-300 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
          >
            <ArrowLeft size={15} aria-hidden='true' />
            {translate('auth.backToHome')}
          </Link>
          <div className='flex items-center gap-2'>
            <MarketSelector variant='dark' />
            <LanguageSelector variant='dark' />
          </div>
        </div>

        <main className='rounded-3xl border border-white/10 bg-slate-900/80 p-7 shadow-2xl shadow-slate-950/50 backdrop-blur-xl sm:p-9'>
          <Link
            to={getLocalizedLink('/')}
            className='mb-7 inline-block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            aria-label='FeraSetu'
          >
            <img
              src='/logo-official.png'
              alt='FeraSetu'
              className='h-12 sm:h-14 w-auto object-contain'
            />
          </Link>

          <h1 className='mb-3 text-[1.65rem] font-extrabold leading-tight tracking-tight text-white'>
            {title}
          </h1>
          <p className='mb-7 text-sm leading-relaxed text-slate-400'>
            {subtitle}
          </p>

          {children}
        </main>

        <p className='mt-6 flex flex-wrap items-center justify-center gap-2 text-center text-xs font-medium text-slate-500'>
          <ShieldCheck size={14} className='text-emerald-500' aria-hidden='true' />
          {translate('auth.trust')}
        </p>
      </div>
    </div>
  );
}

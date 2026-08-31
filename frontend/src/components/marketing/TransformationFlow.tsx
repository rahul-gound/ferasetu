import type { ReactNode } from 'react';
import { Package, Sparkles, Store } from 'lucide-react';
import { TRANSFORMATION_STEPS } from '../../content/strategy';

const ICONS: Record<string, ReactNode> = {
  shop: <Package size={18} aria-hidden='true' />,
  ferasetu: <Sparkles size={18} aria-hidden='true' />,
  'online-business': <Store size={18} aria-hidden='true' />,
};

export default function TransformationFlow() {
  return (
    <div className='grid gap-4 md:grid-cols-3' aria-label='From offline shop to online business'>
      {TRANSFORMATION_STEPS.map((step, index) => (
        <div key={step.id} className='relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <span className='absolute right-4 top-4 text-xs font-bold text-slate-300'>
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className='mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600'>
            {ICONS[step.id]}
          </div>
          <h3 className='text-base font-bold text-slate-900'>{step.title}</h3>
          <p className='mt-2 text-sm leading-relaxed text-slate-600'>{step.description}</p>
        </div>
      ))}
    </div>
  );
}

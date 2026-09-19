import type { ReactNode } from 'react';
import { Package, Sparkles, Store, ArrowRight } from 'lucide-react';
import { TRANSFORMATION_STEPS } from '../../content/strategy';

/**
 * TransformationFlow — Shows the transformation from offline shop to online business.
 * Psychology: Before/after framing, progress visualization.
 * Color progression: blue → blue → orange (ending with action/energy)
 */
const ICONS: Record<string, ReactNode> = {
  shop: <Package size={18} aria-hidden='true' />,
  ferasetu: <Sparkles size={18} aria-hidden='true' />,
  'online-business': <Store size={18} aria-hidden='true' />,
};

const STEP_STYLES = [
  { bg: 'bg-blue-50', icon: 'bg-blue-600 text-white', num: 'text-blue-200', border: 'border-blue-100' },
  { bg: 'bg-blue-50/60', icon: 'bg-blue-500 text-white', num: 'text-blue-200', border: 'border-blue-100' },
  { bg: 'bg-orange-50', icon: 'bg-orange-500 text-white', num: 'text-orange-200', border: 'border-orange-100' },
];

export default function TransformationFlow() {
  return (
    <div className='grid gap-4 md:grid-cols-3' aria-label='From offline shop to online business'>
      {TRANSFORMATION_STEPS.map((step, index) => {
        const style = STEP_STYLES[index] ?? STEP_STYLES[0];
        return (
          <div key={step.id} className={`relative rounded-2xl border ${style.border} ${style.bg} p-5 shadow-sm`}>
            <span className={`absolute right-4 top-4 text-xs font-bold ${style.num}`}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${style.icon}`}>
              {ICONS[step.id]}
            </div>
            <h3 className='text-base font-bold text-blue-950'>{step.title}</h3>
            <p className='mt-2 text-sm leading-relaxed text-slate-600'>{step.description}</p>

            {/* Arrow connector for visual flow — hidden on mobile */}
            {index < TRANSFORMATION_STEPS.length - 1 && (
              <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center">
                <ArrowRight size={16} className={index === 1 ? 'text-orange-400' : 'text-blue-300'} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

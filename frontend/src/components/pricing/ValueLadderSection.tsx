import { ArrowRight, Check } from 'lucide-react';
import { PLANS } from '../../config/plans';
import type { PlanDefinition, PlanId } from '../../config/plans';
import { PRICING_STAGES } from '../../content/strategy';

interface ValueLadderSectionProps {
  currentPlan: PlanId | null;
  isAuthenticated: boolean;
  onSelectPlan: (plan: PlanDefinition) => void;
}

export default function ValueLadderSection({
  currentPlan,
  isAuthenticated,
  onSelectPlan,
}: ValueLadderSectionProps) {
  return (
    <section
      id='value-ladder'
      aria-labelledby='value-ladder-title'
      className='mx-auto max-w-[1100px] px-6 pb-16'
    >
      <div className='mb-10 text-center'>
        <p className='mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700'>
          Value progression
        </p>
        <h2
          id='value-ladder-title'
          className='mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl'
        >
          Start where you are, grow when you need more
        </h2>
        <p className='mx-auto max-w-2xl text-lg leading-relaxed text-slate-600'>
          FeraSetu pricing follows your business stage, not an arbitrary feature pile.
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-3'>
        {PRICING_STAGES.map((stage, index) => {
          const plan = PLANS.find(item => item.id === stage.planId);
          if (!plan) return null;

          const isCurrentPlan = currentPlan === plan.id;
          const isFreePlan = plan.id === 'free';
          const isDisabled = isCurrentPlan || (isFreePlan && isAuthenticated);
          const priceLabel = plan.price.monthly === 0
            ? '₹0'
            : `₹${plan.price.monthly.toLocaleString('en-IN')}/mo`;

          return (
            <article
              key={plan.id}
              className={
                plan.highlighted
                  ? 'relative flex flex-col rounded-2xl border-2 border-blue-500 bg-white p-7 shadow-xl shadow-blue-500/10'
                  : 'relative flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm'
              }
            >
              {plan.highlighted && (
                <span className='absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md'>
                  Most Popular
                </span>
              )}

              <div className='mb-5 flex items-start justify-between gap-4'>
                <div>
                  <p className='mb-1 text-xs font-bold uppercase tracking-wider text-blue-600'>
                    Stage {index + 1}
                  </p>
                  <h3 className='text-2xl font-extrabold text-slate-900'>{stage.stage}</h3>
                  <p className='mt-1 text-sm font-semibold text-slate-600'>{plan.displayName}</p>
                </div>
                <div className='text-right'>
                  <p className='text-xl font-extrabold text-slate-900'>{priceLabel}</p>
                </div>
              </div>

              <p className='mb-5 text-base font-semibold leading-relaxed text-slate-800'>
                {stage.promise}
              </p>

              <ul className='mb-7 space-y-3'>
                {stage.proof.map(item => (
                  <li key={item} className='flex items-start gap-3 text-sm leading-relaxed text-slate-700'>
                    <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600'>
                      <Check size={12} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                type='button'
                disabled={isDisabled}
                onClick={() => onSelectPlan(plan)}
                className={
                  isDisabled
                    ? 'mt-auto w-full rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-500'
                    : 'mt-auto w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
                }
              >
                {isCurrentPlan
                  ? 'Current stage'
                  : isFreePlan
                    ? 'Start free'
                    : `Choose ${plan.displayName}`}
                {!isDisabled && <ArrowRight size={16} className='ml-2 inline' />}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

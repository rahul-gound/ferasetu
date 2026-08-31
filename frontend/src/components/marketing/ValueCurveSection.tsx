import { ArrowDown, Check, Minus, Sparkles, TrendingUp, X } from 'lucide-react';
import { BEFORE_AFTER, FOUR_ACTIONS, VALUE_CURVE_FACTORS } from '../../content/strategy';

const ACTION_ICONS = {
  Eliminate: <X size={16} aria-hidden='true' />,
  Reduce: <Minus size={16} aria-hidden='true' />,
  Raise: <TrendingUp size={16} aria-hidden='true' />,
  Create: <Sparkles size={16} aria-hidden='true' />,
} as const;

export default function ValueCurveSection() {
  return (
    <section
      id='value-curve'
      aria-labelledby='value-curve-title'
      className='border-t border-slate-200 bg-white py-20 md:py-24'
    >
      <div className='mx-auto max-w-[1200px] px-6'>
        <div className='mx-auto mb-14 max-w-2xl text-center'>
          <p className='mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700'>
            The FeraSetu value curve
          </p>
          <h2
            id='value-curve-title'
            className='mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl'
          >
            A simpler path from offline shop to online business
          </h2>
          <p className='text-lg leading-relaxed text-slate-600'>
            FeraSetu is not a smaller version of a traditional ecommerce platform. It is one workflow built around how Indian shopkeepers already work.
          </p>
        </div>

        <div className='mt-16 grid gap-6 lg:grid-cols-2'>
          {[BEFORE_AFTER.before, BEFORE_AFTER.after].map((side) => (
            <article
              key={side.title}
              className={
                side.title.includes('After')
                  ? 'rounded-2xl border border-blue-200 bg-blue-50/60 p-7'
                  : 'rounded-2xl border border-slate-200 bg-slate-50 p-7'
              }
            >
              <div className='mb-5 flex items-center justify-between gap-3'>
                <div>
                  <h3 className='text-lg font-bold text-slate-900'>{side.title}</h3>
                  <p className='text-sm text-slate-600'>{side.subtitle}</p>
                </div>
                <span
                  className={
                    side.title.includes('After')
                      ? 'flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white'
                      : 'flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500'
                  }
                  aria-hidden='true'
                >
                  {side.title.includes('After') ? <Check size={18} /> : <ArrowDown size={18} />}
                </span>
              </div>
              <ul className='space-y-3'>
                {side.items.map((item) => (
                  <li key={item} className='flex items-start gap-3 text-sm leading-relaxed text-slate-700'>
                    <span
                      className={
                        side.title.includes('After')
                          ? 'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600'
                          : 'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-300'
                      }
                      aria-hidden='true'
                    >
                      <Check size={11} className='text-white' />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className='mt-16 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]'>
          <div className='overflow-x-auto rounded-2xl border border-slate-200'>
            <table className='w-full border-collapse bg-white text-left text-sm'>
              <caption className='sr-only'>Qualitative value curve comparison</caption>
              <thead>
                <tr className='border-b border-slate-200 bg-slate-50'>
                  <th scope='col' className='px-5 py-4 font-bold text-slate-900'>
                    What matters to merchants
                  </th>
                  <th scope='col' className='px-5 py-4 font-bold text-slate-900'>
                    Traditional setup
                  </th>
                  <th scope='col' className='px-5 py-4 font-bold text-blue-700'>
                    FeraSetu
                  </th>
                </tr>
              </thead>
              <tbody>
                {VALUE_CURVE_FACTORS.map((row) => (
                  <tr key={row.factor} className='border-b border-slate-100 last:border-0'>
                    <th scope='row' className='px-5 py-4 font-semibold text-slate-900'>
                      {row.factor}
                    </th>
                    <td className='px-5 py-4 text-slate-600'>{row.traditional}</td>
                    <td className='px-5 py-4 font-semibold text-blue-700'>{row.ferasetu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='grid gap-4'>
            {FOUR_ACTIONS.map((item) => (
              <article key={item.action} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='mb-2 flex items-center gap-3'>
                  <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600'>
                    {ACTION_ICONS[item.action]}
                  </span>
                  <h3 className='text-sm font-bold uppercase tracking-wide text-slate-900'>{item.action}</h3>
                </div>
                <p className='text-sm leading-relaxed text-slate-600'>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

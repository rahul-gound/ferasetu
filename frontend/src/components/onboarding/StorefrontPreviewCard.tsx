import { Globe, Sparkles, Store } from 'lucide-react';

interface StorefrontPreviewCardProps {
  businessName: string;
  businessType: string;
  mainProducts: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    || 'your-shop';
}

export default function StorefrontPreviewCard({
  businessName,
  businessType,
  mainProducts,
}: StorefrontPreviewCardProps) {
  const productChips = mainProducts
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <article className='rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md'>
      <header className='mb-5 flex items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white'>
            <Store size={20} />
          </span>
          <div>
            <h3 className='text-base font-bold text-white'>
              {businessName || 'Your Shop'}
            </h3>
            <p className='text-xs font-semibold text-blue-200'>
              {businessType || 'Business preview'}
            </p>
          </div>
        </div>
        <span className='rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-300'>
          Preview
        </span>
      </header>

      <div className='mb-5 flex items-center gap-2 rounded-xl bg-slate-900/60 px-4 py-3 text-xs font-semibold text-blue-200'>
        <Globe size={14} />
        {slugify(businessName)}.ferasetu.com
      </div>

      <div className='mb-5'>
        <p className='mb-2 text-xs font-bold uppercase tracking-wider text-blue-200'>
          Products you mentioned
        </p>
        <div className='flex flex-wrap gap-2'>
          {productChips.length > 0 ? (
            productChips.map(product => (
              <span
                key={product}
                className='rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white'
              >
                {product}
              </span>
            ))
          ) : (
            <span className='rounded-full border border-dashed border-white/30 px-3 py-1 text-xs font-semibold text-white/70'>
              Add a few products to see them here
            </span>
          )}
        </div>
      </div>

      <div className='flex items-start gap-3 rounded-xl bg-white/10 p-4 text-xs leading-relaxed text-white'>
        <Sparkles size={16} className='mt-0.5 shrink-0 text-blue-200' />
        <p>
          This preview updates as you answer. Your real storefront is created after setup, using the exact details you provide.
        </p>
      </div>
    </article>
  );
}

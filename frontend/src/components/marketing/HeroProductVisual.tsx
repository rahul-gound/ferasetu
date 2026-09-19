import { Globe, MessageSquare, Sparkles, Store } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * HeroProductVisual — Dashboard mockup shown in the hero section.
 *
 * Psychology:
 * - Demonstration: Shows the actual product in action (specificity builds trust)
 * - Floating cards show key value props (orders, AI alerts, commission saved)
 * - Warm border and professional shadow convey quality
 */
interface HeroProductVisualProps {
  shopName?: string;
  storeSlug?: string;
  market?: string;
  currencySymbol?: string;
}

export default function HeroProductVisual({
  shopName,
  storeSlug,
  market = 'IN',
  currencySymbol = '₹',
}: HeroProductVisualProps) {
  const { translate } = useLanguage();

  const effectiveShopName = shopName?.trim() || (market === 'IN' ? 'Sharma Kirana & General Store' : 'Apex Artisan Roasters');
  const effectiveSlug = storeSlug?.trim() || (market === 'IN' ? 'sharmakirana' : 'apexroasters');
  const displayUrl = `${effectiveSlug}.ferasetu.com`;

  const previewCards = [
    {
      icon: <Store size={17} aria-hidden='true' />,
      title: translate('hero.visual.storefront') || 'Storefront Link',
      detail: displayUrl,
      position: 'left-5 top-5',
      iconBg: 'bg-blue-100 text-blue-700',
    },
    {
      icon: <MessageSquare size={17} aria-hidden='true' />,
      title: translate('hero.visual.newOrder') || 'New Order #1042',
      detail: market === 'IN' ? '4 items · Direct UPI (₹1,240)' : `3 items · Direct Card (${currencySymbol}84)`,
      position: 'right-5 top-24',
      iconBg: 'bg-green-100 text-green-700',
    },
    {
      icon: <Sparkles size={17} aria-hidden='true' />,
      title: 'FeraSetu AI Watchdog',
      detail: market === 'IN' ? 'Diwali promo ready · 2 units low' : 'Weekend promo ready · 3 units low',
      position: 'bottom-5 right-5',
      iconBg: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <div className='mx-auto w-full max-w-5xl'>
      <article className='overflow-hidden rounded-[28px] border-2 border-blue-100 bg-white shadow-2xl shadow-blue-950/10'>
        {/* Browser chrome header */}
        <header className='flex items-center justify-between gap-4 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-orange-50/30 px-5 py-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25'>
              <Globe size={17} aria-hidden='true' />
            </span>
            <div className='min-w-0 text-left'>
              <p className='truncate text-sm font-bold text-blue-950'>
                {effectiveShopName}
              </p>
              <p className='truncate text-xs font-semibold text-blue-700 font-mono'>
                {displayUrl}
              </p>
            </div>
          </div>
          <span className='inline-flex shrink-0 items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700'>
            <span className='hero-pulse h-1.5 w-1.5 rounded-full bg-green-500' />
            {translate('hero.visual.example') || 'Live Store Preview'}
          </span>
        </header>

        <div className='relative bg-slate-100'>
          <picture>
            <source srcSet='/hero/dashboard.webp' type='image/webp' />
            <img
              src='/hero/dashboard.png'
              alt='FeraSetu merchant dashboard showing orders, revenue, and product management'
              width={1200}
              height={675}
              loading='eager'
              fetchPriority='high'
              className='h-auto w-full object-cover'
            />
          </picture>

          {previewCards.map((card, index) => (
            <div
              key={card.title}
              className={`hero-card-enter hero-float hero-card-delay-${index + 1} absolute hidden max-w-[240px] rounded-2xl border border-white bg-white/95 p-4 shadow-xl shadow-blue-950/10 backdrop-blur-md lg:block ${card.position}`}
            >
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${card.iconBg}`}>
                {card.icon}
              </div>
              <p className='text-xs font-bold text-blue-950'>{card.title}</p>
              <p className='mt-1 text-xs font-medium text-slate-600'>{card.detail}</p>
            </div>
          ))}
        </div>

        <div className='grid gap-4 border-t border-blue-50 bg-gradient-to-r from-white to-blue-50/30 p-5 sm:grid-cols-3 lg:hidden'>
          {previewCards.map(card => (
            <div
              key={card.title}
              className='rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-left'
            >
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${card.iconBg}`}>
                {card.icon}
              </div>
              <p className='text-xs font-bold text-blue-950'>{card.title}</p>
              <p className='mt-1 text-xs font-medium text-slate-600'>{card.detail}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

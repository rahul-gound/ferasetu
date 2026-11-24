import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * 1. FeraSetu Official Favicon / Logo Badge
 */
export function FeraSetuLogoBadge({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-1 shrink-0 shadow-xs overflow-hidden ${className}`}
      title="FeraSetu 0% Commission Sovereign Commerce"
    >
      <img
        src="/favicon.png"
        alt="FeraSetu"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
          if (target.parentElement) {
            target.parentElement.innerHTML = `
              <svg width="${size * 0.7}" height="${size * 0.7}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 22C4 15.3726 9.37258 10 16 10C22.6274 10 28 15.3726 28 22" stroke="#0052FF" stroke-width="3.5" stroke-linecap="round"/>
                <circle cx="16" cy="19" r="3" fill="#0052FF"/>
              </svg>
            `;
          }
        }}
      />
    </div>
  );
}

/**
 * 2. Official Shopify WebP Logo Badge
 */
export function ShopifyLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-xs p-1 overflow-hidden ${className}`}
      title="Shopify"
    >
      <img
        src="/images/compare/shopify.webp"
        alt="Shopify"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}

/**
 * 3. Official WooCommerce WebP Logo Badge
 */
export function WooCommerceLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-xs p-1 overflow-hidden ${className}`}
      title="WooCommerce"
    >
      <img
        src="/images/compare/woocommerce.webp"
        alt="WooCommerce"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}

/**
 * 4. Official BigCommerce WebP Logo Badge
 */
export function BigCommerceLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-xs p-1 overflow-hidden ${className}`}
      title="BigCommerce"
    >
      <img
        src="/images/compare/bigcommerce.webp"
        alt="BigCommerce"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}

/**
 * 5. Official Dukaan WebP Logo Badge
 */
export function DukaanLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-[#146EB4] border border-blue-700/40 flex items-center justify-center shrink-0 shadow-xs p-1 overflow-hidden ${className}`}
      title="Dukaan"
    >
      <img
        src="/images/compare/dukaan.webp"
        alt="Dukaan"
        width={size}
        height={size}
        className="w-full h-full object-contain rounded-md"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}

/**
 * 6. Official Wix WebP Logo Badge
 */
export function WixLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-xs p-1 overflow-hidden ${className}`}
      title="Wix"
    >
      <img
        src="/images/compare/wix.webp"
        alt="Wix"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}

/**
 * 7. Official Squarespace WebP Logo Badge
 */
export function SquarespaceLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-xs p-1 overflow-hidden ${className}`}
      title="Squarespace"
    >
      <img
        src="/images/compare/squarespace.webp"
        alt="Squarespace"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}

/**
 * 8. Official Wix & Squarespace Dual Logo
 */
export function WixSquarespaceLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}
      title="Wix & Squarespace"
    >
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-xs p-1 overflow-hidden"
      >
        <img
          src="/images/compare/wix.webp"
          alt="Wix"
          width={size}
          height={size}
          className="w-full h-full object-contain"
        />
      </div>
      <span className="text-xs font-bold text-slate-400">&amp;</span>
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-xs p-1 overflow-hidden"
      >
        <img
          src="/images/compare/squarespace.webp"
          alt="Squarespace"
          width={size}
          height={size}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}

/**
 * 9. Official Traditional Marketplaces (Amazon / Flipkart / Open Market) Logo
 */
export function MarketplaceLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-[#232F3E] flex items-center justify-center shrink-0 shadow-xs p-1.5 overflow-hidden border border-slate-700/60 ${className}`}
      title="Traditional Marketplaces (Amazon, Flipkart)"
    >
      <svg
        width={size * 0.75}
        height={size * 0.75}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 14L14 8H34L38 14M10 14H38M10 14V38C10 40.2 11.8 42 14 42H34C36.2 42 38 40.2 38 38V14"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 28C20 33 28 33 32 28"
          stroke="#FF9900"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path d="M30 26L34 28L31 31" fill="#FF9900" />
      </svg>
    </div>
  );
}

/**
 * Master Competitor Logo Mapper
 */
export function getCompetitorLogo(slug: string, size = 32, className = ''): React.ReactNode {
  switch (slug) {
    case 'shopify-alternative':
      return <ShopifyLogo size={size} className={className} />;
    case 'woocommerce-alternative':
      return <WooCommerceLogo size={size} className={className} />;
    case 'bigcommerce-alternative':
      return <BigCommerceLogo size={size} className={className} />;
    case 'dukaan-alternative':
      return <DukaanLogo size={size} className={className} />;
    case 'wix-squarespace-alternative':
      return <WixSquarespaceLogo size={size} className={className} />;
    case 'marketplace-alternative':
      return <MarketplaceLogo size={size} className={className} />;
    default:
      return <ShopifyLogo size={size} className={className} />;
  }
}

/**
 * Visual Matchup VS Header:
 * Displays FeraSetu Favicon Badge vs Competitor Vector/WebP Logo Badge
 */
export function ComparisonVersusBadge({
  slug,
  competitorName,
  size = 40,
  showLabels = false,
  className = '',
}: {
  slug: string;
  competitorName: string;
  size?: number;
  showLabels?: boolean;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* FeraSetu Side */}
      <div className="flex items-center gap-1.5">
        <FeraSetuLogoBadge size={size} />
        {showLabels && (
          <span className="font-extrabold text-sm text-slate-900 tracking-tight">
            FeraSetu
          </span>
        )}
      </div>

      {/* VS Pill */}
      <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
        vs
      </span>

      {/* Competitor Side */}
      <div className="flex items-center gap-1.5">
        {getCompetitorLogo(slug, size)}
        {showLabels && (
          <span className="font-extrabold text-sm text-slate-900 tracking-tight">
            {competitorName}
          </span>
        )}
      </div>
    </div>
  );
}

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
      className={`rounded-xl bg-[#0052FF] flex items-center justify-center p-1 shrink-0 shadow-xs border border-blue-600/30 overflow-hidden ${className}`}
      title="FeraSetu 0% Commission Sovereign Commerce"
    >
      <img
        src="/favicon.png"
        alt="FeraSetu"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        onError={(e) => {
          // Graceful fallback to vector bridge if favicon image fails
          const target = e.currentTarget;
          target.style.display = 'none';
          if (target.parentElement) {
            target.parentElement.innerHTML = `
              <svg width="${size * 0.7}" height="${size * 0.7}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 22C4 15.3726 9.37258 10 16 10C22.6274 10 28 15.3726 28 22" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
                <circle cx="16" cy="19" r="3" fill="#FFFFFF"/>
              </svg>
            `;
          }
        }}
      />
    </div>
  );
}

/**
 * 2. Official Shopify Vector Logo
 */
export function ShopifyLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-[#96BF48] flex items-center justify-center shrink-0 shadow-xs p-1.5 overflow-hidden ${className}`}
      title="Shopify"
    >
      <svg
        width={size * 0.75}
        height={size * 0.75}
        viewBox="0 0 109 124"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Leaf */}
        <path
          d="M72.2 14.1C64.6 14.8 56.6 20.8 53.7 27.6C51.2 24.3 47.9 22.1 43.8 21.6C34.3 20.4 28.5 28.7 27.4 36.3C27.1 38.3 27.2 40.2 27.7 42.1C27.8 42.1 27.9 42.2 28.1 42.2C31.5 43.1 35.8 44.5 40.5 46.1C47.2 48.4 54.3 50.8 57.6 52.3C60.3 53.5 61.9 54.7 61.9 57.2C61.9 61.1 57.1 63.8 52.3 63.8C46.8 63.8 42.4 60.5 40.1 55.4C39.6 54.4 38.4 53.9 37.3 54.3L22.9 59.8C22.1 60.1 21.6 61 21.8 61.9C25.4 75.3 36.8 84.8 51.5 84.8C68.9 84.8 83.2 72.8 83.2 55.4C83.2 38.2 68.3 32.7 58.7 29.3C52.9 27.3 47.3 25.3 47.3 22.8C47.3 20.2 50.7 18.3 54.7 18.3C59.6 18.3 64.7 20.8 67.2 25.3C67.7 26.2 68.8 26.6 69.8 26.3L83.7 21.5C84.5 21.2 85 20.4 84.8 19.6C82.1 16.2 77.5 13.6 72.2 14.1Z"
          fill="#FFFFFF"
        />
        <path
          d="M98.8 24.8C98.4 24.4 97.8 24.2 97.2 24.4L87.5 26.9C83.6 21 78.4 17.1 72.2 16.5C72 16.5 71.9 16.5 71.7 16.5C65.5 16.8 58.5 21.8 55.1 28C53.7 25.8 51.6 24.1 48.9 23.4C48 23.2 47.1 23.1 46.2 23.1C37.8 23.1 32 29.5 30.2 36.4C29.8 38 29.8 39.5 30.1 41L12.4 46.2C11.5 46.5 10.9 47.3 10.9 48.3L0 120.5C0 121.2 0.4 121.9 1.1 122.2C1.4 122.3 1.7 122.4 2 122.4C2.5 122.4 3 122.2 3.4 121.8L37.7 87.5C38.3 86.9 38.6 86 38.4 85.1L30.9 45.4L44.1 49.9C49.9 51.9 56.4 54.2 59.5 55.6C62.8 57.1 65 59.2 65 63C65 68.9 59.2 73.1 53.4 73.1C47.2 73.1 42.1 69.4 39.5 63.8C38.9 62.6 37.6 62.1 36.4 62.5L24.8 66.9C23.9 67.2 23.3 68.2 23.5 69.2C27.6 83.9 40 94.1 55.8 94.1C74.6 94.1 90 81.3 90 62.5C90 44 74 38.1 63.8 34.5C57.4 32.3 51.4 30.1 51.4 27.4C51.4 24.6 55.1 22.5 59.4 22.5C64.6 22.5 70.1 25.3 72.8 30.1C73.4 31.1 74.6 31.5 75.7 31.1L89.6 26.3C90.1 26.1 90.6 25.7 90.8 25.1L98.8 24.8Z"
          fill="#5E8E3E"
          opacity="0.2"
        />
        <path
          d="M87.9 28.5L78.6 31.7C74.9 25 68.4 20.8 61.1 20.8C54.4 20.8 48.6 24.2 46.1 29.5C41.2 31.2 36.2 33 32.7 34.3L15.3 39.4L4.4 116.8L106.1 116.8L98.5 29.2C98.4 28.4 97.7 27.8 96.9 27.9L87.9 28.5Z"
          fill="#FFFFFF"
        />
        {/* S symbol */}
        <path
          d="M60.4 49.3C52.7 46.7 45.4 44.1 45.4 39.9C45.4 35.8 49.8 32.8 55.1 32.8C61.3 32.8 67.8 36.4 71 42.6L85.2 37.6C80 27.3 70 21.2 56 21.2C38.6 21.2 28.2 31.9 28.2 42.5C28.2 56.4 44.2 61.9 54.4 65.6C61.6 68.2 68.4 70.7 68.4 75.6C68.4 80.5 62.8 84.4 55.5 84.4C47.2 84.4 40.5 79.5 37.1 71.9L22.9 77.3C27.8 89.9 39.8 96.5 54.4 96.5C73.3 96.5 85.6 86 85.6 73.1C85.7 57.8 70 52.6 60.4 49.3Z"
          fill="#96BF48"
        />
      </svg>
    </div>
  );
}

/**
 * 3. Official WooCommerce Vector Logo
 */
export function WooCommerceLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-[#7F54B3] flex items-center justify-center shrink-0 shadow-xs p-1 overflow-hidden ${className}`}
      title="WooCommerce"
    >
      <svg
        width={size * 0.75}
        height={size * 0.75}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Woo Chat Bubble / W shape */}
        <rect width="100" height="100" rx="22" fill="#7F54B3" />
        <path
          d="M18 30C18 24.4772 22.4772 20 28 20H72C77.5228 20 82 24.4772 82 30V60C82 65.5228 77.5228 70 72 70H38L24 82V70H28C22.4772 70 18 65.5228 18 60V30Z"
          fill="#FFFFFF"
        />
        {/* woo text cut into the white bubble */}
        <text
          x="50"
          y="54"
          fill="#7F54B3"
          fontSize="24"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          letterSpacing="-1.5"
        >
          woo
        </text>
      </svg>
    </div>
  );
}

/**
 * 4. Official BigCommerce Vector Logo
 */
export function BigCommerceLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-[#121118] flex items-center justify-center shrink-0 shadow-xs p-1.5 overflow-hidden border border-slate-700/40 ${className}`}
      title="BigCommerce"
    >
      <svg
        width={size * 0.75}
        height={size * 0.75}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* BigCommerce stacked dynamic B lines */}
        <path
          d="M12 12H24C28.4 12 32 15.6 32 20C32 22.8 30.5 25.3 28.2 26.6C31.5 28.1 34 31.6 34 35.5C34 40.2 30.2 44 25.5 44H12V12Z"
          fill="#FFFFFF"
        />
        <circle cx="21" cy="20" r="3.5" fill="#121118" />
        <circle cx="22" cy="35" r="4" fill="#121118" />
      </svg>
    </div>
  );
}

/**
 * 5. Official Dukaan Vector Logo
 */
export function DukaanLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-[#146EB4] flex items-center justify-center shrink-0 shadow-xs p-1.5 overflow-hidden ${className}`}
      title="Dukaan"
    >
      <svg
        width={size * 0.75}
        height={size * 0.75}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dukaan Shopping Bag / Store outline */}
        <rect x="8" y="16" width="32" height="26" rx="6" fill="#FFFFFF" />
        {/* Handle */}
        <path
          d="M17 18V13C17 9.13401 20.134 6 24 6C27.866 6 31 9.13401 31 13V18"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* D cut */}
        <path
          d="M20 23H24C27.3137 23 30 25.6863 30 29C30 32.3137 27.3137 35 24 35H20V23Z"
          fill="#146EB4"
        />
      </svg>
    </div>
  );
}

/**
 * 6. Official Wix & Squarespace Dual Logo
 */
export function WixSquarespaceLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size * 1.6, height: size }}
      className={`rounded-xl bg-slate-950 flex items-center justify-center gap-1 shrink-0 shadow-xs px-2 py-1 overflow-hidden border border-slate-800 ${className}`}
      title="Wix & Squarespace"
    >
      {/* Wix bold mark */}
      <span className="text-[11px] font-black tracking-tighter text-white font-mono">
        WIX
      </span>
      <span className="text-[10px] text-slate-500 font-bold">&bull;</span>
      {/* Squarespace S geometric link */}
      <svg
        width={size * 0.45}
        height={size * 0.45}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9.5 7L14.5 12L12 14.5L7 9.5L9.5 7Z"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 17L9.5 12L12 9.5L17 14.5L14.5 17Z"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * 7. Official Traditional Marketplaces (Amazon / Flipkart / Open Market) Logo
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
        {/* Marketplace storefront + cart */}
        <path
          d="M10 14L14 8H34L38 14M10 14H38M10 14V38C10 40.2 11.8 42 14 42H34C36.2 42 38 40.2 38 38V14"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Amazon iconic gold smile / arrow */}
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
 * Displays FeraSetu Favicon Badge vs Competitor Vector Logo Badge
 */
export function ComparisonVersusBadge({
  slug,
  competitorName,
  size = 36,
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

import type { SectionConfig } from '../../../types/template';

interface HeroSectionProps {
  config: SectionConfig;
  shopName: string;
}

export default function HeroSection({ config, shopName }: HeroSectionProps) {
  const bgColor = (config.bgColor as string) || '#FF6B35';
  const headline = (config.headline as string) || `Welcome to ${shopName}`;
  const subheadline = config.subheadline as string | undefined;
  const ctaText = (config.ctaText as string) || 'Shop Now';
  const ctaHref = (config.ctaHref as string) || '#products';

  return (
    <>
      <style>{`
        .fera-hero-inner {
          display: flex; align-items: center; justify-content: space-between;
          max-width: 1100px; margin: 0 auto; gap: 48px;
        }
        .fera-hero-content { flex: 1; }
        .fera-hero-decor {
          width: 200px; height: 200px; border-radius: 50%;
          background: rgba(255,255,255,0.15); display: flex;
          align-items: center; justify-content: center; font-size: 80px;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .fera-hero-inner { flex-direction: column; text-align: center; gap: 24px; }
          .fera-hero-decor { width: 120px; height: 120px; font-size: 48px; }
        }
      `}</style>
      <section style={{
        background: bgColor, padding: '80px 24px', color: '#fff', minHeight: '400px',
        display: 'flex', alignItems: 'center',
      }}>
        <div className="fera-hero-inner">
          <div className="fera-hero-content">
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900,
              lineHeight: 1.1, marginBottom: '16px', color: '#fff',
            }}>
              {headline}
            </h1>
            {subheadline && (
              <p style={{
                fontSize: '18px', opacity: 0.9, marginBottom: '32px',
                lineHeight: 1.6, maxWidth: '500px',
              }}>
                {subheadline}
              </p>
            )}
            <a
              href={ctaHref}
              style={{
                display: 'inline-block', background: '#fff',
                color: bgColor, padding: '14px 32px',
                borderRadius: '30px', textDecoration: 'none',
                fontWeight: 700, fontSize: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                transition: 'transform 0.15s',
              }}
            >
              {ctaText} →
            </a>
          </div>
          <div className="fera-hero-decor">🛒</div>
        </div>
      </section>
    </>
  );
}

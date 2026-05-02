import type { SectionConfig } from '../../../types/template';

interface HeroSectionProps {
  config: SectionConfig;
  shopName: string;
}

export default function HeroSection({ config, shopName }: HeroSectionProps) {
  const bgColor = (config.bgColor as string) || '#FF6B35';
  const headline = (config.headline as string) || `Welcome to ${shopName}`;
  const subheadline = (config.subheadline as string) || 'Your neighborhood shop, now online with quality and trust.';
  const ctaText = (config.ctaText as string) || 'Shop Now';
  const ctaHref = (config.ctaHref as string) || '#products';
  const accentColor = (config.accentColor as string) || '#004E89';
  const imageUrl = (config.imageUrl as string) || '';

  return (
    <>
      <style>{`
        .fera-hero-inner {
          display: flex; align-items: center; justify-content: space-between;
          max-width: 1200px; margin: 0 auto; gap: 64px;
          position: relative; z-index: 10;
        }
        .fera-hero-content { flex: 1.2; }
        .fera-hero-media {
          flex: 1; display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .fera-hero-image-wrap {
          width: 100%; aspect-ratio: 1/1; max-width: 480px;
          background: rgba(255,255,255,0.1); border-radius: 40px;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
          box-shadow: 20px 20px 60px rgba(0,0,0,0.15);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .fera-hero-image-wrap span { font-size: 160px; filter: drop-shadow(0 10px 30px rgba(0,0,0,0.2)); }
        .fera-hero-blob {
          position: absolute; top: -10%; right: -10%; width: 120%; height: 120%;
          background: radial-gradient(circle, ${accentColor} 0%, transparent 70%);
          opacity: 0.3; filter: blur(40px); z-index: -1;
        }
        .fera-cta-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: #fff; color: ${bgColor}; padding: 18px 40px;
          border-radius: 50px; text-decoration: none;
          fontWeight: 800; fontSize: 18px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .fera-cta-btn:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 15px 40px rgba(0,0,0,0.3); }
        
        @media (max-width: 968px) {
          .fera-hero-inner { flex-direction: column-reverse; text-align: center; gap: 40px; }
          .fera-hero-content { display: flex; flexDirection: column; alignItems: center; }
        }
      `}</style>
      <section style={{
        background: `linear-gradient(135deg, ${bgColor} 0%, ${accentColor} 100%)`,
        padding: 'clamp(60px, 10vw, 120px) 24px', color: '#fff', minHeight: '600px',
        display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div className="fera-hero-blob" />
        <div className="fera-hero-inner">
          <div className="fera-hero-content">
            <div style={{ display: 'inline-block', padding: '8px 18px', background: 'rgba(255,255,255,0.15)', borderRadius: '24px', fontSize: 'clamp(12px, 2vw, 14px)', fontWeight: 700, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1.5px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              🏪 Serving Your Neighborhood
            </div>
            <h1 style={{
              fontSize: 'clamp(24px, 5vw, 64px)', fontWeight: 900,
              lineHeight: 1.05, marginBottom: '24px', color: '#fff',
              textShadow: '0 2px 10px rgba(0,0,0,0.1)',
              letterSpacing: '-1px',
            }}>
              {headline}
            </h1>
            <p style={{
              fontSize: 'clamp(16px, 2.5vw, 22px)', opacity: 0.95, marginBottom: '40px',
              lineHeight: 1.6, maxWidth: '600px',
              fontWeight: 500,
            }}>
              {subheadline}
            </p>
            <a href={ctaHref} className="fera-cta-btn">
              {ctaText} 
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>
          <div className="fera-hero-media">
             <div className="fera-hero-image-wrap">
               {imageUrl ? (
                 <img src={imageUrl} alt={shopName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <span role="img" aria-label="shop-emoji">🛒</span>
               )}
             </div>
          </div>
        </div>
      </section>
    </>
  );
}

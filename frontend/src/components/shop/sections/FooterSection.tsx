import type { SectionConfig } from '../../../types/template';

interface FooterSectionProps {
  config: SectionConfig;
}

export default function FooterSection({ config }: FooterSectionProps) {
  const primaryColor = (config.primaryColor as string) || '#0f172a';
  const shopName = (config.shopName as string) || 'My Store';
  const tagline = (config.tagline as string) || 'Your trusted neighborhood shop, serving you with quality and trust since 2024.';
  const social = (config.social as Record<string, string>) || {};

  return (
    <footer style={{
      background: primaryColor, padding: 'clamp(60px, 10vw, 100px) 24px 40px',
      color: '#fff', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
      }} />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '64px', marginBottom: '80px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '42px', height: '42px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px' }}>🏪</div>
              <h3 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px' }}>{shopName}</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.8, maxWidth: '320px' }}>
              {tagline}
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '28px', color: '#fff', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Quick Links
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {['Home', 'Products', 'Categories', 'Contact Us'].map(link => (
                <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '15px', fontWeight: 600, transition: 'color 0.2s' }}>
                  {link}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '28px', color: '#fff', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Connect With Us
            </h4>
            <div style={{ display: 'flex', gap: '16px' }}>
              {social.whatsapp !== undefined && (
                <a href={social.whatsapp || '#'} target="_blank" rel="noopener noreferrer" style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25D366' }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              )}
              {social.instagram !== undefined && (
                <a href={social.instagram || '#'} target="_blank" rel="noopener noreferrer" style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#E1306C' }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              )}
              {social.facebook !== undefined && (
                <a href={social.facebook || '#'} target="_blank" rel="noopener noreferrer" style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#1877F2' }}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: '40px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
            <span>© {new Date().getFullYear()} {shopName}</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>All rights reserved.</span>
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            Powered by <span style={{ color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>FeraSetu <span style={{ fontSize: '16px' }}>✨</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}

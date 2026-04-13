import type { SectionConfig } from '../../../types/template';

interface FooterSectionProps {
  config: SectionConfig;
}

export default function FooterSection({ config }: FooterSectionProps) {
  const primaryColor = (config.primaryColor as string) || '#1E293B';
  const shopName = (config.shopName as string) || 'My Store';
  const tagline = config.tagline as string | undefined;
  const social = (config.social as Record<string, string>) || {};

  return (
    <footer style={{
      background: primaryColor, padding: '48px 24px 24px',
      color: '#fff',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px', marginBottom: '40px',
        }}>
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>{shopName}</h3>
            {tagline && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.6 }}>{tagline}</p>
            )}
          </div>

          {Object.keys(social).length > 0 && (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Connect
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {social.whatsapp && (
                  <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" style={{
                    color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
                    fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
                  }}>💬 WhatsApp</a>
                )}
                {social.instagram && (
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer" style={{
                    color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
                    fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
                  }}>📸 Instagram</a>
                )}
                {social.facebook && (
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer" style={{
                    color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
                    fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
                  }}>👥 Facebook</a>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.15)',
          paddingTop: '20px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '8px',
        }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            © {new Date().getFullYear()} {shopName}. All rights reserved.
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            Powered by <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Fera Shopkeeper AI</strong> ✨
          </span>
        </div>
      </div>
    </footer>
  );
}

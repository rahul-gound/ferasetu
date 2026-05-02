import type { SectionConfig } from '../../../types/template';

interface ContactSectionProps {
  config: SectionConfig;
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'flex-start', gap: '14px',
    }}>
      <span style={{ fontSize: '28px', lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: 500, lineHeight: 1.5 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default function ContactSection({ config }: ContactSectionProps) {
  const title = (config.title as string) || 'Find Us';
  const address = config.address as string | undefined;
  const phone = config.phone as string | undefined;
  const email = config.email as string | undefined;
  const hours = config.hours as string | undefined;

  const waNumber = phone ? phone.replace(/\D/g, '') : '';

  return (
    <section style={{ background: '#F8FAFC', padding: 'clamp(40px, 8vw, 80px) 24px' }}>
      <h2 style={{
        textAlign: 'center', fontSize: '32px', fontWeight: 800,
        color: '#1E293B', marginBottom: '40px',
      }}>
        {title}
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px', maxWidth: '900px', margin: '0 auto',
      }}>
        {address && <InfoCard icon="📍" label="Address" value={address} />}
        {phone && <InfoCard icon="📞" label="Phone" value={phone} />}
        {email && <InfoCard icon="📧" label="Email" value={email} />}
        {hours && <InfoCard icon="🕐" label="Hours" value={hours} />}
      </div>
      {phone && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a
            href={`https://wa.me/91${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              background: '#25D366', color: '#fff',
              padding: '14px 28px', borderRadius: '30px',
              textDecoration: 'none', fontWeight: 700, fontSize: '15px',
              boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
            }}
          >
            <span style={{ fontSize: '20px' }}>💬</span> Chat on WhatsApp
          </a>
        </div>
      )}
    </section>
  );
}

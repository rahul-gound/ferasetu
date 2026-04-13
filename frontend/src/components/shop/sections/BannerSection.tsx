import type { SectionConfig } from '../../../types/template';

interface BannerSectionProps {
  config: SectionConfig;
}

export default function BannerSection({ config }: BannerSectionProps) {
  const bgColor = (config.bgColor as string) || '#F59E0B';
  const textColor = (config.textColor as string) || '#fff';
  const text = (config.text as string) || '🎉 Special offers available!';

  return (
    <>
      <style>{`
        @keyframes fera-ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .fera-banner-track {
          display: inline-block;
          animation: fera-ticker 18s linear infinite;
          white-space: nowrap;
          padding-right: 60px;
        }
      `}</style>
      <div style={{
        background: bgColor, height: '44px',
        display: 'flex', alignItems: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        <span className="fera-banner-track" style={{
          color: textColor, fontWeight: 600, fontSize: '14px',
        }}>
          {text}
          &nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;
          {text}
          &nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;
          {text}
        </span>
      </div>
    </>
  );
}

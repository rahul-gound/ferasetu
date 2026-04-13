import { useState } from 'react';
import type { SectionConfig } from '../../../types/template';

interface NavbarSectionProps {
  config: SectionConfig;
  shopName: string;
}

export default function NavbarSection({ config, shopName }: NavbarSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const bgColor = (config.primaryColor as string) || '#FF6B35';
  const accentColor = (config.accentColor as string) || '#004E89';
  const displayName = (config.shopName as string) || shopName;
  const links = (config.links as Array<{ label: string; href: string }>) || [];

  return (
    <>
      <style>{`
        .fera-nav-links { display: flex; gap: 24px; align-items: center; }
        .fera-nav-hamburger { display: none; background: none; border: none; color: #fff; cursor: pointer; font-size: 22px; }
        @media (max-width: 768px) {
          .fera-nav-links { display: none; }
          .fera-nav-hamburger { display: block; }
        }
      `}</style>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: bgColor, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontWeight: 800, fontSize: '20px', color: '#fff' }}>{displayName}</div>

        <div className="fera-nav-links">
          {links.map((link, i) => (
            <a key={i} href={link.href} style={{
              color: 'rgba(255,255,255,0.9)', textDecoration: 'none',
              fontSize: '14px', fontWeight: 500,
            }}>
              {link.label}
            </a>
          ))}
          <button style={{
            background: accentColor, color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
            fontWeight: 600, fontSize: '14px',
          }}>🛒 Cart</button>
        </div>

        <button
          className="fera-nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >☰</button>
      </nav>

      {menuOpen && (
        <div style={{
          background: bgColor, padding: '12px 24px',
          position: 'sticky', top: '60px', zIndex: 99,
        }}>
          {links.map((link, i) => (
            <a key={i} href={link.href} style={{
              display: 'block', color: '#fff', textDecoration: 'none',
              padding: '10px 0',
              borderBottom: i < links.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
              fontSize: '14px',
            }}>
              {link.label}
            </a>
          ))}
          <div style={{ paddingTop: '12px' }}>
            <button style={{
              background: accentColor, color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: '20px', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px', width: '100%',
            }}>🛒 Cart</button>
          </div>
        </div>
      )}
    </>
  );
}

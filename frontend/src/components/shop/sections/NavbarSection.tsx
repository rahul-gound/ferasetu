import { useState, useEffect } from 'react';
import type { SectionConfig } from '../../../types/template';

interface NavbarSectionProps {
  config: SectionConfig;
  shopName: string;
}

export default function NavbarSection({ config, shopName }: NavbarSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const bgColor = (config.primaryColor as string) || '#FF6B35';
  const accentColor = (config.accentColor as string) || '#004E89';
  const displayName = (config.shopName as string) || shopName;
  const links = (config.links as Array<{ label: string; href: string }>) || [
    { label: 'Home', href: '#' },
    { label: 'Products', href: '#products' },
    { label: 'Contact', href: '#contact' }
  ];

  return (
    <>
      <style>{`
        .fera-navbar {
          position: sticky; top: 0; z-index: 1000;
          transition: all 0.3s ease;
          padding: 0 24px;
          display: flex; alignItems: center; justifyContent: space-between;
          height: 80px;
        }
        .fera-navbar-scrolled {
          height: 70px;
          background: rgba(255, 255, 255, 0.8) !important;
          backdrop-filter: blur(20px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .fera-nav-links { display: flex; gap: 32px; align-items: center; }
        .fera-nav-link {
          text-decoration: none; font-size: 15px; font-weight: 600;
          transition: all 0.2s;
        }
        .fera-nav-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; }
        .fera-cart-btn {
          background: ${accentColor}; color: #fff; border: none;
          padding: 10px 24px; borderRadius: 50px; cursor: pointer;
          fontWeight: 700; fontSize: 14px; display: flex; align-items: center; gap: 8px;
          box-shadow: 0 4px 15px ${accentColor}44; transition: all 0.2s;
        }
        .fera-cart-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px ${accentColor}66; }
        
        @media (max-width: 868px) {
          .fera-nav-links { display: none; }
          .fera-nav-hamburger { display: block; }
        }
      `}</style>
      <nav 
        className={`fera-navbar ${scrolled ? 'fera-navbar-scrolled' : ''}`}
        style={{ background: scrolled ? 'white' : bgColor }}
      >
        <div style={{ 
          fontWeight: 900, fontSize: '24px', 
          color: scrolled ? '#0f172a' : '#fff', 
          letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <div style={{ width: '36px', height: '36px', background: scrolled ? bgColor : '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: scrolled ? '#fff' : bgColor, fontSize: '20px' }}>🏪</div>
          {displayName}
        </div>

        <div className="fera-nav-links">
          {links.map((link, i) => (
            <a key={i} href={link.href} className="fera-nav-link" style={{
              color: scrolled ? '#475569' : 'rgba(255,255,255,0.9)',
            }}>
              {link.label}
            </a>
          ))}
          <button className="fera-cart-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Cart (0)
          </button>
        </div>

        <button
          className="fera-nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          style={{ color: scrolled ? '#0f172a' : '#fff' }}
        >
          {menuOpen ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: scrolled ? '70px' : '80px', left: 0, right: 0, bottom: 0,
          background: '#fff', padding: '40px 24px', zIndex: 999,
          display: 'flex', flexDirection: 'column', gap: '24px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          {links.map((link, i) => (
            <a key={i} href={link.href} onClick={() => setMenuOpen(false)} style={{
              display: 'block', color: '#0f172a', textDecoration: 'none',
              fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px'
            }}>
              {link.label}
            </a>
          ))}
          <button className="fera-cart-btn" style={{ width: '100%', padding: '16px', fontSize: '18px', marginTop: 'auto' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            View Cart (0)
          </button>
        </div>
      )}
    </>
  );
}

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3,
  Bot, Globe, LogOut, Menu, X, ChevronDown, LifeBuoy, Coins
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../utils/languages';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',      icon: <LayoutDashboard size={18} />, labelKey: 'dashboard' },
  { path: '/products',       icon: <Package size={18} />,         labelKey: 'products' },
  { path: '/orders',         icon: <ShoppingCart size={18} />,    labelKey: 'orders' },
  { path: '/analytics',      icon: <BarChart3 size={18} />,       labelKey: 'analytics' },
  { path: '/ai-assistant',   icon: <Bot size={18} />,             labelKey: 'aiAssistant' },
  { path: '/ai-credits',     icon: <Coins size={18} />,           labelKey: 'aiCredits' },
  { path: '/website-builder',icon: <Globe size={18} />,           labelKey: 'websiteBuilder' },
  { path: '/support',        icon: <LifeBuoy size={18} />,        labelKey: 'support' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { language, setLanguage, translate } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langDropOpen, setLangDropOpen] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);
  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #ff6b35 0%, #e55a24 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(255,107,53,0.35)',
          }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, fontStyle: 'italic' }}>F</span>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.03em', lineHeight: 1, color: '#fff' }}>
              Fera<span style={{ color: '#ff6b35' }}>Setu</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>
              Your shop's digital bridge
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ padding: '14px 12px', flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '10px 14px',
              borderRadius: 14,
              marginBottom: 3,
              textDecoration: 'none',
              fontWeight: isActive ? 700 : 500,
              fontSize: 14,
              color: isActive ? '#ff6b35' : 'rgba(255,255,255,0.45)',
              background: isActive ? 'rgba(255,107,53,0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(255,107,53,0.15)' : '1px solid transparent',
              transition: 'all 0.2s ease',
              letterSpacing: '-0.01em',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget;
              const active = el.classList.contains('active');
              if (!active) {
                el.style.color = 'rgba(255,255,255,0.75)';
                el.style.background = 'rgba(255,255,255,0.04)';
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
            }}
          >
            {item.icon}
            {translate(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div style={{
        padding: '14px 16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,rgba(255,107,53,0.2),rgba(99,102,241,0.2))',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#ff9a6c',
          }}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 50, display: 'inline-flex',
          fontSize: 11, fontWeight: 700,
          background: user?.plan === 'premium'
            ? 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(239,68,68,0.2))'
            : 'rgba(255,255,255,0.06)',
          border: user?.plan === 'premium'
            ? '1px solid rgba(245,158,11,0.3)'
            : '1px solid rgba(255,255,255,0.08)',
          color: user?.plan === 'premium' ? '#fbbf24' : 'rgba(255,255,255,0.4)',
        }}>
          {user?.plan === 'premium' ? '⭐ Premium' : translate('free')}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#090c1a', overflow: 'hidden' }}>

      {/* Desktop Sidebar */}
      <aside style={{
        width: 232, flexShrink: 0,
        background: '#0b0f1e',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }} className="desktop-sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40, display: 'none', backdropFilter: 'blur(4px)' }}
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0, left: sidebarOpen ? 0 : '-260px',
        width: 232, height: '100vh',
        background: '#0b0f1e',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        zIndex: 50,
        transition: 'left 0.25s ease',
        display: 'none', flexDirection: 'column',
        overflowY: 'auto',
      }} className="mobile-sidebar">
        <button onClick={() => setSidebarOpen(false)} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, width: 32, height: 32,
          cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top Header */}
        <header style={{
          height: 58,
          background: 'rgba(11,15,30,0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 20,
        }}>
          <button onClick={() => setSidebarOpen(true)} className="mobile-menu-btn" style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', display: 'none', alignItems: 'center', justifyContent: 'center',
          }}>
            <Menu size={18} />
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Language Selector */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setLangDropOpen(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500,
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}>
                <Globe size={13} />
                {currentLang?.nativeName || 'English'}
                <ChevronDown size={13} />
              </button>

              {langDropOpen && (
                <div style={{
                  position: 'absolute', top: 40, right: 0,
                  background: '#0f1422', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  zIndex: 100, width: 200,
                  maxHeight: 300, overflowY: 'auto',
                }}>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button key={lang.code} onClick={() => { setLanguage(lang.code); setLangDropOpen(false); }}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        width: '100%', padding: '9px 14px',
                        background: lang.code === language ? 'rgba(255,107,53,0.12)' : 'none',
                        border: 'none', cursor: 'pointer', fontSize: 13,
                        color: lang.code === language ? '#ff6b35' : 'rgba(255,255,255,0.6)',
                        textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (lang.code !== language) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { if (lang.code !== language) e.currentTarget.style.background = 'none'; }}>
                      <span>{lang.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{lang.nativeName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Plan badge */}
            <span style={{
              padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 700,
              background: user?.plan === 'premium' ? 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(239,68,68,0.2))' : 'rgba(255,255,255,0.06)',
              border: user?.plan === 'premium' ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,255,255,0.08)',
              color: user?.plan === 'premium' ? '#fbbf24' : 'rgba(255,255,255,0.4)',
            }}>
              {user?.plan === 'premium' ? '⭐ Premium' : translate('free')}
            </span>

            {/* User avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,rgba(255,107,53,0.3),rgba(99,102,241,0.3))',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#ff9a6c',
            }}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>

            {/* Logout */}
            <button onClick={handleLogout} title={translate('logout')} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 7, cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}>
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-sidebar { display: flex !important; }
          .mobile-overlay { display: block !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

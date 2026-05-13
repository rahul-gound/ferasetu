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
  { path: '/dashboard', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard' },
  { path: '/products', icon: <Package size={20} />, labelKey: 'products' },
  { path: '/orders', icon: <ShoppingCart size={20} />, labelKey: 'orders' },
  { path: '/analytics', icon: <BarChart3 size={20} />, labelKey: 'analytics' },
  { path: '/ai-assistant', icon: <Bot size={20} />, labelKey: 'aiAssistant' },
  { path: '/ai-credits', icon: <Coins size={20} />, labelKey: 'aiCredits' },
  { path: '/website-builder', icon: <Globe size={20} />, labelKey: 'websiteBuilder' },
  { path: '/support', icon: <LifeBuoy size={20} />, labelKey: 'support' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { language, setLanguage, translate } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langDropOpen, setLangDropOpen] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{
        padding: '32px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'var(--primary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(255, 107, 53, 0.2)'
        }}>
          <img 
            src="/logo_v1.png" 
            alt="FeraSetu" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                const fallback = document.createElement('span');
                fallback.innerText = 'F';
                fallback.style.color = '#fff';
                fallback.style.fontWeight = '900';
                fallback.style.fontSize = '20px';
                parent.appendChild(fallback);
              }
            }}
          />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '20px', color: 'var(--primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>FeraSetu</div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Your shop's digital bridge</div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ padding: '12px', flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: 'var(--radius)',
              marginBottom: '2px',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '14px',
              color: isActive ? 'var(--primary-accent)' : 'var(--text-muted)',
              background: isActive ? '#F1F5F9' : 'transparent',
              transition: 'all 0.2s ease',
            })}
          >
            {item.icon}
            {translate(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
          {user?.name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          {user?.email}
        </div>
        <span className={`badge ${user?.plan === 'premium' ? 'badge-premium' : ''}`} style={{
          background: user?.plan === 'premium' ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'var(--border)',
          color: user?.plan === 'premium' ? '#fff' : 'var(--text-muted)',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
        }}>
          {user?.plan === 'premium' ? '⭐ Premium' : translate('free')}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Desktop Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }} className="desktop-sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 40, display: 'none'
          }}
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0, left: sidebarOpen ? 0 : '-260px',
        width: '240px', height: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        zIndex: 50,
        transition: 'left 0.25s ease',
        display: 'none',
        flexDirection: 'column',
        overflowY: 'auto',
      }} className="mobile-sidebar">
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)'
          }}
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{
          height: '60px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}>
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="mobile-menu-btn"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text)', display: 'none', alignItems: 'center'
            }}
          >
            <Menu size={22} />
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Language Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangDropOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                  fontSize: '13px', color: 'var(--text)', fontWeight: 500,
                }}
              >
                <Globe size={14} />
                {currentLang?.nativeName || 'English'}
                <ChevronDown size={14} />
              </button>

              {langDropOpen && (
                <div style={{
                  position: 'absolute', top: '36px', right: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 100, width: '200px',
                  maxHeight: '300px', overflowY: 'auto',
                }}>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setLangDropOpen(false); }}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        width: '100%', padding: '9px 14px',
                        background: lang.code === language ? 'rgba(255,107,53,0.1)' : 'none',
                        border: 'none', cursor: 'pointer', fontSize: '13px',
                        color: lang.code === language ? 'var(--primary)' : 'var(--text)',
                        textAlign: 'left',
                      }}
                    >
                      <span>{lang.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{lang.nativeName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Plan badge */}
            <span style={{
              background: user?.plan === 'premium' ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'var(--border)',
              color: user?.plan === 'premium' ? '#fff' : 'var(--text-muted)',
              padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
            }}>
              {user?.plan === 'premium' ? '⭐ Premium' : translate('free')}
            </span>

            {/* User name */}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
              {user?.name?.split(' ')[0]}
            </span>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title={translate('logout')}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '7px', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              }}
            >
              <LogOut size={16} />
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

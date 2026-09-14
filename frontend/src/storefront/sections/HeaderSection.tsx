import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  MapPin,
  Phone,
  Package,
  ShieldCheck,
  MessageCircle,
  CheckCircle2,
  User,
} from 'lucide-react';
import type { HeaderVariant } from '../theme/themeTypes';
import { useStorefront } from '../runtime/StorefrontProvider';
import { sanitizeText } from '../utilities/formatting';

interface HeaderSectionProps {
  config?: Record<string, unknown>;
  variant?: HeaderVariant | string;
}

function VerifiedStoreTrustPill({ shopPhone }: { shopPhone?: string }) {
  const cleanPhone = shopPhone ? shopPhone.replace(/\D/g, '') : '';
  return (
    <div className="bg-slate-900 text-white text-[11px] font-semibold py-1.5 px-3 border-b border-slate-800 tracking-tight">
      <div className="max-w-[var(--theme-max-width)] mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30">
            <ShieldCheck size={12} className="text-emerald-400" />
            Verified Local Business
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-300 text-[10.5px] hidden sm:inline flex items-center gap-1">
            <MapPin size={11} className="text-slate-400" />
            Direct Local Fulfillment
          </span>
          <span className="text-slate-400 hidden md:inline">•</span>
          <span className="text-slate-300 text-[10.5px] hidden md:inline">
            Orders fulfilled directly by store owner
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          <span className="inline-flex items-center gap-1 text-[10.5px]">
            <CheckCircle2 size={11} className="text-emerald-400" />
            100% Direct Payment
          </span>
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[10.5px] font-bold transition-colors"
            >
              <MessageCircle size={11} />
              Direct WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HeaderSection({
  config = {},
  variant = 'commerce',
}: HeaderSectionProps) {
  const {
    shopName,
    shopLogo,
    shopPhone,
    cartCount,
    openCart,
    searchQuery,
    setSearchQuery,
    categories,
    setSelectedCategory,
    customer,
    openCustomerAuth,
    openCustomerAccount,
  } = useStorefront();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const displayName = sanitizeText((config.shopName as string) || shopName);

  const navLinks = [
    { label: 'Home', href: '#' },
    { label: 'Products', href: '#products' },
    { label: 'Categories', href: '#categories' },
    { label: 'About', href: '#story' },
  ];

  // ─────────────────────────────────────────────────────────────
  // 1. EDITORIAL HEADER (Atelier: Centered logo, refined typography)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'editorial') {
    return (
      <header
        className={`sticky top-0 z-50 bg-[#FDFCF7]/95 backdrop-blur-md transition-all duration-300 border-b border-[#E8E4DC] ${
          isScrolled ? 'py-3 shadow-sm' : 'py-5'
        }`}
      >
        <VerifiedStoreTrustPill shopPhone={shopPhone} />
        <div className="max-w-[var(--theme-max-width)] mx-auto px-4 sm:px-8 flex items-center justify-between">
          {/* Left: Nav links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] tracking-widest uppercase font-medium text-[#121212]/80">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-[#121212] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-[#121212]"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          {/* Center: Brand Name / Logo */}
          <div className="text-center">
            <a
              href="#"
              className="text-2xl sm:text-3xl tracking-widest font-normal text-[#121212] uppercase"
              style={{ fontFamily: 'var(--theme-font-heading)' }}
            >
              {shopLogo ? (
                <img
                  src={shopLogo}
                  alt={displayName}
                  className="h-9 w-auto object-contain mx-auto"
                />
              ) : (
                displayName
              )}
            </a>
          </div>

          {/* Right: Search, Customer Account & Cart actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="p-2 text-[#121212] hover:text-[#D4AF37] transition-colors"
              aria-label="Toggle search"
            >
              <Search size={18} />
            </button>

            {customer ? (
              <button
                type="button"
                onClick={openCustomerAccount}
                className="p-2 text-[#121212] hover:text-[#D4AF37] transition-colors flex items-center gap-1.5 text-xs tracking-wider uppercase font-medium"
                aria-label="Customer Account"
                title={customer.name || customer.email}
              >
                <User size={18} />
                <span className="hidden lg:inline">{customer.name ? customer.name.split(' ')[0] : 'Account'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openCustomerAuth('login')}
                className="p-2 text-[#121212] hover:text-[#D4AF37] transition-colors flex items-center gap-1.5 text-xs tracking-wider uppercase font-medium"
                aria-label="Sign In"
              >
                <User size={18} />
                <span className="hidden lg:inline">Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={openCart}
              className="relative p-2 text-[#121212] hover:text-[#D4AF37] transition-colors flex items-center gap-1.5"
              aria-label="Shopping Cart"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="text-[11px] font-bold text-[#121212]">
                  ({cartCount})
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Search Input */}
        {showSearchInput && (
          <div className="border-t border-[#E8E4DC] py-3 px-6 bg-white max-w-xl mx-auto mt-3 animate-fadeIn">
            <div className="relative flex items-center">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search collection..."
                className="w-full text-xs uppercase tracking-wider py-2 pl-3 pr-8 border-b border-black focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSearchInput(false)}
                className="absolute right-2 text-slate-400 hover:text-black"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-start">
            <div className="w-4/5 max-w-sm bg-[#FDFCF7] h-full p-6 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#E8E4DC]">
                  <span
                    className="text-lg uppercase tracking-wider font-medium text-black"
                    style={{ fontFamily: 'var(--theme-font-heading)' }}
                  >
                    {displayName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-slate-500"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="flex flex-col gap-5 text-sm tracking-widest uppercase font-medium">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-slate-900 hover:text-[#D4AF37]"
                    >
                      {link.label}
                    </a>
                  ))}
                  <div className="pt-4 border-t border-[#E8E4DC]">
                    {customer ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openCustomerAccount();
                        }}
                        className="w-full text-left flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-slate-900 hover:text-[#D4AF37]"
                      >
                        <User size={16} />
                        <span>{customer.name || customer.email}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openCustomerAuth('login');
                        }}
                        className="w-full text-left flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-slate-900 hover:text-[#D4AF37]"
                      >
                        <User size={16} />
                        <span>Sign In / Register</span>
                      </button>
                    )}
                  </div>
                </nav>
              </div>

              <div className="pt-6 border-t border-[#E8E4DC] text-xs text-slate-500">
                <p>Curated Storefront on FeraSetu</p>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MONO HEADER (Swiss minimal, stark lines, architectural)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'minimal') {
    return (
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--theme-color-border)]">
        <VerifiedStoreTrustPill shopPhone={shopPhone} />
        <div className="max-w-[var(--theme-max-width)] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="#" className="font-mono text-sm font-bold tracking-tight uppercase">
              {shopLogo ? (
                <img src={shopLogo} alt={displayName} className="h-7 w-auto object-contain" />
              ) : (
                `[ ${displayName} ]`
              )}
            </a>
            <nav className="hidden md:flex items-center gap-4 text-xs font-mono uppercase text-neutral-500">
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} className="hover:text-black">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center border border-neutral-300 px-2 py-1 text-xs font-mono">
              <Search size={12} className="text-neutral-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-24 focus:w-40 transition-all focus:outline-none text-xs"
              />
            </div>

            {customer ? (
              <button
                type="button"
                onClick={openCustomerAccount}
                className="flex items-center gap-1.5 border border-neutral-300 px-2.5 py-1 text-xs font-mono text-neutral-800 hover:border-black transition-colors"
                title={customer.name || customer.email}
              >
                <User size={12} />
                <span>[{customer.name ? customer.name.split(' ')[0].toUpperCase() : 'ACCOUNT'}]</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openCustomerAuth('login')}
                className="border border-neutral-300 px-2.5 py-1 text-xs font-mono text-neutral-600 hover:text-black hover:border-black transition-colors"
              >
                [SIGN IN]
              </button>
            )}

            <button
              type="button"
              onClick={openCart}
              className="flex items-center gap-2 border border-black px-3 py-1 text-xs font-mono font-bold bg-black text-white hover:bg-neutral-800"
            >
              <span>CART</span>
              <span>[{cartCount}]</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. BOLD HEADER (Contemporary D2C, pill navigation)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'bold') {
    return (
      <header
        className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 transition-all ${
          isScrolled ? 'py-2.5 shadow-sm' : 'py-3.5'
        }`}
      >
        <VerifiedStoreTrustPill shopPhone={shopPhone} />
        <div className="max-w-[var(--theme-max-width)] mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <a href="#" className="text-xl sm:text-2xl font-black tracking-tight text-gray-950">
            {shopLogo ? (
              <img src={shopLogo} alt={displayName} className="h-8 w-auto object-contain" />
            ) : (
              displayName
            )}
          </a>

          <div className="hidden md:flex flex-1 max-w-sm mx-4">
            <div className="w-full relative flex items-center">
              <Search size={14} className="absolute left-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find items, styles, categories..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-full text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {customer ? (
              <button
                type="button"
                onClick={openCustomerAccount}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 px-3 py-2 rounded-full font-bold text-xs transition-colors"
                title={customer.name || customer.email}
              >
                <User size={14} />
                <span className="hidden sm:inline">{customer.name ? customer.name.split(' ')[0] : 'Account'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openCustomerAuth('login')}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-full font-bold text-xs transition-colors"
              >
                <User size={14} />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={openCart}
              className="flex items-center gap-2 bg-[var(--theme-color-primary)] text-white hover:bg-[var(--theme-color-primary-hover)] px-4 py-2 rounded-full font-bold text-xs shadow-md transition-colors"
            >
              <ShoppingBag size={15} />
              <span>Bag ({cartCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-gray-800"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
            <div className="w-3/4 max-w-xs bg-white h-full p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                  <span className="font-black text-lg">{displayName}</span>
                  <button type="button" onClick={() => setMobileMenuOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                <nav className="flex flex-col gap-4 font-bold text-sm">
                  {navLinks.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-gray-800 hover:text-blue-600"
                    >
                      {l.label}
                    </a>
                  ))}
                  <div className="pt-4 border-t border-gray-100 mt-2">
                    {customer ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openCustomerAccount();
                        }}
                        className="w-full text-left flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-blue-600"
                      >
                        <User size={16} />
                        <span>{customer.name || customer.email}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openCustomerAuth('login');
                        }}
                        className="w-full text-left flex items-center gap-2 text-sm font-bold text-gray-800 hover:text-blue-600"
                      >
                        <User size={16} />
                        <span>Sign In / Create Account</span>
                      </button>
                    )}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ARTISAN HEADER (Warm craft, centered emblem)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'artisan') {
    return (
      <header className="sticky top-0 z-50 bg-[#FBF8F3]/95 backdrop-blur-sm border-b border-[#E7DFD5]">
        <VerifiedStoreTrustPill shopPhone={shopPhone} />
        <div className="max-w-[var(--theme-max-width)] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-[#2C221E]"
            >
              <Menu size={20} />
            </button>
            <a
              href="#"
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#2C221E]"
              style={{ fontFamily: 'var(--theme-font-heading)' }}
            >
              {shopLogo ? (
                <img src={shopLogo} alt={displayName} className="h-8 w-auto object-contain" />
              ) : (
                displayName
              )}
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#6D5B52]">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="hover:text-[#C25E3E] transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {customer ? (
              <button
                type="button"
                onClick={openCustomerAccount}
                className="flex items-center gap-1.5 text-[#6D5B52] hover:text-[#2C221E] px-2.5 py-1.5 rounded text-xs font-semibold transition-colors"
                title={customer.name || customer.email}
              >
                <User size={14} />
                <span className="hidden sm:inline">{customer.name ? customer.name.split(' ')[0] : 'Account'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openCustomerAuth('login')}
                className="flex items-center gap-1.5 text-[#6D5B52] hover:text-[#2C221E] px-2.5 py-1.5 rounded text-xs font-semibold transition-colors"
              >
                <User size={14} />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={openCart}
              className="flex items-center gap-2 bg-[#C25E3E] text-white px-3.5 py-1.5 rounded text-xs font-semibold hover:bg-[#A64B2F] transition-colors shadow-sm"
            >
              <ShoppingBag size={14} />
              <span>Cart ({cartCount})</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex justify-start">
            <div className="w-3/4 max-w-xs bg-[#FBF8F3] h-full p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-[#E7DFD5] mb-6">
                  <span className="font-bold text-lg text-[#2C221E]" style={{ fontFamily: 'var(--theme-font-heading)' }}>
                    {displayName}
                  </span>
                  <button type="button" onClick={() => setMobileMenuOpen(false)}>
                    <X size={20} className="text-[#6D5B52]" />
                  </button>
                </div>
                <nav className="flex flex-col gap-4 font-semibold text-sm text-[#2C221E]">
                  {navLinks.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="hover:text-[#C25E3E]"
                    >
                      {l.label}
                    </a>
                  ))}
                  <div className="pt-4 border-t border-[#E7DFD5] mt-2">
                    {customer ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openCustomerAccount();
                        }}
                        className="w-full text-left flex items-center gap-2 text-sm font-semibold text-[#2C221E] hover:text-[#C25E3E]"
                      >
                        <User size={16} />
                        <span>{customer.name || customer.email}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openCustomerAuth('login');
                        }}
                        className="w-full text-left flex items-center gap-2 text-sm font-semibold text-[#6D5B52] hover:text-[#C25E3E]"
                      >
                        <User size={16} />
                        <span>Sign In / Register</span>
                      </button>
                    )}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. COMMERCE HEADER (Market: Modern practical Indian commerce)
  // ─────────────────────────────────────────────────────────────
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      <VerifiedStoreTrustPill shopPhone={shopPhone} />
      <div className="max-w-[var(--theme-max-width)] mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left Brand */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1 text-slate-700 hover:bg-slate-100 rounded"
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <a href="#" className="flex items-center gap-2">
            {shopLogo ? (
              <img src={shopLogo} alt={displayName} className="h-8 w-auto object-contain" />
            ) : (
              <div className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
                <span className="w-7 h-7 rounded bg-[var(--theme-color-primary)] text-white flex items-center justify-center text-xs font-black">
                  🏪
                </span>
                <span>{displayName}</span>
              </div>
            )}
          </a>
        </div>

        {/* Center Search Bar */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products in this store..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-xs font-medium focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Customer Account Trigger */}
          {customer ? (
            <button
              type="button"
              onClick={openCustomerAccount}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 px-2.5 py-1.5 rounded hover:bg-slate-100 transition-colors"
              title={customer.name || customer.email}
            >
              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                {customer.name ? customer.name.charAt(0).toUpperCase() : <User size={11} />}
              </div>
              <span className="hidden sm:inline">{customer.name ? customer.name.split(' ')[0] : 'Account'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openCustomerAuth('login')}
              className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-950 px-2.5 py-1.5 rounded hover:bg-slate-100 transition-colors"
            >
              <User size={14} />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Order tracking shortcut */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('fera-open-track-order'))}
            className="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-950 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors"
          >
            <Package size={14} />
            <span>Track Order</span>
          </button>

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={openCart}
            className="flex items-center gap-1.5 bg-[var(--theme-color-primary)] text-white hover:bg-[var(--theme-color-primary-hover)] px-3.5 py-2 rounded-md font-bold text-xs shadow-sm transition-colors"
          >
            <ShoppingBag size={15} />
            <span>Cart</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[11px]">
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar below header */}
      <div className="sm:hidden px-3 pb-2.5">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-start">
          <div className="w-4/5 max-w-xs bg-white h-full p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <span className="font-extrabold text-base text-slate-900">{displayName}</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex flex-col gap-3 font-semibold text-sm text-slate-800">
                {navLinks.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-1 hover:text-emerald-600"
                  >
                    {l.label}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('fera-open-track-order'));
                  }}
                  className="py-1 text-left hover:text-emerald-600 flex items-center gap-1.5"
                >
                  <Package size={15} /> Track My Order
                </button>

                <div className="pt-3 border-t border-slate-100 mt-1">
                  {customer ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openCustomerAccount();
                      }}
                      className="w-full py-1 text-left hover:text-emerald-600 flex items-center gap-1.5 font-bold text-slate-800"
                    >
                      <User size={15} /> My Account ({customer.name ? customer.name.split(' ')[0] : customer.email})
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openCustomerAuth('login');
                      }}
                      className="w-full py-1 text-left hover:text-emerald-600 flex items-center gap-1.5 font-bold text-slate-800"
                    >
                      <User size={15} /> Sign In / Create Account
                    </button>
                  )}
                </div>
              </nav>

              {categories.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Categories
                  </span>
                  <div className="flex flex-col gap-2 text-xs font-medium text-slate-600">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setMobileMenuOpen(false);
                      }}
                      className="text-left py-1 hover:text-slate-950"
                    >
                      All Categories
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(c);
                          setMobileMenuOpen(false);
                        }}
                        className="text-left py-1 hover:text-slate-950"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {shopPhone && (
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-1 font-semibold text-slate-700">
                  <Phone size={13} /> {shopPhone}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

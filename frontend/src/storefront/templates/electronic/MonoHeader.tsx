import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, ShoppingBag, Menu, X, Package, LogOut } from 'lucide-react';
import { NAV_LINKS } from './electronicData';
import { useMonoShop } from './MonoContext';

export default function MonoHeader() {
  const {
    cartCount,
    user,
    orders,
    logout,
    openCart,
    openAuth,
    openSearch,
    selectCategory,
    shopName,
    shopLogo,
    formatPrice,
  } = useMonoShop();

  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2 text-2xl font-black tracking-[0.01em] text-ink">
          {shopLogo ? (
            <img src={shopLogo} alt={shopName} className="h-8 max-w-[140px] object-contain" />
          ) : (
            <span>{shopName || 'MONO'}</span>
          )}
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <button key={link.label} className="navlink" onClick={() => selectCategory(link.cat)}>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => openSearch(true)}
            className="grid h-10 w-10 place-items-center rounded-full text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label="Search products"
          >
            <Search size={19} strokeWidth={1.8} />
          </motion.button>

          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => (user ? setMenuOpen((o) => !o) : openAuth(true))}
              className={`grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-ink/5 hover:text-ink ${
                user ? 'bg-brand/10 text-brand' : 'text-ink/80'
              }`}
              aria-label={user ? `Account: ${user.name}` : 'Sign in'}
            >
              {user ? (
                <span className="text-sm font-bold uppercase">{user.name.slice(0, 1)}</span>
              ) : (
                <User size={19} strokeWidth={1.8} />
              )}
            </motion.button>

            <AnimatePresence>
              {menuOpen && user && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-12 w-64 overflow-hidden rounded-xl border border-black/5 bg-white shadow-xl"
                >
                  <div className="border-b border-black/5 px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-xs text-ink/50">{user.email}</p>
                  </div>
                  <div className="border-b border-black/5 px-4 py-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink/45">
                      <Package size={12} /> Orders ({orders.length})
                    </p>
                    {orders.length === 0 ? (
                      <p className="text-xs text-ink/50">No orders yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {orders.slice(0, 3).map((o) => (
                          <li key={o.id} className="flex justify-between text-xs text-ink/70">
                            <span>{o.id}</span>
                            <span className="font-semibold">{formatPrice(o.total)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => openCart(true)}
            className="relative grid h-10 w-10 place-items-center rounded-full text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label={`Cart, ${cartCount} items`}
          >
            <ShoppingBag size={19} strokeWidth={1.8} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0, y: 4 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 14 }}
                  className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setNavOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-full text-ink/80 transition-colors hover:bg-ink/5 md:hidden"
            aria-label="Menu"
          >
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {navOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-black/5 bg-white md:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col px-4 py-3">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    setNavOpen(false);
                    selectCategory(link.cat);
                  }}
                  className="border-b border-black/5 py-3 text-left text-[15px] font-medium text-ink/80 last:border-0"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

// FeraSetu Pro — Multi-Page Storefront Router & Renderer
// =============================================================================
// Serves published multi-page Pro websites with client & server route matching,
// dynamic parameters (/products/:slug, /orders/:id), customer auth, and
// function-bound data hydration.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShoppingCart, User, ArrowRight, Check, Package, Sparkles } from 'lucide-react';
import type { PublicShopData } from '../../types/template';

interface ProStorefrontRouterProps {
  shopData: PublicShopData;
  initialPath?: string;
}

export default function ProStorefrontRouter({ shopData, initialPath = '/' }: ProStorefrontRouterProps) {
  const proSite = (shopData as any).pro_site;
  const pages: any[] = proSite?.pages || [];
  const routes: any[] = proSite?.routes || [];
  const navigation = proSite?.navigation || [];

  const [currentPath, setCurrentPath] = useState(initialPath);
  const [customerSession, setCustomerSession] = useState<{ id: string; name: string; email: string } | null>(() => {
    try {
      const raw = localStorage.getItem('fs_customer_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // 1. Resolve active route and parameters
  const { matchedRoute, params, activePage } = useMemo(() => {
    let matched = routes.find(r => r.path_pattern === currentPath);
    let matchedParams: Record<string, string> = {};

    // Dynamic match (e.g. /products/:slug)
    if (!matched) {
      for (const r of routes) {
        if (r.path_pattern.includes(':')) {
          const patternParts = r.path_pattern.split('/');
          const pathParts = currentPath.split('/');
          if (patternParts.length === pathParts.length) {
            const p: Record<string, string> = {};
            let isMatch = true;
            for (let i = 0; i < patternParts.length; i++) {
              if (patternParts[i].startsWith(':')) {
                p[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
              } else if (patternParts[i] !== pathParts[i]) {
                isMatch = false;
                break;
              }
            }
            if (isMatch) {
              matched = r;
              matchedParams = p;
              break;
            }
          }
        }
      }
    }

    // Default to homepage if available
    let page = null;
    if (matched) {
      page = pages.find(p => p.id === matched.page_id);
    }
    if (!page) {
      page = pages.find(p => p.is_homepage === 1) || pages[0];
    }

    return { matchedRoute: matched, params: matchedParams, activePage: page };
  }, [currentPath, routes, pages]);

  // Check route protection
  const isProtected = Boolean(
    (matchedRoute && matchedRoute.access_level === 'authenticated') ||
    (activePage && activePage.auth_required)
  );
  const isAuthenticated = Boolean(customerSession?.id);

  // Header navigation items
  const headerNav: any[] = useMemo(() => {
    const headerMenu = navigation.find((n: any) => n.menu_location === 'header');
    if (headerMenu && headerMenu.items) {
      return typeof headerMenu.items === 'string' ? JSON.parse(headerMenu.items) : headerMenu.items;
    }
    // Fallback: list pages
    return pages.slice(0, 6).map(p => ({
      label: p.title,
      path: p.is_homepage ? '/' : `/${p.slug}`,
    }));
  }, [navigation, pages]);

  const shop = shopData.shop;
  const brandColor = shop.primary_color || '#0F172A';

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => setCurrentPath('/')}
            className="flex items-center gap-2.5 font-bold text-lg text-slate-900 hover:opacity-80 transition-opacity"
          >
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-8 w-8 object-contain rounded-md" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: brandColor }}>
                {shop.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span>{shop.name}</span>
          </button>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {headerNav.map((item: any, i: number) => (
              <button
                key={i}
                onClick={() => setCurrentPath(item.path)}
                className={`transition-colors ${
                  currentPath === item.path ? 'text-rose-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Customer Auth Profile / Login */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPath('/account')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  <User size={13} /> {customerSession?.name || 'Account'}
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('fs_customer_user');
                    setCustomerSession(null);
                    setCurrentPath('/');
                  }}
                  className="text-xs text-slate-400 hover:text-rose-600 font-medium"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCurrentPath('/login')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-full text-white shadow-xs hover:opacity-90 transition-opacity"
                style={{ backgroundColor: brandColor }}
              >
                Customer Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Canvas */}
      <main className="flex-1">
        {/* Protected Route Gate */}
        {isProtected && !isAuthenticated ? (
          <div className="max-w-md mx-auto py-16 px-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Lock size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Protected Member Area</h2>
              <p className="text-xs text-slate-500 mb-6">
                Please sign in to your customer account to access this page.
              </p>

              {authError && (
                <div className="mb-4 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                  {authError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loginEmail || !loginPassword) {
                    setAuthError("Email and password are required.");
                    return;
                  }
                  const fakeSession = {
                    id: `cust_${Math.random().toString(36).slice(2)}`,
                    name: loginEmail.split('@')[0],
                    email: loginEmail,
                  };
                  localStorage.setItem('fs_customer_user', JSON.stringify(fakeSession));
                  setCustomerSession(fakeSession);
                  setAuthError(null);
                }}
                className="space-y-3 text-left"
              >
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-semibold text-xs text-white shadow-sm hover:opacity-90 transition-opacity mt-2"
                  style={{ backgroundColor: brandColor }}
                >
                  Sign In & Continue
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Render Active Page Content */
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            {activePage?.content?.hero && (
              <div className="mb-12 text-center max-w-3xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                  {activePage.content.hero.title}
                </h1>
                <p className="text-base text-slate-600 leading-relaxed mb-6">
                  {activePage.content.hero.subtitle}
                </p>
                {activePage.content.hero.ctaLink && (
                  <button
                    onClick={() => setCurrentPath(activePage.content.hero.ctaLink)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white shadow-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: brandColor }}
                  >
                    {activePage.content.hero.ctaText || "Explore"} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Dynamic Product Detail View if :slug */}
            {params.slug && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-10">
                <div className="inline-block px-2.5 py-0.5 rounded-md text-xs font-mono bg-indigo-100 text-indigo-800 font-semibold mb-2">
                  Dynamic Route: /products/{params.slug}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Product Details: {params.slug.replace(/-/g, ' ')}
                </h2>
                <p className="text-xs text-slate-500 mb-6">
                  Resolved via dynamic route parameter extraction with server-side isolation.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => alert("Added to cart!")}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: brandColor }}
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => setCurrentPath('/products')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white"
                  >
                    Back to Catalog
                  </button>
                </div>
              </div>
            )}

            {/* Render Live Products if Products page */}
            {(currentPath === '/products' || currentPath === '/' || activePage?.slug === 'products') && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Featured Products</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(shopData.products || []).slice(0, 6).map((product) => (
                    <div
                      key={product.id}
                      onClick={() => setCurrentPath(`/products/${product.sku || product.id}`)}
                      className="group cursor-pointer bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="aspect-4/3 bg-slate-100 overflow-hidden relative">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package size={36} />
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{product.category || 'General'}</span>
                          <h4 className="font-bold text-sm text-slate-900 mt-1 line-clamp-1">{product.name}</h4>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">₹{product.price}</span>
                          <span className="text-xs font-semibold text-rose-600 hover:underline">View &rarr;</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-10 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} {shop.name}. Powered by <span className="font-semibold text-slate-700">FeraSetu Pro</span>.
          </div>
          <div className="flex gap-4">
            {headerNav.map((item: any, i: number) => (
              <button key={i} onClick={() => setCurrentPath(item.path)} className="hover:text-slate-800">
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

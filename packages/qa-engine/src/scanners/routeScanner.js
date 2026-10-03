/**
 * FeraSetu QA Engine - Route Discovery & Navigation Scanner
 * =========================================================
 * Discovers and inventories the entire application surface across:
 * - Public & SEO Landing Pages
 * - Merchant Dashboard & Shop Management
 * - Storefront & Catalog
 * - Platform Admin
 */

export const KNOWN_FERASETU_ROUTES = [
  // Public Landing & Marketing
  { path: '/', name: 'Landing Page', category: 'public', safe: true },
  { path: '/pricing', name: 'Pricing Page', category: 'public', safe: true },
  { path: '/online-dukaan-banaye', name: 'Online Dukaan (Hindi)', category: 'seo', safe: true },
  { path: '/free-online-store', name: 'Free Online Store', category: 'seo', safe: true },
  { path: '/shopify-alternative-india', name: 'Shopify Alternative India', category: 'seo', safe: true },
  { path: '/kirana-store-online', name: 'Kirana Store Online', category: 'seo', safe: true },
  { path: '/terms', name: 'Terms of Service', category: 'public', safe: true },
  { path: '/privacy', name: 'Privacy Policy', category: 'public', safe: true },

  // Auth Pages
  { path: '/login', name: 'Merchant Login', category: 'auth', safe: true },
  { path: '/register', name: 'Merchant Registration', category: 'auth', safe: true },

  // Core Merchant Dashboard (Protected)
  { path: '/dashboard', name: 'Merchant Overview', category: 'merchant', authRequired: true, safe: true },
  { path: '/products', name: 'Products Catalog', category: 'merchant', authRequired: true, safe: true },
  { path: '/orders', name: 'Orders Management', category: 'merchant', authRequired: true, safe: true },
  { path: '/analytics', name: 'Store Analytics', category: 'merchant', authRequired: true, safe: true },
  { path: '/ferasetu-ai', name: 'FeraSetu AI Assistant', category: 'merchant', authRequired: true, safe: true },
  { path: '/website-builder', name: 'Website Builder', category: 'merchant', authRequired: true, safe: true },
  { path: '/pro-studio', name: 'Pro Studio IDE', category: 'merchant', authRequired: true, safe: true },
  { path: '/settings/email', name: 'Custom Email & SMTP', category: 'merchant', authRequired: true, safe: true },
  { path: '/support', name: 'Merchant Support Desk', category: 'merchant', authRequired: true, safe: true },

  // Storefront & Customer Portal
  { path: '/shop/demo-store', name: 'Storefront Catalog Demo', category: 'storefront', safe: true },

  // Admin CEO Command Center
  { path: '/admin', name: 'Admin Login', category: 'admin', safe: true },
  { path: '/admin/dashboard', name: 'Admin Command Center', category: 'admin', authRequired: true, safe: true },
  { path: '/admin/qa', name: 'Admin QA & Diagnostics', category: 'admin', authRequired: true, safe: true },

  // Synthetic Test Fixtures (Dedicated QA sandbox)
  { path: '/admin/qa/sandbox', name: 'QA Synthetic Sandbox Fixture', category: 'qa_sandbox', safe: true },
];

/**
 * Discovers and plans route execution for a given target environment.
 * @param {Object} options
 * @param {string} [options.filter] - Optional path substring filter
 * @param {string} [options.mode] - 'smoke' | 'full' | 'ui' | 'api'
 * @param {boolean} [options.isAuthenticated] - Whether authenticated session is active
 * @returns {{discovered: Array<any>, tested: Array<any>, skipped: Array<any>}}
 */
export function discoverRoutes({ filter, mode = 'full', isAuthenticated = false }) {
  let list = [...KNOWN_FERASETU_ROUTES];

  if (filter) {
    list = list.filter((r) => r.path.includes(filter) || r.name.toLowerCase().includes(filter.toLowerCase()));
  }

  // Smoke test prioritizes high-impact critical pages
  if (mode === 'smoke') {
    const smokePaths = new Set([
      '/',
      '/login',
      '/pricing',
      '/dashboard',
      '/products',
      '/shop/demo-store',
      '/admin/qa',
      '/admin/qa/sandbox',
    ]);
    list = list.filter((r) => smokePaths.has(r.path));
  }

  const tested = [];
  const skipped = [];

  for (const route of list) {
    if (route.authRequired && !isAuthenticated) {
      skipped.push({
        ...route,
        reason: 'Authentication session required for protected route. Bypassed in unauthenticated scan.',
      });
    } else {
      tested.push(route);
    }
  }

  return {
    discovered: list,
    tested,
    skipped,
  };
}

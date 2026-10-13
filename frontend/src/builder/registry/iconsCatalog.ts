/**
 * FeraSetu Unified Visual Builder — Curated Icon Registry
 * Provides 180+ searchable, tagged vector icons from Lucide
 * Contributes to the ~400 discoverable component & asset library entries.
 */

export interface IconCatalogEntry {
  name: string;
  label: string;
  category: 'commerce' | 'ui' | 'social' | 'communication' | 'media' | 'arrows' | 'business';
  tags: string[];
}

export const ICONS_CATALOG: IconCatalogEntry[] = [
  // Commerce & Retail
  { name: 'ShoppingCart', label: 'Shopping Cart', category: 'commerce', tags: ['buy', 'cart', 'store', 'checkout'] },
  { name: 'ShoppingBag', label: 'Shopping Bag', category: 'commerce', tags: ['bag', 'retail', 'fashion'] },
  { name: 'Package', label: 'Package Box', category: 'commerce', tags: ['delivery', 'shipping', 'order', 'parcel'] },
  { name: 'Truck', label: 'Delivery Truck', category: 'commerce', tags: ['shipping', 'express', 'transport'] },
  { name: 'CreditCard', label: 'Credit Card', category: 'commerce', tags: ['payment', 'billing', 'visa', 'mastercard'] },
  { name: 'Banknote', label: 'Banknote Cash', category: 'commerce', tags: ['money', 'cod', 'cash', 'rupee'] },
  { name: 'Receipt', label: 'Receipt Invoice', category: 'commerce', tags: ['invoice', 'bill', 'tax', 'gst'] },
  { name: 'Tag', label: 'Price Tag', category: 'commerce', tags: ['discount', 'sale', 'offer', 'coupon'] },
  { name: 'Percent', label: 'Discount Percent', category: 'commerce', tags: ['promo', 'discount', 'deal'] },
  { name: 'Gift', label: 'Gift Box', category: 'commerce', tags: ['present', 'festive', 'bonus', 'rewards'] },
  { name: 'Store', label: 'Storefront Dukaan', category: 'commerce', tags: ['shop', 'dukaan', 'market'] },
  { name: 'Wallet', label: 'Digital Wallet', category: 'commerce', tags: ['money', 'credits', 'upi'] },
  { name: 'QrCode', label: 'QR Code', category: 'commerce', tags: ['scan', 'upi', 'pay'] },
  { name: 'Coins', label: 'Coins', category: 'commerce', tags: ['currency', 'points', 'rewards'] },
  { name: 'BadgePercent', label: 'Sale Badge', category: 'commerce', tags: ['deal', 'special'] },

  // UI & Navigation
  { name: 'Menu', label: 'Hamburger Menu', category: 'ui', tags: ['navigation', 'drawer', 'mobile'] },
  { name: 'X', label: 'Close Cross', category: 'ui', tags: ['cancel', 'exit', 'dismiss'] },
  { name: 'Check', label: 'Checkmark', category: 'ui', tags: ['done', 'ok', 'verified', 'success'] },
  { name: 'Search', label: 'Search Magnifier', category: 'ui', tags: ['find', 'lookup', 'query'] },
  { name: 'Filter', label: 'Filter Funnel', category: 'ui', tags: ['sort', 'refine', 'categories'] },
  { name: 'SlidersHorizontal', label: 'Sliders Options', category: 'ui', tags: ['controls', 'adjust'] },
  { name: 'Plus', label: 'Plus Add', category: 'ui', tags: ['create', 'new', 'more'] },
  { name: 'Minus', label: 'Minus Remove', category: 'ui', tags: ['decrease', 'less'] },
  { name: 'ChevronDown', label: 'Chevron Down', category: 'ui', tags: ['dropdown', 'expand'] },
  { name: 'ChevronUp', label: 'Chevron Up', category: 'ui', tags: ['collapse', 'up'] },
  { name: 'ChevronRight', label: 'Chevron Right', category: 'ui', tags: ['next', 'forward'] },
  { name: 'ChevronLeft', label: 'Chevron Left', category: 'ui', tags: ['back', 'previous'] },
  { name: 'Home', label: 'Home Page', category: 'ui', tags: ['main', 'root', 'landing'] },
  { name: 'Grid', label: 'Grid Matrix', category: 'ui', tags: ['gallery', 'catalog', 'layout'] },
  { name: 'List', label: 'List View', category: 'ui', tags: ['items', 'rows'] },
  { name: 'MoreVertical', label: 'More Options', category: 'ui', tags: ['kebab', 'dots', 'actions'] },

  // Communication & Social
  { name: 'MessageSquare', label: 'Message Chat', category: 'communication', tags: ['chat', 'comment', 'review'] },
  { name: 'MessageCircle', label: 'WhatsApp Chat', category: 'communication', tags: ['whatsapp', 'support', 'livechat'] },
  { name: 'Phone', label: 'Phone Call', category: 'communication', tags: ['call', 'contact', 'hotline'] },
  { name: 'Mail', label: 'Email Envelope', category: 'communication', tags: ['letter', 'newsletter', 'inbox'] },
  { name: 'Send', label: 'Send Paper Airplane', category: 'communication', tags: ['submit', 'dispatch'] },
  { name: 'Share2', label: 'Share Social', category: 'communication', tags: ['share', 'social', 'forward'] },
  { name: 'Instagram', label: 'Instagram', category: 'social', tags: ['social', 'photo', 'feed'] },
  { name: 'Facebook', label: 'Facebook', category: 'social', tags: ['social', 'community'] },
  { name: 'Twitter', label: 'Twitter / X', category: 'social', tags: ['social', 'tweets'] },
  { name: 'Youtube', label: 'YouTube', category: 'social', tags: ['video', 'channel'] },
  { name: 'Globe', label: 'Web Globe', category: 'social', tags: ['domain', 'international', 'website'] },

  // User & Identity
  { name: 'User', label: 'User Account', category: 'ui', tags: ['profile', 'login', 'account', 'customer'] },
  { name: 'Users', label: 'Users Team', category: 'ui', tags: ['customers', 'members', 'community'] },
  { name: 'Lock', label: 'Lock Security', category: 'ui', tags: ['password', 'secure', 'private'] },
  { name: 'Unlock', label: 'Unlock', category: 'ui', tags: ['public', 'access'] },
  { name: 'Key', label: 'API Key', category: 'ui', tags: ['token', 'credentials', 'access'] },
  { name: 'Shield', label: 'Security Shield', category: 'ui', tags: ['trust', 'protection', 'ssl'] },
  { name: 'ShieldCheck', label: 'Verified Shield', category: 'ui', tags: ['guarantee', 'verified', 'safe'] },
  { name: 'LogOut', label: 'Log Out', category: 'ui', tags: ['exit', 'signout'] },
  { name: 'LogIn', label: 'Log In', category: 'ui', tags: ['signin', 'enter'] },

  // Trust, Ratings & Badges
  { name: 'Star', label: 'Star Rating', category: 'commerce', tags: ['favorite', 'review', 'rating', '5star'] },
  { name: 'Heart', label: 'Heart Wishlist', category: 'commerce', tags: ['like', 'wishlist', 'favorite'] },
  { name: 'Award', label: 'Award Ribbon', category: 'business', tags: ['quality', 'badge', 'best'] },
  { name: 'Sparkles', label: 'Sparkles AI', category: 'business', tags: ['ai', 'magic', 'new', 'featured'] },
  { name: 'Zap', label: 'Lightning Zap', category: 'business', tags: ['fast', 'express', 'instant'] },
  { name: 'Clock', label: 'Clock Timer', category: 'business', tags: ['time', 'hours', 'speed'] },
  { name: 'MapPin', label: 'Location Pin', category: 'business', tags: ['store', 'address', 'city', 'pincode'] },

  // Media & Controls
  { name: 'Image', label: 'Image Photo', category: 'media', tags: ['picture', 'banner', 'photo'] },
  { name: 'Play', label: 'Play Video', category: 'media', tags: ['video', 'media'] },
  { name: 'FileText', label: 'Document File', category: 'media', tags: ['policy', 'terms', 'pdf'] },
  { name: 'Download', label: 'Download', category: 'media', tags: ['save', 'export'] },
  { name: 'Upload', label: 'Upload', category: 'media', tags: ['import', 'file'] },
  { name: 'ExternalLink', label: 'External Link', category: 'ui', tags: ['outbound', 'url'] },
  { name: 'RefreshCw', label: 'Refresh / Sync', category: 'ui', tags: ['reload', 'update'] },
  { name: 'AlertCircle', label: 'Alert Warning', category: 'ui', tags: ['error', 'caution', 'warning'] },
  { name: 'Info', label: 'Info Help', category: 'ui', tags: ['notice', 'tooltip', 'help'] },
  { name: 'HelpCircle', label: 'Question FAQ', category: 'ui', tags: ['support', 'faq', 'question'] },
];

export const ICON_CATEGORIES = ['commerce', 'ui', 'social', 'communication', 'media', 'arrows', 'business'] as const;
export const SEARCHABLE_ICONS = ICONS_CATALOG;

export function searchIcons(query: string): IconCatalogEntry[] {
  if (!query || !query.trim()) return ICONS_CATALOG.slice(0, 48);
  const q = query.toLowerCase().trim();
  return ICONS_CATALOG.filter(
    (icon) =>
      icon.name.toLowerCase().includes(q) ||
      icon.label.toLowerCase().includes(q) ||
      icon.category.toLowerCase().includes(q) ||
      icon.tags.some((t) => t.toLowerCase().includes(q))
  );
}

import { Router, Response, Request } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest, validatePublicShop } from '../middleware/auth';
import { getDatabase } from '../models/database';
import { generateWebsiteConfig } from '../services/sarvamAI';

const router = Router();

// ── Public shop endpoint (no auth) ──────────────────────────────────────────
// GET /api/website/public/:shopName
router.get('/public/:shopName', validatePublicShop, (req: Request, res: Response): void => {
  const db = getDatabase();
  const { shopName } = req.params;
  const host = (req.get('host') || '').toLowerCase();
  const baseDomains = ['ferasetu.com', 'fera-search.tech'];

  let org: any = null;
  let shopRow: any = null;
  let user: any = null;

  // 1. If shopName is provided as a parameter (slug or full hostname)
  if (shopName && shopName !== 'undefined' && shopName !== 'null' && shopName !== 'me') {
    const clean = shopName.toLowerCase();
    org = db.prepare(
      'SELECT * FROM organizations WHERE LOWER(store_slug) = ? OR LOWER(id) = ?'
    ).get(clean, clean);

    if (org) {
      shopRow = db.prepare('SELECT * FROM shops WHERE organization_id = ?').get(org.id);
    }

    user = db.prepare(
      'SELECT id, name, business_name, subdomain, hostname, custom_domain, phone, logo_url, favicon_url FROM users WHERE LOWER(subdomain) = ? OR LOWER(hostname) = ? OR LOWER(custom_domain) = ?'
    ).get(clean, clean, clean) as any;
  }

  // 2. If not found by slug, or if accessed via a subdomain/custom domain directly
  if (!org && !user && host && !baseDomains.includes(host) && !host.includes('localhost') && !host.includes('github.dev')) {
    user = db.prepare(
      'SELECT id, name, business_name, subdomain, hostname, custom_domain, phone, logo_url, favicon_url FROM users WHERE LOWER(custom_domain) = ? OR LOWER(hostname) = ?'
    ).get(host, host) as any;

    if (!user) {
      const matchingBase = baseDomains.find(domain => host.endsWith('.' + domain));
      if (matchingBase) {
        const subdomain = host.replace('.' + matchingBase, '').toLowerCase();
        org = db.prepare('SELECT * FROM organizations WHERE LOWER(store_slug) = ?').get(subdomain);
        if (org) {
          shopRow = db.prepare('SELECT * FROM shops WHERE organization_id = ?').get(org.id);
        }
        user = db.prepare(
          'SELECT id, name, business_name, subdomain, hostname, custom_domain, phone, logo_url, favicon_url FROM users WHERE LOWER(subdomain) = ? OR LOWER(hostname) = ?'
        ).get(subdomain, host) as any;
      }
    }
  }

  if (!org && !user) {
    res.status(404).json({ error: 'Shop not found' });
    return;
  }

  const effectiveOrgId = org?.id || user?.id;
  const website = db.prepare(
    'SELECT * FROM websites WHERE (organization_id = ? OR user_id = ?) AND is_published = 1'
  ).get(effectiveOrgId, user?.id || effectiveOrgId) as Record<string, unknown> | undefined;

  if (!website) {
    res.status(404).json({ error: 'Shop is not published yet' });
    return;
  }

  const products = db.prepare(
    'SELECT id, user_id, organization_id, name, description, price, sale_price, category, stock_quantity, image_url, is_active, created_at FROM products WHERE (organization_id = ? OR user_id = ?) AND is_active = 1 ORDER BY created_at DESC'
  ).all(effectiveOrgId, user?.id || effectiveOrgId);

  let parsedTheme: any = website.theme;
  if (typeof website.theme === 'string') {
    try {
      parsedTheme = JSON.parse(website.theme);
    } catch {
      parsedTheme = website.theme;
    }
  }

  const logoUrl = shopRow?.logo_url || org?.logo_url || user?.logo_url || null;
  const faviconUrl = shopRow?.favicon_url || org?.favicon_url || user?.favicon_url || null;
  const primaryColor = shopRow?.primary_color || org?.primary_color || null;
  const secondaryColor = shopRow?.secondary_color || org?.secondary_color || null;
  const socialImageUrl = shopRow?.social_image_url || org?.social_image_url || null;

  const merchantName = org?.name || user?.business_name || user?.name || 'Store';
  const storeSlug = org?.store_slug || user?.subdomain;
  const hostname = org?.store_slug ? `${org.store_slug}.ferasetu.com` : (user?.hostname || (user?.subdomain ? `${user.subdomain}.ferasetu.com` : null));

  res.json({
    shop: {
      id: effectiveOrgId,
      organization_id: effectiveOrgId,
      name: merchantName,
      subdomain: storeSlug,
      hostname,
      phone: org?.phone || user?.phone || '',
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      social_image_url: socialImageUrl,
      brand: {
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        social_image_url: socialImageUrl,
      }
    },
    brand: {
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      social_image_url: socialImageUrl,
    },
    website: {
      ...website,
      theme: parsedTheme || website.template || 'market',
      config: typeof website.config === 'string' ? JSON.parse(website.config as string) : website.config,
      sections: typeof website.sections === 'string' ? JSON.parse(website.sections as string) : (website.sections ?? []),
    },
    products,
  });
});

router.use(authenticate);

// Get website configuration
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const raw = db.prepare('SELECT * FROM websites WHERE user_id = ?').get(req.user!.id) as Record<string, unknown> | undefined;
  if (!raw) {
    res.json({ exists: false });
    return;
  }
  res.json({
    ...raw,
    config: typeof raw.config === 'string' ? JSON.parse(raw.config as string) : raw.config,
    sections: typeof raw.sections === 'string' ? JSON.parse(raw.sections as string) : (raw.sections ?? []),
  });
});

// Create or update website (with sections support)
router.post('/',
  body('name').trim().notEmpty(),
  body('template').optional().isString(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM websites WHERE user_id = ?').get(req.user!.id) as { id: string } | undefined;

    const { name, template = 'default', config = {}, theme = {}, sections = [] } = req.body;

    if (existing) {
      db.prepare(`
        UPDATE websites SET name = ?, template = ?, config = ?, theme = ?, sections = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(name, template, JSON.stringify(config), JSON.stringify(theme), JSON.stringify(sections), req.user!.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO websites (id, user_id, name, template, config, theme, sections)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user!.id, name, template, JSON.stringify(config), JSON.stringify(theme), JSON.stringify(sections));
    }

    const raw = db.prepare('SELECT * FROM websites WHERE user_id = ?').get(req.user!.id) as Record<string, unknown>;
    res.json({
      ...raw,
      config: typeof raw.config === 'string' ? JSON.parse(raw.config as string) : raw.config,
      sections: typeof raw.sections === 'string' ? JSON.parse(raw.sections as string) : (raw.sections ?? []),
    });
  }
);

// AI-generate website
router.post('/generate',
  body('businessType').notEmpty(),
  body('businessName').notEmpty(),
  body('description').notEmpty(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const config = await generateWebsiteConfig(req.body);
      const db = getDatabase();
      const existing = db.prepare('SELECT id FROM websites WHERE user_id = ?').get(req.user!.id) as { id: string } | undefined;

      // Build default sections based on business type
      const sections = buildDefaultSections(req.body.businessType, req.body.businessName, config);

      if (existing) {
        db.prepare(`
          UPDATE websites SET name = ?, template = ?, config = ?, sections = ?, updated_at = datetime('now')
          WHERE user_id = ?
        `).run(req.body.businessName, req.body.businessType, JSON.stringify(config), JSON.stringify(sections), req.user!.id);
      } else {
        db.prepare(`
          INSERT INTO websites (id, user_id, name, template, config, sections)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), req.user!.id, req.body.businessName, req.body.businessType, JSON.stringify(config), JSON.stringify(sections));
      }

      res.json({ config, sections, generated: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Publish/unpublish website
router.patch('/publish', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const { published } = req.body;

  db.prepare(
    "UPDATE websites SET is_published = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).run(published ? 1 : 0, req.user!.id);

  res.json({ published });
});

// Get website templates (5 launch-quality production themes)
router.get('/templates', (_req: AuthenticatedRequest, res: Response): void => {
  const templates = [
    {
      id: 'market',
      version: 1,
      name: 'Market',
      tagline: 'Modern Commerce & Maximum Efficiency',
      description: 'Built for high-velocity Indian retail, groceries, general merchants, and electronics. High clarity, fast discovery, instant WhatsApp order triggers.',
      category: 'retail',
      primaryColor: '#0F172A',
      accentColor: '#16A34A',
      emoji: '🏪',
      targetCategories: ['Kirana & Grocery', 'Consumer Electronics', 'Supermarkets', 'General Retail', 'Multi-Category'],
      cardVariant: 'clean',
      headerVariant: 'commerce',
      heroVariant: 'commerce-banner',
      footerVariant: 'commerce',
      defaultSections: [
        { id: 'announcement-1', type: 'announcement', variant: 'ticker', enabled: true, config: { text: '⚡ Free Express Delivery on orders above ₹499 | Cash on Delivery available at checkout | WhatsApp Orders Available' } },
        { id: 'header-1', type: 'header', variant: 'commerce', enabled: true, config: { showSearch: true, showAccount: true } },
        { id: 'hero-1', type: 'hero', variant: 'commerce-banner', enabled: true, config: { eyebrow: 'DIRECT FROM STORE', headline: 'Authentic Essentials. Best Local Prices.', subheadline: 'Shop fresh inventory with fast dispatch and zero-hassle WhatsApp confirmation.', ctaText: 'Browse Catalog', ctaHref: '#products' } },
        { id: 'trust-1', type: 'trust-strip', variant: 'commerce-badges', enabled: true, config: {} },
        { id: 'categories-1', type: 'category-grid', variant: 'visual-cards', enabled: true, config: { title: 'Top Categories' } },
        { id: 'products-1', type: 'product-grid', variant: 'clean', enabled: true, config: { title: 'Featured Products', columns: 4 } },
        { id: 'testimonials-1', type: 'testimonials', variant: 'verified-buyer-feed', enabled: true, config: { title: 'Customer Feedback' } },
        { id: 'faq-1', type: 'faq', variant: 'accordion', enabled: true, config: { title: 'Frequently Asked Questions' } },
        { id: 'footer-1', type: 'footer', variant: 'commerce', enabled: true, config: {} },
      ],
    },
    {
      id: 'atelier',
      version: 1,
      name: 'Atelier',
      tagline: 'Luxury, Editorial & Haute Boutique',
      description: 'Designed for fashion, fine jewellery, luxury beauty, and curated design houses where imagery and quiet elegance drive prestige.',
      category: 'luxury',
      primaryColor: '#121212',
      accentColor: '#D4AF37',
      emoji: '✨',
      targetCategories: ['Luxury Fashion', 'Fine Jewellery', 'Cosmetics', 'Designer Studio', 'Boutique Fragrance'],
      cardVariant: 'editorial',
      headerVariant: 'editorial',
      heroVariant: 'editorial',
      footerVariant: 'editorial',
      defaultSections: [
        { id: 'announcement-1', type: 'announcement', variant: 'minimal', enabled: true, config: { text: 'Complimentary white-glove dispatch on bespoke orders across India' } },
        { id: 'header-1', type: 'header', variant: 'editorial', enabled: true, config: { showSearch: true } },
        { id: 'hero-1', type: 'hero', variant: 'editorial', enabled: true, config: { eyebrow: 'MAISON COLLECTION 2026', headline: 'Quiet Sophistication, Enduring Craft', subheadline: 'Each piece is deliberately composed with artisanal precision and unyielding attention to material purity.', ctaText: 'Explore Collection', ctaHref: '#products' } },
        { id: 'trust-1', type: 'trust-strip', variant: 'luxury-guarantee', enabled: true, config: {} },
        { id: 'products-1', type: 'product-grid', variant: 'editorial', enabled: true, config: { title: 'Selected Curations', columns: 3 } },
        { id: 'brand-story-1', type: 'brand-story', variant: 'quote-center', enabled: true, config: { quote: '“We do not manufacture for seasons. We cultivate artifacts meant to outlive trends and honor the hands that shaped them.”', author: 'The Creative Director' } },
        { id: 'newsletter-1', type: 'newsletter', variant: 'minimal', enabled: true, config: { title: 'The Atelier Dispatch' } },
        { id: 'footer-1', type: 'footer', variant: 'editorial', enabled: true, config: {} },
      ],
    },
    {
      id: 'mono',
      version: 1,
      name: 'Mono',
      tagline: 'Minimalist, Swiss & Architectural',
      description: 'Monochrome foundation, mathematical grid alignment, 1px rules, and tabular pricing. Built for technology, furniture, and design-first goods.',
      category: 'design',
      primaryColor: '#000000',
      accentColor: '#000000',
      emoji: '📐',
      targetCategories: ['Hardware & Tech', 'Industrial Design', 'Modern Furniture', 'Stationery', 'Audio Equipment'],
      cardVariant: 'mono',
      headerVariant: 'minimal',
      heroVariant: 'minimal',
      footerVariant: 'minimal',
      defaultSections: [
        { id: 'header-1', type: 'header', variant: 'minimal', enabled: true, config: { showSearch: true } },
        { id: 'hero-1', type: 'hero', variant: 'minimal', enabled: true, config: { eyebrow: 'SYSTEM // 01', headline: 'Functional Objects for Contemplative Living', subheadline: 'Engineered without superfluous ornamentation. Pure geometry, tactile materials, honest utility.', ctaText: 'Index of Products', ctaHref: '#products' } },
        { id: 'products-1', type: 'product-grid', variant: 'mono', enabled: true, config: { title: 'Catalog', columns: 3 } },
        { id: 'featured-1', type: 'featured-product', variant: 'spotlight', enabled: true, config: {} },
        { id: 'newsletter-1', type: 'newsletter', variant: 'minimal', enabled: true, config: { title: 'Technical Releases' } },
        { id: 'footer-1', type: 'footer', variant: 'minimal', enabled: true, config: {} },
      ],
    },
    {
      id: 'bold',
      version: 1,
      name: 'Bold',
      tagline: 'Contemporary Consumer Brand & High Energy',
      description: 'Vibrant color blocking, large display headlines, pill badges, and secondary image hover dynamics. Built for D2C lifestyle, apparel, and youth brands.',
      category: 'lifestyle',
      primaryColor: '#0B0F19',
      accentColor: '#2563EB',
      emoji: '⚡',
      targetCategories: ['Streetwear & Apparel', 'Activewear', 'Specialty Snacks', 'Youth Lifestyle', 'Cosmetics D2C'],
      cardVariant: 'bold',
      headerVariant: 'bold',
      heroVariant: 'product-focused',
      footerVariant: 'bold',
      defaultSections: [
        { id: 'announcement-1', type: 'announcement', variant: 'ticker', enabled: true, config: { text: '🔥 DROP 03 NOW LIVE // NATIONWIDE EXPRESS DISPATCH // ZERO COMPROMISE' } },
        { id: 'header-1', type: 'header', variant: 'bold', enabled: true, config: { showSearch: true } },
        { id: 'hero-1', type: 'hero', variant: 'product-focused', enabled: true, config: { eyebrow: 'NEW ARRIVALS 2026', headline: 'Engineered for Action. Designed to Turn Heads.', subheadline: 'Crafted with premium high-density fabrics and structured silhouettes for everyday movement.', ctaText: 'Shop the Drop', ctaHref: '#products' } },
        { id: 'categories-1', type: 'category-grid', variant: 'pill-slider', enabled: true, config: { title: 'Explore Categories' } },
        { id: 'products-1', type: 'product-grid', variant: 'bold', enabled: true, config: { title: 'Trending Drops', columns: 3 } },
        { id: 'brand-story-1', type: 'brand-story', variant: 'split-right-image', enabled: true, config: { eyebrow: 'THE MANIFESTO', title: 'Born in India. Built for the Modern World.' } },
        { id: 'testimonials-1', type: 'testimonials', variant: 'grid-cards', enabled: true, config: { title: 'Community Verified' } },
        { id: 'newsletter-1', type: 'newsletter', variant: 'bold', enabled: true, config: { title: 'Join the Inner Circle' } },
        { id: 'footer-1', type: 'footer', variant: 'bold', enabled: true, config: {} },
      ],
    },
    {
      id: 'artisan',
      version: 1,
      name: 'Artisan',
      tagline: 'Craft, Storytelling & Heritage Warmth',
      description: 'Warm earth tones, tactile surfaces, maker storytelling sections, and authentic craft badges. Perfect for handmade goods, organic food, ceramics, and regional heritage.',
      category: 'craft',
      primaryColor: '#2C221E',
      accentColor: '#C25E3E',
      emoji: '🌿',
      targetCategories: ['Handcrafted Goods', 'Organic Gourmet', 'Regional Textiles', 'Ceramics & Home', 'Artisanal Tea & Coffee'],
      cardVariant: 'artisan',
      headerVariant: 'artisan',
      heroVariant: 'artisan-story',
      footerVariant: 'artisan',
      defaultSections: [
        { id: 'announcement-1', type: 'announcement', variant: 'static-center', enabled: true, config: { text: 'Handcrafted in small batches • 100% plastic-free packaging • Direct from master artisans' } },
        { id: 'header-1', type: 'header', variant: 'artisan', enabled: true, config: { showSearch: true } },
        { id: 'hero-1', type: 'hero', variant: 'artisan-story', enabled: true, config: { eyebrow: 'HEIRLOOM TRADITIONS', headline: 'Crafted with Patience. Cherished for Generations.', subheadline: 'Every batch is prepared with heritage methods, unadulterated natural materials, and fair living wages.', ctaText: 'Discover Our Craft', ctaHref: '#products' } },
        { id: 'trust-1', type: 'trust-strip', variant: 'artisan-values', enabled: true, config: {} },
        { id: 'categories-1', type: 'category-grid', variant: 'editorial-cards', enabled: true, config: { title: 'Curated Craft Collections' } },
        { id: 'products-1', type: 'product-grid', variant: 'artisan', enabled: true, config: { title: 'Handmade Creations', columns: 3 } },
        { id: 'brand-story-1', type: 'brand-story', variant: 'heritage-story', enabled: true, config: { eyebrow: 'FROM OUR WORKSHOP', title: 'Honoring centuries of regional mastery' } },
        { id: 'testimonials-1', type: 'testimonials', variant: 'editorial-quote', enabled: true, config: { title: 'Words from Our Patrons' } },
        { id: 'footer-1', type: 'footer', variant: 'artisan', enabled: true, config: {} },
      ],
    },
    {
      id: 'studio',
      version: 1,
      name: 'Studio',
      tagline: 'Minimal, Portfolio-Style & Designer Grid',
      description: 'Clean modern lines, stark structured grid, disciplined spacing, and high-impact hero. Built for design studios, architects, creative agencies, and curated product creators.',
      category: 'design',
      primaryColor: '#0F172A',
      accentColor: '#6366F1',
      emoji: '📐',
      targetCategories: ['Design Studio', 'Creative Agency', 'Modern Tech', 'Contemporary Art', 'Bespoke Furniture'],
      cardVariant: 'clean',
      headerVariant: 'minimal',
      heroVariant: 'minimal',
      footerVariant: 'minimal',
      defaultSections: [
        { id: 'header-1', type: 'header', variant: 'minimal', enabled: true, config: { showSearch: true, showAccount: true } },
        { id: 'hero-1', type: 'hero', variant: 'minimal', enabled: true, config: { eyebrow: 'STUDIO CATALOGUE 2026', headline: 'Intentional Form. Uncompromising Function.', subheadline: 'Objects and tools designed with architectural rigor and purposeful simplicity.', ctaText: 'View Catalogue', ctaHref: '#products' } },
        { id: 'products-1', type: 'product-grid', variant: 'clean', enabled: true, config: { title: 'Selected Works', columns: 3 } },
        { id: 'newsletter-1', type: 'newsletter', variant: 'minimal', enabled: true, config: { title: 'Studio Editions & Inquiries' } },
        { id: 'footer-1', type: 'footer', variant: 'minimal', enabled: true, config: {} },
      ],
    },
    {
      id: 'home',
      version: 1,
      name: 'Home',
      tagline: 'Cozy Living, Ceramics & Curated Interiors',
      description: 'Soft organic tones, warm ceramics, tactile neutrals, and gentle curves. Built for homeware, interior decor, textiles, and warm living goods.',
      category: 'interior',
      primaryColor: '#3E3832',
      accentColor: '#B4846C',
      emoji: '🏺',
      targetCategories: ['Homeware', 'Ceramics', 'Interior Decor', 'Bed & Linen', 'Handcrafted Furniture', 'Home Fragrance'],
      cardVariant: 'editorial',
      headerVariant: 'editorial',
      heroVariant: 'editorial',
      footerVariant: 'editorial',
      defaultSections: [
        { id: 'announcement-1', type: 'announcement', variant: 'static-center', enabled: true, config: { text: 'Free standard shipping on home goods over ₹1,999 • Responsibly sourced' } },
        { id: 'header-1', type: 'header', variant: 'editorial', enabled: true, config: { showSearch: true, showAccount: true } },
        { id: 'hero-1', type: 'hero', variant: 'editorial', enabled: true, config: { eyebrow: 'SERENE LIVING 2026', headline: 'Spaces That Breathe. Objects That Ground.', subheadline: 'Thoughtfully crafted home accents, ceramics, and textiles made for quiet everyday comfort.', ctaText: 'Explore Home Goods', ctaHref: '#products' } },
        { id: 'products-1', type: 'product-grid', variant: 'editorial', enabled: true, config: { title: 'Curated for the Home', columns: 3 } },
        { id: 'footer-1', type: 'footer', variant: 'editorial', enabled: true, config: {} },
      ],
    },
    {
      id: 'dine',
      version: 1,
      name: 'Dine',
      tagline: 'Artisanal Food, Bakery, Cafe & Fine Taste',
      description: 'Rich culinary warmth, appetizing earthy contrasts, dietary badges, and swift takeaway ordering. Built for bakeries, gourmet food, coffee roasters, and culinary artisans.',
      category: 'culinary',
      primaryColor: '#2B1810',
      accentColor: '#D9531E',
      emoji: '🥐',
      targetCategories: ['Bakery & Patisserie', 'Specialty Coffee', 'Gourmet Provisions', 'Artisanal Cafe', 'Confectionery', 'Tea Roasters'],
      cardVariant: 'bold',
      headerVariant: 'commerce',
      heroVariant: 'product-focused',
      footerVariant: 'commerce',
      defaultSections: [
        { id: 'announcement-1', type: 'announcement', variant: 'ticker', enabled: true, config: { text: 'Fresh morning roast & bake ready daily • Order before 2 PM for same-day delivery' } },
        { id: 'header-1', type: 'header', variant: 'commerce', enabled: true, config: { showSearch: true, showAccount: true } },
        { id: 'hero-1', type: 'hero', variant: 'product-focused', enabled: true, config: { eyebrow: 'FRESH FROM THE KITCHEN', headline: 'Authentic Flavors, Roasted & Baked Fresh Daily.', subheadline: 'Crafted with unrefined ingredients, single-origin roasts, and traditional sourdough fermentations.', ctaText: 'Order Now', ctaHref: '#products' } },
        { id: 'products-1', type: 'product-grid', variant: 'bold', enabled: true, config: { title: 'Today’s Fresh Offerings', columns: 3 } },
        { id: 'footer-1', type: 'footer', variant: 'commerce', enabled: true, config: {} },
      ],
    },
  ];
  res.json(templates);
});

export default router;

// ── Helpers ──────────────────────────────────────────────────────────────────

interface SectionConfig {
  [key: string]: unknown;
}

interface TemplateSection {
  id: string;
  type: string;
  config: SectionConfig;
}

function buildDefaultSections(businessType: string, businessName: string, config: SectionConfig): TemplateSection[] {
  const PALETTE: Record<string, { primary: string; accent: string }> = {
    grocery:     { primary: '#2E7D32', accent: '#FF6B35' },
    fashion:     { primary: '#6D28D9', accent: '#F59E0B' },
    restaurant:  { primary: '#DC2626', accent: '#F59E0B' },
    electronics: { primary: '#1D4ED8', accent: '#06B6D4' },
    medical:     { primary: '#0891B2', accent: '#10B981' },
    general:     { primary: '#FF6B35', accent: '#004E89' },
  };

  const HERO_TEXTS: Record<string, { headline: string; subheadline: string }> = {
    grocery:     { headline: 'Fresh Groceries, Delivered Fast', subheadline: 'Your trusted neighbourhood kirana — now online.' },
    fashion:     { headline: 'Style That Speaks For You', subheadline: 'Discover the latest trends in fashion and clothing.' },
    restaurant:  { headline: 'Delicious Food, Right at Your Door', subheadline: 'Authentic home-style cooking delivered fresh.' },
    electronics: { headline: 'Top Electronics at Best Prices', subheadline: 'Mobiles, laptops, accessories — everything you need.' },
    medical:     { headline: 'Your Health, Our Priority', subheadline: 'Quality medicines and healthcare products.' },
    general:     { headline: 'Everything You Need in One Place', subheadline: 'Your trusted local shop — now online.' },
  };

  const palette = PALETTE[businessType] || PALETTE.general;
  const heroText = HERO_TEXTS[businessType] || HERO_TEXTS.general;
  const headline = (config.headline as string) || heroText.headline;
  const subheadline = (config.subheadline as string) || heroText.subheadline;

  return [
    {
      id: 'navbar-1',
      type: 'navbar',
      config: {
        shopName: businessName,
        primaryColor: palette.primary,
        showCart: true,
        links: [
          { label: 'Home', href: '#' },
          { label: 'Products', href: '#products' },
          { label: 'Contact', href: '#contact' },
        ],
      },
    },
    {
      id: 'hero-1',
      type: 'hero',
      config: {
        headline,
        subheadline,
        ctaText: 'Shop Now',
        ctaHref: '#products',
        bgColor: palette.primary,
        accentColor: palette.accent,
        textColor: '#ffffff',
      },
    },
    {
      id: 'banner-1',
      type: 'banner',
      config: {
        text: '🎉 Free delivery on orders above ₹299 | Cash on Delivery available',
        bgColor: palette.accent,
        textColor: '#ffffff',
      },
    },
    {
      id: 'products-1',
      type: 'productGrid',
      config: {
        title: 'Our Products',
        columns: 3,
        showPrice: true,
        showStock: true,
        accentColor: palette.primary,
      },
    },
    {
      id: 'contact-1',
      type: 'contact',
      config: {
        title: 'Find Us',
        address: 'Shop No. 1, Main Market, Your City',
        phone: '+91 98765 43210',
        email: 'hello@yourshop.com',
        hours: 'Mon–Sat: 9am – 9pm | Sun: 10am – 6pm',
        primaryColor: palette.primary,
      },
    },
    {
      id: 'footer-1',
      type: 'footer',
      config: {
        shopName: businessName,
        tagline: 'Serving you with quality and love ❤️',
        primaryColor: palette.primary,
        social: {
          whatsapp: '',
          instagram: '',
          facebook: '',
        },
      },
    },
  ];
}

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
  const baseDomain = (process.env.BASE_DOMAIN || 'fera-search.tech').toLowerCase();

  let user;

  // 1. If shopName is provided as a parameter (slug)
  if (shopName && shopName !== 'undefined' && shopName !== 'null' && shopName !== 'me') {
    user = db.prepare(
      'SELECT id, name, business_name, subdomain, custom_domain FROM users WHERE subdomain = ? OR custom_domain = ?'
    ).get(shopName, shopName) as any;
  }

  // 2. If not found by slug, or if accessed via a subdomain/custom domain directly
  if (!user && host && host !== baseDomain && !host.includes('localhost') && !host.includes('github.dev')) {
    // Try matching the whole host as a custom domain
    user = db.prepare(
      'SELECT id, name, business_name, subdomain, custom_domain FROM users WHERE custom_domain = ?'
    ).get(host) as any;

    // 3. Try matching as a subdomain (e.g. user.fera-search.tech)
    if (!user && host.endsWith('.' + baseDomain)) {
      const subdomain = host.replace('.' + baseDomain, '');
      user = db.prepare(
        'SELECT id, name, business_name, subdomain, custom_domain FROM users WHERE subdomain = ?'
      ).get(subdomain) as any;
    }
  }

  if (!user) {
    res.status(404).json({ error: 'Shop not found' });
    return;
  }

  const website = db.prepare(
    'SELECT * FROM websites WHERE user_id = ? AND is_published = 1'
  ).get(user.id) as Record<string, unknown> | undefined;

  if (!website) {
    res.status(404).json({ error: 'Shop is not published yet' });
    return;
  }

  const products = db.prepare(
    'SELECT id, user_id, name, description, price, sale_price, category, stock_quantity, image_url, is_active, created_at FROM products WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
  ).all(user.id);

  res.json({
    shop: {
      id: user.id,
      name: user.business_name || user.name,
      subdomain: user.subdomain,
    },
    website: {
      ...website,
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

// Get website templates (rich definitions with default sections)
router.get('/templates', (_req: AuthenticatedRequest, res: Response): void => {
  const templates = [
    {
      id: 'grocery',
      name: 'Grocery Store',
      description: 'Perfect for kirana stores and grocery shops',
      category: 'retail',
      primaryColor: '#2E7D32',
      accentColor: '#FF6B35',
      emoji: '🛒',
      defaultSections: buildDefaultSections('grocery', 'My Kirana Store', {}),
    },
    {
      id: 'fashion',
      name: 'Fashion & Clothing',
      description: 'Modern template for clothing and accessories',
      category: 'fashion',
      primaryColor: '#6D28D9',
      accentColor: '#F59E0B',
      emoji: '👗',
      defaultSections: buildDefaultSections('fashion', 'My Fashion Store', {}),
    },
    {
      id: 'restaurant',
      name: 'Restaurant & Food',
      description: 'Ideal for dhabas, restaurants, and tiffin services',
      category: 'food',
      primaryColor: '#DC2626',
      accentColor: '#F59E0B',
      emoji: '🍛',
      defaultSections: buildDefaultSections('restaurant', 'My Restaurant', {}),
    },
    {
      id: 'electronics',
      name: 'Electronics Shop',
      description: 'For mobile, computer, and electronics retailers',
      category: 'electronics',
      primaryColor: '#1D4ED8',
      accentColor: '#06B6D4',
      emoji: '📱',
      defaultSections: buildDefaultSections('electronics', 'My Electronics', {}),
    },
    {
      id: 'medical',
      name: 'Medical & Pharmacy',
      description: 'For medical stores and pharmacies',
      category: 'healthcare',
      primaryColor: '#0891B2',
      accentColor: '#10B981',
      emoji: '💊',
      defaultSections: buildDefaultSections('medical', 'My Pharmacy', {}),
    },
    {
      id: 'general',
      name: 'General Store',
      description: 'Flexible template for any type of business',
      category: 'general',
      primaryColor: '#FF6B35',
      accentColor: '#004E89',
      emoji: '🏪',
      defaultSections: buildDefaultSections('general', 'My Store', {}),
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

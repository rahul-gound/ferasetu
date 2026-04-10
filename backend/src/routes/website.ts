import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';
import { generateWebsiteConfig } from '../services/sarvamAI';

const router = Router();
router.use(authenticate);

// Get website configuration
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const website = db.prepare('SELECT * FROM websites WHERE user_id = ?').get(req.user!.id);
  if (!website) {
    res.json({ exists: false });
    return;
  }
  res.json(website);
});

// Create or update website
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

    const { name, template = 'default', config = {}, theme = {} } = req.body;

    if (existing) {
      db.prepare(`
        UPDATE websites SET name = ?, template = ?, config = ?, theme = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(name, template, JSON.stringify(config), JSON.stringify(theme), req.user!.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO websites (id, user_id, name, template, config, theme)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, req.user!.id, name, template, JSON.stringify(config), JSON.stringify(theme));
    }

    const website = db.prepare('SELECT * FROM websites WHERE user_id = ?').get(req.user!.id);
    res.json(website);
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

      if (existing) {
        db.prepare(`
          UPDATE websites SET name = ?, config = ?, updated_at = datetime('now')
          WHERE user_id = ?
        `).run(req.body.businessName, JSON.stringify(config), req.user!.id);
      } else {
        db.prepare(`
          INSERT INTO websites (id, user_id, name, template, config)
          VALUES (?, ?, ?, ?, ?)
        `).run(uuidv4(), req.user!.id, req.body.businessName, 'ai-generated', JSON.stringify(config));
      }

      res.json({ config, generated: true });
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

// Get website templates
router.get('/templates', (_req: AuthenticatedRequest, res: Response): void => {
  const templates = [
    {
      id: 'grocery',
      name: 'Grocery Store',
      description: 'Perfect for kirana stores and grocery shops',
      thumbnail: '/templates/grocery.png',
      category: 'retail'
    },
    {
      id: 'fashion',
      name: 'Fashion & Clothing',
      description: 'Modern template for clothing and accessories',
      thumbnail: '/templates/fashion.png',
      category: 'fashion'
    },
    {
      id: 'restaurant',
      name: 'Restaurant & Food',
      description: 'Ideal for dhabas, restaurants, and tiffin services',
      thumbnail: '/templates/restaurant.png',
      category: 'food'
    },
    {
      id: 'electronics',
      name: 'Electronics Shop',
      description: 'For mobile, computer, and electronics retailers',
      thumbnail: '/templates/electronics.png',
      category: 'electronics'
    },
    {
      id: 'medical',
      name: 'Medical & Pharmacy',
      description: 'For medical stores and pharmacies',
      thumbnail: '/templates/medical.png',
      category: 'healthcare'
    },
    {
      id: 'general',
      name: 'General Store',
      description: 'Flexible template for any type of business',
      thumbnail: '/templates/general.png',
      category: 'general'
    }
  ];
  res.json(templates);
});

export default router;

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../models/database';
import { adminOnly, AdminRequest } from '../middleware/adminAuth';

const router = Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    return 'dev-only-' + (process.env.DEV_JWT_SECRET || 'dev-secret-ferasetu-2026');
  }
  return secret;
}

// Initial curated announcements & platform updates for shopkeepers
const INITIAL_ANNOUNCEMENTS = [
  {
    title: 'Visual Storefront Builder is live',
    content: 'Design your online shop directly from your phone or computer. Arrange product displays, customize your banner, and adjust store colors with instant live previews.',
    category: 'feature',
    badge_label: 'New Feature',
    action_url: '/website-builder',
    action_label: 'Open Store Builder',
    target_plan: 'all',
    is_pinned: 1,
    is_active: 1,
  },
  {
    title: 'WhatsApp 1-Click checkout for your customers',
    content: 'Customers can now tap one button on your web storefront to send their full order with delivery details directly to your WhatsApp. Keep your personal customer connection with zero intermediaries.',
    category: 'feature',
    badge_label: 'Top Feature',
    action_url: '/orders',
    action_label: 'View Orders',
    target_plan: 'all',
    is_pinned: 0,
    is_active: 1,
  },
  {
    title: "A note from FeraSetu: 0% marketplace commission always",
    content: 'FeraSetu was built to protect local shopkeepers. We never take a percentage of your sales. 100% of customer payments go directly to your UPI or bank account.',
    category: 'message',
    badge_label: 'From FeraSetu',
    action_url: '/dashboard',
    action_label: 'Go to Dashboard',
    target_plan: 'all',
    is_pinned: 1,
    is_active: 1,
  },
  {
    title: 'Run your shop in your customer’s native language',
    content: 'Your storefront now supports 48 Indic languages including Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, and Punjabi. Buyers can shop comfortably in their preferred language.',
    category: 'update',
    badge_label: 'Platform Update',
    action_url: '/products',
    action_label: 'View Products',
    target_plan: 'all',
    is_pinned: 0,
    is_active: 1,
  },
  {
    title: 'Fera AI drafts product titles & details in seconds',
    content: 'Add new items to your catalog in seconds. Take a quick photo or type a short item name, and Fera AI generates ready-to-sell titles, descriptions, and regional tags.',
    category: 'feature',
    badge_label: 'Fera AI',
    action_url: '/ferasetu-ai',
    action_label: 'Try Fera AI',
    target_plan: 'all',
    is_pinned: 0,
    is_active: 1,
  },
  {
    title: 'Connect your own custom shop web address',
    content: 'You can now link your own custom domain (e.g., yourstore.com or yourbrand.in) to your FeraSetu shop with automatic HTTPS encryption and mail-safe DNS record protection.',
    category: 'update',
    badge_label: 'Domain Upgrade',
    action_url: '/settings/email',
    action_label: 'Manage Domains',
    target_plan: 'all',
    is_pinned: 0,
    is_active: 1,
  },
];

function seedAnnouncementsIfEmpty(db: any) {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM announcements').get() as any;
    if (!row || Number(row.count) === 0) {
      console.log('📢 Seeding initial curated FeraSetu updates & messages...');
      const insertStmt = db.prepare(`
        INSERT INTO announcements (
          id, title, content, category, badge_label, action_url, action_label, target_plan, is_pinned, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
      `);
      
      // Stagger timestamps so order is crisp and realistic
      INITIAL_ANNOUNCEMENTS.forEach((ann, idx) => {
        const offsetMinutes = `-${idx * 15} minutes`;
        insertStmt.run(
          uuidv4(),
          ann.title,
          ann.content,
          ann.category,
          ann.badge_label,
          ann.action_url,
          ann.action_label,
          ann.target_plan,
          ann.is_pinned,
          ann.is_active,
          offsetMinutes
        );
      });
      console.log(`✅ Seeded ${INITIAL_ANNOUNCEMENTS.length} initial FeraSetu announcements`);
    }
  } catch (err: any) {
    console.warn('Could not seed announcements:', err?.message || err);
  }
}

/**
 * GET /api/announcements
 * Public/Merchant endpoint to fetch active updates, new features, and messages from FeraSetu.
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDatabase();
    seedAnnouncementsIfEmpty(db);

    // Optional plan extraction from Bearer token if provided
    let userPlan = 'free';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, getJwtSecret()) as any;
        if (decoded?.plan) userPlan = decoded.plan;
      } catch {
        // Fallback to free plan visibility
      }
    }

    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

    let query = `
      SELECT 
        id, title, content, 
        COALESCE(category, 'feature') as category,
        COALESCE(badge_label, 'Update') as badge_label,
        action_url, action_label,
        target_plan,
        COALESCE(is_pinned, 0) as is_pinned,
        is_active,
        created_at
      FROM announcements
      WHERE is_active = 1
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        AND (target_plan = 'all' OR target_plan = ? OR target_plan IS NULL)
    `;
    const params: any[] = [userPlan];

    if (category && category !== 'all') {
      query += ` AND category = ? `;
      params.push(category);
    }

    query += ` ORDER BY is_pinned DESC, created_at DESC LIMIT ? `;
    params.push(limit);

    const announcements = db.prepare(query).all(...params);

    res.json({
      success: true,
      announcements: announcements || [],
      count: (announcements || []).length,
    });
  } catch (err: any) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: 'Failed to load updates & announcements' });
  }
});

/**
 * GET /api/announcements/admin
 * Admin view of all announcements (active & inactive)
 */
router.get('/admin', adminOnly, (req: AdminRequest, res: Response): void => {
  try {
    const db = getDatabase();
    seedAnnouncementsIfEmpty(db);
    const announcements = db.prepare(`
      SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC
    `).all();
    res.json({ success: true, announcements });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/announcements/admin
 * Admin create a new update or message from FeraSetu
 */
router.post('/admin', adminOnly, (req: AdminRequest, res: Response): void => {
  try {
    const {
      title,
      content,
      category = 'feature',
      badge_label = 'New Feature',
      action_url,
      action_label,
      target_plan = 'all',
      is_pinned = 0,
      expires_at = null,
    } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO announcements (
        id, title, content, category, badge_label, action_url, action_label, target_plan, is_pinned, is_active, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
    `).run(
      id,
      title.trim(),
      content.trim(),
      category,
      badge_label,
      action_url || null,
      action_label || null,
      target_plan,
      is_pinned ? 1 : 0,
      expires_at || null
    );

    const created = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
    res.status(201).json({ success: true, announcement: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/announcements/admin/:id
 * Toggle status or update announcement
 */
router.patch('/admin/:id', adminOnly, (req: AdminRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const { is_active, is_pinned } = req.body;

    if (is_active !== undefined) {
      db.prepare('UPDATE announcements SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, req.params.id);
    }
    if (is_pinned !== undefined) {
      db.prepare('UPDATE announcements SET is_pinned = ? WHERE id = ?').run(is_pinned ? 1 : 0, req.params.id);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/announcements/admin/:id
 */
router.delete('/admin/:id', adminOnly, (req: AdminRequest, res: Response): void => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

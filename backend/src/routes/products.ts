import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';

const router = Router();
router.use(authenticate);

// Setup multer for image uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF allowed.'));
    }
  }
});

// Get all products
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const { category, search, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 100);
  const offset = (pageNum - 1) * limitNum;

  let query = 'SELECT * FROM products WHERE user_id = ?';
  const params: unknown[] = [req.user!.id];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = (db.prepare(query.replace('SELECT *', 'SELECT COUNT(*)')).get(...params) as { 'COUNT(*)': number })['COUNT(*)'];
  const products = db.prepare(`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limitNum, offset);

  res.json({ products, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
});

// Get single product
router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(product);
});

// Create product
router.post('/',
  upload.single('image'),
  body('name').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('stock_quantity').optional().isInt({ min: 0 }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const db = getDatabase();

    // Check free tier product limit
    if (req.user!.plan === 'free') {
      const maxProducts = parseInt(process.env.FREE_TIER_MAX_PRODUCTS || '50');
      const count = (db.prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?').get(req.user!.id) as { count: number }).count;
      if (count >= maxProducts) {
        res.status(403).json({
          error: `Free plan allows up to ${maxProducts} products. Upgrade to Premium for unlimited products.`,
          upgradeRequired: true
        });
        return;
      }
    }

    const id = uuidv4();
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const { name, description, price, sale_price, category, stock_quantity = 0, is_active = 1 } = req.body;

    db.prepare(`
      INSERT INTO products (id, user_id, name, description, price, sale_price, category, stock_quantity, image_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user!.id, name, description || null, parseFloat(price), sale_price ? parseFloat(sale_price) : null, category || null, parseInt(stock_quantity), imageUrl, is_active ? 1 : 0);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json(product);
  }
);

// Update product
router.put('/:id',
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    const updatable = ['name', 'description', 'price', 'sale_price', 'category', 'stock_quantity', 'is_active'];
    for (const field of updatable) {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = ?`);
        let value = req.body[field];
        if (field === 'is_active') value = value ? 1 : 0;
        values.push(value);
      }
    }

    if (req.file) {
      fields.push('image_url = ?');
      values.push(`/uploads/${req.file.filename}`);
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    fields.push("updated_at = datetime('now')");
    values.push(req.params.id, req.user!.id);

    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  }
);

// Delete product
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  console.log(`🗑️ Attempting to delete product ${req.params.id} for user ${req.user!.id}`);
  
  const result = db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  console.log(`📊 Delete result:`, result);

  if (result.changes === 0) {
    console.warn(`⚠️ Product ${req.params.id} not found or doesn't belong to user ${req.user!.id}`);
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json({ success: true });
});

// Upload product image
router.post('/:id/image', upload.single('image'), (req: AuthenticatedRequest, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No image provided' });
    return;
  }
  const db = getDatabase();
  const imageUrl = `/uploads/${req.file.filename}`;
  db.prepare("UPDATE products SET image_url = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(imageUrl, req.params.id, req.user!.id);
  res.json({ imageUrl });
});

export default router;

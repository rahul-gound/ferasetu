import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';
import { uploadProductImage, deleteProductImage, isValidImageUrl } from '../services/storageService';

const router = Router();
router.use(authenticate);

// Configure multer with memory storage so files are streamed directly to Appwrite Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10) },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF allowed.'));
    }
  }
});

// Safe numerical parsing helpers
function safeFloat(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeInt(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

// Get all products (tenant isolated)
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const { category, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit as string, 10) || 20), 100);
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

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countQuery).get(...params) as { total?: number } | undefined;
    const total = totalRow?.total || 0;

    const products = db.prepare(`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limitNum, offset);

    res.json({
      products: Array.isArray(products) ? products : [],
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1
    });
  } catch (err: any) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// Get single product (tenant isolated)
router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err: any) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Failed to retrieve product' });
  }
});

// Create product (supports JSON and multipart/form-data)
router.post('/',
  upload.single('image'),
  body('name').trim().notEmpty().withMessage('Product name is required'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let uploadedFileId: string | null = null;
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, description, category } = req.body;

      const price = safeFloat(req.body.price);
      if (price === null || price < 0) {
        res.status(422).json({ error: 'Price must be a valid non-negative number' });
        return;
      }

      const costPrice = safeFloat(req.body.cost_price ?? req.body.costPrice);
      if (costPrice !== null && costPrice < 0) {
        res.status(422).json({ error: 'Cost price cannot be negative' });
        return;
      }

      const salePrice = safeFloat(req.body.sale_price ?? req.body.salePrice);
      if (salePrice !== null && salePrice < 0) {
        res.status(422).json({ error: 'Sale price cannot be negative' });
        return;
      }

      const stockQuantity = safeInt(req.body.stock_quantity ?? req.body.stockQuantity ?? req.body.stock, 0);
      if (stockQuantity < 0) {
        res.status(422).json({ error: 'Stock quantity cannot be negative' });
        return;
      }

      const isActive = req.body.is_active !== undefined
        ? (req.body.is_active === true || req.body.is_active === 'true' || req.body.is_active === 1 || req.body.is_active === '1' ? 1 : 0)
        : 1;

      // Handle Appwrite Storage Image URL or Upload
      let imageUrl: string | null = null;
      if (req.file) {
        const uploadResult = await uploadProductImage(req.file);
        uploadedFileId = uploadResult.fileId;
        imageUrl = uploadResult.url;
      } else {
        const candidateUrl = req.body.image_url || req.body.imageUrl;
        if (typeof candidateUrl === 'string' && candidateUrl.trim()) {
          if (!isValidImageUrl(candidateUrl)) {
            res.status(422).json({ error: 'Invalid image URL format. Only HTTP/HTTPS URLs are allowed.' });
            return;
          }
          imageUrl = candidateUrl.trim();
        }
      }

      const db = getDatabase();

      // Check product plan limits
      const PLAN_LIMITS: Record<string, number> = {
        free: 25,
        beta: 25,
        trial: 25,
        basic: 500,
        starter: 500,
        standard: 500,
        growth: 500,
        business: 500,
        pro: Infinity,
        premium: Infinity,
        scale: Infinity,
        enterprise: Infinity,
      };

      const userPlan = (req.user?.plan || 'free').toLowerCase().trim();
      const limit = PLAN_LIMITS[userPlan] !== undefined ? PLAN_LIMITS[userPlan] : 25;

      if (limit !== Infinity) {
        const countRow = db.prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?').get(req.user!.id) as { count?: number } | undefined;
        const count = countRow?.count || 0;
        if (count >= limit) {
          if (uploadedFileId) await deleteProductImage(uploadedFileId);
          res.status(403).json({
            error: `${userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} plan allows up to ${limit} products. Upgrade your plan for more.`,
            code: 'PRODUCT_LIMIT_REACHED',
            limit,
            current: count,
            plan: userPlan,
            upgradeRequired: true
          });
          return;
        }
      }

      const id = uuidv4();
      db.prepare(`
        INSERT INTO products (id, user_id, name, description, cost_price, price, sale_price, category, stock_quantity, image_url, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        id,
        req.user!.id,
        name.trim(),
        description ? String(description).trim() : null,
        costPrice,
        price,
        salePrice,
        category ? String(category).trim() : null,
        stockQuantity,
        imageUrl,
        isActive
      );

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      res.status(201).json(product);
    } catch (error: any) {
      // Transaction Safety: Clean up orphaned uploaded file if D1 insert failed
      if (uploadedFileId) {
        await deleteProductImage(uploadedFileId);
      }
      console.error('Product creation error:', error);
      res.status(500).json({ error: error.message || 'Failed to create product' });
    }
  }
);

// Update product
router.put('/:id',
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let uploadedFileId: string | null = null;
    try {
      const db = getDatabase();
      const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
      if (!existing) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const fields: string[] = [];
      const values: unknown[] = [];

      if (req.body.name !== undefined) {
        if (!String(req.body.name).trim()) {
          res.status(422).json({ error: 'Product name cannot be empty' });
          return;
        }
        fields.push('name = ?');
        values.push(String(req.body.name).trim());
      }

      if (req.body.description !== undefined) {
        fields.push('description = ?');
        values.push(req.body.description ? String(req.body.description).trim() : null);
      }

      if (req.body.category !== undefined) {
        fields.push('category = ?');
        values.push(req.body.category ? String(req.body.category).trim() : null);
      }

      if (req.body.price !== undefined) {
        const price = safeFloat(req.body.price);
        if (price === null || price < 0) {
          res.status(422).json({ error: 'Price must be a valid non-negative number' });
          return;
        }
        fields.push('price = ?');
        values.push(price);
      }

      if (req.body.cost_price !== undefined || req.body.costPrice !== undefined) {
        const costPrice = safeFloat(req.body.cost_price ?? req.body.costPrice);
        if (costPrice !== null && costPrice < 0) {
          res.status(422).json({ error: 'Cost price cannot be negative' });
          return;
        }
        fields.push('cost_price = ?');
        values.push(costPrice);
      }

      if (req.body.sale_price !== undefined || req.body.salePrice !== undefined) {
        const salePrice = safeFloat(req.body.sale_price ?? req.body.salePrice);
        if (salePrice !== null && salePrice < 0) {
          res.status(422).json({ error: 'Sale price cannot be negative' });
          return;
        }
        fields.push('sale_price = ?');
        values.push(salePrice);
      }

      if (req.body.stock_quantity !== undefined || req.body.stockQuantity !== undefined || req.body.stock !== undefined) {
        const stockQuantity = safeInt(req.body.stock_quantity ?? req.body.stockQuantity ?? req.body.stock, 0);
        if (stockQuantity < 0) {
          res.status(422).json({ error: 'Stock quantity cannot be negative' });
          return;
        }
        fields.push('stock_quantity = ?');
        values.push(stockQuantity);
      }

      if (req.body.is_active !== undefined) {
        const isActive = (req.body.is_active === true || req.body.is_active === 'true' || req.body.is_active === 1 || req.body.is_active === '1') ? 1 : 0;
        fields.push('is_active = ?');
        values.push(isActive);
      }

      // Handle image update: either uploaded file or Appwrite/HTTPS URL
      if (req.file) {
        const uploadResult = await uploadProductImage(req.file);
        uploadedFileId = uploadResult.fileId;
        fields.push('image_url = ?');
        values.push(uploadResult.url);
      } else {
        const candidateUrl = req.body.image_url || req.body.imageUrl;
        if (candidateUrl !== undefined) {
          if (candidateUrl && !isValidImageUrl(candidateUrl)) {
            res.status(422).json({ error: 'Invalid image URL format. Only HTTP/HTTPS URLs are allowed.' });
            return;
          }
          fields.push('image_url = ?');
          values.push(candidateUrl ? String(candidateUrl).trim() : null);
        }
      }

      if (fields.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      fields.push("updated_at = datetime('now')");
      values.push(req.params.id, req.user!.id);

      db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (error: any) {
      if (uploadedFileId) await deleteProductImage(uploadedFileId);
      console.error('Product update error:', error);
      res.status(500).json({ error: error.message || 'Failed to update product' });
    }
  }
);

// Delete product
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Product delete error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Upload product image directly
router.post('/:id/image', upload.single('image'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No image provided' });
    return;
  }
  try {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const { url } = await uploadProductImage(req.file);
    db.prepare("UPDATE products SET image_url = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(url, req.params.id, req.user!.id);
    res.json({ imageUrl: url });
  } catch (err: any) {
    console.error('Product image upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
});

export default router;

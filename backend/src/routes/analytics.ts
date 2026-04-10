import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requirePremium } from '../middleware/auth';
import { getDatabase } from '../models/database';
import { predictSales } from '../services/sarvamAI';

const router = Router();
router.use(authenticate);

// Get dashboard summary
router.get('/dashboard', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const userId = req.user!.id;

  const totalRevenue = (db.prepare(`
    SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE user_id = ? AND status != 'cancelled'
  `).get(userId) as { revenue: number }).revenue;

  const totalOrders = (db.prepare(
    'SELECT COUNT(*) as count FROM orders WHERE user_id = ?'
  ).get(userId) as { count: number }).count;

  const pendingOrders = (db.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'pending'"
  ).get(userId) as { count: number }).count;

  const totalProducts = (db.prepare(
    'SELECT COUNT(*) as count FROM products WHERE user_id = ?'
  ).get(userId) as { count: number }).count;

  const lowStockProducts = (db.prepare(
    'SELECT COUNT(*) as count FROM products WHERE user_id = ? AND stock_quantity < 5 AND is_active = 1'
  ).get(userId) as { count: number }).count;

  // Revenue last 7 days
  const last7Days = db.prepare(`
    SELECT DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders
    FROM orders
    WHERE user_id = ? AND created_at >= datetime('now', '-7 days') AND status != 'cancelled'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(userId);

  // Top products by revenue
  const topProducts = db.prepare(`
    SELECT p.name, SUM(o.total) as revenue, COUNT(o.id) as orders
    FROM orders o
    JOIN products p ON p.user_id = o.user_id
    WHERE o.user_id = ? AND o.status != 'cancelled'
    GROUP BY p.id
    ORDER BY revenue DESC
    LIMIT 5
  `).all(userId);

  res.json({
    summary: {
      totalRevenue,
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts
    },
    revenueChart: last7Days,
    topProducts
  });
});

// Get sales analytics
router.get('/sales', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const { period = '30d' } = req.query;

  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;

  const sales = db.prepare(`
    SELECT
      DATE(created_at) as date,
      SUM(total) as revenue,
      COUNT(*) as orders,
      AVG(total) as avg_order_value
    FROM orders
    WHERE user_id = ? AND created_at >= datetime('now', '-${days} days') AND status != 'cancelled'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(req.user!.id);

  const categoryBreakdown = db.prepare(`
    SELECT p.category, COUNT(o.id) as orders, SUM(o.total) as revenue
    FROM orders o
    JOIN products p ON p.user_id = o.user_id
    WHERE o.user_id = ? AND o.status != 'cancelled'
    GROUP BY p.category
    ORDER BY revenue DESC
  `).all(req.user!.id);

  res.json({ sales, categoryBreakdown, period });
});

// AI-powered sales prediction (Premium only)
router.get('/predict', requirePremium, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();

  const salesData = db.prepare(`
    SELECT
      DATE(created_at) as date,
      SUM(total) as amount,
      GROUP_CONCAT(DISTINCT p.category) as products
    FROM orders o
    LEFT JOIN products p ON p.user_id = o.user_id
    WHERE o.user_id = ? AND o.status != 'cancelled'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 90
  `).all(req.user!.id) as Array<{ date: string; amount: number; products: string }>;

  const formattedData = salesData.map(row => ({
    date: row.date,
    amount: row.amount,
    products: row.products ? row.products.split(',') : []
  }));

  try {
    const prediction = await predictSales(formattedData, req.user!.businessName || 'retail');
    res.json(prediction);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requirePremium } from '../middleware/auth';
import { getDatabase } from '../models/database';
import { predictSales } from '../services/sarvamAI';

const router = Router();
router.use(authenticate);

// Get dashboard summary — shape matches DashboardPage expectations
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

  const lowStockCount = (db.prepare(
    'SELECT COUNT(*) as count FROM products WHERE user_id = ? AND stock_quantity < 5 AND is_active = 1'
  ).get(userId) as { count: number }).count;

  // Revenue last 30 days (for chart)
  const revenueChart = db.prepare(`
    SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
    FROM orders
    WHERE user_id = ? AND created_at >= datetime('now', '-30 days') AND status != 'cancelled'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(userId) as { date: string; revenue: number; orders: number }[];

  // Revenue last month for change calculation
  const prevMonthRevenue = (db.prepare(`
    SELECT COALESCE(SUM(total), 0) as revenue FROM orders
    WHERE user_id = ? AND status != 'cancelled'
      AND created_at >= datetime('now', '-60 days')
      AND created_at < datetime('now', '-30 days')
  `).get(userId) as { revenue: number }).revenue;

  const thisMonthRevenue = (db.prepare(`
    SELECT COALESCE(SUM(total), 0) as revenue FROM orders
    WHERE user_id = ? AND status != 'cancelled'
      AND created_at >= datetime('now', '-30 days')
  `).get(userId) as { revenue: number }).revenue;

  const prevMonthOrders = (db.prepare(`
    SELECT COUNT(*) as count FROM orders
    WHERE user_id = ?
      AND created_at >= datetime('now', '-60 days')
      AND created_at < datetime('now', '-30 days')
  `).get(userId) as { count: number }).count;

  const thisMonthOrders = (db.prepare(`
    SELECT COUNT(*) as count FROM orders
    WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
  `).get(userId) as { count: number }).count;

  const revenueChange = prevMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
    : 0;
  const ordersChange = prevMonthOrders > 0
    ? Math.round(((thisMonthOrders - prevMonthOrders) / prevMonthOrders) * 100)
    : 0;

  // Recent orders (last 5)
  const recentOrders = db.prepare(`
    SELECT id, customer_name, total, status, created_at,
           json_array_length(items) as items_count
    FROM orders WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 5
  `).all(userId) as { id: string; customer_name: string; total: number; status: string; created_at: string; items_count: number }[];

  res.json({
    stats: {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      low_stock_count: lowStockCount,
      revenue_change: revenueChange,
      orders_change: ordersChange,
    },
    revenue_chart: revenueChart,
    recent_orders: recentOrders,
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

  // Accurate category breakdown by parsing order items
  const allOrders = db.prepare('SELECT items, total FROM orders WHERE user_id = ? AND status != \'cancelled\'').all(req.user!.id) as { items: string, total: number }[];
  const allProducts = db.prepare('SELECT id, category FROM products WHERE user_id = ?').all(req.user!.id) as { id: string, category: string }[];
  
  const productCategoryMap: Record<string, string> = {};
  allProducts.forEach(p => { productCategoryMap[p.id] = p.category || 'Uncategorized'; });

  const breakdownMap: Record<string, { category: string, orders: number, revenue: number }> = {};
  
  allOrders.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const orderCategories = new Set<string>();
    
    (items || []).forEach((item: any) => {
      const category = productCategoryMap[item.productId] || 'Uncategorized';
      orderCategories.add(category);
      
      if (!breakdownMap[category]) {
        breakdownMap[category] = { category, orders: 0, revenue: 0 };
      }
      breakdownMap[category].revenue += (item.total || 0);
    });
    
    orderCategories.forEach(cat => {
      if (breakdownMap[cat]) breakdownMap[cat].orders += 1;
    });
  });

  const categoryBreakdown = Object.values(breakdownMap).sort((a, b) => b.revenue - a.revenue);

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

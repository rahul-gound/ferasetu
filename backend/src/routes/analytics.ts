import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requirePremium } from '../middleware/auth';
import { getDatabase } from '../models/database';
import { predictSales } from '../services/sarvamAI';

const router = Router();
router.use(authenticate);

// Get dashboard summary — shape matches DashboardPage expectations
router.get('/dashboard', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const userId = req.user!.id;

    // 1. Unified stats query for maximum performance
    const statsResult = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        -- This month
        SUM(CASE WHEN created_at >= datetime('now', '-30 days') AND status != 'cancelled' THEN total ELSE 0 END) as this_month_rev,
        SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as this_month_orders,
        -- Last month
        SUM(CASE WHEN created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days') AND status != 'cancelled' THEN total ELSE 0 END) as last_month_rev,
        SUM(CASE WHEN created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days') THEN 1 ELSE 0 END) as last_month_orders
      FROM orders 
      WHERE user_id = ?
    `).get(userId) as any;

    const lowStockCount = (db.prepare(
      'SELECT COUNT(*) as count FROM products WHERE user_id = ? AND stock_quantity < 5 AND is_active = 1'
    ).get(userId) as { count: number }).count;

    // Calculate changes
    const revenueChange = statsResult.last_month_rev > 0 
      ? Math.round(((statsResult.this_month_rev - statsResult.last_month_rev) / statsResult.last_month_rev) * 100)
      : 0;
    
    const ordersChange = statsResult.last_month_orders > 0
      ? Math.round(((statsResult.this_month_orders - statsResult.last_month_orders) / statsResult.last_month_orders) * 100)
      : 0;

    // 2. Optimized Chart Data (Last 30 days)
    const revenueChart = db.prepare(`
      SELECT DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders
      FROM orders
      WHERE user_id = ? AND created_at >= datetime('now', '-30 days') AND status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(userId);

    // 3. Recent orders
    const recentOrders = db.prepare(`
      SELECT id, customer_name, total, status, created_at,
             json_array_length(items) as items_count
      FROM orders WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 5
    `).all(userId);

    res.json({
      stats: {
        total_revenue: statsResult.total_revenue || 0,
        total_orders: statsResult.total_orders || 0,
        pending_orders: statsResult.pending_orders || 0,
        low_stock_count: lowStockCount,
        revenue_change: revenueChange,
        orders_change: ordersChange,
        avg_order_value: statsResult.total_orders > 0 ? Math.round(statsResult.total_revenue / statsResult.total_orders) : 0,
      },
      revenue_chart: revenueChart,
      recent_orders: recentOrders,
    });
  } catch (err: any) {
    console.error('Dashboard analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get detailed sales analytics
router.get('/sales', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const userId = req.user!.id;
    const { period = '30d' } = req.query;

    let timeFormat = '%Y-%m-%d';
    let timeUnit = '-30 days';

    if (period === '1h') {
      timeFormat = '%H:%M';
      timeUnit = '-1 hour';
    } else if (period === '24h') {
      timeFormat = '%H:00';
      timeUnit = '-24 hours';
    } else if (period === '7d') {
      timeUnit = '-7 days';
    } else if (period === '90d') {
      timeUnit = '-90 days';
    } else if (period === '1y') {
      timeUnit = '-1 year';
    }

    // 1. Chart Data: Revenue and Orders trend
    const sales = db.prepare(`
      SELECT strftime(?, created_at) as date, SUM(total) as revenue, COUNT(*) as orders
      FROM orders
      WHERE user_id = ? AND created_at >= datetime('now', ?) AND status != 'cancelled'
      GROUP BY date
      ORDER BY created_at ASC
    `).all(timeFormat, userId, timeUnit);

    // 2. Category Breakdown
    const allOrders = db.prepare(`
      SELECT items FROM orders 
      WHERE user_id = ? AND status != 'cancelled' AND created_at >= datetime('now', ?)
    `).all(userId, timeUnit) as { items: string }[];

    const categoryMap: Record<string, { value: number; revenue: number }> = {};
    
    // Efficiently fetch all product categories once
    const productCategories = db.prepare('SELECT id, category FROM products WHERE user_id = ?').all(userId) as any[];
    const catMap: Record<string, string> = {};
    productCategories.forEach(p => catMap[p.id] = p.category || 'General');

    for (const order of allOrders) {
      const items = JSON.parse(order.items);
      for (const item of items) {
        const cat = catMap[item.productId] || 'General';
        if (!categoryMap[cat]) categoryMap[cat] = { value: 0, revenue: 0 };
        categoryMap[cat].value += item.quantity;
        categoryMap[cat].revenue += item.total;
      }
    }

    const categoryBreakdown = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      value: data.value,
      revenue: data.revenue
    })).sort((a, b) => b.revenue - a.revenue);

    res.json({
      sales,
      categoryBreakdown
    });
  } catch (err: any) {
    console.error('Sales analytics error:', err);
    res.status(500).json({ error: err.message });
  }
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

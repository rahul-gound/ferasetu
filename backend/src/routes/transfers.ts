import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
const authenticateToken = authenticate;
type AuthRequest = AuthenticatedRequest;

const router = express.Router();

const DEFAULT_LOCATIONS = [
  { id: 'loc-wh-1', name: 'Main Warehouse (Central Godown)', type: 'warehouse', address: 'Plot 42, Industrial Area', city: 'Delhi', is_default: 1 },
  { id: 'loc-st-1', name: 'Primary Retail Dukaan (Front Store)', type: 'store', address: 'Shop 12, Main Market', city: 'Delhi', is_default: 0 },
  { id: 'loc-sp-1', name: 'Regional Wholesale Supplier', type: 'supplier', address: 'APMC Market Yard', city: 'Karnal', is_default: 0 },
  { id: 'loc-hb-1', name: 'Express Delivery Hub', type: 'hub', address: 'Ring Road Depot', city: 'Gurugram', is_default: 0 },
];

/**
 * GET /api/transfers/locations
 * Returns available origin/destination inventory locations
 */
router.get('/locations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDatabase();
    const rows = await db.prepare(
      'SELECT * FROM inventory_locations WHERE user_id = ? ORDER BY is_default DESC, name ASC'
    ).bind(userId).all();

    let locations = rows.results || [];
    if (locations.length === 0) {
      // Seed default locations for user
      for (const loc of DEFAULT_LOCATIONS) {
        const id = `loc_${uuidv4().slice(0, 8)}`;
        await db.prepare(
          'INSERT INTO inventory_locations (id, user_id, name, type, address, city, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, userId, loc.name, loc.type, loc.address, loc.city, loc.is_default).run();
      }
      const refreshed = await db.prepare(
        'SELECT * FROM inventory_locations WHERE user_id = ? ORDER BY is_default DESC, name ASC'
      ).bind(userId).all();
      locations = refreshed.results || [];
    }

    return res.json({ success: true, locations });
  } catch (err: any) {
    console.error('Error fetching locations:', err);
    return res.status(500).json({ error: 'Failed to fetch inventory locations' });
  }
});

/**
 * POST /api/transfers/locations
 * Add a new location
 */
router.post('/locations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type = 'warehouse', address, city } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    const id = `loc_${uuidv4().slice(0, 8)}`;
    const db = getDatabase();
    await db.prepare(
      'INSERT INTO inventory_locations (id, user_id, name, type, address, city, is_default) VALUES (?, ?, ?, ?, ?, ?, 0)'
    ).bind(id, userId, name.trim(), type, address || null, city || null).run();

    return res.status(201).json({
      success: true,
      location: { id, user_id: userId, name: name.trim(), type, address, city, is_default: 0 }
    });
  } catch (err: any) {
    console.error('Error creating location:', err);
    return res.status(500).json({ error: 'Failed to create inventory location' });
  }
});

/**
 * GET /api/transfers
 * List all inventory transfers for merchant with aggregate stats
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDatabase();
    const transfersRes = await db.prepare(
      'SELECT * FROM inventory_transfers WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    const transfers = transfersRes.results || [];

    // Aggregate statistics
    const stats = {
      total_transfers: transfers.length,
      in_transit: transfers.filter((t: any) => t.status === 'in_transit').length,
      drafts: transfers.filter((t: any) => t.status === 'draft').length,
      completed: transfers.filter((t: any) => t.status === 'completed' || t.status === 'received').length,
      total_units_in_transit: transfers
        .filter((t: any) => t.status === 'in_transit')
        .reduce((sum: number, t: any) => sum + (Number(t.total_units) || 0), 0),
    };

    return res.json({ success: true, transfers, stats });
  } catch (err: any) {
    console.error('Error fetching transfers:', err);
    return res.status(500).json({ error: 'Failed to fetch inventory transfers' });
  }
});

/**
 * POST /api/transfers
 * Create a new transfer product shipment
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      origin_location_id,
      origin_name,
      destination_location_id,
      destination_name,
      status = 'draft',
      estimated_arrival,
      reference_name,
      note,
      tags,
      purchase_order_id,
      items,
    } = req.body;

    if (!origin_location_id || !origin_name) {
      return res.status(400).json({ error: 'Origin location is required' });
    }
    if (!destination_location_id || !destination_name) {
      return res.status(400).json({ error: 'Destination location is required' });
    }
    if (origin_location_id === destination_location_id) {
      return res.status(400).json({ error: 'Origin and destination locations must be different' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one product item is required for transfer' });
    }

    const db = getDatabase();
    const transferId = `tr_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transferNumber = `TR-${randomSuffix}`;

    const totalItems = items.length;
    const totalUnits = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);

    const tagsString = Array.isArray(tags) ? tags.join(', ') : (tags || null);

    await db.prepare(`
      INSERT INTO inventory_transfers (
        id, user_id, transfer_number, reference_name,
        origin_location_id, origin_name,
        destination_location_id, destination_name,
        status, estimated_arrival, note, tags, purchase_order_id,
        total_items, total_units
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transferId,
      userId,
      transferNumber,
      reference_name || null,
      origin_location_id,
      origin_name,
      destination_location_id,
      destination_name,
      status,
      estimated_arrival || null,
      note || null,
      tagsString,
      purchase_order_id || null,
      totalItems,
      totalUnits
    ).run();

    // Insert line items
    for (const item of items) {
      const itemId = `tri_${uuidv4().slice(0, 8)}`;
      await db.prepare(`
        INSERT INTO inventory_transfer_items (
          id, transfer_id, product_id, product_title, sku, quantity_requested, quantity_received, unit_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        itemId,
        transferId,
        item.product_id || item.id || 'custom',
        item.product_title || item.title || item.name || 'Product',
        item.sku || null,
        Number(item.quantity) || 1,
        0,
        Number(item.unit_cost || item.price || 0)
      ).run();
    }

    return res.status(201).json({
      success: true,
      transfer: {
        id: transferId,
        user_id: userId,
        transfer_number: transferNumber,
        reference_name,
        origin_location_id,
        origin_name,
        destination_location_id,
        destination_name,
        status,
        estimated_arrival,
        note,
        tags: tagsString,
        purchase_order_id,
        total_items: totalItems,
        total_units: totalUnits,
        items,
      }
    });
  } catch (err: any) {
    console.error('Error creating transfer:', err);
    return res.status(500).json({ error: 'Failed to create inventory transfer' });
  }
});

/**
 * GET /api/transfers/:id
 * Retrieve full transfer details including line items
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDatabase();
    const transfer = await db.prepare(
      'SELECT * FROM inventory_transfers WHERE id = ? AND user_id = ?'
    ).bind(req.params.id, userId).first();

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const itemsRes = await db.prepare(
      'SELECT * FROM inventory_transfer_items WHERE transfer_id = ?'
    ).bind(req.params.id).all();

    return res.json({
      success: true,
      transfer: {
        ...transfer,
        items: itemsRes.results || []
      }
    });
  } catch (err: any) {
    console.error('Error fetching transfer:', err);
    return res.status(500).json({ error: 'Failed to retrieve transfer details' });
  }
});

/**
 * POST /api/transfers/:id/status
 * Update transfer status ('draft' | 'in_transit' | 'cancelled' | 'received')
 */
router.post('/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { status } = req.body;
    const validStatuses = ['draft', 'in_transit', 'partially_received', 'received', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const db = getDatabase();
    await db.prepare(
      'UPDATE inventory_transfers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
    ).bind(status, req.params.id, userId).run();

    return res.json({ success: true, message: `Transfer status updated to ${status}` });
  } catch (err: any) {
    console.error('Error updating transfer status:', err);
    return res.status(500).json({ error: 'Failed to update transfer status' });
  }
});

/**
 * POST /api/transfers/:id/receive
 * Receive inventory items into destination store
 */
router.post('/:id/receive', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { item_quantities } = req.body; // { [itemId]: numberReceived }
    const db = getDatabase();

    const transfer = await db.prepare(
      'SELECT * FROM inventory_transfers WHERE id = ? AND user_id = ?'
    ).bind(req.params.id, userId).first();

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const itemsRes = await db.prepare(
      'SELECT * FROM inventory_transfer_items WHERE transfer_id = ?'
    ).bind(req.params.id).all();

    const items = itemsRes.results || [];
    let allCompleted = true;

    for (const it of items as any[]) {
      const received = item_quantities && item_quantities[it.id] !== undefined
        ? Number(item_quantities[it.id])
        : it.quantity_requested;

      await db.prepare(
        'UPDATE inventory_transfer_items SET quantity_received = ? WHERE id = ?'
      ).bind(received, it.id).run();

      if (received < it.quantity_requested) {
        allCompleted = false;
      }
    }

    const newStatus = allCompleted ? 'completed' : 'partially_received';
    await db.prepare(
      'UPDATE inventory_transfers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newStatus, req.params.id).run();

    return res.json({ success: true, status: newStatus, message: 'Inventory received successfully' });
  } catch (err: any) {
    console.error('Error receiving items:', err);
    return res.status(500).json({ error: 'Failed to receive transfer items' });
  }
});

/**
 * POST /api/transfers/ai-sidekick
 * Sidekick Copilot helper: parses natural merchant instructions into transfer structure
 */
router.post('/ai-sidekick', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const lower = prompt.toLowerCase();
    
    // Natural language extraction logic
    let actionType = 'setup_transfer';
    let suggestedOrigin = 'Main Warehouse (Central Godown)';
    let suggestedDestination = 'Primary Retail Dukaan (Front Store)';
    let suggestedUnits = 20;
    let suggestedTags = ['Sidekick Assistant'];
    let suggestedNotes = 'Created with Fera AI Sidekick';
    let suggestedArrival = '2026-11-05';

    if (lower.includes('supplier')) {
      suggestedOrigin = 'Regional Wholesale Supplier';
      suggestedTags.push('Supplier Restock');
    }
    if (lower.includes('diwali') || lower.includes('festival')) {
      suggestedTags.push('Festival Rush');
      suggestedNotes = 'Priority restock for upcoming holiday rush';
    }
    if (lower.includes('express') || lower.includes('urgent')) {
      suggestedTags.push('Urgent');
    }

    const numberMatch = prompt.match(/\b(\d+)\b/);
    if (numberMatch) {
      suggestedUnits = parseInt(numberMatch[1], 10);
    }

    return res.json({
      success: true,
      reply: `I've prepared a transfer proposal for you: moving ${suggestedUnits} units from "${suggestedOrigin}" to "${suggestedDestination}".`,
      proposal: {
        origin_name: suggestedOrigin,
        destination_name: suggestedDestination,
        quantity: suggestedUnits,
        tags: suggestedTags.join(', '),
        note: suggestedNotes,
        estimated_arrival: suggestedArrival,
      }
    });
  } catch (err: any) {
    console.error('Sidekick error:', err);
    return res.status(500).json({ error: 'Sidekick assistant unavailable' });
  }
});

export default router;

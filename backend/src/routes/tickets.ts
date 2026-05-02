import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';

const router = Router();
router.use(authenticate);

// Get my tickets
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const tickets = db.prepare(`
      SELECT * FROM tickets 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user!.id);
    res.json({ tickets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create ticket
router.post('/',
  body('subject').notEmpty().withMessage('Subject is required'),
  body('description').notEmpty().withMessage('Description is required'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { subject, description } = req.body;
      const db = getDatabase();
      const ticketId = uuidv4();

      db.prepare(`
        INSERT INTO tickets (id, user_id, subject, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'open', datetime('now'), datetime('now'))
      `).run(ticketId, req.user!.id, subject, description);

      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
      res.status(201).json(ticket);
      } catch (err: any) {
      res.status(500).json({ error: err.message });
      }
      });

// Get ticket replies
router.get('/:id/replies', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const ticket = db.prepare('SELECT id FROM tickets WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const replies = db.prepare(`
      SELECT * FROM ticket_replies 
      WHERE ticket_id = ? 
      ORDER BY created_at ASC
    `).all(req.params.id);
    res.json({ replies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reply to ticket
router.post('/:id/replies',
  body('content').notEmpty(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const content = String(req.body.content || '').trim();
      const db = getDatabase();
      const ticket = db.prepare('SELECT id, status FROM tickets WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      if (ticket.status === 'resolved') {
        res.status(400).json({ error: 'Resolved tickets cannot receive new messages' });
        return;
      }

      const replyId = uuidv4();
      db.prepare(`
        INSERT INTO ticket_replies (id, ticket_id, sender_role, content, created_at)
        VALUES (?, ?, 'user', ?, datetime('now'))
      `).run(replyId, req.params.id, content);

      // Mark as open for admin follow-up whenever user sends a new message.
      db.prepare("UPDATE tickets SET status = 'open', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

      const reply = db.prepare('SELECT * FROM ticket_replies WHERE id = ?').get(replyId);
      res.status(201).json(reply);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

      // Close my ticket
router.post('/:id/close', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    db.prepare("UPDATE tickets SET status = 'resolved', updated_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

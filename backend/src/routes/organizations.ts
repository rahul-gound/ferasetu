import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function ensureInvitationsTable() {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS organization_invitations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'staff',
      station TEXT DEFAULT 'Main Counter',
      status TEXT NOT NULL DEFAULT 'pending',
      invited_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

// 1. GET /api/organizations/members
router.get('/members', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const orgId = req.user?.organization_id || req.user?.id;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const members = db.prepare(`
      SELECT om.id, om.organization_id, om.user_id, om.role, om.created_at,
             COALESCE(u.name, 'Team Member') as name,
             COALESCE(u.email, '') as email
      FROM organization_members om
      LEFT JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = ?
      ORDER BY CASE om.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END, om.created_at ASC
    `).all(orgId);

    return res.json({ members: members || [] });
  } catch (err: any) {
    console.error('Error fetching organization members:', err);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// 2. GET /api/organizations/invitations
router.get('/invitations', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    ensureInvitationsTable();
    const db = getDatabase();
    const orgId = req.user?.organization_id || req.user?.id;
    if (!orgId) return res.json({ invitations: [] });

    const invitations = db.prepare(`
      SELECT id, organization_id, email, name, phone, role, station, status, created_at
      FROM organization_invitations
      WHERE organization_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).all(orgId);

    return res.json({ invitations: invitations || [] });
  } catch (err: any) {
    console.error('Error fetching invitations:', err);
    return res.json({ invitations: [] });
  }
});

// 3. POST /api/organizations/invitations
router.post('/invitations', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    ensureInvitationsTable();
    const db = getDatabase();
    const orgId = req.user?.organization_id || req.user?.id;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const { email, name, phone, role = 'staff', station = 'Main Counter' } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(422).json({ error: 'Valid email is required' });
    }

    const inviteId = `inv_${uuidv4()}`;
    const now = new Date().toISOString();
    const assignedRole = role === 'admin' ? 'admin' : 'staff';
    const memberName = name?.trim() || email.split('@')[0] || 'Staff Member';

    db.prepare(`
      INSERT INTO organization_invitations (id, organization_id, email, name, phone, role, station, status, invited_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(inviteId, orgId, email.trim().toLowerCase(), memberName, phone || '', assignedRole, station, req.user?.id || '', now, now);

    return res.status(201).json({
      success: true,
      invitation: {
        id: inviteId,
        email: email.trim().toLowerCase(),
        name: memberName,
        role: assignedRole,
        station,
        status: 'pending',
        created_at: now
      },
      message: `Invitation created for ${email}`
    });
  } catch (err: any) {
    console.error('Error creating invitation:', err);
    return res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// 4. DELETE /api/organizations/invitations/:id
router.delete('/invitations/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    ensureInvitationsTable();
    const db = getDatabase();
    const orgId = req.user?.organization_id || req.user?.id;
    const { id } = req.params;

    db.prepare('DELETE FROM organization_invitations WHERE id = ? AND organization_id = ?').run(id, orgId);
    return res.json({ success: true, message: 'Invitation revoked' });
  } catch (err: any) {
    console.error('Error revoking invitation:', err);
    return res.status(500).json({ error: 'Failed to revoke invitation' });
  }
});

// 5. PATCH /api/organizations/members/:id
router.patch('/members/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const orgId = req.user?.organization_id || req.user?.id;
    const { id } = req.params;
    const { role } = req.body;

    const member = db.prepare('SELECT * FROM organization_members WHERE id = ? AND organization_id = ?').get(id, orgId) as any;
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot modify primary store owner role' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'staff';
    const now = new Date().toISOString();
    db.prepare('UPDATE organization_members SET role = ?, updated_at = ? WHERE id = ? AND organization_id = ?').run(assignedRole, now, id, orgId);

    return res.json({ success: true, message: 'Role updated successfully', role: assignedRole });
  } catch (err: any) {
    console.error('Error updating member:', err);
    return res.status(500).json({ error: 'Failed to update member' });
  }
});

// 6. DELETE /api/organizations/members/:id
router.delete('/members/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const orgId = req.user?.organization_id || req.user?.id;
    const { id } = req.params;

    const member = db.prepare('SELECT * FROM organization_members WHERE id = ? AND organization_id = ?').get(id, orgId) as any;
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove primary store owner' });
    }

    db.prepare('DELETE FROM organization_members WHERE id = ? AND organization_id = ?').run(id, orgId);
    return res.json({ success: true, message: 'Member removed from team' });
  } catch (err: any) {
    console.error('Error removing member:', err);
    return res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;

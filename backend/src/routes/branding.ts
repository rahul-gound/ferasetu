import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../models/database';

const router = Router();
router.use(authenticate);

// GET /api/branding - Fetch authoritative merchant branding
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const userId = req.user!.id;

  const member = db.prepare(
    'SELECT organization_id FROM organization_members WHERE user_id = ? ORDER BY CASE role WHEN "owner" THEN 1 WHEN "admin" THEN 2 ELSE 3 END LIMIT 1'
  ).get(userId) as { organization_id: string } | undefined;

  const orgId = member?.organization_id || userId;

  const org = db.prepare(
    'SELECT id, name, logo_url, favicon_url, primary_color, secondary_color, social_image_url FROM organizations WHERE id = ?'
  ).get(orgId) as any;

  const shop = db.prepare(
    'SELECT logo_url, favicon_url, primary_color, secondary_color, social_image_url FROM shops WHERE organization_id = ? LIMIT 1'
  ).get(orgId) as any;

  res.json({
    branding: {
      organization_id: orgId,
      name: org?.name || '',
      logo_url: shop?.logo_url || org?.logo_url || null,
      favicon_url: shop?.favicon_url || org?.favicon_url || null,
      primary_color: shop?.primary_color || org?.primary_color || null,
      secondary_color: shop?.secondary_color || org?.secondary_color || null,
      social_image_url: shop?.social_image_url || org?.social_image_url || null,
    },
  });
});

// PUT /api/branding - Update authoritative merchant branding
router.put('/', (req: AuthenticatedRequest, res: Response): void => {
  const db = getDatabase();
  const userId = req.user!.id;
  const { logo_url, favicon_url, primary_color, secondary_color, social_image_url } = req.body;

  const member = db.prepare(
    'SELECT organization_id, role FROM organization_members WHERE user_id = ? ORDER BY CASE role WHEN "owner" THEN 1 WHEN "admin" THEN 2 ELSE 3 END LIMIT 1'
  ).get(userId) as { organization_id: string; role: string } | undefined;

  const orgId = member?.organization_id || userId;
  const now = new Date().toISOString();

  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId) as any;
  const shop = db.prepare('SELECT * FROM shops WHERE organization_id = ? LIMIT 1').get(orgId) as any;

  const newLogo = logo_url !== undefined ? (logo_url || null) : (shop?.logo_url ?? org?.logo_url ?? null);
  const newFavicon = favicon_url !== undefined ? (favicon_url || null) : (shop?.favicon_url ?? org?.favicon_url ?? null);
  const newPrimary = primary_color !== undefined ? (primary_color || null) : (shop?.primary_color ?? org?.primary_color ?? null);
  const newSecondary = secondary_color !== undefined ? (secondary_color || null) : (shop?.secondary_color ?? org?.secondary_color ?? null);
  const newSocial = social_image_url !== undefined ? (social_image_url || null) : (shop?.social_image_url ?? org?.social_image_url ?? null);

  db.prepare(`
    UPDATE organizations SET
      logo_url = ?,
      favicon_url = ?,
      primary_color = ?,
      secondary_color = ?,
      social_image_url = ?,
      updated_at = ?
    WHERE id = ?
  `).run(newLogo, newFavicon, newPrimary, newSecondary, newSocial, now, orgId);

  db.prepare(`
    UPDATE shops SET
      logo_url = ?,
      favicon_url = ?,
      primary_color = ?,
      secondary_color = ?,
      social_image_url = ?,
      updated_at = ?
    WHERE organization_id = ?
  `).run(newLogo, newFavicon, newPrimary, newSecondary, newSocial, now, orgId);

  if (logo_url !== undefined) {
    db.prepare('UPDATE users SET logo_url = ? WHERE id = ?').run(newLogo, userId);
  }

  const updatedOrg = db.prepare(
    'SELECT id, name, logo_url, favicon_url, primary_color, secondary_color, social_image_url FROM organizations WHERE id = ?'
  ).get(orgId) as any;

  res.json({
    success: true,
    branding: {
      organization_id: orgId,
      name: updatedOrg?.name || '',
      logo_url: updatedOrg?.logo_url || null,
      favicon_url: updatedOrg?.favicon_url || null,
      primary_color: updatedOrg?.primary_color || null,
      secondary_color: updatedOrg?.secondary_color || null,
      social_image_url: updatedOrg?.social_image_url || null,
    },
  });
});

export default router;

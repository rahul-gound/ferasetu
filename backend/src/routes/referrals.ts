import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/referrals
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const userId = req.user!.id;

    // Ensure referrals table exists
    db.prepare(`
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL,
        referee_id TEXT NOT NULL UNIQUE,
        referral_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        reward_credits INTEGER NOT NULL DEFAULT 200,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    const rows = db.prepare(`
      SELECT r.id, r.status, r.reward_credits, r.created_at,
             u.name as owner_name, u.business_name, u.plan, u.subdomain
      FROM referrals r
      LEFT JOIN users u ON r.referee_id = u.id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
    `).all(userId) as any[];

    const user = db.prepare('SELECT subdomain, business_name, name, ai_credits_balance FROM users WHERE id = ?').get(userId) as any;
    const canonicalCode = (user?.subdomain || user?.business_name || user?.name || userId)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

    const referrals = (rows || []).map(row => ({
      id: row.id,
      storeName: row.business_name || (row.subdomain ? `${row.subdomain}.ferasetu.com` : 'New Store'),
      ownerName: row.owner_name || 'Merchant Partner',
      date: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      plan: row.plan ? (row.plan.charAt(0).toUpperCase() + row.plan.slice(1)) : 'Free',
      status: row.status || 'completed',
      reward: `+${row.reward_credits || 200} Credits`
    }));

    const totalReferred = referrals.length;
    const successfulStores = referrals.filter(r => r.status === 'completed').length;
    const totalRewardsWon = successfulStores * 200;

    res.json({
      referrals,
      totalReferred,
      successfulStores,
      totalRewardsWon,
      referralCode: canonicalCode,
      creditsBalance: user?.ai_credits_balance || 20
    });
  } catch (err: any) {
    console.error('Failed to get referrals:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper to process referral code
export function processReferralInDb(db: any, referralCode: string, refereeId: string) {
  if (!referralCode || !refereeId) return;

  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL,
        referee_id TEXT NOT NULL UNIQUE,
        referral_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        reward_credits INTEGER NOT NULL DEFAULT 200,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    const existing = db.prepare('SELECT id FROM referrals WHERE referee_id = ?').get(refereeId);
    if (existing) return;

    const cleanCode = referralCode.trim().toLowerCase().replace(/^@/, '');

    const referrer = db.prepare(`
      SELECT id, name, business_name, subdomain, ai_credits_balance
      FROM users
      WHERE LOWER(subdomain) = ?
         OR LOWER(hostname) = ?
         OR LOWER(id) = ?
         OR LOWER(custom_domain) = ?
    `).get(cleanCode, `${cleanCode}.ferasetu.com`, cleanCode, cleanCode) as any;

    if (!referrer || referrer.id === refereeId) return;

    const refId = `ref_${uuidv4()}`;
    db.prepare(`
      INSERT INTO referrals (id, referrer_id, referee_id, referral_code, status, reward_credits)
      VALUES (?, ?, ?, ?, 'completed', 200)
    `).run(refId, referrer.id, refereeId, cleanCode);

    // Credit referrer +200
    db.prepare('UPDATE users SET ai_credits_balance = COALESCE(ai_credits_balance, 20) + 200 WHERE id = ?').run(referrer.id);

    // Credit referee +100 bonus
    db.prepare('UPDATE users SET ai_credits_balance = COALESCE(ai_credits_balance, 20) + 100 WHERE id = ?').run(refereeId);

    // Audit log
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          credits_used INTEGER NOT NULL,
          details TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      db.prepare(`
        INSERT INTO ai_usage_logs (id, user_id, action, credits_used, details)
        VALUES (?, ?, 'referral_bonus', 200, ?)
      `).run(`log_${uuidv4()}`, referrer.id, `Referral bonus for inviting merchant #${refereeId}`);

      db.prepare(`
        INSERT INTO ai_usage_logs (id, user_id, action, credits_used, details)
        VALUES (?, ?, 'welcome_referral_bonus', 100, ?)
      `).run(`log_${uuidv4()}`, refereeId, `Welcome bonus from referral ${cleanCode}`);
    } catch {}
  } catch (err) {
    console.warn('Error processing referral:', err);
  }
}

export default router;

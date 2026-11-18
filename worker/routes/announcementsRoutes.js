// FeraSetu — Real Admin Broadcast Announcements & Notifications Route Handler
// Serverless Cloudflare Worker & D1 Router
// Zero synthetic/fake announcements: only real notifications created by platform admin.

export async function ensureAnnouncementsTable(db) {
  if (!db || typeof db.prepare !== 'function') return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'feature',
        badge_label TEXT DEFAULT 'Announcement',
        action_url TEXT,
        action_label TEXT,
        target_plan TEXT DEFAULT 'all',
        target_user_id TEXT,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    try {
      await db.prepare("ALTER TABLE announcements ADD COLUMN target_user_id TEXT").run();
    } catch {}
    try {
      await db.prepare("ALTER TABLE announcements ADD COLUMN expires_at TEXT").run();
    } catch {}
  } catch (err) {
    console.warn("ensureAnnouncementsTable warning:", err?.message || err);
  }
}

export async function handleAnnouncementsRoutes(request, env, helpers) {
  const { json, errorResponse, getAuthenticatedUser } = helpers;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  await ensureAnnouncementsTable(env.DB);

  // 1. GET /api/announcements — List real admin-broadcast notifications
  if (path === "/api/announcements" || path === "/announcements") {
    if (method === "GET") {
      let userPlan = 'free';
      let userId = '';
      try {
        const user = await getAuthenticatedUser(request, env);
        if (user?.plan) userPlan = user.plan;
        if (user?.$id || user?.id) userId = user.$id || user.id;
      } catch {}

      const category = url.searchParams.get("category");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

      try {
        let query = `
          SELECT 
            id, title, content, 
            COALESCE(category, 'feature') as category,
            COALESCE(badge_label, 'Update') as badge_label,
            action_url, action_label,
            target_plan,
            COALESCE(is_pinned, 0) as is_pinned,
            is_active,
            expires_at,
            created_at
          FROM announcements
          WHERE is_active = 1
            AND (expires_at IS NULL OR expires_at > datetime('now'))
            AND (target_user_id IS NULL OR target_user_id = '' OR target_user_id = ?)
            AND (target_plan = 'all' OR target_plan = ? OR target_plan IS NULL)
        `;
        const binds = [userId, userPlan];

        if (category && category !== 'all') {
          query += ` AND category = ? `;
          binds.push(category);
        }

        query += ` ORDER BY is_pinned DESC, created_at DESC LIMIT ? `;
        binds.push(limit);

        const { results } = await env.DB.prepare(query).bind(...binds).all();
        return json({
          success: true,
          announcements: results || [],
          count: (results || []).length
        }, 200, {}, request);
      } catch (err) {
        console.warn("Failed to fetch announcements from DB:", err?.message || err);
        return json({
          success: true,
          announcements: [],
          count: 0
        }, 200, {}, request);
      }
    }

    // 2. POST /api/announcements — Send new broadcast notification from Admin
    if (method === "POST") {
      try {
        let body;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Invalid JSON payload", 400, undefined, request);
        }

        const {
          title,
          content,
          category = 'feature',
          badge_label = 'Admin Broadcast',
          action_url = '',
          action_label = '',
          target_plan = 'all',
          target_user_id = null,
          is_pinned = 0,
          expires_hours = 0, // 0 means no explicit expiry (user 24h vanish handles it)
        } = body;

        if (!title || !content) {
          return errorResponse("Title and content are required", 400, undefined, request);
        }

        const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        let expiresAt = null;
        if (Number(expires_hours) > 0) {
          expiresAt = new Date(Date.now() + Number(expires_hours) * 3600000).toISOString();
        }

        await env.DB.prepare(`
          INSERT INTO announcements (
            id, title, content, category, badge_label, action_url, action_label,
            target_plan, target_user_id, is_pinned, is_active, expires_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
        `).bind(
          id,
          title.trim(),
          content.trim(),
          category,
          badge_label.trim(),
          action_url.trim() || null,
          action_label.trim() || null,
          target_plan || 'all',
          target_user_id || null,
          is_pinned ? 1 : 0,
          expiresAt
        ).run();

        return json({
          success: true,
          message: "Notification broadcasted successfully",
          announcement: {
            id,
            title,
            content,
            category,
            badge_label,
            action_url,
            action_label,
            target_plan,
            is_pinned: is_pinned ? 1 : 0,
            created_at: new Date().toISOString()
          }
        }, 201, {}, request);
      } catch (err) {
        console.error("Failed to create announcement:", err?.message || err);
        return errorResponse("Failed to create announcement: " + (err?.message || err), 500, undefined, request);
      }
    }

    return errorResponse("Method not allowed", 405, undefined, request);
  }

  // 3. DELETE /api/announcements/:id — Delete announcement
  if (path.startsWith("/api/announcements/") || path.startsWith("/announcements/")) {
    const id = path.split("/").pop();
    if (method === "DELETE") {
      try {
        await env.DB.prepare("DELETE FROM announcements WHERE id = ?").bind(id).run();
        return json({ success: true, message: "Announcement deleted", id }, 200, {}, request);
      } catch (err) {
        return errorResponse("Failed to delete announcement: " + (err?.message || err), 500, undefined, request);
      }
    }
    return errorResponse("Method not allowed", 405, undefined, request);
  }

  return null;
}

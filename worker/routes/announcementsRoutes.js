// FeraSetu — Announcements & Platform Updates Routes
// Cloudflare Worker Serverless Route Handler

export const INITIAL_ANNOUNCEMENTS = [
  {
    title: 'Visual Storefront Builder is live',
    content: 'Design your online shop directly from your phone or computer. Arrange product displays, customize your banner, and adjust store colors with instant live previews.',
    category: 'feature',
    badge_label: 'New Feature',
    action_url: '/website-builder',
    action_label: 'Open Store Builder',
    target_plan: 'all',
    is_pinned: 1,
    is_active: 1,
  },
  {
    title: 'WhatsApp 1-Click checkout for your customers',
    content: 'Customers can now tap one button on your web storefront to send their full order with delivery details directly to your WhatsApp. Keep your personal customer connection with zero intermediaries.',
    category: 'feature',
    badge_label: 'Top Feature',
    action_url: '/orders',
    action_label: 'View Orders',
    target_plan: 'all',
    is_pinned: 0,
    is_active: 1,
  },
  {
    title: "A note from FeraSetu: 0% marketplace commission always",
    content: 'FeraSetu was built to protect local shopkeepers. We never take a percentage of your sales. 100% of customer payments go directly to your UPI or bank account.',
    category: 'message',
    badge_label: 'From FeraSetu',
    action_url: '/dashboard',
    action_label: 'Go to Dashboard',
    target_plan: 'all',
    is_pinned: 1,
    is_active: 1,
  },
  {
    title: 'Run your shop in your customer’s native language',
    content: 'Your storefront now supports 48 Indic languages including Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, and Punjabi. Buyers can shop comfortably in their preferred language.',
    category: 'update',
    badge_label: 'Platform Update',
    action_url: '/products',
    action_label: 'View Products',
    target_plan: 'all',
    is_pinned: 0,
    is_active: 1,
  },
  {
    title: 'Fera AI drafts product titles & details in seconds',
    content: 'Add new items to your catalog in seconds. Take a quick photo or type a short item name, and Fera AI generates ready-to-sell titles, descriptions, and regional tags.',
    category: 'feature',
    badge_label: 'Fera AI',
    action_url: '/ferasetu-ai',
    action_label: 'Try Fera AI',
    target_plan: 'all',
    is_pinned: 0,
    is_active: 1,
  },
  {
    title: 'Connect your own custom shop web address',
    content: 'You can now link your own custom domain (e.g., yourstore.com or yourbrand.in) to your FeraSetu shop with automatic HTTPS encryption and mail-safe DNS record protection.',
    category: 'update',
    badge_label: 'Domain Upgrade',
    action_url: '/settings/email',
    action_label: 'Manage Domains',
    target_plan: 'all',
    is_pinned: 0,
    is_active: 1,
  },
];

export async function ensureAnnouncementsSeeded(db) {
  if (!db || typeof db.prepare !== 'function') return;
  try {
    const row = await db.prepare("SELECT COUNT(*) as count FROM announcements").first();
    if (!row || Number(row.count) === 0) {
      for (let idx = 0; idx < INITIAL_ANNOUNCEMENTS.length; idx++) {
        const ann = INITIAL_ANNOUNCEMENTS[idx];
        const id = `ann_${crypto.randomUUID()}`;
        await db.prepare(`
          INSERT INTO announcements (
            id, title, content, category, badge_label, action_url, action_label,
            target_plan, is_pinned, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' minutes'))
        `).bind(
          id, ann.title, ann.content, ann.category, ann.badge_label,
          ann.action_url, ann.action_label, ann.target_plan, ann.is_pinned, ann.is_active,
          idx * 15
        ).run();
      }
    }
  } catch (err) {
    console.warn("ensureAnnouncementsSeeded notice:", err?.message || err);
  }
}

export async function handleAnnouncementsRoutes(request, env, helpers) {
  const { json, errorResponse, getAuthenticatedUser } = helpers;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  if (path === "/api/announcements" || path === "/announcements") {
    if (method === "GET") {
      let userPlan = 'free';
      try {
        const user = await getAuthenticatedUser(request, env);
        if (user?.plan) userPlan = user.plan;
      } catch {}

      const category = url.searchParams.get("category");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

      try {
        await ensureAnnouncementsSeeded(env.DB);
        let query = `
          SELECT 
            id, title, content, 
            COALESCE(category, 'feature') as category,
            COALESCE(badge_label, 'Update') as badge_label,
            action_url, action_label,
            target_plan,
            COALESCE(is_pinned, 0) as is_pinned,
            is_active,
            created_at
          FROM announcements
          WHERE is_active = 1
            AND (target_plan = 'all' OR target_plan = ? OR target_plan IS NULL)
        `;
        const binds = [userPlan];

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
        console.warn("Failed to fetch announcements from DB, returning defaults:", err?.message || err);
        return json({
          success: true,
          announcements: INITIAL_ANNOUNCEMENTS.map((a, i) => ({
            ...a,
            id: `ann_default_${i}`,
            created_at: new Date(Date.now() - i * 900000).toISOString()
          })),
          count: INITIAL_ANNOUNCEMENTS.length
        }, 200, {}, request);
      }
    }
    return errorResponse("Method not allowed", 405, undefined, request);
  }

  return null;
}

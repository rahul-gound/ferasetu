// =============================================================================
// FeraSetu Community & Dynamic Asynchronous Translation Router
// Serverless handlers on Cloudflare Worker & D1
// Discord-style Channels, Admin Moderation & Approval Controls,
// and Automatic Multi-Lingual Translation (Telugu <-> English <-> Indic).
// Strictly preserves Zero Sarvam invariant and FeraSetu retail standards.
// =============================================================================

import { translateDynamicTexts } from '../ai/translationService.js';

// Unicode Regex detection for scripts
const TELUGU_REGEX = /[\u0C00-\u0C7F]/;
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const TAMIL_REGEX = /[\u0B80-\u0BFF]/;
const BENGALI_REGEX = /[\u0980-\u09FF]/;

/**
 * Detect language of text, defaulting to user preference or English
 */
export function detectTextLanguage(text, fallback = 'en') {
  if (!text || typeof text !== 'string') return fallback;
  if (TELUGU_REGEX.test(text)) return 'te';
  if (DEVANAGARI_REGEX.test(text)) return 'hi';
  if (TAMIL_REGEX.test(text)) return 'ta';
  if (BENGALI_REGEX.test(text)) return 'bn';
  return fallback;
}

// Seed discussions with language tags and feature status
export const SEED_DISCUSSIONS = [
  {
    id: 'disc-1',
    channel: 'announcements',
    category: 'Announcements',
    title: 'FeraSetu 0% Commission Direct Settlement Engine & Multi-Store Inventory Launch',
    body: 'We have deployed the new T+0 direct UPI bank sweep mechanism. All merchant sales now route directly into your linked ICICI/HDFC bank account with zero platform toll or holding periods.',
    author: 'FeraSetu Core Team',
    storeName: 'Platform Engineering',
    locality: 'Bengaluru / Mumbai',
    sourceLang: 'en',
    status: 'implemented',
    adminNote: 'Deployed globally across all 48 regions. Zero fees verified.',
    createdAt: '2 days ago',
    upvotes: 84,
    replyCount: 16,
    isStaffVerified: true,
    isPinned: true,
    replies: [
      {
        id: 'rep-1-1',
        author: 'Ramesh Sundaram',
        storeName: 'Sundaram Provision Store',
        text: 'The instant QR auto-sweep worked seamlessly during our morning rush! Zero deduction on ₹14,200.',
        sourceLang: 'en',
        time: '1 day ago',
        isVerified: true,
        isAdmin: false,
      },
    ],
  },
  {
    id: 'disc-2',
    channel: 'domains',
    category: 'Domains & DNS',
    title: 'How do I map my custom Namecheap / GoDaddy domain without breaking existing WhatsApp catalog links?',
    body: 'I bought my brand domain on Namecheap and want to point it to FeraSetu. Will my existing customers who saved my .ferasetu.store link on WhatsApp get 404 errors during DNS propagation?',
    author: 'Himmat Patel',
    storeName: 'Himmat General Store',
    locality: 'Vasai West, Mumbai',
    sourceLang: 'en',
    status: 'approved',
    adminNote: 'Feature approved: dual wildcard DNS routing keeps existing links alive permanently.',
    createdAt: '3 hours ago',
    upvotes: 42,
    replyCount: 4,
    isStaffVerified: true,
    isPinned: false,
    replies: [
      {
        id: 'rep-2-1',
        author: 'Suresh M.',
        storeName: 'Parel Grocers',
        text: 'No 404 at all! FeraSetu keeps your native subdomain alive as a wildcard fallback. Set your CNAME to shops.ferasetu.store with TTL 300 and both links will route simultaneously.',
        sourceLang: 'en',
        time: '2 hours ago',
        isVerified: true,
        isAdmin: false,
      },
    ],
  },
  {
    id: 'disc-3',
    channel: 'payments',
    category: 'Payments & Soundbox',
    title: 'Managing pay-later khata balances: Do you send weekly reminders or order-by-order nudges?',
    body: 'We have about 30 regulars who take items on weekly credit. What has been the most polite, effective way to request settlement without feeling transactional?',
    author: 'Sunita Verma',
    storeName: 'Verma Organics & Kirana',
    locality: 'Kothrud, Pune',
    sourceLang: 'en',
    status: 'open',
    adminNote: null,
    createdAt: '5 hours ago',
    upvotes: 38,
    replyCount: 8,
    isStaffVerified: false,
    isPinned: false,
    replies: [
      {
        id: 'rep-3-1',
        author: 'Aarav Sharma',
        storeName: 'Sharma Superstore',
        text: 'The built-in "Nudge on WhatsApp" button in the Operations Dashboard has been golden. It sends a polite greeting in Hindi with their exact itemized bill and dynamic UPI link. 90% pay within 15 minutes.',
        sourceLang: 'en',
        time: '3 hours ago',
        isVerified: false,
        isAdmin: false,
      },
    ],
  },
  {
    id: 'disc-4',
    channel: 'feature-requests',
    category: 'Local SEO',
    title: 'Voice-assisted multi-item barcode lookup with Hindi & Telugu number pronunciation',
    body: 'Would love if the camera scanner announces the item name and price aloud in Telugu or Hindi right at the counter so customer and staff hear it simultaneously.',
    author: 'K. Venkatesh Rao',
    storeName: 'Venkateshwara Super Bazaar',
    locality: 'Guntur, Andhra Pradesh',
    sourceLang: 'en',
    status: 'approved',
    adminNote: 'Feature Approved by Core Team! We are adding Soundbox voice announcement integration to make checkout 10x faster.',
    createdAt: '1 day ago',
    upvotes: 93,
    replyCount: 12,
    isStaffVerified: true,
    isPinned: true,
    replies: [
      {
        id: 'rep-4-1',
        author: 'FeraSetu Admin',
        storeName: 'Core Platform Engineering',
        text: 'This feature has been approved! We are wiring it directly into the Bluetooth thermal printer & soundbox pipeline in the next release to make it better and zero-latency.',
        sourceLang: 'en',
        time: '18 hours ago',
        isVerified: true,
        isAdmin: true,
        adminBadge: 'Core Team',
      },
    ],
  },
  {
    id: 'disc-5',
    channel: 'hardware',
    category: 'Getting Started',
    title: 'Recommended Bluetooth thermal printer model for instant 58mm / 80mm counter bills?',
    body: 'Looking for a reliable printer that works with Android phones over Bluetooth and prints clean UPI QR codes at the bottom of the bill.',
    author: 'Preeti Nambiar',
    storeName: 'Nambiar Spices & Daily',
    locality: 'Panampilly Nagar, Kochi',
    sourceLang: 'en',
    status: 'approved',
    adminNote: 'ESC/POS tested: Everycom EC-58 and NGX N-58 are 100% plug & play.',
    createdAt: '2 days ago',
    upvotes: 27,
    replyCount: 6,
    isStaffVerified: false,
    isPinned: false,
    replies: [
      {
        id: 'rep-5-1',
        author: 'Gaurav Khandelwal',
        storeName: 'Jaipur Provisions',
        text: 'Everycom EC-58 or NGX N-58. Pair once in Bluetooth settings and the 1-Click Print Bill button handles standard ESC/POS commands instantly.',
        sourceLang: 'en',
        time: '1 day ago',
        isVerified: false,
        isAdmin: false,
      },
    ],
  },
];

// In-memory working copy
let IN_MEMORY_DISCUSSIONS = [...SEED_DISCUSSIONS];

/**
 * Lazy init community tables in D1
 */
export async function ensureCommunityTables(db) {
  if (!db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS community_discussions (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL DEFAULT 'general',
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        author TEXT NOT NULL,
        store_name TEXT,
        locality TEXT,
        source_lang TEXT NOT NULL DEFAULT 'en',
        status TEXT NOT NULL DEFAULT 'open',
        admin_note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        upvotes INTEGER NOT NULL DEFAULT 0,
        reply_count INTEGER NOT NULL DEFAULT 0,
        is_staff_verified INTEGER NOT NULL DEFAULT 0,
        is_pinned INTEGER NOT NULL DEFAULT 0
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS community_replies (
        id TEXT PRIMARY KEY,
        discussion_id TEXT NOT NULL,
        author TEXT NOT NULL,
        store_name TEXT,
        text TEXT NOT NULL,
        source_lang TEXT NOT NULL DEFAULT 'en',
        time TEXT NOT NULL DEFAULT 'Just now',
        is_verified INTEGER NOT NULL DEFAULT 0,
        is_admin INTEGER NOT NULL DEFAULT 0,
        admin_badge TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    try { await db.prepare("ALTER TABLE community_discussions ADD COLUMN channel TEXT DEFAULT 'general'").run(); } catch {}
    try { await db.prepare("ALTER TABLE community_discussions ADD COLUMN source_lang TEXT DEFAULT 'en'").run(); } catch {}
    try { await db.prepare("ALTER TABLE community_discussions ADD COLUMN status TEXT DEFAULT 'open'").run(); } catch {}
    try { await db.prepare("ALTER TABLE community_discussions ADD COLUMN admin_note TEXT").run(); } catch {}
    try { await db.prepare("ALTER TABLE community_replies ADD COLUMN source_lang TEXT DEFAULT 'en'").run(); } catch {}
    try { await db.prepare("ALTER TABLE community_replies ADD COLUMN is_admin INTEGER DEFAULT 0").run(); } catch {}
    try { await db.prepare("ALTER TABLE community_replies ADD COLUMN admin_badge TEXT").run(); } catch {}
  } catch (err) {
    console.warn('[FeraSetu Community] Table init warning:', err?.message);
  }
}

/**
 * Handle POST /api/translate
 * Dynamic context-aware translation endpoint
 */
export async function handleTranslateRequest(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { texts, text, targetLang, sourceLang = 'en', context = 'retail' } = body;
  const inputTexts = Array.isArray(texts) ? texts : (typeof text === 'string' ? [text] : []);

  if (inputTexts.length === 0) {
    return new Response(JSON.stringify({ error: 'texts or text parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!targetLang) {
    return new Response(JSON.stringify({ error: 'targetLang is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const translations = await translateDynamicTexts({
    texts: inputTexts,
    targetLang,
    sourceLang,
    context
  }, env);

  return new Response(JSON.stringify({
    success: true,
    targetLang,
    sourceLang,
    context,
    translations,
    translation: translations[0] || ''
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

/**
 * Handle GET /api/community/discussions
 * Automatically translates cross-language discussions based on viewer's language.
 */
export async function handleListCommunityDiscussions(request, env) {
  await ensureCommunityTables(env?.DB);
  const url = new URL(request.url);
  const targetLang = (url.searchParams.get('targetLang') || url.searchParams.get('lang') || 'en').toLowerCase().trim();
  const topic = url.searchParams.get('topic');
  const channel = url.searchParams.get('channel');
  const status = url.searchParams.get('status');

  let list = [...IN_MEMORY_DISCUSSIONS];

  if (channel && channel !== 'all') {
    list = list.filter(d => d.channel === channel);
  }
  if (topic && topic !== 'All Topics') {
    list = list.filter(d => d.category === topic);
  }
  if (status && status !== 'all') {
    list = list.filter(d => d.status === status);
  }

  // Cross-Language Automatic Translation Pipeline
  // Translates any post or comment where post.sourceLang !== targetLang
  const needsTranslationItems = [];
  const translationPointers = [];

  list.forEach((item, discIdx) => {
    const itemLang = item.sourceLang || detectTextLanguage(item.title, 'en');

    if (itemLang !== targetLang) {
      needsTranslationItems.push(item.title);
      translationPointers.push({ type: 'title', discIdx, sourceLang: itemLang });

      needsTranslationItems.push(item.body);
      translationPointers.push({ type: 'body', discIdx, sourceLang: itemLang });
    }

    if (item.adminNote) {
      const noteLang = detectTextLanguage(item.adminNote, 'en');
      if (noteLang !== targetLang) {
        needsTranslationItems.push(item.adminNote);
        translationPointers.push({ type: 'adminNote', discIdx, sourceLang: noteLang });
      }
    }

    if (item.replies) {
      item.replies.forEach((rep, repIdx) => {
        const repLang = rep.sourceLang || detectTextLanguage(rep.text, 'en');
        if (repLang !== targetLang) {
          needsTranslationItems.push(rep.text);
          translationPointers.push({ type: 'reply', discIdx, repIdx, sourceLang: repLang });
        }
      });
    }
  });

  if (needsTranslationItems.length > 0) {
    try {
      // Group translations by sourceLang to translate cleanly
      const sourceLangs = Array.from(new Set(translationPointers.map(p => p.sourceLang)));

      // Clone list so we don't mutate in-memory original texts
      list = JSON.parse(JSON.stringify(list));

      for (const sLang of sourceLangs) {
        const sIndices = [];
        const sTexts = [];
        translationPointers.forEach((p, idx) => {
          if (p.sourceLang === sLang) {
            sIndices.push(idx);
            sTexts.push(needsTranslationItems[idx]);
          }
        });

        if (sTexts.length > 0) {
          const transResult = await translateDynamicTexts({
            texts: sTexts,
            targetLang,
            sourceLang: sLang,
            context: 'community'
          }, env);

          sIndices.forEach((origPtrIdx, resultIdx) => {
            const ptr = translationPointers[origPtrIdx];
            const translated = transResult[resultIdx];
            const targetDisc = list[ptr.discIdx];

            targetDisc.translations = targetDisc.translations || {};
            if (!targetDisc.translations[targetLang]) {
              targetDisc.translations[targetLang] = {};
            }

            if (ptr.type === 'title') {
              targetDisc.originalTitle = targetDisc.title;
              targetDisc.title = translated;
              targetDisc.translations[targetLang].title = translated;
              targetDisc.isTranslated = true;
              targetDisc.translatedFrom = ptr.sourceLang;
            } else if (ptr.type === 'body') {
              targetDisc.originalBody = targetDisc.body;
              targetDisc.body = translated;
              targetDisc.translations[targetLang].body = translated;
              targetDisc.isTranslated = true;
              targetDisc.translatedFrom = ptr.sourceLang;
            } else if (ptr.type === 'adminNote') {
              targetDisc.originalAdminNote = targetDisc.adminNote;
              targetDisc.adminNote = translated;
            } else if (ptr.type === 'reply' && ptr.repIdx !== undefined) {
              const r = targetDisc.replies[ptr.repIdx];
              if (r) {
                r.originalText = r.text;
                r.text = translated;
                r.translations = r.translations || {};
                r.translations[targetLang] = translated;
                r.isTranslated = true;
                r.translatedFrom = ptr.sourceLang;
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('[FeraSetu Community] Translation pipeline notice:', err?.message || err);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    targetLang,
    discussions: list
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle POST /api/community/discussions
 */
export async function handleCreateCommunityDiscussion(request, env) {
  await ensureCommunityTables(env?.DB);
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const {
    title,
    body: desc,
    author = 'Store Owner',
    storeName = 'My Local Store',
    locality = 'Local Area',
    category = 'Payments & Soundbox',
    channel = 'general',
    userLang = 'en'
  } = body;

  if (!title || !desc) {
    return new Response(JSON.stringify({ error: 'Title and body are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Detect language of post (e.g. Telugu 'te' if user typed in Telugu)
  const detectedLang = detectTextLanguage(title + ' ' + desc, userLang);

  const newPost = {
    id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    channel: channel || 'general',
    category,
    title: title.trim(),
    body: desc.trim(),
    author,
    storeName,
    locality,
    sourceLang: detectedLang,
    status: 'open',
    adminNote: null,
    createdAt: 'Just now',
    upvotes: 1,
    replyCount: 0,
    isStaffVerified: false,
    isPinned: false,
    hasUserUpvoted: true,
    replies: []
  };

  IN_MEMORY_DISCUSSIONS.unshift(newPost);

  if (env?.DB) {
    try {
      await env.DB.prepare(`
        INSERT INTO community_discussions (
          id, channel, category, title, body, author, store_name, locality,
          source_lang, status, admin_note, upvotes, reply_count, is_staff_verified, is_pinned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0)
      `).bind(
        newPost.id, newPost.channel, newPost.category, newPost.title, newPost.body,
        newPost.author, newPost.storeName, newPost.locality, newPost.sourceLang,
        newPost.status, newPost.adminNote
      ).run();
    } catch (dbErr) {
      console.warn('[FeraSetu Community] D1 insert warning:', dbErr?.message);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    discussion: newPost
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle POST /api/community/discussions/:id/replies
 */
export async function handleAddCommunityReply(request, env, discussionId) {
  await ensureCommunityTables(env?.DB);
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const {
    text,
    author = 'Merchant',
    storeName = 'Store',
    userLang = 'en',
    isAdmin = false,
    adminBadge = ''
  } = body;

  if (!text || !text.trim()) {
    return new Response(JSON.stringify({ error: 'Reply text is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const disc = IN_MEMORY_DISCUSSIONS.find(d => d.id === discussionId);
  if (!disc) {
    return new Response(JSON.stringify({ error: 'Discussion not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Detect language of reply
  const detectedLang = detectTextLanguage(text, userLang);

  const replyId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newReply = {
    id: replyId,
    author: isAdmin ? (author || 'FeraSetu Admin') : author,
    storeName: isAdmin ? 'Platform Team' : storeName,
    text: text.trim(),
    sourceLang: detectedLang,
    time: 'Just now',
    isVerified: Boolean(isAdmin),
    isAdmin: Boolean(isAdmin),
    adminBadge: isAdmin ? (adminBadge || 'Admin • Core Team') : undefined,
  };

  if (!disc.replies) disc.replies = [];
  disc.replies.push(newReply);
  disc.replyCount = (disc.replyCount || 0) + 1;

  if (env?.DB) {
    try {
      await env.DB.prepare(`
        INSERT INTO community_replies (
          id, discussion_id, author, store_name, text, source_lang, is_verified, is_admin, admin_badge
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        newReply.id, discussionId, newReply.author, newReply.storeName,
        newReply.text, newReply.sourceLang, newReply.isVerified ? 1 : 0,
        newReply.isAdmin ? 1 : 0, newReply.adminBadge || null
      ).run();

      await env.DB.prepare(
        "UPDATE community_discussions SET reply_count = reply_count + 1 WHERE id = ?"
      ).bind(discussionId).run();
    } catch (dbErr) {
      console.warn('[FeraSetu Community] D1 reply insert warning:', dbErr?.message);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    reply: newReply,
    replyCount: disc.replyCount
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle PATCH /api/community/discussions/:id
 * Admin Moderation: Approve Feature, Update Status, Add Admin Note, Pin/Unpin
 */
export async function handleUpdateCommunityDiscussion(request, env, discussionId) {
  await ensureCommunityTables(env?.DB);
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { status, adminNote, isPinned, isStaffVerified } = body;
  const disc = IN_MEMORY_DISCUSSIONS.find(d => d.id === discussionId);
  if (!disc) {
    return new Response(JSON.stringify({ error: 'Discussion not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (status !== undefined) disc.status = status;
  if (adminNote !== undefined) disc.adminNote = adminNote;
  if (isPinned !== undefined) disc.isPinned = Boolean(isPinned);
  if (isStaffVerified !== undefined) disc.isStaffVerified = Boolean(isStaffVerified);

  if (env?.DB) {
    try {
      await env.DB.prepare(`
        UPDATE community_discussions
        SET status = COALESCE(?, status),
            admin_note = COALESCE(?, admin_note),
            is_pinned = COALESCE(?, is_pinned),
            is_staff_verified = COALESCE(?, is_staff_verified)
        WHERE id = ?
      `).bind(
        status !== undefined ? status : null,
        adminNote !== undefined ? adminNote : null,
        isPinned !== undefined ? (isPinned ? 1 : 0) : null,
        isStaffVerified !== undefined ? (isStaffVerified ? 1 : 0) : null,
        discussionId
      ).run();
    } catch (dbErr) {
      console.warn('[FeraSetu Community] D1 update warning:', dbErr?.message);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Discussion updated successfully',
    discussion: disc
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle DELETE /api/community/discussions/:id
 * Admin Moderation: Delete discussion or question
 */
export async function handleDeleteCommunityDiscussion(request, env, discussionId) {
  await ensureCommunityTables(env?.DB);
  const idx = IN_MEMORY_DISCUSSIONS.findIndex(d => d.id === discussionId);
  if (idx !== -1) {
    IN_MEMORY_DISCUSSIONS.splice(idx, 1);
  }

  if (env?.DB) {
    try {
      await env.DB.prepare("DELETE FROM community_discussions WHERE id = ?").bind(discussionId).run();
      await env.DB.prepare("DELETE FROM community_replies WHERE discussion_id = ?").bind(discussionId).run();
    } catch (dbErr) {
      console.warn('[FeraSetu Community] D1 delete warning:', dbErr?.message);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Discussion deleted successfully',
    id: discussionId
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle DELETE /api/community/discussions/:id/replies/:replyId
 * Admin Moderation: Delete comment
 */
export async function handleDeleteCommunityReply(request, env, discussionId, replyId) {
  await ensureCommunityTables(env?.DB);
  const disc = IN_MEMORY_DISCUSSIONS.find(d => d.id === discussionId);
  if (disc && disc.replies) {
    const rIdx = disc.replies.findIndex(r => r.id === replyId);
    if (rIdx !== -1) {
      disc.replies.splice(rIdx, 1);
      disc.replyCount = Math.max(0, (disc.replyCount || 1) - 1);
    }
  }

  if (env?.DB) {
    try {
      await env.DB.prepare("DELETE FROM community_replies WHERE id = ?").bind(replyId).run();
      await env.DB.prepare("UPDATE community_discussions SET reply_count = MAX(0, reply_count - 1) WHERE id = ?").bind(discussionId).run();
    } catch (dbErr) {
      console.warn('[FeraSetu Community] D1 reply delete warning:', dbErr?.message);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Reply deleted successfully',
    replyId
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * FeraSetu Analytics Aggregation, Retention & Reporting Engine
 * 
 * Philosophy: "Measure behavior, don't manufacture identities."
 * - Daily metric aggregation for long-term trends without raw event retention.
 * - Privacy-preserving coarse funnel and commercial conversion metrics.
 * - Safe data retention pruning for raw events (engineering default: 30 days).
 */

/**
 * Aggregates raw analytics events for a specific date into analytics_aggregates_daily.
 * 
 * @param {object} env - Cloudflare Worker environment with DB binding
 * @param {string} [dateStr] - YYYY-MM-DD target date (defaults to today)
 * @param {string} [tenantId] - Specific tenant or null for all
 */
export async function runDailyAggregation(env, dateStr = null, tenantId = null) {
  if (!env.DB) return { aggregated: 0 };

  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  const nextDate = new Date(new Date(targetDate + 'T00:00:00Z').getTime() + 86400000).toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  // Efficient indexed range query using idx_analytics_events_created_at
  let query = `
    SELECT 
      tenant_id,
      event_name,
      COUNT(*) as event_count,
      COUNT(DISTINCT visitor_id) as unique_visitors,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM analytics_events
    WHERE created_at >= ? AND created_at < ?
  `;
  const params = [targetDate, nextDate];

  if (tenantId) {
    query += ` AND tenant_id = ?`;
    params.push(tenantId);
  }

  query += ` GROUP BY tenant_id, event_name`;

  const rows = await env.DB.prepare(query).bind(...params).all();
  const results = rows.results || [];
  let writeCount = 0;

  for (const row of results) {
    const tId = row.tenant_id || 'platform';
    const evt = row.event_name;
    const count = row.event_count || 0;
    const visitors = row.unique_visitors || 0;

    // 1. Metric: Total event count (Idempotent upsert via unique index)
    const totalId = `agg_${tId}_${targetDate}_${evt}_total`;
    await env.DB.prepare(`
      INSERT INTO analytics_aggregates_daily (id, tenant_id, date, metric_name, dimension, count, value, updated_at)
      VALUES (?, ?, ?, ?, 'total', ?, ?, ?)
      ON CONFLICT(tenant_id, date, metric_name, dimension) DO UPDATE SET
        count = excluded.count,
        value = excluded.value,
        updated_at = excluded.updated_at
    `).bind(totalId, tId, targetDate, evt, count, count, nowIso).run();

    // 2. Metric: Unique visitors (Idempotent upsert via unique index)
    const uniqId = `agg_${tId}_${targetDate}_${evt}_unique_visitors`;
    await env.DB.prepare(`
      INSERT INTO analytics_aggregates_daily (id, tenant_id, date, metric_name, dimension, count, value, updated_at)
      VALUES (?, ?, ?, ?, 'unique_visitors', ?, ?, ?)
      ON CONFLICT(tenant_id, date, metric_name, dimension) DO UPDATE SET
        count = excluded.count,
        value = excluded.value,
        updated_at = excluded.updated_at
    `).bind(uniqId, tId, targetDate, evt, visitors, visitors, nowIso).run();

    writeCount += 2;
  }

  return { targetDate, aggregatedRecords: writeCount };
}

/**
 * Prunes raw events older than retentionDays (default: 30 days).
 * Aggregates remain intact for long-term historical reporting.
 * Safe, idempotent, and fully indexed.
 * 
 * @param {object} env - Cloudflare Worker environment with DB binding
 * @param {number} [retentionDays=30] - Number of days of raw events to retain
 * @param {string} [cutoffTimestamp=null] - Optional exact ISO cutoff for deterministic verification
 */
export async function pruneRawEvents(env, retentionDays = 30, cutoffTimestamp = null) {
  if (!env.DB) return { deleted: 0 };
  const days = Math.max(1, parseInt(retentionDays, 10) || 30);

  let res;
  if (cutoffTimestamp) {
    res = await env.DB.prepare(`
      DELETE FROM analytics_events
      WHERE created_at < ?
    `).bind(cutoffTimestamp).run();
  } else {
    res = await env.DB.prepare(`
      DELETE FROM analytics_events
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `).bind(days).run();
  }

  return {
    success: true,
    retentionDays: days,
    deletedRows: res.meta?.changes || 0
  };
}

/**
 * Retrieves platform-level conversion and product telemetry for Admin Analytics.
 * 
 * @param {object} env - Cloudflare Worker environment with DB binding
 * @param {number} [days=30] - Time window in days
 */
export async function getPlatformAnalytics(env, days = 30) {
  if (!env.DB) {
    return {
      visitors: 0,
      sessions: 0,
      pageViews: 0,
      funnel: {},
      topCtas: [],
      topPages: [],
      devices: {},
      geo: {},
      recentErrors: []
    };
  }

  const windowDays = Math.max(1, Math.min(90, parseInt(days, 10) || 30));

  // 1. High-level counts for 'platform' tenant
  const statsRows = await env.DB.prepare(`
    SELECT 
      event_name,
      COUNT(*) as count,
      COUNT(DISTINCT visitor_id) as visitors,
      COUNT(DISTINCT session_id) as sessions
    FROM analytics_events
    WHERE tenant_id = 'platform'
      AND created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY event_name
  `).bind(windowDays).all();

  const eventMap = {};
  let totalPageViews = 0;
  let totalSessions = 0;
  let totalVisitors = 0;

  for (const r of (statsRows.results || [])) {
    eventMap[r.event_name] = {
      count: r.count,
      visitors: r.visitors,
      sessions: r.sessions
    };
    if (r.event_name === 'page_view') {
      totalPageViews = r.count;
      totalVisitors = r.visitors;
      totalSessions = r.sessions;
    }
  }

  // 2. Structured Funnel Metrics
  const landingVisitors = eventMap['page_view']?.visitors || 0;
  const featuresEngaged = (eventMap['section_view']?.visitors || 0);
  const pricingViews = eventMap['pricing_view']?.visitors || 0;
  const pricingSelects = eventMap['pricing_plan_select']?.visitors || 0;
  const ctaClicks = eventMap['cta_click']?.visitors || 0;
  const signupStarts = eventMap['signup_start']?.visitors || 0;
  const signupCompletes = eventMap['signup_complete']?.visitors || 0;
  const trialStarts = eventMap['trial_start']?.visitors || 0;

  const funnel = {
    landing_visitors: landingVisitors,
    features_engaged: featuresEngaged,
    pricing_views: pricingViews,
    pricing_selects: pricingSelects,
    cta_clicks: ctaClicks,
    signup_starts: signupStarts,
    signup_completes: signupCompletes,
    trial_starts: trialStarts,
    rates: {
      landing_to_cta: landingVisitors > 0 ? Number(((ctaClicks / landingVisitors) * 100).toFixed(1)) : 0,
      pricing_to_signup: pricingViews > 0 ? Number(((signupStarts / pricingViews) * 100).toFixed(1)) : 0,
      signup_completion: signupStarts > 0 ? Number(((signupCompletes / signupStarts) * 100).toFixed(1)) : 0,
      overall_conversion: landingVisitors > 0 ? Number(((trialStarts / landingVisitors) * 100).toFixed(2)) : 0
    }
  };

  // 3. Device category distribution
  const deviceRows = await env.DB.prepare(`
    SELECT device_category, COUNT(*) as count
    FROM analytics_events
    WHERE tenant_id = 'platform'
      AND created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY device_category
  `).bind(windowDays).all();

  const devices = {};
  for (const r of (deviceRows.results || [])) {
    devices[r.device_category || 'desktop'] = r.count;
  }

  // 4. Coarse Geographic distribution (Country only)
  const geoRows = await env.DB.prepare(`
    SELECT country, COUNT(*) as count
    FROM analytics_events
    WHERE tenant_id = 'platform'
      AND created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY country
    ORDER BY count DESC
    LIMIT 10
  `).bind(windowDays).all();

  const geo = (geoRows.results || []).map(r => ({
    country: r.country || 'Unknown',
    count: r.count
  }));

  // 5. Daily trend chart
  const dailyRows = await env.DB.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(DISTINCT visitor_id) as visitors,
      COUNT(CASE WHEN event_name = 'page_view' THEN 1 END) as views,
      COUNT(CASE WHEN event_name = 'cta_click' THEN 1 END) as ctas,
      COUNT(CASE WHEN event_name = 'signup_start' THEN 1 END) as signups
    FROM analytics_events
    WHERE tenant_id = 'platform'
      AND created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `).bind(windowDays).all();

  // 6. Recent safe friction / error events
  const errorRows = await env.DB.prepare(`
    SELECT event_name, properties, created_at
    FROM analytics_events
    WHERE tenant_id = 'platform' AND event_name = 'error'
    ORDER BY created_at DESC
    LIMIT 15
  `).all();

  const recentErrors = (errorRows.results || []).map(r => {
    let props = {};
    try { props = JSON.parse(r.properties || '{}'); } catch {}
    return {
      error_name: props.error_name || 'GenericError',
      error_type: props.error_type || 'client_runtime',
      status_code: props.status_code || null,
      path: props.path || '/',
      created_at: r.created_at
    };
  });

  return {
    windowDays,
    summary: {
      totalVisitors,
      totalSessions,
      totalPageViews,
      totalCtas: ctaClicks,
      totalSignups: signupCompletes,
      totalTrials: trialStarts
    },
    funnel,
    devices,
    geo,
    dailyTrend: dailyRows.results || [],
    recentErrors
  };
}

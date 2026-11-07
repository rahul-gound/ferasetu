// FeraSetu — Autonomous Platform Site Edge Renderer
// ==============================================================
// Handles edge routing, HTML synthesis, and Cloudflare Pages asset proxying
// for Platform Sites created in FeraSetu AI Website Studio (e.g. nothing.ferasetu.com).

import { FERASETU_CSP, isStaticAsset, proxyPagesAsset } from "../storefront.js";

/**
 * Renders an accessible, high-contrast, responsive Platform Site HTML document.
 */
export function renderPlatformSiteHtml(site, proposal, deployment, pathname = "/") {
  const siteName = escapeHtml(site.name || site.project_identifier || "Platform Site");
  const hostname = escapeHtml(site.primary_hostname || "ferasetu.com");
  const target = escapeHtml(site.hosting_target === "pages" ? "Cloudflare Pages" : "Cloudflare Workers");
  const version = escapeHtml(deployment?.version || "v1.0.0");

  let spec = null;
  if (proposal?.site_specification_json) {
    try {
      spec = typeof proposal.site_specification_json === "string" 
        ? JSON.parse(proposal.site_specification_json) 
        : proposal.site_specification_json;
    } catch {
      spec = null;
    }
  }

  const primaryColor = spec?.theme?.primaryColor || "#0052FF";
  const navLinks = spec?.navigation || [
    { label: "Home", href: "/" },
    { label: "Overview", href: "#overview" },
    { label: "Infrastructure", href: "#infrastructure" },
    { label: "Support", href: "https://ferasetu.com/terms" }
  ];

  // Resolve matching page from proposal or use default
  const currentPage = (spec?.pages || []).find(p => p.path === pathname) || spec?.pages?.[0];
  const pageTitle = currentPage?.title ? `${escapeHtml(currentPage.title)} — ${siteName}` : `${siteName} — FeraSetu Platform Site`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageTitle}</title>
  <meta name="description" content="${escapeHtml(site.description || `${siteName} official web property powered by FeraSetu autonomous edge infrastructure.`)}" />
  <link rel="icon" href="https://ferasetu.com/favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    .bg-grid { background-image: radial-gradient(rgba(0, 82, 255, 0.08) 1px, transparent 1px); background-size: 24px 24px; }
  </style>
</head>
<body class="bg-[#F8FAFC] text-slate-900 min-h-screen flex flex-col antialiased selection:bg-[#0052FF]/10 selection:text-[#0052FF]">

  <!-- Top Autonomous Edge Infrastructure Pill -->
  <div class="bg-slate-950 text-white text-[12px] py-1.5 px-4 font-medium flex items-center justify-between border-b border-slate-800">
    <div class="flex items-center gap-2 max-w-7xl mx-auto w-full">
      <span class="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Edge Node Active
      </span>
      <span class="text-slate-500">·</span>
      <span class="text-slate-300 font-mono text-[11px]">${hostname}</span>
      <span class="text-slate-500">·</span>
      <span class="text-slate-400 hidden sm:inline">FeraSetu Autonomous Infrastructure (${target})</span>
      <div class="ml-auto flex items-center gap-3">
        <a href="https://ferasetu.com/admin" class="text-slate-300 hover:text-white transition-colors text-[11px] underline underline-offset-4 font-semibold">
          AI Studio Settings
        </a>
      </div>
    </div>
  </div>

  <!-- Main Navigation Header -->
  <header class="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-[${primaryColor}] text-white font-extrabold flex items-center justify-center text-sm shadow-sm shadow-[${primaryColor}]/20">
          FS
        </div>
        <div>
          <h1 class="text-base font-bold text-slate-900 leading-tight">${siteName}</h1>
          <p class="text-[11px] font-mono text-slate-500">${hostname}</p>
        </div>
      </div>

      <nav class="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
        ${navLinks.map(link => `
          <a href="${escapeHtml(link.href)}" class="hover:text-[${primaryColor}] transition-colors">
            ${escapeHtml(link.label)}
          </a>
        `).join('')}
      </nav>

      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
          ${escapeHtml(site.status.toUpperCase())}
        </span>
      </div>
    </div>
  </header>

  <!-- Hero & Content Surface -->
  <main class="flex-1 bg-grid py-12 px-6">
    <div class="max-w-4xl mx-auto space-y-10">
      
      <!-- Welcome Hero -->
      <section class="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm relative overflow-hidden text-center sm:text-left">
        <div class="sm:flex sm:items-center sm:justify-between gap-8">
          <div class="space-y-4 max-w-xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[${primaryColor}] border border-blue-200/60">
              <span class="w-1.5 h-1.5 rounded-full bg-[${primaryColor}]"></span>
              FeraSetu Autonomous Web Infrastructure
            </div>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              ${escapeHtml(spec?.summary || `Welcome to ${siteName}`)}
            </h2>
            <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
              ${escapeHtml(site.description || `This web property is live, verified, and running on FeraSetu's high-speed distributed edge network with automated TLS and multi-region routing.`)}
            </p>
          </div>

          <div class="mt-6 sm:mt-0 flex-shrink-0 flex flex-col gap-3">
            <a href="https://ferasetu.com/admin" class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[${primaryColor}] hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95">
              <span>Customize in AI Studio</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </a>
            <div class="text-center font-mono text-[11px] text-slate-400">
              Deployment: ${version}
            </div>
          </div>
        </div>
      </section>

      <!-- Proposal Render or Infrastructure Specification -->
      ${renderSections(currentPage, spec, site, primaryColor)}

      <!-- Infrastructure & Verification Grid -->
      <section id="infrastructure" class="grid sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Target Engine</div>
          <div class="text-base font-bold text-slate-900">${target}</div>
          <div class="text-xs text-slate-500 mt-1">Zero-cold-start edge compute</div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Security & Headers</div>
          <div class="text-base font-bold text-emerald-600 flex items-center gap-1.5">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
            Strict CSP & HSTS
          </div>
          <div class="text-xs text-slate-500 mt-1">Grade-A automated compliance</div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">AI Website Studio</div>
          <div class="text-base font-bold text-slate-900">Conversational Control</div>
          <div class="text-xs text-slate-500 mt-1">Natural human language updates</div>
        </div>
      </section>

    </div>
  </main>

  <!-- Clean Footer -->
  <footer class="bg-white border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-500">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="font-bold text-slate-900">${siteName}</span>
        <span>·</span>
        <span class="font-mono text-[11px]">${hostname}</span>
      </div>
      <div>
        Powered by <a href="https://ferasetu.com" class="font-semibold text-slate-800 hover:text-[${primaryColor}] transition-colors">FeraSetu Autonomous Infrastructure</a>. 0% Platform Commission.
      </div>
    </div>
  </footer>

</body>
</html>`;
}

function renderSections(page, spec, site, primaryColor) {
  const sections = page?.sections || page?.components || [];
  if (!sections.length) {
    return `
      <section class="bg-white rounded-2xl p-8 border border-slate-200 space-y-6">
        <div class="border-b border-slate-100 pb-4">
          <h3 class="text-lg font-bold text-slate-900">Site Configuration & Capabilities</h3>
          <p class="text-xs text-slate-500 mt-0.5">Live configuration parameters for this autonomous platform property.</p>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 text-xs font-medium">
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <div class="text-slate-400 font-mono text-[11px] uppercase">Project Identifier</div>
            <div class="text-slate-900 font-bold font-mono mt-1">${escapeHtml(site.project_identifier || 'none')}</div>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <div class="text-slate-400 font-mono text-[11px] uppercase">Bound Hostname</div>
            <div class="text-slate-900 font-bold font-mono mt-1">${escapeHtml(site.primary_hostname || 'none')}</div>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <div class="text-slate-400 font-mono text-[11px] uppercase">Production Protection</div>
            <div class="text-emerald-700 font-bold mt-1">Enabled (Branch Protection & Rollback)</div>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <div class="text-slate-400 font-mono text-[11px] uppercase">Created Timestamp</div>
            <div class="text-slate-900 font-mono mt-1">${escapeHtml(site.created_at || 'Just now')}</div>
          </div>
        </div>

        <div class="bg-blue-50/60 p-5 rounded-xl border border-blue-100 flex items-start gap-3">
          <svg class="w-5 h-5 text-[${primaryColor}] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div class="text-xs text-slate-700 space-y-1">
            <div class="font-bold text-slate-900">Customize With Natural Language</div>
            <p>You can describe new sections, FAQs, articles, or layouts in the <strong>FeraSetu AI Website Studio</strong> tab inside the Admin Dashboard.</p>
          </div>
        </div>
      </section>
    `;
  }

  return sections.map(sec => {
    const type = sec.type;
    const props = sec.props || {};

    if (type === "Hero") {
      return `
        <section class="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-4">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${escapeHtml(props.headline || "Welcome")}</h2>
          <p class="text-sm text-slate-600 max-w-xl mx-auto">${escapeHtml(props.subheadline || "")}</p>
        </section>
      `;
    }

    if (type === "FAQ") {
      const items = props.items || [];
      return `
        <section class="bg-white rounded-2xl p-8 border border-slate-200 space-y-6">
          <h3 class="text-xl font-bold text-slate-900">${escapeHtml(props.title || "Frequently Asked Questions")}</h3>
          <div class="space-y-4">
            ${items.map((it, idx) => `
              <details class="group bg-slate-50 p-4 rounded-xl border border-slate-200/80 cursor-pointer">
                <summary class="font-semibold text-sm text-slate-900 flex justify-between items-center select-none">
                  <span>${escapeHtml(it.question)}</span>
                  <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p class="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200/60 leading-relaxed">${escapeHtml(it.answer)}</p>
              </details>
            `).join('')}
          </div>
        </section>
      `;
    }

    if (type === "ContactEscalation") {
      return `
        <section class="bg-white rounded-2xl p-8 border border-slate-200 sm:flex sm:items-center sm:justify-between gap-6">
          <div>
            <h3 class="text-lg font-bold text-slate-900">${escapeHtml(props.headline || "Need assistance?")}</h3>
            <p class="text-xs text-slate-600 mt-1">${escapeHtml(props.operatingHours || "Available 24/7")}</p>
          </div>
          <a href="mailto:${escapeHtml(props.supportEmail || "support@ferasetu.com")}" class="mt-4 sm:mt-0 inline-flex items-center px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors">
            Contact ${escapeHtml(props.supportEmail || "support@ferasetu.com")}
          </a>
        </section>
      `;
    }

    return `
      <section class="bg-white rounded-2xl p-6 border border-slate-200">
        <h4 class="font-bold text-slate-900 text-sm mb-2">${escapeHtml(type)}</h4>
        <pre class="bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-700 overflow-x-auto">${escapeHtml(JSON.stringify(props, null, 2))}</pre>
      </section>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Handles incoming HTTP requests destined for a Platform Site.
 */
export async function handlePlatformSiteRequest(request, env, ctx, platformSite) {
  const url = new URL(request.url);

  // 1. Static asset bypass
  if (isStaticAsset(url.pathname)) {
    return proxyPagesAsset(request, env, ctx);
  }

  // 2. If the platform site has a real Cloudflare Pages project deployment, try proxying to pages.dev
  if (platformSite.hosting_target === "pages" && platformSite.project_identifier) {
    try {
      const pagesUrl = new URL(url.pathname + url.search, `https://${platformSite.project_identifier}.pages.dev`);
      const pagesRes = await fetch(pagesUrl.toString(), {
        method: request.method,
        headers: request.headers,
        signal: AbortSignal.timeout(2500)
      });
      if (pagesRes.ok && pagesRes.status === 200) {
        const responseHeaders = new Headers(pagesRes.headers);
        responseHeaders.set("Content-Security-Policy", FERASETU_CSP);
        responseHeaders.set("X-Frame-Options", "SAMEORIGIN");
        responseHeaders.set("X-Content-Type-Options", "nosniff");
        return new Response(pagesRes.body, {
          status: pagesRes.status,
          headers: responseHeaders
        });
      }
    } catch {
      // Pages not yet built/deployed on pages.dev; fall through to edge synthesis
    }
  }

  // 3. Query active proposal & deployment from D1
  let proposal = null;
  let deployment = null;
  if (env?.DB) {
    try {
      if (platformSite.active_deployment_id) {
        deployment = await env.DB.prepare(
          "SELECT * FROM platform_deployments WHERE id = ?"
        ).bind(platformSite.active_deployment_id).first();
      }

      proposal = await env.DB.prepare(
        "SELECT * FROM platform_ai_proposals WHERE site_id = ? AND status = 'applied' ORDER BY reviewed_at DESC LIMIT 1"
      ).bind(platformSite.id).first();

      if (!proposal) {
        proposal = await env.DB.prepare(
          "SELECT * FROM platform_ai_proposals WHERE site_id = ? ORDER BY created_at DESC LIMIT 1"
        ).bind(platformSite.id).first();
      }
    } catch (dbErr) {
      console.warn("Could not query platform proposals/deployments from D1:", dbErr?.message || dbErr);
    }
  }

  const html = renderPlatformSiteHtml(platformSite, proposal, deployment, url.pathname);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": FERASETU_CSP,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-FeraSetu-Platform-Site": platformSite.project_identifier || platformSite.id,
      "Cache-Control": "public, max-age=60, s-maxage=300"
    }
  });
}

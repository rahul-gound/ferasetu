/**
 * FeraSetu Pro — Deterministic Project Analyzer Engine
 * =============================================================================
 * Pure static AST-first project analysis and classification engine.
 * 
 * Rules:
 * - 100% Deterministic (Zero AI / LLM).
 * - Identical project + analyzer_version + configuration = identical mapping output.
 * - Framework Detection: React + Vite, React, Express, Static HTML/CSS/JS, Generic TS/JS.
 * - AST-first classification with confidence levels ('high', 'medium', 'low').
 * - Express handlers -> 'function' (high confidence).
 * - Client fetch() helpers -> 'client_api_helper' (requiresReview: true, confidence: low).
 * - Read-only .env key parsing (zero secret value persistence or exposure).
 * - Deterministic resource identity independent of project fingerprint or DB UUIDs.
 * - Dependency-aware mapping (routes -> pages, pages -> components/functions).
 * - Plan quota impact evaluation against active limits.
 * =============================================================================
 */

import { extractJsxRoutes, analyzeReactSourceFile, computeStructuralSignature } from './reactAstParser.js';

export const ANALYZER_VERSION = "1.0.0";

export const DEFAULT_PRO_LIMITS = {
  max_pages: 50,
  max_routes: 50,
  max_functions: 30,
};

/**
 * Computes SHA-256 hex string using Web Crypto.
 */
export async function computeSha256Hex(str) {
  if (typeof str !== 'string') str = String(str || '');
  const buffer = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a stable deterministic identity for a resource.
 * NOTE: project_fingerprint is strictly EXCLUDED so untouched resources
 * preserve their exact identity across project versions.
 */
export async function computeResourceIdentity(sourcePath, resourceType, exportIdentity = '', structuralSignature = '') {
  const normalized = `v1.0.0:${sourcePath}:${resourceType}:${exportIdentity}`;
  return await computeSha256Hex(normalized);
}

/**
 * Detects project framework from files and package.json.
 */
export function detectFramework(files) {
  const fileMap = new Map(files.map(f => [f.path, f]));
  const pkgFile = fileMap.get('package.json');

  let pkg = {};
  if (pkgFile) {
    try {
      pkg = JSON.parse(pkgFile.content);
    } catch {}
  }

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  // 1. React + Vite
  const hasVite = Boolean(deps['vite']) || files.some(f => f.path.startsWith('vite.config.'));
  const hasReact = Boolean(deps['react']) || deps['react-dom'] || files.some(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));

  if (hasVite && hasReact) {
    return {
      type: 'react_vite',
      name: 'React + Vite',
      description: 'Modern Vite-powered React single-page application with component architecture.',
    };
  }

  // 2. React (Create React App, Next.js static, or standalone React)
  if (hasReact) {
    return {
      type: 'react',
      name: 'React Application',
      description: 'Standard React frontend application with JSX component structure.',
    };
  }

  // 3. Express Backend
  const hasExpress = Boolean(deps['express']) || files.some(f => {
    return (f.path.endsWith('.js') || f.path.endsWith('.ts')) && (f.content.includes("from 'express'") || f.content.includes('require("express")') || f.content.includes("express()"));
  });

  if (hasExpress) {
    return {
      type: 'express',
      name: 'Express Backend',
      description: 'Express-style Node.js server API with routes and controller handlers.',
    };
  }

  // 4. Static HTML/CSS/JS
  const hasIndexHtml = files.some(f => f.path === 'index.html' || f.path.endsWith('/index.html'));
  if (hasIndexHtml) {
    return {
      type: 'static_html',
      name: 'Static HTML/CSS/JS',
      description: 'Multi-page or single-page static website with standard HTML markup and assets.',
    };
  }

  // 5. Generic TypeScript / JavaScript
  return {
    type: 'generic_ts_js',
    name: 'TypeScript / JavaScript',
    description: 'Generic TypeScript or JavaScript project structure.',
  };
}

/**
 * Safely parses .env files, extracting ONLY variable names.
 * Secret values are immediately discarded and NEVER stored or returned.
 */
export function parseEnvVarNames(content) {
  const varNames = [];
  if (!content) return varNames;

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        varNames.push(key);
      }
    }
  }
  return varNames;
}

/**
 * Evaluates package.json dependencies and flags unsupported libraries.
 */
export function checkUnsupportedDependencies(pkgJsonContent) {
  const unsupported = [];
  if (!pkgJsonContent) return unsupported;

  try {
    const pkg = JSON.parse(pkgJsonContent);
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

    const flaggedPackages = {
      'electron': 'Desktop native APIs are unsupported in Cloudflare edge platform.',
      'puppeteer': 'Headless browser automation requires containerized runtime.',
      'playwright': 'Browser binaries cannot execute in serverless worker edge.',
      'redis': 'Direct TCP socket Redis drivers should use HTTP KV or Upstash.',
      'mongoose': 'Direct MongoDB socket drivers require HTTP Atlas Data API or FeraSetu KV.',
      'pg': 'Direct PostgreSQL TCP connections require HTTP connection pooler.',
      'mysql': 'Direct MySQL socket connections require HTTP Data API.',
      'sqlite3': 'Native C++ SQLite addon incompatible; FeraSetu D1 provides native SQLite storage.',
    };

    for (const [dep, reason] of Object.entries(flaggedPackages)) {
      if (allDeps[dep]) {
        unsupported.push({ package: dep, reason, version: allDeps[dep] });
      }
    }
  } catch {}

  return unsupported;
}

/**
 * Main deterministic project analyzer.
 * 
 * @param {Array<{ path: string, content: string, size: number, isBinary: boolean, hash: string }>} files
 * @param {object} options
 * @returns {Promise<object>} Deterministic Conversion Report and Resource Mappings
 */
export async function analyzeProject(files, options = {}) {
  const limits = { ...DEFAULT_PRO_LIMITS, ...(options.quotas?.limits || {}) };
  const framework = detectFramework(files);

  const pages = [];
  const routes = [];
  const functions = [];
  const components = [];
  const assets = [];
  const envVars = [];
  const warnings = [];
  const unsupportedItems = [];

  // Ensure every file has hash and size computed
  for (const f of files) {
    if (!f.hash) {
      f.hash = await computeSha256Hex(f.content || '');
    }
    if (f.size === undefined) {
      f.size = (f.content || '').length;
    }
  }

  // Compute canonical project fingerprint across all sorted non-ignored files
  const sortedFileHashes = files
    .map(f => `${f.path}:${f.hash}`)
    .sort()
    .join('\n');
  const projectFingerprint = await computeSha256Hex(sortedFileHashes);

  // 1. Environment files (.env, .env.example, etc.)
  const envFiles = files.filter(f => /(?:^|\/)\.env(?:\.|$)/.test(f.path));
  for (const ef of envFiles) {
    const keys = parseEnvVarNames(ef.content);
    for (const k of keys) {
      if (!envVars.includes(k)) envVars.push(k);
    }
  }

  // 2. Package.json inspection
  const pkgFile = files.find(f => f.path === 'package.json');
  if (pkgFile) {
    const flagged = checkUnsupportedDependencies(pkgFile.content);
    for (const item of flagged) {
      unsupportedItems.push(item);
      warnings.push(`Unsupported dependency '${item.package}': ${item.reason}`);
    }
  }

  // 3. Collect all known routed component names from router files first
  const knownRoutedComponents = new Set();
  const routerFiles = files.filter(f => /routes|router|app\.(tsx|jsx|js|ts)/i.test(f.path));

  for (const rf of routerFiles) {
    const detectedRoutes = extractJsxRoutes(rf.content);
    for (const r of detectedRoutes) {
      if (r.targetComponent) {
        knownRoutedComponents.add(r.targetComponent);
      }
    }
  }

  // 4. File-by-file deterministic classification
  for (const file of files) {
    const filePath = file.path;
    const lowerPath = filePath.toLowerCase();

    // Assets detection
    if (file.isBinary || lowerPath.endsWith('.css') || lowerPath.endsWith('.svg') || lowerPath.endsWith('.ico') || lowerPath.endsWith('.png') || lowerPath.endsWith('.jpg')) {
      assets.push({
        path: filePath,
        size: file.size,
        hash: file.hash,
        type: file.isBinary ? 'binary_asset' : 'stylesheet',
      });
      continue;
    }

    // Config files
    if (filePath === 'package.json' || filePath.startsWith('vite.config.') || filePath.startsWith('tsconfig.')) {
      continue;
    }

    // A. Express-style backend route / handler analysis
    if (framework.type === 'express' || lowerPath.includes('/api/') || lowerPath.includes('/server/') || lowerPath.includes('/controllers/')) {
      const expressFunctions = extractExpressHandlers(file);
      for (const fn of expressFunctions) {
        const detId = await computeResourceIdentity(filePath, 'function', fn.name, fn.structuralSignature);
        functions.push({
          ...fn,
          deterministic_identity: detId,
          source_path: filePath,
          source_hash: file.hash,
        });

        // Also add route if route path is declared
        if (fn.routePath) {
          routes.push({
            path_pattern: fn.routePath,
            access_level: 'public',
            function_binding: fn.name,
            target_component: null,
            is_dynamic: fn.routePath.includes(':'),
            confidence: 'high',
            deterministic_identity: await computeResourceIdentity(filePath, 'route', fn.routePath, 'express_route'),
            source_path: filePath,
            source_hash: file.hash,
            dependencies: [fn.name],
          });
        }
      }

      if (expressFunctions.length > 0) {
        continue;
      }
    }

    // B. Static HTML files (index.html, about.html, etc.)
    if (lowerPath.endsWith('.html')) {
      const pageInfo = parseStaticHtmlPage(file);
      const detId = await computeResourceIdentity(filePath, 'page', pageInfo.slug, pageInfo.structuralSignature);
      pages.push({
        ...pageInfo,
        deterministic_identity: detId,
        source_path: filePath,
        source_hash: file.hash,
        dependencies: [],
      });

      // Auto-create Route for this static HTML page
      const routePath = pageInfo.is_homepage ? '/' : `/${pageInfo.slug}`;
      const routeDetId = await computeResourceIdentity(filePath, 'route', routePath, 'static_route');
      routes.push({
        path_pattern: routePath,
        page_slug: pageInfo.slug,
        access_level: 'public',
        function_binding: null,
        is_dynamic: false,
        confidence: 'high',
        deterministic_identity: routeDetId,
        source_path: filePath,
        source_hash: file.hash,
        dependencies: [pageInfo.slug],
      });
      continue;
    }

    // C. React / TS / JS code analysis
    if (lowerPath.endsWith('.tsx') || lowerPath.endsWith('.jsx') || lowerPath.endsWith('.ts') || lowerPath.endsWith('.js')) {
      // Check for client-side API helpers (must NOT automatically become Fera Functions)
      const clientHelperMatch = isClientApiHelper(file.content);
      if (clientHelperMatch.isHelper) {
        warnings.push(`File '${filePath}' contains client-side API helper '${clientHelperMatch.name}'. Preserved as client module (not auto-converted to backend Fera Function).`);
        functions.push({
          name: clientHelperMatch.name,
          description: `Client-side API helper in ${filePath}`,
          code: file.content,
          capabilities: deriveCapabilitiesForCode(file.content),
          confidence: 'low',
          requiresReview: true,
          isClientHelper: true,
          deterministic_identity: await computeResourceIdentity(filePath, 'client_api_helper', clientHelperMatch.name),
          source_path: filePath,
          source_hash: file.hash,
        });
      }

      // Check for router definitions in this file
      const detectedRoutes = extractJsxRoutes(file.content);
      for (const r of detectedRoutes) {
        const routeDetId = await computeResourceIdentity(filePath, 'route', r.path, r.rawSource);
        if (!routes.some(existing => existing.path_pattern === r.path)) {
          routes.push({
            path_pattern: r.path,
            page_slug: sanitizeSlug(r.targetComponent),
            target_component: r.targetComponent,
            access_level: r.access_level,
            function_binding: r.function_binding,
            is_dynamic: r.is_dynamic,
            confidence: r.confidence,
            deterministic_identity: routeDetId,
            source_path: filePath,
            source_hash: file.hash,
            dependencies: r.targetComponent ? [sanitizeSlug(r.targetComponent)] : [],
          });
        }
      }

      // Analyze component AST (Page vs Reusable Component)
      const analysis = analyzeReactSourceFile(filePath, file.content, knownRoutedComponents);

      if (analysis.type === 'page') {
        const pageDetId = await computeResourceIdentity(filePath, 'page', analysis.primaryExportName, analysis.structuralSignature);
        
        // Track component dependencies imported by this page
        const compDeps = analysis.imports
          .flatMap(imp => imp.namedImports.concat(imp.defaultImport ? [imp.defaultImport] : []))
          .filter(Boolean);

        pages.push({
          title: analysis.title,
          slug: analysis.slug,
          type: 'standard',
          is_homepage: analysis.isHomepage ? 1 : 0,
          auth_required: analysis.authRequired || 0,
          confidence: analysis.confidence,
          content: {
            sourcePath: filePath,
            componentName: analysis.primaryExportName,
            signature: analysis.structuralSignature,
          },
          deterministic_identity: pageDetId,
          source_path: filePath,
          source_hash: file.hash,
          dependencies: compDeps,
        });

        // If not already routed, provide default route
        const expectedPath = analysis.isHomepage ? '/' : `/${analysis.slug}`;
        if (!routes.some(r => r.path_pattern === expectedPath || r.page_slug === analysis.slug)) {
          const routeDetId = await computeResourceIdentity(filePath, 'route', expectedPath, 'auto_page_route');
          routes.push({
            path_pattern: expectedPath,
            page_slug: analysis.slug,
            target_component: analysis.primaryExportName,
            access_level: analysis.authRequired ? 'authenticated' : 'public',
            function_binding: null,
            is_dynamic: false,
            confidence: analysis.confidence,
            deterministic_identity: routeDetId,
            source_path: filePath,
            source_hash: file.hash,
            dependencies: [analysis.slug],
          });
        }
      } else if (analysis.type === 'component') {
        components.push({
          name: analysis.primaryExportName,
          title: analysis.title,
          confidence: analysis.confidence,
          source_path: filePath,
          source_hash: file.hash,
        });
      }
    }
  }

  // 5. Dependency linkage: Link routes to actual page candidates
  for (const r of routes) {
    const matchingPage = pages.find(p => p.slug === r.page_slug || p.title.toLowerCase() === (r.target_component || '').toLowerCase());
    if (matchingPage) {
      r.page_id = matchingPage.slug;
      r.dependencies = [matchingPage.slug];
    }
  }

  // 6. Quota impact evaluation
  const quotaImpact = {
    pages: {
      detected: pages.length,
      limit: limits.max_pages,
      exceeded: pages.length > limits.max_pages,
      allowedCount: Math.min(pages.length, limits.max_pages),
    },
    routes: {
      detected: routes.length,
      limit: limits.max_routes,
      exceeded: routes.length > limits.max_routes,
      allowedCount: Math.min(routes.length, limits.max_routes),
    },
    functions: {
      detected: functions.length,
      limit: limits.max_functions,
      exceeded: functions.length > limits.max_functions,
      allowedCount: Math.min(functions.length, limits.max_functions),
    },
    hasExceededQuota: pages.length > limits.max_pages || routes.length > limits.max_routes || functions.length > limits.max_functions,
  };

  if (quotaImpact.pages.exceeded) {
    warnings.push(`${pages.length} page candidates detected. Your plan allows ${limits.max_pages} pages.`);
  }
  if (quotaImpact.routes.exceeded) {
    warnings.push(`${routes.length} routes detected. Your plan allows ${limits.max_routes} routes.`);
  }
  if (quotaImpact.functions.exceeded) {
    warnings.push(`${functions.length} function candidates detected. Your plan allows ${limits.max_functions} functions.`);
  }

  return {
    analyzer_version: ANALYZER_VERSION,
    project_fingerprint: projectFingerprint,
    framework,
    summary: {
      pages_count: pages.length,
      routes_count: routes.length,
      functions_count: functions.length,
      components_count: components.length,
      assets_count: assets.length,
      env_vars_count: envVars.length,
      warnings_count: warnings.length,
      unsupported_count: unsupportedItems.length,
    },
    resources: {
      pages,
      routes,
      functions,
      components,
      assets,
    },
    envVars,
    warnings,
    unsupported: unsupportedItems,
    quotaImpact,
  };
}

/**
 * Parses a static HTML file into a Pro Studio page candidate.
 */
function parseStaticHtmlPage(file) {
  const content = file.content || '';
  const cleanPath = file.path.replace(/\\/g, '/');
  const baseName = cleanPath.split('/').pop().replace(/\.html$/i, '');
  const isHomepage = baseName.toLowerCase() === 'index' || baseName.toLowerCase() === 'home';
  const slug = isHomepage ? 'home' : sanitizeSlug(baseName);

  // Extract <title>
  const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/is);
  const title = titleMatch ? titleMatch[1].trim() : (baseName.charAt(0).toUpperCase() + baseName.slice(1));

  // Extract <meta name="description">
  const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const seoDescription = descMatch ? descMatch[1].trim() : null;

  // Extract body content or complete markup
  const bodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
  const bodyHtml = bodyMatch ? bodyMatch[1].trim() : content;

  return {
    title,
    slug,
    type: 'standard',
    is_homepage: isHomepage ? 1 : 0,
    auth_required: 0,
    seo_title: title,
    seo_description: seoDescription,
    confidence: 'high',
    content: {
      html: bodyHtml,
      originalPath: cleanPath,
    },
    structuralSignature: computeStructuralSignature(content),
  };
}

/**
 * Extracts Express route handlers and controller candidates.
 */
function extractExpressHandlers(file) {
  const handlers = [];
  const content = file.content || '';

  // Match app.get('/path', handler) / router.post('/path', handler)
  const routeRegex = /(?:app|router)\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']\s*,\s*(?:async\s*)?(?:function\s*([A-Za-z0-9_$]*)|([A-Za-z0-9_$]+)|\(([^)]*)\)\s*=>)/g;
  let match;

  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const namedFn = match[3] || match[4] || null;
    const handlerName = namedFn || `${method.toLowerCase()}_${sanitizeSlug(routePath).replace(/-/g, '_')}`;

    handlers.push({
      name: handlerName,
      description: `Express ${method} handler for ${routePath}`,
      routePath,
      method,
      confidence: 'high',
      requiresReview: false,
      code: extractFunctionBodyAround(content, match.index) || `// Express ${method} handler for ${routePath}\nreturn { status: 200, message: "OK" };`,
      capabilities: deriveCapabilitiesForCode(content),
      structuralSignature: computeStructuralSignature(match[0]),
    });
  }

  return handlers;
}

/**
 * Detects if source is a client-side API helper using fetch().
 * Client fetch helpers must NEVER automatically become backend Fera Functions.
 */
function isClientApiHelper(source) {
  if (!source) return { isHelper: false };

  const hasFetch = /fetch\s*\(|axios\.|api\.(get|post)/.test(source);
  const isFrontendFile = !source.includes("from 'express'") && !source.includes('require("express")') && !source.includes('(req, res)');

  if (hasFetch && isFrontendFile) {
    // Extract function name
    const fnMatch = source.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/);
    return {
      isHelper: true,
      name: fnMatch ? fnMatch[1] : 'clientFetchHelper',
    };
  }

  return { isHelper: false };
}

function deriveCapabilitiesForCode(code) {
  const caps = [];
  if (/products?\./i.test(code) || /api\/products?/i.test(code) || /products/i.test(code)) caps.push('products.read');
  if (/orders?\.create/i.test(code) || /(?:post|create).*orders?/i.test(code)) caps.push('orders.create');
  else if (/orders?\./i.test(code) || /api\/orders?/i.test(code) || /orders/i.test(code)) caps.push('orders.read');
  if (/customers?\./i.test(code) || /api\/customers?/i.test(code)) caps.push('customers.read');
  if (/storage\./i.test(code)) {
    caps.push('storage.read');
    caps.push('storage.write');
  }
  if (/email\./i.test(code)) caps.push('email.send');
  return caps;
}

function extractFunctionBodyAround(source, index) {
  // Extract up to 300 characters around index
  const start = Math.max(0, index);
  const end = Math.min(source.length, index + 400);
  return source.slice(start, end);
}

function sanitizeSlug(str) {
  return String(str || 'page')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

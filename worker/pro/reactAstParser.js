/**
 * FeraSetu Pro — Deterministic AST-First React & JSX Structural Parser
 * =============================================================================
 * Pure JavaScript tokenizer and AST extractor for React / TypeScript / JSX.
 * Operates without native C++ addons or external AST dependencies.
 * 
 * Extracts:
 * - Route patterns, nested routes, dynamic segments (:id, :slug)
 * - Route auth gates (<ProtectedRoute>, <AuthGate>, auth_required)
 * - Page candidates vs reusable components
 * - Imported components and function bindings
 * - Normalized structural signatures for deterministic identity
 * =============================================================================
 */

/**
 * Tokenizes JavaScript / TypeScript / JSX source code into high-level AST tokens.
 */
export function tokenizeJsx(source) {
  if (typeof source !== 'string') return [];

  const tokens = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Line comment
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < len && source[i] !== '\n') i++;
      continue;
    }

    // Block comment
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // String literals ('...', "...", `...`)
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let str = '';
      i++;
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < len) {
          str += source[i + 1];
          i += 2;
        } else {
          str += source[i];
          i++;
        }
      }
      i++; // skip closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // JSX Tags (<tag, </tag, />)
    if (ch === '<') {
      if (source[i + 1] === '/') {
        // Closing tag </TagName>
        i += 2;
        let tag = '';
        while (i < len && /[a-zA-Z0-9_.-]/.test(source[i])) {
          tag += source[i];
          i++;
        }
        while (i < len && source[i] !== '>') i++;
        i++; // skip >
        tokens.push({ type: 'JSX_CLOSE', tag });
        continue;
      }

      // Check if this is an opening JSX tag or comparison operator <
      const nextChar = source[i + 1];
      if (/[a-zA-Z]/.test(nextChar) || nextChar === '>') {
        i++; // skip <
        let tag = '';
        while (i < len && /[a-zA-Z0-9_.-]/.test(source[i])) {
          tag += source[i];
          i++;
        }
        tokens.push({ type: 'JSX_OPEN', tag: tag || 'Fragment' });
        continue;
      }
    }

    // Self-closing tag end />
    if (ch === '/' && source[i + 1] === '>') {
      tokens.push({ type: 'JSX_SELF_CLOSE' });
      i += 2;
      continue;
    }

    // Punctuation & Brackets
    if ('{}()[];:,>='.includes(ch)) {
      tokens.push({ type: 'PUNCT', value: ch });
      i++;
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      let ident = '';
      while (i < len && /[a-zA-Z0-9_$]/.test(source[i])) {
        ident += source[i];
        i++;
      }
      tokens.push({ type: 'IDENT', value: ident });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (i < len && /[0-9.]/.test(source[i])) {
        num += source[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    i++;
  }

  return tokens;
}

/**
 * Extracts React Router routes defined via JSX (<Route path="..." element={<Comp />} />).
 */
export function extractJsxRoutes(source) {
  const routes = [];
  if (!source) return routes;

  // Regex patterns for robust JSX route matching
  // <Route path="/..." element={<Component />} ... />
  const jsxRouteRegex = /<Route\s+([^>]*?)(\/?>|>.*?<\/Route>)/gs;
  let match;

  while ((match = jsxRouteRegex.exec(source)) !== null) {
    const attrsStr = match[1];
    const fullMatch = match[0];

    // Extract path="..." or path={'...'}
    const pathMatch = attrsStr.match(/path=(?:["']([^"']+)["']|\{["']([^"']+)["']\})/);
    const pathPattern = pathMatch ? (pathMatch[1] || pathMatch[2]) : null;
    if (!pathPattern) continue;

    // Extract element={<Component ... />} or Component={Component}
    let targetComponent = null;
    const elementMatch = attrsStr.match(/element=\{<([A-Za-z0-9_]+)[^>]*\/?\s*>\}/);
    if (elementMatch) {
      targetComponent = elementMatch[1];
    } else {
      const compMatch = attrsStr.match(/Component=\{?([A-Za-z0-9_]+)\}?/);
      if (compMatch) {
        targetComponent = compMatch[1];
      }
    }

    // Check if route has an auth requirement / protected wrapper
    const isProtected = /Protected|AuthGate|Private|auth_required|requireAuth/i.test(fullMatch);

    // Extract function bindings or data loader references if present
    const loaderMatch = attrsStr.match(/loader=\{?([A-Za-z0-9_]+)\}?/);
    const functionBinding = loaderMatch ? loaderMatch[1] : null;

    routes.push({
      path: pathPattern.startsWith('/') ? pathPattern : `/${pathPattern}`,
      targetComponent: targetComponent || deriveComponentNameFromPath(pathPattern),
      access_level: isProtected ? 'authenticated' : 'public',
      function_binding: functionBinding,
      is_dynamic: pathPattern.includes(':') || pathPattern.includes('*'),
      confidence: targetComponent ? 'high' : 'medium',
      rawSource: match[0],
    });
  }

  // Also parse object-based routes (createBrowserRouter / useRoutes / routes = [ ... ])
  const objectRoutes = extractObjectRoutes(source);
  for (const objRoute of objectRoutes) {
    if (!routes.some(r => r.path === objRoute.path)) {
      routes.push(objRoute);
    }
  }

  return routes;
}

/**
 * Parses object-based router declarations:
 * [{ path: '/items', element: <Items /> }] or createBrowserRouter([...])
 */
export function extractObjectRoutes(source) {
  const routes = [];
  if (!source) return routes;

  // Match route objects { path: '...', element: ... }
  const objRouteRegex = /\{\s*path\s*:\s*["']([^"']+)["']\s*,\s*(?:element\s*:\s*<([A-Za-z0-9_]+)|Component\s*:\s*([A-Za-z0-9_]+))?[^}]*?\}/g;
  let match;

  while ((match = objRouteRegex.exec(source)) !== null) {
    const rawPath = match[1];
    const comp = match[2] || match[3] || deriveComponentNameFromPath(rawPath);
    const isProtected = /Protected|Auth|Private/i.test(match[0]);

    routes.push({
      path: rawPath.startsWith('/') ? rawPath : `/${rawPath}`,
      targetComponent: comp,
      access_level: isProtected ? 'authenticated' : 'public',
      function_binding: null,
      is_dynamic: rawPath.includes(':') || rawPath.includes('*'),
      confidence: 'high',
      rawSource: match[0],
    });
  }

  return routes;
}

/**
 * Analyzes a React file AST to determine if it is a Page candidate, Component, or Utility.
 */
export function analyzeReactSourceFile(filePath, source, knownRoutedComponents = new Set()) {
  const cleanPath = filePath.replace(/\\/g, '/');
  const fileName = cleanPath.split('/').pop();
  const baseName = fileName.replace(/\.[^.]+$/, '');

  // 1. Extract imports and exported identifiers
  const imports = extractImports(source);
  const exports = extractExports(source);

  // 2. Check if file contains JSX elements or returns JSX
  const hasJsx = /<[A-Za-z0-9_]+[^>]*>|<\/>/m.test(source);

  // 3. Detect top-level page indicators
  const isPagesDirectory = /(?:^|\/)(pages|routes|views|screens)\//i.test(cleanPath);
  const isComponentsDirectory = /(?:^|\/)(components|ui|widgets|common|shared)\//i.test(cleanPath);
  const isExplicitlyRouted = exports.some(exp => knownRoutedComponents.has(exp)) || knownRoutedComponents.has(baseName);
  const hasPageLayoutIndicator = /min-h-screen|PageContainer|Helmet|Head|seoTitle|pageTitle/i.test(source);

  // 4. Determine primary component/export name
  const defaultExport = exports.find(e => e.isDefault);
  const primaryExportName = defaultExport ? defaultExport.name : (exports[0]?.name || baseName);

  // 5. Derive Title & Slug
  const title = deriveTitle(primaryExportName, source);
  const lowerBase = baseName.toLowerCase();
  const isHomepage = lowerBase === 'home' || lowerBase === 'homepage' || lowerBase === 'index' || isHomepageRoute(cleanPath);
  const slug = isHomepage ? 'home' : sanitizeSlug(baseName);

  // 6. Classification logic
  if (!hasJsx && !source.includes('React.')) {
    // Pure logic or utility module
    return {
      type: 'utility',
      resourceType: 'utility',
      confidence: 'high',
      primaryExportName,
      title,
      slug,
      isHomepage,
      imports,
      exports,
      structuralSignature: computeStructuralSignature(source),
    };
  }

  if (isExplicitlyRouted || (isPagesDirectory && !isComponentsDirectory)) {
    return {
      type: 'page',
      resourceType: 'page',
      confidence: isExplicitlyRouted ? 'high' : (isPagesDirectory ? 'high' : 'medium'),
      primaryExportName,
      title,
      slug,
      isHomepage,
      authRequired: /Protected|auth_required|requireAuth/i.test(source) ? 1 : 0,
      imports,
      exports,
      structuralSignature: computeStructuralSignature(source),
    };
  }

  if (isComponentsDirectory) {
    return {
      type: 'component',
      resourceType: 'component',
      confidence: 'high',
      primaryExportName,
      title,
      slug,
      isHomepage: false,
      imports,
      exports,
      structuralSignature: computeStructuralSignature(source),
    };
  }

  // Fallback: If has page layout indicator and exports a component
  if (hasPageLayoutIndicator && exports.length > 0) {
    return {
      type: 'page',
      resourceType: 'page',
      confidence: 'medium',
      primaryExportName,
      title,
      slug,
      isHomepage,
      authRequired: 0,
      imports,
      exports,
      structuralSignature: computeStructuralSignature(source),
    };
  }

  // Default to reusable component
  return {
    type: 'component',
    resourceType: 'component',
    confidence: 'medium',
    primaryExportName,
    title,
    slug,
    isHomepage: false,
    imports,
    exports,
    structuralSignature: computeStructuralSignature(source),
  };
}

/**
 * Extracts import declarations from source.
 */
export function extractImports(source) {
  const imports = [];
  const importRegex = /import\s+(?:(\*\s+as\s+[A-Za-z0-9_$]+)|([A-Za-z0-9_$]+)|(?:\{([^}]+)\}))?\s*(?:from\s*)?["']([^"']+)["']/g;
  let match;

  while ((match = importRegex.exec(source)) !== null) {
    const defaultImport = match[2] || null;
    const namedImports = match[3] ? match[3].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean) : [];
    const sourceModule = match[4];

    imports.push({
      module: sourceModule,
      defaultImport,
      namedImports,
    });
  }

  return imports;
}

/**
 * Extracts exported functions, components, and variables.
 */
export function extractExports(source) {
  const exports = [];

  // export default function/class/identifier
  const defaultFuncMatch = source.match(/export\s+default\s+(?:function\s*([A-Za-z0-9_$]*)|class\s*([A-Za-z0-9_$]*)|([A-Za-z0-9_$]+))/);
  if (defaultFuncMatch) {
    exports.push({
      name: defaultFuncMatch[1] || defaultFuncMatch[2] || defaultFuncMatch[3] || 'AnonymousDefault',
      isDefault: true,
    });
  }

  // export function Foo / export const Foo / export class Foo
  const namedRegex = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/g;
  let match;
  while ((match = namedRegex.exec(source)) !== null) {
    if (!exports.some(e => e.name === match[1])) {
      exports.push({
        name: match[1],
        isDefault: false,
      });
    }
  }

  return exports;
}

/**
 * Computes a normalized structural signature of the code (independent of formatting/comments).
 */
export function computeStructuralSignature(source) {
  if (!source) return '';
  // Strip comments and excessive whitespace to get stable structural signature
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Return first 500 chars of normalized structure
  return stripped.slice(0, 500);
}

function deriveComponentNameFromPath(path) {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/');
  const last = parts[parts.length - 1] || 'Home';
  return last.replace(/[^a-zA-Z0-9]/g, '').replace(/^[a-z]/, c => c.toUpperCase());
}

function deriveTitle(ident, source) {
  // Check for document.title or <title> in source
  const titleMatch = source.match(/(?:document\.title\s*=\s*|<title>|title:\s*)["']([^"']+)["']/);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1];
  }
  // Convert PascalCase or camelCase to Human Readable Title
  return ident
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, c => c.toUpperCase());
}

function isHomepageRoute(path) {
  const clean = path.toLowerCase();
  return clean === 'home' || clean === 'index' || clean === '/' || clean.endsWith('/home.tsx') || clean.endsWith('/index.tsx');
}

function sanitizeSlug(str) {
  return String(str || 'page')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

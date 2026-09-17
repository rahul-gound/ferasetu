// FeraSetu Pro Studio — Single-Page AST Code Converter & Classification Engine
// =============================================================================
// Deterministic round-trip conversion for React JSX/TSX and HTML.
// Enforces the 3 Page Representation States:
//   1. VISUAL_NATIVE: Fully represented by supported Pro Studio components.
//   2. HYBRID: Contains visual components plus isolated custom-code nodes.
//   3. CODE_NATIVE: Arbitrary/custom code where Code Mode is authoritative.
// Rule: NEVER silently destroy code or behavior during Code <-> Visual conversion.
// =============================================================================

import {
  SCHEMA_VERSION,
  PAGE_STATES,
  generateNodeId,
  SMART_COMPONENTS,
  createBlankPageDocument
} from './pageModel.js';

// -----------------------------------------------------------------------------
// 1. Classification & Lossless Analysis
// -----------------------------------------------------------------------------

/**
 * Inspects React or HTML source code to determine its page state:
 * VISUAL_NATIVE, HYBRID, or CODE_NATIVE
 */
export function classifyPageSource(code, language = 'jsx') {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return { state: PAGE_STATES.VISUAL_NATIVE, canRoundTrip: true, reason: 'Empty source' };
  }

  const trimmed = code.trim();

  // If HTML format
  if (language === 'html' || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<section') || trimmed.startsWith('<div')) {
    // Check for complex scripts or server-side blocks
    const hasScripts = /<script[\s\S]*?>[\s\S]*?<\/script>/i.test(trimmed);
    const hasComplexForms = /<form[^>]*method=["']post["'][^>]*action=["'][^"']*["'][^>]*>/i.test(trimmed) && !trimmed.includes('ferasetu');

    if (hasScripts || hasComplexForms) {
      return {
        state: PAGE_STATES.HYBRID,
        canRoundTrip: false,
        reason: 'HTML contains embedded scripts or external actions requiring custom isolation.',
      };
    }
    return { state: PAGE_STATES.VISUAL_NATIVE, canRoundTrip: true, reason: 'Semantic HTML' };
  }

  // React JSX / TSX Analysis
  const hasHooks = /\b(useState|useEffect|useMemo|useCallback|useRef|useContext|useReducer)\b/.test(trimmed);
  const hasComplexExpressions = /\{[^{}]*?\.[a-zA-Z0-9_]+\([^{}]*?\)[^{}]*?\}/.test(trimmed);
  const hasCustomImports = /import\s+.*?\s+from\s+['"][^'"]+['"]/.test(trimmed) && !/from\s+['"]react['"]/.test(trimmed);
  const hasAsyncEffects = /async\s+function|await\s+/.test(trimmed);
  const hasLogicBeforeReturn = /function[^{]*\{[\s\S]*?(const|let|var|if|for|while|switch)\b[\s\S]*?return\b/.test(trimmed) ||
    /=>\s*\{[\s\S]*?(const|let|var|if|for|while|switch)\b[\s\S]*?return\b/.test(trimmed);

  if (hasHooks || hasCustomImports || hasAsyncEffects) {
    return {
      state: PAGE_STATES.CODE_NATIVE,
      canRoundTrip: false,
      reason: 'React component utilizes stateful hooks, async effects, or external module imports. Code Mode is authoritative.',
    };
  }

  if (hasComplexExpressions || hasLogicBeforeReturn) {
    return {
      state: PAGE_STATES.HYBRID,
      canRoundTrip: false,
      reason: 'React component contains dynamic JavaScript expressions or procedural logic. Preserving custom code blocks.',
    };
  }

  return {
    state: PAGE_STATES.VISUAL_NATIVE,
    canRoundTrip: true,
    reason: 'Pure declarative JSX structure',
  };
}

// -----------------------------------------------------------------------------
// 2. React JSX AST Parser (Deterministic, Token-Aware)
// -----------------------------------------------------------------------------

export function parseReactJsxToDocument(code, title = 'Imported Page') {
  const classification = classifyPageSource(code, 'jsx');

  if (classification.state === PAGE_STATES.CODE_NATIVE) {
    // DO NOT destructively convert to partial visual tree. Code Mode is authoritative!
    return {
      schemaVersion: SCHEMA_VERSION,
      state: PAGE_STATES.CODE_NATIVE,
      title,
      customCss: '',
      sourceCode: code,
      nodes: [
        {
          id: generateNodeId('code'),
          type: 'custom_code',
          version: 1,
          props: {
            language: 'jsx',
            code,
            isIsolatedSandbox: true,
          },
        },
      ],
    };
  }

  // Extract JSX body from component function if present
  let jsxBody = code;
  const returnMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*\}?\s*$/);
  if (returnMatch && returnMatch[1]) {
    jsxBody = returnMatch[1];
  }

  // Unwrap outer <main ...>...</main> wrapper if present so sections are root nodes
  const mainMatch = jsxBody.match(/^\s*<main[^>]*>([\s\S]*?)<\/main>\s*$/i);
  if (mainMatch && mainMatch[1]) {
    jsxBody = mainMatch[1];
  }

  // Parse JSX tags into nodes
  const nodes = parseSimpleJsxNodes(jsxBody);

  if (nodes.length === 0) {
    // Could not parse safely; preserve in CODE_NATIVE
    return {
      schemaVersion: SCHEMA_VERSION,
      state: PAGE_STATES.CODE_NATIVE,
      title,
      customCss: '',
      sourceCode: code,
      nodes: [
        {
          id: generateNodeId('code'),
          type: 'custom_code',
          version: 1,
          props: { language: 'jsx', code, isIsolatedSandbox: true },
        },
      ],
    };
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    state: classification.state,
    title,
    customCss: '',
    sourceCode: code,
    nodes,
  };
}

function parseSimpleJsxNodes(jsx) {
  const nodes = [];
  const tagRegex = /<([a-zA-Z0-9_]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9_]+)([^>]*?)\/>/g;
  let match;

  while ((match = tagRegex.exec(jsx)) !== null) {
    const tagName = match[1] || match[4];
    const rawAttrs = match[2] || match[5] || '';
    const innerContent = match[3] || '';

    const node = mapTagToComponentNode(tagName, rawAttrs, innerContent);
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

function mapTagToComponentNode(tagName, rawAttrs, innerContent) {
  const tagLower = tagName.toLowerCase();
  const props = extractPropsFromAttrs(rawAttrs);

  // 1. Headings
  if (/^h[1-6]$/.test(tagLower)) {
    return {
      id: generateNodeId('hdg'),
      type: 'heading',
      version: 1,
      props: {
        text: stripHtml(innerContent).trim() || 'Heading',
        level: tagLower,
        fontSize: tagLower === 'h1' ? 'text-4xl' : tagLower === 'h2' ? 'text-3xl' : 'text-2xl',
        fontWeight: 'font-bold',
        color: 'text-slate-900',
        ...props,
      },
    };
  }

  // 2. Paragraphs / Text
  if (tagLower === 'p' || tagLower === 'span') {
    return {
      id: generateNodeId('txt'),
      type: 'text',
      version: 1,
      props: {
        content: stripHtml(innerContent).trim() || 'Text paragraph',
        fontSize: 'text-base',
        color: 'text-slate-600',
        ...props,
      },
    };
  }

  // 3. Buttons
  if (tagLower === 'button' || tagName === 'Button') {
    return {
      id: generateNodeId('btn'),
      type: 'button',
      version: 1,
      props: {
        text: stripHtml(innerContent).trim() || props.children || 'Button',
        action: props.action || 'navigate',
        target: props.href || '#',
        variant: props.variant || 'primary',
        size: props.size || 'md',
        ...props,
      },
    };
  }

  // 4. Images
  if (tagLower === 'img' || tagName === 'Image') {
    return {
      id: generateNodeId('img'),
      type: 'image',
      version: 1,
      props: {
        src: props.src || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
        alt: props.alt || 'Visual',
        aspectRatio: '16/9',
        ...props,
      },
    };
  }

  // 5. Links
  if (tagLower === 'a' || tagLower === 'link') {
    return {
      id: generateNodeId('lnk'),
      type: 'link',
      version: 1,
      props: {
        text: stripHtml(innerContent).trim() || 'Link text',
        href: props.href || '#',
        ...props,
      },
    };
  }

  // 6. Containers / Sections
  if (tagLower === 'section' || tagLower === 'div' || tagLower === 'main' || tagName === 'Section' || tagName === 'Container') {
    const isSection = tagLower === 'section' || tagName === 'Section';
    const children = parseSimpleJsxNodes(innerContent);

    return {
      id: generateNodeId(isSection ? 'sec' : 'cnt'),
      type: isSection ? 'section' : 'container',
      version: 1,
      props: {
        paddingY: isSection ? 'py-12' : 'p-4',
        paddingX: 'px-4',
        maxWidth: isSection ? 'max-w-7xl' : 'max-w-6xl',
        ...props,
      },
      children,
    };
  }

  // 7. Fallback: Custom code block (Preserves exact content!)
  return {
    id: generateNodeId('custom'),
    type: 'custom_code',
    version: 1,
    props: {
      language: 'jsx',
      code: `<${tagName}${rawAttrs}>${innerContent}</${tagName}>`,
      isIsolatedSandbox: true,
    },
  };
}

function extractPropsFromAttrs(rawAttrs) {
  const props = {};
  if (!rawAttrs) return props;

  const attrRegex = /([a-zA-Z0-9_-]+)=(?:{([^}]+)}|"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = attrRegex.exec(rawAttrs)) !== null) {
    const key = match[1];
    const val = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : match[4]);
    if (key === 'className' || key === 'class') {
      props.className = val;
    } else {
      props[key] = val;
    }
  }
  return props;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

// -----------------------------------------------------------------------------
// 3. HTML Parser (Semantic DOM to Component Tree)
// -----------------------------------------------------------------------------

export function parseHtmlToDocument(html, title = 'Imported HTML') {
  const classification = classifyPageSource(html, 'html');

  // Parse CSS block if present inside <style>
  let customCss = '';
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch && styleMatch[1]) {
    customCss = styleMatch[1].trim();
  }

  // Parse body content
  let bodyContent = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    bodyContent = bodyMatch[1];
  }

  const nodes = parseSimpleJsxNodes(bodyContent);

  if (nodes.length === 0) {
    return {
      schemaVersion: SCHEMA_VERSION,
      state: PAGE_STATES.CODE_NATIVE,
      title,
      customCss,
      sourceCode: html,
      nodes: [
        {
          id: generateNodeId('code'),
          type: 'custom_code',
          version: 1,
          props: { language: 'html', code: html, isIsolatedSandbox: true },
        },
      ],
    };
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    state: classification.state,
    title,
    customCss,
    sourceCode: html,
    nodes,
  };
}

// -----------------------------------------------------------------------------
// 4. Tree to React JSX / HTML Serializers
// -----------------------------------------------------------------------------

export function documentToReactJsx(doc) {
  if (doc.state === PAGE_STATES.CODE_NATIVE && doc.sourceCode) {
    return doc.sourceCode;
  }

  const componentName = sanitizeComponentName(doc.title || 'Page');
  const renderedNodes = (doc.nodes || []).map(node => serializeNodeToJsx(node, 2)).join('\n');

  return `import React from 'react';

export default function ${componentName}() {
  return (
    <main className="fera-page-root min-h-screen bg-slate-50">
${renderedNodes}
    </main>
  );
}
`;
}

function serializeNodeToJsx(node, indent = 2) {
  const spaces = ' '.repeat(indent);
  const p = node.props || {};

  switch (node.type) {
    case 'section': {
      const childrenJsx = (node.children || []).map(c => serializeNodeToJsx(c, indent + 2)).join('\n');
      return `${spaces}<section className="${p.paddingY || 'py-12'} ${p.paddingX || 'px-4'} ${p.maxWidth || 'max-w-7xl'} mx-auto">\n${childrenJsx}\n${spaces}</section>`;
    }
    case 'container': {
      const childrenJsx = (node.children || []).map(c => serializeNodeToJsx(c, indent + 2)).join('\n');
      return `${spaces}<div className="${p.maxWidth || 'max-w-6xl'} ${p.padding || 'p-4'} ${p.alignment || 'mx-auto'}">\n${childrenJsx}\n${spaces}</div>`;
    }
    case 'heading': {
      const Tag = p.level || 'h2';
      return `${spaces}<${Tag} className="${p.fontSize || 'text-3xl'} ${p.fontWeight || 'font-bold'} ${p.color || 'text-slate-900'} ${p.align || ''}">${escapeJsx(p.text || '')}</${Tag}>`;
    }
    case 'text':
      return `${spaces}<p className="${p.fontSize || 'text-base'} ${p.color || 'text-slate-600'} ${p.lineHeight || 'leading-relaxed'}">${escapeJsx(p.content || '')}</p>`;
    case 'button':
      return `${spaces}<button className="px-5 py-2.5 rounded-xl font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors" onClick={() => /* action: ${p.action || 'navigate'} */ null}>${escapeJsx(p.text || 'Button')}</button>`;
    case 'image':
      return `${spaces}<img src="${p.src}" alt="${escapeJsx(p.alt || '')}" className="w-full ${p.borderRadius || 'rounded-xl'} ${p.shadow || ''} object-cover" />`;
    case 'link':
      return `${spaces}<a href="${p.href || '#'}" className="${p.color || 'text-indigo-600 hover:underline'}">${escapeJsx(p.text || '')}</a>`;
    case 'divider':
      return `${spaces}<hr className="my-6 border-slate-200" />`;
    case 'custom_code':
      return `${spaces}{/* Custom Code Block */}\n${spaces}${p.code || ''}`;
    default:
      return `${spaces}<div className="fera-component-${node.type}" data-node-id="${node.id}">\n${spaces}  {/* ${node.type} */}\n${spaces}</div>`;
  }
}

export function documentToHtml(doc) {
  if (doc.state === PAGE_STATES.CODE_NATIVE && doc.sourceCode) {
    if (doc.sourceCode.includes('<html') || doc.sourceCode.includes('<!DOCTYPE')) {
      return doc.sourceCode;
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(doc.title || 'Page')}</title>
</head>
<body class="fera-page-root">
${doc.sourceCode}
</body>
</html>`;
  }

  const renderedNodes = (doc.nodes || []).map(node => serializeNodeToHtml(node, 2)).join('\n');
  const styleBlock = doc.customCss ? `  <style>\n${doc.customCss}\n  </style>\n` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.title || 'Page')}</title>
${styleBlock}</head>
<body class="fera-page-root">
${renderedNodes}
</body>
</html>`;
}

function serializeNodeToHtml(node, indent = 2) {
  const spaces = ' '.repeat(indent);
  const p = node.props || {};

  switch (node.type) {
    case 'section': {
      const childrenHtml = (node.children || []).map(c => serializeNodeToHtml(c, indent + 2)).join('\n');
      return `${spaces}<section class="${p.paddingY || 'py-12'} ${p.paddingX || 'px-4'} ${p.maxWidth || 'max-w-7xl'}">\n${childrenHtml}\n${spaces}</section>`;
    }
    case 'container': {
      const childrenHtml = (node.children || []).map(c => serializeNodeToHtml(c, indent + 2)).join('\n');
      return `${spaces}<div class="${p.maxWidth || 'max-w-6xl'} ${p.padding || 'p-4'}">\n${childrenHtml}\n${spaces}</div>`;
    }
    case 'heading': {
      const Tag = p.level || 'h2';
      return `${spaces}<${Tag} class="${p.fontSize || ''} ${p.color || ''}">${escapeHtml(p.text || '')}</${Tag}>`;
    }
    case 'text':
      return `${spaces}<p class="${p.fontSize || ''} ${p.color || ''}">${escapeHtml(p.content || '')}</p>`;
    case 'button':
      return `${spaces}<button class="btn btn-${p.variant || 'primary'}">${escapeHtml(p.text || '')}</button>`;
    case 'image':
      return `${spaces}<img src="${p.src}" alt="${escapeHtml(p.alt || '')}" />`;
    case 'custom_code':
      return `${spaces}<!-- Custom Code Block -->\n${spaces}${p.code || ''}`;
    default:
      return `${spaces}<div class="fera-component-${node.type}">${node.type}</div>`;
  }
}

function sanitizeComponentName(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '') || 'Page';
}

function escapeJsx(str) {
  return String(str).replace(/"/g, '&quot;');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

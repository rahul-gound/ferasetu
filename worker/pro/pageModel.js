// FeraSetu Pro Studio — Structured Page Model & Component Catalog (schemaVersion: 1)
// =============================================================================
// Canonical source of truth for visual-native, hybrid, and code-native pages.
// Enforces stable node IDs, strict nesting rules, approved action types,
// responsive inheritance, and deterministic validation before save/publish.
// =============================================================================

export const SCHEMA_VERSION = 1;

export const PAGE_STATES = {
  VISUAL_NATIVE: 'VISUAL_NATIVE',
  HYBRID: 'HYBRID',
  CODE_NATIVE: 'CODE_NATIVE',
};

export const APPROVED_ACTIONS = [
  'navigate',
  'external_url',
  'submit',
  'call_function',
  'add_to_cart',
  'open_modal',
  'custom_event',
];

export const VIEWPORT_BREAKPOINTS = ['desktop', 'tablet', 'mobile'];

/**
 * Generates a stable unique node ID
 */
export function generateNodeId(prefix = 'node') {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${time}${rand}`;
}

// -----------------------------------------------------------------------------
// Smart Component Catalog Definitions (38 Smart Components)
// -----------------------------------------------------------------------------
export const SMART_COMPONENTS = {
  // LAYOUT (8)
  section: {
    type: 'section',
    version: 1,
    label: 'Section',
    category: 'layout',
    icon: 'Layout',
    canHaveChildren: true,
    allowedChildren: ['container', 'row', 'grid', 'stack', 'divider', 'spacer', 'heading', 'text', 'custom_code'],
    forbiddenParents: ['button', 'link', 'heading', 'text'],
    defaultProps: {
      paddingY: 'py-12',
      paddingX: 'px-4',
      backgroundColor: 'transparent',
      maxWidth: 'max-w-7xl',
      ariaLabel: 'Content Section',
    },
    responsiveCapabilities: ['paddingY', 'paddingX', 'visibility'],
  },
  container: {
    type: 'container',
    version: 1,
    label: 'Container',
    category: 'layout',
    icon: 'Box',
    canHaveChildren: true,
    allowedChildren: null, // Any valid child
    forbiddenParents: ['button', 'link', 'heading'],
    defaultProps: {
      maxWidth: 'max-w-6xl',
      padding: 'p-4',
      alignment: 'mx-auto',
    },
    responsiveCapabilities: ['maxWidth', 'padding', 'visibility'],
  },
  row: {
    type: 'row',
    version: 1,
    label: 'Row',
    category: 'layout',
    icon: 'Columns',
    canHaveChildren: true,
    allowedChildren: ['columns', 'container', 'stack', 'card'],
    forbiddenParents: ['button', 'link', 'heading'],
    defaultProps: {
      direction: 'flex-row',
      wrap: 'flex-wrap',
      gap: 'gap-6',
      justify: 'justify-start',
      align: 'items-center',
    },
    responsiveCapabilities: ['direction', 'gap', 'wrap'],
  },
  columns: {
    type: 'columns',
    version: 1,
    label: 'Columns (2-4)',
    category: 'layout',
    icon: 'Grid',
    canHaveChildren: true,
    allowedChildren: null,
    forbiddenParents: ['button', 'link'],
    defaultProps: {
      count: 2,
      gap: 'gap-6',
      mobileStack: true,
    },
    responsiveCapabilities: ['count', 'gap', 'mobileStack'],
  },
  grid: {
    type: 'grid',
    version: 1,
    label: 'Grid',
    category: 'layout',
    icon: 'LayoutGrid',
    canHaveChildren: true,
    allowedChildren: null,
    forbiddenParents: ['button', 'link'],
    defaultProps: {
      colsDesktop: 3,
      colsTablet: 2,
      colsMobile: 1,
      gap: 'gap-6',
    },
    responsiveCapabilities: ['colsDesktop', 'colsTablet', 'colsMobile', 'gap'],
  },
  stack: {
    type: 'stack',
    version: 1,
    label: 'Stack',
    category: 'layout',
    icon: 'Layers',
    canHaveChildren: true,
    allowedChildren: null,
    forbiddenParents: ['button', 'link'],
    defaultProps: {
      direction: 'flex-col',
      gap: 'gap-4',
      align: 'items-stretch',
    },
    responsiveCapabilities: ['direction', 'gap', 'align'],
  },
  spacer: {
    type: 'spacer',
    version: 1,
    label: 'Spacer',
    category: 'layout',
    icon: 'Maximize2',
    canHaveChildren: false,
    defaultProps: {
      heightDesktop: '48px',
      heightMobile: '24px',
    },
    responsiveCapabilities: ['heightDesktop', 'heightMobile'],
  },
  divider: {
    type: 'divider',
    version: 1,
    label: 'Divider',
    category: 'layout',
    icon: 'Minus',
    canHaveChildren: false,
    defaultProps: {
      style: 'solid',
      color: 'border-slate-200',
      marginY: 'my-6',
    },
    responsiveCapabilities: ['marginY', 'visibility'],
  },

  // CONTENT (8)
  heading: {
    type: 'heading',
    version: 1,
    label: 'Heading',
    category: 'content',
    icon: 'Heading',
    canHaveChildren: false,
    forbiddenParents: ['heading', 'button'],
    defaultProps: {
      text: 'Build Something Remarkable',
      level: 'h2',
      fontSize: 'text-3xl',
      fontWeight: 'font-bold',
      color: 'text-slate-900',
      align: 'text-left',
    },
    responsiveCapabilities: ['fontSize', 'align', 'visibility'],
  },
  text: {
    type: 'text',
    version: 1,
    label: 'Paragraph Text',
    category: 'content',
    icon: 'AlignLeft',
    canHaveChildren: false,
    forbiddenParents: ['text', 'button'],
    defaultProps: {
      content: 'A thoughtful visual design crafted for maximum clarity and engagement.',
      fontSize: 'text-base',
      color: 'text-slate-600',
      lineHeight: 'leading-relaxed',
      align: 'text-left',
    },
    responsiveCapabilities: ['fontSize', 'align', 'visibility'],
  },
  rich_text: {
    type: 'rich_text',
    version: 1,
    label: 'Rich Text',
    category: 'content',
    icon: 'FileText',
    canHaveChildren: false,
    defaultProps: {
      htmlContent: '<p>Empower your business with direct storefront capabilities.</p>',
    },
    responsiveCapabilities: ['visibility'],
  },
  image: {
    type: 'image',
    version: 1,
    label: 'Image',
    category: 'content',
    icon: 'Image',
    canHaveChildren: false,
    defaultProps: {
      src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
      alt: 'Showcase visual',
      aspectRatio: '16/9',
      borderRadius: 'rounded-xl',
      shadow: 'shadow-md',
      objectFit: 'object-cover',
    },
    responsiveCapabilities: ['aspectRatio', 'visibility'],
  },
  video: {
    type: 'video',
    version: 1,
    label: 'Video',
    category: 'content',
    icon: 'Video',
    canHaveChildren: false,
    defaultProps: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      autoplay: false,
      controls: true,
      loop: false,
    },
    responsiveCapabilities: ['visibility'],
  },
  icon: {
    type: 'icon',
    version: 1,
    label: 'Icon',
    category: 'content',
    icon: 'Sparkles',
    canHaveChildren: false,
    defaultProps: {
      iconName: 'Sparkles',
      size: 24,
      color: 'text-indigo-600',
    },
    responsiveCapabilities: ['size', 'visibility'],
  },
  link: {
    type: 'link',
    version: 1,
    label: 'Link',
    category: 'content',
    icon: 'Link',
    canHaveChildren: true,
    allowedChildren: ['text', 'icon', 'badge'],
    forbiddenParents: ['button', 'link'],
    defaultProps: {
      href: '#',
      target: '_self',
      text: 'Learn more →',
      color: 'text-indigo-600 hover:text-indigo-500',
    },
    responsiveCapabilities: ['visibility'],
  },
  badge: {
    type: 'badge',
    version: 1,
    label: 'Badge',
    category: 'content',
    icon: 'Tag',
    canHaveChildren: false,
    defaultProps: {
      text: 'New Release',
      variant: 'subtle',
      color: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      size: 'text-xs',
    },
    responsiveCapabilities: ['visibility'],
  },

  // COMMERCE (7)
  product_card: {
    type: 'product_card',
    version: 1,
    label: 'Product Card',
    category: 'commerce',
    icon: 'ShoppingBag',
    canHaveChildren: false,
    defaultProps: {
      productId: 'prod_featured',
      title: 'Handcrafted Heritage Ceramic',
      price: '₹2,499',
      image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
      ctaText: 'Add to Cart',
      showPrice: true,
    },
    responsiveCapabilities: ['visibility'],
  },
  product_grid: {
    type: 'product_grid',
    version: 1,
    label: 'Product Grid',
    category: 'commerce',
    icon: 'Grid',
    canHaveChildren: false,
    defaultProps: {
      dataSource: 'catalog_all',
      limit: 6,
      colsDesktop: 3,
      colsMobile: 1,
      showPrice: true,
      showAddToCart: true,
    },
    responsiveCapabilities: ['colsDesktop', 'colsMobile', 'limit'],
  },
  product_image: {
    type: 'product_image',
    version: 1,
    label: 'Product Image',
    category: 'commerce',
    icon: 'Image',
    canHaveChildren: false,
    defaultProps: {
      src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
      zoomEnabled: true,
      badge: 'Bestseller',
    },
    responsiveCapabilities: ['visibility'],
  },
  price: {
    type: 'price',
    version: 1,
    label: 'Price Display',
    category: 'commerce',
    icon: 'DollarSign',
    canHaveChildren: false,
    defaultProps: {
      amount: '1,999',
      currency: 'INR',
      currencySymbol: '₹',
      comparePrice: '2,999',
      fontSize: 'text-2xl font-bold text-slate-900',
    },
    responsiveCapabilities: ['fontSize'],
  },
  add_to_cart: {
    type: 'add_to_cart',
    version: 1,
    label: 'Add to Cart Button',
    category: 'commerce',
    icon: 'ShoppingCart',
    canHaveChildren: false,
    defaultProps: {
      productId: 'prod_default',
      buttonText: 'Add to Bag',
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
    responsiveCapabilities: ['fullWidth', 'size'],
  },
  cart_button: {
    type: 'cart_button',
    version: 1,
    label: 'Cart Icon Button',
    category: 'commerce',
    icon: 'ShoppingBag',
    canHaveChildren: false,
    defaultProps: {
      showItemCount: true,
      action: 'open_modal',
      targetModal: 'cart_drawer',
    },
    responsiveCapabilities: ['visibility'],
  },
  cart_summary: {
    type: 'cart_summary',
    version: 1,
    label: 'Cart Summary',
    category: 'commerce',
    icon: 'Receipt',
    canHaveChildren: false,
    defaultProps: {
      showSubtotal: true,
      showTaxes: true,
      checkoutButtonText: 'Proceed to Checkout',
    },
    responsiveCapabilities: ['visibility'],
  },

  // FORMS (6)
  form: {
    type: 'form',
    version: 1,
    label: 'Form Container',
    category: 'forms',
    icon: 'CheckSquare',
    canHaveChildren: true,
    allowedChildren: ['input', 'textarea', 'select', 'checkbox', 'button', 'text', 'divider'],
    forbiddenParents: ['button', 'form'],
    defaultProps: {
      formId: 'inquiry_form',
      action: 'call_function',
      boundFunction: 'handleFormSubmission',
      successMessage: 'Thank you! Your message has been sent.',
    },
    responsiveCapabilities: ['visibility'],
  },
  input: {
    type: 'input',
    version: 1,
    label: 'Text Input',
    category: 'forms',
    icon: 'Edit3',
    canHaveChildren: false,
    forbiddenParents: ['button'],
    defaultProps: {
      name: 'fullName',
      label: 'Your Name',
      placeholder: 'John Doe',
      inputType: 'text',
      required: true,
    },
    responsiveCapabilities: ['visibility'],
  },
  textarea: {
    type: 'textarea',
    version: 1,
    label: 'Textarea',
    category: 'forms',
    icon: 'AlignJustify',
    canHaveChildren: false,
    forbiddenParents: ['button'],
    defaultProps: {
      name: 'message',
      label: 'Message',
      placeholder: 'Describe your inquiry or order details...',
      rows: 4,
      required: true,
    },
    responsiveCapabilities: ['visibility'],
  },
  select: {
    type: 'select',
    version: 1,
    label: 'Dropdown Select',
    category: 'forms',
    icon: 'ChevronDown',
    canHaveChildren: false,
    forbiddenParents: ['button'],
    defaultProps: {
      name: 'inquiryType',
      label: 'Subject',
      options: [
        { label: 'General Inquiry', value: 'general' },
        { label: 'Custom Commission', value: 'custom' },
        { label: 'Wholesale & B2B', value: 'wholesale' },
      ],
    },
    responsiveCapabilities: ['visibility'],
  },
  checkbox: {
    type: 'checkbox',
    version: 1,
    label: 'Checkbox',
    category: 'forms',
    icon: 'CheckSquare',
    canHaveChildren: false,
    defaultProps: {
      name: 'newsletter',
      label: 'Subscribe to atelier dispatch notes and limited releases',
      checked: true,
    },
    responsiveCapabilities: ['visibility'],
  },
  button: {
    type: 'button',
    version: 1,
    label: 'Button',
    category: 'forms',
    icon: 'MousePointer',
    canHaveChildren: false,
    forbiddenParents: ['button', 'heading', 'link'],
    defaultProps: {
      text: 'Explore Collection',
      action: 'navigate',
      target: '/work',
      variant: 'primary', // primary | secondary | outline | ghost | danger
      size: 'md',
      fullWidth: false,
      iconName: 'ArrowRight',
    },
    responsiveCapabilities: ['size', 'fullWidth', 'visibility'],
  },

  // INTERACTION (4)
  modal: {
    type: 'modal',
    version: 1,
    label: 'Modal Dialog',
    category: 'interaction',
    icon: 'Maximize',
    canHaveChildren: true,
    allowedChildren: null,
    defaultProps: {
      modalId: 'contact_modal',
      title: 'Get in Touch',
      maxWidth: 'max-w-lg',
    },
    responsiveCapabilities: ['maxWidth'],
  },
  tabs: {
    type: 'tabs',
    version: 1,
    label: 'Tabs',
    category: 'interaction',
    icon: 'Folder',
    canHaveChildren: true,
    defaultProps: {
      tabList: [
        { id: 'tab1', label: 'Specifications' },
        { id: 'tab2', label: 'Materials & Craft' },
        { id: 'tab3', label: 'Shipping & Care' },
      ],
      defaultTab: 'tab1',
    },
    responsiveCapabilities: ['visibility'],
  },
  accordion: {
    type: 'accordion',
    version: 1,
    label: 'Accordion',
    category: 'interaction',
    icon: 'ChevronsDown',
    canHaveChildren: false,
    defaultProps: {
      items: [
        { title: 'What is your lead time for bespoke editions?', content: 'Every piece is crafted in limited series with a typical 3-4 week dispatch timeframe.' },
        { title: 'Do you offer international tracked delivery?', content: 'Yes, fully insured courier shipping is available globally.' },
        { title: 'Can I request custom architectural dimensions?', content: 'Our studio team accommodates bespoke spatial proportions upon request.' },
      ],
    },
    responsiveCapabilities: ['visibility'],
  },
  pagination: {
    type: 'pagination',
    version: 1,
    label: 'Pagination',
    category: 'interaction',
    icon: 'MoreHorizontal',
    canHaveChildren: false,
    defaultProps: {
      currentPage: 1,
      totalPages: 5,
    },
    responsiveCapabilities: ['visibility'],
  },

  // BUSINESS (4)
  stats: {
    type: 'stats',
    version: 1,
    label: 'Stats Counter',
    category: 'business',
    icon: 'TrendingUp',
    canHaveChildren: false,
    defaultProps: {
      items: [
        { value: '100%', label: 'Handcrafted Rigor' },
        { value: '24+', label: 'Global Design Accolades' },
        { value: '5,000+', label: 'Curated Collectors' },
      ],
    },
    responsiveCapabilities: ['visibility'],
  },
  table: {
    type: 'table',
    version: 1,
    label: 'Data Table',
    category: 'business',
    icon: 'Table',
    canHaveChildren: false,
    defaultProps: {
      headers: ['Feature', 'Studio Standard', 'Enterprise'],
      rows: [
        ['Custom Domain SSL', 'Included', 'Included'],
        ['Dedicated Fera Functions', '30 sandboxed', 'Unlimited'],
        ['Live Team Proofing', 'Up to 5 seats', 'Unlimited'],
      ],
    },
    responsiveCapabilities: ['visibility'],
  },
  map: {
    type: 'map',
    version: 1,
    label: 'Map / Address Card',
    category: 'business',
    icon: 'MapPin',
    canHaveChildren: false,
    defaultProps: {
      locationName: 'Atelier Central Mumbai',
      address: 'Lower Parel Industrial Compound, Mumbai 400013',
      embedMapUrl: '',
    },
    responsiveCapabilities: ['visibility'],
  },
  faq: {
    type: 'faq',
    version: 1,
    label: 'FAQ Section',
    category: 'business',
    icon: 'HelpCircle',
    canHaveChildren: false,
    defaultProps: {
      heading: 'Frequently Inquired',
      questions: [
        { q: 'How do Fera Functions integrate with my storefront?', a: 'Functions execute securely inside our isolated sandbox with authorized database and KV bindings.' },
        { q: 'Can I export or re-import source archives?', a: 'Full project ZIP export and deterministic 3-way merge re-import are native Pro features.' },
      ],
    },
    responsiveCapabilities: ['visibility'],
  },

  // SPECIAL CUSTOM CODE NODE (Preserves unsupported custom code verbatim)
  custom_code: {
    type: 'custom_code',
    version: 1,
    label: 'Custom Code Block',
    category: 'content',
    icon: 'Code',
    canHaveChildren: false,
    defaultProps: {
      language: 'jsx', // 'jsx' | 'html' | 'css'
      code: '// Custom component code',
      isIsolatedSandbox: true,
    },
    responsiveCapabilities: ['visibility'],
  },
};

// -----------------------------------------------------------------------------
// Document Factory & Migrations
// -----------------------------------------------------------------------------

/**
 * Creates a fresh blank page document (schemaVersion 1)
 */
export function createBlankPageDocument(title = 'New Page') {
  const sectionId = generateNodeId('sec');
  const containerId = generateNodeId('cnt');
  const headingId = generateNodeId('hdg');
  const textId = generateNodeId('txt');

  return {
    schemaVersion: SCHEMA_VERSION,
    state: PAGE_STATES.VISUAL_NATIVE,
    title,
    customCss: '',
    sourceCode: '',
    nodes: [
      {
        id: sectionId,
        type: 'section',
        version: 1,
        props: {
          paddingY: 'py-16',
          paddingX: 'px-4',
          backgroundColor: 'bg-white',
          maxWidth: 'max-w-7xl',
          ariaLabel: 'Hero Section',
        },
        children: [
          {
            id: containerId,
            type: 'container',
            version: 1,
            props: {
              maxWidth: 'max-w-4xl',
              padding: 'p-4',
              alignment: 'mx-auto',
            },
            children: [
              {
                id: headingId,
                type: 'heading',
                version: 1,
                props: {
                  text: title,
                  level: 'h1',
                  fontSize: 'text-4xl',
                  fontWeight: 'font-extrabold',
                  color: 'text-slate-900',
                  align: 'text-center',
                },
              },
              {
                id: textId,
                type: 'text',
                version: 1,
                props: {
                  content: 'Welcome to your newly crafted page. Drag components from the left palette to build your layout.',
                  fontSize: 'text-lg',
                  color: 'text-slate-600',
                  lineHeight: 'leading-relaxed',
                  align: 'text-center',
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Migrates older page document formats to schemaVersion 1
 */
export function migratePageDocument(rawDoc) {
  if (!rawDoc || typeof rawDoc !== 'object') {
    return createBlankPageDocument();
  }

  // Already schemaVersion 1
  if (rawDoc.schemaVersion === 1 && Array.isArray(rawDoc.nodes)) {
    return {
      schemaVersion: 1,
      state: rawDoc.state || PAGE_STATES.VISUAL_NATIVE,
      title: rawDoc.title || 'Page',
      customCss: rawDoc.customCss || '',
      sourceCode: rawDoc.sourceCode || '',
      nodes: rawDoc.nodes.map(sanitizeNodeIds),
    };
  }

  // Legacy format: { sections: [...] }
  if (Array.isArray(rawDoc.sections)) {
    const nodes = rawDoc.sections.map((sec, idx) => ({
      id: sec.id || generateNodeId(`sec_${idx}`),
      type: sec.type === 'hero' ? 'section' : (SMART_COMPONENTS[sec.type] ? sec.type : 'section'),
      version: 1,
      props: { ...(sec.props || sec) },
      children: [],
    }));

    return {
      schemaVersion: 1,
      state: PAGE_STATES.VISUAL_NATIVE,
      title: rawDoc.title || 'Migrated Page',
      customCss: '',
      sourceCode: '',
      nodes,
    };
  }

  // Fallback for string or raw object
  return createBlankPageDocument();
}

function sanitizeNodeIds(node) {
  if (!node.id) {
    node.id = generateNodeId(node.type || 'node');
  }
  if (Array.isArray(node.children)) {
    node.children = node.children.map(sanitizeNodeIds);
  }
  return node;
}

// -----------------------------------------------------------------------------
// Tree Operations (Preserves Node ID Stability!)
// -----------------------------------------------------------------------------

export function findNodeAndParent(nodes, targetId, parent = null) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === targetId) {
      return { node, parent, index: i, siblings: nodes };
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      const found = findNodeAndParent(node.children, targetId, node);
      if (found) return found;
    }
  }
  return null;
}

export function insertNode(doc, targetId, newNode, position = 'after') {
  if (!newNode.id) {
    newNode.id = generateNodeId(newNode.type || 'node');
  }

  // If no target or target is root
  if (!targetId || targetId === 'root') {
    if (position === 'before') {
      doc.nodes.unshift(newNode);
    } else {
      doc.nodes.push(newNode);
    }
    return true;
  }

  const found = findNodeAndParent(doc.nodes, targetId);
  if (!found) {
    doc.nodes.push(newNode);
    return true;
  }

  const { node, siblings, index } = found;

  if (position === 'inside') {
    const def = SMART_COMPONENTS[node.type];
    if (def && !def.canHaveChildren) {
      throw new Error(`Component '${node.type}' cannot have children.`);
    }
    node.children = node.children || [];
    node.children.push(newNode);
    return true;
  }

  if (position === 'before') {
    siblings.splice(index, 0, newNode);
    return true;
  }

  // Default: after
  siblings.splice(index + 1, 0, newNode);
  return true;
}

export function removeNode(doc, targetId) {
  const found = findNodeAndParent(doc.nodes, targetId);
  if (!found) return false;
  found.siblings.splice(found.index, 1);
  return true;
}

export function moveNode(doc, sourceId, targetId, position = 'after') {
  if (sourceId === targetId) return false;

  const foundSource = findNodeAndParent(doc.nodes, sourceId);
  if (!foundSource) return false;

  // Extract node without changing its ID
  const [movingNode] = foundSource.siblings.splice(foundSource.index, 1);

  // Insert into new target position
  return insertNode(doc, targetId, movingNode, position);
}

export function duplicateNode(doc, targetId) {
  const found = findNodeAndParent(doc.nodes, targetId);
  if (!found) return null;

  // Deep clone and regenerate NEW unique IDs for the clone and all descendants
  const cloned = cloneWithNewIds(found.node);
  found.siblings.splice(found.index + 1, 0, cloned);
  return cloned;
}

function cloneWithNewIds(node) {
  const cloned = {
    ...node,
    id: generateNodeId(node.type || 'clone'),
    props: JSON.parse(JSON.stringify(node.props || {})),
    responsive: node.responsive ? JSON.parse(JSON.stringify(node.responsive)) : undefined,
  };
  if (Array.isArray(node.children)) {
    cloned.children = node.children.map(cloneWithNewIds);
  }
  return cloned;
}

export function updateNodeProps(doc, targetId, propUpdates) {
  const found = findNodeAndParent(doc.nodes, targetId);
  if (!found) return false;
  found.node.props = {
    ...(found.node.props || {}),
    ...propUpdates,
  };
  return true;
}

export function updateNodeResponsive(doc, targetId, breakpoint, styleUpdates) {
  if (!VIEWPORT_BREAKPOINTS.includes(breakpoint)) return false;
  const found = findNodeAndParent(doc.nodes, targetId);
  if (!found) return false;

  found.node.responsive = found.node.responsive || {};
  found.node.responsive[breakpoint] = {
    ...(found.node.responsive[breakpoint] || {}),
    ...styleUpdates,
  };
  return true;
}

// -----------------------------------------------------------------------------
// Deterministic Page Document Validation Engine
// -----------------------------------------------------------------------------

export function validatePageDocument(doc) {
  const errors = [];
  const warnings = [];

  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['Invalid document structure (not an object)'], warnings };
  }

  if (doc.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion '${doc.schemaVersion}'. Expected version ${SCHEMA_VERSION}.`);
  }

  if (!doc.state || !Object.values(PAGE_STATES).includes(doc.state)) {
    errors.push(`Invalid page state '${doc.state}'. Must be VISUAL_NATIVE, HYBRID, or CODE_NATIVE.`);
  }

  if (!Array.isArray(doc.nodes)) {
    errors.push(`Document nodes must be an array.`);
    return { valid: false, errors, warnings };
  }

  if (doc.nodes.length === 0 && doc.state === PAGE_STATES.VISUAL_NATIVE) {
    warnings.push(`Page has zero components. Add at least one Section.`);
  }

  const seenIds = new Set();

  function validateNode(node, parent = null) {
    if (!node.id || typeof node.id !== 'string') {
      errors.push(`Node missing valid string ID: ${JSON.stringify(node)}`);
    } else {
      if (seenIds.has(node.id)) {
        errors.push(`Duplicate node ID detected: '${node.id}'`);
      }
      seenIds.add(node.id);
    }

    const def = SMART_COMPONENTS[node.type];
    if (!def) {
      errors.push(`Unknown component type '${node.type}' on node '${node.id}'`);
      return;
    }

    // Nesting rules: forbidden parents
    if (parent && def.forbiddenParents && def.forbiddenParents.includes(parent.type)) {
      errors.push(`Invalid nesting: '${node.type}' cannot be a child of '${parent.type}'.`);
    }

    // Nesting rules: canHaveChildren
    if (!def.canHaveChildren && Array.isArray(node.children) && node.children.length > 0) {
      errors.push(`Component '${node.type}' (node ${node.id}) cannot have child elements.`);
    }

    // Nesting rules: allowedChildren
    if (def.canHaveChildren && def.allowedChildren && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (!def.allowedChildren.includes(child.type) && child.type !== 'custom_code') {
          errors.push(`Component '${node.type}' does not permit children of type '${child.type}'.`);
        }
      }
    }

    // Actions validation
    if (node.props?.action) {
      if (!APPROVED_ACTIONS.includes(node.props.action)) {
        errors.push(`Invalid action type '${node.props.action}' on node '${node.id}'. Approved actions: ${APPROVED_ACTIONS.join(', ')}`);
      }
    }

    // Responsive validation
    if (node.responsive) {
      for (const bp of Object.keys(node.responsive)) {
        if (!VIEWPORT_BREAKPOINTS.includes(bp)) {
          errors.push(`Invalid responsive breakpoint '${bp}' on node '${node.id}'. Supported: ${VIEWPORT_BREAKPOINTS.join(', ')}`);
        }
      }
    }

    // Recurse children
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        validateNode(child, node);
      }
    }
  }

  for (const rootNode of doc.nodes) {
    validateNode(rootNode);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

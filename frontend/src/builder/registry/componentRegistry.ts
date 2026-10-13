/**
 * FeraSetu Unified Visual Builder — Component Registry
 * Version: 2.0 (schemaVersion: 2)
 *
 * Provides a typed, versioned component registry with:
 * - Stable IDs & version numbers
 * - Responsive prop schemas
 * - Semantic accessibility configs
 * - Parameterized variants & slots
 * - Composable primitives, form controls, commerce widgets, and page blocks
 */

import type { ComponentDefinition, ComponentCategory } from '../types/builderTypes';

export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  // =========================================================================
  // 1. PRIMITIVES
  // =========================================================================
  {
    id: 'primitive.button',
    version: 1,
    name: 'Action Button',
    category: 'primitives',
    description: 'Customizable interactive button for triggers, links, and workflows.',
    iconName: 'MousePointerClick',
    tags: ['button', 'cta', 'click', 'action', 'whatsapp', 'submit'],
    defaultProps: {
      text: 'Click Here',
      variant: 'solid',
      size: 'md',
      fullWidth: false,
      iconName: '',
      iconPosition: 'left',
      disabled: false,
      ariaLabel: 'Action button',
    },
    propSchema: {
      text: { type: 'string', control: 'text', label: 'Button Label', defaultValue: 'Click Here', category: 'content' },
      variant: {
        type: 'string',
        control: 'select',
        label: 'Style Variant',
        defaultValue: 'solid',
        category: 'style',
        options: [
          { label: 'Solid Primary', value: 'solid' },
          { label: 'Secondary / Dark', value: 'secondary' },
          { label: 'Outline / Border', value: 'outline' },
          { label: 'Ghost / Subtle', value: 'ghost' },
          { label: 'WhatsApp Green', value: 'whatsapp' },
          { label: 'Pill Rounded', value: 'pill' },
        ],
      },
      size: {
        type: 'string',
        control: 'select',
        label: 'Size',
        defaultValue: 'md',
        responsive: true,
        category: 'style',
        options: [
          { label: 'Small (36px)', value: 'sm' },
          { label: 'Medium (44px)', value: 'md' },
          { label: 'Large (52px)', value: 'lg' },
        ],
      },
      fullWidth: { type: 'boolean', control: 'boolean', label: 'Full Width', defaultValue: false, responsive: true, category: 'layout' },
      iconName: { type: 'string', control: 'iconPicker', label: 'Optional Icon', defaultValue: '', category: 'content' },
      iconPosition: {
        type: 'string',
        control: 'select',
        label: 'Icon Position',
        defaultValue: 'left',
        category: 'content',
        options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }],
      },
      ariaLabel: { type: 'string', control: 'text', label: 'Accessibility Label', defaultValue: 'Action button', category: 'content' },
    },
    variants: [
      { id: 'solid', label: 'Solid Primary', props: { variant: 'solid' } },
      { id: 'outline', label: 'Clean Outline', props: { variant: 'outline' } },
      { id: 'whatsapp', label: 'Direct WhatsApp', props: { variant: 'whatsapp', iconName: 'MessageCircle' } },
      { id: 'pill', label: 'Rounded Pill', props: { variant: 'pill' } },
      { id: 'ghost', label: 'Ghost Minimal', props: { variant: 'ghost' } },
    ],
    responsiveProps: ['size', 'fullWidth'],
    a11y: {
      defaultTag: 'button',
      allowedTags: ['button', 'a'],
      role: 'button',
      ariaLabelProp: 'ariaLabel',
    },
  },

  {
    id: 'primitive.text',
    version: 1,
    name: 'Text & Paragraph',
    category: 'typography',
    description: 'Formatted typography block for body text, subtitles, and descriptions.',
    iconName: 'Type',
    tags: ['text', 'paragraph', 'description', 'copy', 'typography'],
    defaultProps: {
      text: 'Add your descriptive text here. Explain your product features, merchant story, or delivery terms.',
      variant: 'body',
      align: 'left',
      color: 'default',
    },
    propSchema: {
      text: { type: 'string', control: 'textarea', label: 'Text Content', defaultValue: '', category: 'content' },
      variant: {
        type: 'string',
        control: 'select',
        label: 'Text Style',
        defaultValue: 'body',
        category: 'style',
        options: [
          { label: 'Body (15px)', value: 'body' },
          { label: 'Lead / Subtitle (18px)', value: 'lead' },
          { label: 'Small / Legal (12px)', value: 'small' },
          { label: 'Monospace / Code (13px)', value: 'mono' },
        ],
      },
      align: {
        type: 'string',
        control: 'alignment',
        label: 'Text Alignment',
        defaultValue: 'left',
        responsive: true,
        category: 'layout',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
      color: {
        type: 'string',
        control: 'select',
        label: 'Text Color',
        defaultValue: 'default',
        category: 'style',
        options: [
          { label: 'Standard Text', value: 'default' },
          { label: 'Subtle Muted', value: 'muted' },
          { label: 'Primary Brand', value: 'primary' },
          { label: 'White / Inverse', value: 'white' },
        ],
      },
    },
    variants: [
      { id: 'body', label: 'Standard Body', props: { variant: 'body' } },
      { id: 'lead', label: 'Lead Paragraph', props: { variant: 'lead' } },
      { id: 'small', label: 'Small Footnote', props: { variant: 'small' } },
    ],
    responsiveProps: ['align'],
    a11y: {
      defaultTag: 'p',
      allowedTags: ['p', 'span', 'div'],
    },
  },

  {
    id: 'primitive.heading',
    version: 1,
    name: 'Heading Title',
    category: 'typography',
    description: 'Semantic hierarchical heading (H1 to H6) with responsive sizing.',
    iconName: 'Heading',
    tags: ['heading', 'title', 'h1', 'h2', 'hero title'],
    defaultProps: {
      title: 'Crafted for Indian Retail',
      level: 'h2',
      align: 'left',
    },
    propSchema: {
      title: { type: 'string', control: 'text', label: 'Heading Text', defaultValue: 'Heading Title', category: 'content' },
      level: {
        type: 'string',
        control: 'select',
        label: 'Heading Level',
        defaultValue: 'h2',
        category: 'content',
        options: [
          { label: 'H1 — Hero Main Title', value: 'h1' },
          { label: 'H2 — Section Header', value: 'h2' },
          { label: 'H3 — Card / Block Title', value: 'h3' },
          { label: 'H4 — Small Subheading', value: 'h4' },
        ],
      },
      align: {
        type: 'string',
        control: 'alignment',
        label: 'Alignment',
        defaultValue: 'left',
        responsive: true,
        category: 'layout',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
    },
    variants: [
      { id: 'h1', label: 'Hero Display (H1)', props: { level: 'h1' } },
      { id: 'h2', label: 'Section Title (H2)', props: { level: 'h2' } },
      { id: 'h3', label: 'Card Title (H3)', props: { level: 'h3' } },
    ],
    responsiveProps: ['align'],
    a11y: {
      defaultTag: 'h2',
      allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    },
  },

  {
    id: 'primitive.image',
    version: 1,
    name: 'Media Image',
    category: 'media',
    description: 'Responsive media element with draft/published B2 asset selection.',
    iconName: 'Image',
    tags: ['image', 'photo', 'picture', 'banner', 'media', 'b2'],
    defaultProps: {
      src: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&q=80',
      alt: 'Product showcase image',
      aspectRatio: '16/9',
      fit: 'cover',
      rounded: 'md',
    },
    propSchema: {
      src: { type: 'string', control: 'mediaPicker', label: 'Image Source', defaultValue: '', category: 'content' },
      alt: { type: 'string', control: 'text', label: 'Alt Description (a11y)', defaultValue: 'Store image', category: 'content' },
      aspectRatio: {
        type: 'string',
        control: 'select',
        label: 'Aspect Ratio',
        defaultValue: '16/9',
        category: 'style',
        options: [
          { label: '16:9 Landscape', value: '16/9' },
          { label: '4:3 Standard', value: '4/3' },
          { label: '1:1 Square', value: '1/1' },
          { label: '3:4 Editorial Portrait', value: '3/4' },
          { label: 'Auto / Natural', value: 'auto' },
        ],
      },
      fit: {
        type: 'string',
        control: 'select',
        label: 'Object Fit',
        defaultValue: 'cover',
        category: 'style',
        options: [{ label: 'Cover', value: 'cover' }, { label: 'Contain', value: 'contain' }],
      },
      rounded: {
        type: 'string',
        control: 'select',
        label: 'Corner Radius',
        defaultValue: 'md',
        category: 'style',
        options: [
          { label: 'None (0px)', value: 'none' },
          { label: 'Soft (8px)', value: 'sm' },
          { label: 'Medium (16px)', value: 'md' },
          { label: 'Rounded Pill (999px)', value: 'full' },
        ],
      },
    },
    variants: [
      { id: 'landscape', label: '16:9 Banner', props: { aspectRatio: '16/9' } },
      { id: 'square', label: '1:1 Product Square', props: { aspectRatio: '1/1' } },
      { id: 'portrait', label: '3:4 Editorial', props: { aspectRatio: '3/4' } },
    ],
    a11y: {
      defaultTag: 'img',
      supportsAlt: true,
      ariaLabelProp: 'alt',
    },
  },

  {
    id: 'primitive.container',
    version: 1,
    name: 'Layout Box / Card',
    category: 'layout',
    description: 'Structural container with flexbox/grid layout and padding controls.',
    iconName: 'Box',
    tags: ['box', 'container', 'card', 'layout', 'wrapper', 'flex'],
    defaultProps: {
      variant: 'card',
      padding: 'md',
      direction: 'column',
      gap: 'md',
    },
    propSchema: {
      variant: {
        type: 'string',
        control: 'select',
        label: 'Container Style',
        defaultValue: 'card',
        category: 'style',
        options: [
          { label: 'Card (White + Border)', value: 'card' },
          { label: 'Subtle Slate', value: 'slate' },
          { label: 'Transparent Box', value: 'transparent' },
          { label: 'Elevated Shadow', value: 'elevated' },
        ],
      },
      padding: {
        type: 'string',
        control: 'spacing',
        label: 'Padding',
        defaultValue: 'md',
        responsive: true,
        category: 'layout',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Compact (8px)', value: 'sm' },
          { label: 'Comfortable (16px)', value: 'md' },
          { label: 'Spacious (24px)', value: 'lg' },
        ],
      },
      direction: {
        type: 'string',
        control: 'select',
        label: 'Flex Direction',
        defaultValue: 'column',
        responsive: true,
        category: 'layout',
        options: [
          { label: 'Vertical (Column)', value: 'column' },
          { label: 'Horizontal (Row)', value: 'row' },
        ],
      },
      gap: {
        type: 'string',
        control: 'spacing',
        label: 'Child Spacing',
        defaultValue: 'md',
        category: 'layout',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Small (8px)', value: 'sm' },
          { label: 'Medium (16px)', value: 'md' },
          { label: 'Large (24px)', value: 'lg' },
        ],
      },
    },
    variants: [
      { id: 'card', label: 'Clean White Card', props: { variant: 'card' } },
      { id: 'slate', label: 'Subtle Slate Card', props: { variant: 'slate' } },
      { id: 'elevated', label: 'Elevated Floating Card', props: { variant: 'elevated' } },
    ],
    supportsChildren: true,
    responsiveProps: ['padding', 'direction'],
    a11y: {
      defaultTag: 'div',
      allowedTags: ['div', 'section', 'article', 'aside'],
    },
  },

  // =========================================================================
  // 2. FORMS & INPUTS (Workflow Connected)
  // =========================================================================
  {
    id: 'form.input',
    version: 1,
    name: 'Form Text Input',
    category: 'forms',
    description: 'Input field supporting text, email, phone, and password with validation.',
    iconName: 'FormInput',
    tags: ['input', 'text input', 'email', 'phone', 'field', 'form'],
    defaultProps: {
      name: 'email',
      label: 'Email Address',
      placeholder: 'merchant@example.com',
      inputType: 'email',
      required: true,
      helperText: 'We will send order confirmations here.',
    },
    propSchema: {
      name: { type: 'string', control: 'text', label: 'Field Name (Key)', defaultValue: 'fieldName', category: 'content' },
      label: { type: 'string', control: 'text', label: 'Field Label', defaultValue: 'Label', category: 'content' },
      placeholder: { type: 'string', control: 'text', label: 'Placeholder', defaultValue: '', category: 'content' },
      inputType: {
        type: 'string',
        control: 'select',
        label: 'Input Type',
        defaultValue: 'text',
        category: 'content',
        options: [
          { label: 'Email', value: 'email' },
          { label: 'Text', value: 'text' },
          { label: 'Phone Number', value: 'tel' },
          { label: 'Password', value: 'password' },
          { label: 'Number', value: 'number' },
        ],
      },
      required: { type: 'boolean', control: 'boolean', label: 'Required Field', defaultValue: true, category: 'content' },
      helperText: { type: 'string', control: 'text', label: 'Helper Text', defaultValue: '', category: 'content' },
    },
    variants: [
      { id: 'email', label: 'Email Input', props: { inputType: 'email', name: 'email', label: 'Email Address' } },
      { id: 'phone', label: 'Phone Number', props: { inputType: 'tel', name: 'phone', label: 'Phone Number' } },
      { id: 'password', label: 'Password Field', props: { inputType: 'password', name: 'password', label: 'Password' } },
      { id: 'name', label: 'Full Name Field', props: { inputType: 'text', name: 'name', label: 'Full Name' } },
    ],
    a11y: {
      defaultTag: 'input',
      role: 'textbox',
      ariaLabelProp: 'label',
    },
  },

  {
    id: 'form.container',
    version: 1,
    name: 'Form Container',
    category: 'forms',
    description: 'Composite form wrapper that captures inputs and triggers submission workflows.',
    iconName: 'ClipboardList',
    tags: ['form', 'signup', 'lead', 'contact', 'submit'],
    defaultProps: {
      title: 'Sign Up for Updates',
      submitButtonText: 'Submit',
      workflowId: '',
    },
    propSchema: {
      title: { type: 'string', control: 'text', label: 'Form Title', defaultValue: 'Get in Touch', category: 'content' },
      submitButtonText: { type: 'string', control: 'text', label: 'Submit Button Label', defaultValue: 'Submit', category: 'content' },
      workflowId: { type: 'string', control: 'workflowBinding', label: 'Submission Workflow', defaultValue: '', category: 'interaction' },
    },
    variants: [
      { id: 'newsletter', label: 'Newsletter Signup Form', props: { title: 'Subscribe to Newsletter', submitButtonText: 'Subscribe' } },
      { id: 'inquiry', label: 'Contact Inquiry Form', props: { title: 'Send Us a Message', submitButtonText: 'Send Message' } },
    ],
    supportsChildren: true,
    a11y: {
      defaultTag: 'form',
    },
  },

  // =========================================================================
  // 3. COMMERCE COMPONENTS
  // =========================================================================
  {
    id: 'commerce.product-grid',
    version: 1,
    name: 'Product Catalog Grid',
    category: 'commerce',
    description: 'Dynamic product grid connected to live merchant inventory with instant carting.',
    iconName: 'ShoppingBag',
    tags: ['products', 'catalog', 'grid', 'store', 'shop', 'ecommerce'],
    defaultProps: {
      variant: 'clean',
      columns: 3,
      showPrice: true,
      showBuyButton: true,
      categoryFilter: 'all',
    },
    propSchema: {
      variant: {
        type: 'string',
        control: 'select',
        label: 'Grid Aesthetic',
        defaultValue: 'clean',
        category: 'style',
        options: [
          { label: 'Clean Retail', value: 'clean' },
          { label: 'Editorial 3:4 Luxury', value: 'editorial' },
          { label: 'Swiss Minimal Mono', value: 'mono' },
          { label: 'Bold Pill Badges', value: 'bold' },
          { label: 'Artisan Warmth', value: 'artisan' },
        ],
      },
      columns: {
        type: 'number',
        control: 'number',
        label: 'Desktop Columns',
        defaultValue: 3,
        min: 2,
        max: 4,
        responsive: true,
        category: 'layout',
      },
      showPrice: { type: 'boolean', control: 'boolean', label: 'Show Price', defaultValue: true, category: 'content' },
      showBuyButton: { type: 'boolean', control: 'boolean', label: 'Show Add to Cart / WhatsApp', defaultValue: true, category: 'content' },
    },
    variants: [
      { id: 'clean', label: 'Clean Retail Grid', props: { variant: 'clean', columns: 3 } },
      { id: 'editorial', label: 'Editorial Luxury (2-Col)', props: { variant: 'editorial', columns: 2 } },
      { id: 'compact', label: 'Compact Grid (4-Col)', props: { variant: 'clean', columns: 4 } },
    ],
    responsiveProps: ['columns'],
    a11y: {
      defaultTag: 'section',
      role: 'region',
    },
  },

  {
    id: 'commerce.featured-product',
    version: 1,
    name: 'Flagship Product Spotlight',
    category: 'commerce',
    description: 'High-conversion single product showcase with imagery, options, and direct purchase.',
    iconName: 'Sparkles',
    tags: ['featured', 'spotlight', 'hero product', 'bestseller'],
    defaultProps: {
      badgeText: 'BESTSELLER',
      headline: 'Heritage Pashmina Shawl',
      description: 'Hand-loomed in Kashmir from 100% fine mountain wool.',
      price: 4999,
      salePrice: 3899,
    },
    propSchema: {
      badgeText: { type: 'string', control: 'text', label: 'Highlight Badge', defaultValue: 'FEATURED', category: 'content' },
      headline: { type: 'string', control: 'text', label: 'Product Title', defaultValue: 'Flagship Product', category: 'content' },
      description: { type: 'string', control: 'textarea', label: 'Description', defaultValue: '', category: 'content' },
      price: { type: 'number', control: 'number', label: 'Original Price (₹)', defaultValue: 1000, category: 'content' },
      salePrice: { type: 'number', control: 'number', label: 'Sale Price (₹)', defaultValue: 799, category: 'content' },
    },
    variants: [
      { id: 'bestseller', label: 'Bestseller Card', props: { badgeText: '🔥 BESTSELLER' } },
      { id: 'limited', label: 'Limited Drop Card', props: { badgeText: '⚡ LIMITED DROP' } },
    ],
    a11y: {
      defaultTag: 'section',
    },
  },

  // =========================================================================
  // 4. PAGE BLOCKS & SECTIONS
  // =========================================================================
  {
    id: 'block.hero',
    version: 1,
    name: 'Hero Section Showcase',
    category: 'blocks',
    description: 'Full-width top hero showcase with headline, call-to-action buttons, and media.',
    iconName: 'LayoutTemplate',
    tags: ['hero', 'banner', 'top', 'headline', 'intro'],
    defaultProps: {
      title: 'Fresh Goods Delivered to Your Doorstep',
      subtitle: 'Order directly on WhatsApp with zero platform commission.',
      ctaText: 'Shop Catalog',
      ctaVariant: 'solid',
      variant: 'commerce-banner',
    },
    propSchema: {
      title: { type: 'string', control: 'text', label: 'Main Headline', defaultValue: 'Store Headline', category: 'content' },
      subtitle: { type: 'string', control: 'textarea', label: 'Sub-headline', defaultValue: '', category: 'content' },
      ctaText: { type: 'string', control: 'text', label: 'Primary CTA Text', defaultValue: 'Shop Now', category: 'content' },
      variant: {
        type: 'string',
        control: 'select',
        label: 'Hero Style',
        defaultValue: 'commerce-banner',
        category: 'style',
        options: [
          { label: 'Commerce Banner with Badges', value: 'commerce-banner' },
          { label: 'Asymmetric Split Media', value: 'split' },
          { label: 'Editorial Centered', value: 'editorial' },
          { label: 'Product Spotlight Card', value: 'product-focused' },
          { label: 'Swiss Minimal One-Liner', value: 'minimal' },
        ],
      },
    },
    variants: [
      { id: 'commerce-banner', label: 'Retail Banner', props: { variant: 'commerce-banner' } },
      { id: 'split', label: 'Split Media & Copy', props: { variant: 'split' } },
      { id: 'editorial', label: 'Luxury Centered', props: { variant: 'editorial' } },
    ],
    a11y: {
      defaultTag: 'section',
    },
  },

  {
    id: 'block.trust-strip',
    version: 1,
    name: 'Trust & Guarantees Strip',
    category: 'blocks',
    description: 'Reassuring retail trust badges (Cash on Delivery, Express Dispatch, Easy Returns).',
    iconName: 'ShieldCheck',
    tags: ['trust', 'cod', 'returns', 'guarantee', 'badges'],
    defaultProps: {
      badge1: 'Cash on Delivery Available',
      badge2: 'Express 48h Dispatch',
      badge3: 'Easy 7-Day Returns',
      variant: 'commerce-badges',
    },
    propSchema: {
      badge1: { type: 'string', control: 'text', label: 'Badge 1', defaultValue: 'Cash on Delivery', category: 'content' },
      badge2: { type: 'string', control: 'text', label: 'Badge 2', defaultValue: 'Express Dispatch', category: 'content' },
      badge3: { type: 'string', control: 'text', label: 'Badge 3', defaultValue: '7-Day Easy Returns', category: 'content' },
    },
    variants: [
      { id: 'retail', label: 'Retail Standard Badges', props: { variant: 'commerce-badges' } },
      { id: 'luxury', label: 'Luxury Assurance', props: { variant: 'luxury-guarantee' } },
    ],
    a11y: {
      defaultTag: 'aside',
      role: 'complementary',
    },
  },

  {
    id: 'block.faq',
    version: 1,
    name: 'FAQ Accordion',
    category: 'blocks',
    description: 'Collapsible accordion questions addressing shipping, returns, and ordering.',
    iconName: 'HelpCircle',
    tags: ['faq', 'questions', 'accordion', 'help', 'answers'],
    defaultProps: {
      title: 'Frequently Asked Questions',
      q1: 'How do I place an order?',
      a1: 'Browse products, add items to cart, and checkout directly on WhatsApp or through our secure portal.',
      q2: 'What payment methods do you accept?',
      a2: 'We support UPI, Credit/Debit cards, Net Banking, and Cash on Delivery.',
    },
    propSchema: {
      title: { type: 'string', control: 'text', label: 'Section Title', defaultValue: 'FAQ', category: 'content' },
      q1: { type: 'string', control: 'text', label: 'Question 1', defaultValue: '', category: 'content' },
      a1: { type: 'string', control: 'textarea', label: 'Answer 1', defaultValue: '', category: 'content' },
      q2: { type: 'string', control: 'text', label: 'Question 2', defaultValue: '', category: 'content' },
      a2: { type: 'string', control: 'textarea', label: 'Answer 2', defaultValue: '', category: 'content' },
    },
    variants: [
      { id: 'standard', label: 'Standard Accordion', props: {} },
    ],
    a11y: {
      defaultTag: 'section',
    },
  },
];

export const COMPONENT_CATALOG = COMPONENT_DEFINITIONS;

export const COMPONENT_CATALOG_MAP: Record<string, ComponentDefinition> = Object.fromEntries(
  COMPONENT_DEFINITIONS.map((def) => [def.id, def])
);

export function getComponentDefinition(id: string): ComponentDefinition | undefined {
  return COMPONENT_CATALOG_MAP[id];
}

export function getComponentsByCategory(category: ComponentCategory): ComponentDefinition[] {
  return COMPONENT_DEFINITIONS.filter((d) => d.category === category);
}

// FeraSetu Pro Studio — Smart Component Catalog & Property Metadata
// =============================================================================
// Complete definitions for 38 smart components organized across 6 categories.
// Each component defines defaultProps, property editing controls, and nesting rules.
// =============================================================================

import type { ComponentDefinition } from './pageEditorTypes';

export interface PropControl {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number' | 'color' | 'action_picker';
  options?: { label: string; value: string }[];
  section: 'content' | 'layout' | 'style' | 'actions';
  description?: string;
}

export const SMART_COMPONENT_CATALOG: Record<string, ComponentDefinition & { controls: PropControl[] }> = {
  // ---------------------------------------------------------------------------
  // LAYOUT
  // ---------------------------------------------------------------------------
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
    controls: [
      {
        name: 'maxWidth',
        label: 'Max Width',
        type: 'select',
        section: 'layout',
        options: [
          { label: 'Full Width', value: 'max-w-full' },
          { label: '7XL (80rem)', value: 'max-w-7xl' },
          { label: '6XL (72rem)', value: 'max-w-6xl' },
          { label: '5XL (64rem)', value: 'max-w-5xl' },
          { label: '4XL (56rem)', value: 'max-w-4xl' },
        ],
      },
      {
        name: 'paddingY',
        label: 'Vertical Padding',
        type: 'select',
        section: 'layout',
        options: [
          { label: 'None', value: 'py-0' },
          { label: 'Small (py-6)', value: 'py-6' },
          { label: 'Medium (py-12)', value: 'py-12' },
          { label: 'Large (py-20)', value: 'py-20' },
          { label: 'Extra Large (py-28)', value: 'py-28' },
        ],
      },
      {
        name: 'backgroundColor',
        label: 'Background Color',
        type: 'select',
        section: 'style',
        options: [
          { label: 'Transparent', value: 'transparent' },
          { label: 'White', value: 'bg-white' },
          { label: 'Slate 50 (Off-white)', value: 'bg-slate-50' },
          { label: 'Slate 100 (Light Gray)', value: 'bg-slate-100' },
          { label: 'Slate 900 (Dark)', value: 'bg-slate-900' },
          { label: 'Indigo 50', value: 'bg-indigo-50' },
        ],
      },
      { name: 'ariaLabel', label: 'Accessibility Label', type: 'text', section: 'content' },
    ],
  },
  container: {
    type: 'container',
    version: 1,
    label: 'Container',
    category: 'layout',
    icon: 'Box',
    canHaveChildren: true,
    allowedChildren: null,
    forbiddenParents: ['button', 'link', 'heading'],
    defaultProps: {
      maxWidth: 'max-w-6xl',
      padding: 'p-4',
      alignment: 'mx-auto',
    },
    controls: [
      {
        name: 'maxWidth',
        label: 'Max Width',
        type: 'select',
        section: 'layout',
        options: [
          { label: 'Full Width', value: 'max-w-full' },
          { label: '6XL (72rem)', value: 'max-w-6xl' },
          { label: '4XL (56rem)', value: 'max-w-4xl' },
          { label: '2XL (42rem)', value: 'max-w-2xl' },
        ],
      },
      {
        name: 'padding',
        label: 'Inner Padding',
        type: 'select',
        section: 'layout',
        options: [
          { label: 'None', value: 'p-0' },
          { label: 'Small (p-2)', value: 'p-2' },
          { label: 'Medium (p-4)', value: 'p-4' },
          { label: 'Large (p-8)', value: 'p-8' },
        ],
      },
    ],
  },
  row: {
    type: 'row',
    version: 1,
    label: 'Row',
    category: 'layout',
    icon: 'Columns',
    canHaveChildren: true,
    allowedChildren: null,
    forbiddenParents: ['button', 'link', 'heading'],
    defaultProps: {
      direction: 'flex-row',
      wrap: 'flex-wrap',
      gap: 'gap-6',
      justify: 'justify-start',
      align: 'items-center',
    },
    controls: [
      {
        name: 'gap',
        label: 'Gap Between Items',
        type: 'select',
        section: 'layout',
        options: [
          { label: 'Gap 2', value: 'gap-2' },
          { label: 'Gap 4', value: 'gap-4' },
          { label: 'Gap 6', value: 'gap-6' },
          { label: 'Gap 8', value: 'gap-8' },
        ],
      },
      {
        name: 'justify',
        label: 'Justify Alignment',
        type: 'select',
        section: 'layout',
        options: [
          { label: 'Start', value: 'justify-start' },
          { label: 'Center', value: 'justify-center' },
          { label: 'End', value: 'justify-end' },
          { label: 'Space Between', value: 'justify-between' },
        ],
      },
    ],
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
    controls: [
      {
        name: 'count',
        label: 'Column Count',
        type: 'select',
        section: 'layout',
        options: [
          { label: '2 Columns', value: '2' },
          { label: '3 Columns', value: '3' },
          { label: '4 Columns', value: '4' },
        ],
      },
      { name: 'mobileStack', label: 'Stack on Mobile', type: 'checkbox', section: 'layout' },
    ],
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
    controls: [
      {
        name: 'colsDesktop',
        label: 'Desktop Columns',
        type: 'select',
        section: 'layout',
        options: [
          { label: '1 Column', value: '1' },
          { label: '2 Columns', value: '2' },
          { label: '3 Columns', value: '3' },
          { label: '4 Columns', value: '4' },
        ],
      },
      {
        name: 'gap',
        label: 'Grid Gap',
        type: 'select',
        section: 'layout',
        options: [
          { label: 'Gap 4', value: 'gap-4' },
          { label: 'Gap 6', value: 'gap-6' },
          { label: 'Gap 8', value: 'gap-8' },
        ],
      },
    ],
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
    controls: [
      {
        name: 'gap',
        label: 'Vertical Gap',
        type: 'select',
        section: 'layout',
        options: [
          { label: 'Gap 2', value: 'gap-2' },
          { label: 'Gap 4', value: 'gap-4' },
          { label: 'Gap 6', value: 'gap-6' },
        ],
      },
    ],
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
    controls: [
      { name: 'heightDesktop', label: 'Desktop Height (px)', type: 'text', section: 'layout' },
      { name: 'heightMobile', label: 'Mobile Height (px)', type: 'text', section: 'layout' },
    ],
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
    controls: [
      {
        name: 'marginY',
        label: 'Vertical Margin',
        type: 'select',
        section: 'layout',
        options: [
          { label: 'my-3 (Small)', value: 'my-3' },
          { label: 'my-6 (Medium)', value: 'my-6' },
          { label: 'my-12 (Large)', value: 'my-12' },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // CONTENT
  // ---------------------------------------------------------------------------
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
    controls: [
      { name: 'text', label: 'Heading Text', type: 'text', section: 'content' },
      {
        name: 'level',
        label: 'HTML Heading Level',
        type: 'select',
        section: 'content',
        options: [
          { label: 'H1 (Main Page Title)', value: 'h1' },
          { label: 'H2 (Section Heading)', value: 'h2' },
          { label: 'H3 (Sub-heading)', value: 'h3' },
          { label: 'H4 (Small Heading)', value: 'h4' },
        ],
      },
      {
        name: 'fontSize',
        label: 'Font Size',
        type: 'select',
        section: 'style',
        options: [
          { label: '2XL (24px)', value: 'text-2xl' },
          { label: '3XL (30px)', value: 'text-3xl' },
          { label: '4XL (36px)', value: 'text-4xl' },
          { label: '5XL (48px)', value: 'text-5xl' },
        ],
      },
      {
        name: 'align',
        label: 'Text Alignment',
        type: 'select',
        section: 'style',
        options: [
          { label: 'Left', value: 'text-left' },
          { label: 'Center', value: 'text-center' },
          { label: 'Right', value: 'text-right' },
        ],
      },
    ],
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
    controls: [
      { name: 'content', label: 'Text Content', type: 'textarea', section: 'content' },
      {
        name: 'fontSize',
        label: 'Font Size',
        type: 'select',
        section: 'style',
        options: [
          { label: 'Small (text-sm)', value: 'text-sm' },
          { label: 'Normal (text-base)', value: 'text-base' },
          { label: 'Large (text-lg)', value: 'text-lg' },
        ],
      },
      {
        name: 'align',
        label: 'Alignment',
        type: 'select',
        section: 'style',
        options: [
          { label: 'Left', value: 'text-left' },
          { label: 'Center', value: 'text-center' },
          { label: 'Right', value: 'text-right' },
        ],
      },
    ],
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
    controls: [
      { name: 'htmlContent', label: 'HTML Body', type: 'textarea', section: 'content' },
    ],
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
    controls: [
      { name: 'src', label: 'Image URL', type: 'text', section: 'content' },
      { name: 'alt', label: 'Alt Description', type: 'text', section: 'content' },
      {
        name: 'borderRadius',
        label: 'Corner Radius',
        type: 'select',
        section: 'style',
        options: [
          { label: 'None', value: 'rounded-none' },
          { label: 'Medium', value: 'rounded-lg' },
          { label: 'Large (rounded-xl)', value: 'rounded-xl' },
          { label: 'Full (Circular)', value: 'rounded-full' },
        ],
      },
    ],
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
    controls: [
      { name: 'url', label: 'Video URL (YouTube/MP4)', type: 'text', section: 'content' },
      { name: 'controls', label: 'Show Player Controls', type: 'checkbox', section: 'content' },
    ],
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
    controls: [
      { name: 'iconName', label: 'Lucide Icon Name', type: 'text', section: 'content' },
      { name: 'size', label: 'Size (px)', type: 'number', section: 'style' },
    ],
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
    controls: [
      { name: 'text', label: 'Link Text', type: 'text', section: 'content' },
      { name: 'href', label: 'Destination URL', type: 'text', section: 'content' },
    ],
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
    controls: [
      { name: 'text', label: 'Badge Label', type: 'text', section: 'content' },
    ],
  },

  // ---------------------------------------------------------------------------
  // COMMERCE
  // ---------------------------------------------------------------------------
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
    controls: [
      { name: 'title', label: 'Product Title', type: 'text', section: 'content' },
      { name: 'price', label: 'Price Text', type: 'text', section: 'content' },
      { name: 'image', label: 'Image URL', type: 'text', section: 'content' },
      { name: 'ctaText', label: 'Button Text', type: 'text', section: 'content' },
      { name: 'showPrice', label: 'Show Price Tag', type: 'checkbox', section: 'content' },
    ],
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
    controls: [
      {
        name: 'dataSource',
        label: 'Product Source',
        type: 'select',
        section: 'content',
        options: [
          { label: 'All Catalog Products', value: 'catalog_all' },
          { label: 'Featured Products', value: 'catalog_featured' },
          { label: 'Recent Releases', value: 'catalog_recent' },
        ],
      },
      { name: 'limit', label: 'Max Products', type: 'number', section: 'content' },
      { name: 'showPrice', label: 'Show Prices', type: 'checkbox', section: 'content' },
      { name: 'showAddToCart', label: 'Show Add to Cart CTA', type: 'checkbox', section: 'content' },
    ],
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
    controls: [
      { name: 'src', label: 'Image URL', type: 'text', section: 'content' },
      { name: 'badge', label: 'Overlay Badge', type: 'text', section: 'content' },
    ],
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
    controls: [
      { name: 'amount', label: 'Price Amount', type: 'text', section: 'content' },
      { name: 'currencySymbol', label: 'Symbol (e.g. ₹ / $)', type: 'text', section: 'content' },
      { name: 'comparePrice', label: 'Original Price (Strikethrough)', type: 'text', section: 'content' },
    ],
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
    controls: [
      { name: 'buttonText', label: 'Button Label', type: 'text', section: 'content' },
      { name: 'fullWidth', label: 'Full Width', type: 'checkbox', section: 'layout' },
    ],
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
    controls: [
      { name: 'showItemCount', label: 'Show Cart Counter', type: 'checkbox', section: 'content' },
    ],
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
    controls: [
      { name: 'checkoutButtonText', label: 'CTA Button Label', type: 'text', section: 'content' },
    ],
  },

  // ---------------------------------------------------------------------------
  // FORMS
  // ---------------------------------------------------------------------------
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
    controls: [
      { name: 'formId', label: 'Form ID Identifier', type: 'text', section: 'content' },
      { name: 'boundFunction', label: 'Bound Fera Function', type: 'text', section: 'actions' },
      { name: 'successMessage', label: 'Success Alert Message', type: 'text', section: 'content' },
    ],
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
    controls: [
      { name: 'label', label: 'Field Label', type: 'text', section: 'content' },
      { name: 'placeholder', label: 'Placeholder Text', type: 'text', section: 'content' },
      { name: 'required', label: 'Required Field', type: 'checkbox', section: 'content' },
    ],
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
    controls: [
      { name: 'label', label: 'Field Label', type: 'text', section: 'content' },
      { name: 'rows', label: 'Visible Rows', type: 'number', section: 'layout' },
      { name: 'required', label: 'Required Field', type: 'checkbox', section: 'content' },
    ],
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
    controls: [
      { name: 'label', label: 'Field Label', type: 'text', section: 'content' },
    ],
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
    controls: [
      { name: 'label', label: 'Checkbox Label', type: 'text', section: 'content' },
      { name: 'checked', label: 'Default Checked', type: 'checkbox', section: 'content' },
    ],
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
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      iconName: 'ArrowRight',
    },
    controls: [
      { name: 'text', label: 'Button Text', type: 'text', section: 'content' },
      {
        name: 'action',
        label: 'Action Type',
        type: 'select',
        section: 'actions',
        options: [
          { label: 'Navigate Internal Route', value: 'navigate' },
          { label: 'Open External URL', value: 'external_url' },
          { label: 'Submit Form', value: 'submit' },
          { label: 'Call Fera Function', value: 'call_function' },
          { label: 'Add to Cart', value: 'add_to_cart' },
          { label: 'Open Modal', value: 'open_modal' },
        ],
      },
      { name: 'target', label: 'Target (URL / Path / Function Name)', type: 'text', section: 'actions' },
      {
        name: 'variant',
        label: 'Button Style Variant',
        type: 'select',
        section: 'style',
        options: [
          { label: 'Primary (Dark/Solid)', value: 'primary' },
          { label: 'Secondary (Subtle Gray)', value: 'secondary' },
          { label: 'Outline', value: 'outline' },
          { label: 'Ghost', value: 'ghost' },
          { label: 'Rose Accent', value: 'rose' },
        ],
      },
      { name: 'fullWidth', label: 'Full Width', type: 'checkbox', section: 'layout' },
    ],
  },

  // ---------------------------------------------------------------------------
  // INTERACTION
  // ---------------------------------------------------------------------------
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
    controls: [
      { name: 'modalId', label: 'Modal Identifier', type: 'text', section: 'content' },
      { name: 'title', label: 'Modal Title', type: 'text', section: 'content' },
    ],
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
    controls: [],
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
      ],
    },
    controls: [],
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
    controls: [
      { name: 'totalPages', label: 'Total Pages', type: 'number', section: 'content' },
    ],
  },

  // ---------------------------------------------------------------------------
  // BUSINESS
  // ---------------------------------------------------------------------------
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
    controls: [],
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
    controls: [],
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
    controls: [
      { name: 'locationName', label: 'Location Name', type: 'text', section: 'content' },
      { name: 'address', label: 'Street Address', type: 'text', section: 'content' },
    ],
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
    controls: [
      { name: 'heading', label: 'Section Title', type: 'text', section: 'content' },
    ],
  },

  // ---------------------------------------------------------------------------
  // SPECIAL CUSTOM CODE
  // ---------------------------------------------------------------------------
  custom_code: {
    type: 'custom_code',
    version: 1,
    label: 'Custom Code Block',
    category: 'content',
    icon: 'Code',
    canHaveChildren: false,
    defaultProps: {
      language: 'jsx',
      code: '// Preserved custom code',
      isIsolatedSandbox: true,
    },
    controls: [
      { name: 'code', label: 'Custom Code (Preserved Verbatim)', type: 'textarea', section: 'content' },
    ],
  },
};

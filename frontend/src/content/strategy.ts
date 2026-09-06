export interface TransformationStep {
  id: string;
  title: string;
  description: string;
}

export const TRANSFORMATION_STEPS: TransformationStep[] = [
  {
    id: 'shop',
    title: 'Your shop today',
    description: 'Products, prices, customers, and WhatsApp conversations already exist.',
  },
  {
    id: 'ferasetu',
    title: 'FeraSetu setup',
    description: 'Turn that information into a storefront, catalog, and shared workspace.',
  },
  {
    id: 'online-business',
    title: 'Your online business',
    description: 'Share your store, receive orders, and ask FeraSetu AI what to do next.',
  },
];

export const BEFORE_AFTER = {
  before: {
    title: 'Before FeraSetu',
    subtitle: 'Offline and fragmented',
    items: [
      'Product details scattered across notes and chats',
      'Orders tracked manually across WhatsApp threads',
      'Pricing and inventory kept in spreadsheets or memory',
      'Business insight limited to gut feel',
    ],
  },
  after: {
    title: 'After FeraSetu',
    subtitle: 'One guided workflow',
    items: [
      'Your products become a browsable online catalog',
      'Orders arrive in one dashboard with clear status',
      'Inventory and revenue live beside your storefront',
      'FeraSetu AI explains what to restock, improve, or do next',
    ],
  },
};

export interface ValueCurveFactor {
  factor: string;
  traditional: string;
  ferasetu: string;
}

export const VALUE_CURVE_FACTORS: ValueCurveFactor[] = [
  { factor: 'Setup complexity', traditional: 'High', ferasetu: 'Guided' },
  { factor: 'Learning curve', traditional: 'Steep', ferasetu: 'Phone-first' },
  { factor: 'Tool fragmentation', traditional: 'Multiple tools', ferasetu: 'One workspace' },
  { factor: 'AI help', traditional: 'Generic or absent', ferasetu: 'Shop context' },
  { factor: 'Local relevance', traditional: 'Global-first', ferasetu: 'Indian merchants' },
  { factor: 'Business guidance', traditional: 'Low', ferasetu: 'Next best action' },
];

export interface FourAction {
  action: 'Eliminate' | 'Reduce' | 'Raise' | 'Create';
  description: string;
}

export const FOUR_ACTIONS: FourAction[] = [
  {
    action: 'Eliminate',
    description: 'Remove hosting setup, plugin decisions, and technical configuration from getting started.',
  },
  {
    action: 'Reduce',
    description: 'Shorten time to first product, lower learning curve, and reduce manual order tracking.',
  },
  {
    action: 'Raise',
    description: 'Improve guidance, local relevance, clarity, AI assistance, and business understanding.',
  },
  {
    action: 'Create',
    description: 'Combine storefront, catalog, orders, analytics, and AI guidance in one workflow.',
  },
];

export interface PricingStage {
  planId: 'free' | 'business' | 'pro';
  stage: string;
  promise: string;
  proof: string[];
}

export const PRICING_STAGES: PricingStage[] = [
  {
    planId: 'free',
    stage: 'Start',
    promise: 'Establish your online presence',
    proof: [
      'Your own store link',
      'Up to 25 products',
      'WhatsApp ordering',
      '20 FeraSetu AI queries per month',
    ],
  },
  {
    planId: 'business',
    stage: 'Grow',
    promise: 'Run a larger catalog with clearer business signals',
    proof: [
      'Up to 500 products',
      'Advanced analytics and profit tracking',
      'Automated low-stock alerts',
      '200 FeraSetu AI queries per month',
      'Custom domain',
    ],
  },
  {
    planId: 'pro',
    stage: 'Scale',
    promise: 'Operate with more capacity and support',
    proof: [
      'Unlimited products',
      '1,000 FeraSetu AI queries and forecasting',
      'Up to 5 staff accounts',
      'Priority phone and chat support',
      'White-label storefront',
    ],
  },
];

export interface AIWorkflow {
  title: string;
  prompt: string;
  outcome: string;
}

export const AI_WORKFLOWS: AIWorkflow[] = [
  {
    title: 'Add product information',
    prompt: 'Help me add this product.',
    outcome: 'FeraSetu AI drafts clear details you review before saving.',
  },
  {
    title: 'Improve your store',
    prompt: 'How can I improve my store?',
    outcome: 'It uses your catalog and orders to suggest practical next steps.',
  },
  {
    title: 'Plan today',
    prompt: 'Show me what I should do next.',
    outcome: 'It prioritizes restocking, pending orders, and simple growth actions.',
  },
];

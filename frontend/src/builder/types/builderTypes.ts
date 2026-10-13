/**
 * FeraSetu Unified Visual Builder — Core Type Definitions
 * Version: 2.0 (schemaVersion: 2)
 *
 * Provides authoritative typing for the unified visual builder:
 * - Component Registry & Node Tree
 * - Responsive Breakpoints & Design Tokens
 * - Declarative Workflows (Triggers, Actions, Branches, Errors)
 * - External Connectors (Firebase, REST)
 * - Drafts, Versions, and Immutable Publishing Snapshots
 */

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export type ComponentCategory =
  | 'primitives'
  | 'typography'
  | 'layout'
  | 'forms'
  | 'commerce'
  | 'blocks'
  | 'media'
  | 'icons';

export type PropControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'color'
  | 'select'
  | 'iconPicker'
  | 'mediaPicker'
  | 'spacing'
  | 'alignment'
  | 'workflowBinding';

export interface PropSchemaItem {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  control: PropControl;
  label: string;
  description?: string;
  defaultValue: any;
  options?: Array<{ label: string; value: string | number }>;
  min?: number;
  max?: number;
  step?: number;
  responsive?: boolean;
  category?: 'content' | 'style' | 'layout' | 'interaction';
}

export type PropSchema = Record<string, PropSchemaItem>;

export interface ComponentVariant {
  id: string;
  label: string;
  description?: string;
  props: Record<string, any>;
}

export interface AccessibilityConfig {
  defaultTag: string;
  allowedTags?: string[];
  role?: string;
  ariaLabelProp?: string;
  supportsAlt?: boolean;
}

export interface ComponentDefinition {
  id: string;
  version: number;
  name: string;
  category: ComponentCategory;
  description: string;
  iconName: string;
  tags: string[];
  defaultProps: Record<string, any>;
  propSchema: PropSchema;
  variants: ComponentVariant[];
  slots?: string[];
  supportsChildren?: boolean;
  responsiveProps?: string[];
  a11y: AccessibilityConfig;
}

export interface ComponentNode {
  id: string;
  type: string;
  name: string;
  props: Record<string, any>;
  responsiveOverrides?: Partial<Record<Breakpoint, Record<string, any>>>;
  children?: ComponentNode[];
  slot?: string;
  workflowBindings?: Record<string, string>; // eventName -> workflowId
  hidden?: boolean;
  locked?: boolean;
}

export interface BuilderPage {
  id: string;
  slug: string;
  name: string;
  seoTitle?: string;
  seoDescription?: string;
  isHomepage?: boolean;
  requiresAuth?: boolean;
  nodes: ComponentNode[];
}

// ---------------------------------------------------------------------------
// Declarative Workflows (Triggers, Actions, Conditions, Error Handlers)
// ---------------------------------------------------------------------------

export type WorkflowTriggerType =
  | 'onClick'
  | 'onSubmit'
  | 'onMount'
  | 'onChange'
  | 'onAuthSuccess'
  | 'onAuthError';

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  nodeId?: string;
  description?: string;
}

export type WorkflowActionType =
  | 'navigate'
  | 'validateForm'
  | 'firebaseAuth'
  | 'restRequest'
  | 'showToast'
  | 'setVariable'
  | 'conditionalBranch'
  | 'resetForm';

export interface WorkflowStep {
  id: string;
  type: WorkflowActionType;
  label: string;
  config: Record<string, any>;
  onSuccess?: string[]; // step IDs to execute next
  onFailure?: string[]; // step IDs to execute on error
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  startStepId: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// External Integrations (Firebase & Generic REST)
// ---------------------------------------------------------------------------

export type ConnectionType = 'firebase_auth' | 'rest_api';

export interface FirebaseAuthClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export interface RestConnectorConfig {
  id: string;
  name: string;
  baseUrl: string;
  authType: 'none' | 'bearer' | 'apiKeyHeader' | 'basic';
  // Secret tokens are stored server-side only; never returned in client draft JSON
  hasServerSecret?: boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface ConnectionSettings {
  firebaseAuth?: {
    enabled: boolean;
    clientConfig: FirebaseAuthClientConfig;
    requireEmailVerification?: boolean;
  };
  restConnectors?: RestConnectorConfig[];
}

// ---------------------------------------------------------------------------
// Unified Project Draft & Published Snapshots
// ---------------------------------------------------------------------------

export interface BuilderDraftData {
  schemaVersion: number;
  pages: BuilderPage[];
  activePageId: string;
  workflows: WorkflowDefinition[];
  connections: ConnectionSettings;
  theme: {
    id: string;
    overrides: Record<string, any>;
  };
  customAssets?: Array<{
    id: string;
    url: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
    isDraftOnly: boolean;
    uploadedAt: string;
  }>;
}

export interface PublishedVersionSummary {
  versionNumber: number;
  publishedAt: string;
  publishedBy?: string;
  description?: string;
  pagesCount: number;
  workflowsCount: number;
}

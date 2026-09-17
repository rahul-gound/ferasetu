// FeraSetu Pro Studio — Page Editor Core Types (schemaVersion: 1)
// =============================================================================
// Type definitions for the visual page editor, smart components,
// undo/redo history operations, and single-page code sync states.
// =============================================================================

export const SCHEMA_VERSION = 1;

export type PageState = 'VISUAL_NATIVE' | 'HYBRID' | 'CODE_NATIVE';

export type ViewportBreakpoint = 'desktop' | 'tablet' | 'mobile';

export type ActiveEditorTab = 'visual' | 'code';

export interface PageComponentNode {
  id: string;
  type: string;
  version: number;
  props: Record<string, any>;
  children?: PageComponentNode[];
  responsive?: {
    desktop?: Record<string, any>;
    tablet?: Record<string, any>;
    mobile?: Record<string, any>;
  };
  customCode?: string;
}

export interface PageDocument {
  schemaVersion: number;
  state: PageState;
  title: string;
  customCss: string;
  sourceCode: string;
  nodes: PageComponentNode[];
}

export interface ComponentDefinition {
  type: string;
  version: number;
  label: string;
  category: 'layout' | 'content' | 'commerce' | 'forms' | 'interaction' | 'business';
  icon: string;
  canHaveChildren: boolean;
  allowedChildren?: string[] | null;
  forbiddenParents?: string[];
  defaultProps: Record<string, any>;
  responsiveCapabilities?: string[];
}

export type EditorActionType =
  | 'ADD_NODE'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'DUPLICATE_NODE'
  | 'UPDATE_PROP'
  | 'UPDATE_RESPONSIVE_PROP'
  | 'SET_DOCUMENT';

export interface EditorHistoryEntry {
  document: PageDocument;
  actionDescription: string;
  timestamp: number;
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export type InsertionPosition = 'before' | 'after' | 'inside';

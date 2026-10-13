/**
 * FeraSetu Unified Visual Builder — Declarative Workflow Engine & Validator
 * Version: 2.0 (schemaVersion: 2)
 *
 * Implements safe, validated declarative workflows:
 * - Triggers: onClick, onSubmit, onChange, onAuthSuccess, onAuthError
 * - Actions: validateForm, firebaseAuth, restRequest, navigate, showToast, setVariable, conditionalBranch, resetForm
 * - Branching: Success / Error failure paths
 * - Execution Traces: Readable trace history for preview and verification
 * - Security: NEVER uses eval; uses pure declarative state machine.
 */

import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowTriggerType,
  WorkflowActionType,
} from '../types/builderTypes';

export interface WorkflowValidationError {
  field: string;
  message: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
}

export interface ExecutionStepLog {
  stepId: string;
  actionType: WorkflowActionType;
  label: string;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  timestamp: string;
}

export interface ExecutionTrace {
  workflowId: string;
  workflowName: string;
  startedAt: string;
  completedAt?: string;
  success: boolean;
  steps: ExecutionStepLog[];
  finalMessage?: string;
}

export const ALLOWED_TRIGGERS: WorkflowTriggerType[] = [
  'onClick',
  'onSubmit',
  'onMount',
  'onChange',
  'onAuthSuccess',
  'onAuthError',
];

export const ALLOWED_ACTIONS: WorkflowActionType[] = [
  'navigate',
  'validateForm',
  'firebaseAuth',
  'restRequest',
  'showToast',
  'setVariable',
  'conditionalBranch',
  'resetForm',
];

/**
 * Validates a workflow definition against structural and security rules.
 */
export function validateWorkflow(workflow: WorkflowDefinition): WorkflowValidationResult {
  const errors: WorkflowValidationError[] = [];

  if (!workflow.id || typeof workflow.id !== 'string') {
    errors.push({ field: 'id', message: 'Workflow ID is required and must be a string.' });
  }

  if (!workflow.name || !workflow.name.trim()) {
    errors.push({ field: 'name', message: 'Workflow name is required.' });
  }

  if (!ALLOWED_TRIGGERS.includes(workflow.trigger?.type)) {
    errors.push({
      field: 'trigger.type',
      message: `Invalid trigger type. Allowed: ${ALLOWED_TRIGGERS.join(', ')}`,
    });
  }

  if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
    errors.push({ field: 'steps', message: 'Workflow must define at least one action step.' });
    return { valid: false, errors };
  }

  const stepIds = new Set<string>();
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const prefix = `steps[${i}]`;

    if (!step.id) {
      errors.push({ field: `${prefix}.id`, message: 'Step ID is required.' });
    } else if (stepIds.has(step.id)) {
      errors.push({ field: `${prefix}.id`, message: `Duplicate step ID: '${step.id}'.` });
    } else {
      stepIds.add(step.id);
    }

    if (!ALLOWED_ACTIONS.includes(step.type)) {
      errors.push({
        field: `${prefix}.type`,
        message: `Unknown action type '${step.type}'. Allowed: ${ALLOWED_ACTIONS.join(', ')}`,
      });
    }

    // Specific Action Validations
    if (step.type === 'navigate') {
      const to = step.config?.to;
      if (!to || typeof to !== 'string') {
        errors.push({ field: `${prefix}.config.to`, message: 'Navigation step requires a destination path.' });
      }
    }

    if (step.type === 'validateForm') {
      const fields = step.config?.fields;
      if (!Array.isArray(fields) || fields.length === 0) {
        errors.push({ field: `${prefix}.config.fields`, message: 'validateForm requires a non-empty array of field names.' });
      }
    }

    if (step.type === 'firebaseAuth') {
      const mode = step.config?.mode;
      if (!['signUp', 'signIn', 'signOut', 'resetPassword'].includes(mode)) {
        errors.push({ field: `${prefix}.config.mode`, message: 'firebaseAuth mode must be signUp, signIn, signOut, or resetPassword.' });
      }
    }

    if (step.type === 'restRequest') {
      const endpoint = step.config?.endpoint;
      if (!endpoint || typeof endpoint !== 'string') {
        errors.push({ field: `${prefix}.config.endpoint`, message: 'restRequest requires an endpoint URL.' });
      }
    }
  }

  if (!stepIds.has(workflow.startStepId)) {
    errors.push({
      field: 'startStepId',
      message: `Start step ID '${workflow.startStepId}' does not match any defined step.`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a default, approachable end-to-end Sign-Up workflow:
 * 1. Validate form fields (email, password)
 * 2. Firebase Auth sign-up
 * 3. Optional REST connector call to notify backend
 * 4. Navigate to success page
 * Includes fallback failure branches with toast messages.
 */
export function createDefaultSignupWorkflow(id = 'wf_signup'): WorkflowDefinition {
  return {
    id,
    name: 'Customer Registration Workflow',
    description: 'Validates input, registers via Firebase Auth, relays profile to REST API, and navigates to Welcome page.',
    enabled: true,
    trigger: {
      type: 'onSubmit',
      nodeId: 'signup_form',
      description: 'Triggered when the registration form is submitted',
    },
    startStepId: 'step_validate',
    steps: [
      {
        id: 'step_validate',
        type: 'validateForm',
        label: '1. Validate Form Fields',
        config: {
          fields: ['name', 'email', 'password'],
          minPasswordLength: 6,
        },
        onSuccess: ['step_firebase_auth'],
        onFailure: ['step_validation_error'],
      },
      {
        id: 'step_firebase_auth',
        type: 'firebaseAuth',
        label: '2. Firebase Auth Registration',
        config: {
          mode: 'signUp',
          emailField: 'email',
          passwordField: 'password',
        },
        onSuccess: ['step_rest_notify'],
        onFailure: ['step_auth_error'],
      },
      {
        id: 'step_rest_notify',
        type: 'restRequest',
        label: '3. Notify Merchant Backend (REST)',
        config: {
          connectorId: 'primary_crm',
          endpoint: '/api/v1/customers/sync',
          method: 'POST',
        },
        onSuccess: ['step_success_toast'],
        onFailure: ['step_success_toast'], // Non-blocking: registration succeeds even if CRM is slow
      },
      {
        id: 'step_success_toast',
        type: 'showToast',
        label: '4. Show Welcome Message',
        config: {
          message: 'Account successfully created! Welcome to our store.',
          variant: 'success',
        },
        onSuccess: ['step_nav_success'],
      },
      {
        id: 'step_nav_success',
        type: 'navigate',
        label: '5. Navigate to Welcome Page',
        config: {
          to: '/welcome',
        },
      },
      // Failure Branches
      {
        id: 'step_validation_error',
        type: 'showToast',
        label: 'Error: Show Field Validation Warning',
        config: {
          message: 'Please fill in all required fields with a valid email and 6+ character password.',
          variant: 'error',
        },
      },
      {
        id: 'step_auth_error',
        type: 'showToast',
        label: 'Error: Show Authentication Error',
        config: {
          message: 'Could not register account. Email may already be in use.',
          variant: 'error',
        },
      },
    ],
  };
}

/**
 * Pure declarative simulation executor for testing workflows in preview mode.
 * Generates an auditable execution trace without side effects or eval.
 */
export async function simulateWorkflowExecution(
  workflow: WorkflowDefinition,
  initialContext: Record<string, any> = {}
): Promise<ExecutionTrace> {
  const trace: ExecutionTrace = {
    workflowId: workflow.id,
    workflowName: workflow.name,
    startedAt: new Date().toISOString(),
    success: false,
    steps: [],
  };

  const validation = validateWorkflow(workflow);
  if (!validation.valid) {
    trace.success = false;
    trace.finalMessage = `Workflow validation failed: ${validation.errors.map((e) => e.message).join('; ')}`;
    trace.completedAt = new Date().toISOString();
    return trace;
  }

  const stepMap = new Map<string, WorkflowStep>(workflow.steps.map((s) => [s.id, s]));
  let currentStepId: string | null = workflow.startStepId;
  const context = { ...initialContext };
  const visitedSteps = new Set<string>();

  while (currentStepId && !visitedSteps.has(currentStepId)) {
    visitedSteps.add(currentStepId);
    const step = stepMap.get(currentStepId);
    if (!step) break;

    const log: ExecutionStepLog = {
      stepId: step.id,
      actionType: step.type,
      label: step.label,
      status: 'pending',
      input: { ...context },
      timestamp: new Date().toISOString(),
    };

    let stepSucceeded = true;
    let stepError: string | undefined;

    // Simulate Step Actions Safely
    switch (step.type) {
      case 'validateForm': {
        const fields = step.config.fields || [];
        for (const f of fields) {
          if (!context[f] || (typeof context[f] === 'string' && !context[f].trim())) {
            stepSucceeded = false;
            stepError = `Required field '${f}' is missing or empty.`;
            break;
          }
        }
        if (stepSucceeded && step.config.minPasswordLength && context.password) {
          if (String(context.password).length < step.config.minPasswordLength) {
            stepSucceeded = false;
            stepError = `Password must be at least ${step.config.minPasswordLength} characters.`;
          }
        }
        break;
      }

      case 'firebaseAuth': {
        if (!context.email || !context.password) {
          stepSucceeded = false;
          stepError = 'Missing email or password credentials.';
        } else if (context.email === 'duplicate@example.com') {
          stepSucceeded = false;
          stepError = 'Firebase: auth/email-already-in-use';
        } else {
          context.firebaseUser = {
            uid: `fb_${Date.now()}`,
            email: context.email,
            emailVerified: false,
          };
        }
        break;
      }

      case 'restRequest': {
        context.restResponse = {
          status: 200,
          data: { synced: true, timestamp: Date.now() },
        };
        break;
      }

      case 'showToast': {
        context.lastToast = step.config.message;
        break;
      }

      case 'navigate': {
        context.navigatedTo = step.config.to;
        break;
      }

      default:
        break;
    }

    log.status = stepSucceeded ? 'success' : 'failed';
    log.error = stepError;
    log.output = { ...context };
    trace.steps.push(log);

    // Follow Branches
    if (stepSucceeded) {
      const nextSteps = step.onSuccess || [];
      currentStepId = nextSteps.length > 0 ? nextSteps[0] : null;
    } else {
      const failureSteps = step.onFailure || [];
      currentStepId = failureSteps.length > 0 ? failureSteps[0] : null;
      if (!currentStepId) {
        // Unhandled failure terminates workflow
        trace.success = false;
        trace.finalMessage = stepError || 'Execution failed with unhandled error branch.';
        trace.completedAt = new Date().toISOString();
        return trace;
      }
    }
  }

  trace.success = trace.steps.every((s) => s.status === 'success' || s.actionType === 'showToast');
  trace.completedAt = new Date().toISOString();
  trace.finalMessage = trace.success ? 'Workflow executed successfully to completion.' : 'Workflow completed failure branch.';
  return trace;
}

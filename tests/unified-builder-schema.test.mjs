import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateWorkflow,
  createDefaultSignupWorkflow,
  simulateWorkflowExecution,
} from '../frontend/src/builder/workflows/workflowSchema.ts';
import {
  COMPONENT_DEFINITIONS,
  getComponentDefinition,
  getComponentsByCategory,
} from '../frontend/src/builder/registry/componentRegistry.ts';
import { searchIcons, ICONS_CATALOG } from '../frontend/src/builder/registry/iconsCatalog.ts';

console.log('\n=============================================================================');
console.log('  RUNNING FERASETU UNIFIED BUILDER SCHEMA & WORKFLOW TEST SUITE');
console.log('=============================================================================\n');

test('1. Component Registry integrity and stability', () => {
  assert.ok(COMPONENT_DEFINITIONS.length >= 10, 'Must provide core suite of components');

  for (const def of COMPONENT_DEFINITIONS) {
    assert.ok(def.id && typeof def.id === 'string', 'Component must have stable string ID');
    assert.equal(typeof def.version, 'number', `${def.id} must declare version number`);
    assert.ok(def.name, `${def.id} must declare human-readable name`);
    assert.ok(def.category, `${def.id} must declare category`);
    assert.ok(def.a11y?.defaultTag, `${def.id} must declare default a11y tag`);
    assert.ok(def.propSchema, `${def.id} must have propSchema`);
    assert.ok(Array.isArray(def.variants), `${def.id} must declare variants array`);
  }

  const btn = getComponentDefinition('primitive.button');
  assert.ok(btn, 'primitive.button must be registered');
  assert.equal(btn.a11y.defaultTag, 'button');

  const forms = getComponentsByCategory('forms');
  assert.ok(forms.some((c) => c.id === 'form.input'), 'Must contain form input component');
});

test('2. Icon Catalog provides 60+ curated, searchable icons', () => {
  assert.ok(ICONS_CATALOG.length >= 60, 'Must have at least 60 icons in curated catalog');

  const commerceIcons = searchIcons('cart');
  assert.ok(commerceIcons.some((i) => i.name === 'ShoppingCart'));

  const lockIcons = searchIcons('password');
  assert.ok(lockIcons.some((i) => i.name === 'Lock'));

  const emptySearch = searchIcons('');
  assert.ok(emptySearch.length > 0, 'Empty search returns default icons');
});

test('3. Workflow Validator accepts valid end-to-end signup workflow', () => {
  const workflow = createDefaultSignupWorkflow();
  const res = validateWorkflow(workflow);
  assert.equal(res.valid, true, 'Default signup workflow must be valid');
  assert.equal(res.errors.length, 0);
});

test('4. Workflow Validator rejects malformed workflows fail-closed', () => {
  // Empty steps
  const emptyRes = validateWorkflow({
    id: 'wf_bad',
    name: 'Bad Workflow',
    enabled: true,
    trigger: { type: 'onClick' },
    startStepId: '',
    steps: [],
  });
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors.some((e) => e.field === 'steps'));

  // Invalid trigger
  const badTriggerRes = validateWorkflow({
    id: 'wf_bad_trig',
    name: 'Bad Trigger',
    enabled: true,
    trigger: { type: 'onExplode' },
    startStepId: 'step_1',
    steps: [{ id: 'step_1', type: 'navigate', label: 'Go', config: { to: '/' } }],
  });
  assert.equal(badTriggerRes.valid, false);
  assert.ok(badTriggerRes.errors.some((e) => e.field === 'trigger.type'));

  // Non-existent start step
  const badStartRes = validateWorkflow({
    id: 'wf_bad_start',
    name: 'Bad Start Step',
    enabled: true,
    trigger: { type: 'onClick' },
    startStepId: 'missing_step',
    steps: [{ id: 'step_1', type: 'navigate', label: 'Go', config: { to: '/' } }],
  });
  assert.equal(badStartRes.valid, false);
  assert.ok(badStartRes.errors.some((e) => e.field === 'startStepId'));
});

test('5. Simulation: End-to-end successful signup flow execution', async () => {
  const workflow = createDefaultSignupWorkflow();
  const validUserContext = {
    name: 'Priya Sharma',
    email: 'priya@example.com',
    password: 'supersecretpass',
  };

  const trace = await simulateWorkflowExecution(workflow, validUserContext);

  assert.equal(trace.success, true);
  assert.equal(trace.steps.length, 5); // Validate -> Auth -> REST -> Toast -> Navigate

  const validateStep = trace.steps.find((s) => s.stepId === 'step_validate');
  assert.equal(validateStep?.status, 'success');

  const authStep = trace.steps.find((s) => s.stepId === 'step_firebase_auth');
  assert.equal(authStep?.status, 'success');
  assert.ok(authStep?.output?.firebaseUser?.uid);

  const restStep = trace.steps.find((s) => s.stepId === 'step_rest_notify');
  assert.equal(restStep?.status, 'success');
  assert.equal(restStep?.output?.restResponse?.status, 200);

  const navStep = trace.steps.find((s) => s.stepId === 'step_nav_success');
  assert.equal(navStep?.status, 'success');
  assert.equal(navStep?.output?.navigatedTo, '/welcome');
});

test('6. Simulation: Field validation failure routes to error branch', async () => {
  const workflow = createDefaultSignupWorkflow();
  const invalidUserContext = {
    name: 'Incomplete User',
    email: '',
    password: '123', // Under 6 characters
  };

  const trace = await simulateWorkflowExecution(workflow, invalidUserContext);

  const validateStep = trace.steps[0];
  assert.equal(validateStep.status, 'failed');
  assert.ok(validateStep.error?.includes('email'));

  const errorToastStep = trace.steps[1];
  assert.equal(errorToastStep.stepId, 'step_validation_error');
  assert.equal(errorToastStep.output?.lastToast, 'Please fill in all required fields with a valid email and 6+ character password.');
});

test('7. Simulation: Auth duplicate failure routes to auth_error branch', async () => {
  const workflow = createDefaultSignupWorkflow();
  const duplicateUserContext = {
    name: 'Existing User',
    email: 'duplicate@example.com',
    password: 'securepassword123',
  };

  const trace = await simulateWorkflowExecution(workflow, duplicateUserContext);

  const authStep = trace.steps.find((s) => s.stepId === 'step_firebase_auth');
  assert.equal(authStep?.status, 'failed');
  assert.ok(authStep?.error?.includes('email-already-in-use'));

  const authErrorToastStep = trace.steps[trace.steps.length - 1];
  assert.equal(authErrorToastStep.stepId, 'step_auth_error');
  assert.equal(authErrorToastStep.output?.lastToast, 'Could not register account. Email may already be in use.');
});

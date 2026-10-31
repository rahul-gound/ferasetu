import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Globe,
  Sliders,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import type { WorkflowDefinition, ExecutionTrace, WorkflowStep } from '../types/builderTypes';
import {
  createDefaultSignupWorkflow,
  simulateWorkflowExecution,
  validateWorkflow,
} from '../workflows/workflowSchema';

interface LogicPanelProps {
  workflows: WorkflowDefinition[];
  onUpdateWorkflows: (workflows: WorkflowDefinition[]) => void;
}

export default function LogicPanel({ workflows, onUpdateWorkflows }: LogicPanelProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(
    workflows.length > 0 ? workflows[0].id : 'wf_signup_default'
  );

  // Simulation test context
  const [simName, setSimName] = useState('Priya Sharma');
  const [simEmail, setSimEmail] = useState('priya@example.com');
  const [simPassword, setSimPassword] = useState('pass1234');
  const [isSimulating, setIsSimulating] = useState(false);
  const [trace, setTrace] = useState<ExecutionTrace | null>(null);

  // If no workflows exist, provide default signup workflow
  const activeWorkflows =
    workflows.length > 0 ? workflows : [createDefaultSignupWorkflow()];

  const currentWorkflow =
    activeWorkflows.find((w) => w.id === selectedWorkflowId) || activeWorkflows[0];

  const validationResult = currentWorkflow ? validateWorkflow(currentWorkflow) : { valid: true, errors: [] };

  const handleRunSimulation = async () => {
    if (!currentWorkflow) return;
    setIsSimulating(true);
    setTrace(null);

    // Simulate async execution step
    await new Promise((r) => setTimeout(r, 200));

    const testContext = {
      name: simName,
      email: simEmail,
      password: simPassword,
    };

    const result = await simulateWorkflowExecution(currentWorkflow, testContext);
    setTrace(result);
    setIsSimulating(false);
  };

  const handleCreateDefaultWorkflow = () => {
    const defaultWf = createDefaultSignupWorkflow();
    onUpdateWorkflows([...activeWorkflows.filter((w) => w.id !== defaultWf.id), defaultWf]);
    setSelectedWorkflowId(defaultWf.id);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Declarative Workflows & Logic
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure forms, authentication, external API calls, and branching
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateDefaultWorkflow}
          className="self-start sm:self-auto px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Sign-up Flow</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Workflow Selector */}
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
            Active Workflow
          </label>
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {activeWorkflows.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => {
                  setSelectedWorkflowId(wf.id);
                  setTrace(null);
                }}
                className={`px-3.5 py-2.5 rounded-2xl border text-xs font-medium text-left transition-all ${
                  currentWorkflow?.id === wf.id
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="font-bold">{wf.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Trigger: <code className="text-blue-500 font-semibold">{wf.trigger.type}</code> on {wf.trigger.nodeId}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workflow Graph Visualization */}
        {currentWorkflow && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Execution Step Graph ({currentWorkflow.steps.length} Steps)
              </h3>
              {validationResult.valid ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Valid Schema
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> {validationResult.errors.length} Issue(s)
                </span>
              )}
            </div>

            {/* Stepper Chain */}
            <div className="space-y-2.5">
              {currentWorkflow.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {step.label}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                      {step.type}
                    </span>
                  </div>

                  {/* Branch destinations */}
                  <div className="flex items-center gap-3 text-xs pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                    {step.onSuccess && step.onSuccess.length > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <ArrowRight className="w-3 h-3" /> Next: {step.onSuccess.join(', ')}
                      </span>
                    )}
                    {step.onFailure && step.onFailure.length > 0 && (
                      <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium">
                        <ArrowRight className="w-3 h-3" /> On Error: {step.onFailure.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* LIVE SIMULATION RUNNER */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Live Simulation & Trace Inspector
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Test branching, validation, and error paths in isolation without side effects
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="self-start sm:self-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isSimulating ? 'Simulating...' : 'Run Simulation'}</span>
                </button>
              </div>

              {/* Mock Context Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                    Sim Name
                  </label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                    Sim Email
                  </label>
                  <input
                    type="text"
                    value={simEmail}
                    onChange={(e) => setSimEmail(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                    Sim Password
                  </label>
                  <input
                    type="password"
                    value={simPassword}
                    onChange={(e) => setSimPassword(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Execution Trace Output */}
              {trace && (
                <div className="space-y-3 bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold flex items-center gap-1.5">
                      {trace.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>Simulation {trace.success ? 'Succeeded' : 'Finished with Errors'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">{trace.steps.length} Steps Traversed</span>
                  </div>

                  <p className="text-[11px] text-slate-300 italic">{trace.finalMessage}</p>

                  <div className="space-y-2 pt-1">
                    {trace.steps.map((st, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg border text-[11px] ${
                          st.status === 'success'
                            ? 'border-emerald-500/30 bg-emerald-950/20'
                            : 'border-rose-500/30 bg-rose-950/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">
                            {i + 1}. {st.label}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              st.status === 'success' ? 'bg-emerald-800 text-emerald-100' : 'bg-rose-800 text-rose-100'
                            }`}
                          >
                            {st.status}
                          </span>
                        </div>
                        {st.error && <div className="text-rose-400 mt-1 text-[10px]">Error: {st.error}</div>}
                        {st.output?.navigatedTo && (
                          <div className="text-emerald-400 mt-1 text-[10px]">
                            Navigation Target: {st.output.navigatedTo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  X, Check, ChevronRight, ChevronLeft, Globe, Server, GitBranch,
  Settings, ShieldAlert, Cpu, Layers, AlertCircle, Loader2, Sparkles
} from 'lucide-react';
import { platformSitesApi, type PlatformSite } from '../../services/platformSitesApi';
import toast from 'react-hot-toast';

interface PlatformSiteWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (site: PlatformSite) => void;
}

export default function PlatformSiteWizardModal({ isOpen, onClose, onSuccess }: PlatformSiteWizardModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State across 7 steps
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_identifier: '',
    subdomain: 'help',
    baseDomain: 'ferasetu.com',
    primary_hostname: 'help.ferasetu.com',
    hosting_target: 'workers' as 'workers' | 'pages',
    github_repo: 'ferasetu/help-center',
    github_branch: 'main',
    build_command: 'npm run build',
    output_dir: 'dist',
    auto_deploy: true,
    environment_variables: 'NODE_ENV=production\nAPI_CLUSTER=https://api.ferasetu.com',
    allocated_cpu_ms: '50',
    allocated_req_day: '100000',
  });

  const updateSubdomain = (sub: string) => {
    const cleanSub = sub.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({
      ...prev,
      subdomain: cleanSub,
      primary_hostname: `${cleanSub}.${prev.baseDomain}`,
    }));
  };

  const stepsList = [
    { num: 1, title: 'Basic Info' },
    { num: 2, title: 'Domain' },
    { num: 3, title: 'Hosting' },
    { num: 4, title: 'Source' },
    { num: 5, title: 'Environment' },
    { num: 6, title: 'Quotas' },
    { num: 7, title: 'Review & Deploy' },
  ];

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!formData.name.trim() || !formData.project_identifier.trim()) {
        setError('Please provide website name and internal project identifier.');
        return;
      }
    }
    if (step === 2) {
      if (!formData.subdomain.trim() || !formData.primary_hostname.trim()) {
        setError('Please specify a valid platform hostname.');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 7));
  };

  const handlePrev = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await platformSitesApi.createSite({
        name: formData.name.trim(),
        project_identifier: formData.project_identifier.trim().toLowerCase(),
        primary_hostname: formData.primary_hostname.trim().toLowerCase(),
        hosting_target: formData.hosting_target,
        description: formData.description.trim(),
        github_repo: formData.github_repo.trim(),
        github_branch: formData.github_branch.trim(),
        build_command: formData.build_command.trim(),
        output_dir: formData.output_dir.trim(),
        auto_deploy: formData.auto_deploy,
      });

      toast.success(`Platform Site '${formData.name}' provisioned successfully!`);
      onSuccess(res.site);
    } catch (err: any) {
      setError(err.message || 'Failed to provision platform website.');
      toast.error(err.message || 'Provisioning failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8">
        
        {/* Wizard Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0052FF]">
                Platform Sites Wizard
              </span>
              <span className="text-xs text-slate-400">• Step {step} of 7</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Create Platform Property
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="flex border-b border-slate-100 px-6 py-3 bg-white gap-2 overflow-x-auto no-scrollbar">
          {stepsList.map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap px-2.5 py-1 rounded-md transition-colors ${
                s.num === step
                  ? 'bg-blue-50 text-[#0052FF]'
                  : s.num < step
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-slate-400'
              }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                {s.num < step ? <Check size={10} strokeWidth={3} /> : s.num}
              </span>
              <span>{s.title}</span>
            </div>
          ))}
        </div>

        {/* Wizard Body */}
        <div className="p-6 min-h-[320px]">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Website Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. FeraSetu Help Center"
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoIdent = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                    setFormData((p) => ({
                      ...p,
                      name: val,
                      project_identifier: p.project_identifier || autoIdent,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Project Identifier * (Unique Slug)
                </label>
                <input
                  type="text"
                  placeholder="e.g. help-center"
                  value={formData.project_identifier}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      project_identifier: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Used internally for Cloudflare script/project naming and telemetry routing.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal description of this platform website's purpose..."
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Reserved Domain */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorized Reserved Platform Subdomain *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => updateSubdomain(e.target.value)}
                    placeholder="help"
                    className="flex-1 px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
                  />
                  <span className="text-sm font-semibold text-slate-500">.</span>
                  <select
                    value={formData.baseDomain}
                    onChange={(e) => {
                      const base = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        baseDomain: base,
                        primary_hostname: `${p.subdomain}.${base}`,
                      }));
                    }}
                    className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-[#0052FF]"
                  >
                    <option value="ferasetu.com">ferasetu.com</option>
                    <option value="fera-search.tech">fera-search.tech</option>
                  </select>
                </div>
              </div>

              {/* Predefined Platform Suggestions */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Select Core Platform Subdomains
                </label>
                <div className="flex flex-wrap gap-2">
                  {['help', 'docs', 'status', 'developers', 'portal', 'support'].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => updateSubdomain(sub)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                        formData.subdomain === sub
                          ? 'bg-[#0052FF] text-white border-[#0052FF]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sub}.ferasetu.com
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-900 leading-relaxed">
                <strong>Collision Prevention Guard:</strong> The hostname <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-blue-900">{formData.primary_hostname}</code> will be locked in the central platform registry. Merchant stores are strictly blocked from registering or impersonating this hostname.
              </div>
            </div>
          )}

          {/* STEP 3: Hosting Target */}
          {step === 3 && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Cloudflare Hosting Target *
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setFormData((p) => ({ ...p, hosting_target: 'workers' }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.hosting_target === 'workers'
                      ? 'border-[#0052FF] bg-blue-50/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center mb-3">
                    <Cpu size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Cloudflare Workers</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ultra-low latency serverless edge execution with V8 isolates. Best for dynamic APIs, status hubs, and micro-apps.
                  </p>
                </div>

                <div
                  onClick={() => setFormData((p) => ({ ...p, hosting_target: 'pages' }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.hosting_target === 'pages'
                      ? 'border-[#0052FF] bg-blue-50/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-[#0052FF] flex items-center justify-center mb-3">
                    <Layers size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Cloudflare Pages</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Full-stack edge JAMstack with continuous Git deployments. Best for documentation, help centers, and marketing portals.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Source Repository */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GitHub Repository (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ferasetu/help-center"
                  value={formData.github_repo}
                  onChange={(e) => setFormData((p) => ({ ...p, github_repo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={formData.github_branch}
                    onChange={(e) => setFormData((p) => ({ ...p, github_branch: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Output Directory
                  </label>
                  <input
                    type="text"
                    value={formData.output_dir}
                    onChange={(e) => setFormData((p) => ({ ...p, output_dir: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Build Command
                </label>
                <input
                  type="text"
                  value={formData.build_command}
                  onChange={(e) => setFormData((p) => ({ ...p, build_command: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="auto_deploy"
                  checked={formData.auto_deploy}
                  onChange={(e) => setFormData((p) => ({ ...p, auto_deploy: e.target.checked }))}
                  className="rounded text-[#0052FF] focus:ring-[#0052FF]"
                />
                <label htmlFor="auto_deploy" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Enable automatic production deployments on approved branch merges
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: Environment Configuration */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Environment Variables (Non-sensitive)
                </label>
                <textarea
                  rows={4}
                  value={formData.environment_variables}
                  onChange={(e) => setFormData((p) => ({ ...p, environment_variables: e.target.value }))}
                  className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
                  placeholder="KEY=VALUE&#10;ANOTHER_KEY=VALUE"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  One KEY=VALUE per line. Production secrets must be added separately via the Secrets tab with AES-GCM encryption.
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: Resource Allocation */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">CPU Execution Budget</span>
                  <span className="font-mono text-[#0052FF] font-bold">{formData.allocated_cpu_ms} ms</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={formData.allocated_cpu_ms}
                  onChange={(e) => setFormData((p) => ({ ...p, allocated_cpu_ms: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Daily Request Soft Quota</span>
                  <span className="font-mono text-[#0052FF] font-bold">{Number(formData.allocated_req_day).toLocaleString()} req/day</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="10000"
                  value={formData.allocated_req_day}
                  onChange={(e) => setFormData((p) => ({ ...p, allocated_req_day: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* STEP 7: Review & Explicit Confirmation */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Website Name:</span>
                  <span className="font-semibold text-slate-900">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Project Identifier:</span>
                  <span className="font-mono text-slate-900">{formData.project_identifier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Primary Hostname:</span>
                  <span className="font-mono font-semibold text-[#0052FF]">{formData.primary_hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hosting Target:</span>
                  <span className="uppercase font-semibold text-slate-900">{formData.hosting_target}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GitHub Source:</span>
                  <span className="font-mono text-slate-900">{formData.github_repo || 'Internal Template'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-700" />
                <p>
                  <strong>Explicit Administrator Authorization:</strong> Confirming will immediately create the platform site record, lock <code className="font-mono">{formData.primary_hostname}</code> against merchant assignment, and trigger asynchronous edge provisioning.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={step === 1 ? onClose : handlePrev}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            {step === 1 ? 'Cancel' : <><ChevronLeft size={14} /> Back</>}
          </button>

          {step < 7 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0052FF] hover:bg-[#0045d8] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2 bg-[#0052FF] hover:bg-[#0045d8] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Provisioning Infrastructure...</span>
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  <span>Confirm & Provision</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

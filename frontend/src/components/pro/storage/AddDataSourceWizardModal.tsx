import React, { useState } from 'react';
import {
  X, Database, HardDrive, Shield, CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, RefreshCw, Key, Server, Lock, Layers, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { proStudioApi, type ProDataSource } from '../../../services/proStudioApi';

interface AddDataSourceWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (source: ProDataSource) => void;
}

type ProviderType = 'postgres' | 'mysql' | 'libsql' | 's3_compatible' | 'b2';

export default function AddDataSourceWizardModal({
  isOpen,
  onClose,
  onSuccess,
}: AddDataSourceWizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const [sourceType, setSourceType] = useState<'database' | 'storage'>('database');
  const [provider, setProvider] = useState<ProviderType>('postgres');
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState('direct_tcp');

  // Credentials
  const [host, setHost] = useState('');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ssl, setSsl] = useState(true);

  // S3 / B2 Credentials
  const [bucket, setBucket] = useState('');
  const [region, setRegion] = useState('eu-central-003');
  const [endpoint, setEndpoint] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');

  // Test & Inspection
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionData, setInspectionData] = useState<any>(null);

  // Policy & Selection
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedPrefixes, setSelectedPrefixes] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<'manual' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [enableObjectLock, setEnableObjectLock] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const buildCredentials = () => {
    if (sourceType === 'database') {
      return { host, port: Number(port), database, username, password, ssl };
    } else if (provider === 'b2') {
      return { bucket, region, endpoint, applicationKeyId: accessKeyId, applicationKey: secretAccessKey };
    } else {
      return { bucket, region, endpoint, accessKeyId, secretAccessKey };
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await proStudioApi.testDataSource({
        type: sourceType,
        provider,
        connectionStrategy: strategy,
        credentials: buildCredentials(),
      });
      setTestResult(res);
      toast.success('Connection established successfully!');
      setStep(4);
      handleInspect();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleInspect = async () => {
    setIsInspecting(true);
    try {
      // Direct mock/adapter inspection preview
      if (sourceType === 'database') {
        const tables = [
          { name: 'users', estimatedRowCount: 2500, sizeBytes: 196608 },
          { name: 'products', estimatedRowCount: 450, sizeBytes: 98304 },
          { name: 'orders', estimatedRowCount: 1200, sizeBytes: 131072 },
        ];
        setInspectionData({ tables });
        setSelectedTables(tables.map(t => t.name));
      } else {
        const prefixes = ['assets/', 'catalog/', 'media/'];
        setInspectionData({ prefixes });
        setSelectedPrefixes(prefixes);
      }
    } catch (err: any) {
      toast.error('Failed to inspect structure');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleCreateSource = async () => {
    if (!name.trim()) {
      toast.error('Please enter a data source name');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await proStudioApi.createDataSource({
        name: name.trim(),
        type: sourceType,
        provider,
        connectionStrategy: strategy,
        credentials: buildCredentials(),
        policy: {
          schedule,
          retention_days: retentionDays,
          enable_object_lock: enableObjectLock,
          selected_tables: selectedTables,
          selected_prefixes: selectedPrefixes,
        },
      });
      toast.success(`Data source '${created.name}' connected successfully!`);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to connect data source');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Connect Data Source</h3>
              <p className="text-xs text-slate-400">Step {step} of 6 — Secure external backup pipeline</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-indigo-500 h-1 transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* STEP 1: Choose Provider */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">Select Provider Type & Service</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setSourceType('database'); setProvider('postgres'); setPort('5432'); }}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    sourceType === 'database'
                      ? 'bg-indigo-950/30 border-indigo-500/50 text-white shadow-lg'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <Database className="w-6 h-6 text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">SQL Database</p>
                    <p className="text-xs text-slate-400">PostgreSQL, MySQL, SQLite</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setSourceType('storage'); setProvider('s3_compatible'); }}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    sourceType === 'storage'
                      ? 'bg-indigo-950/30 border-indigo-500/50 text-white shadow-lg'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <HardDrive className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Object Storage</p>
                    <p className="text-xs text-slate-400">S3, Backblaze B2, MinIO</p>
                  </div>
                </button>
              </div>

              {sourceType === 'database' ? (
                <div className="space-y-2 pt-2">
                  <label className="text-xs text-slate-400 uppercase font-semibold">Database Engine</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'postgres', label: 'PostgreSQL', desc: 'Neon, Supabase, RDS' },
                      { id: 'mysql', label: 'MySQL', desc: 'PlanetScale, RDS' },
                      { id: 'libsql', label: 'LibSQL', desc: 'Turso, SQLite' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProvider(p.id as ProviderType);
                          if (p.id === 'postgres') setPort('5432');
                          else if (p.id === 'mysql') setPort('3306');
                        }}
                        className={`p-3 rounded-lg border text-left ${
                          provider === p.id
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <p className="text-sm font-medium">{p.label}</p>
                        <p className="text-xs text-slate-500">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <label className="text-xs text-slate-400 uppercase font-semibold">Storage Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 's3_compatible', label: 'S3-Compatible Storage', desc: 'AWS S3, Wasabi, MinIO' },
                      { id: 'b2', label: 'Backblaze B2 (External)', desc: 'Customer B2 Bucket' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProvider(p.id as ProviderType)}
                        className={`p-3 rounded-lg border text-left ${
                          provider === p.id
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <p className="text-sm font-medium">{p.label}</p>
                        <p className="text-xs text-slate-500">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Connection Details & Credentials */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Data Source Name</label>
                <input
                  type="text"
                  placeholder="e.g. Production Cluster, Customer Assets"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {sourceType === 'database' ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Host</label>
                      <input
                        type="text"
                        placeholder="ep-sample.neon.tech or db.example.com"
                        value={host}
                        onChange={e => setHost(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Port</label>
                      <input
                        type="text"
                        value={port}
                        onChange={e => setPort(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Database Name</label>
                      <input
                        type="text"
                        placeholder="postgres or store_prod"
                        value={database}
                        onChange={e => setDatabase(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Username</label>
                      <input
                        type="text"
                        placeholder="db_user"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white pr-10 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Bucket Name</label>
                    <input
                      type="text"
                      placeholder="my-bucket-name"
                      value={bucket}
                      onChange={e => setBucket(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                        {provider === 'b2' ? 'B2 Application Key ID' : 'Access Key ID'}
                      </label>
                      <input
                        type="text"
                        value={accessKeyId}
                        onChange={e => setAccessKeyId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                        {provider === 'b2' ? 'B2 Application Key' : 'Secret Access Key'}
                      </label>
                      <input
                        type="password"
                        value={secretAccessKey}
                        onChange={e => setSecretAccessKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-lg flex items-center gap-2 text-xs text-indigo-300">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Credentials are encrypted server-side with AES-256-GCM via HKDF subkeys and never exposed in logs or API responses.</span>
              </div>
            </div>
          )}

          {/* STEP 3: Test Connection */}
          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Server className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">Ready to verify connection</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  We will perform a non-destructive handshake to verify your credentials and inspect supported capabilities before saving.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isTesting ? 'Verifying...' : 'Test Connection & Inspect'}
              </button>
            </div>
          )}

          {/* STEP 4: Select Data */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-300">
                  {sourceType === 'database' ? 'Select Tables to Protect' : 'Select Folders/Prefixes'}
                </h4>
                <span className="text-xs text-slate-400">
                  {sourceType === 'database' ? `${selectedTables.length} tables selected` : `${selectedPrefixes.length} prefixes selected`}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                {sourceType === 'database' ? (
                  (inspectionData?.tables || []).map((t: any) => (
                    <label key={t.name} className="flex items-center justify-between p-3 hover:bg-slate-900/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTables.includes(t.name)}
                          onChange={e => {
                            if (e.target.checked) setSelectedTables([...selectedTables, t.name]);
                            else setSelectedTables(selectedTables.filter(x => x !== t.name));
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                        />
                        <span className="text-sm text-white font-medium">{t.name}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        ~{t.estimatedRowCount} rows ({(t.sizeBytes / 1024).toFixed(0)} KB)
                      </div>
                    </label>
                  ))
                ) : (
                  (inspectionData?.prefixes || []).map((p: string) => (
                    <label key={p} className="flex items-center justify-between p-3 hover:bg-slate-900/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPrefixes.includes(p)}
                          onChange={e => {
                            if (e.target.checked) setSelectedPrefixes([...selectedPrefixes, p]);
                            else setSelectedPrefixes(selectedPrefixes.filter(x => x !== p));
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                        />
                        <span className="text-sm text-white font-medium">{p}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Backup Policy & Retention */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Automated Schedule</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'manual', label: 'Manual Only' },
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSchedule(s.id as any)}
                      className={`p-2.5 text-xs font-medium rounded-lg border ${
                        schedule === s.id
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Retention Period</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 7, label: '7 Days' },
                    { days: 30, label: '30 Days' },
                    { days: 90, label: '90 Days' },
                  ].map(r => (
                    <button
                      key={r.days}
                      type="button"
                      onClick={() => setRetentionDays(r.days)}
                      className={`p-2.5 text-xs font-medium rounded-lg border ${
                        retentionDays === r.days
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Backblaze B2 Object Lock</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableObjectLock}
                    onChange={e => setEnableObjectLock(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Enforces WORM (Write Once, Read Many) compliance. Committed snapshots cannot be modified or deleted until the retention period expires.
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: Review & Finalize */}
          {step === 6 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">Review Data Source Configuration</h4>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-500">Name</span>
                  <span className="text-white font-medium">{name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-500">Provider</span>
                  <span className="text-white font-medium uppercase">{provider} ({sourceType})</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-500">Schedule</span>
                  <span className="text-white font-medium capitalize">{schedule}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-500">Retention</span>
                  <span className="text-white font-medium">{retentionDays} days</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-500">B2 Object Lock</span>
                  <span className={enableObjectLock ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                    {enableObjectLock ? 'Enabled (GOVERNANCE)' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Storage Destination</span>
                  <span className="text-indigo-400 font-medium">FeraSetu Managed Backblaze B2</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : <div />}

          {step < 3 && (
            <button
              type="button"
              onClick={() => {
                if (step === 2 && !name.trim()) {
                  toast.error('Please enter a data source name');
                  return;
                }
                setStep(step + 1);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step >= 4 && step < 6 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 6 && (
            <button
              type="button"
              onClick={handleCreateSource}
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 shadow-lg"
            >
              {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isSubmitting ? 'Connecting...' : 'Connect & Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

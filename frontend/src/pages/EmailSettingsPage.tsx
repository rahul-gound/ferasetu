import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Mail, Shield, KeyRound, Send, Save, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Settings2, Loader2, ChevronDown,
  Clock, Hash,
} from 'lucide-react';
import api from '../services/api';

interface SmtpSettings {
  provider: string;
  host: string;
  port: number;
  username: string;
  password: string;
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
  ssl_enabled: boolean;
  tls_enabled: boolean;
  otp_enabled: boolean;
  otp_length: number;
  otp_expiry_minutes: number;
  otp_resend_cooldown: number;
  otp_max_attempts: number;
  otp_subject: string;
  otp_body_template: string;
  is_active: boolean;
  has_password: boolean;
}

interface SmtpDefaults {
  host: string;
  port: number;
  ssl: boolean;
  tls: boolean;
}

const PROVIDERS = [
  { id: 'gmail', name: 'Gmail', desc: 'smtp.gmail.com' },
  { id: 'sendgrid', name: 'SendGrid', desc: 'smtp.sendgrid.net' },
  { id: 'mailgun', name: 'Mailgun', desc: 'smtp.mailgun.org' },
  { id: 'ses', name: 'Amazon SES', desc: 'email-smtp.us-east-1.amazonaws.com' },
  { id: 'custom', name: 'Custom SMTP', desc: 'Any SMTP server' },
];

const DEFAULT_TEMPLATE = `Hello {{name}},

Your verification code is:

{{otp}}

This code expires in {{expiry}} minutes.

If you didn't create an account, ignore this email.

— Team FeraSetu`;

function SectionCard({ icon, title, subtitle, children }: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-7 mb-5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-text tracking-tight m-0">{title}</h3>
          {subtitle && <p className="text-sm text-text-muted mt-0.5 mb-0">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-text mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled, className = '' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
        ${disabled 
          ? 'bg-bg2 border-border text-text-muted cursor-not-allowed' 
          : 'bg-surface border-border text-text'}
        ${className}
      `}
    />
  );
}

function SelectInput({ value, onChange, options, className = '' }: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`
          w-full pr-10 py-2.5 px-3.5 text-sm font-medium rounded-xl border border-border bg-surface text-text
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
          appearance-none cursor-pointer
        `}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-semibold text-text">{label}</div>
        {description && <div className="text-xs text-text-muted mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`
          w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 relative
          ${checked ? 'bg-primary' : 'bg-border'}
        `}
        aria-pressed={checked}
      >
        <div className={`
          w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-0'}
        `} />
      </button>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, showPassword, onToggleShow, hasPassword }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showPassword: boolean;
  onToggleShow: () => void;
  hasPassword: boolean;
}) {
  return (
    <div className="relative">
      <TextInput
        value={value}
        onChange={onChange}
        placeholder={placeholder || (hasPassword && !value ? '••••••••••••' : 'Enter password')}
        type={showPassword ? 'text' : 'password'}
      />
      <button
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1"
        type="button"
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [form, setForm] = useState<SmtpSettings>({
    provider: 'custom',
    host: '',
    port: 587,
    username: '',
    password: '',
    sender_name: '',
    sender_email: '',
    reply_to_email: '',
    ssl_enabled: false,
    tls_enabled: true,
    otp_enabled: true,
    otp_length: 6,
    otp_expiry_minutes: 10,
    otp_resend_cooldown: 60,
    otp_max_attempts: 5,
    otp_subject: 'Verify your email • FeraSetu',
    otp_body_template: '',
    is_active: false,
    has_password: false,
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: async () => {
      const res = await api.get('/settings/smtp');
      return res.data;
    },
  });

  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setForm({
        provider: s.provider || 'custom',
        host: s.host || '',
        port: s.port || 587,
        username: s.username || '',
        password: '',
        sender_name: s.sender_name || '',
        sender_email: s.sender_email || '',
        reply_to_email: s.reply_to_email || '',
        ssl_enabled: s.ssl_enabled || false,
        tls_enabled: s.tls_enabled !== undefined ? s.tls_enabled : true,
        otp_enabled: s.otp_enabled !== undefined ? s.otp_enabled : true,
        otp_length: s.otp_length || 6,
        otp_expiry_minutes: s.otp_expiry_minutes || 10,
        otp_resend_cooldown: s.otp_resend_cooldown || 60,
        otp_max_attempts: s.otp_max_attempts || 5,
        otp_subject: s.otp_subject || 'Verify your email • FeraSetu',
        otp_body_template: s.otp_body_template || '',
        is_active: s.is_active || false,
        has_password: s.has_password || false,
      });
    }
  }, [settingsData]);

  const updateField = useCallback(<K extends keyof SmtpSettings>(key: K, value: SmtpSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const handleProviderChange = useCallback((provider: string) => {
    const defaults = settingsData?.defaults || { host: '', port: 587, ssl: false, tls: true };
    setForm(prev => ({
      ...prev,
      provider,
      host: defaults.host || prev.host,
      port: defaults.port || prev.port,
      ssl_enabled: defaults.ssl,
      tls_enabled: defaults.tls,
    }));
    setHasUnsavedChanges(true);
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = { ...form };
      if (!payload.password) delete payload.password;
      const res = await api.put('/settings/smtp', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('SMTP settings saved successfully');
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['smtp-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to save settings');
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/settings/smtp/test', { email: testEmail });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Test email sent successfully');
      setTestEmail('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to send test email');
    },
  });

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-surface border border-border rounded-2xl p-7 h-44 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Settings2 size={22} className="text-primary" />
          <h1 className="text-3xl font-extrabold text-text tracking-tight m-0">
            Email (SMTP) Settings
          </h1>
        </div>
        <p className="text-base text-text-muted leading-relaxed m-0">
          Configure your SMTP server to send OTP verification emails to your users.
        </p>
      </div>

      {form.is_active && (
        <div className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-xl mb-5">
          <CheckCircle2 size={18} className="text-green-600" />
          <span className="text-sm font-bold text-green-800">
            Custom SMTP is active — OTP emails are being sent via your configured server
          </span>
        </div>
      )}

      <SectionCard icon={<Mail size={20} />} title="SMTP Provider" subtitle="Choose your email service provider">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`
                p-3.5 rounded-xl border-2 text-left transition-all duration-200
                ${form.provider === p.id 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-border bg-surface text-text hover:border-primary/50 hover:bg-primary/5'}
              `}
            >
              <div className={`
                font-semibold text-sm
                ${form.provider === p.id ? 'text-primary' : 'text-text'}
              `}>
                {p.name}
              </div>
              <div className="text-[11px] text-text-muted mt-1 font-mono">
                {p.desc}
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={<KeyRound size={20} />} title="SMTP Configuration" subtitle="Server connection details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FieldLabel>SMTP Host</FieldLabel>
            <TextInput
              value={form.host}
              onChange={v => updateField('host', v)}
              placeholder={settingsData?.defaults?.host || 'smtp.example.com'}
            />
          </div>
          <div>
            <FieldLabel>SMTP Port</FieldLabel>
            <TextInput
              value={String(form.port)}
              onChange={v => updateField('port', parseInt(v) || 587)}
              placeholder="587"
            />
          </div>
          <div>
            <FieldLabel>Username</FieldLabel>
            <TextInput
              value={form.username}
              onChange={v => updateField('username', v)}
              placeholder="your-email@gmail.com"
            />
          </div>
          <div>
            <FieldLabel>Password 
              {form.has_password && !form.password && (
                <span className="text-green-600 font-semibold ml-1">(saved)</span>
              )}
            </FieldLabel>
            <PasswordInput
              value={form.password}
              onChange={v => updateField('password', v)}
              placeholder={form.has_password ? '••••••••••••' : 'Enter password'}
              showPassword={showPassword}
              onToggleShow={() => setShowPassword(!showPassword)}
              hasPassword={form.has_password}
            />
          </div>
          <div>
            <FieldLabel>Sender Name</FieldLabel>
            <TextInput
              value={form.sender_name}
              onChange={v => updateField('sender_name', v)}
              placeholder="FeraSetu"
            />
          </div>
          <div>
            <FieldLabel required>Sender Email</FieldLabel>
            <TextInput
              value={form.sender_email}
              onChange={v => updateField('sender_email', v)}
              placeholder="noreply@yourdomain.com"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Reply-To Email (optional)</FieldLabel>
            <TextInput
              value={form.reply_to_email}
              onChange={v => updateField('reply_to_email', v)}
              placeholder="support@yourdomain.com"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Shield size={20} />} title="Security" subtitle="Connection encryption settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle
            checked={form.ssl_enabled}
            onChange={v => updateField('ssl_enabled', v)}
            label="SSL"
            description="Encrypt connection on port 465"
          />
          <Toggle
            checked={form.tls_enabled}
            onChange={v => updateField('tls_enabled', v)}
            label="TLS"
            description="Encrypt connection on port 587"
          />
        </div>
      </SectionCard>

      <SectionCard icon={<Hash size={20} />} title="OTP Settings" subtitle="Configure email verification behavior">
        <div>
          <Toggle
            checked={form.otp_enabled}
            onChange={v => updateField('otp_enabled', v)}
            label="Enable Email Verification"
            description="Require OTP during user registration"
          />
          <div className={`
            grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4
            ${form.otp_enabled ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'}
          `}>
            <div>
              <FieldLabel>OTP Length</FieldLabel>
              <SelectInput
                value={String(form.otp_length)}
                onChange={v => updateField('otp_length', parseInt(v))}
                options={[
                  { value: '4', label: '4 digits' },
                  { value: '5', label: '5 digits' },
                  { value: '6', label: '6 digits (default)' },
                  { value: '8', label: '8 digits' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>OTP Expiry</FieldLabel>
              <div className="relative">
                <TextInput
                  value={String(form.otp_expiry_minutes)}
                  onChange={v => updateField('otp_expiry_minutes', parseInt(v) || 10)}
                  placeholder="10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">min</span>
              </div>
            </div>
            <div>
              <FieldLabel>Resend Cooldown</FieldLabel>
              <div className="relative">
                <TextInput
                  value={String(form.otp_resend_cooldown)}
                  onChange={v => updateField('otp_resend_cooldown', parseInt(v) || 60)}
                  placeholder="60"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">sec</span>
              </div>
            </div>
            <div>
              <FieldLabel>Max Attempts</FieldLabel>
              <TextInput
                value={String(form.otp_max_attempts)}
                onChange={v => updateField('otp_max_attempts', parseInt(v) || 5)}
                placeholder="5"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Mail size={20} />} title="Email Template" subtitle="Customize the OTP email content">
        <div>
          <FieldLabel>Email Subject</FieldLabel>
          <TextInput
            value={form.otp_subject}
            onChange={v => updateField('otp_subject', v)}
            placeholder="Verify your email • FeraSetu"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs text-text-muted self-center">Variables:</span>
            {['{{name}}', '{{otp}}', '{{email}}', '{{expiry}}', '{{app_name}}'].map(v => (
              <code key={v} className="text-xs px-2 py-0.5 rounded bg-bg2 border border-border text-primary font-mono font-semibold">
                {v}
              </code>
            ))}
          </div>

          <div className="mt-5">
            <FieldLabel>Body Template</FieldLabel>
            <textarea
              value={form.otp_body_template || DEFAULT_TEMPLATE}
              onChange={e => updateField('otp_body_template', e.target.value)}
              rows={12}
              className="w-full px-3.5 py-3.5 text-sm font-mono bg-surface border border-border rounded-xl text-text resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 leading-relaxed"
            />
          </div>

          <div className="mt-4 p-5 bg-bg2 border border-border rounded-xl">
            <div className="text-xs font-extrabold text-text-muted uppercase tracking-wider mb-3">
              Preview
            </div>
            <div className="text-base text-text leading-relaxed whitespace-pre-wrap font-mono">
              {(form.otp_body_template || DEFAULT_TEMPLATE)
                .replace(/\{\{name\}\}/g, 'Rahul')
                .replace(/\{\{otp\}\}/g, '482901')
                .replace(/\{\{email\}\}/g, 'rahul@example.com')
                .replace(/\{\{expiry\}\}/g, String(form.otp_expiry_minutes))
                .replace(/\{\{app_name\}\}/g, 'FeraSetu')
              }
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Send size={20} />} title="Test SMTP" subtitle="Send a test email to verify your configuration">
        <div className="flex gap-2.5 items-end">
          <div className="flex-1">
            <FieldLabel>Recipient Email</FieldLabel>
            <TextInput
              value={testEmail}
              onChange={setTestEmail}
              placeholder="test@example.com"
              type="email"
            />
          </div>
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testEmail}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl border-none bg-text text-white text-sm font-bold
              transition-all duration-200 whitespace-nowrap
              ${testMutation.isPending || !testEmail 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer hover:opacity-90'}
            `}
          >
            {testMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {testMutation.isPending ? 'Sending...' : 'Send Test'}
          </button>
        </div>
        {testMutation.isSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm font-semibold text-green-800">
            <CheckCircle2 size={16} /> Test email sent successfully!
          </div>
        )}
        {testMutation.isError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertTriangle size={16} /> {testMutation.error?.message || 'Failed to send test email'}
          </div>
        )}
      </SectionCard>

      <div className="sticky bottom-0 py-4 bg-gradient-to-t from-bg/90 to-transparent flex justify-end gap-3 z-10 mt-8">
        {hasUnsavedChanges && (
          <span className="text-sm text-amber-600 font-semibold flex items-center gap-1.5 self-center">
            <AlertTriangle size={14} /> Unsaved changes
          </span>
        )}
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className={`
            flex items-center gap-2 px-7 py-3 rounded-xl border-none
            bg-gradient-to-r from-primary to-secondary text-white text-base font-extrabold
            shadow-[0_4px_14px_rgba(0,82,255,0.35)] transition-all duration-200
            ${saveMutation.isPending ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
          `}
        >
          {saveMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
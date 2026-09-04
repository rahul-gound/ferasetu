import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';
import AuthShell from '../components/auth/AuthShell';
import { Store, User, Mail, Phone, ArrowRight, Globe, Sparkles, CheckCircle2 } from 'lucide-react';

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

const CATEGORIES = [
  { id: 'kirana', label: 'Kirana & Grocery', icon: '🛒' },
  { id: 'fashion', label: 'Fashion & Clothing', icon: '👕' },
  { id: 'electronics', label: 'Electronics & Mobile', icon: '📱' },
  { id: 'food', label: 'Food & Restaurant', icon: '🍲' },
  { id: 'retail', label: 'General Store', icon: '🏪' },
];

export default function RegisterPage() {
  const { login, loginWithGoogle, user, isLoading } = useAuth();
  const { translate, language, getLocalizedLink } = useLanguage();
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('kirana');
  const [subdomain, setSubdomain] = useState('');
  const [isSubdomainManual, setIsSubdomainManual] = useState(false);
  const [errors, setErrors] = useState<{ storeName?: string; email?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    if (!isSubdomainManual) {
      setSubdomain(generateSlug(val));
    }
    if (errors.storeName) {
      setErrors(prev => ({ ...prev, storeName: undefined }));
    }
  };

  const savePendingRegistration = () => {
    const cleanStore = storeName.trim() || 'My Online Store';
    const finalSubdomain = subdomain.trim() || generateSlug(cleanStore) || 'my-store';

    const regData = {
      business_name: cleanStore,
      name: ownerName.trim() || cleanStore,
      email: email.trim().toLowerCase() || undefined,
      phone: phone.trim() || undefined,
      subdomain: finalSubdomain,
      category,
      preferred_language: language || 'en',
    };

    try {
      sessionStorage.setItem('fera_pending_registration', JSON.stringify(regData));
    } catch (e) {
      console.error('Failed to save pending registration:', e);
    }

    return regData;
  };

  const validateForm = () => {
    const newErrors: { storeName?: string; email?: string } = {};
    const cleanStore = storeName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanStore) {
      newErrors.storeName = 'Please enter your shop or business name';
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    savePendingRegistration();
    setIsSubmitting(true);
    try {
      login({ loginHint: email.trim().toLowerCase() });
    } catch (err) {
      console.error('Registration failed:', err);
      setIsSubmitting(false);
    }
  };

  const handleGoogleSubmit = () => {
    savePendingRegistration();
    loginWithGoogle(email.trim() ? { loginHint: email.trim().toLowerCase() } : undefined);
  };

  const activeSubdomain = subdomain || (storeName ? generateSlug(storeName) : 'your-shop');

  return (
    <>
      <SEO
        title={`${translate('auth.register.freeTitle') || 'Create Your Free Store'} • FeraSetu`}
        description={translate('auth.register.subtitle') || 'Launch your online shop in 2 minutes. Receive WhatsApp orders and instant UPI payments.'}
        noindex
      />

      <AuthShell
        title={translate('auth.register.freeTitle') || 'Create Your Free Store'}
        subtitle={translate('auth.register.subtitle') || 'Launch your shop online in 2 minutes. Start taking orders today. No credit card required.'}
      >
        {/* Trial Badge */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-950/30 px-3.5 py-2 text-xs text-blue-300">
          <span className="flex items-center gap-1.5 font-semibold">
            <Sparkles size={14} className="text-blue-400" />
            14-Day Free Trial
          </span>
          <span className="text-slate-400 font-mono text-[11px]">Free • Zero Risk</span>
        </div>

        {/* 1-Click Google Sign-Up */}
        <button
          type="button"
          onClick={handleGoogleSubmit}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all shadow-sm hover:border-white/20 active:scale-[0.99] cursor-pointer"
        >
          <GoogleIcon className="w-5 h-5" />
          <span>Sign up with Google</span>
        </button>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative bg-slate-900 px-3 text-xs uppercase tracking-wider text-slate-500 font-medium">
            or set up with email
          </span>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
          {/* Shop Name */}
          <div>
            <label htmlFor="storeName" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Shop / Business Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Store size={16} />
              </div>
              <input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => handleStoreNameChange(e.target.value)}
                placeholder="e.g. Ramesh Kirana Store"
                className={`w-full rounded-xl border bg-slate-950/60 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 ${
                  errors.storeName
                    ? 'border-red-500/60 focus:ring-red-500/30'
                    : 'border-white/10 focus:border-blue-500/60 focus:ring-blue-500/20'
                }`}
              />
            </div>
            {errors.storeName && (
              <p className="mt-1 text-xs text-red-400 font-medium">{errors.storeName}</p>
            )}

            {/* Live Subdomain Preview */}
            <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
              <Globe size={12} className="text-blue-400 shrink-0" />
              <span className="text-slate-500">https://</span>
              <span className="font-semibold text-blue-400 font-mono">
                {activeSubdomain}
              </span>
              <span className="text-slate-500">.ferasetu.com</span>
            </div>
          </div>

          {/* Owner Full Name */}
          <div>
            <label htmlFor="ownerName" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User size={16} />
              </div>
              <input
                id="ownerName"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail size={16} />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                className={`w-full rounded-xl border bg-slate-950/60 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-red-500/60 focus:ring-red-500/30'
                    : 'border-white/10 focus:border-blue-500/60 focus:ring-blue-500/20'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-400 font-medium">{errors.email}</p>
            )}
          </div>

          {/* Phone (Optional) */}
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-slate-300 mb-1.5">
              WhatsApp / Phone Number <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Phone size={16} />
              </div>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Store Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Store Category
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600/20 text-blue-200 shadow-sm shadow-blue-500/20'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-5 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Connecting to secure verification...</span>
              </>
            ) : (
              <>
                <span>Create Your Store & Continue</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Benefits Checklist */}
        <div className="mt-6 pt-5 border-t border-white/5 space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span>Ready in under 2 minutes with AI product catalog</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span>Direct WhatsApp order notifications & UPI payments</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span>Zero commissions on orders during your trial</span>
          </div>
        </div>

        {/* Already have an account link */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <p className="text-sm text-slate-400">
            Already have a store?{' '}
            <Link
              to={getLocalizedLink('/login')}
              className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              Sign in to your store &rarr;
            </Link>
          </p>
        </div>
      </AuthShell>
    </>
  );
}

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  MapPin,
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
  ExternalLink,
  ShieldCheck,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShoppingBag,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { getGoogleStyleAvatar, resolveEffectiveProfilePicture } from '../utils/avatarUtils';
import posthog from '../lib/posthog';
import { posthogLogger } from '../lib/posthogLogger';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Puducherry', 'Chandigarh', 'Andaman and Nicobar', 'Lakshadweep',
  'Dadra and Nagar Haveli and Daman and Diu'
];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'District of Columbia'
];

const EU_COUNTRIES = [
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
];

type Region = 'IN' | 'US' | 'EU' | 'OTHER';

interface RetailCategory {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

const RETAIL_CATEGORIES: RetailCategory[] = [
  { id: 'grocery', name: 'Grocery & Kirana', icon: '🛒', desc: 'Daily essentials, packed foods, staples' },
  { id: 'fashion', name: 'Fashion & Boutique', icon: '👗', desc: 'Apparel, sarees, kurtas, jewelry' },
  { id: 'bakery', name: 'Bakery & Sweets', icon: '🍰', desc: 'Mithai, cakes, dairy, savories' },
  { id: 'electronics', name: 'Electronics & Mobile', icon: '📱', desc: 'Gadgets, accessories, repairs' },
  { id: 'artisan', name: 'Artisan & Handcrafted', icon: '🎨', desc: 'Handicrafts, pottery, decor' },
  { id: 'general', name: 'General Retail', icon: '🏪', desc: 'Supermarket, stationery, hardware' },
];

const POPULAR_INDIAN_CITIES = [
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Kolkata', state: 'West Bengal' },
];

export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const { user, setOrganizationContext, updateUser } = useAuth();

  // Mode: 1 = Fast Launchpad, 2 = Instant Celebration & Dopamine Screen
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [showAddressAccordion, setShowAddressAccordion] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Profile / Shop Icon State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(() => {
    return user?.profile_picture || null;
  });

  // Shop Details
  const [shopName, setShopName] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramShop = urlParams.get('shopName');
      if (paramShop) return paramShop;
      const claimed = localStorage.getItem('ferasetu_claimed_shop_name');
      if (claimed) return claimed;
    } catch {}
    return user?.business_name || '';
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('grocery');

  const [region, setRegion] = useState<Region>(() => {
    if (user?.market === 'US') return 'US';
    if (user?.market === 'EU') return 'EU';
    return 'IN';
  });

  const [country, setCountry] = useState(() => {
    if (user?.market === 'US') return 'United States';
    if (user?.market === 'EU') return 'Germany';
    return 'India';
  });

  const [city, setCity] = useState('Mumbai');
  const [district, setDistrict] = useState('Mumbai');
  const [state, setState] = useState(() => user?.market === 'US' ? 'California' : 'Maharashtra');
  const [customState, setCustomState] = useState('');
  const [address, setAddress] = useState('');

  // Completion Data for Step 2
  const [createdData, setCreatedData] = useState<{
    organization: any;
    store_slug: string;
    store_url: string;
  } | null>(null);

  const effectiveState = (region === 'IN' || region === 'US') ? state : customState;
  const suggestedSlug = (shopName.trim() || 'my-shop')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const seedForAvatar = user?.name || user?.email || shopName || 'Shopkeeper';
  const effectiveAvatar = profilePicture || getGoogleStyleAvatar(seedForAvatar);

  const handleSelectRegion = (newRegion: Region) => {
    setRegion(newRegion);
    if (newRegion === 'IN') {
      setCountry('India');
      if (!city) setCity('Mumbai');
      if (!district) setDistrict('Mumbai');
      if (!INDIAN_STATES.includes(state)) setState('Maharashtra');
    } else if (newRegion === 'US') {
      setCountry('United States');
      if (!city) setCity('New York');
      if (!district) setDistrict('New York County');
      if (!US_STATES.includes(state)) setState('New York');
    } else if (newRegion === 'EU') {
      if (!country || country === 'India' || country === 'United States') {
        setCountry('Germany');
      }
      if (!city) setCity('Berlin');
      if (!district) setDistrict('Berlin');
      if (!customState) setCustomState('Berlin');
    } else {
      if (!city) setCity('Toronto');
      if (!district) setDistrict('Ontario');
      if (!customState) setCustomState('Ontario');
    }
  };

  const handleSelectCityPreset = (presetCity: string, presetState: string) => {
    setCity(presetCity);
    setDistrict(presetCity);
    setState(presetState);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProfilePicture(dataUrl);
      if (updateUser) {
        updateUser({ profile_picture: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyStoreLink = async () => {
    if (!createdData?.store_url) return;
    try {
      await navigator.clipboard.writeText(createdData.store_url);
      setCopiedLink(true);
      toast.success('Store link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSubmitFastLaunch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopName.trim() || shopName.trim().length < 2) {
      toast.error('Please enter your shop or business name (min 2 characters)');
      return;
    }

    const effectiveCity = city.trim() || 'Mumbai';
    const effectiveDistrict = district.trim() || effectiveCity;
    const finalState = effectiveState.trim() || 'Maharashtra';
    const finalCountry = country.trim() || (region === 'IN' ? 'India' : region === 'US' ? 'United States' : 'Germany');

    setSubmitting(true);
    try {
      const payload = {
        name: shopName.trim(),
        address: address.trim(),
        city: effectiveCity,
        district: effectiveDistrict,
        state: finalState,
        country: finalCountry,
        market: region,
        profile_picture: effectiveAvatar,
        category: selectedCategory,
        invitations: [],
      };

      const { data } = await api.post('/organizations', payload);

      if (data.organization) {
        setOrganizationContext(data.organization);
      }

      const storeSlug = data.store_slug || data.organization?.store_slug || suggestedSlug;
      const storeUrl = data.store_url || `https://${storeSlug}.ferasetu.com`;

      setCreatedData({
        organization: data.organization,
        store_slug: storeSlug,
        store_url: storeUrl,
      });

      posthog.capture('organization_created', {
        market: region,
        category: selectedCategory,
        fast_onboarding: true,
      });

      posthogLogger.info('Fast onboarding completed', {
        workflow: 'fast_organization_onboarding',
        market: region,
        store_slug: storeSlug,
      });

      if (updateUser) {
        updateUser({
          business_name: shopName.trim(),
          profile_picture: effectiveAvatar,
        });
      }

      setStep(2);
      toast.success('Your online shop is ready and live!');
    } catch (err: any) {
      posthogLogger.warn('Fast onboarding request failed', {
        workflow: 'fast_organization_onboarding',
        market: region,
        http_status: Number(err?.response?.status || 0),
      });
      console.error('Failed to create shop:', err);
      const serverErr = typeof err.response?.data === 'object'
        ? (err.response.data?.error || err.response.data?.message)
        : (typeof err.response?.data === 'string' && err.response.data.trim() ? err.response.data : null);
      const msg = serverErr || err.message || 'Failed to create your shop. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappShareText = encodeURIComponent(
    `नमस्ते! हमारी दुकान "${shopName || 'Shop'}" अब FeraSetu पर ऑनलाइन है। आप हमारे सारे प्रोडक्ट्स देखकर सीधे ऑर्डर कर सकते हैं:\n${createdData?.store_url || ''}\n0% कमीशन, घर तक डिलीवरी!`
  );

  return (
    <>
      <SEO title="Launch Your Online Shop in 30 Seconds • FeraSetu" noindex />
      <div className="min-h-screen bg-[#F6F8FC] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <img src="/logo-official.png" alt="FeraSetu" className="h-9 w-auto object-contain" />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: The 30-Second Fast Launchpad (Psychological Simplicity)   */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 p-6 sm:p-9 transition-all">
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0052FF] text-xs font-bold uppercase tracking-wider mb-3">
                  <Sparkles size={13} />
                  <span>30-Second Setup • ₹0 Platform Fee</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Launch your online shop
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1">
                  Start selling directly to customers with WhatsApp checkout, instant UPI, and 0% commission.
                </p>
              </div>

              <form onSubmit={handleSubmitFastLaunch} className="space-y-6">
                {/* 1. Shop Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                    Shop or Business Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Ramesh Kirana Store or Maya Boutique"
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-[#0052FF] focus:border-[#0052FF] text-slate-900 font-bold text-base transition-all placeholder:text-slate-400 placeholder:font-normal"
                      autoFocus
                    />
                  </div>

                  {/* Real-time Subdomain Pill */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
                    <Globe size={13} className="text-[#0052FF] shrink-0" />
                    <span className="truncate">
                      Your store address:{' '}
                      <span className="font-extrabold text-[#0052FF]">
                        {suggestedSlug}.ferasetu.com
                      </span>
                    </span>
                  </div>
                </div>

                {/* 2. Retail Category Pills */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                    What do you sell?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {RETAIL_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#0052FF] bg-blue-50/70 shadow-sm ring-1 ring-[#0052FF]'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xl">{cat.icon}</span>
                            {isSelected && <Check size={14} className="text-[#0052FF]" />}
                          </div>
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#0052FF]' : 'text-slate-800'}`}>
                            {cat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Location (City & State) */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                      Store Location (City & State)
                    </label>
                    {/* Region Switcher */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelectRegion('IN')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          region === 'IN' ? 'bg-[#0052FF] text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        🇮🇳 India
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectRegion('US')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          region === 'US' ? 'bg-[#0052FF] text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        🇺🇸 US
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectRegion('EU')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          region === 'EU' ? 'bg-[#0052FF] text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        🇪🇺 EU
                      </button>
                    </div>
                  </div>

                  {region === 'IN' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value);
                            setDistrict(e.target.value);
                          }}
                          placeholder="City / Town (e.g. Boisar, Mumbai)"
                          className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0052FF] text-slate-900 text-sm font-semibold"
                        />
                        <select
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0052FF] text-slate-900 text-sm font-semibold bg-white"
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      {/* Quick City Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] text-slate-400 font-medium">Quick select:</span>
                        {POPULAR_INDIAN_CITIES.map((c) => (
                          <button
                            key={c.city}
                            type="button"
                            onClick={() => handleSelectCityPreset(c.city, c.state)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                              city.toLowerCase() === c.city.toLowerCase()
                                ? 'bg-blue-100 text-[#0052FF] font-bold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {c.city}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {region === 'US' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setDistrict(e.target.value);
                        }}
                        placeholder="City (e.g. New York, Austin)"
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0052FF] text-slate-900 text-sm font-semibold"
                      />
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0052FF] text-slate-900 text-sm font-semibold bg-white"
                      >
                        {US_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {region === 'EU' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setDistrict(e.target.value);
                        }}
                        placeholder="City (e.g. Berlin, Paris)"
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0052FF] text-slate-900 text-sm font-semibold"
                      />
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0052FF] text-slate-900 text-sm font-semibold bg-white"
                      >
                        {EU_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Optional Street Address Accordion */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddressAccordion(!showAddressAccordion)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {showAddressAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span>Add street or pickup address (Optional)</span>
                    </button>
                    {showAddressAccordion && (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Shop / Unit number, Street, Market area"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit 48px Tactile CTA */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[#0052FF] hover:bg-blue-600 active:scale-[0.98] text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/25 transition-all text-base cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Launching your store...</span>
                      </span>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Launch My Online Store</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>

                {/* Trust Invariants */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    0% Commission
                  </span>
                  <span>•</span>
                  <span>WhatsApp Orders</span>
                  <span>•</span>
                  <span>Instant UPI</span>
                </div>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: Instant Dopamine & Celebration (The Endowment Effect)    */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {step === 2 && createdData && (
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 p-6 sm:p-9 text-center space-y-6">
              {/* Confetti Celebration Badge */}
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={34} />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
                  <span>🎉 Storefront Activated</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Congratulations! Your shop is live
                </h2>
                <p className="text-sm text-slate-600 font-medium mt-1">
                  <span className="font-extrabold text-slate-900">{createdData.organization?.name || shopName}</span> is ready to take orders with 0% platform fee.
                </p>
              </div>

              {/* Reserved Storefront URL Box */}
              <div className="p-4 rounded-2xl bg-[#F6F8FC] border border-[#E5EAF1] text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <span>Your Live Store Link</span>
                  <span className="text-emerald-600 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 gap-2">
                  <span className="text-sm font-black text-[#0052FF] truncate font-mono">
                    {createdData.store_url}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyStoreLink}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy store link"
                    >
                      {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={createdData.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#0052FF] hover:bg-blue-100 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Preview live store"
                    >
                      <span>Visit</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>

              {/* WhatsApp Share Card (The Shopkeeper's Viral Loop) */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-left flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Share with your customers on WhatsApp</p>
                    <p className="text-[11px] text-emerald-700 font-medium">Send your store link to family, friends, or post to Status.</p>
                  </div>
                </div>
                <a
                  href={`https://api.whatsapp.com/send?text=${whatsappShareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Share2 size={13} />
                  <span>Share on WhatsApp</span>
                </a>
              </div>

              {/* Two Clear Next Actions (The Daily Rhythm) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard', { replace: true })}
                  className="min-h-[48px] py-3.5 px-5 rounded-2xl bg-[#0052FF] hover:bg-blue-600 active:scale-[0.98] text-white font-extrabold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to Daily Counter</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/website-builder', { replace: true })}
                  className="min-h-[48px] py-3.5 px-5 rounded-2xl border-2 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Customize Store Design</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

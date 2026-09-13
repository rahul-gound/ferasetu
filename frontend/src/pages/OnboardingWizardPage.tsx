import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Users, ArrowRight, ArrowLeft, Check, CheckCircle2, Globe, ExternalLink, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

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

interface InvitationItem {
  email: string;
  role: 'admin' | 'staff';
}

export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const { user, setOrganizationContext } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
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
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState(() => user?.market === 'US' ? 'California' : 'Maharashtra');
  const [customState, setCustomState] = useState('');

  // Team Invitations (Step 3)
  const [invitations, setInvitations] = useState<InvitationItem[]>([
    { email: '', role: 'staff' }
  ]);

  // Completion / Transition Screen Data (Step 4)
  const [createdData, setCreatedData] = useState<{
    organization: any;
    store_slug: string;
    store_url: string;
  } | null>(null);

  const effectiveState = (region === 'IN' || region === 'US') ? state : customState;

  const handleSelectRegion = (newRegion: Region) => {
    setRegion(newRegion);
    if (newRegion === 'IN') {
      setCountry('India');
      if (!INDIAN_STATES.includes(state)) setState('Maharashtra');
    } else if (newRegion === 'US') {
      setCountry('United States');
      if (!US_STATES.includes(state)) setState('California');
    } else if (newRegion === 'EU') {
      if (!country || country === 'India' || country === 'United States') {
        setCountry('Germany');
      }
    }
  };

  const handleAddInviteRow = () => {
    setInvitations(prev => [...prev, { email: '', role: 'staff' }]);
  };

  const handleRemoveInviteRow = (index: number) => {
    setInvitations(prev => prev.filter((_, i) => i !== index));
  };

  const handleInviteChange = (index: number, field: keyof InvitationItem, value: string) => {
    setInvitations(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || shopName.trim().length < 2) {
      toast.error('Please enter a valid store/business name (min 2 characters)');
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) {
      toast.error('Please enter your city / town');
      return;
    }
    if (!district.trim()) {
      toast.error(region === 'US' ? 'Please enter your county / district' : 'Please enter your district (e.g. Palghar)');
      return;
    }
    if (!effectiveState.trim()) {
      toast.error('Please specify your state / province');
      return;
    }
    if ((region === 'EU' || region === 'OTHER') && !country.trim()) {
      toast.error('Please specify your country');
      return;
    }
    setStep(3);
  };

  const handleSubmitOnboarding = async (skipInvitations = false) => {
    setSubmitting(true);
    try {
      const validInvites = skipInvitations
        ? []
        : invitations
            .filter(inv => inv.email && inv.email.trim() && inv.email.includes('@'))
            .map(inv => ({
              email: inv.email.trim().toLowerCase(),
              role: inv.role
            }));

      const payload = {
        name: shopName.trim(),
        address: address.trim(),
        city: city.trim(),
        district: district.trim(),
        state: effectiveState.trim(),
        country: country.trim(),
        market: region,
        invitations: validInvites
      };

      const { data } = await api.post('/organizations', payload);

      if (data.organization) {
        setOrganizationContext(data.organization);
      }

      setCreatedData({
        organization: data.organization,
        store_slug: data.store_slug || data.organization?.store_slug,
        store_url: data.store_url || `https://${data.store_slug}.ferasetu.com`
      });

      setStep(4); // Move to success transition screen
      toast.success('Your store and organization have been created!');
    } catch (err: any) {
      console.error('Failed to create organization:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to complete onboarding';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Setup Your Store • FeraSetu" noindex />
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="flex justify-center mb-6">
            <img src="/logo-official.png" alt="FeraSetu" className="h-10 w-auto object-contain" />
          </div>

          {/* Stepper Header (Steps 1 to 3) */}
          {step <= 3 && (
            <div className="mb-8">
              <div className="flex items-center justify-between max-w-xs mx-auto mb-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${step >= 1 ? 'bg-blue-600 text-white shadow' : 'bg-slate-200 text-slate-500'}`}>
                  {step > 1 ? <Check size={14} /> : '1'}
                </div>
                <div className={`flex-1 h-1 mx-2 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${step >= 2 ? 'bg-blue-600 text-white shadow' : 'bg-slate-200 text-slate-500'}`}>
                  {step > 2 ? <Check size={14} /> : '2'}
                </div>
                <div className={`flex-1 h-1 mx-2 rounded ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${step >= 3 ? 'bg-blue-600 text-white shadow' : 'bg-slate-200 text-slate-500'}`}>
                  3
                </div>
              </div>
              <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                Step {step} of 3: {step === 1 ? 'Business Info' : step === 2 ? 'Location & Market' : 'Team Access'}
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-10">
            {/* STEP 1: Store Name */}
            {step === 1 && (
              <form onSubmit={handleNextFromStep1} className="space-y-6">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <Store size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    What is your shop or business name?
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">
                    This will represent your merchant business in FeraSetu and reserve your custom storefront URL.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Shop / Store Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Ramesh Kirana Store"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 font-semibold text-base transition-all"
                    autoFocus
                  />
                  {shopName.trim().length >= 2 && (
                    <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                      <Globe size={13} className="text-blue-500" />
                      Suggested address: <span className="font-bold text-blue-600">{shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ferasetu.com</span>
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all cursor-pointer text-sm"
                  >
                    <span>Next: Business Location</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Address, District, City, State, Country */}
            {step === 2 && (
              <form onSubmit={handleNextFromStep2} className="space-y-6">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                    <MapPin size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Where is your business located?
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">
                    Your location authorizes regional selling plans, currency formatting, and tax rules automatically.
                  </p>
                </div>

                {/* Region Selector Pills */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Region / Market
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectRegion('IN')}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        region === 'IN'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>🇮🇳</span>
                      <span>India</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectRegion('US')}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        region === 'US'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>🇺🇸</span>
                      <span>America (US)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectRegion('EU')}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        region === 'EU'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>🇪🇺</span>
                      <span>Europe (EU)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectRegion('OTHER')}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        region === 'OTHER'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>🌐</span>
                      <span>Other</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Business Address (Street, Building, Unit)
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={
                        region === 'IN'
                          ? "e.g. Shop 4, Main Bazaar, Station Road"
                          : region === 'US'
                          ? "e.g. 123 Main Street, Suite 400"
                          : "e.g. Hauptstraße 12 / Rue de la Paix"
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                    />
                  </div>

                  {/* INDIA LOCATION FIELDS */}
                  {region === 'IN' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            State / Union Territory <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium bg-white"
                          >
                            {INDIAN_STATES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            District <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="e.g. Palghar, Thane, Pune, Nagpur"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            City / Town <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Boisar, Palghar, Mumbai, Pune"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Country
                          </label>
                          <input
                            type="text"
                            disabled
                            value="India"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* US / AMERICA LOCATION FIELDS */}
                  {region === 'US' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            State <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium bg-white"
                          >
                            {US_STATES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            County / District <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="e.g. Los Angeles County, Cook County, Harris County"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            City <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Los Angeles, Chicago, Houston, Austin"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Country
                          </label>
                          <input
                            type="text"
                            disabled
                            value="United States"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* EU / EUROPE LOCATION FIELDS */}
                  {region === 'EU' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Country (EU Member State) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium bg-white"
                          >
                            {EU_COUNTRIES.map((c) => (
                              <option key={c.code} value={c.name}>{c.name} ({c.code})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            State / Province / Region <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={customState}
                            onChange={(e) => setCustomState(e.target.value)}
                            placeholder="e.g. Bavaria, Île-de-France, Catalonia, Lombardy"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            District / Department / County <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="e.g. Upper Bavaria, Seine-et-Marne, Barcelona District"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            City <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Munich, Paris, Barcelona, Amsterdam"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* OTHER / INTERNATIONAL LOCATION FIELDS */}
                  {region === 'OTHER' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Country <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="e.g. Canada, Australia, Japan"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            State / Province <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={customState}
                            onChange={(e) => setCustomState(e.target.value)}
                            placeholder="e.g. Ontario, New South Wales"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            District / Region <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="e.g. York Region, Greater London"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            City <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Toronto, Sydney, London"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 font-medium">
                      {region === 'IN' && (
                        <>Market: <span className="font-bold text-slate-800">India (₹0 Free Plan permanent selling enabled with GST compliance)</span>.</>
                      )}
                      {region === 'US' && (
                        <>Market: <span className="font-bold text-slate-800">America / United States (Full store access with 14-day free trial in $ USD)</span>.</>
                      )}
                      {region === 'EU' && (
                        <>Market: <span className="font-bold text-slate-800">Europe (Full store access with 14-day free trial in € EUR for {country || 'EU'})</span>.</>
                      )}
                      {region === 'OTHER' && (
                        <>Market: <span className="font-bold text-slate-800">International (14-day free trial via Stripe Checkout)</span>.</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 text-sm"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all cursor-pointer text-sm"
                  >
                    <span>Next: Team & Staff</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Optional Team Invitations */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                    <Users size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Invite team members (Optional)
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">
                    Add staff or store managers to your store. You can also skip this and add team members later from settings.
                  </p>
                </div>

                <div className="space-y-3">
                  {invitations.map((inv, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="email"
                        value={inv.email}
                        onChange={(e) => handleInviteChange(idx, 'email', e.target.value)}
                        placeholder="colleague@example.com"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium"
                      />
                      <select
                        value={inv.role}
                        onChange={(e) => handleInviteChange(idx, 'role', e.target.value as any)}
                        className="w-32 px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm font-medium bg-white"
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                      {invitations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInviteRow(idx)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          aria-label="Remove invite"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddInviteRow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 py-1"
                  >
                    <Plus size={14} />
                    <span>Add another team member</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitOnboarding(true)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-all text-sm text-center"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitOnboarding(false)}
                    className="flex-1 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all cursor-pointer text-sm"
                  >
                    {submitting ? 'Creating store...' : 'Create Store & Organization'}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Transition Screen */}
            {step === 4 && createdData && (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Congratulations! Your Store Is Live 🎉
                  </h2>
                  <p className="text-sm text-slate-600 font-medium mt-1">
                    <span className="font-extrabold text-slate-900">{createdData.organization?.name || shopName}</span> is now active on FeraSetu.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-700 uppercase tracking-wider">
                    <span>Reserved Storefront URL</span>
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Check size={12} /> Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-blue-200">
                    <span className="text-sm font-black text-blue-900 truncate">
                      {createdData.store_url}
                    </span>
                    <a
                      href={createdData.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0 ml-2"
                    >
                      <span>Visit</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <a
                    href={createdData.store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1 py-3.5 px-6 rounded-xl border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm text-center transition-all flex items-center justify-center gap-2"
                  >
                    <span>Open Your Storefront</span>
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => navigate('/dashboard', { replace: true })}
                    className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Dashboard</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
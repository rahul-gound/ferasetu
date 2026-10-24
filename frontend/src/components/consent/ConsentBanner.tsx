import React, { useState } from 'react';
import { ShieldCheck, Lock, BarChart3, Megaphone, X, SlidersHorizontal, ChevronRight, Cookie } from 'lucide-react';
import { useConsent } from '../../contexts/ConsentContext';
import { Link } from 'react-router-dom';

export default function ConsentBanner() {
  const { consent, hasResponded, isModalOpen, acceptAll, rejectAll, savePreferences, closePreferencesModal } = useConsent();
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Local state for granular customization
  const [analyticsEnabled, setAnalyticsEnabled] = useState(consent.analytics);
  const [marketingEnabled, setMarketingEnabled] = useState(consent.marketing);

  // If user already responded and modal is not explicitly triggered, do not render banner
  if (hasResponded && !isModalOpen) {
    return null;
  }

  const handleSaveCustom = () => {
    savePreferences(analyticsEnabled, marketingEnabled);
    setShowCustomizer(false);
  };

  // If modal is explicitly open (e.g. from footer link "Privacy & Cookie Preferences")
  if (isModalOpen) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
      >
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 id="cookie-modal-title" className="text-sm font-bold text-slate-900">
                  Privacy &amp; Cookie Preferences
                </h3>
                <p className="text-xs text-slate-500">Manage your data and telemetry settings</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closePreferencesModal}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close preferences"
            >
              <X size={18} />
            </button>
          </div>

          {/* Preferences Body */}
          <div className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
            {/* Category 1: Essential */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-slate-500" />
                  <span className="font-semibold text-slate-900 text-sm">Essential &amp; Security</span>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                    Always Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Required for merchant sign-in, session security, and basic operations. Cannot be turned off.
                </p>
              </div>
              <div className="relative inline-flex items-center cursor-not-allowed opacity-60 pt-0.5">
                <div className="w-10 h-6 bg-blue-600 rounded-full transition-colors" />
                <div className="absolute right-1 w-4 h-4 bg-white rounded-full transition-transform shadow-xs" />
              </div>
            </div>

            {/* Category 2: Analytics */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-blue-600" />
                  <span className="font-semibold text-slate-900 text-sm">Anonymous Analytics</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Helps us measure page load speed and errors without collecting personal identities.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={analyticsEnabled}
                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  analyticsEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out mt-1 ml-1 ${
                    analyticsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Category 3: Marketing */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-orange-500" />
                  <span className="font-semibold text-slate-900 text-sm">Marketing Attribution</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Helps us understand referral channels and campaign sources. Disabled by default.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={marketingEnabled}
                onClick={() => setMarketingEnabled(!marketingEnabled)}
                className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  marketingEnabled ? 'bg-orange-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out mt-1 ml-1 ${
                    marketingEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              to="/privacy"
              onClick={closePreferencesModal}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              Read full Privacy Policy
            </Link>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={rejectAll}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Floating Cookie Banner (Initial visitor prompt)
  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 max-w-[440px] w-[calc(100%-2rem)] sm:w-[440px] animate-fade-in"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_16px_40px_-8px_rgba(15,23,42,0.14),0_0_0_1px_rgba(15,23,42,0.06)] border border-slate-200/90 overflow-hidden transition-all duration-300">
        {/* Subtle top branded accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-orange-500" />

        <div className="p-5 sm:p-6 space-y-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
                <Cookie size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 id="consent-title" className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  Cookie &amp; Privacy Choices
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Zero data selling
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <p id="consent-desc" className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            We use cookies to keep your account secure and make FeraSetu faster for your shop. We never sell your data or track you across other websites.
          </p>

          {/* Inline Customizer Accordion */}
          {showCustomizer && (
            <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-slide-up">
              {/* Category 1 */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-800">Essential &amp; Security</span>
                </div>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                  Always Active
                </span>
              </div>

              {/* Category 2 */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800">Anonymous Analytics</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analyticsEnabled}
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    analyticsEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out mt-[3px] ml-[3px] ${
                      analyticsEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Category 3 */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Megaphone size={15} className="text-orange-500" />
                  <span className="text-xs font-semibold text-slate-800">Marketing Attribution</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={marketingEnabled}
                  onClick={() => setMarketingEnabled(!marketingEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    marketingEnabled ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out mt-[3px] ml-[3px] ${
                      marketingEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              {!showCustomizer ? (
                <>
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl shadow-xs transition-all cursor-pointer text-center"
                  >
                    Accept All
                  </button>
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="flex-1 py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] rounded-xl transition-all cursor-pointer text-center"
                  >
                    Reject Non-Essential
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl shadow-xs transition-all cursor-pointer text-center"
                  >
                    Save Preferences
                  </button>
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="flex-1 py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] rounded-xl transition-all cursor-pointer text-center"
                  >
                    Reject All
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between px-0.5 text-xs">
              <button
                type="button"
                onClick={() => setShowCustomizer(!showCustomizer)}
                className="text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <SlidersHorizontal size={13} className="text-slate-400" />
                <span>{showCustomizer ? 'Hide options' : 'Customize preferences'}</span>
              </button>

              <Link
                to="/privacy"
                className="text-slate-500 hover:text-blue-600 font-medium inline-flex items-center gap-0.5 transition-colors py-1"
              >
                Privacy policy <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

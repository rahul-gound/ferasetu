import React, { useState } from 'react';
import { ShieldCheck, Lock, BarChart3, Megaphone, Check, X, ChevronRight, Settings } from 'lucide-react';
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

  const isConfiguring = showCustomizer || isModalOpen;

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs flex justify-center items-end animate-fade-in"
    >
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300">
        {/* Banner Header Strip */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-blue-600 font-bold text-sm">
            <ShieldCheck size={20} className="text-blue-600" />
            <span>FeraSetu Privacy &amp; Consent</span>
          </div>
          {isModalOpen && (
            <button
              onClick={closePreferencesModal}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              aria-label="Close preferences"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div>
            <h3 id="consent-title" className="text-lg font-bold text-slate-900">
              Measure behavior, don't manufacture identities.
            </h3>
            <p id="consent-desc" className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              FeraSetu respects your digital privacy. We use essential storage for authentication and security,
              and privacy-first anonymous analytics to improve the merchant experience without cross-site tracking,
              device fingerprinting, or selling customer data.
            </p>
          </div>

          {/* Granular Preference Customizer Accordion */}
          {isConfiguring && (
            <div className="pt-4 border-t border-slate-100 space-y-4 animate-slide-up">
              {/* Category 1: Essential */}
              <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                    <Lock size={16} className="text-slate-500" />
                    <span>Essential Functionality &amp; Security</span>
                    <span className="text-[11px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      Always Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Strictly required for store sign-in, multi-tenant session security, fraud defense, and remembering your consent state.
                  </p>
                </div>
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    aria-label="Essential storage (Always active)"
                    className="w-5 h-5 accent-blue-600 rounded cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              {/* Category 2: Analytics */}
              <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                    <BarChart3 size={16} className="text-blue-600" />
                    <span>First-Party Anonymous Analytics</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Allows anonymous, pseudonymous telemetry to measure page speed, funnel steps, and error friction.
                    No canvas fingerprinting, no keystroke logging, and no cross-site advertising.
                  </p>
                </div>
                <div className="pt-1">
                  <input
                    type="checkbox"
                    id="consent-analytics"
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    className="w-5 h-5 text-blue-600 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Category 3: Marketing */}
              <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                    <Megaphone size={16} className="text-orange-500" />
                    <span>Marketing &amp; Campaign Attribution</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Optional campaign attribution to understand referral channels. Disabled by default.
                  </p>
                </div>
                <div className="pt-1">
                  <input
                    type="checkbox"
                    id="consent-marketing"
                    checked={marketingEnabled}
                    onChange={(e) => setMarketingEnabled(e.target.checked)}
                    className="w-5 h-5 text-orange-500 accent-orange-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Button Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <Link to="/privacy" className="text-blue-600 font-medium hover:underline">
                Read our full Privacy Policy
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              {!isConfiguring ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCustomizer(true)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Customize Preferences
                  </button>
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="px-5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Reject Non-Essential
                  </button>
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Accept All
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Reject All Non-Essential
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

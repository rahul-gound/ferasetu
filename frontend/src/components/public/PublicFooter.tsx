/**
 * PublicFooter — Improved with positioning tagline, FeraSetu AI link,
 * support info, and dynamic copyright year.
 */
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useConsent } from '../../contexts/ConsentContext';
import MarketSelector from '../marketing/MarketSelector';

export default function PublicFooter() {
  const { getLocalizedLink, translate: t } = useLanguage();
  const { register, login } = useAuth();
  const { openPreferencesModal } = useConsent();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-5">
              <img
                src="/logo-official.png"
                alt="FeraSetu"
                width="297"
                height="128"
                loading="lazy"
                className="h-9 sm:h-10 w-auto max-w-[150px] object-contain opacity-95"
              />
            </Link>
            <p className="text-sm text-slate-700 font-semibold max-w-xs leading-relaxed mb-3">
              “Your business is yours. The internet should be too.”
            </p>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Digital infrastructure connecting your real-world store to online ordering, payments, and fulfillment with 0% FeraSetu platform commission.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-4">Philosophy & Product</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/#why"
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Why FeraSetu
                </a>
              </li>
              <li>
                <a
                  href="/#evidence"
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="/#journey"
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Connected Journey
                </a>
              </li>
              <li>
                <a
                  href="/#transparency"
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Transparency Matrix
                </a>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/pricing')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  {t('nav.pricing') || 'Pricing'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account links */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-4">Account</h4>
            <ul className="space-y-3">
              <li>
                <button
                  type="button"
                  onClick={() => register()}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium text-left cursor-pointer"
                >
                  Create Free Store
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => login()}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium text-left cursor-pointer"
                >
                  {t('nav.signIn')}
                </button>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/pricing')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  View Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal + Support */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-4">Help & Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to={getLocalizedLink('/privacy')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openPreferencesModal}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium text-left cursor-pointer"
                >
                  Privacy &amp; Cookie Preferences
                </button>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/terms')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@ferasetu.com"
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <MarketSelector variant="footer" />
            <p className="text-sm text-slate-400 font-medium">
              © {year} FeraSetu. All rights reserved.
            </p>
          </div>
          <p className="text-xs text-slate-400 font-medium text-center md:text-right">
            Transparent pricing · 0% platform commission · Fast edge storefronts
          </p>
        </div>
      </div>
    </footer>
  );
}

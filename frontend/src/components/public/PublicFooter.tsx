/**
 * PublicFooter — With positioning tagline, FeraSetu AI link,
 * Competitor Comparison links, support info, and dynamic copyright year.
 */
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useConsent } from '../../contexts/ConsentContext';
import MarketSelector from '../marketing/MarketSelector';

export default function PublicFooter() {
  const { getLocalizedLink } = useLanguage();
  const { register, login } = useAuth();
  const { openPreferencesModal } = useConsent();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-3">
              <img
                src="/logo-official.png"
                alt="FeraSetu"
                width="297"
                height="128"
                loading="lazy"
                className="h-9 sm:h-10 w-auto max-w-[150px] object-contain opacity-95"
              />
            </Link>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-semibold text-slate-700 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span>Independent Commerce</span>
            </div>
            <p className="text-sm text-slate-700 font-semibold max-w-xs leading-relaxed mb-3">
              “Your business is yours. The internet should be too.”
            </p>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Sovereign B2B digital commerce infrastructure connecting real-world retail to online ordering with 0% FeraSetu platform commission.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-4">Philosophy &amp; Product</h4>
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
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Compare & Alternatives column */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-4">Compare &amp; Alternatives</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to={getLocalizedLink('/compare/shopify-alternative')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Shopify Alternative
                </Link>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/compare/woocommerce-alternative')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  WooCommerce Alternative
                </Link>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/compare/bigcommerce-alternative')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  BigCommerce Alternative
                </Link>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/compare/dukaan-alternative')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Dukaan Alternative
                </Link>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/compare/wix-squarespace-alternative')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Wix &amp; Squarespace
                </Link>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/compare')}
                  className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-bold inline-flex items-center gap-1 mt-1"
                >
                  <span>All 5 Comparisons →</span>
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
                  Sign In
                </button>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/free-online-store')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Free Online Store Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal + Support */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-4">Help &amp; Legal</h4>
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
                  Cookie Preferences
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
            <p className="text-xs text-slate-400 font-medium">
              © {year} FeraSetu Technologies. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span>Direct Bank Settlement</span>
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Lock size={12} className="text-blue-600" />
              <span>256-Bit SSL Encrypted</span>
            </span>
            <span>·</span>
            <span className="font-bold text-orange-600">0% Platform Commission</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
